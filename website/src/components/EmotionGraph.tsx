import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, TrendingUp, Activity, RefreshCw, AlertTriangle } from 'lucide-react'

interface EmotionState {
  emotion: string
  intensity: number
  timestamp: Date
  triggers: string[]
}

interface EmotionGraphProps {
  agentId: string
}

// Updated emotions based on our new emotion system
const EMOTIONS = [
  { name: 'happy', color: 'bg-yellow-500', description: 'Feeling joyful and content' },
  { name: 'sad', color: 'bg-blue-600', description: 'Experiencing melancholy or disappointment' },
  { name: 'angry', color: 'bg-red-500', description: 'Feeling frustrated or irritated' },
  { name: 'anxious', color: 'bg-orange-500', description: 'Feeling worried or uncertain' },
  { name: 'confident', color: 'bg-green-500', description: 'Self-assured and optimistic' },
  { name: 'nostalgic', color: 'bg-purple-500', description: 'Reflecting on past memories' },
  { name: 'empathetic', color: 'bg-pink-500', description: 'Understanding others\' feelings' },
  { name: 'curious', color: 'bg-cyan-500', description: 'Eager to learn and explore' },
  { name: 'proud', color: 'bg-amber-500', description: 'Feeling accomplished and satisfied' },
  { name: 'confused', color: 'bg-gray-500', description: 'Uncertain or perplexed' },
  { name: 'neutral', color: 'bg-slate-400', description: 'Balanced emotional state' }
]

export default function EmotionGraph({ agentId }: EmotionGraphProps) {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>({
    emotion: 'neutral',
    intensity: 0.5,
    timestamp: new Date(),
    triggers: []
  })
  
  const [emotionHistory, setEmotionHistory] = useState<EmotionState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Fetch emotion data from API
  useEffect(() => {
    const fetchEmotionData = async () => {
      if (!agentId) return
      
      setLoading(true)
      try {
        // First try to get specific agent details
        const agentResponse = await fetch(`http://localhost:3001/api/agent/${agentId}`)
        
        if (agentResponse.ok) {
          const agentData = await agentResponse.json()
          if (agentData.emotion) {
            const emotionData: EmotionState = {
              emotion: agentData.emotion || 'neutral',
              intensity: agentData.emotionIntensity || 0.5,
              timestamp: new Date(),
              triggers: agentData.emotionTriggers || []
            }
            setCurrentEmotion(emotionData)
            setError('')
            
            // Add to history if it's a new emotion
            setEmotionHistory(prev => {
              const lastEmotion = prev[prev.length - 1]
              if (!lastEmotion || lastEmotion.emotion !== emotionData.emotion || 
                  Math.abs(lastEmotion.intensity - emotionData.intensity) > 0.1) {
                return [...prev.slice(-15), emotionData] // Keep last 15 entries
              }
              return prev
            })
          }
        } else {
          // Fallback to agents list
          const agentsResponse = await fetch(`http://localhost:3001/api/agents`)
          if (agentsResponse.ok) {
            const data = await agentsResponse.json()
            if (data.agents) {
              const agent = data.agents.find((a: any) => a.id === agentId)
              if (agent && agent.emotion) {
                const emotionData: EmotionState = {
                  emotion: agent.emotion || 'neutral',
                  intensity: 0.5, // Default intensity if not provided
                  timestamp: new Date(),
                  triggers: []
                }
                setCurrentEmotion(emotionData)
                setError('')
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch emotion data:', error)
        setError('Failed to connect to agent. Is the runtime running?')
      } finally {
        setLoading(false)
      }
    }

    fetchEmotionData()
    const interval = setInterval(fetchEmotionData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [agentId])

  const getEmotionConfig = (emotionName: string) => {
    return EMOTIONS.find(e => e.name === emotionName.toLowerCase()) || 
           EMOTIONS.find(e => e.name === 'neutral')!
  }

  const getIntensityLabel = (intensity: number) => {
    if (intensity >= 0.8) return 'Very High'
    if (intensity >= 0.6) return 'High'
    if (intensity >= 0.4) return 'Medium'
    if (intensity >= 0.2) return 'Low'
    return 'Minimal'
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 0.8) return 'text-red-500'
    if (intensity >= 0.6) return 'text-orange-500'
    if (intensity >= 0.4) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Current Emotion Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5" />
            <span>Current Emotional State</span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Real-time emotion monitoring for {agentId || 'selected agent'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center space-x-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div 
                    className={`w-8 h-8 rounded-full ${getEmotionConfig(currentEmotion.emotion).color} shadow-lg`}
                  />
                  <div>
                    <h3 className="text-2xl font-bold capitalize">{currentEmotion.emotion}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getEmotionConfig(currentEmotion.emotion).description}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Intensity</span>
                    <span className={`font-medium ${getIntensityColor(currentEmotion.intensity)}`}>
                      {getIntensityLabel(currentEmotion.intensity)}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${getEmotionConfig(currentEmotion.emotion).color} shadow-sm`}
                      style={{ width: `${currentEmotion.intensity * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                {currentEmotion.triggers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Recent Triggers:</p>
                    <div className="flex flex-wrap gap-1">
                      {currentEmotion.triggers.map((trigger, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {trigger.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Emotion Intensity Gauge */}
              <div className="flex flex-col items-center space-y-2">
                <Activity className={`h-6 w-6 ${getIntensityColor(currentEmotion.intensity)}`} />
                <div className={`text-3xl font-bold ${getIntensityColor(currentEmotion.intensity)}`}>
                  {Math.round(currentEmotion.intensity * 100)}%
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Emotional<br />Intensity
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emotion History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Emotion Timeline</span>
          </CardTitle>
          <CardDescription>
            Recent emotional state changes and transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emotionHistory.length === 0 && !loading && !error && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No emotion history available</p>
                <p className="text-sm">Start interacting with the agent to see emotional changes</p>
              </div>
            )}
            {emotionHistory.slice(-8).reverse().map((emotion, index) => {
              const config = getEmotionConfig(emotion.emotion)
              return (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className={`w-4 h-4 rounded-full ${config.color} shadow-sm`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{emotion.emotion}</span>
                      <span className="text-xs text-muted-foreground">
                        {emotion.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-24 bg-muted rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${config.color} transition-all duration-500`}
                          style={{ width: `${emotion.intensity * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getIntensityColor(emotion.intensity)}`}>
                        {Math.round(emotion.intensity * 100)}%
                      </span>
                    </div>
                    {emotion.triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {emotion.triggers.slice(0, 3).map((trigger, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                            {trigger.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Emotion Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Emotion System</CardTitle>
          <CardDescription>
            Available emotional states in the SYMindX composite emotion system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {EMOTIONS.map((emotion) => (
              <div key={emotion.name} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className={`w-3 h-3 rounded-full ${emotion.color} shadow-sm`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium capitalize truncate">{emotion.name}</div>
                  <div className="text-xs text-muted-foreground">{emotion.description}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Emotions change based on agent interactions, outcomes, and environmental factors. 
              Each emotion has specific triggers and can influence the agent's decision-making process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}