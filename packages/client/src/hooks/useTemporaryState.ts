/**
 * useTemporaryState Hook
 *
 * State that automatically resets to a default value after a timeout.
 * Useful for temporary UI feedback like "Copied!" messages.
 * Extracted from playground.tsx and schema.tsx patterns.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTemporaryStateOptions<T> {
  /** Initial/reset value (default: false for boolean) */
  initialValue?: T;
  /** Duration in ms before auto-reset (default: 2000) */
  duration?: number;
}

interface UseTemporaryStateReturn<T> {
  /** Current state value */
  value: T;
  /** Set the temporary value (will auto-reset after duration) */
  setTemporary: (value: T) => void;
  /** Manually reset to initial value */
  reset: () => void;
}

export function useTemporaryState<T = boolean>({
  initialValue = false as T,
  duration = 2000,
}: UseTemporaryStateOptions<T> = {}): UseTemporaryStateReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setTemporary = useCallback((newValue: T) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setValue(newValue);

    // Set timeout to reset
    timeoutRef.current = setTimeout(() => {
      setValue(initialValue);
      timeoutRef.current = null;
    }, duration);
  }, [initialValue, duration]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setTemporary,
    reset,
  };
}

/**
 * Convenience hook for boolean temporary state (common use case)
 * Example: const { isActive, trigger } = useTemporaryBoolean({ duration: 2000 });
 */
export function useTemporaryBoolean(options: Omit<UseTemporaryStateOptions<boolean>, 'initialValue'> = {}) {
  const { value, setTemporary, reset } = useTemporaryState<boolean>({
    ...options,
    initialValue: false,
  });

  const trigger = useCallback(() => {
    setTemporary(true);
  }, [setTemporary]);

  return {
    isActive: value,
    trigger,
    reset,
  };
}
