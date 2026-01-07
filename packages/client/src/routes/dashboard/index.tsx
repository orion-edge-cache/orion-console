/**
 * Dashboard Overview
 *
 * High-level health view with real-time metrics.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  TrendingUp,
  Clock,
  Zap,
  Wifi,
  WifiOff,
  Trash2,
  TestTube2,
} from "lucide-react";
import {
  Card,
  Text,
  Badge,
  Grid,
  Flex,
  Title,
} from "@tremor/react";

// Services
import {
  getConfig,
  getInfrastructureStatus,
  purgeCache,
} from "../../services";

// Context
import { useMetrics } from "../../context";

// Shared components
import { ConfirmDialog, AlertDialog, Toast } from "../../components/Dialogs";

// Dashboard-specific components
import {
  StatCard,
  ActionCard,
  ResourceRow,
  StatusBanner,
} from "../../components/dashboard";
import {
  CacheTestsResultDialog,
  AnalyticsResultDialog,
} from "../../components/dashboard/dialogs";

// Dashboard-specific hooks
import {
  useDashboardStats,
  useDemoActions,
  useToast,
} from "../../hooks/dashboard";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Queries
  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
    staleTime: 60000,
  });

  const { data: infraData } = useQuery({
    queryKey: ["infrastructure-status"],
    queryFn: getInfrastructureStatus,
    staleTime: 30000,
  });

  // Metrics context
  const { dataPoints, isConnected } = useMetrics();

  // Custom hooks
  const stats = useDashboardStats(dataPoints);
  const { toast, showToast, hideToast } = useToast();
  const demoActions = useDemoActions((message) => showToast(message, "error"));

  // Purge mutation
  const purgeMutation = useMutation({
    mutationFn: purgeCache,
    onSuccess: () => {
      showToast("Cache purged successfully", "success");
    },
    onError: (error: Error) => {
      showToast(error.message, "error");
    },
  });

  // Derived data
  const config = configData?.config;
  const services = infraData?.status?.services;
  const deployed = infraData?.status?.deployed;

  return (
    <div className="min-h-full p-8 animate-fade-in">
      {/* Header */}
      <Flex justifyContent="between" alignItems="center" className="mb-8">
        <div>
          <Title
            className="font-display text-3xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Dashboard
          </Title>
          <Text style={{ color: "var(--color-text-tertiary)" }}>
            Real-time overview of your GraphQL edge cache
          </Text>
        </div>

        {/* Connection Status */}
        <Badge
          icon={isConnected ? Wifi : WifiOff}
          color={isConnected ? "emerald" : "red"}
          size="lg"
        >
          {isConnected ? "Live" : "Disconnected"}
        </Badge>
      </Flex>

      {/* Status Banner */}
      {deployed && services?.cdn && (
        <StatusBanner cdnUrl={services.cdn} />
      )}

      {/* Stats Grid - 4 columns */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mb-8">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          iconColor="text-emerald-500"
          label="Cache Hit Rate"
          value={
            stats.cacheHitRate != null
              ? `${(stats.cacheHitRate * 100).toFixed(1)}%`
              : "--"
          }
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
          value={
            stats.avgLatency != null ? `${stats.avgLatency.toFixed(0)}ms` : "--"
          }
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
      <Title
        className="font-display text-lg font-semibold mb-4"
        style={{ color: "var(--color-text-primary)" }}
      >
        Quick Actions
      </Title>
      <Grid numItemsMd={2} numItemsLg={4} className="gap-4 mb-8">
        {/* Purge Cache */}
        <ActionCard
          icon={<Trash2 className="w-5 h-5" />}
          title="Purge Cache"
          description="Clear all cached responses"
          accentColor="red"
          onClick={() => setShowPurgeConfirm(true)}
          loading={purgeMutation.isPending}
        />

        {/* Run Tests (Demo) */}
        <ActionCard
          icon={<TestTube2 className="w-5 h-5" />}
          title="Run Tests"
          description="Run cache validation tests"
          accentColor="purple"
          onClick={() => demoActions.handleDemoAction("run-tests")}
          loading={demoActions.cacheTestsMutation.isPending}
          tooltip={[
            "Validates that cache headers are being set correctly",
            "Tests cache HIT/MISS behavior",
            "Verifies surrogate keys are working",
            "Checks TTL configurations match expectations",
          ]}
        />

        {/* Generate Traffic (Demo) */}
        <ActionCard
          icon={<Activity className="w-5 h-5" />}
          title="Generate Traffic"
          description="Create sample analytics data"
          accentColor="cyan"
          onClick={() => demoActions.handleDemoAction("generate-traffic")}
          loading={demoActions.analyticsMutation.isPending}
          tooltip={[
            "Sends ~1000 sample GraphQL requests to the edge cache",
            "Mix of queries and mutations",
            "Populates the analytics dashboard with real data",
            "Shows cache hit rate, latency comparisons, and performance metrics",
          ]}
        />
      </Grid>

      {/* Deployed Resources */}
      {deployed && services && (
        <>
          <Title
            className="font-display text-lg font-semibold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Deployed Resources
          </Title>
          <Card>
            <Grid numItemsMd={2} className="gap-3">
              <ResourceRow
                label="CDN Service"
                value={services.cdn}
                provider="Fastly"
              />
              <ResourceRow
                label="Compute Service"
                value={services.compute}
                provider="Fastly"
              />
              <ResourceRow
                label="Kinesis Stream"
                value={services.kinesis}
                provider="AWS"
              />
              <ResourceRow
                label="S3 Bucket"
                value={services.s3}
                provider="AWS"
              />
            </Grid>
          </Card>
        </>
      )}

      {/* Purge Confirmation Dialog */}
      {showPurgeConfirm && (
        <ConfirmDialog
          title="Purge All Cache?"
          message="This will clear all cached responses from the CDN. This action cannot be undone."
          confirmText="Purge Cache"
          confirmColor="red"
          onConfirm={() => {
            purgeMutation.mutate();
            setShowPurgeConfirm(false);
          }}
          onCancel={() => setShowPurgeConfirm(false)}
        />
      )}

      {/* Demo Tools Alert */}
      {demoActions.showDemoAlert && (
        <AlertDialog
          title="Demo App Required"
          message={
            demoActions.showDemoAlert === "run-tests"
              ? "Run Tests is designed specifically for the Orion Demo App. It validates cache behavior using the demo app's GraphQL schema."
              : "Generate Traffic creates sample traffic using the Orion Demo App's GraphQL queries and mutations to populate analytics data."
          }
          linkText="View Demo App Setup"
          linkUrl="https://github.com/orion-edge-cache/orion-demo-app"
          showDontShowAgain={true}
          onDontShowAgain={demoActions.handleDontShowAgain}
          onConfirm={demoActions.handleDemoAlertConfirm}
          onDismiss={demoActions.handleDemoAlertDismiss}
        />
      )}

      {/* Cache Tests Results Dialog */}
      {demoActions.cacheTestsResult && (
        <CacheTestsResultDialog
          result={demoActions.cacheTestsResult}
          onClose={() => demoActions.setCacheTestsResult(null)}
        />
      )}

      {/* Analytics Results Dialog */}
      {demoActions.analyticsResult && (
        <AnalyticsResultDialog
          result={demoActions.analyticsResult}
          onClose={() => demoActions.setAnalyticsResult(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
