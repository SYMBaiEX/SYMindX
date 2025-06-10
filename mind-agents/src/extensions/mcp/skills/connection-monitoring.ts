/**
 * MCP Connection Monitoring Skill
 * 
 * Handles MCP connection monitoring, health checks, and diagnostics.
 */

import { Agent, ExtensionAction, ActionResult, ActionResultType } from '../../../types/agent.js'
import { McpExtension } from '../index.js'

export class ConnectionMonitoringSkill {
  private extension: McpExtension
  private healthCheckInterval?: NodeJS.Timeout
  private connectionMetrics: Map<string, any> = new Map()

  constructor(extension: McpExtension) {
    this.extension = extension
  }

  /**
   * Get all available actions for this skill
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      get_connection_status: {
        name: 'get_connection_status',
        description: 'Get current MCP connection status',
        parameters: {
          detailed: {
            type: 'boolean',
            description: 'Include detailed connection information',
            required: false
          }
        },
        execute: this.getConnectionStatus.bind(this)
      },
      monitor_connections: {
        name: 'monitor_connections',
        description: 'Start monitoring MCP connections',
        parameters: {
          interval: {
            type: 'number',
            description: 'Monitoring interval in milliseconds',
            required: false
          },
          alertThreshold: {
            type: 'number',
            description: 'Alert threshold for connection issues',
            required: false
          }
        },
        execute: this.monitorConnections.bind(this)
      },
      stop_monitoring: {
        name: 'stop_monitoring',
        description: 'Stop connection monitoring',
        parameters: {},
        execute: this.stopMonitoring.bind(this)
      },
      health_check: {
        name: 'health_check',
        description: 'Perform a health check on MCP connections',
        parameters: {
          timeout: {
            type: 'number',
            description: 'Health check timeout in milliseconds',
            required: false
          }
        },
        execute: this.healthCheck.bind(this)
      },
      get_connection_metrics: {
        name: 'get_connection_metrics',
        description: 'Get connection performance metrics',
        parameters: {
          timeRange: {
            type: 'string',
            description: 'Time range for metrics (1h, 24h, 7d)',
            required: false
          }
        },
        execute: this.getConnectionMetrics.bind(this)
      },
      diagnose_connection: {
        name: 'diagnose_connection',
        description: 'Diagnose connection issues',
        parameters: {
          connectionId: {
            type: 'string',
            description: 'Specific connection to diagnose',
            required: false
          }
        },
        execute: this.diagnoseConnection.bind(this)
      },
      test_connection: {
        name: 'test_connection',
        description: 'Test MCP connection with ping/echo',
        parameters: {
          timeout: {
            type: 'number',
            description: 'Test timeout in milliseconds',
            required: false
          },
          payload: {
            type: 'string',
            description: 'Test payload to send',
            required: false
          }
        },
        execute: this.testConnection.bind(this)
      },
      get_connection_logs: {
        name: 'get_connection_logs',
        description: 'Get connection-related logs',
        parameters: {
          level: {
            type: 'string',
            description: 'Log level filter (error, warn, info, debug)',
            required: false
          },
          limit: {
            type: 'number',
            description: 'Maximum number of log entries',
            required: false
          }
        },
        execute: this.getConnectionLogs.bind(this)
      },
      reset_connection_metrics: {
        name: 'reset_connection_metrics',
        description: 'Reset connection metrics and statistics',
        parameters: {},
        execute: this.resetConnectionMetrics.bind(this)
      },
      set_connection_alerts: {
        name: 'set_connection_alerts',
        description: 'Configure connection monitoring alerts',
        parameters: {
          config: {
            type: 'object',
            description: 'Alert configuration',
            required: true
          }
        },
        execute: this.setConnectionAlerts.bind(this)
      }
    }
  }

  /**
   * Get current connection status
   */
  private async getConnectionStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { detailed = false } = params
      
      const status = {
        serverRunning: this.extension.isServerRunning(),
        serverPort: this.extension.getServerPort(),
        uptime: this.extension.getUptime(),
        connections: this.extension.getActiveConnections(),
        lastActivity: this.extension.getLastActivity(),
        status: this.extension.isServerRunning() ? 'healthy' : 'stopped'
      }

      if (detailed) {
        const detailedStatus = {
          ...status,
          serverInfo: this.extension.getServerInfo(),
          capabilities: this.extension.getCapabilities(),
          configuration: this.extension.getConfiguration(),
          performance: {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            activeHandles: process._getActiveHandles().length,
            activeRequests: process._getActiveRequests().length
          },
          metrics: this.getMetricsSummary()
        }
        
        return {
          success: true,
          result: detailedStatus
        }
      }

      return {
        success: true,
        result: status
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get connection status: ${error}`
      }
    }
  }

  /**
   * Start monitoring connections
   */
  private async monitorConnections(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { interval = 30000, alertThreshold = 5 } = params
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
      }

      this.healthCheckInterval = setInterval(async () => {
        try {
          const health = await this.performHealthCheck()
          this.recordMetrics(health)
          
          // Check for alerts
          if (health.issues && health.issues.length >= alertThreshold) {
            this.triggerAlert(health)
          }
        } catch (error) {
          console.error('Health check failed:', error)
        }
      }, interval)

      return {
        success: true,
        result: {
          message: 'Connection monitoring started',
          interval,
          alertThreshold,
          monitoringActive: true
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to start monitoring: ${error}`
      }
    }
  }

  /**
   * Stop connection monitoring
   */
  private async stopMonitoring(agent: Agent, params: any): Promise<ActionResult> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = undefined
      }

      return {
        success: true,
        result: {
          message: 'Connection monitoring stopped',
          monitoringActive: false
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to stop monitoring: ${error}`
      }
    }
  }

  /**
   * Perform health check
   */
  private async healthCheck(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { timeout = 5000 } = params
      
      const health = await this.performHealthCheck(timeout)
      
      return {
        success: true,
        result: health
      }
    } catch (error) {
      return {
        success: false,
        error: `Health check failed: ${error}`
      }
    }
  }

  /**
   * Get connection metrics
   */
  private async getConnectionMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { timeRange = '1h' } = params
      
      const metrics = this.getMetricsForTimeRange(timeRange)
      
      return {
        success: true,
        result: {
          timeRange,
          metrics,
          summary: this.getMetricsSummary(),
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get metrics: ${error}`
      }
    }
  }

  /**
   * Diagnose connection issues
   */
  private async diagnoseConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { connectionId } = params
      
      const diagnosis = await this.performDiagnosis(connectionId)
      
      return {
        success: true,
        result: diagnosis
      }
    } catch (error) {
      return {
        success: false,
        error: `Diagnosis failed: ${error}`
      }
    }
  }

  /**
   * Test connection
   */
  private async testConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { timeout = 5000, payload = 'ping' } = params
      
      if (!this.extension.isServerRunning()) {
        return {
          success: false,
          error: 'MCP server is not running'
        }
      }

      const startTime = Date.now()
      const result = await this.extension.testConnection(payload, timeout)
      const responseTime = Date.now() - startTime

      return {
        success: true,
        result: {
          testSuccessful: result.success,
          responseTime,
          payload,
          response: result.response,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Connection test failed: ${error}`
      }
    }
  }

  /**
   * Get connection logs
   */
  private async getConnectionLogs(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { level, limit = 100 } = params
      
      let logs = this.extension.getConnectionLogs()
      
      // Filter by level if specified
      if (level) {
        logs = logs.filter(log => log.level === level)
      }
      
      // Apply limit
      if (limit > 0) {
        logs = logs.slice(-limit)
      }

      return {
        success: true,
        result: {
          logs: logs.map(log => ({
            timestamp: log.timestamp.toISOString(),
            level: log.level,
            message: log.message,
            data: log.data,
            connectionId: log.connectionId
          })),
          total: logs.length,
          filters: { level, limit }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get logs: ${error}`
      }
    }
  }

  /**
   * Reset connection metrics
   */
  private async resetConnectionMetrics(agent: Agent, params: any): Promise<ActionResult> {
    try {
      this.connectionMetrics.clear()
      this.extension.resetMetrics()
      
      return {
        success: true,
        result: {
          message: 'Connection metrics reset successfully',
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to reset metrics: ${error}`
      }
    }
  }

  /**
   * Set connection alerts
   */
  private async setConnectionAlerts(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { config } = params
      
      if (!config) {
        return {
          success: false,
          error: 'Alert configuration is required'
        }
      }

      this.extension.setAlertConfiguration(config)
      
      return {
        success: true,
        result: {
          message: 'Alert configuration updated',
          config,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to set alerts: ${error}`
      }
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(timeout: number = 5000): Promise<any> {
    const health = {
      timestamp: new Date().toISOString(),
      serverRunning: this.extension.isServerRunning(),
      uptime: this.extension.getUptime(),
      connections: this.extension.getActiveConnections(),
      issues: [] as string[],
      warnings: [] as string[],
      status: 'healthy' as 'healthy' | 'warning' | 'critical'
    }

    // Check server status
    if (!health.serverRunning) {
      health.issues.push('MCP server is not running')
      health.status = 'critical'
    }

    // Check connection count
    if (health.connections === 0) {
      health.warnings.push('No active connections')
      if (health.status === 'healthy') health.status = 'warning'
    }

    // Check uptime
    if (health.uptime < 60000) { // Less than 1 minute
      health.warnings.push('Server recently started')
      if (health.status === 'healthy') health.status = 'warning'
    }

    // Test connection if server is running
    if (health.serverRunning) {
      try {
        const testResult = await this.extension.testConnection('health-check', timeout)
        if (!testResult.success) {
          health.issues.push('Connection test failed')
          health.status = 'critical'
        }
      } catch (error) {
        health.issues.push(`Connection test error: ${error}`)
        health.status = 'critical'
      }
    }

    return health
  }

  /**
   * Record metrics
   */
  private recordMetrics(health: any): void {
    const timestamp = Date.now()
    const metrics = {
      timestamp,
      serverRunning: health.serverRunning,
      connections: health.connections,
      uptime: health.uptime,
      status: health.status,
      issues: health.issues.length,
      warnings: health.warnings.length
    }

    this.connectionMetrics.set(timestamp.toString(), metrics)

    // Keep only last 1000 entries
    if (this.connectionMetrics.size > 1000) {
      const oldestKey = Array.from(this.connectionMetrics.keys())[0]
      this.connectionMetrics.delete(oldestKey)
    }
  }

  /**
   * Get metrics summary
   */
  private getMetricsSummary(): any {
    const metrics = Array.from(this.connectionMetrics.values())
    
    if (metrics.length === 0) {
      return {
        totalRecords: 0,
        averageConnections: 0,
        uptimePercentage: 0,
        issueCount: 0,
        warningCount: 0
      }
    }

    return {
      totalRecords: metrics.length,
      averageConnections: metrics.reduce((sum, m) => sum + m.connections, 0) / metrics.length,
      uptimePercentage: (metrics.filter(m => m.serverRunning).length / metrics.length) * 100,
      issueCount: metrics.reduce((sum, m) => sum + m.issues, 0),
      warningCount: metrics.reduce((sum, m) => sum + m.warnings, 0),
      lastUpdate: new Date(Math.max(...metrics.map(m => m.timestamp))).toISOString()
    }
  }

  /**
   * Get metrics for time range
   */
  private getMetricsForTimeRange(timeRange: string): any[] {
    const now = Date.now()
    let cutoff: number

    switch (timeRange) {
      case '1h':
        cutoff = now - (60 * 60 * 1000)
        break
      case '24h':
        cutoff = now - (24 * 60 * 60 * 1000)
        break
      case '7d':
        cutoff = now - (7 * 24 * 60 * 60 * 1000)
        break
      default:
        cutoff = now - (60 * 60 * 1000) // Default to 1 hour
    }

    return Array.from(this.connectionMetrics.values())
      .filter(metric => metric.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Perform diagnosis
   */
  private async performDiagnosis(connectionId?: string): Promise<any> {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      connectionId,
      checks: [] as any[],
      recommendations: [] as string[],
      severity: 'info' as 'info' | 'warning' | 'error'
    }

    // Server status check
    const serverRunning = this.extension.isServerRunning()
    diagnosis.checks.push({
      name: 'Server Status',
      status: serverRunning ? 'pass' : 'fail',
      message: serverRunning ? 'Server is running' : 'Server is not running'
    })

    if (!serverRunning) {
      diagnosis.recommendations.push('Start the MCP server')
      diagnosis.severity = 'error'
    }

    // Connection count check
    const connections = this.extension.getActiveConnections()
    diagnosis.checks.push({
      name: 'Active Connections',
      status: connections > 0 ? 'pass' : 'warning',
      message: `${connections} active connections`
    })

    if (connections === 0) {
      diagnosis.recommendations.push('Check client connections')
      if (diagnosis.severity === 'info') diagnosis.severity = 'warning'
    }

    // Configuration check
    const config = this.extension.getConfiguration()
    diagnosis.checks.push({
      name: 'Configuration',
      status: config ? 'pass' : 'fail',
      message: config ? 'Configuration loaded' : 'No configuration found'
    })

    if (!config) {
      diagnosis.recommendations.push('Check MCP configuration')
      diagnosis.severity = 'error'
    }

    // Resource availability check
    const memUsage = process.memoryUsage()
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    diagnosis.checks.push({
      name: 'Memory Usage',
      status: memUsagePercent < 80 ? 'pass' : 'warning',
      message: `${memUsagePercent.toFixed(1)}% memory used`
    })

    if (memUsagePercent > 80) {
      diagnosis.recommendations.push('Monitor memory usage')
      if (diagnosis.severity === 'info') diagnosis.severity = 'warning'
    }

    return diagnosis
  }

  /**
   * Trigger alert
   */
  private triggerAlert(health: any): void {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'connection_issues',
      severity: health.status,
      message: `Connection issues detected: ${health.issues.join(', ')}`,
      data: health
    }

    // Log alert
    console.warn('MCP Connection Alert:', alert)
    
    // Emit alert event
    this.extension.emit('alert', alert)
  }
}