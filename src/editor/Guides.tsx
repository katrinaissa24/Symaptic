import { perfCount } from '../lib/perf';
import { memo } from 'react';
import { useStore } from '@xyflow/react';
import { useUIStore } from './uiStore';

/**
 * Alignment guides drawn as two 1px divs in screen space, each on its own compositor layer.
 * (SVG lines inside the viewport invalidated the whole canvas on every drag frame.)
 */
export const Guides = memo(function Guides() {
  perfCount('Guides');
  const guides = useUIStore((s) => s.guides);
  const [tx, ty, zoom] = useStore((s) => s.transform);
  if (!guides.length) return null;
  return (
    <div className="guides" aria-hidden>
      {guides.map((g, i) => {
        if (g.axis === 'x') {
          const x = Math.round(g.at * zoom + tx);
          const y1 = Math.round(g.from * zoom + ty) - 8;
          const y2 = Math.round(g.to * zoom + ty) + 8;
          return <div key={i} className="guide guide-v" style={{ transform: `translate(${x}px, ${y1}px)`, height: y2 - y1 }} />;
        }
        const y = Math.round(g.at * zoom + ty);
        const x1 = Math.round(g.from * zoom + tx) - 8;
        const x2 = Math.round(g.to * zoom + tx) + 8;
        return <div key={i} className="guide guide-h" style={{ transform: `translate(${x1}px, ${y}px)`, width: x2 - x1 }} />;
      })}
    </div>
  );
});
