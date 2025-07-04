/**
 * State Management System Index
 * Exports all state management components for the Agent Lifecycle Management system
 */

// Core state management
export * from '../state-manager.js'
export * from '../resource-manager.js'
export * from '../lifecycle-manager.js'
export * from '../checkpoint-system.js'
export * from '../state-recovery.js'
export * from '../concurrent-safety.js'

// Enhanced runtime
export * from '../enhanced-runtime.js'

// Re-export types and interfaces
export type {
  // StateManager types
  AgentStateSnapshot,
  CheckpointType,
  StateValidationResult,
  StateValidationReport,
  StateManagerConfig,
  
  // ResourceManager types
  ResourceHandle,
  ResourceType,
  ResourceManagerConfig,
  ResourceSnapshot,
  CleanupResult,
  ResourceHealthReport,
  
  // LifecycleManager types
  LifecyclePhase,
  LifecycleOperation,
  LifecycleConfig,
  ShutdownOptions,
  StartupOptions,
  
  // CheckpointSystem types
  CheckpointSchedule,
  CheckpointSystemConfig,
  CheckpointMetrics,
  CheckpointSystemStatus,
  CheckpointRunResult,
  
  // StateRecovery types
  RecoveryStrategy,
  StateCorruption,
  CorruptionType,
  CorruptionSeverity,
  RecoveryPlan,
  RecoveryResult,
  DependencyValidation,
  
  // ConcurrentSafety types
  OperationLock,
  LockRequest,
  DeadlockDetection,
  DeadlockResolution,
  OperationType,
  ConcurrentSafetyConfig,
  AgentLockStatus,
  ConcurrentSafetyStatus,
  
  // Enhanced runtime types
  EnhancedRuntimeConfig,
  AgentStateStatus,
  StateManagementStatus
} from '../state-manager.js'

// Constants and enums
export {
  ResourceType,
  LifecyclePhase,
  CheckpointType,
  CorruptionType,
  CorruptionSeverity,
  OperationType
} from '../resource-manager.js'

/**
 * State management system factory function
 * Creates a complete state management system with all components
 */
import { StateManager, StateManagerConfig } from '../state-manager.js'
import { ResourceManager, ResourceManagerConfig } from '../resource-manager.js'
import { LifecycleManager, LifecycleConfig } from '../lifecycle-manager.js'
import { CheckpointSystem, CheckpointSystemConfig } from '../checkpoint-system.js'
import { StateRecoverySystem } from '../state-recovery.js'
import { ConcurrentSafetyManager, ConcurrentSafetyConfig } from '../concurrent-safety.js'

export interface StateManagementSystemConfig {
  stateManager: StateManagerConfig
  resourceManager: ResourceManagerConfig
  lifecycleManager: LifecycleConfig
  checkpointSystem: CheckpointSystemConfig
  concurrentSafety: ConcurrentSafetyConfig
}

export interface StateManagementSystem {
  stateManager: StateManager
  resourceManager: ResourceManager
  lifecycleManager: LifecycleManager
  checkpointSystem: CheckpointSystem
  stateRecoverySystem: StateRecoverySystem
  concurrentSafetyManager: ConcurrentSafetyManager
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
    validationLevel: 'full'
  }
  
  const defaultResourceManagerConfig: ResourceManagerConfig = {
    maxResourcesPerAgent: 100,
    resourceTimeoutMs: 30 * 60 * 1000, // 30 minutes
    cleanupIntervalMs: 5 * 60 * 1000,  // 5 minutes
    trackMemoryUsage: true,
    enableResourceLogging: true
  }
  
  const defaultLifecycleConfig: LifecycleConfig = {
    shutdownTimeoutMs: 30000,
    startupTimeoutMs: 30000,
    enableCheckpoints: true,
    enableRollback: true,
    maxRetries: 3,
    validateStateOnStartup: true,
    cleanupOnShutdownFailure: true
  }
  
  const defaultCheckpointSystemConfig: CheckpointSystemConfig = {
    enableScheduledCheckpoints: true,
    defaultInterval: 5 * 60 * 1000, // 5 minutes
    maxFailures: 3,
    retryDelay: 60000,
    enableIncrementalCheckpoints: true,
    incrementalThreshold: 10,
    enableEventBasedCheckpoints: true,
    stateChangeThreshold: 5,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
  
  const defaultConcurrentSafetyConfig: ConcurrentSafetyConfig = {
    maxConcurrentOperations: 3,
    defaultLockTimeout: 30000,
    deadlockDetectionInterval: 10000,
    maxQueueSize: 10,
    enablePriorityQueue: true,
    enableDeadlockDetection: true
  }
  
  // Merge with provided configuration
  const stateManagerConfig = { ...defaultStateManagerConfig, ...baseConfig.stateManager }
  const resourceManagerConfig = { ...defaultResourceManagerConfig, ...baseConfig.resourceManager }
  const lifecycleConfig = { ...defaultLifecycleConfig, ...baseConfig.lifecycleManager }
  const checkpointSystemConfig = { ...defaultCheckpointSystemConfig, ...baseConfig.checkpointSystem }
  const concurrentSafetyConfig = { ...defaultConcurrentSafetyConfig, ...baseConfig.concurrentSafety }
  
  // Create components
  const stateManager = new StateManager(stateManagerConfig)
  const resourceManager = new ResourceManager(resourceManagerConfig)
  const concurrentSafetyManager = new ConcurrentSafetyManager(concurrentSafetyConfig)
  
  const lifecycleManager = new LifecycleManager(
    lifecycleConfig,
    stateManager,
    resourceManager
  )
  
  const checkpointSystem = new CheckpointSystem(
    checkpointSystemConfig,
    stateManager,
    resourceManager
  )
  
  const stateRecoverySystem = new StateRecoverySystem(
    stateManager,
    resourceManager
  )
  
  return {
    stateManager,
    resourceManager,
    lifecycleManager,
    checkpointSystem,
    stateRecoverySystem,
    concurrentSafetyManager
  }
}

/**
 * Initialize a complete state management system
 */
export async function initializeStateManagementSystem(
  system: StateManagementSystem
): Promise<void> {
  await system.stateManager.initialize()
  // Other components initialize automatically when needed
}

/**
 * Shutdown a complete state management system
 */
export async function shutdownStateManagementSystem(
  system: StateManagementSystem
): Promise<void> {
  await system.checkpointSystem.shutdown()
  await system.concurrentSafetyManager.shutdown()
  await system.resourceManager.shutdown()
  // StateManager and others don't require explicit shutdown
}