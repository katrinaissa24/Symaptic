import { getViewportForBounds, type Node, type ReactFlowInstance, type Rect, type Viewport } from '@xyflow/react';
import type { MapNode } from '../lib/types';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.5;
export const FIT_PADDING = 0.1;
export const TWEEN_MS = 250;

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Rough size of an idea before it has been measured. Used for fitting, visibility and placement. */
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

export function nodeRect(n: Node): Rect {
  return {
    x: n.position.x,
    y: n.position.y,
    width: n.measured?.width ?? n.initialWidth ?? 120,
    height: n.measured?.height ?? n.initialHeight ?? 40,
  };
}

export function boundsOf(nodes: Node[]): Rect | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const n of nodes) {
    if (n.hidden) continue;
    const r = nodeRect(n);
    if (r.x < x1) x1 = r.x;
    if (r.y < y1) y1 = r.y;
    if (r.x + r.width > x2) x2 = r.x + r.width;
    if (r.y + r.height > y2) y2 = r.y + r.height;
  }
  return x1 === Infinity ? null : { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

let active: number | null = null;

/** Single requestAnimationFrame tween of the viewport. Starting a new one cancels the previous. */
export function animateViewport(rf: ReactFlowInstance, to: Viewport, ms = TWEEN_MS) {
  if (active != null) cancelAnimationFrame(active);
  const from = rf.getViewport();
  if (ms <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rf.setViewport(to);
    return;
  }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    const k = easeOut(t);
    rf.setViewport({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, zoom: from.zoom + (to.zoom - from.zoom) * k });
    active = t < 1 ? requestAnimationFrame(step) : null;
  };
  active = requestAnimationFrame(step);
}

export function fitViewport(rf: ReactFlowInstance, nodes: Node[], size: { width: number; height: number }, ms = TWEEN_MS, padding = FIT_PADDING) {
  const b = boundsOf(nodes);
  if (!b || !size.width || !size.height) return;
  const vp = getViewportForBounds(b, size.width, size.height, MIN_ZOOM, Math.min(MAX_ZOOM, 1.25), padding);
  animateViewport(rf, vp, ms);
}

export function zoomTo(rf: ReactFlowInstance, zoom: number, size: { width: number; height: number }, ms = 150) {
  const cur = rf.getViewport();
  const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  // Keep the point under the centre of the canvas fixed.
  const cx = size.width / 2, cy = size.height / 2;
  const fx = (cx - cur.x) / cur.zoom, fy = (cy - cur.y) / cur.zoom;
  animateViewport(rf, { x: cx - fx * z, y: cy - fy * z, zoom: z }, ms);
}
