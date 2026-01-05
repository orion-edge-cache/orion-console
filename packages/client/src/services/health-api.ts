/**
 * Health Check API
 * 
 * Provides methods for checking backend health and services status.
 */

import type { HealthResponse } from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Health Check API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check backend health and services status
 */
export async function checkHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      return {
        grafana: false,
        grafanaUrl: "http://localhost:3000",
        error: "Backend unreachable",
      };
    }

    return response.json();
  } catch (error) {
    return {
      grafana: false,
      grafanaUrl: "http://localhost:3000",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
