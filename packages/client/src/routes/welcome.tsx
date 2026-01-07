/**
 * Welcome / Onboarding Wizard
 *
 * Step-based setup flow for first-time users.
 * Using Tremor components for clean dashboard UI.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle,
  XCircle,
  ChevronRight,
  Key,
  Settings,
  Rocket,
  ArrowLeft,
  ShieldCheck,
  Server,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Select,
  SelectItem,
  Callout,
  ProgressBar,
  Flex,
  Badge,
} from '@tremor/react';
import { verifyCredentials } from '../hooks';
import { getDestroyRequirements } from '../services/credentials-api';
import { deployDemoApp, type DeployProgressEvent } from '../services/demo-app-api';
import { checkCLIDependencies, type CLIDependencyStatus } from '../services/cli-dependencies-api';

export const Route = createFileRoute('/welcome')({
  component: WelcomePage,
});

type Step = 'credentials' | 'config' | 'deploy' | 'success';

interface Credentials {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  fastlyApiToken: string;
  graphqlUrl: string;
  hostOverride: string;
  saveToEnv: boolean;
}

interface VerificationState {
  tested: boolean;
  testing: boolean;
  aws: boolean;
  fastly: boolean;
  errors: string[];
}

function WelcomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>('credentials');
  const [credentials, setCredentials] = useState<Credentials>({
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    fastlyApiToken: '',
    graphqlUrl: '',
    hostOverride: '',
    saveToEnv: true,
  });

  // Environment credentials detection state
  const [envCreds, setEnvCreds] = useState<{
    aws: { detected: boolean; region?: string; keyHint?: string };
    fastly: { detected: boolean };
  } | null>(null);

  // Track if user wants to use env credentials
  const [useEnvAws, setUseEnvAws] = useState(false);
  const [useEnvFastly, setUseEnvFastly] = useState(false);

  // Credential verification state
  const [verification, setVerification] = useState<VerificationState>({
    tested: false,
    testing: false,
    aws: false,
    fastly: false,
    errors: [],
  });

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployProgress, setDeployProgress] = useState(0);

  // Demo app deployment state
  const [isDemoAppDeploying, setIsDemoAppDeploying] = useState(false);
  const [demoAppLogs, setDemoAppLogs] = useState<string[]>([]);
  const [demoAppError, setDemoAppError] = useState<string | null>(null);

  // CLI dependencies state
  const [cliDependencies, setCLIDependencies] = useState<CLIDependencyStatus | null>(null);
  const [isCheckingCLI, setIsCheckingCLI] = useState(true);

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'credentials', label: 'Credentials', icon: <Key className="w-4 h-4" /> },
    { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { id: 'deploy', label: 'Deploy', icon: <Rocket className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // Check CLI dependencies on mount
  useEffect(() => {
    setIsCheckingCLI(true);
    checkCLIDependencies()
      .then(status => {
        setCLIDependencies(status);
      })
      .finally(() => {
        setIsCheckingCLI(false);
      });
  }, []);

  // Fetch environment credentials on mount
  useEffect(() => {
    getDestroyRequirements().then(data => {
      setEnvCreds({
        aws: { 
          detected: data.env.hasAws, 
          region: data.env.awsRegion,
          keyHint: data.env.awsKeyHint,
        },
        fastly: { detected: data.env.hasFastly },
      });
      // Auto-select if detected
      if (data.env.hasAws) setUseEnvAws(true);
      if (data.env.hasFastly) setUseEnvFastly(true);
      // Pre-populate region if detected
      if (data.env.awsRegion) {
        setCredentials(prev => ({ ...prev, awsRegion: data.env.awsRegion! }));
      }
    });
  }, []);

  // Reset verification when env credential toggles change
  useEffect(() => {
    setVerification({ tested: false, testing: false, aws: false, fastly: false, errors: [] });
  }, [useEnvAws, useEnvFastly]);

  // Determine if we show global vs per-section checkboxes
  const bothEnvCredsDetected = envCreds?.aws.detected && envCreds?.fastly.detected;

  // Test credentials
  const handleTestCredentials = async () => {
    setVerification({ tested: false, testing: true, aws: false, fastly: false, errors: [] });

    try {
      const result = await verifyCredentials({
        aws: useEnvAws ? undefined : {
          accessKeyId: credentials.awsAccessKeyId,
          secretAccessKey: credentials.awsSecretAccessKey,
          region: credentials.awsRegion,
        },
        fastly: useEnvFastly ? undefined : {
          apiToken: credentials.fastlyApiToken,
        },
        useEnvCredentials: {
          aws: useEnvAws,
          fastly: useEnvFastly,
        },
      });

      setVerification({
        tested: true,
        testing: false,
        aws: result.aws,
        fastly: result.fastly,
        errors: result.errors,
      });
    } catch (error) {
      setVerification({
        tested: true,
        testing: false,
        aws: false,
        fastly: false,
        errors: [error instanceof Error ? error.message : 'Verification failed'],
      });
    }
  };

  // Reset verification when credentials change
  const updateCredential = (key: keyof Credentials, value: string | boolean) => {
    setCredentials({ ...credentials, [key]: value });
    // Reset verification if credential fields change
    if (key !== 'saveToEnv' && key !== 'graphqlUrl' && key !== 'hostOverride') {
      setVerification({ tested: false, testing: false, aws: false, fastly: false, errors: [] });
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setDeployError(null);
    setDeployLogs([]);
    setDeployProgress(0);

    try {
      const response = await fetch('http://localhost:3001/api/infrastructure/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aws: useEnvAws 
            ? { useEnv: true, region: credentials.awsRegion }
            : {
                accessKeyId: credentials.awsAccessKeyId,
                secretAccessKey: credentials.awsSecretAccessKey,
                region: credentials.awsRegion,
              },
          fastly: useEnvFastly
            ? { useEnv: true }
            : { apiToken: credentials.fastlyApiToken },
          backend: {
            graphqlUrl: credentials.graphqlUrl,
            hostOverride: credentials.hostOverride || undefined,
          },
          saveCredentials: credentials.saveToEnv,
          copyFromEnv: credentials.saveToEnv ? {
            aws: useEnvAws,
            fastly: useEnvFastly,
          } : undefined,
        }),
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
              setDeployLogs((prev) => [...prev, `[${data.step}] ${data.message}`]);
              setDeployProgress(data.progress);

              if (data.step === 'done' || data.progress === 100) {
                setIsDeploying(false);
                setCurrentStep('success');
                queryClient.invalidateQueries({ queryKey: ['system-status'] });
              }

              if (data.error) {
                setDeployError(data.error);
                setIsDeploying(false);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Unknown error');
      setIsDeploying(false);
    }
  };

  const hasCredentials =
    (useEnvAws || (credentials.awsAccessKeyId && credentials.awsSecretAccessKey)) &&
    (useEnvFastly || credentials.fastlyApiToken);

  const canProceedFromCredentials =
    verification.tested && verification.aws && verification.fastly;

  const canProceedFromConfig = credentials.graphqlUrl;

  // Handle deploying demo app
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

      // Auto-populate GraphQL URL with demo app endpoint
      updateCredential('graphqlUrl', outputs.graphqlEndpoint);
      setIsDemoAppDeploying(false);
    } catch (error) {
      setDemoAppError(error instanceof Error ? error.message : 'Deployment failed');
      setIsDemoAppDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh">
      {/* Header */}
      <div
        className="border-b"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(var(--glass-blur))',
          borderColor: 'var(--color-border-subtle)'
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <img
              src="/assets/logos/orion-symbol.png"
              alt="Orion"
              className="w-12 h-12"
            />
            <div>
              <Title className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Welcome to Orion
              </Title>
              <Text style={{ color: 'var(--color-text-secondary)' }}>
                Let's set up your GraphQL edge cache
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {currentStep !== 'success' && (
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Flex justifyContent="between" alignItems="center">
            {steps.map((step, index) => (
              <Flex key={step.id} alignItems="center" className="gap-2">
                <Badge
                  icon={index < currentStepIndex ? CheckCircle : undefined}
                  color={
                    index < currentStepIndex
                      ? 'emerald'
                      : index === currentStepIndex
                        ? 'cyan'
                        : 'slate'
                  }
                  size="lg"
                >
                  <Flex alignItems="center" className="gap-1">
                    {index >= currentStepIndex && step.icon}
                    {step.label}
                  </Flex>
                </Badge>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                )}
              </Flex>
            ))}
          </Flex>
        </div>
      )}

      {/* CLI Dependencies Warning */}
      {!isCheckingCLI && cliDependencies && !cliDependencies.allInstalled && (
        <div className="max-w-3xl mx-auto px-6 pb-4">
          <Callout title="Missing CLI Tools" icon={AlertTriangle} color="red">
            <div className="space-y-2">
              <Text>
                The following CLI tools are required but not installed on the server:
              </Text>
              <ul className="list-disc list-inside text-sm">
                {cliDependencies.dependencies
                  .filter((dep) => !dep.installed)
                  .map((dep) => (
                    <li key={dep.command}>
                      <span className="font-medium">{dep.name}</span>
                      {dep.error && (
                        <span className="text-slate-500 ml-1">- {dep.error}</span>
                      )}
                    </li>
                  ))}
              </ul>
              <div className="pt-2 text-sm">
                <Text className="font-medium">Installation links:</Text>
                <ul className="list-disc list-inside">
                  <li>
                    <a
                      href="https://developer.fastly.com/reference/cli/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline"
                    >
                      Fastly CLI
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://developer.hashicorp.com/terraform/install"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline"
                    >
                      Terraform
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </Callout>
        </div>
      )}

      {/* CLI Dependencies Check in Progress */}
      {isCheckingCLI && (
        <div className="max-w-3xl mx-auto px-6 pb-4">
          <Callout icon={Terminal} color="slate">
            <Flex alignItems="center" className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <Text>Checking CLI dependencies...</Text>
            </Flex>
          </Callout>
        </div>
      )}

      {/* CLI Dependencies OK */}
      {!isCheckingCLI && cliDependencies?.allInstalled && (
        <div className="max-w-3xl mx-auto px-6 pb-4">
          <Callout icon={Terminal} color="emerald">
            <Flex alignItems="center" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              <Text>CLI dependencies verified (Fastly CLI, Terraform)</Text>
            </Flex>
          </Callout>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Step 1: Credentials */}
        {currentStep === 'credentials' && (
          <Card>
            <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Title>Cloud Credentials</Title>
              <Text className="mt-1">
                Enter your AWS and Fastly credentials to provision infrastructure
              </Text>
            </div>

            <div className="space-y-6">
              {/* Global "Use system credentials" when both are detected */}
              {bothEnvCredsDetected && (
                <Callout color="blue" icon={ShieldCheck}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useEnvAws && useEnvFastly}
                      onChange={(e) => {
                        setUseEnvAws(e.target.checked);
                        setUseEnvFastly(e.target.checked);
                      }}
                      className="rounded accent-cyan-500"
                    />
                    <span>
                      System credentials detected — use these
                      {envCreds?.aws.keyHint && (
                        <span className="text-slate-500 ml-1">
                          (AWS: {envCreds.aws.keyHint})
                        </span>
                      )}
                    </span>
                  </label>
                </Callout>
              )}

              {/* AWS Section */}
              <div>
                <Flex justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="font-medium">AWS</Text>
                  {verification.tested && (
                    <Badge
                      icon={verification.aws ? CheckCircle : XCircle}
                      color={verification.aws ? 'emerald' : 'red'}
                      size="sm"
                    >
                      {verification.aws ? 'Verified' : 'Failed'}
                    </Badge>
                  )}
                </Flex>

                {/* Per-section checkbox when only AWS env is detected (not both) */}
                {envCreds?.aws.detected && !bothEnvCredsDetected && (
                  <Callout color="blue" className="mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useEnvAws}
                        onChange={(e) => setUseEnvAws(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>
                        System credentials detected — use these
                        {envCreds.aws.keyHint && ` (${envCreds.aws.keyHint})`}
                      </span>
                    </label>
                  </Callout>
                )}

                <div className="space-y-3">
                  <div>
                    <Text className="text-sm mb-1">Access Key ID</Text>
                    <TextInput
                      value={useEnvAws ? '' : credentials.awsAccessKeyId}
                      onValueChange={(value) => updateCredential('awsAccessKeyId', value)}
                      placeholder={useEnvAws ? 'Using system credentials' : 'AKIAIOSFODNN7EXAMPLE'}
                      disabled={useEnvAws}
                    />
                  </div>
                  <div>
                    <Text className="text-sm mb-1">Secret Access Key</Text>
                    <TextInput
                      type="password"
                      value={useEnvAws ? '' : credentials.awsSecretAccessKey}
                      onValueChange={(value) => updateCredential('awsSecretAccessKey', value)}
                      placeholder={useEnvAws ? 'Using system credentials' : 'wJalrXUtnFEMI/K7MDENG...'}
                      disabled={useEnvAws}
                    />
                  </div>
                  <div>
                    <Text className="text-sm mb-1">Region</Text>
                    <Select
                      value={credentials.awsRegion}
                      onValueChange={(value) => updateCredential('awsRegion', value)}
                    >
                      <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                      <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                      <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Fastly Section */}
              <div>
                <Flex justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="font-medium">Fastly</Text>
                  {verification.tested && (
                    <Badge
                      icon={verification.fastly ? CheckCircle : XCircle}
                      color={verification.fastly ? 'emerald' : 'red'}
                      size="sm"
                    >
                      {verification.fastly ? 'Verified' : 'Failed'}
                    </Badge>
                  )}
                </Flex>

                {/* Per-section checkbox when only Fastly env is detected (not both) */}
                {envCreds?.fastly.detected && !bothEnvCredsDetected && (
                  <Callout color="blue" className="mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useEnvFastly}
                        onChange={(e) => setUseEnvFastly(e.target.checked)}
                        className="rounded accent-cyan-500"
                      />
                      <span>System credentials detected — use these</span>
                    </label>
                  </Callout>
                )}

                <div>
                  <Text className="text-sm mb-1">API Token</Text>
                  <TextInput
                    type="password"
                    value={useEnvFastly ? '' : credentials.fastlyApiToken}
                    onValueChange={(value) => updateCredential('fastlyApiToken', value)}
                    placeholder={useEnvFastly ? 'Using system credentials' : 'Your Fastly API token'}
                    disabled={useEnvFastly}
                  />
                  <Text className="text-xs mt-1 text-slate-500">
                    Get your token at{' '}
                    <a
                      href="https://manage.fastly.com/account/personal/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline"
                    >
                      manage.fastly.com
                    </a>
                  </Text>
                </div>
              </div>

              {/* Verification errors */}
              {verification.tested && verification.errors.length > 0 && (
                <Callout
                  title="Verification Failed"
                  icon={XCircle}
                  color="red"
                >
                  <ul className="list-disc list-inside">
                    {verification.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              {/* Test Credentials Button */}
              <Button
                icon={verification.testing ? Loader2 : canProceedFromCredentials ? CheckCircle : ShieldCheck}
                loading={verification.testing}
                disabled={!hasCredentials}
                onClick={handleTestCredentials}
                color={canProceedFromCredentials ? 'emerald' : 'slate'}
                variant="secondary"
                className="w-full"
              >
                {verification.testing
                  ? 'Testing Credentials...'
                  : canProceedFromCredentials
                    ? 'Credentials Verified'
                    : 'Test Credentials'
                }
              </Button>

              {/* Save credentials option */}
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={credentials.saveToEnv}
                  onChange={(e) => updateCredential('saveToEnv', e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                Save credentials locally (for future operations like destroy)
              </label>
            </div>

            <div className="border-t mt-6 pt-6 flex justify-end" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Button
                icon={ChevronRight}
                iconPosition="right"
                disabled={!canProceedFromCredentials}
                onClick={() => setCurrentStep('config')}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Config */}
        {currentStep === 'config' && (
          <Card>
            <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Title>Backend Configuration</Title>
              <Text className="mt-1">
                Configure your GraphQL origin server
              </Text>
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

              {/* Demo App Deployment Option */}
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

                    {/* Demo app deployment logs */}
                    {demoAppLogs.length > 0 && (
                      <div className="rounded-lg p-3 bg-slate-900 text-slate-300 font-mono text-xs max-h-32 overflow-y-auto">
                        {demoAppLogs.map((log, i) => (
                          <div key={i}>{log}</div>
                        ))}
                        {isDemoAppDeploying && (
                          <div className="animate-pulse text-cyan-400">Running...</div>
                        )}
                      </div>
                    )}

                    {/* Demo app error */}
                    {demoAppError && (
                      <Text className="text-sm text-red-500">{demoAppError}</Text>
                    )}
                  </div>
                </Callout>
              </div>
            </div>

            <div className="border-t mt-6 pt-6 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Button
                icon={ArrowLeft}
                variant="light"
                onClick={() => setCurrentStep('credentials')}
              >
                Back
              </Button>
              <Button
                icon={ChevronRight}
                iconPosition="right"
                disabled={!canProceedFromConfig}
                onClick={() => setCurrentStep('deploy')}
              >
                Continue
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Deploy */}
        {currentStep === 'deploy' && (
          <Card>
            <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Title>Deploy Infrastructure</Title>
              <Text className="mt-1">
                Review your settings and deploy
              </Text>
            </div>

            <div>
              {/* Summary */}
              {!isDeploying && deployLogs.length === 0 && (
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
                  <div className="rounded-lg p-4 bg-slate-900 text-slate-300 font-mono text-sm max-h-64 overflow-y-auto">
                    {deployLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                    {isDeploying && (
                      <div className="animate-pulse text-cyan-400">
                        Running...
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
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
                <Callout
                  className="mb-6"
                  title="Deployment Failed"
                  icon={XCircle}
                  color="red"
                >
                  {deployError}
                </Callout>
              )}
            </div>

            <div className="border-t mt-6 pt-6 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <Button
                icon={ArrowLeft}
                variant="light"
                disabled={isDeploying}
                onClick={() => setCurrentStep('config')}
              >
                Back
              </Button>
              <Button
                icon={isDeploying ? Loader2 : Rocket}
                loading={isDeploying}
                disabled={!cliDependencies?.allInstalled}
                onClick={handleDeploy}
              >
                {!cliDependencies?.allInstalled
                  ? 'Missing CLI Tools'
                  : isDeploying
                    ? 'Deploying...'
                    : deployError
                      ? 'Retry Deploy'
                      : 'Deploy Now'
                }
              </Button>
            </div>
          </Card>
        )}

        {/* Success */}
        {currentStep === 'success' && (
          <Card className="text-center">
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <Title className="font-display text-2xl font-bold mb-2">
                You're all set!
              </Title>
              <Text className="mb-8">
                Your GraphQL edge cache is now deployed and ready to use.
              </Text>
              <Button
                size="lg"
                onClick={() => navigate({ to: '/dashboard' })}
              >
                Enter Dashboard
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
