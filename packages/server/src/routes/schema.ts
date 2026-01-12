/**
 * Schema Routes
 *
 * API endpoints for GraphQL schema analysis and AI-powered cache config generation.
 * Uses @orion/schema package for core functionality.
 */

import express from "express";
import {
  fetchSchema,
  analyzeSchema,
  generateCacheConfig,
  generateBasicConfig,
  getSavedCredentials,
  getAIKeyFromCredentials,
  getAIKeyFromEnv,
  saveAIKeyToCredentials,
  validateAPIKey,
  maskAPIKey,
  terraformStateExists,
  getGraphQLEndpointFromTerraform,
  testEndpointReachability,
  PROVIDER_INFO,
  getSupportedProviders,
  getDefaultModel,
  type AIProvider,
  type AIProviderConfig,
  type ConfigPreferences,
} from "@orion/schema";

const router = express.Router();

// =============================================================================
// ENDPOINT ROUTES
// =============================================================================

/**
 * GET /api/schema/endpoint
 *
 * Get GraphQL endpoint from terraform state
 */
router.get("/schema/endpoint", async (_req, res) => {
  try {
    // Check if terraform state exists
    if (!terraformStateExists()) {
      return res.status(400).json({
        error: "Terraform state not found",
        message: 'Deploy infrastructure first using "orion deploy"',
      });
    }

    // Get endpoint from terraform state
    const endpoint = await getGraphQLEndpointFromTerraform();

    if (!endpoint) {
      return res.status(400).json({
        error: "GraphQL endpoint not found in terraform state",
        message: "Check terraform outputs for compute_service.backend_domain",
      });
    }

    res.json({ endpoint, source: "terraform" });
  } catch (error) {
    console.error("Endpoint discovery error:", error);
    res.status(500).json({
      error: "Failed to get endpoint",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schema/endpoint/test
 *
 * Test if a GraphQL endpoint is reachable
 */
router.post("/schema/endpoint/test", async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required" });
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: "Invalid endpoint URL" });
    }

    const result = await testEndpointReachability(endpoint);

    res.json(result);
  } catch (error) {
    console.error("Endpoint test error:", error);
    res.status(500).json({
      error: "Failed to test endpoint",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =============================================================================
// CREDENTIAL ROUTES
// =============================================================================

/**
 * GET /api/schema/credentials/status
 *
 * Check which AI providers have saved credentials
 */
router.get("/schema/credentials/status", async (_req, res) => {
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
      anthropic: buildStatus("anthropic"),
      openai: buildStatus("openai"),
      gemini: buildStatus("gemini"),
      grok: buildStatus("grok"),
    };

    res.json(status);
  } catch (error) {
    console.error("Credentials status error:", error);
    res.status(500).json({
      error: "Failed to check credentials",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schema/credentials/resolve
 *
 * Resolve an API key from a specific source
 */
router.post("/schema/credentials/resolve", async (req, res) => {
  try {
    const { provider, source } = req.body as {
      provider?: AIProvider;
      source?: "env" | "saved";
    };

    if (!provider || !source) {
      return res.status(400).json({
        error: "Provider and source are required",
      });
    }

    const validProviders = getSupportedProviders();
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: "Invalid provider",
        message: `Provider must be one of: ${validProviders.join(", ")}`,
      });
    }

    if (source !== "env" && source !== "saved") {
      return res.status(400).json({
        error: "Invalid source",
        message: "Source must be 'env' or 'saved'",
      });
    }

    const apiKey =
      source === "saved"
        ? await getAIKeyFromCredentials(provider)
        : getAIKeyFromEnv(provider);

    if (!apiKey) {
      return res.status(404).json({
        error: "API key not found",
        message: `No ${source} key found for ${provider}`,
      });
    }

    res.json({
      key: apiKey,
      source,
      masked: maskAPIKey(apiKey),
    });
  } catch (error) {
    console.error("Credentials resolve error:", error);
    res.status(500).json({
      error: "Failed to resolve credentials",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schema/credentials/save
 *
 * Save AI provider credentials
 */
router.post("/schema/credentials/save", async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: "Provider and API key are required",
      });
    }

    // Validate provider
    const validProviders = getSupportedProviders();
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: "Invalid provider",
        message: `Provider must be one of: ${validProviders.join(", ")}`,
      });
    }

    // Validate API key format
    const validation = validateAPIKey(provider, apiKey);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid API key format",
        message: validation.error,
      });
    }

    // Save credentials
    await saveAIKeyToCredentials(provider, apiKey);

    res.json({
      success: true,
      message: `${provider} credentials saved successfully`,
      masked: maskAPIKey(apiKey),
    });
  } catch (error) {
    console.error("Save credentials error:", error);
    res.status(500).json({
      error: "Failed to save credentials",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schema/credentials/validate
 *
 * Validate API key format without saving
 */
router.post("/schema/credentials/validate", async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: "Provider and API key are required",
      });
    }

    const validation = validateAPIKey(provider, apiKey);

    res.json(validation);
  } catch (error) {
    console.error("Validate credentials error:", error);
    res.status(500).json({
      error: "Failed to validate credentials",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =============================================================================
// PROVIDER ROUTES
// =============================================================================

/**
 * GET /api/schema/providers
 *
 * Get available AI providers and their info
 */
router.get("/schema/providers", async (_req, res) => {
  try {
    const providers = getSupportedProviders().map((provider) => ({
      id: provider,
      ...PROVIDER_INFO[provider],
      defaultModel: getDefaultModel(provider),
    }));

    res.json({ providers });
  } catch (error) {
    console.error("Provider info error:", error);
    res.status(500).json({
      error: "Failed to get provider info",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =============================================================================
// SCHEMA ANALYSIS ROUTES
// =============================================================================

/**
 * POST /api/schema/analyze
 *
 * Analyze a GraphQL schema
 */
router.post("/schema/analyze", async (req, res) => {
  try {
    let { endpoint } = req.body;

    // If no endpoint provided, get from terraform state
    if (!endpoint) {
      if (!terraformStateExists()) {
        return res.status(400).json({
          error: "Terraform state not found",
          message: "Deploy infrastructure first or provide endpoint",
        });
      }

      endpoint = await getGraphQLEndpointFromTerraform();

      if (!endpoint) {
        return res.status(400).json({
          error: "GraphQL endpoint not found",
          message: "Endpoint not in terraform state and not provided",
        });
      }
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: "Invalid endpoint URL" });
    }

    // Test endpoint reachability
    const { reachable, error: reachError } =
      await testEndpointReachability(endpoint);
    if (!reachable) {
      return res.status(400).json({
        error: "Endpoint unreachable",
        message: reachError,
      });
    }

    // Fetch schema using introspection
    const introspectionResult = await fetchSchema({ endpoint });

    if (!introspectionResult.success || !introspectionResult.schema) {
      return res.status(400).json({
        error: "Schema introspection failed",
        message: introspectionResult.error || "Failed to fetch schema",
      });
    }

    // Analyze the schema
    const analysis = analyzeSchema(introspectionResult.schema);

    res.json({
      endpoint,
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Schema analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze schema",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =============================================================================
// CONFIG GENERATION ROUTES
// =============================================================================

/**
 * POST /api/schema/generate-config
 *
 * Generate cache configuration using AI
 */
router.post("/schema/generate-config", async (req, res) => {
  try {
    let { endpoint, preferences, aiProvider, useBasic } = req.body;

    // Get endpoint from terraform if not provided
    if (!endpoint) {
      if (!terraformStateExists()) {
        return res.status(400).json({
          error: "Terraform state not found",
          message: "Deploy infrastructure first or provide endpoint",
        });
      }

      endpoint = await getGraphQLEndpointFromTerraform();

      if (!endpoint) {
        return res.status(400).json({
          error: "GraphQL endpoint not found",
        });
      }
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: "Invalid endpoint URL" });
    }

    // Fetch schema using introspection
    const introspectionResult = await fetchSchema({ endpoint });

    if (!introspectionResult.success || !introspectionResult.schema) {
      return res.status(400).json({
        error: "Schema introspection failed",
        message: introspectionResult.error || "Failed to fetch schema",
      });
    }

    // Analyze the schema
    const analysis = analyzeSchema(introspectionResult.schema);

    // Generate config
    let config;
    let aiResponse;

    if (useBasic) {
      // Use heuristic-based generation (no AI)
      config = generateBasicConfig(analysis);
    } else {
      // Validate AI provider
      if (!aiProvider || !aiProvider.provider) {
        return res.status(400).json({
          error: "AI provider is required",
          message: "Select a provider or use basic generation",
        });
      }

      // Get API key from various sources
      let apiKey = aiProvider.apiKey;

      if (!apiKey) {
        // Try credentials.json first
        apiKey = await getAIKeyFromCredentials(aiProvider.provider);
      }

      if (!apiKey) {
        // Try environment variables
        apiKey = getAIKeyFromEnv(aiProvider.provider);
      }

      if (!apiKey) {
        return res.status(400).json({
          error: "API key not found",
          message: `No API key found for ${aiProvider.provider}. Provide one or save to credentials.`,
        });
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
        return res.status(500).json({
          error: "Config generation failed",
          message: result.error,
        });
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
      method: useBasic ? "heuristic" : "ai",
    });
  } catch (error) {
    console.error("Config generation error:", error);
    res.status(500).json({
      error: "Failed to generate config",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schema/generate-basic
 *
 * Generate basic cache configuration without AI (heuristic-based)
 */
router.post("/schema/generate-basic", async (req, res) => {
  try {
    let { endpoint } = req.body;

    // Get endpoint from terraform if not provided
    if (!endpoint) {
      if (!terraformStateExists()) {
        return res.status(400).json({
          error: "Terraform state not found",
          message: "Deploy infrastructure first or provide endpoint",
        });
      }

      endpoint = await getGraphQLEndpointFromTerraform();

      if (!endpoint) {
        return res.status(400).json({
          error: "GraphQL endpoint not found",
        });
      }
    }

    // Validate URL
    try {
      new URL(endpoint);
    } catch {
      return res.status(400).json({ error: "Invalid endpoint URL" });
    }

    // Fetch schema using introspection
    const introspectionResult = await fetchSchema({ endpoint });

    if (!introspectionResult.success || !introspectionResult.schema) {
      return res.status(400).json({
        error: "Schema introspection failed",
        message: introspectionResult.error || "Failed to fetch schema",
      });
    }

    // Analyze the schema
    const analysis = analyzeSchema(introspectionResult.schema);

    // Generate basic config
    const config = generateBasicConfig(analysis);

    res.json({
      endpoint,
      config,
      analysis,
      generatedAt: new Date().toISOString(),
      method: "heuristic",
    });
  } catch (error) {
    console.error("Basic config generation error:", error);
    res.status(500).json({
      error: "Failed to generate config",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
