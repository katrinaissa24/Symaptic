import type { Shape } from '../lib/types';
import { SHAPE_PATHS } from './geometry';
import {
  ArrowLeft, ArrowRight, Bold, Check, Copy, CornerDownRight, GitBranch, Link2, ListTree, Maximize, MessageSquare, Plus, Redo2,
  Share2, Shapes, Spline, Trash2, Type, Undo2,
} from 'lucide-react';

/** Lucide icons, one set, one stroke width (see base.css `svg.lucide`). */
export const Icon = {
  plus: <Plus />,
  sibling: <CornerDownRight />,
  comment: <MessageSquare />,
  shape: <Shapes />,
  line: <Spline />,
  link: <Link2 />,
  duplicate: <Copy />,
  trash: <Trash2 />,
  fit: <Maximize />,
  undo: <Undo2 />,
  redo: <Redo2 />,
  arrow: <ArrowRight />,
  check: <Check />,
  text: <Type />,
  bold: <Bold />,
  share: <Share2 />,
  back: <ArrowLeft />,
  tidy: <ListTree />,
  branch: <GitBranch />,
};

/** Outline preview of a node shape. */
export function ShapeIcon({ shape, size = 26 }: { shape: Shape; size?: number }) {
  const p = SHAPE_PATHS[shape];
  const common = { fill: 'currentColor', fillOpacity: 0.12, stroke: 'currentColor', strokeWidth: 1.75 };
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 40 28" aria-hidden>
      {p ? (
        <g transform="translate(4,3) scale(0.32,0.22)">
          <path d={p} {...common} strokeWidth={7} vectorEffect="non-scaling-stroke" />
        </g>
      ) : shape === 'pill' ? (
        <rect x="4" y="7" width="32" height="14" rx="7" {...common} />
      ) : shape === 'rounded' || shape === 'underline' ? (
        <rect x="4" y="6" width="32" height="16" rx="4" {...common} />
      ) : shape === 'rect' ? (
        <rect x="4" y="6" width="32" height="16" rx="1" {...common} />
      ) : shape === 'ellipse' ? (
        <ellipse cx="20" cy="14" rx="16" ry="9" {...common} />
      ) : shape === 'circle' ? (
        <circle cx="20" cy="14" r="10" {...common} />
      ) : (
        <text x="20" y="19" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">
          Aa
        </text>
      )}
    </svg>
  );
}
