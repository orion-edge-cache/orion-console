import { useState, useEffect } from 'react';
import { getDestroyRequirements } from '../../../services/credentials-api';

export interface EnvCredentialsState {
  aws: { detected: boolean; region?: string; keyHint?: string };
  fastly: { detected: boolean };
}

export function useEnvCredentials() {
  const [envCreds, setEnvCreds] = useState<EnvCredentialsState | null>(null);
  const [useEnvAws, setUseEnvAws] = useState(false);
  const [useEnvFastly, setUseEnvFastly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDestroyRequirements()
      .then((data) => {
        const state: EnvCredentialsState = {
          aws: {
            detected: data.env.hasAws,
            region: data.env.awsRegion,
            keyHint: data.env.awsKeyHint,
          },
          fastly: { detected: data.env.hasFastly },
        };
        setEnvCreds(state);

        // Auto-select if detected
        if (data.env.hasAws) setUseEnvAws(true);
        if (data.env.hasFastly) setUseEnvFastly(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const bothDetected = envCreds?.aws.detected && envCreds?.fastly.detected;

  const toggleBoth = (checked: boolean) => {
    setUseEnvAws(checked);
    setUseEnvFastly(checked);
  };

  return {
    envCreds,
    useEnvAws,
    setUseEnvAws,
    useEnvFastly,
    setUseEnvFastly,
    bothDetected,
    toggleBoth,
    isLoading,
  };
}
