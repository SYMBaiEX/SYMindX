/**
 * Compliance Dashboard
 *
 * Unified dashboard for quantum security and AI Act compliance monitoring
 */

import {
  AIActComplianceStatus,
  AIActComplianceReport,
  BiasReport,
  HumanOversightRequest,
  AISystemLog,
} from '../../types/ai-act-compliance';
import {
  QuantumReadinessReport,
  QRNGStatus,
  FLRound,
  DPBudget,
} from '../../types/quantum-security';
import { HEPerformanceMetrics } from '../../types/homomorphic-encryption';
import { runtimeLogger } from '../../utils/logger';

/**
 * Dashboard metrics and status
 */
export interface ComplianceDashboardData {
  // Overall status
  overallCompliant: boolean;
  lastUpdated: Date;

  // AI Act compliance
  aiActCompliance: {
    status: AIActComplianceStatus;
    recentReport?: AIActComplianceReport;
    pendingReviews: number;
    biasMetrics?: BiasReport;
    recentAnomalies: number;
  };

  // Quantum security
  quantumSecurity: {
    readinessReport?: QuantumReadinessReport;
    qrngStatus?: QRNGStatus;
    activeQKDSessions: number;
    encryptionMetrics: {
      keysGenerated: number;
      encryptionsPerformed: number;
      migrationsCompleted: number;
    };
  };

  // Homomorphic encryption
  homomorphicEncryption: {
    performanceMetrics?: HEPerformanceMetrics;
    encryptedMemories: number;
    privateInferences: number;
    activeComputations: number;
  };

  // Privacy features
  privacyMetrics: {
    differentialPrivacy: DPBudget;
    federatedLearning: {
      activeRounds: number;
      totalParticipants: number;
      averageAccuracy: number;
    };
    secureMPC: {
      activeSessions: number;
      completedComputations: number;
    };
  };

  // Alerts and actions
  alerts: ComplianceAlert[];
  recommendedActions: ComplianceAction[];
}

export interface ComplianceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ai-act' | 'quantum' | 'privacy' | 'security';
  message: string;
  timestamp: Date;
  actionRequired: boolean;
}

export interface ComplianceAction {
  id: string;
  priority: number;
  category: string;
  action: string;
  deadline?: Date;
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * Compliance Dashboard Service
 */
export class ComplianceDashboard {
  private data: ComplianceDashboardData;
  private updateInterval?: NodeJS.Timeout;

  constructor() {
    this.data = this.initializeData();
  }

  /**
   * Start dashboard monitoring
   */
  async start(updateIntervalMs: number = 60000): Promise<void> {
    runtimeLogger.info('Starting compliance dashboard monitoring');

    // Initial update
    await this.update();

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.update().catch((error) => {
        runtimeLogger.error('Dashboard update failed', error);
      });
    }, updateIntervalMs);
  }

  /**
   * Stop dashboard monitoring
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    runtimeLogger.info('Stopped compliance dashboard monitoring');
  }

  /**
   * Get current dashboard data
   */
  getData(): ComplianceDashboardData {
    return { ...this.data };
  }

  /**
   * Update dashboard data
   */
  async update(): Promise<void> {
    runtimeLogger.debug('Updating compliance dashboard');

    // Update timestamps
    this.data.lastUpdated = new Date();

    // Check for new alerts
    this.checkForAlerts();

    // Update recommended actions
    this.updateRecommendedActions();

    // Calculate overall compliance
    this.data.overallCompliant = this.calculateOverallCompliance();
  }

  /**
   * Update AI Act compliance data
   */
  updateAIActCompliance(
    status: AIActComplianceStatus,
    report?: AIActComplianceReport,
    pendingReviews?: HumanOversightRequest[],
    biasReport?: BiasReport,
    recentLogs?: AISystemLog[]
  ): void {
    this.data.aiActCompliance.status = status;

    if (report) {
      this.data.aiActCompliance.recentReport = report;
    }

    if (pendingReviews) {
      this.data.aiActCompliance.pendingReviews = pendingReviews.length;
    }

    if (biasReport) {
      this.data.aiActCompliance.biasMetrics = biasReport;
    }

    if (recentLogs) {
      const anomalies = recentLogs.flatMap((log) => log.anomalies || []);
      this.data.aiActCompliance.recentAnomalies = anomalies.length;
    }
  }

  /**
   * Update quantum security data
   */
  updateQuantumSecurity(
    readinessReport?: QuantumReadinessReport,
    qrngStatus?: QRNGStatus,
    qkdSessions?: number,
    encryptionMetrics?: {
      keysGenerated: number;
      encryptionsPerformed: number;
      migrationsCompleted: number;
    }
  ): void {
    if (readinessReport) {
      this.data.quantumSecurity.readinessReport = readinessReport;
    }

    if (qrngStatus) {
      this.data.quantumSecurity.qrngStatus = qrngStatus;
    }

    if (qkdSessions !== undefined) {
      this.data.quantumSecurity.activeQKDSessions = qkdSessions;
    }

    if (encryptionMetrics) {
      this.data.quantumSecurity.encryptionMetrics = encryptionMetrics;
    }
  }

  /**
   * Update homomorphic encryption data
   */
  updateHomomorphicEncryption(
    performanceMetrics?: HEPerformanceMetrics,
    encryptedMemories?: number,
    privateInferences?: number,
    activeComputations?: number
  ): void {
    if (performanceMetrics) {
      this.data.homomorphicEncryption.performanceMetrics = performanceMetrics;
    }

    if (encryptedMemories !== undefined) {
      this.data.homomorphicEncryption.encryptedMemories = encryptedMemories;
    }

    if (privateInferences !== undefined) {
      this.data.homomorphicEncryption.privateInferences = privateInferences;
    }

    if (activeComputations !== undefined) {
      this.data.homomorphicEncryption.activeComputations = activeComputations;
    }
  }

  /**
   * Update privacy metrics
   */
  updatePrivacyMetrics(
    dpBudget?: DPBudget,
    flRounds?: FLRound[],
    smpcSessions?: { active: number; completed: number }
  ): void {
    if (dpBudget) {
      this.data.privacyMetrics.differentialPrivacy = dpBudget;
    }

    if (flRounds) {
      const activeRounds = flRounds.filter((r) => !r.completedAt).length;
      const participants = new Set(flRounds.flatMap((r) => r.participants))
        .size;
      const avgAccuracy =
        flRounds
          .filter((r) => r.metrics?.accuracy)
          .reduce((sum, r) => sum + r.metrics!.accuracy, 0) / flRounds.length ||
        0;

      this.data.privacyMetrics.federatedLearning = {
        activeRounds,
        totalParticipants: participants,
        averageAccuracy: avgAccuracy,
      };
    }

    if (smpcSessions) {
      this.data.privacyMetrics.secureMPC = {
        activeSessions: smpcSessions.active,
        completedComputations: smpcSessions.completed,
      };
    }
  }

  /**
   * Add alert
   */
  addAlert(alert: Omit<ComplianceAlert, 'id' | 'timestamp'>): void {
    const newAlert: ComplianceAlert = {
      ...alert,
      id: this.generateId('alert'),
      timestamp: new Date(),
    };

    this.data.alerts.push(newAlert);

    // Keep only recent alerts (last 100)
    if (this.data.alerts.length > 100) {
      this.data.alerts = this.data.alerts.slice(-100);
    }

    runtimeLogger.warn('Compliance alert added', newAlert);
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    const before = this.data.alerts.length;
    this.data.alerts = this.data.alerts.filter((alert) => alert.actionRequired);
    const removed = before - this.data.alerts.length;

    if (removed > 0) {
      runtimeLogger.info(`Cleared ${removed} resolved alerts`);
    }
  }

  /**
   * Get dashboard summary
   */
  getSummary(): {
    compliant: boolean;
    criticalAlerts: number;
    pendingActions: number;
    quantumReadiness: number;
    privacyBudgetUsed: number;
  } {
    const criticalAlerts = this.data.alerts.filter(
      (a) => a.severity === 'critical'
    ).length;
    const pendingActions = this.data.recommendedActions.filter(
      (a) => a.status === 'pending'
    ).length;
    const quantumReadiness =
      this.data.quantumSecurity.readinessReport?.overallScore || 0;
    const privacyBudgetUsed =
      this.data.privacyMetrics.differentialPrivacy.used /
      this.data.privacyMetrics.differentialPrivacy.total;

    return {
      compliant: this.data.overallCompliant,
      criticalAlerts,
      pendingActions,
      quantumReadiness,
      privacyBudgetUsed,
    };
  }

  /**
   * Export dashboard report
   */
  exportReport(): string {
    const summary = this.getSummary();
    const report = {
      generatedAt: new Date(),
      summary,
      data: this.data,
    };

    return JSON.stringify(report, null, 2);
  }

  private initializeData(): ComplianceDashboardData {
    return {
      overallCompliant: true,
      lastUpdated: new Date(),

      aiActCompliance: {
        status: {
          compliant: true,
          lastAssessment: new Date(),
          riskCategory: 'minimal',
          requirements: [],
          violations: [],
          certifications: [],
        },
        pendingReviews: 0,
        recentAnomalies: 0,
      },

      quantumSecurity: {
        activeQKDSessions: 0,
        encryptionMetrics: {
          keysGenerated: 0,
          encryptionsPerformed: 0,
          migrationsCompleted: 0,
        },
      },

      homomorphicEncryption: {
        encryptedMemories: 0,
        privateInferences: 0,
        activeComputations: 0,
      },

      privacyMetrics: {
        differentialPrivacy: {
          total: 1.0,
          used: 0,
          remaining: 1.0,
          queries: [],
        },
        federatedLearning: {
          activeRounds: 0,
          totalParticipants: 0,
          averageAccuracy: 0,
        },
        secureMPC: {
          activeSessions: 0,
          completedComputations: 0,
        },
      },

      alerts: [],
      recommendedActions: [],
    };
  }

  private checkForAlerts(): void {
    // Check AI Act compliance
    if (!this.data.aiActCompliance.status.compliant) {
      this.addAlert({
        severity: 'critical',
        category: 'ai-act',
        message: 'AI Act compliance violations detected',
        actionRequired: true,
      });
    }

    if (this.data.aiActCompliance.pendingReviews > 10) {
      this.addAlert({
        severity: 'high',
        category: 'ai-act',
        message: `${this.data.aiActCompliance.pendingReviews} human reviews pending`,
        actionRequired: true,
      });
    }

    // Check quantum security
    if (
      this.data.quantumSecurity.readinessReport?.overallScore &&
      this.data.quantumSecurity.readinessReport.overallScore < 50
    ) {
      this.addAlert({
        severity: 'high',
        category: 'quantum',
        message: 'Low quantum readiness score',
        actionRequired: true,
      });
    }

    if (
      this.data.quantumSecurity.qrngStatus &&
      !this.data.quantumSecurity.qrngStatus.healthy
    ) {
      this.addAlert({
        severity: 'medium',
        category: 'quantum',
        message: 'QRNG health check failed',
        actionRequired: true,
      });
    }

    // Check privacy budget
    const dpBudget = this.data.privacyMetrics.differentialPrivacy;
    if (dpBudget.remaining < dpBudget.total * 0.1) {
      this.addAlert({
        severity: 'high',
        category: 'privacy',
        message: 'Differential privacy budget nearly exhausted',
        actionRequired: true,
      });
    }
  }

  private updateRecommendedActions(): void {
    const actions: ComplianceAction[] = [];

    // AI Act actions
    if (this.data.aiActCompliance.status.violations.length > 0) {
      this.data.aiActCompliance.status.violations.forEach((violation) => {
        actions.push({
          id: this.generateId('action'),
          priority: 1,
          category: 'ai-act',
          action: violation.remediation,
          deadline: violation.deadline,
          status: 'pending',
        });
      });
    }

    // Quantum security actions
    if (this.data.quantumSecurity.readinessReport?.recommendations) {
      this.data.quantumSecurity.readinessReport.recommendations.forEach(
        (rec) => {
          actions.push({
            id: this.generateId('action'),
            priority: rec.priority,
            category: 'quantum',
            action: rec.impact,
            status: 'pending',
          });
        }
      );
    }

    // Privacy actions
    if (this.data.privacyMetrics.differentialPrivacy.remaining < 0.2) {
      actions.push({
        id: this.generateId('action'),
        priority: 2,
        category: 'privacy',
        action: 'Reset differential privacy budget or reduce query frequency',
        status: 'pending',
      });
    }

    // Sort by priority
    actions.sort((a, b) => a.priority - b.priority);

    // Keep top 20 actions
    this.data.recommendedActions = actions.slice(0, 20);
  }

  private calculateOverallCompliance(): boolean {
    // Check all compliance areas
    const aiActCompliant = this.data.aiActCompliance.status.compliant;
    const quantumReady =
      (this.data.quantumSecurity.readinessReport?.overallScore || 0) >= 70;
    const privacyOk =
      this.data.privacyMetrics.differentialPrivacy.remaining > 0;
    const noCriticalAlerts = !this.data.alerts.some(
      (a) => a.severity === 'critical'
    );

    return aiActCompliant && quantumReady && privacyOk && noCriticalAlerts;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create compliance dashboard
 */
export function createComplianceDashboard(): ComplianceDashboard {
  return new ComplianceDashboard();
}
