/**
 * Orion Configuration Types
 *
 * These types define the structure of orion.config.ts
 */

export interface OrionConfig {
  // Service identification
  version: string;
  name: string;

  // Default cache behavior
  defaults: {
    maxAge: number;                    // Default TTL in seconds
    staleWhileRevalidate?: number;     // SWR duration in seconds
    staleIfError?: number;             // SIE duration in seconds
  };

  // Per-type/field cache rules
  rules?: CacheRule[];

  // Mutation → Cache invalidation mapping
  invalidations?: Record<string, string[]>;

  // Logging preferences
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    logQueries?: boolean;
    includeHeaders?: string[];
  };
}

export interface CacheRule {
  // Types or fields to match (e.g., ['User', 'Profile'] or ['Query.feed'])
  types: string[];

  // Custom TTL for these types (overrides defaults)
  maxAge?: number;

  // Custom SWR for these types
  staleWhileRevalidate?: number;

  // If true, don't cache at all (useful for mutations)
  passthrough?: boolean;
}

// Infrastructure types
export interface InfrastructureConfig {
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  fastly: {
    apiToken: string;
  };
  backend: {
    graphqlUrl: string;
    serviceName: string;
  };
}

export interface InfrastructureStatus {
  deployed: boolean;
  terraformStateExists: boolean;
  services?: {
    cdn?: string;
    compute?: string;
    kinesis?: string;
    s3?: string;
  };
  demoApp?: {
    deployed: boolean;
    lambda?: string;
    clientBucket?: string;
    graphqlEndpoint?: string;
  };
}

// API Response types
export interface ConfigResponse {
  exists: boolean;
  config: OrionConfig | null;
}

export interface HealthResponse {
  grafana: boolean;
  grafanaUrl: string;
  error?: string;
}

export interface SaveConfigResponse {
  success: boolean;
  configStoreUpdated?: boolean;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface InfrastructureStatusResponse {
  status: InfrastructureStatus;
}

export interface DeployInfrastructureResponse {
  success: boolean;
  error?: string;
  status?: InfrastructureStatus;
}
