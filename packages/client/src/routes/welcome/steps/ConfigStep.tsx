import { useState, useEffect } from 'react';
import { Card, Title, Text, Button, TextInput, Callout } from '@tremor/react';
import { ChevronRight, ArrowLeft, Server, Rocket, Loader2, Trash2, CheckCircle } from 'lucide-react';
import {
  deployDemoApp,
  destroyDemoApp,
  getDemoAppStatus,
  type DeployProgressEvent,
  type DemoAppStatus,
} from '../../../services/demo-app-api';
import { TerminalOutput } from '../../../components/shared/terminal';
import type { WizardCredentials } from '../hooks';

interface ConfigStepProps {
  credentials: WizardCredentials;
  updateCredential: <K extends keyof WizardCredentials>(key: K, value: WizardCredentials[K]) => void;
  useEnvAws: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function ConfigStep({
  credentials,
  updateCredential,
  useEnvAws,
  onNext,
  onBack,
}: ConfigStepProps) {
  const [isDemoAppDeploying, setIsDemoAppDeploying] = useState(false);
  const [isDemoAppDestroying, setIsDemoAppDestroying] = useState(false);
  const [demoAppLogs, setDemoAppLogs] = useState<string[]>([]);
  const [demoAppError, setDemoAppError] = useState<string | null>(null);
  const [existingDemoApp, setExistingDemoApp] = useState<DemoAppStatus | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);

  const canProceed = !!credentials.graphqlUrl;

  // Check for existing demo app on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const status = await getDemoAppStatus();
        if (status.deployed) {
          setExistingDemoApp(status);
        }
      } catch {
        // No existing demo app or error checking
      } finally {
        setIsCheckingExisting(false);
      }
    };
    checkExisting();
  }, []);

  const handleUseExistingApp = () => {
    if (existingDemoApp?.outputs?.graphqlEndpoint) {
      updateCredential('graphqlUrl', existingDemoApp.outputs.graphqlEndpoint);
    }
  };

  const handleDestroyExistingApp = async () => {
    setIsDemoAppDestroying(true);
    setDemoAppError(null);
    setDemoAppLogs([]);

    try {
      await destroyDemoApp(
        {
          accessKeyId: useEnvAws ? undefined : credentials.awsAccessKeyId,
          secretAccessKey: useEnvAws ? undefined : credentials.awsSecretAccessKey,
          region: credentials.awsRegion,
          useEnv: useEnvAws,
        },
        (event: DeployProgressEvent) => {
          setDemoAppLogs((prev) => [...prev, event.message]);
          if (event.error) {
            setDemoAppError(event.error);
          }
        }
      );

      setExistingDemoApp(null);
      setDemoAppLogs([]);
      setIsDemoAppDestroying(false);
    } catch (error) {
      setDemoAppError(error instanceof Error ? error.message : 'Destroy failed');
      setIsDemoAppDestroying(false);
    }
  };

  const handleDeployDemoApp = async () => {
    setIsDemoAppDeploying(true);
    setDemoAppError(null);
    setDemoAppLogs([]);

    try {
      const outputs = await deployDemoApp(
        {
          accessKeyId: useEnvAws ? undefined : credentials.awsAccessKeyId,
          secretAccessKey: useEnvAws ? undefined : credentials.awsSecretAccessKey,
          region: credentials.awsRegion,
          useEnv: useEnvAws,
        },
        (event: DeployProgressEvent) => {
          setDemoAppLogs((prev) => [...prev, event.message]);
          if (event.error) {
            setDemoAppError(event.error);
          }
        }
      );

      updateCredential('graphqlUrl', outputs.graphqlEndpoint);
      setIsDemoAppDeploying(false);
    } catch (error) {
      setDemoAppError(error instanceof Error ? error.message : 'Deployment failed');
      setIsDemoAppDeploying(false);
    }
  };

  return (
    <Card>
      <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Title>Backend Configuration</Title>
        <Text className="mt-1">Configure your GraphQL origin server</Text>
      </div>

      <div className="space-y-4">
        <div>
          <Text className="text-sm mb-1">GraphQL Endpoint URL *</Text>
          <TextInput
            value={credentials.graphqlUrl}
            onValueChange={(value) => updateCredential('graphqlUrl', value)}
            placeholder="http://your-api.com:4000/graphql"
          />
          <Text className="text-xs mt-1 text-slate-500">
            The URL of your origin GraphQL server
          </Text>
        </div>

        <div>
          <Text className="text-sm mb-1">Host Override (optional)</Text>
          <TextInput
            value={credentials.hostOverride}
            onValueChange={(value) => updateCredential('hostOverride', value)}
            placeholder="api.example.com"
          />
          <Text className="text-xs mt-1 text-slate-500">
            Override the Host header sent to your origin
          </Text>
        </div>

        {/* Existing Demo App Section */}
        {isCheckingExisting ? (
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <Text>Checking for existing demo app...</Text>
            </div>
          </div>
        ) : existingDemoApp?.deployed ? (
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <Callout color="emerald" icon={CheckCircle} title="Existing Demo App Detected">
              <div className="space-y-3">
                <div>
                  <Text className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    A demo app is already deployed. You can use it or delete it to start fresh.
                  </Text>
                  {existingDemoApp.outputs?.graphqlEndpoint && (
                    <Text className="text-xs mt-2 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      Endpoint: {existingDemoApp.outputs.graphqlEndpoint}
                    </Text>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="primary"
                    icon={CheckCircle}
                    onClick={handleUseExistingApp}
                    disabled={isDemoAppDestroying}
                  >
                    Use This App
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    color="red"
                    icon={isDemoAppDestroying ? Loader2 : Trash2}
                    loading={isDemoAppDestroying}
                    disabled={isDemoAppDestroying}
                    onClick={handleDestroyExistingApp}
                  >
                    {isDemoAppDestroying ? 'Destroying...' : 'Delete This App'}
                  </Button>
                </div>

                {demoAppLogs.length > 0 && (
                  <TerminalOutput
                    logs={demoAppLogs}
                    isRunning={isDemoAppDestroying}
                    maxHeight="8rem"
                  />
                )}

                {demoAppError && (
                  <Text className="text-sm text-red-500">{demoAppError}</Text>
                )}
              </div>
            </Callout>
          </div>
        ) : (
          /* Demo App Section - No existing app */
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
            <Callout color="blue" icon={Server} title="Don't have a GraphQL endpoint?">
              <div className="space-y-3">
                <div>
                  <Text className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Deploy our demo app to get a working GraphQL API with sample data.
                  </Text>
                </div>

                <Button
                  size="xs"
                  variant="secondary"
                  icon={isDemoAppDeploying ? Loader2 : Rocket}
                  loading={isDemoAppDeploying}
                  disabled={isDemoAppDeploying}
                  onClick={handleDeployDemoApp}
                >
                  {isDemoAppDeploying ? 'Deploying Demo App...' : 'Deploy Demo App'}
                </Button>

                {demoAppLogs.length > 0 && (
                  <TerminalOutput
                    logs={demoAppLogs}
                    isRunning={isDemoAppDeploying}
                    maxHeight="8rem"
                  />
                )}

                {demoAppError && (
                  <Text className="text-sm text-red-500">{demoAppError}</Text>
                )}
              </div>
            </Callout>
          </div>
        )}
      </div>

      <div className="border-t mt-6 pt-6 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Button icon={ArrowLeft} variant="light" onClick={onBack}>
          Back
        </Button>
        <Button
          icon={ChevronRight}
          iconPosition="right"
          disabled={!canProceed}
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
