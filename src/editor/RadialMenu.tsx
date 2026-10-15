import { useEffect, useState, type ReactNode } from 'react';
import { PALETTE } from '../lib/palette';
const WHEEL_OUTER = PALETTE.map((p) => p.hex);

export interface RadialItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect(): void;
  rainbow?: boolean;
  active?: boolean;
  /** keep the menu open after selecting (toggles) */
  stay?: boolean;
}

const R_OUT = 112;
const R_IN = 48;
const SIZE = 300;
const C = SIZE / 2;

function sector(r0: number, r1: number, a0: number, a1: number, pad = 0.012): string {
  a0 += pad;
  a1 -= pad;
  const p = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(2)},${(C + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1},${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
}

function useDismiss(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    window.addEventListener('wheel', onClose, { passive: true });
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('wheel', onClose);
    };
  }, [onClose]);
}

function clampPos(x: number, y: number) {
  const m = C - R_OUT + 8;
  return {
    left: Math.min(Math.max(x - C, -m), window.innerWidth - SIZE + m),
    top: Math.min(Math.max(y - C, -m), window.innerHeight - SIZE + m),
  };
}

export function RadialMenu({
  x,
  y,
  items,
  title,
  onClose,
}: {
  x: number;
  y: number;
  items: RadialItem[];
  title?: string;
  onClose(): void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  useDismiss(onClose);
  const step = (Math.PI * 2) / items.length;
  const start = -Math.PI / 2 - step / 2;

  return (
    <div className="radial-backdrop" onPointerDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div className="radial" style={clampPos(x, y)} onPointerDown={(e) => e.stopPropagation()}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <linearGradient id="radial-rainbow" x1="0" y1="0" x2="1" y2="1">
              {['#e8606e', '#f29a55', '#f2c94c', '#86c440', '#3cc9b0', '#6f96dc', '#9b7be6', '#ef7fb0'].map((c, i, a) => (
                <stop key={c} offset={i / (a.length - 1)} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          {items.map((it, i) => {
            const a0 = start + i * step;
            const a1 = a0 + step;
            const mid = (a0 + a1) / 2;
            const r = (R_IN + R_OUT) / 2;
            return (
              <g
                key={it.key}
                className={`radial-seg ${hover === i ? 'hover' : ''} ${it.active ? 'active' : ''}`}
                role="button"
                aria-label={it.label}
                style={{ ['--i' as string]: i }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover((h) => (h === i ? null : h))}
                onClick={() => {
                  it.onSelect();
                  if (!it.stay) onClose();
                }}
              >
                <path
                  d={sector(R_IN, R_OUT, a0, a1)}
                  className={it.rainbow ? 'radial-seg-bg rainbow' : 'radial-seg-bg'}
                  fill={it.rainbow ? 'url(#radial-rainbow)' : undefined}
                />
                {it.rainbow ? null : (
                  <foreignObject x={C + r * Math.cos(mid) - 14} y={C + r * Math.sin(mid) - 14} width={28} height={28} pointerEvents="none">
                    <div className="radial-icon">{it.icon}</div>
                  </foreignObject>
                )}
              </g>
            );
          })}
          <text x={C} y={C + 4} textAnchor="middle" className="radial-label">
            {hover != null ? items[hover].label : title ?? ''}
          </text>
        </svg>
      </div>
    </div>
  );
}

/** Two rings of colour like a painter's wheel: bold outside, pastel inside. */
export function ColorWheel({
  x,
  y,
  value,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  value?: string;
  onPick(c: string): void;
  onClose(): void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  useDismiss(onClose);
  const ring = (colors: string[], r0: number, r1: number, offset: number) => {
    const step = (Math.PI * 2) / colors.length;
    return colors.map((c, i) => {
      const a0 = -Math.PI / 2 + offset + i * step;
      return (
        <path
          key={c}
          d={sector(r0, r1, a0, a0 + step, 0.018)}
          fill={c}
          className={`wheel-seg ${value === c ? 'active' : ''}`}
          role="button"
          aria-label={`Colour ${c}`}
          style={{ ['--i' as string]: i }}
          onPointerEnter={() => setHover(c)}
          onPointerLeave={() => setHover(null)}
          onClick={() => {
            onPick(c);
            onClose();
          }}
        />
      );
    });
  };
  const shown = hover ?? value ?? '#ffffff';
  return (
    <div className="radial-backdrop" onPointerDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div className="radial wheel" style={clampPos(x, y)} onPointerDown={(e) => e.stopPropagation()}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={C} cy={C} r={R_OUT + 14} className="wheel-rim" />
          {ring(WHEEL_OUTER, 52, R_OUT + 8, 0)}
          <circle cx={C} cy={C} r={38} fill={shown} className="wheel-center" />
        </svg>
        <label className="wheel-custom" title="Custom colour">
          <input type="color" value={value ?? '#c58ae0'} onChange={(e) => onPick(e.target.value)} />
          <span>+</span>
        </label>
      </div>
    </div>
  );
}
