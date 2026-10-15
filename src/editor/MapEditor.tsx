import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useStoreApi,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/base.css';
import type { AppUser, CurveStyle, Graph, LineStyle, MapComment, MapEdge, MapNode, Shape } from '../lib/types';
import { BRANCH_COLORS } from '../lib/palette';
import { EditorContext, type EditorActions } from './EditorContext';
import { useUIStore } from './uiStore';
import { IdeaNode } from './IdeaNode';
import { CommentNode } from './CommentNode';
import { BranchEdge, ThoughtEdge } from './Edges';
import { ColorWheel, RadialMenu, type RadialItem } from './RadialMenu';
import { DotGrid } from './DotGrid';
import { MiniMap } from './MiniMap';
import { Icon, ShapeIcon } from './icons';
import { SHAPE_LABELS, type Pt } from './geometry';
import { tidy } from './layout';
import { estimateSize, fitViewport, TWEEN_MS, MIN_ZOOM, MAX_ZOOM, easeOut } from './viewport';
import {
  addChild,
  addComment,
  addFreeNode,
  addSibling,
  commentSpot,
  connect,
  duplicate,
  incomingEdgeIds,
  isMine,
  moveItems,
  recolor,
  removeItems,
  setEdgeProps,
  setNodeProps,
  subtree,
  updateComment,
  type Dir,
} from './ops';

// Defined once, outside the component, so React Flow never sees a new types object.
const nodeTypes = { idea: IdeaNode, comment: CommentNode };
const edgeTypes = { branch: BranchEdge, thought: ThoughtEdge };
const multiSelectKeys = ['Meta', 'Control', 'Shift'];

const Inspector = lazy(() => import('./Inspector').then((m) => ({ default: m.Inspector })));

type Menu =
  | { kind: 'node' | 'edge' | 'comment'; id: string; x: number; y: number }
  | { kind: 'pane'; x: number; y: number; fx: number; fy: number }
  | { kind: 'shape' | 'line'; ids: string[]; x: number; y: number };

interface Props {
  graph: Graph;
  commit(fn: (g: Graph) => Graph, opts?: { history?: boolean }): void;
  snapshot(): void;
  undo(): void;
  redo(): void;
  canEdit: boolean;
  canComment: boolean;
  user: AppUser | null;
}

// ------------------------------------------------------------ graph → React Flow (with structural reuse)

type IdeaData = { node: MapNode };
type CommentData = { comment: MapComment };
type BranchData = { edge: MapEdge; targetShape: Shape; sourceShape: Shape };

const ideaDataCache = new Map<string, IdeaData>();
const commentDataCache = new WeakMap<MapComment, CommentData>();
const branchDataCache = new WeakMap<MapEdge, BranchData>();

/** Everything that affects how an idea is drawn, except its position. */
const visualKey = (n: MapNode) =>
  `${n.text}\u0000${n.shape}\u0000${n.color}\u0000${n.fill}\u0000${n.fontSize}\u0000${n.bold ? 1 : 0}\u0000${n.borderWidth}\u0000${n.borderStyle}\u0000${n.root ? 1 : 0}`;

function ideaData(n: MapNode): IdeaData {
  const cached = ideaDataCache.get(n.id);
  if (cached && (cached.node === n || visualKey(cached.node) === visualKey(n))) return cached;
  const d = { node: n };
  ideaDataCache.set(n.id, d);
  return d;
}

interface SyncOpts {
  canEdit: boolean;
  canComment: boolean;
  user: AppUser | null;
  openCommentId: string | null;
  pendingSelect: string | null;
}

function syncNodes(prev: Node[], graph: Graph, o: SyncOpts): Node[] {
  const old = new Map(prev.map((n) => [n.id, n]));
  const out: Node[] = [];
  let changed = prev.length !== Object.keys(graph.nodes).length + Object.keys(graph.comments).length;
  for (const n of Object.values(graph.nodes)) {
    const p = old.get(n.id);
    const data = ideaData(n);
    const zIndex = n.root ? 3 : 2;
    const selected = o.pendingSelect ? n.id === o.pendingSelect : !!p?.selected;
    if (p && p.data === data && p.position.x === n.x && p.position.y === n.y && p.draggable === o.canEdit && p.zIndex === zIndex && p.selected === selected) {
      out.push(p);
      continue;
    }
    changed = true;
    const est = estimateSize(n);
    out.push({
      ...(p ?? {}),
      id: n.id,
      type: 'idea',
      position: { x: n.x, y: n.y },
      data,
      draggable: o.canEdit,
      zIndex,
      selected,
      initialWidth: p?.measured?.width ?? est.w,
      initialHeight: p?.measured?.height ?? est.h,
    } as Node);
  }
  for (const c of Object.values(graph.comments)) {
    const p = old.get(c.id);
    let data = commentDataCache.get(c);
    if (!data) commentDataCache.set(c, (data = { comment: c }));
    const draggable = o.canEdit || (o.canComment && isMine(c, o.user));
    const zIndex = o.openCommentId === c.id ? 1000 : 500;
    const selected = o.pendingSelect ? false : !!p?.selected;
    if (p && p.data === data && p.position.x === c.x && p.position.y === c.y && p.draggable === draggable && p.zIndex === zIndex && p.selected === selected) {
      out.push(p);
      continue;
    }
    changed = true;
    out.push({ ...(p ?? {}), id: c.id, type: 'comment', position: { x: c.x, y: c.y }, data, draggable, zIndex, selected, initialWidth: 200, initialHeight: 90 } as Node);
  }
  return changed ? out : prev;
}

function syncEdges(prev: Edge[], graph: Graph, canEdit: boolean, pendingSelect: string | null): Edge[] {
  const old = new Map(prev.map((e) => [e.id, e]));
  const out: Edge[] = [];
  let changed = false;
  for (const e of Object.values(graph.edges)) {
    const s = graph.nodes[e.source];
    const t = graph.nodes[e.target];
    if (!s || !t) continue;
    let data = branchDataCache.get(e);
    if (!data || data.targetShape !== t.shape || data.sourceShape !== s.shape) {
      data = { edge: e, targetShape: t.shape, sourceShape: s.shape };
      branchDataCache.set(e, data);
    }
    const p = old.get(e.id);
    const selected = pendingSelect ? false : !!p?.selected;
    if (p && p.data === data && p.selectable === canEdit && p.selected === selected) {
      out.push(p);
      continue;
    }
    changed = true;
    out.push({ id: e.id, source: e.source, target: e.target, type: 'branch', data, selectable: canEdit, selected, zIndex: 0 });
  }
  for (const c of Object.values(graph.comments)) {
    if (!c.nodeId || !graph.nodes[c.nodeId] || c.resolved) continue;
    const id = 't_' + c.id;
    const p = old.get(id);
    if (p && p.source === c.nodeId) {
      out.push(p);
      continue;
    }
    changed = true;
    out.push({ id, source: c.nodeId, target: c.id, type: 'thought', selectable: false, focusable: false, zIndex: 1 });
  }
  return changed || out.length !== prev.length ? out : prev;
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

interface DragSession {
  primary: string;
  dragged: Set<string>;
  followers: string[];
  start: Map<string, Pt>;
  pos: Map<string, Pt>;
}

function MapEditorImpl({ graph, commit, snapshot, undo, redo, canEdit, canComment, user }: Props) {
  const rf = useReactFlow();
  const storeApi = useStoreApi();
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [wheel, setWheel] = useState<{ ids: string[]; x: number; y: number } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const openCommentId = useUIStore((s) => s.openCommentId);
  const ui = useUIStore.getState;

  const pendingSelect = useRef<string | null>(null);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  const drag = useRef<DragSession | null>(null);
  const tween = useRef<number | null>(null);

  const size = useCallback(
    (id: string) => {
      const n = rf.getInternalNode(id);
      if (n?.measured.width && n.measured.height) return { w: n.measured.width, h: n.measured.height };
      const gn = graphRef.current.nodes[id];
      return gn ? estimateSize(gn) : { w: 120, h: 40 };
    },
    [rf],
  );

  // Keep React Flow's arrays in sync with the document, reusing node objects that didn't change.
  useEffect(() => {
    const o: SyncOpts = { canEdit, canComment, user, openCommentId, pendingSelect: pendingSelect.current };
    setRfNodes((prev) => syncNodes(prev, graph, o));
    setRfEdges((prev) => syncEdges(prev, graph, canEdit, o.pendingSelect));
    if (o.pendingSelect && graph.nodes[o.pendingSelect]) pendingSelect.current = null;
  }, [graph, canEdit, canComment, user, openCommentId]);

  // Fit once, as soon as there is something to fit. Sizes are estimated until nodes are measured.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !rfNodes.length) return;
    fitted.current = true;
    const { width, height } = storeApi.getState();
    fitViewport(rf, rfNodes, { width, height }, 0);
  }, [rfNodes, rf, storeApi]);

  // ------------------------------------------------------------ selection
  const selection = useMemo(() => {
    const nodeIds: string[] = [];
    const commentIds: string[] = [];
    for (const n of rfNodes) if (n.selected) (n.type === 'idea' ? nodeIds : commentIds).push(n.id);
    const edgeIds: string[] = [];
    for (const e of rfEdges) if (e.selected && e.type === 'branch') edgeIds.push(e.id);
    return { nodeIds, commentIds, edgeIds, key: nodeIds.join(',') + '|' + edgeIds.join(',') };
  }, [rfNodes, rfEdges]);
  const { nodeIds: selectedNodeIds, commentIds: selectedCommentIds, edgeIds: selectedEdgeIds } = selection;

  const selectOnly = useCallback((id: string | null) => {
    pendingSelect.current = id;
    setRfNodes((ns) => ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })));
    setRfEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
  }, []);

  const selectMany = useCallback((ids: Iterable<string>) => {
    const s = new Set(ids);
    pendingSelect.current = null;
    setRfNodes((ns) => ns.map((n) => (n.selected === s.has(n.id) ? n : { ...n, selected: s.has(n.id) })));
  }, []);

  const createAndEdit = useCallback(
    (fn: (g: Graph) => { graph: Graph; id: string } | null) => {
      let newId: string | null = null;
      commit((g) => {
        const r = fn(g);
        if (!r) return g;
        newId = r.id;
        return r.graph;
      });
      if (newId) {
        selectOnly(newId);
        ui().setEditingId(newId);
        setInspectorOpen(true);
      }
    },
    [commit, selectOnly, ui],
  );

  // ------------------------------------------------------------ dragging: local until the pointer is released
  const onNodeDragStart = useCallback(
    (e: MouseEvent | TouchEvent, node: Node, nodes: Node[]) => {
      snapshot();
      ui().setDragging(true);
      const g = graphRef.current;
      const dragged = new Set(nodes.map((n) => n.id));
      const followers = new Set<string>();
      if (!('altKey' in e && e.altKey)) for (const id of dragged) if (g.nodes[id]) for (const d of subtree(g, id)) if (!dragged.has(d)) followers.add(d);
      for (const c of Object.values(g.comments))
        if (c.nodeId && (dragged.has(c.nodeId) || followers.has(c.nodeId)) && !dragged.has(c.id)) followers.add(c.id);
      const start = new Map<string, Pt>();
      for (const n of rfNodesRef.current) if (dragged.has(n.id) || followers.has(n.id)) start.set(n.id, { x: n.position.x, y: n.position.y });
      drag.current = { primary: node.id, dragged, followers: [...followers], start, pos: new Map() };
    },
    [snapshot, ui],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const d = drag.current;
    let all = changes;
    if (d) {
      let primary: NodePositionChange | undefined;
      for (const c of changes) {
        if (c.type === 'position' && c.position) {
          d.pos.set(c.id, c.position);
          if (c.id === d.primary) primary = c;
        }
      }
      if (primary?.position && d.followers.length) {
        const s0 = d.start.get(d.primary)!;
        const dx = primary.position.x - s0.x;
        const dy = primary.position.y - s0.y;
        const extra: NodeChange[] = [];
        for (const f of d.followers) {
          const fs = d.start.get(f);
          if (!fs) continue;
          const position = { x: fs.x + dx, y: fs.y + dy };
          d.pos.set(f, position);
          extra.push({ type: 'position', id: f, position, dragging: true });
        }
        all = [...changes, ...extra];
      }
    }
    setRfNodes((ns) => applyNodeChanges(all, ns));
  }, []);

  const onNodeDragStop = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    ui().setDragging(false);
    if (!d) return;
    const rounded = new Map<string, Pt>();
    for (const [id, p] of d.pos) rounded.set(id, { x: Math.round(p.x), y: Math.round(p.y) });
    const fixes: NodeChange[] = [];
    for (const [id, position] of rounded) fixes.push({ type: 'position', id, position, dragging: false });
    if (fixes.length) setRfNodes((ns) => applyNodeChanges(fixes, ns));
    commit((g) => moveItems(g, rounded), { history: false });
  }, [commit, ui]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const sel = changes.filter((c) => c.type === 'select');
    if (sel.length) setRfEdges((es) => applyEdgeChanges(sel, es));
  }, []);

  // ------------------------------------------------------------ view actions (single rAF tweens)
  const fit = useCallback(() => {
    const { width, height } = storeApi.getState();
    fitViewport(rf, rfNodesRef.current, { width, height }, TWEEN_MS);
  }, [rf, storeApi]);

  const runTidy = useCallback(() => {
    const g = graphRef.current;
    const t0 = performance.now();
    const next = tidy(g, size);
    if (import.meta.env.DEV) console.debug(`tidy: ${(performance.now() - t0).toFixed(1)} ms`);
    if (next === g) return;
    const moves = new Map<string, { from: Pt; to: Pt }>();
    for (const n of rfNodesRef.current) {
      const target = next.nodes[n.id] ?? next.comments[n.id];
      if (target && (target.x !== n.position.x || target.y !== n.position.y)) moves.set(n.id, { from: n.position, to: { x: target.x, y: target.y } });
    }
    if (tween.current != null) cancelAnimationFrame(tween.current);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - start) / TWEEN_MS);
      const k = easeOut(t);
      setRfNodes((ns) =>
        ns.map((n) => {
          const m = moves.get(n.id);
          if (!m) return n;
          return { ...n, position: t >= 1 ? m.to : { x: m.from.x + (m.to.x - m.from.x) * k, y: m.from.y + (m.to.y - m.from.y) * k } };
        }),
      );
      if (t < 1) tween.current = requestAnimationFrame(step);
      else {
        tween.current = null;
        commit(() => next);
      }
    };
    tween.current = requestAnimationFrame(step);
  }, [commit, size]);

  // ------------------------------------------------------------ actions
  const deleteSelection = useCallback(() => {
    const g = graphRef.current;
    const ids = canEdit
      ? [...selectedNodeIds, ...selectedEdgeIds, ...selectedCommentIds]
      : selectedCommentIds.filter((id) => g.comments[id] && isMine(g.comments[id], user));
    if (ids.length) commit((gr) => removeItems(gr, ids));
  }, [canEdit, selectedNodeIds, selectedEdgeIds, selectedCommentIds, user, commit]);

  const startComment = useCallback(
    (nodeId: string | null, at?: Pt) => {
      if (!user || !canComment) return;
      let id = '';
      commit((g) => {
        const spot = at ?? (nodeId ? commentSpot(g, nodeId, size) : rf.screenToFlowPosition({ x: innerWidth / 2, y: innerHeight / 2 }));
        const r = addComment(g, nodeId, spot, user);
        id = r.id;
        return r.graph;
      });
      ui().setOpenCommentId(id);
    },
    [user, canComment, commit, size, rf, ui],
  );

  // Latest closures for the stable action object and the single keyboard listener.
  const latest = useRef({ createAndEdit, commit, size, selectOnly, selectMany, deleteSelection, undo, redo, canEdit, canComment, selectedNodeIds, selectedCommentIds, rf });
  latest.current = { createAndEdit, commit, size, selectOnly, selectMany, deleteSelection, undo, redo, canEdit, canComment, selectedNodeIds, selectedCommentIds, rf };

  const doSprout = useCallback((from: string, dir: Dir, upX: number, upY: number, moved: boolean) => {
    const L = latest.current;
    if (!moved) {
      L.createAndEdit((g) => addChild(g, from, L.size, { dir }));
      return;
    }
    const el = document.elementFromPoint(upX, upY)?.closest('.react-flow__node');
    const target = el?.getAttribute('data-id');
    if (target && target !== from && graphRef.current.nodes[target]) {
      L.commit((g) => connect(g, from, target));
      return;
    }
    const at = L.rf.screenToFlowPosition({ x: upX, y: upY });
    L.createAndEdit((g) => addChild(g, from, L.size, { at }));
  }, []);

  const actions = useMemo<EditorActions>(
    () => ({
      user,
      canEdit,
      canComment,
      setEditingId: (id) => ui().setEditingId(id),
      setNodeText(id, text) {
        ui().setEditingId(null);
        latest.current.commit((g) => (g.nodes[id] && g.nodes[id].text !== text ? setNodeProps(g, [id], { text }) : g));
      },
      textThenChild(id, text) {
        latest.current.commit((g) => (g.nodes[id] && g.nodes[id].text !== text ? setNodeProps(g, [id], { text }) : g));
        // wait a frame so the edited node has re-measured before placing its child
        setTimeout(() => latest.current.createAndEdit((g) => addChild(g, id, latest.current.size)), 30);
      },
      textThenSibling(id, text) {
        latest.current.commit((g) => (g.nodes[id] && g.nodes[id].text !== text ? setNodeProps(g, [id], { text }) : g));
        setTimeout(() => latest.current.createAndEdit((g) => addSibling(g, id, latest.current.size) ?? addChild(g, id, latest.current.size)), 30);
      },
      startSprout(id, dir, e) {
        const sx = e.clientX;
        const sy = e.clientY;
        let moved = false;
        ui().setSprout({ from: id, x: sx, y: sy, moved });
        const move = (ev: PointerEvent) => {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
          ui().setSprout({ from: id, x: ev.clientX, y: ev.clientY, moved });
        };
        const up = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          ui().setSprout(null);
          doSprout(id, dir, ev.clientX, ev.clientY, moved);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      },
      setOpenCommentId: (id) => ui().setOpenCommentId(id),
      updateComment(id, props) {
        latest.current.commit((g) => updateComment(g, id, props));
      },
      deleteComment(id) {
        ui().setOpenCommentId(null);
        latest.current.commit((g) => removeItems(g, [id]));
      },
    }),
    [user, canEdit, canComment, ui, doSprout],
  );

  // ------------------------------------------------------------ keyboard (registered once)
  const menuOpen = !!menu || !!wheel;
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const L = latest.current;
      if (isTyping(e.target) || menuOpenRef.current || ui().modalDepth > 0) return;
      const mod = e.metaKey || e.ctrlKey;
      const one = L.selectedNodeIds.length === 1 ? L.selectedNodeIds[0] : null;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (L.canEdit || L.canComment) (e.shiftKey ? L.redo : L.undo)();
      } else if (mod && key === 'y') {
        e.preventDefault();
        if (L.canEdit || L.canComment) L.redo();
      } else if (!L.canEdit) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedCommentIds.length) L.deleteSelection();
      } else if (e.key === 'Tab' && one) {
        e.preventDefault();
        L.createAndEdit((g) => addChild(g, one, L.size));
      } else if (e.key === 'Enter' && one) {
        e.preventDefault();
        L.createAndEdit((g) => addSibling(g, one, L.size) ?? addChild(g, one, L.size));
      } else if ((e.key === 'F2' || e.key === ' ') && one) {
        e.preventDefault();
        ui().setEditingId(one);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        L.deleteSelection();
      } else if (mod && key === 'd' && L.selectedNodeIds.length) {
        e.preventDefault();
        let ids: string[] = [];
        L.commit((g) => {
          const r = duplicate(g, L.selectedNodeIds);
          ids = r.ids;
          return r.graph;
        });
        setTimeout(() => L.selectMany(ids), 0);
      } else if (e.key === 'Escape') {
        ui().setConnectingFrom(null);
        L.selectOnly(null);
        pendingSelect.current = null;
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [ui]);

  // ------------------------------------------------------------ menus
  const openWheel = (ids: string[], x: number, y: number) => setWheel({ ids, x, y });

  const lineItems = (ids: string[]): RadialItem[] => {
    const edges = ids.map((i) => graph.edges[i]).filter(Boolean) as MapEdge[];
    const first = edges[0];
    const setE = (p: Partial<MapEdge>) => commit((g) => setEdgeProps(g, ids, p));
    const w = (n: number) => (
      <svg width="26" height="20" viewBox="0 0 26 20"><path d="M3 10h20" stroke="currentColor" strokeWidth={n} strokeLinecap="round" /></svg>
    );
    const st = (s: LineStyle) => (
      <svg width="26" height="20" viewBox="0 0 26 20">
        <path d="M3 10h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={s === 'dashed' ? '6 4' : s === 'dotted' ? '0.5 5' : undefined} />
      </svg>
    );
    const cv = (c: CurveStyle) => (
      <svg width="26" height="20" viewBox="0 0 26 20">
        {c === 'organic' ? (
          <path d="M3 4C13 4 12 16 23 16 L23 17 C11 17 12 6 3 7Z" fill="currentColor" />
        ) : (
          <path d={c === 'bezier' ? 'M3 4C13 4 12 16 23 16' : c === 'straight' ? 'M3 4L23 16' : 'M3 4H13V16H23'} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
      </svg>
    );
    return [
      ...([[2, 'Thin'], [4.5, 'Medium'], [8, 'Thick'], [14, 'Chunky']] as const).map(([n, label]) => ({
        key: 'w' + n, label: `${label} branch`, icon: w(Math.min(n, 9)), active: first?.width === n, onSelect: () => setE({ width: n }),
      })),
      ...(['solid', 'dashed', 'dotted'] as LineStyle[]).map((s) => ({
        key: s, label: s[0].toUpperCase() + s.slice(1), icon: st(s), active: first?.style === s, onSelect: () => setE({ style: s }),
      })),
      ...([['organic', 'Organic'], ['bezier', 'Curve'], ['straight', 'Straight'], ['step', 'Elbow']] as [CurveStyle, string][]).map(([c, label]) => ({
        key: c, label, icon: cv(c), active: first?.curve === c, onSelect: () => setE({ curve: c }),
      })),
      { key: 'arrow', label: first?.arrow ? 'Remove arrow' : 'Arrow head', icon: Icon.arrow, active: first?.arrow, onSelect: () => setE({ arrow: !first?.arrow }) },
    ];
  };

  const menuItems = (m: Menu): RadialItem[] => {
    if (m.kind === 'shape') {
      const cur = graph.nodes[m.ids[0]]?.shape;
      return (Object.keys(SHAPE_LABELS) as Shape[]).map((s) => ({
        key: s, label: SHAPE_LABELS[s], icon: <ShapeIcon shape={s} />, active: cur === s,
        onSelect: () => commit((g) => setNodeProps(g, m.ids, { shape: s })),
      }));
    }
    if (m.kind === 'line') return lineItems(m.ids);
    if (m.kind === 'node') {
      const id = m.id;
      const ids = selectedNodeIds.includes(id) ? selectedNodeIds : [id];
      const items: RadialItem[] = [];
      if (canEdit) {
        items.push(
          { key: 'child', label: 'Add idea', icon: Icon.plus, onSelect: () => createAndEdit((g) => addChild(g, id, size)) },
          { key: 'sib', label: 'Add sibling', icon: Icon.sibling, onSelect: () => createAndEdit((g) => addSibling(g, id, size) ?? addChild(g, id, size)) },
        );
      }
      if (canComment) items.push({ key: 'comment', label: 'Comment', icon: Icon.comment, onSelect: () => startComment(id) });
      if (canEdit) {
        items.push(
          { key: 'color', label: 'Colour', icon: null, rainbow: true, onSelect: () => openWheel(ids, m.x, m.y) },
          { key: 'shape', label: 'Shape', icon: Icon.shape, onSelect: () => setMenu({ kind: 'shape', ids, x: m.x, y: m.y }), stay: true },
          {
            key: 'line', label: 'Branch style', icon: Icon.line,
            onSelect: () => {
              const e = incomingEdgeIds(graph, ids);
              if (e.length) setMenu({ kind: 'line', ids: e, x: m.x, y: m.y });
            },
            stay: incomingEdgeIds(graph, ids).length > 0,
          },
          { key: 'link', label: 'Link to…', icon: Icon.link, onSelect: () => ui().setConnectingFrom(id) },
          { key: 'dup', label: 'Duplicate', icon: Icon.duplicate, onSelect: () => commit((g) => duplicate(g, ids).graph) },
          { key: 'del', label: 'Delete', icon: Icon.trash, onSelect: () => commit((g) => removeItems(g, ids)) },
        );
      }
      return items;
    }
    if (m.kind === 'edge') {
      const e = graph.edges[m.id];
      return [
        { key: 'color', label: 'Colour', icon: null, rainbow: true, onSelect: () => openWheel([m.id], m.x, m.y) },
        { key: 'line', label: 'Line style', icon: Icon.line, onSelect: () => setMenu({ kind: 'line', ids: [m.id], x: m.x, y: m.y }), stay: true },
        { key: 'arrow', label: e?.arrow ? 'Remove arrow' : 'Arrow head', icon: Icon.arrow, onSelect: () => commit((g) => setEdgeProps(g, [m.id], { arrow: !e?.arrow })) },
        { key: 'del', label: 'Delete', icon: Icon.trash, onSelect: () => commit((g) => removeItems(g, [m.id])) },
      ];
    }
    if (m.kind === 'comment') {
      const c = graph.comments[m.id];
      const items: RadialItem[] = [{ key: 'open', label: 'Open thread', icon: Icon.comment, onSelect: () => ui().setOpenCommentId(m.id) }];
      if (canComment) items.push({ key: 'resolve', label: c?.resolved ? 'Reopen' : 'Resolve', icon: Icon.check, onSelect: () => commit((g) => updateComment(g, m.id, { resolved: !c?.resolved })) });
      if (canEdit || (c && isMine(c, user))) items.push({ key: 'del', label: 'Delete', icon: Icon.trash, onSelect: () => commit((g) => removeItems(g, [m.id])) });
      return items;
    }
    const pm = m as Extract<Menu, { kind: 'pane' }>;
    const at = { x: pm.fx, y: pm.fy };
    const items: RadialItem[] = [];
    if (canEdit) {
      items.push({
        key: 'new', label: 'New idea here', icon: Icon.plus,
        onSelect: () => createAndEdit((g) => addFreeNode(g, at, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length])),
      });
    }
    if (canComment) items.push({ key: 'comment', label: 'Comment here', icon: Icon.comment, onSelect: () => startComment(null, { x: at.x - 90, y: at.y - 40 }) });
    if (canEdit) items.push({ key: 'tidy', label: 'Tidy layout', icon: Icon.tidy, onSelect: runTidy });
    items.push({ key: 'fit', label: 'Fit to screen', icon: Icon.fit, onSelect: fit });
    if (canEdit || canComment) {
      items.push({ key: 'undo', label: 'Undo', icon: Icon.undo, onSelect: undo, stay: true });
      items.push({ key: 'redo', label: 'Redo', icon: Icon.redo, onSelect: redo, stay: true });
    }
    return items;
  };

  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
  const selKey = selection.key;
  useEffect(() => setInspectorOpen(true), [selKey]);
  const nodeCount = rfNodes.length;

  return (
    <EditorContext.Provider value={actions}>
      <CanvasFrame>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => {
            const from = ui().connectingFrom;
            if (from && node.type === 'idea' && node.id !== from) {
              commit((g) => connect(g, from, node.id));
              ui().setConnectingFrom(null);
            }
          }}
          onPaneClick={() => {
            ui().setConnectingFrom(null);
            ui().setOpenCommentId(null);
          }}
          onDoubleClick={(e) => {
            if (!canEdit || !(e.target as HTMLElement).classList.contains('react-flow__pane')) return;
            const at = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            createAndEdit((g) => addFreeNode(g, at, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length]));
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            if (node.type === 'comment') return setMenu({ kind: 'comment', id: node.id, x: e.clientX, y: e.clientY });
            if (!canComment) return;
            if (!node.selected) selectOnly(node.id);
            setMenu({ kind: 'node', id: node.id, x: e.clientX, y: e.clientY });
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            if (!canEdit || edge.type !== 'branch') return;
            setMenu({ kind: 'edge', id: edge.id, x: e.clientX, y: e.clientY });
          }}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setMenu({ kind: 'pane', x: e.clientX, y: e.clientY, fx: p.x, fy: p.y });
          }}
          onlyRenderVisibleElements
          deleteKeyCode={null}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={multiSelectKeys}
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          elementsSelectable
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          disableKeyboardA11y
          nodesFocusable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <DotGrid />
        </ReactFlow>

        {nodeCount >= 50 && (
          <div className="minimap-wrap">
            <MiniMap nodes={rfNodes} />
          </div>
        )}

        <div className="dock">
          {canEdit && (
            <button
              className="dock-btn"
              title="New idea (or double-click the canvas)"
              onClick={() => {
                const c = rf.screenToFlowPosition({ x: innerWidth / 2, y: innerHeight / 2 });
                createAndEdit((g) =>
                  selectedNodeIds.length === 1
                    ? addChild(g, selectedNodeIds[0], size)
                    : addFreeNode(g, { x: c.x + (Math.random() - 0.5) * 80, y: c.y + (Math.random() - 0.5) * 80 }, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length]),
                );
              }}
            >
              {Icon.plus}
              <span>Idea</span>
            </button>
          )}
          {canComment && (
            <button className="dock-btn" title="Comment on the selected idea" onClick={() => startComment(selectedNodeIds[0] ?? null)}>
              {Icon.comment}
              <span>Comment</span>
            </button>
          )}
          {canEdit && (
            <button className="dock-btn" title="Tidy layout" onClick={runTidy}>
              {Icon.tidy}
              <span>Tidy</span>
            </button>
          )}
          <button className="dock-btn" title="Fit to screen" onClick={fit}>
            {Icon.fit}
            <span>Fit</span>
          </button>
        </div>

        <HintLine canEdit={canEdit} canComment={canComment} />

        {canEdit && inspectorOpen && hasSelection && (
          <InspectorGate>
            <Suspense fallback={null}>
              <Inspector graph={graph} nodeIds={selectedNodeIds} edgeIds={selectedEdgeIds} commit={commit} onClose={() => setInspectorOpen(false)} />
            </Suspense>
          </InspectorGate>
        )}
        <SproutGhost graph={graph} />
        {menu && (
          <RadialMenu
            key={menu.kind + ('id' in menu ? menu.id : '')}
            x={menu.x}
            y={menu.y}
            items={menuItems(menu)}
            title={menu.kind === 'shape' ? 'Shape' : menu.kind === 'line' ? 'Branch' : ''}
            onClose={() => setMenu(null)}
          />
        )}
        {wheel && (
          <ColorWheel
            x={wheel.x}
            y={wheel.y}
            value={graph.nodes[wheel.ids[0]]?.color ?? graph.edges[wheel.ids[0]]?.color}
            onPick={(c) => commit((g) => recolor(g, wheel.ids, c))}
            onClose={() => setWheel(null)}
          />
        )}
      </CanvasFrame>
    </EditorContext.Provider>
  );
}

/** Wrapper that owns the "connecting" class so the editor itself doesn't re-render for it. */
function CanvasFrame({ children }: { children: React.ReactNode }) {
  const connecting = useUIStore((s) => s.connectingFrom !== null);
  return <div className={`canvas${connecting ? ' connecting' : ''}`}>{children}</div>;
}

/** Hides the inspector while a node is being edited. */
function InspectorGate({ children }: { children: React.ReactNode }) {
  const editing = useUIStore((s) => s.editingId !== null);
  return editing ? null : <>{children}</>;
}

function HintLine({ canEdit, canComment }: { canEdit: boolean; canComment: boolean }) {
  const connecting = useUIStore((s) => s.connectingFrom !== null);
  return (
    <div className="hint">
      {connecting
        ? 'Click another idea to link it · Esc to cancel'
        : canEdit
          ? 'Right-click for the wheel · hover an idea and drag its + · double-click to edit · Tab child · Enter sibling'
          : canComment
            ? 'You can comment: right-click an idea, or use the Comment button'
            : 'View only'}
    </div>
  );
}

/** Dashed line from an idea to the pointer while a + is being dragged. */
function SproutGhost({ graph }: { graph: Graph }) {
  const sprout = useUIStore((s) => s.sprout);
  const rf = useReactFlow();
  if (!sprout?.moved) return null;
  const n = rf.getInternalNode(sprout.from);
  const gn = graph.nodes[sprout.from];
  if (!n || !gn) return null;
  const p = rf.flowToScreenPosition({
    x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
    y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
  });
  const mx = (p.x + sprout.x) / 2;
  return (
    <svg className="ghost-layer" aria-hidden>
      <path d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${sprout.y} ${sprout.x},${sprout.y}`} stroke={gn.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 6" />
      <circle cx={sprout.x} cy={sprout.y} r="6" fill={gn.color} />
    </svg>
  );
}

export const MapEditor = memo(MapEditorImpl);
