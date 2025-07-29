/**
 * Context Enrichment Types for SYMindX
 * 
 * This module defines types for the dynamic context enrichment system that
 * transforms basic context into rich, actionable context for agents.
 */

import { MemoryRecord } from '../agent';
import { EmotionState } from '../emotion';
import { OperationResult } from '../helpers';
import { Context, Metadata } from '../common';

/**
 * Priority levels for context enrichment operations
 */
export enum EnrichmentPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Enrichment stage in the pipeline
 */
export enum EnrichmentStage {
  PRE_PROCESSING = 'pre_processing',
  CORE_ENRICHMENT = 'core_enrichment',
  POST_PROCESSING = 'post_processing',
  FINALIZATION = 'finalization',
}

/**
 * Source information for enriched context data
 */
export interface EnrichmentSource {
  enricherId: string;
  timestamp: Date;
  confidence: number; // 0-1 confidence score
  metadata?: Metadata;
}

/**
 * Result of a context enrichment operation
 */
export interface ContextEnrichmentResult {
  success: boolean;
  enrichedContext: Record<string, unknown>;
  sources: EnrichmentSource[];
  duration: number; // milliseconds
  cached: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Configuration for individual enrichers
 */
export interface EnricherConfig {
  enabled: boolean;
  priority: EnrichmentPriority;
  stage: EnrichmentStage;
  timeout: number; // milliseconds
  maxRetries: number;
  cacheEnabled: boolean;
  cacheTtl?: number; // cache time-to-live in seconds
  dependsOn?: string[]; // Other enricher IDs this depends on
  metadata?: Metadata;
}

/**
 * Context enrichment request configuration
 */
export interface EnrichmentRequest {
  agentId: string;
  context: Context;
  requiredEnrichers?: string[];
  excludedEnrichers?: string[];
  timeoutMs?: number;
  priority?: EnrichmentPriority;
  cacheKey?: string;
  metadata?: Metadata;
}

/**
 * Pipeline execution configuration
 */
export interface EnrichmentPipelineConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  enableCaching: boolean;
  cacheTtl: number;
  enableMetrics: boolean;
  enableTracing: boolean;
  retryStrategy: {
    maxRetries: number;
    backoffMs: number;
    exponential: boolean;
  };
}

/**
 * Core interface for context enrichers
 */
export interface ContextEnricher {
  /**
   * Unique identifier for this enricher
   */
  readonly id: string;

  /**
   * Human-readable name for this enricher
   */
  readonly name: string;

  /**
   * Version of this enricher
   */
  readonly version: string;

  /**
   * Configuration for this enricher
   */
  readonly config: EnricherConfig;

  /**
   * Enrich the given context with additional data
   * @param request The enrichment request
   * @returns Promise resolving to enrichment result
   */
  enrich(request: EnrichmentRequest): Promise<ContextEnrichmentResult>;

  /**
   * Check if this enricher can process the given context
   * @param context The context to check
   * @returns True if this enricher can process the context
   */
  canEnrich(context: Context): boolean;

  /**
   * Get the expected keys this enricher will add to context
   * @returns Array of context keys this enricher provides
   */
  getProvidedKeys(): string[];

  /**
   * Get keys this enricher depends on from other enrichers
   * @returns Array of context keys this enricher requires
   */
  getRequiredKeys(): string[];

  /**
   * Initialize the enricher with configuration
   * @param config Configuration for the enricher
   * @returns Promise resolving to initialization result
   */
  initialize(config?: Partial<EnricherConfig>): Promise<OperationResult>;

  /**
   * Clean up resources used by the enricher
   * @returns Promise resolving to cleanup result
   */
  dispose(): Promise<OperationResult>;

  /**
   * Get health status of the enricher
   * @returns Health check result
   */
  healthCheck(): Promise<OperationResult>;
}

/**
 * Memory-based context enrichment data
 */
export interface MemoryEnrichmentData {
  relevantMemories: MemoryRecord[];
  memoryCount: number;
  searchQuery?: string;
  searchScore?: number;
  temporalContext?: {
    recentMemories: MemoryRecord[];
    historicalMemories: MemoryRecord[];
  };
}

/**
 * Environment-based context enrichment data
 */
export interface EnvironmentEnrichmentData {
  systemInfo: {
    platform: string;
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  agentInfo: {
    id: string;
    status: string;
    lastActivity: Date;
    activeModules: string[];
  };
  runtimeInfo: {
    timestamp: Date;
    sessionId: string;
    requestId?: string;
  };
}

/**
 * Emotional context enrichment data
 */
export interface EmotionalEnrichmentData {
  currentEmotion: EmotionState;
  emotionalHistory: Array<{
    emotion: string;
    intensity: number;
    timestamp: Date;
    trigger?: string;
  }>;
  emotionalTrends: {
    dominantEmotion: string;
    averageIntensity: number;
    volatility: number; // How much emotions change
  };
  contextualEmotions: {
    [key: string]: number; // emotion -> relevance score
  };
}

/**
 * Social context enrichment data
 */
export interface SocialEnrichmentData {
  relationships: Array<{
    entityId: string;
    relationshipType: string;
    strength: number; // 0-1
    lastInteraction: Date;
    interactionCount: number;
  }>;
  conversationContext: {
    participantCount: number;
    conversationLength: number;
    topicAnalysis?: {
      primaryTopics: string[];
      sentiment: number; // -1 to 1
    };
  };
  socialMetrics: {
    trustLevel: number; // 0-1
    familiarityLevel: number; // 0-1
    communicationStyle: string;
  };
}

/**
 * Temporal context enrichment data
 */
export interface TemporalEnrichmentData {
  currentTimestamp: Date;
  timezone: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
  isWeekend: boolean;
  seasonalContext?: {
    season: 'spring' | 'summer' | 'fall' | 'winter';
    month: string;
    quarter: number;
  };
  relativeTime: {
    sessionDuration: number; // milliseconds
    timeSinceLastInteraction: number; // milliseconds
    conversationAge: number; // milliseconds
  };
  chronologicalMarkers: {
    isFirstInteraction: boolean;
    isNewSession: boolean;
    isReturningUser: boolean;
  };
}

/**
 * Enrichment metrics for monitoring and optimization
 */
export interface EnrichmentMetrics {
  enricherId: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  successRate: number;
  cacheHitRate: number;
  errorCount: number;
  lastExecuted?: Date;
  performanceProfile: {
    p50: number; // 50th percentile execution time
    p95: number; // 95th percentile execution time
    p99: number; // 99th percentile execution time
  };
}

/**
 * Pipeline execution result with comprehensive metrics
 */
export interface PipelineExecutionResult {
  success: boolean;
  enrichedContext: Context;
  executionTime: number;
  enrichersExecuted: string[];
  enrichersSkipped: string[];
  enrichersFailed: string[];
  cacheHits: number;
  errors: Array<{
    enricherId: string;
    error: string;
    stage: EnrichmentStage;
  }>;
  metrics: {
    totalEnrichers: number;
    successfulEnrichers: number;
    parallelExecutions: number;
    sequentialExecutions: number;
  };
  sources: EnrichmentSource[];
}

/**
 * Cache entry for enrichment results
 */
export interface EnrichmentCacheEntry {
  key: string;
  result: ContextEnrichmentResult;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  metadata?: Metadata;
}

/**
 * Enrichment dependency graph node
 */
export interface DependencyGraphNode {
  enricherId: string;
  dependencies: string[];
  dependents: string[];
  stage: EnrichmentStage;
  priority: EnrichmentPriority;
  canRunInParallel: boolean;
}

/**
 * Error types specific to enrichment operations
 */
export enum EnrichmentErrorType {
  TIMEOUT = 'timeout',
  DEPENDENCY_FAILED = 'dependency_failed',
  CONFIGURATION_ERROR = 'configuration_error',
  RESOURCE_UNAVAILABLE = 'resource_unavailable',
  VALIDATION_FAILED = 'validation_failed',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  ENRICHER_NOT_FOUND = 'enricher_not_found',
}

/**
 * Detailed enrichment error information
 */
export interface EnrichmentError {
  type: EnrichmentErrorType;
  enricherId: string;
  message: string;
  cause?: Error;
  context?: Context;
  timestamp: Date;
  retryable: boolean;
  metadata?: Metadata;
}

/**
 * Factory function type for creating enrichers
 */
export type EnricherFactory = (config?: Partial<EnricherConfig>) => Promise<ContextEnricher>;

/**
 * Registry entry for enrichers
 */
export interface EnricherRegistryEntry {
  id: string;
  factory: EnricherFactory;
  metadata: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    tags?: string[];
  };
  defaultConfig: EnricherConfig;
  registeredAt: Date;
}