/**
 * Kinesis Record Parser
 *
 * Functions for parsing raw Kinesis records into LogEntry format.
 * Handles VCL debug logs, request completion logs, and Compute service logs.
 */

import type { LogEntry, RawKinesisRecord } from "./types.js";
// Import from submodules
import { buildMessage } from "./parser/message-builder.js";

/**
 * Parse a Kinesis record into a LogEntry
 *
 * Handles three log formats:
 * 1. Request completion logs: response_state (HIT/MISS/PASS), response_status, time_elapsed
 * 2. VCL debug logs: Subroutine (vcl_recv, vcl_hit, etc.), Title, and other VCL fields
 * 3. Compute service logs: event, operationType, operationName
 */
export function formatKinesisRecord(record: RawKinesisRecord): LogEntry {
  const result: LogEntry = {};
  const commonProps = ["request_id", "source", "timestamp", "level"];
  commonProps.forEach((prop) => {
    if (record[prop] === undefined)
      throw new Error(
        `formatKinesisRecord: record does not have ${prop} property`,
      );
    result[prop] = record[prop];
    delete record[prop];
  });
  if (record.source === "cdn" && record.subroutine === "deliver") {
    result.latency_ms = extractLatency(record);
  }
  result.data = record;
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

export function extractLatency(record: RawKinesisRecord): number {
  const elapsed =
    typeof record.time_elapsed === "string"
      ? parseInt(record.time_elapsed, 10)
      : record.time_elapsed;
  return elapsed / 1000; // microseconds to milliseconds
}
