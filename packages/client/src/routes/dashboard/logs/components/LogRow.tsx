/**
 * LogRow Component
 *
 * Memoized component for displaying individual log entries.
 */

import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { FastlyLogEntry } from '@orion/infra';
import { formatTimestamp } from '../utils';
import {
  levelColors,
  sourceColors,
  cacheColors,
  operationTypeColors,
} from '../constants';

interface LogRowProps {
  log: FastlyLogEntry;
  onClick: () => void;
}

export const LogRow = memo(function LogRow({ log, onClick }: LogRowProps) {
  if (!log) return null;

  // Build message with request details if available
  let displayMessage = log.source;
  let event: string;
  if (log.source === 'cdn') {
    event = log.event.toUpperCase()
  } else {
    event = 'EDGE';
  }

  // Normalize cache status for color matching (handle HIT-CLUSTER, MISS-CLUSTER, etc.)

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
        ...{log.request_id.slice(-4)}
      </span>
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
      <span
        className="text-xs truncate flex-1"
        style={{ color: cacheColors[event] || 'var(--color-text-secondary)' }}
      >
        {event}
      </span>
      <ChevronRight
        className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      />
    </div>
  );
});
