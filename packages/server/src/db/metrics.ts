/**
 * Metrics Database Operations
 *
 * Functions for aggregating and querying metrics data.
 */

import { db } from "./schema.js";
import type { CDNSummaryLog } from "../kinesis/types.js";
import type { MetricsBucket } from "../types/system.js";
import { parseTimestamp } from "../kinesis/record-processor.js";

// Re-export MetricsBucket for convenience
export type { MetricsBucket };

const upsertMetrics1sStmt = db.prepare(`
  INSERT INTO metrics_1s (
    bucket, total_requests, cache_hits, cache_misses, cache_passes,
    errors_4xx, errors_5xx, sum_latency_ms, sum_hit_latency_ms, sum_miss_latency_ms,
    min_latency_ms, max_latency_ms, latencies_json
  ) VALUES (
    @bucket, @total_requests, @cache_hits, @cache_misses, @cache_passes,
    @errors_4xx, @errors_5xx, @sum_latency_ms, @sum_hit_latency_ms, @sum_miss_latency_ms,
    @min_latency_ms, @max_latency_ms, @latencies_json
  )
  ON CONFLICT(bucket) DO UPDATE SET
    total_requests = total_requests + @total_requests,
    cache_hits = cache_hits + @cache_hits,
    cache_misses = cache_misses + @cache_misses,
    cache_passes = cache_passes + @cache_passes,
    errors_4xx = errors_4xx + @errors_4xx,
    errors_5xx = errors_5xx + @errors_5xx,
    sum_latency_ms = sum_latency_ms + @sum_latency_ms,
    sum_hit_latency_ms = sum_hit_latency_ms + @sum_hit_latency_ms,
    sum_miss_latency_ms = sum_miss_latency_ms + @sum_miss_latency_ms,
    min_latency_ms = CASE WHEN @min_latency_ms < min_latency_ms OR min_latency_ms IS NULL THEN @min_latency_ms ELSE min_latency_ms END,
    max_latency_ms = CASE WHEN @max_latency_ms > max_latency_ms OR max_latency_ms IS NULL THEN @max_latency_ms ELSE max_latency_ms END,
    latencies_json = json_insert(latencies_json, '$[#]', @latency_single)
`);

/**
 * Update metrics bucket for a log entry
 */
export function updateMetricsBucket(log: CDNSummaryLog): void {
  const timestamp = parseTimestamp(log);
  const bucket = Math.floor(timestamp); // 1-second bucket

  // Handle variants like HIT-CLUSTER, MISS-CLUSTER, etc.
  const status = log.fastly_cache_state?.toUpperCase() || "";
  const isHit = status.startsWith("HIT");
  const isMiss = status.startsWith("MISS");
  const isPass = status.startsWith("PASS") || status === "SYNTH";
  const is4xx =
    log.resp_status && log.resp_status >= 400 && log.resp_status < 500;
  const is5xx = log.resp_status && log.resp_status >= 500;

  try {
    upsertMetrics1sStmt.run({
      bucket,
      total_requests: 1,
      cache_hits: isHit ? 1 : 0,
      cache_misses: isMiss ? 1 : 0,
      cache_passes: isPass ? 1 : 0,
      errors_4xx: is4xx ? 1 : 0,
      errors_5xx: is5xx ? 1 : 0,
      sum_latency_ms: log.latency_ms,
      sum_hit_latency_ms: isHit ? log.latency_ms : 0,
      sum_miss_latency_ms: isMiss ? log.latency_ms : 0,
      min_latency_ms: log.latency_ms || null,
      max_latency_ms: log.latency_ms || null,
      latencies_json: "[]",
      latency_single: log.latency_ms,
    });
  } catch {
    // Fallback: simple insert without JSON update
    db.prepare(
      `
      INSERT OR REPLACE INTO metrics_1s (bucket, total_requests, cache_hits, cache_misses, cache_passes, errors_4xx, errors_5xx, sum_latency_ms, min_latency_ms, max_latency_ms)
      VALUES (?,
        COALESCE((SELECT total_requests FROM metrics_1s WHERE bucket = ?), 0) + 1,
        COALESCE((SELECT cache_hits FROM metrics_1s WHERE bucket = ?), 0) + ?,
        COALESCE((SELECT cache_misses FROM metrics_1s WHERE bucket = ?), 0) + ?,
        COALESCE((SELECT cache_passes FROM metrics_1s WHERE bucket = ?), 0) + ?,
        COALESCE((SELECT errors_4xx FROM metrics_1s WHERE bucket = ?), 0) + ?,
        COALESCE((SELECT errors_5xx FROM metrics_1s WHERE bucket = ?), 0) + ?,
        COALESCE((SELECT sum_latency_ms FROM metrics_1s WHERE bucket = ?), 0) + ?,
        MIN(COALESCE((SELECT min_latency_ms FROM metrics_1s WHERE bucket = ?), ?), ?),
        MAX(COALESCE((SELECT max_latency_ms FROM metrics_1s WHERE bucket = ?), ?), ?)
      )
    `,
    ).run(
      bucket,
      bucket,
      bucket,
      isHit ? 1 : 0,
      bucket,
      isMiss ? 1 : 0,
      bucket,
      isPass ? 1 : 0,
      bucket,
      is4xx ? 1 : 0,
      bucket,
      is5xx ? 1 : 0,
      bucket,
      log.latency_ms || 0,
      bucket,
      log.latency_ms,
      log.latency_ms,
      bucket,
      log.latency_ms,
      log.latency_ms,
    );
  }
}

const getMetrics1sStmt = db.prepare(`
  SELECT * FROM metrics_1s
  WHERE bucket >= @since AND bucket <= @until
  ORDER BY bucket ASC
`);

/**
 * Get 1-second metrics buckets for a time range
 */
export function getMetrics1s(
  since: number,
  until: number = Math.floor(Date.now() / 1000),
): MetricsBucket[] {
  return getMetrics1sStmt.all({ since, until }) as MetricsBucket[];
}

/**
 * Get aggregated metrics for a time range
 */
export function getAggregatedMetrics(
  since: number,
  until: number = Math.floor(Date.now() / 1000),
): {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgLatency: number;
  hitAvgLatency: number;
  missAvgLatency: number;
  requestsPerSecond: number;
} {
  const result = db
    .prepare(
      `
    SELECT
      SUM(total_requests) as total_requests,
      SUM(cache_hits) as cache_hits,
      SUM(cache_misses) as cache_misses,
      SUM(sum_latency_ms) as sum_latency,
      SUM(sum_hit_latency_ms) as sum_hit_latency,
      SUM(sum_miss_latency_ms) as sum_miss_latency,
      MIN(bucket) as min_bucket,
      MAX(bucket) as max_bucket
    FROM metrics_1s
    WHERE bucket >= ? AND bucket <= ?
  `,
    )
    .get(since, until) as any;

  const totalRequests = result?.total_requests || 0;
  const cacheHits = result?.cache_hits || 0;
  const cacheMisses = result?.cache_misses || 0;
  const sumLatency = result?.sum_latency || 0;
  const sumHitLatency = result?.sum_hit_latency || 0;
  const sumMissLatency = result?.sum_miss_latency || 0;
  const duration =
    result?.max_bucket && result?.min_bucket
      ? Math.max(result.max_bucket - result.min_bucket, 1)
      : 1;

  return {
    totalRequests,
    cacheHits,
    cacheMisses,
    hitRate: totalRequests > 0 ? cacheHits / (cacheHits + cacheMisses) : 0,
    avgLatency: totalRequests > 0 ? sumLatency / totalRequests : 0,
    hitAvgLatency: cacheHits > 0 ? sumHitLatency / cacheHits : 0,
    missAvgLatency: cacheMisses > 0 ? sumMissLatency / cacheMisses : 0,
    requestsPerSecond: totalRequests / duration,
  };
}

/**
 * Get time-series data for charts
 */
export function getTimeSeries(
  since: number,
  until: number = Math.floor(Date.now() / 1000),
  bucketSize: number = 1, // 1 = 1s buckets, 60 = 1m buckets
): Array<{
  time: number;
  requests: number;
  hits: number;
  misses: number;
  passes: number;
  errors4xx: number;
  errors5xx: number;
  hitRate: number;
  avgLatency: number;
  hitAvgLatency: number;
  missAvgLatency: number;
}> {
  const rows = db
    .prepare(
      `
    SELECT
      (bucket / ?) * ? as time_bucket,
      SUM(total_requests) as requests,
      SUM(cache_hits) as hits,
      SUM(cache_misses) as misses,
      SUM(cache_passes) as passes,
      SUM(errors_4xx) as errors_4xx,
      SUM(errors_5xx) as errors_5xx,
      SUM(sum_latency_ms) as sum_latency,
      SUM(sum_hit_latency_ms) as sum_hit_latency,
      SUM(sum_miss_latency_ms) as sum_miss_latency
    FROM metrics_1s
    WHERE bucket >= ? AND bucket <= ?
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `,
    )
    .all(bucketSize, bucketSize, since, until) as any[];

  return rows.map((row) => ({
    time: row.time_bucket * 1000, // Convert to ms for JS
    requests: row.requests || 0,
    hits: row.hits || 0,
    misses: row.misses || 0,
    passes: row.passes || 0,
    errors4xx: row.errors_4xx || 0,
    errors5xx: row.errors_5xx || 0,
    hitRate:
      row.hits + row.misses > 0 ? (row.hits || 0) / (row.hits + row.misses) : 0,
    avgLatency: row.requests > 0 ? (row.sum_latency || 0) / row.requests : 0,
    hitAvgLatency: row.hits > 0 ? (row.sum_hit_latency || 0) / row.hits : 0,
    missAvgLatency:
      row.misses > 0 ? (row.sum_miss_latency || 0) / row.misses : 0,
  }));
}
