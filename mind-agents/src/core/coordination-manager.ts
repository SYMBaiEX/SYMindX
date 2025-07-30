/**
 * Advanced Multi-Agent Coordination Manager for SYMindX
 *
 * Provides sophisticated coordination capabilities including:
 * - Secure inter-agent communication channels
 * - Consensus mechanisms for collaborative decisions
 * - Shared resource management with conflict resolution
 * - Intelligent task distribution and load balancing
 * - Real-time coordination monitoring and observability
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import {
  Agent,
  AgentEvent,
  EventBus,
  MemoryRecord,
  MemoryType,
  MemoryDuration,
} from '../types/agent';
import { Logger } from '../utils/logger';

// Core coordination interfaces
export interface CoordinationChannel {
  id: string;
  name: string;
  participants: string[];
  type: ChannelType;
  security: SecurityConfig;
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
}

export enum ChannelType {
  BROADCAST = 'broadcast',
  DIRECT = 'direct',
  GROUP = 'group',
  CONSENSUS = 'consensus',
  TASK_DISTRIBUTION = 'task_distribution',
  SHARED_MEMORY = 'shared_memory',
}

export interface SecurityConfig {
  encryption: boolean;
  authentication: boolean;
  authorization: string[];
  messageIntegrity: boolean;
  auditLogging: boolean;
}

export interface CoordinationMessage {
  id: string;
  channelId: string;
  senderId: string;
  receiverId?: string;
  type: MessageType;
  payload: Record<string, unknown>;
  timestamp: Date;
  priority: MessagePriority;
  requiresResponse: boolean;
  correlationId?: string;
  signature?: string;
}

export enum MessageType {
  DIRECT_COMMUNICATION = 'direct_communication',
  CONSENSUS_PROPOSAL = 'consensus_proposal',
  CONSENSUS_VOTE = 'consensus_vote',
  TASK_REQUEST = 'task_request',
  TASK_ASSIGNMENT = 'task_assignment',
  RESOURCE_REQUEST = 'resource_request',
  RESOURCE_ALLOCATION = 'resource_allocation',
  SHARED_STATE_UPDATE = 'shared_state_update',
  CONFLICT_RESOLUTION = 'conflict_resolution',
  HEARTBEAT = 'heartbeat',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
  EMERGENCY = 4,
}

// Consensus mechanisms
export interface ConsensusProposal {
  id: string;
  proposerId: string;
  type: ConsensusType;
  proposal: Record<string, unknown>;
  requiredVotes: number;
  timeout: number;
  createdAt: Date;
  deadline: Date;
  status: ConsensusStatus;
}

export enum ConsensusType {
  SIMPLE_MAJORITY = 'simple_majority',
  SUPER_MAJORITY = 'super_majority',
  UNANIMOUS = 'unanimous',
  RAFT_LEADER_ELECTION = 'raft_leader_election',
  BYZANTINE_FAULT_TOLERANT = 'byzantine_fault_tolerant',
}

export enum ConsensusStatus {
  PENDING = 'pending',
  VOTING = 'voting',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
}

export interface ConsensusVote {
  proposalId: string;
  voterId: string;
  vote: VoteType;
  reasoning?: string;
  timestamp: Date;
  signature?: string;
}

export enum VoteType {
  APPROVE = 'approve',
  REJECT = 'reject',
  ABSTAIN = 'abstain',
}

// Task distribution
export interface TaskDistribution {
  id: string;
  requesterId: string;
  task: DistributedTask;
  eligibleAgents: string[];
  assignment?: TaskAssignment;
  status: TaskStatus;
  createdAt: Date;
  deadline?: Date;
}

export interface DistributedTask {
  id: string;
  type: string;
  description: string;
  requirements: TaskRequirements;
  priority: number;
  estimatedDuration: number;
  dependencies: string[];
  payload: Record<string, unknown>;
}

export interface TaskRequirements {
  capabilities: string[];
  resources: ResourceRequirement[];
  performance: PerformanceRequirement;
  exclusions?: string[];
}

export interface ResourceRequirement {
  type: string;
  amount: number;
  duration: number;
  exclusive: boolean;
}

export interface PerformanceRequirement {
  maxLatency: number;
  minThroughput: number;
  reliability: number;
}

export interface TaskAssignment {
  taskId: string;
  assigneeId: string;
  assignedAt: Date;
  deadline: Date;
  resourceAllocations: ResourceAllocation[];
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

export interface ResourceAllocation {
  resourceId: string;
  type: string;
  amount: number;
  exclusive: boolean;
  allocatedAt: Date;
  expiresAt: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Shared memory and state
export interface SharedMemoryPool {
  id: string;
  name: string;
  participants: string[];
  accessControl: AccessControlConfig;
  synchronization: SynchronizationConfig;
  memories: Map<string, SharedMemoryEntry>;
  conflicts: ConflictRecord[];
  createdAt: Date;
  lastSync: Date;
}

export interface SharedMemoryEntry {
  id: string;
  memory: MemoryRecord;
  ownerId: string;
  sharedWith: string[];
  permissions: MemoryPermissions;
  version: number;
  lastModified: Date;
  conflicts: string[];
}

export interface MemoryPermissions {
  read: string[];
  write: string[];
  delete: string[];
  share: string[];
}

export interface AccessControlConfig {
  defaultPermissions: MemoryPermissions;
  requireConsensusForWrite: boolean;
  auditAccess: boolean;
  encryptMemories: boolean;
}

export interface SynchronizationConfig {
  strategy: SyncStrategy;
  conflictResolution: ConflictResolutionStrategy;
  batchUpdates: boolean;
  syncIntervalMs: number;
}

export enum SyncStrategy {
  IMMEDIATE = 'immediate',
  BATCHED = 'batched',
  EVENTUAL_CONSISTENCY = 'eventual_consistency',
  STRONG_CONSISTENCY = 'strong_consistency',
}

export enum ConflictResolutionStrategy {
  LAST_WRITER_WINS = 'last_writer_wins',
  FIRST_WRITER_WINS = 'first_writer_wins',
  CONSENSUS_REQUIRED = 'consensus_required',
  MERGE_STRATEGIES = 'merge_strategies',
  MANUAL_RESOLUTION = 'manual_resolution',
}

export interface ConflictRecord {
  id: string;
  memoryId: string;
  conflictingVersions: MemoryConflict[];
  resolution?: ConflictResolution;
  status: ConflictStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface MemoryConflict {
  agentId: string;
  version: number;
  changes: Record<string, unknown>;
  timestamp: Date;
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedBy: string;
  finalVersion: number;
  reasoning: string;
  timestamp: Date;
}

export enum ConflictStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
}

// Coordination monitoring
export interface CoordinationMetrics {
  channels: {
    total: number;
    active: number;
    messagesThroughput: number;
    averageLatency: number;
  };
  consensus: {
    proposalsActive: number;
    consensusRate: number;
    averageDecisionTime: number;
  };
  tasks: {
    pendingTasks: number;
    distributionRate: number;
    completionRate: number;
    averageTaskTime: number;
  };
  sharedMemory: {
    poolsActive: number;
    memoriesShared: number;
    conflictsActive: number;
    syncLatency: number;
  };
  performance: {
    coordinationOverhead: number;
    networkLatency: number;
    resourceUtilization: number;
  };
}

export class CoordinationManager extends EventEmitter {
  private logger = new Logger('coordination-manager');
  private agents: Map<string, Agent> = new Map();
  private eventBus: EventBus;

  // Communication channels
  private channels: Map<string, CoordinationChannel> = new Map();
  private messageQueue: CoordinationMessage[] = [];
  private messageHandlers: Map<
    MessageType,
    (message: CoordinationMessage) => Promise<void>
  > = new Map();

  // Consensus mechanisms
  private activeProposals: Map<string, ConsensusProposal> = new Map();
  private votes: Map<string, ConsensusVote[]> = new Map();
  private consensusTimeouts: Map<string, ReturnType<typeof setTimeout>> =
    new Map();

  // Task distribution
  private taskQueue: TaskDistribution[] = [];
  private activeAssignments: Map<string, TaskAssignment> = new Map();
  private agentCapabilities: Map<string, Set<string>> = new Map();
  private agentWorkload: Map<string, number> = new Map();

  // Shared memory
  private sharedPools: Map<string, SharedMemoryPool> = new Map();
  private syncTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  // Monitoring
  private metrics: CoordinationMetrics;
  private metricsTimer?: ReturnType<typeof setInterval>;

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.metrics = this.initializeMetrics();

    this.setupMessageHandlers();
    this.startMetricsCollection();

    this.logger.info('Coordination Manager initialized');
  }

  // === AGENT REGISTRATION ===

  /**
   * Register an agent for coordination
   */
  async registerAgent(agent: Agent): Promise<void> {
    this.agents.set(agent.id, agent);
    this.agentWorkload.set(agent.id, 0);

    // Extract agent capabilities from character config
    const capabilities = this.extractAgentCapabilities(agent);
    this.agentCapabilities.set(agent.id, capabilities);

    // Subscribe to agent events
    this.eventBus.subscribe(agent.id, [
      'coordination_message',
      'consensus_proposal',
      'task_assignment',
      'shared_memory_update',
    ]);

    this.logger.info(`Agent ${agent.id} registered for coordination`, {
      metadata: {
        capabilities: Array.from(capabilities),
      },
    });

    this.emit('agent_registered', { agentId: agent.id, capabilities });
  }

  /**
   * Unregister an agent from coordination
   */
  async unregisterAgent(agentId: string): Promise<void> {
    // Clean up active coordination
    await this.cleanupAgentCoordination(agentId);

    this.agents.delete(agentId);
    this.agentCapabilities.delete(agentId);
    this.agentWorkload.delete(agentId);

    this.eventBus.unsubscribe(agentId, [
      'coordination_message',
      'consensus_proposal',
      'task_assignment',
      'shared_memory_update',
    ]);

    this.logger.info(`Agent ${agentId} unregistered from coordination`);
    this.emit('agent_unregistered', { agentId });
  }

  // === COMMUNICATION CHANNELS ===

  /**
   * Create a new coordination channel
   */
  async createChannel(
    name: string,
    type: ChannelType,
    participants: string[],
    security: Partial<SecurityConfig> = {}
  ): Promise<string> {
    const channelId = uuidv4();

    const channel: CoordinationChannel = {
      id: channelId,
      name,
      participants,
      type,
      security: {
        encryption: false,
        authentication: true,
        authorization: participants,
        messageIntegrity: true,
        auditLogging: true,
        ...security,
      },
      metadata: {},
      createdAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      isActive: true,
    };

    this.channels.set(channelId, channel);

    // Notify participants
    for (const participantId of participants) {
      await this.sendMessage({
        id: uuidv4(),
        channelId,
        senderId: 'system',
        receiverId: participantId,
        type: MessageType.SYSTEM_ANNOUNCEMENT,
        payload: {
          event: 'channel_created',
          channel: {
            id: channelId,
            name,
            type,
            participants,
          },
        },
        timestamp: new Date(),
        priority: MessagePriority.NORMAL,
        requiresResponse: false,
      });
    }

    this.logger.info(`Created coordination channel: ${name}`, {
      metadata: {
        channelId,
        type,
        participants,
      },
    });

    this.emit('channel_created', { channelId, name, type, participants });
    return channelId;
  }

  /**
   * Send a message through a coordination channel
   */
  async sendMessage(message: CoordinationMessage): Promise<void> {
    const channel = this.channels.get(message.channelId);
    if (!channel) {
      throw new Error(`Channel ${message.channelId} not found`);
    }

    // Validate sender authorization
    if (
      !channel.participants.includes(message.senderId) &&
      message.senderId !== 'system'
    ) {
      throw new Error(
        `Sender ${message.senderId} not authorized for channel ${message.channelId}`
      );
    }

    // Add message to queue with priority sorting
    this.messageQueue.push(message);
    this.messageQueue.sort((a, b) => b.priority - a.priority);

    // Update channel activity
    channel.lastActivity = new Date();
    channel.messageCount++;

    // Process message immediately if high priority
    if (message.priority >= MessagePriority.HIGH) {
      await this.processMessage(message);
    } else {
      // Process in next tick for normal priority
      setImmediate(() => this.processMessage(message));
    }

    this.emit('message_sent', { message, channelId: message.channelId });
  }

  // === CONSENSUS MECHANISMS ===

  /**
   * Create a consensus proposal
   */
  async createConsensusProposal(
    proposerId: string,
    type: ConsensusType,
    proposal: Record<string, unknown>,
    participants: string[],
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<string> {
    const proposalId = uuidv4();
    const requiredVotes = this.calculateRequiredVotes(
      type,
      participants.length
    );

    const consensusProposal: ConsensusProposal = {
      id: proposalId,
      proposerId,
      type,
      proposal,
      requiredVotes,
      timeout: timeoutMs,
      createdAt: new Date(),
      deadline: new Date(Date.now() + timeoutMs),
      status: ConsensusStatus.VOTING,
    };

    this.activeProposals.set(proposalId, consensusProposal);
    this.votes.set(proposalId, []);

    // Set timeout for proposal
    const timeoutHandle = setTimeout(async () => {
      await this.timeoutConsensusProposal(proposalId);
    }, timeoutMs);
    this.consensusTimeouts.set(proposalId, timeoutHandle);

    // Broadcast proposal to participants
    const channelId = await this.createChannel(
      `consensus-${proposalId}`,
      ChannelType.CONSENSUS,
      participants
    );

    for (const participantId of participants) {
      await this.sendMessage({
        id: uuidv4(),
        channelId,
        senderId: proposerId,
        receiverId: participantId,
        type: MessageType.CONSENSUS_PROPOSAL,
        payload: {
          proposalId,
          proposal,
          type,
          requiredVotes,
          deadline: consensusProposal.deadline,
        },
        timestamp: new Date(),
        priority: MessagePriority.HIGH,
        requiresResponse: true,
      });
    }

    this.logger.info(`Created consensus proposal: ${proposalId}`, {
      metadata: {
        type,
        participants: participants.length,
        requiredVotes,
      },
    });

    this.emit('consensus_proposal_created', { proposalId, proposerId, type });
    return proposalId;
  }

  /**
   * Submit a vote for a consensus proposal
   */
  async submitVote(
    proposalId: string,
    voterId: string,
    vote: VoteType,
    reasoning?: string
  ): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== ConsensusStatus.VOTING) {
      throw new Error(`Proposal ${proposalId} is no longer accepting votes`);
    }

    const voteRecord: ConsensusVote = {
      proposalId,
      voterId,
      vote,
      reasoning,
      timestamp: new Date(),
    };

    const currentVotes = this.votes.get(proposalId) || [];

    // Check if agent already voted
    const existingVoteIndex = currentVotes.findIndex(
      (v) => v.voterId === voterId
    );
    if (existingVoteIndex >= 0) {
      // Update existing vote
      currentVotes[existingVoteIndex] = voteRecord;
    } else {
      // Add new vote
      currentVotes.push(voteRecord);
    }

    this.votes.set(proposalId, currentVotes);

    // Check if consensus reached
    await this.evaluateConsensus(proposalId);

    this.logger.info(`Vote submitted for proposal ${proposalId}`, {
      metadata: {
        voterId,
        vote,
        totalVotes: currentVotes.length,
      },
    });

    this.emit('vote_submitted', { proposalId, voterId, vote });
  }

  // === TASK DISTRIBUTION ===

  /**
   * Request task distribution
   */
  async requestTaskDistribution(
    requesterId: string,
    task: DistributedTask,
    eligibleAgents?: string[]
  ): Promise<string> {
    // Determine eligible agents based on capabilities if not specified
    const eligible =
      eligibleAgents || this.findEligibleAgents(task.requirements);

    const distribution: TaskDistribution = {
      id: uuidv4(),
      requesterId,
      task,
      eligibleAgents: eligible,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      deadline: task.payload.deadline as Date,
    };

    this.taskQueue.push(distribution);

    // Sort by priority and deadline
    this.taskQueue.sort((a, b) => {
      if (a.task.priority !== b.task.priority) {
        return b.task.priority - a.task.priority;
      }
      const aDeadline = a.deadline?.getTime() || Infinity;
      const bDeadline = b.deadline?.getTime() || Infinity;
      return aDeadline - bDeadline;
    });

    // Attempt immediate assignment
    await this.processTaskAssignment(distribution);

    this.logger.info(`Task distribution requested: ${task.id}`, {
      metadata: {
        requesterId,
        eligibleAgents: eligible.length,
        priority: task.priority,
      },
    });

    this.emit('task_distribution_requested', {
      distributionId: distribution.id,
      taskId: task.id,
      requesterId,
    });

    return distribution.id;
  }

  // === SHARED MEMORY MANAGEMENT ===

  /**
   * Create a shared memory pool
   */
  async createSharedMemoryPool(
    name: string,
    participants: string[],
    accessControl: Partial<AccessControlConfig> = {},
    synchronization: Partial<SynchronizationConfig> = {}
  ): Promise<string> {
    const poolId = uuidv4();

    const pool: SharedMemoryPool = {
      id: poolId,
      name,
      participants,
      accessControl: {
        defaultPermissions: {
          read: participants,
          write: participants,
          delete: [],
          share: participants,
        },
        requireConsensusForWrite: false,
        auditAccess: true,
        encryptMemories: false,
        ...accessControl,
      },
      synchronization: {
        strategy: SyncStrategy.EVENTUAL_CONSISTENCY,
        conflictResolution: ConflictResolutionStrategy.LAST_WRITER_WINS,
        batchUpdates: true,
        syncIntervalMs: 5000,
        ...synchronization,
      },
      memories: new Map(),
      conflicts: [],
      createdAt: new Date(),
      lastSync: new Date(),
    };

    this.sharedPools.set(poolId, pool);

    // Start synchronization timer
    if (pool.synchronization.syncIntervalMs > 0) {
      const syncTimer = setInterval(
        () => this.synchronizeMemoryPool(poolId),
        pool.synchronization.syncIntervalMs
      );
      this.syncTimers.set(poolId, syncTimer);
    }

    // Notify participants
    for (const participantId of participants) {
      await this.sendMessage({
        id: uuidv4(),
        channelId: await this.createChannel(
          `shared-memory-${poolId}`,
          ChannelType.SHARED_MEMORY,
          participants
        ),
        senderId: 'system',
        receiverId: participantId,
        type: MessageType.SYSTEM_ANNOUNCEMENT,
        payload: {
          event: 'shared_memory_pool_created',
          poolId,
          name,
        },
        timestamp: new Date(),
        priority: MessagePriority.NORMAL,
        requiresResponse: false,
      });
    }

    this.logger.info(`Created shared memory pool: ${name}`, {
      metadata: {
        poolId,
        participants: participants.length,
      },
    });

    this.emit('shared_memory_pool_created', { poolId, name, participants });
    return poolId;
  }

  /**
   * Share a memory in a pool
   */
  async shareMemory(
    poolId: string,
    ownerId: string,
    memory: MemoryRecord,
    permissions?: Partial<MemoryPermissions>
  ): Promise<void> {
    const pool = this.sharedPools.get(poolId);
    if (!pool) {
      throw new Error(`Shared memory pool ${poolId} not found`);
    }

    if (!pool.participants.includes(ownerId)) {
      throw new Error(
        `Agent ${ownerId} is not a participant in pool ${poolId}`
      );
    }

    const entry: SharedMemoryEntry = {
      id: memory.id,
      memory,
      ownerId,
      sharedWith: pool.participants.filter((id) => id !== ownerId),
      permissions: {
        ...pool.accessControl.defaultPermissions,
        ...permissions,
      },
      version: 1,
      lastModified: new Date(),
      conflicts: [],
    };

    pool.memories.set(memory.id, entry);
    pool.lastSync = new Date();

    // Notify other participants
    for (const participantId of entry.sharedWith) {
      if (entry.permissions.read.includes(participantId)) {
        await this.notifySharedMemoryUpdate(
          poolId,
          participantId,
          entry,
          'created'
        );
      }
    }

    this.logger.info(`Memory shared in pool ${poolId}`, {
      metadata: {
        memoryId: memory.id,
        ownerId,
        sharedWith: entry.sharedWith.length,
      },
    });

    this.emit('memory_shared', { poolId, memoryId: memory.id, ownerId });
  }

  // === METRICS AND MONITORING ===

  /**
   * Get current coordination metrics
   */
  getMetrics(): CoordinationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get coordination health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: CoordinationMetrics;
  } {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    // Check for issues
    if (metrics.channels.averageLatency > 1000) {
      issues.push('High channel latency detected');
    }

    if (metrics.consensus.consensusRate < 0.8) {
      issues.push('Low consensus success rate');
    }

    if (metrics.tasks.completionRate < 0.9) {
      issues.push('Low task completion rate');
    }

    if (metrics.sharedMemory.conflictsActive > 10) {
      issues.push('High number of memory conflicts');
    }

    if (metrics.performance.coordinationOverhead > 0.3) {
      issues.push('High coordination overhead');
    }

    const status =
      issues.length === 0
        ? 'healthy'
        : issues.length <= 2
          ? 'degraded'
          : 'unhealthy';

    return { status, issues, metrics };
  }

  /**
   * Shutdown coordination manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down coordination manager...');

    // Stop metrics collection
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    // Stop all sync timers
    for (const timer of this.syncTimers.values()) {
      clearInterval(timer);
    }
    this.syncTimers.clear();

    // Clear consensus timeouts
    for (const timeout of this.consensusTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.consensusTimeouts.clear();

    // Clean up all agent coordination
    for (const agentId of this.agents.keys()) {
      await this.cleanupAgentCoordination(agentId);
    }

    this.logger.info('Coordination manager shutdown complete');
  }

  // === PRIVATE METHODS ===

  private initializeMetrics(): CoordinationMetrics {
    return {
      channels: {
        total: 0,
        active: 0,
        messagesThroughput: 0,
        averageLatency: 0,
      },
      consensus: {
        proposalsActive: 0,
        consensusRate: 0,
        averageDecisionTime: 0,
      },
      tasks: {
        pendingTasks: 0,
        distributionRate: 0,
        completionRate: 0,
        averageTaskTime: 0,
      },
      sharedMemory: {
        poolsActive: 0,
        memoriesShared: 0,
        conflictsActive: 0,
        syncLatency: 0,
      },
      performance: {
        coordinationOverhead: 0,
        networkLatency: 0,
        resourceUtilization: 0,
      },
    };
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set(
      MessageType.CONSENSUS_VOTE,
      this.handleConsensusVote.bind(this)
    );
    this.messageHandlers.set(
      MessageType.TASK_REQUEST,
      this.handleTaskRequest.bind(this)
    );
    this.messageHandlers.set(
      MessageType.RESOURCE_REQUEST,
      this.handleResourceRequest.bind(this)
    );
    this.messageHandlers.set(
      MessageType.SHARED_STATE_UPDATE,
      this.handleSharedStateUpdate.bind(this)
    );
    this.messageHandlers.set(
      MessageType.CONFLICT_RESOLUTION,
      this.handleConflictResolution.bind(this)
    );
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }

  private updateMetrics(): void {
    // Update channel metrics
    this.metrics.channels.total = this.channels.size;
    this.metrics.channels.active = Array.from(this.channels.values()).filter(
      (c) => c.isActive
    ).length;

    // Update consensus metrics
    this.metrics.consensus.proposalsActive = this.activeProposals.size;

    // Update task metrics
    this.metrics.tasks.pendingTasks = this.taskQueue.length;

    // Update shared memory metrics
    this.metrics.sharedMemory.poolsActive = this.sharedPools.size;
    this.metrics.sharedMemory.memoriesShared = Array.from(
      this.sharedPools.values()
    ).reduce((sum, pool) => sum + pool.memories.size, 0);
    this.metrics.sharedMemory.conflictsActive = Array.from(
      this.sharedPools.values()
    ).reduce((sum, pool) => sum + pool.conflicts.length, 0);
  }

  private extractAgentCapabilities(agent: Agent): Set<string> {
    const capabilities = new Set<string>();

    // Extract from character config if available
    if (agent.characterConfig?.capabilities) {
      const caps = agent.characterConfig.capabilities as Record<
        string,
        Record<string, boolean>
      >;
      for (const category of Object.values(caps)) {
        for (const [capability, enabled] of Object.entries(category)) {
          if (enabled) {
            capabilities.add(capability);
          }
        }
      }
    }

    // Extract from extensions
    for (const extension of agent.extensions) {
      if (extension.capabilities) {
        for (const capability of extension.capabilities) {
          capabilities.add(capability);
        }
      }
    }

    return capabilities;
  }

  private async processMessage(message: CoordinationMessage): Promise<void> {
    try {
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        await handler(message);
      } else {
        // Default message processing
        await this.deliverMessage(message);
      }
    } catch (error) {
      this.logger.error(`Failed to process message ${message.id}:`, error);
      this.emit('message_processing_error', { message, error });
    }
  }

  private async deliverMessage(message: CoordinationMessage): Promise<void> {
    const channel = this.channels.get(message.channelId);
    if (!channel) return;

    // Broadcast or direct delivery
    const recipients = message.receiverId
      ? [message.receiverId]
      : channel.participants.filter((id) => id !== message.senderId);

    for (const recipientId of recipients) {
      const agent = this.agents.get(recipientId);
      if (agent) {
        // Create agent event for message delivery
        const event: AgentEvent = {
          id: uuidv4(),
          type: 'coordination_message',
          source: 'coordination',
          data: { message },
          timestamp: new Date(),
          processed: false,
          targetAgentId: recipientId,
        };

        this.eventBus.emit(event);
      }
    }
  }

  private calculateRequiredVotes(
    type: ConsensusType,
    totalParticipants: number
  ): number {
    switch (type) {
      case ConsensusType.SIMPLE_MAJORITY:
        return Math.floor(totalParticipants / 2) + 1;
      case ConsensusType.SUPER_MAJORITY:
        return Math.ceil(totalParticipants * 0.67);
      case ConsensusType.UNANIMOUS:
        return totalParticipants;
      case ConsensusType.BYZANTINE_FAULT_TOLERANT:
        return Math.floor((totalParticipants * 2) / 3) + 1;
      default:
        return Math.floor(totalParticipants / 2) + 1;
    }
  }

  private async evaluateConsensus(proposalId: string): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    const votes = this.votes.get(proposalId);

    if (!proposal || !votes) return;

    const approveVotes = votes.filter(
      (v) => v.vote === VoteType.APPROVE
    ).length;
    const rejectVotes = votes.filter((v) => v.vote === VoteType.REJECT).length;
    const totalVotes = votes.length;

    let consensusReached = false;
    let accepted = false;

    switch (proposal.type) {
      case ConsensusType.SIMPLE_MAJORITY:
      case ConsensusType.SUPER_MAJORITY:
      case ConsensusType.BYZANTINE_FAULT_TOLERANT:
        if (approveVotes >= proposal.requiredVotes) {
          consensusReached = true;
          accepted = true;
        } else if (rejectVotes > totalVotes - proposal.requiredVotes) {
          consensusReached = true;
          accepted = false;
        }
        break;
      case ConsensusType.UNANIMOUS:
        if (totalVotes === proposal.requiredVotes) {
          consensusReached = true;
          accepted = approveVotes === proposal.requiredVotes;
        }
        break;
    }

    if (consensusReached) {
      proposal.status = accepted
        ? ConsensusStatus.ACCEPTED
        : ConsensusStatus.REJECTED;

      // Clear timeout
      const timeout = this.consensusTimeouts.get(proposalId);
      if (timeout) {
        clearTimeout(timeout);
        this.consensusTimeouts.delete(proposalId);
      }

      this.emit('consensus_reached', {
        proposalId,
        accepted,
        votes: totalVotes,
      });

      this.logger.info(`Consensus reached for proposal ${proposalId}`, {
        metadata: {
          accepted,
          approveVotes,
          rejectVotes,
          totalVotes,
        },
      });
    }
  }

  private async timeoutConsensusProposal(proposalId: string): Promise<void> {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) return;

    proposal.status = ConsensusStatus.TIMEOUT;
    this.consensusTimeouts.delete(proposalId);

    this.emit('consensus_timeout', { proposalId });
    this.logger.warn(`Consensus proposal ${proposalId} timed out`);
  }

  private findEligibleAgents(requirements: TaskRequirements): string[] {
    const eligible: string[] = [];

    for (const [agentId, capabilities] of this.agentCapabilities) {
      // Check capability requirements
      const hasRequiredCapabilities = requirements.capabilities.every((cap) =>
        capabilities.has(cap)
      );

      if (!hasRequiredCapabilities) continue;

      // Check exclusions
      if (requirements.exclusions?.includes(agentId)) continue;

      // Check workload capacity
      const currentWorkload = this.agentWorkload.get(agentId) || 0;
      if (currentWorkload >= 5) continue; // Max 5 concurrent tasks

      eligible.push(agentId);
    }

    return eligible;
  }

  private async processTaskAssignment(
    distribution: TaskDistribution
  ): Promise<void> {
    if (distribution.eligibleAgents.length === 0) {
      distribution.status = TaskStatus.FAILED;
      this.emit('task_assignment_failed', {
        distributionId: distribution.id,
        reason: 'No eligible agents',
      });
      return;
    }

    // Select best agent based on capabilities and workload
    const bestAgent = this.selectBestAgentForTask(
      distribution.task,
      distribution.eligibleAgents
    );

    if (!bestAgent) {
      distribution.status = TaskStatus.FAILED;
      return;
    }

    // Create assignment
    const assignment: TaskAssignment = {
      taskId: distribution.task.id,
      assigneeId: bestAgent,
      assignedAt: new Date(),
      deadline:
        distribution.deadline ||
        new Date(Date.now() + distribution.task.estimatedDuration * 1000),
      resourceAllocations: [],
    };

    distribution.assignment = assignment;
    distribution.status = TaskStatus.ASSIGNED;
    this.activeAssignments.set(distribution.task.id, assignment);

    // Update agent workload
    const currentWorkload = this.agentWorkload.get(bestAgent) || 0;
    this.agentWorkload.set(bestAgent, currentWorkload + 1);

    // Notify assigned agent
    await this.sendMessage({
      id: uuidv4(),
      channelId: await this.getOrCreateDirectChannel(
        distribution.requesterId,
        bestAgent
      ),
      senderId: distribution.requesterId,
      receiverId: bestAgent,
      type: MessageType.TASK_ASSIGNMENT,
      payload: {
        distributionId: distribution.id,
        task: distribution.task,
        assignment,
      },
      timestamp: new Date(),
      priority: MessagePriority.HIGH,
      requiresResponse: true,
    });

    this.emit('task_assigned', {
      distributionId: distribution.id,
      taskId: distribution.task.id,
      assigneeId: bestAgent,
    });

    this.logger.info(
      `Task ${distribution.task.id} assigned to agent ${bestAgent}`
    );
  }

  private selectBestAgentForTask(
    task: DistributedTask,
    eligibleAgents: string[]
  ): string | null {
    if (eligibleAgents.length === 0) return null;

    // Score agents based on workload and capability match
    const scoredAgents = eligibleAgents.map((agentId) => {
      const workload = this.agentWorkload.get(agentId) || 0;
      const capabilities = this.agentCapabilities.get(agentId) || new Set();

      // Lower workload is better
      const workloadScore = Math.max(0, 10 - workload * 2);

      // More matching capabilities is better
      const capabilityScore = task.requirements.capabilities.filter((cap) =>
        capabilities.has(cap)
      ).length;

      return {
        agentId,
        score: workloadScore + capabilityScore,
      };
    });

    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);

    return scoredAgents[0]?.agentId || null;
  }

  private async getOrCreateDirectChannel(
    agent1Id: string,
    agent2Id: string
  ): Promise<string> {
    // Look for existing direct channel
    for (const channel of this.channels.values()) {
      if (
        channel.type === ChannelType.DIRECT &&
        channel.participants.length === 2 &&
        channel.participants.includes(agent1Id) &&
        channel.participants.includes(agent2Id)
      ) {
        return channel.id;
      }
    }

    // Create new direct channel
    return await this.createChannel(
      `direct-${agent1Id}-${agent2Id}`,
      ChannelType.DIRECT,
      [agent1Id, agent2Id]
    );
  }

  private async synchronizeMemoryPool(poolId: string): Promise<void> {
    const pool = this.sharedPools.get(poolId);
    if (!pool) return;

    const syncStart = Date.now();

    try {
      // Process any pending conflicts
      for (const conflict of pool.conflicts) {
        if (conflict.status === ConflictStatus.PENDING) {
          await this.resolveMemoryConflict(poolId, conflict);
        }
      }

      pool.lastSync = new Date();

      const syncLatency = Date.now() - syncStart;
      this.metrics.sharedMemory.syncLatency = syncLatency;
    } catch (error) {
      this.logger.error(`Failed to synchronize memory pool ${poolId}:`, error);
    }
  }

  private async resolveMemoryConflict(
    poolId: string,
    conflict: ConflictRecord
  ): Promise<void> {
    const pool = this.sharedPools.get(poolId);
    if (!pool) return;

    const strategy = pool.synchronization.conflictResolution;

    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITER_WINS:
        const latestConflict = conflict.conflictingVersions.reduce(
          (latest, current) =>
            current.timestamp > latest.timestamp ? current : latest
        );

        conflict.resolution = {
          strategy,
          resolvedBy: 'system',
          finalVersion: latestConflict.version,
          reasoning: 'Last writer wins strategy applied',
          timestamp: new Date(),
        };
        conflict.status = ConflictStatus.RESOLVED;
        break;

      case ConflictResolutionStrategy.CONSENSUS_REQUIRED:
        // Create consensus proposal for conflict resolution
        const proposalId = await this.createConsensusProposal(
          'system',
          ConsensusType.SIMPLE_MAJORITY,
          {
            type: 'memory_conflict_resolution',
            conflictId: conflict.id,
            options: conflict.conflictingVersions,
          },
          pool.participants,
          60000 // 1 minute timeout
        );

        conflict.resolution = {
          strategy,
          resolvedBy: 'consensus',
          finalVersion: 0, // Will be updated when consensus reached
          reasoning: `Consensus proposal ${proposalId} created`,
          timestamp: new Date(),
        };
        break;

      default:
        this.logger.warn(
          `Unsupported conflict resolution strategy: ${strategy}`
        );
    }
  }

  private async notifySharedMemoryUpdate(
    poolId: string,
    participantId: string,
    entry: SharedMemoryEntry,
    operation: 'created' | 'updated' | 'deleted'
  ): Promise<void> {
    const channelId = await this.getSharedMemoryChannelId(poolId);

    await this.sendMessage({
      id: uuidv4(),
      channelId,
      senderId: 'system',
      receiverId: participantId,
      type: MessageType.SHARED_STATE_UPDATE,
      payload: {
        poolId,
        memoryId: entry.id,
        operation,
        entry: operation !== 'deleted' ? entry : undefined,
      },
      timestamp: new Date(),
      priority: MessagePriority.NORMAL,
      requiresResponse: false,
    });
  }

  private async getSharedMemoryChannelId(poolId: string): Promise<string> {
    const channelName = `shared-memory-${poolId}`;

    for (const channel of this.channels.values()) {
      if (
        channel.name === channelName &&
        channel.type === ChannelType.SHARED_MEMORY
      ) {
        return channel.id;
      }
    }

    // Channel should have been created when pool was created
    throw new Error(`Shared memory channel not found for pool ${poolId}`);
  }

  private async cleanupAgentCoordination(agentId: string): Promise<void> {
    // Remove from channels
    for (const [channelId, channel] of this.channels) {
      const index = channel.participants.indexOf(agentId);
      if (index >= 0) {
        channel.participants.splice(index, 1);
        if (channel.participants.length === 0) {
          this.channels.delete(channelId);
        }
      }
    }

    // Cancel any active proposals by this agent
    for (const [proposalId, proposal] of this.activeProposals) {
      if (proposal.proposerId === agentId) {
        proposal.status = ConsensusStatus.REJECTED;
        const timeout = this.consensusTimeouts.get(proposalId);
        if (timeout) {
          clearTimeout(timeout);
          this.consensusTimeouts.delete(proposalId);
        }
      }
    }

    // Remove from task assignments
    for (const [taskId, assignment] of this.activeAssignments) {
      if (assignment.assigneeId === agentId) {
        this.activeAssignments.delete(taskId);

        // Update workload
        const currentWorkload = this.agentWorkload.get(agentId) || 0;
        this.agentWorkload.set(agentId, Math.max(0, currentWorkload - 1));
      }
    }

    // Remove from shared memory pools
    for (const pool of this.sharedPools.values()) {
      const index = pool.participants.indexOf(agentId);
      if (index >= 0) {
        pool.participants.splice(index, 1);

        // Remove memories owned by this agent
        for (const [memoryId, entry] of pool.memories) {
          if (entry.ownerId === agentId) {
            pool.memories.delete(memoryId);
          }
        }
      }
    }
  }

  // Message handlers
  private async handleConsensusVote(
    message: CoordinationMessage
  ): Promise<void> {
    const { proposalId, vote, reasoning } = message.payload;
    await this.submitVote(proposalId, message.senderId, vote, reasoning);
  }

  private async handleTaskRequest(message: CoordinationMessage): Promise<void> {
    const { task } = message.payload;
    await this.requestTaskDistribution(message.senderId, task);
  }

  private async handleResourceRequest(
    message: CoordinationMessage
  ): Promise<void> {
    // Handle resource allocation requests
    this.logger.info(`Resource request from ${message.senderId}`, {
      metadata: message.payload,
    });
  }

  private async handleSharedStateUpdate(
    message: CoordinationMessage
  ): Promise<void> {
    // Handle shared state updates
    this.logger.info(`Shared state update from ${message.senderId}`, {
      metadata: message.payload,
    });
  }

  private async handleConflictResolution(
    message: CoordinationMessage
  ): Promise<void> {
    // Handle conflict resolution responses
    this.logger.info(`Conflict resolution from ${message.senderId}`, {
      metadata: message.payload,
    });
  }
}
