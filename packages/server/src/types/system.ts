/**
 * System State Types
 *
 * Types for system state machine and operations.
 */

export type SystemState =
  | 'IDLE'
  | 'CHECKING'
  | 'DEPLOYING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'DESTROYING'
  | 'BACKEND_DOWN';

export type OperationType = 'deploy' | 'destroy' | 'repair' | null;

export interface SystemStatus {
  state: SystemState;
  currentOperation: OperationType;
  version: string;
  backendUrl?: string;
  lastCheck: string;
  services?: {
    cdn?: string;
    compute?: string;
    kinesis?: string;
    s3?: string;
  };
}

export interface DeploymentEvent {
  timestamp: string;
  type: 'stdout' | 'stderr' | 'error' | 'end';
  message: string;
}

export interface SystemEvent {
  id?: number;
  timestamp: number;
  type: 'deploy' | 'destroy' | 'error' | 'config_change';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface MetricsBucket {
  bucket: number;
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  cache_passes: number;
  errors_4xx: number;
  errors_5xx: number;
  sum_latency_ms: number;
  min_latency_ms: number | null;
  max_latency_ms: number | null;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
}
