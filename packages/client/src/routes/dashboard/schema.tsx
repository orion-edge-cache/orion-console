/**
 * Schema Analysis Page - /dashboard/schema
 *
 * Analyze GraphQL schemas and generate AI-powered cache configurations.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Title, Text, Button, Flex, Callout } from '@tremor/react';
import {
  getSchemaEndpoint,
  analyzeSchema,
  generateConfig,
  generateBasicConfig,
  getProviders,
  getAICredentialsStatus,
  resolveAICredentials,
  saveAICredentials,
  saveConfig,
  type SchemaAnalysis,
  type AICredentialsStatusResponse,
  type OrionCacheConfig,
  type AIConfigResponse,
} from '../../services';

// Local components
import {
  EndpointSection,
  AIProviderSection,
  AnalysisResults,
  GeneratedConfigPanel,
} from './schema/components';

export const Route = createFileRoute('/dashboard/schema')({
  component: SchemaPage,
});

function SchemaPage() {
  const queryClient = useQueryClient();

  // State
  const [endpoint, setEndpoint] = useState<string>('');
  const [endpointSource, setEndpointSource] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [useStoredKey, setUseStoredKey] = useState<'saved' | 'env' | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [resolvedApiKey, setResolvedApiKey] = useState<string>('');
  const [resolvedKeyMasked, setResolvedKeyMasked] = useState<string>('');
  const [useBasicMode, setUseBasicMode] = useState<boolean>(false);
  const [generatedConfig, setGeneratedConfig] = useState<OrionCacheConfig | null>(null);
  const [aiResponse, setAiResponse] = useState<AIConfigResponse | null>(null);
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Queries
  const { data: endpointData, isLoading: endpointLoading } = useQuery({
    queryKey: ['schema-endpoint'],
    queryFn: getSchemaEndpoint,
    retry: false,
  });

  const { data: providersData } = useQuery({
    queryKey: ['schema-providers'],
    queryFn: getProviders,
  });

  const { data: credentialsData, refetch: refetchCredentials } = useQuery({
    queryKey: ['schema-credentials'],
    queryFn: getAICredentialsStatus,
  });

  // Set endpoint from terraform state
  useEffect(() => {
    if (endpointData?.endpoint) {
      setEndpoint(endpointData.endpoint);
      setEndpointSource(endpointData.source);
    }
  }, [endpointData]);

  // Auto-select credential source when provider changes
  useEffect(() => {
    if (!selectedProvider || !credentialsData) {
      setUseStoredKey(null);
      setResolvedApiKey('');
      setResolvedKeyMasked('');
      return;
    }

    const status = credentialsData[selectedProvider as keyof AICredentialsStatusResponse];

    if (status?.saved) {
      setUseStoredKey('saved');
    } else if (status?.env) {
      setUseStoredKey('env');
    } else {
      setUseStoredKey(null);
    }

    setCustomApiKey('');
  }, [selectedProvider, credentialsData]);

  // Resolve stored key
  useEffect(() => {
    const resolveKey = async () => {
      if (!selectedProvider || !useStoredKey) {
        setResolvedApiKey('');
        setResolvedKeyMasked('');
        return;
      }

      try {
        const resolved = await resolveAICredentials(selectedProvider, useStoredKey);
        setResolvedApiKey(resolved.key);
        setResolvedKeyMasked(resolved.masked);
      } catch {
        setResolvedApiKey('');
        setResolvedKeyMasked('');
      }
    };

    void resolveKey();
  }, [selectedProvider, useStoredKey]);

  const activeApiKey = useStoredKey ? resolvedApiKey : customApiKey;

  // Mutations
  const analyzeMutation = useMutation({
    mutationFn: () => analyzeSchema(endpoint),
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (useBasicMode) {
        return generateBasicConfig(endpoint);
      }

      if (!selectedProvider) {
        throw new Error('Select an AI provider to continue');
      }

      if (!useStoredKey && customApiKey) {
        await saveAICredentials(selectedProvider, customApiKey);
        refetchCredentials();
      }

      return generateConfig({
        endpoint,
        aiProvider: {
          provider: selectedProvider,
          apiKey: activeApiKey || undefined,
        },
        useBasic: false,
      });
    },
    onSuccess: (data) => {
      setGeneratedConfig(data.config);
      setAiResponse(data.aiResponse || null);
      setAnalysis(data.analysis);
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: () => saveConfig(generatedConfig!),
    onSuccess: () => {
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['config'] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Handlers
  const handleCopyConfig = async () => {
    if (generatedConfig) {
      await navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDownloadConfig = () => {
    if (generatedConfig) {
      const blob = new Blob([JSON.stringify(generatedConfig, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orion.config.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const canGenerate =
    !!endpoint &&
    (useBasicMode || (!!selectedProvider && (!!useStoredKey || !!customApiKey)));

  return (
    <div
      className="h-full flex flex-col animate-fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title
              className="font-display text-2xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Schema Analysis
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }}>
              Analyze your GraphQL schema and generate AI-powered cache configurations
            </Text>
          </div>
        </Flex>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Endpoint Section */}
          <EndpointSection
            endpoint={endpoint}
            endpointSource={endpointSource}
            isLoading={endpointLoading}
          />

          {/* AI Provider Section */}
          <AIProviderSection
            providers={providersData?.providers || []}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            useBasicMode={useBasicMode}
            onBasicModeChange={setUseBasicMode}
            credentialsData={credentialsData}
            useStoredKey={useStoredKey}
            onUseStoredKeyChange={setUseStoredKey}
            customApiKey={customApiKey}
            onCustomApiKeyChange={setCustomApiKey}
            resolvedKeyMasked={resolvedKeyMasked}
          />

          {/* Actions */}
          <Flex className="gap-3">
            <Button
              icon={Search}
              onClick={() => analyzeMutation.mutate()}
              loading={analyzeMutation.isPending}
              disabled={!endpoint}
            >
              Analyze Schema
            </Button>
            <Button
              icon={Sparkles}
              color="emerald"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              disabled={!canGenerate}
            >
              {useBasicMode ? 'Generate Basic Config' : 'Generate AI Config'}
            </Button>
          </Flex>

          {/* Error Messages */}
          {analyzeMutation.isError && (
            <Callout title="Analysis Failed" icon={AlertCircle} color="red">
              {analyzeMutation.error instanceof Error
                ? analyzeMutation.error.message
                : 'Failed to analyze schema'}
            </Callout>
          )}

          {generateMutation.isError && (
            <Callout title="Generation Failed" icon={AlertCircle} color="red">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : 'Failed to generate config'}
            </Callout>
          )}

          {/* Analysis Results */}
          {analysis && <AnalysisResults analysis={analysis} />}

          {/* Generated Config */}
          {generatedConfig && (
            <GeneratedConfigPanel
              config={generatedConfig}
              aiResponse={aiResponse}
              copySuccess={copySuccess}
              saveSuccess={saveSuccess}
              isSaving={saveConfigMutation.isPending}
              onCopy={handleCopyConfig}
              onDownload={handleDownloadConfig}
              onSave={() => saveConfigMutation.mutate()}
            />
          )}

          {/* Help Section */}
          <Callout title="How it works" icon={Info} color="blue">
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>The GraphQL endpoint is auto-discovered from your terraform state</li>
              <li>Schema introspection fetches all types, queries, and mutations</li>
              <li>AI analyzes the schema to determine optimal caching strategies</li>
              <li>Generated config can be applied directly to your Orion deployment</li>
            </ol>
          </Callout>
        </div>
      </div>
    </div>
  );
}
