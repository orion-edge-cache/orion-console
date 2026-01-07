import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../../../utils';

interface DeploymentState {
  isDeploying: boolean;
  logs: string[];
  error: string | null;
  progress: number;
  isComplete: boolean;
}

const initialState: DeploymentState = {
  isDeploying: false,
  logs: [],
  error: null,
  progress: 0,
  isComplete: false,
};

interface DeployConfig {
  aws: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    useEnv?: boolean;
  };
  fastly: {
    apiToken?: string;
    useEnv?: boolean;
  };
  backend: {
    graphqlUrl: string;
    hostOverride?: string;
  };
  saveCredentials: boolean;
  copyFromEnv?: {
    aws: boolean;
    fastly: boolean;
  };
}

export function useDeployment() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DeploymentState>(initialState);

  const deploy = useCallback(async (config: DeployConfig) => {
    setState({ ...initialState, isDeploying: true });

    try {
      const response = await fetch(`${API_BASE_URL}/infrastructure/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Deployment failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              setState((prev) => ({
                ...prev,
                logs: [...prev.logs, `[${data.step}] ${data.message}`],
                progress: data.progress,
              }));

              if (data.step === 'done' || data.progress === 100) {
                setState((prev) => ({
                  ...prev,
                  isDeploying: false,
                  isComplete: true,
                }));
                queryClient.invalidateQueries({ queryKey: ['system-status'] });
              }

              if (data.error) {
                setState((prev) => ({
                  ...prev,
                  error: data.error,
                  isDeploying: false,
                }));
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        isDeploying: false,
      }));
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    deploy,
    reset,
  };
}
