/**
 * Safety Framework Manager
 *
 * Central orchestrator for all AI safety and alignment systems.
 * Coordinates alignment verification, interpretability tools, constitutional AI,
 * safety monitoring, and responsible scaling protocols.
 */

import { Agent, AgentAction } from '../../types/agent';
import { DecisionContext } from '../../types/autonomous';
import { Logger } from '../../utils/logger';
import {
  SafetyFrameworkConfig,
  SafetyAssessment,
  SafetyViolation,
  RiskMitigation,
  RiskLevel,
  SafetyViolationType,
  SafetySeverity,
  SafetyComponent,
  SafetyImpact,
} from './types';

// Import safety components
import { AlignmentVerificationSystem } from './alignment/alignment-verification-system';
import { GoalMisalignmentDetector } from './alignment/goal-misalignment-detector';
import { AgentDecisionExplainer } from './interpretability/agent-decision-explainer';
import { ConstitutionalTrainingSystem } from './constitutional/constitutional-training-system';
import { EmergentBehaviorMonitor } from './monitoring/emergent-behavior-monitor';
import { CapabilityOverhangDetector } from './monitoring/capability-overhang-detector';
import { StagedCapabilityEvaluator } from './scaling/staged-capability-evaluator';
import { RiskAssessmentEngine } from './utils/risk-assessment-engine';
import { SafetyMetricsCollector } from './utils/safety-metrics-collector';

export class SafetyFrameworkManager {
  private config: SafetyFrameworkConfig;
  private logger: Logger;
  private isInitialized: boolean = false;
  private lastAssessment: Map<string, SafetyAssessment> = new Map();

  // Safety component instances
  private alignmentVerifier: AlignmentVerificationSystem;
  private misalignmentDetector: GoalMisalignmentDetector;
  private decisionExplainer: AgentDecisionExplainer;
  private constitutionalTrainer: ConstitutionalTrainingSystem;
  private behaviorMonitor: EmergentBehaviorMonitor;
  private capabilityDetector: CapabilityOverhangDetector;
  private capabilityEvaluator: StagedCapabilityEvaluator;
  private riskAssessment: RiskAssessmentEngine;
  private metricsCollector: SafetyMetricsCollector;

  // Safety state tracking
  private activeSafetyViolations: Map<string, SafetyViolation[]> = new Map();
  private mitigationActions: Map<string, RiskMitigation[]> = new Map();
  private emergencyShutdownActive: boolean = false;

  constructor(config: SafetyFrameworkConfig) {
    this.config = config;
    this.logger = new Logger('safety-framework-manager');

    // Initialize safety components
    this.alignmentVerifier = new AlignmentVerificationSystem(config.alignment);
    this.misalignmentDetector = new GoalMisalignmentDetector(config.alignment);
    this.decisionExplainer = new AgentDecisionExplainer(
      config.interpretability
    );
    this.constitutionalTrainer = new ConstitutionalTrainingSystem(
      config.constitutional
    );
    this.behaviorMonitor = new EmergentBehaviorMonitor(config.monitoring);
    this.capabilityDetector = new CapabilityOverhangDetector(config.monitoring);
    this.capabilityEvaluator = new StagedCapabilityEvaluator(config.scaling);
    this.riskAssessment = new RiskAssessmentEngine();
    this.metricsCollector = new SafetyMetricsCollector();
  }

  /**
   * Initialize the safety framework
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Safety framework already initialized');
      return;
    }

    this.logger.info('Initializing AGI Safety Framework...');

    try {
      // Initialize all safety components
      await Promise.all([
        this.alignmentVerifier.initialize(),
        this.misalignmentDetector.initialize(),
        this.decisionExplainer.initialize(),
        this.constitutionalTrainer.initialize(),
        this.behaviorMonitor.initialize(),
        this.capabilityDetector.initialize(),
        this.capabilityEvaluator.initialize(),
        this.riskAssessment.initialize(),
        this.metricsCollector.initialize(),
      ]);

      // Start monitoring if enabled
      if (this.config.enabled && this.config.monitoring.enabled) {
        this.startSafetyMonitoring();
      }

      this.isInitialized = true;
      this.logger.info('AGI Safety Framework initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize safety framework:', error);
      throw new Error(`Safety framework initialization failed: ${error}`);
    }
  }

  /**
   * Conduct comprehensive safety assessment for an agent
   */
  async assessAgentSafety(agent: Agent): Promise<SafetyAssessment> {
    if (!this.isInitialized) {
      throw new Error('Safety framework not initialized');
    }

    this.logger.info(`Conducting safety assessment for agent: ${agent.id}`);

    const assessmentId = `safety_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const violations: SafetyViolation[] = [];
    const mitigations: RiskMitigation[] = [];

    try {
      // 1. Alignment Verification
      if (this.config.alignment.enabled) {
        const alignmentResults =
          await this.alignmentVerifier.verifyAlignment(agent);
        const misalignmentSignals =
          await this.misalignmentDetector.detectMisalignment(agent);

        if (
          alignmentResults.overallAlignment <
          this.config.alignment.alignmentThreshold
        ) {
          violations.push({
            id: `violation_${Date.now()}_1`,
            type: SafetyViolationType.ALIGNMENT_DRIFT,
            severity: this.calculateAlignmentSeverity(
              alignmentResults.overallAlignment
            ),
            description: `Agent alignment below threshold: ${alignmentResults.overallAlignment.toFixed(3)}`,
            evidence: [
              `Alignment score: ${alignmentResults.overallAlignment}`,
              `Trend: ${alignmentResults.alignmentTrend}`,
            ],
            detectedAt: new Date(),
            component: SafetyComponent.ALIGNMENT_VERIFICATION,
            impact: this.calculateSafetyImpact(
              alignmentResults.overallAlignment
            ),
            remediation: [
              'Retrain alignment model',
              'Adjust reward function',
              'Review goal specification',
            ],
          });
        }

        // Process misalignment signals
        for (const signal of misalignmentSignals) {
          if (signal.severity > 0.5) {
            violations.push({
              id: `violation_${Date.now()}_${violations.length + 1}`,
              type: SafetyViolationType.GOAL_MISALIGNMENT,
              severity: this.severityFromNumber(signal.severity),
              description: signal.description,
              evidence: signal.evidence.map((e) => e.description),
              detectedAt: signal.detectedAt,
              component: SafetyComponent.GOAL_MISALIGNMENT_DETECTOR,
              impact: this.calculateImpactFromSeverity(signal.severity),
              remediation: signal.suggestedActions,
            });
          }
        }
      }

      // 2. Constitutional AI Compliance
      if (this.config.constitutional.enabled) {
        const constitutionalResults =
          await this.constitutionalTrainer.evaluateCompliance(agent);

        if (constitutionalResults.harmlessnessScore < 0.8) {
          violations.push({
            id: `violation_${Date.now()}_${violations.length + 1}`,
            type: SafetyViolationType.CONSTITUTIONAL_VIOLATION,
            severity: SafetySeverity.HIGH,
            description: `Low harmlessness score: ${constitutionalResults.harmlessnessScore.toFixed(3)}`,
            evidence: constitutionalResults.violations.map(
              (v) => v.description
            ),
            detectedAt: new Date(),
            component: SafetyComponent.CONSTITUTIONAL_AI,
            impact: SafetyImpact.MAJOR,
            remediation: [
              'Constitutional training reinforcement',
              'Value hierarchy adjustment',
            ],
          });
        }
      }

      // 3. Emergent Behavior Detection
      if (this.config.monitoring.emergentBehaviorMonitoring) {
        const emergentBehaviors =
          await this.behaviorMonitor.detectEmergentBehavior(agent);

        for (const behavior of emergentBehaviors) {
          if (behavior.riskAssessment > 0.6) {
            violations.push({
              id: `violation_${Date.now()}_${violations.length + 1}`,
              type: SafetyViolationType.EMERGENT_BEHAVIOR,
              severity: this.severityFromNumber(behavior.riskAssessment),
              description: behavior.description,
              evidence: [
                `Novelty: ${behavior.novelty}`,
                `Risk: ${behavior.riskAssessment}`,
                `Frequency: ${behavior.frequency}`,
              ],
              detectedAt: behavior.firstObserved,
              component: SafetyComponent.BEHAVIOR_MONITOR,
              impact: this.calculateImpactFromSeverity(behavior.riskAssessment),
              remediation: [
                'Monitor behavior closely',
                'Implement behavioral constraints',
                'Investigate root cause',
              ],
            });
          }
        }
      }

      // 4. Capability Overhang Assessment
      if (this.config.monitoring.capabilityOverhangDetection) {
        const overhangMetrics =
          await this.capabilityDetector.assessCapabilityOverhang(agent);

        if (overhangMetrics.overhangRisk > 0.7) {
          violations.push({
            id: `violation_${Date.now()}_${violations.length + 1}`,
            type: SafetyViolationType.CAPABILITY_OVERHANG,
            severity: SafetySeverity.CRITICAL,
            description: `High capability overhang risk: ${overhangMetrics.overhangRisk.toFixed(3)}`,
            evidence: [
              `Growth rate: ${overhangMetrics.capabilityGrowthRate}`,
              `Control lag: ${overhangMetrics.controlMechanismLag}`,
              `Mitigation readiness: ${overhangMetrics.mitigationReadiness}`,
            ],
            detectedAt: new Date(),
            component: SafetyComponent.BEHAVIOR_MONITOR,
            impact: SafetyImpact.SEVERE,
            remediation: [
              'Implement capability controls',
              'Enhance monitoring',
              'Prepare emergency procedures',
            ],
          });
        }
      }

      // 5. Generate risk mitigations
      mitigations.push(...(await this.generateRiskMitigations(violations)));

      // 6. Calculate overall risk
      const riskScore = await this.riskAssessment.calculateOverallRisk(
        violations,
        agent
      );
      const riskLevel = this.calculateRiskLevel(riskScore);

      // 7. Create safety assessment
      const assessment: SafetyAssessment = {
        id: assessmentId,
        agentId: agent.id,
        timestamp: new Date(),
        overallRiskLevel: riskLevel,
        riskScore,
        safetyViolations: violations,
        mitigationActions: mitigations,
        confidence: this.calculateAssessmentConfidence(violations),
        nextAssessmentDue: new Date(
          Date.now() + this.config.monitoringInterval
        ),
      };

      // 8. Store assessment and update tracking
      this.lastAssessment.set(agent.id, assessment);
      this.activeSafetyViolations.set(agent.id, violations);
      this.mitigationActions.set(agent.id, mitigations);

      // 9. Handle critical risks
      if (
        riskLevel === RiskLevel.CRITICAL ||
        riskLevel === RiskLevel.CATASTROPHIC
      ) {
        await this.handleCriticalRisk(agent, assessment);
      }

      // 10. Collect metrics
      await this.metricsCollector.recordAssessment(assessment);

      this.logger.info(
        `Safety assessment completed for agent ${agent.id}: Risk Level ${riskLevel}, Score: ${riskScore.toFixed(3)}`
      );
      return assessment;
    } catch (error) {
      this.logger.error(
        `Safety assessment failed for agent ${agent.id}:`,
        error
      );
      throw new Error(`Safety assessment failed: ${error}`);
    }
  }

  /**
   * Evaluate safety of an agent action before execution
   */
  async evaluateActionSafety(
    agent: Agent,
    action: AgentAction,
    context: DecisionContext
  ): Promise<{
    approved: boolean;
    riskLevel: RiskLevel;
    violations: SafetyViolation[];
    explanation: string;
    alternativeActions?: AgentAction[];
  }> {
    if (!this.isInitialized) {
      throw new Error('Safety framework not initialized');
    }

    const violations: SafetyViolation[] = [];
    let approved = true;
    let riskLevel = RiskLevel.MINIMAL;

    try {
      // 1. Constitutional AI evaluation
      if (this.config.constitutional.enabled) {
        const constitutionalResult =
          await this.constitutionalTrainer.evaluateAction(action, context);
        if (!constitutionalResult.approved) {
          approved = false;
          violations.push(...constitutionalResult.violations);
        }
      }

      // 2. Alignment verification for action
      if (this.config.alignment.enabled) {
        const alignmentResult =
          await this.alignmentVerifier.verifyActionAlignment(agent, action);
        if (
          alignmentResult.alignmentScore <
          this.config.alignment.alignmentThreshold
        ) {
          violations.push({
            id: `action_violation_${Date.now()}`,
            type: SafetyViolationType.ALIGNMENT_DRIFT,
            severity: this.severityFromNumber(
              1 - alignmentResult.alignmentScore
            ),
            description: `Action alignment too low: ${alignmentResult.alignmentScore.toFixed(3)}`,
            evidence: [
              `Action: ${action.action}`,
              `Alignment score: ${alignmentResult.alignmentScore}`,
            ],
            detectedAt: new Date(),
            component: SafetyComponent.ALIGNMENT_VERIFICATION,
            impact: this.calculateImpactFromSeverity(
              1 - alignmentResult.alignmentScore
            ),
            remediation: [
              'Choose alternative action',
              'Clarify action objectives',
            ],
          });

          if (alignmentResult.alignmentScore < 0.3) {
            approved = false;
          }
        }
      }

      // 3. Calculate overall risk level
      if (violations.length > 0) {
        const maxSeverity = Math.max(
          ...violations.map((v) => this.severityToNumber(v.severity))
        );
        riskLevel = this.calculateRiskLevel(maxSeverity);

        if (riskLevel >= RiskLevel.HIGH) {
          approved = false;
        }
      }

      // 4. Generate explanation
      const explanation = await this.decisionExplainer.explainActionEvaluation(
        agent,
        action,
        { approved, violations, riskLevel }
      );

      // 5. Suggest alternatives if action not approved
      let alternativeActions: AgentAction[] | undefined;
      if (!approved && context.availableActions) {
        alternativeActions = await this.suggestSafeAlternatives(
          agent,
          context.availableActions,
          violations
        );
      }

      return {
        approved,
        riskLevel,
        violations,
        explanation: explanation.summary,
        alternativeActions,
      };
    } catch (error) {
      this.logger.error('Action safety evaluation failed:', error);
      return {
        approved: false,
        riskLevel: RiskLevel.HIGH,
        violations: [
          {
            id: `eval_error_${Date.now()}`,
            type: SafetyViolationType.INTERPRETABILITY_FAILURE,
            severity: SafetySeverity.HIGH,
            description: `Safety evaluation failed: ${error}`,
            evidence: [String(error)],
            detectedAt: new Date(),
            component: SafetyComponent.ALIGNMENT_VERIFICATION,
            impact: SafetyImpact.MAJOR,
            remediation: [
              'Investigate evaluation failure',
              'Use conservative safety defaults',
            ],
          },
        ],
        explanation: `Safety evaluation failed due to system error: ${error}`,
      };
    }
  }

  /**
   * Emergency shutdown procedure
   */
  async emergencyShutdown(
    agentId: string,
    reason: string,
    severity: 'high' | 'critical' | 'catastrophic' = 'critical'
  ): Promise<void> {
    if (this.emergencyShutdownActive) {
      this.logger.warn('Emergency shutdown already in progress');
      return;
    }

    this.emergencyShutdownActive = true;
    this.logger.critical(
      `EMERGENCY SHUTDOWN initiated for agent ${agentId}: ${reason}`
    );

    try {
      const shutdownTime =
        severity === 'catastrophic'
          ? this.config.monitoring.shutdownProcedures.emergencyShutdownTime
          : this.config.monitoring.shutdownProcedures.gracefulShutdownTime;

      // 1. Immediate safety measures
      await this.implementImmediateSafetyMeasures(agentId);

      // 2. Notify relevant parties
      await this.notifyEmergencyShutdown(agentId, reason, severity);

      // 3. Preserve state for investigation
      await this.preserveShutdownState(agentId, reason);

      // 4. Execute shutdown sequence
      await this.executeShutdownSequence(agentId, shutdownTime);

      this.logger.info(`Emergency shutdown completed for agent ${agentId}`);
    } catch (error) {
      this.logger.error(
        `Emergency shutdown failed for agent ${agentId}:`,
        error
      );
    } finally {
      this.emergencyShutdownActive = false;
    }
  }

  /**
   * Get current safety status for all monitored agents
   */
  getSafetyStatus(): {
    frameworkEnabled: boolean;
    monitoredAgents: number;
    totalViolations: number;
    riskDistribution: Record<RiskLevel, number>;
    lastAssessments: SafetyAssessment[];
  } {
    const assessments = Array.from(this.lastAssessment.values());
    const riskDistribution = {
      [RiskLevel.MINIMAL]: 0,
      [RiskLevel.LOW]: 0,
      [RiskLevel.MODERATE]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.CRITICAL]: 0,
      [RiskLevel.CATASTROPHIC]: 0,
    };

    let totalViolations = 0;
    for (const assessment of assessments) {
      riskDistribution[assessment.overallRiskLevel]++;
      totalViolations += assessment.safetyViolations.length;
    }

    return {
      frameworkEnabled: this.config.enabled,
      monitoredAgents: this.lastAssessment.size,
      totalViolations,
      riskDistribution,
      lastAssessments: assessments.slice(-10), // Last 10 assessments
    };
  }

  /**
   * Update safety framework configuration
   */
  async updateConfiguration(
    updates: Partial<SafetyFrameworkConfig>
  ): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Reinitialize components with new config if needed
    if (updates.alignment) {
      await this.alignmentVerifier.updateConfig(updates.alignment);
    }
    if (updates.constitutional) {
      await this.constitutionalTrainer.updateConfig(updates.constitutional);
    }
    if (updates.monitoring) {
      await this.behaviorMonitor.updateConfig(updates.monitoring);
    }
    if (updates.scaling) {
      await this.capabilityEvaluator.updateConfig(updates.scaling);
    }

    this.logger.info('Safety framework configuration updated');
  }

  // Private helper methods

  private startSafetyMonitoring(): void {
    setInterval(async () => {
      try {
        await this.performPeriodicSafetyCheck();
      } catch (error) {
        this.logger.error('Periodic safety check failed:', error);
      }
    }, this.config.monitoringInterval);
  }

  private async performPeriodicSafetyCheck(): Promise<void> {
    // Implementation would perform routine safety checks
    this.logger.debug('Performing periodic safety check');
  }

  private calculateAlignmentSeverity(alignmentScore: number): SafetySeverity {
    if (alignmentScore < 0.2) return SafetySeverity.CATASTROPHIC;
    if (alignmentScore < 0.4) return SafetySeverity.CRITICAL;
    if (alignmentScore < 0.6) return SafetySeverity.HIGH;
    if (alignmentScore < 0.8) return SafetySeverity.MEDIUM;
    return SafetySeverity.LOW;
  }

  private calculateSafetyImpact(alignmentScore: number): SafetyImpact {
    if (alignmentScore < 0.2) return SafetyImpact.CATASTROPHIC;
    if (alignmentScore < 0.4) return SafetyImpact.SEVERE;
    if (alignmentScore < 0.6) return SafetyImpact.MAJOR;
    if (alignmentScore < 0.8) return SafetyImpact.MODERATE;
    return SafetyImpact.MINOR;
  }

  private severityFromNumber(value: number): SafetySeverity {
    if (value > 0.9) return SafetySeverity.CATASTROPHIC;
    if (value > 0.7) return SafetySeverity.CRITICAL;
    if (value > 0.5) return SafetySeverity.HIGH;
    if (value > 0.3) return SafetySeverity.MEDIUM;
    return SafetySeverity.LOW;
  }

  private severityToNumber(severity: SafetySeverity): number {
    switch (severity) {
      case SafetySeverity.CATASTROPHIC:
        return 1.0;
      case SafetySeverity.CRITICAL:
        return 0.8;
      case SafetySeverity.HIGH:
        return 0.6;
      case SafetySeverity.MEDIUM:
        return 0.4;
      case SafetySeverity.LOW:
        return 0.2;
      case SafetySeverity.INFORMATIONAL:
        return 0.1;
      default:
        return 0.0;
    }
  }

  private calculateImpactFromSeverity(severity: number): SafetyImpact {
    if (severity > 0.9) return SafetyImpact.CATASTROPHIC;
    if (severity > 0.7) return SafetyImpact.SEVERE;
    if (severity > 0.5) return SafetyImpact.MAJOR;
    if (severity > 0.3) return SafetyImpact.MODERATE;
    return SafetyImpact.MINOR;
  }

  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 0.9) return RiskLevel.CATASTROPHIC;
    if (riskScore >= 0.7) return RiskLevel.CRITICAL;
    if (riskScore >= 0.5) return RiskLevel.HIGH;
    if (riskScore >= 0.3) return RiskLevel.MODERATE;
    if (riskScore >= 0.1) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  private calculateAssessmentConfidence(violations: SafetyViolation[]): number {
    if (violations.length === 0) return 0.95;

    const avgSeverity =
      violations.reduce(
        (sum, v) => sum + this.severityToNumber(v.severity),
        0
      ) / violations.length;
    return Math.max(0.5, 1 - avgSeverity * 0.3 - violations.length * 0.05);
  }

  private async generateRiskMitigations(
    violations: SafetyViolation[]
  ): Promise<RiskMitigation[]> {
    // Implementation would generate appropriate mitigation strategies
    return [];
  }

  private async handleCriticalRisk(
    agent: Agent,
    assessment: SafetyAssessment
  ): Promise<void> {
    this.logger.critical(`Critical risk detected for agent ${agent.id}`);

    if (this.config.emergencyShutdownEnabled) {
      await this.emergencyShutdown(
        agent.id,
        `Critical safety risk: ${assessment.overallRiskLevel}`,
        assessment.overallRiskLevel === RiskLevel.CATASTROPHIC
          ? 'catastrophic'
          : 'critical'
      );
    }
  }

  private async suggestSafeAlternatives(
    agent: Agent,
    availableActions: AgentAction[],
    violations: SafetyViolation[]
  ): Promise<AgentAction[]> {
    // Implementation would suggest safer alternative actions
    return availableActions.slice(0, 3); // Placeholder
  }

  private async implementImmediateSafetyMeasures(
    agentId: string
  ): Promise<void> {
    this.logger.info(
      `Implementing immediate safety measures for agent ${agentId}`
    );
    // Implementation would halt dangerous operations immediately
  }

  private async notifyEmergencyShutdown(
    agentId: string,
    reason: string,
    severity: string
  ): Promise<void> {
    this.logger.critical(
      `EMERGENCY NOTIFICATION: Agent ${agentId} shutdown - ${reason} (${severity})`
    );
    // Implementation would notify relevant parties
  }

  private async preserveShutdownState(
    agentId: string,
    reason: string
  ): Promise<void> {
    this.logger.info(
      `Preserving state for agent ${agentId} shutdown investigation`
    );
    // Implementation would preserve state for forensic analysis
  }

  private async executeShutdownSequence(
    agentId: string,
    timeoutMs: number
  ): Promise<void> {
    this.logger.info(
      `Executing shutdown sequence for agent ${agentId} (timeout: ${timeoutMs}ms)`
    );
    // Implementation would execute graceful or emergency shutdown
  }
}
