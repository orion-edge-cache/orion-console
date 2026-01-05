import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import type { OrionConfig } from '../types/config.js';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '../../../orion.config.ts');

const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
const ORION_CONFIG_JSON_PATH = path.join(ORION_CONFIG_DIR, 'config.json');
const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, 'terraform.tfstate');
const CREDENTIALS_PATH = path.join(ORION_CONFIG_DIR, 'credentials.json');

interface SavedCredentials {
  fastly?: {
    apiToken: string;
  };
}

async function loadConfig(): Promise<OrionConfig | null> {
  try {
    const jsonExists = await fs.access(ORION_CONFIG_JSON_PATH)
      .then(() => true)
      .catch(() => false);

    if (jsonExists) {
      const content = await fs.readFile(ORION_CONFIG_JSON_PATH, 'utf-8');
      return JSON.parse(content);
    }

    const tsExists = await fs.access(CONFIG_PATH)
      .then(() => true)
      .catch(() => false);

    if (tsExists) {
      const content = await fs.readFile(CONFIG_PATH, 'utf-8');
      return parseConfigFileTs(content);
    }

    return null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

function parseConfigFileTs(content: string): OrionConfig {
  let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/\/\/.*/g, '');

  const configMatch = cleaned.match(/const\s+config\s*=\s*(\{[\s\S]*?\});/);

  if (!configMatch || !configMatch[1]) {
    throw new Error('Could not parse config file');
  }

  const jsonStr = configMatch[1]
    .replace(/(\w+):/g, '"$1":')
    .replace(/'/g, '"')
    .replace(/,(\s*[}\]])/g, '$1');

  return JSON.parse(jsonStr);
}

function generateConfigFile(config: OrionConfig): string {
  return `/**
 * ORION Cache Configuration
 *
 * This file defines caching rules, TTLs, and invalidation mappings
 * for your GraphQL edge cache.
 */

const config = ${JSON.stringify(config, null, 2)};

export default config;
`;
}

function validateConfig(config: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!config.version) {
    errors.push('Missing required field: version');
  }

  if (!config.name) {
    errors.push('Missing required field: name');
  }

  if (!config.defaults) {
    errors.push('Missing required field: defaults');
  } else {
    if (typeof config.defaults.maxAge !== 'number') {
      errors.push('defaults.maxAge must be a number');
    }
  }

  if (config.rules && !Array.isArray(config.rules)) {
    errors.push('rules must be an array');
  }

  if (config.invalidations && typeof config.invalidations !== 'object') {
    errors.push('invalidations must be an object');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}

async function saveConfigJson(config: OrionConfig): Promise<boolean> {
  try {
    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });
    const jsonContent = JSON.stringify(config, null, 2);
    await fs.writeFile(ORION_CONFIG_JSON_PATH, jsonContent, 'utf-8');
    console.log('Config saved to JSON file');
    return true;
  } catch (error) {
    console.error('Error saving config to JSON file:', error);
    return false;
  }
}

async function updateFastlyConfigStore(config: OrionConfig): Promise<boolean> {
  try {
    const stateExists = await fs.access(TFSTATE_PATH).then(() => true).catch(() => false);
    if (!stateExists) {
      console.log('No terraform state found, skipping ConfigStore update');
      return false;
    }

    const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8');
    const state = JSON.parse(stateContent);

    const configStoreId = state.outputs?.configstore?.value?.id;
    if (!configStoreId) {
      console.log('No ConfigStore ID in terraform state');
      return false;
    }

    let fastlyApiKey = process.env.FASTLY_API_KEY;
    if (!fastlyApiKey) {
      try {
        const credsContent = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
        const creds = JSON.parse(credsContent) as SavedCredentials;
        fastlyApiKey = creds.fastly?.apiToken;
      } catch {
        // Credentials file not found
      }
    }
    if (!fastlyApiKey) {
      console.error('FASTLY_API_KEY not set, cannot update ConfigStore');
      return false;
    }

    const cacheConfig = {
      version: config.version,
      name: config.name,
      defaults: config.defaults,
      rules: config.rules || [],
      invalidations: config.invalidations || {},
    };

    const response = await fetch(
      `https://api.fastly.com/resources/stores/config/${configStoreId}/item/CACHE_CONFIG_JSON`,
      {
        method: 'PUT',
        headers: {
          'Fastly-Key': fastlyApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ item_value: JSON.stringify(cacheConfig) }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to update ConfigStore:', response.status, errorText);
      return false;
    }

    console.log('ConfigStore updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating ConfigStore:', error);
    return false;
  }
}

router.get('/config', async (_req, res) => {
  try {
    const config = await loadConfig();

    if (!config) {
      return res.json({ exists: false, config: null });
    }

    res.json({ exists: true, config });
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/config', async (req, res) => {
  try {
    const config: OrionConfig = req.body;

    const validation = validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid configuration',
        errors: validation.errors
      });
    }

    await saveConfigJson(config);

    const tsContent = generateConfigFile(config);
    await fs.writeFile(CONFIG_PATH, tsContent, 'utf-8');

    const configStoreUpdated = await updateFastlyConfigStore(config);

    res.json({
      success: true,
      configStoreUpdated,
      message: configStoreUpdated
        ? 'Config saved locally and synced to Fastly edge'
        : 'Config saved locally (infrastructure not deployed)'
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
