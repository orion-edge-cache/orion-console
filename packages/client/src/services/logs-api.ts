/**
 * Logs API (Historical)
 * 
 * Note: Use useLogStream hook for real-time logs via SSE
 */

import type { LogEntry } from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Logs API (Historical)
// Note: Use useLogStream hook for real-time logs via SSE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Fetch historical logs from SQLite
 */
export async function getLogs(
  since?: number,
  limit?: number,
): Promise<LogEntry[]> {
  const params = new URLSearchParams();
  if (since) params.set("since", since.toString());
  if (limit) params.set("limit", limit.toString());

  const response = await fetch(`${API_BASE_URL}/logs?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch logs");
  }

  return response.json();
}
