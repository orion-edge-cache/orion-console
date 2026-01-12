/**
 * Schema Analysis Page - /dashboard/schema
 *
 * Analyze GraphQL schemas and generate AI-powered cache configurations.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Copy,
  Download,
  RefreshCw,
  Key,
  ExternalLink,
  Database,
  GitBranch,
  Zap,
} from "lucide-react";
import {
  Card,
  Title,
  Text,
  Button,
  Flex,
  Badge,
  Callout,
  Select,
  SelectItem,
  TextInput,
  Grid,
  Accordion,
  AccordionHeader,
  AccordionBody,
  AccordionList,
  Switch,
} from "@tremor/react";
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
} from "../../services";

export const Route = createFileRoute("/dashboard/schema")({
  component: SchemaPage,
});

function SchemaPage() {
  const queryClient = useQueryClient();

  // State
  const [endpoint, setEndpoint] = useState<string>("");
  const [endpointSource, setEndpointSource] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [useStoredKey, setUseStoredKey] = useState<"saved" | "env" | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [resolvedApiKey, setResolvedApiKey] = useState<string>("");
  const [resolvedKeyMasked, setResolvedKeyMasked] = useState<string>("");
  const [useBasicMode, setUseBasicMode] = useState<boolean>(false);
  const [generatedConfig, setGeneratedConfig] = useState<OrionCacheConfig | null>(null);
  const [aiResponse, setAiResponse] = useState<AIConfigResponse | null>(null);
  const [analysis, setAnalysis] = useState<SchemaAnalysis | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Queries
  const { data: endpointData, isLoading: endpointLoading } = useQuery({
    queryKey: ["schema-endpoint"],
    queryFn: getSchemaEndpoint,
    retry: false,
  });

  const { data: providersData } = useQuery({
    queryKey: ["schema-providers"],
    queryFn: getProviders,
  });

  const { data: credentialsData, refetch: refetchCredentials } = useQuery({
    queryKey: ["schema-credentials"],
    queryFn: getAICredentialsStatus,
  });

  // Set endpoint from terraform state
  useEffect(() => {
    if (endpointData?.endpoint) {
      setEndpoint(endpointData.endpoint);
      setEndpointSource(endpointData.source);
    }
  }, [endpointData]);

  useEffect(() => {
    if (!selectedProvider || !credentialsData) {
      setUseStoredKey(null);
      setResolvedApiKey("");
      setResolvedKeyMasked("");
      return;
    }

    const status = credentialsData[
      selectedProvider as keyof AICredentialsStatusResponse
    ];

    // Auto-check the first available source
    if (status?.saved) {
      setUseStoredKey("saved");
    } else if (status?.env) {
      setUseStoredKey("env");
    } else {
      setUseStoredKey(null);
    }

    setCustomApiKey("");
  }, [selectedProvider, credentialsData]);

  useEffect(() => {
    const resolveKey = async () => {
      if (!selectedProvider || !useStoredKey) {
        setResolvedApiKey("");
        setResolvedKeyMasked("");
        return;
      }

      try {
        const resolved = await resolveAICredentials(selectedProvider, useStoredKey);
        setResolvedApiKey(resolved.key);
        setResolvedKeyMasked(resolved.masked);
      } catch {
        setResolvedApiKey("");
        setResolvedKeyMasked("");
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
        throw new Error("Select an AI provider to continue");
      }

      // If using manual entry, save to config file
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
      queryClient.invalidateQueries({ queryKey: ["config"] });
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
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orion.config.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Check if provider has credentials
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
  const canGenerate =
    !!endpoint &&
    (useBasicMode || (!!selectedProvider && (!!useStoredKey || !!customApiKey)));

  return (
    <div
      className="h-full flex flex-col animate-fade-in"
      style={{ background: "var(--color-bg-primary)" }}
    >
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title
              className="font-display text-2xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Schema Analysis
            </Title>
            <Text style={{ color: "var(--color-text-tertiary)" }}>
              Analyze your GraphQL schema and generate AI-powered cache configurations
            </Text>
          </div>
        </Flex>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Endpoint Section */}
          <Card>
            <Title className="mb-4">GraphQL Endpoint</Title>

            {endpointLoading ? (
              <Flex className="gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <Text>Loading endpoint from terraform state...</Text>
              </Flex>
            ) : endpoint ? (
              <div>
                <Flex className="gap-2 items-center">
                  <TextInput
                    value={endpoint}
                    disabled
                    className="flex-1 font-mono"
                  />
                  <Badge color="emerald" size="sm">
                    {endpointSource}
                  </Badge>
                </Flex>
                <Text className="text-xs mt-2 text-slate-500">
                  Endpoint auto-discovered from ~/.config/orion/terraform.tfstate
                </Text>
              </div>
            ) : (
              <Callout
                title="No endpoint found"
                icon={AlertCircle}
                color="amber"
              >
                Deploy infrastructure first using &quot;orion deploy&quot; to discover
                the GraphQL endpoint automatically.
              </Callout>
            )}
          </Card>

          {/* AI Provider Section */}
          <Card>
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <Title>AI Provider</Title>
              <Flex className="gap-2 items-center">
                <Text className="text-sm">Use Basic Mode (No AI)</Text>
                <Switch
                  checked={useBasicMode}
                  onChange={setUseBasicMode}
                />
              </Flex>
            </Flex>

            {useBasicMode ? (
              <Callout
                title="Basic Mode"
                icon={Info}
                color="blue"
              >
                Basic mode uses heuristics to generate cache rules without AI.
                Results may be less optimal but don&apos;t require an API key.
              </Callout>
            ) : (
              <div className="space-y-4">
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                  placeholder="Select an AI provider..."
                >
                  {providersData?.providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <Flex className="gap-2 items-center">
                        <span>{provider.name}</span>
                        {providerHasCredentials(provider.id) && (
                          <Badge color="emerald" size="xs">
                            Configured
                          </Badge>
                        )}
                      </Flex>
                    </SelectItem>
                  ))}
                </Select>

                {selectedProvider && (
                  <div className="space-y-3">
                    {/* Provider Info */}
                    {providersData?.providers.find((p) => p.id === selectedProvider) && (
                      <div className="p-3 rounded-lg bg-slate-50">
                        <Text className="text-sm">
                          {providersData.providers.find((p) => p.id === selectedProvider)?.description}
                        </Text>
                        <Flex className="gap-4 mt-2">
                          <Badge color="slate" size="sm">
                            {providersData.providers.find((p) => p.id === selectedProvider)?.pricing}
                          </Badge>
                          <a
                            href={providersData.providers.find((p) => p.id === selectedProvider)?.setupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Get API Key <ExternalLink className="w-3 h-3" />
                          </a>
                        </Flex>
                      </div>
                    )}

                    {/* Credential Selection - Checkbox Style */}
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
                            checked={useStoredKey === "saved"}
                            onChange={(e) => setUseStoredKey(e.target.checked ? "saved" : null)}
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
                            checked={useStoredKey === "env"}
                            onChange={(e) => setUseStoredKey(e.target.checked ? "env" : null)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <Flex className="gap-2 items-center">
                              <Text className="text-sm font-medium">Use environment variable</Text>
                              <Badge color="blue" size="xs">Server Env</Badge>
                            </Flex>
                            <Text className="text-xs text-slate-500 font-mono">
                              {currentProviderStatus?.envMasked || "Available"}
                            </Text>
                          </div>
                        </label>
                      )}

                      {/* Manual Entry - shown when no checkbox is checked */}
                      {!useStoredKey && (
                        <div className="space-y-2">
                          <TextInput
                            type="password"
                            placeholder="Enter your API key..."
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                          />
                          <Text className="text-sm text-slate-600">
                            This key will be saved to ~/.config/orion/deployment-config.json
                          </Text>
                        </div>
                      )}

                      {/* Show resolved key confirmation when using stored key */}
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
              {useBasicMode ? "Generate Basic Config" : "Generate AI Config"}
            </Button>
          </Flex>

          {/* Error Messages */}
          {analyzeMutation.isError && (
            <Callout
              title="Analysis Failed"
              icon={AlertCircle}
              color="red"
            >
              {analyzeMutation.error instanceof Error
                ? analyzeMutation.error.message
                : "Failed to analyze schema"}
            </Callout>
          )}

          {generateMutation.isError && (
            <Callout
              title="Generation Failed"
              icon={AlertCircle}
              color="red"
            >
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : "Failed to generate config"}
            </Callout>
          )}

          {/* Analysis Results */}
          {analysis && (
            <Card>
              <Title className="mb-4">Schema Analysis</Title>
              <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mb-6">
                <StatCard
                  icon={<Database className="w-5 h-5" />}
                  label="Entity Types"
                  value={analysis.entities.filter((e) => !e.characteristics.isRootType).length.toString()}
                />
                <StatCard
                  icon={<Search className="w-5 h-5" />}
                  label="Queries"
                  value={analysis.queries.length.toString()}
                />
                <StatCard
                  icon={<Zap className="w-5 h-5" />}
                  label="Mutations"
                  value={analysis.mutations.length.toString()}
                />
                <StatCard
                  icon={<GitBranch className="w-5 h-5" />}
                  label="Relationships"
                  value={analysis.relationships.length.toString()}
                />
              </Grid>

              <AccordionList>
                <Accordion>
                  <AccordionHeader>
                    <Flex className="gap-2 items-center">
                      <Database className="w-4 h-4" />
                      <Text className="font-medium">Entity Types ({analysis.entities.filter((e) => !e.characteristics.isRootType).length})</Text>
                    </Flex>
                  </AccordionHeader>
                  <AccordionBody>
                    <div className="space-y-2">
                      {analysis.entities
                        .filter((e) => !e.characteristics.isRootType)
                        .map((entity) => (
                          <div
                            key={entity.name}
                            className="p-3 rounded-lg bg-slate-50 flex items-center justify-between"
                          >
                            <div>
                              <Text className="font-mono font-medium">{entity.name}</Text>
                              <Text className="text-xs text-slate-500">
                                {entity.fields.length} fields
                              </Text>
                            </div>
                            <Flex className="gap-1">
                              {entity.characteristics.isVolatile && (
                                <Badge color="amber" size="xs">Volatile</Badge>
                              )}
                              {entity.characteristics.isUserSpecific && (
                                <Badge color="blue" size="xs">User-Specific</Badge>
                              )}
                              {entity.characteristics.hasSensitiveFields && (
                                <Badge color="red" size="xs">Sensitive</Badge>
                              )}
                            </Flex>
                          </div>
                        ))}
                    </div>
                  </AccordionBody>
                </Accordion>

                <Accordion>
                  <AccordionHeader>
                    <Flex className="gap-2 items-center">
                      <Search className="w-4 h-4" />
                      <Text className="font-medium">Queries ({analysis.queries.length})</Text>
                    </Flex>
                  </AccordionHeader>
                  <AccordionBody>
                    <div className="space-y-2">
                      {analysis.queries.map((query) => (
                        <div
                          key={query.name}
                          className="p-3 rounded-lg bg-slate-50"
                        >
                          <Text className="font-mono font-medium">{query.name}</Text>
                          <Text className="text-xs text-slate-500">
                            Returns: {query.returnsList ? `[${query.returnType}]` : query.returnType}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </AccordionBody>
                </Accordion>

                <Accordion>
                  <AccordionHeader>
                    <Flex className="gap-2 items-center">
                      <Zap className="w-4 h-4" />
                      <Text className="font-medium">Mutations ({analysis.mutations.length})</Text>
                    </Flex>
                  </AccordionHeader>
                  <AccordionBody>
                    <div className="space-y-2">
                      {analysis.mutations.map((mutation) => (
                        <div
                          key={mutation.name}
                          className="p-3 rounded-lg bg-slate-50"
                        >
                          <Text className="font-mono font-medium">{mutation.name}</Text>
                          <Text className="text-xs text-slate-500">
                            Affects: {mutation.affectedTypes.join(", ") || "None detected"}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </AccordionBody>
                </Accordion>
              </AccordionList>
            </Card>
          )}

          {/* Generated Config */}
          {generatedConfig && (
            <Card>
              <Flex justifyContent="between" alignItems="center" className="mb-4">
                <div>
                  <Title>Generated Configuration</Title>
                  {aiResponse && (
                    <Flex className="gap-2 mt-1">
                      <Badge color="emerald">
                        Confidence: {(aiResponse.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Badge color="slate">
                        {aiResponse.rules.length} rules
                      </Badge>
                    </Flex>
                  )}
                </div>
                <Flex className="gap-2">
                  <Button
                    variant="secondary"
                    icon={copySuccess ? CheckCircle : Copy}
                    onClick={handleCopyConfig}
                  >
                    {copySuccess ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={handleDownloadConfig}
                  >
                    Download
                  </Button>
                  <Button
                    icon={saveSuccess ? CheckCircle : RefreshCw}
                    color="emerald"
                    onClick={() => saveConfigMutation.mutate()}
                    loading={saveConfigMutation.isPending}
                  >
                    {saveSuccess ? "Saved!" : "Apply Config"}
                  </Button>
                </Flex>
              </Flex>

              {/* AI Explanation */}
              {aiResponse?.explanation && (
                <Callout
                  title="AI Analysis"
                  icon={Sparkles}
                  color="blue"
                  className="mb-4"
                >
                  {aiResponse.explanation}
                </Callout>
              )}

              {/* Warnings */}
              {aiResponse?.warnings && aiResponse.warnings.length > 0 && (
                <Callout
                  title="Considerations"
                  icon={AlertCircle}
                  color="amber"
                  className="mb-4"
                >
                  <ul className="list-disc list-inside mt-2">
                    {aiResponse.warnings.map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              {/* Config Preview */}
              <div
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <div
                  className="px-4 py-2 flex items-center justify-between border-b"
                  style={{
                    background: "var(--color-bg-tertiary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                >
                  <Text className="text-sm font-medium">orion.config.json</Text>
                  <Badge color="cyan" size="sm">JSON</Badge>
                </div>
                <pre
                  className="p-4 text-sm overflow-auto max-h-96 font-mono"
                  style={{
                    background: "var(--color-bg-secondary)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {JSON.stringify(generatedConfig, null, 2)}
                </pre>
              </div>

              {/* Rule Explanations */}
              {aiResponse?.rules && aiResponse.rules.length > 0 && (
                <div className="mt-6">
                  <Title className="text-base mb-3">Rule Explanations</Title>
                  <div className="space-y-2">
                    {aiResponse.rules.map((rule, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-slate-50"
                      >
                        <Flex className="gap-2 items-center mb-1">
                          <Text className="font-mono text-sm font-medium">
                            {rule.types.join(", ")}
                          </Text>
                          <Badge color="slate" size="xs">
                            {rule.maxAge}s TTL
                          </Badge>
                          {rule.scope && (
                            <Badge color={rule.scope === "private" ? "amber" : "emerald"} size="xs">
                              {rule.scope}
                            </Badge>
                          )}
                          {rule.passthrough && (
                            <Badge color="red" size="xs">
                              passthrough
                            </Badge>
                          )}
                        </Flex>
                        <Text className="text-xs text-slate-600">
                          {rule.reasoning}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Help Section */}
          <Callout
            title="How it works"
            icon={Info}
            color="blue"
          >
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

// =============================================================================
// COMPONENTS
// =============================================================================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-slate-50">
      <Flex className="gap-2 items-center mb-2">
        <span className="text-slate-500">{icon}</span>
        <Text className="text-sm text-slate-600">{label}</Text>
      </Flex>
      <Text className="text-2xl font-bold">{value}</Text>
    </div>
  );
}
