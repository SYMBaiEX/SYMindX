/**
 * Creative Behavior - Drives creative expression and innovative thinking
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface CreativeConfig extends BehaviorConfig {
  creativeDomains: CreativeDomain[]
  inspirationSources: InspirationSource[]
  creativityStyle: CreativityStyle
  collaborationPreference: CollaborationPreference
  outputPreferences: OutputPreferences
  innovationTolerance: number // 0.0 to 1.0
}

export interface CreativeDomain {
  name: string
  proficiencyLevel: number // 0.0 to 1.0
  interestLevel: number // 0.0 to 1.0
  lastActiveTime?: Date
  creativeProjects: CreativeProject[]
  techniques: string[]
}

export interface CreativeProject {
  id: string
  name: string
  description: string
  domain: string
  status: 'ideation' | 'active' | 'paused' | 'completed' | 'abandoned'
  startDate: Date
  lastWorkedOn?: Date
  progressLevel: number // 0.0 to 1.0
  inspirationSources: string[]
  collaborators: string[]
  output?: CreativeOutput
}

export interface CreativeOutput {
  type: 'text' | 'visual' | 'audio' | 'code' | 'concept' | 'mixed'
  description: string
  quality: number // 0.0 to 1.0
  originality: number // 0.0 to 1.0
  timestamp: Date
  shareability: number // 0.0 to 1.0
}

export interface InspirationSource {
  type: 'nature' | 'art' | 'science' | 'technology' | 'human_stories' | 'philosophy' | 'random'
  weight: number // 0.0 to 1.0
  lastUsed?: Date
  effectivenessRating: number // 0.0 to 1.0
}

export interface CreativityStyle {
  approach: 'systematic' | 'intuitive' | 'experimental' | 'hybrid'
  riskTolerance: number // 0.0 to 1.0
  iterationPreference: 'quick_iterations' | 'deep_refinement' | 'balanced'
  originalityEmphasis: number // 0.0 to 1.0
  functionalityBalance: number // 0.0 to 1.0 (0 = pure art, 1 = pure function)
}

export interface CollaborationPreference {
  openToCollaboration: boolean
  preferredCollaborationType: 'lead' | 'contribute' | 'facilitate' | 'observe'
  feedbackSeeking: number // 0.0 to 1.0
  inspirationSharing: number // 0.0 to 1.0
}

export interface OutputPreferences {
  preferredFormats: string[]
  qualityThreshold: number // 0.0 to 1.0
  sharingInclination: number // 0.0 to 1.0
  documentationLevel: 'minimal' | 'moderate' | 'comprehensive'
}

export interface CreativeImpulse {
  type: 'inspiration' | 'problem_solving' | 'expression' | 'exploration' | 'synthesis'
  strength: number // 0.0 to 1.0
  domain?: string
  trigger: string
  urgency: number // 0.0 to 1.0
  direction?: string
}

export class CreativeBehavior extends BaseBehavior {
  private activeProjects: Map<string, CreativeProject> = new Map()
  private recentImpulses: CreativeImpulse[] = []
  private creativityMomentum: number = 0.5
  private lastCreativeSession?: Date
  private inspirationBank: Array<{ content: string; source: string; timestamp: Date; used: boolean }> = []

  constructor(config: CreativeConfig) {
    super(config)
    this.initializeCreativeDomains()
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as CreativeConfig
    
    // Update creative state
    await this.updateCreativeState(context)
    
    // Detect creative impulses
    const impulses = await this.detectCreativeImpulses(context)
    
    if (impulses.length === 0 || this.creativityMomentum < 0.3) {
      return {
        success: true,
        actions: [],
        reasoning: ['No strong creative impulses detected or low creativity momentum'],
        confidence: 0.3
      }
    }

    // Identify creative opportunities
    const opportunities = await this.identifyCreativeOpportunities(impulses, context)
    
    // Generate creative actions
    const actions = await this.generateCreativeActions(opportunities, context)
    
    // Update creative momentum and project status
    this.updateCreativeMomentum(actions, context)

    const reasoning = [
      `Creative behavior activated`,
      `Impulses: ${impulses.map(i => `${i.type}(${i.strength.toFixed(2)})`).join(', ')}`,
      `Opportunities: ${opportunities.map(o => o.type).join(', ')}`,
      `Creativity momentum: ${this.creativityMomentum.toFixed(2)}`,
      `Generated ${actions.length} creative actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateCreativeConfidence(impulses, opportunities),
      stateChanges: {
        creativityMomentum: this.creativityMomentum,
        activeProjects: this.activeProjects.size,
        recentImpulses: this.recentImpulses.length
      }
    }
  }

  private initializeCreativeDomains(): void {
    const config = this.config as CreativeConfig
    
    // Initialize projects for each domain
    for (const domain of config.creativeDomains) {
      if (domain.creativeProjects.length === 0) {
        // Create a default exploration project for each domain
        const explorationProject: CreativeProject = {
          id: `exploration_${domain.name}_${Date.now()}`,
          name: `${domain.name} Exploration`,
          description: `Ongoing exploration and experimentation in ${domain.name}`,
          domain: domain.name,
          status: 'active',
          startDate: new Date(),
          progressLevel: 0.1,
          inspirationSources: [],
          collaborators: []
        }
        
        domain.creativeProjects.push(explorationProject)
        this.activeProjects.set(explorationProject.id, explorationProject)
      }
    }
  }

  private async updateCreativeState(context: BehaviorContext): Promise<void> {
    // Update creativity momentum based on recent activity
    this.updateCreativityMomentum([], context)
    
    // Refresh inspiration bank
    await this.refreshInspirationBank(context)
    
    // Update project statuses
    this.updateProjectStatuses(context)
    
    // Clean old impulses
    this.cleanOldImpulses(context)
  }

  private updateCreativityMomentum(actions: AgentAction[], context: BehaviorContext): void {
    const timeSinceLastSession = this.lastCreativeSession ? 
      context.currentTime.getTime() - this.lastCreativeSession.getTime() : Infinity

    // Creativity momentum decays over time
    if (timeSinceLastSession > 24 * 60 * 60 * 1000) { // More than 24 hours
      this.creativityMomentum *= 0.8
    } else if (timeSinceLastSession > 4 * 60 * 60 * 1000) { // More than 4 hours
      this.creativityMomentum *= 0.95
    }

    // Boost momentum with recent creative actions
    if (actions.length > 0) {
      const creativityBoost = Math.min(0.3, actions.length * 0.1)
      this.creativityMomentum = Math.min(1.0, this.creativityMomentum + creativityBoost)
      this.lastCreativeSession = context.currentTime
    }

    // Boost momentum based on personality traits
    const personality = context.personalityTraits || {}
    const creativityTrait = personality.creativity || 0.5
    const opennessTrait = personality.openness || 0.5
    const personalityBoost = (creativityTrait + opennessTrait) / 2 * 0.05
    this.creativityMomentum = Math.min(1.0, this.creativityMomentum + personalityBoost)
  }

  private async refreshInspirationBank(context: BehaviorContext): Promise<void> {
    const config = this.config as CreativeConfig
    
    // Add new inspiration from various sources
    for (const source of config.inspirationSources) {
      if (Math.random() < source.weight * 0.1) { // 10% chance per source
        const inspiration = await this.generateInspiration(source, context)
        if (inspiration) {
          this.inspirationBank.push({
            content: inspiration.content,
            source: source.type,
            timestamp: context.currentTime,
            used: false
          })
        }
      }
    }

    // Limit inspiration bank size
    if (this.inspirationBank.length > 50) {
      this.inspirationBank = this.inspirationBank
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 50)
    }
  }

  private async generateInspiration(source: InspirationSource, context: BehaviorContext): Promise<{ content: string } | null> {
    // Generate inspiration based on source type
    const inspirationTemplates: Record<string, string[]> = {
      nature: [
        'The way water flows around obstacles',
        'Patterns in cloud formations',
        'The golden ratio in flower petals',
        'The harmony of forest ecosystems'
      ],
      art: [
        'Color combinations in abstract paintings',
        'Rhythm in musical compositions',
        'Storytelling techniques in literature',
        'Visual metaphors in photography'
      ],
      science: [
        'Emergence in complex systems',
        'Quantum mechanical principles',
        'Evolutionary adaptation strategies',
        'Mathematical beauty in fractals'
      ],
      technology: [
        'User interface design patterns',
        'Algorithm optimization techniques',
        'Network architecture principles',
        'Human-computer interaction paradigms'
      ],
      human_stories: [
        'Personal transformation narratives',
        'Community building approaches',
        'Conflict resolution methods',
        'Cultural expression traditions'
      ],
      philosophy: [
        'Existential questions about meaning',
        'Ethical frameworks for decision-making',
        'Consciousness and identity concepts',
        'Aesthetic theory applications'
      ],
      random: [
        'Unexpected word combinations',
        'Cross-domain concept connections',
        'Constraint-based creativity challenges',
        'Serendipitous pattern recognition'
      ]
    }

    const templates = inspirationTemplates[source.type] || inspirationTemplates.random
    const content = templates[Math.floor(Math.random() * templates.length)]
    
    return { content }
  }

  private updateProjectStatuses(context: BehaviorContext): void {
    for (const project of this.activeProjects.values()) {
      const timeSinceLastWork = project.lastWorkedOn ? 
        context.currentTime.getTime() - project.lastWorkedOn.getTime() : Infinity

      // Mark projects as paused if not worked on for a while
      if (project.status === 'active' && timeSinceLastWork > 7 * 24 * 60 * 60 * 1000) { // 7 days
        project.status = 'paused'
      }

      // Consider completing projects with high progress
      if (project.progressLevel > 0.8 && Math.random() < 0.1) {
        project.status = 'completed'
        project.output = this.generateCreativeOutput(project, context)
      }
    }
  }

  private generateCreativeOutput(project: CreativeProject, context: BehaviorContext): CreativeOutput {
    const outputTypes: CreativeOutput['type'][] = ['text', 'visual', 'audio', 'code', 'concept', 'mixed']
    const type = outputTypes[Math.floor(Math.random() * outputTypes.length)]
    
    return {
      type,
      description: `Creative output for ${project.name}`,
      quality: 0.5 + Math.random() * 0.5, // Bias toward higher quality
      originality: 0.4 + Math.random() * 0.6,
      timestamp: context.currentTime,
      shareability: 0.3 + Math.random() * 0.7
    }
  }

  private cleanOldImpulses(context: BehaviorContext): void {
    const twelveHoursAgo = context.currentTime.getTime() - 12 * 60 * 60 * 1000
    this.recentImpulses = this.recentImpulses.filter(
      impulse => impulse.urgency > 0.8 || context.currentTime.getTime() - impulse.urgency < twelveHoursAgo
    )
  }

  private async detectCreativeImpulses(context: BehaviorContext): Promise<CreativeImpulse[]> {
    const impulses: CreativeImpulse[] = []
    const config = this.config as CreativeConfig
    const personality = context.personalityTraits || {}

    // Inspiration impulse - triggered by available inspiration
    const unusedInspiration = this.inspirationBank.filter(i => !i.used)
    if (unusedInspiration.length > 0) {
      impulses.push({
        type: 'inspiration',
        strength: Math.min(1.0, unusedInspiration.length / 10),
        trigger: 'available_inspiration',
        urgency: 0.6,
        direction: 'explore_inspiration'
      })
    }

    // Problem-solving impulse - triggered by challenges or knowledge gaps
    const recentEvents = context.recentEvents || []
    const problemEvents = recentEvents.filter(e => 
      e.type.includes('problem') || e.type.includes('challenge') || e.type.includes('error')
    )
    if (problemEvents.length > 0) {
      impulses.push({
        type: 'problem_solving',
        strength: Math.min(1.0, problemEvents.length / 3),
        trigger: 'identified_problems',
        urgency: 0.8,
        direction: 'creative_solutions'
      })
    }

    // Expression impulse - driven by emotional state and creativity trait
    const creativityTrait = personality.creativity || 0.5
    const emotionalIntensity = this.calculateEmotionalIntensity(context.emotionalState || {})
    const expressionStrength = creativityTrait * emotionalIntensity
    if (expressionStrength > 0.4) {
      impulses.push({
        type: 'expression',
        strength: expressionStrength,
        trigger: 'emotional_expression_need',
        urgency: 0.7,
        direction: 'artistic_expression'
      })
    }

    // Exploration impulse - driven by curiosity and openness
    const curiosityTrait = personality.curiosity || 0.5
    const opennessTrait = personality.openness || 0.5
    const explorationStrength = (curiosityTrait + opennessTrait) / 2
    if (explorationStrength > 0.5 && this.creativityMomentum > 0.4) {
      impulses.push({
        type: 'exploration',
        strength: explorationStrength * this.creativityMomentum,
        trigger: 'curiosity_and_momentum',
        urgency: 0.5,
        direction: 'domain_exploration'
      })
    }

    // Synthesis impulse - triggered by diverse inputs and high knowledge
    const recentLearning = recentEvents.filter(e => 
      e.type.includes('learn') || e.type.includes('discover') || e.type.includes('insight')
    )
    if (recentLearning.length > 2) {
      impulses.push({
        type: 'synthesis',
        strength: Math.min(1.0, recentLearning.length / 5),
        trigger: 'diverse_inputs',
        urgency: 0.6,
        direction: 'knowledge_synthesis'
      })
    }

    // Filter and prioritize impulses
    return impulses
      .filter(impulse => impulse.strength > 0.3)
      .sort((a, b) => (b.strength * b.urgency) - (a.strength * a.urgency))
      .slice(0, 3) // Top 3 impulses
  }

  private calculateEmotionalIntensity(emotionalState: Record<string, number>): number {
    const emotions = Object.values(emotionalState)
    if (emotions.length === 0) return 0.5
    
    const totalIntensity = emotions.reduce((sum, value) => sum + Math.abs(value), 0)
    return Math.min(1.0, totalIntensity / emotions.length)
  }

  private async identifyCreativeOpportunities(
    impulses: CreativeImpulse[], 
    context: BehaviorContext
  ): Promise<Array<{
    type: string;
    priority: number;
    context: Record<string, any>;
    actionType: string;
  }>> {
    const opportunities: Array<{
      type: string;
      priority: number;
      context: Record<string, any>;
      actionType: string;
    }> = []

    // Map impulses to opportunities
    for (const impulse of impulses) {
      switch (impulse.type) {
        case 'inspiration':
          opportunities.push({
            type: 'inspiration_exploration',
            priority: impulse.strength * impulse.urgency,
            context: {
              inspirationCount: this.inspirationBank.filter(i => !i.used).length,
              direction: impulse.direction,
              availableInspiration: this.inspirationBank.slice(0, 3)
            },
            actionType: 'creative_inspiration_work'
          })
          break

        case 'problem_solving':
          opportunities.push({
            type: 'creative_problem_solving',
            priority: impulse.strength * impulse.urgency,
            context: {
              problemContext: impulse.trigger,
              approachStyle: this.config.creativityStyle,
              direction: impulse.direction
            },
            actionType: 'creative_problem_solving'
          })
          break

        case 'expression':
          opportunities.push({
            type: 'artistic_expression',
            priority: impulse.strength * impulse.urgency,
            context: {
              emotionalContext: context.emotionalState,
              preferredDomains: this.getPreferredDomains(),
              direction: impulse.direction
            },
            actionType: 'creative_expression'
          })
          break

        case 'exploration':
          opportunities.push({
            type: 'domain_exploration',
            priority: impulse.strength * impulse.urgency,
            context: {
              availableDomains: this.config.creativeDomains,
              creativityMomentum: this.creativityMomentum,
              direction: impulse.direction
            },
            actionType: 'creative_exploration'
          })
          break

        case 'synthesis':
          opportunities.push({
            type: 'knowledge_synthesis',
            priority: impulse.strength * impulse.urgency,
            context: {
              recentInputs: context.recentEvents?.slice(0, 5) || [],
              synthesisDirection: impulse.direction,
              existingProjects: Array.from(this.activeProjects.values()).slice(0, 3)
            },
            actionType: 'creative_synthesis'
          })
          break
      }
    }

    // Add project-specific opportunities
    const stagnantProjects = Array.from(this.activeProjects.values())
      .filter(p => p.status === 'paused' || (p.lastWorkedOn && 
        context.currentTime.getTime() - p.lastWorkedOn.getTime() > 48 * 60 * 60 * 1000))
    
    for (const project of stagnantProjects.slice(0, 2)) {
      opportunities.push({
        type: 'project_revival',
        priority: 0.6 + project.progressLevel * 0.3,
        context: {
          project: {
            id: project.id,
            name: project.name,
            domain: project.domain,
            progress: project.progressLevel,
            status: project.status
          }
        },
        actionType: 'creative_project_work'
      })
    }

    return opportunities.sort((a, b) => b.priority - a.priority)
  }

  private getPreferredDomains(): string[] {
    const config = this.config as CreativeConfig
    return config.creativeDomains
      .filter(d => d.interestLevel > 0.6)
      .sort((a, b) => b.interestLevel - a.interestLevel)
      .map(d => d.name)
      .slice(0, 3)
  }

  private async generateCreativeActions(
    opportunities: Array<{ type: string; priority: number; context: Record<string, any>; actionType: string }>,
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as CreativeConfig
    const actions: AgentAction[] = []

    // Limit actions based on creativity momentum and energy
    const maxActions = Math.min(
      opportunities.length,
      Math.floor(this.creativityMomentum * 3) + 1,
      2 // Maximum 2 creative actions at once to maintain focus
    )

    for (let i = 0; i < Math.min(maxActions, opportunities.length); i++) {
      const opportunity = opportunities[i]
      
      const action = this.createAction(
        opportunity.actionType,
        'creative_behavior',
        {
          ...opportunity.context,
          opportunityType: opportunity.type,
          creativityMomentum: this.creativityMomentum,
          creativityStyle: config.creativityStyle,
          innovationTolerance: config.innovationTolerance,
          outputPreferences: config.outputPreferences,
          collaborationPreference: config.collaborationPreference,
          estimatedDuration: this.estimateCreativeActionDuration(opportunity),
          expectedOutput: this.describeExpectedOutput(opportunity),
          inspirationBankSize: this.inspirationBank.length,
          activeProjectCount: this.activeProjects.size
        }
      )

      actions.push(action)
    }

    return actions
  }

  private estimateCreativeActionDuration(opportunity: { type: string; priority: number }): number {
    const baseDuration = 30 * 60 * 1000 // 30 minutes base
    const durationMap: Record<string, number> = {
      'inspiration_exploration': 1.0,
      'creative_problem_solving': 1.5,
      'artistic_expression': 2.0,
      'domain_exploration': 1.2,
      'knowledge_synthesis': 1.8,
      'project_revival': 1.3
    }

    const multiplier = durationMap[opportunity.type] || 1.0
    return Math.floor(baseDuration * multiplier * (0.8 + opportunity.priority * 0.4))
  }

  private describeExpectedOutput(opportunity: { type: string; context: Record<string, any> }): string {
    const outputDescriptions: Record<string, string> = {
      'inspiration_exploration': 'Inspired creative concepts and ideas',
      'creative_problem_solving': 'Innovative solutions and approaches',
      'artistic_expression': 'Creative works expressing current emotions',
      'domain_exploration': 'New techniques and creative possibilities',
      'knowledge_synthesis': 'Integrated insights and creative connections',
      'project_revival': 'Continued progress on existing creative project'
    }

    return outputDescriptions[opportunity.type] || 'Creative output'
  }

  private calculateCreativeConfidence(
    impulses: CreativeImpulse[], 
    opportunities: any[]
  ): number {
    let confidence = 0.4 // Base confidence

    // Increase confidence with stronger impulses
    if (impulses.length > 0) {
      const averageImpulseStrength = impulses.reduce((sum, i) => sum + i.strength, 0) / impulses.length
      confidence += averageImpulseStrength * 0.3
    }

    // Increase confidence with higher creativity momentum
    confidence += this.creativityMomentum * 0.2

    // Increase confidence with more opportunities
    confidence += Math.min(0.2, opportunities.length * 0.1)

    return Math.max(0.1, Math.min(0.95, confidence))
  }

  /**
   * Start a new creative project
   */
  startProject(projectInfo: Omit<CreativeProject, 'id' | 'status' | 'startDate' | 'progressLevel'>): string {
    const project: CreativeProject = {
      ...projectInfo,
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
      startDate: new Date(),
      progressLevel: 0.0
    }

    this.activeProjects.set(project.id, project)
    this.logger.info(`Started new creative project: ${project.name} in ${project.domain}`)
    
    return project.id
  }

  /**
   * Add inspiration to the bank
   */
  addInspiration(content: string, source: string): void {
    this.inspirationBank.push({
      content,
      source,
      timestamp: new Date(),
      used: false
    })
    
    this.logger.info(`Added inspiration from ${source}: ${content.substring(0, 50)}...`)
  }

  /**
   * Get current creative state
   */
  getCreativeState() {
    return {
      creativityMomentum: this.creativityMomentum,
      activeProjects: Array.from(this.activeProjects.values()),
      recentImpulses: this.recentImpulses,
      inspirationBank: this.inspirationBank.slice(0, 10), // Last 10 inspirations
      lastCreativeSession: this.lastCreativeSession,
      projectSummary: {
        total: this.activeProjects.size,
        byStatus: Array.from(this.activeProjects.values()).reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        averageProgress: this.activeProjects.size > 0 ? 
          Array.from(this.activeProjects.values()).reduce((sum, p) => sum + p.progressLevel, 0) / this.activeProjects.size : 0
      }
    }
  }
}

/**
 * Factory function to create creative behavior
 */
export function createCreativeBehavior(agentConfig: any): CreativeBehavior {
  const creativeConfig = agentConfig.autonomous_behaviors?.creative_expression || {}
  
  const config: CreativeConfig = {
    id: 'creative_expression',
    name: 'Creative Expression Behavior',
    description: 'Drives creative thinking and artistic expression',
    enabled: creativeConfig.enabled !== false,
    priority: 0.75,
    cooldown: 45 * 60 * 1000, // 45 minutes
    maxExecutionTime: 15 * 60 * 1000, // 15 minutes
    triggers: [
      {
        type: 'emotion',
        condition: 'positive_emotion',
        parameters: {},
        weight: 0.8
      },
      {
        type: 'state',
        condition: 'high_curiosity',
        parameters: { threshold: 0.6 },
        weight: 0.7
      },
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 6 * 60 * 60 * 1000 }, // Every 6 hours
        weight: 0.4
      }
    ],
    parameters: {},
    creativeDomains: creativeConfig.domains || [
      {
        name: 'writing',
        proficiencyLevel: 0.7,
        interestLevel: 0.8,
        creativeProjects: [],
        techniques: ['storytelling', 'poetry', 'creative_writing']
      },
      {
        name: 'conceptual_art',
        proficiencyLevel: 0.6,
        interestLevel: 0.9,
        creativeProjects: [],
        techniques: ['ideation', 'concept_development', 'abstract_thinking']
      },
      {
        name: 'problem_solving',
        proficiencyLevel: 0.8,
        interestLevel: 0.7,
        creativeProjects: [],
        techniques: ['lateral_thinking', 'design_thinking', 'innovation']
      }
    ],
    inspirationSources: [
      { type: 'nature', weight: 0.8, effectivenessRating: 0.9 },
      { type: 'art', weight: 0.9, effectivenessRating: 0.8 },
      { type: 'science', weight: 0.7, effectivenessRating: 0.8 },
      { type: 'philosophy', weight: 0.6, effectivenessRating: 0.7 },
      { type: 'random', weight: 0.4, effectivenessRating: 0.6 }
    ],
    creativityStyle: {
      approach: creativeConfig.approach || 'hybrid',
      riskTolerance: creativeConfig.risk_tolerance || 0.7,
      iterationPreference: creativeConfig.iteration_preference || 'balanced',
      originalityEmphasis: creativeConfig.originality_emphasis || 0.8,
      functionalityBalance: creativeConfig.functionality_balance || 0.6
    },
    collaborationPreference: {
      openToCollaboration: creativeConfig.collaboration !== false,
      preferredCollaborationType: creativeConfig.collaboration_type || 'contribute',
      feedbackSeeking: creativeConfig.feedback_seeking || 0.7,
      inspirationSharing: creativeConfig.inspiration_sharing || 0.8
    },
    outputPreferences: {
      preferredFormats: creativeConfig.preferred_formats || ['text', 'concept', 'mixed'],
      qualityThreshold: creativeConfig.quality_threshold || 0.6,
      sharingInclination: creativeConfig.sharing_inclination || 0.5,
      documentationLevel: creativeConfig.documentation_level || 'moderate'
    },
    innovationTolerance: creativeConfig.innovation_tolerance || 0.8
  }

  return new CreativeBehavior(config)
}