import React from 'react'
import { Box, Text } from 'ink'
import { Card3D } from '../../ui/Card3D.js'
import { Chart } from '../../ui/Chart.js'
import { cyberpunkTheme } from '../../../themes/cyberpunk.js'

interface EmotionDetailData {
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

interface AgentDetailData {
  emotion: EmotionDetailData
  [key: string]: any
}

interface EmotionPanelProps {
  agentData: AgentDetailData
}

export const EmotionPanel: React.FC<EmotionPanelProps> = ({ agentData }) => {
  const { emotion } = agentData

  // Prepare emotion history data for chart
  const emotionHistoryData = emotion.history
    .slice(-20)
    .map(entry => entry.intensity)

  // Get emotion colors
  const getEmotionColor = (emotionName: string): string => {
    const emotionColors: Record<string, string> = {
      'happy': cyberpunkTheme.colors.success,
      'sad': '#4A90E2',
      'angry': cyberpunkTheme.colors.danger,
      'anxious': cyberpunkTheme.colors.warning,
      'confident': cyberpunkTheme.colors.primary,
      'curious': cyberpunkTheme.colors.matrix,
      'empathetic': '#9B59B6',
      'proud': cyberpunkTheme.colors.accent,
      'confused': '#95A5A6',
      'neutral': cyberpunkTheme.colors.textDim,
      'nostalgic': '#E67E22'
    }
    return emotionColors[emotionName] || cyberpunkTheme.colors.text
  }

  // Calculate emotion dynamics
  const recentEmotions = emotion.history.slice(-5)
  const emotionVariability = recentEmotions.length > 1 
    ? recentEmotions.reduce((acc, curr, i) => {
        if (i === 0) return acc
        return acc + Math.abs(curr.intensity - recentEmotions[i-1].intensity)
      }, 0) / (recentEmotions.length - 1)
    : 0

  // Render emotion coordinates in 3D space
  const renderEmotionSpace = () => {
    const primary = emotion.blendedEmotions[0]
    if (!primary) return null

    const { valence, arousal, dominance } = primary.coordinates
    
    return (
      <Box flexDirection="column" gap={1}>
        <Text color={cyberpunkTheme.colors.textDim}>3D Emotion Space:</Text>
        <Box gap={2}>
          <Text color={cyberpunkTheme.colors.primary}>Valence:</Text>
          <Text color={cyberpunkTheme.colors.text}>
            {'█'.repeat(Math.round(valence * 10))}
            {'░'.repeat(10 - Math.round(valence * 10))}
          </Text>
          <Text color={cyberpunkTheme.colors.textDim}>
            {valence.toFixed(2)}
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={cyberpunkTheme.colors.secondary}>Arousal:</Text>
          <Text color={cyberpunkTheme.colors.text}>
            {'█'.repeat(Math.round(arousal * 10))}
            {'░'.repeat(10 - Math.round(arousal * 10))}
          </Text>
          <Text color={cyberpunkTheme.colors.textDim}>
            {arousal.toFixed(2)}
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={cyberpunkTheme.colors.accent}>Dominance:</Text>
          <Text color={cyberpunkTheme.colors.text}>
            {'█'.repeat(Math.round(dominance * 10))}
            {'░'.repeat(10 - Math.round(dominance * 10))}
          </Text>
          <Text color={cyberpunkTheme.colors.textDim}>
            {dominance.toFixed(2)}
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={2}>
        {/* Current Emotion State */}
        <Box flexDirection="column" width="40%">
          <Card3D
            title="CURRENT EMOTION STATE"
            width={35}
            height={18}
            color={getEmotionColor(emotion.current)}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Primary:</Text>
                <Text color={getEmotionColor(emotion.current)} bold>
                  {emotion.current.toUpperCase()}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Intensity:</Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {Math.round(emotion.intensity * 100)}%
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Intensity Bar:</Text>
                <Text color={getEmotionColor(emotion.current)}>
                  {'█'.repeat(Math.round(emotion.intensity * 20))}
                  {'░'.repeat(20 - Math.round(emotion.intensity * 20))}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Triggers:</Text>
                {emotion.triggers.slice(0, 3).map((trigger, i) => (
                  <Text key={i} color={cyberpunkTheme.colors.text}>
                    • {trigger}
                  </Text>
                ))}
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Variability:</Text>
                <Text color={
                  emotionVariability > 0.3 ? cyberpunkTheme.colors.danger :
                  emotionVariability > 0.1 ? cyberpunkTheme.colors.warning :
                  cyberpunkTheme.colors.success
                }>
                  {emotionVariability.toFixed(3)}
                </Text>
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Emotion Blending */}
        <Box flexDirection="column" width="30%">
          <Card3D
            title="EMOTION BLENDING"
            width={30}
            height={18}
            color={cyberpunkTheme.colors.secondary}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Text color={cyberpunkTheme.colors.textDim}>Active Blend:</Text>
              {emotion.blendedEmotions.map((blend, i) => (
                <Box key={i} flexDirection="column">
                  <Box gap={2}>
                    <Text color={getEmotionColor(blend.emotion)}>
                      {blend.emotion}
                    </Text>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      {Math.round(blend.weight * 100)}%
                    </Text>
                  </Box>
                  <Text color={getEmotionColor(blend.emotion)}>
                    {'▓'.repeat(Math.round(blend.weight * 15))}
                    {'░'.repeat(15 - Math.round(blend.weight * 15))}
                  </Text>
                </Box>
              ))}
              
              <Box marginTop={2}>
                {renderEmotionSpace()}
              </Box>
            </Box>
          </Card3D>
        </Box>

        {/* Emotion Parameters */}
        <Box flexDirection="column" width="30%">
          <Card3D
            title="EMOTION PARAMETERS"
            width={30}
            height={18}
            color={cyberpunkTheme.colors.matrix}
            animated={true}
          >
            <Box flexDirection="column" gap={1}>
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Inertia:</Text>
                <Text color={cyberpunkTheme.colors.primary}>
                  {emotion.emotionalInertia.toFixed(2)}
                </Text>
              </Box>
              
              <Box gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>Sensitivity:</Text>
                <Text color={cyberpunkTheme.colors.secondary}>
                  {emotion.contextSensitivity.toFixed(2)}
                </Text>
              </Box>
              
              <Box flexDirection="column" marginTop={1}>
                <Text color={cyberpunkTheme.colors.textDim}>Recent Pattern:</Text>
                {recentEmotions.slice(-3).map((entry, i) => (
                  <Box key={i} gap={1}>
                    <Text color={getEmotionColor(entry.emotion)}>
                      {entry.emotion.slice(0, 8)}
                    </Text>
                    <Text color={cyberpunkTheme.colors.textDim}>
                      {Math.round(entry.intensity * 100)}%
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          </Card3D>
        </Box>
      </Box>

      {/* Emotion History Chart */}
      <Box marginTop={1}>
        <Card3D
          title="EMOTION INTENSITY HISTORY"
          width={90}
          height={12}
          color={cyberpunkTheme.colors.primary}
          animated={true}
        >
          <Chart
            data={emotionHistoryData}
            width={85}
            height={8}
            color={getEmotionColor(emotion.current)}
            type="area"
            animated={true}
            showAxes={true}
          />
        </Card3D>
      </Box>

      {/* Personality Traits */}
      <Box marginTop={1}>
        <Card3D
          title="PERSONALITY TRAIT ANALYSIS"
          width={90}
          height={10}
          color={cyberpunkTheme.colors.accent}
          animated={true}
        >
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="row" gap={4}>
              {Object.entries(emotion.personalityTraits).map(([trait, value]) => (
                <Box key={trait} flexDirection="column" width="20%">
                  <Text color={cyberpunkTheme.colors.textDim}>
                    {trait.slice(0, 10)}:
                  </Text>
                  <Text color={
                    value > 0.7 ? cyberpunkTheme.colors.success :
                    value > 0.4 ? cyberpunkTheme.colors.warning :
                    cyberpunkTheme.colors.textDim
                  }>
                    {'█'.repeat(Math.round(value * 10))}
                    {'░'.repeat(10 - Math.round(value * 10))}
                  </Text>
                  <Text color={cyberpunkTheme.colors.text}>
                    {value.toFixed(2)}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        </Card3D>
      </Box>

      {/* Recent Emotion Events */}
      <Box marginTop={1}>
        <Card3D
          title="RECENT EMOTION EVENTS"
          width={90}
          height={8}
          color={cyberpunkTheme.colors.secondary}
          animated={true}
        >
          <Box flexDirection="column" gap={1}>
            {emotion.history.slice(-4).reverse().map((entry, i) => (
              <Box key={i} gap={2}>
                <Text color={cyberpunkTheme.colors.textDim}>
                  {entry.timestamp.toLocaleTimeString()}
                </Text>
                <Text color={getEmotionColor(entry.emotion)} bold>
                  {entry.emotion}
                </Text>
                <Text color={cyberpunkTheme.colors.accent}>
                  {Math.round(entry.intensity * 100)}%
                </Text>
                <Text color={cyberpunkTheme.colors.textDim}>
                  Duration: {Math.round(entry.duration / 60000)}m
                </Text>
                <Text color={cyberpunkTheme.colors.text}>
                  Triggers: {entry.triggers.join(', ')}
                </Text>
              </Box>
            ))}
          </Box>
        </Card3D>
      </Box>
    </Box>
  )
}