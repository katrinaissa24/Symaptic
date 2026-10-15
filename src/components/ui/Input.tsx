import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, inputSize = 'md', icon, className = '', ...rest }, ref) {
  const el = <input ref={ref} className={`input input-${inputSize} ${className}`.trim()} aria-invalid={invalid || undefined} {...rest} />;
  if (!icon) return el;
  return (
    <span className="input-wrap">
      <span className="input-icon">{icon}</span>
      {el}
    </span>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { invalid, className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={`input ${className}`.trim()} aria-invalid={invalid || undefined} {...rest} />;
});

/** Label + control + hint/error, wired together for screen readers. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy: hint || error ? msgId : undefined, invalid: !!error })}
      {error ? (
        <span className="field-error" id={msgId} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint" id={msgId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
