/**
 * State Management System Index
 * Exports all state management components for the Agent Lifecycle Management system
 */

// Core state management
export * from '../state-manager';
export * from '../resource-manager';
export * from '../lifecycle-manager';
export * from '../checkpoint-system';
export * from '../state-recovery';
export * from '../concurrent-safety';

// Enhanced runtime - archived (use main runtime.ts instead)

// Re-export types and interfaces from state-manager
export type {
  AgentStateSnapshot,
  StateValidationResult,
  StateValidationReport,
  StateManagerConfig,
} from '../state-manager';

export type {
  ResourceHandle,
  ResourceSnapshot,
  ResourceManagerConfig,
} from '../resource-manager';

export type {
  // LifecycleManager types
  LifecycleOperation,
  LifecycleConfig,
  ShutdownOptions,
  StartupOptions,
} from '../lifecycle-manager';

// Note: Many types commented out as they may not exist in the actual files
// Re-add as needed when the files are implemented

// Constants and enums
export { ResourceType } from '../resource-manager';
export { CheckpointType } from '../state-manager';
export { LifecyclePhase } from '../lifecycle-manager';

/**
 * State management system factory function
 * Creates a complete state management system with all components
 */
import { CheckpointSystem, CheckpointSystemConfig } from '../checkpoint-system';
import {
  ConcurrentSafetyManager,
  ConcurrentSafetyConfig,
} from '../concurrent-safety';
import { LifecycleManager, LifecycleConfig } from '../lifecycle-manager';
import { ResourceManager, ResourceManagerConfig } from '../resource-manager';
import { StateManager, StateManagerConfig } from '../state-manager';
import { StateRecoverySystem } from '../state-recovery';

export interface StateManagementSystemConfig {
  stateManager: StateManagerConfig;
  resourceManager: ResourceManagerConfig;
  lifecycleManager: LifecycleConfig;
  checkpointSystem: CheckpointSystemConfig;
  concurrentSafety: ConcurrentSafetyConfig;
}

export interface StateManagementSystem {
  stateManager: StateManager;
  resourceManager: ResourceManager;
  lifecycleManager: LifecycleManager;
  checkpointSystem: CheckpointSystem;
  stateRecoverySystem: StateRecoverySystem;
  concurrentSafetyManager: ConcurrentSafetyManager;
}

/**
 * Create a complete state management system with default configuration
 */
export function createStateManagementSystem(
  baseConfig: Partial<StateManagementSystemConfig> = {}
): StateManagementSystem {
  // Default configurations
  const defaultStateManagerConfig: StateManagerConfig = {
    stateDirectory: './data/agent-states',
    maxCheckpoints: 20,
    checkpointInterval: 5 * 60 * 1000, // 5 minutes
    compressionEnabled: false,
    encryptionEnabled: false,
    validationLevel: 'full',
  };

  const defaultResourceManagerConfig: ResourceManagerConfig = {
    maxResourcesPerAgent: 100,
    resourceTimeoutMs: 30 * 60 * 1000, // 30 minutes
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    trackMemoryUsage: true,
    enableResourceLogging: true,
  };

  const defaultLifecycleConfig: LifecycleConfig = {
    shutdownTimeoutMs: 30000,
    startupTimeoutMs: 30000,
    enableCheckpoints: true,
    enableRollback: true,
    maxRetries: 3,
    validateStateOnStartup: true,
    cleanupOnShutdownFailure: true,
  };

  const defaultCheckpointSystemConfig: CheckpointSystemConfig = {
    enableScheduledCheckpoints: true,
    defaultInterval: 5 * 60 * 1000, // 5 minutes
    maxFailures: 3,
    retryDelay: 60000,
    enableIncrementalCheckpoints: true,
    incrementalThreshold: 10,
    enableEventBasedCheckpoints: true,
    stateChangeThreshold: 5,
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  const defaultConcurrentSafetyConfig: ConcurrentSafetyConfig = {
    maxConcurrentOperations: 3,
    defaultLockTimeout: 30000,
    deadlockDetectionInterval: 10000,
    maxQueueSize: 10,
    enablePriorityQueue: true,
    enableDeadlockDetection: true,
  };

  // Merge with provided configuration
  const stateManagerConfig = {
    ...defaultStateManagerConfig,
    ...baseConfig.stateManager,
  };
  const resourceManagerConfig = {
    ...defaultResourceManagerConfig,
    ...baseConfig.resourceManager,
  };
  const lifecycleConfig = {
    ...defaultLifecycleConfig,
    ...baseConfig.lifecycleManager,
  };
  const checkpointSystemConfig = {
    ...defaultCheckpointSystemConfig,
    ...baseConfig.checkpointSystem,
  };
  const concurrentSafetyConfig = {
    ...defaultConcurrentSafetyConfig,
    ...baseConfig.concurrentSafety,
  };

  // Create components
  const stateManager = new StateManager(stateManagerConfig);
  const resourceManager = new ResourceManager(resourceManagerConfig);
  const concurrentSafetyManager = new ConcurrentSafetyManager(
    concurrentSafetyConfig
  );

  const lifecycleManager = new LifecycleManager(
    lifecycleConfig,
    stateManager,
    resourceManager
  );

  const checkpointSystem = new CheckpointSystem(
    checkpointSystemConfig,
    stateManager,
    resourceManager
  );

  const stateRecoverySystem = new StateRecoverySystem(
    stateManager,
    resourceManager
  );

  return {
    stateManager,
    resourceManager,
    lifecycleManager,
    checkpointSystem,
    stateRecoverySystem,
    concurrentSafetyManager,
  };
}

/**
 * Initialize a complete state management system
 */
export async function initializeStateManagementSystem(
  system: StateManagementSystem
): Promise<void> {
  await system.stateManager.initialize();
  // Other components initialize automatically when needed
}

/**
 * Shutdown a complete state management system
 */
export async function shutdownStateManagementSystem(
  system: StateManagementSystem
): Promise<void> {
  await system.checkpointSystem.shutdown();
  await system.concurrentSafetyManager.shutdown();
  await system.resourceManager.shutdown();
  // StateManager and others don't require explicit shutdown
}
