/**
 * Style Utilities
 * 
 * CSS utilities and color helpers for UI components.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Using CSS custom properties for consistent theming
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return 'var(--color-success)';
  if (status >= 300 && status < 400) return 'var(--color-info)';
  if (status >= 400 && status < 500) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function getCacheStatusColor(status: 'HIT' | 'MISS' | 'PASS'): string {
  switch (status) {
    case 'HIT':
      return 'badge-success';
    case 'MISS':
      return 'badge-warning';
    case 'PASS':
      return 'badge-info';
    default:
      return 'badge-info';
  }
}

export function getLogLevelColor(level: string): string {
  switch (level) {
    case 'DEBUG':
      return 'var(--color-text-muted)';
    case 'INFO':
      return 'var(--color-info)';
    case 'WARN':
      return 'var(--color-warning)';
    case 'ERROR':
      return 'var(--color-error)';
    default:
      return 'var(--color-text-muted)';
  }
}