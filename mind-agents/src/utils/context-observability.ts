/**
 * Context Observability Utilities for SYMindX
 * 
 * Provides lightweight tracing, monitoring, and debugging capabilities
 * for the context system without adding technical debt.
 */

import { EventEmitter } from 'events';
import { runtimeLogger } from './logger';

/**
 * Context trace entry
 */
export interface ContextTrace {
  id: string;
  timestamp: Date;
  operation: string;
  agentId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  parentId?: string;
  error?: Error;
}

/**
 * Context metrics
 */
export interface ContextMetrics {
  contextCreations: number;
  contextEnrichments: number;
  contextTransformations: number;
  cacheHits: number;
  cacheMisses: number;
  avgEnrichmentTime: number;
  avgTransformationTime: number;
  activeContexts: number;
  totalMemoryUsage: number;
}

/**
 * Debug information
 */
export interface ContextDebugInfo {
  contextId: string;
  agentId: string;
  createdAt: Date;
  lastAccessed: Date;
  enrichmentSteps: string[];
  transformations: string[];
  memoryUsage: number;
  parentContext?: string;
  childContexts: string[];
}

/**
 * Lightweight context tracer
 */
export class ContextTracer extends EventEmitter {
  private traces: Map<string, ContextTrace> = new Map();
  private metrics: ContextMetrics = {
    contextCreations: 0,
    contextEnrichments: 0,
    contextTransformations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgEnrichmentTime: 0,
    avgTransformationTime: 0,
    activeContexts: 0,
    totalMemoryUsage: 0,
  };
  private maxTraces: number = 1000;
  private debugMode: boolean = false;

  constructor(debugMode: boolean = false) {
    super();
    this.debugMode = debugMode;
  }

  /**
   * Start a trace
   */
  startTrace(operation: string, agentId?: string, metadata?: Record<string, any>): string {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trace: ContextTrace = {
      id: traceId,
      timestamp: new Date(),
      operation,
      agentId,
      metadata,
    };

    this.traces.set(traceId, trace);
    
    // Clean up old traces
    if (this.traces.size > this.maxTraces) {
      const oldestTrace = Array.from(this.traces.keys())[0];
      this.traces.delete(oldestTrace);
    }

    if (this.debugMode) {
      runtimeLogger.debug(`Context trace started: ${operation}`, { traceId, agentId });
    }

    return traceId;
  }

  /**
   * End a trace
   */
  endTrace(traceId: string, error?: Error): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.duration = Date.now() - trace.timestamp.getTime();
    if (error) {
      trace.error = error;
    }

    // Update metrics
    this.updateMetrics(trace);

    if (this.debugMode) {
      runtimeLogger.debug(`Context trace ended: ${trace.operation}`, {
        traceId,
        duration: trace.duration,
        error: error?.message,
      });
    }

    this.emit('trace:complete', trace);
  }

  /**
   * Record a metric
   */
  recordMetric(metric: keyof ContextMetrics, value: number): void {
    if (metric in this.metrics) {
      if (metric.startsWith('avg')) {
        // Calculate running average
        const currentAvg = this.metrics[metric];
        const count = this.metrics.contextCreations || 1;
        this.metrics[metric] = (currentAvg * (count - 1) + value) / count;
      } else {
        this.metrics[metric] = value;
      }
    }
  }

  /**
   * Increment a counter metric
   */
  incrementMetric(metric: keyof ContextMetrics, amount: number = 1): void {
    if (metric in this.metrics && typeof this.metrics[metric] === 'number') {
      this.metrics[metric] += amount;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ContextMetrics {
    return { ...this.metrics };
  }

  /**
   * Get traces for debugging
   */
  getTraces(filter?: { agentId?: string; operation?: string }): ContextTrace[] {
    let traces = Array.from(this.traces.values());
    
    if (filter?.agentId) {
      traces = traces.filter(t => t.agentId === filter.agentId);
    }
    if (filter?.operation) {
      traces = traces.filter(t => t.operation === filter.operation);
    }

    return traces.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear all traces
   */
  clearTraces(): void {
    this.traces.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      contextCreations: 0,
      contextEnrichments: 0,
      contextTransformations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgEnrichmentTime: 0,
      avgTransformationTime: 0,
      activeContexts: 0,
      totalMemoryUsage: 0,
    };
  }

  private updateMetrics(trace: ContextTrace): void {
    switch (trace.operation) {
      case 'context:create':
        this.incrementMetric('contextCreations');
        break;
      case 'context:enrich':
        this.incrementMetric('contextEnrichments');
        if (trace.duration) {
          this.recordMetric('avgEnrichmentTime', trace.duration);
        }
        break;
      case 'context:transform':
        this.incrementMetric('contextTransformations');
        if (trace.duration) {
          this.recordMetric('avgTransformationTime', trace.duration);
        }
        break;
      case 'cache:hit':
        this.incrementMetric('cacheHits');
        break;
      case 'cache:miss':
        this.incrementMetric('cacheMisses');
        break;
    }
  }
}

/**
 * Context debugger for development
 */
export class ContextDebugger {
  private debugInfo: Map<string, ContextDebugInfo> = new Map();
  private maxDebugEntries: number = 100;

  /**
   * Track context creation
   */
  trackContext(contextId: string, agentId: string): void {
    const info: ContextDebugInfo = {
      contextId,
      agentId,
      createdAt: new Date(),
      lastAccessed: new Date(),
      enrichmentSteps: [],
      transformations: [],
      memoryUsage: 0,
      childContexts: [],
    };
    
    this.debugInfo.set(contextId, info);
    this.cleanupOldEntries();
  }

  /**
   * Track enrichment step
   */
  trackEnrichment(contextId: string, enricherName: string): void {
    const info = this.debugInfo.get(contextId);
    if (info) {
      info.enrichmentSteps.push(enricherName);
      info.lastAccessed = new Date();
    }
  }

  /**
   * Track transformation
   */
  trackTransformation(contextId: string, target: string): void {
    const info = this.debugInfo.get(contextId);
    if (info) {
      info.transformations.push(target);
      info.lastAccessed = new Date();
    }
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(contextId: string, bytes: number): void {
    const info = this.debugInfo.get(contextId);
    if (info) {
      info.memoryUsage = bytes;
    }
  }

  /**
   * Get debug info for a context
   */
  getDebugInfo(contextId: string): ContextDebugInfo | undefined {
    return this.debugInfo.get(contextId);
  }

  /**
   * Get all debug info
   */
  getAllDebugInfo(): ContextDebugInfo[] {
    return Array.from(this.debugInfo.values())
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  /**
   * Generate debug report
   */
  generateReport(): string {
    const infos = this.getAllDebugInfo();
    const report = [
      '=== Context Debug Report ===',
      `Total Contexts: ${infos.length}`,
      `Total Memory: ${this.calculateTotalMemory()} bytes`,
      '',
      'Active Contexts:',
    ];

    infos.slice(0, 10).forEach(info => {
      report.push(`  - ${info.contextId} (${info.agentId})`);
      report.push(`    Created: ${info.createdAt.toISOString()}`);
      report.push(`    Enrichments: ${info.enrichmentSteps.join(', ')}`);
      report.push(`    Transformations: ${info.transformations.join(', ')}`);
      report.push(`    Memory: ${info.memoryUsage} bytes`);
    });

    return report.join('\n');
  }

  private cleanupOldEntries(): void {
    if (this.debugInfo.size > this.maxDebugEntries) {
      const entries = Array.from(this.debugInfo.entries())
        .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
      
      const toRemove = entries.slice(0, entries.length - this.maxDebugEntries);
      toRemove.forEach(([contextId]) => {
        this.debugInfo.delete(contextId);
      });
    }
  }

  private calculateTotalMemory(): number {
    return Array.from(this.debugInfo.values())
      .reduce((total, info) => total + info.memoryUsage, 0);
  }
}

/**
 * Context monitor for production
 */
export class ContextMonitor {
  private tracer: ContextTracer;
  private healthCheckInterval?: NodeJS.Timeout;
  private healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  constructor(tracer: ContextTracer) {
    this.tracer = tracer;
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 60000): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck(): void {
    const metrics = this.tracer.getMetrics();
    
    // Check cache hit rate
    const totalCacheOps = metrics.cacheHits + metrics.cacheMisses;
    const cacheHitRate = totalCacheOps > 0 ? metrics.cacheHits / totalCacheOps : 0;
    
    // Check performance
    const avgTime = (metrics.avgEnrichmentTime + metrics.avgTransformationTime) / 2;
    
    // Determine health status
    if (cacheHitRate < 0.3 || avgTime > 1000) {
      this.healthStatus = 'unhealthy';
    } else if (cacheHitRate < 0.5 || avgTime > 500) {
      this.healthStatus = 'degraded';
    } else {
      this.healthStatus = 'healthy';
    }

    // Log if unhealthy
    if (this.healthStatus !== 'healthy') {
      runtimeLogger.warn(`Context system health: ${this.healthStatus}`, {
        cacheHitRate,
        avgTime,
        metrics,
      });
    }
  }

  /**
   * Get health status
   */
  getHealthStatus(): string {
    return this.healthStatus;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, any> {
    const metrics = this.tracer.getMetrics();
    const totalCacheOps = metrics.cacheHits + metrics.cacheMisses;
    
    return {
      healthStatus: this.healthStatus,
      cacheHitRate: totalCacheOps > 0 ? metrics.cacheHits / totalCacheOps : 0,
      avgEnrichmentTime: metrics.avgEnrichmentTime,
      avgTransformationTime: metrics.avgTransformationTime,
      activeContexts: metrics.activeContexts,
      totalMemoryUsageMB: metrics.totalMemoryUsage / (1024 * 1024),
    };
  }
}

// Create singleton instances
export const contextTracer = new ContextTracer(process.env.NODE_ENV === 'development');
export const contextDebugger = process.env.NODE_ENV === 'development' ? new ContextDebugger() : null;
export const contextMonitor = new ContextMonitor(contextTracer);

// Start monitoring in production
if (process.env.NODE_ENV === 'production') {
  contextMonitor.start();
}