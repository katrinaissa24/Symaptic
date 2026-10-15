import type { CurveStyle, Graph, Shape } from '../lib/types';

/**
 * Maps between what is stored and what is drawn.
 *
 * Maps created before the redesign (no `v` field) store the old visual scale: 20px roots,
 * 16px "underline" branches, 10px tapering branch widths. They keep that data untouched and are
 * translated here; maps created since store display values directly (`v: 2`).
 */
export const isLegacy = (g: Pick<Graph, 'v'>) => !g.v;

export const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const MIN_FONT = 12;
export const MAX_FONT = 32;

const LEGACY_FONT: Record<number, number> = { 20: 16, 18: 15, 16: 14, 14: 14, 13: 13, 12: 13, 11: 12 };
const LEGACY_FONT_INV: Record<number, number> = { 16: 20, 15: 18, 14: 16, 13: 12, 12: 11 };

export function displayFontSize(stored: number, legacy: boolean): number {
  if (!legacy) return clamp(MIN_FONT, Math.round(stored), MAX_FONT);
  return LEGACY_FONT[stored] ?? clamp(MIN_FONT, Math.round(stored * 0.85), MAX_FONT);
}
export function storedFontSize(display: number, legacy: boolean): number {
  if (!legacy) return display;
  return LEGACY_FONT_INV[display] ?? Math.round(display / 0.85);
}

/** Stored legacy widths were 10 for root branches, ×0.62 per level, 2 for links. */
export function displayEdgeWidth(stored: number, legacy: boolean): number {
  if (!legacy) return clamp(1, stored, 4);
  return clamp(1.5, Math.round((1 + stored * 0.2) * 4) / 4, 4);
}
export function storedEdgeWidth(display: number, legacy: boolean): number {
  return legacy ? Math.round(((display - 1) / 0.2) * 10) / 10 : display;
}

export function displayBorderWidth(stored: number, legacy: boolean): number {
  if (!legacy) return clamp(0, stored, 3);
  return clamp(0, Math.round(stored) / 2, 3);
}
export function storedBorderWidth(display: number, legacy: boolean): number {
  return legacy ? display * 2 : display;
}

/** The flat "underline" branch style is drawn as a regular box now. */
export function displayShape(s: Shape): Exclude<Shape, 'underline'> {
  return s === 'underline' ? 'rounded' : s;
}

/** Tapered "organic" branches are drawn as plain curves. */
export function displayCurve(c: CurveStyle): Exclude<CurveStyle, 'organic'> {
  return c === 'organic' ? 'bezier' : c;
}

/** Default stored values for new items, in the document's own scale. */
export function defaults(g: Pick<Graph, 'v'>) {
  const legacy = isLegacy(g);
  return {
    legacy,
    rootFont: legacy ? 20 : 16,
    branchFont: legacy ? 16 : 14,
    ideaFont: legacy ? 14 : 14,
    freeFont: legacy ? 16 : 14,
    border: legacy ? 2 : 1,
    rootBranchWidth: legacy ? 10 : 2.5,
    branchWidth: legacy ? 2.5 : 1.5,
    linkWidth: legacy ? 2 : 1.5,
    branchShape: (legacy ? 'underline' : 'rounded') as Shape,
    curve: (legacy ? 'organic' : 'bezier') as CurveStyle,
  };
}
