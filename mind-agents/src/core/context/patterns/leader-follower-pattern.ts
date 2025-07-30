/**
 * Leader-Follower Pattern for Multi-Agent Context Coordination
 *
 * Implements a hierarchical context flow where one agent acts as the leader
 * and coordinates context updates with follower agents.
 */

import { EventEmitter } from 'events';
import {
  AgentContext,
  ContextUpdate,
  ContextSyncMode,
  ContextConflict,
} from '../../../types/context/multi-agent-context';
import { AgentId, OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Leader election result
 */
export interface LeaderElectionResult {
  leaderId: AgentId;
  term: number;
  followers: AgentId[];
  electionTime: number;
  consensusReached: boolean;
}

/**
 * Leader status information
 */
export interface LeaderStatus {
  leaderId: AgentId;
  term: number;
  lastHeartbeat: string;
  followers: Set<AgentId>;
  isHealthy: boolean;
  contextVersion: number;
}

/**
 * Follower status information
 */
export interface FollowerStatus {
  followerId: AgentId;
  leaderId: AgentId;
  lastSync: string;
  syncStatus: 'up_to_date' | 'syncing' | 'outdated' | 'disconnected';
  contextVersion: number;
  lag: number; // in milliseconds
}

/**
 * Implements leader-follower coordination pattern
 */
export class LeaderFollowerPattern extends EventEmitter {
  private leaders: Map<string, LeaderStatus> = new Map();
  private followers: Map<AgentId, FollowerStatus> = new Map();
  private contextVersions: Map<AgentId, number> = new Map();
  private electionHistory: Map<string, LeaderElectionResult[]> = new Map();
  private heartbeatTimers: Map<AgentId, NodeJS.Timeout> = new Map();
  private syncQueue: Map<AgentId, ContextUpdate[]> = new Map();

  private readonly heartbeatInterval = 5000; // 5 seconds
  private readonly electionTimeout = 10000; // 10 seconds
  private readonly syncTimeout = 30000; // 30 seconds

  constructor() {
    super();
    this.setupHeartbeatMonitoring();
  }

  /**
   * Elect a leader for a group of agents
   */
  async electLeader(
    groupId: string,
    candidateAgents: AgentId[],
    electionCriteria?: {
      preferredLeader?: AgentId;
      capabilityWeights?: Record<string, number>;
      loadThreshold?: number;
    }
  ): Promise<OperationResult> {
    try {
      const startTime = Date.now();

      runtimeLogger.debug('Starting leader election', {
        groupId,
        candidates: candidateAgents.length,
        preferredLeader: electionCriteria?.preferredLeader,
      });

      if (candidateAgents.length === 0) {
        return {
          success: false,
          error: 'No candidate agents provided',
          metadata: { operation: 'electLeader' },
        };
      }

      // Check if preferred leader is available and suitable
      let selectedLeader: AgentId;

      if (
        electionCriteria?.preferredLeader &&
        candidateAgents.includes(electionCriteria.preferredLeader)
      ) {
        selectedLeader = electionCriteria.preferredLeader;
      } else {
        // Elect based on criteria
        selectedLeader = await this.runElectionAlgorithm(
          candidateAgents,
          electionCriteria
        );
      }

      const followers = candidateAgents.filter((id) => id !== selectedLeader);
      const term = this.getNextTerm(groupId);

      // Create leader status
      const leaderStatus: LeaderStatus = {
        leaderId: selectedLeader,
        term,
        lastHeartbeat: new Date().toISOString(),
        followers: new Set(followers),
        isHealthy: true,
        contextVersion: 0,
      };

      this.leaders.set(groupId, leaderStatus);

      // Initialize followers
      for (const followerId of followers) {
        const followerStatus: FollowerStatus = {
          followerId,
          leaderId: selectedLeader,
          lastSync: new Date().toISOString(),
          syncStatus: 'up_to_date',
          contextVersion: 0,
          lag: 0,
        };

        this.followers.set(followerId, followerStatus);
        this.syncQueue.set(followerId, []);
      }

      // Set up heartbeat for leader
      this.setupHeartbeat(selectedLeader);

      const electionTime = Date.now() - startTime;

      const electionResult: LeaderElectionResult = {
        leaderId: selectedLeader,
        term,
        followers,
        electionTime,
        consensusReached: true,
      };

      // Store election history
      if (!this.electionHistory.has(groupId)) {
        this.electionHistory.set(groupId, []);
      }
      this.electionHistory.get(groupId)!.push(electionResult);

      this.emit('leaderElected', {
        groupId,
        leaderId: selectedLeader,
        followers,
        term,
        electionTime,
      });

      runtimeLogger.info('Leader elected successfully', {
        groupId,
        leaderId: selectedLeader,
        followers: followers.length,
        term,
        electionTime,
      });

      return {
        success: true,
        data: electionResult,
        metadata: {
          operation: 'electLeader',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      runtimeLogger.error('Leader election failed', error as Error, {
        groupId,
        candidates: candidateAgents.length,
      });

      return {
        success: false,
        error: `Leader election failed: ${(error as Error).message}`,
        metadata: {
          operation: 'electLeader',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Propagate context update from leader to followers
   */
  async propagateUpdate(
    leaderId: AgentId,
    context: AgentContext,
    update: ContextUpdate
  ): Promise<OperationResult> {
    try {
      const leaderStatus = this.findLeaderByAgent(leaderId);
      if (!leaderStatus) {
        return {
          success: false,
          error: 'Agent is not a leader',
          metadata: { operation: 'propagateUpdate' },
        };
      }

      const startTime = Date.now();
      const propagationResults: {
        followerId: AgentId;
        success: boolean;
        error?: string;
      }[] = [];

      runtimeLogger.debug('Starting context propagation', {
        leaderId,
        followers: leaderStatus.followers.size,
        updateId: update.updateId,
      });

      // Update leader's context version
      leaderStatus.contextVersion = context.version;
      this.contextVersions.set(leaderId, context.version);

      // Propagate to all followers
      const propagationPromises = Array.from(leaderStatus.followers).map(
        async (followerId) => {
          try {
            await this.syncFollower(followerId, context, update);
            propagationResults.push({ followerId, success: true });
          } catch (error) {
            const errorMsg = (error as Error).message;
            propagationResults.push({
              followerId,
              success: false,
              error: errorMsg,
            });

            runtimeLogger.error('Failed to sync follower', error as Error, {
              leaderId,
              followerId,
              updateId: update.updateId,
            });
          }
        }
      );

      await Promise.allSettled(propagationPromises);

      const successCount = propagationResults.filter((r) => r.success).length;
      const propagationTime = Date.now() - startTime;

      this.emit('updatePropagated', {
        leaderId,
        updateId: update.updateId,
        totalFollowers: leaderStatus.followers.size,
        successCount,
        propagationTime,
      });

      runtimeLogger.debug('Context propagation completed', {
        leaderId,
        updateId: update.updateId,
        successCount,
        totalFollowers: leaderStatus.followers.size,
        propagationTime,
      });

      return {
        success: successCount > 0,
        data: {
          leaderId,
          updateId: update.updateId,
          totalFollowers: leaderStatus.followers.size,
          successCount,
          failedCount: propagationResults.length - successCount,
          propagationTime,
          results: propagationResults,
        },
        metadata: {
          operation: 'propagateUpdate',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      runtimeLogger.error('Context propagation failed', error as Error, {
        leaderId,
        updateId: update.updateId,
      });

      return {
        success: false,
        error: `Context propagation failed: ${(error as Error).message}`,
        metadata: {
          operation: 'propagateUpdate',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Handle follower sync request
   */
  async requestSync(
    followerId: AgentId,
    requestedVersion?: number
  ): Promise<OperationResult> {
    try {
      const followerStatus = this.followers.get(followerId);
      if (!followerStatus) {
        return {
          success: false,
          error: 'Agent is not a follower',
          metadata: { operation: 'requestSync' },
        };
      }

      const leaderStatus = this.findLeaderByAgent(followerStatus.leaderId);
      if (!leaderStatus) {
        return {
          success: false,
          error: 'Leader not found or unhealthy',
          metadata: { operation: 'requestSync' },
        };
      }

      const startTime = Date.now();

      // Check if sync is needed
      const currentVersion = requestedVersion || followerStatus.contextVersion;
      const leaderVersion = leaderStatus.contextVersion;

      if (currentVersion >= leaderVersion) {
        // Already up to date
        followerStatus.syncStatus = 'up_to_date';
        followerStatus.lastSync = new Date().toISOString();
        followerStatus.lag = 0;

        return {
          success: true,
          data: {
            followerId,
            leaderId: followerStatus.leaderId,
            currentVersion,
            leaderVersion,
            syncNeeded: false,
          },
          metadata: {
            operation: 'requestSync',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Perform sync
      followerStatus.syncStatus = 'syncing';

      // Get pending updates from queue
      const pendingUpdates = this.syncQueue.get(followerId) || [];
      const relevantUpdates = pendingUpdates.filter(
        (update) => this.getUpdateVersion(update) > currentVersion
      );

      // Apply updates
      let appliedUpdates = 0;
      for (const update of relevantUpdates) {
        try {
          await this.applyUpdateToFollower(followerId, update);
          appliedUpdates++;
        } catch (error) {
          runtimeLogger.error(
            'Failed to apply update to follower',
            error as Error,
            {
              followerId,
              updateId: update.updateId,
            }
          );
        }
      }

      // Update follower status
      followerStatus.contextVersion = leaderVersion;
      followerStatus.syncStatus = 'up_to_date';
      followerStatus.lastSync = new Date().toISOString();
      followerStatus.lag = Date.now() - startTime;

      // Clear processed updates from queue
      const remainingUpdates = pendingUpdates.filter(
        (update) => this.getUpdateVersion(update) <= currentVersion
      );
      this.syncQueue.set(followerId, remainingUpdates);

      const syncTime = Date.now() - startTime;

      this.emit('followerSynced', {
        followerId,
        leaderId: followerStatus.leaderId,
        fromVersion: currentVersion,
        toVersion: leaderVersion,
        appliedUpdates,
        syncTime,
      });

      runtimeLogger.debug('Follower sync completed', {
        followerId,
        leaderId: followerStatus.leaderId,
        appliedUpdates,
        syncTime,
      });

      return {
        success: true,
        data: {
          followerId,
          leaderId: followerStatus.leaderId,
          fromVersion: currentVersion,
          toVersion: leaderVersion,
          appliedUpdates,
          syncTime,
        },
        metadata: {
          operation: 'requestSync',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      // Update follower status on error
      const followerStatus = this.followers.get(followerId);
      if (followerStatus) {
        followerStatus.syncStatus = 'disconnected';
      }

      return {
        success: false,
        error: `Sync request failed: ${(error as Error).message}`,
        metadata: {
          operation: 'requestSync',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Handle leader failure and trigger re-election
   */
  async handleLeaderFailure(
    groupId: string,
    failedLeaderId: AgentId
  ): Promise<OperationResult> {
    try {
      const leaderStatus = this.leaders.get(groupId);
      if (!leaderStatus || leaderStatus.leaderId !== failedLeaderId) {
        return {
          success: false,
          error: 'Leader not found or mismatch',
          metadata: { operation: 'handleLeaderFailure' },
        };
      }

      runtimeLogger.warn('Leader failure detected, starting re-election', {
        groupId,
        failedLeaderId,
        term: leaderStatus.term,
      });

      // Mark leader as unhealthy
      leaderStatus.isHealthy = false;

      // Clear heartbeat timer
      const timer = this.heartbeatTimers.get(failedLeaderId);
      if (timer) {
        clearInterval(timer);
        this.heartbeatTimers.delete(failedLeaderId);
      }

      // Get remaining candidates (exclude failed leader)
      const candidates = Array.from(leaderStatus.followers);

      if (candidates.length === 0) {
        // No candidates available
        this.leaders.delete(groupId);

        return {
          success: false,
          error: 'No candidates available for re-election',
          metadata: { operation: 'handleLeaderFailure' },
        };
      }

      // Trigger re-election
      const electionResult = await this.electLeader(groupId, candidates);

      this.emit('leaderFailover', {
        groupId,
        failedLeaderId,
        newLeaderId: electionResult.success
          ? (electionResult.data as LeaderElectionResult).leaderId
          : null,
        failoverTime: Date.now(),
      });

      return electionResult;
    } catch (error) {
      runtimeLogger.error('Leader failure handling failed', error as Error, {
        groupId,
        failedLeaderId,
      });

      return {
        success: false,
        error: `Leader failure handling failed: ${(error as Error).message}`,
        metadata: {
          operation: 'handleLeaderFailure',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Run election algorithm to select best leader
   */
  private async runElectionAlgorithm(
    candidates: AgentId[],
    criteria?: {
      capabilityWeights?: Record<string, number>;
      loadThreshold?: number;
    }
  ): Promise<AgentId> {
    // Simple algorithm: select first candidate
    // In a real implementation, this would consider agent capabilities,
    // load, network connectivity, etc.

    if (criteria?.loadThreshold) {
      // Filter by load threshold (simulated)
      const lowLoadCandidates = candidates.slice(
        0,
        Math.ceil(candidates.length / 2)
      );
      if (lowLoadCandidates.length > 0) {
        return lowLoadCandidates[0];
      }
    }

    return candidates[0];
  }

  /**
   * Synchronize a follower with leader's context
   */
  private async syncFollower(
    followerId: AgentId,
    context: AgentContext,
    update: ContextUpdate
  ): Promise<void> {
    const followerStatus = this.followers.get(followerId);
    if (!followerStatus) {
      throw new Error(`Follower ${followerId} not found`);
    }

    // Add update to sync queue
    const queue = this.syncQueue.get(followerId) || [];
    queue.push(update);
    this.syncQueue.set(followerId, queue);

    // Update follower status
    followerStatus.syncStatus = 'syncing';

    try {
      // Simulate sync operation
      await this.applyUpdateToFollower(followerId, update);

      // Update status on success
      followerStatus.contextVersion = context.version;
      followerStatus.syncStatus = 'up_to_date';
      followerStatus.lastSync = new Date().toISOString();
      followerStatus.lag = Date.now() - new Date(update.timestamp).getTime();
    } catch (error) {
      followerStatus.syncStatus = 'disconnected';
      throw error;
    }
  }

  /**
   * Apply update to follower (simulated)
   */
  private async applyUpdateToFollower(
    followerId: AgentId,
    update: ContextUpdate
  ): Promise<void> {
    // In a real implementation, this would actually apply the update to the follower's context
    // For now, we'll just simulate the operation

    runtimeLogger.debug('Applying update to follower', {
      followerId,
      updateId: update.updateId,
      operation: update.operation,
    });

    // Simulate network delay and processing time
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
  }

  /**
   * Get next term number for leader election
   */
  private getNextTerm(groupId: string): number {
    const history = this.electionHistory.get(groupId);
    if (!history || history.length === 0) {
      return 1;
    }

    const lastElection = history[history.length - 1];
    return lastElection.term + 1;
  }

  /**
   * Find leader status by agent ID
   */
  private findLeaderByAgent(agentId: AgentId): LeaderStatus | null {
    for (const leaderStatus of this.leaders.values()) {
      if (leaderStatus.leaderId === agentId) {
        return leaderStatus;
      }
    }
    return null;
  }

  /**
   * Get version from update (simulated)
   */
  private getUpdateVersion(update: ContextUpdate): number {
    // In a real implementation, this would extract version info from the update
    return parseInt(update.updateId.split('_')[1]) || 0;
  }

  /**
   * Setup heartbeat monitoring for leader
   */
  private setupHeartbeat(leaderId: AgentId): void {
    const timer = setInterval(() => {
      this.sendHeartbeat(leaderId);
    }, this.heartbeatInterval);

    this.heartbeatTimers.set(leaderId, timer);
  }

  /**
   * Send heartbeat from leader
   */
  private sendHeartbeat(leaderId: AgentId): void {
    const leaderStatus = this.findLeaderByAgent(leaderId);
    if (leaderStatus) {
      leaderStatus.lastHeartbeat = new Date().toISOString();

      this.emit('heartbeat', {
        leaderId,
        timestamp: leaderStatus.lastHeartbeat,
        followers: Array.from(leaderStatus.followers),
      });
    }
  }

  /**
   * Setup heartbeat monitoring
   */
  private setupHeartbeatMonitoring(): void {
    setInterval(() => {
      this.checkLeaderHealth();
    }, this.heartbeatInterval * 2); // Check every 10 seconds
  }

  /**
   * Check leader health based on heartbeat
   */
  private checkLeaderHealth(): void {
    const now = Date.now();

    for (const [groupId, leaderStatus] of this.leaders.entries()) {
      const lastHeartbeatTime = new Date(leaderStatus.lastHeartbeat).getTime();
      const timeSinceHeartbeat = now - lastHeartbeatTime;

      if (timeSinceHeartbeat > this.electionTimeout) {
        // Leader is potentially failed
        leaderStatus.isHealthy = false;

        this.emit('leaderHealthDegraded', {
          groupId,
          leaderId: leaderStatus.leaderId,
          lastHeartbeat: leaderStatus.lastHeartbeat,
          timeSinceHeartbeat,
        });

        // Trigger failure handling
        this.handleLeaderFailure(groupId, leaderStatus.leaderId).catch(
          (error) => {
            runtimeLogger.error(
              'Failed to handle leader failure',
              error as Error,
              {
                groupId,
                leaderId: leaderStatus.leaderId,
              }
            );
          }
        );
      }
    }
  }

  /**
   * Get pattern statistics
   */
  getStatistics() {
    const totalGroups = this.leaders.size;
    const healthyLeaders = Array.from(this.leaders.values()).filter(
      (leader) => leader.isHealthy
    ).length;
    const totalFollowers = this.followers.size;
    const syncedFollowers = Array.from(this.followers.values()).filter(
      (follower) => follower.syncStatus === 'up_to_date'
    ).length;

    return {
      totalGroups,
      healthyLeaders,
      unhealthyLeaders: totalGroups - healthyLeaders,
      totalFollowers,
      syncedFollowers,
      unsyncedFollowers: totalFollowers - syncedFollowers,
      totalElections: Array.from(this.electionHistory.values()).reduce(
        (sum, history) => sum + history.length,
        0
      ),
    };
  }

  /**
   * Get leader status
   */
  getLeaderStatus(groupId: string): LeaderStatus | undefined {
    return this.leaders.get(groupId);
  }

  /**
   * Get follower status
   */
  getFollowerStatus(followerId: AgentId): FollowerStatus | undefined {
    return this.followers.get(followerId);
  }

  /**
   * Get election history
   */
  getElectionHistory(groupId: string): LeaderElectionResult[] {
    return this.electionHistory.get(groupId) || [];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear all timers
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }

    this.leaders.clear();
    this.followers.clear();
    this.contextVersions.clear();
    this.electionHistory.clear();
    this.heartbeatTimers.clear();
    this.syncQueue.clear();
    this.removeAllListeners();
  }
}
