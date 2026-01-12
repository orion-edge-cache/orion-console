/**
 * State management module exports
 */

export { ORION_CONFIG_DIR, TFSTATE_PATH, LOCK_PATH, VERSION } from './constants.js';
export { terraformStateExists, readTerraformState, type TerraformStateResult } from './terraform-reader.js';
export { performHealthCheck, type HealthCheckResult } from './health-checker.js';
export {
  acquireLock,
  releaseLock,
  getCurrentOperation,
  isLocked,
  getOperationStartTime,
  cleanupStaleLock,
} from './lock-manager.js';
export { maskUrl, redactCredentials } from './utils.js';
