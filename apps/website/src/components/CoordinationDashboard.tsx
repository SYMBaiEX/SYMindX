import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, MessageCircle, ArrowRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedTo: string
  delegatedBy: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  estimatedDuration?: number
}

interface Agent {
  id: string
  name: string
  status: 'active' | 'idle' | 'busy'
  capabilities: string[]
  currentTask?: string
  load: number
}

interface CoordinationDashboardProps {
  selectedAgent: string
}

export function CoordinationDashboard({ selectedAgent }: CoordinationDashboardProps) {
  const [agents] = useState<Agent[]>([
    {
      id: 'nyx',
      name: 'NyX',
      status: 'active',
      capabilities: ['hacking', 'social-engineering', 'data-analysis'],
      currentTask: 'task-1',
      load: 75
    },
    {
      id: 'bobalou777',
      name: 'bobalou777',
      status: 'idle',
      capabilities: ['community-management', 'content-creation', 'moderation'],
      load: 30
    },
    {
      id: 'assistant',
      name: 'Assistant',
      status: 'busy',
      capabilities: ['research', 'documentation', 'analysis'],
      currentTask: 'task-2',
      load: 90
    }
  ])

  const [tasks] = useState<Task[]>([
    {
      id: 'task-1',
      title: 'Analyze RuneScape market trends',
      status: 'in_progress',
      assignedTo: 'nyx',
      delegatedBy: 'bobalou777',
      priority: 'high',
      createdAt: new Date(Date.now() - 3600000),
      estimatedDuration: 30
    },
    {
      id: 'task-2',
      title: 'Research MCP server implementations',
      status: 'in_progress',
      assignedTo: 'assistant',
      delegatedBy: 'nyx',
      priority: 'medium',
      createdAt: new Date(Date.now() - 1800000),
      estimatedDuration: 45
    },
    {
      id: 'task-3',
      title: 'Update community guidelines',
      status: 'pending',
      assignedTo: 'bobalou777',
      delegatedBy: 'nyx',
      priority: 'low',
      createdAt: new Date(Date.now() - 900000)
    }
  ])

  const [messages] = useState([
    {
      id: '1',
      from: 'nyx',
      to: 'bobalou777',
      content: 'Can you handle the community update while I analyze the market data?',
      timestamp: new Date(Date.now() - 600000)
    },
    {
      id: '2',
      from: 'bobalou777',
      to: 'nyx',
      content: 'Sure! I\'ll get started on the guidelines update.',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '3',
      from: 'assistant',
      to: 'nyx',
      content: 'MCP research is 80% complete. Found some interesting patterns.',
      timestamp: new Date(Date.now() - 120000)
    }
  ])

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: Agent['status']) => {
    const variants = {
      active: 'default',
      idle: 'secondary',
      busy: 'outline'
    } as const
    
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const
    
    return <Badge variant={variants[priority]}>{priority}</Badge>
  }

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
      {/* Agent Network Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Agent Network</span>
          </CardTitle>
          <CardDescription>
            Current status of all agents in the coordination network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{agent.name}</div>
                  {getStatusBadge(agent.status)}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Load</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${agent.load}%` }}
                        />
                      </div>
                      <span className="text-sm">{agent.load}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Capabilities</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map(cap => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {agent.currentTask && (
                    <div className="text-xs text-muted-foreground">
                      Current: {tasks.find(t => t.id === agent.currentTask)?.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task Delegation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Tasks</CardTitle>
            <CardDescription>
              Tasks currently being coordinated across agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(task.status)}
                      <span className="font-medium">{task.title}</span>
                    </div>
                    {getPriorityBadge(task.priority)}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <span>From:</span>
                      <Badge variant="outline" className="text-xs">
                        {agents.find(a => a.id === task.delegatedBy)?.name}
                      </Badge>
                    </div>
                    <ArrowRight className="h-3 w-3" />
                    <div className="flex items-center space-x-1">
                      <span>To:</span>
                      <Badge variant="outline" className="text-xs">
                        {agents.find(a => a.id === task.assignedTo)?.name}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTimeAgo(task.createdAt)}</span>
                    {task.estimatedDuration && (
                      <span>~{task.estimatedDuration}min</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Inter-Agent Communication</span>
            </CardTitle>
            <CardDescription>
              Recent messages between agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messages.map(message => (
                <div key={message.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {agents.find(a => a.id === message.from)?.name}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        {agents.find(a => a.id === message.to)?.name}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm">{message.content}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Coordination Actions</CardTitle>
          <CardDescription>
            Manage task delegation and agent coordination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Delegate Task</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Send Message</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Approve Task</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Emergency Stop</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}