/**
 * Checkpoint System for Agent Lifecycle Management
 * Provides automated checkpointing and state management
 */

import { EventEmitter } from 'events';

import { Agent } from '../types/agent';
import { Logger } from '../utils/logger';

import { ResourceManager } from './resource-manager';
import {
  StateManager,
  AgentStateSnapshot,
  CheckpointType,
  StateManagerConfig,
} from './state-manager';

export interface CheckpointSchedule {
  agentId: string;
  interval: number; // ms
  type: CheckpointType;
  enabled: boolean;
  lastCheckpoint?: Date;
  nextCheckpoint: Date;
  failures: number;
  maxFailures: number;
}

export interface CheckpointSystemConfig {
  enableScheduledCheckpoints: boolean;
  defaultInterval: number;
  maxFailures: number;
  retryDelay: number;
  enableIncrementalCheckpoints: boolean;
  incrementalThreshold: number; // changes threshold
  enableEventBasedCheckpoints: boolean;
  stateChangeThreshold: number;
  cleanupInterval: number;
}

export interface CheckpointMetrics {
  totalCheckpoints: number;
  successfulCheckpoints: number;
  failedCheckpoints: number;
  averageCheckpointTime: number;
  lastCheckpointSize: number;
  diskUsage: number;
}

export class CheckpointSystem extends EventEmitter {
  private logger: Logger;
  private config: CheckpointSystemConfig;
  private stateManager: StateManager;
  private resourceManager: ResourceManager;
  private schedules: Map<string, CheckpointSchedule> = new Map();
  private checkpointTimer?: NodeJS.Timeout;
  private metrics: Map<string, CheckpointMetrics> = new Map();
  private agentStateHashes: Map<string, string> = new Map();

  constructor(
    config: CheckpointSystemConfig,
    stateManager: StateManager,
    resourceManager: ResourceManager
  ) {
    super();
    this.config = config;
    this.stateManager = stateManager;
    this.resourceManager = resourceManager;
    this.logger = new Logger('CheckpointSystem');

    if (config.enableScheduledCheckpoints) {
      this.startScheduler();
    }
  }

  /**
   * Schedule automatic checkpoints for an agent
   */
  scheduleCheckpoints(
    agentId: string,
    interval: number = this.config.defaultInterval,
    type: CheckpointType = CheckpointType.SCHEDULED
  ): void {
    const schedule: CheckpointSchedule = {
      agentId,
      interval,
      type,
      enabled: true,
      nextCheckpoint: new Date(Date.now() + interval),
      failures: 0,
      maxFailures: this.config.maxFailures,
    };

    this.schedules.set(agentId, schedule);
    this.initializeMetrics(agentId);

    this.logger.info(`Scheduled checkpoints for agent ${agentId}`, {
      interval: interval / 1000 / 60, // minutes
      type,
    });

    this.emit('checkpoint_scheduled', { agentId, schedule });
  }

  /**
   * Unschedule checkpoints for an agent
   */
  unscheduleCheckpoints(agentId: string): void {
    this.schedules.delete(agentId);
    this.agentStateHashes.delete(agentId);

    this.logger.info(`Unscheduled checkpoints for agent ${agentId}`);
    this.emit('checkpoint_unscheduled', { agentId });
  }

  /**
   * Create an immediate checkpoint for an agent
   */
  async createCheckpoint(
    agent: Agent,
    type: CheckpointType = CheckpointType.FULL,
    reason?: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.info(`Creating ${type} checkpoint for agent ${agent.id}`, {
        reason,
      });

      // Create snapshot
      const snapshot = await this.stateManager.createSnapshot(agent, type);

      // Save snapshot
      const filepath = await this.stateManager.saveSnapshot(snapshot);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(
        agent.id,
        true,
        duration,
        JSON.stringify(snapshot).length
      );

      // Update schedule if this was a scheduled checkpoint
      const schedule = this.schedules.get(agent.id);
      if (schedule && type === CheckpointType.SCHEDULED) {
        schedule.lastCheckpoint = new Date();
        schedule.nextCheckpoint = new Date(Date.now() + schedule.interval);
        schedule.failures = 0;
      }

      // Update state hash for change detection
      this.updateStateHash(agent);

      this.logger.info(`Checkpoint created for agent ${agent.id}`, {
        filepath,
        duration: `${duration}ms`,
        size: JSON.stringify(snapshot).length,
      });

      this.emit('checkpoint_created', {
        agentId: agent.id,
        type,
        filepath,
        duration,
      });

      return filepath;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateMetrics(agent.id, false, duration, 0);

      // Update schedule failure count
      const schedule = this.schedules.get(agent.id);
      if (schedule) {
        schedule.failures++;
        if (schedule.failures >= schedule.maxFailures) {
          schedule.enabled = false;
          this.logger.error(
            `Disabled checkpoints for agent ${agent.id} due to too many failures`
          );
        }
      }

      this.logger.error(
        `Checkpoint creation failed for agent ${agent.id}:`,
        error
      );
      this.emit('checkpoint_failed', { agentId: agent.id, type, error });

      throw error;
    }
  }

  /**
   * Create incremental checkpoint if enough changes detected
   */
  async createIncrementalCheckpointIfNeeded(
    agent: Agent
  ): Promise<string | null> {
    if (!this.config.enableIncrementalCheckpoints) {
      return null;
    }

    const currentHash = this.calculateStateHash(agent);
    const previousHash = this.agentStateHashes.get(agent.id);

    if (
      !previousHash ||
      this.hasSignificantChanges(currentHash, previousHash)
    ) {
      return await this.createCheckpoint(
        agent,
        CheckpointType.INCREMENTAL,
        'state_change_detected'
      );
    }

    return null;
  }

  /**
   * Monitor agent for state changes and create checkpoints as needed
   */
  monitorAgent(agent: Agent): void {
    if (!this.config.enableEventBasedCheckpoints) {
      return;
    }

    const agentId = agent.id;
    let changeCount = 0;

    // Monitor emotion changes
    const originalSetEmotion = agent.emotion.setEmotion;
    agent.emotion.setEmotion = (...args) => {
      changeCount++;
      this.checkChangeThreshold(agent, changeCount);
      return originalSetEmotion.apply(agent.emotion, args);
    };

    // Monitor memory changes
    if (agent.memory && typeof agent.memory.store === 'function') {
      const originalStore = agent.memory.store;
      agent.memory.store = async (...args) => {
        changeCount++;
        this.checkChangeThreshold(agent, changeCount);
        return await originalStore.apply(agent.memory, args);
      };
    }

    this.logger.debug(`Started monitoring agent ${agentId} for state changes`);
  }

  /**
   * Stop monitoring an agent
   */
  stopMonitoring(agentId: string): void {
    // Monitoring is implemented via method wrapping, so stopping is automatic when agent is unloaded
    this.logger.debug(`Stopped monitoring agent ${agentId}`);
  }

  /**
   * Get checkpoint metrics for an agent
   */
  getMetrics(agentId: string): CheckpointMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get comprehensive checkpoint system status
   */
  getSystemStatus(): CheckpointSystemStatus {
    const schedules = Array.from(this.schedules.values());
    const metrics = Array.from(this.metrics.values());

    return {
      enabled: this.config.enableScheduledCheckpoints,
      totalAgents: schedules.length,
      activeSchedules: schedules.filter((s) => s.enabled).length,
      totalCheckpoints: metrics.reduce((sum, m) => sum + m.totalCheckpoints, 0),
      successRate: this.calculateSuccessRate(metrics),
      nextCheckpoint: this.getNextScheduledCheckpoint(),
      diskUsage: metrics.reduce((sum, m) => sum + m.diskUsage, 0),
    };
  }

  /**
   * Manually trigger scheduled checkpoint run
   */
  async runScheduledCheckpoints(): Promise<CheckpointRunResult> {
    const results: CheckpointRunResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    const now = new Date();

    for (const [agentId, schedule] of this.schedules) {
      if (!schedule.enabled || schedule.nextCheckpoint > now) {
        continue;
      }

      results.processed++;

      try {
        // Get agent instance - this would need to be provided by the runtime
        const agent = await this.getAgentInstance(agentId);
        if (!agent) {
          throw new Error(`Agent ${agentId} not found or not active`);
        }

        await this.createCheckpoint(agent, schedule.type, 'scheduled');
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${agentId}: ${error}`);

        // Update schedule
        schedule.failures++;
        if (schedule.failures >= schedule.maxFailures) {
          schedule.enabled = false;
        } else {
          // Retry with delay
          schedule.nextCheckpoint = new Date(
            Date.now() + this.config.retryDelay
          );
        }
      }
    }

    this.logger.info(`Scheduled checkpoint run completed`, results);
    this.emit('scheduled_run_completed', results);

    return results;
  }

  /**
   * Cleanup old checkpoints based on retention policies
   */
  async cleanupOldCheckpoints(): Promise<void> {
    this.logger.info('Starting checkpoint cleanup...');

    for (const agentId of this.schedules.keys()) {
      try {
        const checkpoints = await this.stateManager.listCheckpoints(agentId);

        // Keep last 10 checkpoints per agent by default
        if (checkpoints.length > 10) {
          const toDelete = checkpoints.slice(10);

          for (const checkpoint of toDelete) {
            await this.stateManager.deleteCheckpoints(agentId, checkpoint);
          }

          this.logger.debug(
            `Cleaned up ${toDelete.length} old checkpoints for agent ${agentId}`
          );
        }
      } catch (error) {
        this.logger.error(`Cleanup failed for agent ${agentId}:`, error);
      }
    }
  }

  /**
   * Shutdown checkpoint system
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down checkpoint system...');

    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = undefined;
    }

    // Final cleanup
    await this.cleanupOldCheckpoints();

    this.schedules.clear();
    this.metrics.clear();
    this.agentStateHashes.clear();

    this.logger.info('Checkpoint system shutdown complete');
  }

  // Private methods

  private startScheduler(): void {
    this.checkpointTimer = setInterval(async () => {
      try {
        await this.runScheduledCheckpoints();
      } catch (error) {
        this.logger.error('Scheduled checkpoint run failed:', error);
      }
    }, 60000); // Check every minute

    this.logger.info('Checkpoint scheduler started');
  }

  private initializeMetrics(agentId: string): void {
    this.metrics.set(agentId, {
      totalCheckpoints: 0,
      successfulCheckpoints: 0,
      failedCheckpoints: 0,
      averageCheckpointTime: 0,
      lastCheckpointSize: 0,
      diskUsage: 0,
    });
  }

  private updateMetrics(
    agentId: string,
    success: boolean,
    duration: number,
    size: number
  ): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    metrics.totalCheckpoints++;

    if (success) {
      metrics.successfulCheckpoints++;
      metrics.lastCheckpointSize = size;

      // Update average checkpoint time
      const totalTime =
        metrics.averageCheckpointTime * (metrics.successfulCheckpoints - 1) +
        duration;
      metrics.averageCheckpointTime = totalTime / metrics.successfulCheckpoints;

      // Estimate disk usage (simplified)
      metrics.diskUsage += size;
    } else {
      metrics.failedCheckpoints++;
    }
  }

  private calculateStateHash(agent: Agent): string {
    // Simplified state hash calculation
    const stateData = {
      status: agent.status,
      emotion: agent.emotion.current,
      lastUpdate: agent.lastUpdate.getTime(),
    };

    return JSON.stringify(stateData);
  }

  private updateStateHash(agent: Agent): void {
    const hash = this.calculateStateHash(agent);
    this.agentStateHashes.set(agent.id, hash);
  }

  private hasSignificantChanges(
    currentHash: string,
    previousHash: string
  ): boolean {
    // Simple comparison - in practice, this could be more sophisticated
    return currentHash !== previousHash;
  }

  private checkChangeThreshold(agent: Agent, changeCount: number): void {
    if (changeCount >= this.config.stateChangeThreshold) {
      this.createIncrementalCheckpointIfNeeded(agent).catch((error) => {
        this.logger.error(
          `Event-based checkpoint failed for agent ${agent.id}:`,
          error
        );
      });
    }
  }

  private calculateSuccessRate(metrics: CheckpointMetrics[]): number {
    const totalCheckpoints = metrics.reduce(
      (sum, m) => sum + m.totalCheckpoints,
      0
    );
    const successfulCheckpoints = metrics.reduce(
      (sum, m) => sum + m.successfulCheckpoints,
      0
    );

    return totalCheckpoints > 0 ? successfulCheckpoints / totalCheckpoints : 1;
  }

  private getNextScheduledCheckpoint(): Date | null {
    let nextCheckpoint: Date | null = null;

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        if (!nextCheckpoint || schedule.nextCheckpoint < nextCheckpoint) {
          nextCheckpoint = schedule.nextCheckpoint;
        }
      }
    }

    return nextCheckpoint;
  }

  private async getAgentInstance(agentId: string): Promise<Agent | null> {
    // This would need to be implemented by injecting the runtime
    // For now, return null to indicate agent not available
    return null;
  }
}

export interface CheckpointSystemStatus {
  enabled: boolean;
  totalAgents: number;
  activeSchedules: number;
  totalCheckpoints: number;
  successRate: number;
  nextCheckpoint: Date | null;
  diskUsage: number;
}

export interface CheckpointRunResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}
