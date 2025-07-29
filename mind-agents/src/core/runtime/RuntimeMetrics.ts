/**
 * RuntimeMetrics.ts - Performance monitoring and metrics collection
 * 
 * This module handles:
 * - Performance metrics collection
 * - System monitoring
 * - Resource usage tracking
 * - Metrics reporting and aggregation
 */

import {
  RuntimeMetrics,
  RuntimeState,
  Agent,
  AgentEvent,
  AgentAction,
} from '../../types/index';
import { standardLoggers } from '../../utils/standard-logging';

export interface MetricsCollectorConfig {
  enableCpuMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableEventTracking: boolean;
  enablePerformanceTimers: boolean;
  metricsInterval: number;
  maxHistoryEntries: number;
}

export interface PerformanceTimer {
  id: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  operation: string;
  agentId?: string;
}

export class RuntimeMetricsCollector {
  private logger = standardLoggers.runtime;
  private config: MetricsCollectorConfig;
  private metrics: RuntimeMetrics;
  private metricsHistory: RuntimeMetrics[] = [];
  private performanceTimers: Map<string, PerformanceTimer> = new Map();
  private metricsTimer?: ReturnType<typeof setInterval>;
  
  // Performance counters
  private counters = {
    messagesProcessed: 0,
    actionsExecuted: 0,
    thoughtsGenerated: 0,
    memoriesCreated: 0,
    emotionChanges: 0,
    decisionssMade: 0,
    planStepsCompleted: 0,
  };

  // Performance timing
  private responseTimes: number[] = [];
  private lastMetricsUpdate = Date.now();

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this.config = {
      enableCpuMonitoring: config.enableCpuMonitoring ?? true,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
      enableEventTracking: config.enableEventTracking ?? true,
      enablePerformanceTimers: config.enablePerformanceTimers ?? true,
      metricsInterval: config.metricsInterval ?? 60000, // 1 minute
      maxHistoryEntries: config.maxHistoryEntries ?? 100,
    };

    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Start metrics collection
   */
  start(): void {
    this.logger.debug('Starting metrics collection');

    if (this.config.metricsInterval > 0) {
      this.metricsTimer = setInterval(() => {
        this.collectMetrics();
      }, this.config.metricsInterval);
    }

    // Initial metrics collection
    this.collectMetrics();
  }

  /**
   * Stop metrics collection
   */
  stop(): void {
    this.logger.debug('Stopping metrics collection');

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  /**
   * Collect current metrics
   */
  collectMetrics(): void {
    try {
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastMetricsUpdate;

      // Update counters
      this.metrics.messagesProcessed = this.counters.messagesProcessed;
      this.metrics.actionsExecuted = this.counters.actionsExecuted;
      this.metrics.thoughtsGenerated = this.counters.thoughtsGenerated;
      this.metrics.memoriesCreated = this.counters.memoriesCreated;
      this.metrics.emotionChanges = this.counters.emotionChanges;
      this.metrics.decisionssMade = this.counters.decisionssMade;
      this.metrics.planStepsCompleted = this.counters.planStepsCompleted;

      // Calculate average response time
      if (this.responseTimes.length > 0) {
        this.metrics.averageResponseTime = 
          this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
        
        // Keep only recent response times (last 100)
        if (this.responseTimes.length > 100) {
          this.responseTimes = this.responseTimes.slice(-100);
        }
      }

      // Collect system metrics
      if (this.config.enableMemoryMonitoring) {
        this.collectMemoryMetrics();
      }

      if (this.config.enableCpuMonitoring) {
        this.collectCpuMetrics();
      }

      // Update timestamp
      this.metrics.lastUpdateTime = new Date();
      this.lastMetricsUpdate = now;

      // Add to history
      this.addToHistory();

      // Log metrics periodically (every 10 minutes)
      if (timeSinceLastUpdate >= 600000) {
        this.logMetricsSummary();
      }
    } catch (error) {
      this.logger.error('Error collecting metrics', { error });
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): RuntimeMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): RuntimeMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Record message processed
   */
  recordMessageProcessed(responseTime?: number): void {
    this.counters.messagesProcessed++;
    
    if (responseTime && this.config.enablePerformanceTimers) {
      this.responseTimes.push(responseTime);
    }
  }

  /**
   * Record action executed
   */
  recordActionExecuted(action: AgentAction): void {
    this.counters.actionsExecuted++;
  }

  /**
   * Record thought generated
   */
  recordThoughtGenerated(agentId: string): void {
    this.counters.thoughtsGenerated++;
  }

  /**
   * Record memory created
   */
  recordMemoryCreated(): void {
    this.counters.memoriesCreated++;
  }

  /**
   * Record emotion change
   */
  recordEmotionChange(agentId: string, emotion: string): void {
    this.counters.emotionChanges++;
  }

  /**
   * Record decision made
   */
  recordDecisionMade(agentId: string): void {
    this.counters.decisionssMade++;
  }

  /**
   * Record plan step completed
   */
  recordPlanStepCompleted(agentId: string): void {
    this.counters.planStepsCompleted++;
  }

  /**
   * Start performance timer
   */
  startTimer(timerId: string, operation: string, agentId?: string): void {
    if (!this.config.enablePerformanceTimers) {
      return;
    }

    const timer: PerformanceTimer = {
      id: timerId,
      startTime: performance.now(),
      operation,
      agentId,
    };

    this.performanceTimers.set(timerId, timer);
  }

  /**
   * End performance timer
   */
  endTimer(timerId: string): number | undefined {
    if (!this.config.enablePerformanceTimers) {
      return undefined;
    }

    const timer = this.performanceTimers.get(timerId);
    if (!timer) {
      this.logger.warn(`Timer not found: ${timerId}`);
      return undefined;
    }

    timer.endTime = performance.now();
    timer.duration = timer.endTime - timer.startTime;

    // Remove timer from active timers
    this.performanceTimers.delete(timerId);

    // Add to response times for average calculation
    this.responseTimes.push(timer.duration);

    return timer.duration;
  }

  /**
   * Get active timers
   */
  getActiveTimers(): PerformanceTimer[] {
    return Array.from(this.performanceTimers.values());
  }

  /**
   * Update agent metrics
   */
  updateAgentMetrics(agents: Map<string, Agent>): void {
    // Update active agent count
    let activeCount = 0;
    for (const agent of agents.values()) {
      if (agent.status !== 'idle') {
        activeCount++;
      }
    }

    // This would be used by RuntimeCore to update state
    // Not directly updating metrics here to maintain separation
  }

  /**
   * Generate metrics report
   */
  generateReport(): {
    current: RuntimeMetrics;
    history: RuntimeMetrics[];
    performance: {
      averageResponseTime: number;
      peakResponseTime: number;
      totalOperations: number;
      operationsPerMinute: number;
    };
    system: {
      memoryUsage: NodeJS.MemoryUsage;
      uptime: number;
      activeTimers: number;
    };
  } {
    const history = this.getMetricsHistory();
    const responseTimes = this.responseTimes;
    
    return {
      current: this.getMetrics(),
      history,
      performance: {
        averageResponseTime: this.metrics.averageResponseTime,
        peakResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        totalOperations: this.getTotalOperations(),
        operationsPerMinute: this.getOperationsPerMinute(),
      },
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        activeTimers: this.performanceTimers.size,
      },
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.logger.info('Resetting runtime metrics');

    this.counters = {
      messagesProcessed: 0,
      actionsExecuted: 0,
      thoughtsGenerated: 0,
      memoriesCreated: 0,
      emotionChanges: 0,
      decisionssMade: 0,
      planStepsCompleted: 0,
    };

    this.responseTimes = [];
    this.performanceTimers.clear();
    this.metrics = this.createEmptyMetrics();
    this.metricsHistory = [];
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): void {
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsage = memoryUsage.heapUsed;
  }

  /**
   * Collect CPU metrics
   */
  private collectCpuMetrics(): void {
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  /**
   * Add current metrics to history
   */
  private addToHistory(): void {
    this.metricsHistory.push({ ...this.metrics });

    // Limit history size
    if (this.metricsHistory.length > this.config.maxHistoryEntries) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.maxHistoryEntries);
    }
  }

  /**
   * Log metrics summary
   */
  private logMetricsSummary(): void {
    const summary = {
      messagesProcessed: this.metrics.messagesProcessed,
      actionsExecuted: this.metrics.actionsExecuted,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      memoryUsage: Math.round(this.metrics.memoryUsage / 1024 / 1024), // MB
      cpuUsage: this.metrics.cpuUsage.toFixed(2),
    };

    this.logger.info('Runtime metrics summary', summary);
  }

  /**
   * Get total operations
   */
  private getTotalOperations(): number {
    return (
      this.counters.messagesProcessed +
      this.counters.actionsExecuted +
      this.counters.thoughtsGenerated +
      this.counters.decisionssMade
    );
  }

  /**
   * Get operations per minute
   */
  private getOperationsPerMinute(): number {
    const totalOps = this.getTotalOperations();
    const uptime = process.uptime() / 60; // Convert to minutes
    return uptime > 0 ? totalOps / uptime : 0;
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): RuntimeMetrics {
    return {
      messagesProcessed: 0,
      actionsExecuted: 0,
      thoughtsGenerated: 0,
      memoriesCreated: 0,
      emotionChanges: 0,
      decisionssMade: 0,
      planStepsCompleted: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      lastUpdateTime: new Date(),
    };
  }
}