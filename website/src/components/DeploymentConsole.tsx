/**
 * Deployment Console Component
 * 
 * Comprehensive deployment management interface for orchestrating
 * agent deployments across environments with CI/CD pipeline integration.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Rocket, 
  GitBranch, 
  Server, 
  Activity, 
  RotateCcw,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Monitor,
  Zap,
  Shield,
  Globe
} from 'lucide-react'

interface Deployment {
  id: string
  agentId: string
  agentName: string
  environment: 'development' | 'staging' | 'production'
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolling_back'
  version: string
  strategy: 'rolling' | 'blue_green' | 'canary'
  deployTime: Date
  duration?: number
  url?: string
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  metrics: {
    cpu: number
    memory: number
    requests: number
    errors: number
  }
}

interface Pipeline {
  id: string
  name: string
  agentId: string
  status: 'idle' | 'running' | 'success' | 'failed' | 'cancelled'
  stages: {
    name: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
    duration?: number
    startTime?: Date
  }[]
  trigger: 'manual' | 'git' | 'schedule'
  lastRun?: Date
  duration?: number
}

interface Environment {
  id: string
  name: string
  type: 'development' | 'staging' | 'production'
  status: 'active' | 'maintenance' | 'inactive'
  deployments: number
  capacity: {
    total: number
    used: number
  }
  resources: {
    cpu: string
    memory: string
    storage: string
  }
}

export function DeploymentConsole({ selectedAgent }: { selectedAgent: string }) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all')
  const [isDeploying, setIsDeploying] = useState(false)

  // Mock data
  useEffect(() => {
    setDeployments([
      {
        id: 'deploy_1',
        agentId: selectedAgent,
        agentName: 'Gaming Agent',
        environment: 'production',
        status: 'deployed',
        version: 'v1.2.3',
        strategy: 'blue_green',
        deployTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        duration: 180000,
        url: 'https://gaming-agent.symindx.com',
        healthStatus: 'healthy',
        metrics: {
          cpu: 45,
          memory: 60,
          requests: 1250,
          errors: 2
        }
      },
      {
        id: 'deploy_2',
        agentId: selectedAgent,
        agentName: 'Gaming Agent',
        environment: 'staging',
        status: 'deployed',
        version: 'v1.3.0-rc1',
        strategy: 'rolling',
        deployTime: new Date(Date.now() - 30 * 60 * 1000),
        duration: 120000,
        url: 'https://staging-gaming-agent.symindx.com',
        healthStatus: 'healthy',
        metrics: {
          cpu: 30,
          memory: 45,
          requests: 156,
          errors: 0
        }
      },
      {
        id: 'deploy_3',
        agentId: selectedAgent,
        agentName: 'Gaming Agent',
        environment: 'development',
        status: 'failed',
        version: 'v1.3.0-alpha',
        strategy: 'rolling',
        deployTime: new Date(Date.now() - 10 * 60 * 1000),
        duration: 45000,
        healthStatus: 'unhealthy',
        metrics: {
          cpu: 80,
          memory: 95,
          requests: 45,
          errors: 12
        }
      }
    ])

    setPipelines([
      {
        id: 'pipeline_1',
        name: 'Production Deploy Pipeline',
        agentId: selectedAgent,
        status: 'success',
        stages: [
          { name: 'Build', status: 'success', duration: 45000, startTime: new Date(Date.now() - 3 * 60 * 60 * 1000) },
          { name: 'Test', status: 'success', duration: 120000, startTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000) },
          { name: 'Security Scan', status: 'success', duration: 30000, startTime: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          { name: 'Deploy Staging', status: 'success', duration: 60000, startTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000) },
          { name: 'Integration Tests', status: 'success', duration: 90000, startTime: new Date(Date.now() - 1 * 60 * 60 * 1000) },
          { name: 'Deploy Production', status: 'success', duration: 180000, startTime: new Date(Date.now() - 30 * 60 * 1000) }
        ],
        trigger: 'git',
        lastRun: new Date(Date.now() - 30 * 60 * 1000),
        duration: 525000
      },
      {
        id: 'pipeline_2',
        name: 'Staging Deploy Pipeline',
        agentId: selectedAgent,
        status: 'running',
        stages: [
          { name: 'Build', status: 'success', duration: 42000, startTime: new Date(Date.now() - 5 * 60 * 1000) },
          { name: 'Test', status: 'running', startTime: new Date(Date.now() - 2 * 60 * 1000) },
          { name: 'Deploy Staging', status: 'pending' }
        ],
        trigger: 'manual',
        lastRun: new Date(Date.now() - 5 * 60 * 1000)
      }
    ])

    setEnvironments([
      {
        id: 'prod',
        name: 'Production',
        type: 'production',
        status: 'active',
        deployments: 5,
        capacity: { total: 20, used: 12 },
        resources: { cpu: '8 cores', memory: '32GB', storage: '500GB' }
      },
      {
        id: 'staging',
        name: 'Staging',
        type: 'staging',
        status: 'active',
        deployments: 3,
        capacity: { total: 10, used: 4 },
        resources: { cpu: '4 cores', memory: '16GB', storage: '200GB' }
      },
      {
        id: 'dev',
        name: 'Development',
        type: 'development',
        status: 'maintenance',
        deployments: 8,
        capacity: { total: 15, used: 10 },
        resources: { cpu: '2 cores', memory: '8GB', storage: '100GB' }
      }
    ])
  }, [selectedAgent])

  const deployToEnvironment = async (environmentId: string) => {
    setIsDeploying(true)
    
    // Simulate deployment
    setTimeout(() => {
      const newDeployment: Deployment = {
        id: `deploy_${Date.now()}`,
        agentId: selectedAgent,
        agentName: 'Gaming Agent',
        environment: environmentId as any,
        status: 'deploying',
        version: 'v1.3.0',
        strategy: 'rolling',
        deployTime: new Date(),
        healthStatus: 'unknown',
        metrics: { cpu: 0, memory: 0, requests: 0, errors: 0 }
      }
      
      setDeployments(prev => [newDeployment, ...prev])
      
      // Update to deployed after 5 seconds
      setTimeout(() => {
        setDeployments(prev => prev.map(d => 
          d.id === newDeployment.id 
            ? { ...d, status: 'deployed', healthStatus: 'healthy', duration: 90000 }
            : d
        ))
        setIsDeploying(false)
      }, 5000)
    }, 1000)
  }

  const rollbackDeployment = async (deploymentId: string) => {
    setDeployments(prev => prev.map(d => 
      d.id === deploymentId 
        ? { ...d, status: 'rolling_back' }
        : d
    ))

    // Simulate rollback
    setTimeout(() => {
      setDeployments(prev => prev.map(d => 
        d.id === deploymentId 
          ? { ...d, status: 'deployed', version: 'v1.2.2' }
          : d
      ))
    }, 3000)
  }

  const runPipeline = async (pipelineId: string) => {
    setPipelines(prev => prev.map(p => 
      p.id === pipelineId 
        ? { ...p, status: 'running', lastRun: new Date() }
        : p
    ))

    // Simulate pipeline execution
    setTimeout(() => {
      setPipelines(prev => prev.map(p => 
        p.id === pipelineId 
          ? { ...p, status: 'success', duration: 300000 }
          : p
      ))
    }, 10000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'deploying':
      case 'running':
      case 'rolling_back':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'success':
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'deploying':
      case 'running':
      case 'rolling_back':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
      case 'unknown':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getEnvironmentIcon = (type: string) => {
    switch (type) {
      case 'production':
        return <Globe className="h-4 w-4 text-red-500" />
      case 'staging':
        return <Server className="h-4 w-4 text-yellow-500" />
      case 'development':
        return <Settings className="h-4 w-4 text-blue-500" />
      default:
        return <Server className="h-4 w-4" />
    }
  }

  const filteredDeployments = selectedEnvironment === 'all' 
    ? deployments 
    : deployments.filter(d => d.environment === selectedEnvironment)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-blue-500" />
            Deployment Console
          </h2>
          <p className="text-muted-foreground">
            Manage agent deployments and orchestration pipelines
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => deployToEnvironment('staging')}
            disabled={isDeploying}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Deploy to Staging
          </Button>
          <Button
            onClick={() => deployToEnvironment('production')}
            disabled={isDeploying}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Deploy to Production
          </Button>
        </div>
      </div>

      <Tabs defaultValue="deployments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="deployments" className="space-y-6">
          {/* Environment Filter */}
          <div className="flex gap-2">
            <Button
              variant={selectedEnvironment === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEnvironment('all')}
            >
              All Environments
            </Button>
            <Button
              variant={selectedEnvironment === 'development' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEnvironment('development')}
            >
              Development
            </Button>
            <Button
              variant={selectedEnvironment === 'staging' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEnvironment('staging')}
            >
              Staging
            </Button>
            <Button
              variant={selectedEnvironment === 'production' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedEnvironment('production')}
            >
              Production
            </Button>
          </div>

          {/* Deployments List */}
          <div className="space-y-4">
            {filteredDeployments.map((deployment) => (
              <Card key={deployment.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEnvironmentIcon(deployment.environment)}
                      <div>
                        <CardTitle className="text-lg">{deployment.agentName}</CardTitle>
                        <CardDescription>
                          {deployment.environment} • {deployment.version} • {deployment.strategy}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(deployment.status)}>
                        {deployment.status}
                      </Badge>
                      <Badge className={getStatusColor(deployment.healthStatus)}>
                        {deployment.healthStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{deployment.metrics.cpu}%</div>
                      <div className="text-xs text-gray-600">CPU Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{deployment.metrics.memory}%</div>
                      <div className="text-xs text-gray-600">Memory Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{deployment.metrics.requests}</div>
                      <div className="text-xs text-gray-600">Requests/min</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{deployment.metrics.errors}</div>
                      <div className="text-xs text-gray-600">Errors/min</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Deployed: {deployment.deployTime.toLocaleString()}</span>
                    {deployment.duration && (
                      <span>Duration: {Math.round(deployment.duration / 1000)}s</span>
                    )}
                    {deployment.url && (
                      <a
                        href={deployment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit URL
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rollbackDeployment(deployment.id)}
                      disabled={deployment.status !== 'deployed'}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rollback
                    </Button>
                    <Button variant="outline" size="sm">
                      <Monitor className="h-4 w-4 mr-2" />
                      View Logs
                    </Button>
                    <Button variant="outline" size="sm">
                      <Activity className="h-4 w-4 mr-2" />
                      Metrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-6">
          <div className="space-y-4">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-blue-500" />
                      <div>
                        <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                        <CardDescription>
                          Triggered by {pipeline.trigger} • 
                          {pipeline.lastRun && ` Last run: ${pipeline.lastRun.toLocaleTimeString()}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(pipeline.status)}>
                        {pipeline.status}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => runPipeline(pipeline.id)}
                        disabled={pipeline.status === 'running'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">Pipeline Stages:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pipeline.stages.map((stage, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(stage.status)}
                            <span className="font-medium">{stage.name}</span>
                          </div>
                          {stage.duration && (
                            <span className="text-sm text-gray-600">
                              {Math.round(stage.duration / 1000)}s
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {pipeline.duration && (
                      <div className="text-sm text-gray-600 pt-2">
                        Total Duration: {Math.round(pipeline.duration / 1000)}s
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="environments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.map((env) => (
              <Card key={env.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getEnvironmentIcon(env.type)}
                      <CardTitle className="text-lg">{env.name}</CardTitle>
                    </div>
                    <Badge 
                      className={
                        env.status === 'active' ? 'bg-green-100 text-green-800' :
                        env.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {env.status}
                    </Badge>
                  </div>
                  <CardDescription className="capitalize">{env.type} environment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Deployments:</span>
                      <span className="font-medium">{env.deployments}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Capacity:</span>
                      <span className="font-medium">{env.capacity.used}/{env.capacity.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(env.capacity.used / env.capacity.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Resources:</div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>CPU:</span>
                        <span className="font-mono">{env.resources.cpu}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span className="font-mono">{env.resources.memory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span className="font-mono">{env.resources.storage}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => deployToEnvironment(env.id)}
                    disabled={env.status !== 'active' || isDeploying}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Here
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Deployment Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deployments.filter(d => d.status === 'deployed').map((deployment) => (
                    <div key={deployment.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEnvironmentIcon(deployment.environment)}
                        <span className="font-medium">{deployment.environment}</span>
                      </div>
                      <Badge className={getStatusColor(deployment.healthStatus)}>
                        {deployment.healthStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deployments.filter(d => d.status === 'deployed').map((deployment) => (
                    <div key={deployment.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{deployment.environment}</span>
                        <span>{deployment.metrics.cpu}% CPU</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            deployment.metrics.cpu > 80 ? 'bg-red-500' : 
                            deployment.metrics.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${deployment.metrics.cpu}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Deployment Security Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Security Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">0</div>
                    <div className="text-sm text-gray-600">Vulnerabilities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-gray-600">Compliance</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}