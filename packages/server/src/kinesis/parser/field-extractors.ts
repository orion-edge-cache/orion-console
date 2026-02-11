/**
 * Field extraction utilities for Kinesis record parsing
 */

import type { LogEntry } from "../../types/log-entry.js";
import type { RawKinesisRecord } from "../types.js";

/**
 * Parse timestamp from various formats
 */
export function parseTimestamp(record: RawKinesisRecord): number {
  const raw = record.timestamp || record.Timestamp;
  if (raw) {
    const parsed = new Date(raw).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

/**
 * Detect log source based on record content
 */
export function detectSource(record: RawKinesisRecord): LogEntry["source"] {
  if (record.service === "Compute") {
    return "compute";
  }
  if (record.service === "CDN" || record.Subroutine || record.response_state) {
    return "cdn";
  }
  return "system";
}

/**
 * Extract cache status from record
 */
export function extractCacheStatus(
  record: RawKinesisRecord,
): string | undefined {
  if (record.response_state) {
    return record.response_state.toUpperCase();
  }
  if (record.Subroutine) {
    const sub = record.Subroutine.toLowerCase();
    if (sub.includes("vcl_recv")) return "RECV";
    if (sub.includes("vcl_hit")) return "HIT";
    if (sub.includes("vcl_miss")) return "MISS";
    if (sub.includes("vcl_pass")) return "PASS";
    if (sub.includes("vcl_hash")) return "HASH";
    if (sub.includes("vcl_fetch")) return "FETCH";
    if (sub.includes("vcl_deliver")) return "DELIVER";
  }
  return undefined;
}

/**
 * Extract status code from record
 */
export function extractStatusCode(
  record: RawKinesisRecord,
): number | undefined {
  const raw = record.response_status ?? record.Status;
  if (raw !== undefined) {
    const parsed = typeof raw === "number" ? raw : parseInt(String(raw), 10);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Determine log level based on status codes and log type
 */
export function determineLevel(
  record: RawKinesisRecord,
  statusCode: number | undefined,
  cacheStatus: string | undefined,
): LogEntry["level"] {
  // 1. Respect explicit level from VCL or Compute (highest priority)
  if (
    record.level &&
    ["info", "warn", "error", "debug"].includes(record.level)
  ) {
    return record.level as LogEntry["level"];
  }

  // 2. Status code based levels
  if (statusCode && statusCode >= 500) return "error";
  if (statusCode && statusCode >= 400) return "warn";

  // 3. Compute event-based levels (when event implies a level)
  if (record.event === "error") return "error";
  if (record.event === "debug") return "debug";

  // 4. VCL debug logs (has Subroutine but no cache status = debug step)
  if (record.Subroutine && !cacheStatus) return "debug";

  // 5. Default to info for everything else
  return "info";
}

/**
 * Extract latency in milliseconds
 */
export function extractLatency(record: RawKinesisRecord): number | undefined {
  if (record.time_elapsed) {
    const elapsed =
      typeof record.time_elapsed === "string"
        ? parseInt(record.time_elapsed, 10)
        : record.time_elapsed;
    return elapsed / 1000; // microseconds to milliseconds
  }
  if (record.duration_ms) {
    return record.duration_ms;
  }
  return undefined;
}
