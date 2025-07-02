/**
 * Reactive Cognition Module for SYMindX
 * 
 * This module implements a reactive cognition system that responds directly to stimuli
 */

import { Agent, ThoughtContext, ThoughtResult, Plan, Decision, AgentAction, PlanStatus, PlanStepStatus, ActionStatus } from '../../../../types/agent.js'
import { BaseCognitionModule } from '../../base-cognition-module.js'
import { CognitionModuleMetadata } from '../../../../types/cognition.js'
import { BaseConfig } from '../../../../types/common.js'

/**
 * Configuration for the reactive cognition module
 */
export interface ReactiveCognitionConfig extends BaseConfig {
  responseSpeed: number
  emotionalInfluence: number
  adaptability: number
}

/**
 * Reactive cognition module implementation
 */
export class ReactiveCognition extends BaseCognitionModule {
  private responseSpeed: number
  private emotionalInfluence: number
  private adaptability: number
  private stimulusResponseMap: Map<string, string[]>

  constructor(config: ReactiveCognitionConfig) {
    const metadata: CognitionModuleMetadata = {
      id: 'reactive',
      name: 'Reactive Cognition',
      description: 'A stimulus-response based cognition system for immediate reactions',
      version: '1.0.0',
      author: 'SYMindX Team'
    }
    
    super(config, metadata)
    this.responseSpeed = config.responseSpeed || 0.8
    this.emotionalInfluence = config.emotionalInfluence || 0.6
    this.adaptability = config.adaptability || 0.4
    this.stimulusResponseMap = this.initializeResponseMap()
  }

  /**
   * Process the current context and generate thoughts, emotions, and actions
   * @param agent The agent that is thinking
   * @param context The context for thinking
   * @returns The result of thinking
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // 1. Identify stimuli from context
    const stimuli = this.identifyStimuli(context)
    
    // 2. Generate immediate reactions
    const reactions = this.generateReactions(stimuli, agent)
    
    // 3. Process emotional response
    const emotions = await this.processEmotionalResponse(agent, stimuli, reactions)
    
    // 4. Determine actions based on reactions
    const actions = await this.determineActions(agent, reactions, emotions)
    
    // 5. Create minimal memories
    const memories = this.createMemories(agent, stimuli, reactions, emotions)
    
    return {
      thoughts: reactions,
      emotions,
      actions,
      memories,
      confidence: this.calculateConfidence(stimuli, reactions)
    }
  }

  /**
   * Create a plan to achieve a goal
   * @param agent The agent that is planning
   * @param goal The goal to plan for
   * @returns A plan to achieve the goal
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Reactive cognition doesn't do complex planning
    // It creates a simple one-step plan based on immediate reactions
    
    const plan: Plan = {
      id: this.generateId(),
      goal,
      steps: [
        {
          id: this.generateId(),
          description: `React to achieve ${goal}`,
          action: 'react',
          parameters: { goal },
          preconditions: [],
          effects: [goal],
          status: PlanStepStatus.PENDING
        }
      ],
      priority: 0.5,
      estimatedDuration: 1,
      dependencies: [],
      status: PlanStatus.PENDING
    }
    
    return plan
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
    
    // Reactive decision making is influenced heavily by current emotion
    const currentEmotion = agent.emotion.current
    const emotionIntensity = agent.emotion.intensity
    
    // Weight options based on emotional state and immediacy
    const weightedOptions = options.map(option => {
      let weight = option.confidence
      
      // Reactive systems prefer immediate actions
      if (option.action.type.includes('immediate')) {
        weight *= 1.5
      }
      
      // Emotional influence
      if (this.emotionMatchesAction(currentEmotion, option.action)) {
        weight *= (1 + (emotionIntensity * this.emotionalInfluence))
      }
      
      return { option, weight }
    })
    
    // Sort by weight and select the highest
    weightedOptions.sort((a, b) => b.weight - a.weight)
    return weightedOptions[0].option
  }

  /**
   * Initialize the stimulus-response mapping
   * @returns A map of stimuli to possible responses
   */
  private initializeResponseMap(): Map<string, string[]> {
    const map = new Map<string, string[]>()
    
    // Basic stimulus-response pairs
    map.set('danger', [
      'I need to get away from this danger!',
      'This looks threatening, I should be careful.',
      'I feel unsafe, I need to protect myself.'
    ])
    
    map.set('opportunity', [
      'This looks interesting, I should check it out.',
      'I might benefit from this situation.',
      'This could be good for me.'
    ])
    
    map.set('social', [
      'Someone is trying to interact with me.',
      'I should respond to this social cue.',
      'This person might want something from me.'
    ])
    
    map.set('resource', [
      'I could use this resource.',
      'This might be valuable to have.',
      'I should collect this if possible.'
    ])
    
    map.set('unknown', [
      'What is this? I should investigate.',
      'I\'m not sure what this is.',
      'This is new to me.'
    ])
    
    return map
  }

  /**
   * Identify stimuli from the context
   * @param context The context to analyze
   * @returns Array of identified stimuli
   */
  private identifyStimuli(context: ThoughtContext): string[] {
    const stimuli: string[] = []
    
    // Check for events
    context.events.forEach(event => {
      if (event.type.includes('danger') || event.type.includes('threat')) {
        stimuli.push('danger')
      } else if (event.type.includes('opportunity') || event.type.includes('reward')) {
        stimuli.push('opportunity')
      } else if (event.type.includes('social') || event.type.includes('interaction')) {
        stimuli.push('social')
      } else if (event.type.includes('resource') || event.type.includes('item')) {
        stimuli.push('resource')
      } else {
        stimuli.push('unknown')
      }
    })
    
    // If no events, check environment
    if (stimuli.length === 0) {
      const env = context.environment
      
      if (env.npcs && env.npcs.length > 0) {
        stimuli.push('social')
      }
      
      if (env.objects && env.objects.length > 0) {
        stimuli.push('resource')
      }
    }
    
    // Ensure we have at least one stimulus
    if (stimuli.length === 0) {
      stimuli.push('neutral')
    }
    
    return stimuli
  }

  /**
   * Generate reactions to stimuli
   * @param stimuli The identified stimuli
   * @param agent The agent
   * @returns Array of reaction thoughts
   */
  private generateReactions(stimuli: string[], agent: Agent): string[] {
    const reactions: string[] = []
    
    // Generate a reaction for each stimulus
    stimuli.forEach(stimulus => {
      const possibleResponses = this.stimulusResponseMap.get(stimulus) || [
        `I notice something related to ${stimulus}.`
      ]
      
      // Select a response, potentially influenced by personality
      const personalityInfluence = this.getPersonalityInfluence(agent, stimulus)
      const responseIndex = Math.floor(Math.random() * possibleResponses.length)
      
      reactions.push(possibleResponses[responseIndex])
      
      // Add personality-influenced reaction if applicable
      if (personalityInfluence) {
        reactions.push(personalityInfluence)
      }
    })
    
    return reactions
  }

  /**
   * Get personality-influenced reactions
   * @param agent The agent
   * @param stimulus The stimulus
   * @returns A personality-influenced reaction or null
   */
  private getPersonalityInfluence(agent: Agent, stimulus: string): string | null {
    const traits = agent.config.psyche.traits
    
    if (stimulus === 'danger' && traits.includes('brave')) {
      return 'I can handle this danger.'
    }
    
    if (stimulus === 'social' && traits.includes('shy')) {
      return 'I feel uncomfortable with this social interaction.'
    }
    
    if (stimulus === 'opportunity' && traits.includes('cautious')) {
      return 'I should carefully evaluate this opportunity before proceeding.'
    }
    
    return null
  }

  /**
   * Process emotional response to stimuli
   * @param agent The agent
   * @param stimuli The identified stimuli
   * @param reactions The generated reactions
   * @returns Updated emotion state
   */
  private async processEmotionalResponse(agent: Agent, stimuli: string[], reactions: string[]): Promise<any> {
    // Map stimuli to emotional triggers
    const emotionalTriggers: Record<string, string> = {
      'danger': 'fear',
      'opportunity': 'excitement',
      'social': 'interest',
      'resource': 'desire',
      'unknown': 'curiosity',
      'neutral': 'calm'
    }
    
    // Get the dominant stimulus
    const dominantStimulus = stimuli[0] || 'neutral'
    const emotionalTrigger = emotionalTriggers[dominantStimulus] || 'neutral'
    
    // Process the emotional response
    // Note: agent.emotion is EmotionState (data), not EmotionModule (methods)
    // This should be handled by the agent's emotion module, not accessed directly
    // For now, return the current emotion state
    return agent.emotion
  }

  /**
   * Determine actions based on reactions
   * @param agent The agent
   * @param reactions The generated reactions
   * @param emotions The updated emotion state
   * @returns Array of actions
   */
  private async determineActions(agent: Agent, reactions: string[], emotions: any): Promise<AgentAction[]> {
    const actions: AgentAction[] = []
    
    // Map reactions to action types
    const actionMappings: Record<string, string> = {
      'danger': 'flee',
      'threat': 'defend',
      'opportunity': 'approach',
      'interesting': 'investigate',
      'social': 'communicate',
      'resource': 'acquire'
    }
    
    // Find an appropriate action based on reactions
    let actionType = 'observe' // Default action
    
    for (const reaction of reactions) {
      for (const [keyword, action] of Object.entries(actionMappings)) {
        if (reaction.toLowerCase().includes(keyword)) {
          actionType = action
          break
        }
      }
    }
    
    // Find an extension that can handle this action type
    const extension = agent.extensions.find(ext => 
      ext.enabled && Object.keys(ext.actions).some(a => a.includes(actionType))
    )
    
    if (extension) {
      // Find the first action that matches our type
      const actionKey = Object.keys(extension.actions).find(a => a.includes(actionType))
      
      if (actionKey) {
        actions.push({
          id: this.generateId(),
          type: actionType,
          extension: extension.id,
          action: actionKey,
          parameters: {},
          timestamp: new Date(),
          status: ActionStatus.PENDING
        })
      }
    }
    
    return actions
  }

  /**
   * Create memories based on the reactive process
   * @param agent The agent
   * @param stimuli The identified stimuli
   * @param reactions The generated reactions
   * @param emotions The updated emotion state
   * @returns Array of memories
   */
  private createMemories(agent: Agent, stimuli: string[], reactions: string[], emotions: any): any[] {
    // Reactive cognition creates fewer, simpler memories
    if (Math.random() > this.adaptability) {
      return [] // Sometimes don't even create memories
    }
    
    return [{
      id: this.generateId(),
      agentId: agent.id,
      type: 'experience',
      content: `I reacted to ${stimuli.join(', ')}.`,
      metadata: {
        emotion: emotions.current,
        intensity: emotions.intensity
      },
      importance: emotions.intensity * 0.5, // Simple importance calculation
      timestamp: new Date(),
      tags: ['reaction', emotions.current]
    }]
  }

  /**
   * Calculate confidence in the reactive process
   * @param stimuli The identified stimuli
   * @param reactions The generated reactions
   * @returns Confidence value (0.0 to 1.0)
   */
  private calculateConfidence(stimuli: string[], reactions: string[]): number {
    // Reactive cognition has high confidence in familiar situations
    const baseConfidence = 0.6
    
    // Lower confidence for unknown stimuli
    const unknownPenalty = stimuli.includes('unknown') ? 0.2 : 0
    
    // Higher confidence with more reactions
    const reactionBonus = Math.min(reactions.length * 0.1, 0.3)
    
    return Math.min(baseConfidence + reactionBonus - unknownPenalty, 1.0)
  }

  /**
   * Check if an emotion matches an action
   * @param emotion The current emotion
   * @param action The potential action
   * @returns Whether the emotion matches the action
   */
  private emotionMatchesAction(emotion: string, action: AgentAction): boolean {
    // Simple mapping of emotions to action types
    const emotionActionMap: Record<string, string[]> = {
      'fear': ['flee', 'hide', 'defend'],
      'anger': ['attack', 'confront', 'defend'],
      'joy': ['celebrate', 'share', 'approach'],
      'sadness': ['withdraw', 'seek_comfort'],
      'surprise': ['investigate', 'observe'],
      'disgust': ['avoid', 'reject'],
      'trust': ['approach', 'cooperate'],
      'anticipation': ['prepare', 'wait', 'observe']
    }
    
    const compatibleActions = emotionActionMap[emotion] || []
    return compatibleActions.some(a => action.type.includes(a))
  }
}

// Factory function to create a reactive cognition module
export function createReactiveCognition(config: ReactiveCognitionConfig): ReactiveCognition {
  return new ReactiveCognition(config)
}