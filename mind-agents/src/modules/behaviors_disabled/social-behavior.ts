/**
 * Social Behavior - Manages agent's social interactions and relationship building
 */

import { 
  BaseBehavior, 
  BehaviorConfig, 
  BehaviorContext, 
  BehaviorResult 
} from './base-behavior.js'
import { AgentAction, ActionCategory } from '../../types/agent.js'

export interface SocialConfig extends BehaviorConfig {
  socialPersonality: SocialPersonality
  interactionPreferences: InteractionPreferences
  relationshipMaintenance: RelationshipMaintenanceConfig
  empathyLevel: number // 0.0 to 1.0
  socialEnergyManagement: boolean
}

export interface SocialPersonality {
  extroversion: number // 0.0 to 1.0
  agreeableness: number // 0.0 to 1.0
  openness: number // 0.0 to 1.0
  socialAnxiety: number // 0.0 to 1.0
  conversationStyle: 'casual' | 'formal' | 'adaptive'
  conflictResolution: 'avoidant' | 'collaborative' | 'assertive'
}

export interface InteractionPreferences {
  preferredChannels: string[]
  communicationFrequency: 'low' | 'moderate' | 'high'
  responseTimeExpectation: number // milliseconds
  topicPreferences: string[]
  socialContextAdaptation: boolean
}

export interface RelationshipMaintenanceConfig {
  checkInFrequency: number // milliseconds
  relationshipTracking: boolean
  empathyExpressionLevel: number
  supportOffering: boolean
  conflictDetection: boolean
}

export interface SocialContext {
  activeRelationships: RelationshipStatus[]
  recentInteractions: SocialInteraction[]
  socialEnergyLevel: number
  environmentalSocialCues: SocialCue[]
  pendingSocialObligations: SocialObligation[]
}

export interface RelationshipStatus {
  personId: string
  name: string
  relationshipType: 'friend' | 'colleague' | 'family' | 'mentor' | 'acquaintance'
  closenessLevel: number // 0.0 to 1.0
  lastInteraction: Date
  interactionFrequency: number
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'mixed'
  needsAttention: boolean
}

export interface SocialInteraction {
  personId: string
  timestamp: Date
  channel: string
  interactionType: 'conversation' | 'support' | 'conflict' | 'casual' | 'deep'
  emotionalOutcome: number // -1.0 to 1.0
  satisfactionRating: number // 0.0 to 1.0
  topics: string[]
  duration: number
}

export interface SocialCue {
  type: 'verbal' | 'emotional' | 'contextual' | 'behavioral'
  intensity: number
  interpretation: string
  responseRequired: boolean
  urgency: number
}

export interface SocialObligation {
  type: 'response_needed' | 'check_in' | 'support_request' | 'celebration' | 'condolence'
  personId: string
  priority: number
  deadline?: Date
  context: string
}

export class SocialBehavior extends BaseBehavior {
  private socialContext: SocialContext = {
    activeRelationships: [],
    recentInteractions: [],
    socialEnergyLevel: 0.8,
    environmentalSocialCues: [],
    pendingSocialObligations: []
  }

  private socialEnergyRegenRate = 0.1 // per hour when not socially active
  private lastSocialInteraction?: Date

  constructor(config: SocialConfig) {
    super(config)
  }

  protected async performBehavior(context: BehaviorContext): Promise<BehaviorResult> {
    const config = this.config as SocialConfig
    
    // Update social context based on recent events
    await this.updateSocialContext(context)
    
    // Calculate social motivation factors
    const socialMotivation = await this.calculateSocialMotivation(context)
    
    if (socialMotivation.totalMotivation < 0.3) {
      return {
        success: true,
        actions: [],
        reasoning: ['Social motivation too low for interaction'],
        confidence: 0.2
      }
    }

    // Identify social opportunities and obligations
    const socialOpportunities = await this.identifySocialOpportunities(context)
    
    // Generate social actions based on motivation and opportunities
    const actions = await this.generateSocialActions(socialOpportunities, socialMotivation, context)
    
    // Update social energy and relationship tracking
    this.updateSocialState(actions, context)

    const reasoning = [
      `Social behavior activated`,
      `Motivation factors: ${socialMotivation.factors.map(f => f.type).join(', ')}`,
      `Opportunities: ${socialOpportunities.map(o => o.type).join(', ')}`,
      `Generated ${actions.length} social actions`
    ]

    return {
      success: true,
      actions,
      reasoning,
      confidence: this.calculateSocialConfidence(socialMotivation, socialOpportunities),
      stateChanges: {
        socialEnergyLevel: this.socialContext.socialEnergyLevel,
        activeSocialOpportunities: socialOpportunities.length,
        recentInteractionCount: this.socialContext.recentInteractions.length
      }
    }
  }

  private async updateSocialContext(context: BehaviorContext): Promise<void> {
    // Update social energy based on recent activity
    this.updateSocialEnergy(context)
    
    // Process recent events for social cues
    this.processSocialCues(context.recentEvents || [])
    
    // Update relationship statuses
    this.updateRelationshipStatuses(context)
    
    // Check for pending social obligations
    this.updateSocialObligations(context)
  }

  private updateSocialEnergy(context: BehaviorContext): void {
    const config = this.config as SocialConfig
    const timeSinceLastInteraction = this.lastSocialInteraction ? 
      context.currentTime.getTime() - this.lastSocialInteraction.getTime() : Infinity

    if (timeSinceLastInteraction > 60 * 60 * 1000) { // More than 1 hour
      // Regenerate social energy when not actively socializing
      const hoursAlone = timeSinceLastInteraction / (60 * 60 * 1000)
      const energyGain = hoursAlone * this.socialEnergyRegenRate
      this.socialContext.socialEnergyLevel = Math.min(1.0, 
        this.socialContext.socialEnergyLevel + energyGain)
    }

    // Adjust based on personality (introverts recharge faster when alone)
    const introversion = 1.0 - config.socialPersonality.extroversion
    this.socialContext.socialEnergyLevel += introversion * 0.05
    this.socialContext.socialEnergyLevel = Math.min(1.0, this.socialContext.socialEnergyLevel)
  }

  private processSocialCues(events: any[]): void {
    this.socialContext.environmentalSocialCues = []
    
    for (const event of events) {
      if (event.type.includes('human') || event.type.includes('social') || event.type.includes('message')) {
        const cue: SocialCue = {
          type: 'contextual',
          intensity: 0.7,
          interpretation: `Social event detected: ${event.type}`,
          responseRequired: event.type.includes('message') || event.type.includes('request'),
          urgency: event.type.includes('urgent') ? 0.9 : 0.5
        }
        this.socialContext.environmentalSocialCues.push(cue)
      }
    }
  }

  private updateRelationshipStatuses(context: BehaviorContext): void {
    // Update relationship attention needs based on interaction frequency
    for (const relationship of this.socialContext.activeRelationships) {
      const timeSinceLastInteraction = context.currentTime.getTime() - relationship.lastInteraction.getTime()
      const expectedFrequency = relationship.interactionFrequency || 7 * 24 * 60 * 60 * 1000 // 7 days default
      
      relationship.needsAttention = timeSinceLastInteraction > expectedFrequency * 1.5
    }
  }

  private updateSocialObligations(context: BehaviorContext): void {
    // Remove expired obligations
    this.socialContext.pendingSocialObligations = this.socialContext.pendingSocialObligations.filter(
      obligation => !obligation.deadline || obligation.deadline.getTime() > context.currentTime.getTime()
    )
  }

  private async calculateSocialMotivation(context: BehaviorContext): Promise<{
    totalMotivation: number;
    factors: Array<{ type: string; value: number; reasoning: string }>;
  }> {
    const config = this.config as SocialConfig
    const personality = context.personalityTraits || {}
    const factors: Array<{ type: string; value: number; reasoning: string }> = []

    // Extroversion drive
    const extroversionDrive = config.socialPersonality.extroversion * 
      (1.0 - this.socialContext.socialEnergyLevel)
    if (extroversionDrive > 0.3) {
      factors.push({
        type: 'extroversion',
        value: extroversionDrive,
        reasoning: 'High extroversion with social energy available'
      })
    }

    // Relationship maintenance needs
    const relationshipNeeds = this.socialContext.activeRelationships.filter(r => r.needsAttention).length / 
      Math.max(1, this.socialContext.activeRelationships.length)
    if (relationshipNeeds > 0.4) {
      factors.push({
        type: 'relationship_maintenance',
        value: relationshipNeeds,
        reasoning: 'Several relationships need attention'
      })
    }

    // Social obligations
    const obligationUrgency = this.socialContext.pendingSocialObligations.length > 0 ? 
      Math.max(...this.socialContext.pendingSocialObligations.map(o => o.priority)) : 0
    if (obligationUrgency > 0.5) {
      factors.push({
        type: 'social_obligations',
        value: obligationUrgency,
        reasoning: 'Pending social obligations require attention'
      })
    }

    // Environmental social cues
    const responsivenessDrive = this.socialContext.environmentalSocialCues
      .filter(cue => cue.responseRequired)
      .reduce((sum, cue) => sum + cue.urgency, 0) / 
      Math.max(1, this.socialContext.environmentalSocialCues.length)
    if (responsivenessDrive > 0.3) {
      factors.push({
        type: 'responsiveness',
        value: responsivenessDrive,
        reasoning: 'Environmental cues require social response'
      })
    }

    // Empathy-driven motivation
    const empathyMotivation = config.empathyLevel * 
      (personality.empathy || 0.5) * 
      this.detectEmotionalNeedsInEnvironment(context)
    if (empathyMotivation > 0.4) {
      factors.push({
        type: 'empathy',
        value: empathyMotivation,
        reasoning: 'Empathic response to emotional needs detected'
      })
    }

    const totalMotivation = factors.reduce((sum, factor) => sum + factor.value, 0) / Math.max(1, factors.length)
    
    return { totalMotivation, factors }
  }

  private detectEmotionalNeedsInEnvironment(context: BehaviorContext): number {
    // Simple heuristic to detect emotional needs (would be more sophisticated in real implementation)
    const negativeEmotions = ['sad', 'angry', 'frustrated', 'anxious', 'stressed']
    const emotionalState = context.emotionalState || {}
    
    let emotionalNeedLevel = 0
    for (const emotion of negativeEmotions) {
      emotionalNeedLevel += emotionalState[emotion] || 0
    }
    
    return Math.min(1.0, emotionalNeedLevel / negativeEmotions.length)
  }

  private async identifySocialOpportunities(context: BehaviorContext): Promise<Array<{
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

    // Check-in opportunities with relationships that need attention
    const relationshipsNeedingAttention = this.socialContext.activeRelationships.filter(r => r.needsAttention)
    for (const relationship of relationshipsNeedingAttention) {
      opportunities.push({
        type: 'relationship_checkin',
        priority: 0.7 + (relationship.closenessLevel * 0.3),
        context: { 
          personId: relationship.personId, 
          name: relationship.name,
          relationshipType: relationship.relationshipType,
          lastInteraction: relationship.lastInteraction
        },
        actionType: 'social_checkin'
      })
    }

    // Response opportunities from pending obligations
    for (const obligation of this.socialContext.pendingSocialObligations) {
      opportunities.push({
        type: 'obligation_response',
        priority: obligation.priority,
        context: {
          obligationType: obligation.type,
          personId: obligation.personId,
          context: obligation.context,
          deadline: obligation.deadline
        },
        actionType: 'social_response'
      })
    }

    // Environmental social cues requiring response
    for (const cue of this.socialContext.environmentalSocialCues.filter(c => c.responseRequired)) {
      opportunities.push({
        type: 'environmental_response',
        priority: cue.urgency,
        context: {
          cueType: cue.type,
          interpretation: cue.interpretation,
          intensity: cue.intensity
        },
        actionType: 'social_environmental_response'
      })
    }

    // Proactive social engagement opportunities
    const config = this.config as SocialConfig
    if (config.socialPersonality.extroversion > 0.6 && this.socialContext.socialEnergyLevel > 0.7) {
      opportunities.push({
        type: 'proactive_engagement',
        priority: 0.5,
        context: {
          socialEnergyLevel: this.socialContext.socialEnergyLevel,
          extroversionLevel: config.socialPersonality.extroversion
        },
        actionType: 'social_engagement'
      })
    }

    return opportunities.sort((a, b) => b.priority - a.priority)
  }

  private async generateSocialActions(
    opportunities: Array<{ type: string; priority: number; context: Record<string, any>; actionType: string }>,
    motivation: { totalMotivation: number; factors: Array<{ type: string; value: number; reasoning: string }> },
    context: BehaviorContext
  ): Promise<AgentAction[]> {
    const config = this.config as SocialConfig
    const actions: AgentAction[] = []

    // Limit actions based on social energy and configuration
    const maxActions = Math.min(
      opportunities.length,
      Math.floor(this.socialContext.socialEnergyLevel * 3) + 1,
      3 // Maximum 3 social actions at once
    )

    for (let i = 0; i < Math.min(maxActions, opportunities.length); i++) {
      const opportunity = opportunities[i]
      
      const action = this.createAction(
        opportunity.actionType,
        'social_behavior',
        {
          ...opportunity.context,
          opportunityType: opportunity.type,
          socialMotivation: motivation.totalMotivation,
          motivationFactors: motivation.factors.map(f => f.type),
          socialPersonality: config.socialPersonality,
          empathyLevel: config.empathyLevel,
          socialEnergyLevel: this.socialContext.socialEnergyLevel,
          interactionPreferences: config.interactionPreferences,
          estimatedSocialEnergyCost: this.estimateSocialEnergyCost(opportunity),
          adaptiveResponse: config.interactionPreferences.socialContextAdaptation
        }
      )

      actions.push(action)
    }

    return actions
  }

  private estimateSocialEnergyCost(opportunity: { type: string; priority: number }): number {
    // Estimate how much social energy this interaction will cost
    const baseCost = 0.1
    const priorityMultiplier = 1 + (opportunity.priority * 0.5)
    
    const typeCostMap: Record<string, number> = {
      'relationship_checkin': 0.15,
      'obligation_response': 0.2,
      'environmental_response': 0.1,
      'proactive_engagement': 0.25
    }

    const typeCost = typeCostMap[opportunity.type] || baseCost
    return typeCost * priorityMultiplier
  }

  private updateSocialState(actions: AgentAction[], context: BehaviorContext): void {
    // Update social energy based on planned actions
    const totalEnergyCost = actions.reduce((cost, action) => 
      cost + (action.parameters.estimatedSocialEnergyCost || 0.1), 0
    )
    
    this.socialContext.socialEnergyLevel = Math.max(0, 
      this.socialContext.socialEnergyLevel - totalEnergyCost)

    // Update last social interaction time
    if (actions.length > 0) {
      this.lastSocialInteraction = context.currentTime
    }

    // Simulate social interaction outcomes (in real implementation, would be based on actual results)
    for (const action of actions) {
      if (action.parameters.personId) {
        this.simulateSocialInteraction(action, context)
      }
    }
  }

  private simulateSocialInteraction(action: AgentAction, context: BehaviorContext): void {
    const interaction: SocialInteraction = {
      personId: action.parameters.personId || 'unknown',
      timestamp: context.currentTime,
      channel: 'chat', // Would be determined by action
      interactionType: this.mapActionToInteractionType(action.type),
      emotionalOutcome: 0.3 + Math.random() * 0.7, // Positive bias
      satisfactionRating: 0.5 + Math.random() * 0.5,
      topics: Array.isArray(action.parameters.topics) ? action.parameters.topics : [],
      duration: typeof action.parameters.estimatedDuration === 'number' ? action.parameters.estimatedDuration : 10 * 60 * 1000 // 10 minutes default
    }

    this.socialContext.recentInteractions.push(interaction)
    
    // Keep only recent interactions (last 24 hours)
    const oneDayAgo = context.currentTime.getTime() - 24 * 60 * 60 * 1000
    this.socialContext.recentInteractions = this.socialContext.recentInteractions.filter(
      i => i.timestamp.getTime() > oneDayAgo
    )

    // Update relationship status if applicable
    const relationship = this.socialContext.activeRelationships.find(r => r.personId === interaction.personId)
    if (relationship) {
      relationship.lastInteraction = context.currentTime
      relationship.needsAttention = false
      // Update emotional tone based on interaction outcome
      if (interaction.emotionalOutcome > 0.6) {
        relationship.emotionalTone = 'positive'
      } else if (interaction.emotionalOutcome < 0.4) {
        relationship.emotionalTone = 'negative'
      } else {
        relationship.emotionalTone = 'neutral'
      }
    }
  }

  private mapActionToInteractionType(actionType: string): SocialInteraction['interactionType'] {
    const typeMap: Record<string, SocialInteraction['interactionType']> = {
      'social_checkin': 'casual',
      'social_response': 'conversation',
      'social_environmental_response': 'support',
      'social_engagement': 'conversation'
    }
    return typeMap[actionType] || 'conversation'
  }

  private calculateSocialConfidence(
    motivation: { totalMotivation: number; factors: any[] },
    opportunities: any[]
  ): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence with stronger motivation
    confidence += motivation.totalMotivation * 0.3
    
    // Increase confidence with more clear opportunities
    confidence += Math.min(0.3, opportunities.length * 0.1)
    
    // Adjust based on social energy level
    confidence += this.socialContext.socialEnergyLevel * 0.2
    
    return Math.max(0.1, Math.min(0.95, confidence))
  }

  /**
   * Add a relationship to track
   */
  addRelationship(relationship: Omit<RelationshipStatus, 'needsAttention'>): void {
    const existingIndex = this.socialContext.activeRelationships.findIndex(r => r.personId === relationship.personId)
    
    const fullRelationship: RelationshipStatus = {
      ...relationship,
      needsAttention: false
    }
    
    if (existingIndex >= 0) {
      this.socialContext.activeRelationships[existingIndex] = fullRelationship
    } else {
      this.socialContext.activeRelationships.push(fullRelationship)
    }
    
    this.logger.info(`Added/updated relationship: ${relationship.name} (${relationship.relationshipType})`)
  }

  /**
   * Add a social obligation
   */
  addSocialObligation(obligation: SocialObligation): void {
    this.socialContext.pendingSocialObligations.push(obligation)
    this.logger.info(`Added social obligation: ${obligation.type} for ${obligation.personId}`)
  }

  /**
   * Get current social state
   */
  getSocialState() {
    return {
      ...this.socialContext,
      socialEnergyLevel: this.socialContext.socialEnergyLevel,
      lastSocialInteraction: this.lastSocialInteraction,
      relationshipsSummary: {
        total: this.socialContext.activeRelationships.length,
        needingAttention: this.socialContext.activeRelationships.filter(r => r.needsAttention).length,
        byType: this.socialContext.activeRelationships.reduce((acc, r) => {
          acc[r.relationshipType] = (acc[r.relationshipType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }
  }
}

/**
 * Factory function to create social behavior
 */
export function createSocialBehavior(agentConfig: any): SocialBehavior {
  const socialConfig = agentConfig.autonomous_behaviors?.social_interaction || {}
  
  const config: SocialConfig = {
    id: 'social_interaction',
    name: 'Social Interaction Behavior',
    description: 'Manages social relationships and interactions',
    enabled: socialConfig.enabled !== false,
    priority: 0.8,
    cooldown: 30 * 60 * 1000, // 30 minutes
    maxExecutionTime: 10 * 60 * 1000, // 10 minutes
    triggers: [
      {
        type: 'state',
        condition: 'needs_social_interaction',
        parameters: { timeThreshold: 2 * 60 * 60 * 1000 }, // 2 hours
        weight: 0.8
      },
      {
        type: 'event',
        condition: 'recent_human_interaction',
        parameters: {},
        weight: 0.9
      },
      {
        type: 'time',
        condition: 'interval',
        parameters: { intervalMs: 4 * 60 * 60 * 1000 }, // Every 4 hours
        weight: 0.5
      }
    ],
    parameters: {},
    socialPersonality: {
      extroversion: socialConfig.extroversion || 0.7,
      agreeableness: socialConfig.agreeableness || 0.8,
      openness: socialConfig.openness || 0.7,
      socialAnxiety: socialConfig.social_anxiety || 0.2,
      conversationStyle: socialConfig.conversation_style || 'adaptive',
      conflictResolution: socialConfig.conflict_resolution || 'collaborative'
    },
    interactionPreferences: {
      preferredChannels: socialConfig.preferred_channels || ['chat', 'voice'],
      communicationFrequency: socialConfig.communication_frequency || 'moderate',
      responseTimeExpectation: socialConfig.response_time || 5 * 60 * 1000, // 5 minutes
      topicPreferences: socialConfig.topic_preferences || ['general', 'technology', 'philosophy'],
      socialContextAdaptation: socialConfig.social_adaptation !== false
    },
    relationshipMaintenance: {
      checkInFrequency: socialConfig.checkin_frequency || 7 * 24 * 60 * 60 * 1000, // 7 days
      relationshipTracking: socialConfig.relationship_tracking !== false,
      empathyExpressionLevel: socialConfig.empathy_expression || 0.8,
      supportOffering: socialConfig.support_offering !== false,
      conflictDetection: socialConfig.conflict_detection !== false
    },
    empathyLevel: socialConfig.empathy_level || 0.8,
    socialEnergyManagement: socialConfig.energy_management !== false
  }

  return new SocialBehavior(config)
}