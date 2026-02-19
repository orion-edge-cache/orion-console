/**
 * Log Database Operations
 *
 * Functions for inserting and querying log entries.
 */

import { db } from "./schema.js";
import { updateMetricsBucket } from "./metrics.js";
import type { FastlyLogEntry } from "@orion/infra";

const insertLogStmt = db.prepare(`
  INSERT INTO logs (
    timestamp, level, source, request_method, url, status_code,
    latency_ms, cache_status, operation_type, raw_json
  ) VALUES (
    @timestamp, @level, @source, @request_method, @url, @status_code,
    @latency_ms, @cache_status, @operation_type, @raw_json
  )
`);

/**
 * Insert a log entry into the database
 */
export function insertLog(log: FastlyLogEntry): void {
  if (!isDeliverLog(log)) return;

  const dataa = log.data;
  insertLogStmt.run({
    timestamp: log.timestamp,
    level: log.level || "info",
    source: log.source || "backend",
    request_method: log.data.req_method || null,
    url: log.req_url || null,
    status_code: log.resp_status || null,
    latency_ms: log.latency_ms || null,
    cache_status: log.resp_status || null,
    operation_type: log.operation_type || null,
    raw_json: JSON.stringify(log),
  });
  // Note: Metrics are updated via recordRequest() in the Kinesis consumer
  // only for actual request completion logs (those with response_state)
}

/**
 * Insert log AND update metrics bucket (for request completion logs only)
 */
export function insertLogWithMetrics(log: CDNSummaryLog): void {
  insertLog(log);
  if (log.fastly_cache_state || log.resp_status) {
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
): FastlyLogEntry[] {
  return getLogsStmt.all({ since, limit }) as FastlyLogEntry[];
}

const isDeliverLog = (log: FastlyLogEntry) => {
  return log.event.toLowerCase() === "deliver";
};
