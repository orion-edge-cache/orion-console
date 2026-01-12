/**
 * System State Management
 *
 * Manages the global state machine and operation locks for Orion.
 * Re-exports from modular components for backward compatibility.
 */

import type { SystemStatus } from '../types/system.js';

// Re-export types for backward compatibility
export type {
  SystemState,
  OperationType,
  SystemStatus,
  DeploymentEvent,
} from '../types/system.js';

// Re-export from modules
export {
  acquireLock,
  releaseLock,
  getCurrentOperation,
  isLocked,
  getOperationStartTime,
  cleanupStaleLock,
} from './state/lock-manager.js';

export { redactCredentials } from './state/utils.js';

// Import for internal use
import { VERSION } from './state/constants.js';
import { readTerraformState } from './state/terraform-reader.js';
import { performHealthCheck } from './state/health-checker.js';
import { getCurrentOperation, cleanupStaleLock } from './state/lock-manager.js';
import { maskUrl } from './state/utils.js';

/**
 * Determine current system state based on infrastructure and health
 */
export async function getSystemState(): Promise<SystemStatus> {
  const lastCheck = new Date().toISOString();
  const currentOperation = getCurrentOperation();

  // Check if operation is in progress
  if (currentOperation === 'deploy') {
    return buildStatus('DEPLOYING', currentOperation, lastCheck);
  }

  if (currentOperation === 'destroy') {
    return buildStatus('DESTROYING', currentOperation, lastCheck);
  }

  // Read terraform state
  const tfState = await readTerraformState();

  if (!tfState.exists) {
    await cleanupStaleLock();
    return buildStatus('IDLE', null, lastCheck);
  }

  // Perform health check
  const healthStatus = await performHealthCheck(tfState.services);
  const state = healthStatus.healthy ? 'ACTIVE' : 'DEGRADED';

  return buildStatus(state, null, lastCheck, tfState.services, tfState.backendUrl);
}

/**
 * Build a SystemStatus object
 */
function buildStatus(
  state: SystemStatus['state'],
  currentOperation: SystemStatus['currentOperation'],
  lastCheck: string,
  services?: SystemStatus['services'],
  backendUrl?: string
): SystemStatus {
  const result: SystemStatus = {
    state,
    currentOperation,
    version: VERSION,
    lastCheck,
  };

  if (services) {
    result.services = services;
  }

  const maskedUrl = maskUrl(backendUrl);
  if (maskedUrl !== undefined) {
    result.backendUrl = maskedUrl;
  }

  return result;
}
