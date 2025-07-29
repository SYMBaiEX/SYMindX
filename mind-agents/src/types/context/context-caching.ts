/**
 * High-Performance Multi-Level Context Caching System
 * 
 * This module defines the interfaces and types for a sophisticated context caching
 * system with multiple cache levels, intelligent strategies, and performance optimization.
 */

import type { Duration, Timestamp, OperationResult } from '../helpers';
import type { Metadata } from '../common';

/**
 * Cache levels with different performance characteristics
 */
export enum CacheLevel {
  L1 = 'L1',  // In-memory hot cache (sub-millisecond access)
  L2 = 'L2',  // Compressed memory cache with LRU
  L3 = 'L3',  // Persistent disk cache
}

/**
 * Cache strategies for different optimization approaches
 */
export enum CacheStrategy {
  FREQUENCY_BASED = 'frequency_based',
  PREDICTIVE = 'predictive',
  RESOURCE_AWARE = 'resource_aware',
  TTL = 'ttl',
  PRIORITY = 'priority',
}

/**
 * Cache entry status for lifecycle management
 */
export enum CacheEntryStatus {
  FRESH = 'fresh',
  STALE = 'stale',
  EXPIRED = 'expired',
  LOADING = 'loading',
  ERROR = 'error',
}

/**
 * Cache access patterns for optimization
 */
export enum CacheAccessPattern {
  SEQUENTIAL = 'sequential',
  RANDOM = 'random',
  TEMPORAL = 'temporal',
  CONTEXTUAL = 'contextual',
}

/**
 * Individual cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  /** Unique identifier for the cache entry */
  id: string;
  
  /** The cached data */
  data: T;
  
  /** Cache level where entry is stored */
  level: CacheLevel;
  
  /** Current status of the entry */
  status: CacheEntryStatus;
  
  /** When the entry was created */
  createdAt: Timestamp;
  
  /** When the entry was last accessed */
  lastAccessedAt: Timestamp;
  
  /** When the entry was last updated */
  lastUpdatedAt: Timestamp;
  
  /** When the entry expires (if applicable) */
  expiresAt?: Timestamp;
  
  /** Number of times this entry has been accessed */
  accessCount: number;
  
  /** Size of the entry in bytes */
  size: number;
  
  /** Compression ratio if compressed (L2 cache) */
  compressionRatio?: number;
  
  /** Priority score for eviction decisions */
  priority: number;
  
  /** Access pattern classification */
  accessPattern: CacheAccessPattern;
  
  /** Additional metadata */
  metadata: Metadata;
  
  /** Hash of the data for integrity checking */
  dataHash: string;
  
  /** Tags for category-based operations */
  tags: string[];
  
  /** Dependencies for invalidation cascading */
  dependencies: string[];
}

/**
 * Cache configuration for different levels
 */
export interface CacheConfiguration {
  /** L1 cache configuration */
  l1: {
    /** Maximum number of entries */
    maxEntries: number;
    
    /** Maximum memory usage in bytes */
    maxMemoryBytes: number;
    
    /** Enable/disable L1 cache */
    enabled: boolean;
    
    /** Prefetch threshold (entries to keep hot) */
    prefetchThreshold: number;
  };
  
  /** L2 cache configuration */
  l2: {
    /** Maximum number of entries */
    maxEntries: number;
    
    /** Maximum memory usage in bytes */
    maxMemoryBytes: number;
    
    /** Enable/disable L2 cache */
    enabled: boolean;
    
    /** Compression algorithm to use */
    compressionAlgorithm: 'gzip' | 'lz4' | 'brotli';
    
    /** Minimum size threshold for compression */
    compressionThreshold: number;
    
    /** LRU eviction batch size */
    evictionBatchSize: number;
  };
  
  /** L3 cache configuration */
  l3: {
    /** Maximum number of entries */
    maxEntries: number;
    
    /** Maximum disk usage in bytes */
    maxDiskBytes: number;
    
    /** Enable/disable L3 cache */
    enabled: boolean;
    
    /** Directory path for cache storage */
    storageDirectory: string;
    
    /** File rotation settings */
    fileRotation: {
      maxFileSize: number;
      maxFiles: number;
    };
    
    /** Async write buffer size */
    writeBufferSize: number;
    
    /** Enable write-ahead logging */
    enableWAL: boolean;
  };
  
  /** Global cache settings */
  global: {
    /** Default TTL for entries (in milliseconds) */
    defaultTTL: Duration;
    
    /** Cache warming enabled */
    enableWarming: boolean;
    
    /** Maximum concurrent operations */
    maxConcurrentOps: number;
    
    /** Memory pressure thresholds */
    memoryPressure: {
      warning: number;  // Percentage (0-100)
      critical: number; // Percentage (0-100)
    };
    
    /** Statistics collection interval */
    statsInterval: Duration;
    
    /** Enable integrity checking */
    enableIntegrityCheck: boolean;
  };
}

/**
 * Cache invalidation configuration
 */
export interface CacheInvalidationConfig {
  /** Invalidation strategies */
  strategies: {
    /** Time-based invalidation */
    ttl: {
      enabled: boolean;
      checkInterval: Duration;
    };
    
    /** Dependency-based invalidation */
    dependency: {
      enabled: boolean;
      cascadeDepth: number;
    };
    
    /** Tag-based invalidation */
    tag: {
      enabled: boolean;
      batchSize: number;
    };
    
    /** Pattern-based invalidation */
    pattern: {
      enabled: boolean;
      supportedPatterns: string[];
    };
  };
  
  /** Invalidation batch processing */
  batchProcessing: {
    enabled: boolean;
    batchSize: number;
    flushInterval: Duration;
  };
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  /** Hit/miss statistics */
  hitRate: {
    l1: number;
    l2: number;
    l3: number;
    overall: number;
  };
  
  /** Response time statistics */
  responseTime: {
    l1: Duration;
    l2: Duration;
    l3: Duration;
    average: Duration;
  };
  
  /** Memory usage statistics */
  memoryUsage: {
    l1: number;
    l2: number;
    total: number;
    percentage: number;
  };
  
  /** Disk usage statistics (L3) */
  diskUsage: {
    size: number;
    percentage: number;
    files: number;
  };
  
  /** Entry statistics */
  entries: {
    l1: number;
    l2: number;
    l3: number;
    total: number;
  };
  
  /** Operation statistics */
  operations: {
    reads: number;
    writes: number;
    evictions: number;
    invalidations: number;
  };
  
  /** Error statistics */
  errors: {
    total: number;
    byType: Record<string, number>;
    lastError?: {
      message: string;
      timestamp: Timestamp;
    };
  };
  
  /** Performance indicators */
  performance: {
    compressionRatio: number;
    evictionRate: number;
    warmingEfficiency: number;
    integrityCheckFailures: number;
  };
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Enable/disable cache warming */
  enabled: boolean;
  
  /** Warming strategies */
  strategies: {
    /** Predictive warming based on access patterns */
    predictive: {
      enabled: boolean;
      lookAheadWindow: Duration;
      confidenceThreshold: number;
    };
    
    /** Pre-load frequently accessed items */
    frequency: {
      enabled: boolean;
      minimumAccessCount: number;
      timeWindow: Duration;
    };
    
    /** Context-aware warming */
    contextual: {
      enabled: boolean;
      relatedItemsDepth: number;
    };
    
    /** Time-based warming */
    temporal: {
      enabled: boolean;
      schedules: Array<{
        pattern: string; // cron pattern
        items: string[]; // item patterns to warm
      }>;
    };
  };
  
  /** Warming constraints */
  constraints: {
    maxConcurrentWarmingOps: number;
    maxWarmingMemory: number;
    maxWarmingTime: Duration;
  };
}

/**
 * Main cache manager interface
 */
export interface ContextCacheManager {
  /**
   * Initialize the cache manager with configuration
   */
  initialize(config: CacheConfiguration): Promise<OperationResult>;
  
  /**
   * Get an item from cache (tries all levels)
   */
  get<T>(key: string): Promise<T | null>;
  
  /**
   * Set an item in cache with automatic level placement
   */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<OperationResult>;
  
  /**
   * Delete an item from all cache levels
   */
  delete(key: string): Promise<OperationResult>;
  
  /**
   * Check if a key exists in any cache level
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get cache metrics and statistics
   */
  getMetrics(): Promise<CacheMetrics>;
  
  /**
   * Clear specific cache level or all levels
   */
  clear(level?: CacheLevel): Promise<OperationResult>;
  
  /**
   * Invalidate cache entries by pattern or criteria
   */
  invalidate(criteria: CacheInvalidationCriteria): Promise<OperationResult>;
  
  /**
   * Warm cache with predicted or specified items
   */
  warm(items?: CacheWarmingRequest[]): Promise<OperationResult>;
  
  /**
   * Optimize cache by reorganizing and cleaning up
   */
  optimize(): Promise<OperationResult>;
  
  /**
   * Get cache entry information without retrieving data
   */
  inspect(key: string): Promise<CacheEntry | null>;
  
  /**
   * List all cache keys with optional filtering
   */
  listKeys(filter?: CacheKeyFilter): Promise<string[]>;
  
  /**
   * Subscribe to cache events
   */
  subscribe(events: CacheEventType[], callback: CacheEventCallback): OperationResult;
  
  /**
   * Unsubscribe from cache events
   */
  unsubscribe(callback: CacheEventCallback): OperationResult;
  
  /**
   * Shutdown cache manager and cleanup resources
   */
  shutdown(): Promise<OperationResult>;
  
  /**
   * Perform integrity check on cache data
   */
  integrityCheck(): Promise<CacheIntegrityResult>;
  
  /**
   * Export cache data for backup or migration
   */
  export(options?: CacheExportOptions): Promise<CacheExportResult>;
  
  /**
   * Import cache data from backup or migration
   */
  import(data: CacheImportData, options?: CacheImportOptions): Promise<OperationResult>;
}

/**
 * Options for cache set operations
 */
export interface CacheSetOptions {
  /** Time-to-live in milliseconds */
  ttl?: Duration;
  
  /** Priority for eviction decisions */
  priority?: number;
  
  /** Tags for categorization */
  tags?: string[];
  
  /** Dependencies for invalidation */
  dependencies?: string[];
  
  /** Force specific cache level */
  level?: CacheLevel;
  
  /** Enable compression for this entry */
  compress?: boolean;
  
  /** Additional metadata */
  metadata?: Metadata;
}

/**
 * Cache invalidation criteria
 */
export interface CacheInvalidationCriteria {
  /** Invalidate by key pattern */
  pattern?: string;
  
  /** Invalidate by tags */
  tags?: string[];
  
  /** Invalidate by dependencies */
  dependencies?: string[];
  
  /** Invalidate by age */
  olderThan?: Duration;
  
  /** Invalidate by access count */
  accessCountLessThan?: number;
  
  /** Invalidate by cache level */
  level?: CacheLevel;
  
  /** Custom filter function */
  filter?: (entry: CacheEntry) => boolean;
}

/**
 * Cache warming request
 */
export interface CacheWarmingRequest {
  /** Key to warm */
  key: string;
  
  /** Data to warm with */
  data?: unknown;
  
  /** Data loader function if data not provided */
  loader?: () => Promise<unknown>;
  
  /** Options for warming */
  options?: CacheSetOptions;
}

/**
 * Cache key filtering
 */
export interface CacheKeyFilter {
  /** Pattern to match */
  pattern?: string;
  
  /** Tags to match */
  tags?: string[];
  
  /** Cache level to filter by */
  level?: CacheLevel;
  
  /** Status to filter by */
  status?: CacheEntryStatus;
  
  /** Limit number of results */
  limit?: number;
  
  /** Skip number of results */
  offset?: number;
}

/**
 * Cache event types
 */
export enum CacheEventType {
  HIT = 'hit',
  MISS = 'miss',
  SET = 'set',
  DELETE = 'delete',
  EVICT = 'evict',
  EXPIRE = 'expire',
  ERROR = 'error',
  WARM = 'warm',
  OPTIMIZE = 'optimize',
  CLEAR = 'clear',
  INVALIDATE = 'invalidate',
}

/**
 * Cache event data
 */
export interface CacheEvent {
  /** Event type */
  type: CacheEventType;
  
  /** Cache key involved */
  key: string;
  
  /** Cache level involved */
  level: CacheLevel;
  
  /** Event timestamp */
  timestamp: Timestamp;
  
  /** Response time for the operation */
  responseTime?: Duration;
  
  /** Additional event data */
  data?: unknown;
  
  /** Error information if applicable */
  error?: Error;
}

/**
 * Cache event callback
 */
export type CacheEventCallback = (event: CacheEvent) => void;

/**
 * Cache integrity check result
 */
export interface CacheIntegrityResult {
  /** Overall integrity status */
  status: 'healthy' | 'degraded' | 'corrupted';
  
  /** Entries checked */
  entriesChecked: number;
  
  /** Corrupted entries found */
  corruptedEntries: string[];
  
  /** Hash mismatches */
  hashMismatches: string[];
  
  /** Missing dependencies */
  missingDependencies: string[];
  
  /** Detailed report */
  report: {
    l1: { healthy: number; corrupted: number };
    l2: { healthy: number; corrupted: number };
    l3: { healthy: number; corrupted: number };
  };
  
  /** Repair recommendations */
  recommendations: string[];
}

/**
 * Cache export options
 */
export interface CacheExportOptions {
  /** Include specific cache levels */
  levels?: CacheLevel[];
  
  /** Export format */
  format: 'json' | 'binary' | 'csv';
  
  /** Include metadata */
  includeMetadata?: boolean;
  
  /** Compress export data */
  compress?: boolean;
  
  /** Filter entries to export */
  filter?: CacheKeyFilter;
}

/**
 * Cache export result
 */
export interface CacheExportResult {
  /** Export format used */
  format: string;
  
  /** Size of exported data */
  size: number;
  
  /** Number of entries exported */
  entryCount: number;
  
  /** Export data (or file path) */
  data: string | Buffer;
  
  /** Export metadata */
  metadata: {
    exportedAt: Timestamp;
    version: string;
    checksum: string;
  };
}

/**
 * Cache import data
 */
export interface CacheImportData {
  /** Import format */
  format: string;
  
  /** Import data */
  data: string | Buffer;
  
  /** Import metadata */
  metadata: {
    exportedAt: Timestamp;
    version: string;
    checksum: string;
  };
}

/**
 * Cache import options
 */
export interface CacheImportOptions {
  /** Merge strategy for existing entries */
  mergeStrategy: 'overwrite' | 'skip' | 'merge';
  
  /** Validate checksums */
  validateChecksum?: boolean;
  
  /** Target cache levels */
  targetLevels?: CacheLevel[];
  
  /** Import batch size */
  batchSize?: number;
}

/**
 * Cache strategy interface for pluggable strategies
 */
export interface CacheStrategyInterface {
  /** Strategy name */
  name: CacheStrategy;
  
  /** Initialize strategy with configuration */
  initialize(config: unknown): Promise<OperationResult>;
  
  /** Determine cache level for new entry */
  determineCacheLevel(key: string, data: unknown, metadata: Metadata): CacheLevel;
  
  /** Calculate entry priority */
  calculatePriority(entry: CacheEntry): number;
  
  /** Predict access probability */
  predictAccess(key: string, context: Metadata): number;
  
  /** Recommend items for warming */
  recommendWarming(context: Metadata): string[];
  
  /** Handle memory pressure */
  handleMemoryPressure(currentUsage: number, threshold: number): CacheInvalidationCriteria[];
}

/**
 * Benchmark configuration for performance testing
 */
export interface CacheBenchmarkConfig {
  /** Number of operations to perform */
  operationCount: number;
  
  /** Types of operations to benchmark */
  operations: Array<'get' | 'set' | 'delete' | 'has'>;
  
  /** Data size distribution */
  dataSizes: {
    small: { min: number; max: number; weight: number };
    medium: { min: number; max: number; weight: number };
    large: { min: number; max: number; weight: number };
  };
  
  /** Concurrency level */
  concurrency: number;
  
  /** Cache levels to benchmark */
  levels: CacheLevel[];
  
  /** Warmup operations */
  warmupOperations: number;
}

/**
 * Benchmark results
 */
export interface CacheBenchmarkResult {
  /** Configuration used */
  config: CacheBenchmarkConfig;
  
  /** Overall results */
  overall: {
    totalOperations: number;
    totalTime: Duration;
    operationsPerSecond: number;
    averageResponseTime: Duration;
  };
  
  /** Results by operation type */
  byOperation: Record<string, {
    count: number;
    totalTime: Duration;
    averageTime: Duration;
    minTime: Duration;
    maxTime: Duration;
    p95Time: Duration;
    p99Time: Duration;
  }>;
  
  /** Results by cache level */
  byLevel: Record<CacheLevel, {
    hitRate: number;
    averageResponseTime: Duration;
    operationsHandled: number;
  }>;
  
  /** Memory usage during benchmark */
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  
  /** Error statistics */
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Cache benchmark utility interface
 */
export interface CacheBenchmarkUtility {
  /** Run benchmark with specified configuration */
  runBenchmark(config: CacheBenchmarkConfig): Promise<CacheBenchmarkResult>;
  
  /** Generate realistic test data */
  generateTestData(size: number): unknown;
  
  /** Create benchmark report */
  generateReport(result: CacheBenchmarkResult, format: 'text' | 'json' | 'html'): string;
  
  /** Compare benchmark results */
  compareResults(baseline: CacheBenchmarkResult, comparison: CacheBenchmarkResult): CacheBenchmarkComparison;
}

/**
 * Benchmark comparison result
 */
export interface CacheBenchmarkComparison {
  /** Performance improvement/degradation */
  performanceChange: {
    operationsPerSecond: number; // percentage change
    averageResponseTime: number; // percentage change
    hitRate: number; // percentage change
  };
  
  /** Memory usage comparison */
  memoryChange: {
    peakUsage: number; // percentage change
    efficiency: number; // ops per MB
  };
  
  /** Detailed analysis */
  analysis: {
    improvements: string[];
    regressions: string[];
    recommendations: string[];
  };
}