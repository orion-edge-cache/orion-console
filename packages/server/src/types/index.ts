/**
 * Types Index
 *
 * Re-exports all type definitions for convenient imports.
 */

export * from "./config.js";
export * from "./system.js";

/**
 * Type for log insert parameters matching the database schema
 */
export interface MetricParams {
  timestamp: number;
  level: string;
  source: string;
  event: string;
  message: string;
  request_method: string | null;
  url: string | null;
  status_code: number | null;
  latency_ms: number;
  cache_status: string | null;
  operation_type: string | null;
  data: string;
}

export interface LogParams {
  timestamp: number;
  level: string;
  source: string;
  event: string;
  message: string;
  data: string;
}
