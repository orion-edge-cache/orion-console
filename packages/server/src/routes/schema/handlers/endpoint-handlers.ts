/**
 * Endpoint handlers for schema routes
 */

import type { Request, Response } from 'express';
import {
  terraformStateExists,
  getGraphQLEndpointFromTerraform,
  testEndpointReachability,
} from '@orion/schema';
import { handleCaughtError } from '../utils/index.js';

/**
 * GET /api/schema/endpoint
 * Get GraphQL endpoint from terraform state
 */
export async function getEndpoint(_req: Request, res: Response): Promise<void> {
  try {
    if (!terraformStateExists()) {
      res.status(400).json({
        error: 'Terraform state not found',
        message: 'Deploy infrastructure first using "orion deploy"',
      });
      return;
    }

    const endpoint = await getGraphQLEndpointFromTerraform();

    if (!endpoint) {
      res.status(400).json({
        error: 'GraphQL endpoint not found in terraform state',
        message: 'Check terraform outputs for compute_service.backend_domain',
      });
      return;
    }

    res.json({ endpoint, source: 'terraform' });
  } catch (error) {
    handleCaughtError(res, error, 'Endpoint discovery error');
  }
}

/**
 * POST /api/schema/endpoint/test
 * Test if a GraphQL endpoint is reachable
 */
export async function testEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ error: 'Endpoint is required' });
      return;
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      res.status(400).json({ error: 'Invalid endpoint URL' });
      return;
    }

    const result = await testEndpointReachability(endpoint);

    res.json(result);
  } catch (error) {
    handleCaughtError(res, error, 'Endpoint test error');
  }
}
