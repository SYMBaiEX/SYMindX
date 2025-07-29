/**
 * @module core/context/monitoring/context-dashboard
 * @description Real-time context monitoring dashboard with anomaly detection
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { 
  ContextObservabilitySystem,
  ContextMetrics,
  ContextTrace,
  ContextObservabilityState
} from '../../../types/context/context-observability.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'flow' | 'heatmap';
  title: string;
  data: any;
  config: {
    refreshInterval: number;
    autoUpdate: boolean;
    thresholds?: Record<string, number>;
    chartType?: 'line' | 'bar' | 'pie' | 'gauge';
  };
  lastUpdate: Date;
}

interface DashboardConfig {
  refreshInterval: number;
  enableRealTime: boolean;
  maxDataPoints: number;
  enableAlerts: boolean;
  alertThresholds: Record<string, number>;
  widgetLayout: Array<{
    widgetId: string;
    position: { x: number; y: number; width: number; height: number };
  }>;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

interface AnomalyDetection {
  metric: string;
  baseline: number;
  currentValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  detected: Date;
  description: string;
}

/**
 * Comprehensive context monitoring dashboard
 */
export class ContextDashboard extends EventEmitter {
  private observabilitySystem: ContextObservabilitySystem;
  private widgets = new Map<string, DashboardWidget>();
  private config: DashboardConfig;
  private alertRules = new Map<string, AlertRule>();
  private dataHistory = new Map<string, Array<{ timestamp: Date; value: number }>>();
  private updateInterval?: NodeJS.Timeout;
  private anomalyBaselines = new Map<string, number[]>();

  constructor(
    observabilitySystem: ContextObservabilitySystem,
    config: Partial<DashboardConfig> = {}
  ) {
    super();
    this.observabilitySystem = observabilitySystem;
    this.config = {
      refreshInterval: 5000,
      enableRealTime: true,
      maxDataPoints: 100,
      enableAlerts: true,
      alertThresholds: {
        response_time: 1000,
        error_rate: 0.05,
        memory_usage: 0.8,
        context_quality: 0.6
      },
      widgetLayout: [],
      ...config
    };

    this.initializeDefaultWidgets();
    this.setupDefaultAlerts();
    
    if (this.config.enableRealTime) {
      this.startRealTimeUpdates();
    }

    runtimeLogger.debug('Context dashboard initialized', {
      widgetCount: this.widgets.size,
      alertRuleCount: this.alertRules.size,
      realTimeEnabled: this.config.enableRealTime
    });
  }

  /**
   * Add a custom widget to the dashboard
   */
  addWidget(widget: Omit<DashboardWidget, 'id' | 'lastUpdate'>): string {
    const widgetId = randomUUID();
    const fullWidget: DashboardWidget = {
      ...widget,
      id: widgetId,
      lastUpdate: new Date()
    };

    this.widgets.set(widgetId, fullWidget);

    runtimeLogger.debug('Dashboard widget added', {
      widgetId,
      type: widget.type,
      title: widget.title
    });

    this.emit('widget_added', { widgetId, widget: fullWidget });

    return widgetId;
  }

  /**
   * Remove a widget from the dashboard
   */
  removeWidget(widgetId: string): boolean {
    const removed = this.widgets.delete(widgetId);
    
    if (removed) {
      runtimeLogger.debug('Dashboard widget removed', { widgetId });
      this.emit('widget_removed', { widgetId });
    }

    return removed;
  }

  /**
   * Update widget data
   */
  async updateWidget(widgetId: string): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    try {
      const newData = await this.generateWidgetData(widget);
      widget.data = newData;
      widget.lastUpdate = new Date();

      runtimeLogger.debug('Widget updated', {
        widgetId,
        type: widget.type,
        dataSize: JSON.stringify(newData).length
      });

      this.emit('widget_updated', { widgetId, widget, data: newData });

    } catch (error) {
      runtimeLogger.error('Widget update failed', {
        widgetId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Get dashboard state with all widgets
   */
  getDashboardState(): {
    widgets: DashboardWidget[];
    layout: DashboardConfig['widgetLayout'];
    metrics: ContextObservabilityState;
    alerts: Array<{ rule: AlertRule; active: boolean }>;
    anomalies: AnomalyDetection[];
  } {
    const state = this.observabilitySystem.getObservabilityState();
    const widgets = Array.from(this.widgets.values());
    const alerts = Array.from(this.alertRules.values()).map(rule => ({
      rule,
      active: this.isAlertActive(rule)
    }));
    const anomalies = this.detectAnomalies();

    return {
      widgets,
      layout: this.config.widgetLayout,
      metrics: state,
      alerts,
      anomalies
    };
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id' | 'triggerCount'>): string {
    const ruleId = randomUUID();
    const fullRule: AlertRule = {
      ...rule,
      id: ruleId,
      triggerCount: 0
    };

    this.alertRules.set(ruleId, fullRule);

    runtimeLogger.debug('Alert rule added', {
      ruleId,
      name: rule.name,
      condition: rule.condition,
      threshold: rule.threshold
    });

    this.emit('alert_rule_added', { ruleId, rule: fullRule });

    return ruleId;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    
    if (removed) {
      runtimeLogger.debug('Alert rule removed', { ruleId });
      this.emit('alert_rule_removed', { ruleId });
    }

    return removed;
  }

  /**
   * Get real-time metrics data
   */
  async getRealTimeMetrics(): Promise<ContextMetrics> {
    return this.observabilitySystem.metrics.getAllMetrics();
  }

  /**
   * Get context flow visualization data
   */
  async getContextFlowData(contextIds: string[]): Promise<any> {
    try {
      const visualization = await this.observabilitySystem.visualizer.generateVisualization(
        contextIds,
        'flow'
      );
      return visualization;
    } catch (error) {
      runtimeLogger.error('Failed to generate context flow data', { contextIds, error });
      return null;
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(metric: string, timeRange: number = 3600000): Array<{ timestamp: Date; value: number }> {
    const history = this.dataHistory.get(metric) || [];
    const cutoff = new Date(Date.now() - timeRange);
    
    return history.filter(point => point.timestamp > cutoff);
  }

  /**
   * Export dashboard configuration
   */
  exportConfiguration(): {
    config: DashboardConfig;
    widgets: Array<Omit<DashboardWidget, 'data' | 'lastUpdate'>>;
    alertRules: AlertRule[];
  } {
    const widgets = Array.from(this.widgets.values()).map(widget => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      config: widget.config
    }));

    return {
      config: this.config,
      widgets,
      alertRules: Array.from(this.alertRules.values())
    };
  }

  /**
   * Import dashboard configuration
   */
  async importConfiguration(config: {
    config?: Partial<DashboardConfig>;
    widgets?: Array<Omit<DashboardWidget, 'data' | 'lastUpdate'>>;
    alertRules?: Array<Omit<AlertRule, 'id' | 'triggerCount'>>;
  }): Promise<void> {
    if (config.config) {
      this.config = { ...this.config, ...config.config };
    }

    if (config.widgets) {
      this.widgets.clear();
      for (const widget of config.widgets) {
        this.addWidget(widget);
      }
    }

    if (config.alertRules) {
      this.alertRules.clear();
      for (const rule of config.alertRules) {
        this.addAlertRule(rule);
      }
    }

    runtimeLogger.info('Dashboard configuration imported', {
      widgetCount: this.widgets.size,
      alertRuleCount: this.alertRules.size
    });

    this.emit('configuration_imported', config);
  }

  /**
   * Private helper methods
   */

  private initializeDefaultWidgets(): void {
    // System Overview Widget
    this.addWidget({
      type: 'metric',
      title: 'System Overview',
      data: {},
      config: {
        refreshInterval: 5000,
        autoUpdate: true,
        chartType: 'gauge'
      }
    });

    // Context Metrics Chart
    this.addWidget({
      type: 'chart',
      title: 'Context Metrics',
      data: {},
      config: {
        refreshInterval: 10000,
        autoUpdate: true,
        chartType: 'line'
      }
    });

    // Active Contexts Table
    this.addWidget({
      type: 'table',
      title: 'Active Contexts',
      data: {},
      config: {
        refreshInterval: 5000,
        autoUpdate: true
      }
    });

    // Context Flow Visualization
    this.addWidget({
      type: 'flow',
      title: 'Context Flow',
      data: {},
      config: {
        refreshInterval: 10000,
        autoUpdate: true
      }
    });

    // Performance Heatmap
    this.addWidget({
      type: 'heatmap',
      title: 'Performance Heatmap',
      data: {},
      config: {
        refreshInterval: 15000,
        autoUpdate: true
      }
    });

    // Alert Status
    this.addWidget({
      type: 'alert',
      title: 'Active Alerts',
      data: {},
      config: {
        refreshInterval: 5000,
        autoUpdate: true
      }
    });
  }

  private setupDefaultAlerts(): void {
    // High response time alert
    this.addAlertRule({
      name: 'High Response Time',
      condition: 'avg_response_time > threshold',
      threshold: this.config.alertThresholds.response_time,
      severity: 'warning',
      enabled: true
    });

    // High error rate alert
    this.addAlertRule({
      name: 'High Error Rate',
      condition: 'error_rate > threshold',
      threshold: this.config.alertThresholds.error_rate,
      severity: 'error',
      enabled: true
    });

    // High memory usage alert
    this.addAlertRule({
      name: 'High Memory Usage',
      condition: 'memory_usage > threshold',
      threshold: this.config.alertThresholds.memory_usage,
      severity: 'warning',
      enabled: true
    });

    // Low context quality alert
    this.addAlertRule({
      name: 'Low Context Quality',
      condition: 'context_quality < threshold',
      threshold: this.config.alertThresholds.context_quality,
      severity: 'warning',
      enabled: true
    });
  }

  private async generateWidgetData(widget: DashboardWidget): Promise<any> {
    const state = this.observabilitySystem.getObservabilityState();
    const metrics = await this.getRealTimeMetrics();

    switch (widget.type) {
      case 'metric':
        return this.generateMetricData(state, metrics);

      case 'chart':
        return this.generateChartData(widget, metrics);

      case 'table':
        return this.generateTableData(state, metrics);

      case 'flow':
        return this.generateFlowData(state);

      case 'heatmap':
        return this.generateHeatmapData(metrics);

      case 'alert':
        return this.generateAlertData();

      default:
        return {};
    }
  }

  private generateMetricData(
    state: ContextObservabilityState, 
    metrics: ContextMetrics
  ): any {
    return {
      activeContexts: state.tracedContexts.length,
      totalTraces: state.tracingStatus.totalTraces,
      systemHealth: state.health.status,
      memoryUsage: (state.resources.memoryUsage * 100).toFixed(1) + '%',
      cpuUsage: (state.resources.cpuUsage * 100).toFixed(1) + '%',
      uptime: Math.floor(metrics.system.uptime / 1000) + 's',
      lastUpdate: new Date().toISOString()
    };
  }

  private generateChartData(widget: DashboardWidget, metrics: ContextMetrics): any {
    const chartData = {
      labels: [],
      datasets: []
    };

    // Generate time series data for the last hour
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const interval = 5 * 60 * 1000; // 5 minute intervals

    const timeLabels = [];
    for (let time = now - oneHour; time <= now; time += interval) {
      timeLabels.push(new Date(time).toLocaleTimeString());
    }

    chartData.labels = timeLabels;

    // Add context metrics dataset
    if (metrics.context) {
      const contextData = timeLabels.map((_, index) => {
        // Simulate data points (in real implementation, use actual historical data)
        return Object.keys(metrics.context.instances).length * (0.8 + Math.random() * 0.4);
      });

      chartData.datasets.push({
        label: 'Active Contexts',
        data: contextData,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4
      });
    }

    return chartData;
  }

  private generateTableData(
    state: ContextObservabilityState, 
    metrics: ContextMetrics
  ): any {
    const tableData = {
      headers: ['Context ID', 'Type', 'Status', 'Lifetime', 'Quality', 'Actions'],
      rows: []
    };

    if (metrics.context?.instances) {
      for (const [contextId, instance] of Object.entries(metrics.context.instances)) {
        tableData.rows.push([
          contextId.substring(0, 12) + '...',
          this.inferContextType(contextId),
          'Active', // Would come from actual status
          this.formatDuration(instance.lifetimeMs),
          (instance.qualityScore * 100).toFixed(0) + '%',
          ['View', 'Debug', 'Stop']
        ]);
      }
    }

    return tableData;
  }

  private async generateFlowData(state: ContextObservabilityState): Promise<any> {
    if (state.tracedContexts.length === 0) {
      return { nodes: [], edges: [] };
    }

    try {
      const flowData = await this.getContextFlowData(state.tracedContexts);
      return flowData || { nodes: [], edges: [] };
    } catch (error) {
      runtimeLogger.error('Failed to generate flow data', { error });
      return { nodes: [], edges: [] };
    }
  }

  private generateHeatmapData(metrics: ContextMetrics): any {
    const heatmapData = {
      data: [],
      maxValue: 1
    };

    if (metrics.context?.instances) {
      const instances = Object.entries(metrics.context.instances);
      let maxQuality = 0;

      instances.forEach(([contextId, instance], index) => {
        const quality = instance.qualityScore;
        maxQuality = Math.max(maxQuality, quality);

        heatmapData.data.push({
          x: index % 10,
          y: Math.floor(index / 10),
          value: quality,
          contextId,
          label: contextId.substring(0, 8)
        });
      });

      heatmapData.maxValue = maxQuality;
    }

    return heatmapData;
  }

  private generateAlertData(): any {
    const activeAlerts = Array.from(this.alertRules.values())
      .filter(rule => this.isAlertActive(rule))
      .map(rule => ({
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        condition: rule.condition,
        threshold: rule.threshold,
        lastTriggered: rule.lastTriggered,
        triggerCount: rule.triggerCount
      }));

    return {
      alerts: activeAlerts,
      totalCount: activeAlerts.length,
      severityCounts: {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        error: activeAlerts.filter(a => a.severity === 'error').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length
      }
    };
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateAllWidgets();
        await this.checkAlerts();
        this.updateAnomalyBaselines();
      } catch (error) {
        runtimeLogger.error('Real-time update failed', { error });
      }
    }, this.config.refreshInterval);

    runtimeLogger.debug('Real-time updates started', {
      interval: this.config.refreshInterval
    });
  }

  private async updateAllWidgets(): Promise<void> {
    const updatePromises = Array.from(this.widgets.keys()).map(async (widgetId) => {
      try {
        await this.updateWidget(widgetId);
      } catch (error) {
        runtimeLogger.error('Widget update failed during bulk update', { widgetId, error });
      }
    });

    await Promise.all(updatePromises);
  }

  private async checkAlerts(): Promise<void> {
    const metrics = await this.getRealTimeMetrics();
    const state = this.observabilitySystem.getObservabilityState();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const shouldTrigger = this.evaluateAlertCondition(rule, metrics, state);
      
      if (shouldTrigger) {
        rule.triggerCount++;
        rule.lastTriggered = new Date();

        runtimeLogger.warn('Alert triggered', {
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          triggerCount: rule.triggerCount
        });

        this.emit('alert_triggered', { rule, metrics, state });
      }
    }
  }

  private isAlertActive(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return false;
    
    // Consider alert active if triggered within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return rule.lastTriggered > fiveMinutesAgo;
  }

  private evaluateAlertCondition(
    rule: AlertRule,
    metrics: ContextMetrics,
    state: ContextObservabilityState
  ): boolean {
    // Simplified alert evaluation (in production, use a proper expression evaluator)
    try {
      switch (rule.condition) {
        case 'avg_response_time > threshold':
          return this.calculateAverageResponseTime(metrics) > rule.threshold;
        
        case 'error_rate > threshold':
          return this.calculateErrorRate(metrics) > rule.threshold;
        
        case 'memory_usage > threshold':
          return state.resources.memoryUsage > rule.threshold;
        
        case 'context_quality < threshold':
          return this.calculateAverageContextQuality(metrics) < rule.threshold;
        
        default:
          return false;
      }
    } catch (error) {
      runtimeLogger.error('Alert condition evaluation failed', { 
        ruleId: rule.id,
        condition: rule.condition,
        error 
      });
      return false;
    }
  }

  private calculateAverageResponseTime(metrics: ContextMetrics): number {
    if (!metrics.context?.instances) return 0;
    
    const instances = Object.values(metrics.context.instances);
    if (instances.length === 0) return 0;
    
    const totalTime = instances.reduce((sum, instance) => sum + instance.lifetimeMs, 0);
    const totalAccesses = instances.reduce((sum, instance) => sum + instance.accessCount, 0);
    
    return totalAccesses > 0 ? totalTime / totalAccesses : 0;
  }

  private calculateErrorRate(metrics: ContextMetrics): number {
    // Simplified error rate calculation
    if (!metrics.context?.transformations) return 0;
    
    const transformations = Object.values(metrics.context.transformations);
    if (transformations.length === 0) return 0;
    
    const totalTransformations = transformations.reduce((sum, t) => sum + t.count, 0);
    const totalErrors = transformations.reduce((sum, t) => sum + t.errorCount, 0);
    
    return totalTransformations > 0 ? totalErrors / totalTransformations : 0;
  }

  private calculateAverageContextQuality(metrics: ContextMetrics): number {
    if (!metrics.context?.instances) return 1;
    
    const instances = Object.values(metrics.context.instances);
    if (instances.length === 0) return 1;
    
    const totalQuality = instances.reduce((sum, instance) => sum + instance.qualityScore, 0);
    return totalQuality / instances.length;
  }

  private updateAnomalyBaselines(): void {
    // Update baseline values for anomaly detection
    const metrics = this.observabilitySystem.metrics.getAllMetrics();
    
    // Add current values to baselines
    this.addToBaseline('response_time', this.calculateAverageResponseTime(metrics));
    this.addToBaseline('error_rate', this.calculateErrorRate(metrics));
    this.addToBaseline('context_quality', this.calculateAverageContextQuality(metrics));
  }

  private addToBaseline(metric: string, value: number): void {
    if (!this.anomalyBaselines.has(metric)) {
      this.anomalyBaselines.set(metric, []);
    }
    
    const baseline = this.anomalyBaselines.get(metric)!;
    baseline.push(value);
    
    // Keep only last 100 values
    if (baseline.length > 100) {
      baseline.shift();
    }
  }

  private detectAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    for (const [metric, baseline] of this.anomalyBaselines.entries()) {
      if (baseline.length < 10) continue; // Need at least 10 data points
      
      const currentValue = baseline[baseline.length - 1];
      const average = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
      const stdDev = Math.sqrt(
        baseline.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / baseline.length
      );
      
      const deviation = Math.abs(currentValue - average);
      const zScore = stdDev > 0 ? deviation / stdDev : 0;
      
      if (zScore > 2) { // More than 2 standard deviations
        const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low';
        
        anomalies.push({
          metric,
          baseline: average,
          currentValue,
          deviation,
          severity,
          confidence: Math.min(0.95, zScore / 3),
          detected: new Date(),
          description: `${metric} value ${currentValue.toFixed(2)} deviates significantly from baseline ${average.toFixed(2)}`
        });
      }
    }
    
    return anomalies;
  }

  private inferContextType(contextId: string): string {
    if (contextId.includes('portal')) return 'Portal';
    if (contextId.includes('memory')) return 'Memory';
    if (contextId.includes('cognition')) return 'Cognition';
    if (contextId.includes('emotion')) return 'Emotion';
    if (contextId.includes('extension')) return 'Extension';
    return 'System';
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.widgets.clear();
    this.alertRules.clear();
    this.dataHistory.clear();
    this.anomalyBaselines.clear();
    this.removeAllListeners();

    runtimeLogger.debug('Context dashboard disposed');
  }

  /**
   * Get dashboard statistics
   */
  getStatistics() {
    return {
      widgetCount: this.widgets.size,
      activeAlerts: Array.from(this.alertRules.values()).filter(r => this.isAlertActive(r)).length,
      totalAlertRules: this.alertRules.size,
      dataPoints: Array.from(this.dataHistory.values()).reduce((sum, history) => sum + history.length, 0),
      anomalyBaselines: this.anomalyBaselines.size,
      realTimeEnabled: this.config.enableRealTime,
      config: this.config
    };
  }
}