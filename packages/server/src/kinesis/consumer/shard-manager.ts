/**
 * Shard iterator management
 */

import {
  GetRecordsCommand,
  GetShardIteratorCommand,
} from "@aws-sdk/client-kinesis";
import {
  getKinesisClient,
  getIsRunning,
  getIsStopping,
  getShardIterators,
  getLastInfrastructureCheck,
  setLastInfrastructureCheck,
  setIsStopping,
  incrementErrors,
  updateLastPollTime,
  INFRASTRUCTURE_CHECK_INTERVAL,
} from "./state.js";
import { processRecord } from "./record-processor.js";
import { isInfrastructureAvailable } from "./infrastructure-checker.js";

/**
 * Poll records from all shards
 */
export async function pollRecords(
  streamName: string,
  stopConsumer: (reason: string) => void,
): Promise<void> {
  const kinesisClient = getKinesisClient();
  const shardIterators = getShardIterators();

  if (!kinesisClient || !getIsRunning() || getIsStopping()) return;

  updateLastPollTime(Date.now());

  // Periodically check if infrastructure still exists
  const now = Date.now();
  if (now - getLastInfrastructureCheck() >= INFRASTRUCTURE_CHECK_INTERVAL) {
    setLastInfrastructureCheck(now);
    const infraAvailable = await isInfrastructureAvailable();
    if (!infraAvailable) {
      console.log("[Kinesis] Infrastructure destroyed, stopping consumer");
      setIsStopping(true);
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
        // Shard is closed and exhausted
        console.log(
          `[Kinesis] Shard ${shardId} is closed and exhausted. Removing from poll list.`,
        );
        shardIterators.delete(shardId);
      }

      // Process records
      if (response.Records && response.Records.length > 0) {
        for (const record of response.Records) {
          console.log("SHARD DATA");
          console.log(record);
          processRecord(record.Data);
        }
      }
    } catch (error: any) {
      incrementErrors();

      if (error.name === "ExpiredIteratorException") {
        await reinitializeShardIterator(streamName, shardId, shardIterators);
      } else {
        console.error(
          `[Kinesis] Error polling shard ${shardId}:`,
          error.message,
        );
      }
    }
  }
}

/**
 * Re-initialize an expired shard iterator
 */
async function reinitializeShardIterator(
  streamName: string,
  shardId: string,
  shardIterators: Map<string, string>,
): Promise<void> {
  const kinesisClient = getKinesisClient();
  if (!kinesisClient) return;

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
}
