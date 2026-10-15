import { memo } from 'react';
import { useInternalNode, type Edge, type EdgeProps, type InternalNode } from '@xyflow/react';
import type { MapEdge, Shape } from '../lib/types';
import {
  arrivalDir,
  arrowHead,
  boxExit,
  branchAnchors,
  center,
  cubicFor,
  strokePath,
  taperedPath,
  type Box,
} from './geometry';

export type BranchRFEdge = Edge<{ edge: MapEdge; targetShape: Shape; sourceShape: Shape }, 'branch'>;
export type ThoughtRFEdge = Edge<Record<string, never>, 'thought'>;

function boxOf(n: InternalNode | undefined): Box | null {
  if (!n || !n.measured.width || !n.measured.height) return null;
  const p = n.internals.positionAbsolute;
  return { x: p.x, y: p.y, w: n.measured.width, h: n.measured.height };
}

const DASH = { solid: undefined, dashed: '10 7', dotted: '0.5 7' } as const;

function BranchEdgeImpl({ id, source, target, data, selected }: EdgeProps<BranchRFEdge>) {
  const s = boxOf(useInternalNode(source));
  const t = boxOf(useInternalNode(target));
  if (!s || !t || !data) return null;
  const e = data.edge;
  const { a, b, horizontal } = branchAnchors(s, t, data.targetShape, data.sourceShape);
  const organic = e.curve === 'organic' && e.style === 'solid';
  const line = strokePath(a, b, horizontal, e.curve === 'organic' ? 'bezier' : e.curve);
  const dir = arrivalDir(a, b, horizontal, e.curve === 'organic' ? 'bezier' : e.curve);
  const tipW = organic ? e.width * 0.4 : e.width;

  return (
    <g className={`branch ${selected ? 'is-selected' : ''}`}>
      {selected && (
        <path d={line} fill="none" stroke={e.color} strokeOpacity={0.25} strokeWidth={e.width + 12} strokeLinecap="round" />
      )}
      {organic ? (
        <path d={taperedPath(cubicFor(a, b, horizontal), e.width)} fill={e.color} />
      ) : (
        <path
          d={line}
          fill="none"
          stroke={e.color}
          strokeWidth={e.width}
          strokeDasharray={DASH[e.style]}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {e.arrow && <path d={arrowHead(b, dir, Math.max(4, tipW * 1.4))} fill={e.color} />}
      {/* fat invisible hit area */}
      <path id={id} d={line} fill="none" stroke="transparent" strokeWidth={Math.max(16, e.width + 10)} className="branch-hit" />
    </g>
  );
}

/** Little puffs of thought rising from a node to its comment bubble. */
function ThoughtEdgeImpl({ source, target }: EdgeProps<ThoughtRFEdge>) {
  const s = boxOf(useInternalNode(source));
  const t = boxOf(useInternalNode(target));
  if (!s || !t) return null;
  // Aim at the cloud part of the bubble (top area), not the open thread panel.
  const cloudBox: Box = { ...t, h: Math.min(t.h, 90) };
  const a = boxExit(s, center(cloudBox));
  const b = boxExit(cloudBox, center(s));
  const puffs = [
    { k: 0.18, r: 3.5 },
    { k: 0.42, r: 5.5 },
    { k: 0.7, r: 8 },
  ];
  return (
    <g className="thought-puffs">
      {puffs.map((p) => (
        <ellipse
          key={p.k}
          cx={a.x + (b.x - a.x) * p.k}
          cy={a.y + (b.y - a.y) * p.k}
          rx={p.r * 1.15}
          ry={p.r}
        />
      ))}
    </g>
  );
}

export const BranchEdge = memo(BranchEdgeImpl);
export const ThoughtEdge = memo(ThoughtEdgeImpl);
