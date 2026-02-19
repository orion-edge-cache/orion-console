/**
 * LogRow Component
 *
 * Memoized component for displaying individual log entries.
 */

import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { LogEntry } from '../../../../types';
import { formatTimestamp } from '../utils';
import {
  levelColors,
  sourceColors,
  cacheColors,
  operationTypeColors,
} from '../constants';

interface LogRowProps {
  log: LogEntry;
  onClick: () => void;
}

export const LogRow = memo(function LogRow({ log, onClick }: LogRowProps) {
  if (!log) return null;

  // Build message with request details if available
  let displayMessage = log.message || '';
  if (!displayMessage && log.request_method && log.url) {
    displayMessage = `${log.request_method} ${log.url}`;
    if (log.status_code) displayMessage += ` → ${log.status_code}`;
    if (log.cache_status) displayMessage += ` [${log.cache_status}]`;
    if (log.latency_ms) displayMessage += ` ${log.latency_ms}ms`;
  }

  // Normalize cache status for color matching (handle HIT-CLUSTER, MISS-CLUSTER, etc.)
  const cacheStatusKey = log.cache_status?.split('-')[0] || '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-1.5 border-b transition-colors cursor-pointer group hover:bg-slate-50"
      style={{
        borderColor: 'var(--color-border-subtle)',
      }}
      onClick={onClick}
    >
      <span
        className="flex-shrink-0 w-24 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {formatTimestamp(log.timestamp)}
      </span>
      <span
        className="flex-shrink-0 w-10 text-xs"
        style={{ color: levelColors[log.level] || 'var(--color-text-muted)' }}
      >
        [{log.level?.toUpperCase().slice(0, 4) || 'INFO'}]
      </span>
      <span
        className="flex-shrink-0 w-16 text-xs"
        style={{ color: sourceColors[log.source] || 'var(--color-text-muted)' }}
      >
        [{log.source || 'system'}]
      </span>
      {log.cache_status && (
        <span
          className="flex-shrink-0 w-16 text-xs"
          style={{ color: cacheColors[cacheStatusKey] || 'var(--color-text-muted)' }}
        >
          {log.cache_status}
        </span>
      )}
      {log.operation_name && (
        <span className="flex-shrink-0 text-xs">
          <span style={{ color: 'var(--color-text-muted)' }}>{log.operation_type || 'query'}:</span>
          <span
            className="ml-1"
            style={{ color: operationTypeColors[log.operation_type || ''] || 'var(--color-accent)' }}
          >
            {log.operation_name}
          </span>
        </span>
      )}
      <span
        className="text-xs truncate flex-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {displayMessage}
      </span>
      <ChevronRight
        className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      />
    </div>
  );
});
