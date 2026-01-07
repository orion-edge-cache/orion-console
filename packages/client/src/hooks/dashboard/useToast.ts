import { useState, useEffect, useCallback } from "react";

interface ToastState {
  message: string;
  type: "success" | "error";
}

interface UseToastReturn {
  toast: ToastState | null;
  showToast: (message: string, type: "success" | "error") => void;
  hideToast: () => void;
}

/**
 * Hook for managing toast notifications with auto-hide functionality
 */
export function useToast(autoHideDelay: number = 3000): UseToastReturn {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Auto-hide toast after delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [toast, autoHideDelay]);

  return {
    toast,
    showToast,
    hideToast,
  };
}
