/**
 * Playground Page - /dashboard/playground
 *
 * GraphQL query testing with cache analysis.
 * Split view: Editor left, Response Inspector right.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, AlertTriangle, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { Title, Text, Button, Flex, Callout } from '@tremor/react';
import { getInfrastructureStatus } from '../../services';
import { JsonHighlight } from '@/components/JsonHighlight';

// Local modules
import type { ResponseData, CacheAnalysis } from './playground/types';
import { STORAGE_KEYS, DEFAULT_QUERY } from './playground/constants';
import { getStoredValue, setStoredValue, analyzeCache } from './playground/utils';
import { QueryEditor, CacheAnalysisHeader, ResponseHeaders } from './playground/components';

export const Route = createFileRoute('/dashboard/playground')({
  component: PlaygroundPage,
});

function PlaygroundPage() {
  const [query, setQuery] = useState(() =>
    getStoredValue(STORAGE_KEYS.query, DEFAULT_QUERY)
  );
  const [variables, setVariables] = useState(() =>
    getStoredValue(STORAGE_KEYS.variables, '{}')
  );
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Persist query to localStorage
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.query, query);
  }, [query]);

  // Persist variables to localStorage
  useEffect(() => {
    setStoredValue(STORAGE_KEYS.variables, variables);
  }, [variables]);

  const { data: infraData } = useQuery({
    queryKey: ['infrastructure-status'],
    queryFn: getInfrastructureStatus,
  });

  const cdnEndpoint = infraData?.status?.services?.cdn
    ? `https://${infraData.status.services.cdn}/graphql`
    : null;

  const executeQuery = useCallback(async () => {
    if (!cdnEndpoint) {
      setError('No CDN endpoint available. Deploy infrastructure first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      // Parse variables JSON
      let parsedVariables: Record<string, unknown> | undefined;
      if (variables && variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (parseError) {
          setError(
            `Invalid JSON in Variables field: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`
          );
          setIsLoading(false);
          return;
        }
      }

      // Normalize query whitespace to prevent Compute service issues
      const normalizedQuery = query.replace(/\s+/g, ' ').trim();

      // Use the proxy endpoint to avoid CORS and for SSRF protection
      const res = await fetch('/api/proxy/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: normalizedQuery,
          variables: parsedVariables,
        }),
      });

      const duration = performance.now() - startTime;
      const responseData = await res.json();

      // Handle error responses
      if (!res.ok || responseData.error) {
        const errorMsg = responseData.error || `Request failed with status ${res.status}`;
        const debugInfo = responseData.debug
          ? `\n\nDebug: ${JSON.stringify(responseData.debug, null, 2)}`
          : '';
        const targetUrl = responseData.targetUrl
          ? `\n\nTarget URL: ${responseData.targetUrl}`
          : '';
        const fallbackNote = responseData.usedFallback
          ? '\n\n⚠️ CDN returned 500, using backend URL as fallback (no caching)'
          : '';
        setError(errorMsg + debugInfo + targetUrl + fallbackNote);
        setIsLoading(false);
        return;
      }

      // Extract headers from response (proxy returns _meta.headers)
      const headers: Record<string, string> = {};
      if (responseData._meta?.headers) {
        Object.entries(responseData._meta.headers).forEach(([key, value]) => {
          headers[key] = value !== null && value !== undefined ? String(value) : '';
        });
      } else {
        res.headers.forEach((value, key) => {
          headers[key] = value;
        });
      }

      setResponse({
        data: responseData.data || responseData,
        headers,
        status: responseData._meta?.statusCode || res.status,
        duration,
        _meta: responseData._meta,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setIsLoading(false);
    }
  }, [query, variables, cdnEndpoint]);

  const handleCopyResponse = () => {
    if (response?.data) {
      navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Analyze cache headers
  const cacheAnalysis: CacheAnalysis | null = response
    ? analyzeCache(response.headers)
    : null;

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
              Playground
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }}>
              Test GraphQL queries and inspect cache behavior
            </Text>
          </div>
          <Flex className="gap-4">
            {cdnEndpoint && (
              <a
                href={cdnEndpoint}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm"
                style={{
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                {cdnEndpoint}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button
              icon={isLoading ? Loader2 : Play}
              loading={isLoading}
              disabled={!cdnEndpoint}
              onClick={executeQuery}
            >
              Execute
            </Button>
          </Flex>
        </Flex>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Query Editor */}
        <QueryEditor
          query={query}
          onQueryChange={setQuery}
          variables={variables}
          onVariablesChange={setVariables}
        />

        {/* Right Panel - Response & Analysis */}
        <div
          className="w-1/2 flex flex-col overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          {/* Cache Analysis Header */}
          {cacheAnalysis && response && (
            <CacheAnalysisHeader analysis={cacheAnalysis} response={response} />
          )}

          {/* Response Headers */}
          {response && <ResponseHeaders headers={response.headers} />}

          {/* Response Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="px-4 py-2 flex items-center justify-between border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)',
              }}
            >
              <Text className="text-sm font-medium">Response</Text>
              {response && (
                <Button
                  size="xs"
                  variant="light"
                  icon={copied ? Check : Copy}
                  color={copied ? 'emerald' : 'slate'}
                  onClick={handleCopyResponse}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {error ? (
                <Callout title="Error" icon={AlertTriangle} color="red">
                  {error}
                </Callout>
              ) : response ? (
                <JsonHighlight data={response.data} />
              ) : (
                <Text className="text-sm text-slate-400">
                  Execute a query to see the response
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
