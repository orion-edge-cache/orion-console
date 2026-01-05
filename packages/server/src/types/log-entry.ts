/**
 * Log Entry Type Definition
 *
 * Single source of truth for log entry structure used across
 * the database layer, SSE broadcasting, and Kinesis consumer.
 */

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'cdn' | 'compute' | 'backend' | 'system';
  request_method?: string;
  url?: string;
  status_code?: number;
  latency_ms?: number;
  cache_status?: string;
  operation_type?: string;
  operation_name?: string;
  message?: string;
  raw_json?: string;

  // VCL-specific fields from Fastly logging snippets
  vcl_subroutine?: string;    // vcl_recv, vcl_hash, vcl_miss, vcl_hit, vcl_pass, vcl_fetch
  vcl_title?: string;         // Descriptive title of the log event
  vcl_step?: string;          // Sequential step number in request flow
  vcl_version?: string;       // CDN VCL version number
  vcl_host?: string;          // Request host header
  vcl_path?: string;          // URL path
  vcl_body?: string;          // Request body (JSON escaped)
  vcl_graphql_query?: string; // X-GraphQL-Query header
  vcl_restarts?: number;      // Number of VCL restarts
  vcl_backend?: string;       // Backend service name
  vcl_cacheable?: boolean;    // Whether response is cacheable
}
