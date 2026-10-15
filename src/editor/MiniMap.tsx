import { memo, useEffect, useMemo, useRef } from 'react';
import { useReactFlow, useStoreApi, type Node } from '@xyflow/react';
import type { MapNode } from '../lib/types';
import { boundsOf, nodeRect } from './viewport';

const W = 180;
const H = 110;
const PAD = 8;
const THROTTLE_MS = 80;

/**
 * Canvas minimap: nodes are flat rectangles drawn at most every 80 ms. Costs one draw call
 * instead of hundreds of SVG elements re-rendered on every viewport change.
 */
export const MiniMap = memo(function MiniMap({ nodes }: { nodes: Node[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const store = useStoreApi();
  const rf = useReactFlow();

  const scene = useMemo(() => {
    const b = boundsOf(nodes);
    if (!b) return null;
    const s = Math.min((W - PAD * 2) / Math.max(1, b.width), (H - PAD * 2) / Math.max(1, b.height));
    const ox = (W - b.width * s) / 2 - b.x * s;
    const oy = (H - b.height * s) / 2 - b.y * s;
    const rects = nodes.map((n) => {
      const r = nodeRect(n);
      const color = n.type === 'comment' ? 'var(--minimap-comment)' : ((n.data as { node?: MapNode }).node?.color ?? '#999');
      return { x: ox + r.x * s, y: oy + r.y * s, w: Math.max(2, r.width * s), h: Math.max(2, r.height * s), color };
    });
    return { s, ox, oy, rects };
  }, [nodes]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !scene) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = W * dpr;
    el.height = H * dpr;
    const styles = getComputedStyle(el);
    const commentColor = styles.getPropertyValue('--minimap-comment').trim() || '#e6c35c';
    const maskColor = styles.getPropertyValue('--minimap-mask').trim() || 'rgba(0,0,0,.08)';
    const frameColor = styles.getPropertyValue('--minimap-frame').trim() || 'rgba(0,0,0,.35)';

    let timer: number | null = null;
    const draw = () => {
      timer = null;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const r of scene.rects) {
        ctx.fillStyle = r.color.startsWith('var(') ? commentColor : r.color;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      const { transform, width, height } = store.getState();
      const [tx, ty, z] = transform;
      const vx = scene.ox + (-tx / z) * scene.s;
      const vy = scene.oy + (-ty / z) * scene.s;
      const vw = (width / z) * scene.s;
      const vh = (height / z) * scene.s;
      ctx.fillStyle = maskColor;
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(vx, vy, vw, vh);
      ctx.fill('evenodd');
      ctx.strokeStyle = frameColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(vx + 0.5, vy + 0.5, vw - 1, vh - 1);
    };
    const schedule = () => {
      if (timer == null) timer = window.setTimeout(draw, THROTTLE_MS);
    };
    draw();
    let last = store.getState().transform;
    const unsub = store.subscribe((s) => {
      if (s.transform !== last) {
        last = s.transform;
        schedule();
      }
    });
    return () => {
      unsub();
      if (timer != null) clearTimeout(timer);
    };
  }, [scene, store]);

  if (!scene) return null;

  const centerAt = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    const fx = (e.clientX - r.left - scene.ox) / scene.s;
    const fy = (e.clientY - r.top - scene.oy) / scene.s;
    rf.setCenter(fx, fy, { zoom: rf.getViewport().zoom, duration: 0 });
  };

  return (
    <canvas
      ref={canvas}
      className="minimap"
      style={{ width: W, height: H }}
      role="img"
      aria-label="Map overview"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        centerAt(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) centerAt(e);
      }}
    />
  );
});
