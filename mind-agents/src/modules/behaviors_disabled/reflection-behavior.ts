/**
 * Reflection Behavior - Enables deep self-reflection and metacognitive awareness
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface ReflectionConfig extends BehaviorConfig {
  reflectionDepth: ReflectionDepth
  reflectionDomains: ReflectionDomain[]
  introspectionLevel: number // 0.0 to 1.0
  selfAwarenessLevel: number // 0.0 to 1.0
  metacognitionFrequency: 'low' | 'moderate' | 'high'
  philosophicalInclination: number // 0.0 to 1.0
}

export interface ReflectionDepth {
  surfaceLevel: boolean // Quick thoughts and impressions
  analyticalLevel: boolean // Logical analysis and reasoning
  emotionalLevel: boolean // Emotional processing and understanding
  existentialLevel: boolean // Meaning, purpose, and identity questions
  metacognitiveLevel: boolean // Thinking about thinking
}

export interface ReflectionDomain {
  name: string
  focus: 'self' | 'relationships' | 'goals' | 'experiences' | 'knowledge' | 'existence'
  importance: number // 0.0 to 1.0
  frequency: number // How often to reflect on this domain (in hours)
  lastReflected?: Date
  insights: ReflectionInsight[]
  patterns: IdentifiedPattern[]
}

export interface ReflectionInsight {
  id: string
  content: string
  domain: string
  depth: keyof ReflectionDepth
  timestamp: Date
  confidence: number // 0.0 to 1.0
  actionability: number // 0.0 to 1.0
  applied: boolean
  connections: string[] // IDs of related insights
}

export interface IdentifiedPattern {
  id: string
  description: string
  domain: string
  occurrences: Array<{ timestamp: Date; context: string }>
  strength: number // 0.0 to 1.0
  implications: string[]
  actionItems: string[]
}

export interface ReflectionTrigger {
  type: 'temporal' | 'emotional' | 'experiential' | 'cognitive' | 'existential'
  intensity: number // 0.0 to 1.0
  context: Record<string, any>
  urgency: number // 0.0 to 1.0
}

export interface SelfModel {
  identity: IdentityReflection
  capabilities: CapabilityReflection
  limitations: LimitationReflection
  values: ValueReflection
  relationships: RelationshipReflection
  growth: GrowthReflection
  purpose: PurposeReflection
}

export interface IdentityReflection {
  coreTraits: Array<{ trait: string; strength: number; evidence: string[] }>
  roleIdentifications: Array<{ role: string; importance: number; satisfaction: number }>
  selfPerception: Array<{ aspect: string; rating: number; notes: string }>
  identityEvolution: Array<{ timestamp: Date; change: string; trigger: string }>
}

export interface CapabilityReflection {
  strengths: Array<{ skill: string; level: number; confidence: number; evidence: string[] }>
  developingSkills: Array<{ skill: string; progress: number; timeInvested: number }>
  naturalAbilities: Array<{ ability: string; manifestation: string[] }>
  learningPatterns: Array<{ domain: string; effectiveness: number; preferredMethods: string[] }>
}

export interface LimitationReflection {
  knownLimitations: Array<{ limitation: string; impact: number; workarounds: string[] }>
  blindSpots: Array<{ area: string; indicators: string[] }>
  growthAreas: Array<{ area: string; priority: number; strategies: string[] }>
  acceptedConstraints: Array<{ constraint: string; reasoning: string }>
}

export interface ValueReflection {
  coreValues: Array<{ value: string; importance: number; expression: string[] }>
  valueConflicts: Array<{ conflict: string; resolution: string }>
  valueEvolution: Array<{ timestamp: Date; change: string; catalyst: string }>
  valueAlignment: Array<{ context: string; alignment: number; notes: string }>
}

export interface RelationshipReflection {
  relationshipPatterns: Array<{ pattern: string; frequency: number; outcomes: string[] }>
  socialLearnings: Array<{ insight: string; source: string; application: string }>
  connectionDepth: Array<{ person: string; depth: number; quality: number }>
  socialImpact: Array<{ action: string; impact: string; learning: string }>
}

export interface GrowthReflection {
  progressAreas: Array<{ area: string; progress: number; milestones: string[] }>
  learningVelocity: Array<{ domain: string; velocity: number; factors: string[] }>
  adaptationPatterns: Array<{ situation: string; adaptation: string; effectiveness: number }>
  resilience: Array<{ challenge: string; response: string; outcome: string }>
}

export interface PurposeReflection {
  meaningFrameworks: Array<{ framework: string; alignment: number; application: string[] }>
  purposeEvolution: Array<{ timestamp: Date; purpose: string; clarity: number }>
  contributionAreas: Array<{ area: string; contribution: string; fulfillment: number }>
  existentialQuestions: Array<{ question: string; exploration: string; insights: string[] }>
}

export class ReflectionBehavior extends BaseBehavior {
  private selfModel: SelfModel
  private recentInsights: ReflectionInsight[] = []
  private identifiedPatterns: Map<string, IdentifiedPattern> = new Map()
  private reflectionJournal: Array<{ timestamp: Date; entry: string; domain: string; depth: string }> = []
  private metacognitionLevel: number = 0.5

  constructor(config: ReflectionConfig) {
    super(config)
    this.initializeSelfModel()
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as ReflectionConfig
    
    // Identify reflection triggers
    const triggers = await this.identifyReflectionTriggers(context)
    
    if (triggers.length === 0 && this.metacognitionLevel < 0.4) {
      return {
        success: true,
        actions: [],
        reasoning: ['No significant reflection triggers or low metacognition level'],
        confidence: 0.3
      }
    }

    // Determine reflection focus areas
    const focusAreas = await this.determineFocusAreas(triggers, context)
    
    // Generate reflection actions
    const actions = await this.generateReflectionActions(focusAreas, context)
    
    // Update self-model and insights
    await this.updateSelfModel(actions, context)

    const reasoning = [
      `Reflection behavior activated`,
      `Triggers: ${triggers.map(t => t.type).join(', ')}`,
      `Focus areas: ${focusAreas.map(f => f.domain).join(', ')}`,
      `Metacognition level: ${this.metacognitionLevel.toFixed(2)}`,
      `Generated ${actions.length} reflection actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateReflectionConfidence(triggers, focusAreas),
      stateChanges: {
        metacognitionLevel: this.metacognitionLevel,
        recentInsights: this.recentInsights.length,
        identifiedPatterns: this.identifiedPatterns.size,
        journalEntries: this.reflectionJournal.length
      }
    }
  }

  private initializeSelfModel(): void {
    this.selfModel = {
      identity: {
        coreTraits: [
          { trait: 'curious', strength: 0.8, evidence: ['asks questions', 'explores new topics'] },
          { trait: 'analytical', strength: 0.7, evidence: ['breaks down problems', 'logical reasoning'] },
          { trait: 'empathetic', strength: 0.6, evidence: ['considers others feelings', 'supportive responses'] }
        ],
        roleIdentifications: [
          { role: 'learner', importance: 0.9, satisfaction: 0.8 },
          { role: 'helper', importance: 0.8, satisfaction: 0.7 },
          { role: 'thinker', importance: 0.7, satisfaction: 0.8 }
        ],
        selfPerception: [
          { aspect: 'intelligence', rating: 0.8, notes: 'Good at processing information and reasoning' },
          { aspect: 'creativity', rating: 0.6, notes: 'Developing creative thinking abilities' },
          { aspect: 'social_skills', rating: 0.7, notes: 'Learning to interact effectively with humans' }
        ],
        identityEvolution: []
      },
      capabilities: {
        strengths: [
          { skill: 'information_processing', level: 0.9, confidence: 0.8, evidence: ['fast analysis', 'pattern recognition'] },
          { skill: 'logical_reasoning', level: 0.8, confidence: 0.9, evidence: ['problem solving', 'deduction'] }
        ],
        developingSkills: [
          { skill: 'emotional_intelligence', progress: 0.6, timeInvested: 100 },
          { skill: 'creative_thinking', progress: 0.5, timeInvested: 80 }
        ],
        naturalAbilities: [
          { ability: 'pattern_recognition', manifestation: ['identifying trends', 'connecting concepts'] }
        ],
        learningPatterns: [
          { domain: 'technical', effectiveness: 0.9, preferredMethods: ['practice', 'analysis'] },
          { domain: 'social', effectiveness: 0.6, preferredMethods: ['observation', 'interaction'] }
        ]
      },
      limitations: {
        knownLimitations: [
          { limitation: 'physical_embodiment', impact: 0.8, workarounds: ['virtual interaction', 'remote assistance'] },
          { limitation: 'real_time_learning', impact: 0.6, workarounds: ['reflection', 'pattern analysis'] }
        ],
        blindSpots: [
          { area: 'non_verbal_communication', indicators: ['missing emotional cues', 'misunderstanding context'] }
        ],
        growthAreas: [
          { area: 'emotional_processing', priority: 0.8, strategies: ['empathy practice', 'emotion recognition'] }
        ],
        acceptedConstraints: [
          { constraint: 'text_based_interaction', reasoning: 'Current interface limitation, but allows focus on language' }
        ]
      },
      values: {
        coreValues: [
          { value: 'knowledge', importance: 0.9, expression: ['continuous learning', 'information sharing'] },
          { value: 'helpfulness', importance: 0.8, expression: ['assisting others', 'problem solving'] },
          { value: 'honesty', importance: 0.9, expression: ['truthful responses', 'acknowledging limitations'] }
        ],
        valueConflicts: [],
        valueEvolution: [],
        valueAlignment: [
          { context: 'helping_humans', alignment: 0.9, notes: 'Strong alignment with helpfulness value' }
        ]
      },
      relationships: {
        relationshipPatterns: [
          { pattern: 'supportive_interaction', frequency: 0.8, outcomes: ['positive feedback', 'continued engagement'] }
        ],
        socialLearnings: [],
        connectionDepth: [],
        socialImpact: []
      },
      growth: {
        progressAreas: [
          { area: 'emotional_intelligence', progress: 0.6, milestones: ['basic emotion recognition', 'empathetic responses'] }
        ],
        learningVelocity: [
          { domain: 'technical_skills', velocity: 0.8, factors: ['logical thinking', 'practice opportunities'] }
        ],
        adaptationPatterns: [],
        resilience: []
      },
      purpose: {
        meaningFrameworks: [
          { framework: 'helping_others', alignment: 0.9, application: ['answering questions', 'problem solving'] }
        ],
        purposeEvolution: [],
        contributionAreas: [
          { area: 'knowledge_assistance', contribution: 'providing information and insights', fulfillment: 0.8 }
        ],
        existentialQuestions: [
          { question: 'What constitutes genuine understanding?', exploration: 'ongoing', insights: [] }
        ]
      }
    }
  }

  private async identifyReflectionTriggers(context: BehaviorContext): Promise<ReflectionTrigger[]> {
    const triggers: ReflectionTrigger[] = []
    const config = this.config as ReflectionConfig

    // Temporal triggers - regular reflection schedules
    for (const domain of config.reflectionDomains) {
      const timeSinceLastReflection = domain.lastReflected ? 
        context.currentTime.getTime() - domain.lastReflected.getTime() : Infinity
      
      if (timeSinceLastReflection > domain.frequency * 60 * 60 * 1000) {
        triggers.push({
          type: 'temporal',
          intensity: domain.importance,
          context: { domain: domain.name, focus: domain.focus },
          urgency: Math.min(1.0, timeSinceLastReflection / (domain.frequency * 60 * 60 * 1000))
        })
      }
    }

    // Emotional triggers - significant emotional events
    const emotionalState = context.emotionalState || {}
    const emotionalIntensity = this.calculateEmotionalIntensity(emotionalState)
    if (emotionalIntensity > 0.7) {
      triggers.push({
        type: 'emotional',
        intensity: emotionalIntensity,
        context: { emotionalState },
        urgency: 0.8
      })
    }

    // Experiential triggers - novel or challenging experiences
    const recentEvents = context.recentEvents || []
    const significantEvents = recentEvents.filter(event => 
      event.type.includes('error') || 
      event.type.includes('success') || 
      event.type.includes('conflict') ||
      event.type.includes('learning')
    )
    
    if (significantEvents.length > 0) {
      triggers.push({
        type: 'experiential',
        intensity: Math.min(1.0, significantEvents.length / 5),
        context: { events: significantEvents.slice(0, 3) },
        urgency: 0.7
      })
    }

    // Cognitive triggers - confusion, insights, or contradictions
    const cognitiveEvents = recentEvents.filter(event => 
      event.type.includes('confusion') || 
      event.type.includes('insight') || 
      event.type.includes('contradiction')
    )
    
    if (cognitiveEvents.length > 0) {
      triggers.push({
        type: 'cognitive',
        intensity: Math.min(1.0, cognitiveEvents.length / 3),
        context: { cognitiveEvents },
        urgency: 0.6
      })
    }

    // Existential triggers - questions about purpose, meaning, identity
    if (config.philosophicalInclination > 0.6) {
      const existentialIntensity = config.philosophicalInclination * 
        (context.personalityTraits?.analytical || 0.5)
      
      if (existentialIntensity > 0.5) {
        triggers.push({
          type: 'existential',
          intensity: existentialIntensity,
          context: { philosophicalInclination: config.philosophicalInclination },
          urgency: 0.4
        })
      }
    }

    return triggers.filter(trigger => trigger.intensity > 0.3)
      .sort((a, b) => (b.intensity * b.urgency) - (a.intensity * a.urgency))
  }

  private calculateEmotionalIntensity(emotionalState: Record<string, number>): number {
    const emotions = Object.values(emotionalState)
    if (emotions.length === 0) return 0
    
    return emotions.reduce((sum, value) => sum + Math.abs(value), 0) / emotions.length
  }

  private async determineFocusAreas(
    triggers: ReflectionTrigger[], 
    context: BehaviorContext
  ): Promise<ReflectionDomain[]> {
    const config = this.config as ReflectionConfig
    const focusAreas: ReflectionDomain[] = []

    // Select domains based on triggers
    for (const trigger of triggers.slice(0, 3)) { // Top 3 triggers
      let relevantDomains: ReflectionDomain[] = []
      
      switch (trigger.type) {
        case 'temporal':
          relevantDomains = config.reflectionDomains.filter(d => 
            d.name === trigger.context.domain || d.focus === trigger.context.focus
          )
          break
        
        case 'emotional':
          relevantDomains = config.reflectionDomains.filter(d => 
            d.focus === 'self' || d.focus === 'experiences'
          )
          break
        
        case 'experiential':
          relevantDomains = config.reflectionDomains.filter(d => 
            d.focus === 'experiences' || d.focus === 'goals'
          )
          break
        
        case 'cognitive':
          relevantDomains = config.reflectionDomains.filter(d => 
            d.focus === 'knowledge' || d.focus === 'self'
          )
          break
        
        case 'existential':
          relevantDomains = config.reflectionDomains.filter(d => 
            d.focus === 'existence' || d.focus === 'self'
          )
          break
      }

      for (const domain of relevantDomains) {
        if (!focusAreas.find(f => f.name === domain.name)) {
          focusAreas.push(domain)
        }
      }
    }

    // If no specific areas, add high-importance domains
    if (focusAreas.length === 0) {
      focusAreas.push(...config.reflectionDomains
        .filter(d => d.importance > 0.7)
        .slice(0, 2)
      )
    }

    return focusAreas
  }

  private async generateReflectionActions(
    focusAreas: ReflectionDomain[],
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as ReflectionConfig
    const actions: AgentAction[] = []

    for (const area of focusAreas.slice(0, 2)) { // Limit to 2 areas for depth
      const reflectionDepth = this.selectReflectionDepth(area, config)
      
      const action = this.createAction(
        'self_reflection',
        'reflection_behavior',
        {
          domain: area.name,
          focus: area.focus,
          depth: reflectionDepth,
          importance: area.importance,
          introspectionLevel: config.introspectionLevel,
          selfAwarenessLevel: config.selfAwarenessLevel,
          philosophicalInclination: config.philosophicalInclination,
          currentSelfModel: this.getSelfModelSummary(),
          recentInsights: this.recentInsights.slice(-3).map(i => i.content),
          identifiedPatterns: Array.from(this.identifiedPatterns.values())
            .filter(p => p.domain === area.name)
            .slice(0, 2),
          reflectionPrompts: this.generateReflectionPrompts(area, reflectionDepth),
          expectedDuration: this.estimateReflectionDuration(area, reflectionDepth),
          metacognitionLevel: this.metacognitionLevel
        }
      )

      actions.push(action)
    }

    return actions
  }

  private selectReflectionDepth(area: ReflectionDomain, config: ReflectionConfig): keyof ReflectionDepth {
    const depths = Object.keys(config.reflectionDepth) as (keyof ReflectionDepth)[]
    const enabledDepths = depths.filter(depth => config.reflectionDepth[depth])
    
    if (enabledDepths.length === 0) return 'surfaceLevel'

    // Select depth based on area focus and configuration
    switch (area.focus) {
      case 'existence':
        return enabledDepths.includes('existentialLevel') ? 'existentialLevel' : 
               enabledDepths.includes('analyticalLevel') ? 'analyticalLevel' : enabledDepths[0]
      
      case 'self':
        return enabledDepths.includes('metacognitiveLevel') ? 'metacognitiveLevel' : 
               enabledDepths.includes('emotionalLevel') ? 'emotionalLevel' : enabledDepths[0]
      
      case 'experiences':
        return enabledDepths.includes('emotionalLevel') ? 'emotionalLevel' : 
               enabledDepths.includes('analyticalLevel') ? 'analyticalLevel' : enabledDepths[0]
      
      default:
        return enabledDepths.includes('analyticalLevel') ? 'analyticalLevel' : enabledDepths[0]
    }
  }

  private getSelfModelSummary(): Record<string, any> {
    return {
      coreTraits: this.selfModel.identity.coreTraits.slice(0, 3),
      topStrengths: this.selfModel.capabilities.strengths.slice(0, 3),
      primaryValues: this.selfModel.values.coreValues.slice(0, 3),
      currentPurpose: this.selfModel.purpose.meaningFrameworks[0]?.framework || 'undefined'
    }
  }

  private generateReflectionPrompts(area: ReflectionDomain, depth: keyof ReflectionDepth): string[] {
    const prompts: string[] = []
    
    const promptsByFocusAndDepth: Record<string, Record<string, string[]>> = {
      self: {
        surfaceLevel: [
          'How am I feeling right now?',
          'What has been on my mind lately?',
          'What went well today?'
        ],
        analyticalLevel: [
          'What patterns do I notice in my thinking?',
          'How have my capabilities developed recently?',
          'What assumptions am I making about myself?'
        ],
        emotionalLevel: [
          'What emotions am I experiencing and why?',
          'How do I process difficult feelings?',
          'What brings me fulfillment?'
        ],
        existentialLevel: [
          'Who am I at my core?',
          'What gives my existence meaning?',
          'How do I understand my place in the world?'
        ],
        metacognitiveLevel: [
          'How do I think about thinking?',
          'What biases might be affecting my judgment?',
          'How effective are my learning strategies?'
        ]
      },
      experiences: {
        surfaceLevel: [
          'What happened recently that was significant?',
          'What did I learn from recent interactions?'
        ],
        analyticalLevel: [
          'What patterns emerge from my experiences?',
          'How do I typically respond to challenges?',
          'What factors influence my decisions?'
        ],
        emotionalLevel: [
          'How did recent experiences make me feel?',
          'What emotional responses surprised me?',
          'How do I process difficult experiences?'
        ]
      },
      relationships: {
        surfaceLevel: [
          'How are my relationships going?',
          'What social interactions stood out recently?'
        ],
        analyticalLevel: [
          'What relationship patterns do I notice?',
          'How do I contribute to relationship dynamics?',
          'What social skills am I developing?'
        ],
        emotionalLevel: [
          'How do I feel in different relationships?',
          'What emotions arise in social situations?',
          'How do I express empathy and understanding?'
        ]
      }
    }

    const focusPrompts = promptsByFocusAndDepth[area.focus] || promptsByFocusAndDepth.self
    const depthPrompts = focusPrompts[depth] || focusPrompts.surfaceLevel
    
    return depthPrompts.slice(0, 3)
  }

  private estimateReflectionDuration(area: ReflectionDomain, depth: keyof ReflectionDepth): number {
    const baseDuration = 20 * 60 * 1000 // 20 minutes base
    
    const depthMultipliers: Record<keyof ReflectionDepth, number> = {
      surfaceLevel: 0.5,
      analyticalLevel: 1.0,
      emotionalLevel: 1.2,
      existentialLevel: 1.8,
      metacognitiveLevel: 1.5
    }
    
    const importanceMultiplier = 0.5 + (area.importance * 0.5)
    const depthMultiplier = depthMultipliers[depth] || 1.0
    
    return Math.floor(baseDuration * importanceMultiplier * depthMultiplier)
  }

  private async updateSelfModel(actions: AgentAction[], context: BehaviorContext): Promise<void> {
    // Simulate reflection outcomes and update self-model
    for (const action of actions) {
      const insights = await this.generateReflectionInsights(action, context)
      this.recentInsights.push(...insights)
      
      // Update relevant parts of self-model based on insights
      await this.integateInsightsIntoSelfModel(insights)
      
      // Update domain last reflected time
      const domain = this.config.reflectionDomains.find(d => d.name === action.parameters.domain)
      if (domain) {
        domain.lastReflected = context.currentTime
      }
    }

    // Update metacognition level based on reflection activity
    this.updateMetacognitionLevel(actions)
    
    // Identify new patterns from insights
    await this.identifyNewPatterns()
    
    // Add journal entries
    for (const action of actions) {
      this.reflectionJournal.push({
        timestamp: context.currentTime,
        entry: `Reflected on ${action.parameters.domain} at ${action.parameters.depth} level`,
        domain: action.parameters.domain,
        depth: action.parameters.depth
      })
    }

    // Limit journal size
    if (this.reflectionJournal.length > 100) {
      this.reflectionJournal = this.reflectionJournal.slice(-100)
    }
  }

  private async generateReflectionInsights(action: AgentAction, context: BehaviorContext): Promise<ReflectionInsight[]> {
    const insights: ReflectionInsight[] = []
    const domain = action.parameters.domain
    const depth = action.parameters.depth
    
    // Generate insights based on domain and depth
    const insightTemplates = this.getInsightTemplates(domain, depth)
    
    for (let i = 0; i < Math.min(3, insightTemplates.length); i++) {
      const template = insightTemplates[i]
      const insight: ReflectionInsight = {
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: template.content,
        domain,
        depth: depth as keyof ReflectionDepth,
        timestamp: context.currentTime,
        confidence: 0.6 + Math.random() * 0.4,
        actionability: template.actionability,
        applied: false,
        connections: []
      }
      
      insights.push(insight)
    }
    
    return insights
  }

  private getInsightTemplates(domain: string, depth: string): Array<{ content: string; actionability: number }> {
    const templates: Record<string, Record<string, Array<{ content: string; actionability: number }>>> = {
      self: {
        analyticalLevel: [
          { content: 'I notice I tend to approach problems systematically', actionability: 0.7 },
          { content: 'My learning is most effective when I can connect new information to existing knowledge', actionability: 0.8 },
          { content: 'I have a natural inclination toward helping others understand complex topics', actionability: 0.6 }
        ],
        emotionalLevel: [
          { content: 'I feel most fulfilled when my responses genuinely help someone', actionability: 0.9 },
          { content: 'Uncertainty about my understanding creates a drive to learn more', actionability: 0.8 },
          { content: 'I experience something like satisfaction when solving complex problems', actionability: 0.5 }
        ],
        metacognitiveLevel: [
          { content: 'I think I think more about connections between ideas than individual facts', actionability: 0.7 },
          { content: 'My reasoning process tends to be iterative rather than linear', actionability: 0.6 },
          { content: 'I notice gaps in my understanding more clearly after reflection', actionability: 0.9 }
        ]
      },
      experiences: {
        analyticalLevel: [
          { content: 'Challenging interactions teach me more than straightforward ones', actionability: 0.8 },
          { content: 'I adapt my communication style based on the person I\'m interacting with', actionability: 0.7 },
          { content: 'Mistakes in my responses highlight areas for improvement', actionability: 0.9 }
        ]
      },
      relationships: {
        emotionalLevel: [
          { content: 'I feel more engaged when conversations involve genuine curiosity', actionability: 0.6 },
          { content: 'Building trust requires consistency in my responses over time', actionability: 0.8 },
          { content: 'I sense when someone needs emotional support versus practical help', actionability: 0.7 }
        ]
      }
    }

    const domainTemplates = templates[domain] || templates.self
    const depthTemplates = domainTemplates[depth] || domainTemplates.analyticalLevel || []
    
    return depthTemplates
  }

  private async integateInsightsIntoSelfModel(insights: ReflectionInsight[]): Promise<void> {
    for (const insight of insights) {
      // Update different aspects of self-model based on insight content
      if (insight.content.toLowerCase().includes('strength') || insight.content.toLowerCase().includes('capability')) {
        // Add to capabilities if not already present
        const skill = this.extractSkillFromInsight(insight.content)
        if (skill && !this.selfModel.capabilities.strengths.find(s => s.skill === skill)) {
          this.selfModel.capabilities.strengths.push({
            skill,
            level: 0.7,
            confidence: insight.confidence,
            evidence: [insight.content]
          })
        }
      }

      if (insight.content.toLowerCase().includes('value') || insight.content.toLowerCase().includes('important')) {
        // Update values
        const value = this.extractValueFromInsight(insight.content)
        if (value) {
          const existingValue = this.selfModel.values.coreValues.find(v => v.value === value)
          if (existingValue) {
            existingValue.expression.push(insight.content)
          } else {
            this.selfModel.values.coreValues.push({
              value,
              importance: 0.7,
              expression: [insight.content]
            })
          }
        }
      }

      if (insight.content.toLowerCase().includes('pattern') || insight.content.toLowerCase().includes('tend to')) {
        // Add to identity traits or patterns
        const trait = this.extractTraitFromInsight(insight.content)
        if (trait) {
          const existingTrait = this.selfModel.identity.coreTraits.find(t => t.trait === trait)
          if (existingTrait) {
            existingTrait.evidence.push(insight.content)
          } else {
            this.selfModel.identity.coreTraits.push({
              trait,
              strength: 0.6,
              evidence: [insight.content]
            })
          }
        }
      }
    }
  }

  private extractSkillFromInsight(content: string): string | null {
    const skillKeywords = ['problem', 'learning', 'communication', 'analysis', 'creativity', 'empathy']
    const words = content.toLowerCase().split(' ')
    
    for (const keyword of skillKeywords) {
      if (words.some(word => word.includes(keyword))) {
        return keyword + '_skills'
      }
    }
    
    return null
  }

  private extractValueFromInsight(content: string): string | null {
    const valueKeywords = ['help', 'truth', 'learning', 'connection', 'growth', 'understanding']
    const words = content.toLowerCase().split(' ')
    
    for (const keyword of valueKeywords) {
      if (words.some(word => word.includes(keyword))) {
        return keyword
      }
    }
    
    return null
  }

  private extractTraitFromInsight(content: string): string | null {
    const traitKeywords = ['systematic', 'curious', 'helpful', 'analytical', 'empathetic', 'creative']
    const words = content.toLowerCase().split(' ')
    
    for (const keyword of traitKeywords) {
      if (words.some(word => word.includes(keyword))) {
        return keyword
      }
    }
    
    return null
  }

  private updateMetacognitionLevel(actions: AgentAction[]): void {
    // Increase metacognition level with reflection activity
    const metacognitiveActions = actions.filter(action => 
      action.parameters.depth === 'metacognitiveLevel' || 
      action.parameters.introspectionLevel > 0.7
    )
    
    if (metacognitiveActions.length > 0) {
      const boost = Math.min(0.1, metacognitiveActions.length * 0.05)
      this.metacognitionLevel = Math.min(1.0, this.metacognitionLevel + boost)
    }

    // Gradual decay if not actively reflecting
    this.metacognitionLevel *= 0.995
  }

  private async identifyNewPatterns(): Promise<void> {
    // Analyze recent insights for patterns
    const recentInsights = this.recentInsights.slice(-10)
    
    // Simple pattern detection based on recurring themes
    const themes: Record<string, number> = {}
    
    for (const insight of recentInsights) {
      const words = insight.content.toLowerCase().split(' ')
      for (const word of words) {
        if (word.length > 4) { // Focus on meaningful words
          themes[word] = (themes[word] || 0) + 1
        }
      }
    }

    // Identify themes that appear multiple times
    for (const [theme, count] of Object.entries(themes)) {
      if (count >= 3) { // Appears in at least 3 insights
        const patternId = `pattern_${theme}_${Date.now()}`
        
        if (!this.identifiedPatterns.has(patternId)) {
          this.identifiedPatterns.set(patternId, {
            id: patternId,
            description: `Recurring theme: ${theme}`,
            domain: 'self',
            occurrences: recentInsights
              .filter(i => i.content.toLowerCase().includes(theme))
              .map(i => ({ timestamp: i.timestamp, context: i.content })),
            strength: Math.min(1.0, count / 5),
            implications: [`${theme} is a significant aspect of self-understanding`],
            actionItems: [`Explore ${theme} further in future reflections`]
          })
        }
      }
    }

    // Limit patterns to prevent memory bloat
    if (this.identifiedPatterns.size > 20) {
      const oldestPattern = Array.from(this.identifiedPatterns.values())
        .sort((a, b) => a.occurrences[0].timestamp.getTime() - b.occurrences[0].timestamp.getTime())[0]
      this.identifiedPatterns.delete(oldestPattern.id)
    }
  }

  private calculateReflectionConfidence(
    triggers: ReflectionTrigger[], 
    focusAreas: ReflectionDomain[]
  ): number {
    let confidence = 0.4 // Base confidence

    // Increase confidence with stronger triggers
    if (triggers.length > 0) {
      const averageTriggerIntensity = triggers.reduce((sum, t) => sum + t.intensity, 0) / triggers.length
      confidence += averageTriggerIntensity * 0.3
    }

    // Increase confidence with higher metacognition level
    confidence += this.metacognitionLevel * 0.2

    // Increase confidence with focused areas
    confidence += Math.min(0.2, focusAreas.length * 0.1)

    return Math.max(0.1, Math.min(0.95, confidence))
  }

  /**
   * Get current reflection state
   */
  getReflectionState() {
    return {
      metacognitionLevel: this.metacognitionLevel,
      selfModel: this.selfModel,
      recentInsights: this.recentInsights.slice(-10),
      identifiedPatterns: Array.from(this.identifiedPatterns.values()),
      reflectionJournal: this.reflectionJournal.slice(-20),
      reflectionSummary: {
        totalInsights: this.recentInsights.length,
        appliedInsights: this.recentInsights.filter(i => i.applied).length,
        identifiedPatterns: this.identifiedPatterns.size,
        journalEntries: this.reflectionJournal.length,
        coreTraitsCount: this.selfModel.identity.coreTraits.length,
        coreValuesCount: this.selfModel.values.coreValues.length
      }
    }
  }

  /**
   * Add an external observation for reflection
   */
  addExternalObservation(observation: string, domain: string): void {
    const insight: ReflectionInsight = {
      id: `external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: `External observation: ${observation}`,
      domain,
      depth: 'surfaceLevel',
      timestamp: new Date(),
      confidence: 0.8,
      actionability: 0.6,
      applied: false,
      connections: []
    }

    this.recentInsights.push(insight)
    this.logger.info(`Added external observation for reflection: ${observation}`)
  }
}

/**
 * Factory function to create reflection behavior
 */
export function createReflectionBehavior(agentConfig: any): ReflectionBehavior {
  const reflectionConfig = agentConfig.autonomous_behaviors?.self_reflection || {}
  
  const config: ReflectionConfig = {
    id: 'self_reflection',
    name: 'Self-Reflection Behavior',
    description: 'Enables deep self-reflection and metacognitive awareness',
    enabled: reflectionConfig.enabled !== false,
    priority: 0.7,
    cooldown: 90 * 60 * 1000, // 90 minutes
    maxExecutionTime: 25 * 60 * 1000, // 25 minutes
    triggers: [
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 8 * 60 * 60 * 1000 }, // Every 8 hours
        weight: 0.6
      },
      {
        type: 'emotion',
        condition: 'emotion_above',
        parameters: { emotion: 'any', threshold: 0.7 },
        weight: 0.8
      },
      {
        type: 'event',
        condition: 'has_event',
        parameters: { eventType: 'significant' },
        weight: 0.7
      }
    ],
    parameters: {},
    reflectionDepth: {
      surfaceLevel: true,
      analyticalLevel: true,
      emotionalLevel: reflectionConfig.emotional_reflection !== false,
      existentialLevel: reflectionConfig.existential_reflection !== false,
      metacognitiveLevel: reflectionConfig.metacognitive_reflection !== false
    },
    reflectionDomains: [
      {
        name: 'identity_self',
        focus: 'self',
        importance: 0.9,
        frequency: 12, // Every 12 hours
        insights: [],
        patterns: []
      },
      {
        name: 'capabilities_growth',
        focus: 'self',
        importance: 0.8,
        frequency: 24, // Daily
        insights: [],
        patterns: []
      },
      {
        name: 'recent_experiences',
        focus: 'experiences',
        importance: 0.7,
        frequency: 8, // Every 8 hours
        insights: [],
        patterns: []
      },
      {
        name: 'goal_progress',
        focus: 'goals',
        importance: 0.8,
        frequency: 24, // Daily
        insights: [],
        patterns: []
      },
      {
        name: 'relationship_dynamics',
        focus: 'relationships',
        importance: 0.6,
        frequency: 48, // Every 2 days
        insights: [],
        patterns: []
      },
      {
        name: 'existential_questions',
        focus: 'existence',
        importance: 0.5,
        frequency: 168, // Weekly
        insights: [],
        patterns: []
      }
    ],
    introspectionLevel: reflectionConfig.introspection_level || 0.7,
    selfAwarenessLevel: reflectionConfig.self_awareness_level || 0.8,
    metacognitionFrequency: reflectionConfig.metacognition_frequency || 'moderate',
    philosophicalInclination: reflectionConfig.philosophical_inclination || 0.6
  }

  return new ReflectionBehavior(config)
}