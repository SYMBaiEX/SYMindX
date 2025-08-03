/**
 * Communication Extension for SYMindX
 *
 * Provides advanced communication features using a skills-based architecture
 * including context management, expression adaptation, and style customization.
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
  AgentEvent,
} from '../../types/agent';
import {
  ExtensionConfig,
  ExtensionMetadata,
  SkillParameters,
  GenericData,
} from '../../types/common';
import { runtimeLogger } from '../../utils/logger';

// Import skills system
import {
  DefaultCommunicationSkillManager,
  type CommunicationSkillManagerConfig,
  ContextManagementSkill,
  type ContextManagementSkillConfig,
  StyleAdaptationSkill,
  type StyleAdaptationSkillConfig,
  ExpressionEngineSkill,
  type ExpressionEngineSkillConfig,
  ResponseEnhancementSkill,
  type ResponseEnhancementSkillConfig,
  createContextManagementSkill,
  createStyleAdaptationSkill,
  createExpressionEngineSkill,
  createResponseEnhancementSkill,
  createCommunicationSkillManager
} from './skills/index';

// Import existing managers for backward compatibility
import { ContextManager, ContextManagerConfig } from './context-manager';
import { ExpressionEngine, ExpressionEngineConfig } from './expression-engine';
import { StyleAdapter, StyleAdapterConfig } from './style-adapter';

export interface CommunicationExtensionConfig extends ExtensionConfig {
  // Legacy config support
  contextManager?: ContextManagerConfig;
  expressionEngine?: ExpressionEngineConfig;
  styleAdapter?: StyleAdapterConfig;
  enableContextPersistence?: boolean;
  enableStyleAdaptation?: boolean;
  enableExpressionVariation?: boolean;
  
  // New skills-based config
  skillManager?: CommunicationSkillManagerConfig;
  contextManagementSkill?: ContextManagementSkillConfig;
  styleAdaptationSkill?: StyleAdaptationSkillConfig;
  expressionEngineSkill?: ExpressionEngineSkillConfig;
  responseEnhancementSkill?: ResponseEnhancementSkillConfig;
  enableSkillsSystem?: boolean;
}

export class CommunicationExtension implements Extension {
  public readonly id: string = 'communication';
  public readonly name: string = 'Communication Extension';
  public readonly version: string = '2.0.0';
  public readonly type: ExtensionType = ExtensionType.COMMUNICATION;
  public enabled: boolean = true;
  public status: ExtensionStatus = ExtensionStatus.STOPPED;
  public actions: Record<string, ExtensionAction> = {};
  public events: Record<string, ExtensionEventHandler> = {};

  public readonly metadata: ExtensionMetadata = {
    name: 'communication',
    version: '2.0.0',
    description:
      'Advanced communication features with skills-based architecture for context, expression, and style management',
    author: 'SYMindX',
  };

  public config: ExtensionConfig;
  private communicationConfig: CommunicationExtensionConfig;
  private agent?: Agent;

  // Skills system
  private skillManager: DefaultCommunicationSkillManager;
  private contextSkill?: ContextManagementSkill;
  private styleSkill?: StyleAdaptationSkill;
  private expressionSkill?: ExpressionEngineSkill;
  private responseSkill?: ResponseEnhancementSkill;

  // Legacy support (deprecated)
  private contextManager?: ContextManager;
  private expressionEngine?: ExpressionEngine;
  private styleAdapter?: StyleAdapter;

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
      enableSkillsSystem: config.enableSkillsSystem ?? true,
      contextManager: config.contextManager ?? {},
      expressionEngine: config.expressionEngine ?? {},
      styleAdapter: config.styleAdapter ?? {},
      skillManager: config.skillManager ?? {},
      contextManagementSkill: config.contextManagementSkill ?? {
        name: 'Context Management',
        description: 'Manages conversation contexts and participant interactions',
        contextManager: config.contextManager
      },
      styleAdaptationSkill: config.styleAdaptationSkill ?? {
        name: 'Style Adaptation',
        description: 'Adapts communication style based on context and participants',
        styleAdapter: config.styleAdapter
      },
      expressionEngineSkill: config.expressionEngineSkill ?? {
        name: 'Expression Engine',
        description: 'Generates and enhances expressions for natural communication',
        expressionEngine: config.expressionEngine
      },
      responseEnhancementSkill: config.responseEnhancementSkill ?? {
        name: 'Response Enhancement',
        description: 'Provides comprehensive response enhancement using all communication features'
      }
    };

    // Initialize skills system
    this.skillManager = createCommunicationSkillManager(this.communicationConfig.skillManager);

    // Initialize legacy components if skills system is disabled
    if (!this.communicationConfig.enableSkillsSystem) {
      this.contextManager = new ContextManager(
        this.communicationConfig.contextManager || {}
      );
      this.expressionEngine = new ExpressionEngine(
        this.communicationConfig.expressionEngine || {}
      );
      this.styleAdapter = new StyleAdapter(
        this.communicationConfig.styleAdapter || {}
      );
    }

    runtimeLogger.info('💬 Communication Extension initialized with skills system');
  }

  async init(agent: Agent): Promise<void> {
    if (!this.config.enabled) {
      runtimeLogger.info('⏸️ Communication Extension is disabled');
      return;
    }

    this.agent = agent;
    this.status = ExtensionStatus.INITIALIZING;

    try {
      if (this.communicationConfig.enableSkillsSystem) {
        await this.initializeSkills(agent);
      } else {
        await this.initializeLegacy(agent);
      }

      // Set up integrations
      await this.setupIntegrations();

      // Register extension actions and events
      this.registerExtensionEvents();

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
    try {
      // Update agent reference if needed
      if (this.agent?.id !== agent.id) {
        this.agent = agent;
      }

      // Skills system handles periodic operations automatically
      // Legacy cleanup can be performed if needed
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

      if (this.communicationConfig.enableSkillsSystem) {
        await this.cleanupSkills();
      } else {
        await this.cleanupLegacy();
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
   * Initialize skills system
   */
  private async initializeSkills(agent: Agent): Promise<void> {
    // Create and register skills
    this.contextSkill = createContextManagementSkill(
      this.communicationConfig.contextManagementSkill!
    );
    await this.skillManager.registerSkill(this.contextSkill);

    this.styleSkill = createStyleAdaptationSkill(
      this.communicationConfig.styleAdaptationSkill!
    );
    await this.skillManager.registerSkill(this.styleSkill);

    this.expressionSkill = createExpressionEngineSkill(
      this.communicationConfig.expressionEngineSkill!
    );
    await this.skillManager.registerSkill(this.expressionSkill);

    this.responseSkill = createResponseEnhancementSkill(
      this.communicationConfig.responseEnhancementSkill!
    );
    
    // Set up skill dependencies for response enhancement
    this.responseSkill.setSkillDependencies(
      this.contextSkill,
      this.styleSkill,
      this.expressionSkill
    );
    await this.skillManager.registerSkill(this.responseSkill);

    // Initialize the skill manager
    await this.skillManager.initialize(agent);

    // Get all actions from skills
    const skillActions = this.skillManager.getAllActions();
    skillActions.forEach(action => {
      this.actions[action.name] = action;
    });

    runtimeLogger.info(`💬 Initialized ${skillActions.length} communication actions from skills`);
  }

  /**
   * Initialize legacy system (deprecated)
   */
  private async initializeLegacy(agent: Agent): Promise<void> {
    if (this.expressionEngine) {
      await this.expressionEngine.initialize(agent);
    }
    if (this.styleAdapter) {
      await this.styleAdapter.initialize(agent);
    }

    // Register legacy actions
    this.registerLegacyActions();
    
    runtimeLogger.info('💬 Initialized legacy communication system');
  }

  /**
   * Clean up skills system
   */
  private async cleanupSkills(): Promise<void> {
    // Export contexts if persistence is enabled
    if (this.communicationConfig.enableContextPersistence && this.contextSkill) {
      await this.exportContexts();
    }

    await this.skillManager.cleanup();
  }

  /**
   * Clean up legacy system
   */
  private async cleanupLegacy(): Promise<void> {
    // Export contexts if persistence is enabled
    if (this.communicationConfig.enableContextPersistence && this.contextManager) {
      await this.exportLegacyContexts();
    }
  }

  /**
   * Get skill manager
   */
  getSkillManager(): DefaultCommunicationSkillManager {
    return this.skillManager;
  }

  /**
   * Get specific skill (new API)
   */
  getContextSkill(): ContextManagementSkill | undefined {
    return this.contextSkill;
  }

  getStyleSkill(): StyleAdaptationSkill | undefined {
    return this.styleSkill;
  }

  getExpressionSkill(): ExpressionEngineSkill | undefined {
    return this.expressionSkill;
  }

  getResponseSkill(): ResponseEnhancementSkill | undefined {
    return this.responseSkill;
  }

  /**
   * Legacy API support (deprecated)
   */
  getContextManager(): ContextManager | undefined {
    return this.contextManager || this.contextSkill?.getContextManager();
  }

  getExpressionEngine(): ExpressionEngine | undefined {
    return this.expressionEngine || this.expressionSkill?.getExpressionEngine();
  }

  getStyleAdapter(): StyleAdapter | undefined {
    return this.styleAdapter || this.styleSkill?.getStyleAdapter();
  }

  /**
   * Main communication processing method (enhanced)
   */
  async processMessage(
    participantId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    contextSummary: Record<string, unknown>;
    adaptedStyle: Record<string, unknown>;
    expressionVariations: string[];
    recommendations: string[];
  }> {
    if (!this.agent) {
      throw new Error('Communication extension not initialized with agent');
    }

    if (this.communicationConfig.enableSkillsSystem && this.contextSkill && this.responseSkill) {
      // Use skills system
      const contextActions = this.contextSkill.getActions();
      const processAction = contextActions.find(a => a.name === 'addMessage');
      
      if (processAction) {
        await processAction.execute(this.agent, {
          participantId,
          senderId: participantId,
          message,
          emotion: typeof metadata?.emotion === 'string' ? metadata.emotion : undefined
        });
      }

      const getSummaryAction = contextActions.find(a => a.name === 'getActiveContext');
      let contextSummary: any = {};
      
      if (getSummaryAction) {
        const result = await getSummaryAction.execute(this.agent, { agentId: this.agent.id });
        if (result.success) {
          contextSummary = result.result;
        }
      }

      // Generate enhanced response
      const enhanceActions = this.responseSkill.getActions();
      const enhanceAction = enhanceActions.find(a => a.name === 'enhanceResponse');
      
      let adaptedStyle: any = {};
      let expressionVariations: string[] = [];
      
      if (enhanceAction) {
        const enhanceResult = await enhanceAction.execute(this.agent, {
          baseResponse: message,
          participantId,
          emotion: metadata?.emotion,
          audience: metadata?.audience
        });
        
        if (enhanceResult.success) {
          adaptedStyle = enhanceResult.result.styleAdaptations || {};
          expressionVariations = [enhanceResult.result.enhancedResponse];
        }
      }

      return {
        contextSummary,
        adaptedStyle,
        expressionVariations,
        recommendations: ['Use skills-based communication system for enhanced features']
      };
    } else {
      // Fallback to legacy system
      return this.processMessageLegacy(participantId, message, metadata);
    }
  }

  /**
   * Generate enhanced response (new API)
   */
  async generateEnhancedResponse(
    baseResponse: string,
    participantId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!this.agent) return baseResponse;

    if (this.communicationConfig.enableSkillsSystem && this.responseSkill) {
      // Use response enhancement skill
      const actions = this.responseSkill.getActions();
      const enhanceAction = actions.find(a => a.name === 'enhanceResponse');
      
      if (enhanceAction) {
        const result = await enhanceAction.execute(this.agent, {
          baseResponse,
          participantId,
          emotion: metadata?.emotion,
          audience: metadata?.audience,
          goal: metadata?.goal
        });
        
        if (result.success) {
          return result.result.enhancedResponse;
        }
      }
    }

    // Fallback to legacy method
    return this.generateEnhancedResponseLegacy(baseResponse, participantId, metadata);
  }

  /**
   * Set up integrations with other agent components
   */
  private async setupIntegrations(): Promise<void> {
    // Integration points for other systems would go here
    // For example, connecting to emotion system, memory system, etc.
  }

  /**
   * Register extension events
   */
  private registerExtensionEvents(): void {
    // Register event handlers
    this.events['message_received'] = {
      event: 'message_received',
      description: 'Handle incoming message events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.info(
          'Communication extension received message event:',
          event
        );
      },
    };

    this.events['context_updated'] = {
      event: 'context_updated',
      description: 'Handle context update events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.info('Communication extension context updated:', event);
      },
    };

    this.events['style_adapted'] = {
      event: 'style_adapted',
      description: 'Handle style adaptation events',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.info('Communication extension style adapted:', event);
      },
    };

    this.events['communication_error'] = {
      event: 'communication_error',
      description: 'Handle communication errors',
      handler: async (_agent: Agent, event: AgentEvent): Promise<void> => {
        runtimeLogger.error('Communication extension error:', event);
      },
    };
  }

  /**
   * Export contexts for persistence
   */
  private async exportContexts(): Promise<void> {
    if (!this.agent || !this.contextSkill) return;

    try {
      const actions = this.contextSkill.getActions();
      const exportAction = actions.find(a => a.name === 'exportContexts');
      
      if (exportAction) {
        const result = await exportAction.execute(this.agent, {});
        if (result.success) {
          runtimeLogger.info(
            `💾 Exported ${result.result.exportedCount} conversation contexts`
          );
        }
      }
    } catch (error) {
      runtimeLogger.error('❌ Failed to export contexts:', error);
    }
  }

  // Legacy methods (deprecated but maintained for backward compatibility)
  private async processMessageLegacy(
    participantId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<any> {
    if (!this.contextManager) {
      return {
        contextSummary: {},
        adaptedStyle: {},
        expressionVariations: [],
        recommendations: []
      };
    }

    // Get or create context
    const context = this.contextManager.getOrCreateContext(
      this.agent!.id,
      participantId,
      message
    );

    // Add message to context
    this.contextManager.addMessage(
      context,
      participantId,
      message,
      typeof metadata?.emotion === 'string' ? metadata.emotion : undefined
    );

    // Get context summary
    const contextSummary = this.contextManager.getContextSummary(context.id);

    return {
      contextSummary: contextSummary || {},
      adaptedStyle: {},
      expressionVariations: [],
      recommendations: []
    };
  }

  private async generateEnhancedResponseLegacy(
    baseResponse: string,
    participantId: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    if (!this.agent || !this.contextManager) return baseResponse;

    const context = this.contextManager.getActiveContext(this.agent.id);
    if (!context) return baseResponse;

    const contextSummary = this.contextManager.getContextSummary(context.id);
    if (!contextSummary) return baseResponse;

    let adaptedResponse = baseResponse;

    // Apply style adaptation if available
    if (this.communicationConfig.enableStyleAdaptation && this.styleAdapter) {
      adaptedResponse = await this.styleAdapter.applyStyle(baseResponse, {
        mood: contextSummary.mood,
        formality: typeof metadata?.formality === 'number' ? metadata.formality : 0.5,
        participantStyle: typeof metadata?.participantStyle === 'string' ? metadata.participantStyle : undefined,
        topics: contextSummary.topics,
        conversationPhase: contextSummary.phase,
      });
    }

    // Apply expression enhancements if available
    if (this.communicationConfig.enableExpressionVariation && this.expressionEngine) {
      adaptedResponse = await this.expressionEngine.enhanceExpression(
        adaptedResponse,
        {
          emotion: typeof metadata?.emotion === 'string' ? metadata.emotion : undefined,
          context: contextSummary,
          variation: 'balanced',
        }
      );
    }

    // Add response to context
    this.contextManager.addMessage(
      context,
      this.agent.id,
      adaptedResponse,
      typeof metadata?.emotion === 'string' ? metadata.emotion : undefined
    );

    return adaptedResponse;
  }

  private registerLegacyActions(): void {
    // Register legacy actions for backward compatibility
    this.actions['processMessage'] = {
      name: 'processMessage',
      description: 'Process incoming message with communication features (legacy)',
      category: ActionCategory.COMMUNICATION,
      parameters: {
        participantId: {
          type: 'string',
          required: true,
          description: 'Participant ID',
        },
        message: {
          type: 'string',
          required: true,
          description: 'Message content',
        },
        metadata: {
          type: 'object',
          required: false,
          description: 'Additional metadata',
        },
      },
      execute: async (
        _agent: Agent,
        params: SkillParameters
      ): Promise<ActionResult> => {
        const { participantId, message, metadata } = params;
        const result = await this.processMessage(
          participantId as string,
          message as string,
          metadata as Record<string, unknown>
        );
        return {
          success: true,
          type: ActionResultType.SUCCESS,
          result: result as GenericData,
          timestamp: new Date(),
        };
      },
    };
  }

  private async exportLegacyContexts(): Promise<void> {
    if (!this.agent || !this.contextManager) return;

    try {
      const contexts = this.contextManager.exportContexts();

      // Save important contexts to memory if memory system is available
      for (const context of contexts) {
        if (context.messages.length > 5) {
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
        `💾 Exported ${contexts.length} conversation contexts (legacy)`
      );
    } catch (error) {
      runtimeLogger.error('❌ Failed to export legacy contexts:', error);
    }
  }

  /**
   * Get extension configuration
   */
  getConfig(): CommunicationExtensionConfig {
    return { ...this.communicationConfig };
  }

  /**
   * Update extension configuration
   */
  async updateConfig(
    updates: Partial<CommunicationExtensionConfig>
  ): Promise<void> {
    this.communicationConfig = { ...this.communicationConfig, ...updates };
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