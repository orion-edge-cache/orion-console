/**
 * Config API
 * 
 * Provides type-safe methods for configuration management.
 */

import type {
  OrionConfig,
  ConfigResponse,
  SaveConfigResponse,
} from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Config API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if config exists and fetch it
 */
export async function getConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config`);

  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save config to $HOME/.config/orion/config.json (with orion.config.ts backup)
 */
export async function saveConfig(
  config: OrionConfig,
): Promise<SaveConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to save config");
  }

  return data;
}

export interface ResetConfigResponse extends SaveConfigResponse {
  config: OrionConfig;
}

/**
 * Reset config to default values
 */
export async function resetConfig(): Promise<ResetConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/config/reset`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to reset configuration");
  }

  return data;
}
