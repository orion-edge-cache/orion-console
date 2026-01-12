/**
 * LogInspector Component
 *
 * Modal for displaying detailed log information.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, Text, Button } from '@tremor/react';
import type { LogEntry } from '../../../../types';
import { JsonHighlight } from '@/components/JsonHighlight';
import { levelColors, sourceColors, cacheColors } from '../constants';

interface LogInspectorProps {
  log: LogEntry;
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

  // Determine if this is a VCL debug log
  const isVclLog = !!(log.vcl_subroutine || log.vcl_title);

  // Build all fields for display
  const fields: { label: string; value: string | number | boolean | undefined; color?: string }[] = [
    { label: 'Timestamp', value: new Date(log.timestamp).toISOString() },
    { label: 'Level', value: log.level?.toUpperCase(), color: levelColors[log.level] },
    { label: 'Source', value: log.source, color: sourceColors[log.source] },
    { label: 'Message', value: log.message },
    { label: 'Request Method', value: log.request_method },
    { label: 'URL', value: log.url },
    { label: 'Status Code', value: log.status_code },
    { label: 'Cache Status', value: log.cache_status, color: cacheColors[log.cache_status?.split('-')[0] || ''] },
    { label: 'Latency (ms)', value: log.latency_ms },
    { label: 'Operation Type', value: log.operation_type },
    { label: 'Operation Name', value: log.operation_name },
    // VCL-specific fields
    ...(isVclLog ? [
      { label: 'VCL Subroutine', value: log.vcl_subroutine, color: 'var(--color-accent)' },
      { label: 'VCL Title', value: log.vcl_title },
      { label: 'VCL Step', value: log.vcl_step },
      { label: 'CDN Version', value: log.vcl_version },
      { label: 'Host', value: log.vcl_host },
      { label: 'Path', value: log.vcl_path },
      { label: 'X-GraphQL-Query', value: log.vcl_graphql_query },
      { label: 'Body', value: log.vcl_body },
      { label: 'Backend', value: log.vcl_backend },
      { label: 'Cacheable', value: log.vcl_cacheable },
      { label: 'Restarts', value: log.vcl_restarts },
    ] : []),
  ].filter(f => f.value !== undefined && f.value !== null && f.value !== '');

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
                Debug Data
              </Text>
              <div
                className="p-3 rounded-lg overflow-x-auto"
                style={{ background: 'var(--color-bg-tertiary)' }}
              >
                <JsonHighlight data={log.data} className="text-xs" />
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <Text className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Raw JSON
            </Text>
            <div
              className="p-3 rounded-lg overflow-x-auto"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <JsonHighlight data={log} className="text-xs" />
            </div>
          </div>
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
