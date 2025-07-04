import React from 'react'
import { Box, Text } from 'ink'
import { Card3D } from '../../ui/Card3D.js'
import { Chart } from '../../ui/Chart.js'
import { cyberpunkTheme } from '../../../themes/cyberpunk.js'

interface PerformanceDetailData {
  uptime: number
  messagesProcessed: number
  averageResponseTime: number
  errorRate: number
  memoryUsage: number
  cpuUsage: number
  throughput: number
  resourceUtilization: ResourceUtilization
}

interface ResourceUtilization {
  memory: number[]
  cpu: number[]
  networkIO: number[]
  diskIO: number[]
  timestamps: Date[]
}

interface AgentDetailData {
  performance: PerformanceDetailData
  [key: string]: any
}

interface PerformancePanelProps {
  agentData: AgentDetailData
  formatUptime: (ms: number) => string
  formatBytes: (bytes: number) => string
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ 
  agentData, 
  formatUptime, 
  formatBytes 
}) => {
  const { performance } = agentData

  // Calculate performance scores
  const calculatePerformanceScore = (value: number, optimal: number, threshold: number): number => {
    if (value <= optimal) return 1.0
    if (value >= threshold) return 0.0
    return 1.0 - ((value - optimal) / (threshold - optimal))
  }

  const responseTimeScore = calculatePerformanceScore(performance.averageResponseTime, 100, 1000)
  const errorRateScore = 1.0 - performance.errorRate
  const memoryScore = calculatePerformanceScore(performance.memoryUsage, 50, 90)
  const cpuScore = calculatePerformanceScore(performance.cpuUsage, 20, 80)
  
  const overallScore = (responseTimeScore + errorRateScore + memoryScore + cpuScore) / 4

  // Get performance status colors
  const getPerformanceColor = (score: number): string => {
    if (score >= 0.8) return cyberpunkTheme.colors.success
    if (score >= 0.6) return cyberpunkTheme.colors.warning
    return cyberpunkTheme.colors.danger
  }

  // Calculate trend indicators
  const getResourceTrend = (data: number[]): string => {
    if (data.length < 2) return '→'
    const recent = data.slice(-5)
    const older = data.slice(-10, -5)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    
    if (recentAvg > olderAvg * 1.1) return '↗'
    if (recentAvg < olderAvg * 0.9) return '↘'
    return '→'
  }

  // Generate performance alerts
  const generateAlerts = (): string[] => {
    const alerts: string[] = []
    
    if (performance.errorRate > 0.05) {
      alerts.push(`High error rate: ${(performance.errorRate * 100).toFixed(1)}%`)
    }
    if (performance.averageResponseTime > 500) {
      alerts.push(`Slow response time: ${performance.averageResponseTime}ms`)
    }
    if (performance.memoryUsage > 80) {
      alerts.push(`High memory usage: ${performance.memoryUsage.toFixed(1)}%`)
    }
    if (performance.cpuUsage > 60) {
      alerts.push(`High CPU usage: ${performance.cpuUsage.toFixed(1)}%`)
    }
    
    return alerts
  }

  const alerts = generateAlerts()

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2}>
        {/* Performance Overview */}
        <Box flexDirection="column" width="25%">
          <Card3D
            title="PERFORMANCE OVERVIEW"
            width={25}
            height={18}
            color={getPerformanceColor(overallScore)}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Overall Score:</Text>
                <Text color={getPerformanceColor(overallScore)} bold>
                  {Math.round(overallScore * 100)}%
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Score Breakdown:</Text>
                
                <Box gap={1}>
                  <Text color={getPerformanceColor(responseTimeScore)}>●</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Response:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {Math.round(responseTimeScore * 100)}%
                  </Text>
                </Box>
                
                <Box gap={1}>
                  <Text color={getPerformanceColor(errorRateScore)}>●</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Reliability:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {Math.round(errorRateScore * 100)}%
                  </Text>
                </Box>
                
                <Box gap={1}>
                  <Text color={getPerformanceColor(memoryScore)}>●</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Memory:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {Math.round(memoryScore * 100)}%
                  </Text>
                </Box>
                
                <Box gap={1}>
                  <Text color={getPerformanceColor(cpuScore)}>●</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>CPU:</Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {Math.round(cpuScore * 100)}%
                  </Text>
                </Box>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Performance Bar:</Text>
                <Text color={getPerformanceColor(overallScore)}>
                  {'█'.repeat(Math.round(overallScore * 15))}
                  {'░'.repeat(15 - Math.round(overallScore * 15))}
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* System Metrics */}
        <Box flexDirection="column" width="25%">
          <Card3D
            title="SYSTEM METRICS"
            width={25}
            height={18}
            color={cyberpunkTheme.colors.primary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Uptime:</Text>
                <Text color={cyberpunkTheme.colors.success}>
                  {formatUptime(performance.uptime)}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Messages:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {performance.messagesProcessed.toLocaleString()}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Avg Response:</Text>
                <Text color={getPerformanceColor(responseTimeScore)}>
                  {performance.averageResponseTime}ms
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Error Rate:</Text>
                <Text color={getPerformanceColor(errorRateScore)}>
                  {(performance.errorRate * 100).toFixed(2)}%
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Throughput:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {performance.throughput.toFixed(1)} msg/s
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Memory Usage:</Text>
                <Text color={getPerformanceColor(memoryScore)}>
                  {'█'.repeat(Math.round(performance.memoryUsage / 5))}
                  {'░'.repeat(20 - Math.round(performance.memoryUsage / 5))}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.memoryUsage.toFixed(1)}%
                </Text>
              </Box>
              
              <Box flexDirection="column">
                <Text color={cyberpunkTheme.colors.textDim}>CPU Usage:</Text>
                <Text color={getPerformanceColor(cpuScore)}>
                  {'█'.repeat(Math.round(performance.cpuUsage / 5))}
                  {'░'.repeat(20 - Math.round(performance.cpuUsage / 5))}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.cpuUsage.toFixed(1)}%
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Resource Trends */}
        <Box flexDirection="column" width="25%">
          <Card3D
            title="RESOURCE TRENDS"
            width={25}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Memory:</Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {getResourceTrend(performance.resourceUtilization.memory)}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.resourceUtilization.memory[performance.resourceUtilization.memory.length - 1]?.toFixed(1)}%
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>CPU:</Text>
                <Text color={cyberpunkTheme.colors.secondary}>
                  {getResourceTrend(performance.resourceUtilization.cpu)}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.resourceUtilization.cpu[performance.resourceUtilization.cpu.length - 1]?.toFixed(1)}%
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Network I/O:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {getResourceTrend(performance.resourceUtilization.networkIO)}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.resourceUtilization.networkIO[performance.resourceUtilization.networkIO.length - 1]?.toFixed(0)} KB/s
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Disk I/O:</Text>
                <Text color={cyberpunkTheme.colors.matrix}>
                  {getResourceTrend(performance.resourceUtilization.diskIO)}
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {performance.resourceUtilization.diskIO[performance.resourceUtilization.diskIO.length - 1]?.toFixed(0)} KB/s
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Trend Legend:</Text>
                <Box gap={1}>
                  <Text color={cyberpunkTheme.colors.success}>↗</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Increasing</Text>
                </Box>
                <Box gap={1}>
                  <Text color={cyberpunkTheme.colors.warning}>↘</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Decreasing</Text>
                </Box>
                <Box gap={1}>
                  <Text color={cyberpunkTheme.colors.primary}>→</Text>
                  <Text color={cyberpunkTheme.colors.textDim}>Stable</Text>
                </Box>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Performance Alerts */}
        <Box flexDirection="column" width="25%">
          <Card3D
            title="PERFORMANCE ALERTS"
            width={25}
            height={18}
            color={alerts.length > 0 ? cyberpunkTheme.colors.danger : cyberpunkTheme.colors.success}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              {alerts.length === 0 ? (
                <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  <Text color={cyberpunkTheme.colors.success} bold>
                    ALL SYSTEMS NOMINAL
                  </Text>
                  <Text color={cyberpunkTheme.colors.textDim}>
                    No performance issues detected
                  </Text>
                </Box>
              ) : (
                <Box flexDirection="column">
                  <Text color={cyberpunkTheme.colors.danger} bold>
                    ACTIVE ALERTS ({alerts.length})
                  </Text>
                  {alerts.map((alert, i) => (
                    <Box key={i} flexDirection="column" marginTop={1}>
                      <Box gap={1}>
                        <Text color={cyberpunkTheme.colors.danger}>⚠</Text>
                        <Text color={cyberpunkTheme.colors.text}>
                          {alert}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                  
                  <Box marginTop={2}>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      Recommendations:
                    </Text>
                    {alerts.length > 2 && (
                      <Text color={cyberpunkTheme.colors.warning}>
                        • Consider system optimization
                      </Text>
                    )}
                    {performance.errorRate > 0.05 && (
                      <Text color={cyberpunkTheme.colors.warning}>
                        • Review error logs
                      </Text>
                    )}
                    {performance.memoryUsage > 80 && (
                      <Text color={cyberpunkTheme.colors.warning}>
                        • Check memory leaks
                      </Text>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Memory Usage Chart */}
      <Box marginTop={1}>
        <Card3D
          title="MEMORY UTILIZATION OVER TIME"
          width={90}
          height={12}
          color={cyberpunkTheme.colors.primary}
          animated={true}
        >
          <Box flexDirection="row" gap={2}>
            <Box width="80%">
              <Chart
                data={performance.resourceUtilization.memory}
                width={70}
                height={8}
                color={getPerformanceColor(memoryScore)}
                type="area"
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection="column" width="20%">
              <Text color={cyberpunkTheme.colors.textDim}>Memory Stats:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Current:</Text>
                <Text color={getPerformanceColor(memoryScore)}>
                  {performance.memoryUsage.toFixed(1)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Peak:</Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  {Math.max(...performance.resourceUtilization.memory).toFixed(1)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Average:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {(performance.resourceUtilization.memory.reduce((a, b) => a + b, 0) / performance.resourceUtilization.memory.length).toFixed(1)}%
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* CPU Usage Chart */}
      <Box marginTop={1}>
        <Card3D
          title="CPU UTILIZATION OVER TIME"
          width={90}
          height={12}
          color={cyberpunkTheme.colors.secondary}
          animated={true}
        >
          <Box flexDirection="row" gap={2}>
            <Box width="80%">
              <Chart
                data={performance.resourceUtilization.cpu}
                width={70}
                height={8}
                color={getPerformanceColor(cpuScore)}
                type="line"
                animated={true}
                showAxes={true}
              />
            </Box>
            <Box flexDirection="column" width="20%">
              <Text color={cyberpunkTheme.colors.textDim}>CPU Stats:</Text>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Current:</Text>
                <Text color={getPerformanceColor(cpuScore)}>
                  {performance.cpuUsage.toFixed(1)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Peak:</Text>
                <Text color={cyberpunkTheme.colors.warning}>
                  {Math.max(...performance.resourceUtilization.cpu).toFixed(1)}%
                </Text>
              </Box>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Average:</Text>
                <Text color={cyberpunkTheme.colors.text}>
                  {(performance.resourceUtilization.cpu.reduce((a, b) => a + b, 0) / performance.resourceUtilization.cpu.length).toFixed(1)}%
                </Text>
              </Box>
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Network and Disk I/O */}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Box width="50%">
          <Card3D
            title="NETWORK I/O"
            width={44}
            height={10}
            color={cyberpunkTheme.colors.accent}
            animated={true}
          >
            <Chart
              data={performance.resourceUtilization.networkIO}
              width={38}
              height={6}
              color={cyberpunkTheme.colors.accent}
              type="bar"
              animated={true}
              showAxes={true}
            />
          </Card3D>
        </Box>
        
        <Box width="50%">
          <Card3D
            title="DISK I/O"
            width={44}
            height={10}
            color={cyberpunkTheme.colors.matrix}
            animated={true}
          >
            <Chart
              data={performance.resourceUtilization.diskIO}
              width={38}
              height={6}
              color={cyberpunkTheme.colors.matrix}
              type="bar"
              animated={true}
              showAxes={true}
            />
          </Card3D>
        </Box>
      </Box>
    </Box>
  )
}