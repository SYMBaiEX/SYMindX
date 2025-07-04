import React, { useState, useEffect } from 'react'
import { Box, Text, useApp } from 'ink'
import { Header } from '../ui/Header.js'
import { Card3D } from '../ui/Card3D.js'
import { Chart } from '../ui/Chart.js'
import { GlitchText } from '../effects/GlitchText.js'
import { MatrixRain } from '../effects/MatrixRain.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { useSystemStats } from '../../hooks/useSystemStats.js'
import { useAgentData } from '../../hooks/useAgentData.js'
import { soundManager, SoundType } from '../../utils/sound-effects.js'
import { musicManager } from '../../utils/background-music.js'

export const Dashboard: React.FC = () => {
  const { exit } = useApp()
  const systemStats = useSystemStats()
  const agentData = useAgentData()
  
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(20).fill(0))
  const [memHistory, setMemHistory] = useState<number[]>(Array(20).fill(0))
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory'>('cpu')
  const [showMatrix, setShowMatrix] = useState(false)
  
  // Convert SystemStats to simpler format for display
  const displayStats = systemStats ? {
    cpu: systemStats.performance.cpu,
    memory: parseFloat(systemStats.performance.memory) || 0,
    memoryUsed: parseFloat(systemStats.memoryUsage) * 1024 * 1024 || 0,
    memoryTotal: 2048 * 1024 * 1024, // 2GB default
    uptime: systemStats.uptime,
    network: systemStats.isConnected ? 'CONNECTED' : 'DISCONNECTED'
  } : null
  
  // Play startup sound and music
  useEffect(() => {
    soundManager.playBootSequence()
    if (musicManager.isEnabled()) {
      musicManager.playMood('cyberpunk')
    }
    
    return () => {
      musicManager.stop()
    }
  }, [])
  
  // Update history data
  useEffect(() => {
    if (displayStats) {
      setCpuHistory(prev => [...prev.slice(1), displayStats.cpu])
      setMemHistory(prev => [...prev.slice(1), displayStats.memory])
    }
  }, [displayStats])
  
  // Toggle matrix effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMatrix(true)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])
  
  const formatBytes = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }
  
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Header 
        title="SYMINDX" 
        subtitle="NEURAL RUNTIME SYSTEM v2.0"
        showStatus={true}
        animated={true}
      />
      
      {/* Main Content */}
      <Box flexGrow={1} flexDirection="row" gap={2} padding={1}>
        {/* Left Column - System Metrics */}
        <Box flexDirection="column" gap={1} width="50%">
          {/* System Status Card */}
          <Card3D 
            title="SYSTEM STATUS" 
            width={40} 
            height={12}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Runtime: </Text>
                <GlitchText intensity={0.05} frequency={5000}>
                  {systemStats?.uptime || 'LOADING...'}
                </GlitchText>
              </Box>
              
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>CPU Usage: </Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  {cyberpunkTheme.ascii.progressFull.repeat(Math.floor((displayStats?.cpu || 0) / 5))}
                  {cyberpunkTheme.ascii.progressEmpty.repeat(20 - Math.floor((displayStats?.cpu || 0) / 5))}
                  {' '}{displayStats?.cpu?.toFixed(1) || '0.0'}%
                </Text>
              </Box>
              
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Memory: </Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {displayStats ? `${formatBytes(displayStats.memoryUsed)} / ${formatBytes(displayStats.memoryTotal)}` : 'Loading...'}
                </Text>
              </Box>
              
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Active Agents: </Text>
                <Text color={cyberpunkTheme.colors.accent} bold>
                  {agentData?.activeAgents || 0} / {agentData?.totalAgents || 0}
                </Text>
              </Box>
              
              <Box>
                <Text color={cyberpunkTheme.colors.textDim}>Network: </Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {displayStats?.network || 'CHECKING...'}
                </Text>
              </Box>
            </Box>
          </Card3D>
          
          {/* Performance Chart */}
          <Card3D 
            title="PERFORMANCE METRICS" 
            width={40} 
            height={14}
            color={cyberpunkTheme.colors.secondary}
          >
            <Chart
              data={selectedMetric === 'cpu' ? cpuHistory : memHistory}
              width={36}
              height={10}
              title={selectedMetric === 'cpu' ? 'CPU Usage (%)' : 'Memory Usage (%)'}
              color={selectedMetric === 'cpu' 
                ? cyberpunkTheme.colors.warning 
                : cyberpunkTheme.colors.success
              }
              type="area"
              animated={true}
            />
          </Card3D>
        </Box>
        
        {/* Right Column - Agent Status */}
        <Box flexDirection="column" gap={1} width="50%">
          {/* Active Agents */}
          <Card3D 
            title="NEURAL AGENTS" 
            width={40} 
            height={20}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              {agentData?.agents.slice(0, 5).map((agent, index) => (
                <Box key={agent.id} flexDirection="column">
                  <Box>
                    <Text color={agent.status === 'active' 
                      ? cyberpunkTheme.colors.success 
                      : cyberpunkTheme.colors.danger
                    }>
                      {agent.status === 'active' ? '●' : '○'}
                    </Text>
                    <Text color={cyberpunkTheme.colors.text} bold>
                      {' '}{agent.name}
                    </Text>
                    {agent.ethicsEnabled === false && (
                      <Text color={cyberpunkTheme.colors.warning}> ⚠️</Text>
                    )}
                  </Box>
                  
                  <Box marginLeft={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Emotion: {agent.emotion || 'neutral'} | 
                      Portal: {agent.portal || 'none'}
                    </Text>
                  </Box>
                  
                  {index < agentData.agents.length - 1 && (
                    <Text color={cyberpunkTheme.colors.borderDim}>
                      {'─'.repeat(35)}
                    </Text>
                  )}
                </Box>
              ))}
              
              {(!agentData || agentData.agents.length === 0) && (
                <Text color={cyberpunkTheme.colors.textDim}>
                  No agents detected...
                </Text>
              )}
            </Box>
          </Card3D>
          
          {/* System Logs Preview */}
          <Card3D 
            title="SYSTEM LOGS" 
            width={40} 
            height={7}
            color={cyberpunkTheme.colors.matrix}
          >
            <Box flexDirection="column">
              <Text color={cyberpunkTheme.colors.matrix}>
                [2025-07-03 09:15:23] System initialized
              </Text>
              <Text color={cyberpunkTheme.colors.success}>
                [2025-07-03 09:15:24] Neural runtime active
              </Text>
              <Text color={cyberpunkTheme.colors.warning}>
                [2025-07-03 09:15:25] Loading agent: NyX
              </Text>
              <Text color={cyberpunkTheme.colors.textDim}>
                [2025-07-03 09:15:26] Portal connection established
              </Text>
            </Box>
          </Card3D>
        </Box>
      </Box>
      
      {/* Matrix Rain Background (subtle) */}
      {showMatrix && (
        <Box>
          <MatrixRain width={80} height={30} speed={200} density={0.01} />
        </Box>
      )}
      
      {/* Footer */}
      <Box 
        padding={1} 
        borderStyle="single" 
        borderColor={cyberpunkTheme.colors.border}
      >
        <Text color={cyberpunkTheme.colors.textDim}>
          [F1] Dashboard | [F2] Agents | [F3] Chat | [F4] Logs | [↑↓] Navigate | [Q] Quit
        </Text>
        {musicManager.isEnabled() && (
          <Text color={cyberpunkTheme.colors.textDim}>
            {' | '}♪ {musicManager.getCurrentTrack()?.name || 'No music'}
          </Text>
        )}
      </Box>
    </Box>
  )
}