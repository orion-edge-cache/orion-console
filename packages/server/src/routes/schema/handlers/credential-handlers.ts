/**
 * Credential handlers for schema routes
 */

import type { Request, Response } from 'express';
import {
  getSavedCredentials,
  getAIKeyFromCredentials,
  getAIKeyFromEnv,
  saveAIKeyToCredentials,
  validateAPIKey,
  maskAPIKey,
  getSupportedProviders,
  type AIProvider,
} from '@orion/schema';
import { handleCaughtError } from '../utils/index.js';

/**
 * GET /api/schema/credentials/status
 * Check which AI providers have saved credentials
 */
export async function getCredentialsStatus(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const credentials = await getSavedCredentials();

    const buildStatus = (provider: AIProvider) => {
      const savedKey = credentials?.ai?.[provider] || null;
      const envKey = getAIKeyFromEnv(provider);

      const savedMasked = savedKey ? maskAPIKey(savedKey) : null;
      const envMasked = envKey ? maskAPIKey(envKey) : null;

      return {
        saved: !!savedKey,
        env: !!envKey,
        ...(savedMasked && { savedMasked, masked: savedMasked }),
        ...(envMasked && { envMasked }),
      };
    };

    const status = {
      anthropic: buildStatus('anthropic'),
      openai: buildStatus('openai'),
      gemini: buildStatus('gemini'),
      grok: buildStatus('grok'),
    };

    res.json(status);
  } catch (error) {
    handleCaughtError(res, error, 'Credentials status error');
  }
}

/**
 * POST /api/schema/credentials/resolve
 * Resolve an API key from a specific source
 */
export async function resolveCredentials(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider, source } = req.body as {
      provider?: AIProvider;
      source?: 'env' | 'saved';
    };

    if (!provider || !source) {
      res.status(400).json({
        error: 'Provider and source are required',
      });
      return;
    }

    const validProviders = getSupportedProviders();
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`,
      });
      return;
    }

    if (source !== 'env' && source !== 'saved') {
      res.status(400).json({
        error: 'Invalid source',
        message: "Source must be 'env' or 'saved'",
      });
      return;
    }

    const apiKey =
      source === 'saved'
        ? await getAIKeyFromCredentials(provider)
        : getAIKeyFromEnv(provider);

    if (!apiKey) {
      res.status(404).json({
        error: 'API key not found',
        message: `No ${source} key found for ${provider}`,
      });
      return;
    }

    res.json({
      key: apiKey,
      source,
      masked: maskAPIKey(apiKey),
    });
  } catch (error) {
    handleCaughtError(res, error, 'Credentials resolve error');
  }
}

/**
 * POST /api/schema/credentials/save
 * Save AI provider credentials
 */
export async function saveCredentials(req: Request, res: Response): Promise<void> {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({
        error: 'Provider and API key are required',
      });
      return;
    }

    // Validate provider
    const validProviders = getSupportedProviders();
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        error: 'Invalid provider',
        message: `Provider must be one of: ${validProviders.join(', ')}`,
      });
      return;
    }

    // Validate API key format
    const validation = validateAPIKey(provider, apiKey);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Invalid API key format',
        message: validation.error,
      });
      return;
    }

    // Save credentials
    await saveAIKeyToCredentials(provider, apiKey);

    res.json({
      success: true,
      message: `${provider} credentials saved successfully`,
      masked: maskAPIKey(apiKey),
    });
  } catch (error) {
    handleCaughtError(res, error, 'Save credentials error');
  }
}

/**
 * POST /api/schema/credentials/validate
 * Validate API key format without saving
 */
export async function validateCredentials(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({
        error: 'Provider and API key are required',
      });
      return;
    }

    const validation = validateAPIKey(provider, apiKey);

    res.json(validation);
  } catch (error) {
    handleCaughtError(res, error, 'Validate credentials error');
  }
}
