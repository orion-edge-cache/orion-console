/**
 * Provider handlers for schema routes
 */

import type { Request, Response } from 'express';
import {
  PROVIDER_INFO,
  getSupportedProviders,
  getDefaultModel,
} from '@orion/schema';
import { handleCaughtError } from '../utils/index.js';

/**
 * GET /api/schema/providers
 * Get available AI providers and their info
 */
export async function getProviders(_req: Request, res: Response): Promise<void> {
  try {
    const providers = getSupportedProviders().map((provider) => ({
      id: provider,
      ...PROVIDER_INFO[provider],
      defaultModel: getDefaultModel(provider),
    }));

    res.json({ providers });
  } catch (error) {
    handleCaughtError(res, error, 'Provider info error');
  }
}
