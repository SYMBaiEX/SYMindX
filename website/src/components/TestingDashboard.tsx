/**
 * Testing Dashboard Component
 * 
 * Comprehensive testing interface for managing test suites,
 * running tests, and viewing results with real-time updates.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TestTube, 
  Play, 
  Square, 
  CheckCircle, 
  XCircle, 
  Clock, 
  BarChart3,
  Settings,
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react'

interface TestSuite {
  id: string
  name: string
  description: string
  agentId: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration?: number
  lastRun?: Date
  coverage?: number
}

interface TestCase {
  id: string
  name: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  duration?: number
  error?: string
}

interface TestEnvironment {
  id: string
  name: string
  type: 'isolated' | 'sandbox' | 'mock' | 'staging'
  status: 'available' | 'busy' | 'maintenance'
  resources: {
    cpu: string
    memory: string
    storage: string
  }
}

export function TestingDashboard({ selectedAgent }: { selectedAgent: string }) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [selectedSuite, setSelectedSuite] = useState<string>('')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [environments, setEnvironments] = useState<TestEnvironment[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [realTimeResults, setRealTimeResults] = useState<any>(null)

  // Mock data
  useEffect(() => {
    setTestSuites([
      {
        id: 'suite_1',
        name: 'Core Functionality Tests',
        description: 'Essential tests for agent core systems',
        agentId: selectedAgent,
        status: 'passed',
        totalTests: 25,
        passed: 23,
        failed: 1,
        skipped: 1,
        duration: 45000,
        lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
        coverage: 89.5
      },
      {
        id: 'suite_2',
        name: 'Integration Tests',
        description: 'Tests for extension and external service integration',
        agentId: selectedAgent,
        status: 'failed',
        totalTests: 18,
        passed: 14,
        failed: 3,
        skipped: 1,
        duration: 67000,
        lastRun: new Date(Date.now() - 30 * 60 * 1000),
        coverage: 76.3
      },
      {
        id: 'suite_3',
        name: 'Performance Tests',
        description: 'Load and stress testing for performance validation',
        agentId: selectedAgent,
        status: 'running',
        totalTests: 12,
        passed: 8,
        failed: 0,
        skipped: 0,
        duration: 120000,
        lastRun: new Date(),
        coverage: 45.2
      }
    ])

    setTestCases([
      {
        id: 'test_1',
        name: 'Agent Initialization',
        description: 'Test agent starts up correctly with given configuration',
        category: 'Core',
        priority: 'critical',
        status: 'passed',
        duration: 1200
      },
      {
        id: 'test_2',
        name: 'Memory Storage and Retrieval',
        description: 'Test memory system can store and retrieve data',
        category: 'Memory',
        priority: 'high',
        status: 'passed',
        duration: 2300
      },
      {
        id: 'test_3',
        name: 'Extension Loading',
        description: 'Test extensions load and initialize properly',
        category: 'Extensions',
        priority: 'high',
        status: 'failed',
        duration: 890,
        error: 'Failed to connect to mock service: Connection timeout'
      },
      {
        id: 'test_4',
        name: 'Emotion Processing',
        description: 'Test emotion module responds to triggers',
        category: 'Emotion',
        priority: 'medium',
        status: 'passed',
        duration: 1500
      },
      {
        id: 'test_5',
        name: 'Cognition Decision Making',
        description: 'Test cognition module makes appropriate decisions',
        category: 'Cognition',
        priority: 'high',
        status: 'running',
        duration: undefined
      }
    ])

    setEnvironments([
      {
        id: 'env_isolated',
        name: 'Isolated Environment',
        type: 'isolated',
        status: 'available',
        resources: { cpu: '500m', memory: '256Mi', storage: '1Gi' }
      },
      {
        id: 'env_sandbox',
        name: 'Sandbox Environment',
        type: 'sandbox',
        status: 'busy',
        resources: { cpu: '1000m', memory: '512Mi', storage: '2Gi' }
      },
      {
        id: 'env_staging',
        name: 'Staging Environment',
        type: 'staging',
        status: 'available',
        resources: { cpu: '2000m', memory: '1Gi', storage: '5Gi' }
      }
    ])
  }, [selectedAgent])

  const runTestSuite = async (suiteId: string) => {
    setIsRunning(true)
    setSelectedSuite(suiteId)
    
    // Update suite status
    setTestSuites(prev => prev.map(suite => 
      suite.id === suiteId 
        ? { ...suite, status: 'running' as const }
        : suite
    ))

    // Simulate real-time test execution
    const suite = testSuites.find(s => s.id === suiteId)
    if (suite) {
      let passed = 0
      let failed = 0
      let completed = 0
      
      const interval = setInterval(() => {
        completed++
        if (Math.random() > 0.2) {
          passed++
        } else {
          failed++
        }
        
        setRealTimeResults({
          total: suite.totalTests,
          completed,
          passed,
          failed,
          progress: (completed / suite.totalTests) * 100
        })

        if (completed >= suite.totalTests) {
          clearInterval(interval)
          setIsRunning(false)
          
          // Update final results
          setTestSuites(prev => prev.map(s => 
            s.id === suiteId 
              ? { 
                  ...s, 
                  status: failed > 0 ? 'failed' as const : 'passed' as const,
                  passed,
                  failed,
                  lastRun: new Date()
                }
              : s
          ))
        }
      }, 1000)
    }
  }

  const stopTestSuite = () => {
    setIsRunning(false)
    setRealTimeResults(null)
    
    // Update suite status
    if (selectedSuite) {
      setTestSuites(prev => prev.map(suite => 
        suite.id === selectedSuite 
          ? { ...suite, status: 'pending' as const }
          : suite
      ))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      case 'skipped':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-green-500" />
            Testing Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage and execute comprehensive agent tests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Real-time Test Execution */}
      {isRunning && realTimeResults && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                <span className="font-medium">Running Tests...</span>
              </div>
              <Button variant="outline" size="sm" onClick={stopTestSuite}>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{realTimeResults.completed}/{realTimeResults.total} tests</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${realTimeResults.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span className="text-green-600">✓ {realTimeResults.passed} passed</span>
                <span className="text-red-600">✗ {realTimeResults.failed} failed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suites" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suites">Test Suites</TabsTrigger>
          <TabsTrigger value="cases">Test Cases</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="suites" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testSuites.map((suite) => (
              <Card key={suite.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{suite.name}</CardTitle>
                    {getStatusIcon(suite.status)}
                  </div>
                  <CardDescription>{suite.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Badge className={getStatusColor(suite.status)}>
                      {suite.status}
                    </Badge>
                    {suite.coverage && (
                      <span className="text-sm text-gray-600">
                        {suite.coverage}% coverage
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-green-600">{suite.passed}</div>
                      <div className="text-xs text-gray-600">Passed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-600">{suite.failed}</div>
                      <div className="text-xs text-gray-600">Failed</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-yellow-600">{suite.skipped}</div>
                      <div className="text-xs text-gray-600">Skipped</div>
                    </div>
                  </div>

                  {suite.duration && (
                    <div className="text-sm text-gray-600">
                      Duration: {Math.round(suite.duration / 1000)}s
                    </div>
                  )}

                  {suite.lastRun && (
                    <div className="text-sm text-gray-600">
                      Last run: {suite.lastRun.toLocaleTimeString()}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => runTestSuite(suite.id)}
                    disabled={isRunning || suite.status === 'running'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Tests
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Test Cases</CardTitle>
              <CardDescription>Detailed view of all test cases across suites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(testCase.status)}
                      <div>
                        <div className="font-medium">{testCase.name}</div>
                        <div className="text-sm text-gray-600">{testCase.description}</div>
                        {testCase.error && (
                          <div className="text-sm text-red-600 mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {testCase.error}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{testCase.category}</Badge>
                      <Badge className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                      {testCase.duration && (
                        <span className="text-sm text-gray-600">
                          {testCase.duration}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.map((env) => (
              <Card key={env.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{env.name}</CardTitle>
                    <Badge 
                      className={
                        env.status === 'available' ? 'bg-green-100 text-green-800' :
                        env.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {env.status}
                    </Badge>
                  </div>
                  <CardDescription className="capitalize">{env.type} environment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU:</span>
                      <span className="font-mono">{env.resources.cpu}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Memory:</span>
                      <span className="font-mono">{env.resources.memory}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage:</span>
                      <span className="font-mono">{env.resources.storage}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    disabled={env.status !== 'available'}
                  >
                    {env.status === 'available' ? 'Use Environment' : 'Unavailable'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Test Results Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Test Suites</span>
                    <span className="font-bold">{testSuites.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Success Rate</span>
                    <span className="font-bold text-green-600">
                      {Math.round(
                        testSuites.reduce((acc, suite) => 
                          acc + (suite.passed / suite.totalTests), 0
                        ) / testSuites.length * 100
                      )}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average Coverage</span>
                    <span className="font-bold text-blue-600">
                      {Math.round(
                        testSuites.reduce((acc, suite) => 
                          acc + (suite.coverage || 0), 0
                        ) / testSuites.length
                      )}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Test Duration</span>
                    <span className="font-bold">
                      {Math.round(
                        testSuites.reduce((acc, suite) => 
                          acc + (suite.duration || 0), 0
                        ) / testSuites.length / 1000
                      )}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tests This Week</span>
                    <span className="font-bold">47</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Reliability Score</span>
                    <span className="font-bold text-green-600">94.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Test Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testSuites
                    .sort((a, b) => (b.lastRun?.getTime() || 0) - (a.lastRun?.getTime() || 0))
                    .slice(0, 5)
                    .map((suite) => (
                      <div key={suite.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(suite.status)}
                          <span className="font-medium">{suite.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{suite.passed}/{suite.totalTests} passed</span>
                          <span>•</span>
                          <span>{suite.lastRun?.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}