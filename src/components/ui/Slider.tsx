import { Slider as RS } from 'radix-ui';

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  ariaLabel,
  unit = '',
  showValue = true,
}: {
  value: number;
  onChange(v: number): void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  unit?: string;
  showValue?: boolean;
}) {
  return (
    <div className="slider-row">
      <RS.Root className="slider" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)}>
        <RS.Track className="slider-track">
          <RS.Range className="slider-range" />
        </RS.Track>
        <RS.Thumb className="slider-thumb" aria-label={ariaLabel} />
      </RS.Root>
      {showValue && (
        <span className="slider-value">
          {value}
          {unit}
        </span>
      )}
    </div>
  );
}
