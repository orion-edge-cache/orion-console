/**
 * Database Module Index
 *
 * Re-exports all database operations and the db instance.
 */

// Export db instance and schema
export { db, DB_PATH, ORION_CONFIG_DIR } from "./schema.js";

// Export log operations
export { insertLog, getLogs } from "./logs.js";

// Export metrics operations
export {
  updateMetricsBucket,
  getMetrics1s,
  getAggregatedMetrics,
  getTimeSeries,
} from "./metrics.js";
export type { MetricsBucket } from "./metrics.js";

// Export event operations
export { insertEvent, getEvents } from "./events.js";
export type { SystemEvent } from "./events.js";

// Export cleanup (also auto-starts scheduler on import)
export { cleanup, startCleanupScheduler } from "./cleanup.js";

// ═══════════════════════════════════════════════════════════════════════
// Clear Analytics
// ═══════════════════════════════════════════════════════════════════════

/**
 * Clear all analytics data (logs and metrics)
 */
export function clearAnalytics(): void {
  db.exec(`
    DELETE FROM logs;
    DELETE FROM metrics_1s;
    DELETE FROM metrics_1m;
  `);
}

// Default export is the db instance
import { db } from "./schema.js";
export default db;
