import { memo } from 'react';
import type { MapDoc } from '../lib/types';
import { displayHex } from '../lib/palette';
import { estimateSize } from '../editor/viewport';
import { displayFontSize, isLegacy } from '../editor/compat';

const W = 240;
const H = 144;

/** Scaled-down rendering of the real map: boxes with labels and the branches between them. */
export const MapThumb = memo(function MapThumb({ doc, className = '' }: { doc: Pick<MapDoc, 'nodes' | 'edges' | 'v'>; className?: string }) {
  const nodes = Object.values(doc.nodes ?? {});
  if (!nodes.length) return <svg className={`thumb ${className}`.trim()} viewBox={`0 0 ${W} ${H}`} aria-hidden />;
  const legacy = isLegacy(doc);
  const boxes = nodes.map((n) => {
    const s = estimateSize({ ...n, fontSize: displayFontSize(n.fontSize, legacy) });
    return { n, x: n.x, y: n.y, w: s.w, h: s.h };
  });
  const minX = Math.min(...boxes.map((b) => b.x)) - 24;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 24;
  const minY = Math.min(...boxes.map((b) => b.y)) - 24;
  const maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 24;
  const s = Math.min(W / (maxX - minX), H / (maxY - minY), 0.5);
  const ox = (W - (maxX - minX) * s) / 2 - minX * s;
  const oy = (H - (maxY - minY) * s) / 2 - minY * s;
  const X = (x: number) => ox + x * s;
  const Y = (y: number) => oy + y * s;
  const byId = Object.fromEntries(boxes.map((b) => [b.n.id, b]));
  const showText = s > 0.22;
  return (
    <svg className={`thumb ${className}`.trim()} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      {Object.values(doc.edges ?? {}).map((e) => {
        const a = byId[e.source];
        const b = byId[e.target];
        if (!a || !b) return null;
        const right = b.x + b.w / 2 >= a.x + a.w / 2;
        const x1 = X(right ? a.x + a.w : a.x);
        const y1 = Y(a.y + a.h / 2);
        const x2 = X(right ? b.x : b.x + b.w);
        const y2 = Y(b.y + b.h / 2);
        const mx = (x1 + x2) / 2;
        return <path key={e.id} d={`M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`} stroke={displayHex(e.color)} strokeOpacity={0.6} strokeWidth={Math.max(0.8, 1.5 * s * 2)} fill="none" strokeLinecap="round" />;
      })}
      {boxes.map((b) => {
        const c = displayHex(b.n.color);
        const root = !!b.n.root;
        const fs = Math.max(3, Math.min(9, displayFontSize(b.n.fontSize, legacy) * s * 1.2));
        return (
          <g key={b.n.id}>
            <rect x={X(b.x)} y={Y(b.y)} width={b.w * s} height={b.h * s} rx={Math.max(1.5, 8 * s)} fill={c} fillOpacity={root ? 1 : 0.14} stroke={c} strokeOpacity={root ? 1 : 0.5} strokeWidth={0.75} />
            {showText && (
              <text x={X(b.x + b.w / 2)} y={Y(b.y + b.h / 2)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={root ? 600 : 400} fill={root ? 'var(--color-text-on-accent)' : 'var(--color-text-2)'}>
                {b.n.text.length > 18 ? b.n.text.slice(0, 17) + '…' : b.n.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
});
