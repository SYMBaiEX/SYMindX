import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Zap, Eye, Pause, Play, Square, Settings } from 'lucide-react'

interface StreamEvent {
  id: string
  type: 'thought' | 'emotion' | 'action' | 'memory' | 'tool_call' | 'error'
  content: string
  timestamp: Date
  agent: string
  metadata?: Record<string, any>
}

interface StreamMetrics {
  eventsPerSecond: number
  totalEvents: number
  activeStreams: number
  bufferSize: number
  latency: number
}

interface StreamingDashboardProps {
  selectedAgent: string
}

export function StreamingDashboard({ selectedAgent }: StreamingDashboardProps) {
  const [isStreaming, setIsStreaming] = useState(true)
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [metrics, setMetrics] = useState<StreamMetrics>({
    eventsPerSecond: 2.3,
    totalEvents: 1247,
    activeStreams: 3,
    bufferSize: 85,
    latency: 12
  })
  const [selectedEventTypes, setSelectedEventTypes] = useState<Set<string>>(new Set(['thought', 'emotion', 'action']))

  // Simulate real-time events
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      const eventTypes: StreamEvent['type'][] = ['thought', 'emotion', 'action', 'memory', 'tool_call', 'error']
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      
      const sampleContent = {
        thought: [
          'Analyzing market patterns in RuneScape economy...',
          'Processing user request for community guidelines...',
          'Evaluating optimal response strategy...'
        ],
        emotion: [
          'Confidence: 0.85, Curiosity: 0.72',
          'Excitement: 0.91, Focus: 0.78',
          'Determination: 0.88, Empathy: 0.65'
        ],
        action: [
          'Executing data analysis tool...',
          'Sending message to coordination network...',
          'Updating memory with new insights...'
        ],
        memory: [
          'Stored: Market trend analysis results',
          'Retrieved: Previous community interaction patterns',
          'Updated: User preference model'
        ],
        tool_call: [
          'Called: web_search("RuneScape market trends 2024")',
          'Called: mcp_server.analyze_data(market_data)',
          'Called: coordination.delegate_task(task_id)'
        ],
        error: [
          'Warning: High memory usage detected',
          'Error: MCP server connection timeout',
          'Alert: Unusual pattern in user behavior'
        ]
      }

      const newEvent: StreamEvent = {
        id: Date.now().toString(),
        type: randomType,
        content: sampleContent[randomType][Math.floor(Math.random() * sampleContent[randomType].length)],
        timestamp: new Date(),
        agent: selectedAgent,
        metadata: {
          priority: randomType === 'error' ? 'high' : 'normal',
          source: randomType === 'tool_call' ? 'external' : 'internal'
        }
      }

      setEvents(prev => [newEvent, ...prev.slice(0, 49)]) // Keep last 50 events
      
      // Update metrics
      setMetrics(prev => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
        eventsPerSecond: Math.random() * 3 + 1,
        bufferSize: Math.random() * 100,
        latency: Math.random() * 20 + 5
      }))
    }, 1500 + Math.random() * 2000) // Random interval between 1.5-3.5 seconds

    return () => clearInterval(interval)
  }, [isStreaming, selectedAgent])

  const getEventIcon = (type: StreamEvent['type']) => {
    switch (type) {
      case 'thought': return '🧠'
      case 'emotion': return '❤️'
      case 'action': return '⚡'
      case 'memory': return '💾'
      case 'tool_call': return '🔧'
      case 'error': return '⚠️'
      default: return '📝'
    }
  }

  const getEventColor = (type: StreamEvent['type']) => {
    switch (type) {
      case 'thought': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'emotion': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'action': return 'bg-green-100 text-green-800 border-green-200'
      case 'memory': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'tool_call': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const toggleEventType = (type: string) => {
    const newSelected = new Set(selectedEventTypes)
    if (newSelected.has(type)) {
      newSelected.delete(type)
    } else {
      newSelected.add(type)
    }
    setSelectedEventTypes(newSelected)
  }

  const filteredEvents = events.filter(event => selectedEventTypes.has(event.type))

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="space-y-6">
      {/* Stream Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Real-time Stream</span>
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-600">Live</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStreaming(!isStreaming)}
              >
                {isStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isStreaming ? 'Pause' : 'Resume'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEvents([])}>
                <Square className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time event stream from {selectedAgent}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stream Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.eventsPerSecond.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Events/sec</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.totalEvents}</div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.activeStreams}</div>
              <div className="text-sm text-muted-foreground">Active Streams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.bufferSize.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Buffer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.latency.toFixed(0)}ms</div>
              <div className="text-sm text-muted-foreground">Latency</div>
            </div>
          </div>

          {/* Event Type Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['thought', 'emotion', 'action', 'memory', 'tool_call', 'error'].map(type => (
              <Button
                key={type}
                variant={selectedEventTypes.has(type) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleEventType(type)}
                className="text-xs"
              >
                <span className="mr-1">{getEventIcon(type as StreamEvent['type'])}</span>
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Event Stream</span>
            <Badge variant="secondary">{filteredEvents.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No events to display. Try adjusting your filters or start streaming.
              </div>
            ) : (
              filteredEvents.map(event => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-3 ${getEventColor(event.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-lg">{getEventIcon(event.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {event.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                          {event.metadata?.priority === 'high' && (
                            <Badge variant="destructive" className="text-xs">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm">{event.content}</div>
                        {event.metadata?.source && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Source: {event.metadata.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stream Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Stream Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure streaming behavior and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buffer Size</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  defaultValue="50"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">50</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Frequency</label>
              <select className="w-full p-2 border rounded">
                <option value="realtime">Real-time</option>
                <option value="1s">Every 1 second</option>
                <option value="5s">Every 5 seconds</option>
                <option value="10s">Every 10 seconds</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Auto-scroll</label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked />
                <span className="text-sm">Follow latest events</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}