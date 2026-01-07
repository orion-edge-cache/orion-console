import { Loader2 } from 'lucide-react';
import { TerminalOutput } from '../../../../components/shared/terminal';

interface DestroyProgressProps {
  isDestroying: boolean;
  logs: string[];
}

export function DestroyProgress({ isDestroying, logs }: DestroyProgressProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {isDestroying && (
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-error)' }} />
        )}
        <span className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
          {isDestroying ? 'Destroying infrastructure...' : 'Destroy complete'}
        </span>
      </div>
      <TerminalOutput logs={logs} maxHeight="16rem" />
    </div>
  );
}
