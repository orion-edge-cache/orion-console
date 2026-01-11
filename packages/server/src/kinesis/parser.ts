/**
 * Kinesis Record Parser
 *
 * Functions for parsing raw Kinesis records into LogEntry format.
 * Handles VCL debug logs, request completion logs, and Compute service logs.
 */

import type { LogEntry } from "../types/log-entry.js";
import type { RawKinesisRecord } from "./types.js";

// ═══════════════════════════════════════════════════════════════════════
// Parsing Helper Functions
// ═══════════════════════════════════════════════════════════════════════

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
  if (record.event || record.title?.includes("Compute")) {
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
    if (sub.includes("vcl_hit")) return "HIT";
    if (sub.includes("vcl_miss")) return "MISS";
    if (sub.includes("vcl_pass")) return "PASS";
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

/**
 * Extract VCL-specific fields from record
 */
export function extractVclFields(record: RawKinesisRecord) {
  const restarts = record.Restarts;
  const cacheable = record.Cacheable;

  return {
    vcl_subroutine: record.Subroutine?.replace(/==/g, "").trim() || undefined,
    vcl_title: record.Title,
    vcl_step: record.Step,
    vcl_version: record["CDN Version"],
    vcl_host: record.Host,
    vcl_path: record.Path || record.PATH,
    vcl_body: record.Body,
    vcl_graphql_query: record["X-GraphQL-Query"],
    vcl_restarts:
      restarts !== undefined
        ? typeof restarts === "number"
          ? restarts
          : parseInt(String(restarts), 10)
        : undefined,
    vcl_backend: record.Backend,
    vcl_cacheable:
      cacheable !== undefined
        ? typeof cacheable === "boolean"
          ? cacheable
          : cacheable === "true"
        : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Message Building Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build message for request completion logs
 */
export function buildRequestCompletionMessage(
  cacheStatus: string | undefined,
  method: string | undefined,
  url: string | undefined,
  statusCode: number | undefined,
  latencyMs: number | undefined,
): string {
  let message = `[${cacheStatus || "REQUEST"}] ${method || "GET"} ${url || "/graphql"} → ${statusCode || 200}`;
  if (latencyMs) message += ` (${latencyMs.toFixed(1)}ms)`;
  return message;
}

/**
 * Build message for VCL debug logs - includes all VCL fields
 */
export function buildVclDebugMessage(record: RawKinesisRecord): string {
  const subroutine = record.Subroutine?.replace(/==/g, "").trim() || "vcl";
  const lines: string[] = [`== ${subroutine} ==`];

  if (record.Title) lines.push(`  Title: "${record.Title}"`);
  if (record["CDN Version"])
    lines.push(`  CDN Version: "${record["CDN Version"]}"`);
  if (record.Step) lines.push(`  Step: "${record.Step}"`);
  if (record.Timestamp) lines.push(`  Timestamp: "${record.Timestamp}"`);
  if (record.Host) lines.push(`  Host: "${record.Host}"`);
  if (record["X-GraphQL-Query"])
    lines.push(`  X-GraphQL-Query: "${record["X-GraphQL-Query"]}"`);
  if (record.Path || record.PATH)
    lines.push(`  Path: "${record.Path || record.PATH}"`);
  if (record.Method) lines.push(`  Method: "${record.Method}"`);
  if (record.Body) lines.push(`  Body: "${record.Body}"`);
  if (record.Backend) lines.push(`  Backend: "${record.Backend}"`);
  if (record.Cacheable !== undefined)
    lines.push(`  Cacheable: "${record.Cacheable}"`);
  if (record.Status) lines.push(`  Status: "${record.Status}"`);
  if (record.Restarts !== undefined)
    lines.push(`  Restarts: "${record.Restarts}"`);

  return lines.join("\n");
}

/**
 * Build message for Compute service logs
 */
export function buildComputeMessage(record: RawKinesisRecord): string {
  // If message is provided directly, use it
  if (record.message) {
    return record.message;
  }

  const opName =
    record.operationName && record.operationName !== "anonymous"
      ? record.operationName
      : null;
  const opType = record.operationType || "query";

  switch (record.event) {
    case "request":
      return opName ? `[${opType}] ${opName}` : `[${opType}] anonymous`;
    case "cache": {
      const entities = record.entityCount || 0;
      return opName
        ? `[cache] ${opName} (${entities} entities)`
        : `[cache] anonymous query (${entities} entities)`;
    }
    case "purge": {
      const keys = record.keys?.length || 0;
      return opName
        ? `[purge] ${opName} (${keys} keys)`
        : `[purge] mutation (${keys} keys)`;
    }
    default:
      return record.title || `[${record.event}] ${opName || "operation"}`;
  }
}

/**
 * Build appropriate message based on record type
 */
export function buildMessage(
  record: RawKinesisRecord,
  cacheStatus: string | undefined,
  statusCode: number | undefined,
  latencyMs: number | undefined,
): string {
  // Request completion log (has response_state)
  if (record.response_state) {
    return buildRequestCompletionMessage(
      cacheStatus,
      record.request_method || record.Method,
      record.url || record.Path,
      statusCode,
      latencyMs,
    );
  }

  // VCL debug log (has Subroutine or Title)
  if (record.Subroutine || record.Title) {
    return buildVclDebugMessage(record);
  }

  // Compute service log (has event or title)
  if (record.event || record.title) {
    return buildComputeMessage(record);
  }

  // Fallback: truncated JSON
  return JSON.stringify(record).substring(0, 200);
}

// ═══════════════════════════════════════════════════════════════════════
// Main Parser
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse a Kinesis record into a LogEntry
 *
 * Handles three log formats:
 * 1. Request completion logs: response_state (HIT/MISS/PASS), response_status, time_elapsed
 * 2. VCL debug logs: Subroutine (vcl_recv, vcl_hit, etc.), Title, and other VCL fields
 * 3. Compute service logs: event, operationType, operationName
 */
export function parseKinesisRecord(record: RawKinesisRecord): LogEntry {
  const timestamp = parseTimestamp(record);
  const source = detectSource(record);
  const cacheStatus = extractCacheStatus(record);
  const statusCode = extractStatusCode(record);
  const latencyMs = extractLatency(record);
  const level = determineLevel(record, statusCode, cacheStatus);
  const vclFields = extractVclFields(record);
  const message = buildMessage(record, cacheStatus, statusCode, latencyMs);

  const requestMethod = record.request_method || record.Method;
  const url = record.url || record.Path || record.PATH;
  const operationType = record.operationType;
  const operationName =
    record.operationName && record.operationName !== "anonymous"
      ? record.operationName
      : undefined;

  // Build result with only defined optional properties (for exactOptionalPropertyTypes)
  const result: LogEntry = {
    timestamp,
    level,
    source,
    message,
    raw_json: JSON.stringify(record),
  };

  // Add optional fields only if defined
  if (requestMethod !== undefined) result.request_method = requestMethod;
  if (url !== undefined) result.url = url;
  if (statusCode !== undefined) result.status_code = statusCode;
  if (latencyMs !== undefined) result.latency_ms = latencyMs;
  if (cacheStatus !== undefined) result.cache_status = cacheStatus;
  if (operationType !== undefined) result.operation_type = operationType;
  if (operationName !== undefined) result.operation_name = operationName;

  // Add VCL fields only if defined
  if (vclFields.vcl_subroutine !== undefined)
    result.vcl_subroutine = vclFields.vcl_subroutine;
  if (vclFields.vcl_title !== undefined) result.vcl_title = vclFields.vcl_title;
  if (vclFields.vcl_step !== undefined) result.vcl_step = vclFields.vcl_step;
  if (vclFields.vcl_version !== undefined)
    result.vcl_version = vclFields.vcl_version;
  if (vclFields.vcl_host !== undefined) result.vcl_host = vclFields.vcl_host;
  if (vclFields.vcl_path !== undefined) result.vcl_path = vclFields.vcl_path;
  if (vclFields.vcl_body !== undefined) result.vcl_body = vclFields.vcl_body;
  if (vclFields.vcl_graphql_query !== undefined)
    result.vcl_graphql_query = vclFields.vcl_graphql_query;
  if (vclFields.vcl_restarts !== undefined)
    result.vcl_restarts = vclFields.vcl_restarts;
  if (vclFields.vcl_backend !== undefined)
    result.vcl_backend = vclFields.vcl_backend;
  if (vclFields.vcl_cacheable !== undefined)
    result.vcl_cacheable = vclFields.vcl_cacheable;

  // Add structured debug data if present
  if (record.data !== undefined) result.data = record.data;

  return result;
}
