/**
 * Kinesis record processing
 */

import { insertLog, insertLogWithMetrics } from "../../db/index.js";
import { broadcastLog, recordRequest } from "../../sse/index.js";
import { parseKinesisRecord } from "../parser.js";
import {
  incrementRecordsProcessed,
  incrementErrors,
  updateLastRecordTime,
} from "./state.js";

/**
 * Process a single Kinesis record
 */
export function processRecord(data: Uint8Array | undefined): void {
  if (!data) return;

  try {
    const text = Buffer.from(data).toString("utf-8");
    const record = JSON.parse(text);

    incrementRecordsProcessed();
    updateLastRecordTime(Date.now());

    // Convert Kinesis record to LogEntry
    // const logEntry = parseKinesisRecord(record);
    const logEntry = record;

    // Only count request completion logs for metrics (those with response_state)
    // VCL debug logs are stored but not counted as requests
    if (record.service === "cdn" && record.subroutine === "deliver") {
      // Request completion log - store with metrics
      insertLogWithMetrics(logEntry);

      // Also update real-time SSE metrics
      recordRequest({
        ...(logEntry.cache_status !== undefined && {
          cache_status: logEntry.cache_status,
        }),
        ...(logEntry.status_code !== undefined && {
          status_code: logEntry.status_code,
        }),
        ...(logEntry.latency_ms !== undefined && {
          latency_ms: logEntry.latency_ms,
        }),
      });
    } else {
      // VCL debug log - store without metrics
      insertLog(logEntry);
    }

    // Broadcast to SSE subscribers
    broadcastLogEntry(logEntry);
  } catch {
    incrementErrors();
    // Invalid JSON, skip
  }
}

/**
 * Broadcast log entry to SSE subscribers
 */
function broadcastLogEntry(
  logEntry: ReturnType<typeof parseKinesisRecord>,
): void {
  broadcastLog({
    timestamp: logEntry.timestamp,
    level: logEntry.level,
    source: logEntry.source,
    ...(logEntry.message !== undefined && { message: logEntry.message }),
    ...(logEntry.request_method !== undefined && {
      request_method: logEntry.request_method,
    }),
    ...(logEntry.url !== undefined && { url: logEntry.url }),
    ...(logEntry.status_code !== undefined && {
      status_code: logEntry.status_code,
    }),
    ...(logEntry.cache_status !== undefined && {
      cache_status: logEntry.cache_status,
    }),
    ...(logEntry.latency_ms !== undefined && {
      latency_ms: logEntry.latency_ms,
    }),
    ...(logEntry.operation_type !== undefined && {
      operation_type: logEntry.operation_type,
    }),
    ...(logEntry.operation_name !== undefined && {
      operation_name: logEntry.operation_name,
    }),
    // VCL-specific fields
    ...(logEntry.vcl_subroutine !== undefined && {
      vcl_subroutine: logEntry.vcl_subroutine,
    }),
    ...(logEntry.vcl_title !== undefined && { vcl_title: logEntry.vcl_title }),
    ...(logEntry.vcl_step !== undefined && { vcl_step: logEntry.vcl_step }),
    ...(logEntry.vcl_version !== undefined && {
      vcl_version: logEntry.vcl_version,
    }),
    ...(logEntry.vcl_host !== undefined && { vcl_host: logEntry.vcl_host }),
    ...(logEntry.vcl_path !== undefined && { vcl_path: logEntry.vcl_path }),
    ...(logEntry.vcl_body !== undefined && { vcl_body: logEntry.vcl_body }),
    ...(logEntry.vcl_graphql_query !== undefined && {
      vcl_graphql_query: logEntry.vcl_graphql_query,
    }),
    ...(logEntry.vcl_restarts !== undefined && {
      vcl_restarts: logEntry.vcl_restarts,
    }),
    ...(logEntry.vcl_backend !== undefined && {
      vcl_backend: logEntry.vcl_backend,
    }),
    ...(logEntry.vcl_cacheable !== undefined && {
      vcl_cacheable: logEntry.vcl_cacheable,
    }),
    // Structured debug data
    ...(logEntry.data !== undefined && { data: logEntry.data }),
  });
}
