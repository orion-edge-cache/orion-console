/**
 * Log Color Constants
 *
 * Color mappings for log level, source, cache status, and operation types.
 */

export const levelColors: Record<string, string> = {
  info: "var(--color-info)",
  warn: "var(--color-warning)",
  error: "var(--color-error)",
  debug: "var(--color-text-muted)",
};

export const sourceColors: Record<string, string> = {
  cdn: "var(--color-success)",
  compute: "#a855f7",
  backend: "var(--color-warning)",
  system: "var(--color-text-muted)",
};

export const cacheColors: Record<string, string> = {
  HIT: "var(--color-success)",
  MISS: "var(--color-error)",
  PASS: "var(--color-warning)",
  RECV: "var(--color-info)",
  HASH: "var(--color-info)",
  FETCH: "var(--color-info)",
  DELIVER: "var(--color-info)",
  SYNTH: "var(--color-info)",
};

export const operationTypeColors: Record<string, string> = {
  query: "var(--color-info)",
  mutation: "var(--color-warning)",
  subscription: "#a855f7",
};
