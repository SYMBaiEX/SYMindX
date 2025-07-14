/**
 * Core runtime types for SYMindX
 */

import { LogLevel } from '../agent.js';
import { ExtensionConfig } from '../common.js';
import { Timestamp } from '../helpers.js';

/**
 * Runtime configuration interface
 */
export interface RuntimeConfiguration {
  tickInterval: number;
  maxAgents: number;
  logLevel: LogLevel;
  persistence: PersistenceConfig;
  extensions: ExtensionsConfig;
  portals?: PortalsConfig;
  multiAgent?: MultiAgentConfig;
  performance?: PerformanceConfig;
  security?: SecurityConfig;
}

export interface PersistenceConfig {
  enabled: boolean;
  path: string;
  autoSave?: boolean;
  saveInterval?: number;
  maxBackups?: number;
}

export interface ExtensionsConfig {
  autoLoad: boolean;
  paths: string[];
  [extensionName: string]: ExtensionConfig | boolean | string[] | any;
}

export interface PortalsConfig {
  autoLoad: boolean;
  paths: string[];
  apiKeys?: Record<string, string>;
  defaultPortal?: string;
  fallbackPortal?: string;
}

export interface MultiAgentConfig {
  enabled: boolean;
  maxConcurrentAgents?: number;
  coordinationStrategy?: 'centralized' | 'distributed' | 'hybrid';
  messagingProtocol?: 'direct' | 'pubsub' | 'queue';
}

export interface PerformanceConfig {
  enableMetrics?: boolean;
  metricsInterval?: number;
  memoryLimit?: number;
  cpuThreshold?: number;
  enableProfiling?: boolean;
}

export interface SecurityConfig {
  enableAuth?: boolean;
  enableEncryption?: boolean;
  allowedOrigins?: string[];
  rateLimiting?: RateLimitConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipWhitelist?: string[];
}

/**
 * Runtime state interface
 */
export interface RuntimeState {
  status: RuntimeStatus;
  startTime: Timestamp;
  uptime: number;
  activeAgents: number;
  totalAgents: number;
  metrics: RuntimeMetrics;
  errors: RuntimeError[];
  version: string;
  environment: RuntimeEnvironment;
}

export enum RuntimeStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

export interface RuntimeEnvironment {
  nodeVersion: string;
  platform: string;
  arch: string;
  hostname: string;
  pid: number;
}

/**
 * Runtime hook interface for lifecycle management
 */
export interface RuntimeHook {
  phase: RuntimePhase;
  handler: RuntimeHookHandler;
  priority: number;
  name?: string;
  description?: string;
}

export enum RuntimePhase {
  PRE_INIT = 'pre_init',
  POST_INIT = 'post_init',
  PRE_START = 'pre_start',
  POST_START = 'post_start',
  PRE_STOP = 'pre_stop',
  POST_STOP = 'post_stop',
  PRE_TICK = 'pre_tick',
  POST_TICK = 'post_tick',
  ERROR = 'error',
}

export type RuntimeHookHandler = (
  context: RuntimeHookContext
) => void | Promise<void>;

export interface RuntimeHookContext {
  phase: RuntimePhase;
  runtime: RuntimeReference;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface RuntimeReference {
  state: RuntimeState;
  config: RuntimeConfiguration;
  agentCount: number;
  extensionCount: number;
}

/**
 * Runtime metrics interface
 */
export interface RuntimeMetrics {
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  uptime: number;
  tickRate: number;
  eventRate: number;
  agentMetrics: AgentMetrics;
  extensionMetrics: ExtensionMetrics;
  timestamp: Timestamp;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  gcCount?: number;
  gcDuration?: number;
}

export interface CPUMetrics {
  usage: number;
  user: number;
  system: number;
  idle: number;
  loadAverage: number[];
}

export interface AgentMetrics {
  total: number;
  active: number;
  idle: number;
  error: number;
  lazy: number;
  averageThinkTime: number;
  averageResponseTime: number;
}

export interface ExtensionMetrics {
  total: number;
  active: number;
  error: number;
  messagesSent: number;
  messagesReceived: number;
  averageProcessingTime: number;
}

/**
 * Runtime error class with additional context
 */
export class RuntimeError extends Error {
  public readonly code: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Timestamp;
  public readonly phase?: RuntimePhase;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    context: Record<string, any> = {},
    recoverable = true
  ) {
    super(message);
    this.name = 'RuntimeError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.recoverable = recoverable;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RuntimeError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      phase: this.phase,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

/**
 * Runtime lifecycle events
 */
export interface RuntimeLifecycleEvents {
  onInit?: () => void | Promise<void>;
  onStart?: () => void | Promise<void>;
  onStop?: () => void | Promise<void>;
  onError?: (error: RuntimeError) => void | Promise<void>;
  onAgentLoad?: (agentId: string) => void | Promise<void>;
  onAgentUnload?: (agentId: string) => void | Promise<void>;
  onExtensionLoad?: (extensionId: string) => void | Promise<void>;
  onExtensionUnload?: (extensionId: string) => void | Promise<void>;
}

/**
 * Runtime timer type
 */
export type RuntimeTimer = {
  id: string;
  interval: number;
  callback: () => void | Promise<void>;
  lastRun?: Timestamp;
  nextRun?: Timestamp;
  active: boolean;
};

/**
 * Runtime monitoring interface
 */
export interface RuntimeMonitoring {
  enableMetrics(): void;
  disableMetrics(): void;
  getMetrics(): RuntimeMetrics;
  resetMetrics(): void;
  exportMetrics(format: 'json' | 'prometheus' | 'csv'): string;
  subscribeToMetrics(
    callback: (metrics: RuntimeMetrics) => void,
    interval?: number
  ): () => void;
}
