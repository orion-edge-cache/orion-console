/**
 * Kinesis record processing
 */

import { insertLog, insertLogWithMetrics } from "../db/index.js";
import { broadcastLog, recordRequest } from "../sse/index.js";
import {
  incrementRecordsProcessed,
  incrementErrors,
  updateLastRecordTime,
} from "./state.js";
import type {
  RawKinesisRecord,
  LogEntry,
  CDNSummaryLog,
  ComputeLog,
  CDNLog,
  CDNSubroutineLog,
} from "./types.js";

/**
 * Process a single Kinesis record
 */
export function processRecord(data: Uint8Array | undefined): void {
  if (!data) return;

  try {
    const text = Buffer.from(data).toString("utf-8");
    const record = JSON.parse(text);
    console.log(record);

    incrementRecordsProcessed();
    updateLastRecordTime(Date.now());

    // Convert Kinesis record to LogEntry
    // const logEntry = parseKinesisRecord(record);
    const logEntry = formatKinesisRecord(record);

    // Only count request completion logs for metrics (those with response_state)
    // VCL debug logs are stored but not counted as requests
    if (isCDNSummaryLog(record)) {
      // Request completion log - store with metrics
      insertLogWithMetrics(record);

      // Also update real-time SSE metrics
      recordRequest({
        cache_status: record.fastly_cache_state,
        status_code: record.resp_status,
        latency_ms: record.latency_ms,
      });
    } else {
      // VCL debug log - store without metrics
      insertLog(record);
    }

    // Broadcast to SSE subscribers
    broadcastLog(logEntry);
  } catch {
    incrementErrors();
    // Invalid JSON, skip
  }
}

export function formatKinesisRecord(record: RawKinesisRecord): LogEntry {
  // Validate required properties
  if (record.request_id === undefined)
    throw new Error(
      "formatKinesisRecord: record does not have request_id property",
    );
  if (record.source === undefined)
    throw new Error(
      "formatKinesisRecord: record does not have source property",
    );
  if (record.timestamp === undefined)
    throw new Error(
      "formatKinesisRecord: record does not have timestamp property",
    );
  if (record.level === undefined)
    throw new Error("formatKinesisRecord: record does not have level property");

  const result: LogEntry = {
    request_id: record.request_id,
    source: record.source,
    timestamp: parseTimestamp(record),
    level: record.level,
  };

  if (isCDNSummaryLog(record)) {
    addLatency(record);
    addOperationType(record);
    result.latency_ms = record.latency_ms;
  }

  result.data = { ...record };
  result.rawJson = JSON.stringify(record);

  console.log(result);

  return result;
}

export function parseTimestamp(record: RawKinesisRecord): number {
  const raw = record.timestamp;
  if (raw) {
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

export function addLatency(record: CDNSummaryLog): void {
  const elapsed =
    typeof record.time_elapsed === "string"
      ? parseInt(record.time_elapsed, 10)
      : record.time_elapsed;
  record.latency_ms = elapsed / 1000;
}

export function addOperationType(record: CDNSummaryLog): void {
  if (record.req_x_graphql_query) {
    record.operation_type = isMutation(record.req_x_graphql_query)
      ? "mutation"
      : "query";
  }
}

export function isMutation(query: string): boolean {
  const trimmed = query.trim();
  return (
    trimmed.startsWith("mutation") ||
    (trimmed.startsWith("{") === false && /^\s*mutation\s/i.test(trimmed))
  );
}

function isCDNLog(record: RawKinesisRecord): record is CDNLog {
  return record.source === "cdn";
}

const isCDNSummaryLog = (record: RawKinesisRecord): record is CDNSummaryLog => {
  return isCDNLog(record) && record.subroutine === "deliver";
};

const isCDNSubroutineLog = (
  record: RawKinesisRecord,
): record is CDNSubroutineLog => {
  return isCDNLog(record) && record.subroutine !== "deliver";
};

const isComputeLog = (record: RawKinesisRecord): record is ComputeLog => {
  return record.source === "compute";
};
