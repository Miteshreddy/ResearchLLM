// SSE Hook for live research updates

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AgentEvent } from '@/types/research';
import { api } from '@/lib/api';

interface UseSSEOptions {
  runId: string | null;
  onEvent?: (event: AgentEvent) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useSSE({ runId, onEvent, onComplete, onError }: UseSSEOptions) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!runId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = api.getEventsUrl(runId);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent | { stage: 'complete' };

        if (event.stage === 'complete') {
          setIsComplete(true);
          setIsConnected(false);
          eventSource.close();
          onComplete?.();
          return;
        }

        setEvents((prev) => [...prev, event as AgentEvent]);
        onEvent?.(event as AgentEvent);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      // Don't treat as error if complete
      if (!isComplete) {
        onError?.('Connection lost');
      }
    };
  }, [runId, onEvent, onComplete, onError, isComplete]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  const reset = useCallback(() => {
    setEvents([]);
    setIsComplete(false);
    setIsConnected(false);
  }, []);

  return { events, isConnected, isComplete, reset };
}
