import type { ReactNode } from 'react';
import { Dialog as RD, VisuallyHidden } from 'radix-ui';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { useModalLayer } from './modal';

/**
 * Modal dialog. Radix provides the focus trap, Escape, outside-click dismissal and focus
 * restoration to the trigger. Becomes a bottom sheet on small screens.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width,
  hideTitle,
  sheet = true,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  hideTitle?: boolean;
  sheet?: boolean;
}) {
  useModalLayer(open);
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="dialog-overlay" />
        <RD.Content className={`dialog-content${sheet ? ' dialog-sheet' : ''}`} style={width ? ({ ['--dialog-w' as string]: `${width}px` } as React.CSSProperties) : undefined}>
          <div className="dialog-head">
            <div>
              {hideTitle ? (
                <VisuallyHidden.Root>
                  <RD.Title>{title}</RD.Title>
                </VisuallyHidden.Root>
              ) : (
                <RD.Title className="dialog-title">{title}</RD.Title>
              )}
              {description ? <RD.Description className="dialog-desc">{description}</RD.Description> : <VisuallyHidden.Root><RD.Description>{title}</RD.Description></VisuallyHidden.Root>}
            </div>
            <RD.Close asChild>
              <IconButton label="Close" tooltip={false} size="sm">
                <X />
              </IconButton>
            </RD.Close>
          </div>
          {children}
          {footer && <div className="dialog-foot">{footer}</div>}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
