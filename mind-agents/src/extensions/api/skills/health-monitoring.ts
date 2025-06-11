/**
 * Health Monitoring Skill for API Extension
 * 
 * Provides actions for monitoring API health, performance metrics, and system status.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { ApiExtension } from '../index.js'

interface HealthMetrics {
  uptime: number
  requestCount: number
  errorCount: number
  averageResponseTime: number
  memoryUsage: NodeJS.MemoryUsage
  timestamp: string
}

interface EndpointHealth {
  endpoint: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  lastChecked: string
  errorRate: number
}

export class HealthMonitoringSkill {
  private extension: ApiExtension
  private startTime: number = Date.now()
  private requestCount: number = 0
  private errorCount: number = 0
  private responseTimes: number[] = []
  private endpointHealth: Map<string, EndpointHealth> = new Map()

  constructor(extension: ApiExtension) {
    this.extension = extension
  }

  /**
   * Get all health monitoring-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_health_status: {
        name: 'get_health_status',
        description: 'Get overall API health status',
        category: ActionCategory.OBSERVATION,
        parameters: { includeMetrics: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getHealthStatus(agent, params)
        }
      },
      
      get_metrics: {
        name: 'get_metrics',
        description: 'Get detailed performance metrics',
        category: ActionCategory.OBSERVATION,
        parameters: { timeRange: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getMetrics(agent, params)
        }
      },
      
      check_endpoint: {
        name: 'check_endpoint',
        description: 'Check health of specific endpoint',
        category: ActionCategory.OBSERVATION,
        parameters: { endpoint: 'string', method: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.checkEndpoint(agent, params)
        }
      },
      
      record_request: {
        name: 'record_request',
        description: 'Record API request for monitoring',
        category: ActionCategory.OBSERVATION,
        parameters: { endpoint: 'string', responseTime: 'number', success: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.recordRequest(agent, params)
        }
      },
      
      get_system_info: {
        name: 'get_system_info',
        description: 'Get system information and resource usage',
        category: ActionCategory.OBSERVATION,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getSystemInfo(agent, params)
        }
      },
      
      reset_metrics: {
        name: 'reset_metrics',
        description: 'Reset monitoring metrics',
        category: ActionCategory.SYSTEM,
        parameters: { confirm: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.resetMetrics(agent, params)
        }
      },
      
      set_health_threshold: {
        name: 'set_health_threshold',
        description: 'Set health monitoring thresholds',
        category: ActionCategory.OBSERVATION,
        parameters: { metric: 'string', threshold: 'number', operator: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.setHealthThreshold(agent, params)
        }
      }
    }
  }

  /**
   * Get overall health status
   */
  private async getHealthStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { includeMetrics = true } = params
      
      const uptime = Date.now() - this.startTime
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
      const avgResponseTime = this.responseTimes.length > 0 
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
        : 0
      
      // Determine overall health status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (errorRate > 10 || avgResponseTime > 5000) {
        status = 'unhealthy'
      } else if (errorRate > 5 || avgResponseTime > 2000) {
        status = 'degraded'
      }
      
      const healthData: any = {
        status,
        uptime: Math.floor(uptime / 1000), // in seconds
        errorRate: Math.round(errorRate * 100) / 100,
        timestamp: new Date().toISOString()
      }
      
      if (includeMetrics) {
        healthData.metrics = {
          requestCount: this.requestCount,
          errorCount: this.errorCount,
          averageResponseTime: Math.round(avgResponseTime),
          endpointCount: this.endpointHealth.size
        }
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: healthData,
        metadata: {
          action: 'get_health_status',
          status,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get health status: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'get_health_status',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Get detailed metrics
   */
  private async getMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { timeRange = 'all' } = params
      
      const uptime = Date.now() - this.startTime
      const memoryUsage = process.memoryUsage()
      
      const metrics: HealthMetrics = {
        uptime: Math.floor(uptime / 1000),
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        averageResponseTime: this.responseTimes.length > 0 
          ? Math.round(this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length)
          : 0,
        memoryUsage,
        timestamp: new Date().toISOString()
      }
      
      const endpointHealthArray = Array.from(this.endpointHealth.values())
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          metrics: metrics as any,
          endpoints: endpointHealthArray as any,
          summary: {
            totalEndpoints: endpointHealthArray.length,
            healthyEndpoints: endpointHealthArray.filter(e => e.status === 'healthy').length,
            degradedEndpoints: endpointHealthArray.filter(e => e.status === 'degraded').length,
            unhealthyEndpoints: endpointHealthArray.filter(e => e.status === 'unhealthy').length
          },
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'get_metrics',
          timeRange
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'get_metrics',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Check specific endpoint health
   */
  private async checkEndpoint(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { endpoint, method = 'GET' } = params
      
      const startTime = Date.now()
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      let responseTime = 0
      let errorRate = 0
      
      try {
        // Simulate endpoint check (in real implementation, make actual HTTP request)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        responseTime = Date.now() - startTime
        
        // Determine status based on response time
        if (responseTime > 5000) {
          status = 'unhealthy'
        } else if (responseTime > 2000) {
          status = 'degraded'
        }
        
      } catch (error) {
        status = 'unhealthy'
        responseTime = Date.now() - startTime
        errorRate = 100
      }
      
      const endpointHealth: EndpointHealth = {
        endpoint,
        status,
        responseTime,
        lastChecked: new Date().toISOString(),
        errorRate
      }
      
      this.endpointHealth.set(endpoint, endpointHealth)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          endpoint: endpointHealth as any,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'check_endpoint',
          endpoint,
          method,
          status
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to check endpoint: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'check_endpoint',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Record API request for monitoring
   */
  private async recordRequest(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { endpoint, responseTime, success = true } = params
      
      this.requestCount++
      
      if (!success) {
        this.errorCount++
      }
      
      if (responseTime) {
        this.responseTimes.push(responseTime)
        
        // Keep only last 1000 response times to prevent memory issues
        if (this.responseTimes.length > 1000) {
          this.responseTimes = this.responseTimes.slice(-1000)
        }
      }
      
      // Update endpoint health if exists
      if (endpoint && this.endpointHealth.has(endpoint)) {
        const health = this.endpointHealth.get(endpoint)!
        health.lastChecked = new Date().toISOString()
        health.responseTime = responseTime || health.responseTime
        
        // Update error rate (simple moving average)
        if (!success) {
          health.errorRate = Math.min(100, health.errorRate + 1)
        } else {
          health.errorRate = Math.max(0, health.errorRate - 0.1)
        }
        
        this.endpointHealth.set(endpoint, health)
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          recorded: true,
          totalRequests: this.requestCount,
          totalErrors: this.errorCount,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'record_request',
          endpoint,
          success
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to record request: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'record_request',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Get system information
   */
  private async getSystemInfo(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const memoryUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      const uptime = process.uptime()
      
      const systemInfo = {
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: Math.floor(uptime)
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) // MB
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        process: {
          pid: process.pid,
          ppid: process.ppid,
          uptime: Math.floor(uptime)
        },
        timestamp: new Date().toISOString()
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: systemInfo,
        metadata: {
          action: 'get_system_info',
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get system info: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'get_system_info',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Reset monitoring metrics
   */
  private async resetMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { confirm = false } = params
      
      if (!confirm) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Reset confirmation required. Set confirm=true to proceed.',
          metadata: {
            action: 'reset_metrics',
            timestamp: new Date().toISOString()
          }
        }
      }
      
      const oldMetrics = {
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        responseTimes: this.responseTimes.length,
        endpoints: this.endpointHealth.size
      }
      
      // Reset metrics
      this.startTime = Date.now()
      this.requestCount = 0
      this.errorCount = 0
      this.responseTimes = []
      this.endpointHealth.clear()
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          reset: true,
          previousMetrics: oldMetrics,
          resetAt: new Date().toISOString()
        },
        metadata: {
          action: 'reset_metrics',
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to reset metrics: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'reset_metrics',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Set health monitoring thresholds
   */
  private async setHealthThreshold(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { metric, threshold, operator = 'gt' } = params
      
      // This would typically be stored in a configuration system
      // For now, we'll just acknowledge the setting
      
      const validMetrics = ['responseTime', 'errorRate', 'requestCount', 'memoryUsage']
      const validOperators = ['gt', 'lt', 'eq', 'gte', 'lte']
      
      if (!validMetrics.includes(metric)) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: `Invalid metric. Valid metrics: ${validMetrics.join(', ')}`,
          metadata: {
            action: 'set_health_threshold',
            timestamp: new Date().toISOString()
          }
        }
      }
      
      if (!validOperators.includes(operator)) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: `Invalid operator. Valid operators: ${validOperators.join(', ')}`,
          metadata: {
            action: 'set_health_threshold',
            timestamp: new Date().toISOString()
          }
        }
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          thresholdSet: true,
          metric,
          threshold,
          operator,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'set_health_threshold',
          metric,
          threshold,
          operator
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to set health threshold: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'set_health_threshold',
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}