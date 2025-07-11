/**
 * Module-Specific Result Types for SYMindX
 *
 * This file contains specialized result types for different system modules,
 * replacing generic void returns with meaningful, typed results.
 */

import { 
  OperationResult, 
  ExecutionResult, 
  ValidationResult,
  HealthCheckResult,
  LifecycleEventResult,
  Duration,
  Timestamp,
  AgentId,
  MemoryId,
  EventId,
  ModuleId,
  CorrelationId
} from './helpers';

/**
 * Agent Management Result Types
 */
export interface AgentCreationResult {
  success: boolean;
  agentId?: AgentId;
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    characterId: string;
    configurationUsed: Record<string, any>;
    modulesLoaded: string[];
    initializationTime: Duration;
    [key: string]: any;
  };
}

export interface AgentDestructionResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  metadata?: {
    cleanupSteps: string[];
    resourcesReleased: string[];
    finalState: Record<string, any>;
    cleanupTime: Duration;
    [key: string]: any;
  };
}

export interface AgentStateTransitionResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  transition: {
    from: string;
    to: string;
    trigger: string;
    duration: Duration;
  };
  metadata?: {
    sideEffects: string[];
    validationResults: ValidationResult[];
    [key: string]: any;
  };
}

/**
 * Memory System Result Types
 */
export interface MemoryStorageResult {
  success: boolean;
  memoryId?: MemoryId;
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    agentId: AgentId;
    memoryType: string;
    tier: string;
    size: number;
    embeddings?: {
      model: string;
      dimensions: number;
      similarity?: number;
    };
    [key: string]: any;
  };
}

export interface MemoryRetrievalResult {
  success: boolean;
  memories: Array<{
    id: MemoryId;
    content: string;
    score: number;
    metadata: Record<string, any>;
  }>;
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    agentId: AgentId;
    query: string;
    searchType: string;
    totalResults: number;
    searchTime: Duration;
    [key: string]: any;
  };
}

export interface MemoryConsolidationResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  consolidation: {
    memoriesProcessed: number;
    memoriesPromoted: number;
    memoriesArchived: number;
    memoriesDeleted: number;
    processingTime: Duration;
  };
  metadata?: {
    tier: string;
    strategy: string;
    [key: string]: any;
  };
}

/**
 * Emotion System Result Types
 */
export interface EmotionUpdateResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  emotionChange: {
    previousEmotion: string;
    newEmotion: string;
    intensity: number;
    triggers: string[];
    duration: Duration;
  };
  metadata?: {
    moduleType: string;
    blendingEnabled: boolean;
    contextFactors: Record<string, any>;
    [key: string]: any;
  };
}

export interface EmotionProcessingResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  processing: {
    eventProcessed: EventId;
    emotionTriggered: boolean;
    intensityChange: number;
    newEmotionalState: {
      emotion: string;
      intensity: number;
      valence: number;
      arousal: number;
    };
  };
  metadata?: {
    processingTime: Duration;
    contextSensitivity: number;
    [key: string]: any;
  };
}

/**
 * Cognition System Result Types
 */
export interface ThoughtProcessingResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  thoughts: {
    primaryThoughts: string[];
    secondaryThoughts: string[];
    confidence: number;
    reasoning: string;
    processingTime: Duration;
  };
  metadata?: {
    contextFactors: Record<string, any>;
    memoryInfluence: number;
    emotionalInfluence: number;
    [key: string]: any;
  };
}

export interface PlanningResult {
  success: boolean;
  plan?: {
    id: string;
    goal: string;
    steps: Array<{
      id: string;
      description: string;
      parameters: Record<string, any>;
      estimatedDuration: Duration;
      dependencies: string[];
    }>;
    confidence: number;
    estimatedTotalDuration: Duration;
  };
  error?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  metadata?: {
    planningTime: Duration;
    complexity: number;
    strategy: string;
    [key: string]: any;
  };
}

export interface DecisionMakingResult {
  success: boolean;
  decision?: {
    id: string;
    choice: string;
    confidence: number;
    reasoning: string;
    alternatives: Array<{
      option: string;
      score: number;
      pros: string[];
      cons: string[];
    }>;
  };
  error?: string;
  timestamp: Timestamp;
  agentId: AgentId;
  metadata?: {
    decisionTime: Duration;
    ethicalConstraints: boolean;
    riskAssessment: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Extension System Result Types
 */
export interface ExtensionLoadResult {
  success: boolean;
  extensionId?: string;
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    extensionType: string;
    version: string;
    dependencies: string[];
    capabilities: string[];
    loadTime: Duration;
    [key: string]: any;
  };
}

export interface ExtensionExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Timestamp;
  execution: {
    extensionId: string;
    action: string;
    parameters: Record<string, any>;
    duration: Duration;
  };
  metadata?: {
    agentId: AgentId;
    correlationId?: CorrelationId;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * Portal System Result Types
 */
export interface PortalConnectionResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  portalId: string;
  connection: {
    status: 'connected' | 'disconnected' | 'error';
    endpoint: string;
    protocol: string;
    connectionTime: Duration;
  };
  metadata?: {
    provider: string;
    model: string;
    capabilities: string[];
    [key: string]: any;
  };
}

export interface PortalGenerationResult {
  success: boolean;
  response?: {
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    finishReason: string;
  };
  error?: string;
  timestamp: Timestamp;
  generation: {
    portalId: string;
    requestId: string;
    duration: Duration;
    retryCount: number;
  };
  metadata?: {
    agentId: AgentId;
    temperature: number;
    maxTokens: number;
    [key: string]: any;
  };
}

/**
 * Event System Result Types
 */
export interface EventDispatchResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  event: {
    id: EventId;
    type: string;
    source: string;
    targets: string[];
    processed: boolean;
  };
  metadata?: {
    handlersTriggered: number;
    processingTime: Duration;
    errors: string[];
    [key: string]: any;
  };
}

export interface EventSubscriptionResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  subscription: {
    subscriberId: string;
    eventTypes: string[];
    filters?: Record<string, any>;
  };
  metadata?: {
    subscriptionId: string;
    priority: number;
    [key: string]: any;
  };
}

/**
 * Command System Result Types
 */
export interface CommandExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: Timestamp;
  command: {
    id: string;
    name: string;
    parameters: Record<string, any>;
    executor: string;
    duration: Duration;
  };
  metadata?: {
    agentId: AgentId;
    correlationId?: CorrelationId;
    retryCount?: number;
    validation: ValidationResult;
    [key: string]: any;
  };
}

export interface CommandValidationResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  command: {
    id: string;
    name: string;
    parameters: Record<string, any>;
  };
  validation: ValidationResult;
  metadata?: {
    validatorId: string;
    schema: Record<string, any>;
    [key: string]: any;
  };
}

/**
 * Resource Management Result Types
 */
export interface ResourceAllocationResult {
  success: boolean;
  resource?: {
    id: string;
    type: string;
    status: 'allocated' | 'available' | 'locked';
    usage: {
      memory?: number;
      cpu?: number;
      storage?: number;
      network?: number;
    };
  };
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    requesterId: string;
    allocationTime: Duration;
    quotaUsage: Record<string, number>;
    [key: string]: any;
  };
}

export interface ResourceMonitoringResult {
  success: boolean;
  metrics: {
    timestamp: Timestamp;
    cpu: {
      usage: number;
      cores: number;
      load: number[];
    };
    memory: {
      used: number;
      total: number;
      heap: number;
      external: number;
    };
    storage: {
      used: number;
      total: number;
      reads: number;
      writes: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      connections: number;
    };
  };
  error?: string;
  metadata?: {
    monitoringInterval: Duration;
    alertThresholds: Record<string, number>;
    [key: string]: any;
  };
}

/**
 * Security System Result Types
 */
export interface AuthenticationResult {
  success: boolean;
  token?: string;
  subject?: {
    id: string;
    type: 'user' | 'agent' | 'service';
    roles: string[];
  };
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    method: string;
    expiresAt: Timestamp;
    sessionId: string;
    [key: string]: any;
  };
}

export interface AuthorizationResult {
  success: boolean;
  authorized: boolean;
  message?: string;
  timestamp: Timestamp;
  authorization: {
    subjectId: string;
    resource: string;
    action: string;
    decision: 'allow' | 'deny';
    reason: string;
  };
  metadata?: {
    policyId: string;
    enforcementPoint: string;
    [key: string]: any;
  };
}

/**
 * Configuration System Result Types
 */
export interface ConfigurationLoadResult {
  success: boolean;
  configuration?: Record<string, any>;
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    source: 'file' | 'environment' | 'remote' | 'default';
    version: string;
    validation: ValidationResult;
    loadTime: Duration;
    [key: string]: any;
  };
}

export interface ConfigurationUpdateResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  update: {
    key: string;
    oldValue: any;
    newValue: any;
    source: string;
  };
  metadata?: {
    validation: ValidationResult;
    propagated: boolean;
    affectedModules: string[];
    [key: string]: any;
  };
}

/**
 * Health Check Result Types
 */
export interface SystemHealthResult {
  success: boolean;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Timestamp;
  components: HealthCheckResult[];
  metadata?: {
    checkDuration: Duration;
    checkType: 'basic' | 'detailed' | 'comprehensive';
    [key: string]: any;
  };
}

export interface ComponentHealthResult extends HealthCheckResult {
  dependencies: {
    componentId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  }[];
}

/**
 * Lifecycle Management Result Types
 */
export interface ModuleLifecycleResult extends LifecycleEventResult {
  moduleId: ModuleId;
  module: {
    name: string;
    version: string;
    type: string;
    dependencies: string[];
  };
  lifecycle: {
    phase: 'initialize' | 'start' | 'stop' | 'pause' | 'resume' | 'restart' | 'shutdown';
    duration: Duration;
    checkpoints: string[];
  };
}

export interface SystemLifecycleResult extends LifecycleEventResult {
  system: {
    modules: ModuleLifecycleResult[];
    services: string[];
    totalDuration: Duration;
    shutdownOrder: string[];
  };
}

/**
 * Batch Operation Result Types
 */
export interface BatchOperationResult<T = any> {
  success: boolean;
  results: T[];
  errors: string[];
  timestamp: Timestamp;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    duration: Duration;
  };
  metadata?: {
    batchId: string;
    operationType: string;
    [key: string]: any;
  };
}

/**
 * Migration Result Types
 */
export interface MigrationResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  migration: {
    id: string;
    version: string;
    type: 'schema' | 'data' | 'configuration' | 'system';
    direction: 'up' | 'down';
    duration: Duration;
  };
  metadata?: {
    recordsAffected: number;
    backupCreated: boolean;
    rollbackAvailable: boolean;
    [key: string]: any;
  };
}

/**
 * Backup and Restore Result Types
 */
export interface BackupResult {
  success: boolean;
  backup?: {
    id: string;
    type: 'full' | 'incremental' | 'differential';
    size: number;
    location: string;
    checksum: string;
    created: Timestamp;
  };
  error?: string;
  timestamp: Timestamp;
  metadata?: {
    duration: Duration;
    compression: boolean;
    encryption: boolean;
    [key: string]: any;
  };
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  restore: {
    backupId: string;
    type: 'full' | 'partial' | 'selective';
    duration: Duration;
    recordsRestored: number;
  };
  metadata?: {
    verification: ValidationResult;
    conflicts: string[];
    [key: string]: any;
  };
}

/**
 * Audit and Logging Result Types
 */
export interface AuditResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  audit: {
    id: string;
    type: 'security' | 'compliance' | 'performance' | 'system';
    findings: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      category: string;
      description: string;
      recommendation: string;
    }>;
    duration: Duration;
  };
  metadata?: {
    auditorId: string;
    scope: string[];
    standards: string[];
    [key: string]: any;
  };
}

export interface LoggingResult {
  success: boolean;
  message?: string;
  timestamp: Timestamp;
  log: {
    id: string;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    correlationId?: CorrelationId;
    stored: boolean;
  };
  metadata?: {
    loggerId: string;
    destination: string;
    [key: string]: any;
  };
}