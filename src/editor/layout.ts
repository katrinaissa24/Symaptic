import type { Graph, MapNode } from '../lib/types';
import type { SizeOf } from './ops';

const H_GAP = 24;
const X_GAP = 80;

/** Children per node from the branch edges, built once so tidy is O(n) instead of O(n²). */
function adjacency(g: Graph) {
  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();
  for (const e of Object.values(g.edges)) {
    if (e.kind === 'link' || !g.nodes[e.source] || !g.nodes[e.target] || parent.has(e.target)) continue;
    parent.set(e.target, e.source);
    (children.get(e.source) ?? children.set(e.source, []).get(e.source)!).push(e.target);
  }
  return { children: (id: string) => children.get(id) ?? [], parent: (id: string) => parent.get(id) ?? null };
}

/** Classic left/right mind-map layout. Each root keeps its position; branches keep their side. */
export function tidy(g: Graph, size: SizeOf): Graph {
  const { children, parent } = adjacency(g);
  const nodes: Record<string, MapNode> = { ...g.nodes };
  const delta = new Map<string, { dx: number; dy: number }>();
  const heights = new Map<string, number>();
  const sizes = new Map<string, { w: number; h: number }>();
  const sz = (id: string) => sizes.get(id) ?? sizes.set(id, size(id)).get(id)!;

  const h = (id: string, seen = new Set<string>()): number => {
    if (heights.has(id)) return heights.get(id)!;
    seen.add(id);
    const kids = children(id).filter((k) => !seen.has(k));
    const own = sz(id).h;
    const sum = kids.reduce((a, k) => a + h(k, seen), 0) + H_GAP * Math.max(0, kids.length - 1);
    const v = Math.max(own, sum);
    heights.set(id, v);
    return v;
  };

  const place = (id: string, cx: number, cy: number, side: 1 | -1, seen: Set<string>) => {
    seen.add(id);
    const n = nodes[id];
    const s = sz(id);
    const x = side === 1 ? cx : cx - s.w;
    const y = cy - s.h / 2;
    delta.set(id, { dx: x - n.x, dy: y - n.y });
    nodes[id] = { ...n, x: Math.round(x), y: Math.round(y) };
    layoutKids(id, children(id).filter((k) => !seen.has(k)), side, seen);
  };

  const layoutKids = (id: string, kids: string[], side: 1 | -1, seen: Set<string>) => {
    if (!kids.length) return;
    const p = nodes[id];
    const ps = sz(id);
    const gap = p.root ? X_GAP + 24 : X_GAP;
    const startX = side === 1 ? p.x + ps.w + gap : p.x - gap;
    kids.sort((a, b) => g.nodes[a].y - g.nodes[b].y);
    const total = kids.reduce((a, k) => a + h(k), 0) + H_GAP * (kids.length - 1);
    let y = p.y + ps.h / 2 - total / 2;
    for (const k of kids) {
      const kh = h(k);
      place(k, startX, y + kh / 2, side, seen);
      y += kh + H_GAP;
    }
  };

  for (const root of Object.values(g.nodes).filter((n) => !parent(n.id))) {
    const seen = new Set<string>([root.id]);
    const kids = children(root.id);
    const rc = root.x + sz(root.id).w / 2;
    const right = kids.filter((k) => g.nodes[k].x + sz(k).w / 2 >= rc);
    const left = kids.filter((k) => !right.includes(k));
    layoutKids(root.id, right, 1, seen);
    layoutKids(root.id, left, -1, seen);
  }

  const comments = { ...g.comments };
  for (const c of Object.values(g.comments)) {
    const d = c.nodeId ? delta.get(c.nodeId) : undefined;
    if (d && (d.dx || d.dy)) comments[c.id] = { ...c, x: Math.round(c.x + d.dx), y: Math.round(c.y + d.dy) };
  }
  // Only replace node objects that actually moved so the diff stays small.
  let moved = false;
  for (const [id, n] of Object.entries(nodes)) {
    if (n.x === g.nodes[id].x && n.y === g.nodes[id].y) nodes[id] = g.nodes[id];
    else moved = true;
  }
  return moved ? { ...g, nodes, comments } : g;
}
