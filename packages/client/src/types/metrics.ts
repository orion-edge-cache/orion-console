/**
 * Metrics types
 */

export interface MetricsResponse {
  hitRate: number | null;
  requestsPerSec: number | null;
  avgLatency: number | null;
  totalRequests: number | null;
}