import type { ReactNode } from 'react';
import { Popover as RP } from 'radix-ui';
import { useModalLayer } from './modal';

export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  className = '',
  modal = false,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  trigger: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  modal?: boolean;
}) {
  useModalLayer(open);
  return (
    <RP.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <RP.Trigger asChild>{trigger}</RP.Trigger>
      <RP.Portal>
        <RP.Content className={`popover-content ${className}`.trim()} side={side} align={align} sideOffset={6} collisionPadding={8}>
          {children}
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}
