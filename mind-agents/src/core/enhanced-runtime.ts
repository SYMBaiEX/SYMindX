/**
 * Enhanced Runtime with State Management Integration
 * Extends the existing SYMindXRuntime with robust lifecycle management
 */

import * as path from 'path';

import {
  Agent,
  LazyAgent,
  AgentStatus,
  LazyAgentState,
  RuntimeConfig,
} from '../types/agent';
import { Logger, runtimeLogger } from '../utils/logger';

import { CheckpointSystem, CheckpointSystemConfig } from './checkpoint-system';
import {
  ConcurrentSafetyManager,
  ConcurrentSafetyConfig,
  OperationType,
} from './concurrent-safety';
import {
  LifecycleManager,
  LifecycleConfig,
  ShutdownOptions,
  StartupOptions,
} from './lifecycle-manager';
import {
  ResourceManager,
  ResourceManagerConfig,
  ResourceType,
} from './resource-manager';
import { SYMindXRuntime } from './runtime';
import {
  StateManager,
  StateManagerConfig,
  CheckpointType,
} from './state-manager';
import { StateRecoverySystem } from './state-recovery';

export interface EnhancedRuntimeConfig extends RuntimeConfig {
  stateManagement: {
    enabled: boolean;
    stateDirectory: string;
    enableCheckpoints: boolean;
    checkpointInterval: number;
    maxCheckpoints: number;
    enableStateRecovery: boolean;
    enableConcurrentSafety: boolean;
    enableAutoCleanup: boolean;
  };
}

export class EnhancedSYMindXRuntime extends SYMindXRuntime {
  // State management components
  private stateManager?: StateManager;
  private resourceManager?: ResourceManager;
  private lifecycleManager?: LifecycleManager;
  private checkpointSystem?: CheckpointSystem;
  private stateRecoverySystem?: StateRecoverySystem;
  private concurrentSafetyManager?: ConcurrentSafetyManager;

  private enhancedConfig: EnhancedRuntimeConfig;
  private stateManagementEnabled = false;

  constructor(config: EnhancedRuntimeConfig) {
    super(config);
    this.enhancedConfig = config;

    if (config.stateManagement?.enabled) {
      this.initializeStateManagement();
    }
  }

  /**
   * Enhanced initialization with state management
   */
  override async initialize(): Promise<void> {
    await super.initialize();

    if (this.stateManagementEnabled) {
      runtimeLogger.info('🔄 Initializing state management system...');

      if (this.stateManager) {
        await this.stateManager.initialize();
      }

      runtimeLogger.success('✅ State management system initialized');
    }
  }

  /**
   * Enhanced start with state management
   */
  override async start(): Promise<void> {
    if (this.stateManagementEnabled && this.checkpointSystem) {
      // Check for existing agent states to restore
      await this.restoreAgentsFromState();
    }

    await super.start();

    if (this.stateManagementEnabled) {
      // Start checkpoint system
      if (this.checkpointSystem) {
        this.startAutomaticCheckpoints();
      }
    }
  }

  /**
   * Enhanced stop with graceful shutdown
   */
  override async stop(): Promise<void> {
    if (this.stateManagementEnabled) {
      runtimeLogger.info('🛑 Performing graceful runtime shutdown...');

      // Create final checkpoints for all active agents
      await this.createFinalCheckpoints();

      // Shutdown state management systems
      await this.shutdownStateManagement();
    }

    await super.stop();
  }

  /**
   * Enhanced agent activation with state restoration
   */
  override async activateAgent(agentId: string): Promise<Agent> {
    if (!this.stateManagementEnabled) {
      return super.activateAgent(agentId);
    }

    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw new Error(`Lazy agent ${agentId} not found`);
    }

    // Use lifecycle manager for robust startup
    if (this.lifecycleManager) {
      const startupOptions: StartupOptions = {
        restoreFromCheckpoint: true,
        validateState: true,
        fallbackToDefaults: true,
      };

      return await this.lifecycleManager.robustStartup(
        lazyAgent,
        startupOptions
      );
    }

    return super.activateAgent(agentId);
  }

  /**
   * Enhanced agent deactivation with state preservation
   */
  override async deactivateAgent(agentId: string): Promise<void> {
    if (!this.stateManagementEnabled) {
      return super.deactivateAgent(agentId);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    // Use lifecycle manager for graceful shutdown
    if (this.lifecycleManager) {
      const shutdownOptions: ShutdownOptions = {
        createCheckpoint: true,
        checkpointType: CheckpointType.FULL,
        saveMemories: true,
      };

      await this.lifecycleManager.gracefulShutdown(agent, shutdownOptions);

      // Update lazy agent state
      const lazyAgent = this.lazyAgents.get(agentId);
      if (lazyAgent) {
        lazyAgent.state = LazyAgentState.UNLOADED;
        lazyAgent.agent = undefined;
      }

      // Remove from active agents
      this.agents.delete(agentId);

      return;
    }

    return super.deactivateAgent(agentId);
  }

  /**
   * Create manual checkpoint for an agent
   */
  async createAgentCheckpoint(
    agentId: string,
    type: CheckpointType = CheckpointType.FULL
  ): Promise<string> {
    if (!this.stateManagementEnabled || !this.checkpointSystem) {
      throw new Error('State management not enabled');
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found or not active`);
    }

    return await this.checkpointSystem.createCheckpoint(
      agent,
      type,
      'manual_request'
    );
  }

  /**
   * Restore agent from specific checkpoint
   */
  async restoreAgentFromCheckpoint(
    agentId: string,
    checkpointFile?: string
  ): Promise<Agent> {
    if (!this.stateManagementEnabled || !this.lifecycleManager) {
      throw new Error('State management not enabled');
    }

    const lazyAgent = this.lazyAgents.get(agentId);
    if (!lazyAgent) {
      throw new Error(`Lazy agent ${agentId} not found`);
    }

    // Deactivate if currently active
    if (this.agents.has(agentId)) {
      await this.deactivateAgent(agentId);
    }

    const startupOptions: StartupOptions = {
      restoreFromCheckpoint: true,
      specificCheckpoint: checkpointFile,
      validateState: true,
    };

    return await this.lifecycleManager.robustStartup(lazyAgent, startupOptions);
  }

  /**
   * Get agent state management status
   */
  getAgentStateStatus(agentId: string): AgentStateStatus {
    if (!this.stateManagementEnabled) {
      return { enabled: false };
    }

    const resourceSnapshot =
      this.resourceManager?.getAgentResourceSnapshot(agentId);
    const lockStatus =
      this.concurrentSafetyManager?.getAgentLockStatus(agentId);
    const checkpointMetrics = this.checkpointSystem?.getMetrics(agentId);

    return {
      enabled: true,
      resourceSnapshot,
      lockStatus,
      checkpointMetrics,
      lastCheckpoint: checkpointMetrics?.lastCheckpointSize
        ? new Date()
        : undefined,
    };
  }

  /**
   * Get comprehensive state management status
   */
  getStateManagementStatus(): StateManagementStatus {
    if (!this.stateManagementEnabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      stateDirectory: this.enhancedConfig.stateManagement.stateDirectory,
      checkpointSystem: this.checkpointSystem?.getSystemStatus(),
      resourceManager: this.resourceManager?.getHealthReport(),
      concurrentSafety: this.concurrentSafetyManager?.getSafetyStatus(),
      activeOperations: this.lifecycleManager?.getActiveOperations() || [],
    };
  }

  /**
   * Perform emergency cleanup for an agent
   */
  async emergencyCleanupAgent(agentId: string): Promise<void> {
    runtimeLogger.warn(`🚨 Performing emergency cleanup for agent ${agentId}`);

    try {
      // Force release any locks
      if (this.concurrentSafetyManager) {
        await this.concurrentSafetyManager.forceReleaseAgentLocks(agentId);
      }

      // Cleanup resources
      if (this.resourceManager) {
        await this.resourceManager.cleanupAgentResources(agentId);
      }

      // Remove from active agents
      this.agents.delete(agentId);

      // Update lazy agent state
      const lazyAgent = this.lazyAgents.get(agentId);
      if (lazyAgent) {
        lazyAgent.state = LazyAgentState.ERROR;
        lazyAgent.agent = undefined;
      }

      runtimeLogger.info(`✅ Emergency cleanup completed for agent ${agentId}`);
    } catch (error) {
      runtimeLogger.error(
        `❌ Emergency cleanup failed for agent ${agentId}:`,
        error
      );
      throw error;
    }
  }

  // Private methods

  private initializeStateManagement(): void {
    const config = this.enhancedConfig.stateManagement;

    try {
      // Initialize StateManager
      const stateManagerConfig: StateManagerConfig = {
        stateDirectory: config.stateDirectory,
        maxCheckpoints: config.maxCheckpoints,
        checkpointInterval: config.checkpointInterval,
        compressionEnabled: false,
        encryptionEnabled: false,
        validationLevel: 'full',
      };
      this.stateManager = new StateManager(stateManagerConfig);

      // Initialize ResourceManager
      const resourceManagerConfig: ResourceManagerConfig = {
        maxResourcesPerAgent: 100,
        resourceTimeoutMs: 30 * 60 * 1000, // 30 minutes
        cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
        trackMemoryUsage: true,
        enableResourceLogging: true,
      };
      this.resourceManager = new ResourceManager(resourceManagerConfig);

      // Initialize ConcurrentSafetyManager
      if (config.enableConcurrentSafety !== false) {
        const concurrentSafetyConfig: ConcurrentSafetyConfig = {
          maxConcurrentOperations: 3,
          defaultLockTimeout: 30000,
          deadlockDetectionInterval: 10000,
          maxQueueSize: 10,
          enablePriorityQueue: true,
          enableDeadlockDetection: true,
        };
        this.concurrentSafetyManager = new ConcurrentSafetyManager(
          concurrentSafetyConfig
        );
      }

      // Initialize LifecycleManager
      const lifecycleConfig: LifecycleConfig = {
        shutdownTimeoutMs: 30000,
        startupTimeoutMs: 30000,
        enableCheckpoints: config.enableCheckpoints,
        enableRollback: true,
        maxRetries: 3,
        validateStateOnStartup: true,
        cleanupOnShutdownFailure: true,
      };
      this.lifecycleManager = new LifecycleManager(
        lifecycleConfig,
        this.stateManager,
        this.resourceManager
      );

      // Initialize CheckpointSystem
      if (config.enableCheckpoints) {
        const checkpointSystemConfig: CheckpointSystemConfig = {
          enableScheduledCheckpoints: true,
          defaultInterval: config.checkpointInterval,
          maxFailures: 3,
          retryDelay: 60000,
          enableIncrementalCheckpoints: true,
          incrementalThreshold: 10,
          enableEventBasedCheckpoints: true,
          stateChangeThreshold: 5,
          cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        };
        this.checkpointSystem = new CheckpointSystem(
          checkpointSystemConfig,
          this.stateManager,
          this.resourceManager
        );
      }

      // Initialize StateRecoverySystem
      if (config.enableStateRecovery !== false) {
        this.stateRecoverySystem = new StateRecoverySystem(
          this.stateManager,
          this.resourceManager
        );
      }

      this.stateManagementEnabled = true;
      runtimeLogger.info('🔄 State management components initialized');
    } catch (error) {
      runtimeLogger.error('❌ Failed to initialize state management:', error);
      this.stateManagementEnabled = false;
    }
  }

  private async restoreAgentsFromState(): Promise<void> {
    if (!this.stateManager) return;

    try {
      // Look for existing state files
      // This would scan the state directory for agent snapshots
      runtimeLogger.info('🔍 Checking for existing agent states to restore...');

      // Implementation would scan state directory and restore agents
      // For now, this is a placeholder
    } catch (error) {
      runtimeLogger.error('❌ Failed to restore agents from state:', error);
    }
  }

  private startAutomaticCheckpoints(): void {
    if (!this.checkpointSystem) return;

    // Schedule checkpoints for all active agents
    for (const [agentId, agent] of this.agents) {
      this.checkpointSystem.scheduleCheckpoints(agentId);
      this.checkpointSystem.monitorAgent(agent);
    }

    runtimeLogger.info('📅 Automatic checkpoints started for active agents');
  }

  private async createFinalCheckpoints(): Promise<void> {
    if (!this.checkpointSystem) return;

    runtimeLogger.info('💾 Creating final checkpoints for active agents...');

    const checkpointPromises = Array.from(this.agents.values()).map(
      async (agent) => {
        try {
          await this.checkpointSystem!.createCheckpoint(
            agent,
            CheckpointType.FULL,
            'runtime_shutdown'
          );
        } catch (error) {
          runtimeLogger.error(
            `Failed to create final checkpoint for agent ${agent.id}:`,
            error
          );
        }
      }
    );

    await Promise.allSettled(checkpointPromises);
    runtimeLogger.info('✅ Final checkpoints completed');
  }

  private async shutdownStateManagement(): Promise<void> {
    runtimeLogger.info('🛑 Shutting down state management systems...');

    try {
      if (this.checkpointSystem) {
        await this.checkpointSystem.shutdown();
      }

      if (this.concurrentSafetyManager) {
        await this.concurrentSafetyManager.shutdown();
      }

      if (this.resourceManager) {
        await this.resourceManager.shutdown();
      }

      runtimeLogger.success('✅ State management systems shutdown complete');
    } catch (error) {
      runtimeLogger.error('❌ Error during state management shutdown:', error);
    }
  }
}

// Type definitions

export interface AgentStateStatus {
  enabled: boolean;
  resourceSnapshot?: any;
  lockStatus?: any;
  checkpointMetrics?: any;
  lastCheckpoint?: Date;
}

export interface StateManagementStatus {
  enabled: boolean;
  stateDirectory?: string;
  checkpointSystem?: any;
  resourceManager?: any;
  concurrentSafety?: any;
  activeOperations?: any[];
}
