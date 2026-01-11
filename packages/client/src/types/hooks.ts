/**
 * Types related to hooks and SSE streaming
 */

export type Channel = "logs" | "metrics" | "events" | "all";

export interface DataPoint {
  time: number;
  requests: number;
  hits: number;
  misses: number;
  passes: number;
  errors4xx: number;
  errors5xx: number;
  hitRate: number;
  avgLatency: number;
  hitAvgLatency: number;
  missAvgLatency: number;
}

export interface MetricsUpdate {
  hitRate: number;
  requestsPerSecond: number;
  avgLatency: number;
  hitAvgLatency: number;
  missAvgLatency: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SystemEvent {
  timestamp: number;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}