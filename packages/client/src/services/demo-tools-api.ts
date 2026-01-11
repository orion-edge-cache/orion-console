/**
 * Demo Tools API
 *
 * Provides methods for running demo tools (cache tests and analytics generator).
 */

import { API_BASE_URL } from "../utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export interface TestSuiteSummary {
  name: string;
  passed: number;
  failed: number;
  results: TestResult[];
}

export interface CacheTestsResult {
  success: boolean;
  endpoint: string;
  totalPassed: number;
  totalFailed: number;
  suites: TestSuiteSummary[];
  duration: number;
  error?: string;
}

export interface BatchStats {
  total: number;
  queries: number;
  mutations: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface LatencyComparison {
  avgHitLatency: number;
  avgMissLatency: number;
  speedup: number;
}

export interface ErrorSample {
  type: string;
  status: number;
  query: string;
  errorMessage: string;
}

export interface AnalyticsResult {
  success: boolean;
  endpoint: string;
  requestCount: number;
  duration: number;
  stats: BatchStats;
  latencyComparison: LatencyComparison | null;
  errorSamples?: ErrorSample[];
  error?: string;
}

export interface CacheTestsResponse {
  success: boolean;
  result?: CacheTestsResult;
  error?: string;
}

export interface AnalyticsResponse {
  success: boolean;
  result?: AnalyticsResult;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run cache tests
 */
export async function runCacheTests(): Promise<CacheTestsResponse> {
  const response = await fetch(`${API_BASE_URL}/demo-tools/cache-tests`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to run cache tests");
  }

  return data;
}

/**
 * Run analytics generator
 */
export async function runAnalyticsGenerator(
  requestCount: number = 100,
): Promise<AnalyticsResponse> {
  const response = await fetch(`${API_BASE_URL}/demo-tools/analytics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requestCount }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to run analytics generator");
  }

  return data;
}
