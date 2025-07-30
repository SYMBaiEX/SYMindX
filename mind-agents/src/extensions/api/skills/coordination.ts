/**
 * Multi-Agent Coordination API Skills
 *
 * Provides HTTP endpoints for advanced multi-agent coordination features including:
 * - Communication channel management
 * - Consensus mechanisms
 * - Task distribution
 * - Shared memory pools
 * - Coordination monitoring
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { Agent } from '../../../types/agent';
import { Logger } from '../../../utils/logger';
import { MultiAgentManager } from '../../../core/multi-agent-manager';

const logger = new Logger('coordination-api');

// Request validation schemas
const CreateChannelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['broadcast', 'direct', 'group', 'consensus']),
  participants: z.array(z.string()).min(1),
  security: z
    .object({
      encryption: z.boolean().optional(),
      authentication: z.boolean().optional(),
      authorization: z.array(z.string()).optional(),
    })
    .optional(),
});

const ConsensusProposalSchema = z.object({
  proposerId: z.string().min(1),
  proposal: z.record(z.unknown()),
  participants: z.array(z.string()).min(1),
  type: z
    .enum(['simple_majority', 'super_majority', 'unanimous'])
    .default('simple_majority'),
  timeoutMs: z.number().min(1000).max(1800000).default(300000), // 1s to 30min
});

const TaskDistributionSchema = z.object({
  requesterId: z.string().min(1),
  task: z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    description: z.string().min(1),
    requirements: z.object({
      capabilities: z.array(z.string()),
      resources: z
        .array(
          z.object({
            type: z.string(),
            amount: z.number().positive(),
            duration: z.number().positive(),
            exclusive: z.boolean(),
          })
        )
        .optional(),
      performance: z
        .object({
          maxLatency: z.number().positive(),
          minThroughput: z.number().positive(),
          reliability: z.number().min(0).max(1),
        })
        .optional(),
    }),
    priority: z.number().min(0).max(10),
    estimatedDuration: z.number().positive(),
    dependencies: z.array(z.string()),
    payload: z.record(z.unknown()),
  }),
  eligibleAgents: z.array(z.string()).optional(),
});

const SharedMemoryPoolSchema = z.object({
  name: z.string().min(1),
  participants: z.array(z.string()).min(1),
  config: z
    .object({
      accessControl: z
        .object({
          requireConsensusForWrite: z.boolean().optional(),
          auditAccess: z.boolean().optional(),
          encryptMemories: z.boolean().optional(),
        })
        .optional(),
      synchronization: z
        .object({
          strategy: z
            .enum(['immediate', 'batched', 'eventual_consistency'])
            .optional(),
          conflictResolution: z
            .enum(['last_writer_wins', 'consensus_required'])
            .optional(),
          syncIntervalMs: z.number().positive().optional(),
        })
        .optional(),
    })
    .optional(),
});

const ShareMemorySchema = z.object({
  poolId: z.string().min(1),
  ownerId: z.string().min(1),
  memory: z.object({
    id: z.string().min(1),
    agentId: z.string().min(1),
    type: z.string().min(1),
    content: z.string().min(1),
    embedding: z.array(z.number()).optional(),
    metadata: z.record(z.unknown()),
    importance: z.number().min(0).max(1),
    timestamp: z.date(),
    tags: z.array(z.string()),
    duration: z.string().min(1),
    expiresAt: z.date().optional(),
  }),
  permissions: z
    .object({
      read: z.array(z.string()).optional(),
      write: z.array(z.string()).optional(),
      delete: z.array(z.string()).optional(),
      share: z.array(z.string()).optional(),
    })
    .optional(),
});

const AdvancedCollaborationSchema = z.object({
  agentIds: z.array(z.string()).min(2),
  config: z
    .object({
      communicationChannels: z.boolean().optional(),
      sharedMemory: z.boolean().optional(),
      taskDistribution: z.boolean().optional(),
      consensusDecisions: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Multi-Agent Coordination API Skills
 */
export class CoordinationSkills {
  private multiAgentManager: MultiAgentManager;

  constructor(multiAgentManager: MultiAgentManager) {
    this.multiAgentManager = multiAgentManager;
  }

  /**
   * Create a coordination channel
   */
  async createChannel(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = CreateChannelSchema.parse(request.body);

      const channelId = await this.multiAgentManager.createCoordinationChannel(
        body.name,
        body.type,
        body.participants,
        body.security
      );

      logger.info(`Created coordination channel: ${body.name}`, {
        metadata: {
          channelId,
          type: body.type,
          participants: body.participants.length,
        },
      });

      reply.status(201).send({
        success: true,
        data: {
          channelId,
          name: body.name,
          type: body.type,
          participants: body.participants,
        },
        message: 'Coordination channel created successfully',
      });
    } catch (error) {
      logger.error('Failed to create coordination channel:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Request consensus from agents
   */
  async requestConsensus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = ConsensusProposalSchema.parse(request.body);

      const proposalId = await this.multiAgentManager.requestConsensus(
        body.proposerId,
        body.proposal,
        body.participants,
        body.type,
        body.timeoutMs
      );

      logger.info(`Consensus requested by ${body.proposerId}`, {
        metadata: {
          proposalId,
          type: body.type,
          participants: body.participants.length,
        },
      });

      reply.status(201).send({
        success: true,
        data: {
          proposalId,
          proposerId: body.proposerId,
          type: body.type,
          participants: body.participants,
          timeoutMs: body.timeoutMs,
        },
        message: 'Consensus proposal created successfully',
      });
    } catch (error) {
      logger.error('Failed to request consensus:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Distribute a task among agents
   */
  async distributeTask(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = TaskDistributionSchema.parse(request.body);

      const distributionId = await this.multiAgentManager.distributeTask(
        body.requesterId,
        body.task,
        body.eligibleAgents
      );

      logger.info(`Task distribution requested: ${body.task.id}`, {
        metadata: {
          distributionId,
          requesterId: body.requesterId,
          eligibleAgents: body.eligibleAgents?.length || 'auto',
        },
      });

      reply.status(201).send({
        success: true,
        data: {
          distributionId,
          taskId: body.task.id,
          requesterId: body.requesterId,
          eligibleAgents: body.eligibleAgents,
        },
        message: 'Task distribution initiated successfully',
      });
    } catch (error) {
      logger.error('Failed to distribute task:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Create a shared memory pool
   */
  async createSharedMemoryPool(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = SharedMemoryPoolSchema.parse(request.body);

      const poolId = await this.multiAgentManager.createSharedMemoryPool(
        body.name,
        body.participants,
        body.config
      );

      logger.info(`Created shared memory pool: ${body.name}`, {
        metadata: {
          poolId,
          participants: body.participants.length,
        },
      });

      reply.status(201).send({
        success: true,
        data: {
          poolId,
          name: body.name,
          participants: body.participants,
          config: body.config,
        },
        message: 'Shared memory pool created successfully',
      });
    } catch (error) {
      logger.error('Failed to create shared memory pool:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Share memory in a pool
   */
  async shareMemory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = ShareMemorySchema.parse(request.body);

      await this.multiAgentManager.shareMemoryInPool(
        body.poolId,
        body.ownerId,
        body.memory,
        body.permissions
      );

      logger.info(`Memory shared in pool: ${body.poolId}`, {
        metadata: {
          memoryId: body.memory.id,
          ownerId: body.ownerId,
        },
      });

      reply.status(200).send({
        success: true,
        data: {
          poolId: body.poolId,
          memoryId: body.memory.id,
          ownerId: body.ownerId,
        },
        message: 'Memory shared successfully',
      });
    } catch (error) {
      logger.error('Failed to share memory:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Enable advanced collaboration between agents
   */
  async enableAdvancedCollaboration(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const body = AdvancedCollaborationSchema.parse(request.body);

      const result = await this.multiAgentManager.enableAdvancedCollaboration(
        body.agentIds,
        body.config
      );

      logger.info(`Advanced collaboration enabled`, {
        metadata: {
          collaborationId: result.collaborationId,
          agentIds: body.agentIds,
          config: body.config,
        },
      });

      reply.status(201).send({
        success: true,
        data: {
          ...result,
          agentIds: body.agentIds,
          config: body.config,
        },
        message: 'Advanced collaboration enabled successfully',
      });
    } catch (error) {
      logger.error('Failed to enable advanced collaboration:', error);

      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Get coordination metrics and health status
   */
  async getCoordinationMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const coordinationData = this.multiAgentManager.getCoordinationMetrics();
      const systemMetrics = this.multiAgentManager.getSystemMetrics();

      reply.status(200).send({
        success: true,
        data: {
          coordination: {
            metrics: coordinationData.metrics,
            health: coordinationData.health,
          },
          system: systemMetrics,
          timestamp: new Date(),
        },
        message: 'Coordination metrics retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get coordination metrics:', error);

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get coordination health status
   */
  async getHealthStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const coordinationData = this.multiAgentManager.getCoordinationMetrics();

      reply.status(200).send({
        success: true,
        data: {
          status: coordinationData.health.status,
          issues: coordinationData.health.issues,
          timestamp: new Date(),
          summary: {
            healthy: coordinationData.health.status === 'healthy',
            issueCount: coordinationData.health.issues.length,
          },
        },
        message: 'Health status retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get health status:', error);

      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Register all coordination API routes
   */
  static registerRoutes(fastify: any, multiAgentManager: MultiAgentManager) {
    const skills = new CoordinationSkills(multiAgentManager);

    // Channel management
    fastify.post(
      '/coordination/channels',
      {
        schema: {
          description: 'Create a coordination channel',
          tags: ['coordination'],
          body: {
            type: 'object',
            required: ['name', 'type', 'participants'],
            properties: {
              name: { type: 'string', minLength: 1 },
              type: {
                type: 'string',
                enum: ['broadcast', 'direct', 'group', 'consensus'],
              },
              participants: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
              security: {
                type: 'object',
                properties: {
                  encryption: { type: 'boolean' },
                  authentication: { type: 'boolean' },
                  authorization: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          response: {
            201: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    channelId: { type: 'string' },
                    name: { type: 'string' },
                    type: { type: 'string' },
                    participants: { type: 'array', items: { type: 'string' } },
                  },
                },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      skills.createChannel.bind(skills)
    );

    // Consensus mechanisms
    fastify.post(
      '/coordination/consensus',
      {
        schema: {
          description: 'Request consensus from agents',
          tags: ['coordination'],
          body: {
            type: 'object',
            required: ['proposerId', 'proposal', 'participants'],
            properties: {
              proposerId: { type: 'string', minLength: 1 },
              proposal: { type: 'object' },
              participants: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
              type: {
                type: 'string',
                enum: ['simple_majority', 'super_majority', 'unanimous'],
                default: 'simple_majority',
              },
              timeoutMs: {
                type: 'number',
                minimum: 1000,
                maximum: 1800000,
                default: 300000,
              },
            },
          },
        },
      },
      skills.requestConsensus.bind(skills)
    );

    // Task distribution
    fastify.post(
      '/coordination/tasks',
      {
        schema: {
          description: 'Distribute a task among agents',
          tags: ['coordination'],
          body: {
            type: 'object',
            required: ['requesterId', 'task'],
            properties: {
              requesterId: { type: 'string', minLength: 1 },
              task: {
                type: 'object',
                required: [
                  'id',
                  'type',
                  'description',
                  'requirements',
                  'priority',
                  'estimatedDuration',
                  'dependencies',
                  'payload',
                ],
                properties: {
                  id: { type: 'string', minLength: 1 },
                  type: { type: 'string', minLength: 1 },
                  description: { type: 'string', minLength: 1 },
                  requirements: {
                    type: 'object',
                    required: ['capabilities'],
                    properties: {
                      capabilities: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      resources: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            type: { type: 'string' },
                            amount: { type: 'number', minimum: 0 },
                            duration: { type: 'number', minimum: 0 },
                            exclusive: { type: 'boolean' },
                          },
                        },
                      },
                      performance: {
                        type: 'object',
                        properties: {
                          maxLatency: { type: 'number', minimum: 0 },
                          minThroughput: { type: 'number', minimum: 0 },
                          reliability: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                          },
                        },
                      },
                    },
                  },
                  priority: { type: 'number', minimum: 0, maximum: 10 },
                  estimatedDuration: { type: 'number', minimum: 0 },
                  dependencies: { type: 'array', items: { type: 'string' } },
                  payload: { type: 'object' },
                },
              },
              eligibleAgents: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      skills.distributeTask.bind(skills)
    );

    // Shared memory
    fastify.post(
      '/coordination/memory/pools',
      {
        schema: {
          description: 'Create a shared memory pool',
          tags: ['coordination'],
          body: {
            type: 'object',
            required: ['name', 'participants'],
            properties: {
              name: { type: 'string', minLength: 1 },
              participants: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
              },
              config: {
                type: 'object',
                properties: {
                  accessControl: {
                    type: 'object',
                    properties: {
                      requireConsensusForWrite: { type: 'boolean' },
                      auditAccess: { type: 'boolean' },
                      encryptMemories: { type: 'boolean' },
                    },
                  },
                  synchronization: {
                    type: 'object',
                    properties: {
                      strategy: {
                        type: 'string',
                        enum: ['immediate', 'batched', 'eventual_consistency'],
                      },
                      conflictResolution: {
                        type: 'string',
                        enum: ['last_writer_wins', 'consensus_required'],
                      },
                      syncIntervalMs: { type: 'number', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      skills.createSharedMemoryPool.bind(skills)
    );

    fastify.post(
      '/coordination/memory/share',
      {
        schema: {
          description: 'Share memory in a pool',
          tags: ['coordination'],
        },
      },
      skills.shareMemory.bind(skills)
    );

    // Advanced collaboration
    fastify.post(
      '/coordination/collaboration',
      {
        schema: {
          description: 'Enable advanced collaboration between agents',
          tags: ['coordination'],
          body: {
            type: 'object',
            required: ['agentIds'],
            properties: {
              agentIds: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
              },
              config: {
                type: 'object',
                properties: {
                  communicationChannels: { type: 'boolean' },
                  sharedMemory: { type: 'boolean' },
                  taskDistribution: { type: 'boolean' },
                  consensusDecisions: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
      skills.enableAdvancedCollaboration.bind(skills)
    );

    // Monitoring
    fastify.get(
      '/coordination/metrics',
      {
        schema: {
          description: 'Get coordination metrics and health status',
          tags: ['coordination'],
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    coordination: { type: 'object' },
                    system: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      skills.getCoordinationMetrics.bind(skills)
    );

    fastify.get(
      '/coordination/health',
      {
        schema: {
          description: 'Get coordination health status',
          tags: ['coordination'],
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy'],
                    },
                    issues: { type: 'array', items: { type: 'string' } },
                    timestamp: { type: 'string', format: 'date-time' },
                    summary: {
                      type: 'object',
                      properties: {
                        healthy: { type: 'boolean' },
                        issueCount: { type: 'number' },
                      },
                    },
                  },
                },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      skills.getHealthStatus.bind(skills)
    );

    logger.info('Coordination API routes registered');
  }
}
