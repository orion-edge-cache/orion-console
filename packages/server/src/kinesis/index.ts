/**
 * Kinesis Module Index
 *
 * Re-exports all Kinesis functionality and handles auto-start.
 */

// Export consumer functions
export {
  startConsumer,
  stopConsumer,
  isConsumerRunning,
  getConsumerStats,
  handleInfrastructureDestroyed,
  handleInfrastructureDeployed,
} from "./lifecycle.js";

export {
  getStreamName,
  getCredentials,
  createKinesisClient,
  initializeShardIterators,
  isInfrastructureAvailable,
} from "./aws-setup.js";

// ═══════════════════════════════════════════════════════════════════════
// Auto-start with retry
// ═══════════════════════════════════════════════════════════════════════

import { isInfrastructureAvailable } from "./aws-setup.js";
import { startConsumer, isConsumerRunning } from "./lifecycle.js";

let autoStartAttempts = 0;
let autoStartTimer: NodeJS.Timeout | null = null;

/**
 * Attempt to auto-start the Kinesis consumer.
 * Will retry indefinitely every 10 seconds until infrastructure is available.
 */
async function attemptAutoStart(): Promise<void> {
  if (isConsumerRunning()) return; // Already running

  autoStartAttempts++;

  // Check if infrastructure is available before attempting to start
  const infraAvailable = await isInfrastructureAvailable();
  if (!infraAvailable) {
    // No infrastructure, schedule retry
    if (autoStartAttempts === 1) {
      console.log(
        "[Kinesis] No infrastructure detected, waiting for deployment",
      );
    }
    autoStartTimer = setTimeout(attemptAutoStart, 10000);
    return;
  }

  const started = await startConsumer();

  if (!started) {
    // Failed to start but infrastructure exists, retry
    if (autoStartAttempts === 1) {
      console.log(
        "[Kinesis] Consumer not started (missing credentials or stream error)",
      );
      console.log("[Kinesis] Will retry every 10s until consumer starts");
    }
    autoStartTimer = setTimeout(attemptAutoStart, 10000);
  } else {
    console.log(`[Kinesis] Auto-started after ${autoStartAttempts} attempt(s)`);
    autoStartAttempts = 0; // Reset for next cycle
  }
}

/**
 * Reset auto-start state and trigger immediate start attempt.
 * Called when infrastructure is deployed.
 */
export function triggerAutoStart(): void {
  // Clear any pending retry timer
  if (autoStartTimer) {
    clearTimeout(autoStartTimer);
    autoStartTimer = null;
  }
  autoStartAttempts = 0;
  // Attempt to start immediately
  attemptAutoStart();
}

// Initial attempt after server initialization
setTimeout(attemptAutoStart, 2000);

// Aliases for manual control
export { startConsumer as start, stopConsumer as stop } from "./lifecycle.js";
