/**
 * Meta-Reasoner for SYMindX Cognition
 * 
 * Intelligently selects the most appropriate reasoning paradigm
 * based on context, performance history, and problem characteristics.
 */

import { 
  Agent, 
  ThoughtContext, 
  ThoughtResult, 
  Plan, 
  Decision,
  AgentAction,
  ActionCategory,
  ActionStatus,
  MemoryRecord
} from '../../types/agent.js'
import { 
  CognitionModule,
  CognitionModuleMetadata,
  ReasoningParadigm,
  ReasoningPerformance,
  HybridReasoningConfig
} from '../../types/cognition.js'
import { Experience } from '../../types/autonomous.js'
import { BaseConfig } from '../../types/common.js'
import { MemoryType, MemoryDuration } from '../../types/enums.js'
import { runtimeLogger } from '../../utils/logger.js'

// Import reasoning modules
import { RuleBasedReasoning } from './rule-based-reasoning.js'
import { PDDLPlanner } from './pddl-planner.js'
import { ProbabilisticReasoning } from './probabilistic-reasoning.js'
import { ReinforcementLearningCognition } from './reinforcement-learning.js'

/**
 * Context analysis for paradigm selection
 */
interface ContextAnalysis {
  complexity: number       // 0-1: problem complexity
  uncertainty: number      // 0-1: level of uncertainty
  timeConstraint: number   // 0-1: urgency (1 = immediate)
  knowledgeAvailable: number // 0-1: available domain knowledge
  adaptationNeeded: number // 0-1: need for learning/adaptation
  goalOriented: number     // 0-1: how goal-oriented the task is
  probabilisticNature: number // 0-1: uncertainty/probabilistic elements
  rulesApplicable: number  // 0-1: how well rules can handle this
}

/**
 * Paradigm performance tracking
 */
interface ParadigmPerformance {
  paradigm: ReasoningParadigm
  successRate: number
  averageTime: number
  averageConfidence: number
  adaptability: number
  recentPerformances: ReasoningPerformance[]
  usageCount: number
  lastUsed: Date
}

/**
 * Meta-reasoning decision
 */
interface MetaDecision {
  selectedParadigm: ReasoningParadigm
  confidence: number
  reasoning: string[]
  fallbackParadigms: ReasoningParadigm[]
  contextAnalysis: ContextAnalysis
}

/**
 * Meta-Reasoner implementation
 */
export class MetaReasoner implements CognitionModule {
  public id: string
  public type: string = 'meta_reasoner'
  private config: HybridReasoningConfig
  private reasoners: Map<ReasoningParadigm, CognitionModule> = new Map()
  private performanceHistory: Map<ReasoningParadigm, ParadigmPerformance> = new Map()
  private decisionHistory: MetaDecision[] = []
  private contextPatterns: Map<string, ReasoningParadigm> = new Map()
  
  constructor(config: HybridReasoningConfig) {
    this.id = `meta_reasoner_${Date.now()}`
    this.config = config
    
    // Initialize reasoning modules
    this.initializeReasoners()
    
    // Initialize performance tracking
    this.initializePerformanceTracking()
  }
  
  /**
   * Initialize all reasoning modules
   */
  private initializeReasoners(): void {
    // Rule-based reasoning
    this.reasoners.set(ReasoningParadigm.RULE_BASED, new RuleBasedReasoning(this.config))
    
    // PDDL planning
    this.reasoners.set(ReasoningParadigm.PDDL_PLANNING, new PDDLPlanner(this.config))
    
    // Probabilistic reasoning
    this.reasoners.set(ReasoningParadigm.PROBABILISTIC, new ProbabilisticReasoning(this.config))
    
    // Reinforcement learning
    this.reasoners.set(ReasoningParadigm.REINFORCEMENT_LEARNING, new ReinforcementLearningCognition(this.config))
    
    runtimeLogger.cognition(`Meta-reasoner initialized with ${this.reasoners.size} reasoning paradigms`)
  }
  
  /**
   * Initialize performance tracking for each paradigm
   */
  private initializePerformanceTracking(): void {
    for (const paradigm of this.reasoners.keys()) {
      this.performanceHistory.set(paradigm, {
        paradigm,
        successRate: 0.5, // Start neutral
        averageTime: 1000,
        averageConfidence: 0.5,
        adaptability: 0.5,
        recentPerformances: [],
        usageCount: 0,
        lastUsed: new Date(0)
      })
    }
  }
  
  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    this.config = { ...this.config, ...config }
    
    // Initialize all sub-reasoners
    for (const reasoner of this.reasoners.values()) {
      reasoner.initialize(config)
    }
  }
  
  /**
   * Get module metadata
   */
  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Meta-Reasoner',
      version: '1.0.0',
      description: 'Intelligent selection and coordination of reasoning paradigms',
      author: 'SYMindX',
      paradigms: Array.from(this.reasoners.keys()),
      learningCapable: true
    }
  }
  
  /**
   * Main thinking method using meta-reasoning
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const startTime = Date.now()
    const thoughts: string[] = ['[Meta-Reasoner] Analyzing context for paradigm selection']
    
    // Analyze context
    const contextAnalysis = this.analyzeContext(agent, context)
    thoughts.push(`Context analysis: complexity=${contextAnalysis.complexity.toFixed(2)}, uncertainty=${contextAnalysis.uncertainty.toFixed(2)}`)
    
    // Select reasoning paradigm
    const metaDecision = this.selectReasoner(contextAnalysis, context)
    thoughts.push(`Selected paradigm: ${metaDecision.selectedParadigm} (confidence: ${metaDecision.confidence.toFixed(2)})`)
    thoughts.push(`Reasoning: ${metaDecision.reasoning.join(', ')}`)
    
    // Execute selected reasoning
    const selectedReasoner = this.reasoners.get(metaDecision.selectedParadigm)!
    const reasoningResult = await selectedReasoner.think(agent, context)
    
    // Merge thoughts
    const mergedThoughts = [
      ...thoughts,
      `[${metaDecision.selectedParadigm}] ${reasoningResult.thoughts.join(', ')}`
    ]
    
    // Update performance tracking
    const reasoningTime = Date.now() - startTime
    await this.updatePerformance(metaDecision.selectedParadigm, reasoningResult, reasoningTime)
    
    // Record decision
    this.decisionHistory.push(metaDecision)
    if (this.decisionHistory.length > 100) {
      this.decisionHistory.shift()
    }
    
    // Create meta-reasoning memory
    const metaMemory = this.createMetaMemory(agent, metaDecision, reasoningResult)
    
    return {
      thoughts: mergedThoughts,
      actions: reasoningResult.actions,
      emotions: reasoningResult.emotions,
      memories: [...reasoningResult.memories, metaMemory],
      confidence: reasoningResult.confidence * metaDecision.confidence
    }
  }
  
  /**
   * Plan using meta-reasoning approach
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Analyze planning context
    const planningContext = this.createPlanningContext(goal)
    const contextAnalysis = this.analyzeContext(agent, planningContext)
    
    // Select best planner
    const metaDecision = this.selectReasoner(contextAnalysis, planningContext)
    
    // Execute planning with selected reasoner
    const selectedReasoner = this.reasoners.get(metaDecision.selectedParadigm)!
    const plan = await selectedReasoner.plan(agent, goal)
    
    // Enhance plan with meta-information
    plan.id = `meta_plan_${Date.now()}`
    // Note: Can't modify priority due to readonly, but we track internally
    
    return plan
  }
  
  /**
   * Decide using meta-reasoning
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options to decide between')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Create decision context
    const decisionContext = this.createDecisionContext(options)
    const contextAnalysis = this.analyzeContext(agent, decisionContext)
    
    // Select decision reasoner
    const metaDecision = this.selectReasoner(contextAnalysis, decisionContext)
    
    // Execute decision with selected reasoner
    const selectedReasoner = this.reasoners.get(metaDecision.selectedParadigm)!
    return await selectedReasoner.decide(agent, options)
  }
  
  /**
   * Learn from experience across all paradigms
   */
  async learn(agent: Agent, experience: Experience): Promise<void> {
    // Learn from the experience with all learning-capable reasoners
    for (const [paradigm, reasoner] of this.reasoners) {
      if (reasoner.learn) {
        await reasoner.learn(agent, experience)
      }
    }
    
    // Update meta-learning about paradigm effectiveness
    await this.metaLearn(experience)
    
    runtimeLogger.cognition('Meta-reasoner learned from experience across all paradigms')
  }
  
  /**
   * Analyze context to determine reasoning requirements
   */
  private analyzeContext(agent: Agent, context: ThoughtContext): ContextAnalysis {
    // Complexity analysis
    const complexity = this.assessComplexity(context)
    
    // Uncertainty analysis
    const uncertainty = this.assessUncertainty(context)
    
    // Time constraint analysis
    const timeConstraint = this.assessTimeConstraints(context)
    
    // Knowledge availability
    const knowledgeAvailable = this.assessKnowledgeAvailability(agent, context)
    
    // Adaptation needs
    const adaptationNeeded = this.assessAdaptationNeeds(context)
    
    // Goal orientation
    const goalOriented = context.goal ? 0.8 : 0.2
    
    // Probabilistic nature
    const probabilisticNature = this.assessProbabilisticNature(context)
    
    // Rules applicability
    const rulesApplicable = this.assessRulesApplicability(context)
    
    return {
      complexity,
      uncertainty,
      timeConstraint,
      knowledgeAvailable,
      adaptationNeeded,
      goalOriented,
      probabilisticNature,
      rulesApplicable
    }
  }
  
  /**
   * Select the best reasoning paradigm
   */
  private selectReasoner(analysis: ContextAnalysis, context: ThoughtContext): MetaDecision {
    const scores = new Map<ReasoningParadigm, number>()
    const reasoning: string[] = []
    
    // Rule-based reasoning scoring
    let ruleBasedScore = analysis.rulesApplicable * 0.4 + 
                        (1 - analysis.uncertainty) * 0.3 + 
                        analysis.knowledgeAvailable * 0.3
    if (analysis.timeConstraint > 0.7) ruleBasedScore *= 1.2 // Good for quick decisions
    scores.set(ReasoningParadigm.RULE_BASED, ruleBasedScore)
    
    // PDDL planning scoring
    let pddlScore = analysis.goalOriented * 0.5 + 
                   analysis.complexity * 0.3 + 
                   (1 - analysis.timeConstraint) * 0.2
    if (analysis.goalOriented > 0.7) pddlScore *= 1.3 // Excellent for goal-oriented tasks
    scores.set(ReasoningParadigm.PDDL_PLANNING, pddlScore)
    
    // Probabilistic reasoning scoring
    let probabilisticScore = analysis.probabilisticNature * 0.4 + 
                           analysis.uncertainty * 0.4 + 
                           analysis.knowledgeAvailable * 0.2
    if (analysis.uncertainty > 0.6) probabilisticScore *= 1.2 // Good for uncertain situations
    scores.set(ReasoningParadigm.PROBABILISTIC, probabilisticScore)
    
    // Reinforcement learning scoring
    let rlScore = analysis.adaptationNeeded * 0.4 + 
                 (1 - analysis.knowledgeAvailable) * 0.3 + 
                 analysis.complexity * 0.3
    if (analysis.adaptationNeeded > 0.7) rlScore *= 1.3 // Excellent for learning situations
    scores.set(ReasoningParadigm.REINFORCEMENT_LEARNING, rlScore)
    
    // Adjust scores based on historical performance
    for (const [paradigm, score] of scores) {
      const performance = this.performanceHistory.get(paradigm)!
      const performanceMultiplier = 0.5 + (performance.successRate * 0.5)
      scores.set(paradigm, score * performanceMultiplier)
    }
    
    // Select best paradigm
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
    const selectedParadigm = sortedScores[0][0]
    const confidence = sortedScores[0][1]
    
    // Generate reasoning
    reasoning.push(`${selectedParadigm} scored highest (${confidence.toFixed(3)})`)
    if (analysis.goalOriented > 0.7) reasoning.push('goal-oriented task')
    if (analysis.uncertainty > 0.6) reasoning.push('high uncertainty')
    if (analysis.complexity > 0.7) reasoning.push('complex problem')
    if (analysis.adaptationNeeded > 0.6) reasoning.push('adaptation needed')
    
    // Determine fallback paradigms
    const fallbackParadigms = sortedScores.slice(1, 3).map(([paradigm]) => paradigm)
    
    return {
      selectedParadigm,
      confidence: Math.min(1.0, confidence),
      reasoning,
      fallbackParadigms,
      contextAnalysis: analysis
    }
  }
  
  /**
   * Assess problem complexity
   */
  private assessComplexity(context: ThoughtContext): number {
    let complexity = 0
    
    // Event count contributes to complexity
    complexity += Math.min(1, context.events.length / 10)
    
    // Goal complexity
    if (context.goal) {
      const goalWords = context.goal.split(/\s+/).length
      complexity += Math.min(0.5, goalWords / 20)
    }
    
    // Multiple event types
    const eventTypes = new Set(context.events.map(e => e.type)).size
    complexity += Math.min(0.3, eventTypes / 10)
    
    return Math.min(1, complexity)
  }
  
  /**
   * Assess uncertainty level
   */
  private assessUncertainty(context: ThoughtContext): number {
    let uncertainty = 0.3 // Base uncertainty
    
    // Lack of clear patterns increases uncertainty
    const messageEvents = context.events.filter(e => e.data?.message)
    if (messageEvents.length === 0) uncertainty += 0.2
    
    // Conflicting events increase uncertainty
    const eventTypes = context.events.map(e => e.type)
    if (new Set(eventTypes).size === eventTypes.length) uncertainty += 0.2
    
    // Missing context increases uncertainty
    if (!context.goal && context.events.length === 0) uncertainty += 0.3
    
    return Math.min(1, uncertainty)
  }
  
  /**
   * Assess time constraints
   */
  private assessTimeConstraints(context: ThoughtContext): number {
    // Check for urgency indicators
    const urgentWords = ['urgent', 'immediate', 'now', 'quickly', 'asap']
    const hasUrgentMessage = context.events.some(e => {
      const message = e.data?.message
      return typeof message === 'string' && 
             urgentWords.some(word => message.toLowerCase().includes(word))
    })
    
    if (hasUrgentMessage) return 0.9
    
    // Recent events suggest urgency
    const recentEvents = context.events.filter(e => 
      Date.now() - e.timestamp.getTime() < 60000
    )
    
    return Math.min(0.8, recentEvents.length / 5)
  }
  
  /**
   * Assess knowledge availability
   */
  private assessKnowledgeAvailability(agent: Agent, context: ThoughtContext): number {
    let knowledge = 0.5 // Base knowledge
    
    // Memory availability
    if (context.memories && context.memories.length > 0) {
      knowledge += Math.min(0.3, context.memories.length / 10)
    }
    
    // Domain-specific knowledge (simplified check)
    const hasRelevantMemory = context.memories?.some(m => 
      context.events.some(e => 
        m.content.toLowerCase().includes(e.type.toLowerCase())
      )
    )
    
    if (hasRelevantMemory) knowledge += 0.2
    
    return Math.min(1, knowledge)
  }
  
  /**
   * Assess adaptation needs
   */
  private assessAdaptationNeeds(context: ThoughtContext): number {
    // New or unusual event types suggest adaptation needs
    const eventTypes = new Set(context.events.map(e => e.type))
    const novelty = eventTypes.size / Math.max(1, context.events.length)
    
    // Pattern changes suggest adaptation needs
    const hasNewPatterns = context.events.some(e => 
      e.type.includes('new') || e.type.includes('unknown')
    )
    
    return novelty + (hasNewPatterns ? 0.3 : 0)
  }
  
  /**
   * Assess probabilistic nature
   */
  private assessProbabilisticNature(context: ThoughtContext): number {
    // Uncertainty indicators
    const uncertaintyWords = ['maybe', 'possibly', 'might', 'could', 'uncertain']
    const hasUncertainty = context.events.some(e => {
      const message = e.data?.message
      return typeof message === 'string' && 
             uncertaintyWords.some(word => message.toLowerCase().includes(word))
    })
    
    return hasUncertainty ? 0.8 : 0.3
  }
  
  /**
   * Assess rules applicability
   */
  private assessRulesApplicability(context: ThoughtContext): number {
    // Clear patterns and structure suggest rule applicability
    const hasQuestions = context.events.some(e => 
      typeof e.data?.message === 'string' && e.data.message.includes('?')
    )
    
    const hasCommands = context.events.some(e => 
      e.type.includes('command') || e.type.includes('action')
    )
    
    let applicability = 0.3
    if (hasQuestions) applicability += 0.3
    if (hasCommands) applicability += 0.4
    
    return Math.min(1, applicability)
  }
  
  /**
   * Update performance tracking for a paradigm
   */
  private async updatePerformance(
    paradigm: ReasoningParadigm, 
    result: ThoughtResult, 
    reasoningTime: number
  ): Promise<void> {
    const performance = this.performanceHistory.get(paradigm)!
    
    // Create new performance record
    const newPerformance: ReasoningPerformance = {
      accuracy: result.confidence,
      efficiency: Math.max(0, 1 - (reasoningTime / 10000)), // 10 seconds = 0 efficiency
      confidence: result.confidence,
      adaptability: 0.5, // Placeholder
      reasoningTime,
      memoryUsage: result.memories.length,
      timestamp: new Date()
    }
    
    // Update performance history
    performance.recentPerformances.push(newPerformance)
    if (performance.recentPerformances.length > 20) {
      performance.recentPerformances.shift()
    }
    
    // Update aggregated metrics
    const recent = performance.recentPerformances
    performance.successRate = recent.reduce((sum, p) => sum + p.accuracy, 0) / recent.length
    performance.averageTime = recent.reduce((sum, p) => sum + p.reasoningTime, 0) / recent.length
    performance.averageConfidence = recent.reduce((sum, p) => sum + p.confidence, 0) / recent.length
    
    performance.usageCount++
    performance.lastUsed = new Date()
  }
  
  /**
   * Meta-learn about paradigm effectiveness
   */
  private async metaLearn(experience: Experience): Promise<void> {
    // Learn patterns about when certain paradigms work well
    const contextKey = this.generateContextKey(experience)
    
    // Update context patterns (simplified)
    if (experience.reward.value > 0.5) {
      // Positive experience - reinforce pattern
      const recentDecision = this.decisionHistory[this.decisionHistory.length - 1]
      if (recentDecision) {
        this.contextPatterns.set(contextKey, recentDecision.selectedParadigm)
      }
    }
  }
  
  /**
   * Generate context key for pattern learning
   */
  private generateContextKey(experience: Experience): string {
    const features = experience.state.features
    const discretized = Object.entries(features)
      .map(([key, value]) => `${key}:${Math.round(value * 10)}`)
      .join('|')
    
    return discretized.substring(0, 100) // Limit length
  }
  
  /**
   * Create meta-reasoning memory
   */
  private createMetaMemory(
    agent: Agent, 
    decision: MetaDecision, 
    result: ThoughtResult
  ): MemoryRecord {
    const content = `Meta-reasoning: Selected ${decision.selectedParadigm} with ${decision.confidence.toFixed(2)} confidence`
    
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.REASONING,
      content,
      metadata: {
        reasoning_type: 'meta_reasoning',
        selected_paradigm: decision.selectedParadigm,
        selection_confidence: decision.confidence,
        context_analysis: decision.contextAnalysis,
        reasoning: decision.reasoning,
        result_confidence: result.confidence,
        timestamp: new Date()
      },
      importance: 0.8,
      timestamp: new Date(),
      tags: ['reasoning', 'meta_reasoning', 'paradigm_selection'],
      duration: MemoryDuration.LONG_TERM
    }
  }
  
  /**
   * Create planning context
   */
  private createPlanningContext(goal: string): ThoughtContext {
    return {
      goal,
      events: [{
        id: 'planning_request',
        type: 'planning_request',
        source: 'meta_reasoner',
        timestamp: new Date(),
        data: { goal }
      }],
      memories: []
    }
  }
  
  /**
   * Create decision context
   */
  private createDecisionContext(options: Decision[]): ThoughtContext {
    return {
      events: [{
        id: 'decision_request',
        type: 'decision_request',
        source: 'meta_reasoner',
        timestamp: new Date(),
        data: { options: options.length }
      }],
      memories: []
    }
  }
  
  /**
   * Get meta-reasoning statistics
   */
  getStats(): {
    paradigmUsage: Record<string, number>
    paradigmPerformance: Record<string, number>
    averageSelectionConfidence: number
    totalDecisions: number
  } {
    const paradigmUsage: Record<string, number> = {}
    const paradigmPerformance: Record<string, number> = {}
    
    for (const [paradigm, performance] of this.performanceHistory) {
      paradigmUsage[paradigm] = performance.usageCount
      paradigmPerformance[paradigm] = performance.successRate
    }
    
    const recentDecisions = this.decisionHistory.slice(-50)
    const averageSelectionConfidence = recentDecisions.length > 0
      ? recentDecisions.reduce((sum, d) => sum + d.confidence, 0) / recentDecisions.length
      : 0
    
    return {
      paradigmUsage,
      paradigmPerformance,
      averageSelectionConfidence,
      totalDecisions: this.decisionHistory.length
    }
  }
}

/**
 * Factory function for creating meta-reasoner
 */
export function createMetaReasoner(config: HybridReasoningConfig): MetaReasoner {
  return new MetaReasoner(config)
}