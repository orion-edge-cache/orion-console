/**
 * Terraform state reading utilities
 */

import fs from 'fs/promises';
import { TFSTATE_PATH } from './constants.js';
import type { SystemStatus } from '../../types/system.js';

export interface TerraformStateResult {
  exists: boolean;
  services?: SystemStatus['services'];
  backendUrl?: string;
}

/**
 * Check if terraform state file exists
 */
export async function terraformStateExists(): Promise<boolean> {
  try {
    await fs.access(TFSTATE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read terraform state and extract service information
 */
export async function readTerraformState(): Promise<TerraformStateResult> {
  const exists = await terraformStateExists();

  if (!exists) {
    return { exists: false };
  }

  try {
    const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8');
    const state = JSON.parse(stateContent);
    const outputs = state.outputs || {};

    const services: SystemStatus['services'] = {
      cdn: outputs.cdn_service?.value?.domain_name,
      compute: outputs.compute_service?.value?.id,
      kinesis: outputs.kinesis_stream?.value?.name,
      s3: outputs.s3_bucket?.value?.name,
    };

    const backendUrl = outputs.backend_url?.value;

    return { exists: true, services, backendUrl };
  } catch (error) {
    console.error('Error reading terraform state:', error);
    return { exists: true, services: {} };
  }
}
