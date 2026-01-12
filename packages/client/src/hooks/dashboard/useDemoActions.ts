import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  runCacheTests,
  runAnalyticsGenerator,
  generateErrors,
  type CacheTestsResult,
  type AnalyticsResult,
  type ErrorGeneratorResult,
} from "../../services";

type DemoActionType = "run-tests" | "generate-traffic" | "generate-errors";

export function useDemoActions(onError?: (message: string) => void) {
  const [cacheTestsResult, setCacheTestsResult] = useState<CacheTestsResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);
  const [errorGeneratorResult, setErrorGeneratorResult] = useState<ErrorGeneratorResult | null>(null);

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

  const errorGeneratorMutation = useMutation({
    mutationFn: generateErrors,
    onSuccess: (data) => {
      if (data.result) {
        setErrorGeneratorResult(data.result);
      } else {
        onError?.("No error results returned");
      }
    },
    onError: (error: Error) => {
      onError?.(error.message);
    },
  });

  const handleDemoAction = (action: DemoActionType) => {
    if (action === "run-tests") {
      cacheTestsMutation.mutate();
    } else if (action === "generate-traffic") {
      analyticsMutation.mutate();
    } else if (action === "generate-errors") {
      errorGeneratorMutation.mutate();
    }
  };

  return {
    handleDemoAction,
    cacheTestsMutation,
    analyticsMutation,
    errorGeneratorMutation,
    cacheTestsResult,
    setCacheTestsResult,
    analyticsResult,
    setAnalyticsResult,
    errorGeneratorResult,
    setErrorGeneratorResult,
  };
}
