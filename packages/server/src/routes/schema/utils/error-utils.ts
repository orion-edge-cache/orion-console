/**
 * Error handling utilities for schema routes
 */

import type { Response } from 'express';

/**
 * Format and send error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  message?: string
): void {
  res.status(statusCode).json({
    error,
    ...(message && { message }),
  });
}

/**
 * Handle caught errors uniformly
 */
export function handleCaughtError(
  res: Response,
  error: unknown,
  context: string
): void {
  console.error(`${context}:`, error);
  res.status(500).json({
    error: `Failed to ${context.toLowerCase().replace(' error', '')}`,
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}
