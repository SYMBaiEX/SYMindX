/**
 * @fileoverview Context Support Types for SYMindX Unified Context System
 * @description Supporting type definitions, enums, and utility types for the
 * unified context system. This module provides all the foundational types
 * needed to implement comprehensive context management.
 * 
 * @version 1.0.0
 * @author SYMindX Core Team
 */

import type {
  BaseConfig,
  Metadata,
  GenericData,
  ActionParameters,
} from '../common.js';
import type {
  Agent,
  AgentState,
  AgentEvent,
  MemoryRecord,
  EmotionState,
  Extension,
} from '../agent.js';
import type { Portal } from '../portal.js';
import type { Timestamp, AgentId } from '../helpers.js';

/**
 * Context State Enumeration
 * Represents the lifecycle state of a context object
 */
export enum ContextState {
  /** Context is being created or initialized */
  INITIALIZING = 'initializing',
  /** Context is active and ready for use */
  ACTIVE = 'active',
  /** Context is temporarily suspended */
  SUSPENDED = 'suspended',
  /** Context is being updated */
  UPDATING = 'updating',
  /** Context has expired but not yet cleaned up */
  EXPIRED = 'expired',
  /** Context is being archived */
  ARCHIVING = 'archiving',
  /** Context has been archived for historical reference */
  ARCHIVED = 'archived',
  /** Context is being destroyed */
  DESTROYING = 'destroying',
  /** Context has been destroyed and is no longer valid */
  DESTROYED = 'destroyed',
  /** Context is in an error state */
  ERROR = 'error',
}

/**
 * Context Operation Types
 * Defines the types of operations that can be performed on contexts
 */
export enum ContextOperation {
  /** Create a new context */
  CREATE = 'create',
  /** Read context data */
  READ = 'read',
  /** Update existing context */
  UPDATE = 'update',
  /** Delete context */
  DELETE = 'delete',
  /** Merge multiple contexts */
  MERGE = 'merge',
  /** Clone context */
  CLONE = 'clone',
  /** Archive context */
  ARCHIVE = 'archive',
  /** Restore archived context */
  RESTORE = 'restore',
  /** Invalidate context */
  INVALIDATE = 'invalidate',
  /** Refresh context data */
  REFRESH = 'refresh',
}

/**
 * Context Validation Results
 * Results from context validation operations
 */
export enum ContextValidationResult {
  /** Context is valid */
  VALID = 'valid',
  /** Context is invalid */
  INVALID = 'invalid',
  /** Context has warnings but is usable */
  WARNING = 'warning',
  /** Context validation failed due to error */
  ERROR = 'error',
}

/**
 * Context Serialization Formats
 * Supported formats for context serialization
 */
export enum ContextSerializationFormat {
  /** JSON format */
  JSON = 'json',
  /** Binary format */
  BINARY = 'binary',
  /** MessagePack format */
  MSGPACK = 'msgpack',
  /** YAML format */
  YAML = 'yaml',
  /** XML format */
  XML = 'xml',
}

/**
 * Context Access Permissions
 * Defines access control for context operations
 */
export enum ContextPermission {
  /** Read access to context data */
  READ = 'read',
  /** Write access to context data */
  WRITE = 'write',
  /** Delete access for context */
  DELETE = 'delete',
  /** Archive access for context */
  ARCHIVE = 'archive',
  /** Administrative access (all permissions) */
  ADMIN = 'admin',
}

/**
 * Context Event Types
 * Events that can be emitted by the context system
 */
export enum ContextEventType {
  /** Context created */
  CREATED = 'context.created',
  /** Context updated */
  UPDATED = 'context.updated',
  /** Context deleted */
  DELETED = 'context.deleted',
  /** Context merged */
  MERGED = 'context.merged',
  /** Context expired */
  EXPIRED = 'context.expired',
  /** Context archived */
  ARCHIVED = 'context.archived',
  /** Context error occurred */
  ERROR = 'context.error',
  /** Context validation failed */
  VALIDATION_FAILED = 'context.validation_failed',
  /** Context accessed */
  ACCESSED = 'context.accessed',
}

/**
 * Context Relationship Types
 * Defines relationships between contexts
 */
export enum ContextRelationshipType {
  /** Parent-child relationship */
  PARENT = 'parent',
  /** Child relationship */
  CHILD = 'child',
  /** Sibling relationship (same parent) */
  SIBLING = 'sibling',
  /** Reference relationship */
  REFERENCE = 'reference',
  /** Dependency relationship */
  DEPENDENCY = 'dependency',
  /** Inheritance relationship */
  INHERITANCE = 'inheritance',
  /** Composition relationship */
  COMPOSITION = 'composition',
}

/**
 * Context Cache Strategy
 * Caching strategies for context data
 */
export enum ContextCacheStrategy {
  /** No caching */
  NONE = 'none',
  /** Memory-based caching */
  MEMORY = 'memory',
  /** Disk-based caching */
  DISK = 'disk',
  /** Distributed caching */
  DISTRIBUTED = 'distributed',
  /** Hybrid caching (memory + disk) */
  HYBRID = 'hybrid',
}

/**
 * Context Compression Types
 * Compression algorithms for context storage
 */
export enum ContextCompressionType {
  /** No compression */
  NONE = 'none',
  /** GZIP compression */
  GZIP = 'gzip',
  /** LZ4 compression */
  LZ4 = 'lz4',
  /** Brotli compression */
  BROTLI = 'brotli',
  /** Snappy compression */
  SNAPPY = 'snappy',
}

/**
 * Context Migration Status
 * Status of context schema migrations
 */
export enum ContextMigrationStatus {
  /** No migration needed */
  UP_TO_DATE = 'up_to_date',
  /** Migration pending */
  PENDING = 'pending',
  /** Migration in progress */
  MIGRATING = 'migrating',
  /** Migration completed */
  COMPLETED = 'completed',
  /** Migration failed */
  FAILED = 'failed',
  /** Migration rolled back */
  ROLLED_BACK = 'rolled_back',
}

/**
 * Context Validation Rule Interface
 * Defines validation rules for context data
 */
export interface ContextValidationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule severity level */
  severity: 'error' | 'warning' | 'info';
  /** Validation function */
  validate: (context: unknown) => ContextValidationResult;
  /** Error message for failed validation */
  errorMessage?: string;
  /** Rule category */
  category?: string;
}

/**
 * Context Event Interface
 * Events emitted by the context system
 */
export interface ContextEvent {
  /** Event identifier */
  id: string;
  /** Event type */
  type: ContextEventType;
  /** Context identifier */
  contextId: string;
  /** Event timestamp */
  timestamp: Timestamp;
  /** Event source */
  source: string;
  /** Event data */
  data: GenericData;
  /** Event metadata */
  metadata?: Metadata;
  /** Related context IDs */
  relatedContexts?: string[];
}

/**
 * Context Relationship Interface
 * Defines relationships between contexts
 */
export interface ContextRelationship {
  /** Relationship identifier */
  id: string;
  /** Source context ID */
  sourceId: string;
  /** Target context ID */
  targetId: string;
  /** Relationship type */
  type: ContextRelationshipType;
  /** Relationship metadata */
  metadata?: Metadata;
  /** Relationship strength (0-1) */
  strength?: number;
  /** Relationship created timestamp */
  createdAt: Timestamp;
  /** Relationship last modified timestamp */
  lastModified: Timestamp;
}

/**
 * Context Access Control Interface
 * Defines access control for contexts
 */
export interface ContextAccessControl {
  /** Owner identifier */
  owner: string;
  /** Group permissions */
  groups: Record<string, ContextPermission[]>;
  /** User permissions */
  users: Record<string, ContextPermission[]>;
  /** Public permissions */
  public: ContextPermission[];
  /** Inheritance from parent context */
  inheritFromParent: boolean;
}

/**
 * Context Cache Entry Interface
 * Represents a cached context entry
 */
export interface ContextCacheEntry {
  /** Context identifier */
  contextId: string;
  /** Cached data */
  data: unknown;
  /** Cache timestamp */
  timestamp: Timestamp;
  /** Time to live in milliseconds */
  ttl: number;
  /** Access count */
  accessCount: number;
  /** Last access timestamp */
  lastAccess: Timestamp;
  /** Cache entry size in bytes */
  size: number;
  /** Cache metadata */
  metadata?: Metadata;
}

/**
 * Context Storage Options Interface
 * Options for context storage
 */
export interface ContextStorageOptions {
  /** Storage provider */
  provider: 'memory' | 'file' | 'database' | 'redis' | 'custom';
  /** Compression type */
  compression: ContextCompressionType;
  /** Serialization format */
  format: ContextSerializationFormat;
  /** Encryption enabled */
  encryption: boolean;
  /** Storage path or connection string */
  path?: string;
  /** Storage options */
  options?: Record<string, unknown>;
}

/**
 * Context Migration Definition Interface
 * Defines a context schema migration
 */
export interface ContextMigration {
  /** Migration identifier */
  id: string;
  /** Migration name */
  name: string;
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Migration function */
  migrate: (context: unknown) => Promise<unknown>;
  /** Rollback function */
  rollback?: (context: unknown) => Promise<unknown>;
  /** Migration description */
  description?: string;
  /** Migration timestamp */
  timestamp: Timestamp;
}

/**
 * Context Listener Interface
 * Interface for context event listeners
 */
export interface ContextListener {
  /** Listener identifier */
  id: string;
  /** Event types to listen for */
  eventTypes: ContextEventType[];
  /** Listener function */
  handler: (event: ContextEvent) => Promise<void> | void;
  /** Listener priority */
  priority?: number;
  /** Listener enabled */
  enabled: boolean;
}

/**
 * Context Statistics Interface
 * Statistical information about context usage
 */
export interface ContextStatistics {
  /** Total number of contexts */
  totalContexts: number;
  /** Contexts by scope */
  byScope: Record<string, number>;
  /** Contexts by state */
  byState: Record<ContextState, number>;
  /** Average context size in bytes */
  averageSize: number;
  /** Cache hit ratio */
  cacheHitRatio: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Disk usage in bytes */
  diskUsage: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Error rate */
  errorRate: number;
}

/**
 * Context Health Status Interface
 * Health information for the context system
 */
export interface ContextHealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Component health statuses */
  components: {
    storage: 'healthy' | 'degraded' | 'unhealthy';
    cache: 'healthy' | 'degraded' | 'unhealthy';
    validation: 'healthy' | 'degraded' | 'unhealthy';
    migration: 'healthy' | 'degraded' | 'unhealthy';
  };
  /** Health check timestamp */
  timestamp: Timestamp;
  /** Health metrics */
  metrics: ContextStatistics;
  /** Health issues */
  issues: Array<{
    component: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Timestamp;
  }>;
}

/**
 * Context Configuration Interface
 * Configuration for context system behavior
 */
export interface ContextConfiguration {
  /** Storage configuration */
  storage: ContextStorageOptions;
  /** Cache configuration */
  cache: {
    strategy: ContextCacheStrategy;
    size: number;
    ttl: number;
    compression: ContextCompressionType;
  };
  /** Validation configuration */
  validation: {
    enabled: boolean;
    rules: ContextValidationRule[];
    strict: boolean;
  };
  /** Migration configuration */
  migration: {
    enabled: boolean;
    autoMigrate: boolean;
    backupBeforeMigration: boolean;
  };
  /** Security configuration */
  security: {
    encryption: boolean;
    accessControl: boolean;
    auditLog: boolean;
  };
  /** Performance configuration */
  performance: {
    monitoring: boolean;
    profiling: boolean;
    optimization: boolean;
  };
}

/**
 * Context Filter Interface
 * Filters for context queries
 */
export interface ContextFilter {
  /** Include patterns */
  include?: {
    scopes?: string[];
    states?: ContextState[];
    sources?: string[];
    tags?: string[];
  };
  /** Exclude patterns */
  exclude?: {
    scopes?: string[];
    states?: ContextState[];
    sources?: string[];
    tags?: string[];
  };
  /** Time range filter */
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  /** Size range filter */
  sizeRange?: {
    min: number;
    max: number;
  };
  /** Custom filter function */
  custom?: (context: unknown) => boolean;
}

/**
 * Context Transformation Interface
 * Defines transformations that can be applied to contexts
 */
export interface ContextTransformation {
  /** Transformation identifier */
  id: string;
  /** Transformation name */
  name: string;
  /** Transformation description */
  description: string;
  /** Input context type */
  inputType: string;
  /** Output context type */
  outputType: string;
  /** Transformation function */
  transform: (input: unknown) => Promise<unknown>;
  /** Validation function for input */
  validateInput?: (input: unknown) => boolean;
  /** Validation function for output */
  validateOutput?: (output: unknown) => boolean;
}

/**
 * Context Aggregation Interface
 * Defines how multiple contexts can be aggregated
 */
export interface ContextAggregation {
  /** Aggregation identifier */
  id: string;
  /** Aggregation name */
  name: string;
  /** Aggregation strategy */
  strategy: 'merge' | 'concat' | 'override' | 'custom';
  /** Aggregation function for custom strategy */
  aggregate?: (contexts: unknown[]) => unknown;
  /** Priority resolution for conflicts */
  priorityResolution: 'highest' | 'lowest' | 'first' | 'last' | 'custom';
  /** Custom priority resolver */
  priorityResolver?: (contexts: unknown[]) => unknown;
}

/**
 * Context Template Interface
 * Templates for creating standardized contexts
 */
export interface ContextTemplate {
  /** Template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template version */
  version: string;
  /** Template schema */
  schema: Record<string, unknown>;
  /** Default values */
  defaults: Record<string, unknown>;
  /** Required fields */
  required: string[];
  /** Validation rules */
  validation: ContextValidationRule[];
  /** Template metadata */
  metadata?: Metadata;
}

/**
 * Context Extension Point Interface
 * Defines extension points for context system
 */
export interface ContextExtensionPoint {
  /** Extension point identifier */
  id: string;
  /** Extension point name */
  name: string;
  /** Extension point description */
  description: string;
  /** Extension point type */
  type: 'hook' | 'filter' | 'transformer' | 'validator';
  /** Extension point function signature */
  signature: string;
  /** Extension point metadata */
  metadata?: Metadata;
}

/**
 * Context Plugin Interface
 * Interface for context system plugins
 */
export interface ContextPlugin {
  /** Plugin identifier */
  id: string;
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author: string;
  /** Plugin dependencies */
  dependencies: string[];
  /** Plugin initialization function */
  initialize: (config: BaseConfig) => Promise<void>;
  /** Plugin cleanup function */
  cleanup: () => Promise<void>;
  /** Plugin extension points */
  extensionPoints: ContextExtensionPoint[];
  /** Plugin metadata */
  metadata?: Metadata;
}

/**
 * Context Type Definitions for Utility Types
 */
export type ContextPropertyPath = string;
export type ContextPropertyValue = unknown;
export type ContextSelector = (context: unknown) => boolean;
export type ContextComparator = (a: unknown, b: unknown) => number;
export type ContextMapper<T, R> = (context: T) => R;
export type ContextReducer<T, R> = (accumulator: R, context: T) => R;

/**
 * Context Utility Types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type ContextPatch<T> = DeepPartial<T> & {
  _operation?: ContextOperation;
  _timestamp?: Timestamp;
  _source?: string;
};

export type ContextSnapshot<T> = DeepReadonly<T> & {
  _snapshotId: string;
  _timestamp: Timestamp;
  _version: string;
};

/**
 * Context Builder Pattern Types
 */
export interface ContextBuilder<T = unknown> {
  withScope(scope: string): ContextBuilder<T>;
  withPriority(priority: number): ContextBuilder<T>;
  withSource(source: string): ContextBuilder<T>;
  withTags(tags: string[]): ContextBuilder<T>;
  withData(data: T): ContextBuilder<T>;
  withExpiration(expiresAt: Timestamp): ContextBuilder<T>;
  withParent(parent: unknown): ContextBuilder<T>;
  build(): T;
}

/**
 * Context Factory Types
 */
export interface ContextFactory<T = unknown> {
  create(options: Record<string, unknown>): T;
  createFromTemplate(templateId: string, data: Record<string, unknown>): T;
  createFromSnapshot(snapshot: ContextSnapshot<T>): T;
  clone(source: T): T;
}

/**
 * Context Repository Types
 */
export interface ContextRepository<T = unknown> {
  save(context: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findByFilter(filter: ContextFilter): Promise<T[]>;
  update(id: string, patch: ContextPatch<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: ContextFilter): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Context Observer Types
 */
export interface ContextObserver<T = unknown> {
  onCreated?(context: T): void | Promise<void>;
  onUpdated?(context: T, changes: ContextPatch<T>): void | Promise<void>;
  onDeleted?(contextId: string): void | Promise<void>;
  onError?(error: Error, context?: T): void | Promise<void>;
}

/**
 * Context Middleware Types
 */
export interface ContextMiddleware<T = unknown> {
  name: string;
  priority: number;
  before?(context: T, operation: ContextOperation): Promise<T>;
  after?(context: T, operation: ContextOperation, result: unknown): Promise<T>;
  error?(error: Error, context: T, operation: ContextOperation): Promise<T>;
}

/**
 * Default Values and Constants
 */
export const DEFAULT_CONTEXT_TTL = 3600000; // 1 hour in milliseconds
export const DEFAULT_CACHE_SIZE = 1000;
export const DEFAULT_VALIDATION_TIMEOUT = 5000; // 5 seconds
export const DEFAULT_MIGRATION_TIMEOUT = 30000; // 30 seconds
export const MAX_CONTEXT_SIZE = 10485760; // 10MB
export const MIN_CONTEXT_TTL = 1000; // 1 second
export const MAX_CONTEXT_TTL = 2592000000; // 30 days

/**
 * Context Error Types
 */
export class ContextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly contextId?: string,
    public readonly operation?: ContextOperation
  ) {
    super(message);
    this.name = 'ContextError';
  }
}

export class ContextValidationError extends ContextError {
  constructor(
    message: string,
    public readonly validationResult: ContextValidationResult,
    contextId?: string
  ) {
    super(message, 'VALIDATION_ERROR', contextId, ContextOperation.READ);
    this.name = 'ContextValidationError';
  }
}

export class ContextNotFoundError extends ContextError {
  constructor(contextId: string) {
    super(`Context not found: ${contextId}`, 'NOT_FOUND', contextId, ContextOperation.READ);
    this.name = 'ContextNotFoundError';
  }
}

export class ContextExpiredError extends ContextError {
  constructor(contextId: string) {
    super(`Context expired: ${contextId}`, 'EXPIRED', contextId, ContextOperation.READ);
    this.name = 'ContextExpiredError';
  }
}

export class ContextPermissionError extends ContextError {
  constructor(contextId: string, operation: ContextOperation, permission: ContextPermission) {
    super(
      `Permission denied for ${operation} on context ${contextId}: requires ${permission}`,
      'PERMISSION_DENIED',
      contextId,
      operation
    );
    this.name = 'ContextPermissionError';
  }
}