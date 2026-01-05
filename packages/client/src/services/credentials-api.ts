/**
 * Credentials API
 * 
 * Provides methods for managing AWS and Fastly credentials.
 */

import type {
  CredentialsStatusResponse,
  DestroyRequirementsResponse,
  SaveCredentialsRequest,
} from "@orion-console/shared";
import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Credentials API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if credentials are saved
 */
export async function getCredentialsStatus(): Promise<CredentialsStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/credentials`);

    if (!response.ok) {
      return { saved: false, hasAws: false, hasFastly: false };
    }

    return response.json();
  } catch {
    return { saved: false, hasAws: false, hasFastly: false };
  }
}

/**
 * Check which destroy credentials are required
 */
export async function getDestroyRequirements(): Promise<DestroyRequirementsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/credentials/destroy-requirements`);

    if (!response.ok) {
      return {
        env: { hasAws: false, hasFastly: false },
        required: {
          awsAccessKeyId: true,
          awsSecretAccessKey: true,
          fastlyApiToken: true,
        },
      };
    }

    return response.json();
  } catch {
    return {
      env: { hasAws: false, hasFastly: false },
      required: {
        awsAccessKeyId: true,
        awsSecretAccessKey: true,
        fastlyApiToken: true,
      },
    };
  }
}

/**
 * Save credentials for future operations
 */
export async function saveCredentials(
  credentials: SaveCredentialsRequest,
): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save credentials");
  }

  return response.json();
}

/**
 * Delete saved credentials
 */
export async function deleteCredentials(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/credentials`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete credentials");
  }

  return response.json();
}
