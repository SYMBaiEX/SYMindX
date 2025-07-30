/**
 * Performance Optimization Utilities
 *
 * Advanced performance optimization including connection pooling, request batching,
 * intelligent caching, and dynamic rate limiting for AI SDK v5 portals.
 */

import { runtimeLogger } from '../../utils/logger';

// === CONNECTION POOLING ===

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface PooledConnection {
  id: string;
  provider: string;
  client: any;
  isActive: boolean;
  lastUsed: Date;
  useCount: number;
  createdAt: Date;
}

export class ConnectionPool {
  private connections = new Map<string, PooledConnection>();
  private availableConnections = new Map<string, PooledConnection[]>();
  private pendingRequests = new Map<
    string,
    Array<{
      resolve: (connection: PooledConnection) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }>
  >();

  constructor(
    private config: ConnectionPoolConfig,
    private createConnection: (providerId: string) => Promise<any>
  ) {
    // Initialize minimum connections for each provider
    this.initializePool();

    // Start cleanup timer
    setInterval(() => this.cleanupIdleConnections(), 60000); // Every minute
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(providerId: string): Promise<PooledConnection> {
    const available = this.availableConnections.get(providerId) || [];

    // Try to get an available connection
    if (available.length > 0) {
      const connection = available.pop()!;
      connection.isActive = true;
      connection.lastUsed = new Date();
      connection.useCount++;
      return connection;
    }

    // Check if we can create a new connection
    const allConnections = Array.from(this.connections.values()).filter(
      (conn) => conn.provider === providerId
    );

    if (allConnections.length < this.config.maxConnections) {
      return await this.createNewConnection(providerId);
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout for provider ${providerId}`));
      }, this.config.connectionTimeout);

      if (!this.pendingRequests.has(providerId)) {
        this.pendingRequests.set(providerId, []);
      }

      this.pendingRequests.get(providerId)!.push({
        resolve,
        reject,
        timeout,
      });
    });
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(connection: PooledConnection): void {
    connection.isActive = false;
    connection.lastUsed = new Date();

    const providerId = connection.provider;

    // Check if there are pending requests
    const pending = this.pendingRequests.get(providerId);
    if (pending && pending.length > 0) {
      const request = pending.shift()!;
      clearTimeout(request.timeout);
      connection.isActive = true;
      connection.useCount++;
      request.resolve(connection);
      return;
    }

    // Add back to available pool
    if (!this.availableConnections.has(providerId)) {
      this.availableConnections.set(providerId, []);
    }
    this.availableConnections.get(providerId)!.push(connection);
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<
    string,
    {
      total: number;
      active: number;
      available: number;
      pending: number;
      avgUseCount: number;
    }
  > {
    const stats: Record<string, any> = {};

    for (const [providerId, connections] of this.availableConnections) {
      const allConnections = Array.from(this.connections.values()).filter(
        (conn) => conn.provider === providerId
      );

      const active = allConnections.filter((conn) => conn.isActive);
      const pending = this.pendingRequests.get(providerId) || [];

      stats[providerId] = {
        total: allConnections.length,
        active: active.length,
        available: connections.length,
        pending: pending.length,
        avgUseCount:
          allConnections.reduce((sum, conn) => sum + conn.useCount, 0) /
          allConnections.length,
      };
    }

    return stats;
  }

  private async initializePool(): Promise<void> {
    // Initialize minimum connections for common providers
    const commonProviders = ['openai', 'anthropic', 'google'];

    for (const providerId of commonProviders) {
      const connectionsToCreate = Math.min(
        this.config.minConnections,
        this.config.maxConnections
      );

      for (let i = 0; i < connectionsToCreate; i++) {
        try {
          await this.createNewConnection(providerId);
        } catch (error) {
          runtimeLogger.warn(
            `Failed to initialize connection for ${providerId}:`,
            error
          );
        }
      }
    }
  }

  private async createNewConnection(
    providerId: string
  ): Promise<PooledConnection> {
    try {
      const client = await this.createConnection(providerId);
      const connection: PooledConnection = {
        id: `${providerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        provider: providerId,
        client,
        isActive: true,
        lastUsed: new Date(),
        useCount: 1,
        createdAt: new Date(),
      };

      this.connections.set(connection.id, connection);
      return connection;
    } catch (error) {
      runtimeLogger.error(
        `Failed to create connection for ${providerId}:`,
        error
      );
      throw error;
    }
  }

  private cleanupIdleConnections(): void {
    const now = new Date();
    const expiredConnections: string[] = [];

    for (const [id, connection] of this.connections) {
      if (!connection.isActive) {
        const idleTime = now.getTime() - connection.lastUsed.getTime();
        if (idleTime > this.config.idleTimeout) {
          expiredConnections.push(id);
        }
      }
    }

    // Remove expired connections
    for (const id of expiredConnections) {
      const connection = this.connections.get(id);
      if (connection) {
        // Remove from available pool
        const available = this.availableConnections.get(connection.provider);
        if (available) {
          const index = available.indexOf(connection);
          if (index > -1) {
            available.splice(index, 1);
          }
        }

        // Cleanup the actual connection
        try {
          if (
            connection.client &&
            typeof connection.client.destroy === 'function'
          ) {
            connection.client.destroy();
          }
        } catch (error) {
          runtimeLogger.warn(`Error cleaning up connection ${id}:`, error);
        }

        this.connections.delete(id);
      }
    }

    if (expiredConnections.length > 0) {
      runtimeLogger.debug(
        `Cleaned up ${expiredConnections.length} idle connections`
      );
    }
  }
}

// === REQUEST BATCHING ===

export interface BatchRequestConfig {
  maxBatchSize: number;
  batchTimeout: number;
  enableAdaptiveBatching: boolean;
  similarityThreshold: number;
}

export interface BatchableRequest {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  options: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: Date;
}

export class RequestBatcher {
  private pendingRequests = new Map<string, BatchableRequest[]>();
  private batchTimers = new Map<string, NodeJS.Timeout>();
  private similarityCache = new Map<string, string>();

  constructor(private config: BatchRequestConfig) {}

  /**
   * Add a request to the batch queue
   */
  addRequest(
    request: Omit<BatchableRequest, 'id' | 'timestamp'>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const batchableRequest: BatchableRequest = {
        ...request,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        resolve,
        reject,
      };

      const batchKey = this.getBatchKey(request);

      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }

      const batch = this.pendingRequests.get(batchKey)!;
      batch.push(batchableRequest);

      // Check if we should execute the batch
      if (batch.length >= this.config.maxBatchSize) {
        this.executeBatch(batchKey);
      } else if (!this.batchTimers.has(batchKey)) {
        // Set timer for batch execution
        const timer = setTimeout(() => {
          this.executeBatch(batchKey);
        }, this.config.batchTimeout);

        this.batchTimers.set(batchKey, timer);
      }
    });
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear the batch and timer
    this.pendingRequests.delete(batchKey);
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }

    try {
      // Group similar requests if adaptive batching is enabled
      const groups = this.config.enableAdaptiveBatching
        ? this.groupSimilarRequests(batch)
        : [batch];

      for (const group of groups) {
        await this.executeBatchGroup(group);
      }
    } catch (error) {
      // Reject all requests in the batch
      for (const request of batch) {
        request.reject(error as Error);
      }
    }
  }

  /**
   * Execute a group of similar requests
   */
  private async executeBatchGroup(group: BatchableRequest[]): Promise<void> {
    if (group.length === 1) {
      // Single request - execute normally
      const request = group[0];
      try {
        const result = await this.executeSingleRequest(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error as Error);
      }
      return;
    }

    // Multiple requests - try to batch them
    try {
      const batchResults = await this.executeBatchedRequest(group);

      // Distribute results back to individual requests
      for (let i = 0; i < group.length; i++) {
        if (batchResults[i]) {
          group[i].resolve(batchResults[i]);
        } else {
          group[i].reject(new Error('Batch execution failed'));
        }
      }
    } catch (error) {
      // Fallback: execute requests individually
      runtimeLogger.warn(
        'Batch execution failed, falling back to individual requests:',
        error
      );

      for (const request of group) {
        try {
          const result = await this.executeSingleRequest(request);
          request.resolve(result);
        } catch (individualError) {
          request.reject(individualError as Error);
        }
      }
    }
  }

  private getBatchKey(request: { provider: string; model: string }): string {
    return `${request.provider}:${request.model}`;
  }

  private groupSimilarRequests(
    batch: BatchableRequest[]
  ): BatchableRequest[][] {
    const groups: BatchableRequest[][] = [];
    const processed = new Set<string>();

    for (const request of batch) {
      if (processed.has(request.id)) continue;

      const group = [request];
      processed.add(request.id);

      // Find similar requests
      for (const other of batch) {
        if (processed.has(other.id)) continue;

        if (this.areRequestsSimilar(request, other)) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areRequestsSimilar(
    req1: BatchableRequest,
    req2: BatchableRequest
  ): boolean {
    // Check if prompts are similar based on various criteria
    const similarity = this.calculatePromptSimilarity(req1.prompt, req2.prompt);
    return similarity >= this.config.similarityThreshold;
  }

  private calculatePromptSimilarity(prompt1: string, prompt2: string): number {
    // Simple similarity calculation based on common words
    const words1 = new Set(prompt1.toLowerCase().split(/\s+/));
    const words2 = new Set(prompt2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word))
    );
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private async executeSingleRequest(request: BatchableRequest): Promise<any> {
    // This would be implemented by the specific portal
    throw new Error('executeSingleRequest must be implemented by the portal');
  }

  private async executeBatchedRequest(
    group: BatchableRequest[]
  ): Promise<any[]> {
    // This would be implemented by the specific portal for batch processing
    throw new Error('executeBatchedRequest must be implemented by the portal');
  }

  /**
   * Get batching statistics
   */
  getStats(): {
    pendingBatches: number;
    totalPendingRequests: number;
    averageBatchSize: number;
    batchesByProvider: Record<string, number>;
  } {
    let totalRequests = 0;
    const batchesByProvider: Record<string, number> = {};

    for (const [batchKey, requests] of this.pendingRequests) {
      totalRequests += requests.length;
      const [provider] = batchKey.split(':');
      batchesByProvider[provider] = (batchesByProvider[provider] || 0) + 1;
    }

    return {
      pendingBatches: this.pendingRequests.size,
      totalPendingRequests: totalRequests,
      averageBatchSize:
        this.pendingRequests.size > 0
          ? totalRequests / this.pendingRequests.size
          : 0,
      batchesByProvider,
    };
  }
}

// === INTELLIGENT CACHING ===

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enableCompression: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'adaptive';
}

export interface CacheEntry {
  key: string;
  value: any;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  compressed: boolean;
}

export class IntelligentCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU
  private currentSize = 0;

  constructor(private config: CacheConfig) {
    // Start cleanup timer
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get value from cache
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt.getTime() > this.config.ttl) {
      this.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = new Date();
    entry.accessCount++;

    // Update LRU order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Decompress if needed
    return entry.compressed ? this.decompress(entry.value) : entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: any): void {
    // Calculate size
    const size = this.calculateSize(value);

    // Compress if enabled and beneficial
    let compressed = false;
    let finalValue = value;

    if (this.config.enableCompression && size > 1000) {
      const compressedValue = this.compress(value);
      const compressedSize = this.calculateSize(compressedValue);

      if (compressedSize < size * 0.8) {
        // Only compress if significant savings
        finalValue = compressedValue;
        compressed = true;
      }
    }

    // Make room if needed
    this.makeRoom(size);

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Create new entry
    const entry: CacheEntry = {
      key,
      value: finalValue,
      size: compressed ? this.calculateSize(finalValue) : size,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      compressed,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentSize += entry.size;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSize -= entry.size;

    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.createdAt.getTime() > this.config.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Generate cache key for request
   */
  generateKey(
    provider: string,
    model: string,
    prompt: string,
    options: any = {}
  ): string {
    // Create a deterministic key based on request parameters
    const keyData = {
      provider,
      model,
      prompt: prompt.trim(),
      options: this.normalizeOptions(options),
    };

    return this.hash(JSON.stringify(keyData));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
    hitRate: number;
    averageSize: number;
    oldestEntry: Date | null;
    compressionRatio: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce(
      (sum, entry) => sum + entry.accessCount,
      0
    );
    const totalRequests = totalHits + this.getStats.misses || 0;

    const compressedEntries = entries.filter((e) => e.compressed);
    const compressionRatio =
      compressedEntries.length / Math.max(1, entries.length);

    return {
      size: this.currentSize,
      entries: entries.length,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      averageSize: entries.length > 0 ? this.currentSize / entries.length : 0,
      oldestEntry:
        entries.length > 0
          ? entries.reduce(
              (oldest, entry) =>
                entry.createdAt < oldest ? entry.createdAt : oldest,
              entries[0].createdAt
            )
          : null,
      compressionRatio,
    };
  }

  private makeRoom(neededSize: number): void {
    while (
      this.currentSize + neededSize > this.config.maxSize &&
      this.cache.size > 0
    ) {
      const keyToEvict = this.selectEvictionCandidate();
      if (keyToEvict) {
        this.delete(keyToEvict);
      } else {
        break; // Safety break
      }
    }
  }

  private selectEvictionCandidate(): string | null {
    if (this.cache.size === 0) return null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        return this.accessOrder[0] || null;

      case 'lfu':
        return (
          Array.from(this.cache.entries()).sort(
            ([, a], [, b]) => a.accessCount - b.accessCount
          )[0]?.[0] || null
        );

      case 'adaptive':
        // Combine LRU and LFU with age factor
        const entries = Array.from(this.cache.entries());
        const scored = entries.map(([key, entry]) => {
          const age = Date.now() - entry.lastAccessed.getTime();
          const frequency = entry.accessCount;
          const score = age / (frequency + 1); // Higher score = better eviction candidate
          return { key, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0]?.key || null;

      default:
        return this.accessOrder[0] || null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt.getTime() > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    if (expiredKeys.length > 0) {
      runtimeLogger.debug(
        `Cleaned up ${expiredKeys.length} expired cache entries`
      );
    }
  }

  private calculateSize(value: any): number {
    // Rough estimation of object size in bytes
    const str = JSON.stringify(value);
    return str.length * 2; // Assuming UTF-16 encoding
  }

  private compress(value: any): string {
    // Simple compression using JSON stringification
    // In production, you might want to use a proper compression library
    return JSON.stringify(value);
  }

  private decompress(value: string): any {
    return JSON.parse(value);
  }

  private normalizeOptions(options: any): any {
    // Sort keys to ensure consistent cache keys
    if (typeof options !== 'object' || options === null) return options;

    const normalized: any = {};
    const keys = Object.keys(options).sort();

    for (const key of keys) {
      normalized[key] = options[key];
    }

    return normalized;
  }

  private hash(str: string): string {
    // Simple hash function - in production, use a proper hash library
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

// === DYNAMIC RATE LIMITING ===

export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  adaptiveRate: boolean;
  backoffMultiplier: number;
  recoveryRate: number;
}

export class DynamicRateLimiter {
  private tokenBucket: number;
  private lastRefill = Date.now();
  private consecutiveFailures = 0;
  private currentRate: number;
  private requestQueue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: Date;
  }> = [];

  constructor(private config: RateLimitConfig) {
    this.tokenBucket = config.burstSize;
    this.currentRate = config.requestsPerSecond;

    // Start processing queue
    setInterval(() => this.processQueue(), 100);
  }

  /**
   * Wait for rate limit clearance
   */
  async waitForClearance(): Promise<void> {
    this.refillTokens();

    if (this.tokenBucket > 0) {
      this.tokenBucket--;
      return Promise.resolve();
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        timestamp: new Date(),
      });

      // Set timeout for queued requests
      setTimeout(() => {
        const index = this.requestQueue.findIndex(
          (req) => req.resolve === resolve
        );
        if (index > -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error('Rate limit timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Report request success
   */
  reportSuccess(): void {
    if (this.consecutiveFailures > 0) {
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);

      if (this.config.adaptiveRate) {
        // Gradually increase rate back to normal
        this.currentRate = Math.min(
          this.config.requestsPerSecond,
          this.currentRate * this.config.recoveryRate
        );
      }
    }
  }

  /**
   * Report request failure
   */
  reportFailure(): void {
    this.consecutiveFailures++;

    if (this.config.adaptiveRate && this.consecutiveFailures >= 3) {
      // Reduce rate to avoid overwhelming the service
      this.currentRate = Math.max(
        this.config.requestsPerSecond * 0.1, // Minimum 10% of original rate
        this.currentRate / this.config.backoffMultiplier
      );

      runtimeLogger.warn(
        `Rate limited due to failures. New rate: ${this.currentRate} req/s`
      );
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    currentRate: number;
    availableTokens: number;
    queueLength: number;
    consecutiveFailures: number;
  } {
    return {
      currentRate: this.currentRate,
      availableTokens: this.tokenBucket,
      queueLength: this.requestQueue.length,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 1000) * this.currentRate);

    if (tokensToAdd > 0) {
      this.tokenBucket = Math.min(
        this.config.burstSize,
        this.tokenBucket + tokensToAdd
      );
      this.lastRefill = now;
    }
  }

  private processQueue(): void {
    this.refillTokens();

    while (this.requestQueue.length > 0 && this.tokenBucket > 0) {
      const request = this.requestQueue.shift()!;
      this.tokenBucket--;
      request.resolve();
    }

    // Clean up old queued requests
    const cutoffTime = Date.now() - 30000; // 30 seconds ago
    this.requestQueue = this.requestQueue.filter(
      (req) => req.timestamp.getTime() > cutoffTime
    );
  }
}

// === PERFORMANCE MONITOR ===

export class PerformanceMonitor {
  private metrics = new Map<
    string,
    {
      requestCount: number;
      totalTime: number;
      errors: number;
      averageTime: number;
      lastRequest: Date;
    }
  >();

  /**
   * Record a request execution
   */
  recordRequest(key: string, executionTime: number, success: boolean): void {
    const existing = this.metrics.get(key) || {
      requestCount: 0,
      totalTime: 0,
      errors: 0,
      averageTime: 0,
      lastRequest: new Date(),
    };

    existing.requestCount++;
    existing.totalTime += executionTime;
    existing.averageTime = existing.totalTime / existing.requestCount;
    existing.lastRequest = new Date();

    if (!success) {
      existing.errors++;
    }

    this.metrics.set(key, existing);
  }

  /**
   * Get performance metrics
   */
  getMetrics(key?: string): any {
    if (key) {
      return this.metrics.get(key) || null;
    }

    const summary: any = {};
    for (const [k, v] of this.metrics) {
      summary[k] = {
        ...v,
        errorRate: v.errors / v.requestCount,
        successRate: (v.requestCount - v.errors) / v.requestCount,
      };
    }
    return summary;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// === EXPORT SINGLETONS ===

export const globalConnectionPool = new ConnectionPool(
  {
    maxConnections: 10,
    minConnections: 2,
    connectionTimeout: 30000,
    idleTimeout: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 1000,
  },
  async (providerId: string) => {
    // This would be implemented by each portal
    throw new Error(`Connection creation not implemented for ${providerId}`);
  }
);

export const globalRequestBatcher = new RequestBatcher({
  maxBatchSize: 5,
  batchTimeout: 100,
  enableAdaptiveBatching: true,
  similarityThreshold: 0.7,
});

export const globalCache = new IntelligentCache({
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 3600000, // 1 hour
  enableCompression: true,
  evictionPolicy: 'adaptive',
});

export const globalRateLimiter = new DynamicRateLimiter({
  requestsPerSecond: 10,
  burstSize: 20,
  adaptiveRate: true,
  backoffMultiplier: 2,
  recoveryRate: 1.1,
});

export const globalPerformanceMonitor = new PerformanceMonitor();
