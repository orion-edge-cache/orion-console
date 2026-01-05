/**
 * useSSEStream Hook
 *
 * Connects to the unified SSE stream and provides real-time data
 * for logs, metrics, and events.
 *
 * Loads historical data on mount, then streams real-time updates.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Channel, LogEntry, MetricsUpdate, DataPoint, SystemEvent } from "@orion-console/shared";

// ═══════════════════════════════════════════════════════════════════════
// SSE Stream Hook
// ═══════════════════════════════════════════════════════════════════════

interface UseSSEStreamOptions {
  channels?: Channel[];
  maxLogs?: number;
  maxDataPoints?: number;
  enabled?: boolean;
  loadHistorical?: boolean;
}

interface SSEStreamState {
  logs: LogEntry[];
  metrics: MetricsUpdate | null;
  dataPoints: DataPoint[];
  events: SystemEvent[];
  isConnected: boolean;
  error: Error | null;
}

const API_BASE = "http://localhost:3001/api";

export function useSSEStream(options: UseSSEStreamOptions = {}) {
  // Fallback default values for missing options properties
  const {
    channels = ["all"],
    maxLogs = 1000,
    maxDataPoints = 300, // 5 minutes of per-second data
    enabled = true,
    loadHistorical = true,
  } = options;

  // Memoize channels to prevent unnecessary reconnections
  const channelKey = useMemo(() => channels.sort().join(","), [channels]);

  const [state, setState] = useState<SSEStreamState>({
    logs: [],
    metrics: null,
    dataPoints: [],
    events: [],
    isConnected: false,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Load historical data on mount
  useEffect(() => {
    if (!loadHistorical || !enabled) return;

    const loadData = async () => {
      try {
        // Load historical logs (last 5 minutes)
        if (channelKey.includes("logs") || channelKey.includes("all")) {
          const since = Date.now() - 5 * 60 * 1000;
          const res = await fetch(
            `${API_BASE}/logs?since=${since}&limit=${maxLogs}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (mountedRef.current && Array.isArray(data.logs)) {
              setState((prev) => ({ ...prev, logs: data.logs }));
            }
          }
        }

        // Load historical metrics
        if (channelKey.includes("metrics") || channelKey.includes("all")) {
          const res = await fetch(`${API_BASE}/metrics`);
          if (res.ok) {
            const data = await res.json();
            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                metrics: {
                  hitRate: data.hitRate ?? 0,
                  requestsPerSecond: data.requestsPerSec ?? 0,
                  avgLatency: data.avgLatency ?? 0,
                  totalRequests: data.totalRequests ?? 0,
                  cacheHits: data.cacheHits ?? 0,
                  cacheMisses: data.cacheMisses ?? 0,
                },
              }));
            }
          }

          // Load timeseries data (last 5 minutes)
          const since = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
          const tsRes = await fetch(
            `${API_BASE}/metrics/timeseries?since=${since}`,
          );
          if (tsRes.ok) {
            const tsData = await tsRes.json();
            // Server returns { data: [...] } format
            const dataArray = Array.isArray(tsData) ? tsData : tsData.data;
            if (mountedRef.current && Array.isArray(dataArray)) {
              setState((prev) => ({
                ...prev,
                dataPoints: dataArray.slice(-maxDataPoints),
              }));
            }
          }
        }
      } catch (err) {
        console.error("[SSE] Failed to load historical data:", err);
      }
    };

    loadData();
  }, [channelKey, enabled, loadHistorical, maxLogs, maxDataPoints]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!enabled) return undefined;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/stream?channels=${channelKey}`;
    console.log("[SSE] Connecting to:", url);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", (event) => {
      console.log("[SSE] Connected:", event.data);
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      }
    });

    eventSource.addEventListener("log", (event) => {
      try {
        const log: LogEntry = JSON.parse(event.data);
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-(maxLogs - 1)), log],
          }));
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    eventSource.addEventListener("metrics", (event) => {
      try {
        const metrics: MetricsUpdate = JSON.parse(event.data);
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, metrics }));
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    eventSource.addEventListener("datapoint", (event) => {
      try {
        const point: DataPoint = JSON.parse(event.data);
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            dataPoints: [...prev.dataPoints.slice(-(maxDataPoints - 1)), point],
          }));
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    eventSource.addEventListener("event", (event) => {
      try {
        const sysEvent: SystemEvent = JSON.parse(event.data);
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            events: [...prev.events.slice(-99), sysEvent],
          }));
        }
      } catch {
        // Invalid JSON, skip
      }
    });

    eventSource.onerror = (err) => {
      console.error("[SSE] Connection error:", err);
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: new Error("SSE connection lost"),
        }));
      }

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (enabled && mountedRef.current) {
          console.log("[SSE] Attempting reconnect...");
          connect();
        }
      }, 3000);
    };

    return eventSource;
  }, [channelKey, enabled, maxLogs, maxDataPoints]);

  // Setup and cleanup
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      const es = connect();
      return () => {
        mountedRef.current = false;
        if (es) es.close();
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setState((prev) => ({ ...prev, isConnected: false }));
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, connect]);

  const clearLogs = useCallback(() => {
    setState((prev) => ({ ...prev, logs: [] }));
  }, []);

  const clearDataPoints = useCallback(() => {
    setState((prev) => ({ ...prev, dataPoints: [] }));
  }, []);

  return {
    ...state,
    clearLogs,
    clearDataPoints,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Simplified Hooks for Specific Use Cases
// ═══════════════════════════════════════════════════════════════════════

/**
 * Hook for just logs streaming
 */
export function useLogStream(
  options: { maxLogs?: number; enabled?: boolean } = {},
) {
  const { maxLogs = 1000, enabled = true } = options;
  const { logs, isConnected, error, clearLogs } = useSSEStream({
    channels: ["logs"],
    maxLogs,
    enabled,
  });
  return { logs, isConnected, error, clearLogs };
}

/**
 * Hook for just metrics streaming
 */
export function useMetricsStream(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const { metrics, dataPoints, isConnected, error, clearDataPoints } =
    useSSEStream({
      channels: ["metrics"],
      enabled,
    });
  return { metrics, dataPoints, isConnected, error, clearDataPoints };
}
