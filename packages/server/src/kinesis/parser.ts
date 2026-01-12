/**
 * Kinesis Record Parser
 *
 * Functions for parsing raw Kinesis records into LogEntry format.
 * Handles VCL debug logs, request completion logs, and Compute service logs.
 */

import type { LogEntry } from '../types/log-entry.js';
import type { RawKinesisRecord } from './types.js';

// Import from submodules
import {
  parseTimestamp,
  detectSource,
  extractCacheStatus,
  extractStatusCode,
  determineLevel,
  extractLatency,
} from './parser/field-extractors.js';
import { extractVclFields } from './parser/vcl-fields.js';
import { buildMessage } from './parser/message-builder.js';

// Re-export utilities for backward compatibility
export {
  parseTimestamp,
  detectSource,
  extractCacheStatus,
  extractStatusCode,
  determineLevel,
  extractLatency,
} from './parser/field-extractors.js';
export { extractVclFields } from './parser/vcl-fields.js';
export {
  buildRequestCompletionMessage,
  buildVclDebugMessage,
  buildComputeMessage,
  buildMessage,
} from './parser/message-builder.js';

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
    record.operationName && record.operationName !== 'anonymous'
      ? record.operationName
      : undefined;

  // Build result with only defined optional properties
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
