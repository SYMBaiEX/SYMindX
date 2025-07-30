/**
 * Multi-Agent Context Orchestration Types
 *
 * This module defines types for coordinating context sharing and synchronization
 * across multiple agents in a distributed system.
 */

import { BaseContext, PortalContext } from '../context';
import { AgentId, OperationResult, Timestamp } from '../helpers';
import { LogLevel, Priority } from '../enums';

/**
 * Multi-agent context sharing protocol types
 */
export type ContextSharingMode =
  | 'readonly'
  | 'readwrite'
  | 'writeonly'
  | 'none';
export type ContextScope = 'global' | 'group' | 'peer' | 'private';
export type ContextMergeStrategy =
  | 'merge'
  | 'overwrite'
  | 'append'
  | 'conflict'
  | 'custom';
export type ContextSyncMode = 'realtime' | 'eventual' | 'manual' | 'batch';

/**
 * Context sharing permissions and access control
 */
export interface ContextPermissions {
  agentId: AgentId;
  mode: ContextSharingMode;
  scope: ContextScope;
  allowedFields?: string[];
  deniedFields?: string[];
  expiresAt?: Timestamp;
  conditions?: ContextAccessCondition[];
}

/**
 * Conditional access control for context sharing
 */
export interface ContextAccessCondition {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'custom';
  value: unknown;
  customCheck?: (context: AgentContext, value: unknown) => boolean;
}

/**
 * Enhanced agent context with multi-agent coordination
 */
export interface AgentContext extends PortalContext {
  agentId: AgentId;
  version: number;
  lastModified: Timestamp;
  modifiedBy: AgentId;

  // Multi-agent specific fields
  sharedWith: AgentId[];
  permissions: ContextPermissions[];
  syncStatus: ContextSyncStatus;
  conflictHistory: ContextConflict[];

  // Coordination metadata
  coordinationGroup?: string;
  leaderAgent?: AgentId;
  consensusState?: ContextConsensusState;

  // Network partitioning support
  partitionId: string;
  vectorClock: VectorClock;
  causalHistory: CausalEvent[];
}

/**
 * Context synchronization status tracking
 */
export interface ContextSyncStatus {
  lastSyncTime: Timestamp;
  syncedWith: Record<AgentId, Timestamp>;
  pendingUpdates: ContextUpdate[];
  conflictCount: number;
  syncMode: ContextSyncMode;
  isHealthy: boolean;
}

/**
 * Vector clock for causality tracking in distributed systems
 */
export interface VectorClock {
  clocks: Record<AgentId, number>;
  version: number;
}

/**
 * Causal event for maintaining order in distributed context updates
 */
export interface CausalEvent {
  eventId: string;
  agentId: AgentId;
  timestamp: Timestamp;
  vectorClock: VectorClock;
  operation: ContextOperation;
}

/**
 * Context update operations
 */
export interface ContextUpdate {
  updateId: string;
  agentId: AgentId;
  timestamp: Timestamp;
  operation: ContextOperation;
  fieldPath: string;
  oldValue?: unknown;
  newValue: unknown;
  conflicts?: ContextConflict[];
}

/**
 * Context operation types
 */
export type ContextOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'merge'
  | 'sync'
  | 'resolve_conflict';

/**
 * Context conflict tracking and resolution
 */
export interface ContextConflict {
  conflictId: string;
  timestamp: Timestamp;
  fieldPath: string;
  conflictingAgents: AgentId[];
  values: Record<AgentId, unknown>;
  resolutionStrategy: ConflictResolutionStrategy;
  resolved: boolean;
  resolvedBy?: AgentId;
  resolvedAt?: Timestamp;
  resolvedValue?: unknown;
}

/**
 * Conflict resolution strategies
 */
export type ConflictResolutionStrategy =
  | 'last_writer_wins'
  | 'first_writer_wins'
  | 'priority_based'
  | 'merge_values'
  | 'manual_resolution'
  | 'consensus_based'
  | 'custom';

/**
 * Context consensus state for distributed agreement
 */
export interface ContextConsensusState {
  proposalId: string;
  proposedBy: AgentId;
  proposedAt: Timestamp;
  votes: Record<AgentId, ContextVote>;
  requiredVotes: number;
  status: 'pending' | 'accepted' | 'rejected' | 'timeout';
  expiresAt: Timestamp;
}

/**
 * Voting mechanism for context consensus
 */
export interface ContextVote {
  agentId: AgentId;
  vote: 'approve' | 'reject' | 'abstain';
  timestamp: Timestamp;
  reason?: string;
}

/**
 * Aggregation strategies for combining contexts from multiple agents
 */
export type AggregationStrategy =
  | 'union'
  | 'intersection'
  | 'weighted_merge'
  | 'priority_based'
  | 'consensus_based'
  | 'custom';

/**
 * Context aggregation configuration
 */
export interface ContextAggregationConfig {
  strategy: AggregationStrategy;
  weights?: Record<AgentId, number>;
  priorities?: Record<AgentId, Priority>;
  conflictResolution: ConflictResolutionStrategy;
  includeMetadata: boolean;
  maxContextAge?: number; // in milliseconds
  customAggregator?: (contexts: AgentContext[]) => AgentContext;
}

/**
 * Context sharing protocol configuration
 */
export interface ContextSharingProtocol {
  protocolVersion: string;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  batchSize: number;
  maxRetries: number;
  retryBackoff: number;
  timeoutMs: number;
  heartbeatInterval: number;
}

/**
 * Multi-agent context orchestrator interface
 */
export interface MultiAgentContextOrchestrator {
  /**
   * Share context with specific agents
   */
  shareContext(
    sourceAgentId: AgentId,
    targetAgentIds: AgentId[],
    context: AgentContext,
    permissions: ContextPermissions
  ): Promise<OperationResult>;

  /**
   * Aggregate contexts from multiple agents
   */
  aggregateContexts(
    agentIds: AgentId[],
    config: ContextAggregationConfig
  ): Promise<AgentContext>;

  /**
   * Synchronize context across agent network
   */
  synchronizeContext(
    agentId: AgentId,
    context: AgentContext,
    syncMode: ContextSyncMode
  ): Promise<OperationResult>;

  /**
   * Resolve context conflicts
   */
  resolveConflicts(
    conflicts: ContextConflict[],
    strategy: ConflictResolutionStrategy
  ): Promise<OperationResult>;

  /**
   * Subscribe to context changes from other agents
   */
  subscribeToContextChanges(
    agentId: AgentId,
    callback: (update: ContextUpdate) => void
  ): Promise<OperationResult>;

  /**
   * Unsubscribe from context changes
   */
  unsubscribeFromContextChanges(
    agentId: AgentId,
    callback: (update: ContextUpdate) => void
  ): Promise<OperationResult>;

  /**
   * Handle network partitions
   */
  handlePartition(
    partitionId: string,
    affectedAgents: AgentId[]
  ): Promise<OperationResult>;

  /**
   * Recover from network partition
   */
  recoverFromPartition(
    partitionId: string,
    mergingAgents: AgentId[]
  ): Promise<OperationResult>;

  /**
   * Health check for multi-agent context system
   */
  healthCheck(): Promise<MultiAgentContextHealth>;
}

/**
 * Health status for multi-agent context system
 */
export interface MultiAgentContextHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  agents: Record<AgentId, AgentContextHealth>;
  network: NetworkHealth;
  conflicts: {
    total: number;
    unresolved: number;
    avgResolutionTime: number;
  };
  synchronization: {
    avgSyncLatency: number;
    syncSuccessRate: number;
    pendingOperations: number;
  };
}

/**
 * Individual agent context health
 */
export interface AgentContextHealth {
  agentId: AgentId;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: Timestamp;
  syncLatency: number;
  conflictCount: number;
  permissionViolations: number;
}

/**
 * Network health for multi-agent communication
 */
export interface NetworkHealth {
  totalAgents: number;
  onlineAgents: number;
  partitions: string[];
  avgLatency: number;
  messageSuccessRate: number;
  bandwidthUtilization: number;
}

/**
 * Context router configuration for capability-based routing
 */
export interface ContextRoutingConfig {
  routingStrategy:
    | 'capability_based'
    | 'proximity_based'
    | 'load_balanced'
    | 'custom';
  capabilities: Record<AgentId, string[]>;
  proximityMatrix?: Record<AgentId, Record<AgentId, number>>;
  loadThresholds?: Record<AgentId, number>;
  customRouter?: (
    context: AgentContext,
    availableAgents: AgentId[]
  ) => AgentId[];
}

/**
 * Privacy and security settings for context sharing
 */
export interface ContextPrivacySettings {
  encryptionLevel: 'none' | 'basic' | 'advanced';
  anonymizeFields: string[];
  retentionPolicy: {
    maxAge: number; // in milliseconds
    autoDelete: boolean;
    archiveOldData: boolean;
  };
  auditLogging: {
    enabled: boolean;
    logLevel: LogLevel;
    includeFieldValues: boolean;
  };
  complianceMode: 'none' | 'gdpr' | 'hipaa' | 'custom';
}
