/**
 * Context Synchronizer for Multi-Agent Systems
 * 
 * Handles real-time synchronization of context data across agents,
 * manages network partitions, and ensures eventual consistency.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextSyncMode,
  ContextSyncStatus,
  ContextUpdate,
  VectorClock,
  CausalEvent,
  ContextOperation
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult, Timestamp } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Synchronization configuration
 */
export interface SyncConfiguration {
  mode: ContextSyncMode;
  batchSize: number;
  maxRetries: number;
  retryBackoff: number;
  heartbeatInterval: number;
  syncTimeout: number;
  maxPendingOperations: number;
  conflictResolutionEnabled: boolean;
}

/**
 * Network partition information
 */
export interface NetworkPartition {
  partitionId: string;
  agents: Set<AgentId>;
  startTime: Timestamp;
  isActive: boolean;
  lastActivity: Timestamp;
}

/**
 * Manages context synchronization across multiple agents
 */
export class ContextSynchronizer extends EventEmitter {
  private agentContexts: Map<AgentId, AgentContext> = new Map();
  private syncStatus: Map<AgentId, ContextSyncStatus> = new Map();
  private pendingUpdates: Map<string, ContextUpdate> = new Map();
  private vectorClocks: Map<AgentId, VectorClock> = new Map();
  private causalHistory: Map<AgentId, CausalEvent[]> = new Map();
  private networkPartitions: Map<string, NetworkPartition> = new Map();
  private syncTimers: Map<AgentId, NodeJS.Timeout> = new Map();
  private config: SyncConfiguration;

  constructor(config: SyncConfiguration) {
    super();
    this.config = config;
    this.setupPeriodicSync();
    this.setupHealthCheck();
  }

  /**
   * Synchronize context for a specific agent
   */
  async synchronizeContext(
    agentId: AgentId,
    context: AgentContext,
    syncMode: ContextSyncMode = this.config.mode
  ): Promise<OperationResult> {
    try {
      const startTime = Date.now();

      runtimeLogger.debug('Starting context synchronization', {
        agentId,
        syncMode,
        contextVersion: context.version
      });

      // Update local context
      this.agentContexts.set(agentId, context);
      
      // Update vector clock
      this.updateVectorClock(agentId);
      context.vectorClock = this.vectorClocks.get(agentId)!;

      // Create causal event
      const causalEvent: CausalEvent = {
        eventId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        timestamp: new Date().toISOString(),
        vectorClock: context.vectorClock,
        operation: 'sync'
      };

      this.addCausalEvent(agentId, causalEvent);

      // Perform synchronization based on mode
      const syncResult = await this.performSync(agentId, context, syncMode);

      // Update sync status
      await this.updateSyncStatus(agentId, syncResult.success);

      const syncTime = Date.now() - startTime;

      this.emit('contextSynchronized', {
        agentId,
        contextVersion: context.version,
        syncMode,
        syncTime,
        success: syncResult.success
      });

      runtimeLogger.debug('Context synchronization completed', {
        agentId,
        syncMode,
        syncTime,
        success: syncResult.success
      });

      return {
        success: syncResult.success,
        data: {
          agentId,
          contextVersion: context.version,
          syncTime,
          syncMode
        },
        metadata: {
          operation: 'synchronizeContext',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      runtimeLogger.error('Context synchronization failed', error as Error, {
        agentId,
        syncMode
      });

      await this.updateSyncStatus(agentId, false);

      return {
        success: false,
        error: `Synchronization failed: ${(error as Error).message}`,
        metadata: {
          operation: 'synchronizeContext',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Handle network partition
   */
  async handlePartition(
    partitionId: string,
    affectedAgents: AgentId[]
  ): Promise<OperationResult> {
    try {
      const partition: NetworkPartition = {
        partitionId,
        agents: new Set(affectedAgents),
        startTime: new Date().toISOString(),
        isActive: true,
        lastActivity: new Date().toISOString()
      };

      this.networkPartitions.set(partitionId, partition);

      // Switch affected agents to offline mode
      for (const agentId of affectedAgents) {
        const syncStatus = this.syncStatus.get(agentId);
        if (syncStatus) {
          syncStatus.syncMode = 'manual';
          syncStatus.isHealthy = false;
        }
      }

      this.emit('partitionDetected', {
        partitionId,
        affectedAgents,
        timestamp: partition.startTime
      });

      runtimeLogger.warn('Network partition detected', {
        partitionId,
        affectedAgents: affectedAgents.length
      });

      return {
        success: true,
        data: {
          partitionId,
          affectedAgents,
          startTime: partition.startTime
        },
        metadata: {
          operation: 'handlePartition',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Partition handling failed: ${(error as Error).message}`,
        metadata: {
          operation: 'handlePartition',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Recover from network partition
   */
  async recoverFromPartition(
    partitionId: string,
    mergingAgents: AgentId[]
  ): Promise<OperationResult> {
    try {
      const partition = this.networkPartitions.get(partitionId);
      if (!partition) {
        return {
          success: false,
          error: 'Partition not found',
          metadata: { operation: 'recoverFromPartition' }
        };
      }

      runtimeLogger.debug('Starting partition recovery', {
        partitionId,
        mergingAgents: mergingAgents.length
      });

      // Merge contexts from partitioned agents
      const mergeResults = await this.mergePartitionedContexts(mergingAgents);
      
      // Reconcile vector clocks
      await this.reconcileVectorClocks(mergingAgents);

      // Re-enable synchronization for recovered agents
      for (const agentId of mergingAgents) {
        const syncStatus = this.syncStatus.get(agentId);
        if (syncStatus) {
          syncStatus.syncMode = this.config.mode;
          syncStatus.isHealthy = true;
          syncStatus.lastSyncTime = new Date().toISOString();
        }
      }

      // Mark partition as resolved
      partition.isActive = false;
      partition.lastActivity = new Date().toISOString();

      this.emit('partitionRecovered', {
        partitionId,
        recoveredAgents: mergingAgents,
        mergeResults
      });

      runtimeLogger.info('Partition recovery completed', {
        partitionId,
        recoveredAgents: mergingAgents.length,
        conflictsResolved: mergeResults.conflictsResolved
      });

      return {
        success: true,
        data: {
          partitionId,
          recoveredAgents: mergingAgents,
          conflictsResolved: mergeResults.conflictsResolved
        },
        metadata: {
          operation: 'recoverFromPartition',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      runtimeLogger.error('Partition recovery failed', error as Error, {
        partitionId,
        mergingAgents: mergingAgents.length
      });

      return {
        success: false,
        error: `Partition recovery failed: ${(error as Error).message}`,
        metadata: {
          operation: 'recoverFromPartition',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Add context update to pending queue
   */
  async addPendingUpdate(update: ContextUpdate): Promise<OperationResult> {
    try {
      if (this.pendingUpdates.size >= this.config.maxPendingOperations) {
        // Remove oldest update
        const oldestUpdateId = this.pendingUpdates.keys().next().value;
        this.pendingUpdates.delete(oldestUpdateId);
        
        runtimeLogger.warn('Pending updates queue full, removed oldest update', {
          removedUpdateId: oldestUpdateId,
          queueSize: this.pendingUpdates.size
        });
      }

      this.pendingUpdates.set(update.updateId, update);

      // Process update if in realtime mode
      if (this.config.mode === 'realtime') {
        await this.processPendingUpdate(update.updateId);
      }

      return {
        success: true,
        data: {
          updateId: update.updateId,
          queueSize: this.pendingUpdates.size
        },
        metadata: {
          operation: 'addPendingUpdate',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to add pending update: ${(error as Error).message}`,
        metadata: {
          operation: 'addPendingUpdate',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Process all pending updates
   */
  async processPendingUpdates(): Promise<OperationResult> {
    try {
      const updateIds = Array.from(this.pendingUpdates.keys());
      let processedCount = 0;
      let failedCount = 0;

      runtimeLogger.debug('Processing pending updates', {
        totalUpdates: updateIds.length
      });

      for (const updateId of updateIds) {
        try {
          await this.processPendingUpdate(updateId);
          processedCount++;
        } catch (error) {
          runtimeLogger.error('Failed to process pending update', error as Error, {
            updateId
          });
          failedCount++;
        }
      }

      return {
        success: true,
        data: {
          totalUpdates: updateIds.length,
          processedCount,
          failedCount
        },
        metadata: {
          operation: 'processPendingUpdates',
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to process pending updates: ${(error as Error).message}`,
        metadata: {
          operation: 'processPendingUpdates',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get sync status for an agent
   */
  getSyncStatus(agentId: AgentId): ContextSyncStatus | undefined {
    return this.syncStatus.get(agentId);
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): Map<AgentId, ContextSyncStatus> {
    return new Map(this.syncStatus);
  }

  /**
   * Get network partitions
   */
  getNetworkPartitions(): Map<string, NetworkPartition> {
    return new Map(this.networkPartitions);
  }

  /**
   * Perform synchronization based on mode
   */
  private async performSync(
    agentId: AgentId,
    context: AgentContext,
    syncMode: ContextSyncMode
  ): Promise<{ success: boolean; syncedAgents: AgentId[] }> {
    const syncedAgents: AgentId[] = [];

    switch (syncMode) {
      case 'realtime':
        return this.performRealtimeSync(agentId, context);
      
      case 'eventual':
        return this.performEventualSync(agentId, context);
      
      case 'batch':
        return this.performBatchSync(agentId, context);
      
      case 'manual':
        // Manual sync - just store locally
        return { success: true, syncedAgents: [agentId] };
      
      default:
        throw new Error(`Unknown sync mode: ${syncMode}`);
    }
  }

  /**
   * Perform real-time synchronization
   */
  private async performRealtimeSync(
    agentId: AgentId,
    context: AgentContext
  ): Promise<{ success: boolean; syncedAgents: AgentId[] }> {
    const syncedAgents: AgentId[] = [];
    
    // Sync with all agents that have this context shared
    for (const sharedAgentId of context.sharedWith) {
      if (sharedAgentId !== agentId) {
        try {
          await this.syncWithAgent(agentId, sharedAgentId, context);
          syncedAgents.push(sharedAgentId);
        } catch (error) {
          runtimeLogger.error('Failed to sync with agent', error as Error, {
            sourceAgent: agentId,
            targetAgent: sharedAgentId
          });
        }
      }
    }

    return { success: true, syncedAgents };
  }

  /**
   * Perform eventual consistency synchronization
   */
  private async performEventualSync(
    agentId: AgentId,
    context: AgentContext
  ): Promise<{ success: boolean; syncedAgents: AgentId[] }> {
    // Add to pending updates for later processing
    const update: ContextUpdate = {
      updateId: `eventual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      timestamp: new Date().toISOString(),
      operation: 'update',
      fieldPath: '',
      newValue: context
    };

    await this.addPendingUpdate(update);
    return { success: true, syncedAgents: [agentId] };
  }

  /**
   * Perform batch synchronization
   */
  private async performBatchSync(
    agentId: AgentId,
    context: AgentContext
  ): Promise<{ success: boolean; syncedAgents: AgentId[] }> {
    // Similar to eventual but with batching logic
    return this.performEventualSync(agentId, context);
  }

  /**
   * Sync context with a specific agent
   */
  private async syncWithAgent(
    sourceAgentId: AgentId,
    targetAgentId: AgentId,
    context: AgentContext
  ): Promise<void> {
    // In a real implementation, this would send the context to the target agent
    // For now, we'll just simulate the sync
    
    const targetContext = this.agentContexts.get(targetAgentId);
    if (targetContext) {
      // Merge contexts if there's a conflict
      if (targetContext.version !== context.version) {
        // Handle version conflict
        runtimeLogger.debug('Version conflict detected during sync', {
          sourceAgent: sourceAgentId,
          targetAgent: targetAgentId,
          sourceVersion: context.version,
          targetVersion: targetContext.version
        });
      }
    }

    // Update the target agent's context
    this.agentContexts.set(targetAgentId, { ...context });
    
    runtimeLogger.debug('Context synced with agent', {
      sourceAgent: sourceAgentId,
      targetAgent: targetAgentId,
      contextVersion: context.version
    });
  }

  /**
   * Process a single pending update
   */
  private async processPendingUpdate(updateId: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update) {
      return;
    }

    try {
      const context = this.agentContexts.get(update.agentId);
      if (context) {
        await this.performRealtimeSync(update.agentId, context);
      }

      this.pendingUpdates.delete(updateId);
      
    } catch (error) {
      runtimeLogger.error('Failed to process pending update', error as Error, {
        updateId,
        agentId: update.agentId
      });
      throw error;
    }
  }

  /**
   * Update vector clock for an agent
   */
  private updateVectorClock(agentId: AgentId): void {
    if (!this.vectorClocks.has(agentId)) {
      this.vectorClocks.set(agentId, {
        clocks: { [agentId]: 0 },
        version: 1
      });
    }

    const vectorClock = this.vectorClocks.get(agentId)!;
    vectorClock.clocks[agentId] = (vectorClock.clocks[agentId] || 0) + 1;
    vectorClock.version++;
  }

  /**
   * Add causal event to history
   */
  private addCausalEvent(agentId: AgentId, event: CausalEvent): void {
    if (!this.causalHistory.has(agentId)) {
      this.causalHistory.set(agentId, []);
    }

    const history = this.causalHistory.get(agentId)!;
    history.push(event);

    // Keep only last 100 events per agent
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Update sync status for an agent
   */
  private async updateSyncStatus(agentId: AgentId, success: boolean): Promise<void> {
    let status = this.syncStatus.get(agentId);
    
    if (!status) {
      status = {
        lastSyncTime: new Date().toISOString(),
        syncedWith: {},
        pendingUpdates: [],
        conflictCount: 0,
        syncMode: this.config.mode,
        isHealthy: true
      };
      this.syncStatus.set(agentId, status);
    }

    status.lastSyncTime = new Date().toISOString();
    status.isHealthy = success;

    if (!success) {
      status.conflictCount++;
    }
  }

  /**
   * Merge contexts from partitioned agents
   */
  private async mergePartitionedContexts(agents: AgentId[]): Promise<{ conflictsResolved: number }> {
    let conflictsResolved = 0;

    // Simple merge strategy - in a real implementation, this would be more sophisticated
    for (let i = 0; i < agents.length - 1; i++) {
      const agent1 = agents[i];
      const agent2 = agents[i + 1];
      
      const context1 = this.agentContexts.get(agent1);
      const context2 = this.agentContexts.get(agent2);
      
      if (context1 && context2 && context1.version !== context2.version) {
        // Merge contexts (simplified)
        const mergedContext = context1.version > context2.version ? context1 : context2;
        this.agentContexts.set(agent1, mergedContext);
        this.agentContexts.set(agent2, mergedContext);
        conflictsResolved++;
      }
    }

    return { conflictsResolved };
  }

  /**
   * Reconcile vector clocks after partition recovery
   */
  private async reconcileVectorClocks(agents: AgentId[]): Promise<void> {
    const allClocks: Record<AgentId, number> = {};

    // Gather all vector clocks
    for (const agentId of agents) {
      const vectorClock = this.vectorClocks.get(agentId);
      if (vectorClock) {
        for (const [clockAgent, clockValue] of Object.entries(vectorClock.clocks)) {
          allClocks[clockAgent] = Math.max(allClocks[clockAgent] || 0, clockValue);
        }
      }
    }

    // Update all agents with reconciled clock
    for (const agentId of agents) {
      this.vectorClocks.set(agentId, {
        clocks: { ...allClocks },
        version: Math.max(...Object.values(allClocks)) + 1
      });
    }
  }

  /**
   * Setup periodic synchronization
   */
  private setupPeriodicSync(): void {
    if (this.config.mode === 'batch') {
      setInterval(() => {
        this.processPendingUpdates().catch(error => {
          runtimeLogger.error('Periodic sync failed', error as Error);
        });
      }, this.config.heartbeatInterval);
    }
  }

  /**
   * Setup health check monitoring
   */
  private setupHealthCheck(): void {
    setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval * 2);
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
    const now = Date.now();
    
    for (const [agentId, status] of this.syncStatus.entries()) {
      const lastSyncTime = new Date(status.lastSyncTime).getTime();
      const timeSinceLastSync = now - lastSyncTime;
      
      if (timeSinceLastSync > this.config.syncTimeout) {
        status.isHealthy = false;
        
        this.emit('syncHealthDegraded', {
          agentId,
          lastSyncTime: status.lastSyncTime,
          timeSinceLastSync
        });
      }
    }
  }

  /**
   * Get synchronization statistics
   */
  getStatistics() {
    const totalAgents = this.agentContexts.size;
    const healthyAgents = Array.from(this.syncStatus.values())
      .filter(s => s.isHealthy).length;
    const activePartitions = Array.from(this.networkPartitions.values())
      .filter(p => p.isActive).length;

    return {
      totalAgents,
      healthyAgents,
      unhealthyAgents: totalAgents - healthyAgents,
      pendingUpdates: this.pendingUpdates.size,
      activePartitions,
      totalPartitions: this.networkPartitions.size,
      vectorClocks: this.vectorClocks.size
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all timers
    for (const timer of this.syncTimers.values()) {
      clearTimeout(timer);
    }

    this.agentContexts.clear();
    this.syncStatus.clear();
    this.pendingUpdates.clear();
    this.vectorClocks.clear();
    this.causalHistory.clear();
    this.networkPartitions.clear();
    this.syncTimers.clear();
    this.removeAllListeners();
  }
}