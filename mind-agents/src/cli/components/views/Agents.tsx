import { Box, Text, useInput } from 'ink'
import React, { useState, useEffect } from 'react'

import { useAgentData } from '../../hooks/useAgentData.js'
import { useNavigation } from '../../hooks/useNavigation.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { soundManager, SoundType } from '../../utils/sound-effects.js'
import { GlitchText } from '../effects/GlitchText.js'
import { Card3D } from '../ui/Card3D.js'

import AgentDetail from './AgentDetail.js'

interface AgentDetailInfo {
  id: string
  name: string
  status: 'active' | 'inactive' | 'error'
  emotion: string
  portal: string
  ethicsEnabled: boolean
  memory: {
    provider: string
    entries: number
  }
  extensions: string[]
  lastActive: Date
  metrics: {
    messagesProcessed: number
    responseTime: number
    uptime: number
  }
}

interface AgentsProps {
  navigation?: any // This would be passed from parent if needed
}

export const Agents: React.FC<AgentsProps> = ({ navigation: parentNavigation }) => {
  const agentData = useAgentData()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [agentDetails, setAgentDetails] = useState<AgentDetailInfo | null>(null)
  const [showDetailView, setShowDetailView] = useState<boolean>(false)
  
  // Local navigation if not provided by parent
  const localNavigation = useNavigation({
    initialItem: { id: 'agents', label: 'Agents' },
    soundEnabled: true
  })
  
  const navigation = parentNavigation || localNavigation
  
  // Mock detailed agent data
  useEffect(() => {
    if (selectedAgent) {
      // In real implementation, fetch from API
      setAgentDetails({
        id: selectedAgent,
        name: agentData?.agents.find(a => a.id === selectedAgent)?.name || 'Unknown',
        status: 'active',
        emotion: 'confident',
        portal: 'groq',
        ethicsEnabled: selectedAgent !== 'nyx',
        memory: {
          provider: 'sqlite',
          entries: Math.floor(Math.random() * 1000),
        },
        extensions: ['api', 'telegram', 'slack'],
        lastActive: new Date(),
        metrics: {
          messagesProcessed: Math.floor(Math.random() * 10000),
          responseTime: Math.floor(Math.random() * 100) + 50,
          uptime: Math.floor(Math.random() * 86400000),
        },
      })
    }
  }, [selectedAgent, agentData])
  
  const formatUptime = (ms: number): string => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  // Enhanced keyboard navigation
  useInput((input, key) => {
    const agents = agentData?.agents || []
    
    if (key.escape && showDetailView) {
      setShowDetailView(false)
      navigation.goBack()
      soundManager.play(SoundType.NAVIGATE)
    } else if (key.escape && !showDetailView && navigation.canGoBack) {
      navigation.goBack()
      soundManager.play(SoundType.NAVIGATE)
    } else if (!showDetailView) {
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1)
        setSelectedAgent(agents[selectedIndex - 1]?.id || null)
        soundManager.play(SoundType.NAVIGATE)
      } else if (key.downArrow && selectedIndex < agents.length - 1) {
        setSelectedIndex(selectedIndex + 1)
        setSelectedAgent(agents[selectedIndex + 1]?.id || null)
        soundManager.play(SoundType.NAVIGATE)
      } else if ((key.return || input === 'd') && selectedAgent) {
        setShowDetailView(true)
        navigation.navigateTo({
          id: `agent-${selectedAgent}`,
          label: agentDetails?.name || 'Agent Detail',
          parentId: 'agents'
        })
        soundManager.play(SoundType.SELECT)
      } else if (input === 's' && selectedAgent) {
        // Start/Stop agent
        soundManager.play(SoundType.SELECT)
      } else if (input === 'r' && selectedAgent) {
        // Restart agent
        soundManager.play(SoundType.SELECT)
      } else if (input === 'e' && selectedAgent) {
        // Edit agent
        soundManager.play(SoundType.SELECT)
      } else if (input === 'n') {
        // New agent
        soundManager.play(SoundType.SELECT)
      }
    }
  })
  
  // Set initial selection
  useEffect(() => {
    const agents = agentData?.agents || []
    if (agents.length > 0 && !selectedAgent) {
      const firstAgentId = agents[0]?.id
      if (firstAgentId) {
        setSelectedAgent(firstAgentId)
      }
      setSelectedIndex(0)
    }
  }, [agentData, selectedAgent])
  
  // Show detailed view if requested
  if (showDetailView && selectedAgent) {
    return (
      <AgentDetail 
        agentId={selectedAgent} 
        onBack={() => setShowDetailView(false)} 
      />
    )
  }

  return (
    <Box flexDirection="column" padding={1} gap={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <GlitchText intensity={0.1} frequency={3000} color={cyberpunkTheme.colors.accent} bold>
          NEURAL AGENTS MANAGEMENT
        </GlitchText>
      </Box>
      
      <Box flexDirection="row" gap={2}>
        {/* Agent List */}
        <Box flexDirection="column" width="40%">
          <Card3D 
            title="AGENT ROSTER" 
            width={40} 
            height={30}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              {agentData?.agents.map((agent, index) => (
                <Box 
                  key={agent.id}
                  flexDirection="column"
                  paddingY={1}
                >
                  <Box
                    flexDirection="row"
                    gap={1}
                  >
                    {/* Status indicator */}
                    <Text color={
                      agent.status === 'active' 
                        ? cyberpunkTheme.colors.success 
                        : cyberpunkTheme.colors.danger
                    }>
                      {agent.status === 'active' ? '⬤' : '○'}
                    </Text>
                    
                    {/* Agent name */}
                    <Box flexGrow={1}>
                      <Text 
                        color={selectedAgent === agent.id 
                          ? cyberpunkTheme.colors.accent 
                          : cyberpunkTheme.colors.text
                        }
                        bold={selectedAgent === agent.id}
                      >
                        {selectedAgent === agent.id ? '▶ ' : '  '}{agent.name} ({agent.id})
                      </Text>
                    </Box>
                    
                    {/* Ethics indicator */}
                    {agent.ethicsEnabled === false && (
                      <Text color={cyberpunkTheme.colors.warning}>⚠️</Text>
                    )}
                  </Box>
                  
                  {/* Agent info */}
                  <Box marginLeft={3}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      {agent.emotion} | {agent.extensionCount} ext
                    </Text>
                  </Box>
                  
                  {/* Separator */}
                  {index < agentData.agents.length - 1 && (
                    <Box marginTop={1}>
                      <Text color={cyberpunkTheme.colors.borderDim}>
                        {'─'.repeat(35)}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
              
              {/* Add new agent hint */}
              <Box marginTop={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Press [N] to create new agent
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>
        
        {/* Agent Details */}
        <Box flexDirection="column" width="60%">
          {selectedAgent && agentDetails ? (
            <>
              {/* Agent Status Card */}
              <Card3D 
                title={`AGENT: ${agentDetails.name.toUpperCase()}`}
                width={50} 
                height={15}
                color={cyberpunkTheme.colors.secondary}
                animated={true}
              >
                <Box flexDirection="column" gap={1}>
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Status:</Text>
                    <Text color={cyberpunkTheme.colors.success} bold>
                      {agentDetails.status.toUpperCase()}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Portal:</Text>
                    <Text color={cyberpunkTheme.colors.primary}>
                      {agentDetails.portal}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Ethics:</Text>
                    <Text color={agentDetails.ethicsEnabled 
                      ? cyberpunkTheme.colors.success 
                      : cyberpunkTheme.colors.danger
                    }>
                      {agentDetails.ethicsEnabled ? 'ENABLED' : 'DISABLED'}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Memory:</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {agentDetails.memory.provider} ({agentDetails.memory.entries} entries)
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Extensions:</Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {agentDetails.extensions.join(', ')}
                    </Text>
                  </Box>
                </Box>
              </Card3D>
              
              {/* Metrics Card */}
              <Box marginTop={1}>
                <Card3D 
                  title="PERFORMANCE METRICS"
                  width={50} 
                  height={12}
                  color={cyberpunkTheme.colors.matrix}
                >
                  <Box flexDirection="column" gap={1}>
                    <Box gap={2}>
                      <Text color={cyberpunkTheme.colors.textDim}>Messages:</Text>
                      <Text color={cyberpunkTheme.colors.accent} bold>
                        {agentDetails.metrics.messagesProcessed.toLocaleString()}
                      </Text>
                    </Box>
                    
                    <Box gap={2}>
                      <Text color={cyberpunkTheme.colors.textDim}>Avg Response:</Text>
                      <Text color={cyberpunkTheme.colors.warning}>
                        {agentDetails.metrics.responseTime}ms
                      </Text>
                    </Box>
                    
                    <Box gap={2}>
                      <Text color={cyberpunkTheme.colors.textDim}>Uptime:</Text>
                      <Text color={cyberpunkTheme.colors.success}>
                        {formatUptime(agentDetails.metrics.uptime)}
                      </Text>
                    </Box>
                    
                    <Box gap={2}>
                      <Text color={cyberpunkTheme.colors.textDim}>Last Active:</Text>
                      <Text color={cyberpunkTheme.colors.text}>
                        {agentDetails.lastActive.toLocaleTimeString()}
                      </Text>
                    </Box>
                  </Box>
                </Card3D>
              </Box>
            </>
          ) : (
            <Card3D 
              title="AGENT DETAILS"
              width={50} 
              height={28}
              color={cyberpunkTheme.colors.borderDim}
            >
              <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                <Text color={cyberpunkTheme.colors.textDim}>
                  Select an agent to view details
                </Text>
                <Box marginTop={2}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    Use [↑↓] to navigate, [Enter] to select
                  </Text>
                </Box>
              </Box>
            </Card3D>
          )}
        </Box>
      </Box>
      
      {/* Action buttons */}
      <Box marginTop={1} gap={3}>
        <Text color={cyberpunkTheme.colors.textDim}>
          [↑↓] Navigate | [Enter/D] Deep Debug | [S] Start/Stop | [R] Restart | [E] Edit | [N] New Agent
        </Text>
      </Box>
    </Box>
  )
}