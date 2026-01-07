import express from 'express';
import { getSystemState } from '../lib/state.js';
import { checkCLIDependencies } from '../lib/cli-dependencies.js';

const router = express.Router();

router.get('/status', async (_req, res) => {
  try {
    const status = await getSystemState();
    res.json(status);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      state: 'BACKEND_DOWN',
      currentOperation: null,
      version: '1.0.0',
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/infrastructure/status', async (_req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
    const TFSTATE_PATH = path.join(ORION_CONFIG_DIR, 'terraform.tfstate');

    const terraformStateExists = await fs.access(TFSTATE_PATH)
      .then(() => true)
      .catch(() => false);

    let services = {};
    if (terraformStateExists) {
      try {
        const stateContent = await fs.readFile(TFSTATE_PATH, 'utf-8');
        const state = JSON.parse(stateContent);

        const outputs = state.outputs || {};
        services = {
          cdn: outputs.cdn_service?.value?.domain_name,
          compute: outputs.compute_service?.value?.id,
          kinesis: outputs.kinesis_stream?.value?.name,
          s3: outputs.s3_bucket?.value?.name,
        };
      } catch (error) {
        console.error('Error reading terraform state:', error);
      }
    }

    res.json({
      status: {
        deployed: terraformStateExists,
        terraformStateExists,
        services: terraformStateExists ? services : undefined,
      }
    });
  } catch (error) {
    console.error('Error checking infrastructure status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check if required CLI tools (fastly, terraform) are installed
 */
router.get('/cli-dependencies', async (_req, res) => {
  try {
    const status = await checkCLIDependencies();
    res.json(status);
  } catch (error) {
    console.error('Error checking CLI dependencies:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      allInstalled: false,
      dependencies: [],
      missingCommands: [],
    });
  }
});

export default router;
