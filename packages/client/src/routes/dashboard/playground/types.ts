/**
 * Playground types
 */

export interface ResponseData {
  data: unknown;
  headers: Record<string, string>;
  status: number;
  duration: number;
  _meta?: {
    usedFallback?: boolean;
    targetUrl?: string;
    cdnError?: string;
  };
}

export interface CacheAnalysis {
  isHit: boolean;
  ttl: number | null;
  age: number | null;
  warnings: string[];
}
