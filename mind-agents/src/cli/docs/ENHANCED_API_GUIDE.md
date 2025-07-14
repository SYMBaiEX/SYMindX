# Enhanced API Connections and Loading States Guide

This guide covers the enhanced API client, loading states, error handling, and connection monitoring features for the SYMindX CLI.

## Table of Contents

1. [Enhanced Runtime Client](#enhanced-runtime-client)
2. [Loading States](#loading-states)
3. [Error Handling](#error-handling)
4. [Connection Monitoring](#connection-monitoring)
5. [Data Fetching Hooks](#data-fetching-hooks)
6. [Integration Examples](#integration-examples)

## Enhanced Runtime Client

The `EnhancedRuntimeClient` provides advanced features over the basic runtime client:

### Features

- **Request/Response Interceptors**: Modify requests and responses globally
- **Automatic Retry Logic**: Configurable retry strategies (exponential, linear, fixed)
- **Response Caching**: Smart caching with TTL support
- **Connection Monitoring**: Real-time connection status tracking
- **Request Metrics**: Track performance and error rates
- **Request Prioritization**: High, normal, and low priority requests
- **Graceful Degradation**: Fallback behaviors for network issues

### Basic Usage

```typescript
import { enhancedRuntimeClient } from '@symindx/cli/lib';

// Use the default client
const agents = await enhancedRuntimeClient.getAgents();

// Or create a custom client
const client = new EnhancedRuntimeClient({
  apiUrl: 'http://localhost:8000',
  maxRetries: 5,
  retryStrategy: 'exponential',
  cacheEnabled: true,
  cacheTTL: 60000, // 1 minute
  connectionCheckInterval: 10000, // 10 seconds
});
```

### Adding Interceptors

```typescript
// Request interceptor
client.addRequestInterceptor((config) => {
  // Add auth header
  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Response interceptor
client.addResponseInterceptor((response) => {
  // Log all responses
  console.log(`API Response: ${response._latency}ms`);
  return response;
});

// Error interceptor
client.addErrorInterceptor((error) => {
  // Transform errors
  if (error.message.includes('ECONNREFUSED')) {
    error.message = 'Runtime is not running. Please start the runtime first.';
  }
  return error;
});
```

### Connection Events

```typescript
// Listen to connection events
client.on('connected', ({ latency }) => {
  console.log(`Connected with ${latency}ms latency`);
});

client.on('disconnected', ({ error }) => {
  console.log('Disconnected:', error?.message);
});

client.on('statusChanged', (status) => {
  console.log('Status:', status.status);
});

client.on('error', ({ operation, error }) => {
  console.error(`${operation} failed:`, error.message);
});
```

## Loading States

The loading states system provides beautiful, accessible loading indicators for CLI applications.

### Loading Indicators

```typescript
import { LoadingIndicator } from '@symindx/cli/lib';

// Different variants
<LoadingIndicator variant="dots" text="Loading" />
<LoadingIndicator variant="spinner" size="medium" />
<LoadingIndicator variant="pulse" color="cyan" />
<LoadingIndicator variant="wave" size="large" />

// Reduced motion support
<LoadingIndicator variant="spinner" reducedMotion={true} />
```

### Progress Bars

```typescript
import { ProgressBar } from '@symindx/cli/lib';

<ProgressBar
  value={currentBytes}
  total={totalBytes}
  width={30}
  showPercentage={true}
  color="green"
/>
```

### Skeleton Screens

```typescript
import { Skeleton, Shimmer } from '@symindx/cli/lib';

// Basic skeleton
<Skeleton width={30} height={3} />

// Animated shimmer effect
<Shimmer width={40} height={2} duration={2000} />

// Build complete skeleton screens
const AgentCardSkeleton = () => (
  <Box borderStyle="round" padding={1}>
    <Skeleton width={20} height={1} />
    <Box marginTop={1}>
      <Skeleton width={15} height={1} />
    </Box>
    <Box marginTop={1}>
      <Shimmer width={25} height={2} />
    </Box>
  </Box>
);
```

## Error Handling

### Error Boundary Component

```typescript
import { ErrorBoundary } from '@symindx/cli/lib';

<ErrorBoundary
  onError={(error, errorInfo) => {
    // Log to error tracking service
    logger.error('Component error:', error, errorInfo);
  }}
  onRetry={() => {
    // Reset component state
    resetState();
  }}
  showDetails={process.env.NODE_ENV !== 'production'}
>
  <YourComponent />
</ErrorBoundary>
```

### Specialized Error Components

```typescript
import {
  NetworkErrorFallback,
  TimeoutErrorFallback
} from '@symindx/cli/lib';

// Network errors
<NetworkErrorFallback
  error={networkError}
  endpoint="http://localhost:8000"
  onRetry={handleRetry}
/>

// Timeout errors
<TimeoutErrorFallback
  timeout={5000}
  onRetry={handleRetryWithLongerTimeout}
/>
```

### Error Hook

```typescript
import { useErrorHandler } from '@symindx/cli/lib';

const MyComponent = () => {
  const { resetError, captureError } = useErrorHandler();

  const riskyOperation = async () => {
    try {
      await doSomethingRisky();
    } catch (error) {
      captureError(error); // Will be caught by ErrorBoundary
    }
  };

  return <Button onClick={riskyOperation}>Try It</Button>;
};
```

## Connection Monitoring

### Connection Status Component

```typescript
import { ConnectionStatus } from '@symindx/cli/lib';

// Inline status
<ConnectionStatus
  status={connectionStatus}
  showDetails={false}
/>

// Detailed status
<ConnectionStatus
  status={connectionStatus}
  showDetails={true}
  position="top"
/>

// Compact badge
<ConnectionBadge status="connected" size="small" />
```

### Connection Monitoring Hook

```typescript
import { useConnectionMonitor } from '@symindx/cli/lib';

const Dashboard = () => {
  const {
    status,
    stats,
    events,
    isHealthy,
    qualityScore,
    reconnect
  } = useConnectionMonitor(enhancedRuntimeClient);

  return (
    <Box>
      <Text>Status: {status.status}</Text>
      <Text>Latency: {status.latency}ms</Text>
      <Text>Quality: {qualityScore}%</Text>
      <Text>Uptime: {formatDuration(stats.uptime)}</Text>

      {!isHealthy && (
        <Button onClick={reconnect}>Reconnect</Button>
      )}
    </Box>
  );
};
```

### Auto-Reconnect Indicator

```typescript
<AutoReconnectIndicator
  attempts={3}
  maxAttempts={5}
  nextRetryIn={5000}
  onCancel={() => client.cancelAllRequests()}
/>
```

## Data Fetching Hooks

### Generic API Data Hook

```typescript
import { useAPIData } from '@symindx/cli/lib';

const MyComponent = () => {
  const {
    data,
    error,
    isLoading,
    isValidating,
    isStale,
    refetch,
    mutate
  } = useAPIData({
    fetchFn: () => api.getCustomData(),
    pollingInterval: 5000,
    dependencies: [userId], // Refetch when dependencies change
    onSuccess: (data) => console.log('Data loaded:', data),
    onError: (error) => console.error('Failed:', error),
    retryCount: 3,
    staleTime: 60000 // 1 minute
  });

  if (isLoading) return <LoadingIndicator />;
  if (error) return <ErrorFallback error={error} />;

  return (
    <Box>
      <Text>{JSON.stringify(data)}</Text>
      {isValidating && <LoadingIndicator variant="dots" text="Updating" />}
      {isStale && <Text color="yellow">Data may be outdated</Text>}
      <Button onClick={refetch}>Refresh</Button>
    </Box>
  );
};
```

### Specialized Hooks

```typescript
// Agent data with automatic polling
const agents = useAgentData(client, { pollingInterval: 5000 });

// System metrics with high frequency updates
const metrics = useSystemMetrics(client, { pollingInterval: 1000 });

// Runtime status
const status = useRuntimeStatus(client);

// Individual agent details
const agent = useAgentDetail(client, agentId);

// Recent events with real-time updates
const events = useRecentEvents(client, 20);
```

### Agent Control Hook

```typescript
const { startAgent, stopAgent, isStarting, isStopping, error } =
  useAgentControl(client);

const handleToggle = async (agentId: string, isActive: boolean) => {
  try {
    if (isActive) {
      await stopAgent(agentId);
    } else {
      await startAgent(agentId);
    }
  } catch (error) {
    console.error('Failed to toggle agent:', error);
  }
};
```

### Smart Polling

```typescript
// Automatically adjust polling interval based on user activity
const { pollingInterval, recordActivity } = useSmartPolling(5000, {
  minInterval: 1000,
  maxInterval: 30000,
  activityThreshold: 5000,
  inactivityMultiplier: 2
});

// Use the dynamic interval
const data = useAPIData({
  fetchFn: fetchData,
  pollingInterval: pollingInterval
});

// Record user activity
<Box onMouseMove={recordActivity} onClick={recordActivity}>
  {/* Your content */}
</Box>
```

## Integration Examples

### Complete Dashboard with Loading States

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import {
  ErrorBoundary,
  LoadingIndicator,
  ConnectionStatus,
  useAgentData,
  useSystemMetrics,
  useConnectionMonitor
} from '@symindx/cli/lib';

const Dashboard = () => {
  const connection = useConnectionMonitor(client);
  const agents = useAgentData(client);
  const metrics = useSystemMetrics(client);

  return (
    <ErrorBoundary>
      <Box flexDirection="column">
        {/* Header */}
        <Box justifyContent="space-between">
          <Text bold>Dashboard</Text>
          <ConnectionStatus status={connection.status} />
        </Box>

        {/* Agents Section */}
        <Box marginTop={1}>
          <Text bold>Agents</Text>
          {agents.isLoading ? (
            <LoadingIndicator variant="spinner" text="Loading agents" />
          ) : agents.error ? (
            <Text color="red">Error: {agents.error.message}</Text>
          ) : (
            <AgentList agents={agents.data} />
          )}
        </Box>

        {/* Metrics Section */}
        <Box marginTop={1}>
          <Text bold>System Metrics</Text>
          {metrics.isLoading ? (
            <Skeleton width={30} height={3} />
          ) : (
            <MetricsDisplay metrics={metrics.data} />
          )}
        </Box>
      </Box>
    </ErrorBoundary>
  );
};
```

### Chat Interface with Connection Status

```typescript
const ChatInterface = ({ agentId }) => {
  const connection = useConnectionMonitor(client);
  const { sendMessage, isSending, error } = useAgentChat(client);
  const [messages, setMessages] = useState([]);

  const handleSend = async (text: string) => {
    try {
      const response = await sendMessage(agentId, text);
      setMessages(prev => [...prev,
        { type: 'user', text },
        { type: 'agent', text: response.message }
      ]);
    } catch (error) {
      // Error is already set in the hook
    }
  };

  if (!connection.isHealthy) {
    return (
      <Box padding={1}>
        <NetworkErrorFallback
          error={new Error('Connection issues detected')}
          onRetry={() => connection.reconnect()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <MessageList messages={messages} />
      <Box marginTop={1}>
        {isSending && <LoadingIndicator variant="dots" text="Sending" />}
        {error && <Text color="red">{error.message}</Text>}
      </Box>
    </Box>
  );
};
```

### Progressive Loading Pattern

```typescript
const AgentDetails = ({ agentId }) => {
  const agent = useAgentDetail(client, agentId);

  // Show skeleton while initial loading
  if (agent.isLoading) {
    return <AgentDetailsSkeleton />;
  }

  // Show error state
  if (agent.error) {
    return <ErrorFallback error={agent.error} onRetry={agent.refetch} />;
  }

  // Show data with validation indicator
  return (
    <Box position="relative">
      <AgentInfo agent={agent.data} />

      {/* Subtle validation indicator */}
      {agent.isValidating && (
        <Box position="absolute" right={0} top={0}>
          <LoadingIndicator variant="spinner" size="small" />
        </Box>
      )}

      {/* Stale data warning */}
      {agent.isStale && (
        <Box marginTop={1}>
          <Text color="yellow" dimColor>
            Data may be outdated. Last updated: {agent.lastFetchTime?.toLocaleTimeString()}
          </Text>
        </Box>
      )}
    </Box>
  );
};
```

## Best Practices

1. **Always handle loading states**: Never leave users wondering if something is happening
2. **Provide meaningful error messages**: Help users understand what went wrong
3. **Use appropriate loading indicators**: Match the indicator to the operation type
4. **Implement progressive loading**: Show skeletons for initial loads, spinners for updates
5. **Monitor connection health**: Proactively inform users about connection issues
6. **Cache appropriately**: Balance freshness with performance
7. **Handle offline scenarios**: Provide graceful degradation
8. **Test with slow connections**: Use network throttling to test loading states
9. **Respect reduced motion**: Provide static alternatives for animations
10. **Log errors properly**: Use interceptors for consistent error logging

## TypeScript Support

All components and hooks are fully typed. Import types as needed:

```typescript
import type {
  ConnectionStatus,
  UseAPIDataResult,
  AgentInfo,
  ConnectionStats,
} from '@symindx/cli/lib';
```

## Performance Tips

1. **Use caching**: Enable caching for data that doesn't change frequently
2. **Implement smart polling**: Adjust intervals based on user activity
3. **Batch requests**: Use the enhanced client's request batching
4. **Cancel unnecessary requests**: Clean up when components unmount
5. **Optimize re-renders**: Use React.memo and useMemo appropriately

## Troubleshooting

### Connection Issues

```typescript
// Check connection status
const stats = client.getStats();
console.log('Connection stats:', stats);

// Force reconnection
await client.checkConnection();

// Clear cache if data seems stale
client.invalidateCache();
```

### Memory Leaks

Always cleanup in useEffect:

```typescript
useEffect(() => {
  const subscription = client.on('event', handler);
  return () => {
    subscription.off();
    client.cancelAllRequests();
  };
}, []);
```

### Performance Issues

```typescript
// Monitor metrics
const metrics = client.getMetrics();
console.log('Request metrics:', metrics);

// Reduce polling frequency
const data = useAPIData({
  fetchFn: fetchData,
  pollingInterval: 10000, // 10 seconds instead of 1 second
  staleTime: 300000, // 5 minutes
});
```

## Migration Guide

If migrating from the basic RuntimeClient:

1. Replace `RuntimeClient` with `EnhancedRuntimeClient`
2. Update error handling to use ErrorBoundary
3. Replace loading booleans with LoadingIndicator components
4. Add connection monitoring for better UX
5. Implement proper caching strategies

Example migration:

```typescript
// Before
const [loading, setLoading] = useState(true);
const [agents, setAgents] = useState([]);

useEffect(() => {
  runtimeClient.getAgents()
    .then(setAgents)
    .finally(() => setLoading(false));
}, []);

if (loading) return <Text>Loading...</Text>;

// After
const agents = useAgentData(enhancedRuntimeClient);

if (agents.isLoading) return <LoadingIndicator variant="spinner" />;
if (agents.error) return <ErrorFallback error={agents.error} />;
```

## Contributing

When adding new features:

1. Ensure all components support reduced motion
2. Add proper TypeScript types
3. Include loading and error states
4. Test with slow/flaky connections
5. Document new hooks and components
6. Add examples to the examples directory

---

For more examples and complete implementations, see the `/examples` directory.
