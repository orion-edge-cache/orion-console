/**
 * Storage utilities for playground state persistence
 */

export function getStoredValue(key: string, defaultValue: string): string {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (quota exceeded, private mode, etc.)
  }
}
