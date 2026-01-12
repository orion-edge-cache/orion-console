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

export type CacheStatus = "HIT" | "MISS" | "BYPASS" | "UNKNOWN";

export interface RequestResult {
  type: string;
  status: number;
  duration: number;
  cacheStatus: CacheStatus;
  hasSurrogateKeys: boolean;
  hasPurgeKeys: boolean;
  error?: string;
  query?: string;
  errorMessage?: string;
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

export interface StreamingAnalyticsCallbacks {
  onProgress?: (result: RequestResult) => void;
  onComplete?: (result: AnalyticsResult) => void;
  onError?: (error: string) => void;
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

/**
 * Run analytics generator with streaming (real-time latency updates)
 *
 * Streams per-request results to the dashboard for real-time latency display.
 */
export async function runAnalyticsGeneratorStreaming(
  requestCount: number = 100,
  callbacks?: StreamingAnalyticsCallbacks,
): Promise<AnalyticsResult> {
  const response = await fetch(`${API_BASE_URL}/demo-tools/analytics-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestCount }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to start streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AnalyticsResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "progress") {
            callbacks?.onProgress?.(data.result);
          } else if (data.type === "complete") {
            finalResult = data.result;
            callbacks?.onComplete?.(data.result);
          } else if (data.type === "error") {
            callbacks?.onError?.(data.error);
            throw new Error(data.error);
          }
        } catch (parseError) {
          // Ignore JSON parse errors from partial data
          if (parseError instanceof SyntaxError) continue;
          throw parseError;
        }
      }
    }
  }

  if (!finalResult) throw new Error("No result received");
  return finalResult;
}

