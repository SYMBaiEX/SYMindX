/**
 * Generic Connection Pool Implementation
 * High-performance connection pooling with health checks and auto-recycling
 */

import { EventEmitter } from 'node:events';
import { runtimeLogger } from './logger';

export interface Connection {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  execute<T>(operation: () => Promise<T>): Promise<T>;
}

export interface ConnectionPoolOptions {
  minSize: number;
  maxSize: number;
  acquireTimeoutMs?: number;
  createTimeoutMs?: number;
  destroyTimeoutMs?: number;
  idleTimeoutMs?: number;
  reapIntervalMs?: number;
  createRetries?: number;
  validateOnBorrow?: boolean;
  validateOnReturn?: boolean;
  fifo?: boolean;
}

interface PooledConnection<T extends Connection> {
  connection: T;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
  isValid: boolean;
}

export class ConnectionPool<T extends Connection> extends EventEmitter {
  private readonly options: Required<ConnectionPoolOptions>;
  private readonly factory: () => Promise<T>;
  
  private available: PooledConnection<T>[] = [];
  private inUse: Map<string, PooledConnection<T>> = new Map();
  private waitQueue: Array<{
    resolve: (conn: T) => void;
    reject: (error: Error) => void;
    timeoutId?: NodeJS.Timeout;
  }> = [];
  
  private size = 0;
  private isShuttingDown = false;
  private reapTimer?: NodeJS.Timer;
  
  // Metrics
  private metrics = {
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    timeouts: 0,
    validationFailures: 0,
    waitQueueSize: 0,
    waitTimeTotal: 0
  };
  
  constructor(
    factory: () => Promise<T>,
    options: ConnectionPoolOptions
  ) {
    super();
    
    this.factory = factory;
    this.options = {
      minSize: options.minSize,
      maxSize: options.maxSize,
      acquireTimeoutMs: options.acquireTimeoutMs ?? 5000,
      createTimeoutMs: options.createTimeoutMs ?? 5000,
      destroyTimeoutMs: options.destroyTimeoutMs ?? 5000,
      idleTimeoutMs: options.idleTimeoutMs ?? 30000,
      reapIntervalMs: options.reapIntervalMs ?? 10000,
      createRetries: options.createRetries ?? 3,
      validateOnBorrow: options.validateOnBorrow ?? true,
      validateOnReturn: options.validateOnReturn ?? false,
      fifo: options.fifo ?? true
    };
    
    // Start reaper for idle connections
    this.startReaper();
    
    // Pre-warm pool to minimum size
    this.ensureMinimum().catch(error => {
      runtimeLogger.error('Failed to pre-warm connection pool:', error);
    });
  }
  
  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }
    
    const startTime = Date.now();
    this.metrics.waitQueueSize = this.waitQueue.length;
    
    // Try to get an available connection
    let pooled = this.getAvailableConnection();
    
    if (pooled) {
      // Validate if required
      if (this.options.validateOnBorrow) {
        const isValid = await this.validate(pooled);
        if (!isValid) {
          await this.destroy(pooled);
          pooled = null;
        }
      }
    }
    
    // Create new connection if needed and possible
    if (!pooled && this.size < this.options.maxSize) {
      pooled = await this.create();
    }
    
    // Wait for a connection if none available
    if (!pooled) {
      pooled = await this.waitForConnection();
    }
    
    // Mark as in use
    this.inUse.set(pooled.connection.id, pooled);
    pooled.lastUsedAt = Date.now();
    pooled.useCount++;
    
    // Update metrics
    this.metrics.acquired++;
    this.metrics.waitTimeTotal += Date.now() - startTime;
    
    this.emit('acquire', pooled.connection);
    
    return pooled.connection;
  }
  
  /**
   * Release a connection back to the pool
   */
  async release(connection: T): Promise<void> {
    const pooled = this.inUse.get(connection.id);
    
    if (!pooled) {
      runtimeLogger.warn('Attempting to release unknown connection:', connection.id);
      return;
    }
    
    this.inUse.delete(connection.id);
    
    // Validate if required
    if (this.options.validateOnReturn) {
      const isValid = await this.validate(pooled);
      if (!isValid) {
        await this.destroy(pooled);
        this.processWaitQueue();
        return;
      }
    }
    
    // Check if we have too many connections
    if (this.size > this.options.minSize && this.available.length >= this.options.minSize) {
      await this.destroy(pooled);
    } else {
      // Return to available pool
      pooled.lastUsedAt = Date.now();
      if (this.options.fifo) {
        this.available.push(pooled);
      } else {
        this.available.unshift(pooled);
      }
    }
    
    this.metrics.released++;
    this.emit('release', connection);
    
    // Process wait queue
    this.processWaitQueue();
  }
  
  /**
   * Destroy a connection
   */
  async destroy(connection: T | PooledConnection<T>): Promise<void> {
    const pooled = 'connection' in connection ? connection : this.findPooledConnection(connection);
    
    if (!pooled) return;
    
    try {
      await this.timeoutPromise(
        pooled.connection.disconnect(),
        this.options.destroyTimeoutMs,
        'Connection destroy timeout'
      );
    } catch (error) {
      runtimeLogger.error('Error destroying connection:', error);
    }
    
    // Remove from available or in-use
    this.available = this.available.filter(p => p !== pooled);
    this.inUse.delete(pooled.connection.id);
    
    this.size--;
    this.metrics.destroyed++;
    
    this.emit('destroy', pooled.connection);
    
    // Ensure minimum connections
    this.ensureMinimum().catch(error => {
      runtimeLogger.error('Failed to ensure minimum connections:', error);
    });
  }
  
  /**
   * Get pool statistics
   */
  getStats(): {
    size: number;
    available: number;
    inUse: number;
    waitQueue: number;
    metrics: typeof this.metrics;
  } {
    return {
      size: this.size,
      available: this.available.length,
      inUse: this.inUse.size,
      waitQueue: this.waitQueue.length,
      metrics: { ...this.metrics }
    };
  }
  
  /**
   * Drain pool (prepare for shutdown)
   */
  async drain(): Promise<void> {
    this.isShuttingDown = true;
    
    // Stop reaper
    if (this.reapTimer) {
      clearInterval(this.reapTimer);
      this.reapTimer = undefined;
    }
    
    // Reject all waiting requests
    for (const waiter of this.waitQueue) {
      waiter.reject(new Error('Connection pool is draining'));
      if (waiter.timeoutId) {
        clearTimeout(waiter.timeoutId);
      }
    }
    this.waitQueue = [];
    
    // Wait for all in-use connections to be released
    const timeout = Date.now() + 30000; // 30 second timeout
    while (this.inUse.size > 0 && Date.now() < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force destroy any remaining in-use connections
    for (const pooled of this.inUse.values()) {
      await this.destroy(pooled);
    }
    
    // Destroy all available connections
    const toDestroy = [...this.available];
    this.available = [];
    
    await Promise.all(toDestroy.map(pooled => this.destroy(pooled)));
    
    this.emit('drain');
  }
  
  /**
   * Clear idle connections
   */
  async clear(): Promise<void> {
    const now = Date.now();
    const idleConnections = this.available.filter(
      pooled => now - pooled.lastUsedAt > this.options.idleTimeoutMs
    );
    
    await Promise.all(idleConnections.map(pooled => this.destroy(pooled)));
  }
  
  // Private helper methods
  
  private async create(): Promise<PooledConnection<T>> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.options.createRetries; attempt++) {
      try {
        const connection = await this.timeoutPromise(
          this.factory(),
          this.options.createTimeoutMs,
          'Connection creation timeout'
        );
        
        await this.timeoutPromise(
          connection.connect(),
          this.options.createTimeoutMs,
          'Connection connect timeout'
        );
        
        const pooled: PooledConnection<T> = {
          connection,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          useCount: 0,
          isValid: true
        };
        
        this.size++;
        this.metrics.created++;
        
        this.emit('create', connection);
        
        return pooled;
      } catch (error) {
        lastError = error as Error;
        runtimeLogger.warn(`Connection creation attempt ${attempt} failed:`, error);
        
        if (attempt < this.options.createRetries) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }
    }
    
    throw lastError || new Error('Failed to create connection');
  }
  
  private async validate(pooled: PooledConnection<T>): Promise<boolean> {
    try {
      const isHealthy = await pooled.connection.isHealthy();
      if (!isHealthy) {
        this.metrics.validationFailures++;
      }
      return isHealthy;
    } catch (error) {
      this.metrics.validationFailures++;
      return false;
    }
  }
  
  private getAvailableConnection(): PooledConnection<T> | null {
    if (this.available.length === 0) {
      return null;
    }
    
    return this.options.fifo 
      ? this.available.shift() ?? null
      : this.available.pop() ?? null;
  }
  
  private async waitForConnection(): Promise<PooledConnection<T>> {
    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };
      
      // Set timeout
      waiter.timeoutId = setTimeout(() => {
        const index = this.waitQueue.indexOf(waiter);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
          this.metrics.timeouts++;
          reject(new Error('Acquire timeout'));
        }
      }, this.options.acquireTimeoutMs);
      
      this.waitQueue.push(waiter);
    }).then(async (connection: T) => {
      const pooled = this.findPooledConnection(connection);
      if (!pooled) {
        throw new Error('Invalid pooled connection');
      }
      return pooled;
    });
  }
  
  private processWaitQueue(): void {
    while (this.waitQueue.length > 0 && this.available.length > 0) {
      const waiter = this.waitQueue.shift()!;
      const pooled = this.getAvailableConnection();
      
      if (pooled) {
        if (waiter.timeoutId) {
          clearTimeout(waiter.timeoutId);
        }
        waiter.resolve(pooled.connection);
      }
    }
  }
  
  private findPooledConnection(connection: T): PooledConnection<T> | null {
    for (const pooled of this.available) {
      if (pooled.connection === connection) {
        return pooled;
      }
    }
    
    return this.inUse.get(connection.id) ?? null;
  }
  
  private async ensureMinimum(): Promise<void> {
    const toCreate = Math.max(0, this.options.minSize - this.size);
    
    const promises: Promise<void>[] = [];
    for (let i = 0; i < toCreate; i++) {
      promises.push(
        this.create()
          .then(pooled => {
            this.available.push(pooled);
          })
          .catch(error => {
            runtimeLogger.error('Failed to create minimum connection:', error);
          })
      );
    }
    
    await Promise.all(promises);
  }
  
  private startReaper(): void {
    this.reapTimer = setInterval(() => {
      this.reapIdleConnections().catch(error => {
        runtimeLogger.error('Reaper error:', error);
      });
    }, this.options.reapIntervalMs);
  }
  
  private async reapIdleConnections(): Promise<void> {
    const now = Date.now();
    const toReap: PooledConnection<T>[] = [];
    
    // Find idle connections beyond minimum
    if (this.size > this.options.minSize) {
      const excessCount = this.size - this.options.minSize;
      const candidates = this.available
        .filter(pooled => now - pooled.lastUsedAt > this.options.idleTimeoutMs)
        .slice(0, excessCount);
      
      toReap.push(...candidates);
    }
    
    // Destroy idle connections
    await Promise.all(toReap.map(pooled => this.destroy(pooled)));
  }
  
  private async timeoutPromise<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }
}