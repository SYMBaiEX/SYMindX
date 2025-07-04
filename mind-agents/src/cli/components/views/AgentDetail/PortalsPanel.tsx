import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { Card3D } from '../../ui/Card3D.js'
import { Chart } from '../../ui/Chart.js'
import { cyberpunkTheme } from '../../../themes/cyberpunk.js'

interface PortalDetailData {
  name: string
  type: string
  enabled: boolean
  primary: boolean
  capabilities: string[]
  usage: PortalUsage
  performance: PortalPerformance
}

interface PortalUsage {
  totalRequests: number
  successRate: number
  averageResponseTime: number
  tokenUsage: number
  costEstimate: number
}

interface PortalPerformance {
  latency: number[]
  throughput: number[]
  errorRate: number[]
  timestamps: Date[]
}

interface AgentDetailData {
  portals: PortalDetailData[]
  [key: string]: any
}

interface PortalsPanelProps {
  agentData: AgentDetailData
}

export const PortalsPanel: React.FC<PortalsPanelProps> = ({ agentData }) => {
  const { portals } = agentData
  const [selectedPortal, setSelectedPortal] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'overview' | 'performance' | 'usage' | 'costs'>('overview')

  useInput((input, key) => {
    if (key.upArrow && selectedPortal > 0) {
      setSelectedPortal(selectedPortal - 1)
    } else if (key.downArrow && selectedPortal < portals.length - 1) {
      setSelectedPortal(selectedPortal + 1)
    } else if (input === 'v') {
      const modes: ('overview' | 'performance' | 'usage' | 'costs')[] = ['overview', 'performance', 'usage', 'costs']
      const currentIndex = modes.indexOf(viewMode)
      setViewMode(modes[(currentIndex + 1) % modes.length])
    }
  })

  // Get portal type colors
  const getPortalTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      'groq': cyberpunkTheme.colors.success,
      'openai': cyberpunkTheme.colors.primary,
      'anthropic': cyberpunkTheme.colors.secondary,
      'xai': cyberpunkTheme.colors.accent,
      'google-generative': '#4285F4',
      'ollama': cyberpunkTheme.colors.matrix,
      'azure-openai': '#0078D4'
    }
    return typeColors[type] || cyberpunkTheme.colors.text
  }

  // Get portal status color
  const getPortalStatusColor = (portal: PortalDetailData): string => {
    if (!portal.enabled) return cyberpunkTheme.colors.textDim
    if (portal.usage.successRate >= 0.95) return cyberpunkTheme.colors.success
    if (portal.usage.successRate >= 0.9) return cyberpunkTheme.colors.warning
    return cyberpunkTheme.colors.danger
  }

  // Calculate total statistics across all portals
  const totalRequests = portals.reduce((sum, p) => sum + p.usage.totalRequests, 0)
  const totalCost = portals.reduce((sum, p) => sum + p.usage.costEstimate, 0)
  const totalTokens = portals.reduce((sum, p) => sum + p.usage.tokenUsage, 0)
  const averageSuccessRate = portals.length > 0 
    ? portals.reduce((sum, p) => sum + p.usage.successRate, 0) / portals.length 
    : 0

  // Get primary portal
  const primaryPortal = portals.find(p => p.primary)

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2}>
        {/* Portal Overview */}
        <Box flexDirection="column" width="25%">
          <Card3D
            title="PORTAL OVERVIEW"
            width={25}
            height={18}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Total Portals:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {portals.length}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Active:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {portals.filter(p => p.enabled).length}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Primary:</Text>
                <Text color={primaryPortal ? getPortalTypeColor(primaryPortal.type) : cyberpunkTheme.colors.textDim}>
                  {primaryPortal ? primaryPortal.name : 'None'}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Success Rate:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {Math.round(averageSuccessRate * 100)}%
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Success Rate Bar:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {'█'.repeat(Math.round(averageSuccessRate * 15))}
                  {'░'.repeat(15 - Math.round(averageSuccessRate * 15))}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Portal Status:</Text>
                {portals.slice(0, 3).map((portal, i) => (
                  <Box key={i} gap={1}>
                    <Text color={getPortalStatusColor(portal)}>●</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {portal.name.slice(0, 8)}
                    </Text>
                    <Text color={getPortalTypeColor(portal.type)}>
                      {portal.type}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Portal List */}
        <Box flexDirection="column" width="35%">
          <Card3D
            title="PORTAL DIRECTORY"
            width={35}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                Active Portals ({selectedPortal + 1}/{portals.length}):
              </Text>
              
              {portals.map((portal, i) => (
                <Box
                  key={i}
                  flexDirection="column"
                  borderStyle={i === selectedPortal ? 'single' : undefined}
                  borderColor={i === selectedPortal ? cyberpunkTheme.colors.accent : undefined}
                  padding={i === selectedPortal ? 1 : 0}
                >
                  <Box gap={1}>
                    <Text color={getPortalStatusColor(portal)}>
                      {portal.enabled ? '●' : '○'}
                    </Text>
                    <Text color={getPortalTypeColor(portal.type)} bold>
                      {portal.name.toUpperCase()}
                    </Text>
                    {portal.primary && (
                      <Text color={cyberpunkTheme.colors.accent}>PRIMARY</Text>
                    )}
                  </Box>
                  
                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Type:</Text>
                    <Text color={getPortalTypeColor(portal.type)}>
                      {portal.type}
                    </Text>
                  </Box>
                  
                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Requests:</Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {portal.usage.totalRequests.toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Success:</Text>
                    <Text color={getPortalStatusColor(portal)}>
                      {Math.round(portal.usage.successRate * 100)}%
                    </Text>
                  </Box>
                  
                  <Box marginLeft={2} gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Latency:</Text>
                    <Text color={cyberpunkTheme.colors.warning}>
                      {portal.usage.averageResponseTime}ms
                    </Text>
                  </Box>
                  
                  {i === selectedPortal && (
                    <Box marginLeft={2} flexDirection="column" marginTop={1}>
                      <Text color={cyberpunkTheme.colors.textDim}>Capabilities:</Text>
                      {portal.capabilities.slice(0, 3).map((cap, j) => (
                        <Text key={j} color={cyberpunkTheme.colors.accent}>
                          • {cap}
                        </Text>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Card3D>
        </Box>

        {/* Portal Statistics */}
        <Box flexDirection="column" width="40%">
          <Card3D
            title={`${viewMode.toUpperCase()} ANALYTICS`}
            width={40}
            height={18}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>
                [V] Switch view | Current: {viewMode}
              </Text>
              
              {viewMode === 'overview' && (
                <Box flexDirection="column" gap={1}>
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Total Requests:</Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {totalRequests.toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Total Tokens:</Text>
                    <Text color={cyberpunkTheme.colors.primary}>
                      {totalTokens.toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Total Cost:</Text>
                    <Text color={cyberpunkTheme.colors.warning}>
                      ${totalCost.toFixed(2)}
                    </Text>
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Portal Distribution:</Text>
                    {portals.map((portal, i) => (
                      <Box key={i} gap={1}>
                        <Text color={getPortalTypeColor(portal.type)}>
                          {portal.type}:
                        </Text>
                        <Text color={cyberpunkTheme.colors.text}>
                          {Math.round((portal.usage.totalRequests / totalRequests) * 100)}%
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              
              {viewMode === 'performance' && portals[selectedPortal] && (
                <Box flexDirection="column" gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    {portals[selectedPortal].name} Performance:
                  </Text>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Latency Trend:</Text>
                    <Chart
                      data={portals[selectedPortal].performance.latency.slice(-10)}
                      width={30}
                      height={4}
                      color={cyberpunkTheme.colors.warning}
                      type="line"
                      showAxes={false}
                    />
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Throughput Trend:</Text>
                    <Chart
                      data={portals[selectedPortal].performance.throughput.slice(-10)}
                      width={30}
                      height={4}
                      color={cyberpunkTheme.colors.success}
                      type="area"
                      showAxes={false}
                    />
                  </Box>
                  
                  <Box gap={2} marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Avg Latency:</Text>
                    <Text color={cyberpunkTheme.colors.warning}>
                      {portals[selectedPortal].usage.averageResponseTime}ms
                    </Text>
                  </Box>
                </Box>
              )}
              
              {viewMode === 'usage' && portals[selectedPortal] && (
                <Box flexDirection="column" gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    {portals[selectedPortal].name} Usage:
                  </Text>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Requests:</Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {portals[selectedPortal].usage.totalRequests.toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Success Rate:</Text>
                    <Text color={getPortalStatusColor(portals[selectedPortal])}>
                      {Math.round(portals[selectedPortal].usage.successRate * 100)}%
                    </Text>
                  </Box>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Tokens Used:</Text>
                    <Text color={cyberpunkTheme.colors.primary}>
                      {portals[selectedPortal].usage.tokenUsage.toLocaleString()}
                    </Text>
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Success Rate Bar:</Text>
                    <Text color={getPortalStatusColor(portals[selectedPortal])}>
                      {'█'.repeat(Math.round(portals[selectedPortal].usage.successRate * 20))}
                      {'░'.repeat(20 - Math.round(portals[selectedPortal].usage.successRate * 20))}
                    </Text>
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Capabilities:</Text>
                    {portals[selectedPortal].capabilities.map((cap, i) => (
                      <Text key={i} color={cyberpunkTheme.colors.matrix}>
                        • {cap.replace(/_/g, ' ')}
                      </Text>
                    ))}
                  </Box>
                </Box>
              )}
              
              {viewMode === 'costs' && (
                <Box flexDirection="column" gap={1}>
                  <Text color={cyberpunkTheme.colors.textDim}>Cost Analysis:</Text>
                  
                  <Box gap={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>Total Cost:</Text>
                    <Text color={cyberpunkTheme.colors.warning} bold>
                      ${totalCost.toFixed(2)}
                    </Text>
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Cost Breakdown:</Text>
                    {portals.map((portal, i) => (
                      <Box key={i} gap={2}>
                        <Text color={getPortalTypeColor(portal.type)}>
                          {portal.name}:
                        </Text>
                        <Text color={cyberpunkTheme.colors.text}>
                          ${portal.usage.costEstimate.toFixed(2)}
                        </Text>
                        <Text color={cyberpunkTheme.colors.textDim}>
                          ({Math.round((portal.usage.costEstimate / totalCost) * 100)}%)
                        </Text>
                      </Box>
                    ))}
                  </Box>
                  
                  <Box flexDirection="column" marginTop={1}>
                    <Text color={cyberpunkTheme.colors.textDim}>Cost per Token:</Text>
                    {portals.map((portal, i) => {
                      const costPerToken = portal.usage.tokenUsage > 0 
                        ? portal.usage.costEstimate / portal.usage.tokenUsage 
                        : 0
                      return (
                        <Box key={i} gap={2}>
                          <Text color={getPortalTypeColor(portal.type)}>
                            {portal.type}:
                          </Text>
                          <Text color={cyberpunkTheme.colors.text}>
                            ${(costPerToken * 1000).toFixed(4)}/1K
                          </Text>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Portal Performance Charts */}
      {portals[selectedPortal] && (
        <Box marginTop={1} flexDirection="row" gap={2}>
          <Box width="50%">
            <Card3D
              title={`${portals[selectedPortal].name.toUpperCase()} LATENCY`}
              width={44}
              height={12}
              color={getPortalTypeColor(portals[selectedPortal].type)}
              animated={true}
            >
              <Chart
                data={portals[selectedPortal].performance.latency}
                width={38}
                height={8}
                color={cyberpunkTheme.colors.warning}
                type="line"
                animated={true}
                showAxes={true}
              />
            </Card3D>
          </Box>
          
          <Box width="50%">
            <Card3D
              title={`${portals[selectedPortal].name.toUpperCase()} THROUGHPUT`}
              width={44}
              height={12}
              color={getPortalTypeColor(portals[selectedPortal].type)}
              animated={true}
            >
              <Chart
                data={portals[selectedPortal].performance.throughput}
                width={38}
                height={8}
                color={cyberpunkTheme.colors.success}
                type="area"
                animated={true}
                showAxes={true}
              />
            </Card3D>
          </Box>
        </Box>
      )}

      {/* Portal Comparison Chart */}
      <Box marginTop={1}>
        <Card3D
          title="PORTAL PERFORMANCE COMPARISON"
          width={90}
          height={12}
          color={cyberpunkTheme.colors.matrix}
          animated={true}
        >
          <Box flexDirection="row" gap={2}>
            <Box width="30%">
              <Text color={cyberpunkTheme.colors.textDim}>Success Rates:</Text>
              {portals.map((portal, i) => (
                <Box key={i} gap={1}>
                  <Text color={getPortalTypeColor(portal.type)}>
                    {portal.name.slice(0, 8)}:
                  </Text>
                  <Text color={getPortalStatusColor(portal)}>
                    {'▓'.repeat(Math.round(portal.usage.successRate * 10))}
                    {'░'.repeat(10 - Math.round(portal.usage.successRate * 10))}
                  </Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {Math.round(portal.usage.successRate * 100)}%
                  </Text>
                </Box>
              ))}
            </Box>
            
            <Box width="30%">
              <Text color={cyberpunkTheme.colors.textDim}>Response Times:</Text>
              {portals.map((portal, i) => {
                const maxLatency = Math.max(...portals.map(p => p.usage.averageResponseTime))
                const relativeLatency = portal.usage.averageResponseTime / maxLatency
                return (
                  <Box key={i} gap={1}>
                    <Text color={getPortalTypeColor(portal.type)}>
                      {portal.name.slice(0, 8)}:
                    </Text>
                    <Text color={cyberpunkTheme.colors.warning}>
                      {'▓'.repeat(Math.round(relativeLatency * 10))}
                      {'░'.repeat(10 - Math.round(relativeLatency * 10))}
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {portal.usage.averageResponseTime}ms
                    </Text>
                  </Box>
                )
              })}
            </Box>
            
            <Box width="40%">
              <Text color={cyberpunkTheme.colors.textDim}>Usage Distribution:</Text>
              {portals.map((portal, i) => {
                const relativeUsage = portal.usage.totalRequests / totalRequests
                return (
                  <Box key={i} gap={1}>
                    <Text color={getPortalTypeColor(portal.type)}>
                      {portal.name.slice(0, 10)}:
                    </Text>
                    <Text color={cyberpunkTheme.colors.accent}>
                      {'█'.repeat(Math.round(relativeUsage * 15))}
                      {'░'.repeat(15 - Math.round(relativeUsage * 15))}
                    </Text>
                    <Text color={cyberpunkTheme.colors.text}>
                      {Math.round(relativeUsage * 100)}% ({portal.usage.totalRequests})
                    </Text>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Card3D>
      </Box>
    </Box>
  )
}