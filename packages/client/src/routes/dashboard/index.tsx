/**
 * Dashboard Overview
 *
 * High-level health view with real-time metrics.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
  ExternalLink,
  Wifi,
  WifiOff,
  ArrowRight,
  BarChart3,
  Play,
  FileCode
} from 'lucide-react';
import {
  Card,
  Metric,
  Text,
  Badge,
  Button,
  Grid,
  Col,
  Flex,
  Title,
  Subtitle,
} from '@tremor/react';
import { getConfig, getInfrastructureStatus } from '../../services';
import { useMetrics } from '../../context';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { data: configData } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
    staleTime: 60000,
  });

  const { data: infraData } = useQuery({
    queryKey: ['infrastructure-status'],
    queryFn: getInfrastructureStatus,
    staleTime: 30000,
  });

  const { dataPoints, isConnected } = useMetrics();

  const config = configData?.config;
  const services = infraData?.status?.services;
  const deployed = infraData?.status?.deployed;

  // Calculate stats from last 60 seconds
  const stats = useMemo(() => {
    const now = Date.now();
    const recentPoints = dataPoints.filter(p => now - p.time < 60000);

    if (recentPoints.length === 0) {
      return { cacheHitRate: null, requestsPerMin: 0, avgLatency: null };
    }

    const recentRequests = recentPoints.reduce((sum, p) => sum + p.requests, 0);
    const recentHits = recentPoints.reduce((sum, p) => sum + p.hits, 0);
    const recentMisses = recentPoints.reduce((sum, p) => sum + p.misses, 0);
    const recentLatency = recentPoints.reduce((sum, p) => sum + (p.avgLatency * p.requests), 0);

    const cacheHitRate = (recentHits + recentMisses) > 0
      ? recentHits / (recentHits + recentMisses)
      : null;

    return {
      cacheHitRate,
      requestsPerMin: recentRequests,
      avgLatency: recentRequests > 0 ? recentLatency / recentRequests : null,
    };
  }, [dataPoints]);

  return (
    <div className="min-h-full p-8 animate-fade-in">
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <div>
          <Title className="font-display text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Dashboard
          </Title>
          <Text style={{ color: 'var(--color-text-tertiary)' }}>
            Real-time overview of your GraphQL edge cache
          </Text>
        </div>

        {/* Connection Status */}
        <Badge
          icon={isConnected ? Wifi : WifiOff}
          color={isConnected ? 'emerald' : 'red'}
          size="lg"
        >
          {isConnected ? 'Live' : 'Disconnected'}
        </Badge>
      </Flex>

      {/* Status Banner */}
      {deployed && services?.cdn && (
        <Card className="mb-8 bg-emerald-50 border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="status-dot status-dot-success status-dot-pulse" />
              <div>
                <Text className="font-medium text-emerald-700">
                  Infrastructure Active
                </Text>
                <Text className="font-mono text-sm text-slate-600">
                  {services.cdn}
                </Text>
              </div>
            </div>
            <Button
              variant="light"
              color="emerald"
              icon={ExternalLink}
              iconPosition="right"
              onClick={() => window.open(`https://${services.cdn}/graphql`, '_blank')}
            >
              Open Endpoint
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Grid - 4 columns */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mb-8">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          iconColor="text-emerald-500"
          label="Cache Hit Rate"
          value={stats.cacheHitRate != null ? `${(stats.cacheHitRate * 100).toFixed(1)}%` : '--'}
          description="Hits / (Hits + Misses)"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="text-cyan-500"
          label="Requests/min"
          value={stats.requestsPerMin.toFixed(0)}
          description="Current throughput"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          iconColor="text-blue-500"
          label="Avg Latency"
          value={stats.avgLatency != null ? `${stats.avgLatency.toFixed(0)}ms` : '--'}
          description="Response time"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          iconColor="text-amber-500"
          label="Default TTL"
          value={`${config?.defaults?.maxAge || 0}s`}
          description="Max cache age"
        />
      </Grid>

      {/* Quick Actions */}
      <Title className="font-display text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        Quick Actions
      </Title>
      <Grid numItemsMd={3} className="gap-4 mb-8">
        <QuickActionCard
          to="/dashboard/analytics"
          icon={<BarChart3 className="w-5 h-5" />}
          title="View Analytics"
          description="Deep dive into cache performance"
          accentColor="emerald"
        />
        <QuickActionCard
          to="/dashboard/playground"
          icon={<Play className="w-5 h-5" />}
          title="Test Queries"
          description="Try GraphQL queries live"
          accentColor="cyan"
        />
        <QuickActionCard
          to="/dashboard/configure"
          icon={<FileCode className="w-5 h-5" />}
          title="Edit Rules"
          description="Configure cache TTLs"
          accentColor="blue"
        />
      </Grid>

      {/* Deployed Resources */}
      {deployed && services && (
        <>
          <Title className="font-display text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Deployed Resources
          </Title>
          <Card>
            <Grid numItemsMd={2} className="gap-3">
              <ResourceRow label="CDN Service" value={services.cdn} provider="Fastly" />
              <ResourceRow label="Compute Service" value={services.compute} provider="Fastly" />
              <ResourceRow label="Kinesis Stream" value={services.kinesis} provider="AWS" />
              <ResourceRow label="S3 Bucket" value={services.s3} provider="AWS" />
            </Grid>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────────────────────────────────────── */

function StatCard({
  icon,
  iconColor,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card decoration="top" decorationColor="slate">
      <Flex alignItems="center" className="gap-2 mb-3">
        <span className={iconColor}>{icon}</span>
        <Text className="text-sm font-medium">{label}</Text>
      </Flex>
      <Metric className="font-display">{value}</Metric>
      <Text className="text-xs mt-1">{description}</Text>
    </Card>
  );
}

function QuickActionCard({
  to,
  icon,
  title,
  description,
  accentColor,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: 'emerald' | 'cyan' | 'blue' | 'amber';
}) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <Link to={to}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        <Flex alignItems="start" justifyContent="between" className="mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accentColor]}`}>
            {icon}
          </div>
          <ArrowRight
            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-slate-400"
          />
        </Flex>
        <Title className="text-base font-semibold mb-1">{title}</Title>
        <Text className="text-sm">{description}</Text>
      </Card>
    </Link>
  );
}

function ResourceRow({
  label,
  value,
  provider,
}: {
  label: string;
  value?: string;
  provider: 'AWS' | 'Fastly';
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50">
      <div>
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="font-mono text-sm truncate max-w-[280px]">
          {value || 'N/A'}
        </Text>
      </div>
      <Badge color={provider === 'AWS' ? 'amber' : 'rose'} size="sm">
        {provider}
      </Badge>
    </div>
  );
}
