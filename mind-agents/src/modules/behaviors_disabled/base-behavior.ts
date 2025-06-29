/**
 * Base Behavior - Foundation for all autonomous behaviors
 */

import { Agent, AgentAction, AgentEvent } from '../../types/agent.js'
import { Logger } from '../../utils/logger.js'

export interface BehaviorConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: number
  cooldown: number // milliseconds
  maxExecutionTime: number // milliseconds
  triggers: BehaviorTrigger[]
  parameters: Record<string, any>
}

export interface BehaviorTrigger {
  type: 'time' | 'event' | 'state' | 'emotion' | 'goal' | 'external'
  condition: string
  parameters: Record<string, any>
  weight: number // 0.0 to 1.0
}

export interface BehaviorContext {
  agent: Agent
  currentTime: Date
  recentEvents: AgentEvent[]
  environmentState: Record<string, any>
  personalityTraits: Record<string, number>
  currentGoals: any[]
  emotionalState: Record<string, number>
}

export interface BehaviorResult {
  success: boolean
  actions: AgentAction[]
  newGoals?: any[]
  stateChanges?: Record<string, any>
  reasoning: string[]
  confidence: number
  nextExecutionTime?: Date
  metadata?: Record<string, any>
}

export abstract class BaseBehavior {
  protected config: BehaviorConfig
  protected logger: Logger
  protected lastExecuted?: Date
  protected executionCount = 0
  protected successCount = 0

  constructor(config: BehaviorConfig) {
    this.config = config
    this.logger = new Logger(`behavior-${config.id}`)
  }

  /**
   * Check if this behavior should be triggered
   */
  async shouldTrigger(context: BehaviorContext): Promise<{ triggered: boolean; confidence: number; reasoning: string }> {
    if (!this.config.enabled) {
      return { triggered: false, confidence: 0, reasoning: 'Behavior disabled' }
    }

    // Check cooldown
    if (this.lastExecuted && 
        context.currentTime.getTime() - this.lastExecuted.getTime() < this.config.cooldown) {
      return { 
        triggered: false, 
        confidence: 0, 
        reasoning: `Cooldown active (${this.config.cooldown}ms)` 
      }
    }

    // Evaluate triggers
    let totalWeight = 0
    let activatedWeight = 0
    const activatedTriggers: string[] = []

    for (const trigger of this.config.triggers) {
      totalWeight += trigger.weight
      
      if (await this.evaluateTrigger(trigger, context)) {
        activatedWeight += trigger.weight
        activatedTriggers.push(`${trigger.type}:${trigger.condition}`)
      }
    }

    const confidence = totalWeight > 0 ? activatedWeight / totalWeight : 0
    const triggered = confidence >= 0.5 // Threshold for triggering

    return {
      triggered,
      confidence,
      reasoning: triggered 
        ? `Triggered by: ${activatedTriggers.join(', ')} (confidence: ${confidence.toFixed(2)})`
        : `Not triggered (confidence: ${confidence.toFixed(2)})`
    }
  }

  /**
   * Execute the behavior
   */
  async execute(context: BehaviorContext): Promise<BehaviorResult> {
    const startTime = Date.now()
    this.logger.info(`Executing behavior: ${this.config.name}`)

    try {
      // Validate context
      this.validateContext(context)

      // Execute behavior-specific logic
      const result = await this.performBehavior(context)

      // Update execution statistics
      this.lastExecuted = context.currentTime
      this.executionCount++
      if (result.success) {
        this.successCount++
      }

      const duration = Date.now() - startTime
      this.logger.info(`Behavior completed: ${this.config.name} (${duration}ms, success: ${result.success})`)

      // Add execution metadata
      result.metadata = {
        ...result.metadata,
        executionTime: duration,
        behaviorId: this.config.id,
        executionCount: this.executionCount,
        successRate: this.successCount / this.executionCount
      }

      return result

    } catch (error) {
      this.logger.error(`Behavior execution failed: ${this.config.name}`, error)
      
      return {
        success: false,
        actions: [],
        reasoning: [`Execution failed: ${error instanceof Error ? error.message : String(error)}`],
        confidence: 0,
        metadata: {
          executionTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }
  }

  /**
   * Get behavior statistics
   */
  getStats() {
    return {
      id: this.config.id,
      name: this.config.name,
      enabled: this.config.enabled,
      executionCount: this.executionCount,
      successCount: this.successCount,
      successRate: this.executionCount > 0 ? this.successCount / this.executionCount : 0,
      lastExecuted: this.lastExecuted,
      priority: this.config.priority,
      cooldown: this.config.cooldown
    }
  }

  /**
   * Update behavior configuration
   */
  updateConfig(updates: Partial<BehaviorConfig>): void {
    this.config = { ...this.config, ...updates }
    this.logger.info(`Configuration updated for behavior: ${this.config.name}`)
  }

  /**
   * Reset behavior state
   */
  reset(): void {
    this.lastExecuted = undefined
    this.executionCount = 0
    this.successCount = 0
    this.logger.info(`Reset behavior: ${this.config.name}`)
  }

  // Protected methods to be implemented by subclasses

  /**
   * Evaluate a specific trigger condition
   */
  protected async evaluateTrigger(trigger: BehaviorTrigger, context: BehaviorContext): Promise<boolean> {
    switch (trigger.type) {
      case 'time':
        return this.evaluateTimeTrigger(trigger, context)
      
      case 'event':
        return this.evaluateEventTrigger(trigger, context)
      
      case 'state':
        return this.evaluateStateTrigger(trigger, context)
      
      case 'emotion':
        return this.evaluateEmotionTrigger(trigger, context)
      
      case 'goal':
        return this.evaluateGoalTrigger(trigger, context)
      
      case 'external':
        return this.evaluateExternalTrigger(trigger, context)
      
      default:
        this.logger.warn(`Unknown trigger type: ${trigger.type}`)
        return false
    }
  }

  /**
   * Validate behavior context
   */
  protected validateContext(context: BehaviorContext): void {
    if (!context.agent) {
      throw new Error('Agent is required in behavior context')
    }
    if (!context.currentTime) {
      throw new Error('Current time is required in behavior context')
    }
  }

  /**
   * Abstract method for behavior-specific execution logic
   */
  protected abstract performBehavior(context: BehaviorContext): Promise<BehaviorResult>

  // Trigger evaluation methods

  protected evaluateTimeTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const now = context.currentTime

    switch (condition) {
      case 'hourly':
        return now.getMinutes() === 0
      
      case 'daily':
        return now.getHours() === (parameters.hour || 0) && now.getMinutes() === 0
      
      case 'time_of_day':
        const hour = now.getHours()
        return hour >= (parameters.startHour || 0) && hour <= (parameters.endHour || 23)
      
      case 'interval':
        if (!this.lastExecuted) return true
        const intervalMs = parameters.intervalMs || 60000
        return now.getTime() - this.lastExecuted.getTime() >= intervalMs
      
      case 'morning':
        return hour >= 6 && hour < 12
      
      case 'afternoon':
        return hour >= 12 && hour < 18
      
      case 'evening':
        return hour >= 18 && hour < 22
      
      case 'night':
        return hour >= 22 || hour < 6
      
      default:
        return false
    }
  }

  protected evaluateEventTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const recentEvents = context.recentEvents || []

    switch (condition) {
      case 'has_event':
        return recentEvents.some(event => event.type === parameters.eventType)
      
      case 'event_count':
        const count = recentEvents.filter(event => event.type === parameters.eventType).length
        return count >= (parameters.minCount || 1)
      
      case 'recent_human_interaction':
        const humanInteractionEvents = recentEvents.filter(event => 
          event.type.includes('human') || event.type.includes('interaction')
        )
        return humanInteractionEvents.length > 0
      
      case 'no_events':
        return recentEvents.length === 0
      
      default:
        return false
    }
  }

  protected evaluateStateTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const agent = context.agent

    switch (condition) {
      case 'idle':
        return agent.status === 'idle'
      
      case 'active':
        return agent.status === 'active' || agent.status === 'thinking'
      
      case 'low_energy':
        return this.getAgentEnergyLevel(agent) < (parameters.threshold || 0.3)
      
      case 'high_curiosity':
        const curiosity = context.personalityTraits?.curiosity || 0
        return curiosity > (parameters.threshold || 0.7)
      
      case 'needs_social_interaction':
        const social = context.personalityTraits?.social || 0
        const lastSocialInteraction = this.getTimeSinceLastSocialInteraction(context)
        return social > 0.5 && lastSocialInteraction > (parameters.timeThreshold || 3600000) // 1 hour
      
      default:
        return false
    }
  }

  protected evaluateEmotionTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const emotionalState = context.emotionalState || {}

    switch (condition) {
      case 'emotion_above':
        const emotion = emotionalState[parameters.emotion]
        return emotion !== undefined && emotion > (parameters.threshold || 0.5)
      
      case 'emotion_below':
        const emotionBelow = emotionalState[parameters.emotion]
        return emotionBelow !== undefined && emotionBelow < (parameters.threshold || 0.5)
      
      case 'positive_emotion':
        const positiveEmotions = ['happy', 'excited', 'confident', 'proud']
        return positiveEmotions.some(emotion => (emotionalState[emotion] || 0) > 0.6)
      
      case 'negative_emotion':
        const negativeEmotions = ['sad', 'angry', 'frustrated', 'anxious']
        return negativeEmotions.some(emotion => (emotionalState[emotion] || 0) > 0.6)
      
      default:
        return false
    }
  }

  protected evaluateGoalTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const goals = context.currentGoals || []

    switch (condition) {
      case 'has_goal':
        return goals.some(goal => goal.type === parameters.goalType)
      
      case 'goal_progress_low':
        return goals.some(goal => goal.progress < (parameters.threshold || 0.3))
      
      case 'no_active_goals':
        return goals.filter(goal => goal.status === 'active').length === 0
      
      case 'goal_deadline_approaching':
        const deadline = parameters.timeThreshold || 24 * 60 * 60 * 1000 // 24 hours
        return goals.some(goal => 
          goal.deadline && 
          goal.deadline.getTime() - context.currentTime.getTime() < deadline
        )
      
      default:
        return false
    }
  }

  protected evaluateExternalTrigger(trigger: BehaviorTrigger, context: BehaviorContext): boolean {
    const { condition, parameters } = trigger
    const env = context.environmentState || {}

    switch (condition) {
      case 'environment_change':
        return env.lastChange && 
               context.currentTime.getTime() - env.lastChange.getTime() < (parameters.timeThreshold || 300000) // 5 minutes
      
      case 'system_load_low':
        return (env.systemLoad || 1.0) < (parameters.threshold || 0.5)
      
      case 'user_active':
        return env.userPresent === true
      
      case 'user_inactive':
        return env.userPresent === false || 
               (env.lastUserActivity && 
                context.currentTime.getTime() - env.lastUserActivity.getTime() > (parameters.timeThreshold || 1800000)) // 30 minutes
      
      default:
        return false
    }
  }

  // Utility methods

  protected getAgentEnergyLevel(agent: Agent): number {
    // Simplified energy calculation based on recent activity
    // In a real implementation, this would be based on actual agent state
    return 0.8 // Placeholder
  }

  protected getTimeSinceLastSocialInteraction(context: BehaviorContext): number {
    const socialEvents = context.recentEvents.filter(event => 
      event.type.includes('social') || 
      event.type.includes('conversation') ||
      event.type.includes('human')
    )
    
    if (socialEvents.length === 0) {
      return Number.MAX_SAFE_INTEGER // No recent social interactions
    }
    
    const lastSocial = socialEvents.reduce((latest, event) => 
      event.timestamp > latest.timestamp ? event : latest
    )
    
    return context.currentTime.getTime() - lastSocial.timestamp.getTime()
  }

  protected createAction(
    actionType: string,
    extension: string = 'autonomous_behavior',
    parameters: Record<string, any> = {}
  ): AgentAction {
    return {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: actionType as any,
      extension,
      action: actionType,
      parameters: {
        ...parameters,
        behaviorId: this.config.id,
        behaviorName: this.config.name
      },
      priority: this.config.priority,
      status: 'pending' as any,
      timestamp: new Date()
    }
  }
}