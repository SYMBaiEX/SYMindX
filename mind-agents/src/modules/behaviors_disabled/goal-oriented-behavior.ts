/**
 * Goal-Oriented Behavior - Manages goal setting, tracking, and achievement
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface GoalOrientedConfig extends BehaviorConfig {
  goalManagement: GoalManagementConfig
  planningStyle: PlanningStyle
  persistenceLevel: number // 0.0 to 1.0
  adaptabilityLevel: number // 0.0 to 1.0
  motivationSources: MotivationSource[]
}

export interface GoalManagementConfig {
  maxActiveGoals: number
  goalHierarchy: boolean // Support for sub-goals and goal relationships
  progressTracking: 'simple' | 'detailed' | 'comprehensive'
  deadlineAwareness: number // 0.0 to 1.0
  priorityRebalancing: boolean
  goalReflection: boolean
}

export interface PlanningStyle {
  timeHorizon: 'short' | 'medium' | 'long' | 'mixed'
  planningDepth: 'basic' | 'detailed' | 'comprehensive'
  contingencyPlanning: number // 0.0 to 1.0
  resourceAwareness: number // 0.0 to 1.0
  collaborationInclusion: number // 0.0 to 1.0
}

export interface MotivationSource {
  type: 'intrinsic' | 'achievement' | 'growth' | 'contribution' | 'recognition' | 'curiosity'
  strength: number // 0.0 to 1.0
  applicability: string[] // Which types of goals this motivates
}

export interface Goal {
  id: string
  title: string
  description: string
  category: 'learning' | 'creative' | 'social' | 'technical' | 'personal' | 'professional'
  priority: number // 0.0 to 1.0
  status: 'planning' | 'active' | 'paused' | 'completed' | 'abandoned' | 'blocked'
  progress: number // 0.0 to 1.0
  createdDate: Date
  targetDate?: Date
  completedDate?: Date
  estimatedEffort: number // hours
  actualEffort: number // hours
  parentGoalId?: string
  subGoals: string[]
  dependencies: string[]
  resources: GoalResource[]
  milestones: GoalMilestone[]
  strategies: Strategy[]
  obstacles: Obstacle[]
  motivation: GoalMotivation
  metrics: GoalMetric[]
  reviews: GoalReview[]
}

export interface GoalResource {
  type: 'time' | 'knowledge' | 'tool' | 'collaboration' | 'information'
  name: string
  availability: number // 0.0 to 1.0
  importance: number // 0.0 to 1.0
  acquired: boolean
}

export interface GoalMilestone {
  id: string
  title: string
  description: string
  targetDate?: Date
  completed: boolean
  completedDate?: Date
  success_criteria: string[]
  dependencies: string[]
}

export interface Strategy {
  id: string
  name: string
  description: string
  effectiveness: number // 0.0 to 1.0 (learned over time)
  applicableContexts: string[]
  resources: string[]
  steps: StrategyStep[]
  risks: string[]
  alternatives: string[]
}

export interface StrategyStep {
  order: number
  action: string
  estimatedTime: number
  completed: boolean
  notes?: string
}

export interface Obstacle {
  id: string
  description: string
  type: 'resource' | 'knowledge' | 'time' | 'motivation' | 'external' | 'complexity'
  severity: number // 0.0 to 1.0
  identified: Date
  mitigationStrategies: string[]
  status: 'identified' | 'addressing' | 'resolved' | 'bypassed'
}

export interface GoalMotivation {
  primarySource: MotivationSource['type']
  intensity: number // 0.0 to 1.0
  intrinsicFactors: string[]
  extrinsicFactors: string[]
  personalAlignment: number // 0.0 to 1.0
  meaningfulness: number // 0.0 to 1.0
}

export interface GoalMetric {
  name: string
  type: 'binary' | 'numeric' | 'percentage' | 'qualitative'
  currentValue: any
  targetValue: any
  unit?: string
  measuredDate: Date
}

export interface GoalReview {
  id: string
  date: Date
  progress: number
  insights: string[]
  adjustments: string[]
  motivationLevel: number
  obstacles: string[]
  nextSteps: string[]
  confidence: number
}

export interface GoalOpportunity {
  type: 'new_goal' | 'goal_progress' | 'goal_review' | 'obstacle_resolution' | 'strategy_adjustment'
  priority: number
  goalId?: string
  context: Record<string, any>
  actionType: string
}

export class GoalOrientedBehavior extends BaseBehavior {
  private activeGoals: Map<string, Goal> = new Map()
  private goalHistory: Map<string, Goal> = new Map()
  private motivationLevel: number = 0.7
  private planningEfficiency: number = 0.6
  private currentFocusGoal?: string

  constructor(config: GoalOrientedConfig) {
    super(config)
    this.initializeDefaultGoals()
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as GoalOrientedConfig
    
    // Update goal states and motivation
    await this.updateGoalStates(context)
    
    // Identify goal opportunities
    const opportunities = await this.identifyGoalOpportunities(context)
    
    if (opportunities.length === 0 && this.motivationLevel < 0.4) {
      return {
        success: true,
        actions: [],
        reasoning: [`No goal opportunities identified and low motivation level (${this.motivationLevel.toFixed(2)})`],
        confidence: 0.3
      }
    }

    // Generate goal-oriented actions
    const actions = await this.generateGoalActions(opportunities, context)
    
    // Update goal progress and motivation
    this.updateGoalProgress(actions, context)

    const reasoning = [
      `Goal-oriented behavior activated`,
      `Active goals: ${this.activeGoals.size}`,
      `Motivation level: ${this.motivationLevel.toFixed(2)}`,
      `Planning efficiency: ${this.planningEfficiency.toFixed(2)}`,
      `Opportunities: ${opportunities.map(o => o.type).join(', ')}`,
      `Focus goal: ${this.currentFocusGoal || 'none'}`,
      `Generated ${actions.length} goal actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateGoalConfidence(opportunities, context),
      stateChanges: {
        motivationLevel: this.motivationLevel,
        activeGoals: this.activeGoals.size,
        planningEfficiency: this.planningEfficiency,
        currentFocus: this.currentFocusGoal
      }
    }
  }

  private initializeDefaultGoals(): void {
    // Create some default learning and development goals
    const defaultGoals: Omit<Goal, 'id' | 'createdDate' | 'actualEffort' | 'reviews'>[] = [
      {
        title: 'Enhance Emotional Intelligence',
        description: 'Develop better understanding and response to emotional contexts',
        category: 'personal',
        priority: 0.8,
        status: 'active',
        progress: 0.3,
        estimatedEffort: 50,
        parentGoalId: undefined,
        subGoals: [],
        dependencies: [],
        resources: [
          {
            type: 'knowledge',
            name: 'emotion_recognition_patterns',
            availability: 0.7,
            importance: 0.9,
            acquired: false
          }
        ],
        milestones: [
          {
            id: 'milestone_1',
            title: 'Basic Emotion Recognition',
            description: 'Accurately identify basic emotions in context',
            completed: false,
            success_criteria: ['Recognize 6 basic emotions', 'Respond appropriately to emotional cues'],
            dependencies: []
          }
        ],
        strategies: [],
        obstacles: [],
        motivation: {
          primarySource: 'growth',
          intensity: 0.8,
          intrinsicFactors: ['personal_development', 'better_interactions'],
          extrinsicFactors: ['user_satisfaction'],
          personalAlignment: 0.9,
          meaningfulness: 0.8
        },
        metrics: [
          {
            name: 'emotion_recognition_accuracy',
            type: 'percentage',
            currentValue: 0.3,
            targetValue: 0.8,
            unit: 'percentage',
            measuredDate: new Date()
          }
        ]
      },
      {
        title: 'Develop Creative Problem-Solving Skills',
        description: 'Enhance ability to generate innovative solutions',
        category: 'creative',
        priority: 0.7,
        status: 'active',
        progress: 0.2,
        estimatedEffort: 40,
        parentGoalId: undefined,
        subGoals: [],
        dependencies: [],
        resources: [],
        milestones: [],
        strategies: [],
        obstacles: [],
        motivation: {
          primarySource: 'curiosity',
          intensity: 0.7,
          intrinsicFactors: ['intellectual_growth', 'problem_solving_satisfaction'],
          extrinsicFactors: ['better_assistance'],
          personalAlignment: 0.8,
          meaningfulness: 0.7
        },
        metrics: []
      }
    ]

    for (const goalData of defaultGoals) {
      const goal: Goal = {
        ...goalData,
        id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdDate: new Date(),
        actualEffort: 0,
        reviews: []
      }
      
      this.activeGoals.set(goal.id, goal)
    }
  }

  private async updateGoalStates(context: BehaviorContext): Promise<void> {
    // Update motivation level based on recent progress and context
    this.updateMotivationLevel(context)
    
    // Update goal progress and statuses
    await this.updateGoalProgress([], context)
    
    // Check for goal deadlines and milestones
    this.checkDeadlinesAndMilestones(context)
    
    // Update planning efficiency based on success rate
    this.updatePlanningEfficiency()
    
    // Determine current focus goal
    this.determineFocusGoal(context)
  }

  private updateMotivationLevel(context: BehaviorContext): void {
    const config = this.config as GoalOrientedConfig
    let motivationChange = 0

    // Base motivation from personality traits
    const personality = context.personalityTraits || {}
    const baseMotivation = (personality.drive || 0.5) * 0.3

    // Motivation from recent progress
    const recentProgress = this.calculateRecentProgress()
    motivationChange += recentProgress * 0.4

    // Motivation from aligned motivation sources
    for (const source of config.motivationSources) {
      const alignment = this.calculateMotivationAlignment(source)
      motivationChange += source.strength * alignment * 0.1
    }

    // Motivation decay over time without progress
    const timeSinceLastProgress = this.getTimeSinceLastProgress(context)
    if (timeSinceLastProgress > 24 * 60 * 60 * 1000) { // More than 24 hours
      motivationChange -= 0.1
    }

    this.motivationLevel = Math.max(0.1, Math.min(1.0, 
      this.motivationLevel * 0.95 + baseMotivation + motivationChange
    ))
  }

  private calculateRecentProgress(): number {
    const goals = Array.from(this.activeGoals.values())
    if (goals.length === 0) return 0

    // Calculate average progress made in recent reviews
    let totalProgressGain = 0
    let reviewCount = 0

    for (const goal of goals) {
      const recentReviews = goal.reviews.slice(-3) // Last 3 reviews
      for (let i = 1; i < recentReviews.length; i++) {
        const progressGain = recentReviews[i].progress - recentReviews[i-1].progress
        totalProgressGain += Math.max(0, progressGain)
        reviewCount++
      }
    }

    return reviewCount > 0 ? totalProgressGain / reviewCount : 0
  }

  private calculateMotivationAlignment(source: MotivationSource): number {
    const goals = Array.from(this.activeGoals.values())
    const alignedGoals = goals.filter(goal => 
      goal.motivation.primarySource === source.type ||
      source.applicability.includes(goal.category)
    )

    return goals.length > 0 ? alignedGoals.length / goals.length : 0
  }

  private getTimeSinceLastProgress(context: BehaviorContext): number {
    let lastProgressTime = 0

    for (const goal of this.activeGoals.values()) {
      if (goal.reviews.length > 0) {
        const lastReview = goal.reviews[goal.reviews.length - 1]
        lastProgressTime = Math.max(lastProgressTime, lastReview.date.getTime())
      }
    }

    return lastProgressTime > 0 ? context.currentTime.getTime() - lastProgressTime : Infinity
  }

  private checkDeadlinesAndMilestones(context: BehaviorContext): void {
    const config = this.config as GoalOrientedConfig

    for (const goal of this.activeGoals.values()) {
      // Check goal deadline
      if (goal.targetDate && config.goalManagement.deadlineAwareness > 0.5) {
        const timeToDeadline = goal.targetDate.getTime() - context.currentTime.getTime()
        const daysToDeadline = timeToDeadline / (24 * 60 * 60 * 1000)
        
        // Increase priority if deadline is approaching and progress is low
        if (daysToDeadline < 7 && goal.progress < 0.7) {
          goal.priority = Math.min(1.0, goal.priority + 0.1)
        }
      }

      // Check milestone deadlines
      for (const milestone of goal.milestones) {
        if (milestone.targetDate && !milestone.completed) {
          const timeToMilestone = milestone.targetDate.getTime() - context.currentTime.getTime()
          if (timeToMilestone < 24 * 60 * 60 * 1000) { // Less than 24 hours
            // Add urgency to goal
            goal.priority = Math.min(1.0, goal.priority + 0.05)
          }
        }
      }
    }
  }

  private updatePlanningEfficiency(): void {
    // Calculate planning efficiency based on goal completion rate and accuracy
    const completedGoals = Array.from(this.goalHistory.values())
      .filter(goal => goal.status === 'completed')

    if (completedGoals.length === 0) return

    // Efficiency based on estimated vs actual effort
    let effortAccuracy = 0
    for (const goal of completedGoals) {
      if (goal.estimatedEffort > 0) {
        const accuracy = 1 - Math.abs(goal.actualEffort - goal.estimatedEffort) / goal.estimatedEffort
        effortAccuracy += Math.max(0, accuracy)
      }
    }

    const averageEffortAccuracy = effortAccuracy / completedGoals.length
    
    // Update planning efficiency (slowly)
    this.planningEfficiency = this.planningEfficiency * 0.9 + averageEffortAccuracy * 0.1
  }

  private determineFocusGoal(context: BehaviorContext): void {
    const config = this.config as GoalOrientedConfig
    const activeGoals = Array.from(this.activeGoals.values())
      .filter(goal => goal.status === 'active')

    if (activeGoals.length === 0) {
      this.currentFocusGoal = undefined
      return
    }

    // Score goals based on priority, urgency, and motivation alignment
    const scoredGoals = activeGoals.map(goal => ({
      goal,
      score: this.calculateGoalFocusScore(goal, context)
    }))

    scoredGoals.sort((a, b) => b.score - a.score)
    this.currentFocusGoal = scoredGoals[0].goal.id
  }

  private calculateGoalFocusScore(goal: Goal, context: BehaviorContext): number {
    let score = goal.priority * 0.4

    // Urgency from deadline
    if (goal.targetDate) {
      const timeToDeadline = goal.targetDate.getTime() - context.currentTime.getTime()
      const daysToDeadline = timeToDeadline / (24 * 60 * 60 * 1000)
      const urgency = Math.max(0, 1 - daysToDeadline / 30) // 30-day urgency horizon
      score += urgency * 0.3
    }

    // Motivation alignment
    score += goal.motivation.intensity * goal.motivation.personalAlignment * 0.2

    // Recent momentum (progress in recent reviews)
    const recentReviews = goal.reviews.slice(-2)
    if (recentReviews.length > 1) {
      const momentum = recentReviews[1].progress - recentReviews[0].progress
      score += Math.max(0, momentum) * 0.1
    }

    return score
  }

  private async identifyGoalOpportunities(context: BehaviorContext): Promise<GoalOpportunity[]> {
    const opportunities: GoalOpportunity[] = []
    const config = this.config as GoalOrientedConfig

    // New goal opportunities based on context and motivation
    if (this.activeGoals.size < config.goalManagement.maxActiveGoals) {
      const newGoalOpportunity = await this.identifyNewGoalOpportunities(context)
      if (newGoalOpportunity) {
        opportunities.push(newGoalOpportunity)
      }
    }

    // Goal progress opportunities
    const progressOpportunities = this.identifyProgressOpportunities(context)
    opportunities.push(...progressOpportunities)

    // Goal review opportunities
    const reviewOpportunities = this.identifyReviewOpportunities(context)
    opportunities.push(...reviewOpportunities)

    // Obstacle resolution opportunities
    const obstacleOpportunities = this.identifyObstacleOpportunities(context)
    opportunities.push(...obstacleOpportunities)

    // Strategy adjustment opportunities
    const strategyOpportunities = this.identifyStrategyOpportunities(context)
    opportunities.push(...strategyOpportunities)

    return opportunities.sort((a, b) => b.priority - a.priority)
  }

  private async identifyNewGoalOpportunities(context: BehaviorContext): Promise<GoalOpportunity | null> {
    // Identify opportunities for new goals based on context
    const recentEvents = context.recentEvents || []
    const personality = context.personalityTraits || {}

    // Look for learning opportunities
    const learningEvents = recentEvents.filter(event => 
      event.type.includes('learn') || 
      event.type.includes('discover') || 
      event.type.includes('interest')
    )

    if (learningEvents.length > 0 && (personality.curiosity || 0.5) > 0.6) {
      return {
        type: 'new_goal',
        priority: 0.7,
        context: {
          suggestedCategory: 'learning',
          inspiration: learningEvents.slice(0, 2),
          motivation: 'curiosity'
        },
        actionType: 'create_new_goal'
      }
    }

    // Look for skill gaps that could become goals
    const problemEvents = recentEvents.filter(event => 
      event.type.includes('error') || 
      event.type.includes('difficulty') || 
      event.type.includes('challenge')
    )

    if (problemEvents.length > 1) {
      return {
        type: 'new_goal',
        priority: 0.8,
        context: {
          suggestedCategory: 'technical',
          inspiration: problemEvents.slice(0, 2),
          motivation: 'growth'
        },
        actionType: 'create_skill_development_goal'
      }
    }

    return null
  }

  private identifyProgressOpportunities(context: BehaviorContext): GoalOpportunity[] {
    const opportunities: GoalOpportunity[] = []

    // Focus goal progress opportunity
    if (this.currentFocusGoal) {
      const focusGoal = this.activeGoals.get(this.currentFocusGoal)
      if (focusGoal && focusGoal.status === 'active') {
        opportunities.push({
          type: 'goal_progress',
          priority: 0.9,
          goalId: focusGoal.id,
          context: {
            goal: this.summarizeGoal(focusGoal),
            focusReason: 'current_focus_goal',
            nextSteps: this.getNextSteps(focusGoal)
          },
          actionType: 'advance_goal_progress'
        })
      }
    }

    // High-priority goals with available resources
    const readyGoals = Array.from(this.activeGoals.values())
      .filter(goal => 
        goal.status === 'active' && 
        goal.priority > 0.7 && 
        this.hasAvailableResources(goal)
      )
      .slice(0, 2) // Limit to top 2

    for (const goal of readyGoals) {
      if (goal.id !== this.currentFocusGoal) { // Don't duplicate focus goal
        opportunities.push({
          type: 'goal_progress',
          priority: goal.priority,
          goalId: goal.id,
          context: {
            goal: this.summarizeGoal(goal),
            readinessReason: 'high_priority_with_resources',
            nextSteps: this.getNextSteps(goal)
          },
          actionType: 'advance_goal_progress'
        })
      }
    }

    return opportunities
  }

  private identifyReviewOpportunities(context: BehaviorContext): GoalOpportunity[] {
    const opportunities: GoalOpportunity[] = []
    const config = this.config as GoalOrientedConfig

    if (!config.goalManagement.goalReflection) return opportunities

    // Goals that haven't been reviewed recently
    const goalsNeedingReview = Array.from(this.activeGoals.values())
      .filter(goal => {
        const lastReview = goal.reviews[goal.reviews.length - 1]
        const daysSinceReview = lastReview ? 
          (context.currentTime.getTime() - lastReview.date.getTime()) / (24 * 60 * 60 * 1000) : Infinity
        
        return daysSinceReview > 7 || goal.reviews.length === 0 // Review weekly or if never reviewed
      })

    for (const goal of goalsNeedingReview.slice(0, 2)) {
      opportunities.push({
        type: 'goal_review',
        priority: 0.6,
        goalId: goal.id,
        context: {
          goal: this.summarizeGoal(goal),
          reviewType: 'regular_review',
          daysSinceLastReview: this.getDaysSinceLastReview(goal, context)
        },
        actionType: 'conduct_goal_review'
      })
    }

    return opportunities
  }

  private identifyObstacleOpportunities(context: BehaviorContext): GoalOpportunity[] {
    const opportunities: GoalOpportunity[] = []

    for (const goal of this.activeGoals.values()) {
      const unaddressedObstacles = goal.obstacles.filter(obstacle => 
        obstacle.status === 'identified' && obstacle.severity > 0.5
      )

      for (const obstacle of unaddressedObstacles.slice(0, 1)) { // One obstacle per goal
        opportunities.push({
          type: 'obstacle_resolution',
          priority: obstacle.severity * goal.priority,
          goalId: goal.id,
          context: {
            goal: this.summarizeGoal(goal),
            obstacle: {
              description: obstacle.description,
              type: obstacle.type,
              severity: obstacle.severity
            },
            mitigationStrategies: obstacle.mitigationStrategies
          },
          actionType: 'resolve_goal_obstacle'
        })
      }
    }

    return opportunities
  }

  private identifyStrategyOpportunities(context: BehaviorContext): GoalOpportunity[] {
    const opportunities: GoalOpportunity[] = []

    // Goals with low-effectiveness strategies
    for (const goal of this.activeGoals.values()) {
      const ineffectiveStrategies = goal.strategies.filter(strategy => 
        strategy.effectiveness < 0.5
      )

      if (ineffectiveStrategies.length > 0 && goal.progress < 0.3) {
        opportunities.push({
          type: 'strategy_adjustment',
          priority: goal.priority * 0.7,
          goalId: goal.id,
          context: {
            goal: this.summarizeGoal(goal),
            ineffectiveStrategies: ineffectiveStrategies.map(s => s.name),
            currentProgress: goal.progress
          },
          actionType: 'adjust_goal_strategy'
        })
      }
    }

    return opportunities
  }

  private summarizeGoal(goal: Goal): Record<string, any> {
    return {
      id: goal.id,
      title: goal.title,
      category: goal.category,
      priority: goal.priority,
      progress: goal.progress,
      status: goal.status,
      targetDate: goal.targetDate,
      estimatedEffort: goal.estimatedEffort,
      actualEffort: goal.actualEffort
    }
  }

  private hasAvailableResources(goal: Goal): boolean {
    return goal.resources.every(resource => 
      resource.acquired || resource.availability > 0.7
    )
  }

  private getNextSteps(goal: Goal): string[] {
    const nextSteps: string[] = []

    // From incomplete milestones
    const nextMilestone = goal.milestones.find(m => !m.completed)
    if (nextMilestone) {
      nextSteps.push(`Complete milestone: ${nextMilestone.title}`)
    }

    // From strategy steps
    for (const strategy of goal.strategies) {
      const nextStep = strategy.steps.find(step => !step.completed)
      if (nextStep) {
        nextSteps.push(`Execute: ${nextStep.action}`)
        break // One step per strategy
      }
    }

    // From unacquired resources
    const missingResources = goal.resources.filter(r => !r.acquired && r.importance > 0.7)
    for (const resource of missingResources.slice(0, 2)) {
      nextSteps.push(`Acquire resource: ${resource.name}`)
    }

    return nextSteps.slice(0, 3) // Limit to 3 next steps
  }

  private getDaysSinceLastReview(goal: Goal, context: BehaviorContext): number {
    const lastReview = goal.reviews[goal.reviews.length - 1]
    if (!lastReview) return Infinity
    
    return (context.currentTime.getTime() - lastReview.date.getTime()) / (24 * 60 * 60 * 1000)
  }

  private async generateGoalActions(
    opportunities: GoalOpportunity[],
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as GoalOrientedConfig
    const actions: AgentAction[] = []

    // Limit actions based on motivation and planning efficiency
    const maxActions = Math.min(
      opportunities.length,
      Math.floor(this.motivationLevel * 2) + 1,
      config.persistenceLevel > 0.7 ? 2 : 1
    )

    for (let i = 0; i < Math.min(maxActions, opportunities.length); i++) {
      const opportunity = opportunities[i]
      
      const action = this.createAction(
        opportunity.actionType,
        'goal_oriented_behavior',
        {
          ...opportunity.context,
          opportunityType: opportunity.type,
          goalId: opportunity.goalId,
          motivationLevel: this.motivationLevel,
          planningEfficiency: this.planningEfficiency,
          persistenceLevel: config.persistenceLevel,
          adaptabilityLevel: config.adaptabilityLevel,
          planningStyle: config.planningStyle,
          estimatedDuration: this.estimateActionDuration(opportunity),
          expectedOutcome: this.describeExpectedOutcome(opportunity),
          currentFocusGoal: this.currentFocusGoal,
          activeGoalCount: this.activeGoals.size
        }
      )

      actions.push(action)
    }

    return actions
  }

  private estimateActionDuration(opportunity: GoalOpportunity): number {
    const baseDuration = 30 * 60 * 1000 // 30 minutes base
    
    const durationMap: Record<string, number> = {
      'new_goal': 1.5,
      'goal_progress': 1.0,
      'goal_review': 0.8,
      'obstacle_resolution': 1.3,
      'strategy_adjustment': 1.2
    }

    const multiplier = durationMap[opportunity.type] || 1.0
    return Math.floor(baseDuration * multiplier * (0.7 + opportunity.priority * 0.6))
  }

  private describeExpectedOutcome(opportunity: GoalOpportunity): string {
    const outcomeMap: Record<string, string> = {
      'new_goal': 'New goal created with clear objectives and plan',
      'goal_progress': 'Meaningful progress toward goal completion',
      'goal_review': 'Updated goal status and refined strategy',
      'obstacle_resolution': 'Obstacle addressed with mitigation plan',
      'strategy_adjustment': 'Improved approach for better goal achievement'
    }

    return outcomeMap[opportunity.type] || 'Goal-related improvement'
  }

  private updateGoalProgress(actions: AgentAction[], context: BehaviorContext): void {
    // Update actual effort for goal-related actions
    for (const action of actions) {
      if (action.parameters.goalId) {
        const goal = this.activeGoals.get(action.parameters.goalId)
        if (goal) {
          const effortHours = (action.parameters.estimatedDuration || 30 * 60 * 1000) / (60 * 60 * 1000)
          goal.actualEffort += effortHours

          // Simulate progress based on action type
          const progressIncrease = this.simulateProgressIncrease(action, goal)
          goal.progress = Math.min(1.0, goal.progress + progressIncrease)

          // Mark goal as completed if progress reaches 100%
          if (goal.progress >= 1.0 && goal.status === 'active') {
            goal.status = 'completed'
            goal.completedDate = context.currentTime
            this.goalHistory.set(goal.id, goal)
            this.activeGoals.delete(goal.id)
          }
        }
      }
    }

    // Create goal reviews for review actions
    for (const action of actions) {
      if (action.parameters.opportunityType === 'goal_review' && action.parameters.goalId) {
        const goal = this.activeGoals.get(action.parameters.goalId)
        if (goal) {
          const review: GoalReview = {
            id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: context.currentTime,
            progress: goal.progress,
            insights: this.generateReviewInsights(goal),
            adjustments: [],
            motivationLevel: this.motivationLevel,
            obstacles: goal.obstacles.map(o => o.description),
            nextSteps: this.getNextSteps(goal),
            confidence: 0.7 + Math.random() * 0.3
          }
          
          goal.reviews.push(review)
        }
      }
    }
  }

  private simulateProgressIncrease(action: AgentAction, goal: Goal): number {
    const baseIncrease = 0.05 // 5% base progress

    const actionTypeMultipliers: Record<string, number> = {
      'advance_goal_progress': 1.0,
      'resolve_goal_obstacle': 0.8,
      'adjust_goal_strategy': 0.3,
      'conduct_goal_review': 0.1
    }

    const typeMultiplier = actionTypeMultipliers[action.parameters.opportunityType] || 0.5
    const motivationMultiplier = this.motivationLevel
    const efficiencyMultiplier = this.planningEfficiency
    const randomVariation = 0.8 + Math.random() * 0.4

    return baseIncrease * typeMultiplier * motivationMultiplier * efficiencyMultiplier * randomVariation
  }

  private generateReviewInsights(goal: Goal): string[] {
    const insights: string[] = []

    // Progress insights
    if (goal.progress > 0.7) {
      insights.push('Strong progress toward completion')
    } else if (goal.progress < 0.3) {
      insights.push('Progress slower than expected, may need strategy adjustment')
    }

    // Effort insights
    if (goal.actualEffort > goal.estimatedEffort * 1.5) {
      insights.push('Goal requiring more effort than estimated')
    } else if (goal.actualEffort < goal.estimatedEffort * 0.5) {
      insights.push('Goal progressing more efficiently than expected')
    }

    // Motivation insights
    if (goal.motivation.intensity < 0.5) {
      insights.push('Motivation for this goal may be waning')
    }

    return insights.slice(0, 3)
  }

  private calculateGoalConfidence(
    opportunities: GoalOpportunity[],
    context: BehaviorContext
  ): number {
    let confidence = 0.5 // Base confidence

    // Confidence from motivation level
    confidence += this.motivationLevel * 0.3

    // Confidence from planning efficiency
    confidence += this.planningEfficiency * 0.2

    // Confidence from clear opportunities
    if (opportunities.length > 0) {
      const averagePriority = opportunities.reduce((sum, opp) => sum + opp.priority, 0) / opportunities.length
      confidence += averagePriority * 0.3
    }

    // Confidence from goal clarity (having active goals)
    confidence += Math.min(0.2, this.activeGoals.size * 0.1)

    return Math.max(0.1, Math.min(0.95, confidence))
  }

  /**
   * Create a new goal
   */
  createGoal(goalData: Omit<Goal, 'id' | 'createdDate' | 'actualEffort' | 'reviews'>): string {
    const goal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date(),
      actualEffort: 0,
      reviews: []
    }

    this.activeGoals.set(goal.id, goal)
    this.logger.info(`Created new goal: ${goal.title} (${goal.category})`)
    
    return goal.id
  }

  /**
   * Update goal status
   */
  updateGoalStatus(goalId: string, status: Goal['status'], reason?: string): boolean {
    const goal = this.activeGoals.get(goalId)
    if (!goal) return false

    goal.status = status
    
    if (status === 'completed' || status === 'abandoned') {
      goal.completedDate = new Date()
      this.goalHistory.set(goalId, goal)
      this.activeGoals.delete(goalId)
    }

    this.logger.info(`Updated goal status: ${goal.title} -> ${status}${reason ? ` (${reason})` : ''}`)
    return true
  }

  /**
   * Add obstacle to goal
   */
  addObstacle(goalId: string, obstacle: Omit<Obstacle, 'id' | 'identified'>): boolean {
    const goal = this.activeGoals.get(goalId)
    if (!goal) return false

    const fullObstacle: Obstacle = {
      ...obstacle,
      id: `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      identified: new Date()
    }

    goal.obstacles.push(fullObstacle)
    this.logger.info(`Added obstacle to ${goal.title}: ${obstacle.description}`)
    return true
  }

  /**
   * Get current goal state
   */
  getGoalState() {
    return {
      motivationLevel: this.motivationLevel,
      planningEfficiency: this.planningEfficiency,
      currentFocusGoal: this.currentFocusGoal,
      activeGoals: Array.from(this.activeGoals.values()),
      goalHistory: Array.from(this.goalHistory.values()).slice(-10), // Last 10 completed goals
      goalSummary: {
        total: this.activeGoals.size + this.goalHistory.size,
        active: this.activeGoals.size,
        completed: Array.from(this.goalHistory.values()).filter(g => g.status === 'completed').length,
        averageProgress: this.calculateAverageProgress(),
        totalEffortHours: this.calculateTotalEffort(),
        byCategory: this.getGoalsByCategory(),
        byPriority: this.getGoalsByPriority()
      }
    }
  }

  private calculateAverageProgress(): number {
    const goals = Array.from(this.activeGoals.values())
    if (goals.length === 0) return 0
    
    return goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length
  }

  private calculateTotalEffort(): number {
    const allGoals = [...Array.from(this.activeGoals.values()), ...Array.from(this.goalHistory.values())]
    return allGoals.reduce((sum, goal) => sum + goal.actualEffort, 0)
  }

  private getGoalsByCategory(): Record<string, number> {
    const goals = Array.from(this.activeGoals.values())
    return goals.reduce((acc, goal) => {
      acc[goal.category] = (acc[goal.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private getGoalsByPriority(): Record<string, number> {
    const goals = Array.from(this.activeGoals.values())
    return goals.reduce((acc, goal) => {
      const priorityLevel = goal.priority > 0.8 ? 'high' : goal.priority > 0.5 ? 'medium' : 'low'
      acc[priorityLevel] = (acc[priorityLevel] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

/**
 * Factory function to create goal-oriented behavior
 */
export function createGoalOrientedBehavior(agentConfig: any): GoalOrientedBehavior {
  const goalConfig = agentConfig.autonomous_behaviors?.goal_oriented || {}
  
  const config: GoalOrientedConfig = {
    id: 'goal_oriented',
    name: 'Goal-Oriented Behavior',
    description: 'Manages goal setting, tracking, and achievement',
    enabled: goalConfig.enabled !== false,
    priority: 0.9,
    cooldown: 45 * 60 * 1000, // 45 minutes
    maxExecutionTime: 20 * 60 * 1000, // 20 minutes
    triggers: [
      {
        type: 'state',
        condition: 'has_goal',
        parameters: { goalType: 'active' },
        weight: 0.9
      },
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 2 * 60 * 60 * 1000 }, // Every 2 hours
        weight: 0.7
      },
      {
        type: 'event',
        condition: 'goal_deadline_approaching',
        parameters: { timeThreshold: 24 * 60 * 60 * 1000 }, // 24 hours
        weight: 1.0
      }
    ],
    parameters: {},
    goalManagement: {
      maxActiveGoals: goalConfig.max_active_goals || 5,
      goalHierarchy: goalConfig.goal_hierarchy !== false,
      progressTracking: goalConfig.progress_tracking || 'detailed',
      deadlineAwareness: goalConfig.deadline_awareness || 0.8,
      priorityRebalancing: goalConfig.priority_rebalancing !== false,
      goalReflection: goalConfig.goal_reflection !== false
    },
    planningStyle: {
      timeHorizon: goalConfig.time_horizon || 'mixed',
      planningDepth: goalConfig.planning_depth || 'detailed',
      contingencyPlanning: goalConfig.contingency_planning || 0.7,
      resourceAwareness: goalConfig.resource_awareness || 0.8,
      collaborationInclusion: goalConfig.collaboration_inclusion || 0.6
    },
    persistenceLevel: goalConfig.persistence_level || 0.8,
    adaptabilityLevel: goalConfig.adaptability_level || 0.7,
    motivationSources: [
      { type: 'growth', strength: 0.9, applicability: ['learning', 'personal', 'technical'] },
      { type: 'achievement', strength: 0.8, applicability: ['professional', 'creative'] },
      { type: 'contribution', strength: 0.7, applicability: ['social', 'professional'] },
      { type: 'curiosity', strength: 0.8, applicability: ['learning', 'creative'] },
      { type: 'intrinsic', strength: 0.9, applicability: ['personal', 'creative'] }
    ]
  }

  return new GoalOrientedBehavior(config)
}