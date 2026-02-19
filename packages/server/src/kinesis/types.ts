export interface LogEntry {
  request_id?: string;
  timestamp?: number;
  level?: LevelType;
  source?: SourceType;

  latency_ms?: number | undefined;
  subroutine?: string;
  rawJson?: string;
  data?: Record<string, unknown>;
}

export type RawKinesisRecord = CDNLog | ComputeLog;
export type CDNLog = CDNSummaryLog | CDNSubroutineLog;

export type CdnEventType = "recv" | "hash" | "miss" | "hit" | "pass" | "fetch";
export type ComputeEventType =
  | "health check"
  | "debug"
  | "error"
  | "cache"
  | "purge";
export type SourceType = "cdn" | "compute" | "backend" | "system";
export type LevelType = "info" | "warn" | "error" | "debug";

export interface CDNSubroutineLog extends VCLReq, VCLBereq, VCLBeresp, VCLObj {
  request_id: string;
  source: SourceType;
  level: LevelType;
  timestamp: string;
  subroutine?: SubroutineType;
  cdn_version?: string;
  req_url?: string;
  req_host?: string;
  req_path?: string;
  req_method?: string;
  req_body?: string;
  req_user_agent?: string;
}

export interface ComputeLog {
  request_id: string;
  source: SourceType;
  level: LevelType;
  timestamp: string;
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

export interface CDNSummaryLog {
  request_id: string;
  source: SourceType;
  level: LevelType;
  timestamp: string;
  subroutine: "deliver";
  cdn_version: string;
  // Timing
  time_to_first_byte: string; // Time to first byte
  time_elapsed: string; // Total request time in microseconds

  // CDN metadata
  fastly_server: string; // Server identity
  fastly_is_edge: boolean; // Is edge server (not shield)

  // Request info
  client_ip: string; // Fastly-Client-IP header
  req_x_debug_cache_reason: string; // Debug cache reason header
  req_x_health_check: string; // Health Check status
  req_x_graphql_query: string; // GraphQL Query

  // Response info
  fastly_cache_state: FastlyInfoState; // fastly_info.state: NONEHIT, MISS, PASS, ERROR, etc.
  resp_status: number; // HTTP status code (200, 404, 500, etc.)
  resp_response: string | null; // HTTP status text
  resp_body_size: number; // Response body bytes

  req_url: string;
  req_method: string;
  req_user_agent: string;
  req_protocol: string;

  latency_ms?: number;
  operation_type?: string;
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
export type FastlyInfoState = FastlyStateWithSuffix;

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
export interface VCLReqData {
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

export interface VCLBerespData {
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

// @orion-console/packages/client/src/routes/dashboard/logs/components/types.ts
export interface CdnLog {
  request_id: string;
  source: "cdn";
  event: "health check" | "debug" | "error";
  timestamp: string;
  message: string;
  data: {
    url: string;
    method: string;
    backend: string;
    operationType: "query" | "mutation";
    isMutation: boolean;
    status?: number;
    statusText?: string;
    body?: string;
  };
}

export interface EdgeLog {
  request_id: string;
  source: "compute";
  event: "debug" | "error" | "purge" | "cache";
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  data: {
    url: string;
    method: string;
    backend: string;
    operationType: "query" | "mutation";
    isMutation: boolean;
    status?: number;
    statusText?: string;
    body?: string;
    entityCount?: number;
    entityTypes?: string[];
    surrogateKey?: string;
    cacheControl?: string;
    keys?: string[];
    operationName?: string;
  };
}

export interface CommonLog {
  request_id: string;
  source: SourceType;
  level: LevelType;
  event: CdnEventType | ComputeEventType;
  timestamp: string;
  message: string;
  data: Record<string, string>;
}

// CDN Log Subroutine Interfaces
export interface CdnLogRecvData {
  cdn_version: string;
  req_host: string;
  req_path: string;
  req_method: string;
  req_body: string;
  req_restarts: string;
  req_user_agent: string;
  req_accept: string;
  req_content_type: string;
  req_origin: string;
  req_referrer: string;
  req_x_graphql_query: string;
  req_is_purge: "true" | "false";
}

export interface CdnLogHashData {}

export interface CdnLogMissData {
  bereq_method: string;
  bereq_proto: string;
  bereq_url_basename: string;
  bereq_url_path: string;
  bereq_url_qs: string;
  bereq_url: string;
  req_backend_is_origin: "true" | "false";
}

export interface CdnLogHitData {
  obj_age: string;
  obj_cacheable: "true" | "false";
  obj_hits: string;
  obj_lastuse: string;
  obj_response: string;
  obj_protocol: string;
  obj_sie: string;
  obj_swr: string;
  obj_status: string;
  obj_ttl: string;
}

export interface CdnLogPassData {}

export interface CdnLogFetchData {
  beresp_response: string;
  beresp_protocol: string;
  beresp_backend_host: string;
  beresp_backend_name: string;
  beresp_cacheable: "true" | "false";
  beresp_sie: string;
  beresp_swr: string;
  beresp_status: string;
  beresp_ttl: string;
}

export interface CdnDeliverData {
         "cdn_version": "%%{req.vcl.version}V",
         "client_ip": "%%{req.http.Fastly-Client-IP}V",
         "req_host": "%%{if(req.http.Fastly-Orig-Host, req.http.Fastly-Orig-Host, req.http.Host)}V",
         "req_url": "%%{json.escape(req.url)}V",
         "req_method": "%%{json.escape(req.method)}V",
         "req_protocol": "%%{json.escape(req.proto)}V",
         "req_user_agent": "%%{json.escape(req.http.User-Agent)}V",
         "fastly_cache_state": "%%{json.escape(fastly_info.state)}V",
         "resp_status": %%{resp.status}V,
         "resp_response": %%{if(resp.response, "%22"+json.escape(resp.response)+"%22", "null")}V,
         "resp_body_size": %%{resp.body_bytes_written}V,
         "fastly_server": "%%{json.escape(server.identity)}V",
         "fastly_is_edge": %%{if(fastly.ff.visits_this_service == 0, "true", "false")}V,
         "req_x_health_check": "%%{if(req.http.X-Health-Check, req.http.X-Health-Check, "null")}V",
         "req_x_graphql_query": "%%{if(req.http.X-GraphQL-Query, req.http.X-GraphQL-Query, "null")}V",
         "req_x_debug_cache_reason": "%%{req.http.X-Debug-Cache-Reason}V",
         "req_body": "%%{json.escape(req.body)}V",
         "time_to_first_byte": "%%{time.to_first_byte}V",
         "time_elapsed": "%%{time.elapsed.usec}V"
}

// Compute Log Interfaces
export interface ComputeHealthCheckPassedData {}

export interface ComputeHealthCheckFailedData {}

export interface ComputeMethodNotAllowedData {}

export interface ComputeGraphQLHeaderMissingData {}

export interface ComputeRequestLogData {
  url: string;
  method: string;
  backend: string;
  operationType: "query" | "mutation";
  isMutation: boolean;
}

export interface ComputeForwardToOriginData {
  url: string;
  method: string;
  backend: string;
  body: string;
}

export interface ComputeOriginResponseData {
  url: string;
  status: number;
  statusText: string;
  body: string;
}

export interface ComputeErrorData {
  status: number;
  statusText: string;
  body: string;
  operationType: "query" | "mutation";
}

export interface ComputePurgeData {
  keys: string[];
  operationName: string;
}

export interface ComputeCacheData {
  entityCount: number;
  entityTypes: string[];
  surrogateKey: string | null;
  cacheControl: string;
}

export type ComputeData =
  | ComputeHealthCheckPassedData
  | ComputeHealthCheckFailedData
  | ComputeMethodNotAllowedData
  | ComputeGraphQLHeaderMissingData
  | ComputeRequestLogData
  | ComputeForwardToOriginData
  | ComputeOriginResponseData
  | ComputeErrorData
  | ComputePurgeData
  | ComputeCacheData;

// ########################################3
// Base CDN Log interface with common fields
interface CdnLogBase {
  request_id: string;
  source: "cdn";
  level: "info";
  event: "recv" | "hash" | "miss" | "hit" | "pass" | "fetch";
  timestamp: string;
  message: string;
}

// Recv subroutine data
interface CdnLogRecvData {
  cdn_version: string;
  req_host: string;
  req_path: string;
  req_method: string;
  req_body: string;
  req_restarts: string;
  req_user_agent: string;
  req_accept: string;
  req_content_type: string;
  req_origin: string;
  req_referrer: string;
  req_x_graphql_query: string;
  req_is_purge: "true" | "false";
}

// Miss subroutine data
interface CdnLogMissData {
  bereq_method: string;
  bereq_proto: string;
  bereq_url_basename: string;
  bereq_url_path: string;
  bereq_url_qs: string;
  bereq_url: string;
  req_backend_is_origin: "true" | "false";
}

// Hit subroutine data
interface CdnLogHitData {
  obj_age: string;
  obj_cacheable: "true" | "false";
  obj_hits: string;
  obj_lastuse: string;
  obj_response: string;
  obj_protocol: string;
  obj_sie: string;
  obj_swr: string;
  obj_status: string;
  obj_ttl: string;
}

// Fetch subroutine data
interface CdnLogFetchData {
  beresp_response: string;
  beresp_protocol: string;
  beresp_backend_host: string;
  beresp_backend_name: string;
  beresp_cacheable: "true" | "false";
  beresp_sie: string;
  beresp_swr: string;
  beresp_status: string;
  beresp_ttl: string;
}

interface CdnLogDeliverData {
    cdn_version: string;
    client_ip: string;
    req_host: string;
    req_url: string;
    req_method: string;
    req_protocol: string;
    req_user_agent: string;
    fastly_cache_state: string;
    resp_status: number;
    resp_response: string | null;
    resp_body_size: number;
    fastly_server: string;
    fastly_is_edge: boolean;
    req_x_health_check: string | "null";
    req_x_graphql_query: string | "null";
    req_x_debug_cache_reason: string;
    req_body: string;
    time_to_first_byte: string;
    time_elapsed: string;
}


// Hash and Pass have empty data objects
interface CdnLogHashData {}
interface CdnLogPassData {}

// Complete log types by subroutine
interface CdnLogRecv extends CdnLogBase {
  event: "recv";
  data: CdnLogRecvData;
}

interface CdnLogHash extends CdnLogBase {
  event: "hash";
  data: CdnLogHashData;
}

interface CdnLogMiss extends CdnLogBase {
  event: "miss";
  data: CdnLogMissData;
}

interface CdnLogHit extends CdnLogBase {
  event: "hit";
  data: CdnLogHitData;
}

interface CdnLogPass extends CdnLogBase {
  event: "pass";
  data: CdnLogPassData;
}

interface CdnLogFetch extends CdnLogBase {
  event: "fetch";
  data: CdnLogFetchData;
}

interface CdnLogDeliver extends CdnLogBase {
  event: "deliver";
  data: CdnLogDeliverData;
}

// Union type for all CDN logs
type CdnLog = CdnLogRecv | CdnLogHash | CdnLogMiss | CdnLogHit | CdnLogPass | CdnLogFetch | CdnLogDeliver;

