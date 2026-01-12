/**
 * Log Timestamp Formatting
 *
 * Utility for formatting log timestamps with millisecond precision.
 */

export function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
  } catch {
    return '--:--:--';
  }
}
