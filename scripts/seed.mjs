#!/usr/bin/env node
// Generates realistic Symaptic maps with N ideas for performance testing.
//
//   node scripts/seed.mjs 500            → prints one MapDoc as JSON
//   node scripts/seed.mjs 5,100,500,1000 → prints the localStorage payload for demo mode
//
// scripts/perf.mjs imports `seedStorage()` directly. To load a map by hand in demo mode, run the
// second form, then in DevTools: localStorage.setItem('symaptic:docs', <json>) and open /d/perf-500.

const WORDS = [
  'Research', 'Roadmap', 'Pricing', 'Onboarding', 'Retention', 'Launch', 'Design', 'Metrics', 'Hiring',
  'Interviews', 'Prototype', 'Feedback', 'Budget', 'Partners', 'Support', 'Billing', 'Mobile', 'Security',
  'Analytics', 'Marketing', 'Content', 'Community', 'Infrastructure', 'Experiments', 'Docs', 'Growth',
  'Quality', 'Accessibility', 'Localization', 'Performance', 'Strategy', 'Vision', 'Risks', 'Timeline',
];

// Legacy colours still used by existing maps; the editor maps them to the current palette at render time.
const COLORS = ['#3cc9b0', '#86c440', '#f2c94c', '#e8606e', '#f29a55', '#6f96dc', '#c58ae0', '#4fb3d9', '#ef7fb0', '#9b7be6', '#56b77a', '#e0844a'];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function makeDoc(n, { id = `perf-${n}`, ownerId = 'demo-perf@example.com', seed = n } = {}) {
  const rand = rng(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const label = () => {
    const k = 1 + Math.floor(rand() * 3);
    return Array.from({ length: k }, () => pick(WORDS)).join(' ');
  };

  const nodes = {};
  const edges = {};
  const rootId = 'n_root';
  nodes[rootId] = {
    id: rootId, x: 0, y: 0, text: 'Central idea', shape: 'rounded', color: '#c58ae0', fill: 'solid',
    fontSize: 20, bold: true, borderWidth: 2, borderStyle: 'solid', root: true,
  };

  // Build a tree first (breadth-ish, 2-5 children per node), then lay it out left/right like Tidy does.
  const children = new Map([[rootId, []]]);
  const parent = new Map();
  const depth = new Map([[rootId, 0]]);
  const queue = [rootId];
  const want = new Map();
  let made = 1;
  let head = 0;
  const mainBranches = Math.min(Math.max(2, Math.round(Math.sqrt(n) / 1.5)), 12);
  while (made < n) {
    const p = queue[head];
    if (!want.has(p)) want.set(p, p === rootId ? mainBranches : 2 + Math.floor(rand() * 4));
    if (children.get(p).length >= want.get(p)) {
      head++;
      continue;
    }
    const id = `n_${made.toString(36).padStart(4, '0')}`;
    const d = depth.get(p) + 1;
    depth.set(id, d);
    parent.set(id, p);
    children.set(id, []);
    children.get(p).push(id);
    queue.push(id);
    made++;
    const color = p === rootId ? COLORS[children.get(rootId).length % COLORS.length] : nodes[p].color;
    nodes[id] = {
      id, x: 0, y: 0, text: label(), color,
      shape: d === 1 ? 'underline' : 'pill',
      fill: 'soft', fontSize: d === 1 ? 16 : Math.max(12, 16 - d), bold: d === 1,
      borderWidth: d === 1 ? 3 : 2, borderStyle: 'solid',
    };
    const inW = edges[`e_${p}`]?.width;
    edges[`e_${id}`] = {
      id: `e_${id}`, source: p, target: id, kind: 'branch', color,
      width: inW ? Math.max(2.5, inW * 0.62) : 10, style: 'solid', curve: 'organic', arrow: false,
    };
  }

  // Layout: estimate sizes from text, stack subtrees vertically, columns by depth.
  const size = (id) => ({ w: Math.min(240, 24 + nodes[id].text.length * 8.5), h: 36 });
  const H_GAP = 26, X_GAP = 90;
  const heights = new Map();
  const h = (id) => {
    if (heights.has(id)) return heights.get(id);
    const kids = children.get(id);
    const v = Math.max(size(id).h, kids.reduce((a, k) => a + h(k), 0) + H_GAP * Math.max(0, kids.length - 1));
    heights.set(id, v);
    return v;
  };
  const place = (id, x, cy, side) => {
    const s = size(id);
    nodes[id].x = Math.round(side === 1 ? x : x - s.w);
    nodes[id].y = Math.round(cy - s.h / 2);
    const kids = children.get(id);
    if (!kids.length) return;
    const startX = side === 1 ? nodes[id].x + s.w + X_GAP : nodes[id].x - X_GAP;
    const total = kids.reduce((a, k) => a + h(k), 0) + H_GAP * (kids.length - 1);
    let y = cy - total / 2;
    for (const k of kids) {
      place(k, startX, y + h(k) / 2, side);
      y += h(k) + H_GAP;
    }
  };
  const roots = children.get(rootId);
  const right = roots.filter((_, idx) => idx % 2 === 0);
  const left = roots.filter((_, idx) => idx % 2 === 1);
  const layoutSide = (kids, side) => {
    const total = kids.reduce((a, k) => a + h(k), 0) + H_GAP * (kids.length - 1);
    let y = 18 - total / 2;
    const startX = side === 1 ? 160 + X_GAP + 30 : -(X_GAP + 30);
    for (const k of kids) {
      place(k, startX, y + h(k) / 2, side);
      y += h(k) + H_GAP;
    }
  };
  layoutSide(right, 1);
  layoutSide(left, -1);

  // A few comments so the comment path is exercised too.
  const comments = {};
  const ids = Object.keys(nodes);
  for (let c = 0; c < Math.min(5, Math.floor(n / 20)); c++) {
    const target = ids[1 + Math.floor(rand() * (ids.length - 1))];
    const t = nodes[target];
    comments[`c_${c}`] = {
      id: `c_${c}`, nodeId: target, x: t.x + 160, y: t.y - 110, text: 'Can we clarify this?',
      authorName: 'Perf Tester', authorEmail: 'demo-perf@example.com', authorId: ownerId,
      createdAt: Date.now() - c * 3600_000, replies: [], resolved: false,
    };
  }

  const now = Date.now();
  return {
    id, title: `Perf map · ${n} ideas`, ownerId, ownerEmail: 'demo-perf@example.com', ownerName: 'Perf Tester',
    members: {}, memberEmails: [], linkRole: 'none', createdAt: now - 86_400_000, updatedAt: now,
    nodes, edges, comments,
  };
}

export const PERF_USER = { uid: 'demo-perf@example.com', email: 'demo-perf@example.com', name: 'Perf Tester', isAnonymous: false };

/** localStorage payload for demo mode: { 'symaptic:docs': ..., 'symaptic:demo-user': ... } */
export function seedStorage(sizes = [5, 100, 500, 1000]) {
  const docs = {};
  for (const n of sizes) docs[`perf-${n}`] = makeDoc(n);
  return { 'symaptic:docs': JSON.stringify(docs), 'symaptic:demo-user': JSON.stringify(PERF_USER) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2] ?? '500';
  const sizes = arg.split(',').map(Number);
  process.stdout.write(JSON.stringify(sizes.length === 1 ? makeDoc(sizes[0]) : seedStorage(sizes), null, 0));
}
