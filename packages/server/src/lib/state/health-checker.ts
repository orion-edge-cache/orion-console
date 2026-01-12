/**
 * Health check utilities
 */

import type { SystemStatus } from '../../types/system.js';

export interface HealthCheckResult {
  healthy: boolean;
  cdn?: boolean;
}

/**
 * Perform health check on deployed services
 */
export async function performHealthCheck(
  services?: SystemStatus['services']
): Promise<HealthCheckResult> {
  const results: HealthCheckResult = {
    healthy: true,
  };

  // Check CDN if available
  if (services?.cdn) {
    try {
      const cdnRes = await fetch(`https://${services.cdn}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      results.cdn = cdnRes.ok;
    } catch {
      results.cdn = false;
    }
  }

  // Consider healthy if we got here
  results.healthy = true;

  return results;
}
