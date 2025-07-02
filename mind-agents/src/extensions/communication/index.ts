/**
 * Communication Extension for SYMindX
 * 
 * Provides advanced communication features including context management,
 * expression adaptation, and style customization for agent interactions.
 */

import { ExtensionConfig, Extension, ExtensionMetadata } from '../types.js'
import { Agent } from '../../types/agent.js'
import { runtimeLogger } from '../../utils/logger.js'
import { ContextManager, ContextManagerConfig } from './context-manager.js'
import { ExpressionEngine, ExpressionEngineConfig } from './expression-engine.js'
import { StyleAdapter, StyleAdapterConfig } from './style-adapter.js'

export interface CommunicationExtensionConfig extends ExtensionConfig {
  enabled: boolean
  contextManager?: ContextManagerConfig
  expressionEngine?: ExpressionEngineConfig
  styleAdapter?: StyleAdapterConfig
  enableContextPersistence?: boolean
  enableStyleAdaptation?: boolean
  enableExpressionVariation?: boolean
}

export class CommunicationExtension implements Extension {
  public readonly metadata: ExtensionMetadata = {
    name: 'communication',
    version: '1.0.0',
    description: 'Advanced communication features with context, expression, and style management',
    author: 'SYMindX',
    dependencies: [],
    capabilities: [
      'context_management',
      'conversation_continuity',
      'style_adaptation',
      'expression_variation',
      'mood_detection',
      'intent_analysis',
      'topic_tracking'
    ]
  }

  private config: CommunicationExtensionConfig
  private contextManager: ContextManager
  private expressionEngine: ExpressionEngine
  private styleAdapter: StyleAdapter
  private agent?: Agent

  constructor(config: CommunicationExtensionConfig) {
    this.config = {
      enabled: true,
      enableContextPersistence: true,
      enableStyleAdaptation: true,
      enableExpressionVariation: true,
      contextManager: {},
      expressionEngine: {},
      styleAdapter: {},
      ...config
    }

    this.contextManager = new ContextManager(this.config.contextManager)
    this.expressionEngine = new ExpressionEngine(this.config.expressionEngine || {})
    this.styleAdapter = new StyleAdapter(this.config.styleAdapter || {})

    runtimeLogger.info('💬 Communication Extension initialized')
  }

  async initialize(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ Communication Extension is disabled')
      return
    }

    this.agent = agent

    try {
      // Initialize components
      await this.expressionEngine.initialize(agent)
      await this.styleAdapter.initialize(agent)

      // Set up integrations
      await this.setupIntegrations()

      runtimeLogger.info('💬 Communication Extension initialized successfully')
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize Communication Extension:', error)
      throw error
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Export contexts if persistence is enabled
      if (this.config.enableContextPersistence) {
        await this.exportContexts()
      }

      runtimeLogger.info('💬 Communication Extension cleaned up')
    } catch (error) {
      runtimeLogger.error('❌ Error during Communication Extension cleanup:', error)
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Get the context manager
   */
  getContextManager(): ContextManager {
    return this.contextManager
  }

  /**
   * Get the expression engine
   */
  getExpressionEngine(): ExpressionEngine {
    return this.expressionEngine
  }

  /**
   * Get the style adapter
   */
  getStyleAdapter(): StyleAdapter {
    return this.styleAdapter
  }

  /**
   * Process incoming message with full communication features
   */
  async processMessage(
    participantId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<{
    contextSummary: any
    adaptedStyle: any
    expressionVariations: string[]
    recommendations: string[]
  }> {
    if (!this.agent) {
      throw new Error('Communication extension not initialized with agent')
    }

    // Get or create context
    const context = this.contextManager.getOrCreateContext(
      this.agent.id,
      participantId,
      message
    )

    // Add message to context
    this.contextManager.addMessage(context, participantId, message, metadata?.emotion)

    // Get context summary
    const contextSummary = this.contextManager.getContextSummary(context.id)

    // Adapt style if enabled
    let adaptedStyle: any = {}
    if (this.config.enableStyleAdaptation && contextSummary) {
      adaptedStyle = await this.styleAdapter.adaptStyle({
        mood: contextSummary.mood,
        formality: metadata?.formality || 0.5,
        participantStyle: metadata?.participantStyle,
        topics: contextSummary.topics,
        conversationPhase: contextSummary.phase
      })
    }

    // Generate expression variations if enabled
    let expressionVariations: string[] = []
    if (this.config.enableExpressionVariation) {
      expressionVariations = await this.expressionEngine.generateVariations(
        message,
        {
          emotion: metadata?.emotion,
          style: adaptedStyle,
          context: contextSummary
        }
      )
    }

    // Generate recommendations
    const recommendations = this.generateCommunicationRecommendations(
      context,
      contextSummary,
      adaptedStyle
    )

    return {
      contextSummary,
      adaptedStyle,
      expressionVariations,
      recommendations
    }
  }

  /**
   * Generate response with communication enhancements
   */
  async generateEnhancedResponse(
    baseResponse: string,
    participantId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.agent) return baseResponse

    // Get active context
    const context = this.contextManager.getActiveContext(this.agent.id)
    if (!context) return baseResponse

    // Get context summary
    const contextSummary = this.contextManager.getContextSummary(context.id)
    if (!contextSummary) return baseResponse

    // Adapt style
    let adaptedResponse = baseResponse
    if (this.config.enableStyleAdaptation) {
      adaptedResponse = await this.styleAdapter.applyStyle(baseResponse, {
        mood: contextSummary.mood,
        formality: metadata?.formality || 0.5,
        participantStyle: metadata?.participantStyle,
        topics: contextSummary.topics,
        conversationPhase: contextSummary.phase
      })
    }

    // Apply expression enhancements
    if (this.config.enableExpressionVariation) {
      adaptedResponse = await this.expressionEngine.enhanceExpression(
        adaptedResponse,
        {
          emotion: metadata?.emotion,
          context: contextSummary,
          variation: metadata?.expressionVariation || 'balanced'
        }
      )
    }

    // Add response to context
    this.contextManager.addMessage(context, this.agent.id, adaptedResponse, metadata?.emotion)

    return adaptedResponse
  }

  /**
   * Set up integrations with other agent components
   */
  private async setupIntegrations(): Promise<void> {
    // Integration points for other systems would go here
    // For example, connecting to emotion system, memory system, etc.
  }

  /**
   * Export contexts for persistence
   */
  private async exportContexts(): Promise<void> {
    if (!this.agent) return

    try {
      const contexts = this.contextManager.exportContexts()
      
      // Save important contexts to memory if memory system is available
      for (const context of contexts) {
        if (context.messages.length > 5) { // Only save substantial conversations
          const memory = await this.contextManager.preserveToMemory(this.agent, context.id)
          if (memory && this.agent.memory) {
            await this.agent.memory.store(memory)
          }
        }
      }

      runtimeLogger.info(`💾 Exported ${contexts.length} conversation contexts`)
    } catch (error) {
      runtimeLogger.error('❌ Failed to export contexts:', error)
    }
  }

  /**
   * Generate communication recommendations
   */
  private generateCommunicationRecommendations(
    context: any,
    contextSummary: any,
    adaptedStyle: any
  ): string[] {
    const recommendations: string[] = []

    // Pending questions
    if (contextSummary?.pendingQuestions?.length > 0) {
      recommendations.push(`Address ${contextSummary.pendingQuestions.length} pending questions`)
    }

    // Topic continuity
    if (contextSummary?.topics?.length > 0) {
      recommendations.push(`Continue discussion on: ${contextSummary.topics.slice(0, 2).join(', ')}`)
    }

    // Mood adaptation
    if (contextSummary?.mood === 'negative') {
      recommendations.push('Use empathetic tone due to negative mood')
    } else if (contextSummary?.mood === 'positive') {
      recommendations.push('Maintain positive energy in response')
    }

    // Conversation phase
    if (contextSummary?.phase === 'greeting') {
      recommendations.push('Include welcoming elements in response')
    } else if (contextSummary?.phase === 'closing') {
      recommendations.push('Prepare for conversation conclusion')
    }

    return recommendations
  }

  /**
   * Get extension configuration
   */
  getConfig(): CommunicationExtensionConfig {
    return { ...this.config }
  }

  /**
   * Update extension configuration
   */
  async updateConfig(updates: Partial<CommunicationExtensionConfig>): Promise<void> {
    this.config = { ...this.config, ...updates }
    
    // Re-initialize components if needed
    if (this.agent && updates.enabled !== undefined) {
      if (updates.enabled && !this.config.enabled) {
        await this.initialize(this.agent)
      } else if (!updates.enabled && this.config.enabled) {
        await this.cleanup()
      }
    }
  }
}

// Factory function for creating Communication Extension
export function createCommunicationExtension(config: CommunicationExtensionConfig): CommunicationExtension {
  return new CommunicationExtension(config)
}

export default CommunicationExtension