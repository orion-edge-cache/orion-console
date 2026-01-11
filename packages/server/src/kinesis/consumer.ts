/**
 * Kinesis Consumer
 *
 * Polling logic and record processing for Kinesis streams.
 */

import {
  KinesisClient,
  GetRecordsCommand,
  GetShardIteratorCommand,
} from "@aws-sdk/client-kinesis";
import { insertLog, insertLogWithMetrics, insertEvent } from '../db/index.js';
import { broadcastLog, recordRequest } from '../sse/index.js';
import {
  getStreamName,
  getCredentials,
  createKinesisClient,
  initializeShardIterators,
  TFSTATE_PATH,
} from './client.js';
import { parseKinesisRecord } from './parser.js';
import fs from 'fs/promises';

// ═══════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════

let isRunning = false;
let isStopping = false;
let kinesisClient: KinesisClient | null = null;
let pollInterval: NodeJS.Timeout | null = null;
let shardIterators: Map<string, string> = new Map();
let lastInfrastructureCheck = 0;
const INFRASTRUCTURE_CHECK_INTERVAL = 10000; // Check every 10 seconds

// Stats for monitoring
let stats = {
  recordsProcessed: 0,
  errors: 0,
  lastPollTime: 0,
  lastRecordTime: 0,
};

// ═══════════════════════════════════════════════════════════════════════
// Consumer Control
// ═══════════════════════════════════════════════════════════════════════

/**
 * Start the Kinesis consumer
 */
export async function startConsumer(): Promise<boolean> {
  if (isRunning) {
    console.log("[Kinesis] Consumer already running");
    return true;
  }

  try {
    // Get stream name from terraform state
    const streamName = await getStreamName();
    if (!streamName) {
      console.log("[Kinesis] No stream name found, consumer not started");
      return false;
    }

    // Get AWS credentials
    const credentials = await getCredentials();
    if (!credentials) {
      console.log("[Kinesis] No AWS credentials found, consumer not started");
      return false;
    }

    // Initialize Kinesis client
    kinesisClient = createKinesisClient(credentials);

    // Get shard iterators
    await initializeShardIterators(kinesisClient, streamName, shardIterators);

    // Start polling
    isRunning = true;
    pollInterval = setInterval(() => pollRecords(streamName), 1000);

    console.log(`[Kinesis] Consumer started for stream: ${streamName}`);
    insertEvent({
      timestamp: Date.now(),
      type: "config_change",
      message: `Kinesis consumer started for stream: ${streamName}`,
    });

    return true;
  } catch (error) {
    console.error("[Kinesis] Failed to start consumer:", error);
    return false;
  }
}

/**
 * Stop the Kinesis consumer
 */
export function stopConsumer(reason?: string): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isRunning = false;
  isStopping = false;
  kinesisClient = null;
  shardIterators.clear();
  lastInfrastructureCheck = 0;
  const message = reason ? `[Kinesis] Consumer stopped: ${reason}` : "[Kinesis] Consumer stopped";
  console.log(message);
}

/**
 * Check if consumer is running
 */
export function isConsumerRunning(): boolean {
  return isRunning;
}

/**
 * Get consumer stats
 */
export function getConsumerStats() {
  return { ...stats, isRunning };
}

// ═══════════════════════════════════════════════════════════════════════
// Polling
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if infrastructure state file exists
 */
async function isInfrastructureAvailable(): Promise<boolean> {
  try {
    await fs.access(TFSTATE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Poll records from all shards
 */
async function pollRecords(streamName: string): Promise<void> {
  if (!kinesisClient || !isRunning || isStopping) return;

  stats.lastPollTime = Date.now();

  // Periodically check if infrastructure still exists
  const now = Date.now();
  if (now - lastInfrastructureCheck >= INFRASTRUCTURE_CHECK_INTERVAL) {
    lastInfrastructureCheck = now;
    const infraAvailable = await isInfrastructureAvailable();
    if (!infraAvailable) {
      console.log("[Kinesis] Infrastructure destroyed, stopping consumer");
      isStopping = true;
      // Allow current poll to complete, then stop
      setTimeout(() => stopConsumer("infrastructure destroyed"), 0);
      return;
    }
  }

  for (const [shardId, iterator] of shardIterators) {
    try {
      const cmd = new GetRecordsCommand({
        ShardIterator: iterator,
        Limit: 100,
      });

      const response = await kinesisClient.send(cmd);

      // Update iterator for next poll
      if (response.NextShardIterator) {
        shardIterators.set(shardId, response.NextShardIterator);
      } else {
        // SHARD EXHAUSTED: It's closed and empty.
        console.log(
          `[Kinesis] Shard ${shardId} is closed and exhausted. Removing from poll list.`,
        );
        shardIterators.delete(shardId);
      }

      // Process records
      if (response.Records && response.Records.length > 0) {
        for (const record of response.Records) {
          processRecord(record.Data);
        }
      }
    } catch (error: any) {
      stats.errors++;

      if (error.name === "ExpiredIteratorException") {
        // Re-initialize this shard's iterator
        console.log(
          `[Kinesis] Iterator expired for shard ${shardId}, re-initializing`,
        );
        try {
          const iteratorCmd = new GetShardIteratorCommand({
            StreamName: streamName,
            ShardId: shardId,
            ShardIteratorType: "LATEST",
          });
          const response = await kinesisClient.send(iteratorCmd);
          if (response.ShardIterator) {
            shardIterators.set(shardId, response.ShardIterator);
          }
        } catch (reinitError) {
          console.error(
            `[Kinesis] Failed to reinitialize iterator for shard ${shardId}:`,
            reinitError,
          );
        }
      } else {
        console.error(
          `[Kinesis] Error polling shard ${shardId}:`,
          error.message,
        );
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Record Processing
// ═══════════════════════════════════════════════════════════════════════

/**
 * Process a single Kinesis record
 */
function processRecord(data: Uint8Array | undefined): void {
  if (!data) return;

  try {
    const text = Buffer.from(data).toString("utf-8");
    const record = JSON.parse(text);

    stats.recordsProcessed++;
    stats.lastRecordTime = Date.now();

    // Convert Kinesis record to LogEntry
    const logEntry = parseKinesisRecord(record);

    // Only count request completion logs for metrics (those with response_state)
    // VCL debug logs are stored but not counted as requests
    if (record.response_state) {
      // Request completion log - store with metrics
      insertLogWithMetrics(logEntry);

      // Also update real-time SSE metrics
      recordRequest({
        ...(logEntry.cache_status !== undefined && { cache_status: logEntry.cache_status }),
        ...(logEntry.status_code !== undefined && { status_code: logEntry.status_code }),
        ...(logEntry.latency_ms !== undefined && { latency_ms: logEntry.latency_ms }),
      });
    } else {
      // VCL debug log - store without metrics
      insertLog(logEntry);
    }

    // Broadcast to SSE subscribers (including VCL-specific fields)
    // Use spread syntax to conditionally include only defined properties
    broadcastLog({
      timestamp: logEntry.timestamp,
      level: logEntry.level,
      source: logEntry.source,
      ...(logEntry.message !== undefined && { message: logEntry.message }),
      ...(logEntry.request_method !== undefined && { request_method: logEntry.request_method }),
      ...(logEntry.url !== undefined && { url: logEntry.url }),
      ...(logEntry.status_code !== undefined && { status_code: logEntry.status_code }),
      ...(logEntry.cache_status !== undefined && { cache_status: logEntry.cache_status }),
      ...(logEntry.latency_ms !== undefined && { latency_ms: logEntry.latency_ms }),
      ...(logEntry.operation_type !== undefined && { operation_type: logEntry.operation_type }),
      ...(logEntry.operation_name !== undefined && { operation_name: logEntry.operation_name }),
      // VCL-specific fields
      ...(logEntry.vcl_subroutine !== undefined && { vcl_subroutine: logEntry.vcl_subroutine }),
      ...(logEntry.vcl_title !== undefined && { vcl_title: logEntry.vcl_title }),
      ...(logEntry.vcl_step !== undefined && { vcl_step: logEntry.vcl_step }),
      ...(logEntry.vcl_version !== undefined && { vcl_version: logEntry.vcl_version }),
      ...(logEntry.vcl_host !== undefined && { vcl_host: logEntry.vcl_host }),
      ...(logEntry.vcl_path !== undefined && { vcl_path: logEntry.vcl_path }),
      ...(logEntry.vcl_body !== undefined && { vcl_body: logEntry.vcl_body }),
      ...(logEntry.vcl_graphql_query !== undefined && { vcl_graphql_query: logEntry.vcl_graphql_query }),
      ...(logEntry.vcl_restarts !== undefined && { vcl_restarts: logEntry.vcl_restarts }),
      ...(logEntry.vcl_backend !== undefined && { vcl_backend: logEntry.vcl_backend }),
      ...(logEntry.vcl_cacheable !== undefined && { vcl_cacheable: logEntry.vcl_cacheable }),
      // Structured debug data
      ...(logEntry.data !== undefined && { data: logEntry.data }),
    });
  } catch (error) {
    stats.errors++;
    // Invalid JSON, skip
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Infrastructure Lifecycle Handlers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Handle infrastructure destruction event
 * Immediately stops the consumer gracefully
 */
export function handleInfrastructureDestroyed(): void {
  if (!isRunning) {
    console.log("[Kinesis] Consumer not running, nothing to stop");
    return;
  }
  console.log("[Kinesis] Infrastructure destroyed, stopping consumer");
  isStopping = true;
  stopConsumer("infrastructure destroyed");
  insertEvent({
    timestamp: Date.now(),
    type: "config_change",
    message: "Kinesis consumer stopped due to infrastructure destruction",
  });
}

/**
 * Handle infrastructure deployment event
 * Triggers immediate consumer start attempt
 */
export async function handleInfrastructureDeployed(): Promise<boolean> {
  console.log("[Kinesis] Infrastructure deployed, starting consumer");
  // Reset stopping flag in case we're in a rapid cycle
  isStopping = false;
  const started = await startConsumer();
  if (started) {
    console.log("[Kinesis] Consumer started after infrastructure deployment");
  } else {
    console.log("[Kinesis] Failed to start consumer after deployment, will retry");
  }
  return started;
}

export { pollRecords, processRecord, isInfrastructureAvailable };
