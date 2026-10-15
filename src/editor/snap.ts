import type { Rect } from '@xyflow/react';

export interface Guide {
  axis: 'x' | 'y';
  at: number;
  from: number;
  to: number;
}

const GRID = 4;

/**
 * Figma-style smart guides: snaps the dragged rectangle's edges/centre to other rectangles'
 * edges/centres within `threshold` flow units; otherwise snaps to a 4px grid.
 */
export function snapRect(r: Rect, others: Rect[], threshold: number): { x: number; y: number; guides: Guide[] } {
  let bestX: { d: number; shift: number; at: number; o: Rect } | null = null;
  let bestY: { d: number; shift: number; at: number; o: Rect } | null = null;
  const xs = [r.x, r.x + r.width / 2, r.x + r.width];
  const ys = [r.y, r.y + r.height / 2, r.y + r.height];
  for (const o of others) {
    const ox = [o.x, o.x + o.width / 2, o.x + o.width];
    const oy = [o.y, o.y + o.height / 2, o.y + o.height];
    for (const a of xs)
      for (const b of ox) {
        const d = Math.abs(a - b);
        if (d <= threshold && (!bestX || d < bestX.d)) bestX = { d, shift: b - a, at: b, o };
      }
    for (const a of ys)
      for (const b of oy) {
        const d = Math.abs(a - b);
        if (d <= threshold && (!bestY || d < bestY.d)) bestY = { d, shift: b - a, at: b, o };
      }
  }
  const x = bestX ? r.x + bestX.shift : Math.round(r.x / GRID) * GRID;
  const y = bestY ? r.y + bestY.shift : Math.round(r.y / GRID) * GRID;
  const guides: Guide[] = [];
  if (bestX) guides.push({ axis: 'x', at: bestX.at, from: Math.min(y, bestX.o.y), to: Math.max(y + r.height, bestX.o.y + bestX.o.height) });
  if (bestY) guides.push({ axis: 'y', at: bestY.at, from: Math.min(x, bestY.o.x), to: Math.max(x + r.width, bestY.o.x + bestY.o.width) });
  return { x, y, guides };
}
