/**
 * State Manager for Agent Lifecycle Management
 * Handles comprehensive state persistence, checkpoints, and recovery
 */

import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  Agent,
  LazyAgent,
  AgentStatus,
  LazyAgentState,
  MemoryRecord,
} from '../types/agent';
import { EmotionState } from '../types/emotion';
import { Logger } from '../utils/logger';

export interface AgentStateSnapshot {
  // Core agent state
  agentId: string;
  timestamp: Date;
  version: string;

  // Agent configuration and metadata
  core: {
    name: string;
    status: AgentStatus;
    characterConfig: unknown;
    agentConfig: unknown;
    lastUpdate: Date;
    personality?: unknown; // Agent personality traits
    goals?: string[]; // Agent goals
  };

  // Cognitive state
  cognitive: {
    emotionState: EmotionState;
    recentMemories: MemoryRecord[];
    currentThoughts?: string[];
    decisionContext?: unknown;
    memories?: MemoryRecord[]; // Additional memories storage
    emotions?: unknown; // Flexible emotions structure
    plans?: unknown[]; // Plans storage
    decisions?: unknown[]; // Decisions storage
  };

  // Autonomous state
  autonomous?: {
    goals: unknown[];
    learningState: unknown;
    decisionHistory: unknown[];
    autonomyLevel: number;
  };

  // Communication state
  communication: {
    activeConversations: unknown[];
    extensionStates: Record<string, unknown>;
    portalStates: Record<string, unknown>;
  };

  // Resource state
  resources: {
    memoryUsage: number;
    connections: string[];
    fileHandles: string[];
    timers: string[];
  };

  // State metadata
  metadata: {
    checkpointType: CheckpointType;
    integrity: string;
    dependencies: string[];
    recoveryData?: unknown;
  };
}

export enum CheckpointType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  EMERGENCY = 'emergency',
  SCHEDULED = 'scheduled',
  LAZY = 'lazy',
}

export enum StateValidationResult {
  VALID = 'valid',
  RECOVERABLE = 'recoverable',
  CORRUPTED = 'corrupted',
  MISSING = 'missing',
}

export interface StateValidationReport {
  result: StateValidationResult;
  errors: string[];
  warnings: string[];
  recoveryOptions: string[];
}

export interface StateManagerConfig {
  stateDirectory: string;
  maxCheckpoints: number;
  checkpointInterval: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  validationLevel: 'basic' | 'full' | 'strict';
}

export class StateManager {
  private logger: Logger;
  private config: StateManagerConfig;
  private stateDirectory: string;
  private operationLocks: Map<string, boolean> = new Map();
  private checkpointTimers: Map<string, ReturnType<typeof setInterval>> =
    new Map();

  constructor(config: StateManagerConfig) {
    this.config = config;
    this.logger = new Logger('StateManager');
    this.stateDirectory = config.stateDirectory;
  }

  /**
   * Initialize state manager and create directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.stateDirectory, { recursive: true });
      this.logger.info('State manager initialized', {
        directory: this.stateDirectory,
      });
    } catch (error) {
      this.logger.error('Failed to initialize state manager:', error);
      throw error;
    }
  }

  /**
   * Create a comprehensive state snapshot of an agent
   */
  async createSnapshot(
    agent: Agent,
    type: CheckpointType = CheckpointType.FULL
  ): Promise<AgentStateSnapshot> {
    const agentId = agent.id;

    if (this.operationLocks.get(agentId)) {
      throw new Error(
        `State operation already in progress for agent ${agentId}`
      );
    }

    this.operationLocks.set(agentId, true);

    try {
      this.logger.info(`Creating ${type} snapshot for agent ${agentId}`);

      // Gather emotion state
      const emotionState: EmotionState = {
        current: agent.emotion.current,
        intensity: agent.emotion.intensity,
        triggers: agent.emotion.triggers || [],
        history: agent.emotion.history || [],
        timestamp: new Date(),
      };

      // Gather recent memories
      const recentMemories = await this.getRecentMemories(agent);

      // Gather extension states
      const extensionStates: Record<string, any> = {};
      for (const extension of agent.extensions) {
        if (typeof (extension as any).getState === 'function') {
          extensionStates[extension.id] = await (extension as any).getState();
        }
      }

      // Gather portal states
      const portalStates: Record<string, any> = {};
      if (agent.portals) {
        for (const portal of agent.portals) {
          if (typeof (portal as any).getState === 'function') {
            portalStates[(portal as any).id || 'primary'] = await (
              portal as any
            ).getState();
          }
        }
      }

      // Create snapshot
      const snapshot: AgentStateSnapshot = {
        agentId: agent.id,
        timestamp: new Date(),
        version: '1.0.0',

        core: {
          name: agent.name,
          status: agent.status,
          characterConfig: agent.characterConfig,
          agentConfig: agent.config,
          lastUpdate: agent.lastUpdate,
        },

        cognitive: {
          emotionState,
          recentMemories,
        },

        communication: {
          activeConversations: [], // TODO: Implement conversation tracking
          extensionStates,
          portalStates,
        },

        resources: {
          memoryUsage: process.memoryUsage().heapUsed,
          connections: [], // TODO: Track active connections
          fileHandles: [], // TODO: Track file handles
          timers: [], // TODO: Track active timers
        },

        metadata: {
          checkpointType: type,
          integrity: '', // Will be calculated after snapshot is complete
          dependencies: this.gatherDependencies(agent),
        },
      };

      // Add optional cognitive properties
      const currentThoughts = (agent as any).currentThoughts;
      if (currentThoughts) {
        snapshot.cognitive.currentThoughts = currentThoughts;
      }

      const decisionContext = (agent as any).decisionContext;
      if (decisionContext) {
        snapshot.cognitive.decisionContext = decisionContext;
      }

      // Add autonomous state if present
      if (agent.autonomyLevel) {
        snapshot.autonomous = {
          goals: (agent as any).goals || [],
          learningState: (agent.learning as any)?.getState?.() || {},
          decisionHistory: (agent.decision as any)?.getHistory?.() || [],
          autonomyLevel: agent.autonomyLevel,
        };
      }

      // Add recovery data for emergency checkpoints
      if (type === CheckpointType.EMERGENCY) {
        snapshot.metadata.recoveryData = {
          reason: 'emergency_checkpoint',
          context: 'system_initiated',
        };
      }

      // Calculate integrity hash after full snapshot is created
      snapshot.metadata.integrity = this.calculateIntegrity(snapshot);

      this.logger.info(`Snapshot created for agent ${agentId}`, {
        type,
        size: JSON.stringify(snapshot).length,
      });

      return snapshot;
    } finally {
      this.operationLocks.delete(agentId);
    }
  }

  /**
   * Save state snapshot to persistent storage
   */
  async saveSnapshot(snapshot: AgentStateSnapshot): Promise<string> {
    const agentDir = path.join(this.stateDirectory, snapshot.agentId);
    const checkpointDir = path.join(agentDir, 'checkpoints');

    await fs.mkdir(checkpointDir, { recursive: true });

    const timestamp = snapshot.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `${snapshot.metadata.checkpointType}-${timestamp}.json`;
    const filepath = path.join(checkpointDir, filename);

    try {
      const data = JSON.stringify(snapshot, null, 2);

      // Apply compression if enabled
      if (this.config.compressionEnabled) {
        // TODO: Implement compression
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled) {
        // TODO: Implement encryption
      }

      await fs.writeFile(filepath, data);

      // Update latest snapshot link
      const latestPath = path.join(checkpointDir, 'latest.json');
      await fs.writeFile(latestPath, data);

      // Update metadata
      await this.updateMetadata(snapshot.agentId, {
        lastCheckpoint: snapshot.timestamp,
        checkpointCount: await this.getCheckpointCount(snapshot.agentId),
        latestSnapshot: filename,
      });

      this.logger.info(`Snapshot saved for agent ${snapshot.agentId}`, {
        filename,
      });

      // Cleanup old checkpoints
      await this.cleanupOldCheckpoints(snapshot.agentId);

      return filepath;
    } catch (error) {
      this.logger.error(
        `Failed to save snapshot for agent ${snapshot.agentId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Load state snapshot from persistent storage
   */
  async loadSnapshot(
    agentId: string,
    specific?: string
  ): Promise<AgentStateSnapshot | null> {
    const checkpointDir = path.join(
      this.stateDirectory,
      agentId,
      'checkpoints'
    );

    try {
      let filepath: string;

      if (specific) {
        filepath = path.join(checkpointDir, specific);
      } else {
        filepath = path.join(checkpointDir, 'latest.json');
      }

      const data = await fs.readFile(filepath, 'utf-8');

      // Apply decryption if needed
      if (this.config.encryptionEnabled) {
        // TODO: Implement decryption
      }

      // Apply decompression if needed
      if (this.config.compressionEnabled) {
        // TODO: Implement decompression
      }

      const snapshot = JSON.parse(data) as AgentStateSnapshot;

      this.logger.info(`Snapshot loaded for agent ${agentId}`, {
        timestamp: snapshot.timestamp,
        type: snapshot.metadata.checkpointType,
      });

      return snapshot;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        this.logger.warn(`No snapshot found for agent ${agentId}`);
        return null;
      }

      this.logger.error(`Failed to load snapshot for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Validate state snapshot integrity and completeness
   */
  async validateSnapshot(
    snapshot: AgentStateSnapshot
  ): Promise<StateValidationReport> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recoveryOptions: string[] = [];

    try {
      // Basic structure validation
      if (!snapshot.agentId) errors.push('Missing agent ID');
      if (!snapshot.timestamp) errors.push('Missing timestamp');
      if (!snapshot.core) errors.push('Missing core state');
      if (!snapshot.cognitive) errors.push('Missing cognitive state');

      // Integrity validation
      const expectedIntegrity = this.calculateIntegrity({
        ...snapshot,
        metadata: { ...snapshot.metadata, integrity: '' },
      });

      if (snapshot.metadata.integrity !== expectedIntegrity) {
        errors.push('Integrity check failed - state may be corrupted');
        recoveryOptions.push('attempt_partial_recovery');
      }

      // Temporal validation
      const age = Date.now() - new Date(snapshot.timestamp).getTime();
      if (age > 24 * 60 * 60 * 1000) {
        // 24 hours
        warnings.push('Snapshot is older than 24 hours');
      }

      // Schema validation based on version
      if (snapshot.version !== '1.0.0') {
        warnings.push(`Unknown snapshot version: ${snapshot.version}`);
        recoveryOptions.push('version_migration');
      }

      // Dependency validation
      if (
        this.config.validationLevel === 'full' ||
        this.config.validationLevel === 'strict'
      ) {
        // TODO: Validate dependencies are available
      }

      // Determine validation result
      let result: StateValidationResult;
      if (errors.length === 0) {
        result =
          warnings.length === 0
            ? StateValidationResult.VALID
            : StateValidationResult.RECOVERABLE;
      } else {
        result =
          recoveryOptions.length > 0
            ? StateValidationResult.RECOVERABLE
            : StateValidationResult.CORRUPTED;
      }

      return {
        result,
        errors,
        warnings,
        recoveryOptions,
      };
    } catch (error) {
      return {
        result: StateValidationResult.CORRUPTED,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        recoveryOptions: ['create_new_state'],
      };
    }
  }

  /**
   * List available checkpoints for an agent
   */
  async listCheckpoints(agentId: string): Promise<string[]> {
    const checkpointDir = path.join(
      this.stateDirectory,
      agentId,
      'checkpoints'
    );

    try {
      const files = await fs.readdir(checkpointDir);
      return files
        .filter((file) => file.endsWith('.json') && file !== 'latest.json')
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete specific checkpoint or all checkpoints for an agent
   */
  async deleteCheckpoints(agentId: string, specific?: string): Promise<void> {
    const checkpointDir = path.join(
      this.stateDirectory,
      agentId,
      'checkpoints'
    );

    try {
      if (specific) {
        const filepath = path.join(checkpointDir, specific);
        await fs.unlink(filepath);
        this.logger.info(`Deleted checkpoint ${specific} for agent ${agentId}`);
      } else {
        // Delete all checkpoints
        await fs.rm(checkpointDir, { recursive: true, force: true });
        this.logger.info(`Deleted all checkpoints for agent ${agentId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete checkpoints for agent ${agentId}:`,
        error
      );
      throw error;
    }
  }

  // Private helper methods

  private async getRecentMemories(agent: Agent): Promise<MemoryRecord[]> {
    try {
      return await agent.memory.getRecent(agent.id, 20);
    } catch (error) {
      this.logger.warn(
        `Failed to get recent memories for agent ${agent.id}:`,
        error
      );
      return [];
    }
  }

  private calculateIntegrity(snapshot: unknown): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(snapshot, Object.keys(snapshot).sort()));
    return hash.digest('hex');
  }

  private gatherDependencies(agent: Agent): string[] {
    const dependencies: string[] = [];

    // Add extension dependencies
    agent.extensions.forEach((ext) => {
      dependencies.push(`extension:${ext.id}`);
      if (ext.dependencies) {
        dependencies.push(
          ...ext.dependencies.map((dep) => `extension-dep:${dep}`)
        );
      }
    });

    // Add portal dependencies
    if (agent.portals) {
      agent.portals.forEach((portal) => {
        dependencies.push(`portal:${(portal as any).type || 'unknown'}`);
      });
    }

    // Add memory provider dependency
    dependencies.push(`memory:${agent.config.psyche.defaults.memory}`);

    return dependencies;
  }

  private async getCheckpointCount(agentId: string): Promise<number> {
    try {
      const checkpoints = await this.listCheckpoints(agentId);
      return checkpoints.length;
    } catch {
      return 0;
    }
  }

  private async cleanupOldCheckpoints(agentId: string): Promise<void> {
    try {
      const checkpoints = await this.listCheckpoints(agentId);

      if (checkpoints.length > this.config.maxCheckpoints) {
        const toDelete = checkpoints.slice(this.config.maxCheckpoints);
        const checkpointDir = path.join(
          this.stateDirectory,
          agentId,
          'checkpoints'
        );

        for (const checkpoint of toDelete) {
          await fs.unlink(path.join(checkpointDir, checkpoint));
        }

        this.logger.info(
          `Cleaned up ${toDelete.length} old checkpoints for agent ${agentId}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old checkpoints for agent ${agentId}:`,
        error
      );
    }
  }

  private async updateMetadata(
    agentId: string,
    metadata: unknown
  ): Promise<void> {
    const agentDir = path.join(this.stateDirectory, agentId);
    const metadataPath = path.join(agentDir, 'metadata.json');

    try {
      let existingMetadata = {};
      try {
        const data = await fs.readFile(metadataPath, 'utf-8');
        existingMetadata = JSON.parse(data);
      } catch {
        // File doesn't exist, use empty metadata
      }

      const updatedMetadata = {
        ...existingMetadata,
        ...metadata,
        lastUpdated: new Date(),
      };

      await fs.writeFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2)
      );
    } catch (error) {
      this.logger.error(
        `Failed to update metadata for agent ${agentId}:`,
        error
      );
    }
  }

  /**
   * Create a state snapshot for a lazy agent
   */
  async createLazySnapshot(
    lazyAgent: LazyAgent,
    state: LazyAgentState
  ): Promise<AgentStateSnapshot> {
    const snapshot: AgentStateSnapshot = {
      agentId: lazyAgent.id,
      timestamp: new Date(),
      version: '1.0.0',

      core: {
        name: lazyAgent.name,
        status: AgentStatus.DISABLED,
        characterConfig: lazyAgent.config,
        agentConfig: lazyAgent.config,
        lastUpdate: new Date(),
        ...(lazyAgent.config.personality && {
          personality: lazyAgent.config.personality,
        }),
        ...(lazyAgent.config.goals && { goals: lazyAgent.config.goals }),
      },

      cognitive: {
        emotionState: state.emotionState,
        recentMemories: state.recentMemories,
        memories: [],
        emotions: state.emotions || { currentEmotions: [] },
        plans: [],
        decisions: [],
      },

      communication: {
        activeConversations: [],
        extensionStates: {},
        portalStates: {},
      },

      resources: {
        memoryUsage: state.memoryUsage || 0,
        connections: [],
        fileHandles: [],
        timers: [],
      },

      metadata: {
        checkpointType: CheckpointType.LAZY,
        integrity: '',
        dependencies: [],
      },
    };

    // Calculate integrity
    snapshot.metadata.integrity = this.calculateIntegrity(snapshot);

    this.logger.info(`Created lazy snapshot for agent ${lazyAgent.id}`, {
      size: JSON.stringify(snapshot).length,
    });

    return snapshot;
  }

  /**
   * Save lazy agent state
   */
  async saveLazyAgentState(
    lazyAgent: LazyAgent,
    state: LazyAgentState
  ): Promise<void> {
    try {
      const snapshot = await this.createLazySnapshot(lazyAgent, state);
      await this.saveSnapshot(snapshot);

      this.logger.info(`Saved lazy agent state for ${lazyAgent.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to save lazy agent state for ${lazyAgent.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Restore lazy agent state
   */
  async restoreLazyAgentState(
    lazyAgentId: string
  ): Promise<LazyAgentState | null> {
    try {
      const checkpointDir = path.join(
        this.stateDirectory,
        lazyAgentId,
        'checkpoints'
      );
      const latestPath = path.join(checkpointDir, 'latest.json');

      try {
        const data = await fs.readFile(latestPath, 'utf-8');
        const snapshot: AgentStateSnapshot = JSON.parse(data);

        // Validate it's a lazy agent snapshot
        if (snapshot.metadata.checkpointType !== CheckpointType.LAZY) {
          this.logger.warn(
            `Latest snapshot for ${lazyAgentId} is not a lazy agent snapshot`
          );
          return null;
        }

        // Extract lazy agent state from snapshot
        const state: LazyAgentState = {
          emotionState: snapshot.cognitive.emotionState || {
            current: 'neutral',
            intensity: 0.5,
            triggers: [],
            history: [],
            timestamp: new Date(),
          },
          recentMemories: snapshot.cognitive.recentMemories || [],
          lastActivity: snapshot.timestamp,
          emotions: snapshot.cognitive.emotions,
          memoryUsage: snapshot.resources.memoryUsage,
        };

        this.logger.info(`Restored lazy agent state for ${lazyAgentId}`);
        return state;
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          this.logger.info(`No saved state for lazy agent ${lazyAgentId}`);
          return null;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(
        `Failed to restore lazy agent state for ${lazyAgentId}:`,
        error
      );
      throw error;
    }
  }
}
