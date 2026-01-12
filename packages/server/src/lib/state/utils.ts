/**
 * State utility functions
 */

/**
 * Mask sensitive parts of URL for display
 */
export function maskUrl(url?: string): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Redact credentials from log messages
 */
export function redactCredentials(message: string): string {
  // Redact AWS Access Key IDs (AKIA...)
  let redacted = message.replace(/AKIA[A-Z0-9]{16}/g, 'AKIA***REDACTED***');

  // Redact AWS Secret Keys (40 char base64-ish strings after common patterns)
  redacted = redacted.replace(
    /(secret[_-]?access[_-]?key["']?\s*[=:]\s*["']?)([A-Za-z0-9/+=]{40})/gi,
    '$1***REDACTED***'
  );

  // Redact Fastly API tokens (32 char hex strings)
  redacted = redacted.replace(
    /(fastly[_-]?api[_-]?key["']?\s*[=:]\s*["']?)([a-fA-F0-9]{32})/gi,
    '$1***REDACTED***'
  );

  // Redact generic API tokens/keys
  redacted = redacted.replace(
    /(api[_-]?token["']?\s*[=:]\s*["']?)([A-Za-z0-9_-]{20,})/gi,
    '$1***REDACTED***'
  );

  return redacted;
}
