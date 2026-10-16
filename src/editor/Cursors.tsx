import { memo } from 'react';
import { useStore } from '@xyflow/react';
import type { PresenceEntry } from '../lib/presence';

/** Other people's pointers, drawn in screen space so they keep their size while zooming. */
export const Cursors = memo(function Cursors({ others }: { others: PresenceEntry[] }) {
  const [tx, ty, zoom] = useStore((s) => s.transform);
  const live = others.filter((o) => o.cursor);
  if (!live.length) return null;
  return (
    <div className="cursors" aria-hidden>
      {live.map((o) => (
        <div
          key={o.clientId}
          className="cursor"
          style={{ transform: `translate3d(${(o.cursor!.x * zoom + tx).toFixed(1)}px, ${(o.cursor!.y * zoom + ty).toFixed(1)}px, 0)`, ['--c' as string]: `var(--palette-${o.color})` }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M2 1.5 14 7.2 8.6 8.6 7.2 14z" fill="var(--c)" stroke="var(--color-surface)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="cursor-name">{o.name}</span>
        </div>
      ))}
    </div>
  );
});
