/**
 * AIProviderSection Component
 *
 * AI provider selection and credential management.
 */

import { Key, ExternalLink, Info, CheckCircle } from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Flex,
  Badge,
  Callout,
  Select,
  SelectItem,
  TextInput,
  Switch,
} from '@tremor/react';
import type { AICredentialsStatusResponse } from '../../../../services';

interface Provider {
  id: string;
  name: string;
  description: string;
  pricing: string;
  setupUrl: string;
}

interface AIProviderSectionProps {
  providers: Provider[];
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  useBasicMode: boolean;
  onBasicModeChange: (value: boolean) => void;
  credentialsData?: AICredentialsStatusResponse;
  useStoredKey: 'saved' | 'env' | null;
  onUseStoredKeyChange: (value: 'saved' | 'env' | null) => void;
  customApiKey: string;
  onCustomApiKeyChange: (value: string) => void;
  resolvedKeyMasked: string;
}

export function AIProviderSection({
  providers,
  selectedProvider,
  onProviderChange,
  useBasicMode,
  onBasicModeChange,
  credentialsData,
  useStoredKey,
  onUseStoredKeyChange,
  customApiKey,
  onCustomApiKeyChange,
  resolvedKeyMasked,
}: AIProviderSectionProps) {
  const providerHasCredentials = (providerId: string): boolean => {
    if (!credentialsData) return false;
    const status = credentialsData[providerId as keyof AICredentialsStatusResponse];
    return status?.saved || status?.env || false;
  };

  const currentProviderStatus = selectedProvider
    ? credentialsData?.[selectedProvider as keyof AICredentialsStatusResponse]
    : undefined;
  const hasSavedKey = !!currentProviderStatus?.saved;
  const hasEnvKey = !!currentProviderStatus?.env;
  const selectedProviderInfo = providers.find((p) => p.id === selectedProvider);

  return (
    <Card>
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <Title>AI Provider</Title>
        <Flex className="gap-2 items-center">
          <Text className="text-sm">Use Basic Mode (No AI)</Text>
          <Switch checked={useBasicMode} onChange={onBasicModeChange} />
        </Flex>
      </Flex>

      {useBasicMode ? (
        <Callout title="Basic Mode" icon={Info} color="blue">
          Basic mode uses heuristics to generate cache rules without AI.
          Results may be less optimal but don&apos;t require an API key.
        </Callout>
      ) : (
        <div className="space-y-4">
          <Select
            value={selectedProvider}
            onValueChange={onProviderChange}
            placeholder="Select an AI provider..."
          >
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <Flex className="gap-2 items-center">
                  <span>{provider.name}</span>
                  {providerHasCredentials(provider.id) && (
                    <Badge color="emerald" size="xs">Configured</Badge>
                  )}
                </Flex>
              </SelectItem>
            ))}
          </Select>

          {selectedProvider && (
            <div className="space-y-3">
              {/* Provider Info */}
              {selectedProviderInfo && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <Text className="text-sm">{selectedProviderInfo.description}</Text>
                  <Flex className="gap-4 mt-2">
                    <Badge color="slate" size="sm">{selectedProviderInfo.pricing}</Badge>
                    <a
                      href={selectedProviderInfo.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </Flex>
                </div>
              )}

              {/* Credential Selection */}
              <div className="space-y-3">
                <Flex className="gap-2 items-center">
                  <Key className="w-4 h-4 text-slate-400" />
                  <Text className="text-sm font-medium">API Key</Text>
                </Flex>

                {/* Saved Key Checkbox */}
                {hasSavedKey && (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={useStoredKey === 'saved'}
                      onChange={(e) => onUseStoredKeyChange(e.target.checked ? 'saved' : null)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <Flex className="gap-2 items-center">
                        <Text className="text-sm font-medium">Use saved key</Text>
                        <Badge color="emerald" size="xs">Config File</Badge>
                      </Flex>
                      <Text className="text-xs text-slate-500 font-mono">
                        {currentProviderStatus?.savedMasked || currentProviderStatus?.masked}
                      </Text>
                    </div>
                  </label>
                )}

                {/* Env Key Checkbox */}
                {hasEnvKey && (
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={useStoredKey === 'env'}
                      onChange={(e) => onUseStoredKeyChange(e.target.checked ? 'env' : null)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <Flex className="gap-2 items-center">
                        <Text className="text-sm font-medium">Use environment variable</Text>
                        <Badge color="blue" size="xs">Server Env</Badge>
                      </Flex>
                      <Text className="text-xs text-slate-500 font-mono">
                        {currentProviderStatus?.envMasked || 'Available'}
                      </Text>
                    </div>
                  </label>
                )}

                {/* Manual Entry */}
                {!useStoredKey && (
                  <div className="space-y-2">
                    <TextInput
                      type="password"
                      placeholder="Enter your API key..."
                      value={customApiKey}
                      onChange={(e) => onCustomApiKeyChange(e.target.value)}
                    />
                    <Text className="text-sm text-slate-600">
                      This key will be saved to ~/.config/orion/deployment-config.json
                    </Text>
                  </div>
                )}

                {/* Show resolved key confirmation */}
                {useStoredKey && resolvedKeyMasked && (
                  <Callout title="Using stored credentials" icon={CheckCircle} color="emerald">
                    Active key: {resolvedKeyMasked}
                  </Callout>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
