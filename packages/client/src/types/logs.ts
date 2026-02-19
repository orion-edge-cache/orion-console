/**
 * Logs types
 */
export interface LogEntry {
  request_id: string;
  timestamp: number;
  level: LevelType;
  source: SourceType;

  latency_ms?: number | undefined;
  subroutine?: string;
  rawJson?: string;
  data?: Record<string, unknown>;
}

export type SourceType = "cdn" | "compute" | "backend" | "system";
export type LevelType = "info" | "warn" | "error" | "debug";
