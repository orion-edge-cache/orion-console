/**
 * Terraform State Helpers
 */

import fs from 'fs/promises';
import { ValidationError } from './validation.js';
import { ORION_CONFIG_DIR, TFSTATE_PATH, BACKEND_URL_PATH } from '@orion/infra';

export { BACKEND_URL_PATH };

export interface Resource {
  type: string;
  name: string;
  provider: string;
}

export async function getTerraformState(): Promise<Record<string, any>> {
  const stateExists = await fs
    .access(TFSTATE_PATH)
    .then(() => true)
    .catch(() => false);

  if (!stateExists) {
    throw new ValidationError('No infrastructure deployed', 404);
  }

  const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8');
  const state = JSON.parse(stateContent);
  return state.outputs || {};
}

export function buildResourcesList(outputs: Record<string, any>): Resource[] {
  const resources: Resource[] = [];
  const acronyms = ['cdn', 'iam', 's3', 'api'];

  for (const key of Object.keys(outputs)) {
    const value = outputs[key]?.value;
    if (!value) continue;

    let typePrefix = '';
    if (value.arn) {
      typePrefix = 'AWS';
    } else if (value.id) {
      typePrefix = 'Fastly';
    } else {
      continue;
    }

    const titleizedKey = key
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => {
        const lower = word.toLowerCase();
        if (acronyms.includes(lower)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    const type = typePrefix ? `${typePrefix} ${titleizedKey}` : titleizedKey;
    const name = value.domain_name || value.name || value.id || value.arn;

    if (!name) continue;

    const provider = value.arn ? 'aws' : 'fastly';
    resources.push({ type, name, provider });
  }

  return resources;
}
