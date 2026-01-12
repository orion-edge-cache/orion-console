/**
 * useEventSource Hook
 *
 * Manages EventSource (SSE) connections with auto-reconnect and cleanup.
 * Extracted from logs.tsx for reusability.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseEventSourceOptions<T> {
  /** URL to connect to */
  url: string;
  /** Event name to listen for (e.g., 'log', 'message') */
  eventName: string;
  /** Callback when data is received */
  onData: (data: T) => void;
  /** Optional callback when connected */
  onConnected?: () => void;
  /** Optional callback on error */
  onError?: (error: Event) => void;
  /** Optional JSON parser (defaults to JSON.parse) */
  parseData?: (data: string) => T;
}

interface UseEventSourceReturn {
  /** Whether currently connected to the server */
  isConnected: boolean;
  /** Whether streaming is active (user has started streaming) */
  isStreaming: boolean;
  /** Start the EventSource connection */
  startStreaming: () => void;
  /** Stop the EventSource connection */
  stopStreaming: () => void;
  /** Toggle streaming on/off */
  toggleStreaming: () => void;
}

export function useEventSource<T>({
  url,
  eventName,
  onData,
  onConnected,
  onError,
  parseData = JSON.parse,
}: UseEventSourceOptions<T>): UseEventSourceReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const startStreaming = useCallback(() => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      if (mountedRef.current) {
        setIsConnected(true);
        onConnected?.();
      }
    });

    eventSource.addEventListener(eventName, (event) => {
      try {
        const data = parseData(event.data);
        if (mountedRef.current) {
          onData(data);
        }
      } catch {
        // Invalid data, skip
      }
    });

    eventSource.onerror = (error) => {
      if (mountedRef.current) {
        setIsConnected(false);
        onError?.(error);
      }
    };

    setIsStreaming(true);
  }, [url, eventName, onData, onConnected, onError, parseData]);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);

  return {
    isConnected,
    isStreaming,
    startStreaming,
    stopStreaming,
    toggleStreaming,
  };
}
