/**
 * useSystemState Hook
 *
 * Polls /api/status to determine the current system state.
 * Drives the root router and global UI behavior.
 */

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../utils";
import { SYSTEM_STATE_FETCH_INTERVAL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Types (must match server/state.ts)
// ═══════════════════════════════════════════════════════════════════════

export type SystemState =
  | "IDLE"
  | "CHECKING"
  | "DEPLOYING"
  | "ACTIVE"
  | "DEGRADED"
  | "DESTROYING"
  | "BACKEND_DOWN";

export type OperationType = "deploy" | "destroy" | "repair" | null;

export interface SystemStatus {
  state: SystemState;
  currentOperation: OperationType;
  version: string;
  backendUrl?: string;
  lastCheck: string;
  services?: {
    cdn?: string;
    compute?: string;
    kinesis?: string;
    s3?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// API Function
// ═══════════════════════════════════════════════════════════════════════

async function fetchSystemStatus(): Promise<SystemStatus> {
  const response = await fetch(`${API_BASE_URL}/status`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch status: ${response.statusText}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════

interface UseSystemStateOptions {
  /**
   * Polling interval in milliseconds (default: 5000)
   */
  refetchInterval?: number;
  /**
   * Whether to pause polling when window is not focused
   */
  refetchOnWindowFocus?: boolean;
}

export function useSystemState(options: UseSystemStateOptions = {}) {
  const {
    refetchInterval = SYSTEM_STATE_FETCH_INTERVAL,
    refetchOnWindowFocus = true,
  } = options;

  const query = useQuery({
    queryKey: ["system-status"],
    queryFn: fetchSystemStatus,
    refetchInterval,
    refetchOnWindowFocus,
    retry: 1,
    staleTime: 2000,
    // On error, return a BACKEND_DOWN state
    placeholderData: {
      state: "CHECKING" as SystemState,
      currentOperation: null,
      version: "1.0.0",
      lastCheck: new Date().toISOString(),
    },
  });

  // Determine effective state (handle error case)
  const state: SystemState = query.error
    ? "BACKEND_DOWN"
    : (query.data?.state ?? "CHECKING");

  const isLocked = query.data?.currentOperation !== null;

  return {
    // Query state
    ...query,
    // Convenience accessors
    state,
    status: query.data,
    isLocked,
    currentOperation: query.data?.currentOperation ?? null,
    services: query.data?.services,
    version: query.data?.version ?? "1.0.0",
    // State checks
    isIdle: state === "IDLE",
    isActive: state === "ACTIVE",
    isDegraded: state === "DEGRADED",
    isDeploying: state === "DEPLOYING",
    isDestroying: state === "DESTROYING",
    isBackendDown: state === "BACKEND_DOWN",
    // Helper for disabling mutations
    canMutate: !isLocked && state !== "BACKEND_DOWN",
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Verify Credentials API
// ═══════════════════════════════════════════════════════════════════════

export interface VerifyCredsRequest {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  fastly?: {
    apiToken: string;
  };
  useEnvCredentials?: {
    aws?: boolean;
    fastly?: boolean;
  };
}

export interface VerifyCredsResponse {
  success: boolean;
  aws: boolean;
  fastly: boolean;
  errors: string[];
}

export async function verifyCredentials(
  creds: VerifyCredsRequest,
): Promise<VerifyCredsResponse> {
  const response = await fetch(`${API_BASE_URL}/verify-creds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
    signal: AbortSignal.timeout(15000),
  });

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════
// Plan Destroy API
// ═══════════════════════════════════════════════════════════════════════

export interface DestroyPlan {
  resources: Array<{
    type: string;
    name: string;
    provider: string;
  }>;
  warning: string;
}

export async function planDestroy(): Promise<DestroyPlan> {
  const response = await fetch(`${API_BASE_URL}/infra/plan-destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to plan destroy");
  }

  return response.json();
}
