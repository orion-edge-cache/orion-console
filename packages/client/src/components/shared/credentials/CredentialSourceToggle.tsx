import { Callout } from '@tremor/react';
import { ShieldCheck } from 'lucide-react';

interface CredentialSourceToggleProps {
  detected: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
  keyHint?: string;
  label?: string;
}

export function CredentialSourceToggle({
  detected,
  checked,
  onChange,
  keyHint,
  label = 'System credentials detected — use these',
}: CredentialSourceToggleProps) {
  if (!detected) {
    return null;
  }

  return (
    <Callout color="blue" icon={ShieldCheck}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded accent-cyan-500"
        />
        <span>
          {label}
          {keyHint && (
            <span className="text-slate-500 ml-1">({keyHint})</span>
          )}
        </span>
      </label>
    </Callout>
  );
}
