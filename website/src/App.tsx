import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Brain, Activity, MessageSquare, Settings } from 'lucide-react'
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
  metrics?: {
    tasksCompleted: number
    uptime: number
    memoryUsage: number
  }
}

function App() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [wsConnected, setWsConnected] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)

  // Fetch initial agent data from API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('http://localhost:3000/status')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.agent) {
            const agent: Agent = {
              id: data.agent.id,
              name: data.agent.name,
              status: data.agent.status,
              emotion: data.emotion?.current || 'neutral',
              lastThought: 'Connected to SYMindX runtime',
              extensions: data.extensions?.map((ext: any) => ext.id) || [],
              mcpServers: [],
              capabilities: ['multi-agent-coordination', 'real-time-streaming', 'dynamic-tools'],
              metrics: {
                tasksCompleted: 0,
                uptime: data.agent.uptime || 0,
                memoryUsage: data.memory?.recentActivity || 0
              }
            }
            setAgents([agent])
            setSelectedAgent(agent.id)
            setApiConnected(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch agent data:', error)
        setApiConnected(false)
      }
    }

    fetchAgents()
    const interval = setInterval(fetchAgents, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws')
    
    ws.onopen = () => {
      setWsConnected(true)
      console.log('Connected to SYMindX WebSocket')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('WebSocket message:', data)
      
      if (data.type === 'agent_update') {
        setAgents(prev => prev.map(agent => 
          agent.id === data.data.id ? {
            ...agent,
            status: data.data.status,
            emotion: data.data.emotion,
            lastThought: `Last update: ${new Date(data.data.lastUpdate).toLocaleTimeString()}`,
            metrics: {
              tasksCompleted: agent.metrics?.tasksCompleted || 0,
              uptime: data.data.uptime || 0,
              memoryUsage: Math.min(100, data.data.memoryCount || 0)
            }
          } : agent
        ))
      } else if (data.type === 'connection_established') {
        console.log('WebSocket connection established with agent:', data.data.name)
      }
    }
    
    ws.onclose = () => {
      setWsConnected(false)
      console.log('Disconnected from SYMindX WebSocket')
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsConnected(false)
    }
    
    return () => ws.close()
  }, [])

  const toggleAgent = (agentId: string, active: boolean) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: active ? 'active' : 'idle' }
        : agent
    ))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">SYMindX</h1>
            <Badge variant={apiConnected ? "default" : "destructive"}>
              API: {apiConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant={wsConnected ? "default" : "destructive"}>
              WS: {wsConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
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
                    <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No agents connected</p>
                    <p className="text-sm">Start the SYMindX runtime to see agents</p>
                  </div>
                ) : (
                  agents.map(agent => (
                    <div key={agent.id} className="space-y-2">
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
                          checked={agent.status === 'active'}
                          onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                        <Badge variant="outline">{agent.emotion}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {agent.extensions.map(ext => (
                            <Badge key={ext} variant="secondary" className="text-xs">
                              {ext}
                            </Badge>
                          ))}
                        </div>
                        {agent.mcpServers && agent.mcpServers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">MCP:</span>
                            {agent.mcpServers.map(server => (
                              <Badge key={server} variant="outline" className="text-xs">
                                {server}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {agent.capabilities && agent.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Capabilities:</span>
                            {agent.capabilities.map(cap => (
                              <Badge key={cap} variant="default" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {agent.metrics && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Tasks: {agent.metrics.tasksCompleted}</div>
                            <div>Memory: {agent.metrics.memoryUsage}%</div>
                            <div>Uptime: {Math.floor(agent.metrics.uptime / 3600000)}h</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="thoughts" className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="thoughts" className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Thoughts</span>
                </TabsTrigger>
                <TabsTrigger value="emotions" className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>Emotions</span>
                </TabsTrigger>
                <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
                <TabsTrigger value="coordination">Coordination</TabsTrigger>
                <TabsTrigger value="streaming">Live Stream</TabsTrigger>
                <TabsTrigger value="tools">Dynamic Tools</TabsTrigger>
                <TabsTrigger value="legacy">Legacy</TabsTrigger>
              </TabsList>

              <TabsContent value="thoughts" className="space-y-6">
                <ThoughtStream agentId={selectedAgent} />
              </TabsContent>

              <TabsContent value="emotions" className="space-y-6">
                <EmotionGraph agentId={selectedAgent} />
              </TabsContent>

              <TabsContent value="lifecycle" className="space-y-6">
                <Tabs defaultValue="builder" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="builder">Agent Builder</TabsTrigger>
                    <TabsTrigger value="testing">Testing</TabsTrigger>
                    <TabsTrigger value="deployment">Deployment</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="builder">
                    <AgentBuilder />
                  </TabsContent>
                  
                  <TabsContent value="testing">
                    <TestingDashboard selectedAgent={selectedAgent} />
                  </TabsContent>
                  
                  <TabsContent value="deployment">
                    <DeploymentConsole selectedAgent={selectedAgent} />
                  </TabsContent>
                  
                  <TabsContent value="analytics">
                    <AnalyticsPlatform selectedAgent={selectedAgent} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="observability" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Memory Usage</span>
                            <span>{agents.find(a => a.id === selectedAgent)?.metrics?.memoryUsage || 0}%</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${agents.find(a => a.id === selectedAgent)?.metrics?.memoryUsage || 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="text-sm">Tasks Completed</div>
                          <div className="text-2xl font-bold">{agents.find(a => a.id === selectedAgent)?.metrics?.tasksCompleted || 0}</div>
                        </div>
                        <div>
                          <div className="text-sm">Uptime</div>
                          <div className="text-lg">{Math.floor((agents.find(a => a.id === selectedAgent)?.metrics?.uptime || 0) / 3600000)}h</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Health Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Event Loop</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Memory</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Extensions</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">MCP Servers</span>
                          <Badge variant="default">Connected</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Tool executed</span>
                          <span className="text-muted-foreground">2m ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Memory stored</span>
                          <span className="text-muted-foreground">5m ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>MCP call</span>
                          <span className="text-muted-foreground">8m ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Task delegated</span>
                          <span className="text-muted-foreground">12m ago</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="coordination">
                <CoordinationDashboard selectedAgent={selectedAgent} />
              </TabsContent>

              <TabsContent value="streaming">
                <StreamingDashboard selectedAgent={selectedAgent} />
              </TabsContent>

              <TabsContent value="tools">
                <DynamicToolsDashboard selectedAgent={selectedAgent} />
              </TabsContent>

              <TabsContent value="legacy" className="space-y-6">
                <Tabs defaultValue="controls" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="chat">Chat</TabsTrigger>
                    <TabsTrigger value="controls">Controls</TabsTrigger>
                    <TabsTrigger value="mcp">MCP</TabsTrigger>
                    <TabsTrigger value="observability">Metrics</TabsTrigger>
                    <TabsTrigger value="stream">Stream</TabsTrigger>
                  </TabsList>

                  <TabsContent value="chat">
                    <Chat 
                      agents={agents} 
                      selectedAgent={selectedAgent} 
                      onAgentSelect={setSelectedAgent} 
                    />
                  </TabsContent>

                  <TabsContent value="controls">
                    <AgentControls activeAgent={selectedAgent} />
                  </TabsContent>

                  <TabsContent value="mcp">
                    <McpServerManager selectedAgent={selectedAgent} />
                  </TabsContent>

                  <TabsContent value="observability" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>Memory Usage</span>
                                <span>{agents.find(a => a.id === selectedAgent)?.metrics?.memoryUsage || 0}%</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2 mt-1">
                                <div 
                                  className="bg-primary h-2 rounded-full" 
                                  style={{ width: `${agents.find(a => a.id === selectedAgent)?.metrics?.memoryUsage || 0}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="text-sm">Tasks Completed</div>
                              <div className="text-2xl font-bold">{agents.find(a => a.id === selectedAgent)?.metrics?.tasksCompleted || 0}</div>
                            </div>
                            <div>
                              <div className="text-sm">Uptime</div>
                              <div className="text-lg">{Math.floor((agents.find(a => a.id === selectedAgent)?.metrics?.uptime || 0) / 3600000)}h</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Health Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Event Loop</span>
                              <Badge variant="default">Healthy</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Memory</span>
                              <Badge variant="default">Healthy</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Extensions</span>
                              <Badge variant="default">Healthy</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">MCP Servers</span>
                              <Badge variant="default">Connected</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle>Recent Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Tool executed</span>
                              <span className="text-muted-foreground">2m ago</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Memory stored</span>
                              <span className="text-muted-foreground">5m ago</span>
                            </div>
                            <div className="flex justify-between">
                              <span>MCP call</span>
                              <span className="text-muted-foreground">8m ago</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Task delegated</span>
                              <span className="text-muted-foreground">12m ago</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="stream">
                    <StreamCanvas />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App