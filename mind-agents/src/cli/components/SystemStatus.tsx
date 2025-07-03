import React from 'react';
import { Box, Text } from 'ink';
import { useSystemStats } from '../hooks/useSystemStats.js';

export const SystemStatus: React.FC = () => {
  const systemStats = useSystemStats();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'active':
      case 'healthy':
        return 'green';
      case 'warning':
      case 'degraded':
        return 'yellow';
      case 'error':
      case 'failed':
      case 'stopped':
        return 'red';
      default:
        return 'gray';
    }
  };

  const connectionStatus = systemStats.isConnected;
  const borderColor = connectionStatus ? 'green' : 'red';

  return (
    <Box flexDirection="column" gap={1}>
      {/* Connection Status Banner */}
      <Box padding={1} borderStyle="round" borderColor={borderColor}>
        <Box flexDirection="row" justifyContent="space-between" width="100%">
          <Text bold color={borderColor}>
            {connectionStatus ? '🟢 Connected to Runtime' : '🔴 Runtime Offline'}
          </Text>
          <Text color="gray">
            {connectionStatus ? 'Live system data' : 'No connection to SYMindX runtime'}
          </Text>
        </Box>
        {systemStats.error && (
          <Text color="red">Error: {systemStats.error}</Text>
        )}
      </Box>

      <Box padding={1} borderStyle="round" borderColor={connectionStatus ? "green" : "gray"}>
        <Box flexDirection="column" width="100%">
          <Text bold color={connectionStatus ? "green" : "gray"}>System Health</Text>
          <Text> </Text>
          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column">
              <Text>
                <Text color="cyan">Runtime:</Text> 
                <Text color={getStatusColor(systemStats.runtime.status)}>●</Text> {systemStats.runtime.status}
                {systemStats.runtime.message && (
                  <Text color="gray"> - {systemStats.runtime.message}</Text>
                )}
              </Text>
              <Text>
                <Text color="cyan">Memory System:</Text> 
                <Text color={getStatusColor(systemStats.memory.status)}>●</Text> {systemStats.memory.status}
                {systemStats.memory.message && (
                  <Text color="gray"> - {systemStats.memory.message}</Text>
                )}
              </Text>
              <Text>
                <Text color="cyan">Event Bus:</Text> 
                <Text color={getStatusColor(systemStats.eventBus.status)}>●</Text> {systemStats.eventBus.status}
                {systemStats.eventBus.message && (
                  <Text color="gray"> - {systemStats.eventBus.message}</Text>
                )}
              </Text>
            </Box>
            <Box flexDirection="column">
              <Text>
                <Text color="cyan">Portal Integration:</Text> 
                <Text color={getStatusColor(systemStats.portals.status)}>●</Text> {systemStats.portals.status}
                {systemStats.portals.message && (
                  <Text color="gray"> - {systemStats.portals.message}</Text>
                )}
              </Text>
              <Text>
                <Text color="cyan">Extension System:</Text> 
                <Text color={getStatusColor(systemStats.extensions.status)}>●</Text> {systemStats.extensions.status}
                {systemStats.extensions.message && (
                  <Text color="gray"> - {systemStats.extensions.message}</Text>
                )}
              </Text>
              <Text>
                <Text color="cyan">Security:</Text> 
                <Text color={getStatusColor(systemStats.security.status)}>●</Text> {systemStats.security.status}
                {systemStats.security.message && (
                  <Text color="gray"> - {systemStats.security.message}</Text>
                )}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box padding={1} borderStyle="round" borderColor={connectionStatus ? "blue" : "gray"}>
        <Box flexDirection="column" width="100%">
          <Text bold color={connectionStatus ? "blue" : "gray"}>Performance Metrics</Text>
          <Text> </Text>
          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column">
              <Text>
                <Text color="cyan">Memory Usage:</Text> {systemStats.performance.cpu}%
                <Text color="gray"> (heap pressure)</Text>
              </Text>
              <Text><Text color="cyan">Memory:</Text> {systemStats.performance.memory}</Text>
              <Text><Text color="cyan">Uptime:</Text> {systemStats.performance.uptime}</Text>
            </Box>
            <Box flexDirection="column">
              <Text><Text color="cyan">Connections:</Text> {systemStats.performance.connections}</Text>
              <Text><Text color="cyan">Commands/min:</Text> {systemStats.performance.messageRate}</Text>
              <Text><Text color="cyan">Response Time:</Text> {systemStats.performance.responseTime}ms</Text>
            </Box>
          </Box>
          {!connectionStatus && (
            <Text color="gray">Performance data requires runtime connection</Text>
          )}
        </Box>
      </Box>

      <Box padding={1} borderStyle="round" borderColor="yellow">
        <Box flexDirection="column" width="100%">
          <Text bold color="yellow">Environment Configuration</Text>
          <Text> </Text>
          <Box flexDirection="row" gap={4}>
            <Box flexDirection="column">
              <Text><Text color="cyan">Node Version:</Text> {systemStats.environment.nodeVersion}</Text>
              <Text><Text color="cyan">Platform:</Text> {systemStats.environment.platform}</Text>
              <Text><Text color="cyan">Architecture:</Text> {systemStats.environment.arch}</Text>
            </Box>
            <Box flexDirection="column">
              <Text><Text color="cyan">Config File:</Text> {systemStats.environment.configFile}</Text>
              <Text><Text color="cyan">Log Level:</Text> {systemStats.environment.logLevel}</Text>
              <Text><Text color="cyan">Environment:</Text> {systemStats.environment.env}</Text>
            </Box>
          </Box>
        </Box>
      </Box>

      {systemStats.warnings.length > 0 && (
        <Box padding={1} borderStyle="round" borderColor="red">
          <Box flexDirection="column" width="100%">
            <Text bold color="red">System Warnings & Issues</Text>
            <Text> </Text>
            {systemStats.warnings.slice(0, 5).map((warning, index) => (
              <Text key={index} color="yellow">⚠️  {warning}</Text>
            ))}
            {systemStats.warnings.length > 5 && (
              <Text color="gray">... and {systemStats.warnings.length - 5} more warnings</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Connection troubleshooting */}
      {!connectionStatus && (
        <Box padding={1} borderStyle="round" borderColor="blue">
          <Box flexDirection="column" width="100%">
            <Text bold color="blue">💡 Connection Troubleshooting</Text>
            <Text> </Text>
            <Text color="gray">• Ensure SYMindX runtime is running</Text>
            <Text color="gray">• Check if API server is listening on port 8000</Text>
            <Text color="gray">• Verify no firewall is blocking connections</Text>
            <Text color="gray">• Try: <Text color="cyan">curl http://localhost:8000/health</Text></Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};