/**
 * Infrastructure Validation
 *
 * Validation helpers and config shapes for deploy/destroy.
 */

import type { DeployConfig, DestroyConfig } from '@orion/infra';

export type { DeployConfig, DestroyConfig };

export class ValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function validateDeployConfig(
  config: DeployConfig,
): Promise<void> {
  // Check AWS credentials (either provided or using env)
  if (!config.aws?.useEnv) {
    if (!config.aws?.accessKeyId || !config.aws?.secretAccessKey) {
      throw new ValidationError('Missing required AWS credentials');
    }
  }
  
  if (!config.aws?.region) {
    throw new ValidationError('Missing required AWS region');
  }

  // Check Fastly credentials (either provided or using env)
  if (!config.fastly?.useEnv && !config.fastly?.apiToken) {
    throw new ValidationError('Missing required Fastly API token');
  }

  if (!config.backend?.graphqlUrl) {
    throw new ValidationError('Missing required GraphQL backend URL');
  }
}

export async function validateDestroyConfig(
  config: DestroyConfig,
): Promise<void> {
  if (!config.fastlyApiToken) {
    throw new ValidationError('Missing required Fastly API token');
  }

  if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
    throw new ValidationError('Missing required AWS credentials');
  }
}
