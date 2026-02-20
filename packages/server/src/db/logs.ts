/**
 * Log Database Operations
 *
 * Functions for inserting and querying log entries.
 */

import { db } from "./schema.js";
import { updateMetricsBucket } from "./metrics.js";
import type { FastlyLogEntry, CdnLogDeliverData } from "@orion/infra";
import type { MetricParams } from "../types/index.js";
import { convertLatencyToMs, isDeliverLog } from "../kinesis/utils.js";

const insertLogStmt = db.prepare(`
  INSERT INTO logs (
    request_id, timestamp, level, source, event, message, data
  ) VALUES (
    @request_id, @timestamp, @level, @source, @event, @message, @data
  )
`);

/**
 * Convert a FastlyLogEntry to LogInsertParams for database insertion
 */
export function makeMetricParams(log: FastlyLogEntry): MetricParams {
  const data = log.data as CdnLogDeliverData;
  const latency_ms = convertLatencyToMs(log);
  return {
    timestamp: Date.parse(log.timestamp),
    level: log.level,
    source: log.source,
    event: log.event,
    message: log.message,
    request_method: data.req_method,
    url: data.req_url,
    status_code: data.resp_status,
    latency_ms,
    cache_status: data.fastly_cache_state,
    operation_type:
      data.req_x_operation_type === "null" ? null : data.req_x_operation_type,
    data: JSON.stringify(log),
  };
}

/**
 * Insert a log entry into the database
 */
export function insertLog(log: FastlyLogEntry): void {
  const params = { ...defaultParams(), ...log, data: JSON.stringify(log.data) };
  console.log(`INSERT LOGS: ${JSON.stringify(params)}`);
  insertLogStmt.run(params);
  if (isDeliverLog(log)) {
    console.log(`IS DELIVERY LOG: ${log.event.toLowerCase() === "deliver"}`);
    const metricParams: MetricParams = makeMetricParams(log);
    updateMetricsBucket(metricParams);
  }
  console.log(`AFTER IS DELIVERY LOG: ${log.event}`);
}

const getLogsStmt = db.prepare(`
  SELECT * FROM logs
  WHERE timestamp > @since
  ORDER BY timestamp DESC
  LIMIT @limit
`);

const defaultParams = () => {
  return {
    request_id: "abc123",
    timestamp: new Date().toISOString(),
    event: "debug",
    level: "info",
    message: "",
    data: {},
  };
};

/**
 * Get logs since a given timestamp
 */
export function getLogs(
  since: number = Date.now() - 3600000,
  limit: number = 1000,
): FastlyLogEntry[] {
  return getLogsStmt.all({ since, limit }) as FastlyLogEntry[];
}
