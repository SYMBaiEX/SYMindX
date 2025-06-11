/**
 * Centralized enums and constants for SYMindX
 * This file provides all the enums used throughout the system
 */

// Re-export all enums from agent.ts for convenience
export {
  AgentStatus,
  ActionStatus,
  ActionResultType,
  ActionCategory,
  EventType,
  EventSource,
  MemoryType,
  MemoryDuration,
  MemoryProviderType,
  EmotionModuleType,
  CognitionModuleType,
  ExtensionType,
  ExtensionStatus,
  PlanStatus,
  PlanStepStatus,
  EnvironmentType,
  LogLevel
} from './agent.js'

// Re-export portal enums
export {
  PortalType,
  PortalStatus,
  ModelType,
  ConfigurationLevel
} from './portal.js'

// Emotion-related enums (defined in agent.ts)
// EmotionModuleType is already exported above

// Additional utility types
export type RuntimeStatus = 'initializing' | 'running' | 'stopping' | 'stopped' | 'error'

export type ModuleStatus = 'loaded' | 'unloaded' | 'error' | 'initializing'

export type FactoryStatus = 'registered' | 'unregistered' | 'error'

// Common result types
export interface BaseResult {
  success: boolean
  message?: string
  timestamp: Date
}

export interface ErrorResult extends BaseResult {
  success: false
  error: string
  code?: string
}

export interface SuccessResult<T = unknown> extends BaseResult {
  success: true
  data?: T
}

export type Result<T = unknown> = SuccessResult<T> | ErrorResult