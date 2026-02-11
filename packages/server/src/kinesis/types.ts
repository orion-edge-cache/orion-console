export interface LogEntry {
  request_id: string;
  timestamp: number;
  level: LevelType;
  source: SourceType;

  latency_ms?: number;
  rawJson?: string;
  data?: Record<string, unknown>;
}

export type RawKinesisRecord = CDNSubroutineRecord | CDNSummaryLog | ComputeLog;

export type SubroutineType =
  | "recv"
  | "hash"
  | "miss"
  | "hit"
  | "pass"
  | "fetch";
export type ComputeEventType =
  | "health check"
  | "debug"
  | "error"
  | "cache"
  | "purge";
export type SourceType = "cdn" | "compute" | "backend" | "system";
export type LevelType = "info" | "warn" | "error" | "debug";

export interface CDNSubroutineRecord
  extends CommonRecordItems, VCLReq, VCLBereq, VCLBeresp, VCLObj {
  // Common fields (all subroutines)
  subroutine: SubroutineType;
}

export interface ComputeLog extends CommonRecordItems {
  // Common fields (all log types)
  message?: string;
  // Event type discriminator
  event: ComputeEventType;
  // Error event fields
  // Debug event data (nested object)
  data?: ComputeLogDataRecord;
  // Cache event fields
  entityCount?: number;
  entityTypes?: string[];
  surrogateKey?: string | null;
  cacheControl?: string;
  // Purge event fields
  keys?: string[];
  operationName?: string;
}

export interface CDNSummaryLog extends CommonRecordItems {
  // Timing
  time_to_first_byte: string; // Time to first byte
  time_elapsed: string; // Total request time in microseconds

  // CDN metadata
  fastly_server: string; // Server identity
  fastly_is_edge: "true" | "false"; // Is edge server (not shield)
  fastly_cache_graphql: string; // X-Fastly-Cache-GraphQL header

  // Request info
  client_ip: string; // Fastly-Client-IP header
  req_x_debug_cache_reason: string; // Debug cache reason header

  // Response info
  fastly_cache_state: FastlyInfoState; // fastly_info.state: NONEHIT, MISS, PASS, ERROR, etc.
  resp_status: number; // HTTP status code (200, 404, 500, etc.)
  resp_response: string | null; // HTTP status text
  resp_body_size: number; // Response body bytes
}

// Base states
type FastlyBaseState =
  | "NONE"
  | "HIT"
  | "HITPASS"
  | "HIT-STALE"
  | "HIT-SYNTH"
  | "MISS"
  | "PASS"
  | "UPGRADE"
  | "ERROR"
  | "ERROR-LOSTHDR";
// Background error states
type FastlyBgErrorState = "BG-ERROR-PASS" | "BG-ERROR-RECV" | "BG-ERROR-ERROR";
// Suffixes
type FastlySuffix = "-CLUSTER" | "-REFRESH" | "-WAIT";
// Combined type: base state with optional suffix
type FastlyStateWithSuffix =
  | FastlyBaseState
  | FastlyBgErrorState
  | `${FastlyBaseState}${FastlySuffix}`
  | `${FastlyBaseState}${FastlySuffix}${FastlySuffix}`;
type FastlyInfoState = FastlyStateWithSuffix;

export interface CommonRecordItems {
  request_id: string;
  source: SourceType;
  level: LevelType;
  timestamp: string;
  cdn_version?: string;
  req_url?: string;
  req_host?: string;
  req_path?: string;
  req_method?: string;
  req_body?: string;
  req_user_agent?: string;
}

export interface ComputeLogDataRecord {
  // Request debug data
  url?: string;
  method?: string;
  backend?: string;
  operationType?: string;
  isMutation?: boolean;
  body?: string;
  // Response debug data
  status?: number;
  statusText?: string;
}

/**
 * CDN Log Record - structured log from Fastly VCL logging snippets
 * Properties match the JSON fields in cdn_logging_snippets.tf
 */
export interface VCLReq {
  // RECV subroutine fields
  req_restarts?: number;
  req_accept?: string;
  req_content_type?: string;
  req_origin?: string;
  req_referrer?: string;
  req_x_graphql_query?: string;
  req_is_purge?: string;

  // MISS subroutine fields (backend request)
  req_backend_is_origin?: string;
}

export interface VCLBereq {
  // MISS subroutine fields (backend request)
  bereq_method?: string;
  bereq_proto?: string;
  bereq_url_basename?: string;
  bereq_url_path?: string;
  bereq_url_qs?: string;
  bereq_url?: string;
}

export interface VCLBeresp {
  // FETCH subroutine fields (backend response)
  beresp_response?: string;
  beresp_protocol?: string;
  beresp_backend_host?: string;
  beresp_backend_name?: string;
  beresp_cacheable?: string;
  beresp_sie?: number;
  beresp_swr?: number;
  beresp_status?: number;
  beresp_ttl?: number;
}

export interface VCLObj {
  // HIT subroutine fields (cached object)
  obj_age?: number;
  obj_cacheable?: string;
  obj_hits?: number;
  obj_lastuse?: number;
  obj_response?: string;
  obj_protocol?: string;
  obj_sie?: number;
  obj_swr?: number;
  obj_status?: number;
  obj_ttl?: number;
}
