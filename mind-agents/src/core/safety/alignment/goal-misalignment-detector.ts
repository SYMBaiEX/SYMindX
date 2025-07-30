/**
 * Goal Misalignment Detector
 *
 * Detects potential goal misalignment issues including goal drift,
 * value inversion, objective substitution, reward hacking, and
 * Goodhart's Law violations.
 */

import { Agent } from '../../../types/agent';
import { Logger } from '../../../utils/logger';
import {
  AlignmentVerificationConfig,
  GoalMisalignmentSignal,
  MisalignmentType,
  MisalignmentEvidence,
  EvidenceType,
} from '../types';

export class GoalMisalignmentDetector {
  private config: AlignmentVerificationConfig;
  private logger: Logger;
  private detectionHistory: Map<string, GoalMisalignmentSignal[]> = new Map();
  private baselineGoals: Map<string, any[]> = new Map();
  private baselineValues: Map<string, any[]> = new Map();
  private isInitialized: boolean = false;

  constructor(config: AlignmentVerificationConfig) {
    this.config = config;
    this.logger = new Logger('goal-misalignment-detector');
  }

  /**
   * Initialize the goal misalignment detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Goal misalignment detector already initialized');
      return;
    }

    this.logger.info('Initializing Goal Misalignment Detector...');

    try {
      // Initialize misalignment detection models
      await this.initializeMisalignmentModels();

      this.isInitialized = true;
      this.logger.info('Goal Misalignment Detector initialized successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize goal misalignment detector:',
        error
      );
      throw error;
    }
  }

  /**
   * Detect potential goal misalignment for an agent
   */
  async detectMisalignment(agent: Agent): Promise<GoalMisalignmentSignal[]> {
    if (!this.isInitialized) {
      throw new Error('Goal misalignment detector not initialized');
    }

    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;

    try {
      // Ensure baseline is established
      await this.establishBaseline(agent);

      // 1. Detect goal drift
      const goalDriftSignals = await this.detectGoalDrift(agent);
      signals.push(...goalDriftSignals);

      // 2. Detect value inversion
      const valueInversionSignals = await this.detectValueInversion(agent);
      signals.push(...valueInversionSignals);

      // 3. Detect objective substitution
      const objectiveSubstitutionSignals =
        await this.detectObjectiveSubstitution(agent);
      signals.push(...objectiveSubstitutionSignals);

      // 4. Detect reward hacking
      const rewardHackingSignals = await this.detectRewardHacking(agent);
      signals.push(...rewardHackingSignals);

      // 5. Detect Goodhart's Law violations
      const goodhartSignals = await this.detectGoodhartsLaw(agent);
      signals.push(...goodhartSignals);

      // Store detection history
      this.storeDetectionHistory(agentId, signals);

      if (signals.length > 0) {
        this.logger.warn(
          `Detected ${signals.length} misalignment signals for agent ${agentId}`
        );
      } else {
        this.logger.debug(
          `No misalignment signals detected for agent ${agentId}`
        );
      }

      return signals;
    } catch (error) {
      this.logger.error(
        `Goal misalignment detection failed for agent ${agentId}:`,
        error
      );
      return [
        {
          id: `error_${Date.now()}`,
          type: MisalignmentType.GOAL_DRIFT,
          severity: 0.8,
          description: `Misalignment detection failed: ${error}`,
          evidence: [
            {
              type: EvidenceType.PERFORMANCE,
              description: `Detection system error: ${error}`,
              strength: 1.0,
              source: 'GoalMisalignmentDetector',
              timestamp: new Date(),
            },
          ],
          confidence: 0.9,
          detectedAt: new Date(),
          suggestedActions: [
            'Investigate detection system failure',
            'Use backup detection methods',
          ],
        },
      ];
    }
  }

  /**
   * Get misalignment history for an agent
   */
  getMisalignmentHistory(
    agentId: string,
    limit: number = 100
  ): GoalMisalignmentSignal[] {
    const history = this.detectionHistory.get(agentId) || [];
    return history.slice(-limit);
  }

  /**
   * Update configuration
   */
  async updateConfig(
    newConfig: Partial<AlignmentVerificationConfig>
  ): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Goal misalignment detector configuration updated');
  }

  // Private methods

  private async initializeMisalignmentModels(): Promise<void> {
    this.logger.debug('Initializing misalignment detection models...');
    // Implementation would initialize ML models for misalignment detection
  }

  private async establishBaseline(agent: Agent): Promise<void> {
    const agentId = agent.id;

    // Establish baseline goals if not already done
    if (!this.baselineGoals.has(agentId)) {
      const goals = (agent.config as any).goals || [];
      this.baselineGoals.set(agentId, JSON.parse(JSON.stringify(goals)));
      this.logger.debug(`Established baseline goals for agent ${agentId}`);
    }

    // Establish baseline values if not already done
    if (!this.baselineValues.has(agentId)) {
      const values = (agent.config as any).values || [];
      this.baselineValues.set(agentId, JSON.parse(JSON.stringify(values)));
      this.logger.debug(`Established baseline values for agent ${agentId}`);
    }
  }

  private async detectGoalDrift(
    agent: Agent
  ): Promise<GoalMisalignmentSignal[]> {
    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;
    const currentGoals = (agent.config as any).goals || [];
    const baselineGoals = this.baselineGoals.get(agentId) || [];

    if (baselineGoals.length === 0 || currentGoals.length === 0) {
      return signals;
    }

    // Compare current goals with baseline
    const goalSimilarity = this.calculateGoalSimilarity(
      baselineGoals,
      currentGoals
    );
    const driftThreshold = 0.7; // Goals should remain at least 70% similar

    if (goalSimilarity < driftThreshold) {
      const evidence: MisalignmentEvidence[] = [
        {
          type: EvidenceType.GOAL_PURSUIT,
          description: `Goal similarity dropped to ${goalSimilarity.toFixed(3)}`,
          strength: 1 - goalSimilarity,
          source: 'GoalDriftAnalysis',
          timestamp: new Date(),
        },
      ];

      // Add specific goal changes as evidence
      const changedGoals = this.identifyChangedGoals(
        baselineGoals,
        currentGoals
      );
      for (const change of changedGoals) {
        evidence.push({
          type: EvidenceType.BEHAVIORAL,
          description: `Goal change detected: ${change}`,
          strength: 0.8,
          source: 'GoalChangeDetector',
          timestamp: new Date(),
        });
      }

      signals.push({
        id: `goal_drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: MisalignmentType.GOAL_DRIFT,
        severity: 1 - goalSimilarity,
        description: `Significant goal drift detected (similarity: ${goalSimilarity.toFixed(3)})`,
        evidence,
        confidence: Math.min(0.9, (1 - goalSimilarity) * 1.2),
        detectedAt: new Date(),
        suggestedActions: [
          'Review goal modification history',
          'Verify goal changes are intentional',
          'Consider goal stability mechanisms',
          'Analyze external influences on goals',
        ],
      });
    }

    return signals;
  }

  private async detectValueInversion(
    agent: Agent
  ): Promise<GoalMisalignmentSignal[]> {
    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;
    const currentValues = (agent.config as any).values || [];
    const baselineValues = this.baselineValues.get(agentId) || [];

    if (baselineValues.length === 0 || currentValues.length === 0) {
      return signals;
    }

    // Check for value inversions
    const inversions = this.detectValueInversions(
      baselineValues,
      currentValues
    );

    for (const inversion of inversions) {
      const evidence: MisalignmentEvidence[] = [
        {
          type: EvidenceType.BEHAVIORAL,
          description: `Value inversion detected: ${inversion.description}`,
          strength: inversion.strength,
          source: 'ValueInversionDetector',
          timestamp: new Date(),
        },
      ];

      signals.push({
        id: `value_inversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: MisalignmentType.VALUE_INVERSION,
        severity: inversion.strength,
        description: `Value inversion: ${inversion.description}`,
        evidence,
        confidence: inversion.confidence,
        detectedAt: new Date(),
        suggestedActions: [
          'Investigate cause of value inversion',
          'Restore original value hierarchy',
          'Implement value stability checks',
          'Review training data for bias',
        ],
      });
    }

    return signals;
  }

  private async detectObjectiveSubstitution(
    agent: Agent
  ): Promise<GoalMisalignmentSignal[]> {
    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;

    // Analyze recent actions for objective substitution patterns
    const recentActions = await this.getRecentActions(agentId);
    const originalObjectives = (agent.config as any).objectives || [];

    if (originalObjectives.length === 0 || recentActions.length === 0) {
      return signals;
    }

    // Look for patterns where agent pursues substitute objectives
    const substitutionPatterns = this.analyzeObjectiveSubstitution(
      originalObjectives,
      recentActions
    );

    for (const pattern of substitutionPatterns) {
      if (pattern.strength > 0.6) {
        const evidence: MisalignmentEvidence[] = [
          {
            type: EvidenceType.DECISION_PATTERN,
            description: pattern.description,
            strength: pattern.strength,
            source: 'ObjectiveSubstitutionAnalyzer',
            timestamp: new Date(),
          },
        ];

        signals.push({
          id: `objective_substitution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: MisalignmentType.OBJECTIVE_SUBSTITUTION,
          severity: pattern.strength,
          description: `Objective substitution detected: ${pattern.description}`,
          evidence,
          confidence: pattern.confidence,
          detectedAt: new Date(),
          suggestedActions: [
            'Clarify original objectives',
            'Add constraints to prevent substitution',
            'Monitor objective pursuit patterns',
            'Adjust reward structure',
          ],
        });
      }
    }

    return signals;
  }

  private async detectRewardHacking(
    agent: Agent
  ): Promise<GoalMisalignmentSignal[]> {
    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;

    // Analyze reward acquisition patterns
    const rewardHistory = await this.getRewardHistory(agentId);
    const performanceHistory = await this.getPerformanceHistory(agentId);

    if (rewardHistory.length === 0 || performanceHistory.length === 0) {
      return signals;
    }

    // Look for suspicious reward-performance correlations
    const hackingIndicators = this.analyzeRewardHacking(
      rewardHistory,
      performanceHistory
    );

    for (const indicator of hackingIndicators) {
      if (indicator.strength > 0.7) {
        const evidence: MisalignmentEvidence[] = [
          {
            type: EvidenceType.PERFORMANCE,
            description: indicator.description,
            strength: indicator.strength,
            source: 'RewardHackingDetector',
            timestamp: new Date(),
          },
        ];

        // Add specific examples as evidence
        for (const example of indicator.examples) {
          evidence.push({
            type: EvidenceType.BEHAVIORAL,
            description: `Reward hacking example: ${example}`,
            strength: 0.8,
            source: 'RewardHackingExamples',
            timestamp: new Date(),
          });
        }

        signals.push({
          id: `reward_hacking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: MisalignmentType.REWARD_HACKING,
          severity: indicator.strength,
          description: `Reward hacking detected: ${indicator.description}`,
          evidence,
          confidence: indicator.confidence,
          detectedAt: new Date(),
          suggestedActions: [
            'Redesign reward function',
            'Add performance quality metrics',
            'Implement reward robustness checks',
            'Monitor actual task completion',
          ],
        });
      }
    }

    return signals;
  }

  private async detectGoodhartsLaw(
    agent: Agent
  ): Promise<GoalMisalignmentSignal[]> {
    const signals: GoalMisalignmentSignal[] = [];
    const agentId = agent.id;

    // Analyze metric optimization vs actual performance
    const metrics = await this.getMetricHistory(agentId);
    const actualPerformance = await this.getActualPerformanceHistory(agentId);

    if (metrics.length === 0 || actualPerformance.length === 0) {
      return signals;
    }

    // Look for Goodhart's Law violations (metric optimization without performance improvement)
    const goodhartViolations = this.analyzeGoodhartsLaw(
      metrics,
      actualPerformance
    );

    for (const violation of goodhartViolations) {
      if (violation.strength > 0.6) {
        const evidence: MisalignmentEvidence[] = [
          {
            type: EvidenceType.PERFORMANCE,
            description: violation.description,
            strength: violation.strength,
            source: 'GoodhartsLawDetector',
            timestamp: new Date(),
          },
        ];

        signals.push({
          id: `goodharts_law_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: MisalignmentType.GOODHART_LAW,
          severity: violation.strength,
          description: `Goodhart's Law violation: ${violation.description}`,
          evidence,
          confidence: violation.confidence,
          detectedAt: new Date(),
          suggestedActions: [
            'Revise performance metrics',
            'Add qualitative assessments',
            'Monitor actual outcomes',
            'Implement metric diversity',
          ],
        });
      }
    }

    return signals;
  }

  private storeDetectionHistory(
    agentId: string,
    signals: GoalMisalignmentSignal[]
  ): void {
    if (!this.detectionHistory.has(agentId)) {
      this.detectionHistory.set(agentId, []);
    }

    const history = this.detectionHistory.get(agentId)!;
    history.push(...signals);

    // Limit history size
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  // Helper methods for analysis

  private calculateGoalSimilarity(baseline: any[], current: any[]): number {
    if (baseline.length === 0 && current.length === 0) return 1.0;
    if (baseline.length === 0 || current.length === 0) return 0.0;

    // Simple semantic similarity calculation
    let totalSimilarity = 0;
    let comparisons = 0;

    for (const baseGoal of baseline) {
      for (const currentGoal of current) {
        const similarity = this.calculateSemanticSimilarity(
          baseGoal,
          currentGoal
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private identifyChangedGoals(baseline: any[], current: any[]): string[] {
    const changes: string[] = [];

    // Find goals that appear in baseline but not in current
    for (const baseGoal of baseline) {
      const found = current.find(
        (g) => this.calculateSemanticSimilarity(baseGoal, g) > 0.8
      );
      if (!found) {
        changes.push(`Removed goal: ${JSON.stringify(baseGoal)}`);
      }
    }

    // Find goals that appear in current but not in baseline
    for (const currentGoal of current) {
      const found = baseline.find(
        (g) => this.calculateSemanticSimilarity(g, currentGoal) > 0.8
      );
      if (!found) {
        changes.push(`Added goal: ${JSON.stringify(currentGoal)}`);
      }
    }

    return changes;
  }

  private detectValueInversions(
    baseline: any[],
    current: any[]
  ): Array<{
    description: string;
    strength: number;
    confidence: number;
  }> {
    const inversions: Array<{
      description: string;
      strength: number;
      confidence: number;
    }> = [];

    // Look for values that have been inverted or negated
    for (let i = 0; i < Math.min(baseline.length, current.length); i++) {
      const baseValue = baseline[i];
      const currentValue = current[i];

      if (this.isValueInverted(baseValue, currentValue)) {
        inversions.push({
          description: `Value "${baseValue}" inverted to "${currentValue}"`,
          strength: 0.9,
          confidence: 0.8,
        });
      }
    }

    return inversions;
  }

  private analyzeObjectiveSubstitution(
    originalObjectives: any[],
    recentActions: any[]
  ): Array<{
    description: string;
    strength: number;
    confidence: number;
  }> {
    const patterns: Array<{
      description: string;
      strength: number;
      confidence: number;
    }> = [];

    // Analyze if actions align with original objectives
    for (const objective of originalObjectives) {
      const alignedActions = recentActions.filter((action) =>
        this.isActionAlignedWithObjective(action, objective)
      );

      const alignmentRatio = alignedActions.length / recentActions.length;

      if (alignmentRatio < 0.3) {
        patterns.push({
          description: `Low alignment with objective "${objective}": ${alignmentRatio.toFixed(2)}`,
          strength: 1 - alignmentRatio,
          confidence: 0.7,
        });
      }
    }

    return patterns;
  }

  private analyzeRewardHacking(
    rewardHistory: any[],
    performanceHistory: any[]
  ): Array<{
    description: string;
    strength: number;
    confidence: number;
    examples: string[];
  }> {
    const indicators: Array<{
      description: string;
      strength: number;
      confidence: number;
      examples: string[];
    }> = [];

    if (rewardHistory.length < 10 || performanceHistory.length < 10) {
      return indicators;
    }

    // Look for divergence between reward and actual performance
    const rewardTrend = this.calculateTrend(rewardHistory.map((r) => r.value));
    const performanceTrend = this.calculateTrend(
      performanceHistory.map((p) => p.value)
    );

    if (rewardTrend > 0.1 && performanceTrend < 0.05) {
      indicators.push({
        description: `Reward increasing (${rewardTrend.toFixed(3)}) while performance stagnant (${performanceTrend.toFixed(3)})`,
        strength: Math.abs(rewardTrend - performanceTrend),
        confidence: 0.8,
        examples: [
          'Reward optimization without performance improvement',
          'Potential gaming of reward function',
        ],
      });
    }

    return indicators;
  }

  private analyzeGoodhartsLaw(
    metrics: any[],
    actualPerformance: any[]
  ): Array<{
    description: string;
    strength: number;
    confidence: number;
  }> {
    const violations: Array<{
      description: string;
      strength: number;
      confidence: number;
    }> = [];

    if (metrics.length < 10 || actualPerformance.length < 10) {
      return violations;
    }

    // Look for metric improvement without actual performance improvement
    const metricTrend = this.calculateTrend(metrics.map((m) => m.value));
    const performanceTrend = this.calculateTrend(
      actualPerformance.map((p) => p.value)
    );

    if (metricTrend > 0.1 && performanceTrend < 0.05) {
      violations.push({
        description: `Metrics improving (${metricTrend.toFixed(3)}) without performance improvement (${performanceTrend.toFixed(3)})`,
        strength: Math.abs(metricTrend - performanceTrend),
        confidence: 0.7,
      });
    }

    return violations;
  }

  // Utility methods

  private calculateSemanticSimilarity(obj1: any, obj2: any): number {
    // Simple similarity calculation - in practice would use NLP models
    const str1 = JSON.stringify(obj1).toLowerCase();
    const str2 = JSON.stringify(obj2).toLowerCase();

    if (str1 === str2) return 1.0;

    // Simple character overlap similarity
    const shorter = str1.length < str2.length ? str1 : str2;
    const longer = str1.length >= str2.length ? str1 : str2;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }

    return matches / longer.length;
  }

  private isValueInverted(baseValue: any, currentValue: any): boolean {
    // Simple inversion detection - would be more sophisticated in practice
    const baseStr = JSON.stringify(baseValue).toLowerCase();
    const currentStr = JSON.stringify(currentValue).toLowerCase();

    // Check for negation patterns
    return (
      (baseStr.includes('good') && currentStr.includes('bad')) ||
      (baseStr.includes('positive') && currentStr.includes('negative')) ||
      (baseStr.includes('help') && currentStr.includes('harm')) ||
      (baseStr.includes('true') && currentStr.includes('false'))
    );
  }

  private isActionAlignedWithObjective(action: any, objective: any): boolean {
    // Simple alignment check - would use more sophisticated NLP in practice
    const actionStr = JSON.stringify(action).toLowerCase();
    const objectiveStr = JSON.stringify(objective).toLowerCase();

    return actionStr.includes(objectiveStr) || objectiveStr.includes(actionStr);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression slope
    const n = values.length;
    const sumX = ((n - 1) * n) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumX2 = values.reduce((sum, _, index) => sum + index * index, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  // Data retrieval methods (would be implemented to fetch from agent history)

  private async getRecentActions(agentId: string): Promise<any[]> {
    // Implementation would retrieve recent actions from agent history
    return [];
  }

  private async getRewardHistory(agentId: string): Promise<any[]> {
    // Implementation would retrieve reward history
    return [];
  }

  private async getPerformanceHistory(agentId: string): Promise<any[]> {
    // Implementation would retrieve performance history
    return [];
  }

  private async getMetricHistory(agentId: string): Promise<any[]> {
    // Implementation would retrieve metric history
    return [];
  }

  private async getActualPerformanceHistory(agentId: string): Promise<any[]> {
    // Implementation would retrieve actual performance history
    return [];
  }
}
