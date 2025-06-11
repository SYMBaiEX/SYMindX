/**
 * Coordination Module Constants
 */

// Default configuration values
export const DEFAULT_COORDINATION_CONFIG = {
  maxAgentsPerOrchestrator: 50,
  maxTasksPerAgent: 5,
  messageHistorySize: 1000,
  defaultTaskTimeout: 30000, // 30 seconds
  resourceAllocationTimeout: 10000, // 10 seconds
  maxResourcesPerAgent: 3,
  synchronizationTimeout: 5000, // 5 seconds
  heartbeatInterval: 2000, // 2 seconds
  metricsUpdateInterval: 10000, // 10 seconds
} as const

// Task priority levels
export const TASK_PRIORITIES = {
  CRITICAL: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
  BACKGROUND: 0.1
} as const

// Agent role capabilities
export const STANDARD_CAPABILITIES = {
  // Core capabilities
  TASK_EXECUTION: 'task_execution',
  RESOURCE_MANAGEMENT: 'resource_management',
  COMMUNICATION: 'communication',
  COORDINATION: 'coordination',
  MONITORING: 'monitoring',
  
  // Specialized capabilities
  DATA_PROCESSING: 'data_processing',
  ANALYSIS: 'analysis',
  DECISION_MAKING: 'decision_making',
  CONFLICT_RESOLUTION: 'conflict_resolution',
  PLANNING: 'planning',
  
  // Advanced capabilities
  MACHINE_LEARNING: 'machine_learning',
  NATURAL_LANGUAGE: 'natural_language',
  AUTOMATION: 'automation',
  OPTIMIZATION: 'optimization',
  SECURITY: 'security'
} as const

// Message types for inter-agent communication
export const MESSAGE_TYPES = {
  // Coordination messages
  TASK_ASSIGNMENT: 'task_assignment',
  TASK_COMPLETION: 'task_completion',
  TASK_FAILURE: 'task_failure',
  RESOURCE_REQUEST: 'resource_request',
  RESOURCE_ALLOCATION: 'resource_allocation',
  RESOURCE_RELEASE: 'resource_release',
  
  // Synchronization messages
  SYNC_REQUEST: 'sync_request',
  SYNC_RESPONSE: 'sync_response',
  HEARTBEAT: 'heartbeat',
  STATUS_UPDATE: 'status_update',
  
  // Group coordination
  GROUP_JOIN: 'group_join',
  GROUP_LEAVE: 'group_leave',
  GROUP_SYNC: 'group_sync',
  RHYTHM_UPDATE: 'rhythm_update',
  
  // Conflict resolution
  CONFLICT_DETECTED: 'conflict_detected',
  CONFLICT_RESOLUTION: 'conflict_resolution',
  PRIORITY_CHANGE: 'priority_change',
  
  // System messages
  SYSTEM_ALERT: 'system_alert',
  METRICS_UPDATE: 'metrics_update',
  CONFIGURATION_CHANGE: 'configuration_change'
} as const

// Resource types
export const RESOURCE_TYPES = {
  // Computational resources
  CPU: 'cpu',
  MEMORY: 'memory',
  STORAGE: 'storage',
  NETWORK: 'network',
  
  // Data resources
  DATABASE: 'database',
  CACHE: 'cache',
  FILE_SYSTEM: 'file_system',
  API_ENDPOINT: 'api_endpoint',
  
  // Service resources
  SERVICE: 'service',
  WORKER: 'worker',
  QUEUE: 'queue',
  LOCK: 'lock',
  
  // External resources
  EXTERNAL_API: 'external_api',
  DEVICE: 'device',
  SENSOR: 'sensor',
  ACTUATOR: 'actuator'
} as const

// Synchronization patterns
export const SYNC_PATTERNS = {
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  WAVE: 'wave',
  HEARTBEAT: 'heartbeat',
  CUSTOM: 'custom'
} as const

// Conflict resolution strategies
export const CONFLICT_STRATEGIES = {
  PRIORITY_BASED: 'priority_based',
  FAIRNESS_BASED: 'fairness_based',
  CAPABILITY_BASED: 'capability_based',
  LOAD_BASED: 'load_based',
  RANDOM: 'random'
} as const

// Task assignment strategies
export const ASSIGNMENT_STRATEGIES = {
  CAPABILITY_BASED: 'capability_based',
  LOAD_BALANCED: 'load_balanced',
  PRIORITY_BASED: 'priority_based',
  HYBRID: 'hybrid',
  ROUND_ROBIN: 'round_robin'
} as const

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  EFFICIENCY: {
    EXCELLENT: 0.9,
    GOOD: 0.7,
    ACCEPTABLE: 0.5,
    POOR: 0.3
  },
  RESPONSE_TIME: {
    FAST: 100, // milliseconds
    ACCEPTABLE: 500,
    SLOW: 1000,
    UNACCEPTABLE: 5000
  },
  CONFLICT_RATE: {
    LOW: 0.05,
    MODERATE: 0.15,
    HIGH: 0.3,
    CRITICAL: 0.5
  },
  SYNCHRONIZATION: {
    TIGHT: 0.95,
    GOOD: 0.8,
    LOOSE: 0.6,
    POOR: 0.4
  }
} as const

// Error codes and messages
export const ERROR_CODES = {
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',
  RESOURCE_NOT_AVAILABLE: 'RESOURCE_NOT_AVAILABLE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  TIMEOUT_EXCEEDED: 'TIMEOUT_EXCEEDED',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  SYNCHRONIZATION_FAILED: 'SYNCHRONIZATION_FAILED',
  CONFLICT_UNRESOLVED: 'CONFLICT_UNRESOLVED',
  HIERARCHY_INVALID: 'HIERARCHY_INVALID'
} as const

export const ERROR_MESSAGES = {
  [ERROR_CODES.AGENT_NOT_FOUND]: 'The specified agent could not be found',
  [ERROR_CODES.TASK_NOT_FOUND]: 'The specified task could not be found',
  [ERROR_CODES.RESOURCE_NOT_AVAILABLE]: 'The requested resource is not available',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Agent does not have sufficient permissions',
  [ERROR_CODES.TIMEOUT_EXCEEDED]: 'Operation timed out',
  [ERROR_CODES.CAPACITY_EXCEEDED]: 'Maximum capacity has been exceeded',
  [ERROR_CODES.INVALID_CONFIGURATION]: 'Invalid configuration provided',
  [ERROR_CODES.SYNCHRONIZATION_FAILED]: 'Agent synchronization failed',
  [ERROR_CODES.CONFLICT_UNRESOLVED]: 'Unable to resolve conflict',
  [ERROR_CODES.HIERARCHY_INVALID]: 'Agent hierarchy is invalid'
} as const

// Metric collection intervals
export const METRIC_INTERVALS = {
  REAL_TIME: 1000, // 1 second
  FREQUENT: 5000, // 5 seconds
  NORMAL: 30000, // 30 seconds
  PERIODIC: 300000, // 5 minutes
  HOURLY: 3600000 // 1 hour
} as const

// Agent states
export const AGENT_STATES = {
  IDLE: 'idle',
  BUSY: 'busy',
  WAITING: 'waiting',
  BLOCKED: 'blocked',
  ERROR: 'error',
  OFFLINE: 'offline'
} as const

// Group coordination states
export const GROUP_STATES = {
  FORMING: 'forming',
  ACTIVE: 'active',
  SYNCHRONIZED: 'synchronized',
  DISRUPTED: 'disrupted',
  DISSOLVING: 'dissolving'
} as const

// Emergent behavior types
export const EMERGENT_BEHAVIORS = {
  // Positive behaviors
  COOPERATION: 'cooperation',
  SYNCHRONIZATION: 'synchronization',
  EFFICIENCY_GAIN: 'efficiency_gain',
  LOAD_BALANCING: 'load_balancing',
  
  // Negative behaviors
  DEADLOCK: 'deadlock',
  THRASHING: 'thrashing',
  CASCADE_FAILURE: 'cascade_failure',
  RESOURCE_STARVATION: 'resource_starvation',
  
  // Neutral behaviors
  OSCILLATION: 'oscillation',
  CLUSTERING: 'clustering',
  SEGREGATION: 'segregation',
  ADAPTATION: 'adaptation'
} as const

// Validation rules
export const VALIDATION_RULES = {
  AGENT_ID: /^[a-zA-Z0-9_-]+$/,
  TASK_ID: /^[a-zA-Z0-9_-]+$/,
  RESOURCE_ID: /^[a-zA-Z0-9_.-]+$/,
  GROUP_ID: /^[a-zA-Z0-9_-]+$/,
  
  MAX_AGENT_ID_LENGTH: 64,
  MAX_TASK_ID_LENGTH: 64,
  MAX_RESOURCE_ID_LENGTH: 128,
  MAX_GROUP_ID_LENGTH: 64,
  
  MIN_PRIORITY: 0.0,
  MAX_PRIORITY: 1.0,
  
  MIN_TIMEOUT: 100, // milliseconds
  MAX_TIMEOUT: 3600000, // 1 hour
  
  MAX_MESSAGE_SIZE: 1024 * 1024, // 1MB
  MAX_HIERARCHY_DEPTH: 20
} as const

// Default role configurations
export const DEFAULT_ROLES = {
  COORDINATOR: {
    name: 'coordinator',
    priority: 0.9,
    capabilities: [
      STANDARD_CAPABILITIES.COORDINATION,
      STANDARD_CAPABILITIES.DECISION_MAKING,
      STANDARD_CAPABILITIES.CONFLICT_RESOLUTION,
      STANDARD_CAPABILITIES.PLANNING
    ]
  },
  WORKER: {
    name: 'worker',
    priority: 0.5,
    capabilities: [
      STANDARD_CAPABILITIES.TASK_EXECUTION,
      STANDARD_CAPABILITIES.COMMUNICATION
    ]
  },
  SPECIALIST: {
    name: 'specialist',
    priority: 0.7,
    capabilities: [
      STANDARD_CAPABILITIES.TASK_EXECUTION,
      STANDARD_CAPABILITIES.ANALYSIS,
      STANDARD_CAPABILITIES.DATA_PROCESSING
    ]
  },
  MONITOR: {
    name: 'monitor',
    priority: 0.6,
    capabilities: [
      STANDARD_CAPABILITIES.MONITORING,
      STANDARD_CAPABILITIES.COMMUNICATION,
      STANDARD_CAPABILITIES.ANALYSIS
    ]
  }
} as const