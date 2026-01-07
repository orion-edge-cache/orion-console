/**
 * Demo App API
 *
 * Provides methods for deploying and managing the demo GraphQL app.
 */

import { API_BASE_URL } from "../utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DemoAppOutputs {
  graphqlEndpoint: string;
  s3WebsiteUrl: string;
  lambdaFunctionName: string;
  clientBucket: string;
  awsRegion: string;
}

export interface DemoAppStatus {
  deployed: boolean;
  outputs?: DemoAppOutputs;
  deployedAt?: string;
}

export interface DemoAppAwsConfig {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  useEnv?: boolean;
}

export interface DeployProgressEvent {
  step: string;
  message: string;
  progress: number;
  error?: string;
  outputs?: DemoAppOutputs;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get demo app deployment status
 */
export async function getDemoAppStatus(): Promise<DemoAppStatus> {
  const response = await fetch(`${API_BASE_URL}/demo-app/status`);
  
  if (!response.ok) {
    throw new Error("Failed to get demo app status");
  }
  
  return response.json();
}

/**
 * Deploy demo app with progress streaming
 */
export async function deployDemoApp(
  aws: DemoAppAwsConfig,
  onProgress: (event: DeployProgressEvent) => void
): Promise<DemoAppOutputs> {
  const response = await fetch(`${API_BASE_URL}/demo-app/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aws }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Deployment failed");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  let outputs: DemoAppOutputs | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data: DeployProgressEvent = JSON.parse(line.slice(6));
          onProgress(data);

          if (data.outputs) {
            outputs = data.outputs;
          }

          if (data.error) {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            // Ignore JSON parse errors for incomplete chunks
            continue;
          }
          throw e;
        }
      }
    }
  }

  if (!outputs) {
    throw new Error("Deployment completed but no outputs received");
  }

  return outputs;
}

/**
 * Destroy demo app with progress streaming
 */
export async function destroyDemoApp(
  aws: DemoAppAwsConfig,
  onProgress: (event: DeployProgressEvent) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/demo-app/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aws }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Destroy failed");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data: DeployProgressEvent = JSON.parse(line.slice(6));
          onProgress(data);

          if (data.error) {
            throw new Error(data.error);
          }
        } catch (e) {
          if (e instanceof SyntaxError) {
            continue;
          }
          throw e;
        }
      }
    }
  }
}
