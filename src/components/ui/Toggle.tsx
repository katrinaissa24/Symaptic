import { useId } from 'react';
import { Switch } from 'radix-ui';

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange(v: boolean): void; label: string; disabled?: boolean }) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <Switch.Root id={id} className="switch" checked={checked} onCheckedChange={onChange} disabled={disabled}>
        <Switch.Thumb className="switch-thumb" />
      </Switch.Root>
      <span>{label}</span>
    </label>
  );
}
