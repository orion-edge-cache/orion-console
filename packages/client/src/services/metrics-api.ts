/**
 * Metrics API (Fallback)
 * 
 * Note: Prefer useMetricsStream hook for real-time metrics via SSE
 */

import type { MetricsResponse } from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Metrics API (Fallback)
// Note: Prefer useMetricsStream hook for real-time metrics via SSE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch metrics snapshot from SQLite (use SSE for real-time)
 */
export async function getMetrics(): Promise<MetricsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/metrics`);

    if (!response.ok) {
      return {
        hitRate: null,
        requestsPerSec: null,
        avgLatency: null,
        totalRequests: null,
      };
    }

    return response.json();
  } catch {
    return {
      hitRate: null,
      requestsPerSec: null,
      avgLatency: null,
      totalRequests: null,
    };
  }
}
