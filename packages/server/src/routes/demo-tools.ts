/**
 * Demo Tools Routes
 *
 * Provides endpoints for running demo tools (cache tests and analytics generator).
 * These tools are designed specifically for the Orion Demo App.
 */

import express from "express";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  executeCacheTests,
  executeAnalyticsGenerator,
  type CacheTestsResult,
  type AnalyticsResult,
} from "@orion/demo-tools";

const router = express.Router();

const TFSTATE_PATH = path.join(os.homedir(), ".config/orion/terraform.tfstate");

interface ErrorGeneratorResult {
  success: boolean;
  error4xx: { status: number; message: string } | null;
  error5xx: { status: number; message: string } | null;
}

async function getEdgeEndpoint(): Promise<string> {
  const content = await fs.readFile(TFSTATE_PATH, "utf-8");
  const state = JSON.parse(content);
  const domain = state.outputs?.cdn_service?.value?.domain_name;
  if (!domain) {
    throw new Error("Edge endpoint not found in terraform state");
  }
  return `https://${domain}`;
}

/**
 * POST /api/demo-tools/cache-tests
 * Runs cache test suites and returns results
 */
router.post("/demo-tools/cache-tests", async (_req, res) => {
  try {
    const result: CacheTestsResult = await executeCacheTests();

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("Error running cache tests:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/demo-tools/analytics
 * Runs analytics generator with specified request count
 */
router.post("/demo-tools/analytics", async (req, res) => {
  try {
    const { requestCount = 100 } = req.body as { requestCount?: number };

    // Validate request count
    if (typeof requestCount !== "number" || requestCount < 1) {
      return res.status(400).json({
        success: false,
        error: "requestCount must be a positive number",
      });
    }

    // Cap at 10000 to prevent abuse
    const cappedCount = Math.min(requestCount, 10000);

    const result: AnalyticsResult = await executeAnalyticsGenerator(cappedCount);

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("Error running analytics generator:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/demo-tools/generate-errors
 * Triggers 4xx and 5xx errors for testing analytics error tracking
 */
router.post("/demo-tools/generate-errors", async (_req, res) => {
  try {
    const edgeEndpoint = await getEdgeEndpoint();
    const result: ErrorGeneratorResult = {
      success: true,
      error4xx: null,
      error5xx: null,
    };

    // Generate 4xx error: Send malformed GraphQL query
    try {
      const response4xx = await fetch(`${edgeEndpoint}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "{ invalidSyntax" }), // Malformed query
      });
      result.error4xx = {
        status: response4xx.status,
        message: response4xx.status >= 400 && response4xx.status < 500
          ? `Successfully triggered ${response4xx.status} error`
          : `Unexpected status: ${response4xx.status}`,
      };
    } catch (error) {
      result.error4xx = {
        status: 0,
        message: error instanceof Error ? error.message : "Request failed",
      };
    }

    // Generate 5xx error: Call the /error test endpoint
    try {
      const response5xx = await fetch(`${edgeEndpoint}/error`, {
        method: "GET",
      });
      result.error5xx = {
        status: response5xx.status,
        message: response5xx.status >= 500
          ? `Successfully triggered ${response5xx.status} error`
          : `Unexpected status: ${response5xx.status}`,
      };
    } catch (error) {
      result.error5xx = {
        status: 0,
        message: error instanceof Error ? error.message : "Request failed",
      };
    }

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error generating errors:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
