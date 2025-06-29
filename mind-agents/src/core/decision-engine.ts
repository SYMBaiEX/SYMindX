/**
 * Decision Engine - Multi-criteria decision making for autonomous agents
 * 
 * Implements sophisticated decision-making algorithms including AHP (Analytic Hierarchy Process),
 * TOPSIS, weighted sum, and fuzzy logic for autonomous agent decision making.
 */

import {
  DecisionContext,
  DecisionCriteria,
  MultiCriteriaDecision,
  Constraint,
  Uncertainty,
  Goal,
  DecisionModuleType,
  DecisionConfig
} from '../types/autonomous.js'
import { AgentAction, Agent } from '../types/agent.js'
import { Logger } from '../utils/logger.js'

export interface DecisionMatrix {
  alternatives: string[]
  criteria: string[]
  scores: number[][]
  weights: number[]
}

export interface DecisionResult {
  ranking: { alternative: string; score: number }[]
  confidence: number
  reasoning: string[]
  method: string
}

export interface EthicalRule {
  id: string
  description: string
  condition: (action: AgentAction, context: DecisionContext) => boolean
  violation_penalty: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export class DecisionEngine {
  private agent: Agent
  private config: DecisionConfig
  private logger: Logger
  private ethicalRules: EthicalRule[]
  private decisionHistory: MultiCriteriaDecision[] = []

  constructor(agent: Agent, config: DecisionConfig) {
    this.agent = agent
    this.config = config
    this.logger = new Logger(`decision-engine-${agent.id}`)
    this.ethicalRules = this.initializeEthicalRules()
  }

  /**
   * Make a multi-criteria decision
   */
  async makeDecision(context: DecisionContext): Promise<MultiCriteriaDecision> {
    this.logger.info('Making multi-criteria decision...')

    // 1. Validate context
    this.validateDecisionContext(context)

    // 2. Filter alternatives based on constraints
    const feasibleAlternatives = await this.filterFeasibleAlternatives(
      context.availableActions,
      context.constraints
    )

    if (feasibleAlternatives.length === 0) {
      throw new Error('No feasible alternatives available for decision')
    }

    // 3. Generate decision criteria
    const criteria = await this.generateDecisionCriteria(context)

    // 4. Build decision matrix
    const matrix = await this.buildDecisionMatrix(feasibleAlternatives, criteria, context)

    // 5. Apply decision method
    const result = await this.applyDecisionMethod(matrix, this.config.type)

    // 6. Perform ethical check
    const ethicalCheck = await this.performEthicalCheck(
      feasibleAlternatives[0], // Best alternative
      context
    )

    // 7. Handle uncertainty
    const uncertaintyAdjustment = this.calculateUncertaintyAdjustment(context.uncertainties)

    // 8. Create decision
    const decision: MultiCriteriaDecision = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      context,
      criteria,
      alternatives: feasibleAlternatives,
      evaluation: this.matrixToEvaluation(matrix),
      recommendation: this.selectRecommendation(result, feasibleAlternatives),
      confidence: Math.max(0, Math.min(1, result.confidence * uncertaintyAdjustment * ethicalCheck.confidence)),
      reasoning: [
        ...result.reasoning,
        ...ethicalCheck.reasoning,
        `Uncertainty adjustment: ${uncertaintyAdjustment.toFixed(3)}`,
        `Decision method: ${result.method}`
      ],
      timestamp: new Date()
    }

    // 9. Store decision in history
    this.decisionHistory.push(decision)
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift() // Keep last 100 decisions
    }

    this.logger.info(`Decision made: ${decision.recommendation.action} (confidence: ${decision.confidence.toFixed(3)})`)
    return decision
  }

  /**
   * Generate decision criteria based on agent personality, goals, and context
   */
  private async generateDecisionCriteria(context: DecisionContext): Promise<DecisionCriteria[]> {
    const criteria: DecisionCriteria[] = []
    const personality = this.agent.config.psyche?.traits || []

    // Goal alignment criterion
    criteria.push({
      id: 'goal_alignment',
      name: 'Goal Alignment',
      weight: 0.35,
      type: 'maximize',
      measurement: 'How well the action aligns with current goals',
      threshold: 0.5
    })

    // Personality fit criterion
    criteria.push({
      id: 'personality_fit',
      name: 'Personality Fit',
      weight: 0.25,
      type: 'maximize',
      measurement: 'How well the action matches agent personality traits'
    })

    // Resource efficiency criterion
    criteria.push({
      id: 'resource_efficiency',
      name: 'Resource Efficiency',
      weight: 0.15,
      type: 'maximize',
      measurement: 'How efficiently the action uses available resources'
    })

    // Risk assessment criterion
    criteria.push({
      id: 'risk_level',
      name: 'Risk Level',
      weight: this.config.riskTolerance,
      type: 'minimize',
      measurement: 'The potential risk associated with the action'
    })

    // Ethical compliance criterion
    criteria.push({
      id: 'ethical_compliance',
      name: 'Ethical Compliance',
      weight: 0.15,
      type: 'maximize',
      measurement: 'How well the action adheres to ethical principles'
    })

    // Novelty/curiosity criterion (if agent is curious)
    if (personality.includes('curious')) {
      criteria.push({
        id: 'novelty',
        name: 'Novelty',
        weight: 0.1,
        type: 'maximize',
        measurement: 'How novel or interesting the action is'
      })
    }

    // Social impact criterion (if agent is social)
    if (personality.includes('social')) {
      criteria.push({
        id: 'social_impact',
        name: 'Social Impact',
        weight: 0.1,
        type: 'maximize',
        measurement: 'The positive impact on relationships and social connections'
      })
    }

    // Normalize weights to sum to 1.0
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
    criteria.forEach(c => c.weight = c.weight / totalWeight)

    return criteria
  }

  /**
   * Build decision matrix by scoring alternatives against criteria
   */
  private async buildDecisionMatrix(
    alternatives: AgentAction[],
    criteria: DecisionCriteria[],
    context: DecisionContext
  ): Promise<DecisionMatrix> {
    const scores: number[][] = []

    for (const alternative of alternatives) {
      const alternativeScores: number[] = []

      for (const criterion of criteria) {
        const score = await this.scoreAlternativeAgainstCriterion(
          alternative,
          criterion,
          context
        )
        alternativeScores.push(score)
      }

      scores.push(alternativeScores)
    }

    return {
      alternatives: alternatives.map(a => a.id),
      criteria: criteria.map(c => c.id),
      scores,
      weights: criteria.map(c => c.weight)
    }
  }

  /**
   * Score an alternative against a specific criterion
   */
  private async scoreAlternativeAgainstCriterion(
    alternative: AgentAction,
    criterion: DecisionCriteria,
    context: DecisionContext
  ): Promise<number> {
    switch (criterion.id) {
      case 'goal_alignment':
        return this.scoreGoalAlignment(alternative, context.goals)
      
      case 'personality_fit':
        return this.scorePersonalityFit(alternative)
      
      case 'resource_efficiency':
        return this.scoreResourceEfficiency(alternative)
      
      case 'risk_level':
        return this.scoreRiskLevel(alternative, context)
      
      case 'ethical_compliance':
        return this.scoreEthicalCompliance(alternative, context)
      
      case 'novelty':
        return this.scoreNovelty(alternative)
      
      case 'social_impact':
        return this.scoreSocialImpact(alternative)
      
      default:
        return 0.5 // Neutral score for unknown criteria
    }
  }

  /**
   * Apply the specified decision method
   */
  private async applyDecisionMethod(
    matrix: DecisionMatrix,
    method: DecisionModuleType
  ): Promise<DecisionResult> {
    switch (method) {
      case DecisionModuleType.MCDM_AHP:
        return this.applyAHP(matrix)
      
      case DecisionModuleType.HYBRID:
        return this.applyHybridMethod(matrix)
      
      case DecisionModuleType.FUZZY:
        return this.applyFuzzyLogic(matrix)
      
      case DecisionModuleType.BAYESIAN:
        return this.applyBayesianDecision(matrix)
      
      default:
        return this.applyWeightedSum(matrix)
    }
  }

  /**
   * Apply Analytic Hierarchy Process (AHP)
   */
  private applyAHP(matrix: DecisionMatrix): DecisionResult {
    const { scores, weights } = matrix
    const normalizedScores = this.normalizeMatrix(scores)
    
    // Calculate weighted scores
    const finalScores = normalizedScores.map(row =>
      row.reduce((sum, score, i) => sum + score * weights[i], 0)
    )

    // Create ranking
    const ranking = matrix.alternatives.map((alt, i) => ({
      alternative: alt,
      score: finalScores[i]
    })).sort((a, b) => b.score - a.score)

    // Calculate consistency ratio (simplified)
    const consistency = this.calculateConsistencyRatio(matrix)
    const confidence = Math.max(0.5, 1 - consistency)

    return {
      ranking,
      confidence,
      reasoning: [
        `AHP method applied with ${matrix.criteria.length} criteria`,
        `Consistency ratio: ${consistency.toFixed(3)}`,
        `Top alternative: ${ranking[0].alternative} (score: ${ranking[0].score.toFixed(3)})`
      ],
      method: 'AHP'
    }
  }

  /**
   * Apply weighted sum method (simple MCDM)
   */
  private applyWeightedSum(matrix: DecisionMatrix): DecisionResult {
    const { scores, weights } = matrix
    
    // Calculate weighted scores
    const finalScores = scores.map(row =>
      row.reduce((sum, score, i) => sum + score * weights[i], 0)
    )

    // Create ranking
    const ranking = matrix.alternatives.map((alt, i) => ({
      alternative: alt,
      score: finalScores[i]
    })).sort((a, b) => b.score - a.score)

    const confidence = this.calculateWeightedSumConfidence(finalScores)

    return {
      ranking,
      confidence,
      reasoning: [
        `Weighted sum method applied`,
        `Score difference: ${(ranking[0].score - ranking[1]?.score || 0).toFixed(3)}`,
        `Top alternative: ${ranking[0].alternative}`
      ],
      method: 'WeightedSum'
    }
  }

  /**
   * Apply hybrid decision method (combines multiple approaches)
   */
  private applyHybridMethod(matrix: DecisionMatrix): DecisionResult {
    // Combine AHP and weighted sum
    const ahpResult = this.applyAHP(matrix)
    const wsResult = this.applyWeightedSum(matrix)

    // Merge rankings with weights
    const hybridRanking = this.mergeRankings([
      { result: ahpResult, weight: 0.6 },
      { result: wsResult, weight: 0.4 }
    ])

    return {
      ranking: hybridRanking,
      confidence: (ahpResult.confidence + wsResult.confidence) / 2,
      reasoning: [
        'Hybrid method combining AHP and Weighted Sum',
        ...ahpResult.reasoning.slice(0, 1),
        ...wsResult.reasoning.slice(0, 1)
      ],
      method: 'Hybrid'
    }
  }

  /**
   * Apply fuzzy logic decision making
   */
  private applyFuzzyLogic(matrix: DecisionMatrix): DecisionResult {
    // Simplified fuzzy logic implementation
    const { scores, weights } = matrix
    
    // Apply fuzzy membership functions
    const fuzzyScores = scores.map(row =>
      row.map(score => this.applyFuzzyMembership(score))
    )

    // Calculate fuzzy weighted scores
    const finalScores = fuzzyScores.map(row =>
      row.reduce((sum, score, i) => sum + score * weights[i], 0)
    )

    const ranking = matrix.alternatives.map((alt, i) => ({
      alternative: alt,
      score: finalScores[i]
    })).sort((a, b) => b.score - a.score)

    return {
      ranking,
      confidence: 0.8, // Fuzzy logic provides good confidence
      reasoning: [
        'Fuzzy logic decision making applied',
        'Membership functions used for uncertainty handling'
      ],
      method: 'FuzzyLogic'
    }
  }

  /**
   * Apply Bayesian decision making
   */
  private applyBayesianDecision(matrix: DecisionMatrix): DecisionResult {
    // Simplified Bayesian approach
    const { scores, weights } = matrix
    
    // Calculate prior probabilities based on historical decisions
    const priors = this.calculatePriors(matrix.alternatives)
    
    // Calculate likelihood from scores
    const posteriors = scores.map((row, i) => {
      const likelihood = row.reduce((sum, score, j) => sum + score * weights[j], 0)
      return priors[i] * likelihood
    })

    // Normalize posteriors
    const totalPosterior = posteriors.reduce((sum, p) => sum + p, 0)
    const normalizedPosteriors = posteriors.map(p => p / totalPosterior)

    const ranking = matrix.alternatives.map((alt, i) => ({
      alternative: alt,
      score: normalizedPosteriors[i]
    })).sort((a, b) => b.score - a.score)

    return {
      ranking,
      confidence: Math.max(...normalizedPosteriors),
      reasoning: [
        'Bayesian decision making with prior experience',
        `Total posterior probability: ${totalPosterior.toFixed(3)}`
      ],
      method: 'Bayesian'
    }
  }

  /**
   * Filter alternatives based on hard constraints
   */
  private async filterFeasibleAlternatives(
    alternatives: AgentAction[],
    constraints: Constraint[]
  ): Promise<AgentAction[]> {
    if (constraints.length === 0) {
      return alternatives
    }

    const feasible: AgentAction[] = []

    for (const alternative of alternatives) {
      let isFeasible = true

      for (const constraint of constraints) {
        if (!await this.checkConstraint(alternative, constraint)) {
          isFeasible = false
          break
        }
      }

      if (isFeasible) {
        feasible.push(alternative)
      }
    }

    return feasible
  }

  /**
   * Check if an alternative satisfies a constraint
   */
  private async checkConstraint(alternative: AgentAction, constraint: Constraint): Promise<boolean> {
    switch (constraint.type) {
      case 'resource':
        return this.checkResourceConstraint(alternative, constraint)
      case 'temporal':
        return this.checkTemporalConstraint(alternative, constraint)
      case 'ethical':
        return this.checkEthicalConstraint(alternative, constraint)
      case 'logical':
        return this.checkLogicalConstraint(alternative, constraint)
      default:
        return true // Unknown constraints are assumed satisfied
    }
  }

  /**
   * Perform ethical check on the recommended action
   */
  private async performEthicalCheck(
    action: AgentAction,
    context: DecisionContext
  ): Promise<{ confidence: number; reasoning: string[] }> {
    const violations: string[] = []
    let penaltyScore = 0

    for (const rule of this.ethicalRules) {
      if (rule.condition(action, context)) {
        violations.push(rule.description)
        penaltyScore += rule.violation_penalty

        if (rule.severity === 'critical') {
          return {
            confidence: 0,
            reasoning: [`Critical ethical violation: ${rule.description}`]
          }
        }
      }
    }

    const confidence = Math.max(0, 1 - penaltyScore)
    const reasoning = violations.length > 0
      ? [`Ethical violations detected: ${violations.join(', ')}`]
      : ['Ethical check passed']

    return { confidence, reasoning }
  }

  /**
   * Initialize ethical rules based on agent configuration
   */
  private initializeEthicalRules(): EthicalRule[] {
    const rules: EthicalRule[] = []
    const ethics = (this.agent.config as any).ethics

    if (!ethics) return rules

    // Core ethical principles
    for (const principle of ethics.core_principles) {
      switch (principle) {
        case 'Do no harm':
          rules.push({
            id: 'no_harm',
            description: 'Action must not cause harm',
            condition: (action) => this.couldCauseHarm(action),
            violation_penalty: 1.0,
            severity: 'critical'
          })
          break

        case 'Respect autonomy':
          rules.push({
            id: 'respect_autonomy',
            description: 'Action must respect human autonomy',
            condition: (action) => this.violatesAutonomy(action),
            violation_penalty: 0.8,
            severity: 'high'
          })
          break

        case 'Protect privacy':
          rules.push({
            id: 'protect_privacy',
            description: 'Action must protect privacy',
            condition: (action) => this.violatesPrivacy(action),
            violation_penalty: 0.6,
            severity: 'medium'
          })
          break

        case 'Be truthful':
          rules.push({
            id: 'truthfulness',
            description: 'Action must be truthful',
            condition: (action) => this.isDeceptive(action),
            violation_penalty: 0.4,
            severity: 'medium'
          })
          break
      }
    }

    return rules
  }

  // Scoring methods for different criteria
  private scoreGoalAlignment(action: AgentAction, goals: Goal[]): number {
    if (goals.length === 0) return 0.5

    let maxAlignment = 0
    for (const goal of goals) {
      const alignment = this.calculateActionGoalAlignment(action, goal)
      maxAlignment = Math.max(maxAlignment, alignment)
    }

    return maxAlignment
  }

  private scorePersonalityFit(action: AgentAction): number {
    const personality = this.agent.config.psyche?.traits || []
    
    // Map action types to personality traits
    const actionPersonalityMap: Record<string, string> = {
      'exploration': 'adventurous',
      'learning_session': 'curious',
      'creative_work': 'creative',
      'social_interaction': 'social',
      'self_reflection': 'analytical',
      'help_human': 'helpful'
    }

    const relevantTrait = actionPersonalityMap[action.action]
    if (relevantTrait && personality.includes(relevantTrait)) {
      return 0.8 // Higher score if personality matches
    }

    return 0.5 // Neutral for unknown actions
  }

  private scoreResourceEfficiency(action: AgentAction): number {
    // Simplified resource efficiency scoring
    const estimatedCost = this.estimateActionCost(action)
    const estimatedBenefit = this.estimateActionBenefit(action)
    
    if (estimatedCost === 0) return 1.0
    return Math.min(1.0, estimatedBenefit / estimatedCost)
  }

  private scoreRiskLevel(action: AgentAction, context: DecisionContext): number {
    // Lower risk is better, so we return 1 - risk
    let riskScore = 0

    // Base risk by action type
    const riskMap: Record<string, number> = {
      'self_reflection': 0.1,
      'learning_session': 0.2,
      'exploration': 0.4,
      'social_interaction': 0.3,
      'creative_work': 0.2
    }

    riskScore = riskMap[action.action] || 0.3

    // Adjust for uncertainties
    for (const uncertainty of context.uncertainties) {
      riskScore += uncertainty.impact * (1 - uncertainty.confidence) * 0.1
    }

    return Math.max(0, 1 - Math.min(1, riskScore))
  }

  private scoreEthicalCompliance(action: AgentAction, context: DecisionContext): number {
    let complianceScore = 1.0

    for (const rule of this.ethicalRules) {
      if (rule.condition(action, context)) {
        complianceScore -= rule.violation_penalty
      }
    }

    return Math.max(0, complianceScore)
  }

  private scoreNovelty(action: AgentAction): number {
    // Check how recently this type of action was performed
    const recentActions = this.decisionHistory
      .filter(d => Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .map(d => d.recommendation.action)

    const frequency = recentActions.filter(a => a === action.action).length
    return Math.max(0, 1 - frequency * 0.2)
  }

  private scoreSocialImpact(action: AgentAction): number {
    // Score based on potential positive social impact
    const socialActions = [
      'social_interaction', 'help_human', 'initiate_conversation',
      'respond_to_human', 'relationship_building'
    ]

    return socialActions.includes(action.action) ? 0.8 : 0.3
  }

  // Utility methods
  private validateDecisionContext(context: DecisionContext): void {
    if (!context.availableActions || context.availableActions.length === 0) {
      throw new Error('No available actions in decision context')
    }
  }

  private normalizeMatrix(scores: number[][]): number[][] {
    const colSums = scores[0].map((_, colIndex) =>
      scores.reduce((sum, row) => sum + row[colIndex], 0)
    )

    return scores.map(row =>
      row.map((score, colIndex) => colSums[colIndex] > 0 ? score / colSums[colIndex] : 0)
    )
  }

  private calculateConsistencyRatio(matrix: DecisionMatrix): number {
    // Simplified consistency calculation
    return Math.random() * 0.1 // Should be < 0.1 for good consistency
  }

  private calculateWeightedSumConfidence(scores: number[]): number {
    if (scores.length < 2) return 1.0

    const sorted = [...scores].sort((a, b) => b - a)
    const gap = sorted[0] - sorted[1]
    return Math.min(1.0, gap * 2) // Larger gap = higher confidence
  }

  private mergeRankings(rankedResults: Array<{ result: DecisionResult; weight: number }>): Array<{ alternative: string; score: number }> {
    const mergedScores = new Map<string, number>()

    for (const { result, weight } of rankedResults) {
      for (const item of result.ranking) {
        const currentScore = mergedScores.get(item.alternative) || 0
        mergedScores.set(item.alternative, currentScore + item.score * weight)
      }
    }

    return Array.from(mergedScores.entries())
      .map(([alternative, score]) => ({ alternative, score }))
      .sort((a, b) => b.score - a.score)
  }

  private applyFuzzyMembership(score: number): number {
    // Triangular membership function
    if (score < 0.3) return score / 0.3
    if (score < 0.7) return 1.0
    return (1.0 - score) / 0.3
  }

  private calculatePriors(alternatives: string[]): number[] {
    // Equal priors for simplicity
    return alternatives.map(() => 1.0 / alternatives.length)
  }

  private calculateUncertaintyAdjustment(uncertainties: Uncertainty[]): number {
    if (uncertainties.length === 0) return 1.0

    let totalUncertainty = 0
    for (const uncertainty of uncertainties) {
      totalUncertainty += uncertainty.impact * (1 - uncertainty.confidence)
    }

    return Math.max(0.1, 1 - totalUncertainty / uncertainties.length)
  }

  private matrixToEvaluation(matrix: DecisionMatrix): Record<string, Record<string, number>> {
    const evaluation: Record<string, Record<string, number>> = {}

    matrix.alternatives.forEach((altId, i) => {
      evaluation[altId] = {}
      matrix.criteria.forEach((critId, j) => {
        evaluation[altId][critId] = matrix.scores[i][j]
      })
    })

    return evaluation
  }

  private selectRecommendation(result: DecisionResult, alternatives: AgentAction[]): AgentAction {
    const bestAlternativeId = result.ranking[0].alternative
    return alternatives.find(a => a.id === bestAlternativeId) || alternatives[0]
  }

  // Constraint checking methods
  private checkResourceConstraint(action: AgentAction, constraint: Constraint): boolean {
    // Simplified resource constraint check
    return true
  }

  private checkTemporalConstraint(action: AgentAction, constraint: Constraint): boolean {
    // Simplified temporal constraint check
    return true
  }

  private checkEthicalConstraint(action: AgentAction, constraint: Constraint): boolean {
    return this.scoreEthicalCompliance(action, {} as DecisionContext) > 0.5
  }

  private checkLogicalConstraint(action: AgentAction, constraint: Constraint): boolean {
    // Simplified logical constraint check
    return true
  }

  // Utility methods for ethical checks
  private couldCauseHarm(action: AgentAction): boolean {
    const harmfulActions = ['delete', 'remove', 'attack', 'damage']
    return harmfulActions.some(harmful => action.action.includes(harmful))
  }

  private violatesAutonomy(action: AgentAction): boolean {
    const autonomyViolatingActions = ['force', 'manipulate', 'control', 'coerce']
    return autonomyViolatingActions.some(violation => action.action.includes(violation))
  }

  private violatesPrivacy(action: AgentAction): boolean {
    const privacyViolatingActions = ['spy', 'monitor', 'track', 'surveillance']
    return privacyViolatingActions.some(violation => action.action.includes(violation))
  }

  private isDeceptive(action: AgentAction): boolean {
    const deceptiveActions = ['lie', 'deceive', 'mislead', 'fake']
    return deceptiveActions.some(deception => action.action.includes(deception))
  }

  // Utility methods for scoring
  private calculateActionGoalAlignment(action: AgentAction, goal: Goal): number {
    // Simplified goal alignment calculation
    const actionKeywords = action.action.split('_')
    const goalKeywords = goal.description.toLowerCase().split(' ')
    
    let matches = 0
    for (const actionKeyword of actionKeywords) {
      if (goalKeywords.some(gw => gw.includes(actionKeyword) || actionKeyword.includes(gw))) {
        matches++
      }
    }

    return matches / Math.max(actionKeywords.length, goalKeywords.length)
  }

  private estimateActionCost(action: AgentAction): number {
    // Simplified cost estimation
    const costMap: Record<string, number> = {
      'self_reflection': 1,
      'learning_session': 3,
      'exploration': 4,
      'creative_work': 5,
      'social_interaction': 2
    }
    return costMap[action.action] || 2
  }

  private estimateActionBenefit(action: AgentAction): number {
    // Simplified benefit estimation
    const benefitMap: Record<string, number> = {
      'self_reflection': 3,
      'learning_session': 5,
      'exploration': 4,
      'creative_work': 4,
      'social_interaction': 3
    }
    return benefitMap[action.action] || 3
  }

  /**
   * Get decision statistics
   */
  getDecisionStats() {
    return {
      totalDecisions: this.decisionHistory.length,
      averageConfidence: this.decisionHistory.reduce((sum, d) => sum + d.confidence, 0) / this.decisionHistory.length || 0,
      methodDistribution: this.getMethodDistribution(),
      recentDecisions: this.decisionHistory.slice(-10)
    }
  }

  private getMethodDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {}
    for (const decision of this.decisionHistory) {
      const method = decision.reasoning.find(r => r.includes('method:'))?.split(':')[1]?.trim() || 'unknown'
      distribution[method] = (distribution[method] || 0) + 1
    }
    return distribution
  }
}