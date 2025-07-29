/**
 * @module observability/observability-manager
 * @description Central orchestrator for the SYMindX observability system
 * 
 * Coordinates all observability components including logging, metrics,
 * tracing, health monitoring, and alerting with intelligent overhead management.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

import type {
  ObservabilityConfig,
  ObservabilityMetrics,
  TraceContext,
  ObservabilityEvent,
  ObservabilityHooks,
  ObservabilityMiddleware,
  DashboardData,
} from './types.js';
import {
  DEFAULT_OBSERVABILITY_CONFIG,
  OBSERVABILITY_CONSTANTS,
  ENVIRONMENT_CONFIGS,
} from './constants.js';
import { TracingSystem } from './tracing-system.js';
import { MetricsCollector } from './metrics-collector.js';
import { AlertingSystem } from './alerting-system.js';
import { runtimeLogger } from '../../utils/logger.js';
import { healthMonitor } from '../../utils/health-monitor.js';
import { performanceMonitor } from '../../utils/performance-monitor.js';

/**
 * Observability overhead tracker
 */
class OverheadTracker {
  private overheadSamples: number[] = [];
  private readonly maxSamples = 1000;
  private totalOperations = 0;
  private totalOverhead = 0;

  /**
   * Record overhead measurement
   */
  public recordOverhead(overheadMs: number): void {
    this.overheadSamples.push(overheadMs);
    this.totalOperations++;
    this.totalOverhead += overheadMs;

    // Limit sample history
    if (this.overheadSamples.length > this.maxSamples) {
      const removed = this.overheadSamples.shift()!;
      this.totalOverhead -= removed;
      this.totalOperations--;
    }
  }

  /**
   * Get current overhead statistics
   */
  public getStatistics(): {
    averageMs: number;
    maxMs: number;
    minMs: number;
    p95Ms: number;
    totalOperations: number;
    withinThreshold: boolean;
  } {
    if (this.overheadSamples.length === 0) {
      return {
        averageMs: 0,
        maxMs: 0,
        minMs: 0,
        p95Ms: 0,
        totalOperations: 0,
        withinThreshold: true,
      };
    }

    const sorted = [...this.overheadSamples].sort((a, b) => a - b);
    const average = this.totalOverhead / this.totalOperations;
    const max = Math.max(...this.overheadSamples);
    const min = Math.min(...this.overheadSamples);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || 0;

    return {
      averageMs: average,
      maxMs: max,
      minMs: min,
      p95Ms: p95,
      totalOperations: this.totalOperations,
      withinThreshold: p95 <= OBSERVABILITY_CONSTANTS.PERFORMANCE_THRESHOLDS.MAX_OBSERVABILITY_OVERHEAD_MS,
    };
  }

  /**
   * Check if overhead is excessive
   */
  public isOverheadExcessive(): boolean {
    const stats = this.getStatistics();
    return !stats.withinThreshold && stats.totalOperations > 100;
  }

  /**
   * Reset overhead tracking
   */
  public reset(): void {
    this.overheadSamples = [];
    this.totalOperations = 0;
    this.totalOverhead = 0;
  }
}

/**
 * Middleware manager for observability hooks
 */
class MiddlewareManager {
  private middlewares: ObservabilityMiddleware[] = [];

  /**
   * Register middleware
   */
  public register(middleware: ObservabilityMiddleware): void {
    this.middlewares.push(middleware);
    this.middlewares.sort((a, b) => a.priority - b.priority);
    
    runtimeLogger.debug(`Observability middleware registered: ${middleware.name}`, {
      metadata: { priority: middleware.priority, enabled: middleware.enabled },
    });
  }

  /**
   * Unregister middleware
   */
  public unregister(name: string): boolean {
    const index = this.middlewares.findIndex(m => m.name === name);
    if (index >= 0) {
      this.middlewares.splice(index, 1);
      runtimeLogger.debug(`Observability middleware unregistered: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Execute before operation hooks
   */
  public async executeBeforeHooks(
    context: TraceContext,
    operation: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.enabled && middleware.hooks.beforeOperation) {
        try {
          await middleware.hooks.beforeOperation(context, operation, metadata);
        } catch (error) {
          runtimeLogger.error(
            `Middleware beforeOperation hook failed: ${middleware.name}`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * Execute after operation hooks
   */
  public async executeAfterHooks(
    context: TraceContext,
    operation: string,
    result: unknown,
    duration: number
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.enabled && middleware.hooks.afterOperation) {
        try {
          await middleware.hooks.afterOperation(context, operation, result, duration);
        } catch (error) {
          runtimeLogger.error(
            `Middleware afterOperation hook failed: ${middleware.name}`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * Execute error hooks
   */
  public async executeErrorHooks(
    context: TraceContext,
    operation: string,
    error: Error,
    duration: number
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.enabled && middleware.hooks.onError) {
        try {
          await middleware.hooks.onError(context, operation, error, duration);
        } catch (hookError) {
          runtimeLogger.error(
            `Middleware onError hook failed: ${middleware.name}`,
            hookError as Error
          );
        }
      }
    }
  }

  /**
   * Get registered middlewares
   */
  public getMiddlewares(): ObservabilityMiddleware[] {
    return [...this.middlewares];
  }
}

/**
 * Main observability manager
 */
export class ObservabilityManager extends EventEmitter {
  private static instance: ObservabilityManager;

  private config: ObservabilityConfig;
  private tracingSystem: TracingSystem;
  private metricsCollector: MetricsCollector;
  private alertingSystem: AlertingSystem;
  private overheadTracker: OverheadTracker;
  private middlewareManager: MiddlewareManager;
  
  private enabled = true;
  private startTime = new Date();
  private shutdownInProgress = false;

  private constructor(config: ObservabilityConfig = DEFAULT_OBSERVABILITY_CONFIG) {
    super();
    
    // Apply environment-specific configuration
    const environment = process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIGS || 'development';
    this.config = {
      ...ENVIRONMENT_CONFIGS[environment] || DEFAULT_OBSERVABILITY_CONFIG,
      ...config,
    };
    
    this.enabled = this.config.enabled;
    this.overheadTracker = new OverheadTracker();
    this.middlewareManager = new MiddlewareManager();

    // Initialize subsystems
    this.tracingSystem = new TracingSystem(this.config.tracing);
    this.metricsCollector = new MetricsCollector(this.config.metrics);
    this.alertingSystem = new AlertingSystem(this.config.health, this.metricsCollector);

    this.setupEventHandlers();
    this.setupHealthChecks();
    
    if (this.enabled) {
      this.start();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: ObservabilityConfig): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager(config);
    }
    return ObservabilityManager.instance;
  }

  /**
   * Start observability system
   */
  public start(): void {
    if (!this.enabled) {
      runtimeLogger.warn('Observability system is disabled');
      return;
    }

    try {
      // Start subsystems
      this.metricsCollector.startCollection();
      this.alertingSystem.startEvaluation();
      
      // Start health monitoring integration
      healthMonitor.start();
      performanceMonitor.start();

      this.emit('started');
      
      runtimeLogger.banner('SYMindX Observability System', 'Comprehensive monitoring active');
      runtimeLogger.info('Observability system started', {
        metadata: {
          tracing: this.config.tracing.enableTracing,
          metrics: this.config.metrics.enableCollection,
          alerting: this.config.health.enableHealthChecks,
          dashboard: this.config.dashboard.enableDashboard,
        },
      });
    } catch (error) {
      runtimeLogger.error('Failed to start observability system', error as Error);
      throw error;
    }
  }

  /**
   * Stop observability system
   */
  public async stop(): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    try {
      // Stop subsystems
      this.metricsCollector.stopCollection();
      this.alertingSystem.stopEvaluation();
      
      // Flush any pending data
      await this.flush();

      this.emit('stopped');
      
      runtimeLogger.info('Observability system stopped', {
        metadata: {
          uptime: Date.now() - this.startTime.getTime(),
          overheadStats: this.overheadTracker.getStatistics(),
        },
      });
    } catch (error) {
      runtimeLogger.error('Error stopping observability system', error as Error);
    } finally {
      this.shutdownInProgress = false;
    }
  }

  /**
   * Record an observability event with tracing and metrics
   */
  public recordEvent(event: ObservabilityEvent): TraceContext | undefined {
    if (!this.enabled) return undefined;

    const startTime = performance.now();
    let context: TraceContext | undefined;

    try {
      // Create trace context
      context = this.tracingSystem.traceEvent(event);
      
      // Record metrics
      this.metricsCollector.recordEvent(event);

      // Emit event
      this.emit('eventRecorded', { event, context });

      return context;
    } catch (error) {
      runtimeLogger.error('Failed to record observability event', error as Error, {
        metadata: { eventType: event.type },
      });
    } finally {
      const overhead = performance.now() - startTime;
      this.overheadTracker.recordOverhead(overhead);
      
      // Check for excessive overhead
      if (this.overheadTracker.isOverheadExcessive()) {
        this.handleExcessiveOverhead();
      }
    }

    return context;
  }

  /**
   * Trace an operation with automatic context management
   */
  public async traceOperation<T>(
    operationName: string,
    operation: (context: TraceContext) => Promise<T> | T,
    parentContext?: TraceContext,
    metadata: Record<string, unknown> = {}
  ): Promise<T> {
    if (!this.enabled) {
      return await operation({} as TraceContext);
    }

    const startTime = performance.now();
    let context: TraceContext | undefined;
    let result: T;
    let error: Error | undefined;

    try {
      // Start trace
      context = parentContext
        ? this.tracingSystem.startChildTrace(parentContext, operationName, metadata as Record<string, string>)
        : this.tracingSystem.startTrace(operationName, metadata as Record<string, string>);

      if (!context) {
        return await operation({} as TraceContext);
      }

      // Execute middleware before hooks
      await this.middlewareManager.executeBeforeHooks(context, operationName, metadata);

      // Execute operation
      result = await operation(context);

      return result;
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      
      if (context) {
        this.tracingSystem.setTraceStatus(context, {
          code: 'error',
          message: error.message,
        });
        
        // Execute middleware error hooks
        const duration = performance.now() - startTime;
        await this.middlewareManager.executeErrorHooks(context, operationName, error, duration);
      }
      
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      if (context) {
        // Finish trace
        this.tracingSystem.finishTrace(context, error ? {
          code: 'error',
          message: error.message,
        } : { code: 'ok' });

        // Execute middleware after hooks
        if (!error) {
          await this.middlewareManager.executeAfterHooks(context, operationName, result!, duration);
        }
      }

      // Record overhead
      this.overheadTracker.recordOverhead(performance.now() - startTime);
    }
  }

  /**
   * Get comprehensive observability metrics
   */
  public getMetrics(): ObservabilityMetrics {
    const baseMetrics = this.metricsCollector.getMetrics();
    const tracingStats = this.tracingSystem.getStatistics();
    const alertingStats = this.alertingSystem.getStatistics();
    const overheadStats = this.overheadTracker.getStatistics();

    return {
      ...baseMetrics,
      observability: {
        ...baseMetrics.observability,
        tracesGenerated: tracingStats.totalTraces,
        alertsTriggered: alertingStats.activeAlerts,
        overheadMs: overheadStats.averageMs,
      },
    };
  }

  /**
   * Get dashboard data
   */
  public async getDashboardData(): Promise<DashboardData> {
    const metrics = this.getMetrics();
    const activeAlerts = this.alertingSystem.getActiveAlerts();
    const healthSummary = await healthMonitor.getHealthDashboard();

    return {
      metadata: {
        generatedAt: new Date(),
        dataPoints: 0, // Would calculate based on time series data
        refreshInterval: this.config.dashboard.refreshIntervalMs,
      },
      realTimeMetrics: metrics,
      timeSeries: [], // Would implement time series storage
      alerts: activeAlerts.map(alert => ({
        id: alert.id,
        rule: alert.rule.name,
        severity: alert.rule.severity,
        message: alert.message,
        timestamp: alert.triggerTime,
        acknowledged: alert.acknowledged,
      })),
      healthSummary: {
        overall: healthSummary.overall,
        componentCount: healthSummary.components.length,
        healthyComponents: healthSummary.components.filter(c => c.status === 'healthy').length,
        degradedComponents: healthSummary.components.filter(c => c.status === 'degraded').length,
        unhealthyComponents: healthSummary.components.filter(c => c.status === 'unhealthy' || c.status === 'critical').length,
      },
      insights: this.generateInsights(metrics, activeAlerts),
    };
  }

  /**
   * Export metrics in various formats
   */
  public exportMetrics(format: 'prometheus' | 'json' = 'prometheus'): string {
    switch (format) {
      case 'prometheus':
        return this.metricsCollector.exportPrometheusMetrics();
      case 'json':
        return JSON.stringify(this.getMetrics(), null, 2);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Register middleware
   */
  public registerMiddleware(middleware: ObservabilityMiddleware): void {
    this.middlewareManager.register(middleware);
  }

  /**
   * Unregister middleware
   */
  public unregisterMiddleware(name: string): boolean {
    return this.middlewareManager.unregister(name);
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<ObservabilityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.enabled = this.config.enabled;

    // Update subsystem configurations
    this.tracingSystem.updateConfig(this.config.tracing);
    this.metricsCollector.updateConfig(this.config.metrics);
    this.alertingSystem.updateConfig(this.config.health);

    runtimeLogger.info('Observability configuration updated', {
      metadata: { updates: Object.keys(updates) },
    });

    this.emit('configUpdated', this.config);
  }

  /**
   * Get system status
   */
  public getStatus(): {
    enabled: boolean;
    uptime: number;
    subsystems: {
      tracing: { enabled: boolean; traces: number };
      metrics: { enabled: boolean; metrics: number };
      alerting: { enabled: boolean; alerts: number };
    };
    overhead: ReturnType<OverheadTracker['getStatistics']>;
    middlewares: number;
  } {
    const tracingStats = this.tracingSystem.getStatistics();
    const alertingStats = this.alertingSystem.getStatistics();
    const overheadStats = this.overheadTracker.getStatistics();

    return {
      enabled: this.enabled,
      uptime: Date.now() - this.startTime.getTime(),
      subsystems: {
        tracing: {
          enabled: this.config.tracing.enableTracing,
          traces: tracingStats.totalTraces,
        },
        metrics: {
          enabled: this.config.metrics.enableCollection,
          metrics: 0, // Would get from metrics collector
        },
        alerting: {
          enabled: this.config.health.enableHealthChecks,
          alerts: alertingStats.activeAlerts,
        },
      },
      overhead: overheadStats,
      middlewares: this.middlewareManager.getMiddlewares().length,
    };
  }

  /**
   * Flush pending data
   */
  public async flush(): Promise<void> {
    // Flush any buffered data from subsystems
    // This would be implemented based on specific requirements
    
    this.emit('flushed');
  }

  /**
   * Setup event handlers for subsystems
   */
  private setupEventHandlers(): void {
    // Tracing events
    this.tracingSystem.on('traceStarted', (data) => {
      this.emit('traceStarted', data);
    });

    this.tracingSystem.on('traceFinished', (data) => {
      this.emit('traceFinished', data);
    });

    // Metrics events
    this.metricsCollector.on('eventRecorded', (event) => {
      this.emit('metricRecorded', event);
    });

    // Alerting events
    this.alertingSystem.on('alertTriggered', (alert) => {
      this.emit('alertTriggered', alert);
      
      // Record alert metric
      this.metricsCollector.recordEvent({
        type: 'system',
        operation: 'alert_triggered',
        metadata: {
          ruleId: alert.ruleId,
          severity: alert.rule.severity,
        },
      });
    });

    this.alertingSystem.on('alertResolved', (alert) => {
      this.emit('alertResolved', alert);
    });
  }

  /**
   * Setup health checks for observability system
   */
  private setupHealthChecks(): void {
    // Register health check for observability overhead
    healthMonitor.registerCheck(
      {
        id: 'observability_overhead',
        name: 'Observability Overhead',
        type: 'system' as any,
        description: 'Monitor observability system overhead',
        interval: 60000, // 1 minute
        timeout: 5000,
        retries: 2,
        enabled: true,
        criticalThreshold: 0.8,
        degradedThreshold: 0.6,
        dependencies: [],
        tags: ['observability', 'performance'],
      },
      async () => {
        const stats = this.overheadTracker.getStatistics();
        const threshold = OBSERVABILITY_CONSTANTS.PERFORMANCE_THRESHOLDS.MAX_OBSERVABILITY_OVERHEAD_MS;
        
        let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'healthy';
        let message = 'Observability overhead is within acceptable limits';

        if (stats.p95Ms > threshold * 2) {
          status = 'unhealthy';
          message = `Observability overhead is critically high: ${stats.p95Ms.toFixed(2)}ms`;
        } else if (stats.p95Ms > threshold) {
          status = 'degraded';
          message = `Observability overhead is elevated: ${stats.p95Ms.toFixed(2)}ms`;
        }

        return {
          healthy: status === 'healthy',
          status,
          message,
          timestamp: new Date(),
          componentId: 'observability_overhead',
          details: {
            message,
            averageMs: stats.averageMs,
            p95Ms: stats.p95Ms,
            maxMs: stats.maxMs,
            totalOperations: stats.totalOperations,
            thresholdMs: threshold,
          },
        };
      }
    );
  }

  /**
   * Handle excessive observability overhead
   */
  private handleExcessiveOverhead(): void {
    const stats = this.overheadTracker.getStatistics();
    
    runtimeLogger.warn('Excessive observability overhead detected', {
      metadata: {
        averageMs: stats.averageMs,
        p95Ms: stats.p95Ms,
        maxMs: stats.maxMs,
        threshold: OBSERVABILITY_CONSTANTS.PERFORMANCE_THRESHOLDS.MAX_OBSERVABILITY_OVERHEAD_MS,
      },
    });

    // Auto-adjust sampling rates if overhead is too high
    if (stats.p95Ms > OBSERVABILITY_CONSTANTS.PERFORMANCE_THRESHOLDS.MAX_OBSERVABILITY_OVERHEAD_MS * 3) {
      this.updateConfig({
        tracing: {
          ...this.config.tracing,
          sampleRate: Math.max(0.01, this.config.tracing.sampleRate * 0.5),
        },
        metrics: {
          ...this.config.metrics,
          collectionIntervalMs: Math.min(30000, this.config.metrics.collectionIntervalMs * 1.5),
        },
      });

      runtimeLogger.warn('Auto-adjusted observability configuration to reduce overhead');
    }

    this.emit('excessiveOverhead', stats);
  }

  /**
   * Generate insights from metrics and alerts
   */
  private generateInsights(
    metrics: ObservabilityMetrics,
    activeAlerts: any[]
  ): DashboardData['insights'] {
    const insights: DashboardData['insights'] = [];

    // Performance insights
    if (metrics.system.memory.usage > 0.8) {
      insights.push({
        type: 'resource',
        severity: 'warning',
        message: `High memory usage detected: ${(metrics.system.memory.usage * 100).toFixed(1)}%`,
        recommendation: 'Consider scaling resources or investigating memory leaks',
        data: { memoryUsage: metrics.system.memory.usage },
      });
    }

    // Error rate insights
    const totalAgentErrors = Object.values(metrics.agents)
      .reduce((sum, agent) => sum + agent.errorCount, 0);
    
    if (totalAgentErrors > 10) {
      insights.push({
        type: 'error',
        severity: 'error',
        message: `High error rate detected: ${totalAgentErrors} errors across agents`,
        recommendation: 'Review agent logs and investigate root causes',
        data: { totalErrors: totalAgentErrors },
      });
    }

    // Alert trends
    if (activeAlerts.length > 5) {
      insights.push({
        type: 'trend',
        severity: 'warning',
        message: `Multiple active alerts: ${activeAlerts.length}`,
        recommendation: 'Review alert rules and system health',
        data: { activeAlerts: activeAlerts.length },
      });
    }

    // Observability overhead
    const overheadStats = this.overheadTracker.getStatistics();
    if (!overheadStats.withinThreshold) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `Observability overhead is high: ${overheadStats.p95Ms.toFixed(2)}ms`,
        recommendation: 'Consider reducing sampling rates or collection frequency',
        data: overheadStats,
      });
    }

    return insights;
  }
}