/**
 * Infrastructure API
 * 
 * Provides methods for checking infrastructure deployment status.
 */

import type { InfrastructureStatusResponse } from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Infrastructure API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check infrastructure deployment status
 */
export async function getInfrastructureStatus(): Promise<InfrastructureStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/infrastructure/status`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch infrastructure status: ${response.statusText}`,
    );
  }

  return response.json();
}
