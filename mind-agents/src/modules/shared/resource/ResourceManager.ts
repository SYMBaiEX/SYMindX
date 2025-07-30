/**
 * Resource Management System for SYMindX
 *
 * Manages resource pools, cleanup, and monitoring across all modules
 */

import { runtimeLogger } from '../../../utils/logger';

export interface ResourceConfig {
  maxConnections?: number;
  maxMemoryMB?: number;
  maxCacheSize?: number;
  cleanupIntervalMs?: number;
  resourceTimeoutMs?: number;
  enableMetrics?: boolean;
}

export interface ResourceMetrics {
  totalResources: number;
  activeResources: number;
  pooledResources: number;
  memoryUsageMB: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface ResourceUsage {
  resourceId: string;
  type: string;
  allocated: Date;
  lastUsed: Date;
  usageCount: number;
  memoryMB: number;
  status: 'active' | 'idle' | 'cleanup' | 'error';
}

export interface PooledResource<T> {
  id: string;
  resource: T;
  created: Date;
  lastUsed: Date;
  usageCount: number;
  isHealthy: boolean;
  cleanup: () => Promise<void>;
}

export class ResourceManager {
  private pools = new Map<string, Set<PooledResource<any>>>();
  private activeResources = new Map<string, ResourceUsage>();
  private metrics = new Map<string, ResourceMetrics>();
  private cleanupInterval?: NodeJS.Timeout;
  private config: Required<ResourceConfig>;

  constructor(config: ResourceConfig = {}) {
    this.config = {
      maxConnections: 100,
      maxMemoryMB: 512,
      maxCacheSize: 1000,
      cleanupIntervalMs: 60000, // 1 minute
      resourceTimeoutMs: 300000, // 5 minutes
      enableMetrics: true,
      ...config,
    };

    this.startCleanupTimer();
    this.startMetricsCollection();
  }

  /**
   * Create a resource pool
   */
  createPool<T>(
    poolName: string,
    factory: () => Promise<T>,
    cleanup: (resource: T) => Promise<void>,
    options: {
      minSize?: number;
      maxSize?: number;
      idleTimeoutMs?: number;
    } = {}
  ): ResourcePool<T> {
    const poolOptions = {
      minSize: 1,
      maxSize: 10,
      idleTimeoutMs: 300000, // 5 minutes
      ...options,
    };

    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, new Set());
    }

    return new ResourcePool(poolName, factory, cleanup, poolOptions, this);
  }

  /**
   * Register active resource
   */
  registerResource(
    resourceId: string,
    type: string,
    memoryMB: number = 0
  ): void {
    const usage: ResourceUsage = {
      resourceId,
      type,
      allocated: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      memoryMB,
      status: 'active',
    };

    this.activeResources.set(resourceId, usage);
    this.updateMetrics(type);
  }

  /**
   * Update resource usage
   */
  updateResourceUsage(resourceId: string): void {
    const usage = this.activeResources.get(resourceId);
    if (usage) {
      usage.lastUsed = new Date();
      usage.usageCount++;
    }
  }

  /**
   * Release resource
   */
  releaseResource(resourceId: string): void {
    const usage = this.activeResources.get(resourceId);
    if (usage) {
      usage.status = 'idle';
      this.updateMetrics(usage.type);
    }
  }

  /**
   * Cleanup resource
   */
  cleanupResource(resourceId: string): void {
    this.activeResources.delete(resourceId);
  }

  /**
   * Get resource metrics
   */
  getMetrics(type?: string): ResourceMetrics | Map<string, ResourceMetrics> {
    if (type) {
      return this.metrics.get(type) || this.createEmptyMetrics();
    }
    return new Map(this.metrics);
  }

  /**
   * Get resource usage
   */
  getResourceUsage(): ResourceUsage[] {
    return Array.from(this.activeResources.values());
  }

  /**
   * Check resource limits
   */
  checkLimits(): {
    withinLimits: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // Check connection limit
    const totalConnections = this.activeResources.size;
    if (totalConnections > this.config.maxConnections) {
      violations.push(
        `Connection limit exceeded: ${totalConnections}/${this.config.maxConnections}`
      );
    }

    // Check memory limit
    const totalMemory = Array.from(this.activeResources.values()).reduce(
      (sum, usage) => sum + usage.memoryMB,
      0
    );
    if (totalMemory > this.config.maxMemoryMB) {
      violations.push(
        `Memory limit exceeded: ${totalMemory}MB/${this.config.maxMemoryMB}MB`
      );
    }

    return {
      withinLimits: violations.length === 0,
      violations,
    };
  }

  /**
   * Force cleanup of idle resources
   */
  async forceCleanup(): Promise<number> {
    const now = Date.now();
    const timeoutMs = this.config.resourceTimeoutMs;
    let cleanedCount = 0;

    for (const [resourceId, usage] of this.activeResources) {
      const idleTime = now - usage.lastUsed.getTime();

      if (usage.status === 'idle' && idleTime > timeoutMs) {
        try {
          this.activeResources.delete(resourceId);
          cleanedCount++;

          runtimeLogger.debug(`Cleaned up idle resource: ${resourceId}`);
        } catch (error) {
          runtimeLogger.error(
            `Error cleaning up resource ${resourceId}:`,
            error
          );
        }
      }
    }

    // Cleanup pools
    for (const [poolName, pool] of this.pools) {
      const poolCleanedCount = await this.cleanupPool(poolName, pool);
      cleanedCount += poolCleanedCount;
    }

    return cleanedCount;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    details: any;
  } {
    const limits = this.checkLimits();
    const totalResources = this.activeResources.size;
    const totalMemory = Array.from(this.activeResources.values()).reduce(
      (sum, usage) => sum + usage.memoryMB,
      0
    );

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Warning thresholds (80% of limits)
    if (
      totalResources > this.config.maxConnections * 0.8 ||
      totalMemory > this.config.maxMemoryMB * 0.8
    ) {
      status = 'warning';
    }

    // Critical thresholds (exceeded limits)
    if (!limits.withinLimits) {
      status = 'critical';
    }

    return {
      status,
      details: {
        totalResources,
        totalMemoryMB: totalMemory,
        limits: this.config,
        violations: limits.violations,
        pools: Array.from(this.pools.keys()).map((name) => ({
          name,
          size: this.pools.get(name)?.size || 0,
        })),
      },
    };
  }

  /**
   * Shutdown resource manager
   */
  async shutdown(): Promise<void> {
    runtimeLogger.info('Shutting down resource manager...');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cleanup all pools
    for (const [poolName, pool] of this.pools) {
      try {
        await this.shutdownPool(poolName, pool);
      } catch (error) {
        runtimeLogger.error(`Error shutting down pool ${poolName}:`, error);
      }
    }

    // Clear all resources
    this.activeResources.clear();
    this.pools.clear();
    this.metrics.clear();

    runtimeLogger.info('Resource manager shutdown complete');
  }

  // ===================================================================
  // INTERNAL METHODS
  // ===================================================================

  /**
   * Add resource to pool (internal)
   */
  addToPool<T>(poolName: string, resource: PooledResource<T>): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.add(resource);
    }
  }

  /**
   * Remove resource from pool (internal)
   */
  removeFromPool(poolName: string, resourceId: string): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      for (const resource of pool) {
        if (resource.id === resourceId) {
          pool.delete(resource);
          break;
        }
      }
    }
  }

  /**
   * Get resource from pool (internal)
   */
  getFromPool<T>(poolName: string): PooledResource<T> | null {
    const pool = this.pools.get(poolName);
    if (!pool || pool.size === 0) {
      return null;
    }

    // Find least recently used healthy resource
    let bestResource: PooledResource<T> | null = null;
    let oldestTime = Date.now();

    for (const resource of pool) {
      if (resource.isHealthy && resource.lastUsed.getTime() < oldestTime) {
        bestResource = resource as PooledResource<T>;
        oldestTime = resource.lastUsed.getTime();
      }
    }

    if (bestResource) {
      bestResource.lastUsed = new Date();
      bestResource.usageCount++;
    }

    return bestResource;
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleanedCount = await this.forceCleanup();
        if (cleanedCount > 0) {
          runtimeLogger.debug(`Cleaned up ${cleanedCount} idle resources`);
        }
      } catch (error) {
        runtimeLogger.error('Error during resource cleanup:', error);
      }
    }, this.config.cleanupIntervalMs);
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    setInterval(() => {
      this.updateAllMetrics();
    }, 30000); // Update metrics every 30 seconds
  }

  private async cleanupPool(
    poolName: string,
    pool: Set<PooledResource<any>>
  ): Promise<number> {
    const now = Date.now();
    const timeoutMs = this.config.resourceTimeoutMs;
    let cleanedCount = 0;

    for (const resource of pool) {
      const idleTime = now - resource.lastUsed.getTime();

      if (idleTime > timeoutMs && resource.usageCount === 0) {
        try {
          await resource.cleanup();
          pool.delete(resource);
          cleanedCount++;
        } catch (error) {
          runtimeLogger.error(
            `Error cleaning up pooled resource ${resource.id}:`,
            error
          );
        }
      }
    }

    return cleanedCount;
  }

  private async shutdownPool(
    poolName: string,
    pool: Set<PooledResource<any>>
  ): Promise<void> {
    const resources = Array.from(pool);

    await Promise.all(
      resources.map(async (resource) => {
        try {
          await resource.cleanup();
        } catch (error) {
          runtimeLogger.error(
            `Error cleaning up resource ${resource.id} in pool ${poolName}:`,
            error
          );
        }
      })
    );

    pool.clear();
  }

  private updateMetrics(type: string): void {
    if (!this.config.enableMetrics) return;

    const typeResources = Array.from(this.activeResources.values()).filter(
      (usage) => usage.type === type
    );

    const activeCount = typeResources.filter(
      (usage) => usage.status === 'active'
    ).length;
    const memoryUsage = typeResources.reduce(
      (sum, usage) => sum + usage.memoryMB,
      0
    );

    const metrics: ResourceMetrics = {
      totalResources: typeResources.length,
      activeResources: activeCount,
      pooledResources: this.pools.get(type)?.size || 0,
      memoryUsageMB: memoryUsage,
      cacheHitRate: 0, // Would be calculated from cache stats
      averageResponseTime: 0, // Would be calculated from timing data
      errorRate: 0, // Would be calculated from error counts
    };

    this.metrics.set(type, metrics);
  }

  private updateAllMetrics(): void {
    const types = new Set(
      Array.from(this.activeResources.values()).map((usage) => usage.type)
    );
    for (const type of types) {
      this.updateMetrics(type);
    }
  }

  private createEmptyMetrics(): ResourceMetrics {
    return {
      totalResources: 0,
      activeResources: 0,
      pooledResources: 0,
      memoryUsageMB: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
    };
  }
}

/**
 * Resource Pool implementation
 */
export class ResourcePool<T> {
  private resources = new Set<PooledResource<T>>();
  private waitingQueue: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  constructor(
    private poolName: string,
    private factory: () => Promise<T>,
    private cleanupFn: (resource: T) => Promise<void>,
    private options: {
      minSize: number;
      maxSize: number;
      idleTimeoutMs: number;
    },
    private manager: ResourceManager
  ) {
    this.initializePool();
  }

  /**
   * Acquire resource from pool
   */
  async acquire(): Promise<T> {
    // Try to get existing resource
    const existing = this.manager.getFromPool<T>(this.poolName);
    if (existing) {
      return existing.resource;
    }

    // Create new resource if under limit
    if (this.resources.size < this.options.maxSize) {
      try {
        const resource = await this.createResource();
        return resource.resource;
      } catch (error) {
        throw new Error(`Failed to create resource: ${error}`);
      }
    }

    // Wait for available resource
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Resource acquisition timeout for pool: ${this.poolName}`)
        );
      }, 30000); // 30 second timeout

      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * Release resource back to pool
   */
  async release(resource: T): Promise<void> {
    // Find the pooled resource
    let pooledResource: PooledResource<T> | null = null;
    for (const res of this.resources) {
      if (res.resource === resource) {
        pooledResource = res;
        break;
      }
    }

    if (!pooledResource) {
      runtimeLogger.warn(
        `Attempted to release unknown resource in pool: ${this.poolName}`
      );
      return;
    }

    pooledResource.lastUsed = new Date();

    // If there are waiting requests, fulfill them
    if (this.waitingQueue.length > 0) {
      const waiting = this.waitingQueue.shift()!;
      clearTimeout(waiting.timeout);
      waiting.resolve(resource);
      return;
    }

    // Resource goes back to idle state
    this.manager.releaseResource(pooledResource.id);
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalResources: number;
    availableResources: number;
    waitingRequests: number;
    minSize: number;
    maxSize: number;
  } {
    const available = Array.from(this.resources).filter(
      (r) => r.isHealthy
    ).length;

    return {
      totalResources: this.resources.size,
      availableResources: available,
      waitingRequests: this.waitingQueue.length,
      minSize: this.options.minSize,
      maxSize: this.options.maxSize,
    };
  }

  private async initializePool(): Promise<void> {
    // Create minimum number of resources
    for (let i = 0; i < this.options.minSize; i++) {
      try {
        await this.createResource();
      } catch (error) {
        runtimeLogger.error(
          `Failed to initialize resource ${i} in pool ${this.poolName}:`,
          error
        );
      }
    }
  }

  private async createResource(): Promise<PooledResource<T>> {
    const id = `${this.poolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const resource = await this.factory();

    const pooledResource: PooledResource<T> = {
      id,
      resource,
      created: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
      isHealthy: true,
      cleanup: async () => {
        await this.cleanupFn(resource);
        this.manager.cleanupResource(id);
      },
    };

    this.resources.add(pooledResource);
    this.manager.addToPool(this.poolName, pooledResource);
    this.manager.registerResource(id, this.poolName);

    return pooledResource;
  }
}
