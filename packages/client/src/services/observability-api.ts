/**
 * Observability API
 * 
 * Provides methods for managing observability systems (Kinesis consumer, SSE subscribers).
 */

import type { ObservabilityStatus } from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Observability API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get observability system status (Kinesis consumer, SSE subscribers)
 */
export async function getObservabilityStatus(): Promise<ObservabilityStatus> {
  const response = await fetch(`${API_BASE_URL}/observability/status`);

  if (!response.ok) {
    throw new Error("Failed to fetch observability status");
  }

  return response.json();
}

/**
 * Manually start the Kinesis consumer
 */
export async function startKinesisConsumer(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/observability/kinesis/start`, {
    method: "POST",
  });

  return response.json();
}

/**
 * Stop the Kinesis consumer
 */
export async function stopKinesisConsumer(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/observability/kinesis/stop`, {
    method: "POST",
  });

  return response.json();
}

/**
 * Clear all analytics data (logs and metrics)
 */
export async function clearAnalytics(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/observability/analytics/clear`, {
    method: "POST",
  });

  return response.json();
}
