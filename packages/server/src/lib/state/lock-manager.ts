/**
 * Operation lock management
 */

import fs from 'fs/promises';
import { ORION_CONFIG_DIR, LOCK_PATH } from './constants.js';
import type { OperationType } from '../../types/system.js';

// In-memory state
let currentOperation: OperationType = null;
let operationStartTime: Date | null = null;

/**
 * Get operation start time (for timeout/metrics tracking)
 */
export function getOperationStartTime(): Date | null {
  return operationStartTime;
}

/**
 * Acquire operation lock
 * Returns true if lock acquired, false if already locked
 */
export async function acquireLock(operation: OperationType): Promise<boolean> {
  if (currentOperation !== null) {
    return false;
  }

  try {
    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      LOCK_PATH,
      JSON.stringify({
        operation,
        startTime: new Date().toISOString(),
        pid: process.pid,
      })
    );

    currentOperation = operation;
    operationStartTime = new Date();
    return true;
  } catch (error) {
    console.error('Failed to acquire lock:', error);
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

/**
 * Clean up stale lock file
 */
export async function cleanupStaleLock(): Promise<void> {
  try {
    await fs.access(LOCK_PATH);
    await fs.unlink(LOCK_PATH);
  } catch {
    // Lock doesn't exist or couldn't be removed, ignore
  }
}
