/**
 * Cache Status Utilities
 *
 * Shared utilities for parsing and classifying cache status values.
 * Handles variants like HIT-CLUSTER, MISS-CLUSTER, etc.
 */

export type CacheStatusType = 'HIT' | 'MISS' | 'PASS' | 'SYNTH' | 'UNKNOWN';

export interface CacheStatusClassification {
  type: CacheStatusType;
  isHit: boolean;
  isMiss: boolean;
  isPass: boolean;
  isCacheable: boolean;
  raw: string;
}

/**
 * Classify a cache status string into its type and boolean flags
 *
 * @param status - Raw cache status string (e.g., "HIT-CLUSTER", "MISS", "PASS")
 * @returns Classification object with type and boolean flags
 */
export function classifyCacheStatus(status: string | undefined | null): CacheStatusClassification {
  const normalized = (status || '').toUpperCase();

  const isHit = normalized.startsWith('HIT');
  const isMiss = normalized.startsWith('MISS');
  const isPass = normalized.startsWith('PASS') || normalized === 'SYNTH';

  let type: CacheStatusType = 'UNKNOWN';
  if (isHit) type = 'HIT';
  else if (isMiss) type = 'MISS';
  else if (normalized === 'SYNTH') type = 'SYNTH';
  else if (normalized.startsWith('PASS')) type = 'PASS';

  return {
    type,
    isHit,
    isMiss,
    isPass,
    isCacheable: isHit || isMiss, // HIT and MISS indicate cacheable responses
    raw: status || '',
  };
}

/**
 * Get the base cache status without cluster suffix
 *
 * @param status - Raw cache status string (e.g., "HIT-CLUSTER")
 * @returns Base status (e.g., "HIT")
 */
export function getBaseCacheStatus(status: string | undefined | null): string {
  if (!status) return '';
  return status.split('-')[0].toUpperCase();
}

/**
 * Check if a cache status indicates a successful cache hit
 */
export function isCacheHit(status: string | undefined | null): boolean {
  return classifyCacheStatus(status).isHit;
}

/**
 * Check if a cache status indicates a cache miss
 */
export function isCacheMiss(status: string | undefined | null): boolean {
  return classifyCacheStatus(status).isMiss;
}

/**
 * Check if a cache status indicates a pass-through (non-cacheable)
 */
export function isCachePass(status: string | undefined | null): boolean {
  return classifyCacheStatus(status).isPass;
}
