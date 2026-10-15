import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { Tooltip } from './Tooltip';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the child element instead of a <button> (links, menu triggers). */
  asChild?: boolean;
  active?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', asChild, active, block, icon, className = '', children, type, ...rest },
  ref,
) {
  const cls = `btn btn-${variant} btn-${size}${active ? ' is-active' : ''}${block ? ' btn-block' : ''} ${className}`.trim();
  // With asChild the single child element becomes the button; put any icon inside that child.
  if (asChild)
    return (
      <Slot.Root ref={ref} className={cls} {...rest}>
        {children}
      </Slot.Root>
    );
  return (
    <button ref={ref} type={type ?? 'button'} className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'children'> {
  /** Accessible name. Also shown as a tooltip unless `tooltip` is false. */
  label: string;
  shortcut?: string;
  tooltip?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

/** Icon-only button: always has an aria-label and (by default) a tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, tooltip = true, tooltipSide, variant = 'ghost', className = '', children, ...rest },
  ref,
) {
  const btn = (
    <Button ref={ref} variant={variant} aria-label={label} className={`btn-icon ${className}`.trim()} {...rest}>
      {children}
    </Button>
  );
  return tooltip ? (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
      {btn}
    </Tooltip>
  ) : (
    btn
  );
});
