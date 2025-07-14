import { Box, Text } from 'ink';
import React from 'react';

import {
  useAgentData,
  useSystemMetrics,
  useRuntimeStatus,
  useRecentEvents,
} from '../../hooks/useAPIData.js';
import { useConnectionMonitor } from '../../hooks/useConnectionMonitor.js';
import { useTerminalDimensions } from '../../hooks/useTerminalDimensions.js';
import { enhancedRuntimeClient } from '../../services/enhancedRuntimeClient.js';
import { getAdaptiveSpacing } from '../../utils/responsive-grid.js';
import {
  ConnectionStatus,
  ConnectionHealth,
  AutoReconnectIndicator,
} from '../ui/ConnectionStatus.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.js';
import {
  LoadingIndicator,
  ProgressBar,
  Skeleton,
  Shimmer,
} from '../ui/LoadingStates.js';

interface EnhancedDashboardProps {
  onSelectAgent?: (agentId: string) => void;
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  onSelectAgent: _onSelectAgent,
}) => {
  const {
    dimensions: _dimensions,
    breakpoints,
    currentBreakpoint: _currentBreakpoint,
  } = useTerminalDimensions();
  const spacing = getAdaptiveSpacing(breakpoints);

  // Connection monitoring
  const {
    status,
    stats,
    isHealthy: _isHealthy,
    qualityScore,
    reconnect: _reconnect,
  } = useConnectionMonitor(enhancedRuntimeClient);

  // Data fetching with loading states
  const agents = useAgentData(enhancedRuntimeClient, {
    onError: (error) => console.error('Failed to fetch agents:', error),
  });

  const metrics = useSystemMetrics(enhancedRuntimeClient);
  const runtimeStatus = useRuntimeStatus(enhancedRuntimeClient);
  const events = useRecentEvents(enhancedRuntimeClient, 10);

  // Handle retry
  const handleRetry = () => {
    agents.refetch();
    metrics.refetch();
    runtimeStatus.refetch();
    events.refetch();
  };

  return (
    <ErrorBoundary
      onError={(error) => console.error('Dashboard error:', error)}
      onRetry={handleRetry}
    >
      <Box flexDirection='column' padding={spacing.padding}>
        {/* Header with connection status */}
        <Box justifyContent='space-between'>
          <Text bold color='cyan'>
            🎮 SYMindX Dashboard
          </Text>
          <ConnectionStatus status={status} compact />
        </Box>

        {/* Connection health bar */}
        {status.status === 'connected' && (
          <Box>
            <Text>Connection Quality: </Text>
            <ConnectionHealth latency={status.latency} status={status.status} />
            <Text color='gray'> ({qualityScore}%)</Text>
          </Box>
        )}

        {/* Auto-reconnect indicator */}
        {status.status === 'connecting' && status.reconnectAttempts > 0 && (
          <Box>
            <AutoReconnectIndicator
              attempts={status.reconnectAttempts}
              maxAttempts={5}
              nextRetryIn={status.reconnectDelay}
            />
          </Box>
        )}

        {/* Main content area */}
        {status.status === 'connected' ? (
          <Box flexDirection='column' gap={1}>
            {/* System Metrics Section */}
            <Box
              flexDirection='column'
              borderStyle='round'
              borderColor='gray'
              padding={1}
            >
              <Text bold>📊 System Metrics</Text>

              {metrics.isLoading ? (
                <Box flexDirection='column' gap={1}>
                  <Skeleton width={30} height={1} />
                  <Skeleton width={25} height={1} />
                  <Skeleton width={35} height={1} />
                </Box>
              ) : metrics.error ? (
                <Text color='red'>
                  Failed to load metrics: {metrics.error.message}
                </Text>
              ) : metrics.data ? (
                <Box flexDirection='column'>
                  <Text>Uptime: {formatUptime(metrics.data.uptime)}</Text>
                  <Text>
                    Memory:{' '}
                    {formatMemory(
                      metrics.data.memory.heapUsed,
                      metrics.data.memory.heapTotal
                    )}
                  </Text>
                  <Box marginTop={1}>
                    <Text>Memory Usage: </Text>
                    <ProgressBar
                      value={metrics.data.memory.heapUsed}
                      total={metrics.data.memory.heapTotal}
                      width={20}
                      color='green'
                    />
                  </Box>
                  <Text>
                    Active Agents: {metrics.data.activeAgents}/
                    {metrics.data.totalAgents}
                  </Text>
                  <Text>Commands: {metrics.data.commandsProcessed}</Text>
                  <Text>Portal Requests: {metrics.data.portalRequests}</Text>
                </Box>
              ) : null}

              {metrics.isValidating && !metrics.isLoading && (
                <Box marginTop={1}>
                  <LoadingIndicator
                    variant='dots'
                    text='Updating'
                    size='small'
                  />
                </Box>
              )}
            </Box>

            {/* Agents Section */}
            <Box
              flexDirection='column'
              borderStyle='round'
              borderColor='gray'
              padding={1}
            >
              <Text bold>🤖 Active Agents</Text>

              {agents.isLoading ? (
                <Box flexDirection='column' gap={1}>
                  {[1, 2, 3].map((i) => (
                    <Shimmer key={i} width={40} height={2} />
                  ))}
                </Box>
              ) : agents.error ? (
                <Text color='red'>
                  Failed to load agents: {agents.error.message}
                </Text>
              ) : agents.data && agents.data.length > 0 ? (
                <Box flexDirection='column'>
                  {agents.data.map((agent) => (
                    <Box key={agent.id} marginBottom={1}>
                      <Box>
                        <Text
                          color={agent.status === 'active' ? 'green' : 'gray'}
                        >
                          {agent.status === 'active' ? '🟢' : '⚪'} {agent.name}
                        </Text>
                        {agent.emotion && (
                          <Text color='yellow'> - {agent.emotion}</Text>
                        )}
                      </Box>
                      <Box marginLeft={3}>
                        <Text color='gray' dimColor>
                          Extensions: {agent.extensionCount} | Portal:{' '}
                          {agent.hasPortal ? '✓' : '✗'} | Ethics:{' '}
                          {agent.ethicsEnabled ? 'ON' : 'OFF'}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text color='gray'>No agents found</Text>
              )}

              {agents.isValidating && !agents.isLoading && (
                <Box marginTop={1}>
                  <LoadingIndicator variant='spinner' size='small' />
                </Box>
              )}
            </Box>

            {/* Recent Events Section */}
            <Box
              flexDirection='column'
              borderStyle='round'
              borderColor='gray'
              padding={1}
            >
              <Text bold>📡 Recent Activity</Text>

              {events.isLoading ? (
                <Box flexDirection='column'>
                  <LoadingIndicator variant='wave' text='Loading events' />
                </Box>
              ) : events.error ? (
                <Text color='red'>
                  Failed to load events: {events.error.message}
                </Text>
              ) : events.data && events.data.length > 0 ? (
                <Box flexDirection='column'>
                  {events.data.slice(0, 5).map((event, i) => (
                    <Box key={i}>
                      <Text color='gray' dimColor>
                        {event.timestamp}
                      </Text>
                      <Text> </Text>
                      <Text color={getEventColor(event.type)}>
                        {event.type}
                      </Text>
                      {event.source && (
                        <>
                          <Text> - </Text>
                          <Text color='cyan'>{event.source}</Text>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Text color='gray'>No recent events</Text>
              )}

              {events.isValidating && !events.isLoading && (
                <Box marginTop={1}>
                  <LoadingIndicator variant='pulse' size='small' />
                </Box>
              )}
            </Box>

            {/* Connection Stats */}
            {breakpoints.isMedium ||
            breakpoints.isLarge ||
            breakpoints.isXLarge ? (
              <Box
                flexDirection='column'
                borderStyle='round'
                borderColor='gray'
                padding={1}
              >
                <Text bold>📈 Connection Stats</Text>
                <Text>Uptime: {formatDuration(stats.uptime)}</Text>
                <Text>Average Latency: {stats.averageLatency}ms</Text>
                <Text>
                  Min/Max Latency: {stats.minLatency}ms / {stats.maxLatency}ms
                </Text>
                <Text>Connections: {stats.totalConnections}</Text>
                <Text>Disconnections: {stats.totalDisconnections}</Text>
                {stats.packetLoss > 0 && (
                  <Text color='yellow'>
                    Packet Loss: {stats.packetLoss.toFixed(2)}%
                  </Text>
                )}
              </Box>
            ) : null}
          </Box>
        ) : (
          <Box
            flexDirection='column'
            alignItems='center'
            justifyContent='center'
            height={10}
          >
            {status.status === 'connecting' ? (
              <LoadingIndicator
                variant='spinner'
                text='Connecting to runtime'
                color='yellow'
              />
            ) : (
              <Box flexDirection='column' alignItems='center'>
                <Text color='red'>⚠️ Not connected to runtime</Text>
                <Box marginTop={1}>
                  <Text color='gray'>
                    {status.lastError?.message ||
                      'Unable to establish connection'}
                  </Text>
                </Box>
                <Box marginTop={1}>
                  <Text color='cyan'>
                    Press <Text bold>R</Text> to retry
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Footer with last update time */}
        <Box justifyContent='space-between'>
          <Text color='gray' dimColor>
            Last update: {agents.lastFetchTime?.toLocaleTimeString() || 'Never'}
          </Text>
          <Text color='gray' dimColor>
            {agents.isStale && '(stale) '}
            Press R to refresh
          </Text>
        </Box>
      </Box>
    </ErrorBoundary>
  );
};

// Helper functions
function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatDuration(ms: number): string {
  return formatUptime(Math.floor(ms / 1000));
}

function formatMemory(used: number, total: number): string {
  const usedMB = (used / 1024 / 1024).toFixed(1);
  const totalMB = (total / 1024 / 1024).toFixed(1);
  const percentage = ((used / total) * 100).toFixed(1);
  return `${usedMB}MB / ${totalMB}MB (${percentage}%)`;
}

function getEventColor(type: string): string {
  switch (type) {
    case 'agent_active':
      return 'green';
    case 'agent_inactive':
      return 'gray';
    case 'runtime_status':
      return 'cyan';
    case 'error':
      return 'red';
    default:
      return 'white';
  }
}
