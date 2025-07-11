/**
 * Multi-Agent Manager for SYMindX
 *
 * Provides centralized management of multiple AI agents including:
 * - Agent lifecycle management (spawn, stop, restart)
 * - Health monitoring and metrics
 * - Agent discovery and routing
 * - Load balancing and resource management
 * - Agent collaboration and coordination
 */

import { EventEmitter } from 'events';

import { Agent, AgentStatus, AgentConfig, EventBus } from '../types/agent';
import { Logger } from '../utils/logger';

import { SYMindXModuleRegistry } from './registry';

export interface AgentHealthStatus {
  agentId: string;
  name: string;
  status: AgentStatus;
  uptime: number;
  memoryUsage: number;
  lastHeartbeat: Date;
  errorCount: number;
  messageCount: number;
  averageResponseTime: number;
  isHealthy: boolean;
}

export interface MultiAgentMetrics {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  totalMemoryUsage: number;
  totalMessageCount: number;
  averageResponseTime: number;
  systemLoad: number;
}

export interface AgentSpawnRequest {
  characterId: string;
  instanceName?: string;
  config?: Partial<AgentConfig>;
  priority?: number;
  autoStart?: boolean;
}

export interface ConversationRequirements {
  specialty?: string[];
  personalityTraits?: string[];
  capabilities?: string[];
  language?: string;
  responseStyle?: string;
  excludeAgents?: string[];
}

export interface AgentCollaboration {
  consultingAgent: string;
  consultedAgent: string;
  question: string;
  context?: any;
  timeout?: number;
}

export class MultiAgentManager extends EventEmitter {
  private logger = new Logger('multi-agent-manager');
  private agents: Map<string, Agent> = new Map();
  private agentHealth: Map<string, AgentHealthStatus> = new Map();
  private agentStartTimes: Map<string, Date> = new Map();
  private agentMetrics: Map<string, any> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private collaborationTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private registry: SYMindXModuleRegistry,
    private eventBus: EventBus,
    private runtime: any // SYMindXRuntime reference
  ) {
    super();
    this.startHealthMonitoring();
  }

  /**
   * Agent Lifecycle Management
   */

  async spawnAgent(request: AgentSpawnRequest): Promise<string> {
    this.logger.info(`Spawning agent from character: ${request.characterId}`);

    try {
      // Load character configuration
      const characterConfig = await this.loadCharacterConfig(
        request.characterId
      );

      // Generate unique agent ID
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const instanceName =
        request.instanceName ||
        `${characterConfig.name}_${agentId.split('_')[2]}`;

      // Merge configurations
      const finalConfig = {
        ...characterConfig,
        ...request.config,
        name: instanceName,
        id: agentId,
      };

      // Create agent using runtime's loadAgent method
      const agent = await this.runtime.loadAgent(finalConfig);

      // Store original character config for reference
      (agent as any).originalConfig = characterConfig;

      // Register agent
      this.agents.set(agentId, agent);
      this.agentStartTimes.set(agentId, new Date());

      // Initialize health tracking
      this.initializeAgentHealth(agentId, agent);

      // Auto-start if requested
      if (request.autoStart !== false) {
        await this.startAgent(agentId);
      }

      this.emit('agentSpawned', {
        agentId,
        characterId: request.characterId,
        instanceName,
      });
      this.logger.info(
        `Agent spawned successfully: ${agentId} (${instanceName})`
      );

      return agentId;
    } catch (error) {
      this.logger.error(`Failed to spawn agent ${request.characterId}:`, error);
      throw error;
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    this.logger.info(`Stopping agent: ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Graceful shutdown
      if (agent.status !== AgentStatus.ERROR) {
        agent.status = AgentStatus.STOPPING;
      }

      // Stop autonomous systems if present
      await this.runtime.shutdownAgent(agent);

      // Remove from runtime
      this.runtime.agents.delete(agentId);

      // Clean up local tracking
      this.agents.delete(agentId);
      this.agentHealth.delete(agentId);
      this.agentStartTimes.delete(agentId);
      this.agentMetrics.delete(agentId);

      this.emit('agentStopped', { agentId, name: agent.name });
      this.logger.info(`Agent stopped successfully: ${agentId}`);
    } catch (error) {
      this.logger.error(`Failed to stop agent ${agentId}:`, error);
      throw error;
    }
  }

  async restartAgent(agentId: string): Promise<void> {
    this.logger.info(`Restarting agent: ${agentId}`);

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const originalConfig =
      (agent as any).originalConfig || (agent as any).config;
    const characterId = originalConfig?.id || 'unknown';
    const instanceName = agent.name;

    try {
      // Stop the agent
      await this.stopAgent(agentId);

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Spawn new instance
      const newAgentId = await this.spawnAgent({
        characterId,
        instanceName,
        autoStart: true,
      });

      this.emit('agentRestarted', {
        oldAgentId: agentId,
        newAgentId,
        instanceName,
      });
      this.logger.info(`Agent restarted: ${agentId} -> ${newAgentId}`);
    } catch (error) {
      this.logger.error(`Failed to restart agent ${agentId}:`, error);
      throw error;
    }
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status === AgentStatus.ACTIVE) {
      this.logger.warn(`Agent ${agentId} is already active`);
      return;
    }

    agent.status = AgentStatus.ACTIVE;
    this.emit('agentStarted', { agentId, name: agent.name });
    this.logger.info(`Agent started: ${agentId}`);
  }

  /**
   * Agent Discovery and Routing
   */

  getAvailableAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      (agent) =>
        agent.status === AgentStatus.ACTIVE || agent.status === AgentStatus.IDLE
    );
  }

  findAgentsBySpecialty(specialty: string): Agent[] {
    return this.getAvailableAgents().filter((agent) => {
      // Check if agent config has capabilities (from original character config)
      const originalConfig =
        (agent as any).originalConfig || (agent as any).config;
      if (originalConfig?.capabilities) {
        return Object.values(originalConfig.capabilities).some(
          (category: any) =>
            typeof category === 'object' && category[specialty] === true
        );
      }

      // Fallback: check personality traits that might indicate specialty
      const personality = originalConfig?.personality?.traits;
      if (personality) {
        const relevantTraits = {
          analytical: ['analytical', 'logical', 'methodical'],
          creative: ['creativity', 'artistic_expression', 'innovation'],
          social: ['empathy', 'social', 'relationship_building'],
          technical: ['analytical', 'logical', 'precision'],
        };

        if (relevantTraits[specialty as keyof typeof relevantTraits]) {
          return relevantTraits[specialty as keyof typeof relevantTraits].some(
            (trait) => personality[trait] && personality[trait] > 0.7
          );
        }
      }

      return false;
    });
  }

  findAgentsByPersonality(traits: string[]): Agent[] {
    return this.getAvailableAgents().filter((agent) => {
      const originalConfig =
        (agent as any).originalConfig || (agent as any).config;
      const personality = originalConfig?.personality?.traits;
      if (!personality) return false;

      // Check if agent has high scores in desired traits
      return traits.some(
        (trait) => personality[trait] && personality[trait] > 0.7
      );
    });
  }

  routeConversation(requirements: ConversationRequirements): Agent | null {
    let candidates = this.getAvailableAgents();

    // Filter by excluded agents
    if (requirements.excludeAgents) {
      candidates = candidates.filter(
        (agent) => !requirements.excludeAgents!.includes(agent.id)
      );
    }

    // Score agents based on requirements
    const scoredAgents = candidates.map((agent) => ({
      agent,
      score: this.calculateAgentScore(agent, requirements),
    }));

    // Sort by score and return best match
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents.length > 0 ? scoredAgents[0]?.agent ?? null : null;
  }

  private calculateAgentScore(
    agent: Agent,
    requirements: ConversationRequirements
  ): number {
    let score = 0;
    const originalConfig =
      (agent as any).originalConfig || (agent as any).config;

    // Base score for availability
    if (agent.status === AgentStatus.IDLE) score += 10;
    if (agent.status === AgentStatus.ACTIVE) score += 5;

    // Specialty matching
    if (requirements.specialty) {
      const capabilities = originalConfig?.capabilities;
      if (capabilities) {
        requirements.specialty.forEach((spec) => {
          Object.values(capabilities).forEach((category: any) => {
            if (typeof category === 'object' && category[spec]) {
              score += 20;
            }
          });
        });
      }
    }

    // Personality trait matching
    if (requirements.personalityTraits) {
      const personality = originalConfig?.personality?.traits;
      if (personality) {
        requirements.personalityTraits.forEach((trait) => {
          const traitValue = personality[trait] || 0;
          score += traitValue * 15; // Weight personality traits
        });
      }
    }

    // Response style matching
    if (requirements.responseStyle && originalConfig?.communication?.style) {
      if (
        originalConfig.communication.style.includes(requirements.responseStyle)
      ) {
        score += 10;
      }
    }

    // Load balancing - prefer less busy agents
    const health = this.agentHealth.get(agent.id);
    if (health) {
      const load = health.messageCount / Math.max(health.uptime / 3600, 1); // messages per hour
      score -= load * 2; // Reduce score for busy agents
    }

    return score;
  }

  /**
   * Health Monitoring
   */

  getAgentHealth(agentId: string): AgentHealthStatus | null {
    return this.agentHealth.get(agentId) || null;
  }

  getSystemMetrics(): MultiAgentMetrics {
    const agents = Array.from(this.agents.values());
    const healthData = Array.from(this.agentHealth.values());

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === AgentStatus.ACTIVE)
        .length,
      idleAgents: agents.filter((a) => a.status === AgentStatus.IDLE).length,
      errorAgents: agents.filter((a) => a.status === AgentStatus.ERROR).length,
      totalMemoryUsage: healthData.reduce((sum, h) => sum + h.memoryUsage, 0),
      totalMessageCount: healthData.reduce((sum, h) => sum + h.messageCount, 0),
      averageResponseTime:
        healthData.length > 0
          ? healthData.reduce((sum, h) => sum + h.averageResponseTime, 0) /
            healthData.length
          : 0,
      systemLoad: this.calculateSystemLoad(),
    };
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.updateHealthMetrics();
    }, 30000); // Every 30 seconds
  }

  private updateHealthMetrics(): void {
    for (const [agentId, agent] of this.agents) {
      const startTime = this.agentStartTimes.get(agentId);
      const uptime = startTime ? (Date.now() - startTime.getTime()) / 1000 : 0;

      // Get memory usage (basic estimation)
      const memoryUsage = process.memoryUsage().heapUsed / this.agents.size;

      // Update health status
      const health: AgentHealthStatus = {
        agentId,
        name: agent.name,
        status: agent.status,
        uptime,
        memoryUsage,
        lastHeartbeat: new Date(),
        errorCount: 0, // TODO: Implement error tracking
        messageCount: 0, // TODO: Implement message counting
        averageResponseTime: 0, // TODO: Implement response time tracking
        isHealthy: agent.status !== AgentStatus.ERROR,
      };

      this.agentHealth.set(agentId, health);
    }
  }

  private initializeAgentHealth(agentId: string, agent: Agent): void {
    const health: AgentHealthStatus = {
      agentId,
      name: agent.name,
      status: agent.status,
      uptime: 0,
      memoryUsage: 0,
      lastHeartbeat: new Date(),
      errorCount: 0,
      messageCount: 0,
      averageResponseTime: 0,
      isHealthy: true,
    };

    this.agentHealth.set(agentId, health);
  }

  private calculateSystemLoad(): number {
    const totalAgents = this.agents.size;
    const activeAgents = Array.from(this.agents.values()).filter(
      (a) =>
        a.status === AgentStatus.ACTIVE || a.status === AgentStatus.THINKING
    ).length;

    return totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0;
  }

  /**
   * Agent Collaboration
   */

  async requestAgentConsultation(
    collaboration: AgentCollaboration
  ): Promise<string> {
    const consultingAgent = this.agents.get(collaboration.consultingAgent);
    const consultedAgent = this.agents.get(collaboration.consultedAgent);

    if (!consultingAgent || !consultedAgent) {
      throw new Error('One or both agents not found for consultation');
    }

    this.logger.info(
      `Agent consultation: ${collaboration.consultingAgent} consulting ${collaboration.consultedAgent}`
    );

    // TODO: Implement actual agent-to-agent communication
    // This would involve sending a special message type to the consulted agent
    // and waiting for a response

    return `Consultation response from ${consultedAgent.name}: [This would be the actual response]`;
  }

  enableAgentCollaboration(agentIds: string[]): void {
    // TODO: Implement collaboration network setup
    this.logger.info(
      `Enabling collaboration between agents: ${agentIds.join(', ')}`
    );
  }

  /**
   * Utility Methods
   */

  private async loadCharacterConfig(characterId: string): Promise<any> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const charactersDir = path.resolve(__dirname, '../characters');
      const configPath = path.join(charactersDir, `${characterId}.json`);

      const configData = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      throw new Error(
        `Failed to load character config for ${characterId}: ${error}`
      );
    }
  }

  /**
   * Management Methods
   */

  listAgents(): Array<{
    id: string;
    name: string;
    status: AgentStatus;
    characterId: string;
  }> {
    return Array.from(this.agents.values()).map((agent) => {
      const originalConfig =
        (agent as any).originalConfig || (agent as any).config;
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        characterId: originalConfig?.id || 'unknown',
      };
    });
  }

  getAgent(agentId: string): Agent | null {
    return this.agents.get(agentId) || null;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Multi-Agent Manager');

    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear collaboration timeouts
    for (const timeout of this.collaborationTimeouts.values()) {
      clearTimeout(timeout);
    }

    // Stop all agents
    const stopPromises = Array.from(this.agents.keys()).map((agentId) =>
      this.stopAgent(agentId).catch((error) =>
        this.logger.error(`Error stopping agent ${agentId}:`, error)
      )
    );

    await Promise.all(stopPromises);
    this.logger.info('Multi-Agent Manager shutdown complete');
  }
}
