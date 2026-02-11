/**
 * Log Database Operations
 *
 * Functions for inserting and querying log entries.
 */

import { db } from "./schema.js";
import { updateMetricsBucket } from "./metrics.js";
import type { CDNSummaryLog } from "../kinesis/types.js";

const insertLogStmt = db.prepare(`
  INSERT INTO logs (
    timestamp, level, source, request_method, url, status_code,
    latency_ms, cache_status, operation_type, operation_name, message, raw_json
  ) VALUES (
    @timestamp, @level, @source, @request_method, @url, @status_code,
    @latency_ms, @cache_status, @operation_type, @operation_name, @message, @raw_json
  )
`);

/**
 * Insert a log entry into the database
 */
export function insertLog(log: CDNSummaryLog): void {
  insertLogStmt.run({
    timestamp: log.timestamp,
    level: log.level || "info",
    service: log.service || "backend",
    method: log.req_method || null,
    url: log.req_url || null,
    status_code: log.resp_status || null,
    latency_ms: log.latency_ms || null,
    cache_status: log.cache_status || null,
    operation_type: log.operation_type || null,
    operation_name: log.operation_name || null,
    message: log.message || null,
    raw_json: log.raw_json || null,
  });
  // Note: Metrics are updated via recordRequest() in the Kinesis consumer
  // only for actual request completion logs (those with response_state)
}

/**
 * Insert log AND update metrics bucket (for request completion logs only)
 */
export function insertLogWithMetrics(log: LogEntry): void {
  insertLog(log);
  if (log.cache_status || log.status_code) {
    updateMetricsBucket(log);
  }
}

const getLogsStmt = db.prepare(`
  SELECT * FROM logs
  WHERE timestamp > @since
  ORDER BY timestamp DESC
  LIMIT @limit
`);

/**
 * Get logs since a given timestamp
 */
export function getLogs(
  since: number = Date.now() - 3600000,
  limit: number = 1000,
): LogEntry[] {
  return getLogsStmt.all({ since, limit }) as LogEntry[];
}
