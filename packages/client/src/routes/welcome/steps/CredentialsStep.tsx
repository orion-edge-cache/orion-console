import { Card, Title, Text, Button, Callout, Flex } from '@tremor/react';
import { ChevronRight, Loader2, CheckCircle, ShieldCheck, XCircle } from 'lucide-react';
import { CredentialSection } from '../../../components/shared/credentials';
import type { WizardCredentials } from '../hooks';
import type { VerificationState } from '../hooks/useCredentialVerification';
import type { EnvCredentialsState } from '../hooks/useEnvCredentials';

interface CredentialsStepProps {
  credentials: WizardCredentials;
  updateCredential: <K extends keyof WizardCredentials>(key: K, value: WizardCredentials[K]) => void;
  verification: VerificationState;
  onVerify: () => void;
  envCreds: EnvCredentialsState | null;
  useEnvAws: boolean;
  setUseEnvAws: (value: boolean) => void;
  useEnvFastly: boolean;
  setUseEnvFastly: (value: boolean) => void;
  bothEnvDetected: boolean;
  toggleBothEnv: (checked: boolean) => void;
  onNext: () => void;
}

export function CredentialsStep({
  credentials,
  updateCredential,
  verification,
  onVerify,
  envCreds,
  useEnvAws,
  setUseEnvAws,
  useEnvFastly,
  setUseEnvFastly,
  bothEnvDetected,
  toggleBothEnv,
  onNext,
}: CredentialsStepProps) {
  const hasCredentials =
    (useEnvAws || (credentials.awsAccessKeyId && credentials.awsSecretAccessKey)) &&
    (useEnvFastly || credentials.fastlyApiToken);

  const canProceed = verification.tested && verification.aws && verification.fastly;

  return (
    <Card>
      <div className="border-b pb-4 mb-6" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <Title>Cloud Credentials</Title>
        <Text className="mt-1">
          Enter your AWS and Fastly credentials to provision infrastructure
        </Text>
      </div>

      <div className="space-y-6">
        {/* Global env toggle when both detected */}
        {bothEnvDetected && (
          <Callout color="blue" icon={ShieldCheck}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useEnvAws && useEnvFastly}
                onChange={(e) => toggleBothEnv(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>
                System credentials detected — use these
                {envCreds?.aws.keyHint && (
                  <span className="text-slate-500 ml-1">(AWS: {envCreds.aws.keyHint})</span>
                )}
              </span>
            </label>
          </Callout>
        )}

        {/* AWS Section */}
        <CredentialSection
          type="aws"
          credentials={{
            accessKeyId: credentials.awsAccessKeyId,
            secretAccessKey: credentials.awsSecretAccessKey,
            region: credentials.awsRegion,
          }}
          onCredentialsChange={(key, value) => {
            const keyMap = {
              accessKeyId: 'awsAccessKeyId',
              secretAccessKey: 'awsSecretAccessKey',
              region: 'awsRegion',
            } as const;
            updateCredential(keyMap[key], value);
          }}
          verification={{
            tested: verification.tested,
            testing: verification.testing,
            valid: verification.aws,
          }}
          envStatus={envCreds?.aws}
          useEnv={useEnvAws}
          onUseEnvChange={setUseEnvAws}
          showEnvToggle={!bothEnvDetected}
        />

        {/* Fastly Section */}
        <CredentialSection
          type="fastly"
          credentials={{ apiToken: credentials.fastlyApiToken }}
          onCredentialsChange={(key, value) => {
            if (key === 'apiToken') {
              updateCredential('fastlyApiToken', value);
            }
          }}
          verification={{
            tested: verification.tested,
            testing: verification.testing,
            valid: verification.fastly,
          }}
          envStatus={envCreds?.fastly}
          useEnv={useEnvFastly}
          onUseEnvChange={setUseEnvFastly}
          showEnvToggle={!bothEnvDetected}
        />

        {/* Verification errors */}
        {verification.tested && verification.errors.length > 0 && (
          <Callout title="Verification Failed" icon={XCircle} color="red">
            <ul className="list-disc list-inside">
              {verification.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </Callout>
        )}

        {/* Test button */}
        <Button
          icon={verification.testing ? Loader2 : canProceed ? CheckCircle : ShieldCheck}
          loading={verification.testing}
          disabled={!hasCredentials}
          onClick={onVerify}
          color={canProceed ? 'emerald' : 'slate'}
          variant="secondary"
          className="w-full"
        >
          {verification.testing
            ? 'Testing Credentials...'
            : canProceed
              ? 'Credentials Verified'
              : 'Test Credentials'}
        </Button>

        {/* Save option */}
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
          disabled={!canProceed}
          onClick={onNext}
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
