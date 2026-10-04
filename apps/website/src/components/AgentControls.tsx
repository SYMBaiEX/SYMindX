import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Settings, Play, Pause, RotateCcw, Zap, MessageSquare, Twitter, Gamepad2, Server, Network } from 'lucide-react'

interface AgentControlsProps {
  activeAgent: string | null
}

export function AgentControls({ activeAgent }: AgentControlsProps) {
  const [autonomyLevel, setAutonomyLevel] = useState(75)
  const [extensionStates, setExtensionStates] = useState({
    runelite: true,
    slack: true,
    twitter: false,
    direct_api: true,
    mcp: true,
    mcpClient: true
  })
  const [cognitiveSettings, setCognitiveSettings] = useState({
    memoryRetention: 85,
    emotionalSensitivity: 70,
    planningDepth: 60,
    creativityLevel: 80
  })

  // Mock agent data for demo
  const agent = activeAgent ? {
    id: activeAgent,
    name: "NyX",
    status: 'active' as const,
    emotion: "focused",
    lastThought: "I should check if there are any new messages in the Slack channel",
    extensions: ["slack", "runelite", "direct_api", "mcp", "mcpClient"]
  } : undefined

  if (!agent) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div>No agent selected</div>
            <div className="text-sm">Select an agent to view controls</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleExtension = (extension: string) => {
    setExtensionStates(prev => ({
      ...prev,
      [extension]: !prev[extension as keyof typeof prev]
    }))
  }

  const getExtensionIcon = (extension: string) => {
    switch (extension) {
      case 'runelite': return <Gamepad2 className="h-4 w-4" />
      case 'slack': return <MessageSquare className="h-4 w-4" />
      case 'twitter': return <Twitter className="h-4 w-4" />
      case 'direct_api': return <Zap className="h-4 w-4" />
      case 'mcp': return <Server className="h-4 w-4" />
      case 'mcpClient': return <Network className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const resetAgent = () => {
    // Reset agent to default state
    console.log(`Resetting agent ${agent.id}`)
  }

  const pauseAgent = () => {
    // Pause agent execution
    console.log(`Pausing agent ${agent.id}`)
  }

  const resumeAgent = () => {
    // Resume agent execution
    console.log(`Resuming agent ${agent.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Agent Status</span>
          </CardTitle>
          <CardDescription>
            Current state and basic controls for {agent.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Status</div>
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                {agent.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium">Emotion</div>
              <Badge variant="outline">{agent.emotion}</Badge>
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-2">Last Thought</div>
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              "{agent.lastThought}"
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={agent.status === 'active' ? pauseAgent : resumeAgent}
              className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {agent.status === 'active' ? (
                <><Pause className="h-4 w-4" /><span>Pause</span></>
              ) : (
                <><Play className="h-4 w-4" /><span>Resume</span></>
              )}
            </button>
            <button
              onClick={resetAgent}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Extension Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Extension Controls</CardTitle>
          <CardDescription>
            Enable or disable agent extensions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(extensionStates).map(([extension, enabled]) => (
            <div key={extension} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getExtensionIcon(extension)}
                <div>
                  <div className="font-medium capitalize">{extension.replace('_', ' ')}</div>
                  <div className="text-xs text-muted-foreground">
                    {extension === 'runelite' && 'RuneScape game integration'}
                    {extension === 'slack' && 'Slack messaging and approvals'}
                    {extension === 'twitter' && 'Social media posting'}
                    {extension === 'direct_api' && 'Direct API commands'}
                    {extension === 'mcp' && 'Model Context Protocol server'}
                    {extension === 'mcpClient' && 'Connect to external MCP servers'}
                  </div>
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => toggleExtension(extension)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Autonomy Level */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomy Level</CardTitle>
          <CardDescription>
            Control how independently the agent operates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Current Level</span>
              <span className="font-medium">{autonomyLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={autonomyLevel}
              onChange={(e) => setAutonomyLevel(Number(e.target.value))}
              className="w-full"
            />
            <div className="grid grid-cols-3 text-xs text-muted-foreground">
              <div>Manual</div>
              <div className="text-center">Assisted</div>
              <div className="text-right">Autonomous</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {autonomyLevel < 30 && 'Agent requires approval for most actions'}
              {autonomyLevel >= 30 && autonomyLevel < 70 && 'Agent operates with moderate independence'}
              {autonomyLevel >= 70 && 'Agent operates with high independence'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cognitive Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cognitive Settings</CardTitle>
          <CardDescription>
            Fine-tune agent mental processes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(cognitiveSettings).map(([setting, value]) => (
            <div key={setting} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{setting.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="font-medium">{value}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setCognitiveSettings(prev => ({
                  ...prev,
                  [setting]: Number(e.target.value)
                }))}
                className="w-full"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common agent commands and overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Clear Memory</div>
              <div className="text-xs text-muted-foreground">Reset agent memory</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Force Emotion</div>
              <div className="text-xs text-muted-foreground">Override current emotion</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Emergency Stop</div>
              <div className="text-xs text-muted-foreground">Halt all actions</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Debug Mode</div>
              <div className="text-xs text-muted-foreground">Enable verbose logging</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Reconnect MCP</div>
              <div className="text-xs text-muted-foreground">Reconnect MCP servers</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Delegate Task</div>
              <div className="text-xs text-muted-foreground">Send task to other agents</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Stream Control</div>
              <div className="text-xs text-muted-foreground">Pause/resume streaming</div>
            </button>
            <button className="p-3 text-left border rounded-lg hover:bg-muted transition-colors">
              <div className="font-medium text-sm">Health Check</div>
              <div className="text-xs text-muted-foreground">Run system diagnostics</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}