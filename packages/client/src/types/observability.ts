/**
 * Observability types
 */

export interface ObservabilityStatus {
  kinesis: {
    running: boolean;
    stats: {
      recordsProcessed: number;
      errors: number;
      lastPollTime: number;
      lastRecordTime: number;
    };
  };
  sse: {
    subscriberCount: number;
  };
}