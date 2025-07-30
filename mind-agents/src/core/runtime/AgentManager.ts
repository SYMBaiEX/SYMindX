/**
 * AgentManager.ts - Agent lifecycle management
 *
 * This module handles:
 * - Agent creation and destruction
 * - Agent activation and deactivation
 * - Lazy agent management
 * - Agent state transitions
 */

import {
  Agent,
  AgentConfig,
  AgentStatus,
  LazyAgent,
  LazyAgentStatus,
  AgentEvent,
  ThoughtContext,
  EnvironmentState,
  AgentState,
  MemoryRecord,
} from '../../types/index';
import { CharacterConfig } from '../../types/character';
import { createAgentError } from '../../utils/standard-errors';
import { standardLoggers } from '../../utils/standard-logging';
import { EventBus } from '../../types/agent';

export class AgentManager {
  public agents: Map<string, Agent> = new Map();
  public lazyAgents: Map<string, LazyAgent> = new Map();

  private logger = standardLoggers.runtime;
  private eventBus: EventBus;
  private agentFactory?: (config: AgentConfig) => Promise<Agent>;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Set the agent factory function
   */
  setAgentFactory(factory: (config: AgentConfig) => Promise<Agent>): void {
    this.agentFactory = factory;
  }

  /**
   * Create a new agent
   */
  async createAgent(config: AgentConfig): Promise<string> {
    if (!this.agentFactory) {
      throw createAgentError('Agent factory not initialized');
    }

    try {
      this.logger.start(`Creating agent: ${config.id}`);

      const agent = await this.agentFactory(config);

      // Initialize the agent
      const initResult = await agent.initialize(config);
      if (!initResult.success) {
        throw createAgentError(
          `Failed to initialize agent: ${initResult.error}`
        );
      }

      // Store the agent
      this.agents.set(config.id, agent);

      // Emit agent created event
      this.eventBus.emit({
        type: 'agent.created',
        agentId: config.id,
        data: { config },
        timestamp: new Date(),
      });

      this.logger.info(`Agent created successfully: ${config.id}`);
      return config.id;
    } catch (error) {
      this.logger.error(`Failed to create agent: ${config.id}`, { error });
      throw error;
    }
  }

  /**
   * Remove an agent
   */
  async removeAgent(agentId: string): Promise<boolean> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        this.logger.warn(`Agent not found: ${agentId}`);
        return false;
      }

      // Cleanup the agent
      const cleanupResult = await agent.cleanup();
      if (!cleanupResult.success) {
        this.logger.error(`Failed to cleanup agent: ${agentId}`, {
          error: cleanupResult.error,
        });
      }

      // Remove from maps
      this.agents.delete(agentId);
      this.lazyAgents.delete(agentId);

      // Emit agent removed event
      this.eventBus.emit({
        type: 'agent.removed',
        agentId,
        data: {},
        timestamp: new Date(),
      });

      this.logger.info(`Agent removed: ${agentId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error removing agent: ${agentId}`, { error });
      return false;
    }
  }

  /**
   * Activate a lazy agent
   */
  async activateAgent(agentId: string): Promise<Agent> {
    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw createAgentError(`Lazy agent not found: ${agentId}`);
    }

    if (lazyAgent.status === LazyAgentStatus.ACTIVE) {
      const agent = this.agents.get(agentId);
      if (agent) {
        return agent;
      }
    }

    this.logger.start(`Activating lazy agent: ${agentId}`);

    try {
      // Update lazy agent status
      lazyAgent.status = LazyAgentStatus.ACTIVATING;
      lazyAgent.lastActivated = new Date();

      // Create agent from character config
      const agentConfig: AgentConfig = {
        id: lazyAgent.id,
        name: lazyAgent.config.name,
        type: 'standard',
        status: AgentStatus.IDLE,
        character: lazyAgent.config,
      };

      const agent = await this.createAgentFromConfig(agentConfig);

      // Update lazy agent status
      lazyAgent.status = LazyAgentStatus.ACTIVE;
      lazyAgent.activationCount++;

      // Emit activation event
      this.eventBus.emit({
        type: 'agent.activated',
        agentId,
        data: {
          activationCount: lazyAgent.activationCount,
          priority: lazyAgent.priority,
        },
        timestamp: new Date(),
      });

      this.logger.info(`Lazy agent activated: ${agentId}`);
      return agent;
    } catch (error) {
      lazyAgent.status = LazyAgentStatus.ERROR;
      this.logger.error(`Failed to activate lazy agent: ${agentId}`, { error });
      throw error;
    }
  }

  /**
   * Deactivate an agent
   */
  async deactivateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn(`Agent not found for deactivation: ${agentId}`);
      return;
    }

    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      this.logger.warn(`Cannot deactivate non-lazy agent: ${agentId}`);
      return;
    }

    this.logger.start(`Deactivating agent: ${agentId}`);

    try {
      // Cleanup the agent
      const cleanupResult = await agent.cleanup();
      if (!cleanupResult.success) {
        this.logger.error(`Cleanup failed during deactivation: ${agentId}`, {
          error: cleanupResult.error,
        });
      }

      // Remove from active agents
      this.agents.delete(agentId);

      // Update lazy agent status
      lazyAgent.status = LazyAgentStatus.INACTIVE;

      // Emit deactivation event
      this.eventBus.emit({
        type: 'agent.deactivated',
        agentId,
        data: {},
        timestamp: new Date(),
      });

      this.logger.info(`Agent deactivated: ${agentId}`);
    } catch (error) {
      this.logger.error(`Error deactivating agent: ${agentId}`, { error });
      throw error;
    }
  }

  /**
   * Preload an agent without activating
   */
  async preloadAgent(agentId: string): Promise<void> {
    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw createAgentError(`Lazy agent not found: ${agentId}`);
    }

    if (lazyAgent.status !== LazyAgentStatus.INACTIVE) {
      this.logger.debug(`Agent already loaded: ${agentId}`);
      return;
    }

    this.logger.start(`Preloading agent: ${agentId}`);

    try {
      // Update status
      lazyAgent.status = LazyAgentStatus.PRELOADING;

      // Perform preloading tasks (e.g., load modules)
      // This is a placeholder for actual preloading logic

      // Update status
      lazyAgent.status = LazyAgentStatus.PRELOADED;

      this.logger.info(`Agent preloaded: ${agentId}`);
    } catch (error) {
      lazyAgent.status = LazyAgentStatus.ERROR;
      this.logger.error(`Failed to preload agent: ${agentId}`, { error });
      throw error;
    }
  }

  /**
   * Check if an agent is active
   */
  isAgentActive(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get an active agent
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get a lazy agent
   */
  getLazyAgent(agentId: string): LazyAgent | undefined {
    return this.lazyAgents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all lazy agents
   */
  getLazyAgents(): LazyAgent[] {
    return Array.from(this.lazyAgents.values());
  }

  /**
   * Create a lazy agent from character config
   */
  createLazyAgent(
    characterConfig: CharacterConfig,
    priority: number = 0
  ): void {
    const lazyAgent: LazyAgent = {
      id: characterConfig.id,
      config: characterConfig,
      status: LazyAgentStatus.INACTIVE,
      priority,
      lastActivated: null,
      activationCount: 0,
    };

    this.lazyAgents.set(characterConfig.id, lazyAgent);

    this.logger.debug(`Created lazy agent: ${characterConfig.id}`, {
      priority,
    });
  }

  /**
   * Unload inactive agents based on criteria
   */
  async unloadInactiveAgents(
    maxInactiveTime: number = 300000
  ): Promise<number> {
    const now = Date.now();
    let unloadedCount = 0;

    for (const agent of this.agents.values()) {
      // Check if agent should be unloaded
      const lastActivity = agent.lastActivity?.getTime() || 0;
      const inactiveTime = now - lastActivity;

      if (inactiveTime > maxInactiveTime && this.lazyAgents.has(agent.id)) {
        try {
          await this.deactivateAgent(agent.id);
          unloadedCount++;
        } catch (error) {
          this.logger.error(`Failed to unload inactive agent: ${agent.id}`, {
            error,
          });
        }
      }
    }

    if (unloadedCount > 0) {
      this.logger.info(`Unloaded ${unloadedCount} inactive agents`);
    }

    return unloadedCount;
  }

  /**
   * Process agent tick
   */
  async processAgentTick(agent: Agent): Promise<void> {
    try {
      const result = await agent.tick();
      if (!result.success) {
        this.logger.error(`Agent tick failed: ${agent.id}`, {
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error(`Error during agent tick: ${agent.id}`, { error });
    }
  }

  /**
   * Create agent from config (helper method)
   */
  private async createAgentFromConfig(config: AgentConfig): Promise<Agent> {
    if (!this.agentFactory) {
      throw createAgentError('Agent factory not initialized');
    }

    const agent = await this.agentFactory(config);
    this.agents.set(config.id, agent);

    return agent;
  }

  /**
   * Calculate agent priority based on configuration
   */
  calculateAgentPriority(characterConfig: CharacterConfig): number {
    let priority = 0;

    // Check if agent is marked as default
    if (characterConfig.default) {
      priority += 100;
    }

    // Check if agent has extensions configured
    if (
      characterConfig.extensions &&
      Object.keys(characterConfig.extensions).length > 0
    ) {
      priority += 50;
    }

    // Check if agent has autonomous capabilities
    if (characterConfig.autonomous?.enabled) {
      priority += 25;
    }

    // Check for memory configuration
    if (characterConfig.memory?.provider) {
      priority += 10;
    }

    return priority;
  }
}
