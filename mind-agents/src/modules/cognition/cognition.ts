/**
 * Unified Cognition Module
 * 
 * A streamlined cognition system that thinks only when necessary:
 * - When performing actions (Twitter posts, Telegram responses)
 * - When explicitly asked to analyze or plan
 * - When dealing with complex tasks
 * 
 * For simple conversation, it bypasses thinking to be more responsive.
 */

import { 
  Agent, 
  ThoughtContext, 
  ThoughtResult, 
  Plan, 
  Decision,
  AgentAction,
  MemoryRecord,
  ActionStatus,
  ActionCategory,
  PlanStep,
  PlanStepStatus
} from '../../types/agent.js'
import { 
  CognitionModule, 
  CognitionModuleMetadata
} from '../../types/cognition.js'
import { MemoryType, MemoryDuration } from '../../types/enums.js'
import { BaseConfig, ActionParameters } from '../../types/common.js'

export interface UnifiedCognitionConfig extends BaseConfig {
  // When to think
  thinkForActions?: boolean // Think before taking actions
  thinkForMentions?: boolean // Think when mentioned/tagged
  thinkOnRequest?: boolean // Think when explicitly asked
  
  // Thinking parameters
  minThinkingConfidence?: number // Minimum confidence to act
  quickResponseMode?: boolean // Skip thinking for casual chat
  analysisDepth?: 'shallow' | 'normal' | 'deep'
  
  // Memory integration
  useMemories?: boolean
  maxMemoryRecall?: number
  
  // Prompt integration ready
  promptEnhanced?: boolean
}

export class UnifiedCognition implements CognitionModule {
  public id: string
  public type: string = 'unified'
  private config: UnifiedCognitionConfig
  
  constructor(config: UnifiedCognitionConfig = {}) {
    this.id = `unified_${Date.now()}`
    this.config = {
      // Defaults
      thinkForActions: true,
      thinkForMentions: true,
      thinkOnRequest: true,
      minThinkingConfidence: 0.6,
      quickResponseMode: true,
      analysisDepth: 'normal',
      useMemories: true,
      maxMemoryRecall: 10,
      promptEnhanced: false,
      ...config
    }
  }

  /**
   * Initialize the cognition module
   */
  initialize(config: BaseConfig): void {
    // Merge any additional config
    this.config = { ...this.config, ...config }
  }

  getMetadata(): CognitionModuleMetadata {
    return {
      id: this.id,
      name: 'Unified Cognition',
      version: '1.0.0',
      description: 'Unified cognition with conditional thinking',
      author: 'SYMindX'
    }
  }

  /**
   * Main thinking method - decides whether to actually think or not
   */
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // Check if we should skip thinking
    if (this.shouldSkipThinking(context)) {
      return this.getQuickResponse()
    }

    // Determine thinking depth based on context
    const depth = this.determineThinkingDepth(context)
    
    // Shallow thinking for simple cases
    if (depth === 'shallow') {
      return this.shallowThink(agent, context)
    }
    
    // Full thinking for complex cases
    return this.deepThink(agent, context)
  }

  /**
   * Determines if we should skip thinking entirely
   */
  private shouldSkipThinking(context: ThoughtContext): boolean {
    // Skip if quick response mode and no special triggers
    if (!this.config.quickResponseMode) return false
    
    // Check for action events
    const hasActionEvent = context.events.some(e => 
      e.type.includes('action') || 
      e.type.includes('command') ||
      e.type.includes('tool')
    )
    if (hasActionEvent && this.config.thinkForActions) return false
    
    // Check for mentions/tags
    const hasMention = context.events.some(e => 
      e.data?.mentioned === true ||
      e.data?.tagged === true ||
      e.type.includes('mention')
    )
    if (hasMention && this.config.thinkForMentions) return false
    
    // Check for explicit thinking requests
    const hasThinkRequest = context.events.some(e => {
      const message = e.data?.message
      if (typeof message !== 'string') return false
      const lowerMessage = message.toLowerCase()
      return lowerMessage.includes('think about') ||
             lowerMessage.includes('analyze') ||
             lowerMessage.includes('plan') ||
             lowerMessage.includes('what do you think')
    })
    if (hasThinkRequest && this.config.thinkOnRequest) return false
    
    // Check if goal requires thinking
    if (context.goal && context.goal.length > 0) return false
    
    // Skip thinking for simple conversation
    return true
  }

  /**
   * Quick response without thinking
   */
  private getQuickResponse(): ThoughtResult {
    return {
      thoughts: [],
      actions: [],
      emotions: {
        current: 'neutral',
        intensity: 0.5,
        triggers: [],
        history: [],
        timestamp: new Date()
      },
      memories: [],
      confidence: 0.8
    }
  }

  /**
   * Determines how deeply to think
   */
  private determineThinkingDepth(context: ThoughtContext): 'shallow' | 'normal' | 'deep' {
    // Deep thinking for complex goals
    if (context.goal && context.goal.includes('complex')) return 'deep'
    
    // Deep thinking for multiple events
    if (context.events.length > 3) return 'deep'
    
    // Shallow thinking for simple queries
    const simplePatterns = ['hello', 'hi', 'thanks', 'okay', 'yes', 'no']
    const hasSimpleMessage = context.events.some(e => {
      const msg = e.data?.message
      if (typeof msg !== 'string') return false
      return simplePatterns.some(p => msg.toLowerCase().includes(p))
    })
    if (hasSimpleMessage) return 'shallow'
    
    return this.config.analysisDepth || 'normal'
  }

  /**
   * Shallow thinking - quick analysis
   */
  private async shallowThink(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const thoughts: string[] = []
    const memories: MemoryRecord[] = []
    
    // Quick situation assessment
    if (context.events.length > 0) {
      const event = context.events[0]
      thoughts.push(`Received ${event.type} event`)
    }
    
    // Basic emotion from context
    const emotion = this.assessBasicEmotion(context)
    
    return {
      thoughts,
      actions: [],
      emotions: emotion,
      memories,
      confidence: 0.7
    }
  }

  /**
   * Deep thinking - full analysis
   */
  private async deepThink(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    const thoughts: string[] = []
    const actions: AgentAction[] = []
    const memories: MemoryRecord[] = []
    
    // 1. Analyze the situation
    const situation = this.analyzeSituation(context)
    thoughts.push(`Situation: ${situation.summary}`)
    
    // 2. Retrieve relevant memories if enabled
    let relevantMemories: any[] = []
    if (this.config.useMemories && agent.memory && context.memories) {
      relevantMemories = context.memories.slice(0, this.config.maxMemoryRecall)
      if (relevantMemories.length > 0) {
        thoughts.push(`Recalled ${relevantMemories.length} relevant memories`)
      }
    }
    
    // 3. Determine if action is needed
    if (situation.requiresAction) {
      const action = this.determineAction(agent, situation, context)
      if (action) {
        actions.push(action)
        thoughts.push(`Decided to: ${action.type} - ${action.action}`)
      }
    }
    
    // 4. Process emotions based on situation
    const emotion = this.processEmotions(agent, situation, context)
    
    // 5. Create memories if significant
    if (situation.significance > 0.6) {
      const memory = this.createMemory(agent, situation, thoughts)
      memories.push(memory as MemoryRecord)
    }
    
    // 6. Build response with confidence
    const confidence = this.calculateConfidence(situation, relevantMemories)
    
    return {
      thoughts,
      actions,
      emotions: emotion,
      memories,
      confidence
    }
  }

  /**
   * Analyze the current situation
   */
  private analyzeSituation(context: ThoughtContext): any {
    const situation = {
      type: 'unknown',
      summary: 'Processing events',
      requiresAction: false,
      requiresPlanning: false,
      significance: 0.5,
      complexity: 0.3
    }
    
    // Analyze events
    for (const event of context.events) {
      // Communication events
      if (event.type.includes('communication') || event.type.includes('message')) {
        situation.type = 'communication'
        situation.summary = 'Responding to communication'
        situation.significance = 0.6
        
        // Check if it's a question
        const message = event.data?.message
        if (typeof message === 'string' && message.includes('?')) {
          situation.requiresAction = true
          situation.significance = 0.7
        }
      }
      
      // Action requests
      if (event.type.includes('action') || event.type.includes('command')) {
        situation.type = 'action_request'
        situation.summary = 'Action requested'
        situation.requiresAction = true
        situation.significance = 0.8
      }
      
      // Mentions/tags (social media)
      if (event.data?.mentioned || event.type.includes('mention')) {
        situation.type = 'social_mention'
        situation.summary = 'Mentioned on social media'
        situation.requiresAction = true
        situation.significance = 0.9
      }
    }
    
    // Check goals
    if (context.goal) {
      situation.requiresPlanning = true
      situation.complexity = 0.7
    }
    
    return situation
  }

  /**
   * Determine what action to take
   */
  private determineAction(agent: Agent, situation: any, context: ThoughtContext): AgentAction | null {
    // Don't create actions for simple communication
    if (situation.type === 'communication' && !situation.requiresAction) {
      return null
    }
    
    // Social media response
    if (situation.type === 'social_mention') {
      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: 'respond_to_mention',
        parameters: {
          platform: context.events[0]?.source || 'unknown',
          responseType: 'thoughtful'
        },
        priority: 0.8,
        status: ActionStatus.PENDING,
        extension: context.events[0]?.source || 'social',
        timestamp: new Date()
      }
    }
    
    // Action request
    if (situation.type === 'action_request') {
      const event = context.events.find(e => e.type.includes('action'))
      return {
        id: `action_${Date.now()}`,
        agentId: agent.id,
        type: ActionCategory.COMMUNICATION,
        action: event?.data?.action as string || 'process_request',
        parameters: (typeof event?.data?.parameters === 'object' && 
                    event?.data?.parameters !== null && 
                    !(event?.data?.parameters instanceof Date) &&
                    !Array.isArray(event?.data?.parameters)) 
          ? event.data.parameters as ActionParameters
          : {},
        priority: 0.9,
        status: ActionStatus.PENDING,
        extension: event?.source || 'unknown',
        timestamp: new Date()
      }
    }
    
    return null
  }

  /**
   * Process emotions based on situation
   */
  private processEmotions(agent: Agent, situation: any, context: ThoughtContext): any {
    // Base emotion
    let emotion = 'neutral'
    let intensity = 0.5
    const triggers: string[] = []
    
    // Adjust based on situation
    if (situation.type === 'social_mention') {
      emotion = 'excited'
      intensity = 0.7
      triggers.push('social_interaction')
    } else if (situation.type === 'communication') {
      // Check sentiment of messages
      const hasPositive = context.events.some(e => {
        const msg = e.data?.message
        if (typeof msg !== 'string') return false
        const lowerMsg = msg.toLowerCase()
        return lowerMsg.includes('thanks') || lowerMsg.includes('great') || lowerMsg.includes('awesome')
      })
      if (hasPositive) {
        emotion = 'happy'
        intensity = 0.6
        triggers.push('positive_feedback')
      }
    }
    
    return { 
      current: emotion, 
      intensity, 
      triggers,
      history: [],
      timestamp: new Date()
    }
  }

  /**
   * Basic emotion assessment for shallow thinking
   */
  private assessBasicEmotion(context: ThoughtContext): any {
    return {
      current: 'neutral',
      intensity: 0.5,
      triggers: [],
      history: [],
      timestamp: new Date()
    }
  }

  /**
   * Create a memory record
   */
  private createMemory(agent: Agent, situation: any, thoughts: string[]): MemoryRecord {
    return {
      id: `memory_${Date.now()}`,
      agentId: agent.id,
      type: MemoryType.EXPERIENCE,
      content: `${situation.summary}: ${thoughts.join('. ')}`,
      metadata: {
        situationType: situation.type,
        significance: situation.significance,
        timestamp: new Date()
      },
      importance: situation.significance,
      timestamp: new Date(),
      tags: [situation.type, 'thinking', 'cognition'],
      duration: MemoryDuration.LONG_TERM
    }
  }

  /**
   * Calculate confidence in thinking
   */
  private calculateConfidence(situation: any, memories: any[]): number {
    let confidence = 0.5
    
    // Higher confidence for familiar situations
    if (memories.length > 3) confidence += 0.2
    
    // Higher confidence for clear situation types
    if (situation.type !== 'unknown') confidence += 0.2
    
    // Lower confidence for complex situations
    if (situation.complexity > 0.7) confidence -= 0.1
    
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  /**
   * Create a simple plan
   */
  private createSimplePlan(situation: any): Plan | null {
    if (!situation.requiresPlanning) return null
    
    const steps: PlanStep[] = [
      {
        id: `step_1`,
        action: 'analyze_requirements',
        description: 'Understand what needs to be done',
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: [],
        effects: []
      },
      {
        id: `step_2`,
        action: 'execute_task',
        description: 'Perform the required action',
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: ['step_1'],
        effects: []
      }
    ]
    
    return {
      id: `plan_${Date.now()}`,
      goal: situation.summary,
      steps,
      priority: 0.7,
      estimatedDuration: 3600000, // 1 hour
      dependencies: [],
      status: PlanStatus.PENDING
    }
  }

  /**
   * Plan method - creates plans for goals
   */
  async plan(agent: Agent, goal: string): Promise<Plan> {
    // Simple planning - just create basic steps
    const steps: PlanStep[] = [
      {
        id: 'analyze',
        action: 'analyze_goal',
        description: `Analyze: ${goal}`,
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: [],
        effects: []
      },
      {
        id: 'execute',
        action: 'work_towards_goal',
        description: `Work on: ${goal}`,
        status: PlanStepStatus.PENDING,
        parameters: {},
        preconditions: ['analyze'],
        effects: []
      }
    ]
    
    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      priority: 0.7,
      estimatedDuration: 3600000,
      dependencies: [],
      status: PlanStatus.PENDING
    }
  }

  /**
   * Decide method - makes decisions between options
   */
  async decide(agent: Agent, options: Decision[]): Promise<Decision> {
    // Simple decision making - pick highest confidence option
    if (options.length === 0) {
      throw new Error('No options to decide between')
    }
    
    if (options.length === 1) {
      return options[0]
    }
    
    // Weight options based on confidence
    let bestOption = options[0]
    let bestScore = bestOption.confidence || 0
    
    for (const option of options) {
      const score = option.confidence || 0
      
      if (score > bestScore) {
        bestScore = score
        bestOption = option
      }
    }
    
    return bestOption
  }
}

// Add missing import
import { PlanStatus } from '../../types/agent.js'

// Factory function
export function createUnifiedCognition(config?: UnifiedCognitionConfig): UnifiedCognition {
  return new UnifiedCognition(config)
}