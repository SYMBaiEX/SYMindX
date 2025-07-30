/**
 * @module core/context/observability/context-metrics-collector
 * @description Performance and usage metrics collection for context operations
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type {
  ContextMetricsCollector,
  ContextMetrics,
  ContextObservabilityConfig,
} from '../../../types/context/context-observability.ts';
import type { ObservabilityMetrics } from '../../../types/observability/index.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

interface MetricEntry {
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

interface ContextInstanceMetrics {
  contextId: string;
  lifetimeMs: number;
  accessCount: number;
  transformationCount: number;
  memoryUsage: number;
  lastActivity: Date;
  qualityScore: number;
  errorCount: number;
  successCount: number;
  startTime: Date;
}

/**
 * Context metrics collector with Prometheus-compatible output
 */
export class ContextMetricsCollectorImpl
  extends EventEmitter
  implements ContextMetricsCollector
{
  private metrics = new Map<string, MetricEntry[]>();
  private contextInstances = new Map<string, ContextInstanceMetrics>();
  private config: ContextObservabilityConfig['metrics'];
  private collectionInterval?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor(config: ContextObservabilityConfig['metrics']) {
    super();
    this.config = config;

    if (config.enabled) {
      this.startCollection();
    }
  }

  /**
   * Start collecting metrics for a context
   */
  async startCollection(contextId: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Context metrics collection is disabled');
    }

    if (this.contextInstances.has(contextId)) {
      runtimeLogger.warn('Metrics collection already started for context', {
        contextId,
      });
      return;
    }

    const metrics: ContextInstanceMetrics = {
      contextId,
      lifetimeMs: 0,
      accessCount: 0,
      transformationCount: 0,
      memoryUsage: 0,
      lastActivity: new Date(),
      qualityScore: 1.0,
      errorCount: 0,
      successCount: 0,
      startTime: new Date(),
    };

    this.contextInstances.set(contextId, metrics);

    runtimeLogger.debug('Started metrics collection for context', {
      contextId,
    });
    this.emit('collection_started', { contextId });
  }

  /**
   * Stop collecting metrics for a context
   */
  async stopCollection(contextId: string): Promise<void> {
    const metrics = this.contextInstances.get(contextId);
    if (!metrics) {
      runtimeLogger.warn('Attempted to stop non-existent metrics collection', {
        contextId,
      });
      return;
    }

    metrics.lifetimeMs = Date.now() - metrics.startTime.getTime();

    // Record final metrics
    this.recordMetric(contextId, 'context_lifetime_ms', metrics.lifetimeMs);
    this.recordMetric(contextId, 'context_total_accesses', metrics.accessCount);
    this.recordMetric(
      contextId,
      'context_total_transformations',
      metrics.transformationCount
    );
    this.recordMetric(
      contextId,
      'context_final_quality_score',
      metrics.qualityScore
    );

    runtimeLogger.debug('Stopped metrics collection for context', {
      contextId,
      lifetimeMs: metrics.lifetimeMs,
      totalAccesses: metrics.accessCount,
      totalTransformations: metrics.transformationCount,
    });

    this.emit('collection_stopped', { contextId, metrics });

    // Keep metrics for a while before cleanup
    setTimeout(() => {
      this.contextInstances.delete(contextId);
      runtimeLogger.debug('Cleaned up context metrics', { contextId });
    }, 300000); // 5 minutes
  }

  /**
   * Record a metric value
   */
  recordMetric(
    contextId: string,
    metric: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    if (!this.config.enabled) return;

    const metricKey = `${contextId}:${metric}`;
    const entry: MetricEntry = {
      value,
      timestamp: new Date(),
      labels: { context_id: contextId, ...labels },
    };

    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }

    const entries = this.metrics.get(metricKey)!;
    entries.push(entry);

    // Limit entries per metric
    if (entries.length > this.config.maxMetricsPerContext) {
      entries.shift(); // Remove oldest entry
    }

    // Update context instance metrics
    const contextMetrics = this.contextInstances.get(contextId);
    if (contextMetrics) {
      contextMetrics.lastActivity = new Date();

      // Update specific counters
      switch (metric) {
        case 'context_access':
          contextMetrics.accessCount++;
          break;
        case 'context_transformation':
          contextMetrics.transformationCount++;
          break;
        case 'context_memory_usage':
          contextMetrics.memoryUsage = value;
          break;
        case 'context_quality_score':
          contextMetrics.qualityScore = value;
          break;
        case 'context_error':
          contextMetrics.errorCount++;
          break;
        case 'context_success':
          contextMetrics.successCount++;
          break;
      }
    }

    // Emit high-level metrics
    if (value > 1000 && metric.includes('duration')) {
      this.emit('slow_operation', { contextId, metric, value });
    }

    runtimeLogger.debug('Metric recorded', {
      contextId,
      metric,
      value: typeof value === 'number' ? value.toFixed(2) : value,
      labels,
    });
  }

  /**
   * Get metrics for a specific context
   */
  getMetrics(contextId: string): ContextMetrics | undefined {
    const contextMetrics = this.contextInstances.get(contextId);
    if (!contextMetrics) return undefined;

    return this.buildContextMetrics([contextMetrics]);
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): ContextMetrics {
    const allContexts = Array.from(this.contextInstances.values());
    return this.buildContextMetrics(allContexts);
  }

  /**
   * Export metrics in specified format
   */
  async exportMetrics(format: 'prometheus' | 'json'): Promise<string> {
    const allMetrics = this.getAllMetrics();

    switch (format) {
      case 'json':
        return JSON.stringify(allMetrics, null, 2);

      case 'prometheus':
        return this.exportPrometheusFormat(allMetrics);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Record context access metrics
   */
  recordAccess(
    contextId: string,
    accessor: string,
    accessType: 'read' | 'write' | 'merge' | 'transform',
    duration: number,
    dataSize: number,
    success: boolean
  ): void {
    const labels = {
      accessor,
      access_type: accessType,
      success: success.toString(),
    };

    this.recordMetric(
      contextId,
      'context_access_duration_ms',
      duration,
      labels
    );
    this.recordMetric(
      contextId,
      'context_access_data_size_bytes',
      dataSize,
      labels
    );
    this.recordMetric(contextId, 'context_access_total', 1, labels);

    if (success) {
      this.recordMetric(contextId, 'context_success', 1, labels);
    } else {
      this.recordMetric(contextId, 'context_error', 1, labels);
    }
  }

  /**
   * Record context transformation metrics
   */
  recordTransformation(
    contextId: string,
    transformationType: string,
    inputSize: number,
    outputSize: number,
    duration: number,
    success: boolean
  ): void {
    const labels = {
      transformation_type: transformationType,
      success: success.toString(),
    };

    const compressionRatio = inputSize > 0 ? outputSize / inputSize : 1;
    const dataReduction =
      inputSize > 0 ? (inputSize - outputSize) / inputSize : 0;

    this.recordMetric(
      contextId,
      'context_transformation_duration_ms',
      duration,
      labels
    );
    this.recordMetric(
      contextId,
      'context_transformation_input_size_bytes',
      inputSize,
      labels
    );
    this.recordMetric(
      contextId,
      'context_transformation_output_size_bytes',
      outputSize,
      labels
    );
    this.recordMetric(
      contextId,
      'context_transformation_compression_ratio',
      compressionRatio,
      labels
    );
    this.recordMetric(
      contextId,
      'context_transformation_data_reduction',
      dataReduction,
      labels
    );
    this.recordMetric(contextId, 'context_transformation_total', 1, labels);

    if (success) {
      this.recordMetric(contextId, 'context_transformation_success', 1, labels);
    } else {
      this.recordMetric(contextId, 'context_transformation_error', 1, labels);
    }
  }

  /**
   * Record context flow metrics
   */
  recordFlow(
    sourceContextId: string,
    targetContextId: string,
    flowType: 'merge' | 'split' | 'transform' | 'copy',
    duration: number,
    dataSize: number
  ): void {
    const labels = {
      source_context: sourceContextId,
      target_context: targetContextId,
      flow_type: flowType,
    };

    this.recordMetric(
      sourceContextId,
      'context_flow_duration_ms',
      duration,
      labels
    );
    this.recordMetric(
      sourceContextId,
      'context_flow_data_size_bytes',
      dataSize,
      labels
    );
    this.recordMetric(sourceContextId, 'context_flow_total', 1, labels);

    // Also record on target context
    this.recordMetric(targetContextId, 'context_flow_received_total', 1, {
      source_context: sourceContextId,
      flow_type: flowType,
    });
  }

  /**
   * Record context quality metrics
   */
  recordQuality(
    contextId: string,
    completeness: number,
    consistency: number,
    freshness: number,
    relevance: number,
    reliability: number
  ): void {
    this.recordMetric(contextId, 'context_quality_completeness', completeness);
    this.recordMetric(contextId, 'context_quality_consistency', consistency);
    this.recordMetric(contextId, 'context_quality_freshness', freshness);
    this.recordMetric(contextId, 'context_quality_relevance', relevance);
    this.recordMetric(contextId, 'context_quality_reliability', reliability);

    const overallScore =
      (completeness + consistency + freshness + relevance + reliability) / 5;
    this.recordMetric(contextId, 'context_quality_score', overallScore);
  }

  /**
   * Start periodic collection
   */
  private startCollection(): void {
    if (this.collectionInterval) return;

    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.cleanupOldMetrics();
    }, this.config.collectionIntervalMs);

    runtimeLogger.debug('Started periodic metrics collection', {
      intervalMs: this.config.collectionIntervalMs,
    });
  }

  /**
   * Stop periodic collection
   */
  private stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
      runtimeLogger.debug('Stopped periodic metrics collection');
    }
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const now = new Date();

    // System metrics
    this.recordMetric('system', 'memory_heap_used_bytes', memUsage.heapUsed);
    this.recordMetric('system', 'memory_heap_total_bytes', memUsage.heapTotal);
    this.recordMetric('system', 'memory_external_bytes', memUsage.external);
    this.recordMetric('system', 'memory_rss_bytes', memUsage.rss);

    // Context system metrics
    this.recordMetric(
      'system',
      'context_instances_total',
      this.contextInstances.size
    );
    this.recordMetric('system', 'context_metrics_total', this.metrics.size);

    // Calculate active contexts (accessed in last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const activeContexts = Array.from(this.contextInstances.values()).filter(
      (ctx) => ctx.lastActivity > fiveMinutesAgo
    ).length;

    this.recordMetric('system', 'context_instances_active', activeContexts);

    // Performance metrics
    const uptime = Date.now() - this.startTime;
    this.recordMetric('system', 'uptime_ms', uptime);
  }

  /**
   * Clean up old metrics entries
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    for (const [metricKey, entries] of this.metrics.entries()) {
      const originalLength = entries.length;
      const filteredEntries = entries.filter(
        (entry) => entry.timestamp > cutoffTime
      );

      if (filteredEntries.length !== originalLength) {
        this.metrics.set(metricKey, filteredEntries);
        cleanedCount += originalLength - filteredEntries.length;
      }

      // Remove empty metric arrays
      if (filteredEntries.length === 0) {
        this.metrics.delete(metricKey);
      }
    }

    if (cleanedCount > 0) {
      runtimeLogger.debug('Cleaned up old metric entries', { cleanedCount });
    }
  }

  /**
   * Build comprehensive context metrics
   */
  private buildContextMetrics(
    contextMetrics: ContextInstanceMetrics[]
  ): ContextMetrics {
    const instances: Record<string, any> = {};
    const typeStats: Record<string, any> = {};

    contextMetrics.forEach((ctx) => {
      instances[ctx.contextId] = {
        lifetimeMs: ctx.lifetimeMs,
        accessCount: ctx.accessCount,
        transformationCount: ctx.transformationCount,
        memoryUsage: ctx.memoryUsage,
        lastActivity: ctx.lastActivity,
        qualityScore: ctx.qualityScore,
      };

      // Aggregate by type (inferred from ID)
      const type = this.inferContextType(ctx.contextId);
      if (!typeStats[type]) {
        typeStats[type] = {
          instanceCount: 0,
          averageLifetime: 0,
          averageSize: 0,
          errorRate: 0,
          throughput: 0,
        };
      }

      typeStats[type].instanceCount++;
      typeStats[type].averageLifetime += ctx.lifetimeMs;
      typeStats[type].averageSize += ctx.memoryUsage;
      typeStats[type].errorRate +=
        ctx.errorCount / Math.max(1, ctx.accessCount + ctx.transformationCount);
      typeStats[type].throughput += ctx.accessCount + ctx.transformationCount;
    });

    // Average the type statistics
    Object.values(typeStats).forEach((stats: any) => {
      stats.averageLifetime /= stats.instanceCount;
      stats.averageSize /= stats.instanceCount;
      stats.errorRate /= stats.instanceCount;
    });

    // Calculate flow metrics
    const totalFlows = this.getTotalFlows();
    const activeFlows = this.getActiveFlows();

    const baseMetrics: ObservabilityMetrics = {
      system: {
        memory: {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          usage:
            process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
        },
        cpu: {
          usage: 0, // Would need external library
          loadAverage: require('os').loadavg(),
        },
        uptime: process.uptime() * 1000,
        eventLoopDelay: 0, // Would need external library
      },
      agents: {},
      portals: {},
      extensions: {},
      memory: {},
      health: {
        overall: 'healthy',
        components: {},
      },
      observability: {
        logEntriesPerSecond: 0,
        metricsCollected: this.metrics.size,
        tracesGenerated: 0,
        alertsTriggered: 0,
        overheadMs: 0,
      },
    };

    return {
      ...baseMetrics,
      context: {
        instances,
        types: typeStats,
        flow: {
          totalFlows,
          activeFlows,
          averageFlowTime: this.getAverageFlowTime(),
          bottleneckCount: this.getBottleneckCount(),
          flowEfficiency: this.getFlowEfficiency(),
        },
        transformations: this.getTransformationStats(),
        sharing: this.getSharingStats(),
      },
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  private exportPrometheusFormat(metrics: ContextMetrics): string {
    const lines: string[] = [];

    // Context instance metrics
    lines.push(
      '# HELP context_instances_total Total number of context instances'
    );
    lines.push('# TYPE context_instances_total gauge');
    lines.push(
      `context_instances_total ${Object.keys(metrics.context.instances).length}`
    );

    // Context type metrics
    Object.entries(metrics.context.types).forEach(([type, stats]) => {
      lines.push(
        `# HELP context_type_instances_total Context instances by type`
      );
      lines.push(`# TYPE context_type_instances_total gauge`);
      lines.push(
        `context_type_instances_total{type="${type}"} ${stats.instanceCount}`
      );

      lines.push(
        `# HELP context_type_average_lifetime_ms Average lifetime by type`
      );
      lines.push(`# TYPE context_type_average_lifetime_ms gauge`);
      lines.push(
        `context_type_average_lifetime_ms{type="${type}"} ${stats.averageLifetime}`
      );

      lines.push(`# HELP context_type_error_rate Error rate by type`);
      lines.push(`# TYPE context_type_error_rate gauge`);
      lines.push(`context_type_error_rate{type="${type}"} ${stats.errorRate}`);
    });

    // Flow metrics
    lines.push('# HELP context_flow_total Total context flows');
    lines.push('# TYPE context_flow_total counter');
    lines.push(`context_flow_total ${metrics.context.flow.totalFlows}`);

    lines.push('# HELP context_flow_active Active context flows');
    lines.push('# TYPE context_flow_active gauge');
    lines.push(`context_flow_active ${metrics.context.flow.activeFlows}`);

    lines.push('# HELP context_flow_efficiency Flow efficiency ratio');
    lines.push('# TYPE context_flow_efficiency gauge');
    lines.push(
      `context_flow_efficiency ${metrics.context.flow.flowEfficiency}`
    );

    // System metrics
    lines.push('# HELP system_memory_heap_used_bytes Heap memory used');
    lines.push('# TYPE system_memory_heap_used_bytes gauge');
    lines.push(
      `system_memory_heap_used_bytes ${metrics.system.memory.heapUsed}`
    );

    lines.push('# HELP system_uptime_ms System uptime in milliseconds');
    lines.push('# TYPE system_uptime_ms counter');
    lines.push(`system_uptime_ms ${metrics.system.uptime}`);

    return lines.join('\n');
  }

  /**
   * Helper methods for calculating derived metrics
   */
  private inferContextType(contextId: string): string {
    if (contextId.includes('portal')) return 'portal';
    if (contextId.includes('memory')) return 'memory';
    if (contextId.includes('cognition')) return 'cognition';
    if (contextId.includes('emotion')) return 'emotion';
    if (contextId.includes('extension')) return 'extension';
    return 'system';
  }

  private getTotalFlows(): number {
    return Array.from(this.metrics.keys())
      .filter((key) => key.includes('context_flow_total'))
      .reduce((sum, key) => {
        const entries = this.metrics.get(key) || [];
        return (
          sum + entries.reduce((entrySum, entry) => entrySum + entry.value, 0)
        );
      }, 0);
  }

  private getActiveFlows(): number {
    const recentTime = new Date(Date.now() - 60000); // Last minute
    return Array.from(this.metrics.keys())
      .filter((key) => key.includes('context_flow_total'))
      .reduce((sum, key) => {
        const entries = this.metrics.get(key) || [];
        const recentEntries = entries.filter(
          (entry) => entry.timestamp > recentTime
        );
        return sum + recentEntries.length;
      }, 0);
  }

  private getAverageFlowTime(): number {
    const flowTimes = Array.from(this.metrics.keys())
      .filter((key) => key.includes('context_flow_duration_ms'))
      .flatMap((key) => this.metrics.get(key) || [])
      .map((entry) => entry.value);

    return flowTimes.length > 0
      ? flowTimes.reduce((sum, time) => sum + time, 0) / flowTimes.length
      : 0;
  }

  private getBottleneckCount(): number {
    // Count slow operations as bottlenecks
    const slowOperations = Array.from(this.metrics.keys())
      .filter((key) => key.includes('duration_ms'))
      .flatMap((key) => this.metrics.get(key) || [])
      .filter((entry) => entry.value > 1000); // > 1 second

    return slowOperations.length;
  }

  private getFlowEfficiency(): number {
    const totalOperations = this.getTotalFlows();
    const successfulOperations = Array.from(this.metrics.keys())
      .filter((key) => key.includes('success'))
      .reduce((sum, key) => {
        const entries = this.metrics.get(key) || [];
        return (
          sum + entries.reduce((entrySum, entry) => entrySum + entry.value, 0)
        );
      }, 0);

    return totalOperations > 0 ? successfulOperations / totalOperations : 1;
  }

  private getTransformationStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    // Group transformation metrics by type
    Array.from(this.metrics.keys())
      .filter((key) => key.includes('context_transformation_'))
      .forEach((key) => {
        const entries = this.metrics.get(key) || [];
        entries.forEach((entry) => {
          const transformationType =
            entry.labels.transformation_type || 'unknown';
          if (!stats[transformationType]) {
            stats[transformationType] = {
              count: 0,
              successRate: 0,
              averageDuration: 0,
              dataReduction: 0,
              errorCount: 0,
            };
          }

          if (key.includes('total')) {
            stats[transformationType].count += entry.value;
          } else if (key.includes('success')) {
            stats[transformationType].successRate += entry.value;
          } else if (key.includes('duration')) {
            stats[transformationType].averageDuration += entry.value;
          } else if (key.includes('data_reduction')) {
            stats[transformationType].dataReduction += entry.value;
          } else if (key.includes('error')) {
            stats[transformationType].errorCount += entry.value;
          }
        });
      });

    // Calculate averages
    Object.values(stats).forEach((stat: any) => {
      if (stat.count > 0) {
        stat.successRate = stat.successRate / stat.count;
        stat.averageDuration = stat.averageDuration / stat.count;
        stat.dataReduction = stat.dataReduction / stat.count;
      }
    });

    return stats;
  }

  private getSharingStats(): any {
    const shareCount = Array.from(this.contextInstances.values()).reduce(
      (sum, ctx) => sum + (ctx.accessCount > 1 ? 1 : 0),
      0
    );

    return {
      shareCount,
      concurrentShares: this.getActiveFlows(),
      isolationViolations: 0, // Would need specific tracking
      sharingEfficiency: shareCount > 0 ? this.getFlowEfficiency() : 1,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopCollection();
    this.metrics.clear();
    this.contextInstances.clear();
    this.removeAllListeners();
    runtimeLogger.debug('Context metrics collector disposed');
  }

  /**
   * Get collector statistics
   */
  getStatistics() {
    return {
      metricsCount: this.metrics.size,
      contextInstancesCount: this.contextInstances.size,
      uptime: Date.now() - this.startTime,
      config: this.config,
      isCollecting: !!this.collectionInterval,
    };
  }
}
