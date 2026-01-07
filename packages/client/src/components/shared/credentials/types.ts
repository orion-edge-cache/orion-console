export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface FastlyCredentials {
  apiToken: string;
}

export interface CredentialVerification {
  tested: boolean;
  testing: boolean;
  valid: boolean;
  error?: string;
}

export interface EnvCredentialStatus {
  detected: boolean;
  keyHint?: string;
  region?: string;
}
