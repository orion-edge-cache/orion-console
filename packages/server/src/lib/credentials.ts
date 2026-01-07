/**
 * Credential Helpers
 *
 * Resolves and persists credentials for infrastructure operations.
 */

import fs from 'fs/promises';
import path from 'path';
import {
  getSavedCredentials,
  type SavedCredentials,
} from '../routes/credentials.js';
import {
  ValidationError,
  validateDestroyConfig,
  type DeployConfig,
  type DestroyConfig,
} from './validation.js';
import { ORION_CONFIG_DIR, BACKEND_URL_PATH } from '@orion/infra';

const DEPLOYMENT_CONFIG_PATH = path.join(ORION_CONFIG_DIR, 'deployment-config.json');

function resolveEnvDestroyConfig(): Partial<DestroyConfig> {
  const fastlyApiToken = process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  const envConfig: Partial<DestroyConfig> = {};

  if (fastlyApiToken) {
    envConfig.fastlyApiToken = fastlyApiToken;
  }
  if (awsAccessKeyId) {
    envConfig.awsAccessKeyId = awsAccessKeyId;
  }
  if (awsSecretAccessKey) {
    envConfig.awsSecretAccessKey = awsSecretAccessKey;
  }
  if (awsRegion) {
    envConfig.awsRegion = awsRegion;
  }

  return envConfig;
}

export async function resolveDestroyConfig(
  useSavedCredentials: boolean,
  manualConfig: Partial<DestroyConfig>,
): Promise<DestroyConfig> {
  if (useSavedCredentials) {
    const saved = await getSavedCredentials();
    if (!saved || !saved.aws || !saved.fastly) {
      throw new ValidationError(
        'No saved credentials found. Please provide credentials manually.',
      );
    }

    return {
      fastlyApiToken: saved.fastly.apiToken,
      awsAccessKeyId: saved.aws.accessKeyId,
      awsSecretAccessKey: saved.aws.secretAccessKey,
      awsRegion: saved.aws.region,
    };
  }

  const envConfig = resolveEnvDestroyConfig();
  const destroyConfig: DestroyConfig = {
    fastlyApiToken:
      manualConfig.fastlyApiToken || envConfig.fastlyApiToken || '',
    awsAccessKeyId:
      manualConfig.awsAccessKeyId || envConfig.awsAccessKeyId || '',
    awsSecretAccessKey:
      manualConfig.awsSecretAccessKey || envConfig.awsSecretAccessKey || '',
    awsRegion: manualConfig.awsRegion || envConfig.awsRegion || 'us-east-1',
  };

  const hasAnyCredentials =
    !!destroyConfig.fastlyApiToken &&
    !!destroyConfig.awsAccessKeyId &&
    !!destroyConfig.awsSecretAccessKey;

  if (!hasAnyCredentials) {
    throw new ValidationError(
      'No saved or environment credentials found. Please enter credentials manually.',
    );
  }

  await validateDestroyConfig(destroyConfig);
  return destroyConfig;
}

export function resolveDeployConfig(config: DeployConfig): DeployConfig {
  const resolved = { ...config };

  // Resolve AWS credentials from env if flagged
  if (config.aws.useEnv) {
    resolved.aws = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: config.aws.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    };
  }

  // Resolve Fastly credentials from env if flagged
  if (config.fastly.useEnv) {
    resolved.fastly = {
      apiToken: (process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN) || '',
    };
  }

  return resolved;
}

export async function saveDeploymentCredentials(
  config: DeployConfig,
): Promise<void> {
  try {
    const credentials: SavedCredentials = {
      savedAt: new Date().toISOString(),
    };

    // Save AWS credentials (from env or provided)
    if (config.copyFromEnv?.aws && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      credentials.aws = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: config.aws.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
      };
    } else if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      credentials.aws = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        region: config.aws.region,
      };
    }

    // Save Fastly credentials (from env or provided)
    if (config.copyFromEnv?.fastly && (process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN)) {
      credentials.fastly = {
        apiToken: (process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN)!,
      };
    } else if (config.fastly.apiToken) {
      credentials.fastly = {
        apiToken: config.fastly.apiToken,
      };
    }

    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });
    await fs.writeFile(
      DEPLOYMENT_CONFIG_PATH,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 },
    );
    console.log('Credentials saved for future operations');
  } catch (err) {
    console.error('Failed to save credentials:', err);
  }
}

export async function saveBackendUrl(graphqlUrl: string): Promise<void> {
  try {
    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });
    await fs.writeFile(BACKEND_URL_PATH, graphqlUrl);
  } catch (err) {
    console.error('Failed to save backend URL:', err);
  }
}
