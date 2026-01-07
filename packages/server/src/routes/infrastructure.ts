import express from "express";
import fs from "fs/promises";
import {
  deployInfrastructure,
  destroyInfrastructure,
  getTerraformOutputs,
  type DeployConfig,
  type DestroyConfig,
  type ProgressEvent,
} from "@orion/infra";
import {
  destroyDemoApp,
  checkDemoAppDeployed,
  type DemoAppConfig,
  type ProgressEvent as DemoProgressEvent,
} from "@orion/demo-app";
import {
  isLocked,
  getCurrentOperation,
  acquireLock,
  releaseLock,
} from "../lib/state.js";
import {
  validateDeployConfig,
  ValidationError,
} from "../lib/validation.js";
import {
  resolveDestroyConfig,
  resolveDeployConfig,
  saveDeploymentCredentials,
  saveBackendUrl,
} from "../lib/credentials.js";
import {
  setSSEHeaders,
  handleSSEProgress,
  handleSSESuccess,
  handleSSEError,
} from "../lib/sse-helpers.js";
import {
  buildResourcesList,
  BACKEND_URL_PATH,
} from "../lib/terraform-state.js";
import {
  handleInfrastructureDestroyed,
  handleInfrastructureDeployed,
} from "../kinesis/index.js";
import {
  validateCLIDependencies,
  CLIDependencyError,
} from "../lib/cli-dependencies.js";

const router = express.Router();

router.post("/infra/plan-destroy", async (_req, res) => {
  try {
    if (isLocked()) {
      return res.status(423).json({
        error: `Operation in progress: ${getCurrentOperation()}`,
      });
    }

    const outputs = await getTerraformOutputs();
    const resources = buildResourcesList(outputs);
    
    // Check if demo app is also deployed
    const hasDemoApp = checkDemoAppDeployed();

    res.json({
      resources,
      hasDemoApp,
      warning: hasDemoApp
        ? "This action cannot be undone. All data will be permanently deleted. The demo app will also be destroyed."
        : "This action cannot be undone. All data will be permanently deleted.",
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error planning destroy:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/infrastructure/deploy", async (req, res) => {
  try {
    if (isLocked()) {
      return res.status(423).json({
        error: `Operation in progress: ${getCurrentOperation()}`,
      });
    }

    // Check CLI dependencies before proceeding
    try {
      await validateCLIDependencies();
    } catch (error) {
      if (error instanceof CLIDependencyError) {
        return res.status(424).json({
          error: error.message,
          cliDependencies: error.status,
        });
      }
      throw error;
    }

    const infraConfig: DeployConfig = req.body;

    try {
      await validateDeployConfig(infraConfig);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }

    // Resolve credentials from environment if needed
    const resolvedConfig = resolveDeployConfig(infraConfig);

    const locked = await acquireLock("deploy");
    if (!locked) {
      return res.status(423).json({
        error: "Failed to acquire operation lock",
      });
    }

    if (infraConfig.saveCredentials) {
      await saveDeploymentCredentials(infraConfig);
    }

    await saveBackendUrl(infraConfig.backend.graphqlUrl);

    setSSEHeaders(res);

    deployInfrastructure(resolvedConfig, (progress: ProgressEvent) => {
      handleSSEProgress(progress, res);
    })
      .then(async () => {
        await releaseLock();
        // Fire-and-forget: start Kinesis consumer for new infrastructure
        handleInfrastructureDeployed();
        await handleSSESuccess(res, "Deployment complete!");
      })
      .catch(async (error: Error) => {
        await releaseLock();
        await handleSSEError(res, error);
      });
  } catch (error) {
    await releaseLock();
    console.error("Error deploying infrastructure:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.post("/infrastructure/destroy", async (req, res) => {
  try {
    if (isLocked()) {
      return res.status(423).json({
        error: `Operation in progress: ${getCurrentOperation()}`,
      });
    }

    // Check CLI dependencies before proceeding
    try {
      await validateCLIDependencies();
    } catch (error) {
      if (error instanceof CLIDependencyError) {
        return res.status(424).json({
          error: error.message,
          cliDependencies: error.status,
        });
      }
      throw error;
    }

    const { useSavedCredentials, ...manualConfig } = req.body;

    let destroyConfig: DestroyConfig;
    try {
      destroyConfig = await resolveDestroyConfig(
        useSavedCredentials,
        manualConfig,
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      throw error;
    }

    const locked = await acquireLock("destroy");
    if (!locked) {
      return res.status(423).json({
        error: "Failed to acquire operation lock",
      });
    }

    setSSEHeaders(res);

    // Check if demo app is deployed and destroy it first
    const hasDemoApp = checkDemoAppDeployed();
    
    const runDestroy = async () => {
      // Destroy demo app first if it exists
      if (hasDemoApp) {
        handleSSEProgress(
          { step: "demo-app", message: "Destroying demo app (will also be removed)...", progress: 5 },
          res
        );
        
        const demoAppConfig: DemoAppConfig = {
          aws: {
            accessKeyId: destroyConfig.awsAccessKeyId,
            secretAccessKey: destroyConfig.awsSecretAccessKey,
            region: destroyConfig.awsRegion,
          },
        };
        
        await destroyDemoApp(demoAppConfig, (event: DemoProgressEvent) => {
          // Map demo app progress to 5-20% range
          const mappedProgress = 5 + Math.floor(event.progress * 0.15);
          handleSSEProgress(
            { step: `demo-app-${event.step}`, message: `Demo app: ${event.message}`, progress: mappedProgress },
            res
          );
        });
        
        handleSSEProgress(
          { step: "demo-app-done", message: "Demo app destroyed", progress: 20 },
          res
        );
      }

      // Now destroy Orion infrastructure
      await destroyInfrastructure(destroyConfig, (progress: ProgressEvent) => {
        // Map Orion progress to 20-100% range (or 0-100% if no demo app)
        const mappedProgress = hasDemoApp 
          ? 20 + Math.floor(progress.progress * 0.8)
          : progress.progress;
        handleSSEProgress({ ...progress, progress: mappedProgress }, res);
      });
    };

    runDestroy()
      .then(async () => {
        await releaseLock();
        // Fire-and-forget: stop Kinesis consumer since infrastructure is gone
        handleInfrastructureDestroyed();
        await handleSSESuccess(res, "Infrastructure destroyed!", async () => {
          await fs.unlink(BACKEND_URL_PATH).catch(() => {});
        });
      })
      .catch(async (error: Error) => {
        await releaseLock();
        await handleSSEError(res, error);
      });
  } catch (error) {
    await releaseLock();
    console.error("Error destroying infrastructure:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
