/**
 * Message building utilities for Kinesis record parsing
 */

import type { RawKinesisRecord } from '../types.js';

/**
 * Build message for request completion logs
 */
export function buildRequestCompletionMessage(
  cacheStatus: string | undefined,
  method: string | undefined,
  url: string | undefined,
  statusCode: number | undefined,
  latencyMs: number | undefined
): string {
  let message = `[${cacheStatus || 'REQUEST'}] ${method || 'GET'} ${url || '/graphql'} → ${statusCode || 200}`;
  if (latencyMs) message += ` (${latencyMs.toFixed(1)}ms)`;
  return message;
}

/**
 * Build message for VCL debug logs - includes all VCL fields
 */
export function buildVclDebugMessage(record: RawKinesisRecord): string {
  const subroutine = record.Subroutine?.replace(/==/g, '').trim() || 'vcl';
  const lines: string[] = [`== ${subroutine} ==`];

  if (record.Title) lines.push(`  Title: "${record.Title}"`);
  if (record['CDN Version'])
    lines.push(`  CDN Version: "${record['CDN Version']}"`);
  if (record.Step) lines.push(`  Step: "${record.Step}"`);
  if (record.Timestamp) lines.push(`  Timestamp: "${record.Timestamp}"`);
  if (record.Host) lines.push(`  Host: "${record.Host}"`);
  if (record['X-GraphQL-Query'])
    lines.push(`  X-GraphQL-Query: "${record['X-GraphQL-Query']}"`);
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

  return lines.join('\n');
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
    record.operationName && record.operationName !== 'anonymous'
      ? record.operationName
      : null;
  const opType = record.operationType || 'query';

  switch (record.event) {
    case 'request':
      return opName ? `[${opType}] ${opName}` : `[${opType}] anonymous`;
    case 'cache': {
      const entities = record.entityCount || 0;
      return opName
        ? `[cache] ${opName} (${entities} entities)`
        : `[cache] anonymous query (${entities} entities)`;
    }
    case 'purge': {
      const keys = record.keys?.length || 0;
      return opName
        ? `[purge] ${opName} (${keys} keys)`
        : `[purge] mutation (${keys} keys)`;
    }
    default:
      return record.title || `[${record.event}] ${opName || 'operation'}`;
  }
}

/**
 * Build appropriate message based on record type
 */
export function buildMessage(
  record: RawKinesisRecord,
  cacheStatus: string | undefined,
  statusCode: number | undefined,
  latencyMs: number | undefined
): string {
  // Request completion log (has response_state)
  if (record.response_state) {
    return buildRequestCompletionMessage(
      cacheStatus,
      record.request_method || record.Method,
      record.url || record.Path,
      statusCode,
      latencyMs
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
