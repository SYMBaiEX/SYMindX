/**
 * Communication Extension for SYMindX
 *
 * Provides advanced communication features including context management,
 * expression adaptation, and style customization for agent interactions.
 */

import {
  Extension,
  ExtensionType,
  ExtensionStatus,
  Agent,
  ExtensionAction,
  ExtensionEventHandler,
  ActionCategory,
  ActionResult,
  ActionResultType,
  AgentEvent
} from '../../types/agent';
import { ExtensionConfig, ExtensionMetadata, SkillParameters } from '../../types/common';
import { runtimeLogger } from '../../utils/logger';

import { ContextManager, ContextManagerConfig } from './context-manager';
import { ExpressionEngine, ExpressionEngineConfig } from './expression-engine';
import { StyleAdapter, StyleAdapterConfig } from './style-adapter';

export interface CommunicationExtensionConfig extends ExtensionConfig {
  contextManager?: ContextManagerConfig;
  expressionEngine?: ExpressionEngineConfig;
  styleAdapter?: StyleAdapterConfig;
  enableContextPersistence?: boolean;
  enableStyleAdaptation?: boolean;
  enableExpressionVariation?: boolean;
}

export class CommunicationExtension implements Extension {
  public readonly id: string = 'communication';
  public readonly name: string = 'Communication Extension';
  public readonly version: string = '1.0.0';
  public readonly type: ExtensionType = ExtensionType.COMMUNICATION;
  public enabled: boolean = true;
  public status: ExtensionStatus = ExtensionStatus.STOPPED;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public readonly metadata: ExtensionMetadata = {
    name: 'communication',
    version: '1.0.0',
    description:
      'Advanced communication features with context, expression, and style management',
    author: 'SYMindX',
  };

  public config: ExtensionConfig;
  private communicationConfig: CommunicationExtensionConfig;
  private contextManager: ContextManager;
  private expressionEngine: ExpressionEngine;
  private styleAdapter: StyleAdapter;
  private agent?: Agent;

  constructor(config: CommunicationExtensionConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      priority: config.priority ?? 1,
      settings: config.settings ?? {},
      dependencies: config.dependencies ?? [],
      capabilities: config.capabilities ?? [],
    };

    this.communicationConfig = {
      ...this.config,
      enableContextPersistence: config.enableContextPersistence ?? true,
      enableStyleAdaptation: config.enableStyleAdaptation ?? true,
      enableExpressionVariation: config.enableExpressionVariation ?? true,
      contextManager: config.contextManager ?? {},
      expressionEngine: config.expressionEngine ?? {},
      styleAdapter: config.styleAdapter ?? {},
    };

    this.contextManager = new ContextManager(
      this.communicationConfig.contextManager || {}
    );
    this.expressionEngine = new ExpressionEngine(
      this.communicationConfig.expressionEngine || {}
    );
    this.styleAdapter = new StyleAdapter(
      this.communicationConfig.styleAdapter || {}
    );

    runtimeLogger.info('💬 Communication Extension initialized');
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ Communication Extension is disabled');
      return;
    }

    this.agent = agent;
    this.status = ExtensionStatus.INITIALIZING;

    try {
      // Initialize components
      await this.expressionEngine.initialize(agent);
      await this.styleAdapter.initialize(agent);

      // Set up integrations
      await this.setupIntegrations();

      // Register extension actions and events
      this.registerExtensionActions();

      this.status = ExtensionStatus.RUNNING;
      runtimeLogger.info('💬 Communication Extension initialized successfully');
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error(
        '❌ Failed to initialize Communication Extension:',
        error
      );
      throw error;
    }
  }

  async tick(agent: Agent): Promise<void> {
    // This method is called on each tick - can be used for periodic operations
    // For communication extension, we might:
    // - Clean up old conversation contexts
    // - Update conversation state
    // - Handle any pending communication tasks

    try {
      // Update agent reference if needed
      if (this.agent?.id !== agent.id) {
        this.agent = agent;
      }

      // Perform periodic maintenance if needed
      // Note: cleanupOldContexts is private, so we skip that for now
    } catch (error) {
      runtimeLogger.error(
        '❌ Error during Communication Extension tick:',
        error
      );
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.status = ExtensionStatus.STOPPING;

      // Export contexts if persistence is enabled
      if (this.communicationConfig.enableContextPersistence) {
        await this.exportContexts();
      }

      this.status = ExtensionStatus.STOPPED;
      runtimeLogger.info('💬 Communication Extension cleaned up');
    } catch (error) {
      this.status = ExtensionStatus.ERROR;
      runtimeLogger.error(
        '❌ Error during Communication Extension cleanup:',
        error
      );
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get the context manager
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Get the expression engine
   */
  getExpressionEngine(): ExpressionEngine {
    return this.expressionEngine;
  }

  /**
   * Get the style adapter
   */
  getStyleAdapter(): StyleAdapter {
    return this.styleAdapter;
  }

  /**
   * Process incoming message with full communication features
   */
  async processMessage(
    participantId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<{
    contextSummary: any;
    adaptedStyle: any;
    expressionVariations: string[];
    recommendations: string[];
  }> {
    if (!this.agent) {
      throw new Error('Communication extension not initialized with agent');
    }

    // Get or create context
    const context = this.contextManager.getOrCreateContext(
      this.agent.id,
      participantId,
      message
    );

    // Add message to context
    this.contextManager.addMessage(
      context,
      participantId,
      message,
      metadata?.emotion
    );

    // Get context summary
    const contextSummary = this.contextManager.getContextSummary(context.id);

    // Adapt style if enabled
    let adaptedStyle: any = {};
    if (this.communicationConfig.enableStyleAdaptation && contextSummary) {
      adaptedStyle = await this.styleAdapter.adaptStyle({
        mood: contextSummary.mood,
        formality: metadata?.formality || 0.5,
        participantStyle: metadata?.participantStyle,
        topics: contextSummary.topics,
        conversationPhase: contextSummary.phase,
      });
    }

    // Generate expression variations if enabled
    let expressionVariations: string[] = [];
    if (this.communicationConfig.enableExpressionVariation) {
      expressionVariations = await this.expressionEngine.generateVariations(
        message,
        {
          emotion: metadata?.emotion,
          style: adaptedStyle,
          context: contextSummary,
        }
      );
    }

    // Generate recommendations
    const recommendations = this.generateCommunicationRecommendations(
      context,
      contextSummary,
      adaptedStyle
    );

    return {
      contextSummary,
      adaptedStyle,
      expressionVariations,
      recommendations,
    };
  }

  /**
   * Generate response with communication enhancements
   */
  async generateEnhancedResponse(
    baseResponse: string,
    participantId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.agent) return baseResponse;

    // Get active context
    const context = this.contextManager.getActiveContext(this.agent.id);
    if (!context) return baseResponse;

    // Get context summary
    const contextSummary = this.contextManager.getContextSummary(context.id);
    if (!contextSummary) return baseResponse;

    // Adapt style
    let adaptedResponse = baseResponse;
    if (this.communicationConfig.enableStyleAdaptation) {
      adaptedResponse = await this.styleAdapter.applyStyle(baseResponse, {
        mood: contextSummary.mood,
        formality: metadata?.formality || 0.5,
        participantStyle: metadata?.participantStyle,
        topics: contextSummary.topics,
        conversationPhase: contextSummary.phase,
      });
    }

    // Apply expression enhancements
    if (this.communicationConfig.enableExpressionVariation) {
      adaptedResponse = await this.expressionEngine.enhanceExpression(
        adaptedResponse,
        {
          emotion: metadata?.emotion,
          context: contextSummary,
          variation: metadata?.expressionVariation || 'balanced',
        }
      );
    }

    // Add response to context
    this.contextManager.addMessage(
      context,
      this.agent.id,
      adaptedResponse,
      metadata?.emotion
    );

    return adaptedResponse;
  }

  /**
   * Set up integrations with other agent components
   */
  private async setupIntegrations(): Promise<void> {
    // Integration points for other systems would go here
    // For example, connecting to emotion system, memory system, etc.
  }

  /**
   * Register extension actions and events
   */
  private registerExtensionActions(): void {
    // Register communication actions
    this.actions['processMessage'] = {
      name: 'processMessage',
      description: 'Process incoming message with communication features',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        participantId: { type: 'string', required: true, description: 'Participant ID' },
        message: { type: 'string', required: true, description: 'Message content' },
        metadata: { type: 'object', required: false, description: 'Additional metadata' }
      },
      execute: async (_agent: Agent, params: SkillParameters): Promise<ActionResult> => {
        const { participantId, message, metadata } = params;
        const result = await this.processMessage(
          participantId as string,
          message as string,
          metadata as Record<string, any>
        );
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result,
          timestamp: new Date()
        };
      }
    };

    this.actions['generateEnhancedResponse'] = {
      name: 'generateEnhancedResponse',
      description: 'Generate response with communication enhancements',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        baseResponse: { type: 'string', required: true, description: 'Base response text' },
        participantId: { type: 'string', required: true, description: 'Participant ID' },
        metadata: { type: 'object', required: false, description: 'Additional metadata' }
      },
      execute: async (_agent: Agent, params: SkillParameters): Promise<ActionResult> => {
        const { baseResponse, participantId, metadata } = params;
        const result = await this.generateEnhancedResponse(
          baseResponse as string,
          participantId as string,
          metadata as Record<string, any>
        );
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result,
          timestamp: new Date()
        };
      }
    };

    this.actions['getContextSummary'] = {
      name: 'getContextSummary',
      description: 'Get context summary for conversation',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        contextId: { type: 'string', required: true, description: 'Context ID' }
      },
      execute: async (_agent: Agent, params: SkillParameters): Promise<ActionResult> => {
        const { contextId } = params;
        const result = this.contextManager.getContextSummary(contextId as string);
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result,
          timestamp: new Date()
        };
      }
    };

    // Register event handlers
    this.events['message_received'] = {
      event: 'message_received',
      description: 'Handle incoming message events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle message received events
        runtimeLogger.info('Communication extension received message event:', event);
        // TODO: Process message through communication features
      }
    };

    this.events['context_updated'] = {
      event: 'context_updated',
      description: 'Handle context update events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle context update events
        runtimeLogger.info('Communication extension context updated:', event);
      }
    };

    this.events['style_adapted'] = {
      event: 'style_adapted',
      description: 'Handle style adaptation events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle style adaptation events
        runtimeLogger.info('Communication extension style adapted:', event);
      }
    };

    this.events['communication_error'] = {
      event: 'communication_error',
      description: 'Handle communication errors',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        // Handle communication error events
        runtimeLogger.error('Communication extension error:', event);
      }
    };
  }

  /**
   * Export contexts for persistence
   */
  private async exportContexts(): Promise<void> {
    if (!this.agent) return;

    try {
      const contexts = this.contextManager.exportContexts();

      // Save important contexts to memory if memory system is available
      for (const context of contexts) {
        if (context.messages.length > 5) {
          // Only save substantial conversations
          const memory = await this.contextManager.preserveToMemory(
            this.agent,
            context.id
          );
          if (memory && this.agent.memory) {
            await this.agent.memory.store(this.agent.id, memory);
          }
        }
      }

      runtimeLogger.info(
        `💾 Exported ${contexts.length} conversation contexts`
      );
    } catch (error) {
      runtimeLogger.error('❌ Failed to export contexts:', error);
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
    const recommendations: string[] = [];

    // Pending questions
    if (contextSummary?.pendingQuestions?.length > 0) {
      recommendations.push(
        `Address ${contextSummary.pendingQuestions.length} pending questions`
      );
    }

    // Topic continuity
    if (contextSummary?.topics?.length > 0) {
      recommendations.push(
        `Continue discussion on: ${contextSummary.topics.slice(0, 2).join(', ')}`
      );
    }

    // Mood adaptation
    if (contextSummary?.mood === 'negative') {
      recommendations.push('Use empathetic tone due to negative mood');
    } else if (contextSummary?.mood === 'positive') {
      recommendations.push('Maintain positive energy in response');
    }

    // Conversation phase
    if (contextSummary?.phase === 'greeting') {
      recommendations.push('Include welcoming elements in response');
    } else if (contextSummary?.phase === 'closing') {
      recommendations.push('Prepare for conversation conclusion');
    }

    return recommendations;
  }

  /**
   * Get extension configuration
   */
  getConfig(): CommunicationExtensionConfig {
    return { ...this.config };
  }

  /**
   * Update extension configuration
   */
  async updateConfig(
    updates: Partial<CommunicationExtensionConfig>
  ): Promise<void> {
    this.config = { ...this.config, ...updates };

    // Re-initialize components if needed
    if (this.agent && updates.enabled !== undefined) {
      if (updates.enabled && !this.config.enabled) {
        await this.init(this.agent);
      } else if (!updates.enabled && this.config.enabled) {
        await this.cleanup();
      }
    }
  }
}

// Factory function for creating Communication Extension
export function createCommunicationExtension(
  config: CommunicationExtensionConfig
): CommunicationExtension {
  return new CommunicationExtension(config);
}

export default CommunicationExtension;
