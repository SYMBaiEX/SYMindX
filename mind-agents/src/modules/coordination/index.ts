/**
 * Coordination Module - Main Export
 * 
 * Exports all public APIs and functionality of the coordination module.
 */

// Core coordination logic
export { createCoordinationModule, SYMindXOrchestrator } from './logic/coordination-core.js'
export { SYMindXTaskDelegation } from './logic/task-delegation.js'
export { SYMindXCommunication } from './logic/communication.js'
export { SYMindXConflictResolver } from './logic/conflict-resolver.js'
export { SYMindXResourceManager } from './logic/resource-manager.js'

// Coordination skills
export { 
  SYMindXCoordinationDecisionSkill,
  type CoordinationDecisionSkill 
} from './skills/coordination-decision.skill.js'
export { 
  SYMindXGroupSynchronySkill,
  type GroupSynchronySkill,
  type SynchronyRhythm,
  type CoherenceMetrics,
  type EmergentBehavior
} from './skills/group-synchrony.skill.js'

// Utility functions
export {
  HierarchyUtils,
  TaskUtils,
  ResourceUtils,
  PerformanceUtils
} from './lib/coordination-utils.js'

// Formatting utilities
export {
  TaskFormatter,
  AgentFormatter,
  ResourceFormatter,
  HierarchyFormatter,
  MetricsFormatter,
  GeneralFormatter
} from './lib/format.js'

// Constants
export {
  DEFAULT_COORDINATION_CONFIG,
  TASK_PRIORITIES,
  STANDARD_CAPABILITIES,
  MESSAGE_TYPES,
  RESOURCE_TYPES,
  SYNC_PATTERNS,
  CONFLICT_STRATEGIES,
  ASSIGNMENT_STRATEGIES,
  PERFORMANCE_THRESHOLDS,
  ERROR_CODES,
  ERROR_MESSAGES,
  METRIC_INTERVALS,
  AGENT_STATES,
  GROUP_STATES,
  EMERGENT_BEHAVIORS,
  VALIDATION_RULES,
  DEFAULT_ROLES
} from './lib/constants.js'

// Types and interfaces
export type {
  CoordinationModule,
  AgentOrchestrator,
  DelegationCriteria,
  ConflictResolver,
  ResourceManager,
  ResourceStatus,
  CoordinationConfig,
  CoordinationSkillConfig,
  TaskAssignmentStrategy,
  ResourceAllocationStrategy,
  
  // Re-exported from MCP client
  AgentHierarchy,
  AgentRole,
  TaskDelegationSystem,
  Task,
  TaskResult,
  TaskStatus,
  CommunicationProtocol,
  AgentMessage,
  AgentFilter,
  MessageHandler
} from './types.js'

// Utility types
export type {
  HierarchyValidationResult,
  CompatibilityResult,
  ResourceConstraints,
  ResourceAllocationPlan,
  ResourceConflict,
  AgentEfficiencyMetrics,
  CoordinationBenchmark
} from './lib/coordination-utils.js'

/**
 * Factory function to create a complete coordination module with default configuration.
 * This is the main entry point for using the coordination system.
 * 
 * @param config Optional configuration overrides
 * @returns Complete coordination module instance
 */
export async function createDefaultCoordinationModule(config?: Partial<CoordinationConfig>): Promise<CoordinationModule> {
  return await createCoordinationModule({
    maxAgentsPerOrchestrator: 50,
    maxTasksPerAgent: 5,
    messageHistorySize: 1000,
    defaultTaskTimeout: 30000,
    resourceAllocationTimeout: 10000,
    ...config
  })
}

/**
 * Utility function to validate coordination module configuration.
 * 
 * @param config Configuration to validate
 * @returns Validation result with errors and warnings
 */
export function validateCoordinationConfig(config: CoordinationConfig): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (config.maxAgentsPerOrchestrator !== undefined) {
    if (config.maxAgentsPerOrchestrator < 1) {
      errors.push('maxAgentsPerOrchestrator must be at least 1')
    } else if (config.maxAgentsPerOrchestrator > 1000) {
      warnings.push('maxAgentsPerOrchestrator is very high, consider performance implications')
    }
  }

  if (config.maxTasksPerAgent !== undefined) {
    if (config.maxTasksPerAgent < 1) {
      errors.push('maxTasksPerAgent must be at least 1')
    } else if (config.maxTasksPerAgent > 50) {
      warnings.push('maxTasksPerAgent is very high, may impact agent performance')
    }
  }

  if (config.messageHistorySize !== undefined) {
    if (config.messageHistorySize < 10) {
      warnings.push('messageHistorySize is very low, may impact coordination effectiveness')
    } else if (config.messageHistorySize > 10000) {
      warnings.push('messageHistorySize is very high, may impact memory usage')
    }
  }

  if (config.defaultTaskTimeout !== undefined) {
    if (config.defaultTaskTimeout < 1000) {
      warnings.push('defaultTaskTimeout is very low, tasks may timeout prematurely')
    } else if (config.defaultTaskTimeout > 300000) {
      warnings.push('defaultTaskTimeout is very high, may mask performance issues')
    }
  }

  if (config.resourceAllocationTimeout !== undefined) {
    if (config.resourceAllocationTimeout < 100) {
      errors.push('resourceAllocationTimeout must be at least 100ms')
    } else if (config.resourceAllocationTimeout > 60000) {
      warnings.push('resourceAllocationTimeout is very high, may impact responsiveness')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Create a coordination module with built-in validation and error handling.
 * 
 * @param config Configuration for the coordination module
 * @returns Coordination module instance or throws error if config invalid
 */
export async function createValidatedCoordinationModule(config: CoordinationConfig): Promise<CoordinationModule> {
  const validation = validateCoordinationConfig(config)
  
  if (!validation.isValid) {
    throw new Error(`Invalid coordination configuration: ${validation.errors.join(', ')}`)
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Coordination configuration warnings:', validation.warnings)
  }
  
  return await createCoordinationModule(config)
}

/**
 * Helper function to create a coordination module with sensible defaults for different use cases.
 * 
 * @param preset Preset configuration name
 * @param overrides Optional configuration overrides
 * @returns Coordination module instance
 */
export async function createCoordinationModuleFromPreset(
  preset: 'small' | 'medium' | 'large' | 'enterprise',
  overrides?: Partial<CoordinationConfig>
): Promise<CoordinationModule> {
  const presets: Record<string, CoordinationConfig> = {
    small: {
      maxAgentsPerOrchestrator: 10,
      maxTasksPerAgent: 3,
      messageHistorySize: 500,
      defaultTaskTimeout: 15000,
      resourceAllocationTimeout: 5000
    },
    medium: {
      maxAgentsPerOrchestrator: 25,
      maxTasksPerAgent: 5,
      messageHistorySize: 1000,
      defaultTaskTimeout: 30000,
      resourceAllocationTimeout: 10000
    },
    large: {
      maxAgentsPerOrchestrator: 50,
      maxTasksPerAgent: 8,
      messageHistorySize: 2000,
      defaultTaskTimeout: 45000,
      resourceAllocationTimeout: 15000
    },
    enterprise: {
      maxAgentsPerOrchestrator: 100,
      maxTasksPerAgent: 10,
      messageHistorySize: 5000,
      defaultTaskTimeout: 60000,
      resourceAllocationTimeout: 20000
    }
  }

  const config = { ...presets[preset], ...overrides }
  return await createValidatedCoordinationModule(config)
}