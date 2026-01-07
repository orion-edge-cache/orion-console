/**
 * Demo App Routes
 *
 * Provides endpoints for deploying and managing the demo GraphQL app.
 */

import express from "express";
import {
  deployDemoApp,
  destroyDemoApp,
  getDemoAppStatus,
  checkDemoAppDeployed,
  type DemoAppConfig,
  type ProgressEvent,
} from "@orion/demo-app";

const router = express.Router();

/**
 * GET /api/demo-app/status
 * Returns the current deployment status of the demo app
 */
router.get("/demo-app/status", async (_req, res) => {
  try {
    const status = await getDemoAppStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting demo app status:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/demo-app/deploy
 * Deploys the demo app to AWS Lambda
 * Streams progress via SSE
 */
router.post("/demo-app/deploy", async (req, res) => {
  const { aws } = req.body;

  // Validate request
  if (!aws || !aws.region) {
    return res.status(400).json({
      error: "AWS configuration with region is required",
    });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const config: DemoAppConfig = {
      aws: {
        accessKeyId: aws.useEnv ? undefined : aws.accessKeyId,
        secretAccessKey: aws.useEnv ? undefined : aws.secretAccessKey,
        region: aws.region,
        useEnv: aws.useEnv || false,
      },
    };

    const outputs = await deployDemoApp(config, (event: ProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Send final success event with outputs
    res.write(
      `data: ${JSON.stringify({
        step: "done",
        message: "Deployment complete!",
        progress: 100,
        outputs,
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("Error deploying demo app:", error);
    res.write(
      `data: ${JSON.stringify({
        step: "error",
        message: error instanceof Error ? error.message : "Deployment failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`
    );
    res.end();
  }
});

/**
 * POST /api/demo-app/destroy
 * Destroys the demo app AWS resources
 * Streams progress via SSE
 */
router.post("/demo-app/destroy", async (req, res) => {
  const { aws } = req.body;

  // Validate request
  if (!aws || !aws.region) {
    return res.status(400).json({
      error: "AWS configuration with region is required",
    });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const config: DemoAppConfig = {
      aws: {
        accessKeyId: aws.useEnv ? undefined : aws.accessKeyId,
        secretAccessKey: aws.useEnv ? undefined : aws.secretAccessKey,
        region: aws.region,
        useEnv: aws.useEnv || false,
      },
    };

    await destroyDemoApp(config, (event: ProgressEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Send final success event
    res.write(
      `data: ${JSON.stringify({
        step: "done",
        message: "Demo app destroyed",
        progress: 100,
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("Error destroying demo app:", error);
    res.write(
      `data: ${JSON.stringify({
        step: "error",
        message: error instanceof Error ? error.message : "Destroy failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`
    );
    res.end();
  }
});

export default router;
