import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

import { useAgentData } from '../hooks/useAgentData.js';

export const AgentList: React.FC = () => {
  const agentData = useAgentData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useInput((_input, key) => {
    if (agentData.agents.length === 0) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }

    if (key.downArrow && selectedIndex < agentData.agents.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }

    if (key.return) {
      setShowDetails(!showDetails);
    }
  });

  const selectedAgent = agentData.agents[selectedIndex];
  const connectionStatus = agentData.isConnected;

  return (
    <Box flexDirection='column' gap={1}>
      {/* Connection Status */}
      <Box
        padding={1}
        borderStyle='round'
        borderColor={connectionStatus ? 'green' : 'red'}
      >
        <Text bold color={connectionStatus ? 'green' : 'red'}>
          {connectionStatus ? '🟢 Connected to Runtime' : '🔴 Runtime Offline'}
        </Text>
        {agentData.error && <Text color='red'> - {agentData.error}</Text>}
      </Box>

      <Box
        padding={1}
        borderStyle='round'
        borderColor={connectionStatus ? 'blue' : 'gray'}
      >
        <Box flexDirection='column' width='100%'>
          <Text bold color={connectionStatus ? 'blue' : 'gray'}>
            Agent List ({agentData.agents.length} total, {agentData.activeCount}{' '}
            active)
          </Text>
          <Text color='gray'>
            {agentData.agents.length > 0
              ? 'Use ↑/↓ arrows to navigate, Enter to view details'
              : 'No agents found'}
          </Text>
          <Text> </Text>

          {agentData.agents.length > 0 ? (
            agentData.agents.map((agent, index) => (
              <Box key={agent.id} flexDirection='row'>
                <Text color={index === selectedIndex ? 'cyan' : 'white'}>
                  {index === selectedIndex ? '► ' : '  '}
                  {agent.name}
                  <Text color='gray'> ({agent.id})</Text>
                  <Text
                    color={
                      agent.status === 'active'
                        ? 'green'
                        : agent.status === 'error'
                          ? 'red'
                          : 'yellow'
                    }
                  >
                    {agent.status === 'active'
                      ? ' 🟢'
                      : agent.status === 'error'
                        ? ' 🔴'
                        : ' 🟡'}
                  </Text>
                  {!agent.ethicsEnabled && <Text color='yellow'> ⚠️</Text>}
                </Text>
              </Box>
            ))
          ) : (
            <Text color='gray'>
              {connectionStatus
                ? 'No agents are currently loaded in the runtime'
                : 'Connect to runtime to view agents'}
            </Text>
          )}
        </Box>
      </Box>

      {showDetails && selectedAgent && (
        <Box padding={1} borderStyle='round' borderColor='yellow'>
          <Box flexDirection='column' width='100%'>
            <Text bold color='yellow'>
              Agent Details: {selectedAgent.name}
            </Text>
            <Text> </Text>
            <Box flexDirection='row' gap={4}>
              <Box flexDirection='column'>
                <Text>
                  <Text color='cyan'>ID:</Text> {selectedAgent.id}
                </Text>
                <Text>
                  <Text color='cyan'>Status:</Text> {selectedAgent.status}
                </Text>
                <Text>
                  <Text color='cyan'>Type:</Text>{' '}
                  {selectedAgent.type || 'AI Agent'}
                </Text>
                <Text>
                  <Text color='cyan'>Memory:</Text>{' '}
                  {selectedAgent.memoryProvider || 'Connected'}
                </Text>
              </Box>
              <Box flexDirection='column'>
                <Text>
                  <Text color='cyan'>Extensions:</Text>{' '}
                  {selectedAgent.extensions?.length || 0}
                </Text>
                <Text>
                  <Text color='cyan'>Portals:</Text>{' '}
                  {selectedAgent.portals?.length || 0}
                </Text>
                <Text>
                  <Text color='cyan'>Ethics:</Text>
                  <Text
                    color={selectedAgent.ethicsEnabled ? 'green' : 'yellow'}
                  >
                    {selectedAgent.ethicsEnabled ? ' Enabled' : ' Disabled'}
                  </Text>
                </Text>
                <Text>
                  <Text color='cyan'>Autonomous:</Text>{' '}
                  {selectedAgent.autonomousEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </Box>
            </Box>

            {selectedAgent.description && (
              <>
                <Text> </Text>
                <Text>
                  <Text color='cyan'>Description:</Text>
                </Text>
                <Text color='gray'>{selectedAgent.description}</Text>
              </>
            )}

            {!selectedAgent.ethicsEnabled && (
              <>
                <Text> </Text>
                <Text color='yellow'>
                  ⚠️ Ethics constraints are disabled for this agent
                </Text>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Quick stats */}
      <Box padding={1} borderStyle='round' borderColor='magenta'>
        <Box flexDirection='column' width='100%'>
          <Text bold color='magenta'>
            Quick Stats
          </Text>
          <Text> </Text>
          <Box flexDirection='row' gap={4}>
            <Text>
              <Text color='cyan'>Total Extensions:</Text>{' '}
              {agentData.extensionsCount}
            </Text>
            <Text>
              <Text color='cyan'>Active Rate:</Text>{' '}
              {agentData.totalCount > 0
                ? Math.round(
                    (agentData.activeCount / agentData.totalCount) * 100
                  )
                : 0}
              %
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
