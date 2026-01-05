/**
 * Logs Page - /dashboard/logs
 *
 * Real-time logs from CDN, Compute, and backend.
 * - Lazy collection: only streams when user clicks "Begin Streaming"
 * - Circular buffer: max 100 logs, old ones replaced
 * - Log inspection: click a log to see full details
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Wifi, WifiOff, X, ChevronRight } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Flex,
  Select,
  SelectItem,
  Text,
  Title,
} from '@tremor/react';
import type { LogEntry } from '../../types';
import { JsonHighlight } from '@/components/JsonHighlight';

export const Route = createFileRoute('/dashboard/logs')({
  component: LogsPage,
});

const MAX_LOGS = 100;
const API_BASE = 'http://localhost:3001/api';

function LogsPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cdn' | 'compute' | 'backend' | 'system'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Start/stop streaming based on isStreaming state
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/stream?channels=logs`;
    console.log('[Logs] Connecting to:', url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('[Logs] Connected');
      if (mountedRef.current) {
        setIsConnected(true);
      }
    });

    eventSource.addEventListener('log', (event) => {
      try {
        const log: LogEntry = JSON.parse(event.data);
        if (mountedRef.current) {
          setLogs((prev) => {
            // Circular buffer: keep last MAX_LOGS - 1, add new one
            const newLogs = prev.length >= MAX_LOGS
              ? [...prev.slice(1), log]
              : [...prev, log];
            return newLogs;
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    eventSource.onerror = () => {
      console.error('[Logs] Connection error');
      if (mountedRef.current) {
        setIsConnected(false);
      }
    };
  }, []);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Toggle streaming
  const handleToggleStreaming = () => {
    if (isStreaming) {
      stopStreaming();
      setIsStreaming(false);
    } else {
      startStreaming();
      setIsStreaming(true);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (sourceFilter !== 'all' && log.source !== sourceFilter) return false;
    return true;
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current && filteredLogs.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleDownload = () => {
    const logText = logs
      .map((log) => `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message || ''}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orion-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="h-full flex flex-col animate-fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="px-6 py-4 flex-shrink-0 border-b space-y-4"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        {/* Top row: Title and connection status */}
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Logs
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }} className="text-sm">
              Real-time CDN and compute logs (max {MAX_LOGS})
            </Text>
          </div>
          <Badge
            icon={isConnected ? Wifi : WifiOff}
            color={isConnected ? 'emerald' : 'slate'}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </Flex>

        {/* Bottom row: Filters and actions */}
        <Flex justifyContent="between" alignItems="center">
          <Flex className="gap-3">
            <Select
              value={levelFilter}
              onValueChange={(value) => setLevelFilter(value as typeof levelFilter)}
              className="w-32"
            >
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </Select>

            <Select
              value={sourceFilter}
              onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}
              className="w-36"
            >
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="cdn">CDN</SelectItem>
              <SelectItem value="compute">Compute</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </Select>
          </Flex>

          <Flex className="gap-2">
            <Button
              onClick={handleToggleStreaming}
              color={isStreaming ? 'amber' : 'emerald'}
              variant={isStreaming ? 'secondary' : 'primary'}
              icon={isStreaming ? Pause : Play}
              size="sm"
            >
              {isStreaming ? 'Stop' : 'Begin Streaming'}
            </Button>

            <Button onClick={handleClear} variant="secondary" icon={Trash2} size="sm">
              Clear
            </Button>

            <Button onClick={handleDownload} variant="secondary" icon={Download} size="sm" disabled={logs.length === 0}>
              Export
            </Button>
          </Flex>
        </Flex>
      </header>

      {/* Log Viewer */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto text-sm"
          style={{
            background: 'var(--color-bg-secondary)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {!isStreaming && logs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <Play
                className="w-10 h-10 mb-3"
                style={{ color: 'var(--color-accent)' }}
              />
              <Text className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Click "Begin Streaming" to collect logs
              </Text>
              <Text className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Logs are collected only when streaming is active
              </Text>
            </div>
          ) : filteredLogs.length === 0 && isStreaming ? (
            <div
              className="flex flex-col items-center justify-center h-full"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="status-dot status-dot-success status-dot-pulse" />
                <Text className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Waiting for logs...
                </Text>
              </div>
              <Text className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Streaming is active, logs will appear as they arrive
              </Text>
            </div>
          ) : (
            <div>
              {filteredLogs.map((log, index) => (
                <LogRow
                  key={log.timestamp + '-' + index}
                  log={log}
                  onClick={() => setSelectedLog(log)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div
          className="px-4 py-2 flex items-center justify-between text-xs flex-shrink-0 border-t"
          style={{
            background: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border-subtle)',
            color: 'var(--color-text-muted)'
          }}
        >
          <div>
            {filteredLogs.length} log entries
            {levelFilter !== 'all' && ` (level: ${levelFilter})`}
            {sourceFilter !== 'all' && ` (source: ${sourceFilter})`}
          </div>
          <div className="flex items-center gap-4">
            <span>Buffer: {logs.length}/{MAX_LOGS}</span>
            <span
              className="flex items-center gap-1"
              style={{ color: autoScroll ? 'var(--color-info)' : 'var(--color-text-muted)' }}
            >
              Auto-scroll: {autoScroll ? 'On' : 'Off'}
            </span>
            <span
              className="flex items-center gap-1"
              style={{ color: isStreaming ? 'var(--color-success)' : 'var(--color-text-muted)' }}
            >
              <span className={`status-dot ${isStreaming ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
              {isStreaming ? 'Streaming' : 'Paused'}
            </span>
          </div>
        </div>
      </Card>

      {/* Log Inspection Modal */}
      {selectedLog && (
        <LogInspector log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MEMOIZED LOG ROW COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

interface LogRowProps {
  log: LogEntry;
  onClick: () => void;
}

// Colors for log styling
const levelColors: Record<string, string> = {
  info: 'var(--color-info)',
  warn: 'var(--color-warning)',
  error: 'var(--color-error)',
  debug: 'var(--color-text-muted)',
};

const sourceColors: Record<string, string> = {
  cdn: 'var(--color-success)',
  compute: '#a855f7',
  backend: 'var(--color-warning)',
  system: 'var(--color-text-muted)',
};

const cacheColors: Record<string, string> = {
  HIT: 'var(--color-success)',
  MISS: 'var(--color-error)',
  PASS: 'var(--color-warning)',
  SYNTH: 'var(--color-info)',
};

const operationTypeColors: Record<string, string> = {
  query: 'var(--color-info)',
  mutation: 'var(--color-warning)',
  subscription: '#a855f7',
};

const LogRow = memo(function LogRow({ log, onClick }: LogRowProps) {
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

/* ─────────────────────────────────────────────────────────────────────────────
   LOG INSPECTOR MODAL
   ───────────────────────────────────────────────────────────────────────────── */

interface LogInspectorProps {
  log: LogEntry;
  onClose: () => void;
}

function LogInspector({ log, onClose }: LogInspectorProps) {
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

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  } catch {
    return '--:--:--';
  }
}
