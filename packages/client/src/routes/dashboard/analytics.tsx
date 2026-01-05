/**
 * Analytics Page - /dashboard/analytics
 *
 * Real-time cache performance metrics with custom charts.
 * Data is pushed via SSE from the backend.
 * Minimal light design with glassmorphism.
 */

import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Flex,
  Grid,
  Metric,
  Text,
  Title,
} from '@tremor/react';
import { useMetrics } from '../../context';
import { HitRateChart, RequestsChart, LatencyChart } from '@/components/MetricsChart';
import { getConfig, getInfrastructureStatus } from '../../services';

export const Route = createFileRoute('/dashboard/analytics')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [copied, setCopied] = useState(false);

  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    staleTime: 60000, // Config doesn't change often
  });

  const { data: infraData } = useQuery({
    queryKey: ['infrastructure-status'],
    queryFn: getInfrastructureStatus,
    staleTime: 30000,
  });

  // Real-time metrics via SSE (shared across all pages)
  const { metrics, dataPoints, isConnected } = useMetrics();

  const config = configData?.config;
  const services = infraData?.status?.services;

  // Calculate stats from last 60 seconds (real-time) + total requests (session)
  const aggregatedStats = useMemo(() => {
    const now = Date.now();

    // Real-time stats: last 60 seconds only
    const recentPoints = dataPoints.filter(p => now - p.time < 60000);

    // Session total (for reference)
    const totalRequests = dataPoints.reduce((sum, p) => sum + p.requests, 0);

    if (recentPoints.length === 0) {
      return {
        cacheHitRate: null,
        overallHitRate: null,
        requestsPerSec: 0,
        avgLatency: null,
        totalRequests,
        errors4xx: 0,
        errors5xx: 0,
      };
    }

    const recentRequests = recentPoints.reduce((sum, p) => sum + p.requests, 0);
    const recentHits = recentPoints.reduce((sum, p) => sum + p.hits, 0);
    const recentMisses = recentPoints.reduce((sum, p) => sum + p.misses, 0);
    const recentPasses = recentPoints.reduce((sum, p) => sum + (p.passes || 0), 0);
    const recentLatency = recentPoints.reduce((sum, p) => sum + (p.avgLatency * p.requests), 0);
    const recentSeconds = Math.max(recentPoints.length, 1);

    // Cache hit rate: hits / (hits + misses) - effectiveness for cacheable requests
    const cacheHitRate = (recentHits + recentMisses) > 0 ? recentHits / (recentHits + recentMisses) : null;

    // Overall hit rate: hits / total - percentage of all requests served from cache
    const overallHitRate = recentRequests > 0 ? recentHits / recentRequests : null;

    // Error counts
    const errors4xx = recentPoints.reduce((sum, p) => sum + (p.errors4xx || 0), 0);
    const errors5xx = recentPoints.reduce((sum, p) => sum + (p.errors5xx || 0), 0);

    return {
      cacheHitRate,
      overallHitRate,
      requestsPerSec: recentRequests > 0 ? recentRequests / recentSeconds : 0,
      avgLatency: recentRequests > 0 ? recentLatency / recentRequests : null,
      totalRequests,
      errors4xx,
      errors5xx,
    };
  }, [dataPoints]);

  // Format metrics for display
  const cacheHitRateDisplay = aggregatedStats.cacheHitRate != null
    ? `${(aggregatedStats.cacheHitRate * 100).toFixed(1)}%`
    : '--';
  const overallHitRateDisplay = aggregatedStats.overallHitRate != null
    ? `${(aggregatedStats.overallHitRate * 100).toFixed(1)}%`
    : '--';
  const requestsPerMinDisplay = aggregatedStats.requestsPerSec != null
    ? `${(aggregatedStats.requestsPerSec * 60).toFixed(0)}`
    : '--';
  const avgLatencyDisplay = aggregatedStats.avgLatency != null
    ? `${aggregatedStats.avgLatency.toFixed(0)}ms`
    : '--';
  const totalRequestsDisplay = aggregatedStats.totalRequests != null
    ? aggregatedStats.totalRequests.toLocaleString()
    : '--';
  const errorsDisplay = (aggregatedStats.errors4xx || 0) + (aggregatedStats.errors5xx || 0);

  const handleCopyEndpoint = () => {
    if (services?.cdn) {
      navigator.clipboard.writeText(`https://${services.cdn}/graphql`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="h-full overflow-auto animate-fade-in"
      style={{ background: 'var(--color-bg-primary)' }}
    >
      {/* Header */}
      <header
        className="px-8 py-6 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Analytics
            </Title>
            <Text style={{ color: 'var(--color-text-tertiary)' }}>
              Real-time cache performance metrics
            </Text>
          </div>
          <Badge
            icon={isConnected ? Wifi : WifiOff}
            color={isConnected ? 'emerald' : 'red'}
            size="lg"
          >
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </Flex>
      </header>

      <div className="p-8">
        {/* Endpoint Banner */}
        {services?.cdn && (
          <Card className="mb-6">
            <Flex justifyContent="between" alignItems="center">
              <div>
                <Text className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  CDN Endpoint
                </Text>
                <Text className="text-sm font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  https://{services.cdn}/graphql
                </Text>
              </div>
              <Button
                variant="secondary"
                icon={copied ? Check : Copy}
                onClick={handleCopyEndpoint}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </Flex>
          </Card>
        )}

        {/* Stats Row */}
        <Grid numItemsSm={2} numItemsMd={3} numItemsLg={6} className="gap-4 mb-6">
          <StatCard
            label="Cache Hit Rate"
            value={cacheHitRateDisplay}
            icon={<Target className="w-4 h-4" />}
            colorVar="var(--color-success)"
            subtext="Hits / (Hits+Misses)"
          />
          <StatCard
            label="Overall Hit Rate"
            value={overallHitRateDisplay}
            icon={<Activity className="w-4 h-4" />}
            colorVar="var(--color-accent)"
            subtext="Hits / Total"
          />
          <StatCard
            label="Req/min"
            value={requestsPerMinDisplay}
            icon={<TrendingUp className="w-4 h-4" />}
            colorVar="var(--color-info)"
          />
          <StatCard
            label="Latency"
            value={avgLatencyDisplay}
            icon={<Zap className="w-4 h-4" />}
            colorVar="#a855f7"
          />
          <StatCard
            label="Total Requests"
            value={totalRequestsDisplay}
            icon={<Activity className="w-4 h-4" />}
            colorVar="var(--color-warning)"
            subtext={`TTL: ${config?.defaults?.maxAge || 0}s`}
          />
          <StatCard
            label="Errors"
            value={errorsDisplay.toString()}
            icon={<AlertTriangle className="w-4 h-4" />}
            colorVar={errorsDisplay > 0 ? "var(--color-error)" : "var(--color-text-muted)"}
            subtext={`4xx: ${aggregatedStats.errors4xx || 0} | 5xx: ${aggregatedStats.errors5xx || 0}`}
          />
        </Grid>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hit Rate Chart */}
          <Card>
            <Text className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Target className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
              Cache Hit Rate
            </Text>
            <HitRateChart dataPoints={dataPoints} height={250} />
          </Card>

          {/* Requests Chart */}
          <Card>
            <Text className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-info)' }} />
              Requests per Second
            </Text>
            <RequestsChart dataPoints={dataPoints} height={250} />
          </Card>

          {/* Latency Chart - Full Width */}
          <Card className="lg:col-span-2">
            <Text className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <Zap className="w-4 h-4" style={{ color: '#a855f7' }} />
              Response Latency
            </Text>
            <LatencyChart dataPoints={dataPoints} height={200} />
          </Card>
        </div>

        {/* Data Points Info */}
        <Text className="mt-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing last {dataPoints.length} data points ({Math.floor(dataPoints.length / 60)} minutes of data)
        </Text>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  colorVar: string;
  subtext?: string;
}

function StatCard({ label, value, icon, colorVar, subtext }: StatCardProps) {
  return (
    <Card>
      <Flex alignItems="center" className="gap-2 mb-2">
        <div
          className="p-1.5 rounded-md"
          style={{
            background: `color-mix(in srgb, ${colorVar} 15%, transparent)`,
            color: colorVar
          }}
        >
          {icon}
        </div>
        <Text className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
          {label}
        </Text>
      </Flex>
      <Metric className="font-display">{value}</Metric>
      {subtext && (
        <Text className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {subtext}
        </Text>
      )}
    </Card>
  );
}
