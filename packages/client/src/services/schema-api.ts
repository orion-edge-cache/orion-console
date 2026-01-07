/**
 * Schema API
 *
 * Provides type-safe methods for schema analysis and AI-powered config generation.
 */

import { API_BASE_URL } from "../utils";

// =============================================================================
// TYPES
// =============================================================================

export interface AIProvider {
  id: "anthropic" | "openai" | "gemini" | "grok";
  name: string;
  description: string;
  website: string;
  requiresApiKey: boolean;
  models: string[];
  pricing: string;
  setupUrl: string;
  defaultModel: string;
}

export interface CredentialStatus {
  saved: boolean;
  env: boolean;
  masked?: string;
}

export interface AICredentialsStatusResponse {
  anthropic: CredentialStatus;
  openai: CredentialStatus;
  gemini: CredentialStatus;
  grok: CredentialStatus;
}

export interface EndpointResponse {
  endpoint: string;
  source: "terraform";
}

export interface EndpointTestResponse {
  reachable: boolean;
  error?: string;
}

export interface ProvidersResponse {
  providers: AIProvider[];
}

export interface SchemaAnalysis {
  entities: Array<{
    name: string;
    description: string | null;
    hasId: boolean;
    fields: Array<{
      name: string;
      typeName: string;
      isNonNull: boolean;
      isList: boolean;
    }>;
    characteristics: {
      isVolatile: boolean;
      isUserSpecific: boolean;
      isCollection: boolean;
      hasSensitiveFields: boolean;
      isRootType: boolean;
    };
  }>;
  queries: Array<{
    name: string;
    returnType: string;
    returnsList: boolean;
    arguments: Array<{
      name: string;
      typeName: string;
      isRequired: boolean;
    }>;
  }>;
  mutations: Array<{
    name: string;
    returnType: string;
    affectedTypes: string[];
  }>;
  relationships: Array<{
    from: string;
    to: string;
    fieldName: string;
    isList: boolean;
  }>;
}

export interface AnalyzeResponse {
  endpoint: string;
  analysis: SchemaAnalysis;
  analyzedAt: string;
}

export interface OrionCacheConfig {
  version: string;
  name: string;
  defaults: {
    maxAge: number;
    staleWhileRevalidate: number;
    staleIfError: number;
  };
  rules: Array<{
    types: string[];
    maxAge?: number;
    staleWhileRevalidate?: number;
    staleIfError?: number;
    scope?: "public" | "private";
    passthrough?: boolean;
  }>;
  invalidations: Record<string, string[]>;
}

export interface AIConfigResponse {
  rules: Array<{
    types: string[];
    maxAge: number;
    staleWhileRevalidate?: number;
    staleIfError?: number;
    scope?: "public" | "private";
    passthrough?: boolean;
    reasoning: string;
  }>;
  invalidations: Record<string, string[]>;
  explanation: string;
  confidence: number;
  warnings: string[];
}

export interface GenerateConfigResponse {
  endpoint: string;
  config: OrionCacheConfig;
  analysis: SchemaAnalysis;
  aiResponse?: AIConfigResponse;
  generatedAt: string;
  method: "heuristic" | "ai";
}

export interface ConfigPreferences {
  defaultTtl?: "short" | "medium" | "long";
  aggressiveCaching?: boolean;
  noCacheTypes?: string[];
  privateTypes?: string[];
  customHints?: string;
}

// =============================================================================
// ENDPOINT FUNCTIONS
// =============================================================================

/**
 * Get GraphQL endpoint from terraform state
 */
export async function getSchemaEndpoint(): Promise<EndpointResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/endpoint`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get endpoint");
  }

  return response.json();
}

/**
 * Test if a GraphQL endpoint is reachable
 */
export async function testSchemaEndpoint(
  endpoint: string
): Promise<EndpointTestResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/endpoint/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to test endpoint");
  }

  return response.json();
}

// =============================================================================
// AI CREDENTIAL FUNCTIONS
// =============================================================================

/**
 * Get credential status for all AI providers
 */
export async function getAICredentialsStatus(): Promise<AICredentialsStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/credentials/status`);

  if (!response.ok) {
    throw new Error("Failed to get AI credentials status");
  }

  return response.json();
}

/**
 * Save AI provider credentials
 */
export async function saveAICredentials(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; message: string; masked: string }> {
  const response = await fetch(`${API_BASE_URL}/schema/credentials/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to save credentials");
  }

  return data;
}

/**
 * Validate AI API key format
 */
export async function validateAICredentials(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/schema/credentials/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });

  if (!response.ok) {
    throw new Error("Failed to validate credentials");
  }

  return response.json();
}

// =============================================================================
// PROVIDER FUNCTIONS
// =============================================================================

/**
 * Get available AI providers
 */
export async function getProviders(): Promise<ProvidersResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/providers`);

  if (!response.ok) {
    throw new Error("Failed to get providers");
  }

  return response.json();
}

// =============================================================================
// SCHEMA ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyze a GraphQL schema
 */
export async function analyzeSchema(
  endpoint?: string
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to analyze schema");
  }

  return data;
}

// =============================================================================
// CONFIG GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate cache configuration using AI
 */
export async function generateConfig(options: {
  endpoint?: string;
  preferences?: ConfigPreferences;
  aiProvider?: {
    provider: string;
    apiKey?: string;
    model?: string;
  };
  useBasic?: boolean;
}): Promise<GenerateConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/generate-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to generate config");
  }

  return data;
}

/**
 * Generate basic cache configuration without AI
 */
export async function generateBasicConfig(
  endpoint?: string
): Promise<GenerateConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/schema/generate-basic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to generate config");
  }

  return data;
}
