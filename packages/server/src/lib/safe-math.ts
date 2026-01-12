/**
 * Safe Math Utilities
 *
 * Math operations with built-in safety for division by zero and edge cases.
 * Commonly used in metrics calculations.
 */

/**
 * Safe division that returns 0 instead of NaN/Infinity when dividing by zero
 *
 * @param numerator - The numerator
 * @param denominator - The denominator
 * @param fallback - Value to return if division is invalid (default: 0)
 * @returns Result of division or fallback value
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  fallback = 0
): number {
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Calculate percentage safely
 *
 * @param part - The part value
 * @param total - The total value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Percentage value (0-100) or 0 if invalid
 */
export function safePercentage(
  part: number,
  total: number,
  decimals = 2
): number {
  const result = safeDivide(part, total, 0) * 100;
  return Number(result.toFixed(decimals));
}

/**
 * Calculate rate (e.g., hit rate = hits / (hits + misses))
 *
 * @param numerator - The numerator (e.g., hits)
 * @param denominator - The denominator (e.g., hits + misses)
 * @returns Rate value (0-1) or 0 if invalid
 */
export function safeRate(numerator: number, denominator: number): number {
  return safeDivide(numerator, denominator, 0);
}

/**
 * Calculate average safely
 *
 * @param sum - Total sum
 * @param count - Number of items
 * @returns Average or 0 if count is 0
 */
export function safeAverage(sum: number, count: number): number {
  return safeDivide(sum, count, 0);
}

/**
 * Clamp a value between min and max
 *
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to a specific number of decimal places
 *
 * @param value - The value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate hit rate from hits and misses
 * Rate = hits / (hits + misses)
 *
 * @param hits - Number of cache hits
 * @param misses - Number of cache misses
 * @returns Hit rate (0-1) or 0 if no cacheable requests
 */
export function calculateHitRate(hits: number, misses: number): number {
  return safeRate(hits, hits + misses);
}

/**
 * Calculate requests per second from request count and duration
 *
 * @param requests - Total number of requests
 * @param durationSeconds - Duration in seconds
 * @returns Requests per second
 */
export function calculateRequestsPerSecond(
  requests: number,
  durationSeconds: number
): number {
  return safeDivide(requests, Math.max(durationSeconds, 1), 0);
}
