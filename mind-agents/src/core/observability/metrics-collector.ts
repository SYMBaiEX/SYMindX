/**
 * @module observability/metrics-collector
 * @description Enhanced metrics collection system for SYMindX
 *
 * Integrates with existing performance monitor to provide comprehensive
 * metrics collection with minimal overhead and intelligent aggregation.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

import type {
  ObservabilityConfig,
  ObservabilityMetrics,
  MetricType,
  TraceContext,
  ObservabilityEvent,
} from './types.js';
import { OBSERVABILITY_CONSTANTS } from './constants.js';
import {
  performanceMonitor,
  PerformanceMonitor,
  type AgentMetrics,
  type SystemMetrics,
} from '../../utils/performance-monitor.js';
import { healthMonitor } from '../../utils/health-monitor.js';
import { runtimeLogger } from '../../utils/logger.js';

/**
 * Metric aggregator for efficient data collection
 */
class MetricAggregator {
  private buckets = new Map<string, number[]>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<
    string,
    { sum: number; count: number; buckets: Map<number, number> }
  >();
  private readonly maxBucketSize = 1000;

  /**
   * Record a counter metric
   */
  public recordCounter(
    name: string,
    value: number = 1,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  /**
   * Record a gauge metric
   */
  public recordGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram metric
   */
  public recordHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);

    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        sum: 0,
        count: 0,
        buckets: new Map([
          [1, 0],
          [5, 0],
          [10, 0],
          [25, 0],
          [50, 0],
          [100, 0],
          [250, 0],
          [500, 0],
          [1000, 0],
          [2500, 0],
          [5000, 0],
          [10000, 0],
          [Infinity, 0],
        ]),
      });
    }

    const histogram = this.histograms.get(key)!;
    histogram.sum += value;
    histogram.count += 1;

    // Update buckets
    for (const [bucket, count] of histogram.buckets.entries()) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, count + 1);
      }
    }
  }

  /**
   * Record a timing metric
   */
  public recordTiming(
    name: string,
    duration: number,
    labels: Record<string, string> = {}
  ): void {
    this.recordHistogram(`${name}_duration`, duration, labels);
    this.recordCounter(`${name}_total`, 1, labels);
  }

  /**
   * Get all metrics
   */
  public getMetrics(): {
    counters: Map<string, number>;
    gauges: Map<string, number>;
    histograms: Map<
      string,
      { sum: number; count: number; buckets: Map<number, number> }
    >;
  } {
    return {
      counters: new Map(this.counters),
      gauges: new Map(this.gauges),
      histograms: new Map(this.histograms),
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.buckets.clear();
  }

  /**
   * Create metric key with labels
   */
  private createMetricKey(
    name: string,
    labels: Record<string, string>
  ): string {
    if (Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${labelStr}}`;
  }
}

/**
 * Agent-specific metrics collector
 */
class AgentMetricsCollector {
  private agentTimers = new Map<string, Map<string, number>>();
  private agentCounters = new Map<string, Record<string, number>>();

  /**
   * Start timing an agent operation
   */
  public startAgentOperation(agentId: string, operation: string): string {
    const operationId = `${agentId}_${operation}_${Date.now()}`;

    if (!this.agentTimers.has(agentId)) {
      this.agentTimers.set(agentId, new Map());
    }

    this.agentTimers.get(agentId)!.set(operationId, performance.now());
    return operationId;
  }

  /**
   * End timing an agent operation
   */
  public endAgentOperation(agentId: string, operationId: string): number {
    const agentTimers = this.agentTimers.get(agentId);
    if (!agentTimers?.has(operationId)) {
      return 0;
    }

    const startTime = agentTimers.get(operationId)!;
    const duration = performance.now() - startTime;
    agentTimers.delete(operationId);

    return duration;
  }

  /**
   * Record agent counter
   */
  public recordAgentCounter(
    agentId: string,
    counter: string,
    value: number = 1
  ): void {
    if (!this.agentCounters.has(agentId)) {
      this.agentCounters.set(agentId, {});
    }

    const counters = this.agentCounters.get(agentId)!;
    counters[counter] = (counters[counter] || 0) + value;
  }

  /**
   * Get agent metrics
   */
  public getAgentMetrics(agentId: string): Record<string, number> {
    return { ...this.agentCounters.get(agentId) };
  }

  /**
   * Get all agent metrics
   */
  public getAllAgentMetrics(): Map<string, Record<string, number>> {
    return new Map(this.agentCounters);
  }

  /**
   * Reset agent metrics
   */
  public resetAgentMetrics(agentId?: string): void {
    if (agentId) {
      this.agentCounters.delete(agentId);
      this.agentTimers.delete(agentId);
    } else {
      this.agentCounters.clear();
      this.agentTimers.clear();
    }
  }
}

/**
 * Portal-specific metrics collector
 */
class PortalMetricsCollector {
  private portalMetrics = new Map<
    string,
    {
      requestCount: number;
      errorCount: number;
      totalLatency: number;
      tokenUsage: number;
      modelUsage: Map<string, number>;
    }
  >();

  /**
   * Record portal request
   */
  public recordPortalRequest(
    portalId: string,
    model: string | undefined,
    latency: number,
    tokens: number,
    error: boolean = false
  ): void {
    if (!this.portalMetrics.has(portalId)) {
      this.portalMetrics.set(portalId, {
        requestCount: 0,
        errorCount: 0,
        totalLatency: 0,
        tokenUsage: 0,
        modelUsage: new Map(),
      });
    }

    const metrics = this.portalMetrics.get(portalId)!;
    metrics.requestCount += 1;
    metrics.totalLatency += latency;
    metrics.tokenUsage += tokens;

    if (error) {
      metrics.errorCount += 1;
    }

    if (model) {
      metrics.modelUsage.set(model, (metrics.modelUsage.get(model) || 0) + 1);
    }
  }

  /**
   * Get portal metrics
   */
  public getPortalMetrics(portalId: string):
    | {
        requestCount: number;
        errorCount: number;
        averageLatency: number;
        tokenUsage: number;
        modelUsage: Record<string, number>;
      }
    | undefined {
    const metrics = this.portalMetrics.get(portalId);
    if (!metrics) return undefined;

    return {
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      averageLatency:
        metrics.requestCount > 0
          ? metrics.totalLatency / metrics.requestCount
          : 0,
      tokenUsage: metrics.tokenUsage,
      modelUsage: Object.fromEntries(metrics.modelUsage),
    };
  }

  /**
   * Get all portal metrics
   */
  public getAllPortalMetrics(): Record<
    string,
    {
      requestCount: number;
      errorCount: number;
      averageLatency: number;
      tokenUsage: number;
    }
  > {
    const result: Record<string, any> = {};

    for (const [portalId, metrics] of this.portalMetrics) {
      result[portalId] = {
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        averageLatency:
          metrics.requestCount > 0
            ? metrics.totalLatency / metrics.requestCount
            : 0,
        tokenUsage: metrics.tokenUsage,
      };
    }

    return result;
  }

  /**
   * Reset portal metrics
   */
  public resetPortalMetrics(portalId?: string): void {
    if (portalId) {
      this.portalMetrics.delete(portalId);
    } else {
      this.portalMetrics.clear();
    }
  }
}

/**
 * Main metrics collector
 */
export class MetricsCollector extends EventEmitter {
  private aggregator: MetricAggregator;
  private agentCollector: AgentMetricsCollector;
  private portalCollector: PortalMetricsCollector;
  private config: ObservabilityConfig['metrics'];
  private collectionTimer?: NodeJS.Timeout;
  private enabled = true;
  private lastCollectionTime = 0;

  constructor(config: ObservabilityConfig['metrics']) {
    super();
    this.config = config;
    this.enabled = config.enableCollection;
    this.aggregator = new MetricAggregator();
    this.agentCollector = new AgentMetricsCollector();
    this.portalCollector = new PortalMetricsCollector();

    if (this.enabled) {
      this.startCollection();
    }
  }

  /**
   * Start metrics collection
   */
  public startCollection(): void {
    if (this.collectionTimer) {
      return; // Already started
    }

    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionIntervalMs);

    runtimeLogger.info('Metrics collection started', {
      metadata: {
        interval: this.config.collectionIntervalMs,
        customMetrics: this.config.enableCustomMetrics,
      },
    });
  }

  /**
   * Stop metrics collection
   */
  public stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    runtimeLogger.info('Metrics collection stopped');
  }

  /**
   * Record a metric from a trace context
   */
  public recordMetricFromTrace(
    context: TraceContext,
    metricName: string,
    value: number,
    metricType: 'counter' | 'gauge' | 'histogram' = 'counter'
  ): void {
    if (!this.enabled) return;

    const labels = {
      trace_id: context.traceId.slice(-8), // Last 8 chars for cardinality control
      operation: (context.metadata.operationName as string) || 'unknown',
    };

    switch (metricType) {
      case 'counter':
        this.aggregator.recordCounter(metricName, value, labels);
        break;
      case 'gauge':
        this.aggregator.recordGauge(metricName, value, labels);
        break;
      case 'histogram':
        this.aggregator.recordHistogram(metricName, value, labels);
        break;
    }
  }

  /**
   * Record an observability event
   */
  public recordEvent(event: ObservabilityEvent): void {
    if (!this.enabled) return;

    const startTime = performance.now();

    try {
      switch (event.type) {
        case 'agent':
          this.recordAgentEvent(event);
          break;
        case 'portal':
          this.recordPortalEvent(event);
          break;
        case 'extension':
          this.recordExtensionEvent(event);
          break;
        case 'memory':
          this.recordMemoryEvent(event);
          break;
        case 'health':
          this.recordHealthEvent(event);
          break;
        case 'system':
          this.recordSystemEvent(event);
          break;
      }

      this.emit('eventRecorded', event);
    } catch (error) {
      runtimeLogger.error('Failed to record metrics event', error as Error, {
        metadata: { eventType: event.type },
      });
    } finally {
      // Record observability overhead
      const overhead = performance.now() - startTime;
      this.aggregator.recordHistogram(
        OBSERVABILITY_CONSTANTS.METRICS.OBSERVABILITY_OVERHEAD,
        overhead
      );
    }
  }

  /**
   * Get comprehensive metrics
   */
  public getMetrics(): ObservabilityMetrics {
    const systemMetrics = performanceMonitor.getSystemMetrics();
    const healthDashboard = healthMonitor.getHealthDashboard();

    return {
      system: {
        memory: systemMetrics.memory,
        cpu: systemMetrics.cpu,
        uptime: systemMetrics.uptime,
        eventLoopDelay: systemMetrics.eventLoopDelay,
      },
      agents: this.getAgentMetricsData(),
      portals: this.portalCollector.getAllPortalMetrics(),
      extensions: this.getExtensionMetricsData(),
      memory: this.getMemoryMetricsData(),
      health: {
        overall: healthDashboard.overall,
        components: Object.fromEntries(
          healthDashboard.components.map((component) => [
            component.componentId,
            {
              status: component.status as any,
              responseTime: component.responseTime || 0,
              uptime: component.details?.uptime || 0,
            },
          ])
        ),
      },
      observability: {
        logEntriesPerSecond: this.calculateLogRate(),
        metricsCollected:
          this.aggregator.getMetrics().counters.size +
          this.aggregator.getMetrics().gauges.size +
          this.aggregator.getMetrics().histograms.size,
        tracesGenerated: 0, // Would be provided by tracing system
        alertsTriggered: healthDashboard.recentAlerts.length,
        overheadMs: this.calculateOverhead(),
      },
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheusMetrics(): string {
    const metrics = this.aggregator.getMetrics();
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of metrics.counters) {
      const [name, labels] = this.parseMetricKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labels} ${value}`);
    }

    // Export gauges
    for (const [key, value] of metrics.gauges) {
      const [name, labels] = this.parseMetricKey(key);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labels} ${value}`);
    }

    // Export histograms
    for (const [key, histogram] of metrics.histograms) {
      const [name, labels] = this.parseMetricKey(key);
      lines.push(`# TYPE ${name} histogram`);

      // Export buckets
      for (const [bucket, count] of histogram.buckets) {
        const bucketLabels = labels
          ? labels.slice(0, -1) +
            `,le="${bucket === Infinity ? '+Inf' : bucket}"}`
          : `{le="${bucket === Infinity ? '+Inf' : bucket}"}`;
        lines.push(`${name}_bucket${bucketLabels} ${count}`);
      }

      // Export sum and count
      lines.push(`${name}_sum${labels} ${histogram.sum}`);
      lines.push(`${name}_count${labels} ${histogram.count}`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.aggregator.reset();
    this.agentCollector.resetAgentMetrics();
    this.portalCollector.resetPortalMetrics();

    runtimeLogger.info('Metrics reset');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ObservabilityConfig['metrics']>): void {
    this.config = { ...this.config, ...config };
    this.enabled = this.config.enableCollection;

    if (this.enabled && !this.collectionTimer) {
      this.startCollection();
    } else if (!this.enabled && this.collectionTimer) {
      this.stopCollection();
    }
  }

  /**
   * Record agent event
   */
  private recordAgentEvent(
    event: ObservabilityEvent & { type: 'agent' }
  ): void {
    const labels = { agent_id: event.agentId, operation: event.operation };

    this.aggregator.recordCounter(
      OBSERVABILITY_CONSTANTS.METRICS.AGENT_ACTIONS_TOTAL,
      1,
      labels
    );

    if (event.status === 'failed') {
      this.aggregator.recordCounter(
        OBSERVABILITY_CONSTANTS.METRICS.AGENT_ERRORS_TOTAL,
        1,
        labels
      );
    }

    if (event.duration !== undefined) {
      const metricName =
        event.operation === 'think'
          ? OBSERVABILITY_CONSTANTS.METRICS.AGENT_THINK_TIME
          : OBSERVABILITY_CONSTANTS.METRICS.AGENT_RESPONSE_TIME;

      this.aggregator.recordHistogram(metricName, event.duration, labels);
    }
  }

  /**
   * Record portal event
   */
  private recordPortalEvent(
    event: ObservabilityEvent & { type: 'portal' }
  ): void {
    const labels = { portal_id: event.portalId };
    if (event.model) {
      labels['model'] = event.model;
    }

    this.aggregator.recordCounter(
      OBSERVABILITY_CONSTANTS.METRICS.PORTAL_REQUESTS_TOTAL,
      1,
      labels
    );

    if (event.operation === 'error') {
      this.aggregator.recordCounter(
        OBSERVABILITY_CONSTANTS.METRICS.PORTAL_ERRORS_TOTAL,
        1,
        labels
      );
    }

    if (event.duration !== undefined) {
      this.aggregator.recordHistogram(
        OBSERVABILITY_CONSTANTS.METRICS.PORTAL_REQUEST_DURATION,
        event.duration,
        labels
      );
    }

    if (event.tokens !== undefined) {
      this.aggregator.recordCounter(
        OBSERVABILITY_CONSTANTS.METRICS.PORTAL_TOKENS_USED,
        event.tokens,
        labels
      );
    }

    // Use portal collector for detailed tracking
    this.portalCollector.recordPortalRequest(
      event.portalId,
      event.model,
      event.duration || 0,
      event.tokens || 0,
      event.operation === 'error'
    );
  }

  /**
   * Record extension event
   */
  private recordExtensionEvent(
    event: ObservabilityEvent & { type: 'extension' }
  ): void {
    const labels = {
      extension_id: event.extensionId,
      operation: event.operation,
    };

    this.aggregator.recordCounter(
      OBSERVABILITY_CONSTANTS.METRICS.EXTENSION_MESSAGES_TOTAL,
      1,
      labels
    );

    if (event.status === 'failed') {
      this.aggregator.recordCounter(
        OBSERVABILITY_CONSTANTS.METRICS.EXTENSION_ERRORS_TOTAL,
        1,
        labels
      );
    }

    if (event.duration !== undefined) {
      this.aggregator.recordHistogram(
        OBSERVABILITY_CONSTANTS.METRICS.EXTENSION_LATENCY,
        event.duration,
        labels
      );
    }
  }

  /**
   * Record memory event
   */
  private recordMemoryEvent(
    event: ObservabilityEvent & { type: 'memory' }
  ): void {
    const labels = {
      provider_id: event.providerId,
      operation: event.operation,
    };

    this.aggregator.recordCounter(
      OBSERVABILITY_CONSTANTS.METRICS.MEMORY_OPERATIONS_TOTAL,
      1,
      labels
    );

    if (event.duration !== undefined) {
      this.aggregator.recordHistogram(
        OBSERVABILITY_CONSTANTS.METRICS.MEMORY_OPERATION_DURATION,
        event.duration,
        labels
      );
    }
  }

  /**
   * Record health event
   */
  private recordHealthEvent(
    event: ObservabilityEvent & { type: 'health' }
  ): void {
    const labels = {
      component_id: event.componentId,
      operation: event.operation,
    };

    this.aggregator.recordCounter(
      OBSERVABILITY_CONSTANTS.METRICS.HEALTH_CHECKS_TOTAL,
      1,
      labels
    );

    if (event.responseTime !== undefined) {
      this.aggregator.recordHistogram(
        OBSERVABILITY_CONSTANTS.METRICS.HEALTH_CHECK_DURATION,
        event.responseTime,
        labels
      );
    }

    // Record health status as gauge
    const statusValue = event.status === 'healthy' ? 1 : 0;
    this.aggregator.recordGauge(
      OBSERVABILITY_CONSTANTS.METRICS.HEALTH_STATUS,
      statusValue,
      { component_id: event.componentId }
    );
  }

  /**
   * Record system event
   */
  private recordSystemEvent(
    event: ObservabilityEvent & { type: 'system' }
  ): void {
    const labels = { operation: event.operation };

    if (event.value !== undefined) {
      const metricName = `${OBSERVABILITY_CONSTANTS.METRIC_PREFIXES.SYSTEM}${event.operation}`;
      this.aggregator.recordGauge(metricName, event.value, labels);
    }
  }

  /**
   * Collect metrics from performance monitor
   */
  private collectMetrics(): void {
    const collectionStart = performance.now();

    try {
      // Collect system metrics
      const systemMetrics = performanceMonitor.getSystemMetrics();
      this.aggregator.recordGauge(
        OBSERVABILITY_CONSTANTS.METRICS.SYSTEM_MEMORY_USAGE,
        systemMetrics.memory.heapUsed
      );
      this.aggregator.recordGauge(
        OBSERVABILITY_CONSTANTS.METRICS.SYSTEM_CPU_USAGE,
        systemMetrics.cpu.usage * 100
      );
      this.aggregator.recordGauge(
        OBSERVABILITY_CONSTANTS.METRICS.SYSTEM_UPTIME,
        systemMetrics.uptime
      );
      this.aggregator.recordGauge(
        OBSERVABILITY_CONSTANTS.METRICS.SYSTEM_EVENT_LOOP_LAG,
        systemMetrics.eventLoopDelay
      );

      // Collect custom metrics from performance monitor
      const allMetrics = performanceMonitor.getAllMetrics();
      for (const metric of allMetrics) {
        if (metric.data.length > 0) {
          const latest = metric.data[metric.data.length - 1];
          if (latest) {
            this.aggregator.recordGauge(metric.name, latest.value);
          }
        }
      }

      this.emit('metricsCollected');
    } catch (error) {
      runtimeLogger.error('Failed to collect metrics', error as Error);
    } finally {
      const collectionTime = performance.now() - collectionStart;
      this.aggregator.recordHistogram(
        'metrics_collection_duration',
        collectionTime
      );
      this.lastCollectionTime = collectionTime;
    }
  }

  /**
   * Get agent metrics data
   */
  private getAgentMetricsData(): Record<
    string,
    {
      status: string;
      thinkTime: number;
      responseTime: number;
      actionCount: number;
      errorCount: number;
      memoryUsage: number;
    }
  > {
    const result: Record<string, any> = {};
    const agentMetrics = this.agentCollector.getAllAgentMetrics();

    for (const [agentId, metrics] of agentMetrics) {
      const performanceMetrics = performanceMonitor.getAgentMetrics(agentId);

      result[agentId] = {
        status: 'active', // Would get from agent registry
        thinkTime: performanceMetrics?.thinkTime.average || 0,
        responseTime: performanceMetrics?.responseTime.average || 0,
        actionCount: performanceMetrics?.actionCount || 0,
        errorCount: performanceMetrics?.errorCount || 0,
        memoryUsage: performanceMetrics?.memoryUsage || 0,
      };
    }

    return result;
  }

  /**
   * Get extension metrics data
   */
  private getExtensionMetricsData(): Record<
    string,
    {
      activeConnections: number;
      messageCount: number;
      errorCount: number;
      latency: number;
    }
  > {
    // Placeholder - would integrate with extension system
    return {};
  }

  /**
   * Get memory metrics data
   */
  private getMemoryMetricsData(): Record<
    string,
    {
      operationCount: number;
      averageLatency: number;
      errorCount: number;
      storageSize: number;
    }
  > {
    // Placeholder - would integrate with memory providers
    return {};
  }

  /**
   * Calculate log rate
   */
  private calculateLogRate(): number {
    // Placeholder - would track log entries
    return 0;
  }

  /**
   * Calculate observability overhead
   */
  private calculateOverhead(): number {
    return this.lastCollectionTime;
  }

  /**
   * Parse metric key to extract name and labels
   */
  private parseMetricKey(key: string): [string, string] {
    const labelStart = key.indexOf('{');
    if (labelStart === -1) {
      return [key, ''];
    }

    const name = key.substring(0, labelStart);
    const labels = key.substring(labelStart);
    return [name, labels];
  }
}
