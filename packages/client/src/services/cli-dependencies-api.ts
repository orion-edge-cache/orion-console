/**
 * CLI Dependencies API
 *
 * Provides methods for checking if required CLI tools are installed.
 */

import { API_BASE_URL } from "../utils";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface CLIDependency {
  name: string;
  command: string;
  versionFlag: string;
  installed: boolean;
  version?: string;
  error?: string;
}

export interface CLIDependencyStatus {
  allInstalled: boolean;
  dependencies: CLIDependency[];
  missingCommands: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// CLI Dependencies API
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if required CLI tools (fastly, terraform) are installed
 */
export async function checkCLIDependencies(): Promise<CLIDependencyStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/cli-dependencies`);

    if (!response.ok) {
      return {
        allInstalled: false,
        dependencies: [],
        missingCommands: ["Unknown"],
      };
    }

    return response.json();
  } catch (error) {
    return {
      allInstalled: false,
      dependencies: [],
      missingCommands: ["Unable to check"],
    };
  }
}
