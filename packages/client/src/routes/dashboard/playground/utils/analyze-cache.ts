/**
 * Cache analysis utility
 */

import type { CacheAnalysis } from '../types';

/**
 * Analyze cache headers and provide insights
 */
export function analyzeCache(headers: Record<string, string>): CacheAnalysis {
  const warnings: string[] = [];

  // Check X-Cache header
  const xCache = headers['x-cache'] || headers['X-Cache'] || '';
  const isHit = xCache.toLowerCase().includes('hit');

  // Parse Cache-Control
  const cacheControl = headers['cache-control'] || headers['Cache-Control'] || '';
  let ttl: number | null = null;

  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  if (maxAgeMatch) {
    ttl = parseInt(maxAgeMatch[1], 10);
  }

  // Parse Age header
  const ageHeader = headers['age'] || headers['Age'];
  const age = ageHeader ? parseInt(ageHeader, 10) : null;

  // Check for cache-busting scenarios
  if (cacheControl.includes('private')) {
    warnings.push('Origin sent "private" cache directive - response cannot be cached');
  }

  if (cacheControl.includes('no-cache')) {
    warnings.push('Origin sent "no-cache" directive - requires revalidation');
  }

  if (cacheControl.includes('no-store')) {
    warnings.push('Origin sent "no-store" directive - response will not be cached');
  }

  // Check for Vary header issues
  const vary = headers['vary'] || headers['Vary'] || '';
  if (vary.includes('Authorization')) {
    warnings.push('Vary includes Authorization - may cause excessive cache fragmentation');
  }

  // Check for Surrogate-Control
  const surrogateControl = headers['surrogate-control'] || headers['Surrogate-Control'];
  if (surrogateControl) {
    const surrogateMaxAge = surrogateControl.match(/max-age=(\d+)/);
    if (surrogateMaxAge) {
      ttl = parseInt(surrogateMaxAge[1], 10);
    }
  }

  // MISS analysis
  if (!isHit && !warnings.length) {
    warnings.push('Cache MISS - this could be due to first request or cache expiration');
  }

  return {
    isHit,
    ttl,
    age,
    warnings,
  };
}
