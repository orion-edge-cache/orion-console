/**
 * Metrics Context
 *
 * Provides shared SSE stream for METRICS ONLY across all routes.
 * Logs are handled separately by the Logs page (lazy collection).
 */

import { createContext, useContext, ReactNode } from 'react';
import { useSSEStream } from '../hooks/useSSEStream';
import type { MetricsUpdate, DataPoint, SystemEvent } from '@orion-console/shared';

interface MetricsContextValue {
  metrics: MetricsUpdate | null;
  dataPoints: DataPoint[];
  events: SystemEvent[];
  isConnected: boolean;
  error: Error | null;
  clearDataPoints: () => void;
}

const MetricsContext = createContext<MetricsContextValue | null>(null);

export function MetricsProvider({ children }: { children: ReactNode }) {
  const stream = useSSEStream({
    channels: ['metrics', 'events'], // Only metrics and events - NOT logs
    maxDataPoints: 300,
    enabled: true,
    loadHistorical: true,
  });

  // Extract only the metrics-related values
  const value: MetricsContextValue = {
    metrics: stream.metrics,
    dataPoints: stream.dataPoints,
    events: stream.events,
    isConnected: stream.isConnected,
    error: stream.error,
    clearDataPoints: stream.clearDataPoints,
  };

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}

// Convenience hook for metrics
export function useSharedMetricsStream() {
  const { metrics, dataPoints, isConnected, error, clearDataPoints } = useMetrics();
  return { metrics, dataPoints, isConnected, error, clearDataPoints };
}
