import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  runCacheTests,
  runAnalyticsGenerator,
  type CacheTestsResult,
  type AnalyticsResult,
} from "../../services";

const DEMO_ALERT_DISMISSED_KEY = "orion-demo-alert-dismissed";

type DemoActionType = "run-tests" | "generate-traffic";

export function useDemoActions(onError?: (message: string) => void) {
  const [showDemoAlert, setShowDemoAlert] = useState<DemoActionType | null>(null);
  const [pendingDemoAction, setPendingDemoAction] = useState<DemoActionType | null>(null);
  const [demoAlertDismissed, setDemoAlertDismissed] = useState(false);
  const [cacheTestsResult, setCacheTestsResult] = useState<CacheTestsResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsResult | null>(null);

  // Load "don't show again" preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem(DEMO_ALERT_DISMISSED_KEY);
    if (dismissed === "true") {
      setDemoAlertDismissed(true);
    }
  }, []);

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
    mutationFn: () => runAnalyticsGenerator(1000),
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

  const executeDemoAction = (action: DemoActionType) => {
    if (action === "run-tests") {
      cacheTestsMutation.mutate();
    } else {
      analyticsMutation.mutate();
    }
  };

  const handleDemoAction = (action: DemoActionType) => {
    if (demoAlertDismissed) {
      // If user has dismissed the alert, run the action directly
      executeDemoAction(action);
    } else {
      // Show alert first, then run action when confirmed
      setPendingDemoAction(action);
      setShowDemoAlert(action);
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

  return {
    showDemoAlert,
    demoAlertDismissed,
    handleDemoAction,
    handleDemoAlertConfirm,
    handleDemoAlertDismiss,
    handleDontShowAgain,
    cacheTestsMutation,
    analyticsMutation,
    cacheTestsResult,
    setCacheTestsResult,
    analyticsResult,
    setAnalyticsResult,
  };
}
