/**
 * Kinesis Record Types
 *
 * Type definitions for raw Kinesis records from Fastly VCL and Compute services.
 */

/**
 * Raw Kinesis record - could be VCL debug, request completion, or Compute log
 */
export interface RawKinesisRecord {
  // Common fields
  timestamp?: string;
  Timestamp?: string;

  // Request completion log fields
  response_state?: string;
  response_status?: number | string;
  time_elapsed?: number | string;
  request_method?: string;
  url?: string;

  // VCL debug log fields
  Subroutine?: string;
  Title?: string;
  "CDN Version"?: string;
  Step?: string;
  Host?: string;
  Path?: string;
  PATH?: string;
  Method?: string;
  Body?: string;
  "X-GraphQL-Query"?: string;
  Restarts?: string | number;
  Backend?: string;
  Cacheable?: string | boolean;
  Status?: string | number;

  // Compute log fields
  event?: string;
  title?: string;
  operationType?: string;
  operationName?: string;
  entityCount?: number;
  keys?: string[];
  service?: string;
  duration_ms?: number;

  // Flexible logging fields (for edge debugging)
  message?: string;
  data?: Record<string, unknown>;
  level?: 'info' | 'warn' | 'error' | 'debug';

  [key: string]: unknown;
}
