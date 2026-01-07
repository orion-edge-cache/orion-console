import { Text, TextInput, Select, SelectItem, Flex } from '@tremor/react';
import { VerificationBadge } from './VerificationBadge';
import { CredentialSourceToggle } from './CredentialSourceToggle';
import type { AWSCredentials, FastlyCredentials, CredentialVerification, EnvCredentialStatus } from './types';

interface AWSCredentialSectionProps {
  type: 'aws';
  credentials: AWSCredentials;
  onCredentialsChange: (key: keyof AWSCredentials, value: string) => void;
  verification?: CredentialVerification;
  envStatus?: EnvCredentialStatus;
  useEnv: boolean;
  onUseEnvChange: (checked: boolean) => void;
  showEnvToggle?: boolean;
  disabled?: boolean;
}

interface FastlyCredentialSectionProps {
  type: 'fastly';
  credentials: FastlyCredentials;
  onCredentialsChange: (key: keyof FastlyCredentials, value: string) => void;
  verification?: CredentialVerification;
  envStatus?: EnvCredentialStatus;
  useEnv: boolean;
  onUseEnvChange: (checked: boolean) => void;
  showEnvToggle?: boolean;
  disabled?: boolean;
}

type CredentialSectionProps = AWSCredentialSectionProps | FastlyCredentialSectionProps;

export function CredentialSection(props: CredentialSectionProps) {
  const { type, verification, envStatus, useEnv, onUseEnvChange, showEnvToggle = true, disabled } = props;

  return (
    <div>
      <Flex justifyContent="between" alignItems="center" className="mb-3">
        <Text className="font-medium">{type === 'aws' ? 'AWS' : 'Fastly'}</Text>
        {verification && (
          <VerificationBadge
            tested={verification.tested}
            testing={verification.testing}
            valid={verification.valid}
          />
        )}
      </Flex>

      {showEnvToggle && envStatus?.detected && (
        <div className="mb-3">
          <CredentialSourceToggle
            detected={envStatus.detected}
            checked={useEnv}
            onChange={onUseEnvChange}
            keyHint={envStatus.keyHint}
          />
        </div>
      )}

      {type === 'aws' ? (
        <AWSFields
          credentials={(props as AWSCredentialSectionProps).credentials}
          onCredentialsChange={(props as AWSCredentialSectionProps).onCredentialsChange}
          useEnv={useEnv}
          disabled={disabled}
        />
      ) : (
        <FastlyFields
          credentials={(props as FastlyCredentialSectionProps).credentials}
          onCredentialsChange={(props as FastlyCredentialSectionProps).onCredentialsChange}
          useEnv={useEnv}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function AWSFields({
  credentials,
  onCredentialsChange,
  useEnv,
  disabled,
}: {
  credentials: AWSCredentials;
  onCredentialsChange: (key: keyof AWSCredentials, value: string) => void;
  useEnv: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Text className="text-sm mb-1">Access Key ID</Text>
        <TextInput
          value={useEnv ? '' : credentials.accessKeyId}
          onValueChange={(value) => onCredentialsChange('accessKeyId', value)}
          placeholder={useEnv ? 'Using system credentials' : 'AKIAIOSFODNN7EXAMPLE'}
          disabled={useEnv || disabled}
        />
      </div>
      <div>
        <Text className="text-sm mb-1">Secret Access Key</Text>
        <TextInput
          type="password"
          value={useEnv ? '' : credentials.secretAccessKey}
          onValueChange={(value) => onCredentialsChange('secretAccessKey', value)}
          placeholder={useEnv ? 'Using system credentials' : 'wJalrXUtnFEMI/K7MDENG...'}
          disabled={useEnv || disabled}
        />
      </div>
      <div>
        <Text className="text-sm mb-1">Region</Text>
        <Select
          value={credentials.region}
          onValueChange={(value) => onCredentialsChange('region', value)}
          disabled={disabled}
        >
          <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
          <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
          <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
          <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
        </Select>
      </div>
    </div>
  );
}

function FastlyFields({
  credentials,
  onCredentialsChange,
  useEnv,
  disabled,
}: {
  credentials: FastlyCredentials;
  onCredentialsChange: (key: keyof FastlyCredentials, value: string) => void;
  useEnv: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <Text className="text-sm mb-1">API Token</Text>
      <TextInput
        type="password"
        value={useEnv ? '' : credentials.apiToken}
        onValueChange={(value) => onCredentialsChange('apiToken', value)}
        placeholder={useEnv ? 'Using system credentials' : 'Your Fastly API token'}
        disabled={useEnv || disabled}
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
  );
}
