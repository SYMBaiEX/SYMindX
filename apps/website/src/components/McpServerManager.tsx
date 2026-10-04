import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Server, Wifi, WifiOff, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface McpServer {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error' | 'connecting'
  transport: 'stdio' | 'sse' | 'websocket'
  command?: string
  args?: string[]
  tools: string[]
  resources: string[]
  lastPing?: string
}

interface McpServerManagerProps {
  selectedAgent: string
}

export function McpServerManager({ selectedAgent }: McpServerManagerProps) {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(false)
  const [newServer, setNewServer] = useState<{
    name: string;
    transport: 'stdio' | 'sse' | 'websocket';
    command: string;
  }>({
    name: '',
    transport: 'stdio',
    command: ''
  })

  // Fetch MCP servers from API
  useEffect(() => {
    const fetchServers = async () => {
      if (!selectedAgent) return
      
      setLoading(true)
      try {
        const response = await fetch('http://localhost:3000/actions/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            extension: 'mcpClient',
            action: 'listServers',
            parameters: {}
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.result) {
            const mcpServers: McpServer[] = data.result.map((server: any) => ({
              id: server.name,
              name: server.name,
              status: server.connected ? 'connected' : 'disconnected',
              transport: server.transport || 'stdio',
              command: server.command,
              args: server.args,
              tools: server.tools || [],
              resources: server.resources || [],
              lastPing: server.lastPing
            }))
            setServers(mcpServers)
          }
        }
      } catch (error) {
        console.error('Failed to fetch MCP servers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServers()
    const interval = setInterval(fetchServers, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [selectedAgent])

  const getStatusIcon = (status: McpServer['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected': return <XCircle className="h-4 w-4 text-gray-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'connecting': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: McpServer['status']) => {
    const variants = {
      connected: 'default',
      disconnected: 'secondary',
      error: 'destructive',
      connecting: 'outline'
    } as const
    
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const handleDisconnect = async (serverId: string) => {
    try {
      const response = await fetch('http://localhost:3000/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extension: 'mcpClient',
          action: 'disconnectServer',
          parameters: { serverId }
        })
      })
      
      if (response.ok) {
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, status: 'disconnected' as const }
            : server
        ))
      }
    } catch (error) {
      console.error('Failed to disconnect server:', error)
    }
  }

  const handleReconnect = async (serverId: string) => {
    try {
      const response = await fetch('http://localhost:3000/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extension: 'mcpClient',
          action: 'reconnectServer',
          parameters: { serverId }
        })
      })
      
      if (response.ok) {
        setServers(prev => prev.map(server => 
          server.id === serverId 
            ? { ...server, status: 'connected' as const }
            : server
        ))
      }
    } catch (error) {
      console.error('Failed to reconnect server:', error)
    }
  }

  const formatLastPing = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.command) return
    
    try {
      const response = await fetch('http://localhost:3000/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extension: 'mcpClient',
          action: 'addServer',
          parameters: {
            name: newServer.name,
            transport: newServer.transport,
            command: newServer.command
          }
        })
      })
      
      if (response.ok) {
        setNewServer({ name: '', transport: 'stdio', command: '' })
        // Refresh servers list
        setTimeout(() => {
          const fetchServers = async () => {
            try {
              const response = await fetch('http://localhost:3000/actions/execute', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  extension: 'mcpClient',
                  action: 'listServers',
                  parameters: {}
                })
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.result) {
                  const mcpServers: McpServer[] = data.result.map((server: any) => ({
                    id: server.name,
                    name: server.name,
                    status: server.connected ? 'connected' : 'disconnected',
                    transport: server.transport || 'stdio',
                    command: server.command,
                    args: server.args,
                    tools: server.tools || [],
                    resources: server.resources || [],
                    lastPing: server.lastPing
                  }))
                  setServers(mcpServers)
                }
              }
            } catch (error) {
              console.error('Failed to refresh servers:', error)
            }
          }
          fetchServers()
        }, 1000)
      }
    } catch (error) {
      console.error('Failed to add server:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>MCP Server Manager</span>
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Manage Model Context Protocol server connections for {selectedAgent || 'selected agent'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {servers.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No MCP servers connected
              </div>
            )}
            {servers.map(server => (
              <div key={server.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(server.status)}
                    <div>
                      <div className="font-medium">{server.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {server.transport} transport
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(server.status)}
                    {server.status === 'connected' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDisconnect(server.id)}
                      >
                        <WifiOff className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    )}
                    {(server.status === 'disconnected' || server.status === 'error') && (
                      <Button 
                        size="sm" 
                        onClick={() => handleReconnect(server.id)}
                      >
                        <Wifi className="h-4 w-4 mr-1" />
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
                

                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-1">Available Tools</div>
                    <div className="flex flex-wrap gap-1">
                      {server.tools.map(tool => (
                        <Badge key={tool} variant="outline" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Resources</div>
                    <div className="flex flex-wrap gap-1">
                      {server.resources.map(resource => (
                        <Badge key={resource} variant="secondary" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last ping: {formatLastPing(server.lastPing)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Server</CardTitle>
          <CardDescription>
            Connect to additional MCP servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="server-name">Server Name</Label>
                <Input 
                  id="server-name"
                  type="text" 
                  placeholder="e.g., web-search"
                  value={newServer.name}
                  onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="transport">Transport</Label>
                <Select value={newServer.transport} onValueChange={(value: 'stdio' | 'sse' | 'websocket') => setNewServer(prev => ({ ...prev, transport: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">stdio</SelectItem>
                    <SelectItem value="sse">Server-Sent Events</SelectItem>
                    <SelectItem value="websocket">WebSocket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="command">Command</Label>
              <Input 
                id="command"
                type="text" 
                placeholder="e.g., npx @modelcontextprotocol/server-web-search"
                value={newServer.command}
                onChange={(e) => setNewServer(prev => ({ ...prev, command: e.target.value }))}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleAddServer}
              disabled={!newServer.name || !newServer.command}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}