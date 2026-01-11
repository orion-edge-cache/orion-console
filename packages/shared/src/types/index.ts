/**
 * Shared types for orion-console
 * Used by both client and server packages
 */

// ═══════════════════════════════════════════════════════════════════════
// Credentials Types
// ═══════════════════════════════════════════════════════════════════════

export interface CredentialsStatusResponse {
  saved: boolean;
  hasAws: boolean;
  hasFastly: boolean;
  savedAt?: string;
  awsKeyHint?: string;
  awsRegion?: string;
}

export interface DestroyRequirementsResponse {
  env: {
    hasAws: boolean;
    hasFastly: boolean;
    awsRegion?: string;
    awsKeyHint?: string;
  };
  required: {
    awsAccessKeyId: boolean;
    awsSecretAccessKey: boolean;
    fastlyApiToken: boolean;
  };
}

export interface SaveCredentialsRequest {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  fastly?: {
    apiToken: string;
  };
  copyFromEnv?: {
    aws?: boolean;
    fastly?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// System State Types
// ═══════════════════════════════════════════════════════════════════════

export type SystemState =
  | 'IDLE'
  | 'CHECKING'
  | 'DEPLOYING'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'DESTROYING'
  | 'BACKEND_DOWN';

export type OperationType = 'deploy' | 'destroy' | 'repair' | null;

export interface SystemStatus {
  state: SystemState;
  currentOperation: OperationType;
  version: string;
  backendUrl?: string;
  lastCheck: string;
  services?: {
    cdn?: string;
    compute?: string;
    kinesis?: string;
    s3?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Metrics Types
// ═══════════════════════════════════════════════════════════════════════

export interface MetricsResponse {
  hitRate: number | null;
  requestsPerSec: number | null;
  avgLatency: number | null;
  totalRequests: number | null;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricsData {
  requests: MetricDataPoint[];
  cacheHits: MetricDataPoint[];
  cacheMisses: MetricDataPoint[];
  latency: MetricDataPoint[];
}

// ═══════════════════════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════════════════════

export interface CacheRule {
  id: string;
  pattern: string;
  ttl: number;
  enabled: boolean;
}

export interface OrionConfig {
  rules: CacheRule[];
  defaultTtl: number;
}

export interface ConfigResponse {
  config: OrionConfig;
  lastUpdated: string;
}

export interface SaveConfigResponse {
  success: boolean;
  config: OrionConfig;
}

// ═══════════════════════════════════════════════════════════════════════
// Log Types
// ═══════════════════════════════════════════════════════════════════════

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════
// Health Types
// ═══════════════════════════════════════════════════════════════════════

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: boolean;
    kinesis: boolean;
    fastly: boolean;
  };
  uptime: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Infrastructure Types
// ═══════════════════════════════════════════════════════════════════════

export interface DeployRequest {
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    useEnv?: boolean;
  };
  fastly: {
    apiToken?: string;
    useEnv?: boolean;
  };
  backend: {
    graphqlUrl: string;
    hostOverride?: string;
  };
  saveCredentials?: boolean;
  copyFromEnv?: {
    aws?: boolean;
    fastly?: boolean;
  };
}

export interface DestroyRequest {
  useSavedCredentials?: boolean;
  fastlyApiToken?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
}

export interface InfrastructureResource {
  type: string;
  name: string;
  provider: string;
}

export interface DestroyPlan {
  resources: InfrastructureResource[];
  warning: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Observability Types
// ═══════════════════════════════════════════════════════════════════════

export interface ObservabilityStatus {
  kinesis: {
    running: boolean;
    recordsProcessed: number;
    errors: number;
    lastPollTime: string | null;
    lastRecordTime: string | null;
  };
  sse: {
    subscribers: number;
  };
}
