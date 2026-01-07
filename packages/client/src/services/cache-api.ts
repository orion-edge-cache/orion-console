/**
 * Cache API
 *
 * Provides methods for cache management operations.
 */

import { API_BASE_URL } from "../utils";

export interface PurgeCacheResponse {
  success: boolean;
  message: string;
  status?: string;
  error?: string;
}

/**
 * Purge all CDN cache
 */
export async function purgeCache(): Promise<PurgeCacheResponse> {
  const response = await fetch(`${API_BASE_URL}/cache/purge`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to purge cache");
  }

  return data;
}
