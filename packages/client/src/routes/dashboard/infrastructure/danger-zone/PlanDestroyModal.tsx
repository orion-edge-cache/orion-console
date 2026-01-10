import { Card, Text, Button, Callout, Badge } from '@tremor/react';
import { FileSearch, AlertTriangle, Trash2, X } from 'lucide-react';

interface PlanResult {
  resources: Array<{ type: string; name: string; provider: string }>;
  demoAppResources?: Array<{ type: string; name: string; provider: string }>;
  hasDemoApp?: boolean;
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
      onClick={onClose}
    >
      <Card
        className="max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
            <Text className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Destruction Plan
            </Text>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Callout title="Warning" icon={AlertTriangle} color="red" className="mb-4">
          {planResult.warning}
        </Callout>

        <div className="space-y-2 mb-6">
          <Text className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Orion resources to be destroyed:
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

          {planResult.demoAppResources && planResult.demoAppResources.length > 0 && (
            <>
              <Text className="text-sm font-medium mt-4" style={{ color: 'var(--color-text-secondary)' }}>
                Demo App resources to be destroyed:
              </Text>
              <div
                className="rounded-lg p-3 max-h-48 overflow-y-auto"
                style={{ background: 'var(--color-bg-tertiary)' }}
              >
                {planResult.demoAppResources.map((r, i) => (
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
                    <Badge color="amber" size="sm">
                      aws
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
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
