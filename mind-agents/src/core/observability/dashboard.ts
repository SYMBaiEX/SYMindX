/**
 * @module observability/dashboard
 * @description Real-time observability dashboard for SYMindX
 *
 * Provides comprehensive dashboard data aggregation and real-time
 * monitoring capabilities with efficient data streaming.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

import type {
  ObservabilityConfig,
  DashboardData,
  ObservabilityMetrics,
  TraceContext,
} from './types.js';
import { OBSERVABILITY_CONSTANTS } from './constants.js';
import type { ObservabilityManager } from './observability-manager.js';
import { runtimeLogger } from '../../utils/logger.js';

/**
 * Time series data point
 */
interface TimeSeriesPoint {
  timestamp: Date;
  metrics: Partial<ObservabilityMetrics>;
}

/**
 * Dashboard widget configuration
 */
interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'health' | 'trace';
  title: string;
  config: {
    metricPath?: string;
    timeRange?: number;
    refreshRate?: number;
    chartType?: 'line' | 'bar' | 'gauge' | 'pie';
    thresholds?: { warning: number; critical: number };
  };
  position: { x: number; y: number; width: number; height: number };
  enabled: boolean;
}

/**
 * Real-time data streamer
 */
class RealTimeStreamer extends EventEmitter {
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private streamInterval?: NodeJS.Timeout;
  private isStreaming = false;

  /**
   * Start streaming data
   */
  public startStreaming(intervalMs: number = 5000): void {
    if (this.isStreaming) return;

    this.isStreaming = true;
    this.streamInterval = setInterval(() => {
      this.emitDataToSubscribers();
    }, intervalMs);

    runtimeLogger.debug('Real-time streaming started', {
      metadata: { intervalMs, subscribers: this.subscribers.size },
    });
  }

  /**
   * Stop streaming data
   */
  public stopStreaming(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = undefined;
    }
    this.isStreaming = false;

    runtimeLogger.debug('Real-time streaming stopped');
  }

  /**
   * Subscribe to data stream
   */
  public subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }

    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(callback);
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Publish data to channel
   */
  public publish(channel: string, data: any): void {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(data);
        } catch (error) {
          runtimeLogger.error(
            `Error in stream subscriber callback for channel: ${channel}`,
            error as Error
          );
        }
      }
    }
  }

  /**
   * Emit data to all subscribers
   */
  private emitDataToSubscribers(): void {
    this.emit('dataUpdate');
  }

  /**
   * Get subscriber count
   */
  public getSubscriberCount(): number {
    let total = 0;
    for (const subscribers of this.subscribers.values()) {
      total += subscribers.size;
    }
    return total;
  }
}

/**
 * Time series data manager
 */
class TimeSeriesManager {
  private timeSeries: TimeSeriesPoint[] = [];
  private readonly maxDataPoints: number;
  private readonly retentionMs: number;

  constructor(
    maxDataPoints: number = 1000,
    retentionMs: number = 24 * 60 * 60 * 1000
  ) {
    this.maxDataPoints = maxDataPoints;
    this.retentionMs = retentionMs;
  }

  /**
   * Add data point
   */
  public addDataPoint(metrics: Partial<ObservabilityMetrics>): void {
    const point: TimeSeriesPoint = {
      timestamp: new Date(),
      metrics,
    };

    this.timeSeries.push(point);

    // Cleanup old data
    this.cleanup();
  }

  /**
   * Get time series data
   */
  public getTimeSeries(
    fromTime?: Date,
    toTime?: Date,
    limit?: number
  ): TimeSeriesPoint[] {
    let filtered = this.timeSeries;

    // Filter by time range
    if (fromTime || toTime) {
      filtered = filtered.filter((point) => {
        if (fromTime && point.timestamp < fromTime) return false;
        if (toTime && point.timestamp > toTime) return false;
        return true;
      });
    }

    // Apply limit
    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  /**
   * Get aggregated data for time windows
   */
  public getAggregatedData(
    windowMs: number,
    aggregationType: 'avg' | 'min' | 'max' | 'sum' = 'avg'
  ): Array<{ timestamp: Date; value: number; metricPath: string }> {
    // Group data points by time windows
    const windows = new Map<number, TimeSeriesPoint[]>();

    for (const point of this.timeSeries) {
      const windowStart =
        Math.floor(point.timestamp.getTime() / windowMs) * windowMs;

      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      windows.get(windowStart)!.push(point);
    }

    // Aggregate data for each window
    const result: Array<{
      timestamp: Date;
      value: number;
      metricPath: string;
    }> = [];

    for (const [windowStart, points] of windows) {
      // This is a simplified aggregation - in practice, you'd aggregate specific metric paths
      const avgValue = points.length > 0 ? points.length : 0; // Placeholder aggregation

      result.push({
        timestamp: new Date(windowStart),
        value: avgValue,
        metricPath: 'system.uptime', // Example metric path
      });
    }

    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Cleanup old data points
   */
  private cleanup(): void {
    const cutoffTime = new Date(Date.now() - this.retentionMs);

    // Remove old points
    this.timeSeries = this.timeSeries.filter(
      (point) => point.timestamp > cutoffTime
    );

    // Limit by count
    if (this.timeSeries.length > this.maxDataPoints) {
      this.timeSeries = this.timeSeries.slice(-this.maxDataPoints);
    }
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalPoints: number;
    oldestPoint?: Date;
    newestPoint?: Date;
    memoryUsage: number;
  } {
    return {
      totalPoints: this.timeSeries.length,
      oldestPoint: this.timeSeries[0]?.timestamp,
      newestPoint: this.timeSeries[this.timeSeries.length - 1]?.timestamp,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: each point is ~1KB in memory
    return this.timeSeries.length * 1024;
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.timeSeries = [];
  }
}

/**
 * Dashboard metrics calculator
 */
class MetricsCalculator {
  /**
   * Calculate system performance score (0-100)
   */
  public calculatePerformanceScore(metrics: ObservabilityMetrics): number {
    let score = 100;

    // Memory usage penalty
    if (metrics.system.memory.usage > 0.8) {
      score -= 20;
    } else if (metrics.system.memory.usage > 0.6) {
      score -= 10;
    }

    // CPU usage penalty (if available)
    if (metrics.system.cpu.usage > 0.8) {
      score -= 20;
    } else if (metrics.system.cpu.usage > 0.6) {
      score -= 10;
    }

    // Error rate penalty
    const totalErrors = Object.values(metrics.agents).reduce(
      (sum, agent) => sum + agent.errorCount,
      0
    );
    if (totalErrors > 20) {
      score -= 30;
    } else if (totalErrors > 10) {
      score -= 15;
    } else if (totalErrors > 5) {
      score -= 5;
    }

    // Response time penalty
    const avgResponseTime =
      Object.values(metrics.agents).reduce(
        (sum, agent) => sum + agent.responseTime,
        0
      ) / Math.max(Object.keys(metrics.agents).length, 1);

    if (avgResponseTime > 5000) {
      score -= 25;
    } else if (avgResponseTime > 2000) {
      score -= 10;
    }

    // Health component penalty
    const unhealthyComponents = Object.values(metrics.health.components).filter(
      (c) => c.status !== 'healthy'
    ).length;

    score -= unhealthyComponents * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate resource utilization percentage
   */
  public calculateResourceUtilization(metrics: ObservabilityMetrics): {
    memory: number;
    cpu: number;
    overall: number;
  } {
    const memory = metrics.system.memory.usage * 100;
    const cpu = metrics.system.cpu.usage * 100;
    const overall = (memory + cpu) / 2;

    return { memory, cpu, overall };
  }

  /**
   * Calculate throughput metrics
   */
  public calculateThroughput(
    currentMetrics: ObservabilityMetrics,
    previousMetrics?: ObservabilityMetrics,
    intervalMs: number = 5000
  ): {
    agentActionsPerSecond: number;
    portalRequestsPerSecond: number;
    extensionMessagesPerSecond: number;
  } {
    if (!previousMetrics) {
      return {
        agentActionsPerSecond: 0,
        portalRequestsPerSecond: 0,
        extensionMessagesPerSecond: 0,
      };
    }

    const intervalSeconds = intervalMs / 1000;

    // Calculate agent actions throughput
    const currentAgentActions = Object.values(currentMetrics.agents).reduce(
      (sum, agent) => sum + agent.actionCount,
      0
    );
    const previousAgentActions = Object.values(previousMetrics.agents).reduce(
      (sum, agent) => sum + agent.actionCount,
      0
    );

    const agentActionsPerSecond =
      (currentAgentActions - previousAgentActions) / intervalSeconds;

    // Calculate portal requests throughput
    const currentPortalRequests = Object.values(currentMetrics.portals).reduce(
      (sum, portal) => sum + portal.requestCount,
      0
    );
    const previousPortalRequests = Object.values(
      previousMetrics.portals
    ).reduce((sum, portal) => sum + portal.requestCount, 0);

    const portalRequestsPerSecond =
      (currentPortalRequests - previousPortalRequests) / intervalSeconds;

    // Calculate extension messages throughput
    const currentExtensionMessages = Object.values(
      currentMetrics.extensions
    ).reduce((sum, ext) => sum + ext.messageCount, 0);
    const previousExtensionMessages = Object.values(
      previousMetrics.extensions
    ).reduce((sum, ext) => sum + ext.messageCount, 0);

    const extensionMessagesPerSecond =
      (currentExtensionMessages - previousExtensionMessages) / intervalSeconds;

    return {
      agentActionsPerSecond: Math.max(0, agentActionsPerSecond),
      portalRequestsPerSecond: Math.max(0, portalRequestsPerSecond),
      extensionMessagesPerSecond: Math.max(0, extensionMessagesPerSecond),
    };
  }
}

/**
 * Main observability dashboard
 */
export class ObservabilityDashboard extends EventEmitter {
  private config: ObservabilityConfig['dashboard'];
  private observabilityManager: ObservabilityManager;
  private timeSeriesManager: TimeSeriesManager;
  private realTimeStreamer: RealTimeStreamer;
  private metricsCalculator: MetricsCalculator;
  private widgets: Map<string, DashboardWidget> = new Map();

  private refreshTimer?: NodeJS.Timeout;
  private enabled = true;
  private lastMetrics?: ObservabilityMetrics;

  constructor(
    config: ObservabilityConfig['dashboard'],
    observabilityManager: ObservabilityManager
  ) {
    super();

    this.config = config;
    this.enabled = config.enableDashboard;
    this.observabilityManager = observabilityManager;
    this.timeSeriesManager = new TimeSeriesManager(
      config.maxDataPoints,
      OBSERVABILITY_CONSTANTS.RETENTION.METRICS_MS
    );
    this.realTimeStreamer = new RealTimeStreamer();
    this.metricsCalculator = new MetricsCalculator();

    this.setupDefaultWidgets();

    if (this.enabled) {
      this.start();
    }
  }

  /**
   * Start dashboard data collection
   */
  public start(): void {
    if (!this.enabled) return;

    // Start real-time streaming
    if (this.config.enableRealTime) {
      this.realTimeStreamer.startStreaming(this.config.refreshIntervalMs);
    }

    // Start data refresh timer
    this.refreshTimer = setInterval(() => {
      this.refreshData();
    }, this.config.refreshIntervalMs);

    // Setup event handlers
    this.setupEventHandlers();

    runtimeLogger.info('Observability dashboard started', {
      metadata: {
        refreshInterval: this.config.refreshIntervalMs,
        realTime: this.config.enableRealTime,
        widgets: this.widgets.size,
      },
    });

    this.emit('started');
  }

  /**
   * Stop dashboard
   */
  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.realTimeStreamer.stopStreaming();

    runtimeLogger.info('Observability dashboard stopped');
    this.emit('stopped');
  }

  /**
   * Get complete dashboard data
   */
  public async getDashboardData(): Promise<DashboardData> {
    const startTime = performance.now();

    try {
      const dashboardData = await this.observabilityManager.getDashboardData();

      // Enhance with time series data
      const timeSeries = this.timeSeriesManager.getTimeSeries(
        new Date(Date.now() - 60 * 60 * 1000), // Last hour
        undefined,
        100
      );

      // Add calculated metrics
      const enhancedData: DashboardData = {
        ...dashboardData,
        timeSeries,
        insights: [
          ...dashboardData.insights,
          ...this.generatePerformanceInsights(dashboardData.realTimeMetrics),
        ],
      };

      // Store current metrics for throughput calculation
      this.lastMetrics = dashboardData.realTimeMetrics;

      return enhancedData;
    } finally {
      const duration = performance.now() - startTime;
      this.observabilityManager.recordEvent({
        type: 'system',
        operation: 'dashboard_data_generation',
        value: duration,
        metadata: {},
      });
    }
  }

  /**
   * Get widget data
   */
  public async getWidgetData(widgetId: string): Promise<any> {
    const widget = this.widgets.get(widgetId);
    if (!widget || !widget.enabled) {
      throw new Error(`Widget not found or disabled: ${widgetId}`);
    }

    const metrics = this.observabilityManager.getMetrics();

    switch (widget.type) {
      case 'metric':
        return this.getMetricWidgetData(widget, metrics);
      case 'chart':
        return this.getChartWidgetData(widget, metrics);
      case 'alert':
        return this.getAlertWidgetData(widget);
      case 'health':
        return this.getHealthWidgetData(widget, metrics);
      case 'trace':
        return this.getTraceWidgetData(widget);
      default:
        throw new Error(`Unknown widget type: ${widget.type}`);
    }
  }

  /**
   * Subscribe to real-time updates
   */
  public subscribe(channel: string, callback: (data: any) => void): () => void {
    return this.realTimeStreamer.subscribe(channel, callback);
  }

  /**
   * Add custom widget
   */
  public addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);

    runtimeLogger.debug(`Dashboard widget added: ${widget.title}`, {
      metadata: { widgetId: widget.id, type: widget.type },
    });

    this.emit('widgetAdded', widget);
  }

  /**
   * Remove widget
   */
  public removeWidget(widgetId: string): boolean {
    const existed = this.widgets.delete(widgetId);

    if (existed) {
      runtimeLogger.debug(`Dashboard widget removed: ${widgetId}`);
      this.emit('widgetRemoved', widgetId);
    }

    return existed;
  }

  /**
   * Update widget configuration
   */
  public updateWidget(
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): boolean {
    const widget = this.widgets.get(widgetId);
    if (!widget) return false;

    const updatedWidget = { ...widget, ...updates };
    this.widgets.set(widgetId, updatedWidget);

    this.emit('widgetUpdated', updatedWidget);
    return true;
  }

  /**
   * Get all widgets
   */
  public getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Export dashboard configuration
   */
  public exportConfiguration(): {
    widgets: DashboardWidget[];
    config: ObservabilityConfig['dashboard'];
    timestamp: Date;
  } {
    return {
      widgets: this.getWidgets(),
      config: this.config,
      timestamp: new Date(),
    };
  }

  /**
   * Import dashboard configuration
   */
  public importConfiguration(config: {
    widgets: DashboardWidget[];
    config?: Partial<ObservabilityConfig['dashboard']>;
  }): void {
    // Clear existing widgets
    this.widgets.clear();

    // Import widgets
    for (const widget of config.widgets) {
      this.addWidget(widget);
    }

    // Update configuration if provided
    if (config.config) {
      this.updateConfig(config.config);
    }

    this.emit('configurationImported', config);
  }

  /**
   * Update dashboard configuration
   */
  public updateConfig(
    updates: Partial<ObservabilityConfig['dashboard']>
  ): void {
    this.config = { ...this.config, ...updates };
    this.enabled = this.config.enableDashboard;

    // Restart with new configuration
    if (this.enabled) {
      this.stop();
      this.start();
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Get dashboard statistics
   */
  public getStatistics(): {
    enabled: boolean;
    widgets: number;
    subscribers: number;
    timeSeriesPoints: number;
    memoryUsage: number;
    lastRefresh?: Date;
  } {
    const timeSeriesStats = this.timeSeriesManager.getStatistics();

    return {
      enabled: this.enabled,
      widgets: this.widgets.size,
      subscribers: this.realTimeStreamer.getSubscriberCount(),
      timeSeriesPoints: timeSeriesStats.totalPoints,
      memoryUsage: timeSeriesStats.memoryUsage,
      lastRefresh: timeSeriesStats.newestPoint,
    };
  }

  /**
   * Setup default dashboard widgets
   */
  private setupDefaultWidgets(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'system_overview',
        type: 'metric',
        title: 'System Overview',
        config: {
          metricPath: 'system',
          refreshRate: 5000,
        },
        position: { x: 0, y: 0, width: 6, height: 4 },
        enabled: true,
      },
      {
        id: 'agent_performance',
        type: 'chart',
        title: 'Agent Performance',
        config: {
          metricPath: 'agents',
          timeRange: 3600000, // 1 hour
          chartType: 'line',
        },
        position: { x: 6, y: 0, width: 6, height: 4 },
        enabled: true,
      },
      {
        id: 'active_alerts',
        type: 'alert',
        title: 'Active Alerts',
        config: {
          refreshRate: 10000,
        },
        position: { x: 0, y: 4, width: 4, height: 3 },
        enabled: true,
      },
      {
        id: 'health_status',
        type: 'health',
        title: 'Component Health',
        config: {
          refreshRate: 30000,
        },
        position: { x: 4, y: 4, width: 4, height: 3 },
        enabled: true,
      },
      {
        id: 'observability_overhead',
        type: 'gauge',
        title: 'Observability Overhead',
        config: {
          metricPath: 'observability.overheadMs',
          thresholds: { warning: 3, critical: 5 },
        },
        position: { x: 8, y: 4, width: 4, height: 3 },
        enabled: true,
      },
    ];

    for (const widget of defaultWidgets) {
      this.addWidget(widget);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen for observability events
    this.observabilityManager.on('eventRecorded', (event) => {
      this.realTimeStreamer.publish('events', event);
    });

    this.observabilityManager.on('alertTriggered', (alert) => {
      this.realTimeStreamer.publish('alerts', alert);
    });

    this.observabilityManager.on('alertResolved', (alert) => {
      this.realTimeStreamer.publish('alerts', { ...alert, resolved: true });
    });

    // Data update streaming
    this.realTimeStreamer.on('dataUpdate', () => {
      this.publishRealTimeData();
    });
  }

  /**
   * Refresh dashboard data
   */
  private async refreshData(): void {
    try {
      const metrics = this.observabilityManager.getMetrics();

      // Add to time series
      this.timeSeriesManager.addDataPoint(metrics);

      // Calculate enhanced metrics
      const performanceScore =
        this.metricsCalculator.calculatePerformanceScore(metrics);
      const resourceUtilization =
        this.metricsCalculator.calculateResourceUtilization(metrics);
      const throughput = this.metricsCalculator.calculateThroughput(
        metrics,
        this.lastMetrics,
        this.config.refreshIntervalMs
      );

      // Publish real-time data
      this.realTimeStreamer.publish('metrics', {
        timestamp: new Date(),
        metrics,
        performanceScore,
        resourceUtilization,
        throughput,
      });

      this.lastMetrics = metrics;
      this.emit('dataRefreshed', metrics);
    } catch (error) {
      runtimeLogger.error('Failed to refresh dashboard data', error as Error);
    }
  }

  /**
   * Publish real-time data to subscribers
   */
  private async publishRealTimeData(): void {
    const dashboardData = await this.getDashboardData();
    this.realTimeStreamer.publish('dashboard', dashboardData);
  }

  /**
   * Get metric widget data
   */
  private getMetricWidgetData(
    widget: DashboardWidget,
    metrics: ObservabilityMetrics
  ): any {
    const metricPath = widget.config.metricPath;
    if (!metricPath) return null;

    // Navigate to metric value
    const value = this.getNestedValue(metrics, metricPath);

    return {
      widgetId: widget.id,
      type: 'metric',
      value,
      timestamp: new Date(),
      unit: this.getMetricUnit(metricPath),
    };
  }

  /**
   * Get chart widget data
   */
  private getChartWidgetData(
    widget: DashboardWidget,
    metrics: ObservabilityMetrics
  ): any {
    const timeRange = widget.config.timeRange || 3600000; // 1 hour default
    const fromTime = new Date(Date.now() - timeRange);

    const timeSeries = this.timeSeriesManager.getTimeSeries(fromTime);

    return {
      widgetId: widget.id,
      type: 'chart',
      chartType: widget.config.chartType || 'line',
      data: timeSeries.map((point) => ({
        timestamp: point.timestamp,
        value: this.getNestedValue(
          point.metrics,
          widget.config.metricPath || ''
        ),
      })),
      timestamp: new Date(),
    };
  }

  /**
   * Get alert widget data
   */
  private getAlertWidgetData(widget: DashboardWidget): any {
    // Would integrate with alerting system
    return {
      widgetId: widget.id,
      type: 'alert',
      alerts: [], // Placeholder
      timestamp: new Date(),
    };
  }

  /**
   * Get health widget data
   */
  private getHealthWidgetData(
    widget: DashboardWidget,
    metrics: ObservabilityMetrics
  ): any {
    return {
      widgetId: widget.id,
      type: 'health',
      overall: metrics.health.overall,
      components: metrics.health.components,
      timestamp: new Date(),
    };
  }

  /**
   * Get trace widget data
   */
  private getTraceWidgetData(widget: DashboardWidget): any {
    // Would integrate with tracing system
    return {
      widgetId: widget.id,
      type: 'trace',
      traces: [], // Placeholder
      timestamp: new Date(),
    };
  }

  /**
   * Generate performance insights
   */
  private generatePerformanceInsights(
    metrics: ObservabilityMetrics
  ): DashboardData['insights'] {
    const insights: DashboardData['insights'] = [];

    const performanceScore =
      this.metricsCalculator.calculatePerformanceScore(metrics);
    if (performanceScore < 70) {
      insights.push({
        type: 'performance',
        severity: performanceScore < 50 ? 'error' : 'warning',
        message: `System performance score is low: ${performanceScore.toFixed(1)}/100`,
        recommendation: 'Review system resources and error rates',
        data: { performanceScore },
      });
    }

    const resourceUtil =
      this.metricsCalculator.calculateResourceUtilization(metrics);
    if (resourceUtil.overall > 80) {
      insights.push({
        type: 'resource',
        severity: resourceUtil.overall > 90 ? 'error' : 'warning',
        message: `High resource utilization: ${resourceUtil.overall.toFixed(1)}%`,
        recommendation: 'Consider scaling resources or optimizing workloads',
        data: resourceUtil,
      });
    }

    return insights;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get metric unit
   */
  private getMetricUnit(metricPath: string): string {
    if (metricPath.includes('memory')) return 'bytes';
    if (metricPath.includes('cpu') || metricPath.includes('usage')) return '%';
    if (metricPath.includes('time')) return 'ms';
    if (metricPath.includes('count') || metricPath.includes('total'))
      return 'count';
    return '';
  }
}
