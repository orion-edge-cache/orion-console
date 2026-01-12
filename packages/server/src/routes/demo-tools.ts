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
  type RequestResult,
} from "@orion/demo-tools";
import { recordRequest } from "../sse/metrics-aggregator.js";

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
 * POST /api/demo-tools/analytics-stream
 * Streams per-request results via SSE, updates dashboard in real-time
 */
router.post("/demo-tools/analytics-stream", async (req, res) => {
  const { requestCount = 100 } = req.body as { requestCount?: number };

  // Validate request count
  if (typeof requestCount !== "number" || requestCount < 1) {
    return res.status(400).json({
      success: false,
      error: "requestCount must be a positive number",
    });
  }

  const cappedCount = Math.min(requestCount, 10000);

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const result = await executeAnalyticsGenerator(
      cappedCount,
      undefined, // onProgress not needed
      (requestResult: RequestResult) => {
        // Feed to metrics aggregator for real-time dashboard updates
        recordRequest({
          cache_status: requestResult.cacheStatus,
          status_code: requestResult.status,
          latency_ms: requestResult.duration,
        });

        // Stream progress to client
        res.write(`data: ${JSON.stringify({ type: "progress", result: requestResult })}\n\n`);
      }
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: "complete", result })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error running streaming analytics generator:", error);
    res.write(`data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" })}\n\n`);
    res.end();
  }
});

export default router;
