/**
 * @module health-monitor
 * @description Comprehensive health check and system monitoring for SYMindX
 */

import { EventEmitter } from 'events';

// import { debugUtilities } from './debug-utilities.js';
// import { errorHandler } from './error-handler.js';
import type {
  Agent,
  Portal,
  MemoryProvider,
  // Extension,
  HealthCheckResult,
  OperationResult,
  LogContext,
} from '../types/index.js';
import { AgentStatus } from '../types/index.js';

import { runtimeLogger } from './logger.js';
import { performanceMonitor } from './performance-monitor.js';

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Health check types
 */
export enum HealthCheckType {
  SYSTEM = 'system',
  AGENT = 'agent',
  PORTAL = 'portal',
  MEMORY = 'memory',
  EXTENSION = 'extension',
  NETWORK = 'network',
  DATABASE = 'database',
  CUSTOM = 'custom',
}

/**
 * Component health interface
 */
export interface ComponentHealth {
  componentId: string;
  componentType: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical' | 'unknown';
  message?: string;
  lastCheck: Date;
  responseTime?: number;
  details?: {
    memoryUsage?: number;
    cpuUsage?: number;
    uptime?: number;
    activeConnections?: number;
    errorCount?: number;
    warningCount?: number;
    lastError?: string;
    lastWarning?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

/**
 * System health result interface
 */
export interface SystemHealthResult {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  message?: string;
  timestamp: Date;
  components: ComponentHealth[];
  metrics: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    criticalChecks: number;
    averageResponseTime: number;
    successRate: number;
  };
  details?: {
    monitoringUptime: number;
    registeredChecks: number;
    enabledChecks: number;
    recentAlerts: HealthAlert[];
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  readonly id: string;
  readonly name: string;
  readonly type: HealthCheckType;
  readonly description: string;
  readonly interval: number; // milliseconds
  readonly timeout: number; // milliseconds
  readonly retries: number;
  readonly enabled: boolean;
  readonly criticalThreshold: number; // 0-1 (1 = always critical)
  readonly degradedThreshold: number; // 0-1 (1 = always degraded)
  readonly dependencies: string[];
  readonly tags: string[];
}

/**
 * Health check function interface
 */
export type HealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * Registered health check
 */
export interface RegisteredHealthCheck {
  readonly config: HealthCheckConfig;
  readonly checkFunction: HealthCheckFunction;
  lastResult?: HealthCheckResult | undefined;
  lastRun?: Date | undefined;
  consecutiveFailures: number;
  enabled: boolean;
}

/**
 * System component health details
 * Using ComponentHealth from types/helpers.ts
 */

/**
 * Health alert configuration
 */
export interface HealthAlert {
  readonly id: string;
  readonly checkId: string;
  readonly status: HealthStatus;
  readonly message: string;
  readonly details: {
    componentId?: string;
    componentType?: string;
    errorCode?: string;
    errorMessage?: string;
    failureCount?: number;
    lastFailure?: Date;
    suggestion?: string;
    affectedResources?: string[];
    [key: string]: string | number | boolean | Date | string[] | undefined;
  };
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Health trend data
 */
export interface HealthTrend {
  readonly timestamp: Date;
  readonly status: HealthStatus;
  readonly responseTime: number;
  readonly metadata?: {
    checkId?: string;
    componentId?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    errorCount?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

/**
 * Health dashboard metrics
 */
export interface HealthDashboard {
  readonly overall: HealthStatus;
  readonly timestamp: Date;
  readonly uptime: number;
  readonly components: ComponentHealth[];
  readonly recentAlerts: HealthAlert[];
  readonly trends: Map<string, HealthTrend[]>;
  readonly metrics: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    criticalChecks: number;
    averageResponseTime: number;
    failureRate: number;
  };
}

/**
 * Comprehensive health monitoring system
 */
export class HealthMonitor extends EventEmitter {
  private static instance: HealthMonitor;

  private readonly checks = new Map<string, RegisteredHealthCheck>();
  private readonly alerts = new Map<string, HealthAlert>();
  private readonly trends = new Map<string, HealthTrend[]>();

  private monitoringInterval?: NodeJS.Timeout; // eslint-disable-line no-undef
  private alertInterval?: NodeJS.Timeout; // eslint-disable-line no-undef
  private startTime = new Date();

  private readonly config = {
    defaultInterval: 30000, // 30 seconds
    defaultTimeout: 5000, // 5 seconds
    defaultRetries: 3,
    maxTrendHistory: 1000,
    alertCheckInterval: 5000, // 5 seconds
    enableAlerts: true,
    enableTrends: true,
  };

  private constructor() {
    super();
    this.initializeDefaultChecks();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Start health monitoring
   */
  public start(): void {
    if (this.monitoringInterval) {
      return; // Already started
    }

    this.monitoringInterval = setInterval(() => {
      this.runAllChecks().catch((error) => {
        runtimeLogger.error(
          'Health monitoring error:',
          error as Error,
          {} as LogContext
        );
      });
    }, this.config.defaultInterval);

    if (this.config.enableAlerts) {
      this.alertInterval = setInterval(() => {
        this.processAlerts();
      }, this.config.alertCheckInterval);
    }

    this.emit('monitoring_started');
    runtimeLogger.info('Health monitoring started', {
      metadata: {
        checksRegistered: this.checks.size,
        interval: this.config.defaultInterval,
      },
    } as LogContext);
  }

  /**
   * Stop health monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null as any;
    }

    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null as any;
    }

    this.emit('monitoring_stopped');
    runtimeLogger.info('Health monitoring stopped');
  }

  /**
   * Register a health check
   */
  public registerCheck(
    config: HealthCheckConfig,
    checkFunction: HealthCheckFunction
  ): OperationResult {
    try {
      const registeredCheck: RegisteredHealthCheck = {
        config,
        checkFunction,
        consecutiveFailures: 0,
        enabled: config.enabled,
      };

      this.checks.set(config.id, registeredCheck);

      this.emit('check_registered', { checkId: config.id, config });

      runtimeLogger.info(`Health check registered: ${config.name}`, {
        metadata: {
          checkId: config.id,
          type: config.type,
          interval: config.interval,
        },
      } as LogContext);

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Unregister a health check
   */
  public unregisterCheck(checkId: string): OperationResult {
    const existed = this.checks.delete(checkId);

    if (existed) {
      this.trends.delete(checkId);
      this.emit('check_unregistered', { checkId });
      runtimeLogger.info(`Health check unregistered: ${checkId}`);
    }

    return existed
      ? {
          success: true,
          timestamp: new Date(),
        }
      : {
          success: false,
          error: 'Health check not found',
          timestamp: new Date(),
        };
  }

  /**
   * Run a specific health check
   */
  public async runCheck(checkId: string): Promise<HealthCheckResult> {
    const check = this.checks.get(checkId);
    if (!check) {
      throw new Error(`Health check '${checkId}' not found`);
    }

    if (!check.enabled) {
      return {
        healthy: false,
        status: HealthStatus.UNKNOWN as
          | 'healthy'
          | 'degraded'
          | 'unhealthy'
          | 'unknown',
        message: 'Health check is disabled',
        timestamp: new Date(),
        checkId,
        componentId: checkId,
        details: {
          message: 'Health check is disabled',
          enabled: false,
        },
      };
    }

    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= check.config.retries) {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Health check timeout')),
            check.config.timeout
          );
        });

        const result = await Promise.race([
          check.checkFunction(),
          timeoutPromise,
        ]);

        const responseTime = Date.now() - startTime;

        // Enhance result with metadata
        const enhancedResult: HealthCheckResult = {
          ...result,
          checkId,
          componentId: result.componentId || checkId,
          timestamp: new Date(),
          responseTime,
          attempt: attempt + 1,
          details: {
            ...result.details,
            responseTime,
            retries: attempt,
          },
        };

        // Update check state
        check.lastResult = enhancedResult;
        check.lastRun = new Date();
        check.consecutiveFailures = enhancedResult.healthy
          ? 0
          : check.consecutiveFailures + 1;

        // Record trend data
        if (this.config.enableTrends) {
          this.recordTrend(checkId, enhancedResult);
        }

        this.emit('check_completed', { checkId, result: enhancedResult });

        return enhancedResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt <= check.config.retries) {
          await this.sleep(1000); // Wait 1 second before retry
        }
      }
    }

    // All attempts failed
    const responseTime = Date.now() - startTime;
    const failedResult: HealthCheckResult = {
      healthy: false,
      status: HealthStatus.UNHEALTHY as
        | 'healthy'
        | 'degraded'
        | 'unhealthy'
        | 'unknown',
      message: `Health check failed after ${check.config.retries + 1} attempts: ${lastError?.message}`,
      timestamp: new Date(),
      checkId,
      componentId: checkId,
      responseTime,
      attempt,
      ...(lastError?.message ? { error: lastError.message } : {}),
      details: {
        message: `Health check failed after ${check.config.retries + 1} attempts: ${lastError?.message}`,
        responseTime,
        retries: attempt - 1,
        ...(lastError?.message ? { errors: [lastError.message] } : {}),
      },
    };

    // Update check state
    check.lastResult = failedResult;
    check.lastRun = new Date();
    check.consecutiveFailures++;

    // Record trend data
    if (this.config.enableTrends) {
      this.recordTrend(checkId, failedResult);
    }

    this.emit('check_failed', { checkId, result: failedResult });

    return failedResult;
  }

  /**
   * Run all registered health checks
   */
  public async runAllChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const checkPromises: Promise<void>[] = [];

    for (const [checkId, check] of this.checks) {
      if (!check.enabled) {
        continue;
      }

      const promise = this.runCheck(checkId)
        .then((result) => {
          results.set(checkId, result);
        })
        .catch((error) => {
          const errorResult: HealthCheckResult = {
            healthy: false,
            status: HealthStatus.CRITICAL as
              | 'healthy'
              | 'degraded'
              | 'unhealthy'
              | 'unknown',
            message: `Health check execution error: ${error.message}`,
            timestamp: new Date(),
            checkId,
            componentId: checkId,
            details: {
              message: `Health check execution error: ${error.message}`,
              errors: [error.message],
            },
            error: error.message,
          };
          results.set(checkId, errorResult);
        });

      checkPromises.push(promise);
    }

    await Promise.all(checkPromises);

    this.emit('all_checks_completed', { results });

    return results;
  }

  /**
   * Get recent alerts
   */
  private getRecentAlerts(limit: number): HealthAlert[] {
    const alerts = Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return alerts;
  }

  /**
   * Get overall system health
   */
  public async getSystemHealth(): Promise<SystemHealthResult> {
    const checkResults = await this.runAllChecks();
    const components: ComponentHealth[] = [];

    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    const criticalCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [checkId, result] of checkResults) {
      const check = this.checks.get(checkId);
      if (!check) continue;

      // Count status distribution
      switch (result.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'degraded':
          degradedCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          break;
        case 'unknown':
          // Count unknown as unhealthy for safety
          unhealthyCount++;
          break;
      }

      // Calculate average response time
      if (result.responseTime) {
        totalResponseTime += result.responseTime;
        responseTimeCount++;
      }

      // Create component health
      const componentHealth: ComponentHealth = {
        componentId: checkId,
        componentType: check.config.type,
        status: this.convertHealthStatusToComponentString(
          this.convertStringToHealthStatus(result.status)
        ),
        message: result.message,
        lastCheck: result.timestamp,
        responseTime: result.responseTime || 0,
        details: {
          uptime: this.calculateUptime(checkId),
          errorCount: result.details?.errors?.length || 0,
          warningCount: result.details?.warnings?.length || 0,
          ...(typeof result.details?.memory === 'number' ? { memoryUsage: result.details.memory } : {}),
          ...(typeof result.details?.cpu === 'number' ? { cpuUsage: result.details.cpu } : {}),
          ...(result.details?.errors?.[0] ? { lastError: result.details.errors[0] as string } : {}),
          ...(result.details?.warnings?.[0] ? { lastWarning: result.details.warnings[0] as string } : {}),
        },
      };

      components.push(componentHealth);
    }

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    if (criticalCount > 0) {
      overallStatus = HealthStatus.CRITICAL;
    } else if (unhealthyCount > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      overallStatus = HealthStatus.DEGRADED;
    }

    const systemHealth: SystemHealthResult = {
      healthy: overallStatus === HealthStatus.HEALTHY,
      status: this.convertHealthStatusToComponentString(overallStatus),
      timestamp: new Date(),
      components,
      metrics: {
        totalChecks: checkResults.size,
        healthyChecks: healthyCount,
        degradedChecks: degradedCount,
        unhealthyChecks: unhealthyCount,
        criticalChecks: criticalCount,
        averageResponseTime:
          responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
        successRate:
          checkResults.size > 0 ? healthyCount / checkResults.size : 0,
      },
      details: {
        monitoringUptime: Date.now() - this.startTime.getTime(),
        registeredChecks: this.checks.size,
        enabledChecks: Array.from(this.checks.values()).filter((c) => c.enabled)
          .length,
        recentAlerts: this.getRecentAlerts(10),
      },
    };

    this.emit('system_health_calculated', { health: systemHealth });

    return systemHealth;
  }

  /**
   * Get health dashboard data
   */
  public async getHealthDashboard(): Promise<HealthDashboard> {
    const systemHealth = await this.getSystemHealth();

    return {
      overall:
        systemHealth.status === 'healthy'
          ? HealthStatus.HEALTHY
          : systemHealth.status === 'degraded'
            ? HealthStatus.DEGRADED
            : systemHealth.status === 'unhealthy'
              ? HealthStatus.UNHEALTHY
              : HealthStatus.UNHEALTHY,
      timestamp: systemHealth.timestamp,
      uptime:
        systemHealth.details?.monitoringUptime ||
        Date.now() - this.startTime.getTime(),
      components: systemHealth.components,
      recentAlerts: this.getRecentAlerts(20),
      trends: new Map(this.trends),
      metrics: {
        totalChecks: systemHealth.metrics.totalChecks,
        healthyChecks: systemHealth.metrics.healthyChecks,
        degradedChecks: systemHealth.metrics.degradedChecks,
        unhealthyChecks: systemHealth.metrics.unhealthyChecks,
        criticalChecks: systemHealth.metrics.criticalChecks,
        averageResponseTime: systemHealth.metrics.averageResponseTime,
        failureRate: 1 - systemHealth.metrics.successRate,
      },
    };
  }

  /**
   * Register agent health check
   */
  public registerAgentCheck(agent: Agent): OperationResult {
    const config: HealthCheckConfig = {
      id: `agent_${agent.id}`,
      name: `Agent ${agent.name}`,
      type: HealthCheckType.AGENT,
      description: `Health check for agent ${agent.name}`,
      interval: 60000, // 1 minute
      timeout: 10000, // 10 seconds
      retries: 2,
      enabled: true,
      criticalThreshold: 0.8,
      degradedThreshold: 0.6,
      dependencies: [],
      tags: ['agent', agent.id],
    };

    const checkFunction: HealthCheckFunction =
      async (): Promise<HealthCheckResult> => {
        try {
          // Check agent status
          const isActive =
            agent.status === AgentStatus.ACTIVE ||
            agent.status === AgentStatus.IDLE;
          const hasMemory = agent.memory !== undefined;
          const hasEmotion = agent.emotion !== undefined;
          const hasCognition = agent.cognition !== undefined;

          // Get agent metrics if available
          const metrics = performanceMonitor.getAgentMetrics(agent.id);

          const details = {
            status: agent.status,
            hasMemory,
            hasEmotion,
            hasCognition,
            extensionCount: agent.extensions?.length || 0,
            lastUpdate: agent.lastUpdate,
            metrics: metrics
              ? {
                  averageThinkTime: metrics.thinkTime.average,
                  averageResponseTime: metrics.responseTime.average,
                  actionCount: metrics.actionCount,
                  errorCount: metrics.errorCount,
                }
              : null,
          };

          let status = HealthStatus.HEALTHY;
          let message = `Agent ${agent.name} is healthy`;

          if (!isActive) {
            status = HealthStatus.UNHEALTHY;
            message = `Agent ${agent.name} is not active (status: ${agent.status})`;
          } else if (!hasMemory || !hasEmotion || !hasCognition) {
            status = HealthStatus.DEGRADED;
            message = `Agent ${agent.name} is missing core modules`;
          } else if (metrics && metrics.errorCount > 10) {
            status = HealthStatus.DEGRADED;
            message = `Agent ${agent.name} has high error count: ${metrics.errorCount}`;
          }

          return {
            healthy: status === HealthStatus.HEALTHY,
            status: this.convertHealthStatusToString(status),
            message,
            timestamp: new Date(),
            componentId: `agent_${agent.id}`,
            details: {
              message,
              ...details,
            },
          };
        } catch (error) {
          return {
            healthy: false,
            status: this.convertHealthStatusToString(HealthStatus.CRITICAL),
            message: `Agent health check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            componentId: `agent_${agent.id}`,
            details: {
              memoryUsage: undefined,
              cpuUsage: undefined,
              uptime: undefined,
              activeConnections: undefined,
              errorCount: 1,
              warningCount: 0,
              lastError: error instanceof Error ? error.message : String(error),
            },
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

    return this.registerCheck(config, checkFunction);
  }

  /**
   * Register portal health check
   */
  public registerPortalCheck(portal: Portal): OperationResult {
    const config: HealthCheckConfig = {
      id: `portal_${portal.id}`,
      name: `Portal ${portal.name}`,
      type: HealthCheckType.PORTAL,
      description: `Health check for portal ${portal.name}`,
      interval: 120000, // 2 minutes
      timeout: 15000, // 15 seconds
      retries: 3,
      enabled: true,
      criticalThreshold: 0.9,
      degradedThreshold: 0.7,
      dependencies: [],
      tags: ['portal', portal.type],
    };

    const checkFunction: HealthCheckFunction =
      async (): Promise<HealthCheckResult> => {
        try {
          // Check portal availability
          const isEnabled = portal.enabled;

          // Test basic functionality if health check method exists
          let functionalityTest = true;
          let healthCheckError: string | undefined;
          if (portal.healthCheck) {
            try {
              functionalityTest = await portal.healthCheck();
            } catch (error) {
              functionalityTest = false;
              healthCheckError =
                error instanceof Error ? error.message : String(error);
            }
          }

          const details: ComponentHealth['details'] = {
            memoryUsage: undefined,
            cpuUsage: undefined,
            uptime: undefined,
            activeConnections: undefined,
            errorCount: functionalityTest ? 0 : 1,
            warningCount: 0,
            lastError: healthCheckError,
          };

          let status = HealthStatus.HEALTHY;
          let message = `Portal ${portal.name} is healthy`;

          if (!isEnabled) {
            status = HealthStatus.UNHEALTHY;
            message = `Portal ${portal.name} is disabled`;
          } else if (!functionalityTest) {
            status = HealthStatus.DEGRADED;
            message = `Portal ${portal.name} failed functionality test${healthCheckError ? `: ${healthCheckError}` : ''}`;
          }

          return {
            healthy: status === HealthStatus.HEALTHY,
            status: this.convertHealthStatusToString(status),
            message,
            timestamp: new Date(),
            componentId: `portal_${portal.id}`,
            details: {
              message,
              ...details,
            },
          };
        } catch (error) {
          return {
            healthy: false,
            status: this.convertHealthStatusToString(HealthStatus.CRITICAL),
            message: `Portal health check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            componentId: `portal_${portal.id}`,
            details: {
              memoryUsage: undefined,
              cpuUsage: undefined,
              uptime: undefined,
              activeConnections: undefined,
              errorCount: 1,
              warningCount: 0,
              lastError: error instanceof Error ? error.message : String(error),
            },
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

    return this.registerCheck(config, checkFunction);
  }

  /**
   * Register memory provider health check
   */
  public registerMemoryCheck(
    memoryProvider: MemoryProvider,
    providerId: string
  ): OperationResult {
    const config: HealthCheckConfig = {
      id: `memory_${providerId}`,
      name: `Memory Provider ${providerId}`,
      type: HealthCheckType.MEMORY,
      description: `Health check for memory provider ${providerId}`,
      interval: 90000, // 1.5 minutes
      timeout: 10000, // 10 seconds
      retries: 2,
      enabled: true,
      criticalThreshold: 0.8,
      degradedThreshold: 0.6,
      dependencies: [],
      tags: ['memory', providerId],
    };

    const checkFunction: HealthCheckFunction =
      async (): Promise<HealthCheckResult> => {
        try {
          // Test memory provider basic functionality by trying to retrieve recent memories
          let functionalityTest = true;
          let testError: string | undefined;

          try {
            // Simple test: try to retrieve recent memories
            await memoryProvider.retrieve('health_check_test', 'recent', 1);
          } catch (error) {
            functionalityTest = false;
            testError = error instanceof Error ? error.message : String(error);
          }

          const details: ComponentHealth['details'] = {
            memoryUsage: undefined,
            cpuUsage: undefined,
            uptime: undefined,
            activeConnections: undefined,
            errorCount: functionalityTest ? 0 : 1,
            warningCount: 0,
            lastError: testError,
          };

          let status = HealthStatus.HEALTHY;
          let message = `Memory provider ${providerId} is healthy`;

          if (!functionalityTest) {
            status = HealthStatus.UNHEALTHY;
            message = `Memory provider ${providerId} health check failed${testError ? `: ${testError}` : ''}`;
          }

          return {
            healthy: functionalityTest,
            status: this.convertHealthStatusToString(status),
            message,
            timestamp: new Date(),
            componentId: `memory_${providerId}`,
            details,
          };
        } catch (error) {
          return {
            healthy: false,
            status: this.convertHealthStatusToString(HealthStatus.CRITICAL),
            message: `Memory provider health check failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date(),
            componentId: `memory_${providerId}`,
            details: {
              memoryUsage: undefined,
              cpuUsage: undefined,
              uptime: undefined,
              activeConnections: undefined,
              errorCount: 1,
              warningCount: 0,
              lastError: error instanceof Error ? error.message : String(error),
            },
            error: error instanceof Error ? error.message : String(error),
          };
        }
      };

    return this.registerCheck(config, checkFunction);
  }

  /**
   * Get all registered checks
   */
  public getRegisteredChecks(): Map<string, RegisteredHealthCheck> {
    return new Map(this.checks);
  }

  /**
   * Get trend data for a specific check
   */
  public getTrendData(checkId: string, limit: number = 100): HealthTrend[] {
    const trends = this.trends.get(checkId) || [];
    return trends.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): OperationResult {
    const alert = this.alerts.get(alertId);
    if (alert) {
      (alert as any).resolved = true;
      this.emit('alert_acknowledged', { alertId, alert });
      return { success: true, timestamp: new Date() };
    }
    return { success: false, error: 'Alert not found', timestamp: new Date() };
  }

  /**
   * Clear all health data
   */
  public clearData(): void {
    this.alerts.clear();
    this.trends.clear();

    // Reset check states
    for (const check of this.checks.values()) {
      check.lastResult = undefined;
      check.lastRun = undefined;
      check.consecutiveFailures = 0;
    }

    this.emit('data_cleared');
    runtimeLogger.info('Health monitoring data cleared');
  }

  /**
   * Export health data
   */
  public exportHealthData(): {
    checks: Array<RegisteredHealthCheck & { id: string }>;
    alerts: HealthAlert[];
    trends: Record<string, HealthTrend[]>;
    metadata: {
      exportTime: Date;
      monitoringUptime: number;
      totalChecksRun: number;
    };
  } {
    return {
      checks: Array.from(this.checks.entries()).map(([id, check]) => ({
        ...check,
        id,
      })),
      alerts: Array.from(this.alerts.values()),
      trends: Object.fromEntries(this.trends),
      metadata: {
        exportTime: new Date(),
        monitoringUptime: Date.now() - this.startTime.getTime(),
        totalChecksRun: Array.from(this.checks.values()).reduce(
          (sum, check) => sum + (check.lastRun ? 1 : 0),
          0
        ),
      },
    };
  }

  /**
   * Initialize default system health checks
   */
  private initializeDefaultChecks(): void {
    // System memory check
    this.registerCheck(
      {
        id: 'system_memory',
        name: 'System Memory',
        type: HealthCheckType.SYSTEM,
        description: 'Monitor system memory usage',
        interval: 30000,
        timeout: 5000,
        retries: 1,
        enabled: true,
        criticalThreshold: 0.9,
        degradedThreshold: 0.8,
        dependencies: [],
        tags: ['system', 'memory'],
      },
      async () => {
        const memory = process.memoryUsage();
        const usage = memory.heapUsed / memory.heapTotal;

        let status = HealthStatus.HEALTHY;
        let message = 'Memory usage is normal';

        if (usage > 0.9) {
          status = HealthStatus.CRITICAL;
          message = 'Memory usage is critically high';
        } else if (usage > 0.8) {
          status = HealthStatus.DEGRADED;
          message = 'Memory usage is high';
        }

        return {
          healthy: status === HealthStatus.HEALTHY,
          status: this.convertHealthStatusToString(status),
          message,
          timestamp: new Date(),
          componentId: 'system_memory',
          details: {
            message,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            usage: usage * 100,
            memory: memory.heapUsed,
          },
        };
      }
    );

    // System uptime check
    this.registerCheck(
      {
        id: 'system_uptime',
        name: 'System Uptime',
        type: HealthCheckType.SYSTEM,
        description: 'Monitor system uptime',
        interval: 60000,
        timeout: 1000,
        retries: 1,
        enabled: true,
        criticalThreshold: 0,
        degradedThreshold: 0,
        dependencies: [],
        tags: ['system', 'uptime'],
      },
      async () => {
        const uptime = process.uptime();

        return {
          healthy: true,
          status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
          message: `System has been running for ${Math.floor(uptime / 3600)} hours`,
          timestamp: new Date(),
          componentId: 'system_uptime',
          details: {
            message: `System has been running for ${Math.floor(uptime / 3600)} hours`,
            uptime,
            uptimeHours: uptime / 3600,
          },
        };
      }
    );

    // Event loop lag check
    this.registerCheck(
      {
        id: 'event_loop_lag',
        name: 'Event Loop Lag',
        type: HealthCheckType.SYSTEM,
        description: 'Monitor Node.js event loop lag',
        interval: 30000,
        timeout: 5000,
        retries: 1,
        enabled: true,
        criticalThreshold: 100, // 100ms
        degradedThreshold: 50, // 50ms
        dependencies: [],
        tags: ['system', 'performance'],
      },
      async () => {
        const start = process.hrtime.bigint();
        // eslint-disable-next-line no-undef
        await new Promise((resolve) => setImmediate(resolve));
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds

        let status = HealthStatus.HEALTHY;
        let message = 'Event loop lag is normal';

        if (lag > 100) {
          status = HealthStatus.CRITICAL;
          message = 'Event loop lag is critically high';
        } else if (lag > 50) {
          status = HealthStatus.DEGRADED;
          message = 'Event loop lag is high';
        }

        return {
          healthy: status === HealthStatus.HEALTHY,
          status: this.convertHealthStatusToString(status),
          message,
          timestamp: new Date(),
          componentId: 'event_loop_lag',
          details: {
            message,
            responseTime: lag,
          },
        };
      }
    );
  }

  /**
   * Record trend data for a health check
   */
  private recordTrend(checkId: string, result: HealthCheckResult): void {
    if (!this.trends.has(checkId)) {
      this.trends.set(checkId, []);
    }

    const trends = this.trends.get(checkId)!;

    trends.push({
      timestamp: result.timestamp,
      status: this.convertStringToHealthStatus(result.status),
      responseTime: result.responseTime || 0,
      metadata: {
        checkId,
        memoryUsage: result.details?.memory as number | undefined,
        cpuUsage: result.details?.cpu as number | undefined,
        errorCount: result.details?.errors?.length as number | undefined,
      },
    });

    // Limit trend history
    if (trends.length > this.config.maxTrendHistory) {
      trends.splice(0, trends.length - this.config.maxTrendHistory);
    }
  }

  /**
   * Process alerts based on health check results
   */
  private processAlerts(): void {
    if (!this.config.enableAlerts) {
      return;
    }

    for (const [checkId, check] of this.checks) {
      if (!check.lastResult || !check.enabled) {
        continue;
      }

      const result = check.lastResult;
      const resultStatus = this.convertStringToHealthStatus(result.status);
      const alertId = `${checkId}_${result.status}`;

      // Check if we should create an alert
      if (resultStatus !== HealthStatus.HEALTHY) {
        const existingAlert = this.alerts.get(alertId);

        if (!existingAlert || existingAlert.resolved) {
          const severity = this.determineSeverity(resultStatus);

          const alert: HealthAlert = {
            id: alertId,
            checkId,
            status: resultStatus,
            message:
              result.details?.message ||
              result.message ||
              'Health check failed',
            details: {
              componentId: check.config.id,
              componentType: check.config.type,
              errorMessage: result.details?.errors?.[0] as string | undefined,
              failureCount: 1,
              lastFailure: new Date(),
            },
            timestamp: new Date(),
            resolved: false,
            severity,
          };

          this.alerts.set(alertId, alert);
          this.emit('alert_created', { alert });

          runtimeLogger.warn(`Health alert created: ${alert.message}`, {
            metadata: {
              checkId,
              status: resultStatus,
              severity,
            },
          } as LogContext);
        }
      } else {
        // Check is healthy, resolve any existing alerts
        const existingAlert = this.alerts.get(alertId);
        if (existingAlert && !existingAlert.resolved) {
          (existingAlert as any).resolved = true;
          this.emit('alert_resolved', { alert: existingAlert });

          runtimeLogger.info(
            `Health alert resolved: ${existingAlert.message}`,
            {
              metadata: { checkId, alertId },
            } as LogContext
          );
        }
      }
    }
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(
    status: HealthStatus
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (status) {
      case HealthStatus.CRITICAL:
        return 'critical';
      case HealthStatus.UNHEALTHY:
        return 'high';
      case HealthStatus.DEGRADED:
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Calculate uptime percentage for a check
   */
  private calculateUptime(checkId: string): number {
    const trends = this.trends.get(checkId);
    if (!trends || trends.length === 0) {
      return 100;
    }

    const healthyCount = trends.filter(
      (t) => t.status === HealthStatus.HEALTHY
    ).length;
    return (healthyCount / trends.length) * 100;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Convert HealthStatus enum to string
   */
  private convertHealthStatusToString(
    status: HealthStatus
  ): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'healthy';
      case HealthStatus.DEGRADED:
        return 'degraded';
      case HealthStatus.UNHEALTHY:
        return 'unhealthy';
      case HealthStatus.CRITICAL:
        return 'unhealthy'; // Map critical to unhealthy for string interface
      case HealthStatus.UNKNOWN:
      default:
        return 'unknown';
    }
  }

  /**
   * Convert HealthStatus enum to ComponentHealth status
   */
  private convertHealthStatusToComponentString(
    status: HealthStatus
  ): 'healthy' | 'degraded' | 'unhealthy' | 'critical' {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'healthy';
      case HealthStatus.DEGRADED:
        return 'degraded';
      case HealthStatus.UNHEALTHY:
        return 'unhealthy';
      case HealthStatus.CRITICAL:
        return 'critical';
      case HealthStatus.UNKNOWN:
      default:
        return 'unhealthy'; // Map unknown to unhealthy for component interface
    }
  }

  /**
   * Convert string status to HealthStatus enum
   */
  private convertStringToHealthStatus(status: string): HealthStatus {
    switch (status) {
      case 'healthy':
        return HealthStatus.HEALTHY;
      case 'degraded':
        return HealthStatus.DEGRADED;
      case 'unhealthy':
        return HealthStatus.UNHEALTHY;
      case 'unknown':
      default:
        return HealthStatus.UNKNOWN;
    }
  }
}

/**
 * Global health monitor instance
 */
export const healthMonitor = HealthMonitor.getInstance();

/**
 * Convenience functions for creating health checks
 */
export const createSystemHealthCheck = (
  id: string,
  name: string,
  checkFunction: HealthCheckFunction,
  options: Partial<HealthCheckConfig> = {}
) => {
  const config: HealthCheckConfig = {
    id,
    name,
    type: HealthCheckType.SYSTEM,
    description: `System health check: ${name}`,
    interval: 30000,
    timeout: 5000,
    retries: 2,
    enabled: true,
    criticalThreshold: 0.8,
    degradedThreshold: 0.6,
    dependencies: [],
    tags: ['system'],
    ...options,
  };

  return healthMonitor.registerCheck(config, checkFunction);
};

export const createCustomHealthCheck = (
  id: string,
  name: string,
  checkFunction: HealthCheckFunction,
  options: Partial<HealthCheckConfig> = {}
) => {
  const config: HealthCheckConfig = {
    id,
    name,
    type: HealthCheckType.CUSTOM,
    description: `Custom health check: ${name}`,
    interval: 60000,
    timeout: 10000,
    retries: 3,
    enabled: true,
    criticalThreshold: 0.8,
    degradedThreshold: 0.6,
    dependencies: [],
    tags: ['custom'],
    ...options,
  };

  return healthMonitor.registerCheck(config, checkFunction);
};

/**
 * Health check decorator for automatic registration
 */
export function healthCheck(
  name: string,
  type: HealthCheckType = HealthCheckType.CUSTOM,
  options: Partial<HealthCheckConfig> = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const checkId = `${target.constructor.name}_${propertyKey}`;

    const config: HealthCheckConfig = {
      id: checkId,
      name,
      type,
      description: `Health check for ${target.constructor.name}.${propertyKey}`,
      interval: 60000,
      timeout: 10000,
      retries: 2,
      enabled: true,
      criticalThreshold: 0.8,
      degradedThreshold: 0.6,
      dependencies: [],
      tags: ['decorated'],
      ...options,
    };

    // Register the health check
    healthMonitor.registerCheck(config, originalMethod.bind(target));

    return descriptor;
  };
}
