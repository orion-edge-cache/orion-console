/**
 *
 * LogInspector Component
 *
 * Modal for displaying detailed log information.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, Text, Button } from '@tremor/react';
import type { FastlyLogEntry } from '@orion/infra'
import { JsonHighlight } from '@/components/JsonHighlight';
import { levelColors, sourceColors, cacheColors } from '../constants';

interface LogInspectorProps {
  log: FastlyLogEntry;
  onClose: () => void;
}

export function LogInspector({ log, onClose }: LogInspectorProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fields: { label: string; value: string | number | boolean | undefined; color?: string }[] = [
    { label: 'Timestamp', value: new Date(log.timestamp).toISOString() },
    { label: 'Request ID', value: log.request_id },
    { label: 'Level', value: log.level?.toUpperCase(), color: levelColors[log.level] },
    { label: 'Source', value: log.source, color: sourceColors[log.source] },
    { label: 'Event', value: log.event, color: levelColors[log.level] },
    { label: 'Message', value: log.message },
  ]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <Card
        className="max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <Text className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Log Details
          </Text>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors hover:bg-slate-100"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {fields.map((field) => (
            <div key={field.label}>
              <Text className="text-xs font-medium mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {field.label}
              </Text>
              <Text
                className="text-sm font-mono break-all"
                style={{ color: field.color || 'var(--color-text-primary)' }}
              >
                {String(field.value)}
              </Text>
            </div>
          ))}

          {/* Debug Data */}
          {log.data && Object.keys(log.data).length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Text className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Data
              </Text>
              <div
                className="p-3 rounded-lg overflow-x-auto"
                style={{ background: 'var(--color-bg-tertiary)' }}
              >
                <JsonHighlight data={log.data} className="text-xs" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-4 py-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--color-border-subtle)' }}
        >
          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
