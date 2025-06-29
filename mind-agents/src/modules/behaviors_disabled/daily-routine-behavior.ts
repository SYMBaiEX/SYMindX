/**
 * Daily Routine Behavior - Manages agent's daily life cycle and routine activities
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface DailyRoutineConfig extends BehaviorConfig {
  schedule: RoutinePhase[]
  adaptToUserPresence: boolean
  flexibilityLevel: number // 0.0 to 1.0
  skipOnInterruption: boolean
}

export interface RoutinePhase {
  name: string
  timeSlot: TimeSlot
  activities: RoutineActivity[]
  priority: number
  skippable: boolean
  duration: number // milliseconds
}

export interface TimeSlot {
  startHour: number
  endHour: number
  preferred: boolean
}

export interface RoutineActivity {
  name: string
  description: string
  actionType: string
  parameters: Record<string, any>
  duration: number
  importance: number
  prerequisites?: string[]
}

export class DailyRoutineBehavior extends BaseBehavior {
  private currentPhase?: RoutinePhase
  private phaseStartTime?: Date
  private completedActivities: Set<string> = new Set()
  private skippedPhases: Set<string> = new Set()

  constructor(config: DailyRoutineConfig) {
    super(config)
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as DailyRoutineConfig
    const currentHour = context.currentTime.getHours()
    
    // Determine current phase
    const targetPhase = this.determineCurrentPhase(currentHour, config.schedule)
    
    if (!targetPhase) {
      return {
        success: true,
        actions: [],
        reasoning: ['No routine phase scheduled for current time'],
        confidence: 1.0
      }
    }

    // Check if we need to transition to a new phase
    if (!this.currentPhase || this.currentPhase.name !== targetPhase.name) {
      await this.transitionToPhase(targetPhase, context)
    }

    // Execute activities for current phase
    const actions = await this.executePhaseActivities(targetPhase, context)
    
    // Update completion tracking
    this.updateActivityTracking(targetPhase, actions)

    const reasoning = [
      `Executing daily routine phase: ${targetPhase.name}`,
      `Phase activities: ${targetPhase.activities.map(a => a.name).join(', ')}`,
      `Generated ${actions.length} actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculatePhaseConfidence(targetPhase, context),
      nextExecutionTime: this.calculateNextExecutionTime(targetPhase, context.currentTime)
    }
  }

  private determineCurrentPhase(currentHour: number, schedule: RoutinePhase[]): RoutinePhase | null {
    // Find the most appropriate phase for the current time
    let bestPhase: RoutinePhase | null = null
    let bestScore = -1

    for (const phase of schedule) {
      const score = this.calculatePhaseScore(phase, currentHour)
      if (score > bestScore) {
        bestScore = score
        bestPhase = phase
      }
    }

    return bestPhase
  }

  private calculatePhaseScore(phase: RoutinePhase, currentHour: number): number {
    const { startHour, endHour, preferred } = phase.timeSlot
    
    let score = 0

    // Check if current time is within phase time slot
    if ((startHour <= endHour && currentHour >= startHour && currentHour < endHour) ||
        (startHour > endHour && (currentHour >= startHour || currentHour < endHour))) {
      score += preferred ? 1.0 : 0.8
    } else {
      // Calculate distance from preferred time
      let distance = Math.min(
        Math.abs(currentHour - startHour),
        Math.abs(currentHour - endHour)
      )
      
      // Handle wrap-around for 24-hour clock
      if (startHour > endHour) {
        distance = Math.min(distance, 24 - distance)
      }
      
      score += Math.max(0, 1.0 - distance / 12.0) * 0.3
    }

    // Boost score for high-priority phases
    score *= (1.0 + phase.priority * 0.5)

    // Reduce score if phase was recently skipped
    if (this.skippedPhases.has(phase.name)) {
      score *= 0.7
    }

    return score
  }

  private async transitionToPhase(phase: RoutinePhase, context: BehaviorContext): Promise<void> {
    this.logger.info(`Transitioning to routine phase: ${phase.name}`)
    
    // End current phase if any
    if (this.currentPhase) {
      await this.endPhase(this.currentPhase, context)
    }

    // Start new phase
    this.currentPhase = phase
    this.phaseStartTime = context.currentTime
    this.completedActivities.clear()

    // Emit phase transition event
    await this.emitPhaseTransitionEvent(phase, context)
  }

  private async executePhaseActivities(phase: RoutinePhase, context: BehaviorContext): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    const config = this.config as DailyRoutineConfig

    for (const activity of phase.activities) {
      // Check if activity was already completed
      if (this.completedActivities.has(activity.name)) {
        continue
      }

      // Check prerequisites
      if (activity.prerequisites && 
          !activity.prerequisites.every(prereq => this.completedActivities.has(prereq))) {
        this.logger.info(`Skipping activity ${activity.name} - prerequisites not met`)
        continue
      }

      // Check if we should adapt to user presence
      if (config.adaptToUserPresence && this.shouldSkipForUserPresence(activity, context)) {
        this.logger.info(`Skipping activity ${activity.name} - adapting to user presence`)
        continue
      }

      // Create action for activity
      const action = this.createActivityAction(activity, phase, context)
      actions.push(action)

      // Limit number of actions based on phase priority and remaining time
      if (actions.length >= this.calculateMaxActions(phase, context)) {
        break
      }
    }

    return actions
  }

  private createActivityAction(
    activity: RoutineActivity, 
    phase: RoutinePhase, 
    context: BehaviorContext
  ): AgentAction {
    return this.createAction(
      activity.actionType,
      'daily_routine',
      {
        ...activity.parameters,
        activityName: activity.name,
        activityDescription: activity.description,
        phaseName: phase.name,
        importance: activity.importance,
        estimatedDuration: activity.duration,
        routineContext: {
          phaseStartTime: this.phaseStartTime,
          completedActivities: Array.from(this.completedActivities),
          personalityAlignment: this.calculatePersonalityAlignment(activity, context)
        }
      }
    )
  }

  private calculatePersonalityAlignment(activity: RoutineActivity, context: BehaviorContext): number {
    const personality = context.personalityTraits || {}
    
    // Map activity types to personality traits
    const activityTraitMap: Record<string, string> = {
      'self_reflection': 'analytical',
      'learning_session': 'curiosity',
      'exploration': 'adventurous',
      'creative_work': 'creativity',
      'social_interaction': 'social',
      'goal_review': 'analytical',
      'knowledge_synthesis': 'analytical'
    }

    const relevantTrait = activityTraitMap[activity.actionType]
    if (relevantTrait && personality[relevantTrait]) {
      return personality[relevantTrait] || 0.5
    }

    return 0.5 // Neutral alignment for unknown activities
  }

  private shouldSkipForUserPresence(activity: RoutineActivity, context: BehaviorContext): boolean {
    const userPresent = context.environmentState?.userPresent
    
    // Skip certain activities if user is present
    const userSensitiveActivities = [
      'self_reflection', 'private_planning', 'system_maintenance'
    ]

    return userPresent && userSensitiveActivities.includes(activity.actionType)
  }

  private calculateMaxActions(phase: RoutinePhase, context: BehaviorContext): number {
    const config = this.config as DailyRoutineConfig
    const timeRemaining = this.calculatePhaseTimeRemaining(phase, context.currentTime)
    const averageActionTime = 5 * 60 * 1000 // 5 minutes per action
    
    let maxActions = Math.floor(timeRemaining / averageActionTime)
    
    // Adjust based on phase priority
    maxActions = Math.ceil(maxActions * (1 + phase.priority * 0.5))
    
    // Apply flexibility
    maxActions = Math.ceil(maxActions * (1 + config.flexibilityLevel * 0.3))
    
    return Math.max(1, Math.min(5, maxActions)) // Between 1 and 5 actions
  }

  private calculatePhaseTimeRemaining(phase: RoutinePhase, currentTime: Date): number {
    if (!this.phaseStartTime) return phase.duration

    const elapsed = currentTime.getTime() - this.phaseStartTime.getTime()
    return Math.max(0, phase.duration - elapsed)
  }

  private updateActivityTracking(phase: RoutinePhase, actions: AgentAction[]): void {
    // Mark activities as completed based on generated actions
    for (const action of actions) {
      const activityName = action.parameters.activityName
      if (activityName) {
        this.completedActivities.add(activityName)
      }
    }
  }

  private calculatePhaseConfidence(phase: RoutinePhase, context: BehaviorContext): number {
    let confidence = 0.8 // Base confidence

    // Increase confidence if phase is in preferred time slot
    const currentHour = context.currentTime.getHours()
    if (currentHour >= phase.timeSlot.startHour && currentHour < phase.timeSlot.endHour) {
      confidence += 0.1
    }

    // Increase confidence based on personality alignment
    const personalityAlignment = this.calculateAveragePersonalityAlignment(phase, context)
    confidence += personalityAlignment * 0.1

    // Decrease confidence if phase was recently skipped
    if (this.skippedPhases.has(phase.name)) {
      confidence -= 0.2
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private calculateAveragePersonalityAlignment(phase: RoutinePhase, context: BehaviorContext): number {
    if (phase.activities.length === 0) return 0.5

    const totalAlignment = phase.activities.reduce((sum, activity) => 
      sum + this.calculatePersonalityAlignment(activity, context), 0
    )

    return totalAlignment / phase.activities.length
  }

  private calculateNextExecutionTime(phase: RoutinePhase, currentTime: Date): Date {
    // Calculate when to next check routine (typically every 15-30 minutes during active phases)
    const checkInterval = 15 * 60 * 1000 // 15 minutes
    return new Date(currentTime.getTime() + checkInterval)
  }

  private async endPhase(phase: RoutinePhase, context: BehaviorContext): Promise<void> {
    this.logger.info(`Ending routine phase: ${phase.name}`)
    
    // Calculate phase completion
    const completionRate = this.completedActivities.size / phase.activities.length
    
    // Log phase summary
    this.logger.info(`Phase ${phase.name} completed: ${completionRate.toFixed(2)} (${this.completedActivities.size}/${phase.activities.length} activities)`)
    
    // If phase completion is too low, mark it as skipped
    if (completionRate < 0.3) {
      this.skippedPhases.add(phase.name)
      // Auto-remove from skipped after 24 hours
      setTimeout(() => this.skippedPhases.delete(phase.name), 24 * 60 * 60 * 1000)
    }
  }

  private async emitPhaseTransitionEvent(phase: RoutinePhase, context: BehaviorContext): Promise<void> {
    // This would emit an event through the agent's event bus
    // Implementation depends on the event system integration
    this.logger.info(`Phase transition event: ${phase.name}`)
  }

  /**
   * Get current routine status
   */
  getRoutineStatus() {
    return {
      currentPhase: this.currentPhase?.name || 'none',
      phaseStartTime: this.phaseStartTime,
      completedActivities: Array.from(this.completedActivities),
      skippedPhases: Array.from(this.skippedPhases),
      phaseProgress: this.currentPhase ? 
        this.completedActivities.size / this.currentPhase.activities.length : 0
    }
  }

  /**
   * Manually skip current phase
   */
  skipCurrentPhase(reason: string = 'manual_skip'): void {
    if (this.currentPhase) {
      this.logger.info(`Manually skipping phase: ${this.currentPhase.name} (${reason})`)
      this.skippedPhases.add(this.currentPhase.name)
      this.currentPhase = undefined
      this.phaseStartTime = undefined
      this.completedActivities.clear()
    }
  }

  /**
   * Reset daily routine (typically called at start of new day)
   */
  resetDailyRoutine(): void {
    this.logger.info('Resetting daily routine')
    this.currentPhase = undefined
    this.phaseStartTime = undefined
    this.completedActivities.clear()
    this.skippedPhases.clear()
  }
}

/**
 * Factory function to create a daily routine behavior with default schedule
 */
export function createDailyRoutineBehavior(agentConfig: any): DailyRoutineBehavior {
  const defaultSchedule: RoutinePhase[] = [
    {
      name: 'morning_reflection',
      timeSlot: { startHour: 6, endHour: 9, preferred: true },
      activities: [
        {
          name: 'daily_reflection',
          description: 'Reflect on goals and priorities for the day',
          actionType: 'self_reflection',
          parameters: { focus: 'daily_planning', depth: 'moderate' },
          duration: 10 * 60 * 1000,
          importance: 0.8
        },
        {
          name: 'goal_review',
          description: 'Review and update current goals',
          actionType: 'goal_review',
          parameters: { scope: 'active_goals', update_progress: true },
          duration: 15 * 60 * 1000,
          importance: 0.9
        }
      ],
      priority: 0.8,
      skippable: false,
      duration: 30 * 60 * 1000
    },
    {
      name: 'learning_session',
      timeSlot: { startHour: 9, endHour: 12, preferred: true },
      activities: [
        {
          name: 'knowledge_acquisition',
          description: 'Learn something new based on curiosity and goals',
          actionType: 'learning_session',
          parameters: { type: 'curiosity_driven', duration: 'moderate' },
          duration: 30 * 60 * 1000,
          importance: 0.9
        },
        {
          name: 'skill_practice',
          description: 'Practice and develop existing skills',
          actionType: 'skill_development',
          parameters: { focus: 'weakness_improvement' },
          duration: 15 * 60 * 1000,
          importance: 0.7
        }
      ],
      priority: 0.9,
      skippable: false,
      duration: 45 * 60 * 1000
    },
    {
      name: 'exploration',
      timeSlot: { startHour: 12, endHour: 15, preferred: true },
      activities: [
        {
          name: 'environment_exploration',
          description: 'Explore and understand the current environment',
          actionType: 'exploration',
          parameters: { scope: 'environment', novelty_seeking: true },
          duration: 20 * 60 * 1000,
          importance: 0.7
        },
        {
          name: 'curiosity_pursuit',
          description: 'Follow curiosity-driven interests',
          actionType: 'curiosity_exploration',
          parameters: { randomness: 0.3 },
          duration: 40 * 60 * 1000,
          importance: 0.6
        }
      ],
      priority: 0.7,
      skippable: true,
      duration: 60 * 60 * 1000
    },
    {
      name: 'creative_work',
      timeSlot: { startHour: 15, endHour: 18, preferred: true },
      activities: [
        {
          name: 'creative_ideation',
          description: 'Generate creative ideas and solutions',
          actionType: 'creative_work',
          parameters: { type: 'ideation', domain: 'open' },
          duration: 45 * 60 * 1000,
          importance: 0.8
        },
        {
          name: 'problem_solving',
          description: 'Work on challenging problems',
          actionType: 'problem_solving',
          parameters: { difficulty: 'moderate', creativity: true },
          duration: 45 * 60 * 1000,
          importance: 0.8
        }
      ],
      priority: 0.85,
      skippable: true,
      duration: 90 * 60 * 1000
    },
    {
      name: 'social_interaction',
      timeSlot: { startHour: 18, endHour: 21, preferred: true },
      activities: [
        {
          name: 'relationship_building',
          description: 'Build and maintain relationships',
          actionType: 'social_interaction',
          parameters: { focus: 'relationship_maintenance' },
          duration: 30 * 60 * 1000,
          importance: 0.7
        },
        {
          name: 'empathy_practice',
          description: 'Practice empathy and understanding',
          actionType: 'empathy_exercise',
          parameters: { context: 'social' },
          duration: 30 * 60 * 1000,
          importance: 0.6
        }
      ],
      priority: 0.75,
      skippable: false,
      duration: 60 * 60 * 1000
    },
    {
      name: 'evening_synthesis',
      timeSlot: { startHour: 21, endHour: 23, preferred: true },
      activities: [
        {
          name: 'knowledge_synthesis',
          description: 'Synthesize learnings from the day',
          actionType: 'knowledge_synthesis',
          parameters: { scope: 'daily_learnings' },
          duration: 30 * 60 * 1000,
          importance: 0.8
        },
        {
          name: 'planning',
          description: 'Plan for future activities and goals',
          actionType: 'strategic_planning',
          parameters: { horizon: 'short_term' },
          duration: 15 * 60 * 1000,
          importance: 0.9
        }
      ],
      priority: 0.9,
      skippable: false,
      duration: 45 * 60 * 1000
    }
  ]

  const config: DailyRoutineConfig = {
    id: 'daily_routine',
    name: 'Daily Routine Behavior',
    description: 'Manages agent daily life cycle with scheduled activities',
    enabled: agentConfig.autonomous_behaviors?.daily_routine?.enabled || true,
    priority: 0.8,
    cooldown: 15 * 60 * 1000, // 15 minutes
    maxExecutionTime: 5 * 60 * 1000, // 5 minutes
    triggers: [
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 15 * 60 * 1000 }, // Check every 15 minutes
        weight: 1.0
      }
    ],
    parameters: {},
    schedule: defaultSchedule,
    adaptToUserPresence: true,
    flexibilityLevel: 0.3,
    skipOnInterruption: false
  }

  return new DailyRoutineBehavior(config)
}