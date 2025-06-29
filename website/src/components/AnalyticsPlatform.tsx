/**
 * Analytics Platform Component
 * 
 * Comprehensive analytics and monitoring dashboard for agents
 * with performance metrics, optimization recommendations,
 * and predictive analytics.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Zap,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Settings,
  Filter,
  Download,
  Share
} from 'lucide-react'

interface MetricData {
  timestamp: Date
  value: number
  label?: string
}

interface PerformanceMetric {
  name: string
  current: number
  previous: number
  trend: 'up' | 'down' | 'stable'
  unit: string
  threshold?: number
}

interface Anomaly {
  id: string
  type: 'performance' | 'behavior' | 'resource' | 'security'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  timestamp: Date
  confidence: number
  recommendations: string[]
}

interface OptimizationRecommendation {
  id: string
  title: string
  description: string
  category: 'performance' | 'cost' | 'reliability' | 'security'
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: number
  effort: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed'
  estimatedImprovement: string
}

interface Experiment {
  id: string
  name: string
  type: 'a_b_test' | 'canary' | 'feature_flag'
  status: 'draft' | 'running' | 'completed' | 'stopped'
  variants: {
    name: string
    traffic: number
    performance: number
    conversions: number
  }[]
  duration: number
  startDate: Date
  confidence: number
}

export function AnalyticsPlatform({ selectedAgent }: { selectedAgent: string }) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h')
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Mock data
  useEffect(() => {
    const generateMockData = () => {
      setMetrics([
        {
          name: 'Response Time',
          current: 145,
          previous: 189,
          trend: 'down',
          unit: 'ms',
          threshold: 200
        },
        {
          name: 'Throughput',
          current: 1250,
          previous: 1180,
          trend: 'up',
          unit: 'req/min'
        },
        {
          name: 'Error Rate',
          current: 0.8,
          previous: 1.2,
          trend: 'down',
          unit: '%',
          threshold: 2.0
        },
        {
          name: 'CPU Usage',
          current: 45,
          previous: 52,
          trend: 'down',
          unit: '%',
          threshold: 80
        },
        {
          name: 'Memory Usage',
          current: 68,
          previous: 71,
          trend: 'down',
          unit: '%',
          threshold: 85
        },
        {
          name: 'Success Rate',
          current: 99.2,
          previous: 98.8,
          trend: 'up',
          unit: '%'
        }
      ])

      setAnomalies([
        {
          id: 'anomaly_1',
          type: 'performance',
          severity: 'medium',
          description: 'Response time spike detected during peak hours',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          confidence: 0.87,
          recommendations: [
            'Scale up resources during peak hours',
            'Optimize database queries',
            'Implement caching layer'
          ]
        },
        {
          id: 'anomaly_2',
          type: 'behavior',
          severity: 'low',
          description: 'Unusual decision pattern in cognition module',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          confidence: 0.72,
          recommendations: [
            'Review recent training data',
            'Check for data drift',
            'Validate model parameters'
          ]
        },
        {
          id: 'anomaly_3',
          type: 'resource',
          severity: 'high',
          description: 'Memory usage trending upward consistently',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          confidence: 0.95,
          recommendations: [
            'Investigate memory leaks',
            'Optimize garbage collection',
            'Consider memory limit increase'
          ]
        }
      ])

      setRecommendations([
        {
          id: 'rec_1',
          title: 'Optimize Database Queries',
          description: 'Several slow queries detected that could be optimized with proper indexing',
          category: 'performance',
          priority: 'high',
          impact: 0.25,
          effort: 'medium',
          status: 'pending',
          estimatedImprovement: '25% faster response time'
        },
        {
          id: 'rec_2',
          title: 'Implement Response Caching',
          description: 'Cache frequently requested data to reduce computation overhead',
          category: 'performance',
          priority: 'medium',
          impact: 0.15,
          effort: 'low',
          status: 'in_progress',
          estimatedImprovement: '15% reduction in CPU usage'
        },
        {
          id: 'rec_3',
          title: 'Update Security Dependencies',
          description: 'Several dependencies have security updates available',
          category: 'security',
          priority: 'critical',
          impact: 0.1,
          effort: 'low',
          status: 'pending',
          estimatedImprovement: 'Enhanced security posture'
        },
        {
          id: 'rec_4',
          title: 'Reduce Memory Footprint',
          description: 'Optimize data structures to reduce memory consumption',
          category: 'cost',
          priority: 'medium',
          impact: 0.2,
          effort: 'high',
          status: 'pending',
          estimatedImprovement: '20% cost savings'
        }
      ])

      setExperiments([
        {
          id: 'exp_1',
          name: 'Cognition Algorithm Optimization',
          type: 'a_b_test',
          status: 'running',
          variants: [
            { name: 'Control', traffic: 50, performance: 98.2, conversions: 156 },
            { name: 'Optimized', traffic: 50, performance: 99.1, conversions: 164 }
          ],
          duration: 7 * 24 * 60 * 60 * 1000, // 7 days
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          confidence: 0.89
        },
        {
          id: 'exp_2',
          name: 'Memory Cache Strategy',
          type: 'canary',
          status: 'completed',
          variants: [
            { name: 'Original', traffic: 90, performance: 97.8, conversions: 1234 },
            { name: 'New Cache', traffic: 10, performance: 98.9, conversions: 145 }
          ],
          duration: 3 * 24 * 60 * 60 * 1000, // 3 days
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          confidence: 0.94
        }
      ])
    }

    generateMockData()
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance to update
        generateMockData()
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [selectedAgent, timeRange])

  const refreshData = async () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false)
    }, 2000)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-500" />
            Analytics Platform
          </h2>
          <p className="text-muted-foreground">
            Advanced analytics and optimization insights for agent performance
          </p>
        </div>
        <div className="flex gap-2">
          {/* Time Range Selector */}
          <div className="flex gap-1 border rounded-lg p-1">
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
            {isRefreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.name}</p>
                      <p className="text-2xl font-bold">
                        {metric.current.toLocaleString()}{metric.unit}
                      </p>
                      <div className="flex items-center gap-1 text-sm">
                        {getTrendIcon(metric.trend)}
                        <span className={
                          metric.trend === 'up' && metric.name !== 'Success Rate' && metric.name !== 'Throughput' ? 'text-red-600' :
                          metric.trend === 'down' && (metric.name === 'Success Rate' || metric.name === 'Throughput') ? 'text-red-600' :
                          'text-green-600'
                        }>
                          {Math.abs(((metric.current - metric.previous) / metric.previous) * 100).toFixed(1)}%
                        </span>
                        <span className="text-gray-600">vs previous</span>
                      </div>
                    </div>
                    {metric.threshold && (
                      <div className="text-right">
                        <div className={`text-sm ${
                          metric.current > metric.threshold ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {metric.current > metric.threshold ? 'Above' : 'Within'} threshold
                        </div>
                        <div className="text-xs text-gray-500">
                          Limit: {metric.threshold}{metric.unit}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Response times improved by 23% this week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Throughput increased steadily over 7 days</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">99.2% uptime maintained this month</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">3 performance anomalies detected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">4 optimization opportunities identified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm">2 experiments currently running</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Key performance indicators over the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                    <p>Performance charts would render here</p>
                    <p className="text-sm">Using Chart.js or similar library</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>
                  CPU, memory, and network usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.filter(m => m.name.includes('Usage')).map((metric) => (
                    <div key={metric.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{metric.name}</span>
                        <span>{metric.current}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            metric.current > 80 ? 'bg-red-500' : 
                            metric.current > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${metric.current}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>
                  Detailed performance metrics by component
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">98.9%</div>
                    <div className="text-sm text-gray-600">Cognition Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">156ms</div>
                    <div className="text-sm text-gray-600">Avg Decision Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">94.2%</div>
                    <div className="text-sm text-gray-600">Memory Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">1,250</div>
                    <div className="text-sm text-gray-600">Actions/Hour</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Detected Anomalies
              </CardTitle>
              <CardDescription>
                Unusual patterns and behaviors requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline">{anomaly.type}</Badge>
                        <span className="text-sm text-gray-600">
                          {anomaly.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium mb-2">{anomaly.description}</p>
                      <div className="text-sm text-gray-600 mb-2">
                        Confidence: {(anomaly.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Recommendations:</div>
                        {anomaly.recommendations.map((rec, index) => (
                          <div key={index} className="text-sm text-gray-600 ml-2">
                            • {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Investigate
                      </Button>
                      <Button variant="outline" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Optimization Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered suggestions to improve agent performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(rec.status)}
                        <h3 className="font-medium">{rec.title}</h3>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>Impact: <strong>{(rec.impact * 100).toFixed(0)}%</strong></span>
                        <span>Effort: <strong>{rec.effort}</strong></span>
                        <span className="text-green-600">{rec.estimatedImprovement}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Implement
                      </Button>
                      <Button variant="outline" size="sm">
                        More Info
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                A/B Tests & Experiments
              </CardTitle>
              <CardDescription>
                Running and completed optimization experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {experiments.map((experiment) => (
                  <div
                    key={experiment.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{experiment.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Badge variant="outline">{experiment.type}</Badge>
                          <Badge className={
                            experiment.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            experiment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {experiment.status}
                          </Badge>
                          <span>Started: {experiment.startDate.toLocaleDateString()}</span>
                          <span>Confidence: {(experiment.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {experiment.variants.map((variant) => (
                        <div key={variant.name} className="border rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{variant.name}</span>
                            <span className="text-sm text-gray-600">{variant.traffic}% traffic</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Performance:</span>
                              <span className="font-medium">{variant.performance}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Conversions:</span>
                              <span className="font-medium">{variant.conversions}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}