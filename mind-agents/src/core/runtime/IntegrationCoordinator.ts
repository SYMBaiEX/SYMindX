/**
 * IntegrationCoordinator.ts - Extension and portal coordination
 *
 * This module handles:
 * - Extension lifecycle coordination
 * - Portal management and selection
 * - Context system integration
 * - Autonomous system coordination
 * - Tool system initialization
 */

import {
  Agent,
  EventBus,
  ModuleRegistry,
  Extension,
  Portal,
  AgentEvent,
  ThoughtContext,
} from '../../types/index';
import { AutonomousAgent } from '../../types/autonomous';
import { ExtensionLoader } from '../extension-loader';
import { AutonomousEngine, AutonomousEngineConfig } from '../autonomous-engine';
import { DecisionEngine } from '../decision-engine';
import {
  ContextBootstrapper,
  ContextBootstrapperConfig,
  RuntimeContextAdapter,
  ContextManager,
  createContextBootstrapper,
} from '../context/integration/index';
import {
  ContextService,
  createContextService,
  ContextEnhancementOptions,
} from '../context-service';
import { standardLoggers } from '../../utils/standard-logging';
import { createRuntimeError } from '../../utils/standard-errors';

export class IntegrationCoordinator {
  private logger = standardLoggers.runtime;
  private eventBus: EventBus;
  private registry: ModuleRegistry;
  private extensionLoader: ExtensionLoader;

  // Autonomous system components
  private autonomousEngines: Map<string, AutonomousEngine> = new Map();
  private decisionEngines: Map<string, DecisionEngine> = new Map();
  private autonomousAgents: Map<string, AutonomousAgent> = new Map();

  // Context system components
  private contextBootstrapper?: ContextBootstrapper;
  private contextManager?: ContextManager;
  private runtimeAdapter?: RuntimeContextAdapter;
  private contextService: ContextService;

  constructor(
    eventBus: EventBus,
    registry: ModuleRegistry,
    extensionLoader: ExtensionLoader
  ) {
    this.eventBus = eventBus;
    this.registry = registry;
    this.extensionLoader = extensionLoader;

    // Initialize context service
    this.contextService = createContextService({
      enableCaching: true,
      enableValidation: true,
      enablePerformanceMonitoring: false,
      enableTracing: false,
    });
  }

  /**
   * Initialize all integration systems
   */
  async initialize(): Promise<void> {
    this.logger.start('Initializing integration systems...');

    try {
      // Initialize context system
      await this.initializeContextSystem();

      // Initialize tool system
      await this.initializeToolSystem();

      this.logger.info('Integration systems initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize integration systems', { error });
      throw error;
    }
  }

  /**
   * Initialize context system asynchronously
   */
  private async initializeContextSystem(): Promise<void> {
    try {
      const config: ContextBootstrapperConfig = {
        enableEnrichment: true,
        enableCaching: true,
        enableObservability: false,
        cacheSettings: {
          l1: { maxSize: 1000, ttl: 300000 },
          l2: { maxSize: 5000, ttl: 900000 },
          l3: { maxSize: 10000, ttl: 3600000 },
        },
        enrichmentSettings: {
          enabledEnrichers: [
            'memory',
            'emotional',
            'social',
            'temporal',
            'environment',
          ],
          maxConcurrency: 5,
          enableCaching: true,
        },
      };

      this.contextBootstrapper = createContextBootstrapper(config);
      const result = await this.contextBootstrapper.bootstrap();

      if (result.success) {
        this.contextManager = result.contextManager;
        this.runtimeAdapter = result.runtimeAdapter;
        this.logger.info('Context system initialized successfully');
      } else {
        this.logger.error('Context system initialization failed', {
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('Error initializing context system', { error });
      // Don't throw - context system is optional
    }
  }

  /**
   * Initialize tool system
   */
  private async initializeToolSystem(): Promise<void> {
    this.logger.start('Initializing tool system...');

    try {
      // Register built-in tools
      const tools = await this.loadBuiltInTools();

      for (const [toolId, tool] of Object.entries(tools)) {
        this.registry.registerTool?.(toolId, tool);
      }

      this.logger.info(
        `Initialized ${Object.keys(tools).length} built-in tools`
      );
    } catch (error) {
      this.logger.error('Failed to initialize tool system', { error });
      // Don't throw - tools system initialization issues shouldn't block startup
    }
  }

  /**
   * Load built-in tools
   */
  private async loadBuiltInTools(): Promise<Record<string, any>> {
    const tools: Record<string, any> = {};

    try {
      // Example: Load HTTP tool
      tools.http = {
        name: 'HTTP Request',
        description: 'Make HTTP requests',
        execute: async (params: any) => {
          // Tool implementation
          return { success: true, data: null };
        },
      };

      // Example: Load file system tool
      tools.filesystem = {
        name: 'File System',
        description: 'File system operations',
        execute: async (params: any) => {
          // Tool implementation
          return { success: true, data: null };
        },
      };
    } catch (error) {
      this.logger.error('Error loading built-in tools', { error });
    }

    return tools;
  }

  /**
   * Create agent context with context system integration
   */
  async createAgentContext(agent: Agent): Promise<ThoughtContext> {
    const baseContext: ThoughtContext = {
      agentId: agent.id,
      currentState: this.getAgentState(agent),
      environmentState: this.getEnvironmentState(),
      recentEvents: this.getUnprocessedEvents(agent.id),
      recentMemories: [],
      timestamp: new Date(),
    };

    // Enhance with context system if available
    if (this.contextService && this.contextManager) {
      try {
        const enhancementOptions: ContextEnhancementOptions = {
          includeMemoryContext: true,
          includeEmotionalContext: true,
          includeSocialContext: false,
          includeTemporalContext: true,
          includeEnvironmentContext: true,
          maxContextDepth: 3,
        };

        const enhancedContext = await this.contextService.enhanceContext(
          baseContext,
          enhancementOptions
        );

        return enhancedContext || baseContext;
      } catch (error) {
        this.logger.error('Context enhancement failed, using base context', {
          agentId: agent.id,
          error,
        });
      }
    }

    return baseContext;
  }

  /**
   * Register agent with context system
   */
  async registerAgentWithContext(agent: Agent): Promise<void> {
    if (!this.contextManager) {
      return;
    }

    try {
      await this.contextManager.registerAgent({
        agentId: agent.id,
        agentType: agent.character?.personality?.traits?.[0] || 'default',
        capabilities: [],
        preferences: {
          contextDepth: 3,
          memoryRetention: 'standard',
          emotionalSensitivity: 'medium',
        },
      });

      this.logger.debug(`Agent registered with context system: ${agent.id}`);
    } catch (error) {
      this.logger.error(`Failed to register agent with context: ${agent.id}`, {
        error,
      });
    }
  }

  /**
   * Unregister agent from context system
   */
  async unregisterAgentFromContext(agentId: string): Promise<void> {
    if (!this.contextManager) {
      return;
    }

    try {
      await this.contextManager.unregisterAgent(agentId);
      this.logger.debug(`Agent unregistered from context system: ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to unregister agent from context: ${agentId}`, {
        error,
      });
    }
  }

  /**
   * Start autonomous systems for an agent
   */
  async startAutonomousSystems(agentId: string): Promise<void> {
    this.logger.start(`Starting autonomous systems for agent: ${agentId}`);

    try {
      const config: AutonomousEngineConfig = {
        enabled: true,
        tickInterval: 5000,
      };

      const autonomousEngine = new AutonomousEngine(
        agentId,
        config,
        this.eventBus
      );
      this.autonomousEngines.set(agentId, autonomousEngine);

      const decisionEngine = new DecisionEngine(agentId, this.eventBus);
      this.decisionEngines.set(agentId, decisionEngine);

      this.logger.info(`Autonomous systems started for agent: ${agentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to start autonomous systems for agent: ${agentId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Stop autonomous systems for an agent
   */
  async stopAutonomousSystems(agentId: string): Promise<void> {
    this.logger.start(`Stopping autonomous systems for agent: ${agentId}`);

    try {
      const autonomousEngine = this.autonomousEngines.get(agentId);
      if (autonomousEngine) {
        await autonomousEngine.stop();
        this.autonomousEngines.delete(agentId);
      }

      const decisionEngine = this.decisionEngines.get(agentId);
      if (decisionEngine) {
        await decisionEngine.stop();
        this.decisionEngines.delete(agentId);
      }

      this.autonomousAgents.delete(agentId);

      this.logger.info(`Autonomous systems stopped for agent: ${agentId}`);
    } catch (error) {
      this.logger.error(
        `Error stopping autonomous systems for agent: ${agentId}`,
        { error }
      );
    }
  }

  /**
   * Interrupt autonomous agent with event
   */
  interruptAutonomousAgent(agentId: string, event: AgentEvent): void {
    const autonomousEngine = this.autonomousEngines.get(agentId);
    if (autonomousEngine) {
      autonomousEngine.interrupt(event);
    }
  }

  /**
   * Get autonomous status for agent
   */
  getAutonomousStatus(agentId: string): Record<string, unknown> {
    const autonomousEngine = this.autonomousEngines.get(agentId);
    const decisionEngine = this.decisionEngines.get(agentId);

    return {
      hasAutonomousEngine: !!autonomousEngine,
      hasDecisionEngine: !!decisionEngine,
      autonomousAgentCount: this.autonomousAgents.size,
    };
  }

  /**
   * Validate context for agent
   */
  async validateContextForAgent(
    agent: Agent,
    context: ThoughtContext
  ): Promise<void> {
    if (!this.contextService) {
      return;
    }

    try {
      const isValid = await this.contextService.validateContext(context);
      if (!isValid) {
        this.logger.warn(`Invalid context for agent: ${agent.id}`, { context });
      }
    } catch (error) {
      this.logger.error(`Context validation failed for agent: ${agent.id}`, {
        error,
      });
    }
  }

  /**
   * Inject context into agent lifecycle
   */
  async injectContextIntoLifecycle(agent: Agent): Promise<void> {
    if (!this.runtimeAdapter) {
      return;
    }

    try {
      await this.runtimeAdapter.injectContext(agent.id, {
        lifecycle: 'active',
        lastActivity: agent.lastActivity,
        status: agent.status,
      });
    } catch (error) {
      this.logger.error(`Failed to inject context for agent: ${agent.id}`, {
        error,
      });
    }
  }

  /**
   * Get context service
   */
  getContextService(): ContextService {
    return this.contextService;
  }

  /**
   * Shutdown integration systems
   */
  async shutdown(): Promise<void> {
    this.logger.start('Shutting down integration systems...');

    try {
      // Stop all autonomous systems
      for (const agentId of this.autonomousEngines.keys()) {
        await this.stopAutonomousSystems(agentId);
      }

      // Shutdown context system
      if (this.contextBootstrapper) {
        await this.contextBootstrapper.shutdown();
      }

      // Shutdown context service
      this.contextService.shutdown?.();

      this.logger.info('Integration systems shutdown complete');
    } catch (error) {
      this.logger.error('Error during integration systems shutdown', { error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private getUnprocessedEvents(agentId: string): AgentEvent[] {
    // This would normally get events from event bus
    return [];
  }

  private getAgentState(agent: Agent): any {
    return {
      id: agent.id,
      status: agent.status,
      lastActivity: agent.lastActivity,
      isActive: agent.status !== 'idle',
    };
  }

  private getEnvironmentState(): any {
    return {
      timestamp: new Date(),
      activeAgents: 0,
      systemLoad: 0,
      memoryUsage: process.memoryUsage(),
    };
  }
}
