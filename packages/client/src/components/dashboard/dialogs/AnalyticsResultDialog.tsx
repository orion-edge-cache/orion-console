import { useState } from "react";
import { CheckCircle, XCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Title, Text, Grid, Button, Flex } from "@tremor/react";
import type { AnalyticsResult } from "../../../services";

interface AnalyticsResultDialogProps {
  result: AnalyticsResult;
  onClose: () => void;
}

export function AnalyticsResultDialog({ result, onClose }: AnalyticsResultDialogProps) {
  const [showErrorDetails, setShowErrorDetails] = useState(false);

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
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                result.success ? "bg-emerald-100" : "bg-red-100"
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
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                >
                  <Text className="text-red-700">
                    {result.stats.errors} errors occurred during generation
                  </Text>
                  {result.errorSamples && result.errorSamples.length > 0 && (
                    <button className="text-red-600 hover:text-red-800">
                      {showErrorDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                {showErrorDetails && result.errorSamples && result.errorSamples.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {result.errorSamples.map((sample, idx) => (
                      <div
                        key={idx}
                        className="bg-white/50 rounded p-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-red-600 font-semibold">
                            {sample.type}
                          </span>
                          <span className="text-slate-500">
                            HTTP {sample.status}
                          </span>
                        </div>
                        <div className="text-red-700 break-all">
                          {sample.errorMessage}
                        </div>
                      </div>
                    ))}
                    {result.errorSamples.length < result.stats.errors && (
                      <Text className="text-xs text-red-500 italic">
                        Showing {result.errorSamples.length} of {result.stats.errors} errors
                      </Text>
                    )}
                  </div>
                )}
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
