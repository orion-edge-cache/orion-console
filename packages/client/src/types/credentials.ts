/**
 * Credentials types
 */

export interface CredentialsStatusResponse {
  saved: boolean;
  hasAws: boolean;
  hasFastly: boolean;
  savedAt?: string;
  awsKeyHint?: string;
  awsRegion?: string;
}

export interface DestroyRequirementsResponse {
  env: {
    hasAws: boolean;
    hasFastly: boolean;
    awsRegion?: string;
    awsKeyHint?: string;
  };
  required: {
    awsAccessKeyId: boolean;
    awsSecretAccessKey: boolean;
    fastlyApiToken: boolean;
  };
}

export interface SaveCredentialsRequest {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  fastly?: {
    apiToken: string;
  };
}