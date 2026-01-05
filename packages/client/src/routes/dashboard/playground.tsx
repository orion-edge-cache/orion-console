/**
 * Playground Page - /dashboard/playground
 *
 * GraphQL query testing with cache analysis.
 * Split view: Editor left, Response Inspector right.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import {
  Card,
  Title,
  Text,
  Button,
  Badge,
  Flex,
  Callout,
} from '@tremor/react';
import { getInfrastructureStatus } from '../../services';
import { JsonHighlight } from '@/components/JsonHighlight';

export const Route = createFileRoute('/dashboard/playground')({
  component: PlaygroundPage,
});

interface ResponseData {
  data: unknown;
  headers: Record<string, string>;
  status: number;
  duration: number;
  _meta?: {
    usedFallback?: boolean;
    targetUrl?: string;
    cdnError?: string;
  };
}

interface CacheAnalysis {
  isHit: boolean;
  ttl: number | null;
  age: number | null;
  warnings: string[];
}

function PlaygroundPage() {
  const [query, setQuery] = useState(`query {
  __typename
}`);
  const [variables, setVariables] = useState('{}');
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
          setError(`Invalid JSON in Variables field: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
          setIsLoading(false);
          return;
        }
      }

      // Normalize query whitespace to prevent Compute service issues
      const normalizedQuery = query
        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
        .trim();

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
        const debugInfo = responseData.debug ? `\n\nDebug: ${JSON.stringify(responseData.debug, null, 2)}` : '';
        const targetUrl = responseData.targetUrl ? `\n\nTarget URL: ${responseData.targetUrl}` : '';
        const fallbackNote = responseData.usedFallback ? '\n\n⚠️ CDN returned 500, using backend URL as fallback (no caching)' : '';
        setError(errorMsg + debugInfo + targetUrl + fallbackNote);
        setIsLoading(false);
        return;
      }

      // Extract headers from response (proxy returns _meta.headers)
      const headers: Record<string, string> = {};
      if (responseData._meta?.headers) {
        // Convert header values to strings
        Object.entries(responseData._meta.headers).forEach(([key, value]) => {
          headers[key] = value !== null && value !== undefined ? String(value) : '';
        });
      } else {
        // Fallback: extract from response headers
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
    <div className="h-full flex flex-col animate-fade-in" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
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
                  border: '1px solid var(--color-border-subtle)'
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
        <div
          className="w-1/2 flex flex-col border-r"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border-subtle)'
          }}
        >
          <div className="flex-1 flex flex-col">
            <div
              className="px-4 py-2 border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)'
              }}
            >
              <Text className="text-sm font-medium">Query</Text>
            </div>
            <textarea
              className="flex-1 w-full p-4 text-sm focus:outline-none resize-none font-mono"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your GraphQL query..."
              spellCheck={false}
            />
          </div>
          <div
            className="h-32 border-t"
            style={{ borderColor: 'var(--color-border-subtle)' }}
          >
            <div
              className="px-4 py-2 border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)'
              }}
            >
              <Text className="text-sm font-medium">Variables</Text>
            </div>
            <textarea
              className="w-full h-20 p-4 text-sm focus:outline-none resize-none font-mono"
              style={{
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
              }}
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              placeholder="{}"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Response & Analysis */}
        <div
          className="w-1/2 flex flex-col overflow-hidden"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          {/* Cache Analysis Header */}
          {cacheAnalysis && (
            <div
              className="p-4 border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)'
              }}
            >
              {response && response._meta?.usedFallback && (
                <Callout
                  className="mb-3"
                  title="CDN unavailable"
                  icon={AlertTriangle}
                  color="amber"
                >
                  Using backend URL directly (no caching)
                </Callout>
              )}
              <Flex className="gap-4 flex-wrap">
                {/* Cache Status Badge */}
                <Badge
                  icon={cacheAnalysis.isHit ? CheckCircle : AlertTriangle}
                  color={cacheAnalysis.isHit ? 'emerald' : 'amber'}
                  size="lg"
                >
                  {cacheAnalysis.isHit ? 'CACHE HIT' : 'CACHE MISS'}
                </Badge>

                {/* TTL */}
                {cacheAnalysis.ttl !== null && (
                  <Badge icon={Clock} color="slate" size="md">
                    TTL: {cacheAnalysis.ttl}s
                  </Badge>
                )}

                {/* Age */}
                {cacheAnalysis.age !== null && (
                  <Badge color="slate" size="md">
                    Age: {cacheAnalysis.age}s
                  </Badge>
                )}

                {/* Response Time */}
                {response && (
                  <Badge color="slate" size="md">
                    {response.duration.toFixed(0)}ms
                  </Badge>
                )}
              </Flex>

              {/* Warnings */}
              {cacheAnalysis.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {cacheAnalysis.warnings.map((warning, i) => (
                    <Callout
                      key={i}
                      icon={AlertTriangle}
                      color="amber"
                    >
                      {warning}
                    </Callout>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Response Headers */}
          {response && (
            <div className="border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
              <details className="group">
                <summary
                  className="px-4 py-2 cursor-pointer flex items-center justify-between transition-colors"
                  style={{ background: 'var(--color-bg-tertiary)' }}
                >
                  <Text className="text-sm font-medium">
                    Response Headers ({Object.keys(response.headers).length})
                  </Text>
                  <span className="text-xs group-open:rotate-180 transition-transform text-slate-400">
                    ▼
                  </span>
                </summary>
                <div
                  className="p-4 max-h-40 overflow-auto border-t"
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    borderColor: 'var(--color-border-subtle)'
                  }}
                >
                  <table className="w-full text-xs font-mono">
                    <tbody>
                      {Object.entries(response.headers).map(([key, value]) => (
                        <tr
                          key={key}
                          className="border-b last:border-0"
                          style={{ borderColor: 'var(--color-border-subtle)' }}
                        >
                          <td className="py-1 pr-4 font-medium text-slate-500">{key}</td>
                          <td className="py-1 break-all text-slate-700">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}

          {/* Response Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="px-4 py-2 flex items-center justify-between border-b"
              style={{
                background: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-subtle)'
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
                <Callout
                  title="Error"
                  icon={AlertTriangle}
                  color="red"
                >
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

/**
 * Analyze cache headers and provide insights
 */
function analyzeCache(headers: Record<string, string>): CacheAnalysis {
  const warnings: string[] = [];

  // Check X-Cache header
  const xCache = headers['x-cache'] || headers['X-Cache'] || '';
  const isHit = xCache.toLowerCase().includes('hit');

  // Parse Cache-Control
  const cacheControl = headers['cache-control'] || headers['Cache-Control'] || '';
  let ttl: number | null = null;

  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  if (maxAgeMatch) {
    ttl = parseInt(maxAgeMatch[1], 10);
  }

  // Parse Age header
  const ageHeader = headers['age'] || headers['Age'];
  const age = ageHeader ? parseInt(ageHeader, 10) : null;

  // Check for cache-busting scenarios
  if (cacheControl.includes('private')) {
    warnings.push('Origin sent "private" cache directive - response cannot be cached');
  }

  if (cacheControl.includes('no-cache')) {
    warnings.push('Origin sent "no-cache" directive - requires revalidation');
  }

  if (cacheControl.includes('no-store')) {
    warnings.push('Origin sent "no-store" directive - response will not be cached');
  }

  // Check for Vary header issues
  const vary = headers['vary'] || headers['Vary'] || '';
  if (vary.includes('Authorization')) {
    warnings.push('Vary includes Authorization - may cause excessive cache fragmentation');
  }

  // Check for Surrogate-Control
  const surrogateControl = headers['surrogate-control'] || headers['Surrogate-Control'];
  if (surrogateControl) {
    const surrogateMaxAge = surrogateControl.match(/max-age=(\d+)/);
    if (surrogateMaxAge) {
      ttl = parseInt(surrogateMaxAge[1], 10);
    }
  }

  // MISS analysis
  if (!isHit && !warnings.length) {
    warnings.push('Cache MISS - this could be due to first request or cache expiration');
  }

  return {
    isHit,
    ttl,
    age,
    warnings,
  };
}
