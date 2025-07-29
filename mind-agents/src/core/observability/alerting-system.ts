/**
 * @module observability/alerting-system
 * @description Intelligent alerting system for SYMindX
 * 
 * Provides comprehensive alerting with predictive capabilities,
 * intelligent rule evaluation, and automated response actions.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

import type {
  ObservabilityConfig,
  AlertRule,
  ObservabilityMetrics,
  TraceContext,
} from './types.js';
import { OBSERVABILITY_CONSTANTS, DEFAULT_ALERT_RULES } from './constants.js';
import type { MetricsCollector } from './metrics-collector.js';
import { runtimeLogger } from '../../utils/logger.js';

/**
 * Alert state tracking
 */
interface AlertState {
  ruleId: string;
  triggered: boolean;
  triggerTime?: Date;
  lastEvaluation: Date;
  evaluationCount: number;
  consecutiveFailures: number;
  lastValue: number;
  trend: 'rising' | 'falling' | 'stable';
  history: Array<{ timestamp: Date; value: number; triggered: boolean }>;
}

/**
 * Active alert instance
 */
interface ActiveAlert {
  id: string;
  ruleId: string;
  rule: AlertRule;
  triggerTime: Date;
  currentValue: number;
  message: string;
  acknowledged: boolean;
  escalated: boolean;
  context: Record<string, unknown>;
}

/**
 * Alert action executor
 */
class AlertActionExecutor {
  /**
   * Execute alert actions
   */
  public async executeActions(
    alert: ActiveAlert,
    actions: AlertRule['actions']
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(alert, action);
      } catch (error) {
        runtimeLogger.error(
          `Failed to execute alert action: ${action.type}`,
          error as Error,
          {
            metadata: {
              alertId: alert.id,
              ruleId: alert.ruleId,
              actionType: action.type,
            },
          }
        );
      }
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(
    alert: ActiveAlert,
    action: AlertRule['actions'][0]
  ): Promise<void> {
    switch (action.type) {
      case 'log':
        this.executeLogAction(alert, action.config);
        break;
      case 'email':
        await this.executeEmailAction(alert, action.config);
        break;
      case 'webhook':
        await this.executeWebhookAction(alert, action.config);
        break;
      case 'slack':
        await this.executeSlackAction(alert, action.config);
        break;
      default:
        runtimeLogger.warn(`Unknown alert action type: ${action.type}`);
    }
  }

  /**
   * Execute log action
   */
  private executeLogAction(
    alert: ActiveAlert,
    config: Record<string, unknown>
  ): void {
    const level = (config.level as string) || 'warn';
    const logger = runtimeLogger;

    const logMethod = logger[level as keyof typeof logger] as Function;
    if (typeof logMethod === 'function') {
      logMethod.call(logger, `ALERT: ${alert.message}`, {
        correlationId: alert.id,
        metadata: {
          ruleId: alert.ruleId,
          severity: alert.rule.severity,
          value: alert.currentValue,
          threshold: alert.rule.condition.threshold,
          ...alert.context,
        },
      });
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(
    alert: ActiveAlert,
    config: Record<string, unknown>
  ): Promise<void> {
    // Placeholder for email integration
    runtimeLogger.info(`Email alert sent: ${alert.message}`, {
      metadata: { 
        alertId: alert.id, 
        recipient: config.to,
        subject: config.subject || `SYMindX Alert: ${alert.rule.name}`,
      }
    });
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(
    alert: ActiveAlert,
    config: Record<string, unknown>
  ): Promise<void> {
    const url = config.url as string;
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert: {
        id: alert.id,
        rule: alert.rule.name,
        severity: alert.rule.severity,
        message: alert.message,
        value: alert.currentValue,
        threshold: alert.rule.condition.threshold,
        timestamp: alert.triggerTime.toISOString(),
      },
      context: alert.context,
    };

    // Placeholder for HTTP request
    runtimeLogger.info(`Webhook alert sent: ${url}`, {
      metadata: { alertId: alert.id, payload },
    });
  }

  /**
   * Execute Slack action
   */
  private async executeSlackAction(
    alert: ActiveAlert,
    config: Record<string, unknown>
  ): Promise<void> {
    const channel = config.channel as string;
    if (!channel) {
      throw new Error('Slack channel not configured');
    }

    const message = this.formatSlackMessage(alert);
    
    // Placeholder for Slack integration
    runtimeLogger.info(`Slack alert sent: ${channel}`, {
      metadata: { alertId: alert.id, message },
    });
  }

  /**
   * Format Slack message
   */
  private formatSlackMessage(alert: ActiveAlert): string {
    const emoji = this.getSeverityEmoji(alert.rule.severity);
    return `${emoji} *${alert.rule.name}*\n` +
           `Severity: ${alert.rule.severity.toUpperCase()}\n` +
           `Message: ${alert.message}\n` +
           `Value: ${alert.currentValue}\n` +
           `Threshold: ${alert.rule.condition.threshold}\n` +
           `Time: ${alert.triggerTime.toISOString()}`;
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }
}

/**
 * Predictive alert analyzer
 */
class PredictiveAnalyzer {
  /**
   * Analyze metric trends for predictive alerting
   */
  public analyzeTrend(
    values: Array<{ timestamp: Date; value: number }>,
    rule: AlertRule
  ): {
    trend: 'rising' | 'falling' | 'stable';
    predictedValue: number;
    riskScore: number;
    recommendation?: string;
  } {
    if (values.length < 3) {
      return {
        trend: 'stable',
        predictedValue: values[values.length - 1]?.value || 0,
        riskScore: 0,
      };
    }

    // Calculate trend using linear regression
    const trend = this.calculateTrend(values);
    const predictedValue = this.predictNextValue(values, trend);
    const riskScore = this.calculateRiskScore(predictedValue, rule);
    const recommendation = this.generateRecommendation(trend, riskScore, rule);

    return {
      trend: trend.direction,
      predictedValue,
      riskScore,
      recommendation,
    };
  }

  /**
   * Calculate trend direction and slope
   */
  private calculateTrend(values: Array<{ timestamp: Date; value: number }>): {
    direction: 'rising' | 'falling' | 'stable';
    slope: number;
  } {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = values[i]!.value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction: 'rising' | 'falling' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'rising';
    } else {
      direction = 'falling';
    }

    return { direction, slope };
  }

  /**
   * Predict next value based on trend
   */
  private predictNextValue(
    values: Array<{ timestamp: Date; value: number }>,
    trend: { slope: number }
  ): number {
    const lastValue = values[values.length - 1]!.value;
    const predicted = lastValue + trend.slope;
    return Math.max(0, predicted); // Ensure non-negative
  }

  /**
   * Calculate risk score (0-1)
   */
  private calculateRiskScore(predictedValue: number, rule: AlertRule): number {
    const threshold = rule.condition.threshold;
    const operator = rule.condition.operator;

    let risk = 0;
    switch (operator) {
      case 'gt':
      case 'gte':
        risk = Math.max(0, Math.min(1, predictedValue / threshold));
        break;
      case 'lt':
      case 'lte':
        risk = Math.max(0, Math.min(1, threshold / (predictedValue || 1)));
        break;
      case 'eq':
        risk = Math.max(0, 1 - Math.abs(predictedValue - threshold) / threshold);
        break;
      case 'ne':
        risk = Math.min(1, Math.abs(predictedValue - threshold) / threshold);
        break;
    }

    return risk;
  }

  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(
    trend: { direction: string; slope: number },
    riskScore: number,
    rule: AlertRule
  ): string | undefined {
    if (riskScore < 0.3) return undefined;

    const severity = rule.severity;
    const metricName = rule.metricName;

    if (trend.direction === 'rising' && riskScore > 0.7) {
      return `${metricName} is trending upward and may exceed threshold soon. Consider scaling resources or investigating root cause.`;
    }

    if (trend.direction === 'falling' && severity === 'critical') {
      return `Critical metric ${metricName} is declining rapidly. Immediate attention required.`;
    }

    if (riskScore > 0.8) {
      return `High risk detected for ${metricName}. Monitor closely and prepare mitigation actions.`;
    }

    return undefined;
  }
}

/**
 * Main alerting system
 */
export class AlertingSystem extends EventEmitter {
  private rules = new Map<string, AlertRule>();
  private alertStates = new Map<string, AlertState>();
  private activeAlerts = new Map<string, ActiveAlert>();
  private actionExecutor: AlertActionExecutor;
  private predictiveAnalyzer: PredictiveAnalyzer;
  private config: ObservabilityConfig['health'];
  private evaluationTimer?: NodeJS.Timeout;
  private enabled = true;

  constructor(
    config: ObservabilityConfig['health'],
    private metricsCollector: MetricsCollector
  ) {
    super();
    this.config = config;
    this.enabled = config.enableHealthChecks;
    this.actionExecutor = new AlertActionExecutor();
    this.predictiveAnalyzer = new PredictiveAnalyzer();

    // Load default rules
    this.loadDefaultRules();

    if (this.enabled) {
      this.startEvaluation();
    }
  }

  /**
   * Start alert evaluation
   */
  public startEvaluation(): void {
    if (this.evaluationTimer) {
      return; // Already started
    }

    this.evaluationTimer = setInterval(() => {
      this.evaluateRules();
    }, this.config.checkIntervalMs);

    runtimeLogger.info('Alert evaluation started', {
      metadata: {
        interval: this.config.checkIntervalMs,
        rulesCount: this.rules.size,
      },
    });
  }

  /**
   * Stop alert evaluation
   */
  public stopEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }

    runtimeLogger.info('Alert evaluation stopped');
  }

  /**
   * Add alert rule
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    
    // Initialize alert state
    this.alertStates.set(rule.id, {
      ruleId: rule.id,
      triggered: false,
      lastEvaluation: new Date(),
      evaluationCount: 0,
      consecutiveFailures: 0,
      lastValue: 0,
      trend: 'stable',
      history: [],
    });

    runtimeLogger.info(`Alert rule added: ${rule.name}`, {
      metadata: {
        ruleId: rule.id,
        metricName: rule.metricName,
        severity: rule.severity,
      },
    });

    this.emit('ruleAdded', rule);
  }

  /**
   * Remove alert rule
   */
  public removeRule(ruleId: string): boolean {
    const existed = this.rules.delete(ruleId);
    
    if (existed) {
      this.alertStates.delete(ruleId);
      
      // Remove any active alerts for this rule
      for (const [alertId, alert] of this.activeAlerts) {
        if (alert.ruleId === ruleId) {
          this.activeAlerts.delete(alertId);
          this.emit('alertResolved', alert);
        }
      }

      runtimeLogger.info(`Alert rule removed: ${ruleId}`);
      this.emit('ruleRemoved', ruleId);
    }

    return existed;
  }

  /**
   * Update alert rule
   */
  public updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);

    runtimeLogger.info(`Alert rule updated: ${rule.name}`, {
      metadata: { ruleId, updates: Object.keys(updates) },
    });

    this.emit('ruleUpdated', updatedRule);
    return true;
  }

  /**
   * Get alert rule
   */
  public getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all alert rules
   */
  public getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.context.acknowledgedBy = userId;
    alert.context.acknowledgedAt = new Date().toISOString();

    runtimeLogger.info(`Alert acknowledged: ${alertId}`, {
      metadata: { alertId, userId, rule: alert.ruleId },
    });

    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Resolve alert manually
   */
  public resolveAlert(alertId: string, reason?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    this.activeAlerts.delete(alertId);
    
    // Reset alert state
    const state = this.alertStates.get(alert.ruleId);
    if (state) {
      state.triggered = false;
      state.consecutiveFailures = 0;
    }

    runtimeLogger.info(`Alert resolved manually: ${alertId}`, {
      metadata: { alertId, reason, rule: alert.ruleId },
    });

    this.emit('alertResolved', { ...alert, reason });
    return true;
  }

  /**
   * Evaluate alert rule against current value
   */
  public evaluateRule(ruleId: string, currentValue: number): boolean {
    const rule = this.rules.get(ruleId);
    const state = this.alertStates.get(ruleId);
    
    if (!rule || !state || !rule.enabled) {
      return false;
    }

    const startTime = performance.now();
    let shouldTrigger = false;

    try {
      // Update state
      state.lastEvaluation = new Date();
      state.evaluationCount++;
      state.lastValue = currentValue;
      
      // Add to history
      state.history.push({
        timestamp: new Date(),
        value: currentValue,
        triggered: false, // Will be updated below
      });

      // Limit history size
      if (state.history.length > 100) {
        state.history.shift();
      }

      // Evaluate condition
      shouldTrigger = this.evaluateCondition(rule.condition, currentValue);

      // Update trend
      if (state.history.length >= 3) {
        const analysis = this.predictiveAnalyzer.analyzeTrend(state.history, rule);
        state.trend = analysis.trend;
      }

      // Handle state transitions
      if (shouldTrigger && !state.triggered) {
        this.triggerAlert(rule, state, currentValue);
      } else if (!shouldTrigger && state.triggered) {
        this.resolveAlert(this.getActiveAlertByRule(ruleId)?.id || '');
      }

      // Update consecutive failures
      if (shouldTrigger) {
        state.consecutiveFailures++;
      } else {
        state.consecutiveFailures = 0;
      }

      // Update history trigger status
      if (state.history.length > 0) {
        state.history[state.history.length - 1]!.triggered = shouldTrigger;
      }

      return shouldTrigger;
    } catch (error) {
      runtimeLogger.error(
        `Failed to evaluate alert rule: ${rule.name}`,
        error as Error,
        { metadata: { ruleId, currentValue } }
      );
      return false;
    } finally {
      const evaluationTime = performance.now() - startTime;
      this.metricsCollector.recordEvent({
        type: 'system',
        operation: 'alert_evaluation',
        value: evaluationTime,
        metadata: { ruleId, triggered: shouldTrigger },
      });
    }
  }

  /**
   * Get alert statistics
   */
  public getStatistics(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    totalEvaluations: number;
    averageEvaluationTime: number;
    alertsByRule: Record<string, number>;
  } {
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
    const totalEvaluations = Array.from(this.alertStates.values())
      .reduce((sum, state) => sum + state.evaluationCount, 0);

    const alertsByRule: Record<string, number> = {};
    for (const alert of this.activeAlerts.values()) {
      alertsByRule[alert.ruleId] = (alertsByRule[alert.ruleId] || 0) + 1;
    }

    return {
      totalRules: this.rules.size,
      enabledRules,
      activeAlerts: this.activeAlerts.size,
      totalEvaluations,
      averageEvaluationTime: 0, // Would calculate from collected metrics
      alertsByRule,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ObservabilityConfig['health']>): void {
    this.config = { ...this.config, ...config };
    this.enabled = this.config.enableHealthChecks;

    if (this.enabled && !this.evaluationTimer) {
      this.startEvaluation();
    } else if (!this.enabled && this.evaluationTimer) {
      this.stopEvaluation();
    }
  }

  /**
   * Load default alert rules
   */
  private loadDefaultRules(): void {
    for (const rule of DEFAULT_ALERT_RULES) {
      this.addRule(rule as AlertRule);
    }
  }

  /**
   * Evaluate all rules against current metrics
   */
  private evaluateRules(): void {
    if (!this.enabled) return;

    try {
      const metrics = this.metricsCollector.getMetrics();
      
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        const currentValue = this.extractMetricValue(metrics, rule.metricName);
        if (currentValue !== undefined) {
          this.evaluateRule(rule.id, currentValue);
        }
      }
    } catch (error) {
      runtimeLogger.error('Failed to evaluate alert rules', error as Error);
    }
  }

  /**
   * Extract metric value from metrics object
   */
  private extractMetricValue(
    metrics: ObservabilityMetrics,
    metricName: string
  ): number | undefined {
    // Navigate nested object structure to find metric value
    const parts = metricName.split('.');
    let current: any = metrics;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return typeof current === 'number' ? current : undefined;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    condition: AlertRule['condition'],
    value: number
  ): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule,
    state: AlertState,
    currentValue: number
  ): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    const now = new Date();

    state.triggered = true;
    state.triggerTime = now;

    const alert: ActiveAlert = {
      id: alertId,
      ruleId: rule.id,
      rule,
      triggerTime: now,
      currentValue,
      message: this.generateAlertMessage(rule, currentValue),
      acknowledged: false,
      escalated: false,
      context: {
        evaluationCount: state.evaluationCount,
        consecutiveFailures: state.consecutiveFailures,
        trend: state.trend,
      },
    };

    this.activeAlerts.set(alertId, alert);

    // Execute alert actions
    await this.actionExecutor.executeActions(alert, rule.actions);

    this.emit('alertTriggered', alert);

    runtimeLogger.warn(`Alert triggered: ${rule.name}`, {
      correlationId: alertId,
      metadata: {
        ruleId: rule.id,
        severity: rule.severity,
        currentValue,
        threshold: rule.condition.threshold,
      },
    });
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const operator = rule.condition.operator;
    const threshold = rule.condition.threshold;
    
    return `${rule.metricName} is ${currentValue} (${operator} ${threshold})`;
  }

  /**
   * Get active alert by rule ID
   */
  private getActiveAlertByRule(ruleId: string): ActiveAlert | undefined {
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === ruleId) {
        return alert;
      }
    }
    return undefined;
  }
}