import { useState, useCallback } from 'react';

export type WizardStep = 'credentials' | 'config' | 'deploy' | 'success';

export interface WizardCredentials {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  fastlyApiToken: string;
  graphqlUrl: string;
  hostOverride: string;
  saveToEnv: boolean;
}

const initialCredentials: WizardCredentials = {
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  fastlyApiToken: '',
  graphqlUrl: '',
  hostOverride: '',
  saveToEnv: true,
};

export function useWizardState() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('credentials');
  const [credentials, setCredentials] = useState<WizardCredentials>(initialCredentials);

  const updateCredential = useCallback(<K extends keyof WizardCredentials>(
    key: K,
    value: WizardCredentials[K]
  ) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    const steps: WizardStep[] = ['credentials', 'config', 'deploy', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const steps: WizardStep[] = ['credentials', 'config', 'deploy', 'success'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  return {
    currentStep,
    credentials,
    updateCredential,
    goToStep,
    nextStep,
    prevStep,
  };
}
