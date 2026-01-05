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

    res.json({
      resources,
      warning:
        "This action cannot be undone. All data will be permanently deleted.",
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

    destroyInfrastructure(destroyConfig, (progress: ProgressEvent) => {
      handleSSEProgress(progress, res);
    })
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
