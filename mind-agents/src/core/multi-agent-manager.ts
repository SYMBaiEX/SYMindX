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

import {
  Agent,
  AgentStatus,
  AgentConfig,
  EventBus,
  MemoryType,
  MemoryDuration,
} from '../types/agent';
import type { CharacterConfig } from '../types/character';
import { Logger } from '../utils/logger';

import { SYMindXModuleRegistry } from './registry';
import type { SYMindXRuntime } from './runtime';
import { CoordinationManager } from './coordination-manager';

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
  topic: string;
  context?: Record<string, unknown>;
  timeout?: number;
}

export interface CollaborationRelationship {
  consultingAgent: string;
  consultedAgent: string;
  permissions: string[];
  lastInteraction: Date;
  interactionCount: number;
}

interface ExtendedAgent extends Agent {
  originalConfig?: CharacterConfig;
}

export class MultiAgentManager extends EventEmitter {
  private logger = new Logger('multi-agent-manager');
  private agents: Map<string, ExtendedAgent> = new Map();
  private agentHealth: Map<string, AgentHealthStatus> = new Map();
  private agentStartTimes: Map<string, Date> = new Map();
  private agentMetrics: Map<string, unknown> = new Map();
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private collaborationTimeouts: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Agent metrics tracking
  private agentErrorCounts: Map<string, number> = new Map();
  private agentMessageCounts: Map<string, number> = new Map();
  private agentResponseTimes: Map<string, number[]> = new Map();

  // Collaboration tracking
  private collaborations: Map<string, CollaborationRelationship> = new Map();

  // Advanced coordination manager
  private coordinationManager: CoordinationManager;

  constructor(
    _registry: SYMindXModuleRegistry,
    private eventBus: EventBus,
    private runtime: SYMindXRuntime
  ) {
    super();
    this.coordinationManager = new CoordinationManager(this.eventBus);
    this.startHealthMonitoring();
    this.setupCoordinationIntegration();
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
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
      const agent = (await this.runtime.loadAgent(
        finalConfig as AgentConfig
      )) as ExtendedAgent;

      // Store original character config for reference
      agent.originalConfig = characterConfig;

      // Register agent
      this.agents.set(agentId, agent);
      this.agentStartTimes.set(agentId, new Date());

      // Initialize health tracking
      this.initializeAgentHealth(agentId, agent);

      // Register with coordination manager
      await this.coordinationManager.registerAgent(agent);

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
      void error;
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

      // Unregister from coordination manager
      await this.coordinationManager.unregisterAgent(agentId);

      // Stop autonomous systems if present
      await this.runtime.unloadAgent(agentId);

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
      void error;
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
      (agent as ExtendedAgent).originalConfig || agent.config;
    const characterId = (originalConfig as any)?.id || 'unknown';
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
      void error;
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
        (agent as ExtendedAgent).originalConfig || agent.config;
      if ((originalConfig as any)?.capabilities) {
        return Object.values((originalConfig as any).capabilities).some(
          (category: unknown) =>
            typeof category === 'object' &&
            category !== null &&
            (category as Record<string, unknown>)[specialty] === true
        );
      }

      // Fallback: check personality traits that might indicate specialty
      const personality = (originalConfig as any)?.personality?.traits;
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
        (agent as ExtendedAgent).originalConfig || agent.config;
      const personality = (originalConfig as any)?.personality?.traits;
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

    return scoredAgents.length > 0 ? (scoredAgents[0]?.agent ?? null) : null;
  }

  private calculateAgentScore(
    agent: Agent,
    requirements: ConversationRequirements
  ): number {
    let score = 0;
    const originalConfig =
      (agent as ExtendedAgent).originalConfig || agent.config;

    // Base score for availability
    if (agent.status === AgentStatus.IDLE) score += 10;
    if (agent.status === AgentStatus.ACTIVE) score += 5;

    // Specialty matching
    if (requirements.specialty) {
      const capabilities = (originalConfig as any)?.capabilities;
      if (capabilities) {
        requirements.specialty.forEach((spec) => {
          Object.values(capabilities).forEach((category: unknown) => {
            if (
              typeof category === 'object' &&
              category !== null &&
              (category as Record<string, unknown>)[spec]
            ) {
              score += 20;
            }
          });
        });
      }
    }

    // Personality trait matching
    if (requirements.personalityTraits) {
      const personality = (originalConfig as any)?.personality?.traits;
      if (personality) {
        requirements.personalityTraits.forEach((trait) => {
          const traitValue = personality[trait] || 0;
          score += traitValue * 15; // Weight personality traits
        });
      }
    }

    // Response style matching
    if (
      requirements.responseStyle &&
      (originalConfig as any)?.communication?.style
    ) {
      if (
        (originalConfig as any).communication.style.includes(
          requirements.responseStyle
        )
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
        errorCount: this.getAgentErrorCount(agentId),
        messageCount: this.getAgentMessageCount(agentId),
        averageResponseTime: this.getAgentAverageResponseTime(agentId),
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

    try {
      // Create a consultation message for the consulted agent
      const consultationMessage = {
        id: `consultation-${Date.now()}`,
        content: `Consultation request from ${consultingAgent.name}: ${collaboration.topic}`,
        role: 'user' as const,
        timestamp: new Date(),
        metadata: {
          type: 'consultation',
          requestingAgent: consultingAgent.id,
          originalTopic: collaboration.topic,
        },
      };

      // Get the consulted agent's portal for processing
      const portal = consultedAgent.portal;
      if (!portal) {
        throw new Error(
          `No active portal available for agent ${consultedAgent.name}`
        );
      }

      // Generate response using the consulted agent's portal
      const result = await portal.generateText(consultationMessage.content, {
        maxOutputTokens: 500,
        temperature: 0.7,
      });

      // Store the consultation in both agents' memories if available
      if (consultingAgent.memory) {
        await consultingAgent.memory.store(consultingAgent.id, {
          id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          agentId: consultingAgent.id,
          type: MemoryType.EXPERIENCE,
          content: `Consulted ${consultedAgent.name} about: ${collaboration.topic}`,
          metadata: {
            consultedAgent: consultedAgent.id,
            response: result.text,
            timestamp: new Date(),
          },
          importance: 0.7,
          timestamp: new Date(),
          tags: ['consultation', 'collaboration'],
          duration: MemoryDuration.LONG_TERM,
        });
      }

      if (consultedAgent.memory) {
        await consultedAgent.memory.store(consultedAgent.id, {
          id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          agentId: consultedAgent.id,
          type: MemoryType.EXPERIENCE,
          content: `Provided consultation to ${consultingAgent.name} about: ${collaboration.topic}`,
          metadata: {
            requestingAgent: consultingAgent.id,
            response: result.text,
            timestamp: new Date(),
          },
          importance: 0.6,
          timestamp: new Date(),
          tags: ['consultation', 'collaboration'],
          duration: MemoryDuration.LONG_TERM,
        });
      }

      return `Consultation response from ${consultedAgent.name}: ${result.text}`;
    } catch (error) {
      this.logger.error('Failed to perform agent consultation:', error);
      return `Consultation with ${consultedAgent.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  enableAgentCollaboration(agentIds: string[]): void {
    try {
      // Validate all agent IDs exist
      const agents: Agent[] = [];
      for (const id of agentIds) {
        const agent = this.runtime.agents?.get(id);
        if (!agent) {
          throw new Error(`Agent with ID ${id} not found`);
        }
        agents.push(agent);
      }

      // Create collaboration network
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const agent1 = agents[i];
          const agent2 = agents[j];

          // Ensure agents are defined (they should be based on our validation above)
          if (!agent1 || !agent2) {
            throw new Error(
              `Unexpected undefined agent in collaboration setup`
            );
          }

          // Add bidirectional collaboration relationships
          this.collaborations.set(`${agent1.id}-${agent2.id}`, {
            consultingAgent: agent1.id,
            consultedAgent: agent2.id,
            permissions: ['consult', 'share_memory', 'delegate_tasks'],
            lastInteraction: new Date(),
            interactionCount: 0,
          });

          this.collaborations.set(`${agent2.id}-${agent1.id}`, {
            consultingAgent: agent2.id,
            consultedAgent: agent1.id,
            permissions: ['consult', 'share_memory', 'delegate_tasks'],
            lastInteraction: new Date(),
            interactionCount: 0,
          });
        }
      }

      this.logger.info(
        `Enabled collaboration network between ${agentIds.length} agents: ${agentIds.join(', ')}`
      );

      // Store collaboration network info in agent memories
      agents.forEach(async (agent) => {
        if (agent.memory) {
          const collaborators = agentIds.filter((id) => id !== agent.id);
          await agent.memory.store(agent.id, {
            id: `memory-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            agentId: agent.id,
            type: MemoryType.CONTEXT,
            content: `Collaboration network established with agents: ${collaborators.join(', ')}`,
            metadata: {
              collaborators,
              permissions: ['consult', 'share_memory', 'delegate_tasks'],
              establishedAt: new Date(),
            },
            importance: 0.8,
            timestamp: new Date(),
            tags: ['collaboration', 'network', 'system'],
            duration: MemoryDuration.PERMANENT,
          });
        }
      });
    } catch (error) {
      this.logger.error('Failed to enable agent collaboration:', error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */

  private async loadCharacterConfig(
    characterId: string
  ): Promise<CharacterConfig> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const __dirname = path.dirname(new URL(import.meta.url).pathname);
      const charactersDir = path.resolve(__dirname, '../characters');
      const configPath = path.join(charactersDir, `${characterId}.json`);

      const configData = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configData) as CharacterConfig;
    } catch (error) {
      void error;
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
        (agent as ExtendedAgent).originalConfig || agent.config;
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        characterId: (originalConfig as any)?.id || 'unknown',
      };
    });
  }

  getAgent(agentId: string): ExtendedAgent | null {
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

  /**
   * Metrics tracking helper methods
   */
  private getAgentErrorCount(agentId: string): number {
    return this.agentErrorCounts.get(agentId) || 0;
  }

  private getAgentMessageCount(agentId: string): number {
    return this.agentMessageCounts.get(agentId) || 0;
  }

  private getAgentAverageResponseTime(agentId: string): number {
    const responseTimes = this.agentResponseTimes.get(agentId) || [];
    if (responseTimes.length === 0) return 0;

    const sum = responseTimes.reduce((acc, time) => acc + time, 0);
    return sum / responseTimes.length;
  }

  // Public methods to update metrics
  incrementAgentErrorCount(agentId: string): void {
    const currentCount = this.agentErrorCounts.get(agentId) || 0;
    this.agentErrorCounts.set(agentId, currentCount + 1);
  }

  incrementAgentMessageCount(agentId: string): void {
    const currentCount = this.agentMessageCounts.get(agentId) || 0;
    this.agentMessageCounts.set(agentId, currentCount + 1);
  }

  recordAgentResponseTime(agentId: string, responseTime: number): void {
    const responseTimes = this.agentResponseTimes.get(agentId) || [];
    responseTimes.push(responseTime);

    // Keep only the last 100 response times to avoid memory issues
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }

    this.agentResponseTimes.set(agentId, responseTimes);
  }

  // === ADVANCED COORDINATION METHODS ===

  /**
   * Setup integration with coordination manager
   */
  private setupCoordinationIntegration(): void {
    // Listen to coordination events
    this.coordinationManager.on('consensus_reached', (data) => {
      this.logger.info(`Consensus reached: ${data.proposalId}`, {
        metadata: {
          accepted: data.accepted,
          votes: data.votes,
        },
      });
      this.emit('consensus_reached', data);
    });

    this.coordinationManager.on('task_assigned', (data) => {
      this.logger.info(`Task assigned: ${data.taskId} to ${data.assigneeId}`);
      this.emit('task_assigned', data);
    });

    this.coordinationManager.on('memory_shared', (data) => {
      this.logger.info(`Memory shared in pool: ${data.poolId}`);
      this.emit('memory_shared', data);
    });

    this.coordinationManager.on('channel_created', (data) => {
      this.logger.info(`Coordination channel created: ${data.name}`);
      this.emit('coordination_channel_created', data);
    });
  }

  /**
   * Create a coordination channel for agent communication
   */
  async createCoordinationChannel(
    name: string,
    type: 'broadcast' | 'direct' | 'group' | 'consensus',
    participants: string[],
    security?: {
      encryption?: boolean;
      authentication?: boolean;
      authorization?: string[];
    }
  ): Promise<string> {
    // Validate participants exist
    for (const participantId of participants) {
      if (!this.agents.has(participantId)) {
        throw new Error(`Agent ${participantId} not found`);
      }
    }

    const channelId = await this.coordinationManager.createChannel(
      name,
      type as any,
      participants,
      security as any
    );

    this.logger.info(`Created coordination channel: ${name}`, {
      metadata: {
        channelId,
        type,
        participants: participants.length,
      },
    });

    return channelId;
  }

  /**
   * Request consensus from a group of agents
   */
  async requestConsensus(
    proposerId: string,
    proposal: Record<string, unknown>,
    participants: string[],
    type:
      | 'simple_majority'
      | 'super_majority'
      | 'unanimous' = 'simple_majority',
    timeoutMs: number = 300000
  ): Promise<string> {
    // Validate proposer exists
    if (!this.agents.has(proposerId)) {
      throw new Error(`Proposer agent ${proposerId} not found`);
    }

    // Validate participants exist
    for (const participantId of participants) {
      if (!this.agents.has(participantId)) {
        throw new Error(`Participant agent ${participantId} not found`);
      }
    }

    const proposalId = await this.coordinationManager.createConsensusProposal(
      proposerId,
      type as any,
      proposal,
      participants,
      timeoutMs
    );

    this.logger.info(`Consensus requested by ${proposerId}`, {
      metadata: {
        proposalId,
        type,
        participants: participants.length,
      },
    });

    return proposalId;
  }

  /**
   * Distribute a task among eligible agents
   */
  async distributeTask(
    requesterId: string,
    task: {
      id: string;
      type: string;
      description: string;
      requirements: {
        capabilities: string[];
        resources?: Array<{
          type: string;
          amount: number;
          duration: number;
          exclusive: boolean;
        }>;
        performance?: {
          maxLatency: number;
          minThroughput: number;
          reliability: number;
        };
      };
      priority: number;
      estimatedDuration: number;
      dependencies: string[];
      payload: Record<string, unknown>;
    },
    eligibleAgents?: string[]
  ): Promise<string> {
    // Validate requester exists
    if (!this.agents.has(requesterId)) {
      throw new Error(`Requester agent ${requesterId} not found`);
    }

    // Validate eligible agents if specified
    if (eligibleAgents) {
      for (const agentId of eligibleAgents) {
        if (!this.agents.has(agentId)) {
          throw new Error(`Eligible agent ${agentId} not found`);
        }
      }
    }

    const distributionId =
      await this.coordinationManager.requestTaskDistribution(
        requesterId,
        task as any,
        eligibleAgents
      );

    this.logger.info(`Task distribution requested: ${task.id}`, {
      metadata: {
        distributionId,
        requesterId,
        eligibleAgents: eligibleAgents?.length || 'auto',
      },
    });

    return distributionId;
  }

  /**
   * Create a shared memory pool for collaborative memory management
   */
  async createSharedMemoryPool(
    name: string,
    participants: string[],
    config?: {
      accessControl?: {
        requireConsensusForWrite?: boolean;
        auditAccess?: boolean;
        encryptMemories?: boolean;
      };
      synchronization?: {
        strategy?: 'immediate' | 'batched' | 'eventual_consistency';
        conflictResolution?: 'last_writer_wins' | 'consensus_required';
        syncIntervalMs?: number;
      };
    }
  ): Promise<string> {
    // Validate participants exist
    for (const participantId of participants) {
      if (!this.agents.has(participantId)) {
        throw new Error(`Participant agent ${participantId} not found`);
      }
    }

    const poolId = await this.coordinationManager.createSharedMemoryPool(
      name,
      participants,
      config?.accessControl as any,
      config?.synchronization as any
    );

    this.logger.info(`Created shared memory pool: ${name}`, {
      metadata: {
        poolId,
        participants: participants.length,
      },
    });

    return poolId;
  }

  /**
   * Share a memory with other agents in a pool
   */
  async shareMemoryInPool(
    poolId: string,
    ownerId: string,
    memory: MemoryRecord,
    permissions?: {
      read?: string[];
      write?: string[];
      delete?: string[];
      share?: string[];
    }
  ): Promise<void> {
    // Validate owner exists
    if (!this.agents.has(ownerId)) {
      throw new Error(`Owner agent ${ownerId} not found`);
    }

    await this.coordinationManager.shareMemory(
      poolId,
      ownerId,
      memory,
      permissions as any
    );

    this.logger.info(`Memory shared in pool: ${poolId}`, {
      metadata: {
        memoryId: memory.id,
        ownerId,
      },
    });
  }

  /**
   * Get coordination metrics and health status
   */
  getCoordinationMetrics(): {
    metrics: any;
    health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      issues: string[];
    };
  } {
    const metrics = this.coordinationManager.getMetrics();
    const health = this.coordinationManager.getHealthStatus();

    return {
      metrics,
      health: {
        status: health.status,
        issues: health.issues,
      },
    };
  }

  /**
   * Enhanced agent collaboration with advanced coordination
   */
  async enableAdvancedCollaboration(
    agentIds: string[],
    config?: {
      communicationChannels?: boolean;
      sharedMemory?: boolean;
      taskDistribution?: boolean;
      consensusDecisions?: boolean;
    }
  ): Promise<{
    channelId?: string;
    memoryPoolId?: string;
    collaborationId: string;
  }> {
    // Validate all agents exist
    for (const agentId of agentIds) {
      if (!this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} not found`);
      }
    }

    const collaborationId = `collab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const result: any = { collaborationId };

    // Setup communication channels
    if (config?.communicationChannels !== false) {
      result.channelId = await this.createCoordinationChannel(
        `collaboration-${collaborationId}`,
        'group',
        agentIds,
        {
          authentication: true,
          authorization: agentIds,
        }
      );
    }

    // Setup shared memory
    if (config?.sharedMemory !== false) {
      result.memoryPoolId = await this.createSharedMemoryPool(
        `collab-memory-${collaborationId}`,
        agentIds,
        {
          accessControl: {
            requireConsensusForWrite: config?.consensusDecisions !== false,
            auditAccess: true,
          },
          synchronization: {
            strategy: 'eventual_consistency',
            conflictResolution:
              config?.consensusDecisions !== false
                ? 'consensus_required'
                : 'last_writer_wins',
          },
        }
      );
    }

    // Enable legacy collaboration as fallback
    this.enableAgentCollaboration(agentIds);

    this.logger.info(
      `Advanced collaboration enabled for ${agentIds.length} agents`,
      {
        metadata: {
          collaborationId,
          agentIds,
          config,
        },
      }
    );

    this.emit('advanced_collaboration_enabled', {
      collaborationId,
      agentIds,
      config,
      result,
    });

    return result;
  }

  /**
   * Enhanced shutdown with coordination cleanup
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Multi-Agent Manager');

    // Shutdown coordination manager first
    await this.coordinationManager.shutdown();

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
