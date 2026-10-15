import { Fragment, useState, type ReactNode } from 'react';
import { DropdownMenu as RM } from 'radix-ui';
import { Check, ChevronRight } from 'lucide-react';
import { Kbd } from './Kbd';
import { useModalLayer } from './modal';

export type MenuItem =
  | 'separator'
  | { label: string; kind: 'label' }
  | {
      key?: string;
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      onSelect?(): void;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
      /** Nested menu. */
      items?: MenuItem[];
    };

function Items({ items }: { items: MenuItem[] }) {
  return (
    <>
      {items.map((it, i) => {
        if (it === 'separator') return <RM.Separator key={i} className="menu-separator" />;
        if ('kind' in it) return <RM.Label key={i} className="menu-label">{it.label}</RM.Label>;
        if (it.items) {
          return (
            <RM.Sub key={it.key ?? it.label}>
              <RM.SubTrigger className="menu-item" disabled={it.disabled}>
                {it.icon}
                <span className="menu-item-label">{it.label}</span>
                <ChevronRight className="menu-item-sub" />
              </RM.SubTrigger>
              <RM.Portal>
                <RM.SubContent className="menu-content" sideOffset={4} alignOffset={-4} collisionPadding={8}>
                  <Items items={it.items} />
                </RM.SubContent>
              </RM.Portal>
            </RM.Sub>
          );
        }
        return (
          <RM.Item key={it.key ?? it.label} className={`menu-item${it.danger ? ' danger' : ''}`} disabled={it.disabled} onSelect={() => it.onSelect?.()}>
            {it.checked !== undefined ? <span className="menu-item-check">{it.checked && <Check />}</span> : it.icon}
            <span className="menu-item-label">{it.label}</span>
            {it.shortcut && (
              <span className="menu-item-shortcut">
                <Kbd keys={it.shortcut} />
              </span>
            )}
          </RM.Item>
        );
      })}
    </>
  );
}

/** Dropdown menu attached to a trigger element. */
export function Menu({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  open?: boolean;
  onOpenChange?(open: boolean): void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = (v: boolean) => {
    setUncontrolled(v);
    onOpenChange?.(v);
  };
  useModalLayer(open);
  return (
    <RM.Root open={open} onOpenChange={setOpen} modal={false}>
      <RM.Trigger asChild>{trigger}</RM.Trigger>
      <RM.Portal>
        <RM.Content className="menu-content" align={align} side={side} sideOffset={6} collisionPadding={8} loop>
          <Items items={items} />
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}

/** Menu anchored at a screen position (right-click / long-press). */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose(): void }) {
  useModalLayer(true);
  return (
    <RM.Root open onOpenChange={(o) => !o && onClose()} modal>
      <RM.Trigger asChild>
        <span style={{ position: 'fixed', left: x, top: y, width: 1, height: 1, pointerEvents: 'none' }} aria-hidden />
      </RM.Trigger>
      <RM.Portal>
        <RM.Content className="menu-content" align="start" side="bottom" sideOffset={2} collisionPadding={8} loop onContextMenu={(e) => e.preventDefault()}>
          <Fragment>
            <Items items={items} />
          </Fragment>
        </RM.Content>
      </RM.Portal>
    </RM.Root>
  );
}
