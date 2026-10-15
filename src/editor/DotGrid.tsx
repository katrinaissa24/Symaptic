import { memo, useEffect, useRef } from 'react';
import { useStoreApi } from '@xyflow/react';

const GAP = 24;
const OVERSCAN = 160;

/**
 * Dot grid that follows the viewport without going through React. Panning only changes a
 * compositor-friendly transform; zooming updates the tile size. Fades out when zoomed far out.
 */
export const DotGrid = memo(function DotGrid() {
  const ref = useRef<HTMLDivElement>(null);
  const store = useStoreApi();

  useEffect(() => {
    let last: unknown = null;
    const apply = () => {
      const el = ref.current;
      const [x, y, z] = store.getState().transform;
      if (!el) return;
      const size = GAP * z;
      el.style.backgroundSize = `${size}px ${size}px`;
      const tx = ((x % size) + size) % size;
      const ty = ((y % size) + size) % size;
      el.style.transform = `translate3d(${(tx - OVERSCAN).toFixed(2)}px, ${(ty - OVERSCAN).toFixed(2)}px, 0)`;
      el.style.opacity = z < 0.45 ? '0' : '1';
    };
    apply();
    return store.subscribe((s) => {
      if (s.transform !== last) {
        last = s.transform;
        apply();
      }
    });
  }, [store]);

  return <div ref={ref} className="dot-grid" aria-hidden />;
});
