/**
 * Endpoint utilities for schema routes
 */

import {
  terraformStateExists,
  getGraphQLEndpointFromTerraform,
  testEndpointReachability,
  fetchSchema,
  analyzeSchema,
} from '@orion/schema';

export interface EndpointResolutionResult {
  endpoint: string | null;
  error?: { status: number; body: Record<string, string> };
}

/**
 * Resolve GraphQL endpoint from request body or terraform state
 */
export async function resolveEndpoint(
  providedEndpoint?: string
): Promise<EndpointResolutionResult> {
  if (providedEndpoint) {
    // Validate URL
    try {
      new URL(providedEndpoint);
      return { endpoint: providedEndpoint };
    } catch {
      return {
        endpoint: null,
        error: { status: 400, body: { error: 'Invalid endpoint URL' } },
      };
    }
  }

  // Try to get from terraform state
  if (!terraformStateExists()) {
    return {
      endpoint: null,
      error: {
        status: 400,
        body: {
          error: 'Terraform state not found',
          message: 'Deploy infrastructure first or provide endpoint',
        },
      },
    };
  }

  const endpoint = await getGraphQLEndpointFromTerraform();

  if (!endpoint) {
    return {
      endpoint: null,
      error: {
        status: 400,
        body: {
          error: 'GraphQL endpoint not found',
          message: 'Endpoint not in terraform state and not provided',
        },
      },
    };
  }

  return { endpoint };
}

/**
 * Test and validate endpoint reachability
 */
export async function validateEndpointReachability(
  endpoint: string
): Promise<{ valid: boolean; error?: { status: number; body: Record<string, string> } }> {
  const { reachable, error: reachError } = await testEndpointReachability(endpoint);

  if (!reachable) {
    return {
      valid: false,
      error: {
        status: 400,
        body: {
          error: 'Endpoint unreachable',
          message: reachError || 'Failed to reach endpoint',
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Introspect schema and return analysis
 */
export async function introspectAndAnalyze(endpoint: string) {
  const introspectionResult = await fetchSchema({ endpoint });

  if (!introspectionResult.success || !introspectionResult.schema) {
    return {
      success: false as const,
      error: {
        status: 400,
        body: {
          error: 'Schema introspection failed',
          message: introspectionResult.error || 'Failed to fetch schema',
        },
      },
    };
  }

  const analysis = analyzeSchema(introspectionResult.schema);

  return {
    success: true as const,
    analysis,
  };
}
