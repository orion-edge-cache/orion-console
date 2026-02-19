/**
 * Kinesis utilities
 *
 * Shared utility functions for Kinesis record processing.
 */

/**
 * Parse a timestamp from various formats into milliseconds since epoch.
 * Handles both string dates and numeric timestamps.
 */
import type { FastlyLogEntry, CdnLogDeliverData } from "@orion/infra";

export function parseTimestamp(record: {
  timestamp: string | number | undefined;
}): number {
  const raw = record.timestamp;
  if (raw !== undefined && raw !== null) {
    // If already a number, return it directly
    if (typeof raw === "number") {
      if (!isNaN(raw)) return raw;
    } else {
      // Parse string date
      const parsed = new Date(raw).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }
  return Date.now();
}

export const isDeliverLog = (log: FastlyLogEntry) => {
  return log.event.toLowerCase() === "deliver";
};

export function convertLatencyToMs(log: FastlyLogEntry): number {
  if (!isDeliverLog(log)) return 0;
  const data = log.data as CdnLogDeliverData;
  const elapsed = parseInt(data.time_elapsed_microseconds, 10);
  return elapsed;
}
