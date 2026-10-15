import type { ReactNode } from 'react';
import { Tooltip as RT } from 'radix-ui';
import { Kbd } from './Kbd';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RT.Provider delayDuration={400} skipDelayDuration={300}>
      {children}
    </RT.Provider>
  );
}

export function Tooltip({
  content,
  shortcut,
  side = 'bottom',
  children,
  disabled,
}: {
  content: ReactNode;
  /** e.g. "⌘K" or "N" — rendered as key caps. */
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  disabled?: boolean;
}) {
  if (disabled || !content) return <>{children}</>;
  return (
    <RT.Root>
      <RT.Trigger asChild>{children}</RT.Trigger>
      <RT.Portal>
        <RT.Content className="tooltip-content" side={side} sideOffset={6} collisionPadding={8}>
          {content}
          {shortcut && <Kbd keys={shortcut} />}
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
