/**
 * @fileoverview Unified Context System for SYMindX
 * @description Comprehensive context interface that consolidates all contextual information
 * across the agent runtime system. This serves as the foundation for context injection
 * and management throughout the SYMindX ecosystem.
 *
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import type {
  BaseConfig,
  Metadata,
  Context,
  GenericData,
  ActionParameters,
} from '../common.js';
import type {
  Agent,
  AgentConfig,
  AgentState,
  AgentEvent,
  MemoryRecord,
  EmotionState,
  RuntimeConfig,
  Extension,
} from '../agent.js';
import type { Portal, PortalConfig } from '../portal.js';
import type { CommunicationStyle } from '../communication.js';
import type { Timestamp, AgentId } from '../helpers.js';
import type { ExtensionConfig } from '../common.js';

/**
 * Context Scope Enumeration
 * Defines the hierarchical levels of context application
 */
export enum ContextScope {
  /** System-wide context affecting all agents and operations */
  GLOBAL = 'global',
  /** Runtime-specific context for the current execution environment */
  RUNTIME = 'runtime',
  /** Agent-specific context for individual agent operations */
  AGENT = 'agent',
  /** Session-specific context for current interaction session */
  SESSION = 'session',
  /** Request-specific context for single operations */
  REQUEST = 'request',
  /** Extension-specific context for module operations */
  EXTENSION = 'extension',
  /** Portal-specific context for AI provider interactions */
  PORTAL = 'portal',
}

/**
 * Context Priority Levels
 * Determines resolution order when contexts conflict
 */
export enum ContextPriority {
  /** Lowest priority - system defaults */
  SYSTEM = 0,
  /** Configuration-based priorities */
  CONFIG = 10,
  /** Runtime environment priorities */
  RUNTIME = 20,
  /** Agent-specific priorities */
  AGENT = 30,
  /** Session-based priorities */
  SESSION = 40,
  /** Request-specific priorities */
  REQUEST = 50,
  /** Emergency override priorities */
  OVERRIDE = 100,
}

/**
 * Context Metadata Interface
 * Provides tracing and management information for context objects
 */
export interface ContextMetadata {
  /** Unique identifier for this context instance */
  readonly id: string;
  /** Context scope level */
  readonly scope: ContextScope;
  /** Priority level for conflict resolution */
  readonly priority: ContextPriority;
  /** Timestamp when context was created */
  readonly createdAt: Timestamp;
  /** Timestamp when context was last modified */
  lastModified: Timestamp;
  /** Source of context creation (system, agent, extension, etc.) */
  readonly source: string;
  /** Version identifier for context schema compatibility */
  readonly version: string;
  /** Optional expiration time for temporal contexts */
  expiresAt?: Timestamp;
  /** Tags for context categorization and filtering */
  tags?: string[];
  /** Additional metadata properties */
  [key: string]: unknown;
}

/**
 * Context Trace Information
 * Provides audit trail and debugging information
 */
export interface ContextTrace {
  /** Trace identifier linking related context operations */
  traceId: string;
  /** Parent trace identifier for nested operations */
  parentTraceId?: string;
  /** Span identifier for distributed tracing */
  spanId: string;
  /** Operation that created or modified this context */
  operation: string;
  /** Timestamp of the traced operation */
  timestamp: Timestamp;
  /** Duration of the operation in milliseconds */
  duration?: number;
  /** Additional trace properties */
  properties?: Record<string, unknown>;
}

/**
 * Performance Context Information
 * Tracks performance metrics and resource utilization
 */
export interface PerformanceContext {
  /** Start time of current operation */
  startTime: Timestamp;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** CPU utilization percentage */
  cpuUsage?: number;
  /** Network latency in milliseconds */
  networkLatency?: number;
  /** Token count for AI operations */
  tokenCount?: number;
  /** Request rate per second */
  requestRate?: number;
  /** Cache hit ratio */
  cacheHitRatio?: number;
  /** Custom performance metrics */
  metrics?: Record<string, number>;
}

/**
 * Identity Context Interface
 * Contains user and agent identification information
 */
export interface IdentityContext {
  /** User identifier initiating the request */
  userId?: string;
  /** Session identifier for grouping related requests */
  sessionId?: string;
  /** Agent identifier executing the operation */
  agentId?: AgentId;
  /** Organization or tenant identifier */
  organizationId?: string;
  /** Authentication tokens and credentials */
  authentication?: {
    token?: string;
    refreshToken?: string;
    expiresAt?: Timestamp;
    permissions?: string[];
    roles?: string[];
  };
  /** User preferences and settings */
  preferences?: {
    language?: string;
    timezone?: string;
    theme?: string;
    notifications?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Temporal Context Interface
 * Contains time-related contextual information
 */
export interface TemporalContext {
  /** Current timestamp */
  now: Timestamp;
  /** Start time of current session or operation */
  startTime: Timestamp;
  /** End time for bounded operations */
  endTime?: Timestamp;
  /** Timezone information */
  timezone?: string;
  /** Locale information for time formatting */
  locale?: string;
  /** Time-based constraints */
  constraints?: {
    maxDuration?: number;
    deadline?: Timestamp;
    businessHours?: boolean;
  };
  /** Historical context timestamps */
  history?: {
    lastInteraction?: Timestamp;
    lastUpdate?: Timestamp;
    createdAt?: Timestamp;
  };
}

/**
 * Execution Context Interface
 * Contains information about the current execution environment
 */
export interface ExecutionContext {
  /** Current execution mode */
  mode: 'development' | 'staging' | 'production' | 'test';
  /** Environment variables and configuration */
  environment: Record<string, string>;
  /** Runtime version information */
  version: {
    runtime: string;
    nodejs?: string;
    typescript?: string;
    aiSdk?: string;
  };
  /** Feature flags and toggles */
  features?: Record<string, boolean>;
  /** Resource limits and constraints */
  limits?: {
    memory?: number;
    cpu?: number;
    timeout?: number;
    concurrent?: number;
  };
  /** Debug and logging configuration */
  debug?: {
    enabled: boolean;
    level: string;
    tracing: boolean;
  };
}

/**
 * Agent Context Data Interface
 * Contains agent-specific contextual information
 */
export interface AgentContextData {
  /** Agent configuration */
  config: AgentConfig;
  /** Current agent state */
  state: AgentState;
  /** Emotion state information */
  emotions: EmotionState;
  /** Recent memory records */
  recentMemories: MemoryRecord[];
  /** Current thoughts and reasoning */
  thoughts?: string[];
  /** Active goals and objectives */
  goals?: string[];
  /** Capabilities and skills */
  capabilities?: string[];
  /** Resource usage and limits */
  resources?: {
    memoryUsage: number;
    processingPower: number;
    networkBandwidth: number;
  };
}

/**
 * Memory Context Data Interface
 * Contains memory-related contextual information
 */
export interface MemoryContextData {
  /** Recent memories for context */
  recent: MemoryRecord[];
  /** Relevant memories for current operation */
  relevant: MemoryRecord[];
  /** Working memory items */
  working: MemoryRecord[];
  /** Long-term memories */
  longTerm: MemoryRecord[];
  /** Memory statistics */
  statistics?: {
    totalRecords: number;
    memoryUsage: number;
    averageImportance: number;
    oldestRecord?: Timestamp;
    newestRecord?: Timestamp;
  };
  /** Memory search context */
  searchContext?: {
    query?: string;
    filters?: Record<string, unknown>;
    threshold?: number;
  };
}

/**
 * Communication Context Interface
 * Contains conversation and interaction contextual information
 */
export interface CommunicationContext {
  /** Current conversation history */
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Timestamp;
    metadata?: Metadata;
  }>;
  /** Communication style preferences */
  style?: CommunicationStyle;
  /** Language and localization settings */
  language?: {
    primary: string;
    fallback?: string;
    region?: string;
  };
  /** Channel or medium information */
  channel?: {
    type: 'text' | 'voice' | 'video' | 'api' | 'webhook';
    platform?: string;
    capabilities?: string[];
  };
  /** Interaction constraints */
  constraints?: {
    maxTokens?: number;
    responseTime?: number;
    format?: string;
  };
}

/**
 * Environment Context Interface
 * Contains environmental and situational information
 */
export interface EnvironmentContext {
  /** Physical or virtual location */
  location?: {
    coordinates?: [number, number];
    address?: string;
    timezone?: string;
    locale?: string;
  };
  /** Device and platform information */
  device?: {
    type: 'desktop' | 'mobile' | 'tablet' | 'server' | 'iot';
    os?: string;
    browser?: string;
    capabilities?: string[];
  };
  /** Network conditions */
  network?: {
    type: 'wifi' | 'cellular' | 'ethernet';
    speed?: number;
    latency?: number;
    quality?: 'high' | 'medium' | 'low';
  };
  /** Contextual factors */
  factors?: {
    weather?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    noise?: number;
    lighting?: string;
  };
}

/**
 * Resource Context Interface
 * Contains information about available and consumed resources
 */
export interface ResourceContext {
  /** Available system resources */
  available: {
    memory: number;
    cpu: number;
    storage: number;
    network: number;
  };
  /** Currently allocated resources */
  allocated: {
    memory: number;
    cpu: number;
    storage: number;
    network: number;
  };
  /** Resource limits and quotas */
  limits: {
    memory: number;
    cpu: number;
    storage: number;
    network: number;
    requests?: number;
    tokens?: number;
  };
  /** Resource utilization history */
  utilization?: Array<{
    timestamp: Timestamp;
    memory: number;
    cpu: number;
    storage: number;
    network: number;
  }>;
}

/**
 * Extension Context Map Interface
 * Contains context information for all loaded extensions
 */
export interface ExtensionContextMap {
  /** Map of extension contexts by extension ID */
  contexts: Map<
    string,
    {
      config: ExtensionConfig;
      state: GenericData;
      capabilities: string[];
      resources: ResourceContext;
      lastActivity: Timestamp;
    }
  >;
  /** Global extension settings */
  global?: {
    autoLoad: boolean;
    timeout: number;
    retries: number;
  };
}

/**
 * Portal Context Interface
 * Contains AI provider and portal-specific context
 */
export interface UnifiedPortalContext {
  /** Active portal configuration */
  active?: {
    id: string;
    config: PortalConfig;
    model: string;
    capabilities: string[];
  };
  /** Available portals */
  available: Array<{
    id: string;
    provider: string;
    models: string[];
    status: 'active' | 'inactive' | 'error';
  }>;
  /** Portal usage statistics */
  usage?: {
    requests: number;
    tokens: number;
    errors: number;
    latency: number;
  };
  /** Portal-specific settings */
  settings?: {
    temperature?: number;
    maxTokens?: number;
    streaming?: boolean;
    tools?: boolean;
  };
}

/**
 * Capability Context Interface
 * Contains information about available system and agent capabilities
 */
export interface CapabilityContext {
  /** Agent capabilities */
  agent: string[];
  /** Extension capabilities */
  extensions: string[];
  /** Portal capabilities */
  portals: string[];
  /** System capabilities */
  system: string[];
  /** Required capabilities for current operation */
  required?: string[];
  /** Optional capabilities that enhance operation */
  optional?: string[];
}

/**
 * Tool Context Interface
 * Contains information about available tools and their usage
 */
export interface ToolContext {
  /** Available tools */
  available: Array<{
    id: string;
    name: string;
    description: string;
    parameters: ActionParameters;
    provider: string;
  }>;
  /** Recently used tools */
  recent: Array<{
    id: string;
    timestamp: Timestamp;
    duration: number;
    success: boolean;
  }>;
  /** Tool usage statistics */
  statistics?: {
    totalCalls: number;
    successRate: number;
    averageLatency: number;
    mostUsed: string[];
  };
}

/**
 * Unified Context Interface
 * The primary context object that consolidates all contextual information
 * across the SYMindX agent runtime system.
 */
export interface UnifiedContext {
  /** Context metadata and management information */
  metadata: ContextMetadata;

  /** Distributed tracing information */
  trace?: ContextTrace;

  /** Performance metrics and resource utilization */
  performance?: PerformanceContext;

  /** Identity and authentication context */
  identity?: IdentityContext;

  /** Session-specific context information */
  session?: {
    id: string;
    startTime: Timestamp;
    duration?: number;
    events: AgentEvent[];
    state: GenericData;
  };

  /** Temporal context and time-related information */
  temporal?: TemporalContext;

  /** Execution environment context */
  execution?: ExecutionContext;

  /** Agent-specific context data */
  agent?: AgentContextData;

  /** Memory and knowledge context */
  memory?: MemoryContextData;

  /** Communication and conversation context */
  communication?: CommunicationContext;

  /** Environmental and situational context */
  environment?: EnvironmentContext;

  /** Extension-specific contexts */
  extensions?: ExtensionContextMap;

  /** Portal and AI provider context */
  portal?: UnifiedPortalContext;

  /** Metadata for additional context properties */
  additionalMetadata?: Metadata;

  /** Resource availability and usage context */
  resources?: ResourceContext;

  /** System and agent capabilities context */
  capabilities?: CapabilityContext;

  /** Tool availability and usage context */
  tools?: ToolContext;

  /** Custom context properties for extension-specific data */
  custom?: Record<string, unknown>;
}

/**
 * Context Creation Options Interface
 * Options for creating new context instances
 */
export interface ContextCreationOptions {
  /** Context scope level */
  scope: ContextScope;
  /** Priority level for conflict resolution */
  priority?: ContextPriority;
  /** Source identifier */
  source: string;
  /** Initial context data */
  data?: Partial<UnifiedContext>;
  /** Context expiration time */
  expiresAt?: Timestamp;
  /** Context tags */
  tags?: string[];
  /** Parent context for inheritance */
  parent?: UnifiedContext;
}

/**
 * Context Update Options Interface
 * Options for updating existing context instances
 */
export interface ContextUpdateOptions {
  /** Whether to merge with existing context or replace */
  merge?: boolean;
  /** Source of the update operation */
  source?: string;
  /** Update tags */
  tags?: string[];
  /** Trace information for the update */
  trace?: Partial<ContextTrace>;
}

/**
 * Context Query Interface
 * Interface for querying context information
 */
export interface UnifiedContextQuery {
  /** Scope filter */
  scope?: ContextScope | ContextScope[];
  /** Source filter */
  source?: string | string[];
  /** Tag filters */
  tags?: string | string[];
  /** Time range filter */
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  /** Priority range filter */
  priorityRange?: {
    min: ContextPriority;
    max: ContextPriority;
  };
  /** Include expired contexts */
  includeExpired?: boolean;
}

/**
 * Context Diff Interface
 * Represents differences between two context instances
 */
export interface ContextDiff {
  /** Added properties */
  added: Record<string, unknown>;
  /** Modified properties */
  modified: Record<string, { old: unknown; new: unknown }>;
  /** Removed properties */
  removed: Record<string, unknown>;
  /** Unchanged properties count */
  unchanged: number;
  /** Diff timestamp */
  timestamp: Timestamp;
}

/**
 * Type Guards for Context Validation
 */
export namespace ContextTypeGuards {
  /**
   * Type guard for UnifiedContext
   */
  export function isUnifiedContext(obj: unknown): obj is UnifiedContext {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'metadata' in obj &&
      typeof (obj as any).metadata === 'object' &&
      'scope' in (obj as any).metadata &&
      'priority' in (obj as any).metadata
    );
  }

  /**
   * Type guard for ContextMetadata
   */
  export function isContextMetadata(obj: unknown): obj is ContextMetadata {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'id' in obj &&
      'scope' in obj &&
      'priority' in obj &&
      'createdAt' in obj &&
      'source' in obj &&
      'version' in obj
    );
  }
}

/**
 * Default Context Values
 */
export const DEFAULT_CONTEXT_PRIORITY = ContextPriority.CONFIG;
export const DEFAULT_CONTEXT_VERSION = '1.0.0';
export const DEFAULT_CONTEXT_SCOPE = ContextScope.REQUEST;

/**
 * Context Configuration Interface
 * Configuration options for the context system
 */
export interface ContextSystemConfig {
  /** Default context priority */
  defaultPriority: ContextPriority;
  /** Default context scope */
  defaultScope: ContextScope;
  /** Context version */
  version: string;
  /** Enable context tracing */
  enableTracing: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Context cache size */
  cacheSize: number;
  /** Context TTL in milliseconds */
  ttl: number;
  /** Garbage collection interval in milliseconds */
  gcInterval: number;
}

/**
 * Default Context System Configuration
 */
export const DEFAULT_CONTEXT_SYSTEM_CONFIG: ContextSystemConfig = {
  defaultPriority: DEFAULT_CONTEXT_PRIORITY,
  defaultScope: DEFAULT_CONTEXT_SCOPE,
  version: DEFAULT_CONTEXT_VERSION,
  enableTracing: false,
  enablePerformanceMonitoring: false,
  cacheSize: 1000,
  ttl: 3600000, // 1 hour
  gcInterval: 300000, // 5 minutes
};
