import { useEffect, useState } from 'react';
import { checkCLIDependencies, type CLIDependencyStatus } from '../../services/cli-dependencies-api';
import { CLIToolStatusCard } from '../../components/shared/cli';
import { WelcomeHeader } from './components/WelcomeHeader';
import { ProgressSteps } from './components/ProgressSteps';
import { CredentialsStep, ConfigStep, DeployStep, SuccessStep } from './steps';
import {
  useWizardState,
  useCredentialVerification,
  useEnvCredentials,
  useDeployment,
} from './hooks';

export function WelcomeWizard() {
  const {
    currentStep,
    credentials,
    updateCredential,
    goToStep,
    nextStep,
    prevStep,
  } = useWizardState();

  const {
    envCreds,
    useEnvAws,
    setUseEnvAws,
    useEnvFastly,
    setUseEnvFastly,
    bothDetected,
    toggleBoth,
  } = useEnvCredentials();

  const { verification, verify } = useCredentialVerification({
    awsCredentials: {
      accessKeyId: credentials.awsAccessKeyId,
      secretAccessKey: credentials.awsSecretAccessKey,
      region: credentials.awsRegion,
    },
    fastlyCredentials: { apiToken: credentials.fastlyApiToken },
    useEnvAws,
    useEnvFastly,
  });

  const {
    isDeploying,
    logs: deployLogs,
    error: deployError,
    progress: deployProgress,
    isComplete,
    deploy,
  } = useDeployment();

  // CLI dependencies
  const [cliDependencies, setCLIDependencies] = useState<CLIDependencyStatus | null>(null);
  const [isCheckingCLI, setIsCheckingCLI] = useState(true);

  useEffect(() => {
    checkCLIDependencies()
      .then(setCLIDependencies)
      .finally(() => setIsCheckingCLI(false));
  }, []);

  // Navigate to success when deployment completes
  useEffect(() => {
    if (isComplete) {
      goToStep('success');
    }
  }, [isComplete, goToStep]);

  // Update region from env if detected
  useEffect(() => {
    if (envCreds?.aws.region) {
      updateCredential('awsRegion', envCreds.aws.region);
    }
  }, [envCreds?.aws.region, updateCredential]);

  const handleDeploy = () => {
    deploy({
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
      copyFromEnv: credentials.saveToEnv
        ? { aws: useEnvAws, fastly: useEnvFastly }
        : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-mesh">
      <WelcomeHeader />

      {currentStep !== 'success' && <ProgressSteps currentStep={currentStep} />}

      {/* CLI Status */}
      <div className="max-w-3xl mx-auto px-6 pb-4">
        <CLIToolStatusCard status={cliDependencies} isLoading={isCheckingCLI} />
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {currentStep === 'credentials' && (
          <CredentialsStep
            credentials={credentials}
            updateCredential={updateCredential}
            verification={verification}
            onVerify={verify}
            envCreds={envCreds}
            useEnvAws={useEnvAws}
            setUseEnvAws={setUseEnvAws}
            useEnvFastly={useEnvFastly}
            setUseEnvFastly={setUseEnvFastly}
            bothEnvDetected={bothDetected ?? false}
            toggleBothEnv={toggleBoth}
            onNext={nextStep}
          />
        )}

        {currentStep === 'config' && (
          <ConfigStep
            credentials={credentials}
            updateCredential={updateCredential}
            useEnvAws={useEnvAws}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}

        {currentStep === 'deploy' && (
          <DeployStep
            credentials={credentials}
            useEnvAws={useEnvAws}
            useEnvFastly={useEnvFastly}
            cliDependencies={cliDependencies}
            isDeploying={isDeploying}
            deployLogs={deployLogs}
            deployError={deployError}
            deployProgress={deployProgress}
            onDeploy={handleDeploy}
            onBack={prevStep}
          />
        )}

        {currentStep === 'success' && <SuccessStep />}
      </div>
    </div>
  );
}
