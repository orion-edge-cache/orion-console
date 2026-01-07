import { Card, Text, Button, Callout, Badge } from '@tremor/react';
import { FileSearch, AlertTriangle, Trash2 } from 'lucide-react';

interface PlanResult {
  resources: Array<{ type: string; name: string; provider: string }>;
  warning: string;
}

interface PlanDestroyModalProps {
  planResult: PlanResult;
  onClose: () => void;
  onProceed: () => void;
}

export function PlanDestroyModal({ planResult, onClose, onProceed }: PlanDestroyModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0, 0, 0, 0.4)' }}
    >
      <Card className="max-w-lg w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
          <Text className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Destruction Plan
          </Text>
        </div>

        <Callout title="Warning" icon={AlertTriangle} color="red" className="mb-4">
          {planResult.warning}
        </Callout>

        <div className="space-y-2 mb-6">
          <Text className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Resources to be destroyed:
          </Text>
          <div
            className="rounded-lg p-3 max-h-48 overflow-y-auto"
            style={{ background: 'var(--color-bg-tertiary)' }}
          >
            {planResult.resources.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
                style={{ borderColor: 'var(--color-border-subtle)' }}
              >
                <div>
                  <Text className="text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {r.name}
                  </Text>
                  <Text className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {r.type}
                  </Text>
                </div>
                <Badge color={r.provider === 'aws' ? 'amber' : 'rose'} size="sm">
                  {r.provider}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
          <Button onClick={onProceed} color="red" icon={Trash2}>
            Proceed to Destroy
          </Button>
        </div>
      </Card>
    </div>
  );
}
