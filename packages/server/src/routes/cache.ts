/**
 * Cache Management Routes
 *
 * Provides endpoints for cache operations like purging.
 */

import express from "express";
import { getTerraformOutputs } from "@orion/infra";

const router = express.Router();

/**
 * POST /api/cache/purge
 * Purges all CDN cache via Fastly API
 */
router.post("/cache/purge", async (_req, res) => {
  try {
    // Get CDN service ID from terraform outputs
    let outputs;
    try {
      outputs = await getTerraformOutputs();
    } catch (error) {
      return res.status(404).json({
        error: "No infrastructure deployed. Deploy infrastructure first.",
      });
    }

    const cdnServiceId = outputs.cdn_service?.value?.id;

    if (!cdnServiceId) {
      return res.status(404).json({
        error: "CDN service not found. Is infrastructure deployed?",
      });
    }

    // Get Fastly API key from environment
    const fastlyToken =
      process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN;

    if (!fastlyToken) {
      return res.status(400).json({
        error:
          "FASTLY_API_KEY or FASTLY_API_TOKEN environment variable is required",
      });
    }

    // Call Fastly purge API
    const purgeResponse = await fetch(
      `https://api.fastly.com/service/${cdnServiceId}/purge_all`,
      {
        method: "POST",
        headers: {
          "Fastly-Key": fastlyToken,
        },
      },
    );

    if (!purgeResponse.ok) {
      const errorText = await purgeResponse.text();
      return res.status(purgeResponse.status).json({
        error: `Fastly API error: ${errorText}`,
      });
    }

    const result = (await purgeResponse.json()) as { status?: string };

    res.json({
      success: true,
      message: "Cache purged successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("Error purging cache:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
