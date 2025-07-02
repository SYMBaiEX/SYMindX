import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Brain, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Thought {
  id: string
  timestamp: Date
  type: 'thought' | 'plan' | 'memory' | 'emotion' | 'action'
  content: string
  metadata?: Record<string, any>
}

interface ThoughtStreamProps {
  agentId: string
  wsInstance?: WebSocket | null
}

export default function ThoughtStream({ agentId, wsInstance }: ThoughtStreamProps) {
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [loading, setLoading] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new thoughts arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [thoughts])

  // Fetch recent thoughts from API
  useEffect(() => {
    const fetchThoughts = async () => {
      if (!agentId) return
      
      setLoading(true)
      try {
        // Try to get agent-specific memories/thoughts
        const response = await fetch(`http://localhost:3001/api/agent/${agentId}/memory?limit=20`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.memories) {
            const thoughtData: Thought[] = data.memories.map((memory: any) => ({
              id: memory.id || Date.now().toString(),
              timestamp: new Date(memory.timestamp || Date.now()),
              type: memory.type || 'memory',
              content: memory.content || memory.text || 'No content',
              metadata: memory.metadata || {}
            }))
            setThoughts(thoughtData)
          }
        } else {
          // Fallback: try to get agent details for recent activity
          const agentResponse = await fetch(`http://localhost:3001/api/agent/${agentId}`)
          if (agentResponse.ok) {
            const agentData = await agentResponse.json()
            if (agentData.lastThought || agentData.recentActivity) {
              const fallbackThought: Thought = {
                id: Date.now().toString(),
                timestamp: new Date(),
                type: 'thought',
                content: agentData.lastThought || agentData.recentActivity || 'Agent is ready',
                metadata: { source: 'agent_status' }
              }
              setThoughts([fallbackThought])
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch thoughts:', error)
        // Create a placeholder message when connection fails
        const errorThought: Thought = {
          id: 'error-' + Date.now(),
          timestamp: new Date(),
          type: 'thought',
          content: 'Unable to connect to agent. Ensure the SYMindX runtime is running.',
          metadata: { error: true }
        }
        setThoughts([errorThought])
      } finally {
        setLoading(false)
      }
    }

    fetchThoughts()
    const interval = setInterval(fetchThoughts, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [agentId])

  // Handle WebSocket messages for real-time thought updates
  useEffect(() => {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)
        
        // Handle thought/memory updates for this agent
        if ((message.type === 'thought_update' || message.type === 'memory_update') && 
            message.data.agentId === agentId) {
          
          const newThought: Thought = {
            id: message.data.id || Date.now().toString(),
            timestamp: new Date(message.data.timestamp || Date.now()),
            type: message.data.type || 'thought',
            content: message.data.content || message.data.thought || 'New thought',
            metadata: message.data.metadata || { source: 'websocket' }
          }
          
          setThoughts(prev => {
            // Add new thought and keep last 50 entries
            const updated = [...prev, newThought].slice(-50)
            return updated
          })
        }
        
        // Handle general agent updates that might include thoughts
        if (message.type === 'agent_update' && message.data.id === agentId && message.data.thought) {
          const statusThought: Thought = {
            id: 'status-' + Date.now(),
            timestamp: new Date(),
            type: 'action',
            content: message.data.thought,
            metadata: { source: 'agent_status', status: message.data.status }
          }
          
          setThoughts(prev => [...prev, statusThought].slice(-50))
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    wsInstance.addEventListener('message', handleMessage)
    
    return () => {
      wsInstance.removeEventListener('message', handleMessage)
    }
  }, [wsInstance, agentId])

  const getTypeColor = (type: Thought['type']) => {
    switch (type) {
      case 'thought': return 'bg-blue-100 text-blue-800'
      case 'plan': return 'bg-purple-100 text-purple-800'
      case 'memory': return 'bg-green-100 text-green-800'
      case 'emotion': return 'bg-orange-100 text-orange-800'
      case 'action': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: Thought['type']) => {
    switch (type) {
      case 'thought': return '💭'
      case 'plan': return '📋'
      case 'memory': return '🧠'
      case 'emotion': return '❤️'
      case 'action': return '⚡'
      default: return '💫'
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="/assets/images/logos/symindx-logo.png" alt="SYMindX" className="h-5 w-5" />
            <span>Thought Stream</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setThoughts([])}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Real-time cognitive processing from agent: {agentId || 'Select an agent'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-3 pr-2"
        >
          {thoughts.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No thoughts available
            </div>
          )}
          {thoughts.map((thought) => (
            <div key={thought.id} className={`flex space-x-3 p-3 rounded-lg ${
              thought.metadata?.error ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted/50'
            }`}>
              <div className="text-lg">{getTypeIcon(thought.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className={getTypeColor(thought.type)}>
                    {thought.type}
                  </Badge>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{thought.timestamp.toLocaleTimeString()}</span>
                    {thought.metadata?.source === 'websocket' && (
                      <span className="text-green-500">● Live</span>
                    )}
                  </div>
                </div>
                <p className={`text-sm ${thought.metadata?.error ? 'text-destructive' : ''}`}>
                  {thought.content}
                </p>
                {thought.metadata && Object.keys(thought.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(thought.metadata)
                      .filter(([key]) => key !== 'error') // Don't show error flag as badge
                      .map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}