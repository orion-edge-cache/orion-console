/**
 * useLocalStorage Hook
 *
 * Type-safe localStorage with automatic JSON serialization.
 * Handles storage errors gracefully (quota exceeded, private mode, etc.)
 * Extracted from playground.tsx pattern.
 */

import { useState, useCallback, useEffect } from 'react';

interface UseLocalStorageOptions<T> {
  /** localStorage key */
  key: string;
  /** Default value if key doesn't exist */
  defaultValue: T;
  /** Custom serializer (defaults to JSON.stringify) */
  serialize?: (value: T) => string;
  /** Custom deserializer (defaults to JSON.parse) */
  deserialize?: (value: string) => T;
}

interface UseLocalStorageReturn<T> {
  /** Current value */
  value: T;
  /** Update the value (persists to localStorage) */
  setValue: (value: T | ((prev: T) => T)) => void;
  /** Remove the value from localStorage */
  remove: () => void;
}

export function useLocalStorage<T>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: UseLocalStorageOptions<T>): UseLocalStorageReturn<T> {
  // Initialize state from localStorage
  const [value, setValueState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? deserialize(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  // Persist to localStorage when value changes
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // Ignore storage errors (quota exceeded, private mode, etc.)
    }
  }, [key, value, serialize]);

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValueState((prev) => {
      const resolvedValue = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue;
      return resolvedValue;
    });
  }, []);

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
    setValueState(defaultValue);
  }, [key, defaultValue]);

  return {
    value,
    setValue,
    remove,
  };
}

/**
 * Convenience hook for string localStorage values (no JSON serialization)
 * Example: const { value, setValue } = useLocalStorageString({ key: 'query', defaultValue: '' });
 */
export function useLocalStorageString({
  key,
  defaultValue,
}: {
  key: string;
  defaultValue: string;
}): UseLocalStorageReturn<string> {
  return useLocalStorage<string>({
    key,
    defaultValue,
    serialize: (v) => v,
    deserialize: (v) => v,
  });
}
