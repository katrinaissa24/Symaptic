import type { MapNode } from '../lib/types';

/** Rough size of an idea before it has been measured. Used for fitting, visibility, placement and thumbnails. */
export function estimateSize(n: MapNode): { w: number; h: number } {
  const fs = n.fontSize || 14;
  const lines = n.text.split('\n');
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const charW = fs * (n.bold ? 0.6 : 0.55);
  const w = Math.min(280, Math.max(48, longest * charW + 36));
  const wrapped = lines.reduce((a, l) => a + Math.max(1, Math.ceil((l.length * charW) / (280 - 36))), 0);
  const h = Math.round(wrapped * fs * 1.25 + (n.root ? 28 : 18));
  return { w: Math.round(w), h };
}
