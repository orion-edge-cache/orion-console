import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();

const ORION_CONFIG_DIR = path.join(os.homedir(), '.config/orion');
const DEPLOYMENT_CONFIG_PATH = path.join(ORION_CONFIG_DIR, 'deployment-config.json');

interface SavedCredentials {
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  fastly?: {
    apiToken: string;
  };
  savedAt: string;
}

async function getSavedCredentials(): Promise<SavedCredentials | null> {
  try {
    const content = await fs.readFile(DEPLOYMENT_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

router.post('/verify-creds', async (req, res) => {
  try {
    const { aws, fastly, useEnvCredentials } = req.body;
    const results: { aws: boolean; fastly: boolean; errors: string[] } = {
      aws: false,
      fastly: false,
      errors: [],
    };

    // Resolve AWS credentials (from env or request)
    const awsCreds = useEnvCredentials?.aws
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: aws?.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
        }
      : aws;

    // Resolve Fastly credentials (from env or request)
    const fastlyCreds = useEnvCredentials?.fastly
      ? { apiToken: process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN }
      : fastly;

    if (awsCreds?.accessKeyId && awsCreds?.secretAccessKey) {
      try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
        const stsClient = new STSClient({
          region: awsCreds.region || 'us-east-1',
          credentials: {
            accessKeyId: awsCreds.accessKeyId,
            secretAccessKey: awsCreds.secretAccessKey,
          },
        });
        await stsClient.send(new GetCallerIdentityCommand({}));
        results.aws = true;
      } catch (error) {
        results.errors.push(`AWS: ${error instanceof Error ? error.message : 'Invalid credentials'}`);
      }
    } else {
      results.errors.push('AWS: Missing accessKeyId or secretAccessKey');
    }

    if (fastlyCreds?.apiToken) {
      try {
        const response = await fetch('https://api.fastly.com/current_user', {
          headers: { 'Fastly-Key': fastlyCreds.apiToken },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          results.fastly = true;
        } else {
          results.errors.push(`Fastly: API returned ${response.status}`);
        }
      } catch (error) {
        results.errors.push(`Fastly: ${error instanceof Error ? error.message : 'Connection failed'}`);
      }
    } else {
      results.errors.push('Fastly: Missing apiToken');
    }

    const success = results.aws && results.fastly;
    res.status(success ? 200 : 400).json({
      success,
      ...results,
    });
  } catch (error) {
    console.error('Error verifying credentials:', error);
    res.status(500).json({
      success: false,
      aws: false,
      fastly: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    });
  }
});

router.post('/credentials', async (req, res) => {
  try {
    const { aws, fastly, copyFromEnv } = req.body;

    const credentials: SavedCredentials = {
      savedAt: new Date().toISOString(),
    };

    // AWS: copy from env or use provided
    if (copyFromEnv?.aws && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      credentials.aws = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: aws?.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
      };
    } else if (aws?.accessKeyId && aws?.secretAccessKey) {
      credentials.aws = {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
        region: aws.region || 'us-east-1',
      };
    }

    // Fastly: copy from env or use provided
    if (copyFromEnv?.fastly && (process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN)) {
      credentials.fastly = {
        apiToken: (process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN)!,
      };
    } else if (fastly?.apiToken) {
      credentials.fastly = {
        apiToken: fastly.apiToken,
      };
    }

    await fs.mkdir(ORION_CONFIG_DIR, { recursive: true });

    await fs.writeFile(
      DEPLOYMENT_CONFIG_PATH,
      JSON.stringify(credentials, null, 2),
      { mode: 0o600 }
    );

    res.json({
      success: true,
      message: 'Credentials saved locally',
      hasAws: !!credentials.aws,
      hasFastly: !!credentials.fastly,
    });
  } catch (error) {
    console.error('Error saving credentials:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/credentials', async (_req, res) => {
  try {
    const exists = await fs.access(DEPLOYMENT_CONFIG_PATH)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return res.json({
        saved: false,
        hasAws: false,
        hasFastly: false,
      });
    }

    const content = await fs.readFile(DEPLOYMENT_CONFIG_PATH, 'utf-8');
    const credentials: SavedCredentials = JSON.parse(content);

    res.json({
      saved: true,
      hasAws: !!credentials.aws,
      hasFastly: !!credentials.fastly,
      savedAt: credentials.savedAt,
      awsKeyHint: credentials.aws?.accessKeyId
        ? `${credentials.aws.accessKeyId.slice(0, 4)}...${credentials.aws.accessKeyId.slice(-4)}`
        : undefined,
      awsRegion: credentials.aws?.region,
    });
  } catch (error) {
    console.error('Error reading credentials:', error);
    res.json({
      saved: false,
      hasAws: false,
      hasFastly: false,
    });
  }
});

router.get('/credentials/destroy-requirements', (_req, res) => {
  const hasEnvAws = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const hasEnvFastly = !!(process.env.FASTLY_API_KEY || process.env.FASTLY_API_TOKEN);

  res.json({
    env: {
      hasAws: hasEnvAws,
      hasFastly: hasEnvFastly,
      awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
      awsKeyHint: hasEnvAws
        ? `${process.env.AWS_ACCESS_KEY_ID!.slice(0, 4)}...${process.env.AWS_ACCESS_KEY_ID!.slice(-4)}`
        : undefined,
    },
    required: {
      awsAccessKeyId: !hasEnvAws,
      awsSecretAccessKey: !hasEnvAws,
      fastlyApiToken: !hasEnvFastly,
    },
  });
});

router.delete('/credentials', async (_req, res) => {
  try {
    await fs.unlink(DEPLOYMENT_CONFIG_PATH).catch(() => {});
    res.json({ success: true, message: 'Credentials removed' });
  } catch (error) {
    console.error('Error deleting credentials:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { getSavedCredentials };
export type { SavedCredentials };
export default router;
