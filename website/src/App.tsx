import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Brain, Activity, MessageSquare, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import ThoughtStream from '@/components/ThoughtStream'
import EmotionGraph from '@/components/EmotionGraph'
import { AgentControls } from '@/components/AgentControls'
import StreamCanvas from '@/components/StreamCanvas'
import { McpServerManager } from '@/components/McpServerManager'
import { Chat } from '@/components/Chat'
import { CoordinationDashboard } from '@/components/CoordinationDashboard'
import { StreamingDashboard } from '@/components/StreamingDashboard'
import { DynamicToolsDashboard } from '@/components/DynamicToolsDashboard'
import { AgentBuilder } from '@/components/AgentBuilder'
import { TestingDashboard } from '@/components/TestingDashboard'
import { DeploymentConsole } from '@/components/DeploymentConsole'
import { AnalyticsPlatform } from '@/components/AnalyticsPlatform'

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'thinking' | 'paused' | 'error'
  emotion: string
  lastThought: string
  extensions: string[]
  mcpServers?: string[]
  capabilities?: string[]
  ethicsEnabled?: boolean
  metrics?: {
    tasksCompleted: number
    uptime: number
    memoryUsage: number
  }
}

interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
}

function App() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [wsConnected, setWsConnected] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null)
  const [connectionError, setConnectionError] = useState<string>('')

  // Fetch agents from API
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/agents')
      if (response.ok) {
        const data = await response.json()
        if (data.agents && data.agents.length > 0) {
          const mappedAgents: Agent[] = data.agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status || 'idle',
            emotion: agent.emotion || 'neutral',
            lastThought: agent.lastUpdate ? `Last active: ${new Date(agent.lastUpdate).toLocaleTimeString()}` : 'No recent activity',
            extensions: agent.extensions || [],
            mcpServers: agent.mcpServers || [],
            capabilities: agent.capabilities || [],
            ethicsEnabled: agent.ethicsEnabled,
            metrics: {
              tasksCompleted: 0,
              uptime: Date.now() - new Date(agent.lastUpdate || Date.now()).getTime(),
              memoryUsage: 0
            }
          }))
          
          setAgents(mappedAgents)
          setApiConnected(true)
          setConnectionError('')
          
          // Auto-select first agent if none selected
          if (!selectedAgent && mappedAgents.length > 0) {
            setSelectedAgent(mappedAgents[0].id)
          }
        }
      } else {
        setApiConnected(false)
        setConnectionError('Failed to fetch agents')
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      setApiConnected(false)
      setConnectionError('Cannot connect to API server. Ensure the runtime is running.')
    }
  }, [selectedAgent])

  // Initial fetch and polling
  useEffect(() => {
    fetchAgents()
    const interval = setInterval(fetchAgents, 3000) // Poll every 3 seconds
    return () => clearInterval(interval)
  }, [fetchAgents])

  // WebSocket connection management
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout
    let ws: WebSocket | null = null

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:3001/ws')
        
        ws.onopen = () => {
          setWsConnected(true)
          setWsInstance(ws)
          console.log('Connected to SYMindX WebSocket')
          
          // Subscribe to agent updates
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'subscribe',
              data: { events: ['agent_update', 'emotion_change', 'thought_update'] }
            }))
          }
        }
        
        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            console.log('WebSocket message:', message)
            
            switch (message.type) {
              case 'agent_update':
                setAgents(prev => prev.map(agent => 
                  agent.id === message.data.id ? {
                    ...agent,
                    status: message.data.status || agent.status,
                    emotion: message.data.emotion || agent.emotion,
                    lastThought: message.data.thought || agent.lastThought,
                    metrics: {
                      ...agent.metrics,
                      uptime: message.data.uptime || agent.metrics?.uptime || 0,
                      memoryUsage: message.data.memoryUsage || agent.metrics?.memoryUsage || 0
                    }
                  } : agent
                ))
                break
                
              case 'emotion_change':
                setAgents(prev => prev.map(agent => 
                  agent.id === message.data.agentId ? {
                    ...agent,
                    emotion: message.data.emotion
                  } : agent
                ))
                break
                
              case 'thought_update':
                setAgents(prev => prev.map(agent => 
                  agent.id === message.data.agentId ? {
                    ...agent,
                    lastThought: message.data.thought
                  } : agent
                ))
                break
                
              case 'connection_established':
                console.log('WebSocket connection established')
                break
                
              default:
                console.log('Unknown message type:', message.type)
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
        
        ws.onclose = () => {
          setWsConnected(false)
          setWsInstance(null)
          console.log('Disconnected from SYMindX WebSocket')
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 3000)
        }
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setWsConnected(false)
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        setWsConnected(false)
      }
    }

    connectWebSocket()

    return () => {
      clearTimeout(reconnectTimeout)
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [])

  const toggleAgent = async (agentId: string, active: boolean) => {
    try {
      const response = await fetch(`http://localhost:3001/api/agent/${agentId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      })
      
      if (response.ok) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, status: active ? 'active' : 'idle' }
            : agent
        ))
      }
    } catch (error) {
      console.error('Failed to toggle agent:', error)
    }
  }

  const currentAgent = agents.find(a => a.id === selectedAgent)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/assets/images/logos/symindx-logo.png" alt="SYMindX Logo" className="h-8 w-8" />
            <h1 className="text-3xl font-bold text-gray-900">SYMindX</h1>
            <Badge variant={apiConnected ? "default" : "destructive"}>
              API: {apiConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant={wsConnected ? "default" : "destructive"}>
              WS: {wsConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          {connectionError && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{connectionError}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent Controls Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Agents</span>
                </CardTitle>
                <CardDescription>
                  Manage active AI agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <img src="/assets/images/logos/symindx.png" alt="SYMindX" className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No agents connected</p>
                    <p className="text-sm mt-2">Start the SYMindX runtime:</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">cd mind-agents && npm run start</code>
                  </div>
                ) : (
                  agents.map(agent => (
                    <div key={agent.id} className="space-y-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedAgent(agent.id)}
                          className={`text-left font-medium ${
                            selectedAgent === agent.id 
                              ? 'text-primary' 
                              : 'text-foreground hover:text-primary'
                          }`}
                        >
                          {agent.name}
                        </button>
                        <Switch
                          checked={agent.status === 'active' || agent.status === 'thinking'}
                          onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                          disabled={agent.status === 'error'}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={
                          agent.status === 'active' ? 'default' : 
                          agent.status === 'thinking' ? 'secondary' :
                          agent.status === 'error' ? 'destructive' : 'outline'
                        }>
                          {agent.status}
                        </Badge>
                        <Badge variant="outline">{agent.emotion}</Badge>
                        {agent.ethicsEnabled === false && (
                          <Badge variant="destructive" className="text-xs">
                            No Ethics
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.lastThought}
                      </p>
                      {agent.extensions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {agent.extensions.map(ext => (
                            <Badge key={ext} variant="secondary" className="text-xs">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-3">
            {agents.length === 0 ? (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <img src="/assets/images/logos/symindx.png" alt="SYMindX" className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-semibold mb-2">No Agents Running</h2>
                  <p className="text-muted-foreground mb-4">
                    Start the SYMindX runtime to begin monitoring your AI agents
                  </p>
                  <div className="bg-muted rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm font-medium mb-2">Quick Start:</p>
                    <code className="text-xs block mb-2">cd mind-agents</code>
                    <code className="text-xs block">npm run start</code>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="chat" className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="thoughts">Thoughts</TabsTrigger>
                  <TabsTrigger value="emotions">
                    <Activity className="h-4 w-4 mr-2" />
                    Emotions
                  </TabsTrigger>
                  <TabsTrigger value="controls">Controls</TabsTrigger>
                  <TabsTrigger value="mcp">MCP</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="space-y-6">
                  <Chat 
                    agents={agents} 
                    selectedAgent={selectedAgent} 
                    onAgentSelect={setSelectedAgent} 
                  />
                </TabsContent>

                <TabsContent value="thoughts" className="space-y-6">
                  <ThoughtStream agentId={selectedAgent} wsInstance={wsInstance} />
                </TabsContent>

                <TabsContent value="emotions" className="space-y-6">
                  <EmotionGraph agentId={selectedAgent} />
                </TabsContent>

                <TabsContent value="controls" className="space-y-6">
                  <AgentControls activeAgent={selectedAgent} />
                  {currentAgent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Agent Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">ID:</span>
                            <span className="text-sm font-mono">{currentAgent.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Ethics:</span>
                            <span className="text-sm">
                              {currentAgent.ethicsEnabled === false ? (
                                <Badge variant="destructive">Disabled</Badge>
                              ) : (
                                <Badge variant="default">Enabled</Badge>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Extensions:</span>
                            <span className="text-sm">{currentAgent.extensions.length}</span>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Uptime:</span>
                            <span className="text-sm">
                              {Math.floor((currentAgent.metrics?.uptime || 0) / 1000 / 60)}m
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Memory:</span>
                            <span className="text-sm">{currentAgent.metrics?.memoryUsage || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tasks:</span>
                            <span className="text-sm">{currentAgent.metrics?.tasksCompleted || 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="mcp" className="space-y-6">
                  <McpServerManager selectedAgent={selectedAgent} />
                </TabsContent>

                <TabsContent value="advanced" className="space-y-6">
                  <Tabs defaultValue="coordination" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="coordination">Coordination</TabsTrigger>
                      <TabsTrigger value="streaming">Streaming</TabsTrigger>
                      <TabsTrigger value="tools">Tools</TabsTrigger>
                      <TabsTrigger value="builder">Builder</TabsTrigger>
                      <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="coordination">
                      <CoordinationDashboard selectedAgent={selectedAgent} />
                    </TabsContent>
                    
                    <TabsContent value="streaming">
                      <StreamingDashboard selectedAgent={selectedAgent} />
                    </TabsContent>
                    
                    <TabsContent value="tools">
                      <DynamicToolsDashboard selectedAgent={selectedAgent} />
                    </TabsContent>
                    
                    <TabsContent value="builder">
                      <AgentBuilder />
                    </TabsContent>
                    
                    <TabsContent value="analytics">
                      <AnalyticsPlatform selectedAgent={selectedAgent} />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App