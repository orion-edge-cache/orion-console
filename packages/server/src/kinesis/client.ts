/**
 * Kinesis Client Setup
 *
 * Functions for initializing Kinesis client, getting credentials,
 * and managing shard iterators.
 */

import {
  KinesisClient,
  DescribeStreamCommand,
  GetShardIteratorCommand,
} from "@aws-sdk/client-kinesis";
import fs from "fs/promises";
import path from "path";
import os from "os";

// ═══════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════

const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");
const DEPLOYMENT_CONFIG_PATH = path.join(ORION_CONFIG_DIR, "deployment-config.json");
const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, "terraform.tfstate");

interface SavedCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
}

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Stream Name Resolution
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get Kinesis stream name from terraform state or environment
 */
export async function getStreamName(): Promise<string | null> {
  try {
    // Try terraform state first
    const stateContent = await fs.readFile(TFSTATE_PATH, "utf-8");
    const state = JSON.parse(stateContent);
    const streamName = state.outputs?.kinesis_stream?.value?.name;
    if (streamName) return streamName;
  } catch {
    // State file doesn't exist or is invalid
  }

  // Try environment variable
  if (process.env.KINESIS_STREAM_NAME) {
    return process.env.KINESIS_STREAM_NAME;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// Credentials Resolution
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get AWS credentials from environment or saved file
 */
export async function getCredentials(): Promise<AWSCredentials | null> {
  // Try environment variables first
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region:
        process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    };
  }

  // Try saved credentials file
  try {
    const content = await fs.readFile(DEPLOYMENT_CONFIG_PATH, "utf-8");
    const saved: SavedCredentials = JSON.parse(content);
    if (saved.aws) {
      return {
        accessKeyId: saved.aws.accessKeyId,
        secretAccessKey: saved.aws.secretAccessKey,
        region: saved.aws.region || "us-east-1",
      };
    }
  } catch {
    // Deployment config file doesn't exist
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// Client Creation
// ═══════════════════════════════════════════════════════════════════════

/**
 * Create a new Kinesis client with the given credentials
 */
export function createKinesisClient(credentials: AWSCredentials): KinesisClient {
  return new KinesisClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Shard Iterator Management
// ═══════════════════════════════════════════════════════════════════════

/**
 * Initialize shard iterators for all shards in a stream
 */
export async function initializeShardIterators(
  client: KinesisClient,
  streamName: string,
  shardIterators: Map<string, string>
): Promise<void> {
  const describeCmd = new DescribeStreamCommand({ StreamName: streamName });
  const response = await client.send(describeCmd);

  const shards = response.StreamDescription?.Shards || [];

  for (const shard of shards) {
    if (!shard.ShardId) continue;

    const iteratorCmd = new GetShardIteratorCommand({
      StreamName: streamName,
      ShardId: shard.ShardId,
      ShardIteratorType: "LATEST", // Start from now, don't replay old logs
    });

    const iteratorResponse = await client.send(iteratorCmd);
    if (iteratorResponse.ShardIterator) {
      shardIterators.set(shard.ShardId, iteratorResponse.ShardIterator);
    }
  }

  console.log(`[Kinesis] Initialized ${shardIterators.size} shard iterator(s)`);
}

/**
 * Re-initialize a single shard iterator (e.g., after expiration)
 */
export async function reinitializeShardIterator(
  client: KinesisClient,
  streamName: string,
  shardId: string,
  shardIterators: Map<string, string>
): Promise<void> {
  const iteratorCmd = new GetShardIteratorCommand({
    StreamName: streamName,
    ShardId: shardId,
    ShardIteratorType: "LATEST",
  });
  const response = await client.send(iteratorCmd);
  if (response.ShardIterator) {
    shardIterators.set(shardId, response.ShardIterator);
  }
}

export { ORION_CONFIG_DIR, DEPLOYMENT_CONFIG_PATH, TFSTATE_PATH };
