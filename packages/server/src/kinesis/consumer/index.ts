/**
 * Consumer module exports
 */

export {
  getIsRunning,
  getConsumerStats,
  setIsRunning,
  setIsStopping,
  setKinesisClient,
  setPollInterval,
  getPollInterval,
  getShardIterators,
  resetState,
} from './state.js';

export { processRecord } from './record-processor.js';
export { pollRecords } from './shard-manager.js';
export { isInfrastructureAvailable } from './infrastructure-checker.js';
