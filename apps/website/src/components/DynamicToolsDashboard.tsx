import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, Plus, Play, Pause, Trash2, Edit, Code, Zap, AlertTriangle, CheckCircle } from 'lucide-react'

interface DynamicTool {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error' | 'testing'
  category: 'data' | 'communication' | 'analysis' | 'automation' | 'custom'
  createdAt: Date
  lastUsed?: Date
  usageCount: number
  parameters: ToolParameter[]
  code: string
  performance: {
    avgExecutionTime: number
    successRate: number
    errorCount: number
  }
}

interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  defaultValue?: any
}

interface DynamicToolsDashboardProps {
  selectedAgent: string
}

export function DynamicToolsDashboard({ selectedAgent }: DynamicToolsDashboardProps) {
  const [tools, setTools] = useState<DynamicTool[]>([
    {
      id: 'tool-1',
      name: 'Market Analyzer',
      description: 'Analyzes RuneScape market trends and price fluctuations',
      status: 'active',
      category: 'analysis',
      createdAt: new Date(Date.now() - 86400000 * 7),
      lastUsed: new Date(Date.now() - 3600000),
      usageCount: 47,
      parameters: [
        { name: 'item_name', type: 'string', required: true, description: 'Name of the item to analyze' },
        { name: 'time_range', type: 'string', required: false, description: 'Time range for analysis', defaultValue: '7d' },
        { name: 'include_predictions', type: 'boolean', required: false, description: 'Include price predictions', defaultValue: true }
      ],
      code: 'async function analyzeMarket(item_name, time_range = "7d", include_predictions = true) {\n  // Market analysis logic\n  return analysis_result;\n}',
      performance: {
        avgExecutionTime: 2.3,
        successRate: 94.7,
        errorCount: 3
      }
    },
    {
      id: 'tool-2',
      name: 'Community Sentiment',
      description: 'Analyzes community sentiment from Discord and Reddit',
      status: 'active',
      category: 'communication',
      createdAt: new Date(Date.now() - 86400000 * 3),
      lastUsed: new Date(Date.now() - 1800000),
      usageCount: 23,
      parameters: [
        { name: 'platform', type: 'string', required: true, description: 'Platform to analyze (discord/reddit)' },
        { name: 'keywords', type: 'array', required: false, description: 'Keywords to filter by' },
        { name: 'sentiment_threshold', type: 'number', required: false, description: 'Minimum sentiment score', defaultValue: 0.5 }
      ],
      code: 'async function analyzeSentiment(platform, keywords = [], sentiment_threshold = 0.5) {\n  // Sentiment analysis logic\n  return sentiment_data;\n}',
      performance: {
        avgExecutionTime: 4.1,
        successRate: 89.2,
        errorCount: 7
      }
    },
    {
      id: 'tool-3',
      name: 'Auto Responder',
      description: 'Automatically responds to common community questions',
      status: 'testing',
      category: 'automation',
      createdAt: new Date(Date.now() - 86400000),
      usageCount: 5,
      parameters: [
        { name: 'message', type: 'string', required: true, description: 'Incoming message to respond to' },
        { name: 'context', type: 'object', required: false, description: 'Additional context for response' },
        { name: 'tone', type: 'string', required: false, description: 'Response tone', defaultValue: 'helpful' }
      ],
      code: 'async function autoRespond(message, context = {}, tone = "helpful") {\n  // Auto response logic\n  return response;\n}',
      performance: {
        avgExecutionTime: 1.2,
        successRate: 100,
        errorCount: 0
      }
    },
    {
      id: 'tool-4',
      name: 'Data Aggregator',
      description: 'Aggregates data from multiple sources for analysis',
      status: 'error',
      category: 'data',
      createdAt: new Date(Date.now() - 86400000 * 2),
      lastUsed: new Date(Date.now() - 7200000),
      usageCount: 12,
      parameters: [
        { name: 'sources', type: 'array', required: true, description: 'List of data sources to aggregate' },
        { name: 'format', type: 'string', required: false, description: 'Output format', defaultValue: 'json' }
      ],
      code: 'async function aggregateData(sources, format = "json") {\n  // Data aggregation logic\n  return aggregated_data;\n}',
      performance: {
        avgExecutionTime: 5.7,
        successRate: 75.0,
        errorCount: 15
      }
    }
  ])

  const [selectedTool, setSelectedTool] = useState<DynamicTool | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const getStatusIcon = (status: DynamicTool['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'inactive': return <Pause className="h-4 w-4 text-gray-500" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'testing': return <Zap className="h-4 w-4 text-yellow-500" />
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: DynamicTool['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      error: 'destructive',
      testing: 'outline'
    } as const
    
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const getCategoryIcon = (category: DynamicTool['category']) => {
    switch (category) {
      case 'data': return '📊'
      case 'communication': return '💬'
      case 'analysis': return '🔍'
      case 'automation': return '🤖'
      case 'custom': return '⚙️'
      default: return '🔧'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const toggleToolStatus = (toolId: string) => {
    setTools(prev => prev.map(tool => {
      if (tool.id === toolId) {
        const newStatus = tool.status === 'active' ? 'inactive' : 'active'
        return { ...tool, status: newStatus }
      }
      return tool
    }))
  }

  const deleteTool = (toolId: string) => {
    setTools(prev => prev.filter(tool => tool.id !== toolId))
    if (selectedTool?.id === toolId) {
      setSelectedTool(null)
    }
  }

  const activeTools = tools.filter(t => t.status === 'active').length
  const totalUsage = tools.reduce((sum, tool) => sum + tool.usageCount, 0)
  const avgSuccessRate = tools.reduce((sum, tool) => sum + tool.performance.successRate, 0) / tools.length

  return (
    <div className="space-y-6">
      {/* Tools Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5" />
              <span>Dynamic Tools</span>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tool
            </Button>
          </CardTitle>
          <CardDescription>
            Manage and monitor dynamically created tools for {selectedAgent}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{tools.length}</div>
              <div className="text-sm text-muted-foreground">Total Tools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeTools}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalUsage}</div>
              <div className="text-sm text-muted-foreground">Total Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{avgSuccessRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Success Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Tools</CardTitle>
            <CardDescription>
              Click on a tool to view details and manage it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tools.map(tool => (
                <div
                  key={tool.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedTool?.id === tool.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTool(tool)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getCategoryIcon(tool.category)}</span>
                      <span className="font-medium">{tool.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(tool.status)}
                      {getStatusBadge(tool.status)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {tool.description}
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Used {tool.usageCount} times</span>
                    <span>{tool.lastUsed ? formatTimeAgo(tool.lastUsed) : 'Never used'}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-600">{tool.performance.successRate}% success</span>
                    <span className="text-blue-600">{tool.performance.avgExecutionTime}s avg</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tool Details */}
        <Card>
          <CardHeader>
            <CardTitle>Tool Details</CardTitle>
            <CardDescription>
              {selectedTool ? `Details for ${selectedTool.name}` : 'Select a tool to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTool ? (
              <div className="space-y-4">
                {/* Tool Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{selectedTool.name}</h4>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleToolStatus(selectedTool.id)}
                      >
                        {selectedTool.status === 'active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        {selectedTool.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTool(selectedTool.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
                </div>

                {/* Parameters */}
                <div>
                  <h5 className="font-medium mb-2">Parameters</h5>
                  <div className="space-y-2">
                    {selectedTool.parameters.map(param => (
                      <div key={param.name} className="border rounded p-2 text-sm">
                        <div className="flex items-center space-x-2 mb-1">
                          <code className="bg-muted px-1 rounded">{param.name}</code>
                          <Badge variant="outline" className="text-xs">{param.type}</Badge>
                          {param.required && <Badge variant="destructive" className="text-xs">required</Badge>}
                        </div>
                        <div className="text-muted-foreground">{param.description}</div>
                        {param.defaultValue !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Default: <code>{JSON.stringify(param.defaultValue)}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h5 className="font-medium mb-2">Performance</h5>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{selectedTool.performance.successRate}%</div>
                      <div className="text-xs text-muted-foreground">Success Rate</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{selectedTool.performance.avgExecutionTime}s</div>
                      <div className="text-xs text-muted-foreground">Avg Time</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{selectedTool.performance.errorCount}</div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>
                </div>

                {/* Code Preview */}
                <div>
                  <h5 className="font-medium mb-2 flex items-center space-x-2">
                    <Code className="h-4 w-4" />
                    <span>Code</span>
                  </h5>
                  <div className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                    <pre>{selectedTool.code}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a tool from the list to view its details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tool management operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <Plus className="h-4 w-4" />
              <span className="text-xs">Create Tool</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <Code className="h-4 w-4" />
              <span className="text-xs">Import Tool</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Test All</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center space-y-1">
              <Wrench className="h-4 w-4" />
              <span className="text-xs">Optimize</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}