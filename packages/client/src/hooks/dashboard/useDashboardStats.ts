import { useMemo } from "react";

interface MetricDataPoint {
  time: number;
  requests: number;
  hits: number;
  misses: number;
  avgLatency: number;
}

interface DashboardStats {
  cacheHitRate: number | null;
  requestsPerMin: number;
  avgLatency: number | null;
}

/**
 * Calculate dashboard statistics from the last 60 seconds of metric data points
 */
export function useDashboardStats(dataPoints: MetricDataPoint[]): DashboardStats {
  return useMemo(() => {
    const now = Date.now();
    const recentPoints = dataPoints.filter((p) => now - p.time < 60000);

    if (recentPoints.length === 0) {
      return { cacheHitRate: null, requestsPerMin: 0, avgLatency: null };
    }

    const recentRequests = recentPoints.reduce((sum, p) => sum + p.requests, 0);
    const recentHits = recentPoints.reduce((sum, p) => sum + p.hits, 0);
    const recentMisses = recentPoints.reduce((sum, p) => sum + p.misses, 0);
    const recentLatency = recentPoints.reduce(
      (sum, p) => sum + p.avgLatency * p.requests,
      0
    );

    const cacheHitRate =
      recentHits + recentMisses > 0
        ? recentHits / (recentHits + recentMisses)
        : null;

    return {
      cacheHitRate,
      requestsPerMin: recentRequests,
      avgLatency: recentRequests > 0 ? recentLatency / recentRequests : null,
    };
  }, [dataPoints]);
}
