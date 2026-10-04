import { Box, Text } from 'ink';
import React from 'react';

import { useAgentData } from '../hooks/useAgentData.js';
import { useSystemStats } from '../hooks/useSystemStats.js';

export const Dashboard: React.FC = () => {
  const systemStats = useSystemStats();
  const agentData = useAgentData();

  // Show connection status at the top
  const connectionStatus = systemStats.isConnected && agentData.isConnected;
  const connectionColor = connectionStatus ? 'green' : 'red';
  const connectionIcon = connectionStatus ? '🟢' : '🔴';
  const connectionText = connectionStatus
    ? 'Connected to Runtime'
    : 'Runtime Offline';

  return (
    <Box flexDirection='column' gap={1}>
      {/* Connection Status Banner */}
      <Box padding={1} borderStyle='round' borderColor={connectionColor}>
        <Box flexDirection='row' justifyContent='space-between' width='100%'>
          <Text bold color={connectionColor}>
            {connectionIcon} {connectionText}
          </Text>
          {!connectionStatus && (
            <Text color='yellow'>
              Check if SYMindX runtime is running on port 8000
            </Text>
          )}
        </Box>
        {(systemStats.error || agentData.error) && (
          <Text color='red'>Error: {systemStats.error || agentData.error}</Text>
        )}
      </Box>

      <Box
        padding={1}
        borderStyle='round'
        borderColor={connectionStatus ? 'green' : 'gray'}
      >
        <Box flexDirection='column' width='100%'>
          <Text bold color={connectionStatus ? 'green' : 'gray'}>
            System Overview
          </Text>
          <Text> </Text>
          <Box flexDirection='row' gap={4}>
            <Box flexDirection='column'>
              <Text>
                <Text color='cyan'>Runtime Status:</Text>{' '}
                {systemStats.isRunning ? '🟢 Running' : '🔴 Stopped'}
              </Text>
              <Text>
                <Text color='cyan'>Uptime:</Text> {systemStats.uptime}
              </Text>
              <Text>
                <Text color='cyan'>Memory Usage:</Text>{' '}
                {systemStats.memoryUsage}
              </Text>
            </Box>
            <Box flexDirection='column'>
              <Text>
                <Text color='cyan'>Active Agents:</Text> {agentData.activeCount}
              </Text>
              <Text>
                <Text color='cyan'>Total Agents:</Text> {agentData.totalCount}
              </Text>
              <Text>
                <Text color='cyan'>Extensions:</Text>{' '}
                {agentData.extensionsCount}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        padding={1}
        borderStyle='round'
        borderColor={connectionStatus ? 'yellow' : 'gray'}
      >
        <Box flexDirection='column' width='100%'>
          <Text bold color={connectionStatus ? 'yellow' : 'gray'}>
            Recent Activity
          </Text>
          <Text> </Text>
          {agentData.recentActivity.length > 0 ? (
            agentData.recentActivity.slice(0, 5).map((activity) => {
              const activityColor =
                activity.type === 'error'
                  ? 'red'
                  : activity.type === 'warning'
                    ? 'yellow'
                    : 'white';
              return (
                <Text key={`activity-${activity.timestamp}-${activity.message}`} color={activityColor}>
                  <Text color='gray'>{activity.timestamp}</Text> -{' '}
                  {activity.message}
                </Text>
              );
            })
          ) : (
            <Text color='gray'>
              {connectionStatus
                ? 'No recent activity'
                : 'Connect to runtime to see activity'}
            </Text>
          )}
        </Box>
      </Box>

      {/* System Warnings */}
      {systemStats.warnings.length > 0 && (
        <Box padding={1} borderStyle='round' borderColor='red'>
          <Box flexDirection='column' width='100%'>
            <Text bold color='red'>
              ⚠️ System Warnings
            </Text>
            <Text> </Text>
            {systemStats.warnings.slice(0, 3).map((warning) => (
              <Text key={`warning-${warning.substring(0, 20)}`} color='yellow'>
                • {warning}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      <Box padding={1} borderStyle='round' borderColor='magenta'>
        <Box flexDirection='column' width='100%'>
          <Text bold color='magenta'>
            Quick Actions
          </Text>
          <Text> </Text>
          <Text>• Press 'a' to view agent details</Text>
          <Text>• Press 's' to view system status</Text>
          <Text>• Press 'h' for help and navigation</Text>
          {!connectionStatus && (
            <>
              <Text> </Text>
              <Text color='gray'>
                💡 Start the SYMindX runtime to enable live data
              </Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
