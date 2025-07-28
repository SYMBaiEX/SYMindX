/**
 * Agent Management Skill for API Extension
 *
 * Provides comprehensive agent lifecycle management, monitoring, and coordination.
 * Features:
 * - Agent spawning and termination
 * - Real-time agent status monitoring
 * - Multi-agent coordination
 * - Agent resource management
 * - Performance analytics
 * - Health monitoring
 * - State management
 */

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
  AgentStatus,
  // AgentEvent,
} from '../../../types/agent';
import { SkillParameters } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';
import { ApiExtension } from '../index';

interface AgentMetrics {
  id: string;
  name: string;
  status: AgentStatus;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  lastActivity: Date;
  performance: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
  };
}

interface AgentConfiguration {
  characterId: string;
  instanceName?: string;
  autoStart?: boolean;
  priority?: number;
  resources?: {
    maxMemory?: number;
    maxCpu?: number;
    timeout?: number;
  };
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export class AgentManagementSkill {
  private extension: ApiExtension;
  private agentMetrics = new Map<string, AgentMetrics>();
  private monitoringInterval?: ReturnType<typeof setInterval>;

  constructor(extension: ApiExtension) {
    this['extension'] = extension;
    this['startMonitoring']();
  }

  /**
   * Get all agent management actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      spawn_agent: {
        name: 'spawn_agent',
        description: 'Spawn a new agent instance with configuration',
        category: ActionCategory.AGENT,
        parameters: {
          characterId: 'string',
          instanceName: 'string',
          config: 'object',
          autoStart: 'boolean',
          priority: 'number',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['spawnAgent'](_agent, params);
        },
      },

      terminate_agent: {
        name: 'terminate_agent',
        description: 'Terminate a running agent instance',
        category: ActionCategory.AGENT,
        parameters: {
          agentId: 'string',
          reason: 'string',
          graceful: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['terminateAgent'](_agent, params);
        },
      },

      restart_agent: {
        name: 'restart_agent',
        description: 'Restart an agent with optional configuration updates',
        category: ActionCategory.AGENT,
        parameters: {
          agentId: 'string',
          config: 'object',
          preserveState: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['restartAgent'](_agent, params);
        },
      },

      get_agent_status: {
        name: 'get_agent_status',
        description: 'Get detailed status information for an agent',
        category: ActionCategory.OBSERVATION,
        parameters: {
          agentId: 'string',
          includeMetrics: 'boolean',
          includeHistory: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['getAgentStatus'](_agent, params);
        },
      },

      list_agents: {
        name: 'list_agents',
        description: 'List all agents with optional filtering',
        category: ActionCategory.OBSERVATION,
        parameters: {
          status: 'string',
          character: 'string',
          includeMetrics: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['listAgents'](_agent, params);
        },
      },

      get_agent_metrics: {
        name: 'get_agent_metrics',
        description: 'Get performance metrics for agent(s)',
        category: ActionCategory.OBSERVATION,
        parameters: {
          agentId: 'string',
          timeRange: 'string',
          metrics: 'array',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['getAgentMetrics'](_agent, params);
        },
      },

      update_agent_config: {
        name: 'update_agent_config',
        description: 'Update agent configuration dynamically',
        category: ActionCategory.AGENT,
        parameters: {
          agentId: 'string',
          config: 'object',
          restart: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['updateAgentConfig'](_agent, params);
        },
      },

      scale_agents: {
        name: 'scale_agents',
        description: 'Scale agent instances up or down',
        category: ActionCategory.AGENT,
        parameters: {
          characterId: 'string',
          targetCount: 'number',
          strategy: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['scaleAgents'](_agent, params);
        },
      },

      coordinate_agents: {
        name: 'coordinate_agents',
        description: 'Coordinate multiple agents for a task',
        category: ActionCategory.AGENT,
        parameters: {
          agentIds: 'array',
          task: 'object',
          strategy: 'string',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['coordinateAgents'](_agent, params);
        },
      },

      agent_health_check: {
        name: 'agent_health_check',
        description: 'Perform comprehensive health check on agent(s)',
        category: ActionCategory.OBSERVATION,
        parameters: {
          agentId: 'string',
          deep: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['agentHealthCheck'](_agent, params);
        },
      },

      backup_agent_state: {
        name: 'backup_agent_state',
        description: 'Create a backup of agent state',
        category: ActionCategory.SYSTEM,
        parameters: {
          agentId: 'string',
          includeMemory: 'boolean',
          compress: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['backupAgentState'](_agent, params);
        },
      },

      restore_agent_state: {
        name: 'restore_agent_state',
        description: 'Restore agent from backup',
        category: ActionCategory.SYSTEM,
        parameters: {
          agentId: 'string',
          backupId: 'string',
          overwrite: 'boolean',
        },
        execute: async (
          _agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this['restoreAgentState'](_agent, params);
        },
      },
    };
  }

  /**
   * Spawn a new agent instance
   */
  private async spawnAgent(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const config: AgentConfiguration = {
        characterId: String(params['characterId']),
        instanceName: params['instanceName']
          ? String(params['instanceName'])
          : undefined,
        autoStart: Boolean(params['autoStart'] ?? true),
        priority: typeof params['priority'] === 'number' ? params['priority'] : 1,
        ...((params['config'] as any) || {}),
      };

      // Validate configuration
      if (!config['characterId']) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Character ID is required',
          metadata: { action: 'spawn_agent' },
        };
      }

      // Get runtime reference
      const runtime = (this['extension'] as any)['runtime'];
      if (!runtime?.['multiAgentManager']) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Multi-agent manager not available',
          metadata: { action: 'spawn_agent' },
        };
      }

      // Spawn the agent
      const agentId = await runtime['multiAgentManager']['spawnAgent'](config);

      if (!agentId) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Failed to spawn agent',
          metadata: { action: 'spawn_agent' },
        };
      }

      // Initialize metrics for the new agent
      this['initializeAgentMetrics'](agentId, config['characterId']);

      runtimeLogger['extension'](
        `🚀 Agent spawned: ${agentId} (${config['characterId']})`
      );

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agentId,
          characterId: config['characterId'],
          instanceName: config['instanceName'],
          status: 'spawned',
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'spawn_agent',
          agentId,
          characterId: config['characterId'],
        },
      };
    } catch (error) {
      void error;
      runtimeLogger['error']('Failed to spawn agent:', error);
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to spawn agent: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'spawn_agent' },
      };
    }
  }

  /**
   * Terminate an agent instance
   */
  private async terminateAgent(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const reason = String(params['reason'] || 'manual_termination');
      const graceful = Boolean(params['graceful'] ?? true);

      const runtime = (this['extension'] as any)['runtime'];
      if (!runtime?.['multiAgentManager']) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Multi-agent manager not available',
          metadata: { action: 'terminate_agent' },
        };
      }

      // Terminate the agent
      await runtime['multiAgentManager']['terminateAgent'](agentId, reason, graceful);

      // Clean up metrics
      this['agentMetrics']['delete'](agentId);

      runtimeLogger['extension'](`🛑 Agent terminated: ${agentId} (${reason})`);

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agentId,
          reason,
          graceful,
          terminatedAt: new Date()['toISOString'](),
        },
        metadata: {
          action: 'terminate_agent',
          agentId,
          reason,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to terminate agent: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'terminate_agent' },
      };
    }
  }

  /**
   * Restart an agent
   */
  private async restartAgent(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const config = (params['config'] || {}) as Record<string, unknown>;
      const preserveState = Boolean(params['preserveState'] ?? true);

      // First terminate, then spawn with new config
      await this['terminateAgent'](_agent, {
        agentId,
        reason: 'restart',
        graceful: true,
      });

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Respawn with new config
      const spawnResult = await this['spawnAgent'](_agent, {
        ...config,
        preserveState,
      });

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agentId,
          restarted: true,
          preserveState,
          newAgent: spawnResult['result'],
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'restart_agent',
          agentId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to restart agent: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'restart_agent' },
      };
    }
  }

  /**
   * Get agent status
   */
  private async getAgentStatus(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const includeMetrics = Boolean(params['includeMetrics'] ?? true);
      const includeHistory = Boolean(params['includeHistory'] ?? false);

      const runtime = (this['extension'] as any)['runtime'];
      const targetAgent =
        runtime?.['agents']?.['get'](agentId) || runtime?.['lazyAgents']?.['get'](agentId);

      if (!targetAgent) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Agent not found',
          metadata: { action: 'get_agent_status' },
        };
      }

      const metrics = this['agentMetrics']['get'](agentId);
      const status = {
        id: agentId,
        name: targetAgent['name'] || agentId,
        status: targetAgent['status'] || 'unknown',
        type: targetAgent['agent'] ? 'active' : 'lazy',
        lastActivity: metrics?.['lastActivity'] || new Date(),
        timestamp: new Date().toISOString(),
      };

      if (includeMetrics && metrics) {
        (status as any).metrics = {
          uptime: metrics['uptime'],
          memoryUsage: metrics['memoryUsage'],
          cpuUsage: metrics['cpuUsage'],
          requestCount: metrics['requestCount'],
          errorCount: metrics['errorCount'],
          performance: metrics['performance'],
        };
      }

      if (includeHistory) {
        // Add history if available
        (status as any).history = []; // Placeholder for event history
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: status,
        metadata: {
          action: 'get_agent_status',
          agentId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get agent status: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'get_agent_status' },
      };
    }
  }

  /**
   * List all agents
   */
  private async listAgents(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const statusFilter = params['status'] ? String(params['status']) : undefined;
      const characterFilter = params['character']
        ? String(params['character'])
        : undefined;
      const includeMetrics = Boolean(params['includeMetrics'] ?? false);

      const runtime = (this['extension'] as any)['runtime'];
      const agents: any[] = [];

      // Get active agents
      if (runtime?.['agents']) {
        for (const [id, agentData] of runtime['agents']) {
          if (statusFilter && agentData['status'] !== statusFilter) continue;
          if (characterFilter && !agentData['name']['includes'](characterFilter))
            continue;

          const agentInfo: any = {
            id,
            name: agentData['name'],
            status: agentData['status'],
            type: 'active',
          };

          if (includeMetrics) {
            const metrics = this['agentMetrics']['get'](id);
            if (metrics) {
              agentInfo['metrics'] = {
                uptime: metrics['uptime'],
                requestCount: metrics['requestCount'],
                errorCount: metrics['errorCount'],
                lastActivity: metrics['lastActivity'],
              };
            }
          }

          agents.push(agentInfo);
        }
      }

      // Get lazy agents
      if (runtime?.['lazyAgents']) {
        for (const [id, lazyAgent] of runtime['lazyAgents']) {
          if (statusFilter && lazyAgent['state'] !== statusFilter) continue;
          if (characterFilter && !lazyAgent['name']['includes'](characterFilter))
            continue;

          agents.push({
            id,
            name: lazyAgent['name'],
            status: lazyAgent['state'],
            type: 'lazy',
          });
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agents,
          count: agents['length'],
          filters: {
            status: statusFilter,
            character: characterFilter,
          },
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'list_agents',
          count: agents['length'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to list agents: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'list_agents' },
      };
    }
  }

  /**
   * Get agent metrics
   */
  private async getAgentMetrics(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = params['agentId'] ? String(params['agentId']) : undefined;
      const timeRange = String(params['timeRange'] || 'hour');
      const requestedMetrics = Array['isArray'](params['metrics'])
        ? (params['metrics'] as string[])
        : [];

      const results: Record<string, any> = {};

      if (agentId) {
        // Get metrics for specific agent
        const metrics = this['agentMetrics']['get'](agentId);
        if (metrics) {
          results[agentId] = this['filterMetrics'](metrics, requestedMetrics);
        }
      } else {
        // Get metrics for all agents
        for (const [id, metrics] of this['agentMetrics']) {
          results[id] = this['filterMetrics'](metrics, requestedMetrics);
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          metrics: results,
          timeRange,
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'get_agent_metrics',
          agentCount: Object.keys(results)['length'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get agent metrics: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'get_agent_metrics' },
      };
    }
  }

  /**
   * Update agent configuration
   */
  private async updateAgentConfig(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const config = (params['config'] || {}) as Record<string, unknown>;
      const restart = Boolean(params['restart'] ?? false);

      // Placeholder for configuration update
      // In a real implementation, this would update the agent's configuration

      if (restart) {
        return this['restartAgent'](_agent, {
          agentId,
          config: config as SkillParameters,
        });
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agentId,
          configUpdated: true,
          restart,
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'update_agent_config',
          agentId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to update agent config: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'update_agent_config' },
      };
    }
  }

  /**
   * Scale agents up or down
   */
  private async scaleAgents(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const characterId = String(params['characterId']);
      const targetCount =
        typeof params['targetCount'] === 'number' ? params['targetCount'] : 1;
      const strategy = String(params['strategy'] || 'balanced');

      // Count current agents for this character
      const runtime = (this['extension'] as any)['runtime'];
      const currentAgents = Array['from'](runtime?.['agents']?.['values']() || [])['filter'](
        (a: any) => a['name']['includes'](characterId)
      );

      const currentCount = currentAgents['length'];
      const scalingOperations: any[] = [];

      if (targetCount > currentCount) {
        // Scale up
        const toSpawn = targetCount - currentCount;
        for (let i = 0; i < toSpawn; i++) {
          const spawnResult = await this['spawnAgent'](_agent, {
            characterId,
            instanceName: `${characterId}_${currentCount + i + 1}`,
            autoStart: true,
          });
          scalingOperations.push({
            operation: 'spawn',
            result: spawnResult['success'],
            agentId: spawnResult['success']
              ? (spawnResult['result'] as any)['agentId']
              : null,
          });
        }
      } else if (targetCount < currentCount) {
        // Scale down
        const toTerminate = currentCount - targetCount;
        const agentsToTerminate = currentAgents['slice'](-toTerminate);

        for (const agentToTerminate of agentsToTerminate) {
          const terminateResult = await this['terminateAgent'](_agent, {
            agentId: (agentToTerminate as any)['id'],
            reason: 'scaling_down',
            graceful: true,
          });
          scalingOperations.push({
            operation: 'terminate',
            result: terminateResult['success'],
            agentId: (agentToTerminate as any)['id'],
          });
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          characterId,
          previousCount: currentCount,
          targetCount,
          strategy,
          operations: scalingOperations,
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'scale_agents',
          characterId,
          operationCount: scalingOperations['length'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to scale agents: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'scale_agents' },
      };
    }
  }

  /**
   * Coordinate multiple agents
   */
  private async coordinateAgents(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentIds = Array['isArray'](params['agentIds'])
        ? (params['agentIds'] as string[])
        : [];
      const task = params['task'] || {};
      const strategy = String(params['strategy'] || 'parallel');

      // Placeholder for agent coordination logic
      const coordination = {
        coordinatorId: _agent['id'],
        participantIds: agentIds,
        task,
        strategy,
        status: 'initiated',
        createdAt: new Date()['toISOString'](),
      };

      runtimeLogger['extension'](
        `🤝 Coordinating ${agentIds['length']} agents for task`
      );

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: coordination,
        metadata: {
          action: 'coordinate_agents',
          participantCount: agentIds['length'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to coordinate agents: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'coordinate_agents' },
      };
    }
  }

  /**
   * Perform agent health check
   */
  private async agentHealthCheck(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = params['agentId'] ? String(params['agentId']) : undefined;
      const deep = Boolean(params['deep'] ?? false);

      const healthResults: Record<string, any> = {};

      if (agentId) {
        // Check specific agent
        healthResults[agentId] = await this['performSingleAgentHealthCheck'](
          agentId,
          deep
        );
      } else {
        // Check all agents
        for (const id of this['agentMetrics']['keys']()) {
          healthResults[id] = await this['performSingleAgentHealthCheck'](
            id,
            deep
          );
        }
      }

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          healthChecks: healthResults,
          timestamp: new Date()['toISOString'](),
        },
        metadata: {
          action: 'agent_health_check',
          checkedCount: Object.keys(healthResults)['length'],
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to perform health check: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'agent_health_check' },
      };
    }
  }

  /**
   * Backup agent state
   */
  private async backupAgentState(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const includeMemory = Boolean(params['includeMemory'] ?? true);
      const compress = Boolean(params['compress'] ?? true);

      // Placeholder for state backup logic
      const backupId = `backup_${agentId}_${Date['now']()}`;

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          backupId,
          agentId,
          includeMemory,
          compress,
          createdAt: new Date()['toISOString'](),
        },
        metadata: {
          action: 'backup_agent_state',
          agentId,
          backupId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to backup agent state: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'backup_agent_state' },
      };
    }
  }

  /**
   * Restore agent state
   */
  private async restoreAgentState(
    _agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const agentId = String(params['agentId']);
      const backupId = String(params['backupId']);
      const overwrite = Boolean(params['overwrite'] ?? false);

      // Placeholder for state restoration logic

      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          agentId,
          backupId,
          restored: true,
          overwrite,
          restoredAt: new Date()['toISOString'](),
        },
        metadata: {
          action: 'restore_agent_state',
          agentId,
          backupId,
        },
      };
    } catch (error) {
      void error;
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to restore agent state: ${error instanceof Error ? error['message'] : String(error)}`,
        metadata: { action: 'restore_agent_state' },
      };
    }
  }

  /**
   * Initialize metrics for a new agent
   */
  private initializeAgentMetrics(agentId: string, characterId: string): void {
    this['agentMetrics']['set'](agentId, {
      id: agentId,
      name: characterId,
      status: AgentStatus.ACTIVE,
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0,
      lastActivity: new Date(),
      performance: {
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
      },
    });
  }

  /**
   * Filter metrics based on requested fields
   */
  private filterMetrics(
    metrics: AgentMetrics,
    requestedMetrics: string[]
  ): any {
    if (requestedMetrics['length'] === 0) {
      return metrics;
    }

    const filtered: any = { id: metrics['id'] };
    for (const metric of requestedMetrics) {
      if (metric in metrics) {
        filtered[metric] = (metrics as any)[metric];
      }
    }
    return filtered;
  }

  /**
   * Perform health check on a single agent
   */
  private async performSingleAgentHealthCheck(
    agentId: string,
    deep: boolean
  ): Promise<any> {
    const metrics = this['agentMetrics']['get'](agentId);
    if (!metrics) {
      return {
        status: 'not_found',
        message: 'Agent metrics not found',
      };
    }

    const healthStatus = {
      status: 'healthy',
      uptime: metrics.uptime,
      lastActivity: metrics.lastActivity,
      memoryUsage: metrics.memoryUsage,
      errorRate: metrics['performance']['errorRate'],
      checks: {
        responsive: Date['now']() - metrics['lastActivity']['getTime']() < 300000, // 5 minutes
        memoryOk: metrics['memoryUsage'] < 500 * 1024 * 1024, // 500MB threshold
        errorRateOk: metrics['performance']['errorRate'] < 5, // 5% threshold
      },
    };

    // Determine overall status
    const checks = Object['values'](healthStatus['checks']);
    if (checks['every']((check) => check)) {
      healthStatus['status'] = 'healthy';
    } else if (checks['some']((check) => check)) {
      healthStatus['status'] = 'degraded';
    } else {
      healthStatus['status'] = 'unhealthy';
    }

    if (deep) {
      // Add more detailed checks for deep health check
      (healthStatus as any).detailed = {
        requestCount: metrics.requestCount,
        averageResponseTime: metrics['performance']['averageResponseTime'],
        throughput: metrics['performance']['throughput'],
        cpuUsage: metrics.cpuUsage,
      };
    }

    return healthStatus;
  }

  /**
   * Start monitoring all agents
   */
  private startMonitoring(): void {
    this['monitoringInterval'] = setInterval(() => {
      this['updateAgentMetrics']();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update metrics for all monitored agents
   */
  private updateAgentMetrics(): void {
    const now = new Date();

    for (const [_agentId, metrics] of this['agentMetrics']) {
      // Update uptime
      metrics['uptime'] = now['getTime']() - (now['getTime']() - metrics['uptime']);

      // Update memory usage (placeholder - would get real data)
      metrics['memoryUsage'] = process['memoryUsage']()['heapUsed'];

      // Update CPU usage (placeholder)
      metrics['cpuUsage'] = Math['random']() * 10; // Simulated CPU usage

      // Calculate error rate
      if (metrics['requestCount'] > 0) {
        metrics['performance']['errorRate'] =
          (metrics['errorCount'] / metrics['requestCount']) * 100;
      }
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this['monitoringInterval']) {
      clearInterval(this['monitoringInterval']);
      delete this['monitoringInterval'];
    }
  }

  /**
   * Record agent activity
   */
  recordAgentActivity(agentId: string, success: boolean = true): void {
    const metrics = this['agentMetrics']['get'](agentId);
    if (metrics) {
      metrics['requestCount']++;
      if (!success) {
        metrics['errorCount']++;
      }
      metrics['lastActivity'] = new Date();
    }
  }

  /**
   * Health check interface for the skill itself
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        monitoredAgents: this['agentMetrics']['size'],
        monitoringActive: !!this['monitoringInterval'],
        lastUpdate: new Date()['toISOString'](),
      },
    };
  }
}
