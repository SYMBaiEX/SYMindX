/**
 * Human Oversight and Logging Implementation
 *
 * Implements human oversight requirements and mandatory logging for AI Act compliance
 */

import { EventEmitter } from 'events';
import {
  HumanOversightConfig,
  HumanReview,
  HumanOversightRequest,
  AISystemLog,
  AIEventType,
  Anomaly,
  LogFilter,
} from '../../../types/ai-act-compliance';
import { runtimeLogger } from '../../../utils/logger';

/**
 * AI System Logger
 */
export class AISystemLogger {
  private logs: AISystemLog[] = [];
  private logRetentionDays: number = 365; // 1 year default
  private maxLogsInMemory: number = 10000;

  /**
   * Log an AI system event
   */
  async logEvent(
    eventType: AIEventType,
    systemId: string,
    input: any,
    output: any,
    metadata: {
      userId?: string;
      modelVersion: string;
      processingTime: number;
      confidence?: number;
      explanations?: any[];
      humanReview?: HumanReview;
      anomalies?: Anomaly[];
    }
  ): Promise<void> {
    const log: AISystemLog = {
      id: this.generateLogId(),
      timestamp: new Date(),
      eventType,
      systemId,
      userId: metadata.userId,
      input: this.sanitizeData(input),
      output: this.sanitizeData(output),
      modelVersion: metadata.modelVersion,
      processingTime: metadata.processingTime,
      confidence: metadata.confidence,
      explanations: metadata.explanations,
      humanReview: metadata.humanReview,
      anomalies: metadata.anomalies,
    };

    // Store in memory (with rotation)
    this.logs.push(log);
    if (this.logs.length > this.maxLogsInMemory) {
      // In production, archive old logs to persistent storage
      this.logs = this.logs.slice(-this.maxLogsInMemory);
    }

    // Check for anomalies
    if (log.anomalies && log.anomalies.length > 0) {
      this.handleAnomalies(log);
    }

    runtimeLogger.info('AI system event logged', {
      id: log.id,
      eventType,
      systemId,
      anomalies: log.anomalies?.length || 0,
    });
  }

  /**
   * Query AI system logs
   */
  async queryLogs(filter: LogFilter): Promise<AISystemLog[]> {
    let filtered = [...this.logs];

    if (filter.startDate) {
      filtered = filtered.filter((log) => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter((log) => log.timestamp <= filter.endDate!);
    }

    if (filter.eventType) {
      filtered = filtered.filter((log) => log.eventType === filter.eventType);
    }

    if (filter.userId) {
      filtered = filtered.filter((log) => log.userId === filter.userId);
    }

    if (filter.hasAnomaly !== undefined) {
      filtered = filtered.filter((log) =>
        filter.hasAnomaly
          ? log.anomalies && log.anomalies.length > 0
          : !log.anomalies
      );
    }

    return filtered;
  }

  /**
   * Archive logs older than retention period
   */
  async archiveLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);

    const toArchive = this.logs.filter((log) => log.timestamp < cutoffDate);

    if (toArchive.length > 0) {
      // In production, move to cold storage
      this.logs = this.logs.filter((log) => log.timestamp >= cutoffDate);

      runtimeLogger.info(
        `Archived ${toArchive.length} logs older than ${cutoffDate}`
      );
    }

    return toArchive.length;
  }

  /**
   * Detect anomalies in AI system behavior
   */
  detectAnomalies(
    currentLog: Partial<AISystemLog>,
    historicalLogs: AISystemLog[]
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check processing time anomaly
    if (currentLog.processingTime) {
      const historicalTimes = historicalLogs.map((log) => log.processingTime);
      const avgTime = this.calculateAverage(historicalTimes);
      const stdDev = this.calculateStdDev(historicalTimes);

      if (currentLog.processingTime > avgTime + 3 * stdDev) {
        anomalies.push({
          id: this.generateAnomalyId(),
          detectedAt: new Date(),
          type: 'performance',
          description: `Processing time ${currentLog.processingTime}ms exceeds normal range`,
          severity: 'medium',
          context: { avgTime, stdDev, actualTime: currentLog.processingTime },
          action: 'logged',
        });
      }
    }

    // Check confidence anomaly
    if (currentLog.confidence !== undefined && currentLog.confidence < 0.5) {
      anomalies.push({
        id: this.generateAnomalyId(),
        detectedAt: new Date(),
        type: 'output',
        description: `Low confidence score: ${currentLog.confidence}`,
        severity: currentLog.confidence < 0.3 ? 'high' : 'medium',
        context: { confidence: currentLog.confidence },
        action: 'flagged',
      });
    }

    // Check input anomaly (simplified)
    if (currentLog.input && this.isAnomalousInput(currentLog.input)) {
      anomalies.push({
        id: this.generateAnomalyId(),
        detectedAt: new Date(),
        type: 'input',
        description: 'Unusual input pattern detected',
        severity: 'medium',
        context: { inputSample: this.sanitizeData(currentLog.input) },
        action: 'human-review',
      });
    }

    return anomalies;
  }

  private generateLogId(): string {
    return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAnomalyId(): string {
    return `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    // Remove sensitive information
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      const sensitiveKeys = ['password', 'token', 'ssn', 'creditCard'];

      sensitiveKeys.forEach((key) => {
        if (key in sanitized) {
          sanitized[key] = '[REDACTED]';
        }
      });

      return sanitized;
    }
    return data;
  }

  private handleAnomalies(log: AISystemLog): void {
    // In production, trigger alerts based on severity
    const criticalAnomalies =
      log.anomalies?.filter((a) => a.severity === 'critical') || [];

    if (criticalAnomalies.length > 0) {
      runtimeLogger.error('Critical anomalies detected', {
        logId: log.id,
        anomalies: criticalAnomalies,
      });
      // Trigger immediate alert
    }
  }

  private isAnomalousInput(input: any): boolean {
    // Simplified anomaly detection
    // In production, use more sophisticated methods
    if (typeof input === 'string' && input.length > 10000) {
      return true; // Unusually long input
    }

    if (Array.isArray(input) && input.length > 1000) {
      return true; // Unusually large array
    }

    return false;
  }

  private calculateAverage(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStdDev(values: number[]): number {
    const avg = this.calculateAverage(values);
    const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }
}

/**
 * Human Oversight Manager
 */
export class HumanOversightManager extends EventEmitter {
  private readonly config: HumanOversightConfig;
  private pendingRequests: Map<string, HumanOversightRequest> = new Map();
  private reviewHistory: HumanReview[] = [];

  constructor(config: HumanOversightConfig) {
    super();
    this.config = config;

    // Set up timeout handling
    setInterval(() => this.checkTimeouts(), 5000); // Check every 5 seconds
  }

  /**
   * Request human review for a decision
   */
  async requestReview(
    systemId: string,
    context: any,
    aiDecision: any,
    confidence: number,
    explanation: any,
    urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<HumanOversightRequest> {
    const request: HumanOversightRequest = {
      id: this.generateRequestId(),
      systemId,
      requestedAt: new Date(),
      urgency,
      context: this.sanitizeContext(context),
      aiDecision,
      confidence,
      explanation,
      deadline: this.calculateDeadline(urgency),
      status: 'pending',
    };

    this.pendingRequests.set(request.id, request);

    // Emit event for UI or notification system
    this.emit('reviewRequested', request);

    runtimeLogger.info('Human review requested', {
      id: request.id,
      systemId,
      urgency,
      confidence,
    });

    // Handle based on oversight mode
    switch (this.config.mode) {
      case 'human-in-the-loop':
        // Wait for human response before proceeding
        return request;

      case 'human-on-the-loop':
        // Proceed with AI decision but allow override
        setTimeout(() => this.autoApproveIfNoResponse(request.id), 1000);
        return request;

      case 'human-in-command':
        // Human must explicitly approve all decisions
        return request;
    }
  }

  /**
   * Submit human review
   */
  async submitReview(
    requestId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'modify',
    modifications?: any,
    reasoning?: string
  ): Promise<void> {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error(`Review request ${requestId} not found`);
    }

    if (request.status !== 'pending' && request.status !== 'reviewing') {
      throw new Error(`Request ${requestId} already completed`);
    }

    const review: HumanReview = {
      reviewerId,
      reviewedAt: new Date(),
      decision,
      modifications,
      reasoning,
      timeSpent: (new Date().getTime() - request.requestedAt.getTime()) / 1000,
    };

    request.status = 'completed';
    this.pendingRequests.delete(requestId);
    this.reviewHistory.push(review);

    // Emit event with review result
    this.emit('reviewCompleted', { request, review });

    runtimeLogger.info('Human review completed', {
      requestId,
      reviewerId,
      decision,
      timeSpent: review.timeSpent,
    });
  }

  /**
   * Get pending review requests
   */
  getPendingRequests(filters?: {
    urgency?: string;
    systemId?: string;
    maxAge?: number;
  }): HumanOversightRequest[] {
    let requests = Array.from(this.pendingRequests.values());

    if (filters) {
      if (filters.urgency) {
        requests = requests.filter((r) => r.urgency === filters.urgency);
      }

      if (filters.systemId) {
        requests = requests.filter((r) => r.systemId === filters.systemId);
      }

      if (filters.maxAge) {
        const cutoff = new Date(Date.now() - filters.maxAge * 1000);
        requests = requests.filter((r) => r.requestedAt >= cutoff);
      }
    }

    // Sort by urgency and age
    return requests.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];

      if (urgencyDiff !== 0) return urgencyDiff;

      return a.requestedAt.getTime() - b.requestedAt.getTime();
    });
  }

  /**
   * Check if human review is required
   */
  isReviewRequired(confidence: number, riskLevel: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Always require review for high-risk decisions
    if (riskLevel === 'high' || riskLevel === 'critical') {
      return true;
    }

    // Check confidence threshold
    if (
      this.config.reviewThreshold &&
      confidence < this.config.reviewThreshold
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get review statistics
   */
  getReviewStatistics(): {
    totalRequests: number;
    pendingRequests: number;
    approvalRate: number;
    averageResponseTime: number;
    reviewerStats: Record<
      string,
      {
        reviews: number;
        approvalRate: number;
        avgResponseTime: number;
      }
    >;
  } {
    const totalRequests = this.reviewHistory.length + this.pendingRequests.size;
    const approvals = this.reviewHistory.filter(
      (r) => r.decision === 'approve'
    ).length;
    const approvalRate =
      this.reviewHistory.length > 0 ? approvals / this.reviewHistory.length : 0;

    // Calculate reviewer statistics
    const reviewerStats: Record<string, any> = {};

    this.reviewHistory.forEach((review) => {
      if (!reviewerStats[review.reviewerId]) {
        reviewerStats[review.reviewerId] = {
          reviews: 0,
          approvals: 0,
          totalTime: 0,
        };
      }

      reviewerStats[review.reviewerId].reviews++;
      if (review.decision === 'approve') {
        reviewerStats[review.reviewerId].approvals++;
      }
      reviewerStats[review.reviewerId].totalTime += review.timeSpent;
    });

    // Format reviewer stats
    const formattedReviewerStats: Record<string, any> = {};
    Object.entries(reviewerStats).forEach(([reviewerId, stats]) => {
      formattedReviewerStats[reviewerId] = {
        reviews: stats.reviews,
        approvalRate: stats.reviews > 0 ? stats.approvals / stats.reviews : 0,
        avgResponseTime:
          stats.reviews > 0 ? stats.totalTime / stats.reviews : 0,
      };
    });

    return {
      totalRequests,
      pendingRequests: this.pendingRequests.size,
      approvalRate,
      averageResponseTime: this.calculateAverageResponseTime(),
      reviewerStats: formattedReviewerStats,
    };
  }

  private generateRequestId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeContext(context: any): any {
    // Remove sensitive data from context
    if (typeof context === 'object' && context !== null) {
      const sanitized = { ...context };
      delete sanitized.internalState;
      delete sanitized.credentials;
      return sanitized;
    }
    return context;
  }

  private calculateDeadline(urgency: string): Date {
    const deadlines = {
      critical: 5 * 60 * 1000, // 5 minutes
      high: 30 * 60 * 1000, // 30 minutes
      medium: 2 * 60 * 60 * 1000, // 2 hours
      low: 24 * 60 * 60 * 1000, // 24 hours
    };

    const timeLimit =
      deadlines[urgency as keyof typeof deadlines] || deadlines.medium;
    return new Date(Date.now() + timeLimit);
  }

  private checkTimeouts(): void {
    const now = new Date();

    this.pendingRequests.forEach((request, id) => {
      if (
        request.deadline &&
        request.deadline < now &&
        request.status === 'pending'
      ) {
        this.handleTimeout(request);
      }
    });
  }

  private handleTimeout(request: HumanOversightRequest): void {
    runtimeLogger.warn(`Review request ${request.id} timed out`);

    switch (this.config.fallbackBehavior) {
      case 'wait':
        // Keep waiting (extend deadline)
        request.deadline = new Date(Date.now() + 60 * 60 * 1000); // Add 1 hour
        break;

      case 'reject':
        // Auto-reject on timeout
        this.submitReview(request.id, 'system', 'reject', undefined, 'Timeout');
        break;

      case 'default-action':
        // Use AI decision
        this.submitReview(
          request.id,
          'system',
          'approve',
          undefined,
          'Timeout - using AI decision'
        );
        break;
    }

    this.emit('reviewTimeout', request);
  }

  private autoApproveIfNoResponse(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (
      request &&
      request.status === 'pending' &&
      this.config.mode === 'human-on-the-loop'
    ) {
      // Auto-approve for human-on-the-loop mode
      this.submitReview(
        requestId,
        'system',
        'approve',
        undefined,
        'Auto-approved (human-on-the-loop)'
      );
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.reviewHistory.length === 0) return 0;

    const totalTime = this.reviewHistory.reduce(
      (sum, review) => sum + review.timeSpent,
      0
    );
    return totalTime / this.reviewHistory.length;
  }
}

/**
 * Create AI system logger
 */
export function createAISystemLogger(): AISystemLogger {
  return new AISystemLogger();
}

/**
 * Create human oversight manager
 */
export function createHumanOversightManager(
  config: HumanOversightConfig
): HumanOversightManager {
  return new HumanOversightManager(config);
}
