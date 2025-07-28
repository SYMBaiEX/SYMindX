/**
 * State Manager for Agent Lifecycle Management
 * Handles comprehensive state persistence, checkpoints, and recovery
 */

import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

import {
  Agent,
  LazyAgent,
  AgentStatus,
  LazyAgentState,
  MemoryRecord,
} from '../types/agent';
import { EmotionState } from '../types/emotion';
import type { CharacterConfig, AgentConfig } from '../types/index';
import { Logger } from '../utils/logger.js';

// Additional type definitions for state management
interface StatefulExtension {
  id: string;
  getState?(): Promise<Record<string, unknown>> | Record<string, unknown>;
}

interface StatefulPortal {
  id?: string;
  type?: string;
  getState?(): Promise<Record<string, unknown>> | Record<string, unknown>;
}

interface ExtendedAgent extends Agent {
  currentThoughts?: string[];
  decisionContext?: Record<string, unknown>;
  goals?: string[];
  learning?: {
    getState?(): Record<string, unknown>;
  };
  decision?: {
    getHistory?(): unknown[];
  };
  autonomyLevel?: number;
}

interface StateManagerError extends Error {
  code?: string;
  path?: string;
  operation?: string;
  isOperational?: boolean;
}

class StateManagementError extends Error {
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly path?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code?: string,
    path?: string,
    operation?: string
  ) {
    super(message);
    this.name = 'StateManagementError';
    this.isOperational = true;
    this.code = code;
    this.path = path;
    this.operation = operation;
    Error.captureStackTrace(this, StateManagementError);
  }
}

export interface AgentStateSnapshot {
  // Core agent state
  agentId: string;
  timestamp: Date;
  version: string;

  // Agent configuration and metadata
  core: {
    name: string;
    status: AgentStatus;
    characterConfig: CharacterConfig;
    agentConfig: AgentConfig;
    lastUpdate: Date;
    personality?: Record<string, unknown>; // Agent personality traits
    goals?: string[]; // Agent goals
  };

  // Cognitive state
  cognitive: {
    emotionState: EmotionState;
    recentMemories: MemoryRecord[];
    currentThoughts?: string[];
    decisionContext?: Record<string, unknown>;
    memories?: MemoryRecord[]; // Additional memories storage
    emotions?: Record<string, unknown>; // Flexible emotions structure
    plans?: Record<string, unknown>[]; // Plans storage
    decisions?: Record<string, unknown>[]; // Decisions storage
  };

  // Autonomous state
  autonomous?: {
    goals: string[];
    learningState: Record<string, unknown>;
    decisionHistory: Record<string, unknown>[];
    autonomyLevel: number;
  };

  // Communication state
  communication: {
    activeConversations: Record<string, unknown>[];
    extensionStates: Record<string, Record<string, unknown>>;
    portalStates: Record<string, Record<string, unknown>>;
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
    recoveryData?: Record<string, unknown>;
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

  // Timer cleanup utility methods (removed unused method)

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
        metadata: {
          directory: this.stateDirectory,
        },
      });
    } catch (error) {
      const initError = new StateManagementError(
        `Failed to initialize state manager directory: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        this.stateDirectory,
        'initialize'
      );
      this.logger.error('Failed to initialize state manager:', initError);
      throw initError;
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
      const extensionStates: Record<string, Record<string, unknown>> = {};
      for (const extension of agent.extensions) {
        const statefulExtension = extension as StatefulExtension;
        if (typeof statefulExtension.getState === 'function') {
          extensionStates[extension.id] = await statefulExtension.getState();
        }
      }

      // Gather portal states
      const portalStates: Record<string, Record<string, unknown>> = {};
      if (agent.portals) {
        for (const portal of agent.portals) {
          const statefulPortal = portal as StatefulPortal;
          if (typeof statefulPortal.getState === 'function') {
            portalStates[statefulPortal.id || 'primary'] =
              await statefulPortal.getState();
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
          characterConfig: agent.characterConfig as unknown as CharacterConfig,
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
      const extendedAgent = agent as ExtendedAgent;
      const currentThoughts = extendedAgent.currentThoughts;
      if (currentThoughts) {
        snapshot.cognitive.currentThoughts = currentThoughts;
      }

      const decisionContext = extendedAgent.decisionContext;
      if (decisionContext) {
        snapshot.cognitive.decisionContext = decisionContext;
      }

      // Add autonomous state if present
      if (extendedAgent.autonomyLevel) {
        snapshot.autonomous = {
          goals: extendedAgent.goals || [],
          learningState: extendedAgent.learning?.getState?.() || {},
          decisionHistory: (extendedAgent.decision?.getHistory?.() ||
            []) as Record<string, unknown>[],
          autonomyLevel: extendedAgent.autonomyLevel,
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
        agentId,
        metadata: {
          type,
          size: JSON.stringify(snapshot).length,
        },
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
      let processedData = data;
      if (this.config.compressionEnabled) {
        processedData = await this.compressData(processedData);
      }

      // Apply encryption if enabled
      if (this.config.encryptionEnabled) {
        processedData = await this.encryptData(processedData);
      }

      await fs.writeFile(filepath, processedData);

      // Update latest snapshot link
      const latestPath = path.join(checkpointDir, 'latest.json');
      await fs.writeFile(latestPath, processedData);

      // Update metadata
      await this.updateMetadata(snapshot.agentId, {
        lastCheckpoint: snapshot.timestamp,
        checkpointCount: await this.getCheckpointCount(snapshot.agentId),
        latestSnapshot: filename,
      });

      this.logger.info(`Snapshot saved for agent ${snapshot.agentId}`, {
        agentId: snapshot.agentId,
        metadata: {
          filename,
        },
      });

      // Cleanup old checkpoints
      await this.cleanupOldCheckpoints(snapshot.agentId);

      return filepath;
    } catch (error) {
      const saveError = new StateManagementError(
        `Failed to save snapshot for agent ${snapshot.agentId}: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        filepath,
        'saveSnapshot'
      );
      this.logger.error(
        `Failed to save snapshot for agent ${snapshot.agentId}:`,
        saveError
      );
      throw saveError;
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

    let filepath: string;

    if (specific) {
      filepath = path.join(checkpointDir, specific);
    } else {
      filepath = path.join(checkpointDir, 'latest.json');
    }

    try {
      const data = await fs.readFile(filepath, 'utf-8');

      // Apply decryption if needed
      let processedData = data;
      if (this.config.encryptionEnabled) {
        processedData = await this.decryptData(processedData);
      }

      // Apply decompression if needed
      if (this.config.compressionEnabled) {
        processedData = await this.decompressData(processedData);
      }

      const snapshot = JSON.parse(processedData) as AgentStateSnapshot;

      this.logger.info(`Snapshot loaded for agent ${agentId}`, {
        agentId,
        metadata: {
          timestamp: snapshot.timestamp.toISOString(),
          type: snapshot.metadata.checkpointType,
        },
      });

      return snapshot;
    } catch (error) {
      if ((error as StateManagerError).code === 'ENOENT') {
        this.logger.warn(`No snapshot found for agent ${agentId}`);
        return null;
      }

      const loadError = new StateManagementError(
        `Failed to load snapshot for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        filepath,
        'loadSnapshot'
      );
      this.logger.error(
        `Failed to load snapshot for agent ${agentId}:`,
        loadError
      );
      throw loadError;
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
      void error;
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
      if ((error as StateManagerError).code === 'ENOENT') {
        return [];
      }
      const listError = new StateManagementError(
        `Failed to list checkpoints for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        checkpointDir,
        'listCheckpoints'
      );
      this.logger.error(
        `Failed to list checkpoints for agent ${agentId}:`,
        listError
      );
      throw listError;
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
      const deleteError = new StateManagementError(
        `Failed to delete checkpoints for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        specific ? path.join(checkpointDir, specific) : checkpointDir,
        'deleteCheckpoints'
      );
      this.logger.error(
        `Failed to delete checkpoints for agent ${agentId}:`,
        deleteError
      );
      throw deleteError;
    }
  }

  // Private helper methods

  private async getRecentMemories(agent: Agent): Promise<MemoryRecord[]> {
    try {
      const memories = await agent.memory.getRecent(agent.id, 20);
      return memories as MemoryRecord[];
    } catch (error) {
      this.logger.warn(
        `Failed to get recent memories for agent ${agent.id}: ${error instanceof Error ? error.message : String(error)}`,
        {
          agentId: agent.id,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        }
      );
      return [];
    }
  }

  private calculateIntegrity(snapshot: unknown): string {
    const hash = createHash('sha256');
    // Create a sorted JSON string for consistent hashing
    const sortedSnapshot = JSON.parse(JSON.stringify(snapshot));
    const sortedJson = JSON.stringify(
      sortedSnapshot,
      Object.keys(sortedSnapshot as object).sort()
    );
    hash.update(sortedJson);
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
        dependencies.push(
          `portal:${(portal as StatefulPortal).type || 'unknown'}`
        );
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
        error instanceof Error ? error : new Error(String(error)),
        {
          agentId,
          metadata: {
            operation: 'cleanupOldCheckpoints',
            checkpointDir: path.join(
              this.stateDirectory,
              agentId,
              'checkpoints'
            ),
          },
        }
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
        ...(typeof existingMetadata === 'object' && existingMetadata !== null
          ? existingMetadata
          : {}),
        ...(typeof metadata === 'object' && metadata !== null ? metadata : {}),
        lastUpdated: new Date(),
      };

      await fs.writeFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2)
      );
    } catch (error) {
      this.logger.error(
        `Failed to update metadata for agent ${agentId}:`,
        error instanceof Error ? error : new Error(String(error)),
        {
          agentId,
          metadata: {
            operation: 'updateMetadata',
            metadataPath: path.join(
              this.stateDirectory,
              agentId,
              'metadata.json'
            ),
          },
        }
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
        characterConfig: (lazyAgent.characterConfig ||
          {}) as unknown as CharacterConfig,
        agentConfig: lazyAgent.config,
        lastUpdate: new Date(),
        ...(lazyAgent.config.personality && {
          personality: Array.isArray(lazyAgent.config.personality)
            ? lazyAgent.config.personality.reduce(
                (acc, trait) => ({ ...acc, [trait]: true }),
                {} as Record<string, unknown>
              )
            : (lazyAgent.config.personality as Record<string, unknown>),
        }),
        ...(lazyAgent.config.goals && { goals: lazyAgent.config.goals }),
      },

      cognitive: {
        emotionState: state.emotionState,
        recentMemories: state.recentMemories,
        memories: [],
        emotions: (state.emotions || { currentEmotions: [] }) as Record<
          string,
          unknown
        >,
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

    this.logger.info(
      `Created lazy snapshot for agent ${lazyAgent.id} (size: ${JSON.stringify(snapshot).length} bytes)`
    );

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
      const saveError = new StateManagementError(
        `Failed to save lazy agent state for ${lazyAgent.id}: ${error instanceof Error ? error.message : String(error)}`,
        (error as StateManagerError).code,
        undefined,
        'saveLazyAgentState'
      );
      this.logger.error(
        `Failed to save lazy agent state for ${lazyAgent.id}:`,
        saveError
      );
      throw saveError;
    }
  }

  /**
   * Cleanup all timers and resources
   */
  cleanup(): void {
    this.checkpointTimers.forEach((timer, agentId) => {
      clearInterval(timer);
      this.logger.debug(`Cleared checkpoint timer for agent ${agentId}`);
    });
    this.checkpointTimers.clear();
    this.operationLocks.clear();
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
          memoryUsage: snapshot.resources.memoryUsage,
        };

        // Add optional properties if they exist
        if (snapshot.cognitive.emotions) {
          state.emotions = snapshot.cognitive
            .emotions as unknown as EmotionState;
        }

        this.logger.info(`Restored lazy agent state for ${lazyAgentId}`);
        return state;
      } catch (error) {
        if ((error as StateManagerError).code === 'ENOENT') {
          this.logger.info(`No saved state for lazy agent ${lazyAgentId}`);
          return null;
        }
        const restoreError = new StateManagementError(
          `Failed to restore lazy agent state for ${lazyAgentId}: ${error instanceof Error ? error.message : String(error)}`,
          (error as StateManagerError).code,
          latestPath,
          'restoreLazyAgentState'
        );
        throw restoreError;
      }
    } catch (error) {
      const restoreError =
        error instanceof StateManagementError
          ? error
          : new StateManagementError(
              `Failed to restore lazy agent state for ${lazyAgentId}: ${error instanceof Error ? error.message : String(error)}`,
              (error as StateManagerError).code,
              undefined,
              'restoreLazyAgentState'
            );
      this.logger.error(
        `Failed to restore lazy agent state for ${lazyAgentId}:`,
        restoreError
      );
      throw restoreError;
    }
  }

  /**
   * Compress data using gzip
   */
  private async compressData(data: string): Promise<string> {
    try {
      const gzipAsync = promisify(gzip);
      const compressed = await gzipAsync(Buffer.from(data, 'utf-8'));
      return compressed.toString('base64');
    } catch (error) {
      this.logger.error('Failed to compress data:', error);
      throw new Error(
        `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decompress data using gunzip
   */
  private async decompressData(data: string): Promise<string> {
    try {
      const gunzipAsync = promisify(gunzip);
      const buffer = Buffer.from(data, 'base64');
      const decompressed = await gunzipAsync(buffer);
      return decompressed.toString('utf-8');
    } catch (error) {
      this.logger.error('Failed to decompress data:', error);
      throw new Error(
        `Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypt data using AES-256-CBC
   */
  private async encryptData(data: string): Promise<string> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.getEncryptionKey();
      const iv = randomBytes(16);

      const cipher = createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf-8', 'hex');
      encrypted += cipher.final('hex');

      // Prepend IV to encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('Failed to encrypt data:', error);
      throw new Error(
        `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   */
  private async decryptData(data: string): Promise<string> {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.getEncryptionKey();

      // Extract IV and encrypted data
      const [ivHex, encryptedData] = data.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt data:', error);
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get encryption key from environment or generate a default one
   */
  private getEncryptionKey(): string {
    const envKey = process.env.STATE_ENCRYPTION_KEY;
    if (envKey) {
      return envKey;
    }

    // Generate a deterministic key based on the config directory
    // In production, you should use a proper key management system
    const baseKey = this.config.stateDirectory + 'default-encryption-salt';
    return createHash('sha256').update(baseKey).digest('hex').substring(0, 32);
  }
}
