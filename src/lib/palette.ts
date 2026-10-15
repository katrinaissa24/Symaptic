// Branch colours inspired by hand-drawn mind maps: saturated, friendly, never neon.
export const BRANCH_COLORS = [
  '#3cc9b0', // teal
  '#86c440', // leaf
  '#f2c94c', // sunflower
  '#e8606e', // coral
  '#f29a55', // apricot
  '#6f96dc', // cornflower
  '#c58ae0', // lilac
  '#4fb3d9', // sky
  '#ef7fb0', // bubblegum
  '#9b7be6', // violet
  '#56b77a', // fern
  '#e0844a', // terracotta
];

// Outer ring of the colour wheel: deep, bold tones.
export const WHEEL_OUTER = [
  '#d24c3c', '#9a5530', '#f2a94e', '#e8dc4c', '#7fb83a', '#2f6b25',
  '#4e8a74', '#46a6d4', '#245a78', '#2b2b2b', '#5f5f5f', '#cfcfcf',
];

// Inner ring of the colour wheel: soft pastels.
export const WHEEL_INNER = [
  '#d698e6', '#9b8fe0', '#7fa3e0', '#7fd8c8', '#a8d47a', '#e8d97a',
  '#e8a77a', '#de8a85',
];

export const ROOT_COLOR = '#c58ae0';

export function nextBranchColor(used: string[]): string {
  const counts = new Map(BRANCH_COLORS.map((c) => [c, 0]));
  for (const c of used) if (counts.has(c)) counts.set(c, counts.get(c)! + 1);
  let best = BRANCH_COLORS[0];
  for (const c of BRANCH_COLORS) if (counts.get(c)! < counts.get(best)!) best = c;
  return best;
}

/** Mix a hex colour with white (amount 0..1). */
export function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Darken a hex colour (amount 0..1). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.68 ? '#2a2233' : '#ffffff';
}
