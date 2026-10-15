import type { AppUser, Graph, MapComment, MapEdge, MapNode } from '../lib/types';
import { nextBranchColor } from '../lib/palette';
import { uid } from '../lib/store';
import type { Box, Pt } from './geometry';

export type SizeOf = (id: string) => { w: number; h: number };
export type Dir = 'right' | 'left' | 'down' | 'up';

export const branchEdges = (g: Graph) => Object.values(g.edges).filter((e) => e.kind !== 'link');

export function parentOf(g: Graph, id: string): string | null {
  return branchEdges(g).find((e) => e.target === id)?.source ?? null;
}
export function childrenOf(g: Graph, id: string): string[] {
  return branchEdges(g)
    .filter((e) => e.source === id)
    .map((e) => e.target)
    .filter((t) => g.nodes[t]);
}
export function subtree(g: Graph, id: string, out = new Set<string>()): Set<string> {
  if (out.has(id)) return out;
  out.add(id);
  for (const c of childrenOf(g, id)) subtree(g, c, out);
  return out;
}
export function depthOf(g: Graph, id: string): number {
  let d = 0;
  let cur: string | null = id;
  const seen = new Set<string>();
  while ((cur = parentOf(g, cur)) && !seen.has(cur)) {
    seen.add(cur);
    d++;
  }
  return d;
}

function box(g: Graph, id: string, size: SizeOf): Box {
  const n = g.nodes[id];
  const s = size(id);
  return { x: n.x, y: n.y, w: s.w, h: s.h };
}

/** Which way a new child of `id` should grow. */
export function growDir(g: Graph, id: string): Dir {
  const p = parentOf(g, id);
  if (!p) {
    const kids = childrenOf(g, id).map((c) => g.nodes[c]);
    const n = g.nodes[id];
    const right = kids.filter((k) => k.x >= n.x).length;
    const left = kids.length - right;
    return right <= left ? 'right' : 'left';
  }
  const n = g.nodes[id];
  const pn = g.nodes[p];
  if (Math.abs(n.y - pn.y) > Math.abs(n.x - pn.x) * 1.5) return n.y >= pn.y ? 'down' : 'up';
  return n.x >= pn.x ? 'right' : 'left';
}

function childStyle(g: Graph, parent: MapNode): Omit<MapNode, 'id' | 'x' | 'y' | 'text'> {
  if (parent.root || !parentOf(g, parent.id)) {
    const used = childrenOf(g, parent.id).map((c) => g.nodes[c].color);
    return {
      shape: 'underline',
      color: nextBranchColor(used),
      fill: 'soft',
      fontSize: 16,
      bold: true,
      borderWidth: 3,
      borderStyle: 'solid',
    };
  }
  return {
    shape: parent.shape,
    color: parent.color,
    fill: parent.fill,
    fontSize: Math.max(12, parent.fontSize - 2),
    bold: false,
    borderWidth: Math.max(1.5, parent.borderWidth - 0.5),
    borderStyle: parent.borderStyle,
  };
}

function incomingWidth(g: Graph, id: string): number | null {
  const e = branchEdges(g).find((x) => x.target === id);
  return e ? e.width : null;
}

export function newEdge(g: Graph, source: string, target: string, color: string, kind: 'branch' | 'link' = 'branch'): MapEdge {
  const inW = incomingWidth(g, source);
  return {
    id: uid('e_'),
    source,
    target,
    kind,
    color,
    width: kind === 'link' ? 2 : inW ? Math.max(2.5, inW * 0.62) : 10,
    style: kind === 'link' ? 'dashed' : 'solid',
    curve: kind === 'link' ? 'bezier' : 'organic',
    arrow: kind === 'link',
  };
}

export function addChild(
  g: Graph,
  parentId: string,
  size: SizeOf,
  opts: { dir?: Dir; at?: Pt; text?: string } = {},
): { graph: Graph; id: string } {
  const parent = g.nodes[parentId];
  const style = childStyle(g, parent);
  const id = uid('n_');
  const dir = opts.dir ?? growDir(g, parentId);
  const pb = box(g, parentId, size);
  const est = { w: 110, h: style.shape === 'underline' ? 30 : 40 };
  let pos: Pt;
  if (opts.at) {
    pos = { x: opts.at.x - est.w / 2, y: opts.at.y - est.h / 2 };
  } else {
    const gap = parent.root ? 120 : 70;
    const sibs = childrenOf(g, parentId)
      .map((c) => box(g, c, size))
      .filter((b) => {
        const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        if (dir === 'right') return c.x > pb.x + pb.w / 2;
        if (dir === 'left') return c.x < pb.x + pb.w / 2;
        if (dir === 'down') return c.y > pb.y + pb.h / 2;
        return c.y < pb.y + pb.h / 2;
      });
    if (dir === 'right' || dir === 'left') {
      const x = dir === 'right' ? pb.x + pb.w + gap : pb.x - gap - est.w;
      const y = sibs.length ? Math.max(...sibs.map((b) => b.y + b.h)) + 22 : pb.y + pb.h / 2 - est.h / 2;
      pos = { x, y };
    } else {
      const y = dir === 'down' ? pb.y + pb.h + gap : pb.y - gap - est.h;
      const x = sibs.length ? Math.max(...sibs.map((b) => b.x + b.w)) + 28 : pb.x + pb.w / 2 - est.w / 2;
      pos = { x, y };
    }
  }
  const node: MapNode = { id, x: Math.round(pos.x), y: Math.round(pos.y), text: opts.text ?? 'New idea', ...style };
  const edge = newEdge(g, parentId, id, style.color);
  return {
    id,
    graph: { ...g, nodes: { ...g.nodes, [id]: node }, edges: { ...g.edges, [edge.id]: edge } },
  };
}

export function addSibling(g: Graph, id: string, size: SizeOf): { graph: Graph; id: string } | null {
  const p = parentOf(g, id);
  if (!p) return null;
  const dir = growDir(g, p) === 'down' || growDir(g, p) === 'up' ? undefined : g.nodes[id].x >= g.nodes[p].x ? 'right' : 'left';
  return addChild(g, p, size, { dir });
}

export function addFreeNode(g: Graph, at: Pt, color: string): { graph: Graph; id: string } {
  const id = uid('n_');
  const node: MapNode = {
    id,
    x: Math.round(at.x - 60),
    y: Math.round(at.y - 20),
    text: 'New idea',
    shape: 'pill',
    color,
    fill: 'soft',
    fontSize: 16,
    bold: false,
    borderWidth: 2,
    borderStyle: 'solid',
  };
  return { id, graph: { ...g, nodes: { ...g.nodes, [id]: node } } };
}

export function connect(g: Graph, from: string, to: string): Graph {
  if (from === to) return g;
  const exists = Object.values(g.edges).some(
    (e) => (e.source === from && e.target === to) || (e.source === to && e.target === from),
  );
  if (exists) return g;
  const e = newEdge(g, from, to, g.nodes[from].color, 'link');
  return { ...g, edges: { ...g.edges, [e.id]: e } };
}

/** Removes nodes (with their branch subtrees, never a root), edges and comments. */
export function removeItems(g: Graph, ids: Iterable<string>): Graph {
  const kill = new Set<string>();
  const killEdges = new Set<string>();
  const killComments = new Set<string>();
  for (const id of ids) {
    if (g.nodes[id]) {
      if (g.nodes[id].root && Object.values(g.nodes).filter((n) => n.root).length <= 1) continue;
      subtree(g, id, kill);
    } else if (g.edges[id]) killEdges.add(id);
    else if (g.comments[id]) killComments.add(id);
  }
  if (!kill.size && !killEdges.size && !killComments.size) return g;
  const nodes = { ...g.nodes };
  const edges = { ...g.edges };
  const comments = { ...g.comments };
  for (const id of kill) delete nodes[id];
  for (const e of Object.values(g.edges)) if (killEdges.has(e.id) || kill.has(e.source) || kill.has(e.target)) delete edges[e.id];
  for (const c of Object.values(g.comments)) if (killComments.has(c.id) || (c.nodeId && kill.has(c.nodeId))) delete comments[c.id];
  return { nodes, edges, comments };
}

export function setNodeProps(g: Graph, ids: string[], props: Partial<MapNode>): Graph {
  const nodes = { ...g.nodes };
  let changed = false;
  for (const id of ids) {
    if (!nodes[id]) continue;
    nodes[id] = { ...nodes[id], ...props };
    changed = true;
  }
  return changed ? { ...g, nodes } : g;
}

export function setEdgeProps(g: Graph, ids: string[], props: Partial<MapEdge>): Graph {
  const edges = { ...g.edges };
  let changed = false;
  for (const id of ids) {
    if (!edges[id]) continue;
    edges[id] = { ...edges[id], ...props };
    changed = true;
  }
  return changed ? { ...g, edges } : g;
}

/** Branch edges arriving at any of these nodes. */
export function incomingEdgeIds(g: Graph, nodeIds: string[]): string[] {
  const s = new Set(nodeIds);
  return branchEdges(g).filter((e) => s.has(e.target)).map((e) => e.id);
}

/** Recolour nodes; descendants that shared the old colour follow, like repainting a whole branch. */
export function recolor(g: Graph, ids: string[], color: string): Graph {
  const targets = new Set<string>();
  for (const id of ids) {
    const n = g.nodes[id];
    if (!n) continue;
    const old = n.color;
    for (const d of subtree(g, id)) if (d === id || g.nodes[d].color === old) targets.add(d);
  }
  let next = setNodeProps(g, [...targets], { color });
  next = setEdgeProps(next, incomingEdgeIds(next, [...targets].filter((t) => !g.nodes[t].root)), { color });
  // Edges selected directly
  next = setEdgeProps(next, ids.filter((i) => g.edges[i]), { color });
  return next;
}

export function duplicate(g: Graph, ids: string[]): { graph: Graph; ids: string[] } {
  const map = new Map<string, string>();
  const nodes = { ...g.nodes };
  for (const id of ids) {
    const n = g.nodes[id];
    if (!n) continue;
    const nid = uid('n_');
    map.set(id, nid);
    nodes[nid] = { ...n, id: nid, x: n.x + 40, y: n.y + 40, root: false };
  }
  const edges = { ...g.edges };
  for (const e of Object.values(g.edges)) {
    const s = map.get(e.source);
    const t = map.get(e.target);
    if (t && (s || e.kind === 'branch')) {
      const ne = { ...e, id: uid('e_'), source: s ?? e.source, target: t };
      edges[ne.id] = ne;
    }
  }
  return { graph: { ...g, nodes, edges }, ids: [...map.values()] };
}

export function isMine(c: { authorId?: string; authorEmail: string }, user: AppUser | null): boolean {
  if (!user) return false;
  if (c.authorId) return c.authorId === user.uid;
  return !!user.email && c.authorEmail === user.email;
}

export function addComment(g: Graph, nodeId: string | null, at: Pt, user: AppUser): { graph: Graph; id: string } {
  const id = uid('c_');
  const c: MapComment = {
    id,
    nodeId,
    x: Math.round(at.x),
    y: Math.round(at.y),
    text: '',
    authorName: user.name,
    authorEmail: user.email,
    authorId: user.uid,
    createdAt: Date.now(),
    replies: [],
    resolved: false,
  };
  return { id, graph: { ...g, comments: { ...g.comments, [id]: c } } };
}

export function commentSpot(g: Graph, nodeId: string, size: SizeOf): Pt {
  const b = box(g, nodeId, size);
  const n = Object.values(g.comments).filter((c) => c.nodeId === nodeId).length;
  // Float away from the parent so the bubble doesn't sit on top of the rest of the map.
  const p = parentOf(g, nodeId);
  const left = p ? g.nodes[nodeId].x < g.nodes[p].x : false;
  const x = left ? b.x - 200 - 10 - n * 24 : b.x + b.w + 10 + n * 24;
  return { x, y: b.y - 120 - n * 16 };
}

export function updateComment(g: Graph, id: string, props: Partial<MapComment>): Graph {
  const c = g.comments[id];
  if (!c) return g;
  return { ...g, comments: { ...g.comments, [id]: { ...c, ...props } } };
}


/** Move nodes and comments to the given positions (rounded). Used once at the end of a drag. */
export function moveItems(g: Graph, pos: Map<string, Pt>): Graph {
  let nodes = g.nodes;
  let comments = g.comments;
  for (const [id, p] of pos) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    if (g.nodes[id]) {
      if (g.nodes[id].x === x && g.nodes[id].y === y) continue;
      if (nodes === g.nodes) nodes = { ...g.nodes };
      nodes[id] = { ...g.nodes[id], x, y };
    } else if (g.comments[id]) {
      if (g.comments[id].x === x && g.comments[id].y === y) continue;
      if (comments === g.comments) comments = { ...g.comments };
      comments[id] = { ...g.comments[id], x, y };
    }
  }
  return nodes === g.nodes && comments === g.comments ? g : { ...g, nodes, comments };
}
