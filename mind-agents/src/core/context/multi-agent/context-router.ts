/**
 * Context Router for Multi-Agent Systems
 *
 * Routes context sharing requests based on agent capabilities,
 * proximity, load balancing, and custom routing strategies.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextRoutingConfig,
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Route result information
 */
export interface RouteResult {
  targetAgents: AgentId[];
  routingStrategy: string;
  routingTime: number;
  alternativeAgents?: AgentId[];
  routingMetadata?: Record<string, unknown>;
}

/**
 * Agent capabilities and metadata
 */
export interface AgentCapability {
  agentId: AgentId;
  capabilities: string[];
  load: number;
  responseTime: number;
  availability: number; // 0-1 scale
  lastSeen: string;
  metadata?: Record<string, unknown>;
}

/**
 * Load balancing information
 */
export interface LoadBalancingInfo {
  agentId: AgentId;
  currentLoad: number;
  maxLoad: number;
  utilization: number;
  responseTimes: number[];
  avgResponseTime: number;
}

/**
 * Routes context sharing based on various strategies
 */
export class ContextRouter extends EventEmitter {
  private agentCapabilities: Map<AgentId, AgentCapability> = new Map();
  private loadBalancing: Map<AgentId, LoadBalancingInfo> = new Map();
  private proximityMatrix: Map<AgentId, Map<AgentId, number>> = new Map();
  private routingHistory: Map<string, RouteResult[]> = new Map();
  private config: ContextRoutingConfig;

  constructor(config: ContextRoutingConfig) {
    super();
    this.config = config;
    this.initializeCapabilities();
    this.initializeProximityMatrix();
    this.setupLoadMonitoring();
  }

  /**
   * Route context to appropriate agents
   */
  async routeContext(
    context: AgentContext,
    requiredCapabilities?: string[],
    excludeAgents?: AgentId[]
  ): Promise<RouteResult> {
    const startTime = Date.now();

    try {
      runtimeLogger.debug('Starting context routing', {
        sourceAgent: context.agentId,
        strategy: this.config.routingStrategy,
        requiredCapabilities,
        excludeAgents: excludeAgents?.length || 0,
      });

      // Get available agents
      const availableAgents = this.getAvailableAgents(excludeAgents);

      if (availableAgents.length === 0) {
        throw new Error('No available agents for routing');
      }

      // Filter by capabilities if specified
      const capableAgents = requiredCapabilities
        ? this.filterByCapabilities(availableAgents, requiredCapabilities)
        : availableAgents;

      if (capableAgents.length === 0) {
        throw new Error('No agents found with required capabilities');
      }

      // Route based on strategy
      const targetAgents = await this.routeByStrategy(
        context,
        capableAgents,
        this.config.routingStrategy
      );

      // Get alternative agents for fallback
      const alternativeAgents = capableAgents
        .filter((id) => !targetAgents.includes(id))
        .slice(0, 3); // Top 3 alternatives

      const routingTime = Date.now() - startTime;

      const result: RouteResult = {
        targetAgents,
        routingStrategy: this.config.routingStrategy,
        routingTime,
        alternativeAgents,
        routingMetadata: {
          availableAgents: availableAgents.length,
          capableAgents: capableAgents.length,
          requiredCapabilities,
          excludedAgents: excludeAgents?.length || 0,
        },
      };

      // Store routing history
      this.storeRoutingHistory(context, result);

      // Update load information
      this.updateLoadInformation(targetAgents);

      this.emit('contextRouted', {
        sourceAgent: context.agentId,
        targetAgents,
        strategy: this.config.routingStrategy,
        routingTime,
      });

      runtimeLogger.debug('Context routing completed', {
        sourceAgent: context.agentId,
        targetAgents: targetAgents.length,
        routingTime,
        strategy: this.config.routingStrategy,
      });

      return result;
    } catch (error) {
      const routingTime = Date.now() - startTime;

      runtimeLogger.error('Context routing failed', error as Error, {
        sourceAgent: context.agentId,
        strategy: this.config.routingStrategy,
        routingTime,
      });

      throw error;
    }
  }

  /**
   * Register agent capabilities
   */
  async registerAgent(
    agentId: AgentId,
    capabilities: string[],
    metadata?: Record<string, unknown>
  ): Promise<OperationResult> {
    try {
      const agentCapability: AgentCapability = {
        agentId,
        capabilities,
        load: 0,
        responseTime: 0,
        availability: 1.0,
        lastSeen: new Date().toISOString(),
        metadata,
      };

      this.agentCapabilities.set(agentId, agentCapability);

      // Initialize load balancing info
      const loadInfo: LoadBalancingInfo = {
        agentId,
        currentLoad: 0,
        maxLoad: 100, // Default max load
        utilization: 0,
        responseTimes: [],
        avgResponseTime: 0,
      };

      this.loadBalancing.set(agentId, loadInfo);

      // Initialize proximity if not exists
      if (!this.proximityMatrix.has(agentId)) {
        this.proximityMatrix.set(agentId, new Map());
      }

      this.emit('agentRegistered', {
        agentId,
        capabilities,
        metadata,
      });

      runtimeLogger.debug('Agent registered for routing', {
        agentId,
        capabilities: capabilities.length,
        metadata: !!metadata,
      });

      return {
        success: true,
        data: {
          agentId,
          capabilities,
          registrationTime: agentCapability.lastSeen,
        },
        metadata: {
          operation: 'registerAgent',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Agent registration failed: ${(error as Error).message}`,
        metadata: {
          operation: 'registerAgent',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: AgentId): Promise<OperationResult> {
    try {
      const existed = this.agentCapabilities.has(agentId);

      this.agentCapabilities.delete(agentId);
      this.loadBalancing.delete(agentId);
      this.proximityMatrix.delete(agentId);

      // Remove from other agents' proximity matrices
      for (const [, proximityMap] of this.proximityMatrix.entries()) {
        proximityMap.delete(agentId);
      }

      if (existed) {
        this.emit('agentUnregistered', { agentId });

        runtimeLogger.debug('Agent unregistered from routing', { agentId });
      }

      return {
        success: true,
        data: { agentId, existed },
        metadata: {
          operation: 'unregisterAgent',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Agent unregistration failed: ${(error as Error).message}`,
        metadata: {
          operation: 'unregisterAgent',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Update agent availability
   */
  async updateAgentAvailability(
    agentId: AgentId,
    availability: number,
    responseTime?: number
  ): Promise<OperationResult> {
    try {
      const capability = this.agentCapabilities.get(agentId);
      if (!capability) {
        return {
          success: false,
          error: 'Agent not found',
          metadata: { operation: 'updateAgentAvailability' },
        };
      }

      capability.availability = Math.max(0, Math.min(1, availability));
      capability.lastSeen = new Date().toISOString();

      if (responseTime !== undefined) {
        capability.responseTime = responseTime;

        // Update load balancing info
        const loadInfo = this.loadBalancing.get(agentId);
        if (loadInfo) {
          loadInfo.responseTimes.push(responseTime);

          // Keep only last 100 response times
          if (loadInfo.responseTimes.length > 100) {
            loadInfo.responseTimes.shift();
          }

          loadInfo.avgResponseTime =
            loadInfo.responseTimes.reduce((a, b) => a + b, 0) /
            loadInfo.responseTimes.length;
        }
      }

      return {
        success: true,
        data: {
          agentId,
          availability: capability.availability,
          responseTime: capability.responseTime,
        },
        metadata: {
          operation: 'updateAgentAvailability',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Availability update failed: ${(error as Error).message}`,
        metadata: {
          operation: 'updateAgentAvailability',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Update proximity between agents
   */
  async updateProximity(
    agent1: AgentId,
    agent2: AgentId,
    proximity: number
  ): Promise<OperationResult> {
    try {
      const normalizedProximity = Math.max(0, Math.min(1, proximity));

      // Update bidirectional proximity
      if (!this.proximityMatrix.has(agent1)) {
        this.proximityMatrix.set(agent1, new Map());
      }
      if (!this.proximityMatrix.has(agent2)) {
        this.proximityMatrix.set(agent2, new Map());
      }

      this.proximityMatrix.get(agent1)!.set(agent2, normalizedProximity);
      this.proximityMatrix.get(agent2)!.set(agent1, normalizedProximity);

      return {
        success: true,
        data: {
          agent1,
          agent2,
          proximity: normalizedProximity,
        },
        metadata: {
          operation: 'updateProximity',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Proximity update failed: ${(error as Error).message}`,
        metadata: {
          operation: 'updateProximity',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get available agents (excluding specified ones)
   */
  private getAvailableAgents(excludeAgents?: AgentId[]): AgentId[] {
    const excludeSet = new Set(excludeAgents || []);

    return Array.from(this.agentCapabilities.entries())
      .filter(
        ([agentId, capability]) =>
          !excludeSet.has(agentId) &&
          capability.availability > 0.1 && // At least 10% availability
          this.isAgentHealthy(agentId)
      )
      .map(([agentId]) => agentId);
  }

  /**
   * Filter agents by required capabilities
   */
  private filterByCapabilities(
    agents: AgentId[],
    requiredCapabilities: string[]
  ): AgentId[] {
    return agents.filter((agentId) => {
      const capability = this.agentCapabilities.get(agentId);
      if (!capability) return false;

      return requiredCapabilities.every((required) =>
        capability.capabilities.includes(required)
      );
    });
  }

  /**
   * Route by strategy
   */
  private async routeByStrategy(
    context: AgentContext,
    availableAgents: AgentId[],
    strategy: string
  ): Promise<AgentId[]> {
    switch (strategy) {
      case 'capability_based':
        return this.routeByCapability(context, availableAgents);

      case 'proximity_based':
        return this.routeByProximity(context, availableAgents);

      case 'load_balanced':
        return this.routeByLoadBalance(context, availableAgents);

      case 'custom':
        return this.routeByCustomLogic(context, availableAgents);

      default:
        runtimeLogger.warn('Unknown routing strategy, using capability-based', {
          strategy,
        });
        return this.routeByCapability(context, availableAgents);
    }
  }

  /**
   * Route by capability matching
   */
  private routeByCapability(
    context: AgentContext,
    availableAgents: AgentId[]
  ): AgentId[] {
    // Score agents based on capability match
    const scoredAgents = availableAgents.map((agentId) => {
      const capability = this.agentCapabilities.get(agentId)!;

      // Simple scoring: more capabilities = higher score
      const score = capability.capabilities.length * capability.availability;

      return { agentId, score };
    });

    // Sort by score and return top agents
    scoredAgents.sort((a, b) => b.score - a.score);

    // Return top 25% or minimum 1 agent
    const count = Math.max(1, Math.ceil(scoredAgents.length * 0.25));
    return scoredAgents.slice(0, count).map((item) => item.agentId);
  }

  /**
   * Route by proximity
   */
  private routeByProximity(
    context: AgentContext,
    availableAgents: AgentId[]
  ): AgentId[] {
    const sourceAgent = context.agentId;
    const sourceProximity = this.proximityMatrix.get(sourceAgent);

    if (!sourceProximity) {
      // No proximity data, fall back to capability-based
      return this.routeByCapability(context, availableAgents);
    }

    // Score by proximity (higher proximity = better)
    const scoredAgents = availableAgents.map((agentId) => {
      const proximity = sourceProximity.get(agentId) || 0;
      const capability = this.agentCapabilities.get(agentId)!;

      // Combine proximity and availability
      const score = proximity * capability.availability;

      return { agentId, score, proximity };
    });

    // Sort by score
    scoredAgents.sort((a, b) => b.score - a.score);

    // Return top agents based on proximity threshold
    const threshold = 0.3; // Minimum proximity threshold
    const closeAgents = scoredAgents.filter(
      (item) => item.proximity >= threshold
    );

    if (closeAgents.length === 0) {
      // No close agents, return at least one
      return [scoredAgents[0].agentId];
    }

    return closeAgents.map((item) => item.agentId);
  }

  /**
   * Route by load balancing
   */
  private routeByLoadBalance(
    context: AgentContext,
    availableAgents: AgentId[]
  ): AgentId[] {
    // Score agents by load (lower load = higher score)
    const scoredAgents = availableAgents.map((agentId) => {
      const loadInfo = this.loadBalancing.get(agentId)!;
      const capability = this.agentCapabilities.get(agentId)!;

      // Score based on utilization and availability (lower utilization = higher score)
      const utilizationScore = 1 - loadInfo.utilization;
      const responseTimeScore =
        loadInfo.avgResponseTime > 0
          ? 1 / (loadInfo.avgResponseTime / 1000)
          : 1;
      const availabilityScore = capability.availability;

      const score =
        utilizationScore * 0.4 +
        responseTimeScore * 0.3 +
        availabilityScore * 0.3;

      return { agentId, score, utilization: loadInfo.utilization };
    });

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    // Return agents with utilization below 80%
    const threshold = 0.8;
    const availableByLoad = scoredAgents.filter(
      (item) => item.utilization < threshold
    );

    if (availableByLoad.length === 0) {
      // All agents are heavily loaded, return least loaded
      return [scoredAgents[0].agentId];
    }

    // Return top 50% of available agents
    const count = Math.max(1, Math.ceil(availableByLoad.length * 0.5));
    return availableByLoad.slice(0, count).map((item) => item.agentId);
  }

  /**
   * Route by custom logic
   */
  private routeByCustomLogic(
    context: AgentContext,
    availableAgents: AgentId[]
  ): AgentId[] {
    if (this.config.customRouter) {
      return this.config.customRouter(context, availableAgents);
    }

    // Fall back to capability-based routing
    return this.routeByCapability(context, availableAgents);
  }

  /**
   * Check if agent is healthy
   */
  private isAgentHealthy(agentId: AgentId): boolean {
    const capability = this.agentCapabilities.get(agentId);
    if (!capability) return false;

    const lastSeenTime = new Date(capability.lastSeen).getTime();
    const now = Date.now();
    const timeSinceLastSeen = now - lastSeenTime;

    // Consider agent unhealthy if not seen for more than 5 minutes
    return timeSinceLastSeen < 300000;
  }

  /**
   * Store routing history
   */
  private storeRoutingHistory(
    context: AgentContext,
    result: RouteResult
  ): void {
    const key = context.agentId;

    if (!this.routingHistory.has(key)) {
      this.routingHistory.set(key, []);
    }

    const history = this.routingHistory.get(key)!;
    history.push(result);

    // Keep only last 50 routing results per agent
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Update load information after routing
   */
  private updateLoadInformation(targetAgents: AgentId[]): void {
    for (const agentId of targetAgents) {
      const loadInfo = this.loadBalancing.get(agentId);
      if (loadInfo) {
        loadInfo.currentLoad++;
        loadInfo.utilization = loadInfo.currentLoad / loadInfo.maxLoad;
      }
    }
  }

  /**
   * Initialize capabilities from config
   */
  private initializeCapabilities(): void {
    if (this.config.capabilities) {
      for (const [agentId, capabilities] of Object.entries(
        this.config.capabilities
      )) {
        this.registerAgent(agentId, capabilities).catch((error) => {
          runtimeLogger.error(
            'Failed to register agent from config',
            error as Error,
            {
              agentId,
            }
          );
        });
      }
    }
  }

  /**
   * Initialize proximity matrix from config
   */
  private initializeProximityMatrix(): void {
    if (this.config.proximityMatrix) {
      for (const [agent1, proximities] of Object.entries(
        this.config.proximityMatrix
      )) {
        for (const [agent2, proximity] of Object.entries(proximities)) {
          this.updateProximity(agent1, agent2, proximity).catch((error) => {
            runtimeLogger.error(
              'Failed to set proximity from config',
              error as Error,
              {
                agent1,
                agent2,
                proximity,
              }
            );
          });
        }
      }
    }
  }

  /**
   * Setup load monitoring
   */
  private setupLoadMonitoring(): void {
    // Decrease load over time (simulate request completion)
    setInterval(() => {
      for (const loadInfo of this.loadBalancing.values()) {
        if (loadInfo.currentLoad > 0) {
          loadInfo.currentLoad = Math.max(0, loadInfo.currentLoad - 1);
          loadInfo.utilization = loadInfo.currentLoad / loadInfo.maxLoad;
        }
      }
    }, 1000); // Decrease load every second
  }

  /**
   * Get routing statistics
   */
  getStatistics() {
    const totalAgents = this.agentCapabilities.size;
    const healthyAgents = Array.from(this.agentCapabilities.keys()).filter(
      (agentId) => this.isAgentHealthy(agentId)
    ).length;

    const totalCapabilities = Array.from(
      this.agentCapabilities.values()
    ).reduce((sum, cap) => sum + cap.capabilities.length, 0);

    const avgLoad =
      Array.from(this.loadBalancing.values()).reduce(
        (sum, load) => sum + load.utilization,
        0
      ) / this.loadBalancing.size;

    const totalRoutingHistory = Array.from(this.routingHistory.values()).reduce(
      (sum, history) => sum + history.length,
      0
    );

    return {
      totalAgents,
      healthyAgents,
      unhealthyAgents: totalAgents - healthyAgents,
      totalCapabilities,
      avgCapabilitiesPerAgent: totalCapabilities / totalAgents,
      avgLoad: avgLoad || 0,
      proximityConnections: Array.from(this.proximityMatrix.values()).reduce(
        (sum, map) => sum + map.size,
        0
      ),
      totalRoutingHistory,
    };
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(): Map<AgentId, AgentCapability> {
    return new Map(this.agentCapabilities);
  }

  /**
   * Get load balancing information
   */
  getLoadBalancingInfo(): Map<AgentId, LoadBalancingInfo> {
    return new Map(this.loadBalancing);
  }

  /**
   * Get routing history for an agent
   */
  getRoutingHistory(agentId: AgentId): RouteResult[] {
    return this.routingHistory.get(agentId) || [];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.agentCapabilities.clear();
    this.loadBalancing.clear();
    this.proximityMatrix.clear();
    this.routingHistory.clear();
    this.removeAllListeners();
  }
}
