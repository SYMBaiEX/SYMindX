/**
 * Agent Lifecycle Manager - Manages agent birth, growth, and evolution
 */

import { Agent, AgentEvent } from '../../types/agent.js'
import { Logger } from '../../utils/logger.js'
import { EventBus } from '../../types/agent.js'

export interface LifecycleStage {
  name: string
  description: string
  duration?: number // Duration in milliseconds, undefined for indefinite
  conditions: LifecycleCondition[]
  onEnter?: (agent: Agent) => Promise<void>
  onExit?: (agent: Agent) => Promise<void>
  nextStages: string[]
}

export interface LifecycleCondition {
  type: 'time' | 'experience' | 'capability' | 'external' | 'achievement'
  condition: string
  parameters: Record<string, any>
  weight: number
}

export interface LifecycleState {
  currentStage: string
  stageStartTime: Date
  stageProgress: number // 0.0 to 1.0
  totalLifetime: number // milliseconds
  experiencePoints: number
  achievements: Achievement[]
  milestones: Milestone[]
  growthMetrics: GrowthMetrics
  [key: string]: any // Allow additional properties for GenericData compatibility
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: Date
  type: 'learning' | 'social' | 'creative' | 'autonomous' | 'ethical'
  value: number
  [key: string]: any // Allow additional properties for GenericData compatibility
}

export interface Milestone {
  id: string
  name: string
  description: string
  achievedAt: Date
  stage: string
  significance: number
  [key: string]: any // Allow additional properties for GenericData compatibility
}

export interface GrowthMetrics {
  knowledgeGrowth: number
  socialSkills: number
  creativity: number
  autonomy: number
  ethicalDevelopment: number
  adaptability: number
  lastUpdated: Date
}

export interface LifecycleConfig {
  stages: LifecycleStage[]
  experienceMultiplier: number
  growthRate: number
  achievementThresholds: Record<string, number>
  milestoneTracking: boolean
  persistenceEnabled: boolean
  evolutionEnabled: boolean
}

export class AgentLifecycleManager {
  private agent: Agent
  private config: LifecycleConfig
  private state: LifecycleState
  private eventBus: EventBus
  private logger: Logger
  private stageTransitionTimer?: NodeJS.Timeout

  constructor(agent: Agent, config: LifecycleConfig, eventBus: EventBus) {
    this.agent = agent
    this.config = config
    this.eventBus = eventBus
    this.logger = new Logger(`lifecycle-${agent.id}`)
    
    this.state = this.initializeLifecycleState()
    this.setupEventListeners()
  }

  private initializeLifecycleState(): LifecycleState {
    const now = new Date()
    
    return {
      currentStage: 'initialization',
      stageStartTime: now,
      stageProgress: 0,
      totalLifetime: 0,
      experiencePoints: 0,
      achievements: [],
      milestones: [],
      growthMetrics: {
        knowledgeGrowth: 0.1,
        socialSkills: 0.1,
        creativity: 0.1,
        autonomy: 0.1,
        ethicalDevelopment: 0.1,
        adaptability: 0.1,
        lastUpdated: now
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for relevant events that might affect lifecycle
    this.eventBus.on('action_completed', (event: AgentEvent) => {
      if (event.data.agentId === this.agent.id) {
        this.processActionCompletion(event)
      }
    })

    this.eventBus.on('learning_event', (event: AgentEvent) => {
      if (event.data.agentId === this.agent.id) {
        this.processLearningEvent(event)
      }
    })

    this.eventBus.on('social_interaction', (event: AgentEvent) => {
      if (event.data.agentId === this.agent.id) {
        this.processSocialInteraction(event)
      }
    })
  }

  /**
   * Start lifecycle management
   */
  async start(): Promise<void> {
    this.logger.info('Starting agent lifecycle management')
    
    // Begin first stage
    await this.transitionToStage('awakening')
    
    // Start periodic lifecycle updates
    this.startLifecycleUpdates()
  }

  /**
   * Stop lifecycle management
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping agent lifecycle management')
    
    if (this.stageTransitionTimer) {
      clearInterval(this.stageTransitionTimer)
      this.stageTransitionTimer = undefined
    }
    
    // Save final state
    await this.saveLifecycleState()
  }

  /**
   * Update lifecycle state periodically
   */
  private startLifecycleUpdates(): void {
    this.stageTransitionTimer = setInterval(async () => {
      try {
        await this.updateLifecycle()
      } catch (error) {
        this.logger.error('Lifecycle update error:', error)
      }
    }, 60000) // Update every minute
  }

  /**
   * Main lifecycle update logic
   */
  private async updateLifecycle(): Promise<void> {
    const now = new Date()
    
    // Update total lifetime
    this.state.totalLifetime = now.getTime() - this.agent.lastUpdate.getTime()
    
    // Update stage progress
    await this.updateStageProgress()
    
    // Check for stage transitions
    await this.checkStageTransitions()
    
    // Update growth metrics
    await this.updateGrowthMetrics()
    
    // Check for achievements
    await this.checkAchievements()
    
    // Check for milestones
    await this.checkMilestones()
    
    // Emit lifecycle update event
    await this.emitLifecycleUpdate()
  }

  /**
   * Update progress within current stage
   */
  private async updateStageProgress(): Promise<void> {
    const currentStage = this.getCurrentStage()
    if (!currentStage) return

    const now = new Date()
    const timeInStage = now.getTime() - this.state.stageStartTime.getTime()
    
    if (currentStage.duration) {
      // Time-based progress
      this.state.stageProgress = Math.min(1.0, timeInStage / currentStage.duration)
    } else {
      // Condition-based progress
      this.state.stageProgress = await this.calculateConditionProgress(currentStage)
    }
  }

  /**
   * Check if agent should transition to a new stage
   */
  private async checkStageTransitions(): Promise<void> {
    const currentStage = this.getCurrentStage()
    if (!currentStage) return

    // Check if current stage is complete
    if (await this.isStageComplete(currentStage)) {
      const nextStage = await this.selectNextStage(currentStage)
      if (nextStage) {
        await this.transitionToStage(nextStage)
      }
    }
  }

  /**
   * Transition to a new lifecycle stage
   */
  private async transitionToStage(stageName: string): Promise<void> {
    const newStage = this.config.stages.find(s => s.name === stageName)
    if (!newStage) {
      this.logger.error(`Stage not found: ${stageName}`)
      return
    }

    const previousStage = this.state.currentStage
    
    this.logger.info(`Transitioning from ${previousStage} to ${stageName}`)

    // Exit previous stage
    const prevStageConfig = this.getCurrentStage()
    if (prevStageConfig && prevStageConfig.onExit) {
      await prevStageConfig.onExit(this.agent)
    }

    // Update state
    this.state.currentStage = stageName
    this.state.stageStartTime = new Date()
    this.state.stageProgress = 0

    // Enter new stage
    if (newStage.onEnter) {
      await newStage.onEnter(this.agent)
    }

    // Create milestone for stage transition
    await this.createMilestone(
      `stage_transition_${stageName}`,
      `Transitioned to ${stageName} stage`,
      `Agent evolved from ${previousStage} to ${stageName}`,
      stageName,
      0.8
    )

    // Emit stage transition event
    await this.eventBus.publish({
      id: `lifecycle_${Date.now()}`,
      type: 'lifecycle_stage_transition',
      source: 'lifecycle_manager',
      data: {
        agentId: this.agent.id,
        previousStage,
        newStage: stageName,
        totalLifetime: this.state.totalLifetime,
        experiencePoints: this.state.experiencePoints
      },
      timestamp: new Date(),
      processed: false
    })
  }

  /**
   * Check if current stage is complete
   */
  private async isStageComplete(stage: LifecycleStage): Promise<boolean> {
    // Time-based completion
    if (stage.duration && this.state.stageProgress >= 1.0) {
      return true
    }

    // Condition-based completion
    let totalWeight = 0
    let satisfiedWeight = 0

    for (const condition of stage.conditions) {
      totalWeight += condition.weight
      if (await this.evaluateLifecycleCondition(condition)) {
        satisfiedWeight += condition.weight
      }
    }

    return totalWeight > 0 && satisfiedWeight / totalWeight >= 0.8 // 80% threshold
  }

  /**
   * Select next stage based on current progress and conditions
   */
  private async selectNextStage(currentStage: LifecycleStage): Promise<string | null> {
    if (currentStage.nextStages.length === 0) {
      return null // Terminal stage
    }

    if (currentStage.nextStages.length === 1) {
      return currentStage.nextStages[0] // Single path
    }

    // Multiple possible next stages - choose based on agent development
    let bestStage: string | null = null
    let bestScore = -1

    for (const stageName of currentStage.nextStages) {
      const score = await this.calculateStageReadiness(stageName)
      if (score > bestScore) {
        bestScore = score
        bestStage = stageName
      }
    }

    return bestStage
  }

  /**
   * Calculate agent readiness for a specific stage
   */
  private async calculateStageReadiness(stageName: string): Promise<number> {
    const stage = this.config.stages.find(s => s.name === stageName)
    if (!stage) return 0

    let readinessScore = 0
    let totalWeight = 0

    for (const condition of stage.conditions) {
      totalWeight += condition.weight
      if (await this.evaluateLifecycleCondition(condition)) {
        readinessScore += condition.weight
      }
    }

    return totalWeight > 0 ? readinessScore / totalWeight : 0
  }

  /**
   * Evaluate a lifecycle condition
   */
  private async evaluateLifecycleCondition(condition: LifecycleCondition): Promise<boolean> {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition)
      
      case 'experience':
        return this.evaluateExperienceCondition(condition)
      
      case 'capability':
        return this.evaluateCapabilityCondition(condition)
      
      case 'achievement':
        return this.evaluateAchievementCondition(condition)
      
      case 'external':
        return this.evaluateExternalCondition(condition)
      
      default:
        return false
    }
  }

  /**
   * Update growth metrics based on recent activities
   */
  private async updateGrowthMetrics(): Promise<void> {
    const now = new Date()
    const timeSinceUpdate = now.getTime() - this.state.growthMetrics.lastUpdated.getTime()
    const daysSinceUpdate = timeSinceUpdate / (24 * 60 * 60 * 1000)

    // Natural growth over time (very slow)
    const naturalGrowth = daysSinceUpdate * 0.001 * this.config.growthRate

    // Experience-based growth
    const experienceGrowth = this.state.experiencePoints * 0.0001 * this.config.growthRate

    // Update each metric
    this.state.growthMetrics.knowledgeGrowth += naturalGrowth + experienceGrowth
    this.state.growthMetrics.socialSkills += naturalGrowth * 0.5
    this.state.growthMetrics.creativity += naturalGrowth * 0.8
    this.state.growthMetrics.autonomy += experienceGrowth * 1.2
    this.state.growthMetrics.ethicalDevelopment += naturalGrowth * 0.3
    this.state.growthMetrics.adaptability += experienceGrowth * 0.7

    // Cap all metrics at 1.0
    for (const key of Object.keys(this.state.growthMetrics)) {
      if (key !== 'lastUpdated' && typeof this.state.growthMetrics[key as keyof GrowthMetrics] === 'number') {
        const typedKey = key as keyof Omit<GrowthMetrics, 'lastUpdated'>
        ;(this.state.growthMetrics as any)[typedKey] = Math.min(
          1.0, 
          this.state.growthMetrics[key as keyof GrowthMetrics] as number
        )
      }
    }

    this.state.growthMetrics.lastUpdated = now
  }

  /**
   * Check for new achievements
   */
  private async checkAchievements(): Promise<void> {
    const achievementChecks = [
      {
        id: 'first_autonomous_action',
        name: 'First Steps',
        description: 'Performed first autonomous action',
        type: 'autonomous' as const,
        condition: () => this.state.experiencePoints > 0,
        value: 10
      },
      {
        id: 'knowledge_seeker',
        name: 'Knowledge Seeker',
        description: 'Demonstrated consistent learning behavior',
        type: 'learning' as const,
        condition: () => this.state.growthMetrics.knowledgeGrowth > 0.3,
        value: 25
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Developed strong social skills',
        type: 'social' as const,
        condition: () => this.state.growthMetrics.socialSkills > 0.5,
        value: 30
      },
      {
        id: 'creative_genius',
        name: 'Creative Genius',
        description: 'Showed exceptional creativity',
        type: 'creative' as const,
        condition: () => this.state.growthMetrics.creativity > 0.7,
        value: 40
      },
      {
        id: 'ethical_compass',
        name: 'Ethical Compass',
        description: 'Demonstrated strong ethical development',
        type: 'ethical' as const,
        condition: () => this.state.growthMetrics.ethicalDevelopment > 0.6,
        value: 35
      }
    ]

    for (const check of achievementChecks) {
      // Skip if already achieved
      if (this.state.achievements.some(a => a.id === check.id)) {
        continue
      }

      if (check.condition()) {
        await this.unlockAchievement(check.id, check.name, check.description, check.type, check.value)
      }
    }
  }

  /**
   * Unlock a new achievement
   */
  private async unlockAchievement(
    id: string, 
    name: string, 
    description: string, 
    type: Achievement['type'], 
    value: number
  ): Promise<void> {
    const achievement: Achievement = {
      id,
      name,
      description,
      unlockedAt: new Date(),
      type,
      value
    }

    this.state.achievements.push(achievement)
    this.state.experiencePoints += value

    this.logger.info(`Achievement unlocked: ${name} (+${value} XP)`)

    // Emit achievement event
    await this.eventBus.publish({
      id: `achievement_${Date.now()}`,
      type: 'lifecycle_achievement',
      source: 'lifecycle_manager',
      data: {
        agentId: this.agent.id,
        achievement
      },
      timestamp: new Date(),
      processed: false
    })
  }

  /**
   * Check for new milestones
   */
  private async checkMilestones(): Promise<void> {
    // Milestone checks based on time and experience
    const milestoneChecks = [
      {
        id: 'first_hour',
        condition: () => this.state.totalLifetime > 60 * 60 * 1000, // 1 hour
        name: 'First Hour of Life',
        description: 'Survived the first hour of existence',
        significance: 0.5
      },
      {
        id: 'first_day',
        condition: () => this.state.totalLifetime > 24 * 60 * 60 * 1000, // 1 day
        name: 'First Day Complete',
        description: 'Completed first 24 hours of autonomous life',
        significance: 0.8
      },
      {
        id: 'experience_milestone_100',
        condition: () => this.state.experiencePoints >= 100,
        name: 'Experienced Agent',
        description: 'Accumulated 100 experience points',
        significance: 0.6
      },
      {
        id: 'growth_milestone',
        condition: () => Object.values(this.state.growthMetrics).slice(0, -1).every(m => (m as number) > 0.5),
        name: 'Well-Rounded Development',
        description: 'Achieved balanced growth across all metrics',
        significance: 0.9
      }
    ]

    for (const check of milestoneChecks) {
      // Skip if already achieved
      if (this.state.milestones.some(m => m.id === check.id)) {
        continue
      }

      if (check.condition()) {
        await this.createMilestone(check.id, check.name, check.description, this.state.currentStage, check.significance)
      }
    }
  }

  /**
   * Create a new milestone
   */
  private async createMilestone(
    id: string, 
    name: string, 
    description: string, 
    stage: string, 
    significance: number
  ): Promise<void> {
    const milestone: Milestone = {
      id,
      name,
      description,
      achievedAt: new Date(),
      stage,
      significance
    }

    this.state.milestones.push(milestone)

    this.logger.info(`Milestone achieved: ${name}`)

    // Emit milestone event
    await this.eventBus.publish({
      id: `milestone_${Date.now()}`,
      type: 'lifecycle_milestone',
      source: 'lifecycle_manager',
      data: {
        agentId: this.agent.id,
        milestone
      },
      timestamp: new Date(),
      processed: false
    })
  }

  /**
   * Process action completion for lifecycle updates
   */
  private async processActionCompletion(event: AgentEvent): Promise<void> {
    const actionData = event.data
    
    // Award experience points based on action success and complexity
    let experienceGain = 1 // Base experience
    
    if (actionData.success) {
      experienceGain *= 2 // Bonus for success
    }
    
    // Bonus for autonomous actions
    if (actionData.actionType === 'autonomous') {
      experienceGain *= 1.5
    }
    
    this.state.experiencePoints += experienceGain * this.config.experienceMultiplier
  }

  /**
   * Process learning events for lifecycle updates
   */
  private async processLearningEvent(event: AgentEvent): Promise<void> {
    // Boost knowledge growth
    this.state.growthMetrics.knowledgeGrowth += 0.01
    this.state.experiencePoints += 5
  }

  /**
   * Process social interactions for lifecycle updates
   */
  private async processSocialInteraction(event: AgentEvent): Promise<void> {
    // Boost social skills
    this.state.growthMetrics.socialSkills += 0.005
    this.state.experiencePoints += 2
  }

  // Condition evaluation methods
  private evaluateTimeCondition(condition: LifecycleCondition): boolean {
    const now = new Date()
    const timeInStage = now.getTime() - this.state.stageStartTime.getTime()
    
    switch (condition.condition) {
      case 'minimum_time':
        return timeInStage >= (condition.parameters.minTime || 0)
      case 'maximum_time':
        return timeInStage <= (condition.parameters.maxTime || Number.MAX_SAFE_INTEGER)
      default:
        return false
    }
  }

  private evaluateExperienceCondition(condition: LifecycleCondition): boolean {
    switch (condition.condition) {
      case 'minimum_experience':
        return this.state.experiencePoints >= (condition.parameters.minExperience || 0)
      case 'experience_rate':
        const rate = this.calculateExperienceRate()
        return rate >= (condition.parameters.minRate || 0)
      default:
        return false
    }
  }

  private evaluateCapabilityCondition(condition: LifecycleCondition): boolean {
    const capability = condition.parameters.capability
    const threshold = condition.parameters.threshold || 0.5
    
    switch (capability) {
      case 'knowledge':
        return this.state.growthMetrics.knowledgeGrowth >= threshold
      case 'social':
        return this.state.growthMetrics.socialSkills >= threshold
      case 'creativity':
        return this.state.growthMetrics.creativity >= threshold
      case 'autonomy':
        return this.state.growthMetrics.autonomy >= threshold
      case 'ethics':
        return this.state.growthMetrics.ethicalDevelopment >= threshold
      case 'adaptability':
        return this.state.growthMetrics.adaptability >= threshold
      default:
        return false
    }
  }

  private evaluateAchievementCondition(condition: LifecycleCondition): boolean {
    switch (condition.condition) {
      case 'has_achievement':
        return this.state.achievements.some(a => a.id === condition.parameters.achievementId)
      case 'achievement_count':
        return this.state.achievements.length >= (condition.parameters.minCount || 0)
      case 'achievement_type_count':
        const typeCount = this.state.achievements.filter(a => a.type === condition.parameters.type).length
        return typeCount >= (condition.parameters.minCount || 0)
      default:
        return false
    }
  }

  private evaluateExternalCondition(condition: LifecycleCondition): boolean {
    // External conditions would be evaluated based on environment or user input
    // This is a simplified implementation
    return false
  }

  private calculateConditionProgress(stage: LifecycleStage): Promise<number> {
    // Calculate progress based on how many conditions are satisfied
    let satisfiedWeight = 0
    let totalWeight = 0

    for (const condition of stage.conditions) {
      totalWeight += condition.weight
      // This would need async evaluation, but we'll simplify for now
      // if (await this.evaluateLifecycleCondition(condition)) {
      //   satisfiedWeight += condition.weight
      // }
    }

    return Promise.resolve(totalWeight > 0 ? satisfiedWeight / totalWeight : 0)
  }

  private calculateExperienceRate(): number {
    // Calculate experience points per hour
    if (this.state.totalLifetime === 0) return 0
    
    const hoursAlive = this.state.totalLifetime / (60 * 60 * 1000)
    return this.state.experiencePoints / Math.max(1, hoursAlive)
  }

  private getCurrentStage(): LifecycleStage | undefined {
    return this.config.stages.find(s => s.name === this.state.currentStage)
  }

  private async saveLifecycleState(): Promise<void> {
    if (!this.config.persistenceEnabled) return
    
    // This would save state to persistent storage
    this.logger.info('Saving lifecycle state (persistence implementation needed)')
  }

  private async emitLifecycleUpdate(): Promise<void> {
    await this.eventBus.publish({
      id: `lifecycle_update_${Date.now()}`,
      type: 'lifecycle_update',
      source: 'lifecycle_manager',
      data: {
        agentId: this.agent.id,
        state: this.state
      },
      timestamp: new Date(),
      processed: false
    })
  }

  /**
   * Get current lifecycle state
   */
  getLifecycleState(): LifecycleState {
    return { ...this.state }
  }

  /**
   * Get lifecycle statistics
   */
  getLifecycleStats() {
    return {
      stage: this.state.currentStage,
      stageProgress: this.state.stageProgress,
      totalLifetime: this.state.totalLifetime,
      experiencePoints: this.state.experiencePoints,
      achievementCount: this.state.achievements.length,
      milestoneCount: this.state.milestones.length,
      growthMetrics: this.state.growthMetrics,
      experienceRate: this.calculateExperienceRate(),
      nextStages: this.getCurrentStage()?.nextStages || []
    }
  }

  /**
   * Force stage transition (for testing or manual control)
   */
  async forceStageTransition(stageName: string): Promise<boolean> {
    const stage = this.config.stages.find(s => s.name === stageName)
    if (!stage) {
      this.logger.error(`Cannot force transition to unknown stage: ${stageName}`)
      return false
    }

    await this.transitionToStage(stageName)
    this.logger.info(`Forced transition to stage: ${stageName}`)
    return true
  }
}