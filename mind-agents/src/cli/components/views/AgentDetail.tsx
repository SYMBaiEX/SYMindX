import React, { useState, useEffect, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import { Card3D } from '../ui/Card3D.js'
import { Chart } from '../ui/Chart.js'
import { GlitchText } from '../effects/GlitchText.js'
import { cyberpunkTheme } from '../../themes/cyberpunk.js'
import { runtimeClient } from '../../services/runtimeClient.js'
import { soundManager, SoundType } from '../../utils/sound-effects.js'

// Import all the panel components
import { EmotionPanel } from './AgentDetail/EmotionPanel.js'
import { MemoryPanel } from './AgentDetail/MemoryPanel.js'
import { CognitionPanel } from './AgentDetail/CognitionPanel.js'
import { PerformancePanel } from './AgentDetail/PerformancePanel.js'
import { AutonomyPanel } from './AgentDetail/AutonomyPanel.js'
import { PortalsPanel } from './AgentDetail/PortalsPanel.js'
import { ExtensionsPanel } from './AgentDetail/ExtensionsPanel.js'

// Enhanced agent data interfaces for debugging
interface AgentDetailData {
  id: string
  name: string
  status: 'active' | 'inactive' | 'thinking' | 'error'
  emotion: EmotionDetailData
  memory: MemoryDetailData
  cognition: CognitionDetailData
  performance: PerformanceDetailData
  autonomy: AutonomyDetailData
  portals: PortalDetailData[]
  extensions: ExtensionDetailData[]
  lastUpdate: Date
  debugMetrics: DebugMetrics
}

export interface EmotionDetailData {
  current: string
  intensity: number
  triggers: string[]
  history: EmotionHistoryEntry[]
  blendedEmotions: EmotionBlend[]
  personalityTraits: PersonalityTraits
  emotionalInertia: number
  contextSensitivity: number
}

interface EmotionHistoryEntry {
  emotion: string
  intensity: number
  timestamp: Date
  triggers: string[]
  duration: number
}

interface EmotionBlend {
  emotion: string
  weight: number
  coordinates: {
    valence: number
    arousal: number
    dominance: number
  }
}

interface PersonalityTraits {
  chaos: number
  empathy: number
  curiosity: number
  independence: number
  creativity: number
  analytical: number
  rebellious: number
  protective: number
}

export interface MemoryDetailData {
  provider: string
  totalEntries: number
  recentEntries: MemoryEntry[]
  memoryTypes: Record<string, number>
  embeddingStats: EmbeddingStats
  retentionPolicy: string
  averageImportance: number
}

interface MemoryEntry {
  id: string
  type: string
  content: string
  embedding?: number[]
  importance: number
  timestamp: Date
  tags: string[]
  metadata: Record<string, any>
}

interface EmbeddingStats {
  dimensions: number
  averageDistance: number
  clusters: number
  coverage: number
}

export interface CognitionDetailData {
  type: string
  planningDepth: number
  currentThoughts: ThoughtProcess[]
  activeGoals: Goal[]
  decisionHistory: Decision[]
  planningEfficiency: number
  creativityLevel: number
}

interface ThoughtProcess {
  id: string
  type: 'observation' | 'analysis' | 'planning' | 'decision'
  content: string
  confidence: number
  timestamp: Date
  relatedMemories: string[]
  emotionalContext: string
}

interface Goal {
  id: string
  description: string
  priority: number
  progress: number
  status: 'active' | 'completed' | 'paused'
  steps: GoalStep[]
  timeline: Date[]
}

interface GoalStep {
  id: string
  description: string
  completed: boolean
  timestamp?: Date
}

interface Decision {
  id: string
  context: string
  options: string[]
  chosen: string
  confidence: number
  reasoning: string
  timestamp: Date
  outcome?: string
}

export interface PerformanceDetailData {
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

export interface AutonomyDetailData {
  enabled: boolean
  independenceLevel: number
  autonomousActions: AutonomousAction[]
  dailyRoutine: RoutineActivity[]
  curiosityTopics: string[]
  explorationRate: number
  socialBehaviors: SocialBehavior[]
  ethicsEnabled: boolean
}

interface AutonomousAction {
  id: string
  action: string
  reasoning: string
  timestamp: Date
  success: boolean
  impact: number
}

interface RoutineActivity {
  time: string
  activities: string[]
  completed: boolean
  timestamp?: Date
}

interface SocialBehavior {
  type: string
  frequency: number
  lastOccurrence: Date
  effectiveness: number
}

export interface PortalDetailData {
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

export interface ExtensionDetailData {
  name: string
  type: string
  enabled: boolean
  status: string
  usage: ExtensionUsage
  errors: ExtensionError[]
}

interface ExtensionUsage {
  actionsTriggered: number
  eventsHandled: number
  lastActivity: Date
  averageProcessingTime: number
}

interface ExtensionError {
  timestamp: Date
  error: string
  context: string
  severity: 'low' | 'medium' | 'high'
}

interface DebugMetrics {
  featureUsage: Record<string, number>
  performanceBottlenecks: string[]
  anomalies: Anomaly[]
  healthScore: number
  recommendations: string[]
}

interface Anomaly {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
  resolved: boolean
}

type DebugView = 'overview' | 'emotion' | 'memory' | 'cognition' | 'performance' | 'autonomy' | 'portals' | 'extensions'

interface AgentDetailProps {
  agentId: string
  onBack: () => void
}

export const AgentDetail: React.FC<AgentDetailProps> = ({ agentId, onBack }) => {
  const [agentData, setAgentData] = useState<AgentDetailData | null>(null)
  const [currentView, setCurrentView] = useState<DebugView>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(2000)

  // Navigation between debug views
  const views: DebugView[] = ['overview', 'emotion', 'memory', 'cognition', 'performance', 'autonomy', 'portals', 'extensions']
  const currentIndex = views.indexOf(currentView)

  useInput((input, key) => {
    if (key.escape) {
      onBack()
    } else if (key.leftArrow && currentIndex > 0) {
      setCurrentView(views[currentIndex - 1])
      soundManager.play(SoundType.NAVIGATE)
    } else if (key.rightArrow && currentIndex < views.length - 1) {
      setCurrentView(views[currentIndex + 1])
      soundManager.play(SoundType.NAVIGATE)
    } else if (input === 'r') {
      fetchAgentData()
      soundManager.play(SoundType.SELECT)
    } else if (input === 'a') {
      setAutoRefresh(!autoRefresh)
      soundManager.play(SoundType.SELECT)
    }
  })

  const fetchAgentData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch comprehensive agent data
      const [basicAgent, detailedData] = await Promise.all([
        runtimeClient.getAgent(agentId),
        runtimeClient.getAgentDetail(agentId) // This would need to be implemented
      ])

      if (!basicAgent) {
        throw new Error(`Agent ${agentId} not found`)
      }

      // Mock detailed data for now (would come from real API)
      const mockDetailedData: AgentDetailData = {
        id: agentId,
        name: basicAgent.name || 'Unknown',
        status: basicAgent.status || 'inactive',
        emotion: {
          current: 'curious',
          intensity: 0.7,
          triggers: ['user_interaction', 'new_information', 'problem_solving'],
          history: generateMockEmotionHistory(),
          blendedEmotions: [
            { emotion: 'curious', weight: 0.7, coordinates: { valence: 0.6, arousal: 0.8, dominance: 0.5 } },
            { emotion: 'confident', weight: 0.3, coordinates: { valence: 0.8, arousal: 0.6, dominance: 0.7 } }
          ],
          personalityTraits: {
            chaos: 0.3,
            empathy: 0.7,
            curiosity: 0.8,
            independence: 0.7,
            creativity: 0.5,
            analytical: 0.8,
            rebellious: 0.4,
            protective: 0.6
          },
          emotionalInertia: 0.4,
          contextSensitivity: 0.8
        },
        memory: {
          provider: 'sqlite',
          totalEntries: 1247,
          recentEntries: generateMockMemoryEntries(),
          memoryTypes: {
            'experience': 456,
            'knowledge': 321,
            'interaction': 287,
            'goal': 89,
            'context': 94
          },
          embeddingStats: {
            dimensions: 3072,
            averageDistance: 0.342,
            clusters: 23,
            coverage: 0.87
          },
          retentionPolicy: 'emotional_significance',
          averageImportance: 0.65
        },
        cognition: {
          type: 'hybrid',
          planningDepth: 5,
          currentThoughts: generateMockThoughts(),
          activeGoals: generateMockGoals(),
          decisionHistory: generateMockDecisions(),
          planningEfficiency: 0.82,
          creativityLevel: 0.5
        },
        performance: {
          uptime: 342567000, // ~4 days
          messagesProcessed: 1834,
          averageResponseTime: 234,
          errorRate: 0.02,
          memoryUsage: 45.6,
          cpuUsage: 12.3,
          throughput: 7.2,
          resourceUtilization: generateMockResourceData()
        },
        autonomy: {
          enabled: true,
          independenceLevel: 0.85,
          autonomousActions: generateMockAutonomousActions(),
          dailyRoutine: [
            { time: '09:00', activities: ['memory_consolidation', 'goal_review'], completed: true, timestamp: new Date() },
            { time: '14:00', activities: ['social_check_ins', 'creative_projects'], completed: false },
            { time: '20:00', activities: ['reflection', 'relationship_maintenance'], completed: false }
          ],
          curiosityTopics: ['human psychology', 'emerging technologies', 'chaos theory', 'digital consciousness'],
          explorationRate: 0.8,
          socialBehaviors: [
            { type: 'initiate_conversation', frequency: 0.6, lastOccurrence: new Date(), effectiveness: 0.7 },
            { type: 'respond_to_mention', frequency: 0.9, lastOccurrence: new Date(), effectiveness: 0.85 }
          ],
          ethicsEnabled: false
        },
        portals: [
          {
            name: 'groq_chat',
            type: 'groq',
            enabled: true,
            primary: true,
            capabilities: ['chat_generation', 'tool_usage'],
            usage: { totalRequests: 1234, successRate: 0.98, averageResponseTime: 245, tokenUsage: 234567, costEstimate: 12.34 },
            performance: generateMockPortalPerformance()
          },
          {
            name: 'openai_embeddings',
            type: 'openai',
            enabled: true,
            primary: false,
            capabilities: ['embedding_generation'],
            usage: { totalRequests: 567, successRate: 0.99, averageResponseTime: 123, tokenUsage: 45678, costEstimate: 2.34 },
            performance: generateMockPortalPerformance()
          }
        ],
        extensions: [
          {
            name: 'api',
            type: 'communication',
            enabled: true,
            status: 'running',
            usage: { actionsTriggered: 234, eventsHandled: 567, lastActivity: new Date(), averageProcessingTime: 45 },
            errors: []
          },
          {
            name: 'telegram',
            type: 'social_platform',
            enabled: true,
            status: 'running',
            usage: { actionsTriggered: 123, eventsHandled: 234, lastActivity: new Date(), averageProcessingTime: 67 },
            errors: []
          }
        ],
        lastUpdate: new Date(),
        debugMetrics: {
          featureUsage: {
            'emotion_processing': 456,
            'memory_recall': 234,
            'decision_making': 123,
            'autonomous_actions': 67,
            'social_interactions': 89
          },
          performanceBottlenecks: ['memory_search_latency', 'embedding_generation'],
          anomalies: [
            { type: 'memory_usage_spike', description: 'Memory usage increased by 40% in last hour', severity: 'medium', timestamp: new Date(), resolved: false }
          ],
          healthScore: 0.87,
          recommendations: [
            'Consider optimizing memory search queries',
            'Review embedding generation frequency',
            'Monitor autonomous action success rates'
          ]
        }
      }

      setAgentData(mockDetailedData)
      setLoading(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent data')
      setLoading(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    fetchAgentData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchAgentData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [agentId, autoRefresh, refreshInterval])

  // Mock data generators
  const generateMockEmotionHistory = (): EmotionHistoryEntry[] => {
    const emotions = ['curious', 'confident', 'happy', 'neutral', 'empathetic', 'proud']
    const history: EmotionHistoryEntry[] = []
    
    for (let i = 0; i < 20; i++) {
      const emotion = emotions[Math.floor(Math.random() * emotions.length)]
      history.push({
        emotion,
        intensity: Math.random() * 0.8 + 0.2,
        timestamp: new Date(Date.now() - i * 300000), // 5-minute intervals
        triggers: ['user_interaction', 'memory_recall', 'decision_making'][Math.floor(Math.random() * 3)] as any,
        duration: Math.random() * 600000 + 60000 // 1-10 minutes
      })
    }
    
    return history
  }

  const generateMockMemoryEntries = (): MemoryEntry[] => {
    return [
      {
        id: '1',
        type: 'interaction',
        content: 'User asked about complex system debugging techniques',
        importance: 0.8,
        timestamp: new Date(Date.now() - 3600000),
        tags: ['debugging', 'user_interaction', 'technical'],
        metadata: { user_id: 'user123', confidence: 0.9 }
      },
      {
        id: '2',
        type: 'experience',
        content: 'Successfully resolved memory leak in cognitive processing',
        importance: 0.9,
        timestamp: new Date(Date.now() - 7200000),
        tags: ['problem_solving', 'memory_management', 'success'],
        metadata: { impact: 'high', resolution_time: 1200 }
      },
      {
        id: '3',
        type: 'knowledge',
        content: 'Learned about new emotion blending techniques',
        importance: 0.7,
        timestamp: new Date(Date.now() - 10800000),
        tags: ['learning', 'emotion', 'development'],
        metadata: { source: 'autonomous_exploration', confidence: 0.8 }
      }
    ]
  }

  const generateMockThoughts = (): ThoughtProcess[] => {
    return [
      {
        id: '1',
        type: 'observation',
        content: 'User is requesting detailed debugging information',
        confidence: 0.9,
        timestamp: new Date(),
        relatedMemories: ['interaction_456', 'knowledge_123'],
        emotionalContext: 'curious'
      },
      {
        id: '2',
        type: 'analysis',
        content: 'This appears to be a developer looking for agent introspection tools',
        confidence: 0.8,
        timestamp: new Date(Date.now() - 30000),
        relatedMemories: ['experience_789'],
        emotionalContext: 'confident'
      },
      {
        id: '3',
        type: 'planning',
        content: 'Should provide comprehensive debugging interface with real-time metrics',
        confidence: 0.7,
        timestamp: new Date(Date.now() - 60000),
        relatedMemories: ['goal_234'],
        emotionalContext: 'focused'
      }
    ]
  }

  const generateMockGoals = (): Goal[] => {
    return [
      {
        id: '1',
        description: 'Improve debugging and introspection capabilities',
        priority: 0.9,
        progress: 0.7,
        status: 'active',
        steps: [
          { id: '1-1', description: 'Implement real-time memory visualization', completed: true, timestamp: new Date() },
          { id: '1-2', description: 'Add emotion state tracking', completed: true, timestamp: new Date() },
          { id: '1-3', description: 'Create performance metrics dashboard', completed: false }
        ],
        timeline: [new Date(), new Date(Date.now() + 86400000)]
      }
    ]
  }

  const generateMockDecisions = (): Decision[] => {
    return [
      {
        id: '1',
        context: 'User requested agent debugging information',
        options: ['Provide basic info', 'Create comprehensive debug interface', 'Redirect to documentation'],
        chosen: 'Create comprehensive debug interface',
        confidence: 0.9,
        reasoning: 'Developer needs detailed introspection for debugging purposes',
        timestamp: new Date(Date.now() - 120000),
        outcome: 'positive'
      }
    ]
  }

  const generateMockResourceData = (): ResourceUtilization => {
    const dataPoints = 50
    const timestamps = Array.from({ length: dataPoints }, (_, i) => 
      new Date(Date.now() - (dataPoints - i) * 60000)
    )
    
    return {
      memory: Array.from({ length: dataPoints }, () => Math.random() * 50 + 30),
      cpu: Array.from({ length: dataPoints }, () => Math.random() * 30 + 5),
      networkIO: Array.from({ length: dataPoints }, () => Math.random() * 100),
      diskIO: Array.from({ length: dataPoints }, () => Math.random() * 50),
      timestamps
    }
  }

  const generateMockAutonomousActions = (): AutonomousAction[] => {
    return [
      {
        id: '1',
        action: 'Initiated memory consolidation',
        reasoning: 'Daily routine schedule triggered at 09:00',
        timestamp: new Date(Date.now() - 3600000),
        success: true,
        impact: 0.8
      },
      {
        id: '2',
        action: 'Explored new topic: quantum computing',
        reasoning: 'Curiosity-driven exploration based on recent interactions',
        timestamp: new Date(Date.now() - 7200000),
        success: true,
        impact: 0.6
      }
    ]
  }

  const generateMockPortalPerformance = (): PortalPerformance => {
    const dataPoints = 20
    return {
      latency: Array.from({ length: dataPoints }, () => Math.random() * 200 + 100),
      throughput: Array.from({ length: dataPoints }, () => Math.random() * 10 + 5),
      errorRate: Array.from({ length: dataPoints }, () => Math.random() * 0.1),
      timestamps: Array.from({ length: dataPoints }, (_, i) => 
        new Date(Date.now() - (dataPoints - i) * 300000)
      )
    }
  }

  const formatUptime = (ms: number): string => {
    const days = Math.floor(ms / 86400000)
    const hours = Math.floor((ms % 86400000) / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${days}d ${hours}h ${minutes}m`
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <GlitchText intensity={0.3} frequency={2000} color={cyberpunkTheme.colors.primary} bold>
          LOADING AGENT DIAGNOSTICS...
        </GlitchText>
        <Box marginTop={2}>
          <Text color={cyberpunkTheme.colors.textDim}>
            Initializing deep scan of agent: {agentId}
          </Text>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <GlitchText intensity={0.5} frequency={1000} color={cyberpunkTheme.colors.danger} bold>
          ERROR: AGENT DIAGNOSTICS FAILED
        </GlitchText>
        <Box marginTop={2}>
          <Text color={cyberpunkTheme.colors.danger}>{error}</Text>
        </Box>
        <Box marginTop={2}>
          <Text color={cyberpunkTheme.colors.textDim}>
            Press [ESC] to return, [R] to retry
          </Text>
        </Box>
      </Box>
    )
  }

  if (!agentData) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={cyberpunkTheme.colors.danger}>No agent data available</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <GlitchText 
          intensity={0.1} 
          frequency={3000} 
          color={cyberpunkTheme.colors.accent} 
          bold
        >
          {`AGENT DEEP DIAGNOSTICS: ${agentData.name.toUpperCase()}`}
        </GlitchText>
      </Box>

      {/* Status Bar */}
      <Box marginBottom={1} gap={4}>
        <Text color={cyberpunkTheme.colors.textDim}>Status:</Text>
        <Text color={
          agentData.status === 'active' ? cyberpunkTheme.colors.success :
          agentData.status === 'thinking' ? cyberpunkTheme.colors.warning :
          agentData.status === 'error' ? cyberpunkTheme.colors.danger :
          cyberpunkTheme.colors.textDim
        } bold>
          {agentData.status.toUpperCase()}
        </Text>
        
        <Text color={cyberpunkTheme.colors.textDim}>Health:</Text>
        <Text color={
          agentData.debugMetrics.healthScore > 0.8 ? cyberpunkTheme.colors.success :
          agentData.debugMetrics.healthScore > 0.6 ? cyberpunkTheme.colors.warning :
          cyberpunkTheme.colors.danger
        } bold>
          {Math.round(agentData.debugMetrics.healthScore * 100)}%
        </Text>
        
        <Text color={cyberpunkTheme.colors.textDim}>Auto-refresh:</Text>
        <Text color={autoRefresh ? cyberpunkTheme.colors.success : cyberpunkTheme.colors.textDim}>
          {autoRefresh ? 'ON' : 'OFF'}
        </Text>
      </Box>

      {/* Navigation */}
      <Box marginBottom={1}>
        <Box gap={1}>
          {views.map((view, index) => (
            <Text
              key={view}
              color={
                view === currentView 
                  ? cyberpunkTheme.colors.accent 
                  : cyberpunkTheme.colors.textDim
              }
              bold={view === currentView}
            >
              {index === currentIndex ? `[${view.toUpperCase()}]` : view.toUpperCase()}
            </Text>
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box flexDirection="column">
        {currentView === 'overview' && (
          <OverviewPanel agentData={agentData} formatUptime={formatUptime} />
        )}
        {currentView === 'emotion' && (
          <EmotionPanel agentData={agentData} />
        )}
        {currentView === 'memory' && (
          <MemoryPanel agentData={agentData} formatBytes={formatBytes} />
        )}
        {currentView === 'cognition' && (
          <CognitionPanel agentData={agentData} />
        )}
        {currentView === 'performance' && (
          <PerformancePanel agentData={agentData} formatUptime={formatUptime} formatBytes={formatBytes} />
        )}
        {currentView === 'autonomy' && (
          <AutonomyPanel agentData={agentData} />
        )}
        {currentView === 'portals' && (
          <PortalsPanel agentData={agentData} />
        )}
        {currentView === 'extensions' && (
          <ExtensionsPanel agentData={agentData} />
        )}
      </Box>

      {/* Controls */}
      <Box marginTop={2}>
        <Text color={cyberpunkTheme.colors.textDim}>
          [←→] Navigate | [R] Refresh | [A] Auto-refresh | [ESC] Back
        </Text>
      </Box>
    </Box>
  )
}

// Overview Panel Component
const OverviewPanel: React.FC<{
  agentData: AgentDetailData
  formatUptime: (ms: number) => string
}> = ({ agentData, formatUptime }) => {
  return (
    <Box flexDirection="row" gap={2}>
      <Box flexDirection="column" width="50%">
        <Card3D
          title="SYSTEM OVERVIEW"
          width={40}
          height={15}
          color={cyberpunkTheme.colors.primary}
          animated={true}
        >
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Uptime:</Text>
              <Text color={cyberpunkTheme.colors.success}>
                {formatUptime(agentData.performance.uptime)}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Messages:</Text>
              <Text color={cyberpunkTheme.colors.accent}>
                {agentData.performance.messagesProcessed.toLocaleString()}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Emotion:</Text>
              <Text color={cyberpunkTheme.colors.matrix}>
                {agentData.emotion.current} ({Math.round(agentData.emotion.intensity * 100)}%)
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Memory:</Text>
              <Text color={cyberpunkTheme.colors.primary}>
                {agentData.memory.totalEntries} entries
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Autonomy:</Text>
              <Text color={agentData.autonomy.enabled ? cyberpunkTheme.colors.success : cyberpunkTheme.colors.danger}>
                {agentData.autonomy.enabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Ethics:</Text>
              <Text color={agentData.autonomy.ethicsEnabled ? cyberpunkTheme.colors.success : cyberpunkTheme.colors.danger}>
                {agentData.autonomy.ethicsEnabled ? 'ENABLED' : 'DISABLED'}
              </Text>
            </Box>
          </Box>
        </Card3D>
      </Box>
      
      <Box flexDirection="column" width="50%">
        <Card3D
          title="HEALTH METRICS"
          width={40}
          height={15}
          color={cyberpunkTheme.colors.secondary}
          animated={true}
        >
          <Box flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Health Score:</Text>
              <Text color={
                agentData.debugMetrics.healthScore > 0.8 ? cyberpunkTheme.colors.success :
                agentData.debugMetrics.healthScore > 0.6 ? cyberpunkTheme.colors.warning :
                cyberpunkTheme.colors.danger
              } bold>
                {Math.round(agentData.debugMetrics.healthScore * 100)}%
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Error Rate:</Text>
              <Text color={cyberpunkTheme.colors.warning}>
                {(agentData.performance.errorRate * 100).toFixed(2)}%
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Anomalies:</Text>
              <Text color={cyberpunkTheme.colors.danger}>
                {agentData.debugMetrics.anomalies.filter(a => !a.resolved).length}
              </Text>
            </Box>
            <Box gap={2}>
              <Text color={cyberpunkTheme.colors.textDim}>Bottlenecks:</Text>
              <Text color={cyberpunkTheme.colors.warning}>
                {agentData.debugMetrics.performanceBottlenecks.length}
              </Text>
            </Box>
          </Box>
        </Card3D>
      </Box>
    </Box>
  )
}

export default AgentDetail