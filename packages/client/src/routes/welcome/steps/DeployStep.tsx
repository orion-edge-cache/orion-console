import { Card, Title, Text, Button, Callout, Flex, ProgressBar } from '@tremor/react';
import { ArrowLeft, Rocket, Loader2, XCircle } from 'lucide-react';
import { TerminalOutput } from '../../../components/shared/terminal';
import type { WizardCredentials } from '../hooks';
import type { CLIDependencyStatus } from '../../../services/cli-dependencies-api';

interface DeployStepProps {
  credentials: WizardCredentials;
  useEnvAws: boolean;
  useEnvFastly: boolean;
  cliDependencies: CLIDependencyStatus | null;
  isDeploying: boolean;
  deployLogs: string[];
  deployError: string | null;
  deployProgress: number;
  onDeploy: () => void;
  onBack: () => void;
}

export function DeployStep({
  credentials,
  useEnvAws,
  useEnvFastly,
  cliDependencies,
  isDeploying,
  deployLogs,
  deployError,
  deployProgress,
  onDeploy,
  onBack,
}: DeployStepProps) {
  const showSummary = !isDeploying && deployLogs.length === 0;

  return (
    <Card>
      <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Title>Deploy Infrastructure</Title>
        <Text className="mt-1">Review your settings and deploy</Text>
      </div>

      <div>
        {/* Summary */}
        {showSummary && (
          <div className="space-y-4 mb-6">
            <div className="rounded-lg p-4 bg-slate-50">
              <Text className="font-medium mb-2">Summary</Text>
              <dl className="text-sm space-y-1">
                <Flex justifyContent="between">
                  <Text className="text-slate-500">AWS Region</Text>
                  <Text className="font-mono">{credentials.awsRegion}</Text>
                </Flex>
                <Flex justifyContent="between">
                  <Text className="text-slate-500">GraphQL Endpoint</Text>
                  <Text className="font-mono text-right truncate max-w-xs">
                    {credentials.graphqlUrl}
                  </Text>
                </Flex>
              </dl>
            </div>

            <Callout color="blue">
              This will create AWS resources (Kinesis, S3, IAM) and Fastly services (CDN, Compute).
              You can destroy these later from the Infrastructure page.
            </Callout>
          </div>
        )}

        {/* Terminal Output */}
        {(isDeploying || deployLogs.length > 0) && (
          <div className="mb-6">
            <TerminalOutput
              logs={deployLogs}
              isRunning={isDeploying}
              maxHeight="16rem"
            />

            <div className="mt-4">
              <Flex justifyContent="between" className="mb-1">
                <Text className="text-sm">Progress</Text>
                <Text className="text-sm">{deployProgress}%</Text>
              </Flex>
              <ProgressBar value={deployProgress} color="cyan" />
            </div>
          </div>
        )}

        {/* Error */}
        {deployError && (
          <Callout className="mb-6" title="Deployment Failed" icon={XCircle} color="red">
            {deployError}
          </Callout>
        )}
      </div>

      <div className="border-t mt-6 pt-6 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Button icon={ArrowLeft} variant="light" disabled={isDeploying} onClick={onBack}>
          Back
        </Button>
        <Button
          icon={isDeploying ? Loader2 : Rocket}
          loading={isDeploying}
          disabled={!cliDependencies?.allInstalled}
          onClick={onDeploy}
        >
          {!cliDependencies?.allInstalled
            ? 'Missing CLI Tools'
            : isDeploying
              ? 'Deploying...'
              : deployError
                ? 'Retry Deploy'
                : 'Deploy Now'}
        </Button>
      </div>
    </Card>
  );
}
