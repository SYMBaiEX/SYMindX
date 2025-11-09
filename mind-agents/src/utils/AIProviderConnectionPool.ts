/**
 * AI Provider Connection Pool with Circuit Breakers
 * Manages connections to AI providers with failover and circuit breaker patterns
 */

import { EventEmitter } from 'node:events';
import { ConnectionPool, Connection, ConnectionPoolOptions } from './ConnectionPool';
import { IntelligentResponseCache } from './IntelligentResponseCache';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';

interface AIProviderConnection extends Connection {
  provider: string;
  model?: string;
  chat(messages: unknown[], options?: unknown): Promise<unknown>;
  stream(messages: unknown[], options?: unknown): AsyncIterableIterator<unknown>;
  getUsage(): {
    requestCount: number;
    tokenCount: number;
    errorCount: number;
    lastRequestTime: number;
  };
}

interface AIProviderPoolOptions extends ConnectionPoolOptions {
  provider: {
    name: string;
    apiKey: string;
    baseURL?: string;
    model?: string;
    timeout?: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
    tokensPerMinute?: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  failover: {
    enabled: boolean;
    providers: string[];
    strategy: 'round-robin' | 'priority' | 'random';
  };
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

interface RateLimitState {
  requestCount: number;
  tokenCount: number;
  windowStart: number;
  windowSize: number; // ms
}

export class AIProviderConnectionPool extends EventEmitter {
  private pool: ConnectionPool<AIProviderConnection>;
  private options: AIProviderPoolOptions;
  private circuitBreaker: CircuitBreakerState;
  private rateLimit: RateLimitState;
  private cache?: IntelligentResponseCache<unknown>;
  private connectionFactory: () => Promise<AIProviderConnection>;

  // Metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    rateLimitedRequests: 0,
    circuitBreakerTrips: 0,
    totalTokens: 0,
    averageResponseTime: 0,
    totalResponseTime: 0,
  };

  constructor(
    connectionFactory: () => Promise<AIProviderConnection>,
    options: AIProviderPoolOptions
  ) {
    super();

    this.connectionFactory = connectionFactory;
    this.options = options;

    // Initialize circuit breaker
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      successCount: 0,
    };

    // Initialize rate limiting
    this.rateLimit = {
      requestCount: 0,
      tokenCount: 0,
      windowStart: Date.now(),
      windowSize: 60000, // 1 minute
    };

    // Initialize cache if enabled
    if (options.caching.enabled) {
      this.cache = new IntelligentResponseCache({
        maxSize: options.caching.maxSize,
        defaultTTL: options.caching.ttl,
        enableSemanticSimilarity: true,
        similarityThreshold: 0.9,
        enableCompression: true,
        enableInvalidation: true,
      });
    }

    // Create connection pool
    this.pool = new ConnectionPool<AIProviderConnection>(
      this.createConnection.bind(this),
      {
        minSize: options.minSize,
        maxSize: options.maxSize,
        acquireTimeoutMs: options.acquireTimeoutMs,
        createTimeoutMs: options.createTimeoutMs,
        destroyTimeoutMs: options.destroyTimeoutMs,
        idleTimeoutMs: options.idleTimeoutMs,
        reapIntervalMs: options.reapIntervalMs,
        createRetries: options.createRetries,
        validateOnBorrow: true,
        validateOnReturn: options.validateOnReturn,
        fifo: options.fifo,
      }
    );

    // Set up event forwarding
    this.pool.on('acquire', (conn) => this.emit('acquire', conn));
    this.pool.on('release', (conn) => this.emit('release', conn));
    this.pool.on('create', (conn) => this.emit('create', conn));
    this.pool.on('destroy', (conn) => this.emit('destroy', conn));
  }

  /**
   * Send a chat request to the AI provider
   */
  async chat(
    messages: unknown[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      cacheKey?: string;
      bypassCache?: boolean;
    }
  ): Promise<unknown> {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() < this.circuitBreaker.nextAttemptTime) {
        throw new Error(`Circuit breaker is open for ${this.options.provider.name}`);
      } else {
        this.circuitBreaker.state = 'half-open';
        this.emit('circuitBreakerHalfOpen', this.options.provider.name);
      }
    }

    // Check rate limiting
    if (this.options.rateLimiting.enabled && !this.checkRateLimit()) {
      this.metrics.rateLimitedRequests++;
      throw new Error(`Rate limit exceeded for ${this.options.provider.name}`);
    }

    // Check cache
    const cacheKey = options?.cacheKey || this.generateCacheKey(messages, options);
    if (this.cache && !options?.bypassCache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.metrics.cachedRequests++;
        performanceMonitor.recordMetric('ai_provider.cache_hit', 1, 'count', {
          provider: this.options.provider.name,
        });
        return cached;
      }
    }

    const startTime = performance.now();
    let connection: AIProviderConnection | null = null;

    try {
      connection = await this.pool.acquire();
      const response = await connection.chat(messages, options);

      // Record success
      const duration = performance.now() - startTime;
      this.recordSuccess(duration);

      // Cache response if enabled
      if (this.cache && response) {
        await this.cache.set(cacheKey, response, {
          ttl: this.options.caching.ttl,
          tags: [this.options.provider.name, options?.model || 'default'],
        });
      }

      // Update rate limiting
      this.updateRateLimit(1, this.estimateTokens(response));

      performanceMonitor.recordMetric('ai_provider.request.success', 1, 'count', {
        provider: this.options.provider.name,
        model: options?.model || 'default',
      });
      performanceMonitor.recordMetric('ai_provider.request.duration', duration, 'ms', {
        provider: this.options.provider.name,
      });

      return response;
    } catch (error) {
      // Record failure
      const duration = performance.now() - startTime;
      this.recordFailure(duration);

      performanceMonitor.recordMetric('ai_provider.request.error', 1, 'count', {
        provider: this.options.provider.name,
        error: (error as Error).message,
      });

      runtimeLogger.error(`AI provider request failed (${this.options.provider.name}):`, error);
      throw error;
    } finally {
      if (connection) {
        await this.pool.release(connection);
      }
    }
  }

  /**
   * Stream a chat request to the AI provider
   */
  async *stream(
    messages: unknown[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncIterableIterator<unknown> {
    // Check circuit breaker
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() < this.circuitBreaker.nextAttemptTime) {
        throw new Error(`Circuit breaker is open for ${this.options.provider.name}`);
      } else {
        this.circuitBreaker.state = 'half-open';
        this.emit('circuitBreakerHalfOpen', this.options.provider.name);
      }
    }

    // Check rate limiting
    if (this.options.rateLimiting.enabled && !this.checkRateLimit()) {
      this.metrics.rateLimitedRequests++;
      throw new Error(`Rate limit exceeded for ${this.options.provider.name}`);
    }

    const startTime = performance.now();
    let connection: AIProviderConnection | null = null;

    try {
      connection = await this.pool.acquire();
      const stream = connection.stream(messages, options);

      let tokenCount = 0;
      for await (const chunk of stream) {
        tokenCount += this.estimateTokens(chunk);
        yield chunk;
      }

      // Record success
      const duration = performance.now() - startTime;
      this.recordSuccess(duration);

      // Update rate limiting
      this.updateRateLimit(1, tokenCount);

      performanceMonitor.recordMetric('ai_provider.stream.success', 1, 'count', {
        provider: this.options.provider.name,
        model: options?.model || 'default',
      });
      performanceMonitor.recordMetric('ai_provider.stream.duration', duration, 'ms', {
        provider: this.options.provider.name,
      });
    } catch (error) {
      // Record failure
      const duration = performance.now() - startTime;
      this.recordFailure(duration);

      performanceMonitor.recordMetric('ai_provider.stream.error', 1, 'count', {
        provider: this.options.provider.name,
        error: (error as Error).message,
      });

      runtimeLogger.error(`AI provider stream failed (${this.options.provider.name}):`, error);
      throw error;
    } finally {
      if (connection) {
        await this.pool.release(connection);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    pool: ReturnType<ConnectionPool<AIProviderConnection>['getStats']>;
    metrics: typeof this.metrics;
    circuitBreaker: CircuitBreakerState;
    rateLimit: RateLimitState;
    cache?: ReturnType<IntelligentResponseCache<unknown>['getStats']>;
    provider: {
      name: string;
      model?: string;
    };
  } {
    return {
      pool: this.pool.getStats(),
      metrics: { ...this.metrics },
      circuitBreaker: { ...this.circuitBreaker },
      rateLimit: { ...this.rateLimit },
      cache: this.cache?.getStats(),
      provider: {
        name: this.options.provider.name,
        model: this.options.provider.model,
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Invalidate cache by tag
   */
  invalidateCache(tag: string): number {
    if (this.cache) {
      return this.cache.invalidateByTag(tag);
    }
    return 0;
  }

  /**
   * Drain the pool (prepare for shutdown)
   */
  async drain(): Promise<void> {
    await this.pool.drain();
    this.emit('drained');
  }

  /**
   * Clear idle connections
   */
  async clear(): Promise<void> {
    await this.pool.clear();
  }

  // Private helper methods

  private async createConnection(): Promise<AIProviderConnection> {
    try {
      const connection = await this.connectionFactory();
      
      // Validate connection
      const isHealthy = await connection.isHealthy();
      if (!isHealthy) {
        throw new Error('Connection failed health check');
      }

      return connection;
    } catch (error) {
      runtimeLogger.error(`Failed to create AI provider connection (${this.options.provider.name}):`, error);
      throw error;
    }
  }

  private generateCacheKey(messages: unknown[], options?: unknown): string {
    const key = JSON.stringify({
      provider: this.options.provider.name,
      model: this.options.provider.model,
      messages,
      options,
    });
    
    // Create a hash of the key for shorter cache keys
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `ai_${this.options.provider.name}_${hash.toString(36)}`;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.rateLimit.windowStart >= this.rateLimit.windowSize) {
      this.rateLimit.requestCount = 0;
      this.rateLimit.tokenCount = 0;
      this.rateLimit.windowStart = now;
    }

    // Check request limit
    if (this.rateLimit.requestCount >= this.options.rateLimiting.requestsPerMinute) {
      return false;
    }

    // Check token limit if configured
    if (
      this.options.rateLimiting.tokensPerMinute &&
      this.rateLimit.tokenCount >= this.options.rateLimiting.tokensPerMinute
    ) {
      return false;
    }

    return true;
  }

  private updateRateLimit(requests: number, tokens: number): void {
    this.rateLimit.requestCount += requests;
    this.rateLimit.tokenCount += tokens;
  }

  private estimateTokens(content: unknown): number {
    if (typeof content === 'string') {
      // Rough estimate: 1 token per 4 characters
      return Math.ceil(content.length / 4);
    } else if (content && typeof content === 'object') {
      const str = JSON.stringify(content);
      return Math.ceil(str.length / 4);
    }
    return 0;
  }

  private recordSuccess(duration: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.totalResponseTime += duration;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // Update circuit breaker
    if (this.options.circuitBreaker.enabled) {
      if (this.circuitBreaker.state === 'half-open') {
        this.circuitBreaker.successCount++;
        if (this.circuitBreaker.successCount >= 3) { // Require 3 successes to close
          this.circuitBreaker.state = 'closed';
          this.circuitBreaker.failures = 0;
          this.circuitBreaker.successCount = 0;
          this.emit('circuitBreakerClosed', this.options.provider.name);
        }
      }
    }
  }

  private recordFailure(duration: number): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
    this.metrics.totalResponseTime += duration;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    // Update circuit breaker
    if (this.options.circuitBreaker.enabled) {
      const now = Date.now();
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = now;

      // Check if we should open the circuit breaker
      if (
        this.circuitBreaker.state !== 'open' &&
        this.circuitBreaker.failures >= this.options.circuitBreaker.failureThreshold
      ) {
        this.circuitBreaker.state = 'open';
        this.circuitBreaker.nextAttemptTime = now + this.options.circuitBreaker.resetTimeout;
        this.circuitBreaker.successCount = 0;
        this.metrics.circuitBreakerTrips++;

        runtimeLogger.warn(`Circuit breaker opened for ${this.options.provider.name}`, {
          failures: this.circuitBreaker.failures,
          threshold: this.options.circuitBreaker.failureThreshold,
        });

        this.emit('circuitBreakerOpened', {
          provider: this.options.provider.name,
          failures: this.circuitBreaker.failures,
          nextAttemptTime: this.circuitBreaker.nextAttemptTime,
        });
      }
    }
  }
}

/**
 * Create an OpenAI connection pool
 */
export function createOpenAIPool(options: {
  apiKey: string;
  model?: string;
  baseURL?: string;
  poolOptions?: Partial<ConnectionPoolOptions>;
}): AIProviderConnectionPool {
  const connectionFactory = async (): Promise<AIProviderConnection> => {
    // This would create an actual OpenAI connection
    // For now, return a mock connection
    return {
      id: `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'openai',
      model: options.model,
      async connect() {
        // Connect to OpenAI
      },
      async disconnect() {
        // Disconnect from OpenAI
      },
      async isHealthy() {
        // Check if connection is healthy
        return true;
      },
      async execute(operation) {
        return await operation();
      },
      async chat(messages, chatOptions) {
        // Make OpenAI chat request
        return { content: 'Mock response', usage: { tokens: 100 } };
      },
      async *stream(messages, streamOptions) {
        // Stream OpenAI response
        yield { content: 'Mock', delta: true };
        yield { content: ' streaming', delta: true };
        yield { content: ' response', delta: true };
      },
      getUsage() {
        return {
          requestCount: 1,
          tokenCount: 100,
          errorCount: 0,
          lastRequestTime: Date.now(),
        };
      },
    };
  };

  const poolOptions: AIProviderPoolOptions = {
    minSize: options.poolOptions?.minSize ?? 1,
    maxSize: options.poolOptions?.maxSize ?? 5,
    acquireTimeoutMs: options.poolOptions?.acquireTimeoutMs ?? 10000,
    createTimeoutMs: options.poolOptions?.createTimeoutMs ?? 5000,
    destroyTimeoutMs: options.poolOptions?.destroyTimeoutMs ?? 3000,
    idleTimeoutMs: options.poolOptions?.idleTimeoutMs ?? 60000,
    reapIntervalMs: options.poolOptions?.reapIntervalMs ?? 30000,
    createRetries: options.poolOptions?.createRetries ?? 3,
    validateOnBorrow: options.poolOptions?.validateOnBorrow ?? true,
    validateOnReturn: options.poolOptions?.validateOnReturn ?? false,
    fifo: options.poolOptions?.fifo ?? true,
    provider: {
      name: 'openai',
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      model: options.model,
      timeout: 30000,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
    },
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      tokensPerMinute: 100000,
    },
    caching: {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 500,
    },
    failover: {
      enabled: false,
      providers: [],
      strategy: 'round-robin',
    },
  };

  return new AIProviderConnectionPool(connectionFactory, poolOptions);
}