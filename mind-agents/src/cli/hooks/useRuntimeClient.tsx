import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from 'react';

import {
  EnhancedRuntimeClient,
  EnhancedClientConfig,
} from '../services/enhancedRuntimeClient.js';

interface RuntimeClientContextValue {
  client: EnhancedRuntimeClient;
  isReady: boolean;
  error: Error | null;
  reconnect: () => Promise<void>;
  updateConfig: (config: Partial<EnhancedClientConfig>) => void;
}

const RuntimeClientContext = createContext<RuntimeClientContextValue | null>(
  null
);

interface RuntimeClientProviderProps {
  children: ReactNode;
  config?: Partial<EnhancedClientConfig>;
}

/**
 * Provider component for runtime client
 */
export const RuntimeClientProvider: React.FC<RuntimeClientProviderProps> = ({
  children,
  config,
}) => {
  const [client] = useState(() => new EnhancedRuntimeClient(config));
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Setup client event listeners
    const handleConnected = () => {
      setIsReady(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsReady(false);
    };

    const handleError = (data: { error: Error }) => {
      setError(data.error);
    };

    const handleMaxRetriesReached = () => {
      setError(new Error('Maximum reconnection attempts reached'));
    };

    client.on('connected', handleConnected);
    client.on('disconnected', handleDisconnected);
    client.on('error', handleError);
    client.on('maxRetriesReached', handleMaxRetriesReached);

    // Check initial connection
    client.checkConnection();

    return () => {
      client.off('connected', handleConnected);
      client.off('disconnected', handleDisconnected);
      client.off('error', handleError);
      client.off('maxRetriesReached', handleMaxRetriesReached);
      client.destroy();
    };
  }, [client]);

  const reconnect = async () => {
    setError(null);
    await client.checkConnection();
  };

  const updateConfig = (newConfig: Partial<EnhancedClientConfig>) => {
    // In a real implementation, this would update the client config
    console.log('Config update requested:', newConfig);
  };

  return (
    <RuntimeClientContext.Provider
      value={{ client, isReady, error, reconnect, updateConfig }}
    >
      {children}
    </RuntimeClientContext.Provider>
  );
};

/**
 * Hook to use runtime client
 */
export const useRuntimeClient = () => {
  const context = useContext(RuntimeClientContext);

  if (!context) {
    throw new Error(
      'useRuntimeClient must be used within RuntimeClientProvider'
    );
  }

  return context;
};

/**
 * Hook for runtime client configuration
 */
export const useRuntimeClientConfig = () => {
  const { client, updateConfig } = useRuntimeClient();
  const [config, setConfig] = useState<EnhancedClientConfig>(client.config);

  const updateAndApplyConfig = (updates: Partial<EnhancedClientConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateConfig(updates);
  };

  return {
    config,
    updateConfig: updateAndApplyConfig,
  };
};

/**
 * Hook for runtime client metrics
 */
export const useRuntimeClientMetrics = () => {
  const { client } = useRuntimeClient();
  const [metrics, setMetrics] = useState(client.getMetrics());

  useEffect(() => {
    const handleMetricsUpdate = (newMetrics: typeof metrics) => {
      setMetrics(newMetrics);
    };

    client.on('metricsUpdate', handleMetricsUpdate);

    // Poll metrics periodically
    const interval = setInterval(() => {
      setMetrics(client.getMetrics());
    }, 1000);

    return () => {
      client.off('metricsUpdate', handleMetricsUpdate);
      clearInterval(interval);
    };
  }, [client]);

  return metrics;
};

/**
 * Hook for runtime client cache management
 */
export const useRuntimeClientCache = () => {
  const { client } = useRuntimeClient();

  const invalidateCache = (keys?: string[]) => {
    client.invalidateCache(keys);
  };

  const clearAllCache = () => {
    client.invalidateCache();
  };

  return {
    invalidateCache,
    clearAllCache,
  };
};
