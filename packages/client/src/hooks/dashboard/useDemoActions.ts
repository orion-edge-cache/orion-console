import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  runCacheTests,
  runAnalyticsGenerator,
  type CacheTestsResult,
  type AnalyticsResult,
} from "../../services";

type DemoActionType = "run-tests" | "generate-traffic";

export function useDemoActions(onError?: (message: string) => void) {
  const [cacheTestsResult, setCacheTestsResult] = useState<CacheTestsResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);

  const cacheTestsMutation = useMutation({
    mutationFn: runCacheTests,
    onSuccess: (data) => {
      if (data.result) {
        setCacheTestsResult(data.result);
      } else {
        onError?.("No test results returned");
      }
    },
    onError: (error: Error) => {
      onError?.(error.message);
    },
  });

  const analyticsMutation = useMutation({
    mutationFn: () => runAnalyticsGenerator(100),
    onSuccess: (data) => {
      if (data.result) {
        setAnalyticsResult(data.result);
      } else {
        onError?.("No analytics results returned");
      }
    },
    onError: (error: Error) => {
      onError?.(error.message);
    },
  });

  const handleDemoAction = (action: DemoActionType) => {
    if (action === "run-tests") {
      cacheTestsMutation.mutate();
    } else {
      analyticsMutation.mutate();
    }
  };

  return {
    handleDemoAction,
    cacheTestsMutation,
    analyticsMutation,
    cacheTestsResult,
    setCacheTestsResult,
    analyticsResult,
    setAnalyticsResult,
  };
}
