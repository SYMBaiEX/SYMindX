/**
 * Context Enrichment Pipeline for SYMindX
 * 
 * This module implements the orchestration system for context enrichers,
 * providing priority-based execution, parallel processing, caching, and
 * comprehensive metrics collection.
 */

import { EventEmitter } from 'events';
import {
  ContextEnricher,
  EnrichmentRequest,
  PipelineExecutionResult,
  EnrichmentPipelineConfig,
  ContextEnrichmentResult,
  EnrichmentPriority,
  EnrichmentStage,
  EnrichmentMetrics,
  EnrichmentCacheEntry,
  DependencyGraphNode,
  EnrichmentError,
  EnrichmentErrorType,
  EnricherRegistryEntry,
} from '../../types/context/context-enrichment';
import { Context } from '../../types/common';
import { OperationResult } from '../../types/helpers';
import { runtimeLogger } from '../../utils/logger';
import { LRUCache } from '../../utils/LRUCache';

/**
 * Context Enrichment Pipeline
 * 
 * Orchestrates the execution of multiple context enrichers with support for:
 * - Priority-based execution ordering
 * - Parallel and sequential execution
 * - Caching and performance optimization
 * - Dependency resolution
 * - Comprehensive metrics and monitoring
 */
export class EnrichmentPipeline extends EventEmitter {
  private enrichers = new Map<string, ContextEnricher>();
  private enricherRegistry = new Map<string, EnricherRegistryEntry>();
  private enricherResultCache: LRUCache<string, ContextEnrichmentResult>;
  private metrics = new Map<string, EnrichmentMetrics>();
  private dependencyGraph = new Map<string, DependencyGraphNode>();
  private config: EnrichmentPipelineConfig;
  private isInitialized = false;
  
  // Performance optimizations
  private executionQueue: Array<{
    request: EnrichmentRequest;
    resolve: (result: PipelineExecutionResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessingQueue = false;
  private circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  }>();

  constructor(config?: Partial<EnrichmentPipelineConfig>) {
    super();
    
    this.config = {
      maxConcurrency: 5,
      defaultTimeout: 5000,
      enableCaching: true,
      cacheTtl: 300, // 5 minutes
      enableMetrics: true,
      enableTracing: false,
      retryStrategy: {
        maxRetries: 3,
        backoffMs: 100,
        exponential: true,
      },
      ...config,
    };

    // Initialize optimized LRU cache
    this.enricherResultCache = new LRUCache<string, ContextEnrichmentResult>({
      maxSize: 1000,
      ttl: this.config.cacheTtl * 1000, // Convert to milliseconds
      onEvict: (key, value) => {
        this.emit('cacheEvict', { key, value });
      }
    });

    // Set up cache cleanup interval with auto-tuning
    this.setupCacheCleanup();
  }

  /**
   * Initialize the pipeline
   */
  async initialize(): Promise<OperationResult> {
    try {
      runtimeLogger.info('Initializing context enrichment pipeline', {
        config: this.config,
      });

      // Initialize all registered enrichers
      for (const [id, entry] of this.enricherRegistry) {
        try {
          const enricher = await entry.factory(entry.defaultConfig);
          await enricher.initialize(entry.defaultConfig);
          this.enrichers.set(id, enricher);
          this.initializeMetrics(id);
          
          runtimeLogger.debug('Enricher initialized', { enricherId: id });
        } catch (error) {
          runtimeLogger.error('Failed to initialize enricher', {
            enricherId: id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Build dependency graph
      this.buildDependencyGraph();

      this.isInitialized = true;
      this.emit('initialized');

      return {
        success: true,
        message: 'Enrichment pipeline initialized successfully',
        metadata: {
          enricherCount: this.enrichers.size,
          cacheEnabled: this.config.enableCaching,
          metricsEnabled: this.config.enableMetrics,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to initialize enrichment pipeline', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Register a new enricher in the pipeline
   */
  registerEnricher(entry: EnricherRegistryEntry): OperationResult {
    try {
      if (this.enricherRegistry.has(entry.id)) {
        return {
          success: false,
          error: `Enricher with ID '${entry.id}' is already registered`,
        };
      }

      this.enricherRegistry.set(entry.id, entry);
      
      runtimeLogger.info('Enricher registered', {
        enricherId: entry.id,
        name: entry.metadata.name,
        version: entry.metadata.version,
      });

      // If pipeline is already initialized, initialize this enricher immediately
      if (this.isInitialized) {
        this.initializeNewEnricher(entry).catch(error => {
          runtimeLogger.error('Failed to initialize new enricher', {
            enricherId: entry.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      return {
        success: true,
        message: `Enricher '${entry.id}' registered successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to register enricher', {
        enricherId: entry.id,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Unregister an enricher from the pipeline
   */
  async unregisterEnricher(enricherId: string): Promise<OperationResult> {
    try {
      const enricher = this.enrichers.get(enricherId);
      if (enricher) {
        await enricher.dispose();
        this.enrichers.delete(enricherId);
      }

      this.enricherRegistry.delete(enricherId);
      this.metrics.delete(enricherId);
      this.dependencyGraph.delete(enricherId);

      // Rebuild dependency graph to remove references
      this.buildDependencyGraph();

      runtimeLogger.info('Enricher unregistered', { enricherId });

      return {
        success: true,
        message: `Enricher '${enricherId}' unregistered successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to unregister enricher', {
        enricherId,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute the enrichment pipeline for a given context with queueing
   */
  async enrich(request: EnrichmentRequest): Promise<PipelineExecutionResult> {
    // Use queue for better resource management
    return new Promise((resolve, reject) => {
      this.executionQueue.push({ request, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Execute the enrichment pipeline directly (optimized version)
   */
  private async enrichInternal(request: EnrichmentRequest): Promise<PipelineExecutionResult> {
    const startTime = Date.now();
    const result: PipelineExecutionResult = {
      success: false,
      enrichedContext: { ...request.context },
      executionTime: 0,
      enrichersExecuted: [],
      enrichersSkipped: [],
      enrichersFailed: [],
      cacheHits: 0,
      errors: [],
      metrics: {
        totalEnrichers: 0,
        successfulEnrichers: 0,
        parallelExecutions: 0,
        sequentialExecutions: 0,
      },
      sources: [],
    };

    try {
      if (!this.isInitialized) {
        throw new Error('Pipeline not initialized');
      }

      // Determine which enrichers to run
      const enrichersToRun = this.selectEnrichers(request);
      result.metrics.totalEnrichers = enrichersToRun.length;

      if (enrichersToRun.length === 0) {
        result.success = true;
        result.executionTime = Date.now() - startTime;
        return result;
      }

      // Sort enrichers by dependency order and stage
      const executionPlan = this.createExecutionPlan(enrichersToRun);
      
      // Execute enrichers according to the plan
      for (const stage of executionPlan) {
        const stageStartTime = Date.now();
        
        if (stage.parallel.length > 0) {
          // Execute parallel enrichers
          const parallelResults = await this.executeParallelEnrichers(
            stage.parallel,
            request,
            result.enrichedContext
          );
          
          this.processStageResults(parallelResults, result);
          result.metrics.parallelExecutions += stage.parallel.length;
        }

        if (stage.sequential.length > 0) {
          // Execute sequential enrichers
          for (const enricherId of stage.sequential) {
            const enricher = this.enrichers.get(enricherId);
            if (!enricher) continue;

            const enrichmentResult = await this.executeEnricher(
              enricher,
              { ...request, context: result.enrichedContext }
            );

            this.processEnricherResult(enrichmentResult, enricherId, result);
            result.metrics.sequentialExecutions++;
          }
        }

        runtimeLogger.debug('Enrichment stage completed', {
          stage: stage.name,
          duration: Date.now() - stageStartTime,
          parallel: stage.parallel.length,
          sequential: stage.sequential.length,
        });
      }

      result.success = result.errors.length === 0 || result.enrichersExecuted.length > 0;
      result.executionTime = Date.now() - startTime;

      // Emit completion event
      this.emit('enrichmentCompleted', result);

      runtimeLogger.info('Context enrichment completed', {
        agentId: request.agentId,
        executionTime: result.executionTime,
        enrichersExecuted: result.enrichersExecuted.length,
        enrichersFailed: result.enrichersFailed.length,
        cacheHits: result.cacheHits,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({
        enricherId: 'pipeline',
        error: errorMessage,
        stage: EnrichmentStage.PRE_PROCESSING,
      });
      result.executionTime = Date.now() - startTime;

      runtimeLogger.error('Context enrichment failed', {
        agentId: request.agentId,
        error: errorMessage,
        executionTime: result.executionTime,
      });

      return result;
    }
  }

  /**
   * Get enrichment metrics for monitoring
   */
  getMetrics(): Map<string, EnrichmentMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get pipeline health status
   */
  async getHealthStatus(): Promise<OperationResult> {
    const healthChecks = await Promise.allSettled(
      Array.from(this.enrichers.values()).map(enricher => enricher.healthCheck())
    );

    const healthy = healthChecks.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const total = healthChecks.length;

    return {
      success: healthy === total,
      message: `${healthy}/${total} enrichers healthy`,
      metadata: {
        totalEnrichers: total,
        healthyEnrichers: healthy,
        unhealthyEnrichers: total - healthy,
        cacheSize: this.cache.size,
        isInitialized: this.isInitialized,
      },
    };
  }

  /**
   * Clear the enrichment cache
   */
  clearCache(): void {
    this.cache.clear();
    runtimeLogger.info('Enrichment cache cleared');
  }

  /**
   * Dispose of the pipeline and clean up resources
   */
  async dispose(): Promise<OperationResult> {
    try {
      // Dispose of all enrichers
      await Promise.allSettled(
        Array.from(this.enrichers.values()).map(enricher => enricher.dispose())
      );

      this.enrichers.clear();
      this.enricherRegistry.clear();
      this.cache.clear();
      this.metrics.clear();
      this.dependencyGraph.clear();
      this.isInitialized = false;

      this.emit('disposed');
      this.removeAllListeners();

      runtimeLogger.info('Context enrichment pipeline disposed');

      return {
        success: true,
        message: 'Pipeline disposed successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to dispose pipeline', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Private helper methods

  private async initializeNewEnricher(entry: EnricherRegistryEntry): Promise<void> {
    const enricher = await entry.factory(entry.defaultConfig);
    await enricher.initialize(entry.defaultConfig);
    this.enrichers.set(entry.id, enricher);
    this.initializeMetrics(entry.id);
    this.buildDependencyGraph();
  }

  private initializeMetrics(enricherId: string): void {
    this.metrics.set(enricherId, {
      enricherId,
      executionCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
      cacheHitRate: 0,
      errorCount: 0,
      performanceProfile: {
        p50: 0,
        p95: 0,
        p99: 0,
      },
    });
  }

  private buildDependencyGraph(): void {
    this.dependencyGraph.clear();

    for (const [id, enricher] of this.enrichers) {
      const dependencies = enricher.getRequiredKeys()
        .map(key => this.findEnricherByProvidedKey(key))
        .filter(enricherId => enricherId && enricherId !== id) as string[];

      const dependents = Array.from(this.enrichers.values())
        .filter(other => other.getRequiredKeys().some(key => 
          enricher.getProvidedKeys().includes(key)
        ))
        .map(other => other.id)
        .filter(otherId => otherId !== id);

      this.dependencyGraph.set(id, {
        enricherId: id,
        dependencies,
        dependents,
        stage: enricher.config.stage,
        priority: enricher.config.priority,
        canRunInParallel: dependencies.length === 0,
      });
    }
  }

  private findEnricherByProvidedKey(key: string): string | undefined {
    for (const [id, enricher] of this.enrichers) {
      if (enricher.getProvidedKeys().includes(key)) {
        return id;
      }
    }
    return undefined;
  }

  private selectEnrichers(request: EnrichmentRequest): string[] {
    const available = Array.from(this.enrichers.keys());
    
    // Filter by required enrichers if specified
    if (request.requiredEnrichers && request.requiredEnrichers.length > 0) {
      return request.requiredEnrichers.filter(id => available.includes(id));
    }

    // Filter out excluded enrichers
    let selected = available;
    if (request.excludedEnrichers && request.excludedEnrichers.length > 0) {
      selected = selected.filter(id => !request.excludedEnrichers!.includes(id));
    }

    // Filter by enrichers that can process this context
    return selected.filter(id => {
      const enricher = this.enrichers.get(id);
      return enricher && enricher.config.enabled && enricher.canEnrich(request.context);
    });
  }

  private createExecutionPlan(enricherIds: string[]): Array<{
    name: string;
    parallel: string[];
    sequential: string[];
  }> {
    const stages = new Map<EnrichmentStage, { parallel: string[]; sequential: string[]; }>();
    
    // Group by stage
    for (const id of enricherIds) {
      const node = this.dependencyGraph.get(id);
      if (!node) continue;

      if (!stages.has(node.stage)) {
        stages.set(node.stage, { parallel: [], sequential: [] });
      }

      const stage = stages.get(node.stage)!;
      if (node.canRunInParallel) {
        stage.parallel.push(id);
      } else {
        stage.sequential.push(id);
      }
    }

    // Convert to execution plan ordered by stage
    const orderedStages = [
      EnrichmentStage.PRE_PROCESSING,
      EnrichmentStage.CORE_ENRICHMENT,
      EnrichmentStage.POST_PROCESSING,
      EnrichmentStage.FINALIZATION,
    ];

    return orderedStages
      .filter(stageName => stages.has(stageName))
      .map(stageName => ({
        name: stageName,
        ...stages.get(stageName)!,
      }));
  }

  private async executeParallelEnrichers(
    enricherIds: string[],
    request: EnrichmentRequest,
    enrichedContext: Context
  ): Promise<Array<{ id: string; result: ContextEnrichmentResult | null; error?: Error }>> {
    const promises = enricherIds.map(async (id) => {
      try {
        const enricher = this.enrichers.get(id);
        if (!enricher) {
          return { id, result: null, error: new Error(`Enricher '${id}' not found`) };
        }

        const result = await this.executeEnricher(enricher, {
          ...request,
          context: enrichedContext,
        });

        return { id, result };
      } catch (error) {
        return { 
          id, 
          result: null, 
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    });

    return Promise.all(promises);
  }

  private async executeEnricher(
    enricher: ContextEnricher,
    request: EnrichmentRequest
  ): Promise<ContextEnrichmentResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(enricher.id, request);
    
    // Check cache first
    if (this.config.enableCaching && enricher.config.cacheEnabled) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.updateMetrics(enricher.id, Date.now() - startTime, true, true);
        return cached.result;
      }
    }

    try {
      // Execute enricher with timeout
      const timeoutMs = request.timeoutMs || enricher.config.timeout || this.config.defaultTimeout;
      const result = await this.withTimeout(enricher.enrich(request), timeoutMs);

      // Cache the result
      if (this.config.enableCaching && enricher.config.cacheEnabled && result.success) {
        this.cacheResult(cacheKey, result, enricher.config.cacheTtl || this.config.cacheTtl);
      }

      this.updateMetrics(enricher.id, Date.now() - startTime, result.success, false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result: ContextEnrichmentResult = {
        success: false,
        enrichedContext: {},
        sources: [],
        duration: Date.now() - startTime,
        cached: false,
        error: errorMessage,
      };

      this.updateMetrics(enricher.id, Date.now() - startTime, false, false);
      return result;
    }
  }

  private processStageResults(
    results: Array<{ id: string; result: ContextEnrichmentResult | null; error?: Error }>,
    pipelineResult: PipelineExecutionResult
  ): void {
    for (const { id, result, error } of results) {
      if (result) {
        this.processEnricherResult(result, id, pipelineResult);
      } else if (error) {
        pipelineResult.enrichersFailed.push(id);
        pipelineResult.errors.push({
          enricherId: id,
          error: error.message,
          stage: EnrichmentStage.CORE_ENRICHMENT,
        });
      }
    }
  }

  private processEnricherResult(
    result: ContextEnrichmentResult,
    enricherId: string,
    pipelineResult: PipelineExecutionResult
  ): void {
    if (result.success) {
      // Merge enriched context
      Object.assign(pipelineResult.enrichedContext, result.enrichedContext);
      pipelineResult.enrichersExecuted.push(enricherId);
      pipelineResult.sources.push(...result.sources);
      pipelineResult.metrics.successfulEnrichers++;

      if (result.cached) {
        pipelineResult.cacheHits++;
      }
    } else {
      pipelineResult.enrichersFailed.push(enricherId);
      pipelineResult.errors.push({
        enricherId,
        error: result.error || 'Unknown error',
        stage: EnrichmentStage.CORE_ENRICHMENT,
      });
    }
  }

  private generateCacheKey(enricherId: string, request: EnrichmentRequest): string {
    if (request.cacheKey) {
      return `${enricherId}:${request.cacheKey}`;
    }

    // Generate cache key based on context content
    const contextStr = JSON.stringify(request.context);
    const hash = this.simpleHash(contextStr);
    return `${enricherId}:${request.agentId}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCachedResult(key: string): ContextEnrichmentResult | null {
    return this.enricherResultCache.get(key);
  }

  private cacheResult(key: string, result: ContextEnrichmentResult, ttlSeconds: number): void {
    this.enricherResultCache.set(key, result);
  }

  private cleanupCache(): void {
    this.enricherResultCache.prune();
  }

  private updateMetrics(enricherId: string, duration: number, success: boolean, cached: boolean): void {
    const metrics = this.metrics.get(enricherId);
    if (!metrics) return;

    metrics.executionCount++;
    metrics.totalExecutionTime += duration;
    metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.executionCount;

    if (!success) {
      metrics.errorCount++;
    }

    metrics.successRate = (metrics.executionCount - metrics.errorCount) / metrics.executionCount;

    if (cached) {
      const totalCacheAttempts = metrics.executionCount;
      const cacheHits = totalCacheAttempts * metrics.cacheHitRate + 1;
      metrics.cacheHitRate = cacheHits / (totalCacheAttempts + 1);
    }

    metrics.lastExecuted = new Date();

    // Update performance profile (simplified percentile calculation)
    // In a production system, you'd want to maintain a histogram
    metrics.performanceProfile.p50 = metrics.averageExecutionTime;
    metrics.performanceProfile.p95 = metrics.averageExecutionTime * 1.5;
    metrics.performanceProfile.p99 = metrics.averageExecutionTime * 2;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  // New optimized methods

  /**
   * Process execution queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Process up to maxConcurrency items at once
      const batch = this.executionQueue.splice(0, this.config.maxConcurrency);
      
      await Promise.allSettled(
        batch.map(async ({ request, resolve, reject }) => {
          try {
            const result = await this.enrichInternal(request);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
      );

      // Continue processing if more items in queue
      if (this.executionQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Setup cache cleanup with auto-tuning
   */
  private setupCacheCleanup(): void {
    let cleanupInterval = 60000; // Start with 1 minute
    
    const adaptiveCleanup = () => {
      const stats = this.enricherResultCache.getStats();
      
      // Adjust cleanup frequency based on cache performance
      if (stats.hitRate > 0.8 && stats.size < stats.maxSize * 0.7) {
        // Cache is performing well, clean less frequently
        cleanupInterval = Math.min(cleanupInterval * 1.2, 300000); // Max 5 minutes
      } else if (stats.hitRate < 0.5 || stats.size > stats.maxSize * 0.9) {
        // Cache needs more frequent cleanup
        cleanupInterval = Math.max(cleanupInterval * 0.8, 30000); // Min 30 seconds
      }

      this.cleanupCache();
      
      setTimeout(adaptiveCleanup, cleanupInterval);
    };

    setTimeout(adaptiveCleanup, cleanupInterval);
  }

  /**
   * Check circuit breaker status for enricher
   */
  private isCircuitBreakerOpen(enricherId: string): boolean {
    const breaker = this.circuitBreakers.get(enricherId);
    if (!breaker) return false;

    // Reset if enough time has passed
    if (breaker.isOpen && Date.now() - breaker.lastFailure > 60000) {
      breaker.isOpen = false;
      breaker.failures = 0;
    }

    return breaker.isOpen;
  }

  /**
   * Record circuit breaker failure
   */
  private recordCircuitBreakerFailure(enricherId: string): void {
    let breaker = this.circuitBreakers.get(enricherId);
    if (!breaker) {
      breaker = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitBreakers.set(enricherId, breaker);
    }

    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit after 5 failures
    if (breaker.failures >= 5) {
      breaker.isOpen = true;
      runtimeLogger.warn(`Circuit breaker opened for enricher: ${enricherId}`);
    }
  }

  /**
   * Clear circuit breaker for enricher
   */
  private clearCircuitBreaker(enricherId: string): void {
    const breaker = this.circuitBreakers.get(enricherId);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  } {
    return this.enricherResultCache.getStats();
  }

  /**
   * Warm cache with predicted patterns
   */
  async warmCache(patterns: Array<{ key: string; context: any }>): Promise<void> {
    const warmingPromises = patterns.map(async ({ key, context }) => {
      try {
        // Pre-compute and cache common enrichment patterns
        const request: EnrichmentRequest = {
          context,
          agentId: 'cache-warmer',
          cacheKey: key
        };
        
        await this.enrichInternal(request);
      } catch (error) {
        runtimeLogger.warn('Cache warming failed for key:', key, error);
      }
    });

    await Promise.allSettled(warmingPromises);
  }
}