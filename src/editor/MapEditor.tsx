import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AppUser, CurveStyle, Graph, LineStyle, MapComment, MapEdge, MapNode, Shape } from '../lib/types';
import { BRANCH_COLORS } from '../lib/palette';
import { EditorContext, type EditorCtx } from './EditorContext';
import { IdeaNode } from './IdeaNode';
import { CommentNode } from './CommentNode';
import { BranchEdge, ThoughtEdge } from './Edges';
import { ColorWheel, RadialMenu, type RadialItem } from './RadialMenu';
import { Inspector } from './Inspector';
import { Icon, ShapeIcon } from './icons';
import { SHAPE_LABELS } from './geometry';
import { tidy } from './layout';
import {
  addChild,
  addComment,
  addFreeNode,
  addSibling,
  commentSpot,
  connect,
  duplicate,
  incomingEdgeIds,
  recolor,
  removeItems,
  setEdgeProps,
  setNodeProps,
  subtree,
  updateComment,
  type Dir,
} from './ops';

const nodeTypes = { idea: IdeaNode, comment: CommentNode };
const edgeTypes = { branch: BranchEdge, thought: ThoughtEdge };

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

// Stable `data` objects per item so memoised node components only re-render when their item changes.
const ideaData = new WeakMap<MapNode, { node: MapNode }>();
const commentData = new WeakMap<MapComment, { comment: MapComment }>();

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

export function MapEditor({ graph, commit, snapshot, undo, redo, canEdit, canComment, user }: Props) {
  const rf = useReactFlow();
  const [rfNodes, setRfNodes] = useState<Node[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [wheel, setWheel] = useState<{ ids: string[]; x: number; y: number } | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [sprout, setSprout] = useState<{ from: string; x: number; y: number; moved: boolean } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const pendingSelect = useRef<string | null>(null);
  const altDown = useRef(false);
  const graphRef = useRef(graph);
  graphRef.current = graph;

  const size = useCallback(
    (id: string) => {
      const n = rf.getInternalNode(id);
      return { w: n?.measured.width ?? 120, h: n?.measured.height ?? 40 };
    },
    [rf],
  );

  // ------------------------------------------------------------ graph → React Flow
  const built = useMemo(() => {
    const nodes: Node[] = [];
    for (const n of Object.values(graph.nodes)) {
      let data = ideaData.get(n);
      if (!data) ideaData.set(n, (data = { node: n }));
      nodes.push({ id: n.id, type: 'idea', position: { x: n.x, y: n.y }, data, draggable: canEdit, zIndex: n.root ? 3 : 2 });
    }
    for (const c of Object.values(graph.comments)) {
      let data = commentData.get(c);
      if (!data) commentData.set(c, (data = { comment: c }));
      const mine = user?.email === c.authorEmail;
      nodes.push({
        id: c.id,
        type: 'comment',
        position: { x: c.x, y: c.y },
        data,
        draggable: canEdit || (canComment && mine),
        zIndex: openCommentId === c.id ? 1000 : 500,
      });
    }
    const edges: Edge[] = [];
    for (const e of Object.values(graph.edges)) {
      if (!graph.nodes[e.source] || !graph.nodes[e.target]) continue;
      edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'branch',
        data: { edge: e, targetShape: graph.nodes[e.target].shape, sourceShape: graph.nodes[e.source].shape },
        selectable: canEdit,
        zIndex: 0,
      });
    }
    for (const c of Object.values(graph.comments)) {
      if (c.nodeId && graph.nodes[c.nodeId] && !c.resolved)
        edges.push({ id: 't_' + c.id, source: c.nodeId, target: c.id, type: 'thought', selectable: false, focusable: false, zIndex: 1 });
    }
    return { nodes, edges };
  }, [graph, canEdit, canComment, user, openCommentId]);

  useEffect(() => {
    setRfNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      const sel = pendingSelect.current;
      return built.nodes.map((n) => {
        const p = old.get(n.id);
        const selected = sel ? n.id === sel : !!p?.selected;
        return p ? { ...n, selected, measured: p.measured, dragging: p.dragging } : { ...n, selected };
      });
    });
    if (pendingSelect.current && graph.nodes[pendingSelect.current]) pendingSelect.current = null;
    setRfEdges((prev) => {
      const old = new Map(prev.map((e) => [e.id, e]));
      return built.edges.map((e) => ({ ...e, selected: pendingSelect.current ? false : !!old.get(e.id)?.selected }));
    });
  }, [built, graph.nodes]);

  // Fit once, after the first nodes have been measured.
  const initialized = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => {
    if (initialized && !fitted.current && rfNodes.length) {
      fitted.current = true;
      rf.fitView({ padding: 0.35, maxZoom: 1.1 });
    }
  }, [initialized, rfNodes.length, rf]);

  // ------------------------------------------------------------ selection helpers
  const selectedNodeIds = rfNodes.filter((n) => n.selected && n.type === 'idea').map((n) => n.id);
  const selectedCommentIds = rfNodes.filter((n) => n.selected && n.type === 'comment').map((n) => n.id);
  const selectedEdgeIds = rfEdges.filter((e) => e.selected && e.type === 'branch').map((e) => e.id);

  const selectOnly = (id: string | null) => {
    pendingSelect.current = id;
    setRfNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })));
    setRfEdges((es) => es.map((e) => ({ ...e, selected: false })));
  };

  const createAndEdit = (fn: (g: Graph) => { graph: Graph; id: string } | null) => {
    let newId: string | null = null;
    commit((g) => {
      const r = fn(g);
      if (!r) return g;
      newId = r.id;
      return r.graph;
    });
    if (newId) {
      selectOnly(newId);
      setEditingId(newId);
      setInspectorOpen(true);
    }
  };

  // ------------------------------------------------------------ React Flow callbacks
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((ns) => applyNodeChanges(changes, ns));
      const moves = changes.filter((c) => c.type === 'position' && c.position) as Extract<NodeChange, { type: 'position' }>[];
      if (!moves.length) return;
      commit(
        (g) => {
          const nodes = { ...g.nodes };
          const comments = { ...g.comments };
          const direct = new Set(moves.map((m) => m.id));
          const shifted = new Set<string>();
          const shiftComments = (nodeId: string, dx: number, dy: number) => {
            for (const c of Object.values(g.comments))
              if (c.nodeId === nodeId && !direct.has(c.id)) comments[c.id] = { ...comments[c.id], x: comments[c.id].x + dx, y: comments[c.id].y + dy };
          };
          for (const m of moves) {
            const x = Math.round(m.position!.x);
            const y = Math.round(m.position!.y);
            if (g.nodes[m.id]) {
              const n = g.nodes[m.id];
              const dx = x - n.x;
              const dy = y - n.y;
              if (!dx && !dy) continue;
              nodes[m.id] = { ...n, x, y };
              shiftComments(m.id, dx, dy);
              // The branch follows its parent – hold Alt to move a single idea.
              if (!altDown.current && m.dragging) {
                for (const d of subtree(g, m.id)) {
                  if (d === m.id || direct.has(d) || shifted.has(d)) continue;
                  shifted.add(d);
                  nodes[d] = { ...nodes[d], x: nodes[d].x + dx, y: nodes[d].y + dy };
                  shiftComments(d, dx, dy);
                }
              }
            } else if (g.comments[m.id]) {
              comments[m.id] = { ...comments[m.id], x, y };
            }
          }
          return { ...g, nodes, comments };
        },
        { history: false },
      );
    },
    [commit],
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setRfEdges((es) => applyEdgeChanges(changes.filter((c) => c.type === 'select'), es));
  }, []);

  // ------------------------------------------------------------ actions
  const deleteSelection = () => {
    const ids = canEdit
      ? [...selectedNodeIds, ...selectedEdgeIds, ...selectedCommentIds]
      : selectedCommentIds.filter((id) => graph.comments[id]?.authorEmail === user?.email);
    if (ids.length) commit((g) => removeItems(g, ids));
  };

  const startComment = (nodeId: string | null, at?: { x: number; y: number }) => {
    if (!user || !canComment) return;
    let id = '';
    commit((g) => {
      const spot = at ?? (nodeId ? commentSpot(g, nodeId, size) : rf.screenToFlowPosition({ x: innerWidth / 2, y: innerHeight / 2 }));
      const r = addComment(g, nodeId, spot, user);
      id = r.id;
      return r.graph;
    });
    setOpenCommentId(id);
  };

  const doSprout = useCallback(
    (from: string, dir: Dir, upX: number, upY: number, moved: boolean) => {
      if (!moved) {
        createAndEdit((g) => addChild(g, from, size, { dir }));
        return;
      }
      const el = document.elementFromPoint(upX, upY)?.closest('.react-flow__node');
      const target = el?.getAttribute('data-id');
      if (target && target !== from && graphRef.current.nodes[target]) {
        commit((g) => connect(g, from, target));
        return;
      }
      const at = rf.screenToFlowPosition({ x: upX, y: upY });
      createAndEdit((g) => addChild(g, from, size, { at }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rf, size, commit],
  );

  const ctx: EditorCtx = {
    user,
    canEdit,
    canComment,
    editingId,
    setEditingId,
    setNodeText(id, text) {
      setEditingId(null);
      commit((g) => (g.nodes[id] && g.nodes[id].text !== text ? setNodeProps(g, [id], { text }) : g));
    },
    textThenChild(id, text) {
      commit((g) => (g.nodes[id] && g.nodes[id].text !== text ? setNodeProps(g, [id], { text }) : g));
      // wait a moment so the edited node has re-measured before placing its child
      setTimeout(() => createAndEdit((g) => addChild(g, id, size)), 30);
    },
    startSprout(id, dir, e) {
      const sx = e.clientX;
      const sy = e.clientY;
      let moved = false;
      setSprout({ from: id, x: sx, y: sy, moved });
      const move = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
        setSprout({ from: id, x: ev.clientX, y: ev.clientY, moved });
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setSprout(null);
        doSprout(id, dir, ev.clientX, ev.clientY, moved);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    openCommentId,
    setOpenCommentId,
    updateComment(id, props) {
      commit((g) => updateComment(g, id, props));
    },
    deleteComment(id) {
      setOpenCommentId(null);
      commit((g) => removeItems(g, [id]));
    },
    connectingFrom,
  };

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      altDown.current = e.altKey;
      if (isTyping(e.target) || menu || wheel) return;
      const mod = e.metaKey || e.ctrlKey;
      const one = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canEdit || canComment) (e.shiftKey ? redo : undo)();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!canEdit) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCommentIds.length) deleteSelection();
        return;
      } else if (e.key === 'Tab' && one) {
        e.preventDefault();
        createAndEdit((g) => addChild(g, one, size));
      } else if (e.key === 'Enter' && one) {
        e.preventDefault();
        createAndEdit((g) => addSibling(g, one, size) ?? addChild(g, one, size));
      } else if ((e.key === 'F2' || e.key === ' ') && one) {
        e.preventDefault();
        setEditingId(one);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (mod && e.key.toLowerCase() === 'd' && selectedNodeIds.length) {
        e.preventDefault();
        let ids: string[] = [];
        commit((g) => {
          const r = duplicate(g, selectedNodeIds);
          ids = r.ids;
          return r.graph;
        });
        const s = new Set(ids);
        pendingSelect.current = null;
        setTimeout(() => setRfNodes((ns) => ns.map((n) => ({ ...n, selected: s.has(n.id) }))), 0);
      } else if (e.key === 'Escape') {
        setConnectingFrom(null);
        selectOnly(null);
        pendingSelect.current = null;
      }
    };
    const up = (e: KeyboardEvent) => (altDown.current = e.altKey);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  });

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
          { key: 'link', label: 'Link to…', icon: Icon.link, onSelect: () => setConnectingFrom(id) },
          {
            key: 'dup', label: 'Duplicate', icon: Icon.duplicate,
            onSelect: () => commit((g) => duplicate(g, ids).graph),
          },
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
      const items: RadialItem[] = [{ key: 'open', label: 'Open thread', icon: Icon.comment, onSelect: () => setOpenCommentId(m.id) }];
      if (canComment) items.push({ key: 'resolve', label: c?.resolved ? 'Reopen' : 'Resolve', icon: Icon.check, onSelect: () => commit((g) => updateComment(g, m.id, { resolved: !c?.resolved })) });
      if (canEdit || c?.authorEmail === user?.email) items.push({ key: 'del', label: 'Delete', icon: Icon.trash, onSelect: () => commit((g) => removeItems(g, [m.id])) });
      return items;
    }
    // pane
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
    if (canEdit) items.push({ key: 'tidy', label: 'Tidy layout', icon: Icon.tidy, onSelect: () => commit((g) => tidy(g, size)) });
    items.push({ key: 'fit', label: 'Fit to screen', icon: Icon.fit, onSelect: () => rf.fitView({ padding: 0.25, duration: 400 }) });
    if (canEdit || canComment) {
      items.push({ key: 'undo', label: 'Undo', icon: Icon.undo, onSelect: undo, stay: true });
      items.push({ key: 'redo', label: 'Redo', icon: Icon.redo, onSelect: redo, stay: true });
    }
    return items;
  };

  // ------------------------------------------------------------ sprout ghost line
  let ghost: React.ReactNode = null;
  if (sprout?.moved) {
    const n = rf.getInternalNode(sprout.from);
    const gn = graph.nodes[sprout.from];
    if (n && gn) {
      const p = rf.flowToScreenPosition({
        x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
        y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
      });
      const mx = (p.x + sprout.x) / 2;
      ghost = (
        <svg className="ghost-layer">
          <path d={`M${p.x},${p.y} C${mx},${p.y} ${mx},${sprout.y} ${sprout.x},${sprout.y}`} stroke={gn.color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
          <circle cx={sprout.x} cy={sprout.y} r="9" fill={gn.color} opacity=".85" />
        </svg>
      );
    }
  }

  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;
  const selKey = [...selectedNodeIds, ...selectedEdgeIds].join(',');
  useEffect(() => setInspectorOpen(true), [selKey]);

  return (
    <EditorContext.Provider value={ctx}>
      <div className={`canvas ${connectingFrom ? 'connecting' : ''}`}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={() => snapshot()}
          onNodeClick={(_, node) => {
            if (connectingFrom && node.type === 'idea' && node.id !== connectingFrom) {
              commit((g) => connect(g, connectingFrom, node.id));
              setConnectingFrom(null);
            }
          }}
          onPaneClick={() => {
            setConnectingFrom(null);
            setOpenCommentId(null);
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
          deleteKeyCode={null}
          selectionKeyCode="Shift"
          multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
          zoomOnDoubleClick={false}
          nodesConnectable={false}
          elementsSelectable
          minZoom={0.15}
          maxZoom={2.5}
          disableKeyboardA11y
          nodesFocusable={false}
          edgesFocusable={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} color="var(--dots)" />
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            nodeColor={(n) => (n.type === 'comment' ? '#f6d860' : (n.data as { node: MapNode }).node.color)}
            nodeBorderRadius={6}
            maskColor="var(--minimap-mask)"
          />
        </ReactFlow>

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
            <button className="dock-btn" title="Tidy layout" onClick={() => commit((g) => tidy(g, size))}>
              {Icon.tidy}
              <span>Tidy</span>
            </button>
          )}
          <button className="dock-btn" title="Fit to screen" onClick={() => rf.fitView({ padding: 0.25, duration: 400 })}>
            {Icon.fit}
            <span>Fit</span>
          </button>
        </div>

        <div className="hint">
          {connectingFrom
            ? 'Click another idea to link it · Esc to cancel'
            : canEdit
              ? 'Right-click for the wheel · hover an idea and drag its + · double-click to edit · Tab child · Enter sibling'
              : canComment
                ? 'You can comment: right-click an idea, or use the Comment button'
                : 'View only'}
        </div>

        {canEdit && inspectorOpen && hasSelection && !editingId && (
          <Inspector
            graph={graph}
            nodeIds={selectedNodeIds}
            edgeIds={selectedEdgeIds}
            commit={commit}
            onClose={() => setInspectorOpen(false)}
          />
        )}
        {ghost}
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
      </div>
    </EditorContext.Provider>
  );
}
