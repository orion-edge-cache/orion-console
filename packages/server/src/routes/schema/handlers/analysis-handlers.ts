/**
 * Analysis and config generation handlers for schema routes
 */

import type { Request, Response } from 'express';
import {
  generateCacheConfig,
  generateBasicConfig,
  getAIKeyFromCredentials,
  getAIKeyFromEnv,
  type AIProviderConfig,
  type ConfigPreferences,
} from '@orion/schema';
import {
  resolveEndpoint,
  validateEndpointReachability,
  introspectAndAnalyze,
  handleCaughtError,
} from '../utils/index.js';

/**
 * POST /api/schema/analyze
 * Analyze a GraphQL schema
 */
export async function analyzeSchemaHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { endpoint: providedEndpoint } = req.body;

    // Resolve endpoint
    const endpointResult = await resolveEndpoint(providedEndpoint);
    if (endpointResult.error) {
      res.status(endpointResult.error.status).json(endpointResult.error.body);
      return;
    }
    const endpoint = endpointResult.endpoint!;

    // Validate reachability
    const reachabilityResult = await validateEndpointReachability(endpoint);
    if (reachabilityResult.error) {
      res.status(reachabilityResult.error.status).json(reachabilityResult.error.body);
      return;
    }

    // Introspect and analyze
    const analysisResult = await introspectAndAnalyze(endpoint);
    if (!analysisResult.success) {
      res.status(analysisResult.error.status).json(analysisResult.error.body);
      return;
    }

    res.json({
      endpoint,
      analysis: analysisResult.analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleCaughtError(res, error, 'Schema analysis error');
  }
}

/**
 * POST /api/schema/generate-config
 * Generate cache configuration using AI
 */
export async function generateConfigHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { endpoint: providedEndpoint, preferences, aiProvider, useBasic } = req.body;

    // Resolve endpoint
    const endpointResult = await resolveEndpoint(providedEndpoint);
    if (endpointResult.error) {
      res.status(endpointResult.error.status).json(endpointResult.error.body);
      return;
    }
    const endpoint = endpointResult.endpoint!;

    // Introspect and analyze
    const analysisResult = await introspectAndAnalyze(endpoint);
    if (!analysisResult.success) {
      res.status(analysisResult.error.status).json(analysisResult.error.body);
      return;
    }

    const analysis = analysisResult.analysis;
    let config;
    let aiResponse;

    if (useBasic) {
      // Use heuristic-based generation (no AI)
      config = generateBasicConfig(analysis);
    } else {
      // Validate AI provider
      if (!aiProvider || !aiProvider.provider) {
        res.status(400).json({
          error: 'AI provider is required',
          message: 'Select a provider or use basic generation',
        });
        return;
      }

      // Get API key from various sources
      let apiKey = aiProvider.apiKey;

      if (!apiKey) {
        apiKey = await getAIKeyFromCredentials(aiProvider.provider);
      }

      if (!apiKey) {
        apiKey = getAIKeyFromEnv(aiProvider.provider);
      }

      if (!apiKey) {
        res.status(400).json({
          error: 'API key not found',
          message: `No API key found for ${aiProvider.provider}. Provide one or save to credentials.`,
        });
        return;
      }

      // Build AI config
      const aiConfig: AIProviderConfig = {
        provider: aiProvider.provider,
        apiKey,
        model: aiProvider.model,
      };

      // Generate config with AI
      const result = await generateCacheConfig({
        schema: analysis,
        aiConfig,
        preferences: preferences as ConfigPreferences,
      });

      if (!result.success) {
        res.status(500).json({
          error: 'Config generation failed',
          message: result.error,
        });
        return;
      }

      config = result.config;
      aiResponse = result.aiResponse;
    }

    res.json({
      endpoint,
      config,
      analysis,
      aiResponse,
      generatedAt: new Date().toISOString(),
      method: useBasic ? 'heuristic' : 'ai',
    });
  } catch (error) {
    handleCaughtError(res, error, 'Config generation error');
  }
}

/**
 * POST /api/schema/generate-basic
 * Generate basic cache configuration without AI (heuristic-based)
 */
export async function generateBasicHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { endpoint: providedEndpoint } = req.body;

    // Resolve endpoint
    const endpointResult = await resolveEndpoint(providedEndpoint);
    if (endpointResult.error) {
      res.status(endpointResult.error.status).json(endpointResult.error.body);
      return;
    }
    const endpoint = endpointResult.endpoint!;

    // Introspect and analyze
    const analysisResult = await introspectAndAnalyze(endpoint);
    if (!analysisResult.success) {
      res.status(analysisResult.error.status).json(analysisResult.error.body);
      return;
    }

    // Generate basic config
    const config = generateBasicConfig(analysisResult.analysis);

    res.json({
      endpoint,
      config,
      analysis: analysisResult.analysis,
      generatedAt: new Date().toISOString(),
      method: 'heuristic',
    });
  } catch (error) {
    handleCaughtError(res, error, 'Basic config generation error');
  }
}
