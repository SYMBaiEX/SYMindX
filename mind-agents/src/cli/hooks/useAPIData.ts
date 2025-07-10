import { useState, useEffect, useCallback, useRef } from 'react';

import { EnhancedRuntimeClient } from '../services/enhancedRuntimeClient.js';
import { 
  AgentInfo, 
  SystemMetrics, 
  RuntimeStatus, 
  RuntimeCapabilities,
  ActivityEvent 
} from '../services/runtimeClient.js';

export interface UseAPIDataOptions<T> {
  fetchFn: () => Promise<T>;
  dependencies?: any[];
  pollingInterval?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
  staleTime?: number;
  cacheKey?: string;
}

export interface UseAPIDataResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  isStale: boolean;
  lastFetchTime: Date | null;
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
  cancel: () => void;
}

/**
 * Generic hook for fetching API data with loading states and error handling
 */
export function useAPIData<T>(options: UseAPIDataOptions<T>): UseAPIDataResult<T> {
  const {
    fetchFn,
    dependencies = [],
    pollingInterval,
    enabled = true,
    onSuccess,
    onError,
    retryCount = 3,
    retryDelay = 1000,
    staleTime = 60000, // 1 minute
    cacheKey: _cacheKey
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Calculate if data is stale
  const isStale = lastFetchTime 
    ? Date.now() - lastFetchTime.getTime() > staleTime 
    : true;

  const clearTimeouts = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearTimeouts();
  }, [clearTimeouts]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!enabled) return;

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Set loading state
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsValidating(true);
      }
      setError(null);

      // Fetch data with retry logic
      let lastError: Error | null = null;
      let attempts = 0;

      while (attempts <= retryCount) {
        try {
          const result = await fetchFn();
          
          if (!isMountedRef.current) return;

          setData(result);
          setLastFetchTime(new Date());
          setError(null);
          
          if (onSuccess) {
            onSuccess(result);
          }
          
          break; // Success, exit retry loop
          
        } catch (err) {
          lastError = err as Error;
          attempts++;
          
          if (attempts <= retryCount) {
            // Wait before retrying
            await new Promise(resolve => {
              retryTimeoutRef.current = setTimeout(resolve, retryDelay * attempts);
            });
          }
        }
      }

      // If all retries failed
      if (lastError && attempts > retryCount) {
        throw lastError;
      }

    } catch (err) {
      if (!isMountedRef.current) return;
      
      const error = err as Error;
      
      // Don't treat abort as an error
      if (error.name === 'AbortError') return;
      
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsValidating(false);
      }
    }
  }, [enabled, fetchFn, onSuccess, onError, retryCount, retryDelay]);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    setLastFetchTime(new Date());
  }, []);

  // Initial fetch and dependency change handling
  useEffect(() => {
    fetchData(true);
  }, [fetchData, ...dependencies]);

  // Polling
  useEffect(() => {
    if (!pollingInterval || !enabled) return;

    const setupPolling = () => {
      pollingTimeoutRef.current = setTimeout(() => {
        fetchData(false);
        setupPolling(); // Schedule next poll
      }, pollingInterval);
    };

    setupPolling();

    return () => {
      clearTimeouts();
    };
  }, [pollingInterval, enabled, fetchData, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    isStale,
    lastFetchTime,
    refetch,
    mutate,
    cancel
  };
}

/**
 * Hook for fetching agent data
 */
export function useAgentData(
  client: EnhancedRuntimeClient,
  options?: Partial<UseAPIDataOptions<AgentInfo[]>>
) {
  return useAPIData<AgentInfo[]>({
    fetchFn: () => client.getAgents(),
    pollingInterval: 5000, // Poll every 5 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    ...options
  });
}

/**
 * Hook for fetching system metrics
 */
export function useSystemMetrics(
  client: EnhancedRuntimeClient,
  options?: Partial<UseAPIDataOptions<SystemMetrics>>
) {
  return useAPIData<SystemMetrics>({
    fetchFn: () => client.getSystemMetrics(),
    pollingInterval: 2000, // Poll every 2 seconds
    staleTime: 5000, // Consider stale after 5 seconds
    ...options
  });
}

/**
 * Hook for fetching runtime status
 */
export function useRuntimeStatus(
  client: EnhancedRuntimeClient,
  options?: Partial<UseAPIDataOptions<RuntimeStatus>>
) {
  return useAPIData<RuntimeStatus>({
    fetchFn: () => client.getRuntimeStatus(),
    pollingInterval: 3000, // Poll every 3 seconds
    staleTime: 5000, // Consider stale after 5 seconds
    ...options
  });
}

/**
 * Hook for fetching runtime capabilities
 */
export function useRuntimeCapabilities(
  client: EnhancedRuntimeClient,
  options?: Partial<UseAPIDataOptions<RuntimeCapabilities | null>>
) {
  return useAPIData<RuntimeCapabilities | null>({
    fetchFn: () => client.getRuntimeCapabilities(),
    pollingInterval: 0, // No polling, capabilities don't change often
    staleTime: 300000, // Consider stale after 5 minutes
    ...options
  });
}

/**
 * Hook for fetching recent events
 */
export function useRecentEvents(
  client: EnhancedRuntimeClient,
  limit: number = 20,
  options?: Partial<UseAPIDataOptions<ActivityEvent[]>>
) {
  return useAPIData<ActivityEvent[]>({
    fetchFn: () => client.getRecentEvents(limit),
    pollingInterval: 1000, // Poll every second
    staleTime: 2000, // Consider stale after 2 seconds
    ...options
  });
}

/**
 * Hook for fetching individual agent details
 */
export function useAgentDetail(
  client: EnhancedRuntimeClient,
  agentId: string,
  options?: Partial<UseAPIDataOptions<any>>
) {
  return useAPIData<any>({
    fetchFn: () => client.getAgent(agentId),
    dependencies: [agentId],
    pollingInterval: 5000, // Poll every 5 seconds
    staleTime: 10000, // Consider stale after 10 seconds
    enabled: !!agentId,
    ...options
  });
}

/**
 * Hook for managing agent state (start/stop)
 */
export function useAgentControl(client: EnhancedRuntimeClient) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startAgent = useCallback(async (agentId: string) => {
    setIsStarting(true);
    setError(null);
    
    try {
      const success = await client.startAgent(agentId);
      if (!success) {
        throw new Error('Failed to start agent');
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, [client]);

  const stopAgent = useCallback(async (agentId: string) => {
    setIsStopping(true);
    setError(null);
    
    try {
      const success = await client.stopAgent(agentId);
      if (!success) {
        throw new Error('Failed to stop agent');
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsStopping(false);
    }
  }, [client]);

  return {
    startAgent,
    stopAgent,
    isStarting,
    isStopping,
    error
  };
}

/**
 * Hook for sending chat messages
 */
export function useAgentChat(client: EnhancedRuntimeClient) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const sendMessage = useCallback(async (agentId: string, message: string) => {
    setIsSending(true);
    setError(null);
    
    try {
      const response = await client.sendChatMessage(agentId, message);
      setLastResponse(response);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [client]);

  return {
    sendMessage,
    isSending,
    error,
    lastResponse
  };
}

/**
 * Hook for smart polling intervals based on activity
 */
export function useSmartPolling(
  baseInterval: number,
  options?: {
    minInterval?: number;
    maxInterval?: number;
    activityThreshold?: number;
    inactivityMultiplier?: number;
  }
) {
  const {
    minInterval = 1000,
    maxInterval = 30000,
    activityThreshold = 5000,
    inactivityMultiplier = 2
  } = options || {};

  const [pollingInterval, setPollingInterval] = useState(baseInterval);
  const lastActivityRef = useRef(Date.now());

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setPollingInterval(baseInterval);
  }, [baseInterval]);

  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity > activityThreshold) {
        setPollingInterval(current => {
          const newInterval = Math.min(current * inactivityMultiplier, maxInterval);
          return Math.max(newInterval, minInterval);
        });
      }
    }, activityThreshold);

    return () => clearInterval(checkInactivity);
  }, [activityThreshold, inactivityMultiplier, maxInterval, minInterval]);

  return { pollingInterval, recordActivity };
}