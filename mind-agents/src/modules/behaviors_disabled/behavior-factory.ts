/**
 * Behavior Factory - Creates and manages autonomous behavior systems
 */

import { BaseBehavior } from './base-behavior.js'
import { DailyRoutineBehavior, createDailyRoutineBehavior } from './daily-routine-behavior.js'
import { CuriosityBehavior, createCuriosityBehavior } from './curiosity-behavior.js'
import { SocialBehavior, createSocialBehavior } from './social-behavior.js'
import { CreativeBehavior, createCreativeBehavior } from './creative-behavior.js'
import { LearningBehavior, createLearningBehavior } from './learning-behavior.js'
import { ReflectionBehavior, createReflectionBehavior } from './reflection-behavior.js'
import { GoalOrientedBehavior, createGoalOrientedBehavior } from './goal-oriented-behavior.js'
import { Logger } from '../../utils/logger.js'

export interface BehaviorSystemConfig {
  enabledBehaviors: string[]
  globalPriority: number
  behaviorCooldownMultiplier: number
  maxConcurrentBehaviors: number
  adaptiveScheduling: boolean
  personalityWeight: number
}

export class BehaviorSystem {
  private behaviors: Map<string, BaseBehavior> = new Map()
  private config: BehaviorSystemConfig
  private logger: Logger
  private activeBehaviors: Set<string> = new Set()

  constructor(config: BehaviorSystemConfig, agentConfig: any) {
    this.config = config
    this.logger = new Logger('behavior-system')
    this.initializeBehaviors(agentConfig)
  }

  private initializeBehaviors(agentConfig: any): void {
    // Create behaviors based on agent configuration and enabled behaviors
    if (this.config.enabledBehaviors.includes('daily_routine')) {
      const dailyRoutine = createDailyRoutineBehavior(agentConfig)
      this.behaviors.set('daily_routine', dailyRoutine)
    }

    if (this.config.enabledBehaviors.includes('curiosity_exploration')) {
      const curiosity = createCuriosityBehavior(agentConfig)
      this.behaviors.set('curiosity_exploration', curiosity)
    }

    if (this.config.enabledBehaviors.includes('social_interaction')) {
      const social = createSocialBehavior(agentConfig)
      this.behaviors.set('social_interaction', social)
    }

    if (this.config.enabledBehaviors.includes('creative_expression')) {
      const creative = createCreativeBehavior(agentConfig)
      this.behaviors.set('creative_expression', creative)
    }

    if (this.config.enabledBehaviors.includes('continuous_learning')) {
      const learning = createLearningBehavior(agentConfig)
      this.behaviors.set('continuous_learning', learning)
    }

    if (this.config.enabledBehaviors.includes('self_reflection')) {
      const reflection = createReflectionBehavior(agentConfig)
      this.behaviors.set('self_reflection', reflection)
    }

    if (this.config.enabledBehaviors.includes('goal_oriented')) {
      const goalOriented = createGoalOrientedBehavior(agentConfig)
      this.behaviors.set('goal_oriented', goalOriented)
    }

    this.logger.info(`Initialized ${this.behaviors.size} behaviors: ${Array.from(this.behaviors.keys()).join(', ')}`)
  }

  /**
   * Get all available behaviors
   */
  getBehaviors(): Map<string, BaseBehavior> {
    return this.behaviors
  }

  /**
   * Get a specific behavior by ID
   */
  getBehavior(behaviorId: string): BaseBehavior | undefined {
    return this.behaviors.get(behaviorId)
  }

  /**
   * Add a behavior to the system
   */
  addBehavior(behaviorId: string, behavior: BaseBehavior): void {
    this.behaviors.set(behaviorId, behavior)
    this.logger.info(`Added behavior: ${behaviorId}`)
  }

  /**
   * Remove a behavior from the system
   */
  removeBehavior(behaviorId: string): boolean {
    const removed = this.behaviors.delete(behaviorId)
    if (removed) {
      this.activeBehaviors.delete(behaviorId)
      this.logger.info(`Removed behavior: ${behaviorId}`)
    }
    return removed
  }

  /**
   * Enable a behavior
   */
  enableBehavior(behaviorId: string): boolean {
    const behavior = this.behaviors.get(behaviorId)
    if (behavior) {
      behavior.updateConfig({ enabled: true })
      this.logger.info(`Enabled behavior: ${behaviorId}`)
      return true
    }
    return false
  }

  /**
   * Disable a behavior
   */
  disableBehavior(behaviorId: string): boolean {
    const behavior = this.behaviors.get(behaviorId)
    if (behavior) {
      behavior.updateConfig({ enabled: false })
      this.activeBehaviors.delete(behaviorId)
      this.logger.info(`Disabled behavior: ${behaviorId}`)
      return true
    }
    return false
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    const behaviorStats = Array.from(this.behaviors.entries()).map(([id, behavior]) => ({
      id,
      ...behavior.getStats()
    }))

    return {
      totalBehaviors: this.behaviors.size,
      activeBehaviors: this.activeBehaviors.size,
      enabledBehaviors: behaviorStats.filter(b => b.enabled).length,
      behaviorStats,
      systemConfig: this.config
    }
  }

  /**
   * Reset all behaviors
   */
  resetAllBehaviors(): void {
    for (const behavior of this.behaviors.values()) {
      behavior.reset()
    }
    this.activeBehaviors.clear()
    this.logger.info('Reset all behaviors')
  }

  /**
   * Update system configuration
   */
  updateConfig(updates: Partial<BehaviorSystemConfig>): void {
    this.config = { ...this.config, ...updates }
    this.logger.info('Updated behavior system configuration')
  }
}

/**
 * Create a behavior system with default configuration
 */
export function createBehaviorSystem(agentConfig: any): BehaviorSystem {
  const autonomousBehaviors = agentConfig.autonomous_behaviors || {}
  
  const config: BehaviorSystemConfig = {
    enabledBehaviors: [
      'daily_routine',
      'curiosity_exploration',
      'social_interaction',
      'creative_expression',
      'continuous_learning',
      'self_reflection',
      'goal_oriented'
    ],
    globalPriority: 0.7,
    behaviorCooldownMultiplier: 1.0,
    maxConcurrentBehaviors: 3,
    adaptiveScheduling: true,
    personalityWeight: 0.8
  }

  // Filter enabled behaviors based on agent configuration
  config.enabledBehaviors = config.enabledBehaviors.filter(behaviorId => {
    switch (behaviorId) {
      case 'daily_routine':
        return autonomousBehaviors.daily_routine?.enabled !== false
      case 'curiosity_exploration':
        return autonomousBehaviors.curiosity_driven?.enabled !== false
      case 'social_interaction':
        return autonomousBehaviors.social_interaction?.enabled !== false
      case 'creative_expression':
        return autonomousBehaviors.creative_expression?.enabled !== false
      case 'continuous_learning':
        return autonomousBehaviors.continuous_learning?.enabled !== false
      case 'self_reflection':
        return autonomousBehaviors.self_reflection?.enabled !== false
      case 'goal_oriented':
        return autonomousBehaviors.goal_oriented?.enabled !== false
      default:
        return true
    }
  })

  return new BehaviorSystem(config, agentConfig)
}