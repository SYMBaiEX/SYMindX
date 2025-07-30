/**
 * Module Traits System for SYMindX
 *
 * Provides mixins and traits for common module functionality
 */

import { runtimeLogger } from '../../../utils/logger';

// Base constructor type for mixins
type Constructor<T = {}> = new (...args: any[]) => T;

// Disposable interface
export interface Disposable {
  dispose(): Promise<void>;
}

// Initializable interface
export interface Initializable {
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

// Configurable interface
export interface Configurable<T = any> {
  configure(config: T): void;
  getConfig(): T;
}

// Health checkable interface
export interface HealthCheckable {
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

// Versioned interface
export interface Versioned {
  getVersion(): string;
  isCompatible(version: string): boolean;
}

// ===================================================================
// DISPOSABLE TRAIT
// ===================================================================

/**
 * Adds disposal pattern with resource cleanup
 */
export function DisposableTrait<T extends Constructor>(Base: T) {
  return class extends Base implements Disposable {
    private _disposed = false;
    private _disposalHandlers: Array<() => Promise<void> | void> = [];

    /**
     * Add a disposal handler
     */
    protected addDisposalHandler(handler: () => Promise<void> | void): void {
      this._disposalHandlers.push(handler);
    }

    /**
     * Check if disposed
     */
    protected get isDisposed(): boolean {
      return this._disposed;
    }

    /**
     * Dispose of resources
     */
    async dispose(): Promise<void> {
      if (this._disposed) return;

      runtimeLogger.debug(`Disposing ${this.constructor.name}`);

      for (const handler of this._disposalHandlers.reverse()) {
        try {
          await handler();
        } catch (error) {
          runtimeLogger.error(
            `Error in disposal handler for ${this.constructor.name}:`,
            error
          );
        }
      }

      this._disposed = true;
      this._disposalHandlers = [];
    }

    /**
     * Ensure not disposed before operations
     */
    protected ensureNotDisposed(): void {
      if (this._disposed) {
        throw new Error(`${this.constructor.name} has been disposed`);
      }
    }
  };
}

// ===================================================================
// INITIALIZABLE TRAIT
// ===================================================================

/**
 * Adds initialization pattern with lazy loading support
 */
export function InitializableTrait<T extends Constructor>(Base: T) {
  return class extends Base implements Initializable {
    private _initialized = false;
    private _initializing = false;
    private _initializationPromise?: Promise<void>;
    private _initializationHandlers: Array<() => Promise<void> | void> = [];

    /**
     * Add an initialization handler
     */
    protected addInitializationHandler(
      handler: () => Promise<void> | void
    ): void {
      this._initializationHandlers.push(handler);
    }

    /**
     * Initialize the module
     */
    async initialize(): Promise<void> {
      if (this._initialized) return;

      if (this._initializing) {
        return this._initializationPromise;
      }

      this._initializing = true;
      this._initializationPromise = this._doInitialize();

      try {
        await this._initializationPromise;
        this._initialized = true;
      } finally {
        this._initializing = false;
      }
    }

    /**
     * Perform actual initialization
     */
    private async _doInitialize(): Promise<void> {
      runtimeLogger.debug(`Initializing ${this.constructor.name}`);

      for (const handler of this._initializationHandlers) {
        try {
          await handler();
        } catch (error) {
          runtimeLogger.error(
            `Error in initialization handler for ${this.constructor.name}:`,
            error
          );
          throw error;
        }
      }
    }

    /**
     * Check if initialized
     */
    isInitialized(): boolean {
      return this._initialized;
    }

    /**
     * Ensure initialized before operations
     */
    protected async ensureInitialized(): Promise<void> {
      if (!this._initialized) {
        await this.initialize();
      }
    }
  };
}

// ===================================================================
// CONFIGURABLE TRAIT
// ===================================================================

/**
 * Adds configuration management with validation
 */
export function ConfigurableTrait<TConfig = any>() {
  return function <T extends Constructor>(Base: T) {
    return class extends Base implements Configurable<TConfig> {
      private _config?: TConfig;
      private _configValidators: Array<
        (config: TConfig) => void | Promise<void>
      > = [];

      /**
       * Add a config validator
       */
      protected addConfigValidator(
        validator: (config: TConfig) => void | Promise<void>
      ): void {
        this._configValidators.push(validator);
      }

      /**
       * Configure the module
       */
      configure(config: TConfig): void {
        this._validateConfig(config);
        this._config = config;
        this._onConfigUpdate(config);
      }

      /**
       * Get current configuration
       */
      getConfig(): TConfig {
        if (!this._config) {
          throw new Error(`${this.constructor.name} has not been configured`);
        }
        return this._config;
      }

      /**
       * Get configuration safely (returns undefined if not configured)
       */
      protected getConfigSafe(): TConfig | undefined {
        return this._config;
      }

      /**
       * Validate configuration
       */
      private _validateConfig(config: TConfig): void {
        for (const validator of this._configValidators) {
          validator(config);
        }
      }

      /**
       * Called when configuration is updated
       */
      protected _onConfigUpdate(config: TConfig): void {
        // Override in subclasses
      }
    };
  };
}

// ===================================================================
// HEALTH CHECKABLE TRAIT
// ===================================================================

/**
 * Adds health checking capabilities
 */
export function HealthCheckableTrait<T extends Constructor>(Base: T) {
  return class extends Base implements HealthCheckable {
    private _healthChecks: Array<
      () => Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>
    > = [];

    /**
     * Add a health check
     */
    protected addHealthCheck(
      check: () => Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>
    ): void {
      this._healthChecks.push(check);
    }

    /**
     * Perform health check
     */
    async healthCheck(): Promise<{
      status: 'healthy' | 'unhealthy';
      details?: any;
    }> {
      const results: Array<{ status: 'healthy' | 'unhealthy'; details?: any }> =
        [];

      for (const check of this._healthChecks) {
        try {
          const result = await check();
          results.push(result);
        } catch (error) {
          results.push({
            status: 'unhealthy',
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      const unhealthy = results.filter((r) => r.status === 'unhealthy');

      if (unhealthy.length === 0) {
        return {
          status: 'healthy',
          details: {
            module: this.constructor.name,
            checks: results.length,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        status: 'unhealthy',
        details: {
          module: this.constructor.name,
          checks: results.length,
          failures: unhealthy.length,
          errors: unhealthy.map((r) => r.details),
          timestamp: new Date().toISOString(),
        },
      };
    }
  };
}

// ===================================================================
// VERSIONED TRAIT
// ===================================================================

/**
 * Adds version tracking and compatibility checking
 */
export function VersionedTrait(version: string) {
  return function <T extends Constructor>(Base: T) {
    return class extends Base implements Versioned {
      private _version = version;

      /**
       * Get module version
       */
      getVersion(): string {
        return this._version;
      }

      /**
       * Check compatibility with another version
       */
      isCompatible(otherVersion: string): boolean {
        return this._checkCompatibility(this._version, otherVersion);
      }

      /**
       * Check version compatibility using semantic versioning
       */
      private _checkCompatibility(
        currentVersion: string,
        targetVersion: string
      ): boolean {
        const current = this._parseVersion(currentVersion);
        const target = this._parseVersion(targetVersion);

        // Major version must match
        if (current.major !== target.major) {
          return false;
        }

        // Current minor must be >= target minor
        if (current.minor < target.minor) {
          return false;
        }

        // If minor versions match, current patch must be >= target patch
        if (current.minor === target.minor && current.patch < target.patch) {
          return false;
        }

        return true;
      }

      /**
       * Parse semantic version string
       */
      private _parseVersion(version: string): {
        major: number;
        minor: number;
        patch: number;
      } {
        const parts = version.split('.').map(Number);
        return {
          major: parts[0] || 0,
          minor: parts[1] || 0,
          patch: parts[2] || 0,
        };
      }
    };
  };
}

// ===================================================================
// CACHING TRAIT
// ===================================================================

export interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  ttl?: number;
  hits: number;
}

/**
 * Adds caching capabilities with TTL and LRU eviction
 */
export function CachingTrait<T extends Constructor>(Base: T) {
  return class extends Base {
    private _cache = new Map<string, CacheEntry<any>>();
    private _maxCacheSize = 1000;
    private _defaultTtl = 5 * 60 * 1000; // 5 minutes

    /**
     * Set cache configuration
     */
    protected setCacheConfig(maxSize: number, defaultTtl: number): void {
      this._maxCacheSize = maxSize;
      this._defaultTtl = defaultTtl;
    }

    /**
     * Get value from cache
     */
    protected getFromCache<T>(key: string): T | undefined {
      const entry = this._cache.get(key);
      if (!entry) return undefined;

      // Check TTL
      const now = Date.now();
      const age = now - entry.timestamp.getTime();
      if (entry.ttl && age > entry.ttl) {
        this._cache.delete(key);
        return undefined;
      }

      // Update hits
      entry.hits++;
      entry.timestamp = new Date();

      return entry.value as T;
    }

    /**
     * Set value in cache
     */
    protected setInCache<T>(key: string, value: T, ttl?: number): void {
      // Evict if at capacity
      if (this._cache.size >= this._maxCacheSize) {
        this._evictLRU();
      }

      this._cache.set(key, {
        value,
        timestamp: new Date(),
        ttl: ttl || this._defaultTtl,
        hits: 0,
      });
    }

    /**
     * Delete from cache
     */
    protected deleteFromCache(key: string): void {
      this._cache.delete(key);
    }

    /**
     * Clear entire cache
     */
    protected clearCache(): void {
      this._cache.clear();
    }

    /**
     * Get cache statistics
     */
    protected getCacheStats(): {
      size: number;
      maxSize: number;
      hitRate: number;
      totalHits: number;
      totalEntries: number;
    } {
      const entries = Array.from(this._cache.values());
      const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
      const totalEntries = entries.length;
      const hitRate = totalEntries > 0 ? totalHits / totalEntries : 0;

      return {
        size: this._cache.size,
        maxSize: this._maxCacheSize,
        hitRate,
        totalHits,
        totalEntries,
      };
    }

    /**
     * Evict least recently used entry
     */
    private _evictLRU(): void {
      let lruKey: string | null = null;
      let lruTimestamp = Date.now();

      for (const [key, entry] of this._cache) {
        if (entry.timestamp.getTime() < lruTimestamp) {
          lruTimestamp = entry.timestamp.getTime();
          lruKey = key;
        }
      }

      if (lruKey) {
        this._cache.delete(lruKey);
      }
    }
  };
}

// ===================================================================
// OBSERVABLE TRAIT
// ===================================================================

export type EventListener<T = any> = (data: T) => void | Promise<void>;

/**
 * Adds event emission and observation capabilities
 */
export function ObservableTrait<T extends Constructor>(Base: T) {
  return class extends Base {
    private _listeners = new Map<string, EventListener[]>();

    /**
     * Add event listener
     */
    protected on<T>(event: string, listener: EventListener<T>): void {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event)!.push(listener);
    }

    /**
     * Remove event listener
     */
    protected off<T>(event: string, listener: EventListener<T>): void {
      const listeners = this._listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    }

    /**
     * Emit event
     */
    protected async emit<T>(event: string, data: T): Promise<void> {
      const listeners = this._listeners.get(event);
      if (!listeners) return;

      for (const listener of listeners) {
        try {
          await listener(data);
        } catch (error) {
          runtimeLogger.error(`Error in event listener for ${event}:`, error);
        }
      }
    }

    /**
     * Get listener count for event
     */
    protected getListenerCount(event: string): number {
      return this._listeners.get(event)?.length || 0;
    }

    /**
     * Remove all listeners
     */
    protected removeAllListeners(event?: string): void {
      if (event) {
        this._listeners.delete(event);
      } else {
        this._listeners.clear();
      }
    }
  };
}

// ===================================================================
// COMPOSITE TRAITS
// ===================================================================

/**
 * Complete module trait combining all common functionality
 */
export function CompleteModuleTrait<TConfig = any>(version: string) {
  return function <T extends Constructor>(Base: T) {
    const WithDisposable = DisposableTrait(Base);
    const WithInitializable = InitializableTrait(WithDisposable);
    const WithConfigurable = ConfigurableTrait<TConfig>()(WithInitializable);
    const WithHealthCheckable = HealthCheckableTrait(WithConfigurable);
    const WithVersioned = VersionedTrait(version)(WithHealthCheckable);
    const WithCaching = CachingTrait(WithVersioned);
    const WithObservable = ObservableTrait(WithCaching);

    return WithObservable;
  };
}

/**
 * Memory provider specific trait
 */
export function MemoryProviderTrait<TConfig = any>(version: string) {
  return function <T extends Constructor>(Base: T) {
    const WithComplete = CompleteModuleTrait<TConfig>(version)(Base);

    return class extends WithComplete {
      constructor(...args: any[]) {
        super(...args);

        // Add memory provider specific health checks
        this.addHealthCheck(async () => {
          try {
            // Basic connectivity check
            return { status: 'healthy' as const };
          } catch (error) {
            return {
              status: 'unhealthy' as const,
              details: {
                error: error instanceof Error ? error.message : String(error),
              },
            };
          }
        });

        // Add cleanup on disposal
        this.addDisposalHandler(async () => {
          this.clearCache();
          this.removeAllListeners();
        });
      }
    };
  };
}

/**
 * Emotion module specific trait
 */
export function EmotionModuleTrait<TConfig = any>(version: string) {
  return function <T extends Constructor>(Base: T) {
    const WithComplete = CompleteModuleTrait<TConfig>(version)(Base);

    return class extends WithComplete {
      constructor(...args: any[]) {
        super(...args);

        // Add emotion-specific initialization
        this.addInitializationHandler(() => {
          this.emit('emotion:initialized', { module: this.constructor.name });
        });
      }
    };
  };
}

/**
 * Cognition module specific trait
 */
export function CognitionModuleTrait<TConfig = any>(version: string) {
  return function <T extends Constructor>(Base: T) {
    const WithComplete = CompleteModuleTrait<TConfig>(version)(Base);

    return class extends WithComplete {
      constructor(...args: any[]) {
        super(...args);

        // Add cognition-specific caching
        this.setCacheConfig(500, 10 * 60 * 1000); // 10 minutes for thoughts
      }
    };
  };
}
