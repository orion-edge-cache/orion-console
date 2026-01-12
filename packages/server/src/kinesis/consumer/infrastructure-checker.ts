/**
 * Infrastructure availability checking
 */

import fs from 'fs/promises';
import { TFSTATE_PATH } from '../client.js';

/**
 * Check if infrastructure state file exists
 */
export async function isInfrastructureAvailable(): Promise<boolean> {
  try {
    await fs.access(TFSTATE_PATH);
    return true;
  } catch {
    return false;
  }
}
