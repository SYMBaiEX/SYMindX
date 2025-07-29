/**
 * @module core/context/observability
 * @description Main context observability system orchestrator
 */

import { EventEmitter } from 'events';
import type { 
  ContextObservabilitySystem,
  ContextObservabilityConfig,
  ContextObservabilityState,
  ContextTrace,
  ContextTracer,
  ContextMetricsCollector,
  ContextDebugger,
  ContextVersioning,
  ContextVisualizer
} from '../../../types/context/context-observability.ts';
import { ContextTracerImpl } from './context-tracer.ts';
import { ContextMetricsCollectorImpl } from './context-metrics-collector.ts';
import { ContextDebuggerImpl } from './context-debugger.ts';
import { ContextVersioningImpl } from './context-versioning.ts';
import { ContextVisualizerImpl } from './context-visualizer.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

/**
 * Default observability configuration
 */
const DEFAULT_CONFIG: ContextObservabilityConfig = {
  tracing: {
    enabled: true,
    sampleRate: 1.0,
    maxContextDepth: 10,
    enableFlowVisualization: true,
    traceRetentionMs: 24 * 60 * 60 * 1000 // 24 hours
  },
  metrics: {
    enabled: true,
    collectionIntervalMs: 5000,
    enableContextMetrics: true,
    enableTransformationMetrics: true,
    enableFlowMetrics: true,
    maxMetricsPerContext: 1000
  },
  debug: {
    enabled: true,
    enableBreakpoints: true,
    enableStepThrough: true,
    enableContextInspection: true,
    maxDebugHistorySize: 100,
    enableConsoleIntegration: true
  },
  versioning: {
    enabled: true,
    enableDiffTracking: true,
    enableRollback: true,
    maxVersionHistory: 50,
    compressionEnabled: true
  },
  visualization: {
    enabled: true,
    enableRealTimeUpdates: true,
    maxNodesInGraph: 500,
    enableInteractiveMode: true,
    renderFormat: 'svg'
  },
  performance: {
    maxOverheadMs: 50,
    enableProfiling: true,
    enableMemoryTracking: true,
    enableAsyncTracking: true
  }
};

/**
 * Comprehensive context observability system implementation
 */
export class ContextObservabilitySystemImpl extends EventEmitter implements ContextObservabilitySystem {
  public readonly tracer: ContextTracer;
  public readonly metrics: ContextMetricsCollector;
  public readonly debugger: ContextDebugger;
  public readonly versioning: ContextVersioning;
  public readonly visualizer: ContextVisualizer;

  private config: ContextObservabilityConfig;
  private activeObservations = new Map<string, { startTime: Date; trace: ContextTrace }>();
  private startTime = Date.now();
  private performanceMonitor?: NodeJS.Timeout;

  constructor(config: Partial<ContextObservabilityConfig> = {}) {
    super();
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);

    // Initialize components
    this.tracer = new ContextTracerImpl(this.config.tracing);
    this.metrics = new ContextMetricsCollectorImpl(this.config.metrics);
    this.debugger = new ContextDebuggerImpl(this.config.debug);
    this.versioning = new ContextVersioningImpl(this.config.versioning);
    this.visualizer = new ContextVisualizerImpl(this.config.visualization);

    this.setupEventHandlers();
    this.startPerformanceMonitoring();

    runtimeLogger.info('Context observability system initialized', {
      tracing: this.config.tracing.enabled,
      metrics: this.config.metrics.enabled,
      debug: this.config.debug.enabled,
      versioning: this.config.versioning.enabled,
      visualization: this.config.visualization.enabled
    });
  }

  /**
   * Start observability for a context instance
   */
  async startObservation(
    contextId: string, 
    config?: Partial<ContextObservabilityConfig>
  ): Promise<ContextTrace> {
    if (this.activeObservations.has(contextId)) {
      runtimeLogger.warn('Observation already active for context', { contextId });
      return this.activeObservations.get(contextId)!.trace;
    }

    const observationConfig = config ? this.mergeConfig(this.config, config) : this.config;
    const startTime = Date.now();

    try {
      // Start tracing if enabled
      let trace: ContextTrace;
      if (observationConfig.tracing.enabled) {
        trace = await this.tracer.startTrace(contextId);
      } else {
        // Create minimal trace for other components
        trace = this.createMinimalTrace(contextId);
      }

      // Start metrics collection if enabled
      if (observationConfig.metrics.enabled) {
        await this.metrics.startCollection(contextId);
      }

      // Create version snapshot if enabled
      if (observationConfig.versioning.enabled) {
        await this.versioning.createVersion(
          contextId, 
          'Initial context observation started',
          ['observation_start']
        );
      }

      // Set trace in visualizer for flow tracking
      if (observationConfig.visualization.enabled) {
        this.visualizer.setContextTrace(contextId, trace);
      }

      this.activeObservations.set(contextId, {
        startTime: new Date(),
        trace
      });

      const observationTime = Date.now() - startTime;
      runtimeLogger.debug('Context observation started', {
        contextId,
        traceId: trace.traceId,
        observationTime: `${observationTime}ms`,
        components: {
          tracing: observationConfig.tracing.enabled,
          metrics: observationConfig.metrics.enabled,
          versioning: observationConfig.versioning.enabled,
          visualization: observationConfig.visualization.enabled
        }
      });

      this.emit('observation_started', { contextId, trace, config: observationConfig });

      return trace;

    } catch (error) {
      runtimeLogger.error('Failed to start context observation', {
        contextId,
        error: error instanceof Error ? error.message : String(error),
        observationTime: `${Date.now() - startTime}ms`
      });

      throw new Error(`Failed to start observation for context ${contextId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop observability for a context instance
   */
  async stopObservation(contextId: string): Promise<void> {
    const observation = this.activeObservations.get(contextId);
    if (!observation) {
      runtimeLogger.warn('No active observation found for context', { contextId });
      return;
    }

    const stopTime = Date.now();
    const totalObservationTime = stopTime - observation.startTime.getTime();

    try {
      // Stop tracing
      if (this.config.tracing.enabled) {
        await this.tracer.endTrace(contextId);
      }

      // Stop metrics collection
      if (this.config.metrics.enabled) {
        await this.metrics.stopCollection(contextId);
      }

      // Create final version snapshot
      if (this.config.versioning.enabled) {
        await this.versioning.createVersion(
          contextId,
          'Context observation completed',
          ['observation_end', `duration_${Math.floor(totalObservationTime / 1000)}s`]
        );
      }

      this.activeObservations.delete(contextId);

      runtimeLogger.debug('Context observation stopped', {
        contextId,
        traceId: observation.trace.traceId,
        totalObservationTime: `${totalObservationTime}ms`,
        transformations: observation.trace.transformations.length,
        accesses: observation.trace.accessPatterns.length
      });

      this.emit('observation_stopped', { 
        contextId, 
        trace: observation.trace, 
        duration: totalObservationTime 
      });

    } catch (error) {
      runtimeLogger.error('Failed to stop context observation', {
        contextId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Remove from active observations even if cleanup failed
      this.activeObservations.delete(contextId);

      throw new Error(`Failed to stop observation for context ${contextId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current observability state
   */
  getObservabilityState(contextId?: string): ContextObservabilityState {
    const now = new Date();
    
    if (contextId) {
      const observation = this.activeObservations.get(contextId);
      const isTraced = observation !== undefined;

      return {
        status: isTraced ? 'active' : 'disabled',
        tracedContexts: isTraced ? [contextId] : [],
        debugSessions: [], // Would need to query debugger
        metricsStatus: {
          collecting: this.config.metrics.enabled && isTraced,
          lastCollection: isTraced ? observation!.startTime : now,
          totalMetrics: isTraced ? 1 : 0
        },
        tracingStatus: {
          active: this.config.tracing.enabled && isTraced,
          sampleRate: this.config.tracing.sampleRate,
          totalTraces: isTraced ? 1 : 0,
          activeTraces: isTraced ? 1 : 0
        },
        health: {
          status: 'healthy',
          issues: [],
          lastCheck: now
        },
        resources: this.getResourceUsage()
      };
    }

    // System-wide state
    const activeContexts = Array.from(this.activeObservations.keys());
    const debugSessions = this.debugger.getStatistics?.()?.activeSessions || 0;

    return {
      status: activeContexts.length > 0 ? 'active' : 'paused',
      tracedContexts: activeContexts,
      debugSessions: Array.from({ length: debugSessions }, (_, i) => `session_${i}`),
      metricsStatus: {
        collecting: this.config.metrics.enabled,
        lastCollection: now,
        totalMetrics: this.metrics.getStatistics?.()?.metricsCount || 0
      },
      tracingStatus: {
        active: this.config.tracing.enabled,
        sampleRate: this.config.tracing.sampleRate,
        totalTraces: this.tracer.getStatistics?.()?.totalTraces || 0,
        activeTraces: this.tracer.getStatistics?.()?.activeTraces || 0
      },
      health: this.getSystemHealth(),
      resources: this.getResourceUsage()
    };
  }

  /**
   * Configure observability settings
   */
  configure(config: Partial<ContextObservabilityConfig>): void {
    const oldConfig = { ...this.config };
    this.config = this.mergeConfig(this.config, config);

    runtimeLogger.info('Observability configuration updated', {
      changes: this.getConfigChanges(oldConfig, this.config)
    });

    this.emit('configuration_updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Get comprehensive observability statistics
   */
  getStatistics(): Record<string, any> {
    return {
      system: {
        uptime: Date.now() - this.startTime,
        activeObservations: this.activeObservations.size,
        totalEvents: this.listenerCount('observation_started') + this.listenerCount('observation_stopped'),
        config: this.config
      },
      tracer: this.tracer.getStatistics?.() || {},
      metrics: this.metrics.getStatistics?.() || {},
      debugger: this.debugger.getStatistics?.() || {},
      versioning: this.versioning.getStatistics?.() || {},
      visualizer: this.visualizer.getStatistics?.() || {}
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    runtimeLogger.info('Disposing context observability system');

    // Stop all active observations
    const activeContexts = Array.from(this.activeObservations.keys());
    for (const contextId of activeContexts) {
      try {
        await this.stopObservation(contextId);
      } catch (error) {
        runtimeLogger.error('Failed to stop observation during disposal', { contextId, error });
      }
    }

    // Stop performance monitoring
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = undefined;
    }

    // Dispose components
    if (this.tracer.dispose) this.tracer.dispose();
    if (this.metrics.dispose) this.metrics.dispose();
    if (this.debugger.dispose) this.debugger.dispose();
    if (this.versioning.dispose) this.versioning.dispose();
    if (this.visualizer.dispose) this.visualizer.dispose();

    this.removeAllListeners();

    runtimeLogger.info('Context observability system disposed');
  }

  /**
   * Convenience methods for common operations
   */

  /**
   * Record a context access operation
   */
  recordAccess(
    contextId: string,
    accessor: string,
    accessType: 'read' | 'write' | 'merge' | 'transform',
    duration: number,
    dataSize: number,
    success: boolean,
    error?: string
  ): void {
    // Record in tracer
    if (this.config.tracing.enabled) {
      this.tracer.recordAccess?.(contextId, accessor, accessType, duration, dataSize, success, error);
    }

    // Record in metrics
    if (this.config.metrics.enabled) {
      this.metrics.recordAccess?.(contextId, accessor, accessType, duration, dataSize, success);
    }
  }

  /**
   * Record a context transformation
   */
  recordTransformation(
    contextId: string,
    transformationType: string,
    inputSize: number,
    outputSize: number,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    // Record in tracer
    if (this.config.tracing.enabled) {
      this.tracer.recordTransformation?.(
        contextId, transformationType, inputSize, outputSize, duration, success, error
      );
    }

    // Record in metrics
    if (this.config.metrics.enabled) {
      this.metrics.recordTransformation?.(
        contextId, transformationType, inputSize, outputSize, duration, success
      );
    }

    // Create version snapshot for significant transformations
    if (this.config.versioning.enabled && success && outputSize !== inputSize) {
      this.versioning.createVersion(
        contextId,
        `Transformation: ${transformationType}`,
        ['transformation', transformationType]
      ).catch(error => {
        runtimeLogger.error('Failed to create transformation version', { contextId, transformationType, error });
      });
    }
  }

  /**
   * Trigger debug breakpoint
   */
  triggerBreakpoint(
    contextId: string,
    moduleId: string,
    operation: string,
    line?: number,
    variables?: Record<string, unknown>
  ): void {
    if (!this.config.debug.enabled) return;

    // Find active debug sessions for this context
    const stats = this.debugger.getStatistics?.();
    if (stats?.activeSessions > 0) {
      // In a real implementation, we'd need to track session-context mappings
      this.debugger.hitBreakpoint?.(
        'active_session', // Would be actual session ID
        moduleId,
        operation,
        line,
        variables
      );
    }
  }

  /**
   * Private helper methods
   */

  private mergeConfig(
    base: ContextObservabilityConfig, 
    override: Partial<ContextObservabilityConfig>
  ): ContextObservabilityConfig {
    return {
      tracing: { ...base.tracing, ...override.tracing },
      metrics: { ...base.metrics, ...override.metrics },
      debug: { ...base.debug, ...override.debug },
      versioning: { ...base.versioning, ...override.versioning },
      visualization: { ...base.visualization, ...override.visualization },
      performance: { ...base.performance, ...override.performance }
    };
  }

  private createMinimalTrace(contextId: string): ContextTrace {
    const now = new Date();
    return {
      traceId: `minimal_${contextId}`,
      spanId: `span_${contextId}`,
      sampled: false,
      flags: 0,
      baggage: {},
      startTime: now,
      metadata: { minimal: true },
      contextId,
      contextType: 'system',
      hierarchy: {
        childContextIds: [],
        depth: 0,
        rootContextId: contextId
      },
      lifecycle: { created: now },
      transformations: [],
      accessPatterns: [],
      sharing: {
        shareCount: 0,
        sharedWith: [],
        shareType: 'read',
        isolationLevel: 'weak'
      },
      flow: {
        entryPoints: [],
        exitPoints: [],
        criticalPath: [],
        bottlenecks: []
      },
      quality: {
        completeness: 1,
        consistency: 1,
        freshness: 1,
        relevance: 1,
        reliability: 1
      }
    };
  }

  private setupEventHandlers(): void {
    // Cross-component event handling
    this.tracer.on('trace_started', (data) => {
      this.emit('trace_started', data);
    });

    this.tracer.on('trace_ended', (data) => {
      this.emit('trace_ended', data);
    });

    this.metrics.on('collection_started', (data) => {
      this.emit('metrics_collection_started', data);
    });

    this.debugger.on('breakpoint_hit', (data) => {
      this.emit('breakpoint_hit', data);
    });

    this.versioning.on('version_created', (data) => {
      this.emit('version_created', data);
    });

    this.visualizer.on('visualization_generated', (data) => {
      this.emit('visualization_generated', data);
    });
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.performance.enableProfiling) return;

    this.performanceMonitor = setInterval(() => {
      const usage = this.getResourceUsage();
      
      if (usage.overhead > this.config.performance.maxOverheadMs) {
        runtimeLogger.warn('Observability overhead exceeded threshold', {
          overhead: usage.overhead,
          threshold: this.config.performance.maxOverheadMs
        });

        this.emit('performance_warning', { 
          type: 'overhead',
          current: usage.overhead,
          threshold: this.config.performance.maxOverheadMs
        });
      }

      if (usage.memoryUsage > 0.8) { // 80% memory usage
        runtimeLogger.warn('High memory usage detected', {
          memoryUsage: usage.memoryUsage
        });

        this.emit('performance_warning', { 
          type: 'memory',
          current: usage.memoryUsage,
          threshold: 0.8
        });
      }
    }, 10000); // Check every 10 seconds
  }

  private getResourceUsage(): ContextObservabilityState['resources'] {
    const memUsage = process.memoryUsage();
    const memoryUsage = memUsage.heapUsed / memUsage.heapTotal;
    
    return {
      memoryUsage,
      cpuUsage: 0, // Would need external library for accurate CPU usage
      storageUsage: 0, // Would need to calculate actual storage usage
      overhead: this.calculateOverhead()
    };
  }

  private calculateOverhead(): number {
    // Estimate observability overhead (simplified calculation)
    const activeObservations = this.activeObservations.size;
    const baseOverhead = 5; // Base overhead in ms
    const perContextOverhead = 2; // Additional overhead per context
    
    return baseOverhead + (activeObservations * perContextOverhead);
  }

  private getSystemHealth(): ContextObservabilityState['health'] {
    const issues: string[] = [];
    
    // Check component health
    if (this.config.tracing.enabled && !this.tracer.getStatistics) {
      issues.push('Tracer component not responding');
    }
    
    if (this.config.metrics.enabled && !this.metrics.getStatistics) {
      issues.push('Metrics collector not responding');
    }
    
    // Check resource usage
    const resources = this.getResourceUsage();
    if (resources.memoryUsage > 0.9) {
      issues.push('High memory usage detected');
    }
    
    if (resources.overhead > this.config.performance.maxOverheadMs * 2) {
      issues.push('Excessive observability overhead');
    }
    
    const status = issues.length === 0 ? 'healthy' : 
                  issues.length <= 2 ? 'degraded' : 'unhealthy';
    
    return {
      status,
      issues,
      lastCheck: new Date()
    };
  }

  private getConfigChanges(
    oldConfig: ContextObservabilityConfig, 
    newConfig: ContextObservabilityConfig
  ): Record<string, any> {
    const changes: Record<string, any> = {};
    
    if (oldConfig.tracing.enabled !== newConfig.tracing.enabled) {
      changes.tracing_enabled = { from: oldConfig.tracing.enabled, to: newConfig.tracing.enabled };
    }
    
    if (oldConfig.metrics.enabled !== newConfig.metrics.enabled) {
      changes.metrics_enabled = { from: oldConfig.metrics.enabled, to: newConfig.metrics.enabled };
    }
    
    if (oldConfig.debug.enabled !== newConfig.debug.enabled) {
      changes.debug_enabled = { from: oldConfig.debug.enabled, to: newConfig.debug.enabled };
    }
    
    return changes;
  }
}

/**
 * Create a context observability system with default configuration
 */
export function createContextObservabilitySystem(
  config?: Partial<ContextObservabilityConfig>
): ContextObservabilitySystem {
  return new ContextObservabilitySystemImpl(config);
}

/**
 * Export all components for individual use
 */
export {
  ContextTracerImpl,
  ContextMetricsCollectorImpl,
  ContextDebuggerImpl,
  ContextVersioningImpl,
  ContextVisualizerImpl,
  DEFAULT_CONFIG
};

/**
 * Export types
 */
export type * from '../../../types/context/context-observability.ts';