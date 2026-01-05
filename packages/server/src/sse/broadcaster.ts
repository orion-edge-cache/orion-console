/**
 * SSE Broadcaster
 *
 * Manages SSE subscribers and broadcast utilities.
 */

import type { Response } from 'express';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type Channel = 'logs' | 'metrics' | 'events' | 'all';

interface Subscriber {
  res: Response;
  channels: Set<Channel>;
  connectedAt: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Subscriber Management
// ═══════════════════════════════════════════════════════════════════════

const subscribers = new Map<string, Subscriber>();
let subscriberId = 0;

/**
 * Add a new SSE subscriber
 */
export function addSubscriber(res: Response, channels: Channel[] = ['all']): string {
  const id = `sub_${++subscriberId}_${Date.now()}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Flush headers immediately to establish connection
  res.flushHeaders();

  // Store subscriber
  subscribers.set(id, {
    res,
    channels: new Set(channels),
    connectedAt: Date.now(),
  });

  // Send initial connection message
  sendToOne(id, 'connected', { subscriberId: id, channels });

  // Start heartbeat for this connection
  const heartbeat = setInterval(() => {
    if (subscribers.has(id)) {
      res.write(': heartbeat\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  return id;
}

/**
 * Remove a subscriber
 */
export function removeSubscriber(id: string): void {
  subscribers.delete(id);
}

/**
 * Get subscriber count
 */
export function getSubscriberCount(): number {
  return subscribers.size;
}

// ═══════════════════════════════════════════════════════════════════════
// Broadcasting
// ═══════════════════════════════════════════════════════════════════════

/**
 * Broadcast to all subscribers on a channel
 */
export function broadcast(channel: Channel, event: string, data: unknown): void {
  const message = formatSSE(event, data);

  for (const [id, sub] of subscribers) {
    if (sub.channels.has(channel) || sub.channels.has('all')) {
      try {
        sub.res.write(message);
        // Flush immediately for real-time delivery
        if (typeof (sub.res as any).flush === 'function') {
          (sub.res as any).flush();
        }
      } catch {
        // Client disconnected, remove them
        subscribers.delete(id);
      }
    }
  }
}

/**
 * Send to a specific subscriber
 */
export function sendToOne(id: string, event: string, data: unknown): void {
  const sub = subscribers.get(id);
  if (sub) {
    try {
      sub.res.write(formatSSE(event, data));
      if (typeof (sub.res as any).flush === 'function') {
        (sub.res as any).flush();
      }
    } catch {
      subscribers.delete(id);
    }
  }
}

/**
 * Format SSE message
 */
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ═══════════════════════════════════════════════════════════════════════
// Convenience Methods
// ═══════════════════════════════════════════════════════════════════════

/**
 * Broadcast a log entry
 */
export function broadcastLog(log: {
  timestamp: number;
  level: string;
  source: string;
  message?: string;
  request_method?: string;
  url?: string;
  status_code?: number;
  cache_status?: string;
  latency_ms?: number;
  operation_type?: string;
  operation_name?: string;
  // VCL-specific fields
  vcl_subroutine?: string;
  vcl_title?: string;
  vcl_step?: string;
  vcl_version?: string;
  vcl_host?: string;
  vcl_path?: string;
  vcl_body?: string;
  vcl_graphql_query?: string;
  vcl_restarts?: number;
  vcl_backend?: string;
  vcl_cacheable?: boolean;
}): void {
  broadcast('logs', 'log', log);
}

/**
 * Broadcast metrics update
 */
export function broadcastMetrics(metrics: {
  hitRate: number;
  requestsPerSecond: number;
  avgLatency: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}): void {
  broadcast('metrics', 'metrics', metrics);
}

/**
 * Broadcast a system event
 */
export function broadcastEvent(event: {
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}): void {
  broadcast('events', 'event', {
    timestamp: Date.now(),
    ...event,
  });
}

/**
 * Broadcast time-series data point (for charts)
 */
export function broadcastDataPoint(point: {
  time: number;
  requests: number;
  hits: number;
  misses: number;
  passes: number;
  errors4xx: number;
  errors5xx: number;
  hitRate: number;
  avgLatency: number;
}): void {
  broadcast('metrics', 'datapoint', point);
}
