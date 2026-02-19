/**
 * Logs Page - /dashboard/logs
 *
 * Real-time logs from CDN, Compute, and backend.
 * - Lazy collection: only streams when user clicks "Begin Streaming"
 * - Circular buffer: max 100 logs, old ones replaced
 * - Log inspection: click a log to see full details
 */

import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Trash2, Download, Wifi, WifiOff } from 'lucide-react';
import { getObservabilityStatus } from '../../services';
import { KinesisStatusBadge } from '@/components/shared/observability';
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
import type { FastlyLogEntry } from '@orion/infra';

// Local components
import { LogRow, LogInspector } from './logs/components';

export const Route = createFileRoute('/dashboard/logs')({
  component: LogsPage,
});

const MAX_LOGS = 100;
const API_BASE = 'http://localhost:3001/api';

function LogsPage() {
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<FastlyLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<FastlyLogEntry | null>(null);

  // Filter state
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cdn' | 'compute' | 'backend' | 'system'>('all');

  // Auto-scroll state
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Refs for streaming
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // Observability status query
  const { data: observabilityData } = useQuery({
    queryKey: ['observability-status'],
    queryFn: getObservabilityStatus,
    refetchInterval: 5000,
    staleTime: 5000,
  });

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

  // Start streaming
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/stream?channels=logs`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      if (mountedRef.current) setIsConnected(true);
    });

    eventSource.addEventListener('log', (event) => {
      try {
        const log: FastlyLogEntry = JSON.parse(event.data);
        if (mountedRef.current) {
          setLogs((prev) => {
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
      if (mountedRef.current) setIsConnected(false);
    };
  }, []);

  // Stop streaming
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

  const handleClear = () => setLogs([]);

  const handleDownload = () => {
    const formatTime = (ts: string) => {
      try {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          + '.' + d.getMilliseconds().toString().padStart(3, '0');
      } catch { return '--:--:--'; }
    };
    const logText = logs
      .map((log) => `[${formatTime(log.timestamp)}] [${log.request_id || 'No Request Id'}] [${log.level.toUpperCase()}] [${log.source}] ${log.event || ''}`)
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
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Logs
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }} className="text-sm">
              Real-time CDN and compute logs (max {MAX_LOGS})
            </Text>
          </div>
          <Flex className="gap-2">
            <Badge icon={isConnected ? Wifi : WifiOff} color={isConnected ? 'emerald' : 'slate'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <KinesisStatusBadge status={observabilityData?.kinesis} size="md" />
          </Flex>
        </Flex>

        <Flex justifyContent="between" alignItems="center">
          <Flex className="gap-3">
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as typeof levelFilter)} className="w-32">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </Select>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)} className="w-36">
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
            <Button onClick={handleClear} variant="secondary" icon={Trash2} size="sm">Clear</Button>
            <Button onClick={handleDownload} variant="secondary" icon={Download} size="sm" disabled={logs.length === 0}>Export</Button>
          </Flex>
        </Flex>
      </header>

      {/* Log Viewer */}
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto text-sm"
          style={{ background: 'var(--color-bg-secondary)', fontFamily: 'var(--font-mono)' }}
        >
          {!isStreaming && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
              <Play className="w-10 h-10 mb-3" style={{ color: 'var(--color-accent)' }} />
              <Text className="text-lg font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Click "Begin Streaming" to collect logs
              </Text>
              <Text className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Logs are collected only when streaming is active
              </Text>
            </div>
          ) : filteredLogs.length === 0 && isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--color-text-muted)' }}>
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
                <LogRow key={log.timestamp + '-' + index} log={log} onClick={() => setSelectedLog(log)} />
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div
          className="px-4 py-2 flex items-center justify-between text-xs flex-shrink-0 border-t"
          style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }}
        >
          <div>
            {filteredLogs.length} log entries
            {levelFilter !== 'all' && ` (level: ${levelFilter})`}
            {sourceFilter !== 'all' && ` (source: ${sourceFilter})`}
          </div>
          <div className="flex items-center gap-4">
            <span>Buffer: {logs.length}/{MAX_LOGS}</span>
            <span style={{ color: autoScroll ? 'var(--color-info)' : 'var(--color-text-muted)' }}>
              Auto-scroll: {autoScroll ? 'On' : 'Off'}
            </span>
            <span style={{ color: isStreaming ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              <span className={`status-dot ${isStreaming ? 'status-dot-success status-dot-pulse' : 'status-dot-warning'}`} />
              {isStreaming ? ' Streaming' : ' Paused'}
            </span>
          </div>
        </div>
      </Card>

      {/* Log Inspection Modal */}
      {selectedLog && <LogInspector log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
