import type { ReactNode } from 'react';
import { ToggleGroup } from 'radix-ui';
import { Tooltip } from './Tooltip';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Icon-only option; label becomes the tooltip + aria-label. */
  iconOnly?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
}: {
  value: T | undefined;
  onChange(v: T): void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  const icons = options.every((o) => o.iconOnly);
  return (
    <ToggleGroup.Root
      type="single"
      value={value ?? ''}
      onValueChange={(v) => v && onChange(v as T)}
      className={`segmented${icons ? ' segmented-icons' : ''}${size === 'sm' ? ' segmented-sm' : ''}`}
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const item = (
          <ToggleGroup.Item key={o.value} value={o.value} className="segmented-item" aria-label={o.iconOnly ? o.label : undefined}>
            {o.icon}
            {!o.iconOnly && o.label}
          </ToggleGroup.Item>
        );
        return o.iconOnly ? (
          <Tooltip key={o.value} content={o.label}>
            {item}
          </Tooltip>
        ) : (
          item
        );
      })}
    </ToggleGroup.Root>
  );
}
