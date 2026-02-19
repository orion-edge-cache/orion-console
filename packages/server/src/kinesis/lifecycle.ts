/**
 * Kinesis Consumer
 *
 * Polling logic and record processing for Kinesis streams.
 */

import { insertEvent } from "../db/index.js";
import {
  getStreamName,
  getCredentials,
  createKinesisClient,
  initializeShardIterators,
} from "./aws-setup.js";
import {
  getIsRunning,
  getConsumerStats,
  setIsRunning,
  setIsStopping,
  setKinesisClient,
  setPollInterval,
  getPollInterval,
  getShardIterators,
  resetState,
} from "./state.js";
import { pollRecords } from "./shard-manager.js";
import { processRecord } from "./record-processor.js";

// Re-export for backward compatibility
export { processRecord, pollRecords };

/**
 * Start the Kinesis consumer
 */
export async function startConsumer(): Promise<boolean> {
  if (getIsRunning()) {
    console.log("[Kinesis] Consumer already running");
    return true;
  }

  try {
    const streamName = await getStreamName();
    if (!streamName) {
      console.log("[Kinesis] No stream name found, consumer not started");
      return false;
    }

    const credentials = await getCredentials();
    if (!credentials) {
      console.log("[Kinesis] No AWS credentials found, consumer not started");
      return false;
    }

    const client = createKinesisClient(credentials);
    setKinesisClient(client);

    const shardIterators = getShardIterators();
    await initializeShardIterators(client, streamName, shardIterators);

    setIsRunning(true);
    setPollInterval(
      setInterval(() => pollRecords(streamName, stopConsumer), 1000),
    );

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
  const interval = getPollInterval();
  if (interval) {
    clearInterval(interval);
  }
  resetState();
  const message = reason
    ? `[Kinesis] Consumer stopped: ${reason}`
    : "[Kinesis] Consumer stopped";
  console.log(message);
}

/**
 * Check if consumer is running
 */
export function isConsumerRunning(): boolean {
  return getIsRunning();
}

/**
 * Get consumer stats
 */
export { getConsumerStats };

/**
 * Handle infrastructure destruction event
 */
export function handleInfrastructureDestroyed(): void {
  if (!getIsRunning()) {
    console.log("[Kinesis] Consumer not running, nothing to stop");
    return;
  }
  console.log("[Kinesis] Infrastructure destroyed, stopping consumer");
  setIsStopping(true);
  stopConsumer("infrastructure destroyed");
  insertEvent({
    timestamp: Date.now(),
    type: "config_change",
    message: "Kinesis consumer stopped due to infrastructure destruction",
  });
}

/**
 * Handle infrastructure deployment event
 */
export async function handleInfrastructureDeployed(): Promise<boolean> {
  console.log("[Kinesis] Infrastructure deployed, starting consumer");
  setIsStopping(false);
  const started = await startConsumer();
  if (started) {
    console.log("[Kinesis] Consumer started after infrastructure deployment");
  } else {
    console.log(
      "[Kinesis] Failed to start consumer after deployment, will retry",
    );
  }
  return started;
}
