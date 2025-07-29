/**
 * Base Context Enricher for SYMindX
 * 
 * This module provides the base implementation for context enrichers,
 * including common functionality like initialization, health checking,
 * and configuration management.
 */

import {
  ContextEnricher,
  EnricherConfig,
  EnrichmentRequest,
  ContextEnrichmentResult,
  EnrichmentPriority,
  EnrichmentStage,
  EnrichmentSource,
} from '../../../types/context/context-enrichment';
import { Context } from '../../../types/common';
import { OperationResult } from '../../../types/helpers';
import { runtimeLogger } from '../../../utils/logger';

/**
 * Abstract base class for context enrichers
 * 
 * Provides common functionality and enforces the enricher interface.
 * Concrete enrichers should extend this class and implement the abstract methods.
 */
export abstract class BaseContextEnricher implements ContextEnricher {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly config: EnricherConfig;

  private isInitialized = false;
  private isDisposed = false;

  constructor(
    id: string,
    name: string,
    version: string,
    config: Partial<EnricherConfig> = {}
  ) {
    this.id = id;
    this.name = name;
    this.version = version;
    
    // Merge with default configuration
    this.config = {
      enabled: true,
      priority: EnrichmentPriority.MEDIUM,
      stage: EnrichmentStage.CORE_ENRICHMENT,
      timeout: 3000,
      maxRetries: 3,
      cacheEnabled: true,
      cacheTtl: 300, // 5 minutes
      dependsOn: [],
      ...config,
    };
  }

  /**
   * Initialize the enricher
   */
  async initialize(config?: Partial<EnricherConfig>): Promise<OperationResult> {
    try {
      if (this.isInitialized) {
        return {
          success: true,
          message: `Enricher '${this.id}' already initialized`,
        };
      }

      if (this.isDisposed) {
        return {
          success: false,
          error: `Enricher '${this.id}' has been disposed`,
        };
      }

      // Merge additional configuration if provided
      if (config) {
        Object.assign(this.config, config);
      }

      // Validate configuration
      const validationResult = this.validateConfig();
      if (!validationResult.success) {
        return validationResult;
      }

      // Perform enricher-specific initialization
      const initResult = await this.doInitialize();
      if (!initResult.success) {
        return initResult;
      }

      this.isInitialized = true;

      runtimeLogger.info('Context enricher initialized', {
        enricherId: this.id,
        name: this.name,
        version: this.version,
        config: this.config,
      });

      return {
        success: true,
        message: `Enricher '${this.id}' initialized successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to initialize enricher', {
        enricherId: this.id,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Enrich the given context
   */
  async enrich(request: EnrichmentRequest): Promise<ContextEnrichmentResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error(`Enricher '${this.id}' is not initialized`);
      }

      if (this.isDisposed) {
        throw new Error(`Enricher '${this.id}' has been disposed`);
      }

      if (!this.config.enabled) {
        return {
          success: true,
          enrichedContext: {},
          sources: [],
          duration: Date.now() - startTime,
          cached: false,
          warnings: [`Enricher '${this.id}' is disabled`],
        };
      }

      if (!this.canEnrich(request.context)) {
        return {
          success: true,
          enrichedContext: {},
          sources: [],
          duration: Date.now() - startTime,
          cached: false,
          warnings: [`Enricher '${this.id}' cannot process this context`],
        };
      }

      // Perform the actual enrichment
      const enrichedData = await this.doEnrich(request);
      const duration = Date.now() - startTime;

      const source: EnrichmentSource = {
        enricherId: this.id,
        timestamp: new Date(),
        confidence: this.calculateConfidence(request.context, enrichedData),
        metadata: {
          enricherName: this.name,
          enricherVersion: this.version,
          duration,
        },
      };

      const result: ContextEnrichmentResult = {
        success: true,
        enrichedContext: enrichedData,
        sources: [source],
        duration,
        cached: false,
      };

      runtimeLogger.debug('Context enrichment completed', {
        enricherId: this.id,
        agentId: request.agentId,
        duration,
        keysAdded: Object.keys(enrichedData).length,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      runtimeLogger.error('Context enrichment failed', {
        enricherId: this.id,
        agentId: request.agentId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        enrichedContext: {},
        sources: [],
        duration,
        cached: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if this enricher can process the given context
   */
  canEnrich(context: Context): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if required dependencies are present
    const requiredKeys = this.getRequiredKeys();
    for (const key of requiredKeys) {
      if (!(key in context)) {
        return false;
      }
    }

    // Perform enricher-specific checks
    return this.doCanEnrich(context);
  }

  /**
   * Get health status of the enricher
   */
  async healthCheck(): Promise<OperationResult> {
    try {
      if (this.isDisposed) {
        return {
          success: false,
          error: `Enricher '${this.id}' has been disposed`,
        };
      }

      if (!this.isInitialized) {
        return {
          success: false,
          error: `Enricher '${this.id}' is not initialized`,
        };
      }

      // Perform enricher-specific health check
      const healthResult = await this.doHealthCheck();
      
      return {
        success: healthResult.success,
        error: healthResult.error,
        message: healthResult.message || `Enricher '${this.id}' is healthy`,
        metadata: {
          enricherId: this.id,
          name: this.name,
          version: this.version,
          isInitialized: this.isInitialized,
          isDisposed: this.isDisposed,
          config: this.config,
          ...healthResult.metadata,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Dispose of the enricher and clean up resources
   */
  async dispose(): Promise<OperationResult> {
    try {
      if (this.isDisposed) {
        return {
          success: true,
          message: `Enricher '${this.id}' already disposed`,
        };
      }

      // Perform enricher-specific cleanup
      const cleanupResult = await this.doDispose();
      if (!cleanupResult.success) {
        return cleanupResult;
      }

      this.isDisposed = true;
      this.isInitialized = false;

      runtimeLogger.info('Context enricher disposed', {
        enricherId: this.id,
        name: this.name,
      });

      return {
        success: true,
        message: `Enricher '${this.id}' disposed successfully`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      runtimeLogger.error('Failed to dispose enricher', {
        enricherId: this.id,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Abstract methods to be implemented by concrete enrichers

  /**
   * Get the expected keys this enricher will add to context
   */
  abstract getProvidedKeys(): string[];

  /**
   * Get keys this enricher depends on from other enrichers
   */
  abstract getRequiredKeys(): string[];

  /**
   * Perform enricher-specific initialization
   */
  protected abstract doInitialize(): Promise<OperationResult>;

  /**
   * Perform the actual context enrichment
   */
  protected abstract doEnrich(request: EnrichmentRequest): Promise<Record<string, unknown>>;

  /**
   * Perform enricher-specific checks for context compatibility
   */
  protected abstract doCanEnrich(context: Context): boolean;

  /**
   * Perform enricher-specific health check
   */
  protected abstract doHealthCheck(): Promise<OperationResult>;

  /**
   * Perform enricher-specific cleanup
   */
  protected abstract doDispose(): Promise<OperationResult>;

  // Protected helper methods

  /**
   * Validate the enricher configuration
   */
  protected validateConfig(): OperationResult {
    if (this.config.timeout <= 0) {
      return {
        success: false,
        error: 'Timeout must be greater than 0',
      };
    }

    if (this.config.maxRetries < 0) {
      return {
        success: false,
        error: 'Max retries cannot be negative',
      };
    }

    if (this.config.cacheTtl && this.config.cacheTtl <= 0) {
      return {
        success: false,
        error: 'Cache TTL must be greater than 0 if specified',
      };
    }

    return {
      success: true,
      message: 'Configuration is valid',
    };
  }

  /**
   * Calculate confidence score for the enrichment result
   */
  protected calculateConfidence(context: Context, enrichedData: Record<string, unknown>): number {
    // Default confidence calculation - can be overridden by concrete enrichers
    const contextSize = Object.keys(context).length;
    const enrichedSize = Object.keys(enrichedData).length;
    
    if (enrichedSize === 0) {
      return 0;
    }

    // Base confidence on the amount of data added relative to existing context
    const ratio = enrichedSize / Math.max(contextSize, 1);
    return Math.min(1, 0.5 + ratio * 0.5);
  }

  /**
   * Check if the enricher is in a valid state for operation
   */
  protected isOperational(): boolean {
    return this.isInitialized && !this.isDisposed && this.config.enabled;
  }

  /**
   * Log enricher-specific information
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    runtimeLogger[level](message, {
      enricherId: this.id,
      enricherName: this.name,
      ...metadata,
    });
  }
}