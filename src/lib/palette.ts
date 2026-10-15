/**
 * Curated node palette. Values live in tokens.css (--palette-*) so they adapt to dark mode;
 * the hex here is the light value, used where CSS variables can't reach (thumbnails, minimap).
 */
export interface PaletteColor {
  key: string;
  name: string;
  hex: string;
}

export const PALETTE: PaletteColor[] = [
  { key: 'gray', name: 'Gray', hex: '#6b7280' },
  { key: 'red', name: 'Red', hex: '#e5484d' },
  { key: 'orange', name: 'Orange', hex: '#f76b15' },
  { key: 'amber', name: 'Amber', hex: '#d9a21b' },
  { key: 'green', name: 'Green', hex: '#30a46c' },
  { key: 'teal', name: 'Teal', hex: '#12a594' },
  { key: 'blue', name: 'Blue', hex: '#0090ff' },
  { key: 'violet', name: 'Violet', hex: '#6e56cf' },
  { key: 'pink', name: 'Pink', hex: '#d6409f' },
];

const byKey = Object.fromEntries(PALETTE.map((p) => [p.key, p]));
const byHex = Object.fromEntries(PALETTE.map((p) => [p.hex, p]));

/** Colours given to new branches, in order. The root uses violet. */
export const BRANCH_COLORS = ['blue', 'green', 'orange', 'violet', 'teal', 'pink', 'amber', 'red', 'gray'].map((k) => byKey[k].hex);
export const ROOT_COLOR = byKey.violet.hex;

/** Legacy colours from earlier versions of the app, mapped to the nearest curated colour. */
const LEGACY: Record<string, string> = {
  '#3cc9b0': 'teal', '#86c440': 'green', '#f2c94c': 'amber', '#e8606e': 'red', '#f29a55': 'orange', '#6f96dc': 'blue',
  '#c58ae0': 'violet', '#4fb3d9': 'blue', '#ef7fb0': 'pink', '#9b7be6': 'violet', '#56b77a': 'green', '#e0844a': 'orange',
  '#d24c3c': 'red', '#9a5530': 'orange', '#f2a94e': 'amber', '#e8dc4c': 'amber', '#7fb83a': 'green', '#2f6b25': 'green',
  '#4e8a74': 'teal', '#46a6d4': 'blue', '#245a78': 'blue', '#2b2b2b': 'gray', '#5f5f5f': 'gray', '#cfcfcf': 'gray',
  '#d698e6': 'violet', '#9b8fe0': 'violet', '#7fa3e0': 'blue', '#7fd8c8': 'teal', '#a8d47a': 'green', '#e8d97a': 'amber',
  '#e8a77a': 'orange', '#de8a85': 'red',
};

/** The CSS colour to draw a stored node/edge colour with: a palette token when known, else the raw value. */
export function displayColor(stored: string): string {
  const key = byHex[stored]?.key ?? LEGACY[stored.toLowerCase()];
  return key ? `var(--palette-${key})` : stored;
}

/** Light-mode hex for a stored colour (for canvas/SVG contexts without CSS variables). */
export function displayHex(stored: string): string {
  const key = byHex[stored]?.key ?? LEGACY[stored.toLowerCase()];
  return key ? byKey[key].hex : stored;
}

/** Is this stored colour one of the curated swatches (after legacy mapping)? */
export function paletteKey(stored: string): string | null {
  return byHex[stored]?.key ?? LEGACY[stored.toLowerCase()] ?? null;
}

export function nextBranchColor(used: string[]): string {
  const counts = new Map(BRANCH_COLORS.map((c) => [c, 0]));
  for (const c of used) {
    const hex = displayHex(c);
    if (counts.has(hex)) counts.set(hex, counts.get(hex)! + 1);
  }
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
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.68 ? '#18181b' : '#ffffff';
}
