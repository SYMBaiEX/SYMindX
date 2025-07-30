/**
 * SYMindXRuntime - Refactored modular runtime system
 *
 * This is the main runtime class that orchestrates all system components
 * using the new modular architecture with proper separation of concerns.
 */

import {
  Agent,
  AgentConfig,
  AgentRuntime,
  RuntimeConfig,
  AgentEvent,
  AgentAction,
  ThoughtContext,
  RuntimeState,
  RuntimeStatus,
  LazyAgent,
  LazyAgentStatus,
} from '../types/index';
import { CharacterConfig } from '../types/character';
import {
  RuntimeCore,
  AgentManager,
  ConfigurationManager,
  BootstrapManager,
  IntegrationCoordinator,
  RuntimeMetricsCollector,
  MetricsCollectorConfig,
} from './runtime/index';
import { standardLoggers } from '../utils/standard-logging';
import { createAgentError, createRuntimeError } from '../utils/standard-errors';

export class SYMindXRuntime extends RuntimeCore implements AgentRuntime {
  // Core components
  private agentManager: AgentManager;
  private configManager: ConfigurationManager;
  private bootstrapManager: BootstrapManager;
  private integrationCoordinator: IntegrationCoordinator;
  private metricsCollector: RuntimeMetricsCollector;

  // Component state
  private isInitialized = false;
  private startupTime?: Date;

  constructor(config: RuntimeConfig) {
    super(config);

    // Initialize all managers
    this.configManager = new ConfigurationManager(config);
    this.agentManager = new AgentManager(this.eventBus);
    this.bootstrapManager = new BootstrapManager(
      this.registry,
      this.eventBus,
      config
    );

    // Create extension loader from bootstrap manager
    const extensionLoader = this.bootstrapManager.getExtensionLoader();
    this.integrationCoordinator = new IntegrationCoordinator(
      this.eventBus,
      this.registry,
      extensionLoader
    );

    // Initialize metrics collector
    const metricsConfig: MetricsCollectorConfig = {
      enableCpuMonitoring: config.debug?.enableCpuMonitoring ?? true,
      enableMemoryMonitoring: config.debug?.enableMemoryMonitoring ?? true,
      enableEventTracking: config.debug?.enableEventTracking ?? true,
      enablePerformanceTimers: config.debug?.enablePerformanceTimers ?? true,
      metricsInterval: config.debug?.metricsInterval ?? 60000,
      maxHistoryEntries: 100,
    };
    this.metricsCollector = new RuntimeMetricsCollector(metricsConfig);

    // Register agent factory
    this.setupAgentFactory();
  }

  /**
   * Initialize the entire runtime system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Runtime already initialized');
      return;
    }

    this.logger.start('Initializing SYMindX Runtime System...');
    this.startupTime = new Date();

    try {
      // 1. Initialize runtime core
      await super.initialize();

      // 2. Load configuration
      await this.configManager.loadConfiguration();

      // 3. Bootstrap system modules
      await this.bootstrapManager.bootstrap();

      // 4. Initialize integration systems
      await this.integrationCoordinator.initialize();

      // 5. Start metrics collection
      this.metricsCollector.start();

      // 6. Load agents
      await this.loadAgents();

      this.isInitialized = true;
      this.logger.info('SYMindX Runtime System initialized successfully', {
        startupTime: Date.now() - this.startupTime.getTime(),
        totalAgents: this.agents.size + this.lazyAgents.size,
        activeAgents: this.agents.size,
      });
    } catch (error) {
      this.logger.error('Runtime initialization failed', { error });
      throw error;
    }
  }

  /**
   * Start the runtime system
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw createRuntimeError('Runtime must be initialized before starting');
    }

    this.logger.start('Starting SYMindX Runtime System...');

    try {
      // Start core runtime
      await super.start();

      // Start autonomous systems for enabled agents
      await this.startAutonomousSystems();

      // Log startup summary
      this.logStartupSummary();

      this.logger.info('SYMindX Runtime System started successfully');
    } catch (error) {
      this.logger.error('Runtime startup failed', { error });
      throw error;
    }
  }

  /**
   * Stop the runtime system
   */
  async stop(): Promise<void> {
    this.logger.start('Stopping SYMindX Runtime System...');

    try {
      // Stop autonomous systems
      await this.stopAutonomousSystems();

      // Stop core runtime
      await super.stop();

      // Stop metrics collection
      this.metricsCollector.stop();

      // Shutdown integration systems
      await this.integrationCoordinator.shutdown();

      // Shutdown bootstrap systems
      await this.bootstrapManager.shutdown();

      this.logger.info('SYMindX Runtime System stopped successfully');
    } catch (error) {
      this.logger.error('Runtime shutdown failed', { error });
      throw error;
    }
  }

  /**
   * Load agents from character configurations
   */
  async loadAgents(): Promise<void> {
    this.logger.start('Loading agents from character configurations...');

    try {
      const characters = await this.configManager.loadCharacters();

      if (characters.length === 0) {
        this.logger.warn('No character configurations found');
        return;
      }

      let loadedCount = 0;
      let lazyCount = 0;

      for (const character of characters) {
        try {
          if (character.default || character.autoLoad) {
            // Load immediately
            await this.createActiveAgent(character);
            loadedCount++;
          } else {
            // Create lazy agent
            this.createLazyAgent(character);
            lazyCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to load character: ${character.id}`, {
            error,
          });
        }
      }

      this.logger.info('Agent loading completed', {
        totalCharacters: characters.length,
        activeAgents: loadedCount,
        lazyAgents: lazyCount,
      });
    } catch (error) {
      this.logger.error('Failed to load agents', { error });
      throw error;
    }
  }

  /**
   * Create an active agent from character config
   */
  async createActiveAgent(character: CharacterConfig): Promise<string> {
    const agentConfig: AgentConfig = {
      id: character.id,
      name: character.name,
      type: 'standard',
      status: 'idle',
      character,
    };

    return await this.agentManager.createAgent(agentConfig);
  }

  /**
   * Create a lazy agent from character config
   */
  createLazyAgent(character: CharacterConfig): void {
    const priority = this.agentManager.calculateAgentPriority(character);
    this.agentManager.createLazyAgent(character, priority);
  }

  /**
   * Create agent from configuration
   */
  async createAgent(config: AgentConfig): Promise<string> {
    return await this.agentManager.createAgent(config);
  }

  /**
   * Remove an agent
   */
  async removeAgent(agentId: string): Promise<boolean> {
    return await this.agentManager.removeAgent(agentId);
  }

  /**
   * Activate a lazy agent
   */
  async activateAgent(agentId: string): Promise<Agent> {
    return await this.agentManager.activateAgent(agentId);
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<void> {
    return await this.agentManager.deactivateAgent(agentId);
  }

  /**
   * Check if an agent is active
   */
  isAgentActive(agentId: string): boolean {
    return this.agentManager.isAgentActive(agentId);
  }

  /**
   * Get an active agent
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agentManager.getAgent(agentId);
  }

  /**
   * Get a lazy agent
   */
  getLazyAgent(agentId: string): LazyAgent | undefined {
    return this.agentManager.getLazyAgent(agentId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): Agent[] {
    return this.agentManager.getActiveAgents();
  }

  /**
   * Get all lazy agents
   */
  getLazyAgents(): LazyAgent[] {
    return this.agentManager.getLazyAgents();
  }

  /**
   * Process agent events
   */
  async processAgentEvent(agentId: string, event: AgentEvent): Promise<void> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw createAgentError(`Agent not found: ${agentId}`);
    }

    try {
      this.metricsCollector.startTimer(
        `event_${event.type}`,
        'event_processing',
        agentId
      );

      const result = await agent.processEvent(event);

      this.metricsCollector.endTimer(`event_${event.type}`);

      if (!result.success) {
        this.logger.error(`Event processing failed for agent: ${agentId}`, {
          event: event.type,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error(`Error processing event for agent: ${agentId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Execute agent action
   */
  async executeAgentAction(
    agentId: string,
    action: AgentAction
  ): Promise<void> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw createAgentError(`Agent not found: ${agentId}`);
    }

    try {
      this.metricsCollector.startTimer(
        `action_${action.type}`,
        'action_execution',
        agentId
      );
      this.metricsCollector.recordActionExecuted(action);

      const result = await agent.executeAction(action);

      this.metricsCollector.endTimer(`action_${action.type}`);

      if (!result.success) {
        this.logger.error(`Action execution failed for agent: ${agentId}`, {
          action: action.type,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error(`Error executing action for agent: ${agentId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get runtime state with enhanced metrics
   */
  getState(): RuntimeState {
    const baseState = super.getState();
    const metricsReport = this.metricsCollector.generateReport();

    // Update state with current counts
    baseState.activeAgents = this.agents.size;
    baseState.totalAgents = this.agents.size + this.lazyAgents.size;

    // Merge metrics
    baseState.metrics = {
      ...baseState.metrics,
      messagesProcessed: metricsReport.current.messagesProcessed,
      actionsExecuted: metricsReport.current.actionsExecuted,
      thoughtsGenerated: metricsReport.current.thoughtsGenerated,
      memoriesCreated: metricsReport.current.memoriesCreated,
      emotionChanges: metricsReport.current.emotionChanges,
      decisionssMade: metricsReport.current.decisionssMade,
      planStepsCompleted: metricsReport.current.planStepsCompleted,
      averageResponseTime: metricsReport.current.averageResponseTime,
      memoryUsage: metricsReport.current.memoryUsage,
      cpuUsage: metricsReport.current.cpuUsage,
      lastUpdateTime: metricsReport.current.lastUpdateTime,
    };

    return baseState;
  }

  /**
   * Get detailed metrics report
   */
  getMetricsReport() {
    return this.metricsCollector.generateReport();
  }

  /**
   * Override tick method from RuntimeCore
   */
  protected async onTick(): Promise<void> {
    try {
      // Process all active agents
      const agents = this.getActiveAgents();
      for (const agent of agents) {
        await this.agentManager.processAgentTick(agent);
      }

      // Update metrics
      this.metricsCollector.updateAgentMetrics(this.agents);

      // Unload inactive agents periodically
      if (Math.random() < 0.1) {
        // 10% chance per tick
        await this.agentManager.unloadInactiveAgents();
      }
    } catch (error) {
      this.logger.error('Error during runtime tick', { error });
    }
  }

  /**
   * Setup agent factory
   */
  private setupAgentFactory(): void {
    const agentFactory = async (config: AgentConfig): Promise<Agent> => {
      // This would create a proper agent instance
      // For now, return a placeholder that will be implemented
      // when the actual agent creation logic is moved from the old runtime
      throw new Error(
        'Agent factory not yet implemented in refactored runtime'
      );
    };

    this.agentManager.setAgentFactory(agentFactory);
  }

  /**
   * Start autonomous systems for all applicable agents
   */
  private async startAutonomousSystems(): Promise<void> {
    const agents = this.getActiveAgents();

    for (const agent of agents) {
      if (agent.character?.autonomous?.enabled) {
        try {
          await this.integrationCoordinator.startAutonomousSystems(agent.id);
        } catch (error) {
          this.logger.error(
            `Failed to start autonomous systems for agent: ${agent.id}`,
            { error }
          );
        }
      }
    }
  }

  /**
   * Stop autonomous systems for all agents
   */
  private async stopAutonomousSystems(): Promise<void> {
    const agents = this.getActiveAgents();

    for (const agent of agents) {
      try {
        await this.integrationCoordinator.stopAutonomousSystems(agent.id);
      } catch (error) {
        this.logger.error(
          `Failed to stop autonomous systems for agent: ${agent.id}`,
          { error }
        );
      }
    }
  }

  /**
   * Log startup summary
   */
  private logStartupSummary(): void {
    const state = this.getState();
    const metricsReport = this.getMetricsReport();

    const summary = {
      status: state.status,
      uptime: state.uptime,
      totalAgents: state.totalAgents,
      activeAgents: state.activeAgents,
      lazyAgents: state.totalAgents - state.activeAgents,
      memoryUsage: `${Math.round(metricsReport.system.memoryUsage.heapUsed / 1024 / 1024)}MB`,
      startupTime: this.startupTime
        ? Date.now() - this.startupTime.getTime()
        : 0,
    };

    this.logger.info('🚀 SYMindX Runtime System Ready', summary);
  }

  /**
   * Get proxy to agents map for backward compatibility
   */
  get agents(): Map<string, Agent> {
    return new Map(
      this.agentManager.getActiveAgents().map((agent) => [agent.id, agent])
    );
  }

  /**
   * Get proxy to lazy agents map for backward compatibility
   */
  get lazyAgents(): Map<string, LazyAgent> {
    return new Map(
      this.agentManager.getLazyAgents().map((agent) => [agent.id, agent])
    );
  }
}
