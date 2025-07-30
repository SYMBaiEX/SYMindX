/**
 * Context Transformation System for SYMindX
 *
 * This module provides interfaces and types for transforming unified context
 * into module-specific formats while maintaining context integrity and
 * enabling bidirectional transformations.
 */

import { BaseContext, PortalContext } from '../context.js';
import { Metadata, Context } from '../common.js';
import { OperationResult } from '../helpers.js';

/**
 * Transformation target types for different modules
 */
export enum TransformationTarget {
  COGNITION = 'cognition',
  PORTAL = 'portal',
  MEMORY = 'memory',
  EXTENSION = 'extension',
  EMOTION = 'emotion',
  MINIMAL = 'minimal',
  CUSTOM = 'custom',
}

/**
 * Transformation strategy types
 */
export enum TransformationStrategy {
  FULL = 'full', // Complete context transformation
  SELECTIVE = 'selective', // Only relevant fields
  MINIMAL = 'minimal', // Bare minimum required
  OPTIMIZED = 'optimized', // Performance-optimized
  CACHED = 'cached', // Use cached transformation
  STREAMING = 'streaming', // Real-time streaming transformation
}

/**
 * Transformation operation types
 */
export enum TransformationOperation {
  TRANSFORM = 'transform',
  REVERSE = 'reverse',
  VALIDATE = 'validate',
  OPTIMIZE = 'optimize',
  CACHE = 'cache',
  AUDIT = 'audit',
}

/**
 * Base unified context structure for transformations
 */
export interface UnifiedContext extends BaseContext {
  // Core identification
  agentId: string;
  sessionId: string;
  contextId: string;

  // Temporal information
  timestamp: Date;
  lastModified: Date;
  version: number;

  // Content
  content: string;
  messages: ContextMessage[];

  // State information
  state: ContextState;
  environment: ContextEnvironment;

  // Processing metadata
  metadata: ContextMetadata;

  // Module-specific data
  cognitionData?: CognitionContextData;
  emotionData?: EmotionContextData;
  memoryData?: MemoryContextData;
  extensionData?: Record<string, unknown>;

  // Performance data
  performance: ContextPerformance;
}

/**
 * Context message structure
 */
export interface ContextMessage {
  id: string;
  from: string;
  to?: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'agent' | 'system' | 'tool';
  metadata?: Record<string, unknown>;
  emotions?: string[];
  intent?: string;
}

/**
 * Context state information
 */
export interface ContextState {
  phase:
    | 'initialization'
    | 'active'
    | 'processing'
    | 'waiting'
    | 'complete'
    | 'error';
  mood: 'positive' | 'neutral' | 'negative';
  engagement: number; // 0-1
  confidence: number; // 0-1
  complexity: number; // 0-1
  priority: number; // 0-1
}

/**
 * Context environment information
 */
export interface ContextEnvironment {
  platform?: string;
  location?: string;
  language?: string;
  timezone?: string;
  capabilities?: string[];
  constraints?: string[];
}

/**
 * Context metadata
 */
export interface ContextMetadata extends Metadata {
  transformationHistory: TransformationRecord[];
  validationResults: ValidationResult[];
  performanceMetrics: PerformanceMetric[];
  cacheInfo?: CacheInfo;
}

/**
 * Module-specific context data structures
 */
export interface CognitionContextData {
  thoughts: string[];
  reasoningChain?: string[];
  decisions?: Decision[];
  plans?: Plan[];
  goals?: Goal[];
  constraints?: Constraint[];
}

export interface EmotionContextData {
  currentEmotions: EmotionState[];
  emotionHistory: EmotionHistoryEntry[];
  triggers: EmotionTrigger[];
  intensity: number;
  stability: number;
}

export interface MemoryContextData {
  relevantMemories: MemoryReference[];
  memoryQueries: MemoryQuery[];
  importance: number;
  persistenceLevel: 'temporary' | 'session' | 'short_term' | 'long_term';
  tags: string[];
}

/**
 * Context performance metrics
 */
export interface ContextPerformance {
  creationTime: number;
  lastAccessTime: number;
  accessCount: number;
  transformationCount: number;
  size: number;
  complexity: number;
}

/**
 * Transformation result structure
 */
export interface TransformationResult<T = unknown> extends OperationResult {
  transformedContext: T;
  originalContext: UnifiedContext;
  target: TransformationTarget;
  strategy: TransformationStrategy;
  operation: TransformationOperation;
  metadata: TransformationMetadata;
  performance: TransformationPerformance;
  reversible: boolean;
  cached: boolean;
}

/**
 * Transformation metadata
 */
export interface TransformationMetadata {
  transformerId: string;
  transformerVersion: string;
  timestamp: Date;
  inputSize: number;
  outputSize: number;
  fieldsTransformed: string[];
  fieldsDropped: string[];
  fieldsAdded: string[];
  validationPassed: boolean;
  cacheHit: boolean;
}

/**
 * Transformation performance metrics
 */
export interface TransformationPerformance {
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
  compressionRatio: number;
  throughput: number;
}

/**
 * Transformation record for audit trail
 */
export interface TransformationRecord {
  id: string;
  operation: TransformationOperation;
  target: TransformationTarget;
  strategy: TransformationStrategy;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  inputHash: string;
  outputHash: string;
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-1
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  code: string;
}

/**
 * Performance metric structure
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

/**
 * Cache information
 */
export interface CacheInfo {
  cacheKey: string;
  hitCount: number;
  missCount: number;
  lastHit?: Date;
  expiry?: Date;
  size: number;
}

/**
 * Supporting data structures for module-specific context data
 */
export interface Decision {
  id: string;
  description: string;
  options: string[];
  selected?: string;
  confidence: number;
  timestamp: Date;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: 'planning' | 'executing' | 'complete' | 'failed';
  priority: number;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  dependencies: string[];
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
  deadline?: Date;
  status: 'active' | 'achieved' | 'abandoned';
}

export interface Constraint {
  id: string;
  type: 'resource' | 'time' | 'ethical' | 'logical';
  description: string;
  severity: number;
}

export interface EmotionState {
  emotion: string;
  intensity: number;
  duration: number;
  trigger?: string;
}

export interface EmotionHistoryEntry {
  emotion: string;
  intensity: number;
  timestamp: Date;
  trigger: string;
  duration: number;
}

export interface EmotionTrigger {
  type: string;
  description: string;
  sensitivity: number;
  cooldown: number;
}

export interface MemoryReference {
  id: string;
  type: string;
  relevance: number;
  lastAccessed: Date;
}

export interface MemoryQuery {
  query: string;
  timestamp: Date;
  results: number;
  relevance: number;
}

/**
 * Transformation configuration
 */
export interface TransformationConfig {
  target: TransformationTarget;
  strategy: TransformationStrategy;
  options: TransformationOptions;
  validation: ValidationConfig;
  performance: PerformanceConfig;
  cache: CacheConfig;
}

export interface TransformationOptions {
  includeMetadata?: boolean;
  includeHistory?: boolean;
  includePerformance?: boolean;
  compressContent?: boolean;
  filterSensitiveData?: boolean;
  maxFieldDepth?: number;
  maxArrayLength?: number;
  customFields?: string[];
  excludeFields?: string[];
}

export interface ValidationConfig {
  enabled: boolean;
  strict: boolean;
  requireAllFields?: boolean;
  customValidators?: string[];
  skipValidation?: string[];
}

export interface PerformanceConfig {
  enableMetrics: boolean;
  enableProfiling: boolean;
  maxDuration?: number;
  maxMemoryUsage?: number;
  enableOptimization?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'lfu' | 'fifo';
  keyPrefix?: string;
}

/**
 * Context transformer interface
 */
export interface ContextTransformer<
  TInput = UnifiedContext,
  TOutput = unknown,
> {
  readonly id: string;
  readonly version: string;
  readonly target: TransformationTarget;
  readonly supportedStrategies: TransformationStrategy[];
  readonly reversible: boolean;

  /**
   * Transform unified context to target format
   */
  transform(
    context: TInput,
    config?: TransformationConfig
  ): Promise<TransformationResult<TOutput>>;

  /**
   * Reverse transform target format back to unified context
   */
  reverse?(
    transformedContext: TOutput,
    originalMetadata: TransformationMetadata
  ): Promise<TransformationResult<UnifiedContext>>;

  /**
   * Validate transformed context
   */
  validate(
    context: TOutput,
    config?: ValidationConfig
  ): Promise<ValidationResult>;

  /**
   * Optimize transformation for performance
   */
  optimize?(
    context: TInput,
    config?: PerformanceConfig
  ): Promise<TransformationResult<TOutput>>;

  /**
   * Get transformation capabilities
   */
  getCapabilities(): TransformerCapabilities;
}

/**
 * Transformer capabilities
 */
export interface TransformerCapabilities {
  target: TransformationTarget;
  strategies: TransformationStrategy[];
  reversible: boolean;
  cacheable: boolean;
  streamable: boolean;
  batchable: boolean;
  maxInputSize?: number;
  minInputSize?: number;
  supportedFormats: string[];
  dependencies: string[];
  performance: {
    averageDuration: number;
    memoryUsage: number;
    throughput: number;
  };
}

/**
 * Transformation pipeline configuration
 */
export interface TransformationPipelineConfig {
  transformers: TransformerConfig[];
  validation: PipelineValidationConfig;
  performance: PipelinePerformanceConfig;
  cache: PipelineCacheConfig;
  audit: PipelineAuditConfig;
}

export interface TransformerConfig {
  id: string;
  target: TransformationTarget;
  strategy: TransformationStrategy;
  enabled: boolean;
  priority: number;
  config: TransformationConfig;
}

export interface PipelineValidationConfig extends ValidationConfig {
  validatePipeline: boolean;
  failOnError: boolean;
  continueOnWarning: boolean;
}

export interface PipelinePerformanceConfig extends PerformanceConfig {
  enablePipeline: boolean;
  maxPipelineDuration?: number;
  parallelExecution?: boolean;
  maxConcurrency?: number;
}

export interface PipelineCacheConfig extends CacheConfig {
  cacheIntermediate: boolean;
  cacheFinal: boolean;
  shareCache: boolean;
}

export interface PipelineAuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logTransformations: boolean;
  logPerformance: boolean;
  logErrors: boolean;
  retainHistory: number; // days
}

/**
 * Pipeline execution result
 */
export interface PipelineExecutionResult<T = unknown> {
  success: boolean;
  results: TransformationResult<T>[];
  errors: TransformationError[];
  performance: PipelinePerformance;
  audit: PipelineAuditRecord;
}

export interface TransformationError {
  transformerId: string;
  target: TransformationTarget;
  error: Error;
  timestamp: Date;
  recoverable: boolean;
}

export interface PipelinePerformance {
  totalDuration: number;
  transformationCount: number;
  cacheHitRate: number;
  memoryUsage: number;
  throughput: number;
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  transformerId: string;
  duration: number;
  memoryUsage: number;
  reason: string;
}

export interface PipelineAuditRecord {
  pipelineId: string;
  executionId: string;
  timestamp: Date;
  input: {
    contextId: string;
    size: number;
    hash: string;
  };
  transformations: TransformationRecord[];
  output: {
    size: number;
    hash: string;
    targets: TransformationTarget[];
  };
  performance: PipelinePerformance;
  errors: TransformationError[];
}

/**
 * Transformation events for observability
 */
export interface TransformationEvent {
  type: 'started' | 'completed' | 'failed' | 'cached' | 'validated';
  transformerId: string;
  target: TransformationTarget;
  contextId: string;
  timestamp: Date;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Context transformer registry interface
 */
export interface TransformerRegistry {
  register(transformer: ContextTransformer): void;
  unregister(transformerId: string): void;
  get(target: TransformationTarget): ContextTransformer | undefined;
  getAll(): ContextTransformer[];
  getByCapability(
    capability: keyof TransformerCapabilities
  ): ContextTransformer[];
}
