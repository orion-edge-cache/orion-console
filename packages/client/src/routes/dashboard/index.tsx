/**
 * Dashboard Overview
 *
 * High-level health view with real-time metrics.
 * Using Tremor components for data-rich dashboard UI.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
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
  FileCode,
  Sparkles,
  Trash2,
  TestTube2,
  Loader2,
  CheckCircle,
  XCircle,
  X,
  Info,
} from "lucide-react";
import {
  Card,
  Metric,
  Text,
  Badge,
  Button,
  Grid,
  Flex,
  Title,
} from "@tremor/react";
import {
  getConfig,
  getInfrastructureStatus,
  purgeCache,
  runCacheTests,
  runAnalyticsGenerator,
  type CacheTestsResult,
  type AnalyticsResult,
} from "../../services";
import { useMetrics } from "../../context";
import { ConfirmDialog, AlertDialog, Toast } from "../../components/Dialogs";

// LocalStorage key for "don't show again" preference
const DEMO_ALERT_DISMISSED_KEY = "orion-demo-alert-dismissed";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showDemoAlert, setShowDemoAlert] = useState<
    "run-tests" | "generate-traffic" | null
  >(null);
  const [pendingDemoAction, setPendingDemoAction] = useState<
    "run-tests" | "generate-traffic" | null
  >(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [demoAlertDismissed, setDemoAlertDismissed] = useState(false);
  const [cacheTestsResult, setCacheTestsResult] =
    useState<CacheTestsResult | null>(null);
  const [analyticsResult, setAnalyticsResult] =
    useState<AnalyticsResult | null>(null);

  // Load "don't show again" preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DEMO_ALERT_DISMISSED_KEY);
    if (dismissed === "true") {
      setDemoAlertDismissed(true);
    }
  }, []);

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

  const { dataPoints, isConnected } = useMetrics();

  const purgeMutation = useMutation({
    mutationFn: purgeCache,
    onSuccess: () => {
      setToast({ message: "Cache purged successfully", type: "success" });
    },
    onError: (error: Error) => {
      setToast({ message: error.message, type: "error" });
    },
  });

  const cacheTestsMutation = useMutation({
    mutationFn: runCacheTests,
    onSuccess: (data) => {
      if (data.result) {
        setCacheTestsResult(data.result);
      } else {
        setToast({ message: "No test results returned", type: "error" });
      }
    },
    onError: (error: Error) => {
      setToast({ message: error.message, type: "error" });
    },
  });

  const analyticsMutation = useMutation({
    mutationFn: () => runAnalyticsGenerator(1000),
    onSuccess: (data) => {
      if (data.result) {
        setAnalyticsResult(data.result);
      } else {
        setToast({ message: "No analytics results returned", type: "error" });
      }
    },
    onError: (error: Error) => {
      setToast({ message: error.message, type: "error" });
    },
  });

  const config = configData?.config;
  const services = infraData?.status?.services;
  const deployed = infraData?.status?.deployed;

  // Calculate stats from last 60 seconds
  const stats = useMemo(() => {
    const now = Date.now();
    const recentPoints = dataPoints.filter((p) => now - p.time < 60000);

    if (recentPoints.length === 0) {
      return { cacheHitRate: null, requestsPerMin: 0, avgLatency: null };
    }

    const recentRequests = recentPoints.reduce(
      (sum, p) => sum + p.requests,
      0,
    );
    const recentHits = recentPoints.reduce((sum, p) => sum + p.hits, 0);
    const recentMisses = recentPoints.reduce((sum, p) => sum + p.misses, 0);
    const recentLatency = recentPoints.reduce(
      (sum, p) => sum + p.avgLatency * p.requests,
      0,
    );

    const cacheHitRate =
      recentHits + recentMisses > 0
        ? recentHits / (recentHits + recentMisses)
        : null;

    return {
      cacheHitRate,
      requestsPerMin: recentRequests,
      avgLatency: recentRequests > 0 ? recentLatency / recentRequests : null,
    };
  }, [dataPoints]);

  const handleDemoAction = (action: "run-tests" | "generate-traffic") => {
    if (demoAlertDismissed) {
      // If user has dismissed the alert, run the action directly
      executeDemoAction(action);
    } else {
      // Show alert first, then run action when closed
      setPendingDemoAction(action);
      setShowDemoAlert(action);
    }
  };

  const executeDemoAction = (action: "run-tests" | "generate-traffic") => {
    if (action === "run-tests") {
      cacheTestsMutation.mutate();
    } else {
      analyticsMutation.mutate();
    }
  };

  const handleDemoAlertConfirm = () => {
    // Execute the pending action when user confirms
    if (pendingDemoAction) {
      executeDemoAction(pendingDemoAction);
    }
    setShowDemoAlert(null);
    setPendingDemoAction(null);
  };

  const handleDemoAlertDismiss = () => {
    // Just close the dialog without executing the action
    setShowDemoAlert(null);
    setPendingDemoAction(null);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(DEMO_ALERT_DISMISSED_KEY, "true");
    setDemoAlertDismissed(true);
  };

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
              onClick={() =>
                window.open(`https://${services.cdn}/graphql`, "_blank")
              }
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
          onClick={() => handleDemoAction("run-tests")}
          loading={cacheTestsMutation.isPending}
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
          onClick={() => handleDemoAction("generate-traffic")}
          loading={analyticsMutation.isPending}
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
      {showDemoAlert && (
        <AlertDialog
          title="Demo App Required"
          message={
            showDemoAlert === "run-tests"
              ? "Run Tests is designed specifically for the Orion Demo App. It validates cache behavior using the demo app's GraphQL schema."
              : "Generate Traffic creates sample traffic using the Orion Demo App's GraphQL queries and mutations to populate analytics data."
          }
          linkText="View Demo App Setup"
          linkUrl="https://github.com/orion-edge-cache/orion-demo-app"
          showDontShowAgain={true}
          onDontShowAgain={handleDontShowAgain}
          onConfirm={handleDemoAlertConfirm}
          onDismiss={handleDemoAlertDismiss}
        />
      )}

      {/* Cache Tests Results Dialog */}
      {cacheTestsResult && (
        <CacheTestsResultDialog
          result={cacheTestsResult}
          onClose={() => setCacheTestsResult(null)}
        />
      )}

      {/* Analytics Results Dialog */}
      {analyticsResult && (
        <AnalyticsResultDialog
          result={analyticsResult}
          onClose={() => setAnalyticsResult(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
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
  accentColor: "emerald" | "cyan" | "blue" | "amber";
}) {
  const colorMap = {
    emerald: "bg-emerald-100 text-emerald-600",
    cyan: "bg-cyan-100 text-cyan-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <Link to={to}>
      <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        <Flex alignItems="start" justifyContent="between" className="mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accentColor]}`}
          >
            {icon}
          </div>
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-slate-400" />
        </Flex>
        <Title className="text-base font-semibold mb-1">{title}</Title>
        <Text className="text-sm">{description}</Text>
      </Card>
    </Link>
  );
}

function ActionCard({
  icon,
  title,
  description,
  accentColor,
  onClick,
  loading,
  tooltip,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: "emerald" | "cyan" | "blue" | "amber" | "red" | "purple";
  onClick: () => void;
  loading?: boolean;
  tooltip?: string[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorMap = {
    emerald: "bg-emerald-100 text-emerald-600",
    cyan: "bg-cyan-100 text-cyan-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative"
      onClick={loading ? undefined : onClick}
    >
      <Flex alignItems="start" justifyContent="between" className="mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[accentColor]}`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
        </div>
        <div className="flex items-center gap-1">
          {tooltip && (
            <div
              className="relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
              {showTooltip && (
                <div className="absolute right-0 top-6 z-50 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl">
                  <ul className="space-y-1.5">
                    {tooltip.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="absolute -top-1.5 right-2 w-3 h-3 bg-slate-800 rotate-45" />
                </div>
              )}
            </div>
          )}
          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-slate-400" />
        </div>
      </Flex>
      <Title className="text-base font-semibold mb-1">{title}</Title>
      <Text className="text-sm">{description}</Text>
    </Card>
  );
}

function ResourceRow({
  label,
  value,
  provider,
}: {
  label: string;
  value?: string;
  provider: "AWS" | "Fastly";
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50">
      <div>
        <Text className="text-xs text-slate-500 mb-0.5">{label}</Text>
        <Text className="font-mono text-sm truncate max-w-[280px]">
          {value || "N/A"}
        </Text>
      </div>
      <Badge color={provider === "AWS" ? "amber" : "rose"} size="sm">
        {provider}
      </Badge>
    </div>
  );
}

function CacheTestsResultDialog({
  result,
  onClose,
}: {
  result: CacheTestsResult;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <Card className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${result.success ? "bg-emerald-100" : "bg-red-100"
                }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <Title>Cache Test Results</Title>
              <Text className="text-sm text-slate-500">
                {result.totalPassed} passed, {result.totalFailed} failed
              </Text>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>

        {result.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-700">{result.error}</Text>
          </div>
        ) : (
          <div className="space-y-4">
            {result.suites.map((suite) => (
              <div
                key={suite.name}
                className="border border-slate-200 rounded-lg p-4"
              >
                <Flex justifyContent="between" alignItems="center" className="mb-3">
                  <Text className="font-semibold">{suite.name}</Text>
                  <Badge color={suite.failed === 0 ? "emerald" : "red"}>
                    {suite.passed}/{suite.passed + suite.failed} passed
                  </Badge>
                </Flex>
                <div className="space-y-2">
                  {suite.results.map((test, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm"
                    >
                      {test.passed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className={test.passed ? "text-slate-700" : "text-red-700"}>
                        {test.name}
                      </span>
                      <span className="text-slate-400 text-xs">
                        ({test.duration}ms)
                      </span>
                      {test.error && (
                        <span className="text-red-500 text-xs">
                          - {test.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {suite.name === "Surrogate Keys" && (
                  <Text className="text-xs text-slate-500 mt-2 italic">
                    Note: Uses X-Debug-Entities header (Surrogate-Key is stripped by Fastly before client delivery)
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}

        <Flex justifyContent="between" alignItems="center" className="mt-6">
          <Text className="text-sm text-slate-500">
            Duration: {(result.duration / 1000).toFixed(2)}s
          </Text>
          <Button onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    </div>
  );
}

function AnalyticsResultDialog({
  result,
  onClose,
}: {
  result: AnalyticsResult;
  onClose: () => void;
}) {
  const hitRate =
    result.stats.total > 0
      ? ((result.stats.cacheHits / result.stats.total) * 100).toFixed(1)
      : "0";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-lg w-full mx-4">
        <Flex justifyContent="between" alignItems="start" className="mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${result.success ? "bg-emerald-100" : "bg-red-100"
                }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <Title>Traffic Generation Complete</Title>
              <Text className="text-sm text-slate-500">
                {result.requestCount} requests in {result.duration.toFixed(2)}s
              </Text>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </Flex>

        {result.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <Text className="text-red-700">{result.error}</Text>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Request Distribution */}
            <div className="bg-slate-50 rounded-lg p-4">
              <Text className="font-semibold mb-2">Request Distribution</Text>
              <Grid numItemsMd={3} className="gap-4">
                <div>
                  <Text className="text-xs text-slate-500">Total</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.total}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Queries</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.queries}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Mutations</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.mutations}
                  </Text>
                </div>
              </Grid>
            </div>

            {/* Cache Performance */}
            <div className="bg-slate-50 rounded-lg p-4">
              <Text className="font-semibold mb-2">Cache Performance</Text>
              <Grid numItemsMd={3} className="gap-4">
                <div>
                  <Text className="text-xs text-slate-500">Hit Rate</Text>
                  <Text className="font-mono font-semibold text-emerald-600">
                    {hitRate}%
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Hits</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.cacheHits}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">Misses</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.cacheMisses}
                  </Text>
                </div>
              </Grid>
            </div>

            {/* Latency */}
            <div className="bg-slate-50 rounded-lg p-4">
              <Text className="font-semibold mb-2">Latency (ms)</Text>
              <Grid numItemsMd={4} className="gap-4">
                <div>
                  <Text className="text-xs text-slate-500">Avg</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.avgLatency.toFixed(0)}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">P50</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.p50}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">P95</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.p95}
                  </Text>
                </div>
                <div>
                  <Text className="text-xs text-slate-500">P99</Text>
                  <Text className="font-mono font-semibold">
                    {result.stats.p99}
                  </Text>
                </div>
              </Grid>
            </div>

            {/* Latency Comparison */}
            {result.latencyComparison && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <Text className="font-semibold mb-2 text-emerald-700">
                  Cache Speedup
                </Text>
                <Text className="text-sm text-emerald-600">
                  Cache hits are{" "}
                  <span className="font-bold">
                    {result.latencyComparison.speedup.toFixed(1)}x faster
                  </span>{" "}
                  than misses ({result.latencyComparison.avgHitLatency.toFixed(0)}
                  ms vs {result.latencyComparison.avgMissLatency.toFixed(0)}ms)
                </Text>
              </div>
            )}

            {/* Errors */}
            {result.stats.errors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <Text className="text-red-700">
                  {result.stats.errors} errors occurred during generation
                </Text>
              </div>
            )}
          </div>
        )}

        <Flex justifyContent="end" className="mt-6">
          <Button onClick={onClose}>Close</Button>
        </Flex>
      </Card>
    </div>
  );
}
