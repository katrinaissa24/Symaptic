import { Select as RS } from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useModalLayer } from './modal';
import { useId, useState } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: string;
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  variant = 'default',
  size = 'md',
  disabled,
  className = '',
}: {
  value: T;
  onValueChange(v: T): void;
  options: SelectOption<T>[];
  placeholder?: string;
  ariaLabel: string;
  variant?: 'default' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useModalLayer(open);
  return (
    <RS.Root value={value} onValueChange={(v) => onValueChange(v as T)} open={open} onOpenChange={setOpen} disabled={disabled}>
      <RS.Trigger className={`select-trigger${variant === 'ghost' ? ' select-ghost' : ''}${size === 'sm' ? ' select-sm' : ''} ${className}`.trim()} aria-labelledby={`${id}-label ${id}-value`}>
        <span id={`${id}-label`} className="visually-hidden">
          {ariaLabel}
        </span>
        <span id={`${id}-value`} className="select-value">
          <RS.Value placeholder={placeholder} />
        </span>
        <RS.Icon className="select-chevron">
          <ChevronDown />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content className="select-content" position="popper" sideOffset={4} collisionPadding={8}>
          <RS.Viewport>
            {options.map((o) => (
              <RS.Item key={o.value} value={o.value} className="select-item" disabled={o.disabled}>
                <RS.ItemIndicator className="select-item-check">
                  <Check />
                </RS.ItemIndicator>
                <span>
                  <RS.ItemText>{o.label}</RS.ItemText>
                  {o.description && <span className="select-item-desc">{o.description}</span>}
                </span>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
