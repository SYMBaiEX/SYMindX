/**
 * Skills Extension Type Definitions
 * Provides strongly-typed interfaces for skill execution and management
 */

import type { Agent } from '../agent';
import type { SkillParameters } from '../common';

/**
 * Skill execution context with full agent state
 */
export interface SkillExecutionContext {
  /** Executing agent */
  agent: Agent;
  /** Skill parameters */
  parameters: SkillParameters;
  /** Execution metadata */
  metadata: {
    /** Execution ID for tracking */
    executionId: string;
    /** Start timestamp */
    startTime: Date;
    /** Calling extension */
    extension?: string;
    /** Parent action if nested */
    parentAction?: string;
    /** Execution priority */
    priority?: number;
  };
  /** Execution environment */
  environment: {
    /** Runtime mode */
    mode: 'development' | 'production' | 'test';
    /** Available resources */
    resources: {
      memory: number;
      cpu: number;
    };
    /** Feature flags */
    features?: Record<string, boolean>;
  };
  /** Security context */
  security?: {
    /** Authenticated user */
    user?: string;
    /** Allowed permissions */
    permissions?: string[];
    /** Rate limit info */
    rateLimit?: {
      remaining: number;
      reset: Date;
    };
  };
}

/**
 * Generic skill result with typed data
 */
export interface SkillResult<T = any> {
  /** Execution success */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error information */
  error?: {
    code: string;
    message: string;
    stack?: string;
    details?: any;
  };
  /** Execution metadata */
  metadata: {
    /** Execution duration in ms */
    duration: number;
    /** Resources used */
    resources?: {
      memoryUsed?: number;
      cpuTime?: number;
      apiCalls?: number;
    };
    /** Warnings generated */
    warnings?: string[];
    /** Debug information */
    debug?: Record<string, any>;
  };
  /** Side effects produced */
  sideEffects?: Array<{
    type: 'memory' | 'state' | 'external' | 'event';
    description: string;
    data?: any;
  }>;
  /** Follow-up actions suggested */
  suggestions?: Array<{
    action: string;
    reason: string;
    parameters?: SkillParameters;
  }>;
}

/**
 * Skill parameter definition with validation
 */
export interface SkillParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** Is parameter required */
  required: boolean;
  /** Parameter description */
  description: string;
  /** Default value if not provided */
  default?: any;
  /** Validation rules */
  validation?: SkillValidation;
  /** Example values */
  examples?: any[];
  /** Deprecated warning */
  deprecated?: string;
}

/**
 * Skill parameter validation rules
 */
export interface SkillValidation {
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Minimum length (for strings/arrays) */
  minLength?: number;
  /** Maximum length (for strings/arrays) */
  maxLength?: number;
  /** Pattern match (for strings) */
  pattern?: string;
  /** Enum values */
  enum?: any[];
  /** Custom validation function */
  custom?: (value: any) => boolean | string;
  /** Format validation (email, url, etc) */
  format?:
    | 'email'
    | 'url'
    | 'uuid'
    | 'date'
    | 'time'
    | 'datetime'
    | 'ipv4'
    | 'ipv6';
}

/**
 * HTTP skill configuration
 */
export interface HTTPSkillConfig {
  /** Base URL for requests */
  baseUrl: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
  /** Rate limiting */
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  /** Authentication */
  auth?: {
    type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
    credentials: string | { username: string; password: string };
    headerName?: string;
  };
  /** Request interceptor */
  interceptor?: (config: any) => any;
  /** Response transformer */
  transformer?: (response: any) => any;
}

/**
 * Database skill result
 */
export interface DatabaseSkillResult<T = any> {
  /** Query success */
  success: boolean;
  /** Result rows */
  rows?: T[];
  /** Affected row count */
  affectedRows?: number;
  /** Insert ID if applicable */
  insertId?: string | number;
  /** Query metadata */
  metadata: {
    /** Query execution time */
    duration: number;
    /** Rows examined */
    rowsExamined?: number;
    /** Index used */
    indexUsed?: string;
  };
}

/**
 * File operation skill result
 */
export interface FileSkillResult {
  /** Operation success */
  success: boolean;
  /** File path */
  path?: string;
  /** File content (for read operations) */
  content?: string | Buffer;
  /** File stats */
  stats?: {
    size: number;
    created: Date;
    modified: Date;
    isDirectory: boolean;
  };
  /** Operation performed */
  operation: 'read' | 'write' | 'delete' | 'move' | 'copy' | 'mkdir';
}

/**
 * External API skill result
 */
export interface APISkillResult<T = any> {
  /** Request success */
  success: boolean;
  /** Response data */
  data?: T;
  /** HTTP status code */
  status?: number;
  /** Response headers */
  headers?: Record<string, string>;
  /** Request metadata */
  metadata: {
    /** Request duration */
    duration: number;
    /** Request method */
    method: string;
    /** Request URL */
    url: string;
    /** Retry attempts */
    retries?: number;
  };
}

/**
 * Computation skill result
 */
export interface ComputationSkillResult<T = any> {
  /** Computation success */
  success: boolean;
  /** Computation result */
  result?: T;
  /** Computation statistics */
  stats?: {
    /** Iterations performed */
    iterations?: number;
    /** Convergence achieved */
    converged?: boolean;
    /** Error margin */
    error?: number;
    /** Performance metrics */
    performance?: {
      cpuTime: number;
      memoryPeak: number;
    };
  };
}

/**
 * Communication skill result
 */
export interface CommunicationSkillResult {
  /** Send success */
  success: boolean;
  /** Message ID */
  messageId?: string;
  /** Recipient information */
  recipient?: {
    id: string;
    type: 'user' | 'agent' | 'channel';
    status: 'delivered' | 'pending' | 'failed';
  };
  /** Delivery receipt */
  receipt?: {
    timestamp: Date;
    status: string;
    details?: any;
  };
}

/**
 * Skill definition interface
 */
export interface SkillDefinition {
  /** Unique skill ID */
  id: string;
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
  /** Skill category */
  category:
    | 'system'
    | 'communication'
    | 'data'
    | 'computation'
    | 'integration'
    | 'utility';
  /** Skill version */
  version: string;
  /** Required permissions */
  permissions?: string[];
  /** Parameter definitions */
  parameters: SkillParameter[];
  /** Execution handler */
  execute: (context: SkillExecutionContext) => Promise<SkillResult>;
  /** Validation handler */
  validate?: (parameters: SkillParameters) => boolean | string;
  /** Pre-execution hook */
  beforeExecute?: (context: SkillExecutionContext) => Promise<void>;
  /** Post-execution hook */
  afterExecute?: (
    context: SkillExecutionContext,
    result: SkillResult
  ) => Promise<void>;
  /** Error handler */
  onError?: (
    error: Error,
    context: SkillExecutionContext
  ) => Promise<SkillResult>;
  /** Skill configuration */
  config?: any;
  /** Skill dependencies */
  dependencies?: string[];
  /** Deprecated flag */
  deprecated?: boolean;
  /** Replacement skill if deprecated */
  replacement?: string;
}

/**
 * Skill registry interface
 */
export interface SkillRegistry {
  /** Register a skill */
  register(skill: SkillDefinition): void;
  /** Unregister a skill */
  unregister(skillId: string): void;
  /** Get skill by ID */
  get(skillId: string): SkillDefinition | undefined;
  /** List all skills */
  list(): SkillDefinition[];
  /** Find skills by category */
  findByCategory(category: string): SkillDefinition[];
  /** Check if skill exists */
  has(skillId: string): boolean;
  /** Validate skill parameters */
  validate(skillId: string, parameters: SkillParameters): boolean | string;
  /** Execute skill */
  execute(
    skillId: string,
    context: SkillExecutionContext
  ): Promise<SkillResult>;
}

/**
 * Skill execution options
 */
export interface SkillExecutionOptions {
  /** Execution timeout in ms */
  timeout?: number;
  /** Retry on failure */
  retry?: {
    attempts: number;
    delay: number;
  };
  /** Cache results */
  cache?: {
    enabled: boolean;
    ttl: number;
    key?: string;
  };
  /** Track execution */
  tracking?: {
    enabled: boolean;
    metrics: string[];
  };
  /** Execution priority */
  priority?: 'low' | 'normal' | 'high' | 'critical';
  /** Async execution */
  async?: boolean;
}

/**
 * Type guards for skill results
 */
export const isSkillResult = <T>(obj: any): obj is SkillResult<T> => {
  return (
    obj && typeof obj === 'object' && 'success' in obj && 'metadata' in obj
  );
};

export const isDatabaseResult = <T>(
  obj: any
): obj is DatabaseSkillResult<T> => {
  return isSkillResult(obj) && ('rows' in obj || 'affectedRows' in obj);
};

export const isFileResult = (obj: any): obj is FileSkillResult => {
  return isSkillResult(obj) && 'operation' in obj;
};

export const isAPIResult = <T>(obj: any): obj is APISkillResult<T> => {
  return isSkillResult(obj) && 'status' in obj.metadata;
};

export const isCommunicationResult = (
  obj: any
): obj is CommunicationSkillResult => {
  return isSkillResult(obj) && ('messageId' in obj || 'recipient' in obj);
};
