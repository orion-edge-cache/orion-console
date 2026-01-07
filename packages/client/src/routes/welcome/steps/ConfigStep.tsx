import { useState } from 'react';
import { Card, Title, Text, Button, TextInput, Callout } from '@tremor/react';
import { ChevronRight, ArrowLeft, Server, Rocket, Loader2 } from 'lucide-react';
import { deployDemoApp, type DeployProgressEvent } from '../../../services/demo-app-api';
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
  const [demoAppLogs, setDemoAppLogs] = useState<string[]>([]);
  const [demoAppError, setDemoAppError] = useState<string | null>(null);

  const canProceed = !!credentials.graphqlUrl;

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

        {/* Demo App Section */}
        <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <Callout color="blue" icon={Server}>
            <div className="space-y-3">
              <div>
                <Text className="font-medium">Don't have a GraphQL endpoint?</Text>
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
