import { Minus, Plus } from 'lucide-react';

/** Numeric stepper with −/+ buttons and a typed value. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  ariaLabel,
}: {
  value: number;
  onChange(v: number): void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="stepper" role="group" aria-label={ariaLabel}>
      <button type="button" aria-label="Decrease" disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        <Minus />
      </button>
      <input
        type="number"
        aria-label={ariaLabel}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(clamp(v));
        }}
      />
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        <Plus />
      </button>
    </div>
  );
}
