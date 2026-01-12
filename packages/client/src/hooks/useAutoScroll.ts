/**
 * useAutoScroll Hook
 *
 * Manages auto-scroll behavior with manual override detection.
 * When user scrolls up, auto-scroll is disabled. When scrolled to bottom, it re-enables.
 * Extracted from logs.tsx for reusability.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAutoScrollOptions {
  /** Threshold in pixels from bottom to consider "at bottom" (default: 50) */
  threshold?: number;
  /** Dependency array to trigger scroll (e.g., data length) */
  deps?: unknown[];
}

interface UseAutoScrollReturn {
  /** Ref to attach to the scrollable container */
  scrollRef: React.RefObject<HTMLDivElement>;
  /** Whether auto-scroll is currently enabled */
  autoScroll: boolean;
  /** Manually set auto-scroll state */
  setAutoScroll: (value: boolean) => void;
  /** Handler to attach to onScroll event */
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  /** Manually scroll to bottom */
  scrollToBottom: () => void;
}

export function useAutoScroll({
  threshold = 50,
  deps = [],
}: UseAutoScrollOptions = {}): UseAutoScrollReturn {
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when deps change and autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, autoScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    setAutoScroll(isAtBottom);
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setAutoScroll(true);
    }
  }, []);

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    handleScroll,
    scrollToBottom,
  };
}
