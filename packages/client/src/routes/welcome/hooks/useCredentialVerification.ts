import { useState, useCallback, useEffect } from 'react';
import { verifyCredentials } from '../../../hooks';

export interface VerificationState {
  tested: boolean;
  testing: boolean;
  aws: boolean;
  fastly: boolean;
  errors: string[];
}

const initialState: VerificationState = {
  tested: false,
  testing: false,
  aws: false,
  fastly: false,
  errors: [],
};

interface UseCredentialVerificationProps {
  awsCredentials?: { accessKeyId: string; secretAccessKey: string; region: string };
  fastlyCredentials?: { apiToken: string };
  useEnvAws: boolean;
  useEnvFastly: boolean;
}

export function useCredentialVerification({
  awsCredentials,
  fastlyCredentials,
  useEnvAws,
  useEnvFastly,
}: UseCredentialVerificationProps) {
  const [verification, setVerification] = useState<VerificationState>(initialState);

  // Reset verification when env toggles change
  useEffect(() => {
    setVerification(initialState);
  }, [useEnvAws, useEnvFastly]);

  const verify = useCallback(async () => {
    setVerification({ ...initialState, testing: true });

    try {
      const result = await verifyCredentials({
        aws: useEnvAws ? undefined : awsCredentials,
        fastly: useEnvFastly ? undefined : fastlyCredentials,
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
  }, [awsCredentials, fastlyCredentials, useEnvAws, useEnvFastly]);

  const reset = useCallback(() => {
    setVerification(initialState);
  }, []);

  return {
    verification,
    verify,
    reset,
    isVerified: verification.tested && verification.aws && verification.fastly,
  };
}
