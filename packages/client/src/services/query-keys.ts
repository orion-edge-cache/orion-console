/**
 * React Query Helpers
 * 
 * Query keys for React Query caching and invalidation.
 */

// ═══════════════════════════════════════════════════════════════════════
// React Query Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Query keys for React Query
 */
export const queryKeys = {
  config: ["config"] as const,
  health: ["health"] as const,
  infrastructureStatus: ["infrastructure-status"] as const,
  credentials: ["credentials"] as const,
  observabilityStatus: ["observability-status"] as const,
  logs: ["logs"] as const,
};