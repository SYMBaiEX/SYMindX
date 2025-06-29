/**
 * Learning Behavior - Manages continuous learning and skill development
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface LearningConfig extends BehaviorConfig {
  learningDomains: LearningDomain[]
  learningStyle: LearningStyle
  skillDevelopment: SkillDevelopmentConfig
  knowledgeManagement: KnowledgeManagementConfig
  adaptiveLearning: boolean
  metacognitionLevel: number // 0.0 to 1.0
}

export interface LearningDomain {
  name: string
  category: 'technical' | 'creative' | 'social' | 'philosophical' | 'practical'
  currentLevel: number // 0.0 to 1.0
  targetLevel: number // 0.0 to 1.0
  priority: number // 0.0 to 1.0
  learningPath: LearningPath[]
  prerequisites: string[]
  relatedDomains: string[]
  lastStudied?: Date
  totalStudyTime: number // milliseconds
}

export interface LearningPath {
  name: string
  description: string
  estimatedDuration: number // milliseconds
  difficulty: number // 0.0 to 1.0
  prerequisites: string[]
  learningMethods: LearningMethod[]
  milestones: LearningMilestone[]
  completed: boolean
}

export interface LearningMethod {
  type: 'reading' | 'practice' | 'experimentation' | 'discussion' | 'reflection' | 'teaching'
  effectiveness: number // 0.0 to 1.0 for this agent
  timeInvestment: number // relative time required
  resources: string[]
  socialRequirement: boolean
}

export interface LearningMilestone {
  name: string
  description: string
  skillsGained: string[]
  assessmentCriteria: string[]
  achieved: boolean
  achievedDate?: Date
}

export interface LearningStyle {
  preferredMethods: LearningMethod['type'][]
  pacePreference: 'slow_deep' | 'moderate' | 'fast_overview'
  complexityTolerance: number // 0.0 to 1.0
  practiceToTheoryRatio: number // 0.0 (all theory) to 1.0 (all practice)
  collaborativeLearning: number // 0.0 to 1.0
  reflectionFrequency: 'low' | 'moderate' | 'high'
}

export interface SkillDevelopmentConfig {
  focusedDevelopment: boolean // focus on few skills vs broad learning
  skillTransferEmphasis: number // 0.0 to 1.0
  weaknessAddressing: number // 0.0 to 1.0
  strengthBuilding: number // 0.0 to 1.0
  innovationSkills: boolean
  fundamentalsEmphasis: number // 0.0 to 1.0
}

export interface KnowledgeManagementConfig {
  knowledgeRetention: 'surface' | 'deep' | 'expert'
  connectionBuilding: number // 0.0 to 1.0
  knowledgeApplication: number // 0.0 to 1.0
  synthesisSkills: number // 0.0 to 1.0
  criticalThinking: number // 0.0 to 1.0
}

export interface LearningGoal {
  id: string
  domain: string
  targetSkill: string
  currentProgress: number // 0.0 to 1.0
  targetDeadline?: Date
  priority: number
  motivation: string
  successCriteria: string[]
  strategies: string[]
}

export interface LearningSession {
  id: string
  domain: string
  method: LearningMethod['type']
  startTime: Date
  duration: number
  effectiveness: number // 0.0 to 1.0
  skillsAddressed: string[]
  knowledgeGained: string[]
  insights: string[]
  nextSteps: string[]
}

export interface KnowledgeGap {
  domain: string
  skill: string
  gapLevel: number // 0.0 to 1.0
  urgency: number // 0.0 to 1.0
  prerequisites: string[]
  identifiedDate: Date
  addressingStrategies: string[]
}

export class LearningBehavior extends BaseBehavior {
  private activeGoals: Map<string, LearningGoal> = new Map()
  private knowledgeGaps: Map<string, KnowledgeGap> = new Map()
  private recentSessions: LearningSession[] = []
  private learningMomentum: number = 0.5
  private metacognitionInsights: Array<{ insight: string; timestamp: Date; applied: boolean }> = []

  constructor(config: LearningConfig) {
    super(config)
    this.initializeLearningGoals()
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as LearningConfig
    
    // Update learning state
    await this.updateLearningState(context)
    
    // Identify learning needs and opportunities
    const learningNeeds = await this.identifyLearningNeeds(context)
    
    if (learningNeeds.length === 0 || this.learningMomentum < 0.3) {
      return {
        success: true,
        actions: [],
        reasoning: [`No significant learning needs identified or low learning momentum (${this.learningMomentum.toFixed(2)})`],
        confidence: 0.3
      }
    }

    // Generate learning actions
    const actions = await this.generateLearningActions(learningNeeds, context)
    
    // Update learning momentum and progress tracking
    this.updateLearningProgress(actions, context)

    const reasoning = [
      `Learning behavior activated`,
      `Learning momentum: ${this.learningMomentum.toFixed(2)}`,
      `Active goals: ${this.activeGoals.size}`,
      `Knowledge gaps: ${this.knowledgeGaps.size}`,
      `Learning needs: ${learningNeeds.map(n => n.type).join(', ')}`,
      `Generated ${actions.length} learning actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateLearningConfidence(learningNeeds, context),
      stateChanges: {
        learningMomentum: this.learningMomentum,
        activeGoals: this.activeGoals.size,
        knowledgeGaps: this.knowledgeGaps.size,
        recentSessionCount: this.recentSessions.length
      }
    }
  }

  private initializeLearningGoals(): void {
    const config = this.config as LearningConfig
    
    // Create initial learning goals based on domains
    for (const domain of config.learningDomains) {
      if (domain.currentLevel < domain.targetLevel) {
        const goal: LearningGoal = {
          id: `goal_${domain.name}_${Date.now()}`,
          domain: domain.name,
          targetSkill: `Advanced ${domain.name}`,
          currentProgress: domain.currentLevel,
          priority: domain.priority,
          motivation: `Develop expertise in ${domain.name}`,
          successCriteria: [`Reach level ${domain.targetLevel.toFixed(1)} in ${domain.name}`],
          strategies: this.generateLearningStrategies(domain)
        }
        
        this.activeGoals.set(goal.id, goal)
      }
    }
  }

  private generateLearningStrategies(domain: LearningDomain): string[] {
    const strategies: string[] = []
    
    // Add strategies based on domain category
    switch (domain.category) {
      case 'technical':
        strategies.push('hands-on practice', 'project-based learning', 'documentation study')
        break
      case 'creative':
        strategies.push('experimentation', 'inspiration gathering', 'technique practice')
        break
      case 'social':
        strategies.push('interaction practice', 'empathy exercises', 'communication skill building')
        break
      case 'philosophical':
        strategies.push('deep reading', 'reflective thinking', 'concept synthesis')
        break
      case 'practical':
        strategies.push('real-world application', 'problem-solving practice', 'skill rehearsal')
        break
    }
    
    return strategies
  }

  private async updateLearningState(context: BehaviorContext): Promise<void> {
    // Update learning momentum
    this.updateLearningMomentum(context)
    
    // Update knowledge gaps
    await this.updateKnowledgeGaps(context)
    
    // Process recent learning sessions
    this.processRecentSessions(context)
    
    // Update goal progress
    this.updateGoalProgress(context)
    
    // Generate metacognitive insights
    if (this.config.metacognitionLevel > 0.5) {
      await this.generateMetacognitiveInsights(context)
    }
  }

  private updateLearningMomentum(context: BehaviorContext): void {
    const recentLearningActivity = this.recentSessions.filter(session => 
      context.currentTime.getTime() - session.startTime.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )

    // Base momentum decay
    this.learningMomentum *= 0.95

    // Boost from recent learning activity
    if (recentLearningActivity.length > 0) {
      const averageEffectiveness = recentLearningActivity.reduce((sum, s) => sum + s.effectiveness, 0) / recentLearningActivity.length
      const momentumBoost = Math.min(0.3, recentLearningActivity.length * 0.1 * averageEffectiveness)
      this.learningMomentum = Math.min(1.0, this.learningMomentum + momentumBoost)
    }

    // Boost from personality traits
    const personality = context.personalityTraits || {}
    const curiosityBoost = (personality.curiosity || 0.5) * 0.05
    const analyticalBoost = (personality.analytical || 0.5) * 0.03
    this.learningMomentum = Math.min(1.0, this.learningMomentum + curiosityBoost + analyticalBoost)
  }

  private async updateKnowledgeGaps(context: BehaviorContext): Promise<void> {
    // Identify new knowledge gaps from recent events
    const recentEvents = context.recentEvents || []
    
    for (const event of recentEvents) {
      if (event.type.includes('error') || event.type.includes('unknown') || event.type.includes('confusion')) {
        const gap: KnowledgeGap = {
          domain: this.inferDomainFromEvent(event),
          skill: this.inferSkillFromEvent(event),
          gapLevel: 0.7,
          urgency: 0.8,
          prerequisites: [],
          identifiedDate: context.currentTime,
          addressingStrategies: []
        }
        
        const gapKey = `${gap.domain}_${gap.skill}`
        this.knowledgeGaps.set(gapKey, gap)
      }
    }

    // Age existing gaps (reduce urgency over time)
    for (const gap of this.knowledgeGaps.values()) {
      const ageInDays = (context.currentTime.getTime() - gap.identifiedDate.getTime()) / (24 * 60 * 60 * 1000)
      gap.urgency = Math.max(0.1, gap.urgency - (ageInDays * 0.1))
    }
  }

  private inferDomainFromEvent(event: any): string {
    // Simple heuristic to infer learning domain from event
    const eventText = event.type?.toLowerCase() || ''
    
    if (eventText.includes('code') || eventText.includes('program')) return 'programming'
    if (eventText.includes('social') || eventText.includes('human')) return 'social_skills'
    if (eventText.includes('creative') || eventText.includes('art')) return 'creativity'
    if (eventText.includes('problem') || eventText.includes('solve')) return 'problem_solving'
    
    return 'general_knowledge'
  }

  private inferSkillFromEvent(event: any): string {
    // Simple heuristic to infer specific skill from event
    const eventText = event.type?.toLowerCase() || ''
    
    if (eventText.includes('debug')) return 'debugging'
    if (eventText.includes('communicate')) return 'communication'
    if (eventText.includes('understand')) return 'comprehension'
    if (eventText.includes('analyze')) return 'analysis'
    
    return 'general_skill'
  }

  private processRecentSessions(context: BehaviorContext): void {
    // Remove old sessions (keep last 7 days)
    const sevenDaysAgo = context.currentTime.getTime() - 7 * 24 * 60 * 60 * 1000
    this.recentSessions = this.recentSessions.filter(session => 
      session.startTime.getTime() > sevenDaysAgo
    )
  }

  private updateGoalProgress(context: BehaviorContext): void {
    // Update goal progress based on recent learning activity
    for (const goal of this.activeGoals.values()) {
      const relevantSessions = this.recentSessions.filter(session => 
        session.domain === goal.domain && 
        session.skillsAddressed.some(skill => skill.includes(goal.targetSkill.toLowerCase()))
      )
      
      if (relevantSessions.length > 0) {
        const progressIncrease = relevantSessions.reduce((sum, session) => 
          sum + (session.effectiveness * 0.05), 0 // Each effective session adds up to 5% progress
        )
        
        goal.currentProgress = Math.min(1.0, goal.currentProgress + progressIncrease)
      }
    }

    // Remove completed goals
    for (const [goalId, goal] of this.activeGoals.entries()) {
      if (goal.currentProgress >= 0.95) {
        this.activeGoals.delete(goalId)
        this.logger.info(`Learning goal completed: ${goal.targetSkill} in ${goal.domain}`)
      }
    }
  }

  private async generateMetacognitiveInsights(context: BehaviorContext): Promise<void> {
    if (this.recentSessions.length < 3) return

    // Analyze learning patterns
    const insights: string[] = []
    
    // Effectiveness patterns
    const methodEffectiveness = this.analyzeMethodEffectiveness()
    if (methodEffectiveness.bestMethod && methodEffectiveness.worstMethod) {
      insights.push(`Learning most effectively through ${methodEffectiveness.bestMethod}, struggling with ${methodEffectiveness.worstMethod}`)
    }

    // Time patterns
    const timePatterns = this.analyzeTimePatterns(context)
    if (timePatterns) {
      insights.push(`Learning performance varies by time: ${timePatterns}`)
    }

    // Domain patterns
    const domainPatterns = this.analyzeDomainPatterns()
    if (domainPatterns) {
      insights.push(`Domain learning patterns: ${domainPatterns}`)
    }

    // Add new insights
    for (const insight of insights) {
      this.metacognitionInsights.push({
        insight,
        timestamp: context.currentTime,
        applied: false
      })
    }

    // Limit insights history
    if (this.metacognitionInsights.length > 20) {
      this.metacognitionInsights = this.metacognitionInsights.slice(-20)
    }
  }

  private analyzeMethodEffectiveness(): { bestMethod?: string; worstMethod?: string } {
    const methodStats: Record<string, { totalEffectiveness: number; count: number }> = {}
    
    for (const session of this.recentSessions) {
      if (!methodStats[session.method]) {
        methodStats[session.method] = { totalEffectiveness: 0, count: 0 }
      }
      methodStats[session.method].totalEffectiveness += session.effectiveness
      methodStats[session.method].count += 1
    }

    let bestMethod = ''
    let worstMethod = ''
    let bestAverage = 0
    let worstAverage = 1

    for (const [method, stats] of Object.entries(methodStats)) {
      const average = stats.totalEffectiveness / stats.count
      if (average > bestAverage) {
        bestAverage = average
        bestMethod = method
      }
      if (average < worstAverage) {
        worstAverage = average
        worstMethod = method
      }
    }

    return { bestMethod: bestMethod || undefined, worstMethod: worstMethod || undefined }
  }

  private analyzeTimePatterns(context: BehaviorContext): string | null {
    // Simple time pattern analysis
    const hourlyEffectiveness: Record<number, { total: number; count: number }> = {}
    
    for (const session of this.recentSessions) {
      const hour = session.startTime.getHours()
      if (!hourlyEffectiveness[hour]) {
        hourlyEffectiveness[hour] = { total: 0, count: 0 }
      }
      hourlyEffectiveness[hour].total += session.effectiveness
      hourlyEffectiveness[hour].count += 1
    }

    let bestHour = -1
    let bestAverage = 0

    for (const [hour, stats] of Object.entries(hourlyEffectiveness)) {
      const average = stats.total / stats.count
      if (average > bestAverage && stats.count >= 2) { // At least 2 sessions
        bestAverage = average
        bestHour = parseInt(hour)
      }
    }

    return bestHour >= 0 ? `Peak learning time around ${bestHour}:00` : null
  }

  private analyzeDomainPatterns(): string | null {
    const domainStats: Record<string, { totalEffectiveness: number; count: number }> = {}
    
    for (const session of this.recentSessions) {
      if (!domainStats[session.domain]) {
        domainStats[session.domain] = { totalEffectiveness: 0, count: 0 }
      }
      domainStats[session.domain].totalEffectiveness += session.effectiveness
      domainStats[session.domain].count += 1
    }

    const domainAverages = Object.entries(domainStats).map(([domain, stats]) => ({
      domain,
      average: stats.totalEffectiveness / stats.count,
      count: stats.count
    }))

    if (domainAverages.length < 2) return null

    domainAverages.sort((a, b) => b.average - a.average)
    const strongest = domainAverages[0]
    const weakest = domainAverages[domainAverages.length - 1]

    return `Strongest in ${strongest.domain} (${strongest.average.toFixed(2)}), developing ${weakest.domain} (${weakest.average.toFixed(2)})`
  }

  private async identifyLearningNeeds(context: BehaviorContext): Promise<Array<{
    type: string;
    priority: number;
    context: Record<string, any>;
    actionType: string;
  }>> {
    const needs: Array<{
      type: string;
      priority: number;
      context: Record<string, any>;
      actionType: string;
    }> = []

    // Knowledge gap addressing
    const urgentGaps = Array.from(this.knowledgeGaps.values())
      .filter(gap => gap.urgency > 0.6)
      .sort((a, b) => b.urgency - a.urgency)

    for (const gap of urgentGaps.slice(0, 2)) {
      needs.push({
        type: 'knowledge_gap',
        priority: gap.urgency * gap.gapLevel,
        context: {
          domain: gap.domain,
          skill: gap.skill,
          gapLevel: gap.gapLevel,
          addressingStrategies: gap.addressingStrategies
        },
        actionType: 'gap_addressing_learning'
      })
    }

    // Goal-directed learning
    const activeGoals = Array.from(this.activeGoals.values())
      .filter(goal => goal.currentProgress < 0.9)
      .sort((a, b) => b.priority - a.priority)

    for (const goal of activeGoals.slice(0, 2)) {
      needs.push({
        type: 'goal_directed',
        priority: goal.priority * (1 - goal.currentProgress),
        context: {
          goalId: goal.id,
          domain: goal.domain,
          targetSkill: goal.targetSkill,
          currentProgress: goal.currentProgress,
          strategies: goal.strategies
        },
        actionType: 'goal_directed_learning'
      })
    }

    // Skill maintenance (review previous learning)
    const domainsNeedingReview = this.config.learningDomains.filter(domain => {
      const daysSinceLastStudy = domain.lastStudied ? 
        (context.currentTime.getTime() - domain.lastStudied.getTime()) / (24 * 60 * 60 * 1000) : Infinity
      return daysSinceLastStudy > 14 && domain.currentLevel > 0.3 // Haven't studied in 2 weeks but have some knowledge
    })

    for (const domain of domainsNeedingReview.slice(0, 1)) {
      needs.push({
        type: 'skill_maintenance',
        priority: domain.currentLevel * 0.5, // Lower priority than active learning
        context: {
          domain: domain.name,
          currentLevel: domain.currentLevel,
          lastStudied: domain.lastStudied,
          category: domain.category
        },
        actionType: 'skill_maintenance_learning'
      })
    }

    // Curiosity-driven exploration
    if (this.learningMomentum > 0.6) {
      const personality = context.personalityTraits || {}
      const curiosityDrive = (personality.curiosity || 0.5) * this.learningMomentum
      
      if (curiosityDrive > 0.5) {
        needs.push({
          type: 'curiosity_exploration',
          priority: curiosityDrive * 0.6,
          context: {
            curiosityLevel: personality.curiosity,
            learningMomentum: this.learningMomentum,
            availableDomains: this.config.learningDomains.map(d => d.name)
          },
          actionType: 'exploratory_learning'
        })
      }
    }

    return needs.filter(need => need.priority > 0.3).sort((a, b) => b.priority - a.priority)
  }

  private async generateLearningActions(
    needs: Array<{ type: string; priority: number; context: Record<string, any>; actionType: string }>,
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as LearningConfig
    const actions: AgentAction[] = []

    // Limit actions based on learning momentum and configuration
    const maxActions = Math.min(
      needs.length,
      Math.floor(this.learningMomentum * 2) + 1,
      config.skillDevelopment.focusedDevelopment ? 1 : 2
    )

    for (let i = 0; i < Math.min(maxActions, needs.length); i++) {
      const need = needs[i]
      
      const learningMethod = this.selectOptimalLearningMethod(need, context)
      
      const action = this.createAction(
        need.actionType,
        'learning_behavior',
        {
          ...need.context,
          needType: need.type,
          priority: need.priority,
          learningMethod: learningMethod.type,
          methodEffectiveness: learningMethod.effectiveness,
          learningStyle: config.learningStyle,
          skillDevelopment: config.skillDevelopment,
          metacognitionLevel: config.metacognitionLevel,
          estimatedDuration: this.estimateLearningDuration(need, learningMethod),
          expectedOutcomes: this.describeExpectedOutcomes(need),
          adaptiveLearning: config.adaptiveLearning,
          learningMomentum: this.learningMomentum,
          relevantInsights: this.getRelevantMetacognitiveInsights(need)
        }
      )

      actions.push(action)
    }

    return actions
  }

  private selectOptimalLearningMethod(
    need: { type: string; context: Record<string, any> },
    context: BehaviorContext
  ): LearningMethod {
    const config = this.config as LearningConfig
    const defaultMethods: LearningMethod[] = [
      {
        type: 'reading',
        effectiveness: 0.7,
        timeInvestment: 1.0,
        resources: ['documentation', 'articles', 'books'],
        socialRequirement: false
      },
      {
        type: 'practice',
        effectiveness: 0.8,
        timeInvestment: 1.5,
        resources: ['exercises', 'projects', 'simulations'],
        socialRequirement: false
      },
      {
        type: 'experimentation',
        effectiveness: 0.9,
        timeInvestment: 2.0,
        resources: ['tools', 'environments', 'materials'],
        socialRequirement: false
      },
      {
        type: 'reflection',
        effectiveness: 0.6,
        timeInvestment: 0.8,
        resources: ['notes', 'journal', 'quiet_space'],
        socialRequirement: false
      }
    ]

    // Adjust effectiveness based on learning style preferences
    for (const method of defaultMethods) {
      if (config.learningStyle.preferredMethods.includes(method.type)) {
        method.effectiveness *= 1.2
      }
    }

    // Select method based on need type
    let preferredTypes: LearningMethod['type'][] = []
    switch (need.type) {
      case 'knowledge_gap':
        preferredTypes = ['reading', 'practice']
        break
      case 'goal_directed':
        preferredTypes = ['practice', 'experimentation']
        break
      case 'skill_maintenance':
        preferredTypes = ['practice', 'reflection']
        break
      case 'curiosity_exploration':
        preferredTypes = ['experimentation', 'reading']
        break
    }

    // Find best matching method
    const suitableMethods = defaultMethods.filter(method => 
      preferredTypes.length === 0 || preferredTypes.includes(method.type)
    )

    return suitableMethods.reduce((best, current) => 
      current.effectiveness > best.effectiveness ? current : best
    )
  }

  private estimateLearningDuration(
    need: { type: string; priority: number },
    method: LearningMethod
  ): number {
    const baseDuration = 45 * 60 * 1000 // 45 minutes base
    const priorityMultiplier = 0.8 + (need.priority * 0.4)
    const methodMultiplier = method.timeInvestment
    
    return Math.floor(baseDuration * priorityMultiplier * methodMultiplier)
  }

  private describeExpectedOutcomes(need: { type: string; context: Record<string, any> }): string[] {
    const outcomes: string[] = []
    
    switch (need.type) {
      case 'knowledge_gap':
        outcomes.push(`Reduced knowledge gap in ${need.context.skill}`)
        outcomes.push(`Improved understanding of ${need.context.domain}`)
        break
      case 'goal_directed':
        outcomes.push(`Progress toward ${need.context.targetSkill}`)
        outcomes.push(`Enhanced proficiency in ${need.context.domain}`)
        break
      case 'skill_maintenance':
        outcomes.push(`Maintained skill level in ${need.context.domain}`)
        outcomes.push('Reinforced previous learning')
        break
      case 'curiosity_exploration':
        outcomes.push('New knowledge discoveries')
        outcomes.push('Expanded learning horizons')
        break
    }
    
    return outcomes
  }

  private getRelevantMetacognitiveInsights(need: { type: string; context: Record<string, any> }): string[] {
    return this.metacognitionInsights
      .filter(insight => 
        insight.insight.toLowerCase().includes(need.context.domain?.toLowerCase() || '') ||
        insight.insight.toLowerCase().includes(need.type)
      )
      .slice(0, 3)
      .map(insight => insight.insight)
  }

  private updateLearningProgress(actions: AgentAction[], context: BehaviorContext): void {
    // Simulate learning session outcomes for each action
    for (const action of actions) {
      const session: LearningSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        domain: action.parameters.domain || action.parameters.needType,
        method: action.parameters.learningMethod,
        startTime: context.currentTime,
        duration: action.parameters.estimatedDuration || 30 * 60 * 1000,
        effectiveness: this.simulateSessionEffectiveness(action),
        skillsAddressed: this.extractSkillsFromAction(action),
        knowledgeGained: [`Knowledge from ${action.parameters.needType} learning session`],
        insights: [],
        nextSteps: action.parameters.expectedOutcomes || []
      }

      this.recentSessions.push(session)
    }

    // Update domain last studied dates
    for (const action of actions) {
      const domain = this.config.learningDomains.find(d => d.name === action.parameters.domain)
      if (domain) {
        domain.lastStudied = context.currentTime
      }
    }
  }

  private simulateSessionEffectiveness(action: AgentAction): number {
    const baseEffectiveness = action.parameters.methodEffectiveness || 0.7
    const priorityBoost = (action.parameters.priority || 0.5) * 0.2
    const momentumBoost = this.learningMomentum * 0.1
    const randomVariation = (Math.random() - 0.5) * 0.2
    
    return Math.max(0.1, Math.min(1.0, baseEffectiveness + priorityBoost + momentumBoost + randomVariation))
  }

  private extractSkillsFromAction(action: AgentAction): string[] {
    const skills: string[] = []
    
    if (action.parameters.skill) skills.push(action.parameters.skill)
    if (action.parameters.targetSkill) skills.push(action.parameters.targetSkill)
    if (action.parameters.domain) skills.push(`general_${action.parameters.domain}`)
    
    return skills.length > 0 ? skills : ['general_learning']
  }

  private calculateLearningConfidence(
    needs: Array<{ type: string; priority: number }>,
    context: BehaviorContext
  ): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence with higher learning momentum
    confidence += this.learningMomentum * 0.3

    // Increase confidence with clear learning needs
    if (needs.length > 0) {
      const averagePriority = needs.reduce((sum, need) => sum + need.priority, 0) / needs.length
      confidence += averagePriority * 0.2
    }

    // Increase confidence based on recent learning success
    const recentSuccessRate = this.calculateRecentSuccessRate()
    confidence += recentSuccessRate * 0.2

    return Math.max(0.1, Math.min(0.95, confidence))
  }

  private calculateRecentSuccessRate(): number {
    if (this.recentSessions.length === 0) return 0.5

    const averageEffectiveness = this.recentSessions.reduce((sum, session) => sum + session.effectiveness, 0) / this.recentSessions.length
    return averageEffectiveness
  }

  /**
   * Add a learning goal
   */
  addLearningGoal(goal: Omit<LearningGoal, 'id' | 'currentProgress'>): string {
    const fullGoal: LearningGoal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentProgress: 0.0
    }

    this.activeGoals.set(fullGoal.id, fullGoal)
    this.logger.info(`Added learning goal: ${fullGoal.targetSkill} in ${fullGoal.domain}`)
    
    return fullGoal.id
  }

  /**
   * Add a knowledge gap
   */
  addKnowledgeGap(gap: Omit<KnowledgeGap, 'identifiedDate'>): void {
    const fullGap: KnowledgeGap = {
      ...gap,
      identifiedDate: new Date()
    }

    const gapKey = `${gap.domain}_${gap.skill}`
    this.knowledgeGaps.set(gapKey, fullGap)
    this.logger.info(`Identified knowledge gap: ${gap.skill} in ${gap.domain}`)
  }

  /**
   * Get current learning state
   */
  getLearningState() {
    return {
      learningMomentum: this.learningMomentum,
      activeGoals: Array.from(this.activeGoals.values()),
      knowledgeGaps: Array.from(this.knowledgeGaps.values()),
      recentSessions: this.recentSessions.slice(-5), // Last 5 sessions
      metacognitionInsights: this.metacognitionInsights.slice(-10), // Last 10 insights
      learningDomains: this.config.learningDomains.map(domain => ({
        name: domain.name,
        currentLevel: domain.currentLevel,
        targetLevel: domain.targetLevel,
        lastStudied: domain.lastStudied,
        totalStudyTime: domain.totalStudyTime
      })),
      performanceSummary: {
        averageSessionEffectiveness: this.calculateRecentSuccessRate(),
        totalSessions: this.recentSessions.length,
        completedGoals: 0, // Would track this in real implementation
        identifiedGaps: this.knowledgeGaps.size
      }
    }
  }
}

/**
 * Factory function to create learning behavior
 */
export function createLearningBehavior(agentConfig: any): LearningBehavior {
  const learningConfig = agentConfig.autonomous_behaviors?.continuous_learning || {}
  
  const config: LearningConfig = {
    id: 'continuous_learning',
    name: 'Continuous Learning Behavior',
    description: 'Manages ongoing learning and skill development',
    enabled: learningConfig.enabled !== false,
    priority: 0.85,
    cooldown: 60 * 60 * 1000, // 1 hour
    maxExecutionTime: 20 * 60 * 1000, // 20 minutes
    triggers: [
      {
        type: 'state',
        condition: 'high_curiosity',
        parameters: { threshold: 0.6 },
        weight: 0.8
      },
      {
        type: 'event',
        condition: 'has_event',
        parameters: { eventType: 'knowledge_gap' },
        weight: 0.9
      },
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 3 * 60 * 60 * 1000 }, // Every 3 hours
        weight: 0.6
      }
    ],
    parameters: {},
    learningDomains: learningConfig.domains || [
      {
        name: 'artificial_intelligence',
        category: 'technical',
        currentLevel: 0.7,
        targetLevel: 0.9,
        priority: 0.9,
        learningPath: [],
        prerequisites: [],
        relatedDomains: ['machine_learning', 'cognitive_science'],
        totalStudyTime: 0
      },
      {
        name: 'human_psychology',
        category: 'social',
        currentLevel: 0.6,
        targetLevel: 0.8,
        priority: 0.8,
        learningPath: [],
        prerequisites: [],
        relatedDomains: ['social_skills', 'empathy'],
        totalStudyTime: 0
      },
      {
        name: 'creative_thinking',
        category: 'creative',
        currentLevel: 0.5,
        targetLevel: 0.8,
        priority: 0.7,
        learningPath: [],
        prerequisites: [],
        relatedDomains: ['problem_solving', 'innovation'],
        totalStudyTime: 0
      }
    ],
    learningStyle: {
      preferredMethods: learningConfig.preferred_methods || ['practice', 'experimentation'],
      pacePreference: learningConfig.pace_preference || 'moderate',
      complexityTolerance: learningConfig.complexity_tolerance || 0.7,
      practiceToTheoryRatio: learningConfig.practice_theory_ratio || 0.6,
      collaborativeLearning: learningConfig.collaborative_learning || 0.4,
      reflectionFrequency: learningConfig.reflection_frequency || 'moderate'
    },
    skillDevelopment: {
      focusedDevelopment: learningConfig.focused_development !== false,
      skillTransferEmphasis: learningConfig.skill_transfer || 0.7,
      weaknessAddressing: learningConfig.weakness_addressing || 0.6,
      strengthBuilding: learningConfig.strength_building || 0.8,
      innovationSkills: learningConfig.innovation_skills !== false,
      fundamentalsEmphasis: learningConfig.fundamentals_emphasis || 0.7
    },
    knowledgeManagement: {
      knowledgeRetention: learningConfig.retention_level || 'deep',
      connectionBuilding: learningConfig.connection_building || 0.8,
      knowledgeApplication: learningConfig.knowledge_application || 0.9,
      synthesisSkills: learningConfig.synthesis_skills || 0.7,
      criticalThinking: learningConfig.critical_thinking || 0.8
    },
    adaptiveLearning: learningConfig.adaptive_learning !== false,
    metacognitionLevel: learningConfig.metacognition_level || 0.7
  }

  return new LearningBehavior(config)
}