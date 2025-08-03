/**
 * Communication and Style Types for SYMindX
 */

/**
 * Communication style configuration
 */
export interface CommunicationStyle {
  formality: number; // 0-1, how formal the communication should be
  verbosity: number; // 0-1, how verbose responses should be
  emotionality: number; // 0-1, how much emotion to express
  directness: number; // 0-1, how direct/blunt to be
  humor: number; // 0-1, how much humor to include
  technicality: number; // 0-1, how technical language should be
  empathy: number; // 0-1, how empathetic responses should be
  responseSpeed: 'instant' | 'thoughtful' | 'deliberate'; // Response timing preference
  preferredLength: 'concise' | 'moderate' | 'detailed'; // Response length preference
  culturalContext?: string; // Cultural adaptation context
  personalityAdaptation?: number; // How much to adapt to user personality
  contextSensitivity?: number; // How much to adapt to conversation context
}

/**
 * Message context for style adaptation
 */
export interface MessageContext {
  originalMessage: string;
  adaptedMessage: string;
  style: CommunicationStyle;
  emotion?: string;
  mood?: string;
  urgency?: 'low' | 'medium' | 'high';
  conversationPhase?: string;
}

/**
 * Style adaptation configuration
 */
export interface StyleAdapterConfig {
  enableLearning: boolean;
  adaptationRate: number;
  contextSensitivity: number;
  emotionalInfluence: number;
  personalityWeight: number;
  moodInfluence: number;
  preservePersonality: boolean;
  defaultStyle?: Partial<CommunicationStyle>;
}

/**
 * Feedback for style learning
 */
export interface StyleFeedback {
  feedback: 'positive' | 'negative' | 'neutral';
  style: CommunicationStyle;
  timestamp: Date;
  context?: {
    originalLength: number;
    adaptedLength: number;
    styleUsed: CommunicationStyle;
  };
}

/**
 * Expression adaptation options
 */
export interface ExpressionOptions {
  preserveCore?: boolean;
  adaptationStrength?: number;
  emotionalIntensity?: number;
  contextualWeight?: number;
  styleConsistency?: number;
}

/**
 * Communication preferences
 */
export interface CommunicationPreferences {
  preferredStyle: CommunicationStyle;
  adaptationEnabled: boolean;
  learningEnabled: boolean;
  contextSensitive: boolean;
  emotionallyAware: boolean;
  culturalAdaptation: boolean;
}

/**
 * Expression engine configuration
 */
export interface ExpressionEngineConfig {
  emotionalInfluence: number;
  personalityAdaptation: number;
  contextAdaptation: boolean;
  styleConsistency: number;
  preserveCore: boolean;
  adaptationStrength: number;
}

// ============================================================================
// SKILLS ARCHITECTURE TYPES
// ============================================================================

/**
 * Base skill interface that all skills must implement
 */
export interface BaseSkill {
  /** Unique skill identifier */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Skill version for compatibility */
  readonly version?: string;
  /** Whether skill is enabled */
  readonly enabled?: boolean;
  
  /** Initialize the skill with configuration */
  initialize?(config: SkillConfig): Promise<void>;
  /** Cleanup resources when skill is destroyed */
  cleanup?(): Promise<void>;
  /** Get available actions provided by this skill */
  getActions(): Record<string, SkillAction>;
  /** Validate if skill can handle a specific context */
  canHandle?(context: SkillContext): boolean;
}

/**
 * Skill configuration interface
 */
export interface SkillConfig {
  /** Basic configuration options */
  enabled: boolean;
  priority: number;
  timeout?: number;
  retries?: number;
  
  /** Skill-specific settings */
  settings?: Record<string, unknown>;
  
  /** Resource limits */
  limits?: {
    memoryMB?: number;
    cpuPercent?: number;
    requestsPerMinute?: number;
  };
  
  /** Dependencies on other skills */
  dependencies?: string[];
  
  /** Feature flags */
  features?: Record<string, boolean>;
}

/**
 * Skill lifecycle hooks
 */
export interface SkillLifecycleHooks {
  /** Called before skill initialization */
  beforeInitialize?(config: SkillConfig): Promise<void>;
  /** Called after successful initialization */
  afterInitialize?(config: SkillConfig): Promise<void>;
  /** Called when skill fails to initialize */
  onInitializeError?(error: Error, config: SkillConfig): Promise<void>;
  
  /** Called before skill execution */
  beforeExecute?(context: SkillContext): Promise<void>;
  /** Called after successful execution */
  afterExecute?(context: SkillContext, result: SkillActionResult): Promise<void>;
  /** Called when skill execution fails */
  onExecuteError?(error: Error, context: SkillContext): Promise<void>;
  
  /** Called before skill cleanup */
  beforeCleanup?(): Promise<void>;
  /** Called after successful cleanup */
  afterCleanup?(): Promise<void>;
  /** Called when cleanup fails */
  onCleanupError?(error: Error): Promise<void>;
}

/**
 * Skill manager interface for orchestrating skills
 */
export interface SkillManager {
  /** Register a new skill */
  registerSkill(skill: BaseSkill): Promise<void>;
  /** Unregister an existing skill */
  unregisterSkill(skillName: string): Promise<void>;
  /** Get a skill by name */
  getSkill(skillName: string): BaseSkill | undefined;
  /** Get all registered skills */
  getAllSkills(): BaseSkill[];
  /** Check if a skill is registered */
  hasSkill(skillName: string): boolean;
  
  /** Initialize all skills */
  initializeAll(): Promise<void>;
  /** Cleanup all skills */
  cleanupAll(): Promise<void>;
  
  /** Execute a skill action */
  executeSkillAction(
    skillName: string, 
    actionName: string, 
    context: SkillContext
  ): Promise<SkillActionResult>;
  
  /** Get all available actions from all skills */
  getAllActions(): Record<string, SkillAction>;
  
  /** Update skill configuration */
  updateSkillConfig(skillName: string, config: Partial<SkillConfig>): Promise<void>;
  
  /** Get skill health status */
  getSkillHealth(skillName: string): SkillHealthStatus;
}

/**
 * Skill action definition
 */
export interface SkillAction {
  /** Action name/identifier */
  name: string;
  /** Action description */
  description: string;
  /** Category for organization */
  category: SkillActionCategory;
  /** Required parameters */
  parameters: Record<string, SkillActionParameter>;
  /** Permission requirements */
  permissions?: string[];
  /** Whether action is deprecated */
  deprecated?: boolean;
  /** Replacement action if deprecated */
  replacement?: string;
  
  /** Execute the action */
  execute(context: SkillContext): Promise<SkillActionResult>;
}

/**
 * Skill action categories
 */
export enum SkillActionCategory {
  COMMUNICATION = 'communication',
  DATA = 'data',
  PROCESSING = 'processing',
  INTEGRATION = 'integration',
  SYSTEM = 'system',
  SOCIAL = 'social',
  AUTONOMOUS = 'autonomous',
  UTILITY = 'utility'
}

/**
 * Skill action parameter definition
 */
export interface SkillActionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown';
  required: boolean;
  description: string;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
}

/**
 * Execution context for skill actions
 */
export interface SkillContext {
  /** Parameters passed to the action */
  parameters: Record<string, unknown>;
  /** Agent executing the skill */
  agent?: unknown; // Will be properly typed as Agent in future
  /** Execution metadata */
  metadata: {
    executionId: string;
    timestamp: Date;
    source: string;
    priority?: number;
  };
  /** Security context */
  security?: {
    permissions: string[];
    userId?: string;
    restrictions?: Record<string, unknown>;
  };
}

/**
 * Result of skill action execution
 */
export interface SkillActionResult {
  /** Whether execution was successful */
  success: boolean;
  /** Result data if successful */
  data?: unknown;
  /** Error information if failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  /** Execution metadata */
  metadata: {
    duration: number;
    timestamp: Date;
    resourcesUsed?: {
      memory?: number;
      cpu?: number;
    };
  };
  /** Side effects or follow-up actions */
  sideEffects?: Array<{
    type: string;
    description: string;
    data?: unknown;
  }>;
}

/**
 * Skill health status
 */
export interface SkillHealthStatus {
  /** Skill name */
  skillName: string;
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  /** Last health check timestamp */
  lastCheck: Date;
  /** Detailed health metrics */
  metrics: {
    uptime: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    lastError?: string;
  };
  /** Health check details */
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    timestamp: Date;
  }>;
}

/**
 * Skill registry for managing skill definitions
 */
export interface SkillRegistry {
  /** Register a skill definition */
  register(skillName: string, skillClass: new (config: SkillConfig) => BaseSkill): void;
  /** Unregister a skill definition */
  unregister(skillName: string): void;
  /** Get skill class by name */
  get(skillName: string): (new (config: SkillConfig) => BaseSkill) | undefined;
  /** List all registered skill names */
  list(): string[];
  /** Create skill instance */
  create(skillName: string, config: SkillConfig): BaseSkill | undefined;
}

/**
 * Skill factory for creating skill instances
 */
export interface SkillFactory {
  /** Create a skill instance from configuration */
  createSkill(skillName: string, config: SkillConfig): Promise<BaseSkill>;
  /** Create multiple skills from configurations */
  createSkills(configs: Record<string, SkillConfig>): Promise<BaseSkill[]>;
  /** Validate skill configuration */
  validateConfig(skillName: string, config: SkillConfig): boolean;
  /** Get default configuration for a skill */
  getDefaultConfig(skillName: string): SkillConfig | undefined;
}

/**
 * Skill event types for lifecycle and execution events
 */
export enum SkillEventType {
  SKILL_REGISTERED = 'skill:registered',
  SKILL_UNREGISTERED = 'skill:unregistered',
  SKILL_INITIALIZED = 'skill:initialized',
  SKILL_CLEANUP = 'skill:cleanup',
  ACTION_EXECUTED = 'skill:action:executed',
  ACTION_FAILED = 'skill:action:failed',
  HEALTH_CHANGED = 'skill:health:changed',
  CONFIG_UPDATED = 'skill:config:updated'
}

/**
 * Skill event data interface
 */
export interface SkillEvent {
  type: SkillEventType;
  skillName: string;
  timestamp: Date;
  data?: Record<string, unknown>;
  error?: Error;
}

/**
 * Skill metrics for monitoring and observability
 */
export interface SkillMetrics {
  /** Skill name */
  skillName: string;
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time */
  averageExecutionTime: number;
  /** Peak execution time */
  peakExecutionTime: number;
  /** Memory usage statistics */
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
  /** Last execution timestamp */
  lastExecution?: Date;
  /** Error statistics */
  errors: {
    total: number;
    byType: Record<string, number>;
    lastError?: {
      message: string;
      timestamp: Date;
    };
  };
}
