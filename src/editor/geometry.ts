import type { CurveStyle, Shape } from '../lib/types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Pt {
  x: number;
  y: number;
}

export const center = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Where a branch leaves the parent and enters the child. Mind maps read sideways, so prefer left/right. */
export function branchAnchors(s: Box, t: Box, tShape: Shape, sShape?: Shape) {
  const sc = center(s);
  const tc = center(t);
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  const horizontal = Math.abs(dx) > Math.abs(dy) * 0.45 || Math.abs(dx) > s.w / 2 + t.w / 2;
  const underline = tShape === 'underline' || tShape === 'text';
  const fromLine = sShape === 'underline';
  if (horizontal) {
    const right = dx >= 0;
    return {
      horizontal,
      a: { x: right ? s.x + s.w : s.x, y: fromLine ? s.y + s.h : sc.y },
      b: { x: right ? t.x : t.x + t.w, y: underline ? t.y + t.h : tc.y },
    };
  }
  const down = dy >= 0;
  return {
    horizontal,
    a: { x: sc.x, y: down ? s.y + s.h : s.y },
    b: { x: tc.x, y: down ? t.y : t.y + t.h },
  };
}

type Cubic = [Pt, Pt, Pt, Pt];

export function cubicFor(a: Pt, b: Pt, horizontal: boolean): Cubic {
  if (horizontal) {
    const mx = a.x + (b.x - a.x) * 0.55;
    return [a, { x: mx, y: a.y }, { x: a.x + (b.x - a.x) * 0.45, y: b.y }, b];
  }
  const my = a.y + (b.y - a.y) * 0.55;
  return [a, { x: a.x, y: my }, { x: b.x, y: a.y + (b.y - a.y) * 0.45 }, b];
}

function bez([p0, p1, p2, p3]: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
function bezD([p0, p1, p2, p3]: Cubic, t: number): Pt {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

const f = (n: number) => n.toFixed(1);

/** A filled, tapering ribbon along the curve – the hand-drawn "branch" look. */
export function taperedPath(c: Cubic, width: number): string {
  const N = 28;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = bez(c, t);
    const d = bezD(c, t);
    const len = Math.hypot(d.x, d.y) || 1;
    const nx = -d.y / len;
    const ny = d.x / len;
    const w = (width * (1 - 0.6 * Math.pow(t, 0.8))) / 2;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const pts = [...left, ...right.reverse()];
  return 'M' + pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' L') + 'Z';
}

export function strokePath(a: Pt, b: Pt, horizontal: boolean, curve: CurveStyle): string {
  if (curve === 'straight') return `M${f(a.x)},${f(a.y)} L${f(b.x)},${f(b.y)}`;
  if (curve === 'step') {
    if (horizontal) {
      const mx = (a.x + b.x) / 2;
      return `M${f(a.x)},${f(a.y)} L${f(mx)},${f(a.y)} L${f(mx)},${f(b.y)} L${f(b.x)},${f(b.y)}`;
    }
    const my = (a.y + b.y) / 2;
    return `M${f(a.x)},${f(a.y)} L${f(a.x)},${f(my)} L${f(b.x)},${f(my)} L${f(b.x)},${f(b.y)}`;
  }
  const [p0, p1, p2, p3] = cubicFor(a, b, horizontal);
  return `M${f(p0.x)},${f(p0.y)} C${f(p1.x)},${f(p1.y)} ${f(p2.x)},${f(p2.y)} ${f(p3.x)},${f(p3.y)}`;
}

/** Direction of travel when the line arrives at b (unit vector). */
export function arrivalDir(a: Pt, b: Pt, horizontal: boolean, curve: CurveStyle): Pt {
  let d: Pt;
  if (curve === 'straight') d = { x: b.x - a.x, y: b.y - a.y };
  else if (curve === 'step') d = horizontal ? { x: Math.sign(b.x - a.x) || 1, y: 0 } : { x: 0, y: Math.sign(b.y - a.y) || 1 };
  else d = bezD(cubicFor(a, b, horizontal), 1);
  const len = Math.hypot(d.x, d.y) || 1;
  return { x: d.x / len, y: d.y / len };
}

export function arrowHead(b: Pt, dir: Pt, size: number): string {
  const nx = -dir.y;
  const ny = dir.x;
  const back = { x: b.x - dir.x * size * 1.6, y: b.y - dir.y * size * 1.6 };
  return `M${f(b.x)},${f(b.y)} L${f(back.x + nx * size)},${f(back.y + ny * size)} L${f(back.x - nx * size)},${f(back.y - ny * size)}Z`;
}

/** Point where the segment from the box centre towards p leaves the box. */
export function boxExit(b: Box, p: Pt): Pt {
  const c = center(b);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? b.w / 2 / Math.abs(dx) : Infinity;
  const sy = dy ? b.h / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

// ------------------------------------------------------------------ Shapes
// All shape outlines live in a 0..100 box and are stretched to the node.

export function cloudPath(bumps = 9): string {
  const cx = 50, cy = 50, rx = 44, ry = 40;
  const pts: Pt[] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < bumps; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % bumps];
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const out = { x: mid.x - cx, y: mid.y - cy };
    const len = Math.hypot(out.x, out.y) || 1;
    const k = 13;
    d += ` Q${f(mid.x + (out.x / len) * k)},${f(mid.y + (out.y / len) * k)} ${f(q.x)},${f(q.y)}`;
  }
  return d + 'Z';
}

export const SHAPE_PATHS: Partial<Record<Shape, string>> = {
  diamond: 'M50,1 L99,50 L50,99 L1,50Z',
  hexagon: 'M18,2 L82,2 L99,50 L82,98 L18,98 L1,50Z',
  cloud: cloudPath(10),
};

export const SHAPE_LABELS: Record<Shape, string> = {
  pill: 'Pill',
  rounded: 'Rounded',
  rect: 'Square',
  ellipse: 'Ellipse',
  circle: 'Circle',
  diamond: 'Diamond',
  hexagon: 'Hexagon',
  cloud: 'Cloud',
  underline: 'Branch line',
  text: 'Plain text',
};
