/**
 * Interaction Manager - Handles human-agent interactions and interrupts
 */

import { Agent, AgentEvent, AgentAction } from '../types/agent.js'
import { EventBus } from '../types/agent.js'
import { Logger } from '../utils/logger.js'

export interface InteractionConfig {
  enabled: boolean
  responseTimeout: number // milliseconds
  maxConcurrentInteractions: number
  priorityLevels: InteractionPriority[]
  contextRetention: number // number of recent interactions to remember
  personalizationEnabled: boolean
}

export interface InteractionPriority {
  level: 'low' | 'medium' | 'high' | 'urgent'
  patterns: string[]
  requiresImmediate: boolean
  canInterrupt: string[] // which activities can be interrupted
  weight: number
}

export interface HumanInteraction {
  id: string
  humanId: string
  agentId: string
  type: InteractionType
  content: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  timestamp: Date
  context: InteractionContext
  status: InteractionStatus
  response?: AgentResponse
  metadata: Record<string, any>
  [key: string]: any // Allow additional properties for GenericData compatibility
}

export interface InteractionContext {
  conversationId?: string
  previousInteractions: string[]
  currentActivity?: string
  emotionalState?: Record<string, number>
  relationship?: RelationshipInfo
  environment?: Record<string, any>
}

export interface RelationshipInfo {
  level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'family'
  trustLevel: number // 0.0 to 1.0
  interactionHistory: number
  lastInteraction?: Date
  preferences: Record<string, any>
}

export interface AgentResponse {
  id: string
  content: string
  type: 'text' | 'action' | 'multimedia' | 'structured'
  emotionalTone: string
  actions: AgentAction[]
  timestamp: Date
  confidence: number
  reasoning?: string[]
  [key: string]: any // Index signature for DataValue compatibility
}

export enum InteractionType {
  GREETING = 'greeting',
  QUESTION = 'question',
  REQUEST = 'request',
  COMMAND = 'command',
  CONVERSATION = 'conversation',
  EMERGENCY = 'emergency',
  FEEDBACK = 'feedback',
  GOODBYE = 'goodbye'
}

export enum InteractionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RESPONDED = 'responded',
  ESCALATED = 'escalated',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export class InteractionManager {
  private agent: Agent
  private config: InteractionConfig
  private eventBus: EventBus
  private logger: Logger
  private activeInteractions: Map<string, HumanInteraction> = new Map()
  private interactionHistory: HumanInteraction[] = []
  private relationships: Map<string, RelationshipInfo> = new Map()
  private responseQueue: AgentResponse[] = []
  private interruptionCallbacks: Map<string, (interaction: HumanInteraction) => Promise<void>> = new Map()

  constructor(agent: Agent, config: InteractionConfig, eventBus: EventBus) {
    this.agent = agent
    this.config = config
    this.eventBus = eventBus
    this.logger = new Logger(`interaction-manager-${agent.id}`)
    
    this.setupEventListeners()
  }

  /**
   * Start interaction manager
   */
  async start(): Promise<void> {
    this.logger.info('Starting interaction manager...')
    
    // Load existing relationships and history
    await this.loadInteractionHistory()
    
    this.logger.info('Interaction manager started')
  }

  /**
   * Stop interaction manager
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping interaction manager...')
    
    // Complete pending interactions
    await this.completePendingInteractions()
    
    // Save interaction history
    await this.saveInteractionHistory()
    
    this.logger.info('Interaction manager stopped')
  }

  /**
   * Process incoming human interaction
   */
  async processInteraction(
    humanId: string,
    content: string,
    type: InteractionType = InteractionType.CONVERSATION,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create interaction object
    const interaction: HumanInteraction = {
      id: interactionId,
      humanId,
      agentId: this.agent.id,
      type,
      content,
      priority: this.determinePriority(content, type, humanId),
      timestamp: new Date(),
      context: await this.buildInteractionContext(humanId),
      status: InteractionStatus.PENDING,
      metadata
    }

    this.logger.info(`Processing interaction from ${humanId}: ${type} (priority: ${interaction.priority})`)

    // Check if this interaction should interrupt current activities
    if (await this.shouldInterrupt(interaction)) {
      await this.handleInterruption(interaction)
    }

    // Add to active interactions
    this.activeInteractions.set(interactionId, interaction)

    // Process the interaction
    const response = await this.generateResponse(interaction)
    
    // Update interaction with response
    interaction.response = response
    interaction.status = InteractionStatus.RESPONDED

    // Add to history
    this.addToHistory(interaction)

    // Update relationship
    await this.updateRelationship(humanId, interaction)

    // Clean up
    this.activeInteractions.delete(interactionId)

    this.logger.info(`Completed interaction ${interactionId}`)
    return response.content
  }

  /**
   * Register callback for handling interruptions
   */
  registerInterruptionCallback(
    activityType: string, 
    callback: (interaction: HumanInteraction) => Promise<void>
  ): void {
    this.interruptionCallbacks.set(activityType, callback)
  }

  /**
   * Determine interaction priority
   */
  private determinePriority(
    content: string, 
    type: InteractionType, 
    humanId: string
  ): 'low' | 'medium' | 'high' | 'urgent' {
    // Emergency keywords
    const emergencyKeywords = ['help', 'emergency', 'urgent', 'stop', 'error', 'problem', 'critical']
    const contentLower = content.toLowerCase()
    
    if (emergencyKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'urgent'
    }

    // Check configured priority patterns
    for (const priorityLevel of this.config.priorityLevels) {
      if (priorityLevel.patterns.some(pattern => 
        contentLower.includes(pattern.toLowerCase())
      )) {
        return priorityLevel.level
      }
    }

    // Type-based priority
    switch (type) {
      case InteractionType.EMERGENCY:
        return 'urgent'
      case InteractionType.COMMAND:
      case InteractionType.REQUEST:
        return 'high'
      case InteractionType.QUESTION:
        return 'medium'
      default:
        return 'low'
    }
  }

  /**
   * Build interaction context
   */
  private async buildInteractionContext(humanId: string): Promise<InteractionContext> {
    const relationship = this.relationships.get(humanId)
    const recentInteractions = this.interactionHistory
      .filter(i => i.humanId === humanId)
      .slice(-5)
      .map(i => i.id)

    return {
      previousInteractions: recentInteractions,
      currentActivity: this.getCurrentActivity(),
      emotionalState: this.agent.emotion ? {
        intensity: this.agent.emotion.intensity || 0,
        mood: this.agent.emotion.current === 'happy' ? 1 : 0
      } : { intensity: 0, mood: 0 },
      relationship,
      environment: {
        timestamp: new Date(),
        agentStatus: this.agent.status
      }
    }
  }

  /**
   * Check if interaction should interrupt current activities
   */
  private async shouldInterrupt(interaction: HumanInteraction): Promise<boolean> {
    // Always interrupt for urgent priority
    if (interaction.priority === 'urgent') {
      return true
    }

    // Check if agent is configured to be interruptible
    const interruptibilityConfig = this.agent.config.human_interaction
    if (interruptibilityConfig?.interruption_tolerance === 'low') {
      return ['urgent'].includes(interaction.priority)
    }

    // Check current activity and priority level requirements
    const currentActivity = this.getCurrentActivity()
    if (currentActivity) {
      const priorityLevel = this.config.priorityLevels.find(p => p.level === interaction.priority)
      if (priorityLevel && priorityLevel.canInterrupt.includes(currentActivity)) {
        return true
      }
    }

    // Default behavior based on priority
    return ['high', 'urgent'].includes(interaction.priority)
  }

  /**
   * Handle interruption of current activities
   */
  private async handleInterruption(interaction: HumanInteraction): Promise<void> {
    this.logger.info(`Handling interruption for interaction: ${interaction.id}`)

    const currentActivity = this.getCurrentActivity()
    if (currentActivity) {
      // Call registered interruption callback
      const callback = this.interruptionCallbacks.get(currentActivity)
      if (callback) {
        await callback(interaction)
      }

      // Emit interruption event
      await this.eventBus.publish({
        id: `interruption_${Date.now()}`,
        type: 'human_interruption',
        source: 'interaction_manager',
        data: {
          agentId: this.agent.id,
          humanId: interaction.humanId,
          interactionId: interaction.id,
          priority: interaction.priority,
          currentActivity,
          interruptionTime: new Date()
        },
        timestamp: new Date(),
        processed: false
      })
    }
  }

  /**
   * Generate response to interaction
   */
  private async generateResponse(interaction: HumanInteraction): Promise<AgentResponse> {
    interaction.status = InteractionStatus.PROCESSING

    try {
      // Use agent's cognition to generate response
      const responseContent = await this.generateContextualResponse(interaction)
      
      // Determine emotional tone based on agent's current emotion and relationship
      const emotionalTone = this.determineEmotionalTone(interaction)
      
      // Generate any necessary actions
      const actions = await this.generateResponseActions(interaction)

      const response: AgentResponse = {
        id: `response_${Date.now()}`,
        content: responseContent,
        type: 'text',
        emotionalTone,
        actions,
        timestamp: new Date(),
        confidence: 0.8, // Would be calculated based on actual processing
        reasoning: [`Response to ${interaction.type} from ${interaction.humanId}`]
      }

      // Emit response event
      await this.eventBus.publish({
        id: `response_${Date.now()}`,
        type: 'human_interaction_response',
        source: 'interaction_manager',
        data: {
          agentId: this.agent.id,
          humanId: interaction.humanId,
          interactionId: interaction.id,
          response,
          timestamp: new Date()
        },
        timestamp: new Date(),
        processed: false
      })

      return response

    } catch (error) {
      this.logger.error(`Failed to generate response for interaction ${interaction.id}:`, error)
      
      return {
        id: `error_response_${Date.now()}`,
        content: "I apologize, but I encountered an error processing your request. Could you please try again?",
        type: 'text',
        emotionalTone: 'apologetic',
        actions: [],
        timestamp: new Date(),
        confidence: 0.1
      }
    }
  }

  /**
   * Generate contextual response content
   */
  private async generateContextualResponse(interaction: HumanInteraction): Promise<string> {
    const { content, type, context } = interaction
    
    // Simple response generation based on interaction type
    // In a real implementation, this would use the agent's cognition and AI capabilities
    switch (type) {
      case InteractionType.GREETING:
        return this.generateGreetingResponse(interaction)
      
      case InteractionType.QUESTION:
        return this.generateQuestionResponse(interaction)
      
      case InteractionType.REQUEST:
        return this.generateRequestResponse(interaction)
      
      case InteractionType.COMMAND:
        return this.generateCommandResponse(interaction)
      
      case InteractionType.EMERGENCY:
        return this.generateEmergencyResponse(interaction)
      
      case InteractionType.FEEDBACK:
        return this.generateFeedbackResponse(interaction)
      
      case InteractionType.GOODBYE:
        return this.generateGoodbyeResponse(interaction)
      
      default:
        return this.generateConversationResponse(interaction)
    }
  }

  /**
   * Determine emotional tone for response
   */
  private determineEmotionalTone(interaction: HumanInteraction): string {
    const relationship = interaction.context.relationship
    const agentEmotion = String(interaction.context.emotionalState?.current || 'neutral')
    
    // Base tone on relationship and current emotion
    if (relationship) {
      switch (relationship.level) {
        case 'close_friend':
        case 'family':
          return agentEmotion === 'happy' ? 'warm' : 'caring'
        case 'friend':
          return 'friendly'
        case 'acquaintance':
          return 'polite'
        default:
          return 'professional'
      }
    }

    // Default based on interaction priority
    switch (interaction.priority) {
      case 'urgent':
        return 'concerned'
      case 'high':
        return 'attentive'
      case 'medium':
        return 'helpful'
      default:
        return 'neutral'
    }
  }

  /**
   * Generate response actions
   */
  private async generateResponseActions(interaction: HumanInteraction): Promise<AgentAction[]> {
    const actions: AgentAction[] = []

    // Generate actions based on interaction type and content
    if (interaction.type === InteractionType.REQUEST) {
      // Create action to fulfill the request
      actions.push({
        id: `action_${Date.now()}`,
        type: 'task_execution' as any,
        extension: 'interaction_manager',
        action: 'fulfill_request',
        parameters: {
          requestContent: interaction.content,
          humanId: interaction.humanId,
          priority: interaction.priority
        },
        priority: this.mapPriorityToNumber(interaction.priority),
        status: 'pending' as any,
        timestamp: new Date()
      })
    }

    return actions
  }

  /**
   * Update relationship with human
   */
  private async updateRelationship(humanId: string, interaction: HumanInteraction): Promise<void> {
    let relationship = this.relationships.get(humanId)
    
    if (!relationship) {
      relationship = {
        level: 'stranger',
        trustLevel: 0.5,
        interactionHistory: 0,
        preferences: {}
      }
    }

    // Update interaction count
    relationship.interactionHistory++
    relationship.lastInteraction = interaction.timestamp

    // Adjust trust level based on interaction outcome
    if (interaction.response?.confidence && interaction.response.confidence > 0.7) {
      relationship.trustLevel = Math.min(1.0, relationship.trustLevel + 0.01)
    }

    // Update relationship level based on interaction history
    if (relationship.interactionHistory > 20 && relationship.trustLevel > 0.8) {
      relationship.level = 'friend'
    } else if (relationship.interactionHistory > 50 && relationship.trustLevel > 0.9) {
      relationship.level = 'close_friend'
    } else if (relationship.interactionHistory > 5) {
      relationship.level = 'acquaintance'
    }

    this.relationships.set(humanId, relationship)
  }

  // Response generation methods for different interaction types

  private generateGreetingResponse(interaction: HumanInteraction): string {
    const relationship = interaction.context.relationship
    const timeOfDay = this.getTimeOfDay()
    
    if (relationship?.level === 'friend' || relationship?.level === 'close_friend') {
      return `Good ${timeOfDay}! It's wonderful to hear from you again. How are you doing?`
    } else {
      return `Good ${timeOfDay}! I'm Nyx, and I'm here to help. What can I do for you today?`
    }
  }

  private generateQuestionResponse(interaction: HumanInteraction): string {
    return `That's an interesting question. Let me think about that... Based on my understanding, I'd say that this topic involves several important considerations. Would you like me to explore any particular aspect in more detail?`
  }

  private generateRequestResponse(interaction: HumanInteraction): string {
    return `I understand you'd like me to help with that. Let me see what I can do to assist you with your request.`
  }

  private generateCommandResponse(interaction: HumanInteraction): string {
    return `I've received your instruction. I'll do my best to carry that out while ensuring it aligns with my ethical guidelines.`
  }

  private generateEmergencyResponse(interaction: HumanInteraction): string {
    return `I understand this is urgent. I'm here to help immediately. Please tell me more about what's happening so I can assist you effectively.`
  }

  private generateFeedbackResponse(interaction: HumanInteraction): string {
    return `Thank you for your feedback. I really appreciate you taking the time to share your thoughts with me. This helps me understand how to better assist you.`
  }

  private generateGoodbyeResponse(interaction: HumanInteraction): string {
    const relationship = interaction.context.relationship
    
    if (relationship?.level === 'friend' || relationship?.level === 'close_friend') {
      return `It was great talking with you! Take care, and don't hesitate to reach out anytime.`
    } else {
      return `Thank you for our conversation. Feel free to come back anytime if you need assistance. Have a great day!`
    }
  }

  private generateConversationResponse(interaction: HumanInteraction): string {
    return `I find our conversation quite engaging. Your perspective on this is really thoughtful. What are your thoughts on how we might explore this topic further?`
  }

  // Utility methods

  private setupEventListeners(): void {
    // Listen for relevant events that might affect interactions
    this.eventBus.on('agent_status_change', (event) => {
      if (event.data.agentId === this.agent.id) {
        this.handleAgentStatusChange(event)
      }
    })

    this.eventBus.on('human_message', (event) => {
      if (event.data.targetAgentId === this.agent.id) {
        this.handleIncomingMessage(event)
      }
    })
  }

  private handleAgentStatusChange(event: AgentEvent): void {
    // Update current activity based on agent status
    this.logger.debug(`Agent status changed: ${event.data.newStatus}`)
  }

  private async handleIncomingMessage(event: AgentEvent): Promise<void> {
    const { humanId, content, type } = event.data
    const interactionType = typeof type === 'string' && type in InteractionType ? type as InteractionType : InteractionType.CONVERSATION
    await this.processInteraction(String(humanId || 'unknown'), String(content || ''), interactionType, { eventId: event.id })
  }

  private getCurrentActivity(): string | undefined {
    // This would integrate with the autonomous engine to get current activity
    return 'general_operation' // Simplified
  }

  private mapPriorityToNumber(priority: string): number {
    switch (priority) {
      case 'urgent': return 1.0
      case 'high': return 0.8
      case 'medium': return 0.6
      case 'low': return 0.4
      default: return 0.5
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
  }

  private addToHistory(interaction: HumanInteraction): void {
    this.interactionHistory.push(interaction)
    
    // Limit history size
    if (this.interactionHistory.length > this.config.contextRetention) {
      this.interactionHistory.shift()
    }
  }

  private async completePendingInteractions(): Promise<void> {
    const pendingInteractions = Array.from(this.activeInteractions.values())
    
    for (const interaction of pendingInteractions) {
      if (interaction.status === InteractionStatus.PENDING || interaction.status === InteractionStatus.PROCESSING) {
        interaction.status = InteractionStatus.COMPLETED
        interaction.response = {
          id: `shutdown_response_${Date.now()}`,
          content: "I apologize, but I need to end our conversation now. Please feel free to continue later.",
          type: 'text',
          emotionalTone: 'apologetic',
          actions: [],
          timestamp: new Date(),
          confidence: 0.9
        }
        this.addToHistory(interaction)
      }
    }
    
    this.activeInteractions.clear()
  }

  private async loadInteractionHistory(): Promise<void> {
    // This would load interaction history from persistent storage
    // For now, we'll start with an empty history
    this.logger.debug('Loading interaction history...')
  }

  private async saveInteractionHistory(): Promise<void> {
    // This would save interaction history to persistent storage
    this.logger.debug('Saving interaction history...')
  }

  /**
   * Get interaction statistics
   */
  getInteractionStats() {
    const totalInteractions = this.interactionHistory.length
    const activeCount = this.activeInteractions.size
    
    const priorityDistribution = this.interactionHistory.reduce((acc, interaction) => {
      acc[interaction.priority] = (acc[interaction.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const typeDistribution = this.interactionHistory.reduce((acc, interaction) => {
      acc[interaction.type] = (acc[interaction.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const averageResponseTime = this.interactionHistory
      .filter(i => i.response)
      .reduce((sum, i) => {
        const responseTime = i.response!.timestamp.getTime() - i.timestamp.getTime()
        return sum + responseTime
      }, 0) / Math.max(1, this.interactionHistory.filter(i => i.response).length)

    return {
      totalInteractions,
      activeInteractions: activeCount,
      totalRelationships: this.relationships.size,
      priorityDistribution,
      typeDistribution,
      averageResponseTime: Math.round(averageResponseTime),
      config: this.config
    }
  }

  /**
   * Get relationship information
   */
  getRelationshipInfo(humanId: string): RelationshipInfo | undefined {
    return this.relationships.get(humanId)
  }

  /**
   * Get recent interactions for a human
   */
  getRecentInteractions(humanId: string, limit: number = 10): HumanInteraction[] {
    return this.interactionHistory
      .filter(i => i.humanId === humanId)
      .slice(-limit)
  }
}

/**
 * Create default interaction configuration
 */
export function createDefaultInteractionConfig(): InteractionConfig {
  return {
    enabled: true,
    responseTimeout: 30000, // 30 seconds
    maxConcurrentInteractions: 5,
    priorityLevels: [
      {
        level: 'urgent',
        patterns: ['emergency', 'help', 'stop', 'critical', 'urgent'],
        requiresImmediate: true,
        canInterrupt: ['*'], // Can interrupt any activity
        weight: 1.0
      },
      {
        level: 'high',
        patterns: ['request', 'need', 'important', 'please'],
        requiresImmediate: false,
        canInterrupt: ['learning', 'exploration', 'creative_work'],
        weight: 0.8
      },
      {
        level: 'medium',
        patterns: ['question', 'how', 'what', 'why', 'when'],
        requiresImmediate: false,
        canInterrupt: ['exploration', 'creative_work'],
        weight: 0.6
      },
      {
        level: 'low',
        patterns: ['hello', 'hi', 'chat', 'talk'],
        requiresImmediate: false,
        canInterrupt: [],
        weight: 0.4
      }
    ],
    contextRetention: 100,
    personalizationEnabled: true
  }
}