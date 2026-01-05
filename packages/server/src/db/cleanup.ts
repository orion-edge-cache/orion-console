/**
 * Database Cleanup
 *
 * Retention policy and cleanup logic for old data.
 */

import { db } from './schema.js';

/**
 * Clean up old data based on retention policy
 * - Logs: 24 hours
 * - 1s metrics: 1 hour
 * - 1m metrics: 7 days
 * - Events: 30 days
 */
export function cleanup(): void {
  const now = Date.now();
  const nowSeconds = Math.floor(now / 1000);

  // Logs: keep 24 hours
  db.prepare('DELETE FROM logs WHERE timestamp < ?').run(now - 24 * 60 * 60 * 1000);

  // 1s metrics: keep 1 hour
  db.prepare('DELETE FROM metrics_1s WHERE bucket < ?').run(nowSeconds - 3600);

  // 1m metrics: keep 7 days (TODO: implement rollup from 1s to 1m)
  db.prepare('DELETE FROM metrics_1m WHERE bucket < ?').run(Math.floor(nowSeconds / 60) - 7 * 24 * 60);

  // Events: keep 30 days
  db.prepare('DELETE FROM events WHERE timestamp < ?').run(now - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Start periodic cleanup (every 5 minutes)
 */
export function startCleanupScheduler(): void {
  setInterval(cleanup, 5 * 60 * 1000);
}

// Auto-start cleanup scheduler
startCleanupScheduler();
