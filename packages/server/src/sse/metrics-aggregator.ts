/**
 * SSE Metrics Aggregator
 *
 * Aggregates per-second metrics and broadcasts updates.
 */

import {
  broadcastDataPoint,
  broadcastMetrics,
  getSubscriberCount,
} from './broadcaster.js';

// In-memory aggregation for current second
let currentBucket = Math.floor(Date.now() / 1000);
let currentMetrics = {
  requests: 0,
  hits: 0,
  misses: 0,
  passes: 0,
  errors4xx: 0,
  errors5xx: 0,
  sumLatency: 0,
  sumHitLatency: 0,
  sumMissLatency: 0,
};

/**
 * Record a request for real-time metrics
 */
export function recordRequest(data: {
  cache_status?: string;
  status_code?: number;
  latency_ms?: number;
}): void {
  const bucket = Math.floor(Date.now() / 1000);

  // Roll over to new bucket if needed
  if (bucket !== currentBucket) {
    // Push previous bucket's data
    if (currentMetrics.requests > 0) {
      const hitRate = (currentMetrics.hits + currentMetrics.misses) > 0
        ? currentMetrics.hits / (currentMetrics.hits + currentMetrics.misses)
        : 0;
      const avgLatency = currentMetrics.sumLatency / currentMetrics.requests;
      const hitAvgLatency = currentMetrics.hits > 0 ? currentMetrics.sumHitLatency / currentMetrics.hits : 0;
      const missAvgLatency = currentMetrics.misses > 0 ? currentMetrics.sumMissLatency / currentMetrics.misses : 0;

      broadcastDataPoint({
        time: currentBucket * 1000,
        requests: currentMetrics.requests,
        hits: currentMetrics.hits,
        misses: currentMetrics.misses,
        passes: currentMetrics.passes,
        errors4xx: currentMetrics.errors4xx,
        errors5xx: currentMetrics.errors5xx,
        hitRate,
        avgLatency,
        hitAvgLatency,
        missAvgLatency,
      });

      // Also push aggregated metrics
      broadcastMetrics({
        hitRate,
        requestsPerSecond: currentMetrics.requests,
        avgLatency,
        hitAvgLatency,
        missAvgLatency,
        totalRequests: currentMetrics.requests,
        cacheHits: currentMetrics.hits,
        cacheMisses: currentMetrics.misses,
      });
    }

    // Reset for new bucket
    currentBucket = bucket;
    currentMetrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      passes: 0,
      errors4xx: 0,
      errors5xx: 0,
      sumLatency: 0,
      sumHitLatency: 0,
      sumMissLatency: 0,
    };
  }

  // Update current bucket
  currentMetrics.requests++;

  // Handle variants like HIT-CLUSTER, MISS-CLUSTER, etc.
  const status = data.cache_status?.toUpperCase() || '';
  const isHit = status.startsWith('HIT');
  const isMiss = status.startsWith('MISS');

  if (isHit) currentMetrics.hits++;
  else if (isMiss) currentMetrics.misses++;
  else if (status.startsWith('PASS') || status === 'SYNTH') currentMetrics.passes++;

  if (data.status_code && data.status_code >= 400 && data.status_code < 500) currentMetrics.errors4xx++;
  if (data.status_code && data.status_code >= 500) currentMetrics.errors5xx++;

  if (data.latency_ms) {
    currentMetrics.sumLatency += data.latency_ms;
    if (isHit) currentMetrics.sumHitLatency += data.latency_ms;
    if (isMiss) currentMetrics.sumMissLatency += data.latency_ms;
  }
}

// Broadcast data points every second when there's traffic (for live charts)
setInterval(() => {
  const bucket = Math.floor(Date.now() / 1000);
  if (bucket !== currentBucket) {
    // Only broadcast if there were actual requests AND we have subscribers
    if (currentMetrics.requests > 0 && getSubscriberCount() > 0) {
      const hitRate = (currentMetrics.hits + currentMetrics.misses) > 0
        ? currentMetrics.hits / (currentMetrics.hits + currentMetrics.misses)
        : 0;
      const avgLatency = currentMetrics.sumLatency / currentMetrics.requests;
      const hitAvgLatency = currentMetrics.hits > 0 ? currentMetrics.sumHitLatency / currentMetrics.hits : 0;
      const missAvgLatency = currentMetrics.misses > 0 ? currentMetrics.sumMissLatency / currentMetrics.misses : 0;

      // Push data point for charts (only real data, not zeros)
      broadcastDataPoint({
        time: currentBucket * 1000,
        requests: currentMetrics.requests,
        hits: currentMetrics.hits,
        misses: currentMetrics.misses,
        passes: currentMetrics.passes,
        errors4xx: currentMetrics.errors4xx,
        errors5xx: currentMetrics.errors5xx,
        hitRate,
        avgLatency,
        hitAvgLatency,
        missAvgLatency,
      });
    }

    // Always reset for next bucket
    currentBucket = bucket;
    currentMetrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      passes: 0,
      errors4xx: 0,
      errors5xx: 0,
      sumLatency: 0,
      sumHitLatency: 0,
      sumMissLatency: 0,
    };
  }
}, 1000);
