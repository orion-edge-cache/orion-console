/**
 * Kinesis record processing
 */

import { insertLog, insertLogWithMetrics } from "../../db/index.js";
import { broadcastLog, recordRequest } from "../sse/index.js";
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
    const logEntry = formatKinesisRecord(record);

    // Only count request completion logs for metrics (those with response_state)
    // VCL debug logs are stored but not counted as requests
    if (record.service === "cdn" && record.subroutine === "deliver") {
      // Request completion log - store with metrics
      insertLogWithMetrics(logEntry);

      // Also update real-time SSE metrics
      recordRequest({
        ...{ cache_status: logEntry.fastly_cache_state },
        ...{ status_code: logEntry.resp_status },
        ...{ latency_ms: logEntry.latency_ms },
      });
    } else {
      // VCL debug log - store without metrics
      insertLog(logEntry);
    }

    // Broadcast to SSE subscribers
    broadcastLog(logEntry);
  } catch {
    incrementErrors();
    // Invalid JSON, skip
  }
}

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
