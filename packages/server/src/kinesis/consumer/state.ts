/**
 * Consumer state management
 */

import type { KinesisClient } from "@aws-sdk/client-kinesis";

// Consumer state
let isRunning = false;
let isStopping = false;
let kinesisClient: KinesisClient | null = null;
let pollInterval: NodeJS.Timeout | null = null;
let shardIterators: Map<string, string> = new Map();
let lastInfrastructureCheck = 0;

export const INFRASTRUCTURE_CHECK_INTERVAL = 30000; // Check every 30 seconds

// Stats for monitoring
let stats = {
  recordsProcessed: 0,
  errors: 0,
  lastPollTime: 0,
  lastRecordTime: 0,
};

// Getters
export function getIsRunning(): boolean {
  return isRunning;
}

export function getIsStopping(): boolean {
  return isStopping;
}

export function getKinesisClient(): KinesisClient | null {
  return kinesisClient;
}

export function getPollInterval(): NodeJS.Timeout | null {
  return pollInterval;
}

export function getShardIterators(): Map<string, string> {
  return shardIterators;
}

export function getLastInfrastructureCheck(): number {
  return lastInfrastructureCheck;
}

export function getStats() {
  return stats;
}

// Setters
export function setIsRunning(value: boolean): void {
  isRunning = value;
}

export function setIsStopping(value: boolean): void {
  isStopping = value;
}

export function setKinesisClient(client: KinesisClient | null): void {
  kinesisClient = client;
}

export function setPollInterval(interval: NodeJS.Timeout | null): void {
  pollInterval = interval;
}

export function setLastInfrastructureCheck(time: number): void {
  lastInfrastructureCheck = time;
}

// Stats mutations
export function incrementRecordsProcessed(): void {
  stats.recordsProcessed++;
}

export function incrementErrors(): void {
  stats.errors++;
}

export function updateLastPollTime(time: number): void {
  stats.lastPollTime = time;
}

export function updateLastRecordTime(time: number): void {
  stats.lastRecordTime = time;
}

// Reset
export function resetState(): void {
  isRunning = false;
  isStopping = false;
  kinesisClient = null;
  pollInterval = null;
  shardIterators.clear();
  lastInfrastructureCheck = 0;
}

export function getConsumerStats() {
  return { ...stats, isRunning };
}
