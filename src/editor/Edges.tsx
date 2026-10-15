import { memo } from 'react';
import { useInternalNode, type Edge, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { MapEdge } from '../lib/types';
import { displayColor } from '../lib/palette';
import { displayCurve, displayEdgeWidth } from './compat';
import { arrivalDir, arrowHead, boxExit, branchAnchors, center, strokePath, type Box } from './geometry';

export type BranchRFEdge = Edge<{ edge: MapEdge; legacy: boolean }, 'branch'>;
export type ThoughtRFEdge = Edge<Record<string, never>, 'thought'>;

function boxOf(n: InternalNode | undefined): Box | null {
  if (!n) return null;
  const w = n.measured.width ?? n.initialWidth;
  const h = n.measured.height ?? n.initialHeight;
  if (!w || !h) return null;
  const p = n.internals.positionAbsolute;
  return { x: p.x, y: p.y, w, h };
}

const DASH = { solid: undefined, dashed: '6 5', dotted: '1 4' } as const;

/** One connector style: a smooth 1.5–2.5px curve from node side to node side, tinted by the branch colour. */
function BranchEdgeImpl({ id, source, target, data, selected }: EdgeProps<BranchRFEdge>) {
  const s = boxOf(useInternalNode(source));
  const t = boxOf(useInternalNode(target));
  if (!s || !t || !data) return null;
  const e = data.edge;
  const w = displayEdgeWidth(e.width, data.legacy);
  const curve = displayCurve(e.curve);
  const { a, b, horizontal } = branchAnchors(s, t);
  const line = strokePath(a, b, horizontal, curve);
  const dir = arrivalDir(a, b, horizontal, curve);

  return (
    <g className={`branch${selected ? ' is-selected' : ''}${e.kind === 'link' ? ' is-link' : ''}`} style={{ ['--c' as string]: displayColor(e.color) }}>
      <path d={line} className="branch-line" strokeWidth={w} strokeDasharray={DASH[e.style]} />
      {e.arrow && <path d={arrowHead(b, dir, Math.max(4, w * 2.2))} className="branch-arrow" />}
      <path id={id} d={line} className="branch-hit" />
    </g>
  );
}

/** Thin dotted connector from an idea to its comment card. */
function ThoughtEdgeImpl({ source, target }: EdgeProps<ThoughtRFEdge>) {
  const s = boxOf(useInternalNode(source));
  const t = boxOf(useInternalNode(target));
  if (!s || !t) return null;
  const a = boxExit(s, center(t));
  const b = boxExit(t, center(s));
  return <path className="thought-line" d={`M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`} />;
}

export const BranchEdge = memo(BranchEdgeImpl);
export const ThoughtEdge = memo(ThoughtEdgeImpl);
