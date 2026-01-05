/**
 * System State Management
 *
 * Manages the global state machine and operation locks for Orion.
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import type {
  SystemState,
  OperationType,
  SystemStatus,
} from "../types/system.js";

export type {
  SystemState,
  OperationType,
  SystemStatus,
  DeploymentEvent,
} from "../types/system.js";

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const ORION_CONFIG_DIR = path.join(os.homedir(), ".config/orion");
const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, "terraform.tfstate");
const LOCK_PATH = path.join(ORION_CONFIG_DIR, "operation.lock");

// ═══════════════════════════════════════════════════════════════════════
// Global State (in-memory)
// ═══════════════════════════════════════════════════════════════════════

let currentOperation: OperationType = null;
let operationStartTime: Date | null = null;

/**
 * Get operation start time (for timeout/metrics tracking)
 */
export function getOperationStartTime(): Date | null {
  return operationStartTime;
}

// ═══════════════════════════════════════════════════════════════════════
// Lock Management
// ═══════════════════════════════════════════════════════════════════════

/**
 * Acquire operation lock
 * Returns true if lock acquired, false if already locked
 */
export async function acquireLock(operation: OperationType): Promise<boolean> {
  if (currentOperation !== null) {
    return false;
  }

  try {
    // Also write lock file for persistence across restarts
    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      LOCK_PATH,
      JSON.stringify({
        operation,
        startTime: new Date().toISOString(),
        pid: process.pid,
      }),
    );

    currentOperation = operation;
    operationStartTime = new Date();
    return true;
  } catch (error) {
    console.error("Failed to acquire lock:", error);
    return false;
  }
}

/**
 * Release operation lock
 */
export async function releaseLock(): Promise<void> {
  currentOperation = null;
  operationStartTime = null;

  try {
    await fs.unlink(LOCK_PATH).catch(() => {});
  } catch {
    // Ignore errors
  }
}

/**
 * Get current operation
 */
export function getCurrentOperation(): OperationType {
  return currentOperation;
}

/**
 * Check if an operation is in progress
 */
export function isLocked(): boolean {
  return currentOperation !== null;
}

// ═══════════════════════════════════════════════════════════════════════
// State Detection
// ═══════════════════════════════════════════════════════════════════════

/**
 * Determine current system state based on infrastructure and health
 */
export async function getSystemState(): Promise<SystemStatus> {
  const version = "1.0.0";
  const lastCheck = new Date().toISOString();

  // Check if operation is in progress
  if (currentOperation === "deploy") {
    return {
      state: "DEPLOYING",
      currentOperation,
      version,
      lastCheck,
    };
  }

  if (currentOperation === "destroy") {
    return {
      state: "DESTROYING",
      currentOperation,
      version,
      lastCheck,
    };
  }

  // Check if terraform state exists
  const terraformExists = await fs
    .access(TFSTATE_PATH)
    .then(() => true)
    .catch(() => false);

  if (!terraformExists) {
    // Check for stale lock file on startup
    const lockExists = await fs
      .access(LOCK_PATH)
      .then(() => true)
      .catch(() => false);

    if (lockExists) {
      // Clean up stale lock
      await fs.unlink(LOCK_PATH).catch(() => {});
    }

    return {
      state: "IDLE",
      currentOperation: null,
      version,
      lastCheck,
    };
  }

  // Read terraform state for service info
  let services: SystemStatus["services"] = {};
  let backendUrl: string | undefined;

  try {
    const stateContent = await fs.readFile(TFSTATE_PATH, "utf-8");
    const state = JSON.parse(stateContent);
    const outputs = state.outputs || {};

    services = {
      cdn: outputs.cdn_service?.value?.domain_name,
      compute: outputs.compute_service?.value?.id,
      kinesis: outputs.kinesis_stream?.value?.name,
      s3: outputs.s3_bucket?.value?.name,
    };

    // Get backend URL from state if available
    backendUrl = outputs.backend_url?.value;
  } catch (error) {
    console.error("Error reading terraform state:", error);
  }

  // Perform health check
  const healthStatus = await performHealthCheck(services);

  const maskedBackendUrl = maskUrl(backendUrl);

  if (!healthStatus.healthy) {
    const result: SystemStatus = {
      state: "DEGRADED",
      currentOperation: null,
      version,
      lastCheck,
      services,
    };
    if (maskedBackendUrl !== undefined) result.backendUrl = maskedBackendUrl;
    return result;
  }

  const result: SystemStatus = {
    state: "ACTIVE",
    currentOperation: null,
    version,
    lastCheck,
    services,
  };
  if (maskedBackendUrl !== undefined) result.backendUrl = maskedBackendUrl;
  return result;
}

// ═══════════════════════════════════════════════════════════════════════
// Health Checks
// ═══════════════════════════════════════════════════════════════════════

interface HealthCheckResult {
  healthy: boolean;
  cdn?: boolean;
}

async function performHealthCheck(
  services?: SystemStatus["services"],
): Promise<HealthCheckResult> {
  const results: HealthCheckResult = {
    healthy: true,
  };

  // Check CDN if available
  if (services?.cdn) {
    try {
      const cdnRes = await fetch(`https://${services.cdn}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      results.cdn = cdnRes.ok;
    } catch {
      results.cdn = false;
    }
  }

  // Consider healthy if we got here
  results.healthy = true;

  return results;
}

// ═══════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════

/**
 * Mask sensitive parts of URL for display
 */
function maskUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    // Mask password if present
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Redact credentials from log messages
 */
export function redactCredentials(message: string): string {
  // Redact AWS Access Key IDs (AKIA...)
  let redacted = message.replace(/AKIA[A-Z0-9]{16}/g, "AKIA***REDACTED***");

  // Redact AWS Secret Keys (40 char base64-ish strings after common patterns)
  redacted = redacted.replace(
    /(secret[_-]?access[_-]?key["']?\s*[=:]\s*["']?)([A-Za-z0-9/+=]{40})/gi,
    "$1***REDACTED***",
  );

  // Redact Fastly API tokens (32 char hex strings)
  redacted = redacted.replace(
    /(fastly[_-]?api[_-]?key["']?\s*[=:]\s*["']?)([a-fA-F0-9]{32})/gi,
    "$1***REDACTED***",
  );

  // Redact generic API tokens/keys
  redacted = redacted.replace(
    /(api[_-]?token["']?\s*[=:]\s*["']?)([A-Za-z0-9_-]{20,})/gi,
    "$1***REDACTED***",
  );

  return redacted;
}
