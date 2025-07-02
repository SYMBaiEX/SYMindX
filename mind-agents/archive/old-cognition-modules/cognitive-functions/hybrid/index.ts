/**
 * Hybrid Cognition Module for SYMindX
 * 
 * This module implements a hybrid cognition system that combines
 * hierarchical task network planning with reactive responses
 */

import { Agent, ThoughtContext, ThoughtResult, Plan, Decision, AgentAction, PlanStepStatus } from '../../../../types/agent.js'
import { BaseCognitionModule } from '../../base-cognition-module.js'
import { CognitionModuleMetadata } from '../../../../types/cognition.js'
import { BaseConfig } from '../../../../types/common.js'
import { HTNPlannerCognition } from '../htn-planner/index.js'
import { ReactiveCognition } from '../reactive/index.js'

/**
 * Configuration for the hybrid cognition module
 */
export interface HybridCognitionConfig extends BaseConfig {
  // Planning parameters
  planningDepth: number
  planningBreadth: number
  planningHorizon: number
  
  // Reactive parameters
  responseSpeed: number
  emotionalInfluence: number
  adaptability: number
  
  // Hybrid parameters
  planningThreshold: number // Threshold to determine when to use planning vs reactive
  contextualWeight: number // How much context influences cognition mode
}

/**
 * Hybrid cognition module implementation
 */
export class HybridCognition extends BaseCognitionModule {
  private htnPlanner: HTNPlannerCognition
  private reactiveCognition: ReactiveCognition
  private planningThreshold: number
  private contextualWeight: number
  
  constructor(config: HybridCognitionConfig) {
    const metadata: CognitionModuleMetadata = {
      id: 'hybrid',
      name: 'Hybrid Cognition',
      description: 'A hybrid cognition system combining planning and reactive approaches',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    
    // Create the component cognition systems
    this.htnPlanner = new HTNPlannerCognition({
      planningDepth: config.planningDepth || 3,
      memoryIntegration: true,
      creativityLevel: 0.5
    })
    
    this.reactiveCognition = new ReactiveCognition({
      responseSpeed: config.responseSpeed || 0.8,
      emotionalInfluence: config.emotionalInfluence || 0.6,
      adaptability: config.adaptability || 0.4
    })
    
    // Hybrid parameters
    this.planningThreshold = config.planningThreshold || 0.5
    this.contextualWeight = config.contextualWeight || 0.7
  }

  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // 1. Analyze the situation to determine which cognitive approach to use
    const { usePlanning, useReactive, situationAnalysis } = this.analyzeSituation(agent, context)
    
    // 2. Generate results from both systems if needed
    let planningResult: ThoughtResult | null = null
    let reactiveResult: ThoughtResult | null = null
    
    if (usePlanning) {
      planningResult = await this.htnPlanner.think(agent, context)
    }
    
    if (useReactive) {
      reactiveResult = await this.reactiveCognition.think(agent, context)
    }
    
    // 3. Integrate the results based on the situation
    const result = this.integrateResults(agent, context, planningResult, reactiveResult, situationAnalysis)
    
    // 4. Enhance thoughts with AI if available
    if (agent.portal || (agent as any).findPortalByCapability) {
      try {
        const { PortalIntegration } = await import('../../../../core/portal-integration.js')
        const aiThoughts = await PortalIntegration.generateThoughts(agent, {
          ...context,
          situationAnalysis,
          cognitionMode: usePlanning ? 'planning' : 'reactive'
        })
        
        // Replace placeholder thoughts with AI-generated ones if available
        if (aiThoughts.length > 0) {
          result.thoughts = aiThoughts
        }
      } catch (error) {
        // Silently continue without AI enhancement
      }
    } else {
      // No portal available, continue with basic thoughts
    }
    
    return result
  }

  /**
   * Create a plan to achieve a goal
   * @param agent The agent that is planning
   * @param goal The goal to plan for
   * @returns A plan to achieve the goal
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // For planning, we primarily use the HTN planner
    // But we might augment it with reactive considerations
    
    // 1. Get the base plan from the HTN planner
    const basePlan = await this.htnPlanner.plan(agent, goal)
    
    // 2. Check if we need to add reactive contingencies
    const needsContingencies = this.evaluateNeedForContingencies(agent, goal, basePlan)
    
    if (!needsContingencies) {
      return basePlan
    }
    
    // 3. Add reactive contingencies to the plan
    return this.addReactiveContingencies(agent, basePlan)
  }

  /**
   * Make a decision between options
   * @param agent The agent that is deciding
   * @param options The options to decide between
   * @returns The selected decision
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    if (options.length === 0) {
      throw new Error('No options provided for decision')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Determine whether to use planning or reactive decision making
    const emotionalState = agent.emotion.current
    const emotionalIntensity = agent.emotion.intensity
    const timeAvailable = this.evaluateTimeAvailable(agent, options)
    
    // Use reactive decision making if emotions are intense or time is limited
    if (emotionalIntensity > this.planningThreshold || timeAvailable < 0.3) {
      return this.reactiveCognition.decide(agent, options)
    }
    
    // Use planning decision making if we have time and emotions are not overwhelming
    if (emotionalIntensity < this.planningThreshold && timeAvailable > 0.7) {
      return this.htnPlanner.decide(agent, options)
    }
    
    // For intermediate cases, blend the decisions
    const reactiveWeight = emotionalIntensity
    const planningWeight = 1 - reactiveWeight
    
    // Get decisions from both systems
    const reactiveDecision = await this.reactiveCognition.decide(agent, options)
    const planningDecision = await this.htnPlanner.decide(agent, options)
    
    // If they agree, return that decision
    if (reactiveDecision.id === planningDecision.id) {
      return reactiveDecision
    }
    
    // Otherwise, blend the confidence scores
    const blendedOptions = options.map(option => {
      let confidence = option.confidence
      
      if (option.id === reactiveDecision.id) {
        confidence += reactiveWeight * 0.3
      }
      
      if (option.id === planningDecision.id) {
        confidence += planningWeight * 0.3
      }
      
      return { ...option, confidence }
    })
    
    // Sort by confidence and return the highest
    blendedOptions.sort((a, b) => b.confidence - a.confidence)
    return blendedOptions[0]
  }

  /**
   * Analyze the situation to determine which cognitive approach to use
   * @param agent The agent
   * @param context The context
   * @returns Analysis results
   */
  private analyzeSituation(agent: Agent, context: ThoughtContext): {
    usePlanning: boolean
    useReactive: boolean
    situationAnalysis: Record<string, any>
  } {
    // Default to using both systems
    let usePlanning = true
    let useReactive = true
    
    const situationAnalysis: Record<string, any> = {
      urgency: 0,
      complexity: 0,
      emotionalIntensity: agent.emotion.intensity || 0,
      novelty: 0,
      riskLevel: 0
    }
    
    // Analyze urgency based on events
    if (context.events.length > 0) {
      const urgentEvents = context.events.filter(e => 
        e.type.includes('danger') || 
        e.type.includes('threat') || 
        e.type.includes('urgent')
      )
      
      situationAnalysis.urgency = urgentEvents.length / context.events.length
    }
    
    // Analyze complexity based on environment
    if (context.environment) {
      const env = context.environment
      const objectCount = (env.objects?.length || 0)
      const npcCount = (env.npcs?.length || 0)
      const interactableCount = objectCount + npcCount
      
      situationAnalysis.complexity = Math.min(interactableCount / 10, 1)
    }
    
    // Analyze novelty based on memories
    if (context.memories && context.memories.length > 0) {
      const recentMemories = context.memories.slice(0, 5)
      const novelEvents = recentMemories.filter(m => 
        m.tags?.includes('new') || 
        m.tags?.includes('unexpected') || 
        m.tags?.includes('surprising')
      )
      
      situationAnalysis.novelty = novelEvents.length / recentMemories.length
    }
    
    // Analyze risk level
    situationAnalysis.riskLevel = (situationAnalysis.urgency + situationAnalysis.complexity) / 2
    
    // Decision logic for cognitive approach
    if (situationAnalysis.urgency > 0.7 || situationAnalysis.emotionalIntensity > 0.8) {
      // High urgency or emotional intensity: favor reactive
      usePlanning = false
    } else if (situationAnalysis.complexity > 0.7 || context.goal?.includes('long-term')) {
      // High complexity or explicit long-term goal: favor planning
      useReactive = false
    }
    
    // If novelty is high, use both approaches
    if (situationAnalysis.novelty > 0.5) {
      usePlanning = true
      useReactive = true
    }
    
    return { usePlanning, useReactive, situationAnalysis }
  }

  /**
   * Integrate results from planning and reactive cognition
   * @param agent The agent
   * @param context The context
   * @param planningResult The planning result
   * @param reactiveResult The reactive result
   * @param situationAnalysis The situation analysis
   * @returns Integrated thought result
   */
  private integrateResults(
    agent: Agent,
    context: ThoughtContext,
    planningResult: ThoughtResult | null,
    reactiveResult: ThoughtResult | null,
    situationAnalysis: Record<string, any>
  ): ThoughtResult {
    // If we only have one result, return it
    if (!planningResult) return reactiveResult!
    if (!reactiveResult) return planningResult!
    
    // Calculate weights for integration
    const reactiveWeight = (
      situationAnalysis.urgency * 0.4 + 
      situationAnalysis.emotionalIntensity * 0.4 + 
      situationAnalysis.novelty * 0.2
    )
    
    const planningWeight = 1 - reactiveWeight
    
    // Integrate thoughts
    const thoughts = [
      ...reactiveResult.thoughts.slice(0, Math.ceil(reactiveResult.thoughts.length * reactiveWeight)),
      ...planningResult.thoughts.slice(0, Math.ceil(planningResult.thoughts.length * planningWeight))
    ]
    
    // For emotions, prioritize reactive results
    const emotions = reactiveResult.emotions
    
    // For actions, use a more sophisticated integration
    const actions = this.integrateActions(planningResult.actions, reactiveResult.actions, situationAnalysis)
    
    // For memories, combine both with appropriate tagging
    const memories = [
      ...reactiveResult.memories.map(m => ({ ...m, tags: [...(m.tags || []), 'reactive'] })),
      ...planningResult.memories.map(m => ({ ...m, tags: [...(m.tags || []), 'planning'] }))
    ]
    
    // Calculate confidence as weighted average
    const confidence = (
      reactiveResult.confidence * reactiveWeight + 
      planningResult.confidence * planningWeight
    )
    
    return {
      thoughts,
      emotions,
      actions,
      memories,
      confidence
    }
  }

  /**
   * Integrate actions from planning and reactive cognition
   * @param planningActions Planning actions
   * @param reactiveActions Reactive actions
   * @param situationAnalysis Situation analysis
   * @returns Integrated actions
   */
  private integrateActions(
    planningActions: AgentAction[],
    reactiveActions: AgentAction[],
    situationAnalysis: Record<string, any>
  ): AgentAction[] {
    // If urgency is high, prioritize reactive actions
    if (situationAnalysis.urgency > 0.8) {
      return reactiveActions
    }
    
    // If complexity is high, prioritize planning actions
    if (situationAnalysis.complexity > 0.8) {
      return planningActions
    }
    
    // Check for conflicting actions
    const conflictingActions = this.findConflictingActions(planningActions, reactiveActions)
    
    if (conflictingActions.length > 0) {
      // Resolve conflicts based on situation
      return this.resolveActionConflicts(
        planningActions,
        reactiveActions,
        conflictingActions,
        situationAnalysis
      )
    }
    
    // No conflicts, combine actions with reactive first (they're usually more urgent)
    return [...reactiveActions, ...planningActions]
  }

  /**
   * Find conflicting actions between planning and reactive
   * @param planningActions Planning actions
   * @param reactiveActions Reactive actions
   * @returns Array of conflicting action pairs
   */
  private findConflictingActions(
    planningActions: AgentAction[],
    reactiveActions: AgentAction[]
  ): Array<{ planning: AgentAction, reactive: AgentAction }> {
    const conflicts: Array<{ planning: AgentAction, reactive: AgentAction }> = []
    
    // Simple conflict detection based on action type and target
    for (const planAction of planningActions) {
      for (const reactAction of reactiveActions) {
        // Check for same target but different action types
        if (
          planAction.parameters?.target === reactAction.parameters?.target &&
          planAction.type !== reactAction.type
        ) {
          conflicts.push({ planning: planAction, reactive: reactAction })
        }
        
        // Check for mutually exclusive action types
        const exclusivePairs = [
          ['approach', 'flee'],
          ['attack', 'befriend'],
          ['hide', 'reveal'],
          ['acquire', 'discard']
        ]
        
        for (const [a, b] of exclusivePairs) {
          if (
            (planAction.type.includes(a) && reactAction.type.includes(b)) ||
            (planAction.type.includes(b) && reactAction.type.includes(a))
          ) {
            conflicts.push({ planning: planAction, reactive: reactAction })
          }
        }
      }
    }
    
    return conflicts
  }

  /**
   * Resolve conflicts between planning and reactive actions
   * @param planningActions Planning actions
   * @param reactiveActions Reactive actions
   * @param conflicts Identified conflicts
   * @param situationAnalysis Situation analysis
   * @returns Resolved action list
   */
  private resolveActionConflicts(
    planningActions: AgentAction[],
    reactiveActions: AgentAction[],
    conflicts: Array<{ planning: AgentAction, reactive: AgentAction }>,
    situationAnalysis: Record<string, any>
  ): AgentAction[] {
    // Start with non-conflicting actions
    const resolvedActions: AgentAction[] = []
    
    // Add non-conflicting reactive actions
    for (const action of reactiveActions) {
      if (!conflicts.some(c => c.reactive.id === action.id)) {
        resolvedActions.push(action)
      }
    }
    
    // Add non-conflicting planning actions
    for (const action of planningActions) {
      if (!conflicts.some(c => c.planning.id === action.id)) {
        resolvedActions.push(action)
      }
    }
    
    // Resolve each conflict
    for (const conflict of conflicts) {
      // Determine which action to keep based on situation
      if (
        situationAnalysis.urgency > 0.6 || 
        situationAnalysis.emotionalIntensity > 0.7
      ) {
        // In urgent or emotional situations, prefer reactive
        resolvedActions.push(conflict.reactive)
      } else if (situationAnalysis.complexity > 0.6) {
        // In complex situations, prefer planning
        resolvedActions.push(conflict.planning)
      } else {
        // In balanced situations, choose based on confidence
        const planConfidence = conflict.planning.parameters?.confidence || 0.5
        const reactConfidence = conflict.reactive.parameters?.confidence || 0.5
        
        resolvedActions.push(planConfidence > reactConfidence ? 
          conflict.planning : conflict.reactive)
      }
    }
    
    return resolvedActions
  }

  /**
   * Evaluate if contingencies are needed for a plan
   * @param agent The agent
   * @param goal The goal
   * @param plan The current plan
   * @returns Whether contingencies are needed
   */
  private evaluateNeedForContingencies(agent: Agent, goal: string, plan: Plan): boolean {
    // Check if the plan already has contingencies
    const hasContingencies = plan.steps.some(step => step.description.includes('contingency'))
    if (hasContingencies) return false
    
    // Check if the goal is risky or uncertain
    const riskyGoal = goal.includes('risky') || 
                      goal.includes('uncertain') || 
                      goal.includes('dangerous')
    
    // Check agent's emotional state
    const isAnxious = agent.emotion.current === 'anxious' || 
                     agent.emotion.current === 'worried' || 
                     agent.emotion.current === 'fearful'
    
    // Check agent's personality traits
    const isCautious = agent.config.psyche.traits.includes('cautious') || 
                      agent.config.psyche.traits.includes('careful')
    
    return riskyGoal || isAnxious || isCautious
  }

  /**
   * Add reactive contingencies to a plan
   * @param agent The agent
   * @param plan The current plan
   * @returns Updated plan with contingencies
   */
  private addReactiveContingencies(agent: Agent, plan: Plan): Plan {
    // Clone the plan to avoid modifying the original
    const enhancedPlan: Plan = { ...plan, steps: [...plan.steps] }
    
    // Identify risky steps that need contingencies
    const riskyStepIndices = plan.steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => 
        step.description.includes('risky') || 
        step.description.includes('uncertain') || 
        step.action.includes('approach') || 
        step.action.includes('interact')
      )
      .map(({ index }) => index)
    
    // Add contingency steps after risky steps
    for (const index of riskyStepIndices) {
      const riskyStep = plan.steps[index]
      
      // Create a contingency step
      const contingencyStep = {
        id: this.generateId(),
        description: `Contingency for "${riskyStep.description}"`,
        action: 'contingency',
        parameters: { 
          originalStepId: riskyStep.id,
          fallbackAction: this.determineFallbackAction(riskyStep.action)
        },
        preconditions: [`${riskyStep.id}_failed`],
        effects: ['safety_maintained'],
        status: PlanStepStatus.PENDING
      }
      
      // Insert after the risky step
      enhancedPlan.steps.splice(index + 1, 0, contingencyStep)
    }
    
    return enhancedPlan
  }

  /**
   * Determine a fallback action for a given action
   * @param action The original action
   * @returns Appropriate fallback action
   */
  private determineFallbackAction(action: string): string {
    // Map actions to appropriate fallbacks
    const fallbackMap: Record<string, string> = {
      'approach': 'retreat',
      'attack': 'defend',
      'interact': 'observe',
      'acquire': 'abandon',
      'investigate': 'withdraw',
      'communicate': 'listen'
    }
    
    // Find a matching fallback
    for (const [actionType, fallback] of Object.entries(fallbackMap)) {
      if (action.includes(actionType)) {
        return fallback
      }
    }
    
    // Default fallback
    return 'observe'
  }

  /**
   * Evaluate the time available for decision making
   * @param agent The agent
   * @param options The decision options
   * @returns Normalized time availability (0.0 to 1.0)
   */
  private evaluateTimeAvailable(agent: Agent, options: Decision[]): number {
    // Check if any option is marked as urgent
    const hasUrgentOption = options.some(option => 
      option.action.parameters?.urgent === true || 
      option.description?.includes('urgent') ||
      option.description?.includes('immediate')
    )
    
    if (hasUrgentOption) {
      return 0.1 // Very little time
    }
    
    // Check agent's current emotional state for time pressure
    const isUnderTimePressure = agent.emotion.current === 'stressed'
    
    if (isUnderTimePressure) {
      return 0.3 // Limited time
    }
    
    // Default to moderate time available
    return 0.7
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  protected generateId(): string {
    return `hybrid_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  }
}

// Factory function to create a hybrid cognition module
export function createHybridCognition(config: HybridCognitionConfig): HybridCognition {
  return new HybridCognition(config)
}