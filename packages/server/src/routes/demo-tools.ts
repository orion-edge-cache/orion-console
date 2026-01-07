/**
 * Demo Tools Routes
 *
 * Provides endpoints for running demo tools (cache tests and analytics generator).
 * These tools are designed specifically for the Orion Demo App.
 */

import express from "express";
import {
  executeCacheTests,
  executeAnalyticsGenerator,
  type CacheTestsResult,
  type AnalyticsResult,
} from "@orion/demo-tools";

const router = express.Router();

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
    const { requestCount = 1000 } = req.body as { requestCount?: number };

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

export default router;
