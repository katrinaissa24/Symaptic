import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { perfCount } from '../lib/perf';
import {
  ReactFlow,
  SelectionMode,
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
import type { AppUser, Graph, MapComment, MapEdge, MapNode } from '../lib/types';
import { BRANCH_COLORS } from '../lib/palette';
import { EditorContext, type EditorActions } from './EditorContext';
import { useUIStore } from './uiStore';
import { IdeaNode } from './IdeaNode';
import { CommentNode } from './CommentNode';
import { BranchEdge, ThoughtEdge } from './Edges';
import { DotGrid } from './DotGrid';
import { Guides } from './Guides';
import { SproutToolbar } from './SproutToolbar';
import { ZoomControls } from './ZoomControls';
import { snapRect } from './snap';
import { isLegacy } from './compat';
import { toast } from '../components/Toast';
import { MiniMap } from './MiniMap';
import type { Pt } from './geometry';
import { Toolbar } from './Toolbar';
import { ShortcutsDialog } from './ShortcutsDialog';
import { CommandPalette, type Command } from './CommandPalette';
import { EmptyStateHint, OnboardingTip } from './Onboarding';
import { commentMenu, edgeMenu, nodeMenu, paneMenu, type MenuApi } from './menus';
import { ContextMenu, type MenuItem } from '../components/ui';
import { CircleHelp, Copy, Hand, ListTree, Maximize, MessageSquare, MousePointer2, Pencil, Plus, Redo2, Share2, Trash2, Undo2, ZoomIn, ZoomOut, Map as MapIcon, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getThemePref, setThemePref } from '../lib/theme';
import { tidy } from './layout';
import { estimateSize, fitViewport, nodeRect, TWEEN_MS, MIN_ZOOM, MAX_ZOOM, easeOut, zoomTo } from './viewport';
import {
  addChild,
  addComment,
  addFreeNode,
  addSibling,
  clipboardFor,
  commentSpot,
  connect,
  duplicate,
  navigate,
  pasteItems,
  isMine,
  moveItems,
  removeItems,
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
/** Touch devices pan with one finger; the drag-box needs a mouse. */
const COARSE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const LONG_PRESS_MS = 500;

type Menu = { items: MenuItem[]; x: number; y: number };

interface Props {
  graph: Graph;
  commit(fn: (g: Graph) => Graph, opts?: { history?: boolean }): void;
  snapshot(): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  canEdit: boolean;
  canComment: boolean;
  user: AppUser | null;
  onShare?(): void;
  onRenameTitle?(): void;
}

// ------------------------------------------------------------ graph → React Flow (with structural reuse)

type IdeaData = { node: MapNode; legacy: boolean };
type CommentData = { comment: MapComment };
type BranchData = { edge: MapEdge; legacy: boolean };

const ideaDataCache = new Map<string, IdeaData>();
const commentDataCache = new WeakMap<MapComment, CommentData>();
const branchDataCache = new WeakMap<MapEdge, BranchData>();

/** Everything that affects how an idea is drawn, except its position. */
const visualKey = (n: MapNode) =>
  `${n.text}\u0000${n.shape}\u0000${n.color}\u0000${n.fill}\u0000${n.fontSize}\u0000${n.bold ? 1 : 0}\u0000${n.borderWidth}\u0000${n.borderStyle}\u0000${n.root ? 1 : 0}`;

function ideaData(n: MapNode, legacy: boolean): IdeaData {
  const cached = ideaDataCache.get(n.id);
  if (cached && cached.legacy === legacy && (cached.node === n || visualKey(cached.node) === visualKey(n))) return cached;
  const d = { node: n, legacy };
  ideaDataCache.set(n.id, d);
  return d;
}

interface SyncOpts {
  canEdit: boolean;
  /** Ideas are draggable only with the select tool. */
  draggable: boolean;
  canComment: boolean;
  user: AppUser | null;
  openCommentId: string | null;
  pendingSelect: string | null;
}

function syncNodes(prev: Node[], graph: Graph, o: SyncOpts): Node[] {
  const old = new Map(prev.map((n) => [n.id, n]));
  const out: Node[] = [];
  const legacy = isLegacy(graph);
  let changed = prev.length !== Object.keys(graph.nodes).length + Object.keys(graph.comments).length;
  for (const n of Object.values(graph.nodes)) {
    const p = old.get(n.id);
    const data = ideaData(n, legacy);
    const zIndex = n.root ? 3 : 2;
    const selected = o.pendingSelect ? n.id === o.pendingSelect : !!p?.selected;
    if (p && p.data === data && p.position.x === n.x && p.position.y === n.y && p.draggable === o.draggable && p.zIndex === zIndex && p.selected === selected) {
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
      draggable: o.draggable,
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
    const draggable = o.draggable || (o.canComment && isMine(c, o.user));
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
  const legacy = isLegacy(graph);
  let changed = false;
  for (const e of Object.values(graph.edges)) {
    if (!graph.nodes[e.source] || !graph.nodes[e.target]) continue;
    let data = branchDataCache.get(e);
    if (!data || data.legacy !== legacy) {
      data = { edge: e, legacy };
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
  /** Rectangles of ideas that are not moving, for alignment guides. */
  others: { x: number; y: number; width: number; height: number }[];
  primarySize: { width: number; height: number };
}

/** Pixels of pointer travel within which the dragged idea snaps to a guide. */
const SNAP_PX = 6;

type Clip = ReturnType<typeof clipboardFor>;
const CLIP_KEY = 'symaptic:clipboard';
function readClip(): Clip | null {
  try {
    return JSON.parse(localStorage.getItem(CLIP_KEY) || 'null');
  } catch {
    return null;
  }
}

function MapEditorImpl({ graph, commit, snapshot, undo, redo, canUndo, canRedo, canEdit, canComment, user, onShare, onRenameTitle }: Props) {
  perfCount('MapEditor');
  const rf = useReactFlow();
  const storeApi = useStoreApi();
  const nav = useNavigate();
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openCommentId = useUIStore((s) => s.openCommentId);
  const tool = useUIStore((s) => s.tool);
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
    const o: SyncOpts = { canEdit, draggable: canEdit && tool === 'select', canComment, user, openCommentId, pendingSelect: pendingSelect.current };
    setRfNodes((prev) => syncNodes(prev, graph, o));
    setRfEdges((prev) => syncEdges(prev, graph, canEdit, o.pendingSelect));
    if (o.pendingSelect && graph.nodes[o.pendingSelect]) pendingSelect.current = null;
  }, [graph, canEdit, canComment, user, openCommentId, tool]);

  // Fit once, as soon as there is something to fit. Sizes are estimated until nodes are measured.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !rfNodes.length) return;
    fitted.current = true;
    const { width, height } = storeApi.getState();
    fitViewport(rf, rfNodes, { width, height }, 0);
  }, [rfNodes, rf, storeApi]);

  // ------------------------------------------------------------ selection
  // Arrays are only replaced when the selected ids change, so children that receive them
  // (inspector, menus) don't re-render on every drag frame.
  const selKeyNow = (() => {
    let k = '';
    for (const n of rfNodes) if (n.selected) k += (n.type === 'idea' ? 'n' : 'c') + n.id + ',';
    k += '|';
    for (const e of rfEdges) if (e.selected && e.type === 'branch') k += e.id + ',';
    return k;
  })();
  const selection = useMemo(() => {
    const nodeIds: string[] = [];
    const commentIds: string[] = [];
    for (const n of rfNodes) if (n.selected) (n.type === 'idea' ? nodeIds : commentIds).push(n.id);
    const edgeIds: string[] = [];
    for (const e of rfEdges) if (e.selected && e.type === 'branch') edgeIds.push(e.id);
    return { nodeIds, commentIds, edgeIds, key: selKeyNow };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKeyNow]);
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
      const others: DragSession['others'] = [];
      let primarySize = { width: 120, height: 34 };
      for (const n of rfNodesRef.current) {
        if (dragged.has(n.id) || followers.has(n.id)) {
          start.set(n.id, { x: n.position.x, y: n.position.y });
          if (n.id === node.id) {
            const r = nodeRect(n);
            primarySize = { width: r.width, height: r.height };
          }
        } else if (n.type === 'idea') others.push(nodeRect(n));
      }
      drag.current = { primary: node.id, dragged, followers: [...followers], start, pos: new Map(), others, primarySize };
    },
    [snapshot, ui],
  );

  // During a drag, position changes are coalesced to one React Flow update per animation frame.
  const pendingDrag = useRef<NodeChange[] | null>(null);
  const dragRaf = useRef<number | null>(null);
  const flushDrag = useCallback(() => {
    dragRaf.current = null;
    const pend = pendingDrag.current;
    pendingDrag.current = null;
    if (pend?.length) setRfNodes((ns) => applyNodeChanges(pend, ns));
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const d = drag.current;
      if (!d) {
        setRfNodes((ns) => applyNodeChanges(changes, ns));
        return;
      }
      let primary: NodePositionChange | undefined;
      const rest: NodeChange[] = [];
      for (const c of changes) {
        if (c.type === 'position' && c.position) {
          d.pos.set(c.id, c.position);
          if (c.id === d.primary) primary = c;
        } else rest.push(c);
      }
      if (rest.length) setRfNodes((ns) => applyNodeChanges(rest, ns));
      if (!primary?.position) return;
      // Smart guides: snap the dragged idea, then move everything else by the same delta.
      const zoom = storeApi.getState().transform[2];
      const snapped = snapRect({ x: primary.position.x, y: primary.position.y, ...d.primarySize }, d.others, SNAP_PX / zoom);
      ui().setGuides(snapped.guides);
      const s0 = d.start.get(d.primary)!;
      const dx = snapped.x - s0.x;
      const dy = snapped.y - s0.y;
      const moves: NodeChange[] = [];
      for (const id of d.dragged) {
        const cs = d.start.get(id);
        if (!cs) continue;
        const position = id === d.primary ? { x: snapped.x, y: snapped.y } : { x: cs.x + dx, y: cs.y + dy };
        d.pos.set(id, position);
        moves.push({ type: 'position', id, position, dragging: true });
      }
      for (const f of d.followers) {
        const fs = d.start.get(f);
        if (!fs) continue;
        const position = { x: fs.x + dx, y: fs.y + dy };
        d.pos.set(f, position);
        moves.push({ type: 'position', id: f, position, dragging: true });
      }
      // Latest position wins; earlier unflushed moves for the same ids are superseded.
      pendingDrag.current = moves;
      if (dragRaf.current == null) dragRaf.current = requestAnimationFrame(flushDrag);
    },
    [storeApi, ui, flushDrag],
  );

  const onNodeDragStop = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    ui().setDragging(false);
    ui().setGuides([]);
    if (dragRaf.current != null) cancelAnimationFrame(dragRaf.current);
    pendingDrag.current = null;
    dragRaf.current = null;
    if (!d) return;
    const rounded = new Map<string, Pt>();
    for (const [id, p] of d.pos) rounded.set(id, { x: Math.round(p.x), y: Math.round(p.y) });
    const fixes: NodeChange[] = [];
    for (const [id, position] of rounded) fixes.push({ type: 'position', id, position, dragging: false });
    if (fixes.length) setRfNodes((ns) => applyNodeChanges(fixes, ns));
    commit((g) => moveItems(g, rounded), { history: false });
  }, [commit, ui]);
  useEffect(() => () => {
    if (dragRaf.current != null) cancelAnimationFrame(dragRaf.current);
  }, []);

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

  const commentOnSelection = useCallback(() => {
    if (!selectedNodeIds.length) {
      toast.info('Select an idea to comment on');
      return;
    }
    startComment(selectedNodeIds[0]);
  }, [selectedNodeIds, startComment]);

  const pointer = useRef<Pt | null>(null);

  const newIdea = useCallback(() => {
    const { width, height } = storeApi.getState();
    const c = rf.screenToFlowPosition({ x: width / 2, y: height / 2 + 48 });
    createAndEdit((g) =>
      selectedNodeIds.length === 1
        ? addChild(g, selectedNodeIds[0], size)
        : addFreeNode(g, { x: c.x + (Math.random() - 0.5) * 80, y: c.y + (Math.random() - 0.5) * 80 }, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length]),
    );
  }, [createAndEdit, rf, selectedNodeIds, size, storeApi]);

  const copySelection = useCallback(() => {
    if (!selectedNodeIds.length) return;
    const clip = clipboardFor(graphRef.current, selectedNodeIds);
    try {
      localStorage.setItem(CLIP_KEY, JSON.stringify(clip));
    } catch {
      /* ignore */
    }
    toast.success(`Copied ${clip.nodes.length} idea${clip.nodes.length === 1 ? '' : 's'}`, { duration: 1500 });
  }, [selectedNodeIds]);

  const pasteClipboard = useCallback(() => {
    const clip = readClip();
    if (!clip?.nodes.length) return;
    const minX = Math.min(...clip.nodes.map((n) => n.x));
    const minY = Math.min(...clip.nodes.map((n) => n.y));
    const at = pointer.current ?? { x: minX + 32, y: minY + 32 };
    let ids: string[] = [];
    commit((g) => {
      const r = pasteItems(g, clip, at);
      ids = r.ids;
      return r.graph;
    });
    setTimeout(() => selectMany(ids), 0);
  }, [commit, selectMany]);

  // Latest closures for the stable action object and the single keyboard listener.
  const latest = useRef({ createAndEdit, commit, size, selectOnly, selectMany, deleteSelection, undo, redo, canEdit, canComment, selectedNodeIds, selectedCommentIds, rf, fit, copySelection, pasteClipboard, newIdea, commentOnSelection, runTidy });
  latest.current = { createAndEdit, commit, size, selectOnly, selectMany, deleteSelection, undo, redo, canEdit, canComment, selectedNodeIds, selectedCommentIds, rf, fit, copySelection, pasteClipboard, newIdea, commentOnSelection, runTidy };

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
  const menuOpenRef = useRef(false);
  menuOpenRef.current = !!menu;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const L = latest.current;
      if (isTyping(e.target) || menuOpenRef.current || ui().modalDepth > 0) return;
      const mod = e.metaKey || e.ctrlKey;
      const one = L.selectedNodeIds.length === 1 ? L.selectedNodeIds[0] : null;
      const key = e.key.toLowerCase();
      const viewSize = () => ({ width: storeApi.getState().width, height: storeApi.getState().height });
      if (mod && key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === '?' && !mod) {
        e.preventDefault();
        setHelpOpen(true);
      } else if (!mod && !e.altKey && key === 'v') {
        ui().setTool('select');
      } else if (!mod && !e.altKey && key === 'h') {
        ui().setTool('hand');
      } else if (!mod && !e.altKey && key === 'n' && L.canEdit) {
        e.preventDefault();
        L.newIdea();
      } else if (!mod && !e.altKey && key === 'c' && L.canComment) {
        e.preventDefault();
        L.commentOnSelection();
      } else if (!mod && !e.altKey && key === 't' && L.canEdit) {
        e.preventDefault();
        L.runTidy();
      } else if (mod && key === 'z') {
        e.preventDefault();
        if (L.canEdit || L.canComment) (e.shiftKey ? L.redo : L.undo)();
      } else if (mod && key === 'y') {
        e.preventDefault();
        if (L.canEdit || L.canComment) L.redo();
      } else if (mod && (key === '=' || key === '+')) {
        e.preventDefault();
        zoomTo(L.rf, L.rf.getViewport().zoom * 1.2, viewSize());
      } else if (mod && key === '-') {
        e.preventDefault();
        zoomTo(L.rf, L.rf.getViewport().zoom / 1.2, viewSize());
      } else if (mod && key === '0') {
        e.preventDefault();
        zoomTo(L.rf, 1, viewSize());
      } else if (e.shiftKey && !mod && e.key === '!') {
        e.preventDefault();
        L.fit();
      } else if (e.shiftKey && !mod && e.key === ')') {
        e.preventDefault();
        zoomTo(L.rf, 1, viewSize());
      } else if (mod && key === 'a') {
        e.preventDefault();
        L.selectMany(Object.keys(graphRef.current.nodes));
      } else if (mod && key === 'c' && L.selectedNodeIds.length) {
        e.preventDefault();
        L.copySelection();
      } else if (e.key.startsWith('Arrow') && one && !mod) {
        const next = navigate(graphRef.current, one, e.key as 'ArrowLeft');
        if (next) {
          e.preventDefault();
          L.selectOnly(next);
        }
      } else if (!L.canEdit) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && L.selectedCommentIds.length) L.deleteSelection();
      } else if (mod && key === 'v') {
        e.preventDefault();
        L.pasteClipboard();
      } else if (mod && key === 'x' && L.selectedNodeIds.length) {
        e.preventDefault();
        L.copySelection();
        L.deleteSelection();
      } else if (e.key === 'Tab' && one) {
        e.preventDefault();
        L.createAndEdit((g) => addChild(g, one, L.size));
      } else if (e.key === 'Enter' && one) {
        e.preventDefault();
        L.createAndEdit((g) => addSibling(g, one, L.size) ?? addChild(g, one, L.size));
      } else if (e.key === 'F2' && one) {
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
  }, [ui, storeApi]);

  // ------------------------------------------------------------ menus (built when opened)
  const menuApi = (): MenuApi => ({
    graph: graphRef.current,
    user,
    canEdit,
    canComment,
    commit,
    addChild: (id) => createAndEdit((g) => addChild(g, id, size)),
    addSibling: (id) => createAndEdit((g) => addSibling(g, id, size) ?? addChild(g, id, size)),
    addFree: (at) => createAndEdit((g) => addFreeNode(g, at, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length])),
    comment: (nodeId, at) => startComment(nodeId, at),
    link: (id) => ui().setConnectingFrom(id),
    duplicate: (ids) => {
      let out: string[] = [];
      commit((g) => {
        const r = duplicate(g, ids);
        out = r.ids;
        return r.graph;
      });
      setTimeout(() => selectMany(out), 0);
    },
    remove: (ids) => commit((g) => removeItems(g, ids)),
    paste: (at) => {
      pointer.current = at;
      pasteClipboard();
    },
    canPaste: !!readClip()?.nodes.length,
    tidy: runTidy,
    fit,
    undo,
    redo,
    canUndo,
    canRedo,
    openComment: (id) => ui().setOpenCommentId(id),
  });

  const commands = useMemo<Command[]>(() => {
    const dark = getThemePref() === 'dark';
    const list: Command[] = [];
    if (canEdit) {
      list.push(
        { id: 'idea', group: 'Ideas', label: 'New idea', icon: <Plus />, shortcut: 'N', run: () => latest.current.newIdea() },
        { id: 'dup', group: 'Ideas', label: 'Duplicate selection', icon: <Copy />, shortcut: 'Mod+D', disabled: !selectedNodeIds.length, run: () => menuApi().duplicate(latest.current.selectedNodeIds) },
        { id: 'del', group: 'Ideas', label: 'Delete selection', icon: <Trash2 />, shortcut: 'Delete', disabled: !selectedNodeIds.length && !selectedEdgeIds.length, run: () => latest.current.deleteSelection() },
        { id: 'tidy', group: 'View', label: 'Tidy layout', icon: <ListTree />, shortcut: 'T', run: () => latest.current.runTidy() },
      );
    }
    if (canComment) list.push({ id: 'comment', group: 'Ideas', label: 'Comment on selection', icon: <MessageSquare />, shortcut: 'C', run: () => latest.current.commentOnSelection() });
    list.push(
      { id: 'fit', group: 'View', label: 'Fit to screen', icon: <Maximize />, shortcut: 'Shift+1', run: () => latest.current.fit() },
      { id: 'zin', group: 'View', label: 'Zoom in', icon: <ZoomIn />, shortcut: 'Mod+=', run: () => zoomTo(rf, rf.getViewport().zoom * 1.2, { width: storeApi.getState().width, height: storeApi.getState().height }) },
      { id: 'zout', group: 'View', label: 'Zoom out', icon: <ZoomOut />, shortcut: 'Mod+-', run: () => zoomTo(rf, rf.getViewport().zoom / 1.2, { width: storeApi.getState().width, height: storeApi.getState().height }) },
      { id: 'select', group: 'Tools', label: 'Select tool', icon: <MousePointer2 />, shortcut: 'V', run: () => ui().setTool('select') },
      { id: 'hand', group: 'Tools', label: 'Hand tool', icon: <Hand />, shortcut: 'H', run: () => ui().setTool('hand') },
    );
    if (canEdit || canComment)
      list.push(
        { id: 'undo', group: 'History', label: 'Undo', icon: <Undo2 />, shortcut: 'Mod+Z', disabled: !canUndo, run: undo },
        { id: 'redo', group: 'History', label: 'Redo', icon: <Redo2 />, shortcut: 'Mod+Shift+Z', disabled: !canRedo, run: redo },
      );
    if (onShare) list.push({ id: 'share', group: 'Map', label: 'Share map', icon: <Share2 />, run: onShare });
    if (onRenameTitle && canEdit) list.push({ id: 'rename', group: 'Map', label: 'Rename map', icon: <Pencil />, run: onRenameTitle });
    list.push(
      { id: 'maps', group: 'Map', label: 'Go to My maps', icon: <MapIcon />, run: () => nav('/app') },
      { id: 'theme', group: 'Appearance', label: dark ? 'Switch to light theme' : 'Switch to dark theme', icon: dark ? <Sun /> : <Moon />, run: () => setThemePref(dark ? 'light' : 'dark') },
      { id: 'help', group: 'Help', label: 'Keyboard shortcuts', icon: <CircleHelp />, shortcut: '?', run: () => setHelpOpen(true) },
    );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, canComment, canUndo, canRedo, selectedNodeIds.length, selectedEdgeIds.length, onShare, onRenameTitle, paletteOpen]);

  const rootOnly = useMemo(() => {
    const ids = Object.keys(graph.nodes);
    return ids.length === 1 && Object.keys(graph.comments).length === 0 ? ids[0] : null;
  }, [graph]);

  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
  const selKey = selection.key;
  useEffect(() => setInspectorOpen(true), [selKey]);
  const closeInspector = useCallback(() => setInspectorOpen(false), []);
  const nodeCount = rfNodes.length;

  return (
    <EditorContext.Provider value={actions}>
      <main className="editor-body" aria-label="Map canvas">
      <CanvasFrame
        onLongPress={(target, x, y) => {
          const nodeEl = target.closest('.react-flow__node');
          const id = nodeEl?.getAttribute('data-id');
          if (id && graphRef.current.comments[id]) return setMenu({ items: commentMenu(menuApi(), id), x, y });
          if (id && graphRef.current.nodes[id]) {
            if (!canComment) return;
            const ids = selectedNodeIds.includes(id) ? selectedNodeIds : [id];
            if (!selectedNodeIds.includes(id)) selectOnly(id);
            return setMenu({ items: nodeMenu(menuApi(), ids), x, y });
          }
          if (target.classList.contains('react-flow__pane')) setMenu({ items: paneMenu(menuApi(), rf.screenToFlowPosition({ x, y })), x, y });
        }}
      >
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
          onNodeMouseEnter={(_, node) => {
            if (node.type === 'idea') ui().setHoverId(node.id);
          }}
          onNodeMouseLeave={(_, node) => {
            // Delay so the pointer can travel onto the + buttons next to the idea.
            if (node.type !== 'idea') return;
            const id = node.id;
            setTimeout(() => {
              if (ui().hoverId === id && !document.querySelector('.sprout-toolbar:hover')) ui().setHoverId(null);
            }, 150);
          }}
          onPaneMouseMove={(e) => {
            pointer.current = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          }}
          onPaneMouseLeave={() => {
            pointer.current = null;
          }}
          onDoubleClick={(e) => {
            if (!canEdit || !(e.target as HTMLElement).classList.contains('react-flow__pane')) return;
            const at = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            createAndEdit((g) => addFreeNode(g, at, BRANCH_COLORS[Object.keys(g.nodes).length % BRANCH_COLORS.length]));
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            if (node.type === 'comment') return setMenu({ items: commentMenu(menuApi(), node.id), x: e.clientX, y: e.clientY });
            if (!canComment) return;
            const ids = node.selected && selectedNodeIds.includes(node.id) ? selectedNodeIds : [node.id];
            if (!node.selected) selectOnly(node.id);
            setMenu({ items: nodeMenu(menuApi(), ids), x: e.clientX, y: e.clientY });
          }}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            if (!canEdit || edge.type !== 'branch') return;
            setMenu({ items: edgeMenu(menuApi(), edge.id), x: e.clientX, y: e.clientY });
          }}
          onPaneContextMenu={(e) => {
            e.preventDefault();
            const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            setMenu({ items: paneMenu(menuApi(), p), x: e.clientX, y: e.clientY });
          }}
          onSelectionContextMenu={(e) => {
            e.preventDefault();
            if (!canComment || !selectedNodeIds.length) return;
            setMenu({ items: nodeMenu(menuApi(), selectedNodeIds), x: e.clientX, y: e.clientY });
          }}
          onlyRenderVisibleElements
          deleteKeyCode={null}
          selectionOnDrag={tool === 'select' && !COARSE}
          selectionMode={SelectionMode.Partial}
          panOnDrag={tool === 'hand' || COARSE ? true : [1]}
          panActivationKeyCode="Space"
          selectionKeyCode={null}
          elementsSelectable={tool === 'select'}
          className={tool === 'hand' ? 'tool-hand' : undefined}
          multiSelectionKeyCode={multiSelectKeys}
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          disableKeyboardA11y
          nodesFocusable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <DotGrid />
          <SproutToolbar selectedId={selectedNodeIds.length === 1 ? selectedNodeIds[0] : null} />
          {rootOnly && canEdit && <EmptyStateHint rootId={rootOnly} />}
        </ReactFlow>
        <Guides />

        <ZoomControls onFit={fit} />

        {nodeCount >= 50 && (
          <div className="minimap-wrap">
            <MiniMap nodes={rfNodes} />
          </div>
        )}

        <Toolbar canEdit={canEdit} canComment={canComment} onIdea={newIdea} onComment={commentOnSelection} onTidy={runTidy} onHelp={() => setHelpOpen(true)} />
        <OnboardingTip canEdit={canEdit} />

        <SproutGhost graph={graph} />
        {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
        <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} />
      </CanvasFrame>
      {canEdit && inspectorOpen && hasSelection && (
        <InspectorGate>
          <Suspense fallback={null}>
            <Inspector graph={graph} nodeIds={selectedNodeIds} edgeIds={selectedEdgeIds} commit={commit} onClose={closeInspector} />
          </Suspense>
        </InspectorGate>
      )}
      </main>
    </EditorContext.Provider>
  );
}

/** Wrapper that owns the "connecting" class so the editor itself doesn't re-render for it. */
function CanvasFrame({ children, onLongPress }: { children: React.ReactNode; onLongPress?(target: Element, x: number, y: number): void }) {
  const connecting = useUIStore((s) => s.connectingFrom !== null);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };
  return (
    <div
      className={`canvas${connecting ? ' connecting' : ''}`}
      onPointerDownCapture={(e) => {
        if (e.pointerType !== 'touch' || !onLongPress) return;
        cancel();
        const target = e.target as Element;
        const x = e.clientX;
        const y = e.clientY;
        press.current = { x, y, timer: window.setTimeout(() => onLongPress(target, x, y), LONG_PRESS_MS) };
      }}
      onPointerMoveCapture={(e) => {
        if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) cancel();
      }}
      onPointerUpCapture={cancel}
      onPointerCancelCapture={cancel}
    >
      {children}
    </div>
  );
}

/** Hides the inspector while a node is being edited. */
function InspectorGate({ children }: { children: React.ReactNode }) {
  const editing = useUIStore((s) => s.editingId !== null);
  return editing ? null : <>{children}</>;
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
