/**
 * Runtime Optimizations for SYMindX
 *
 * High-performance async/await patterns and optimization methods
 */

import { promises as fs } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { nextTick } from 'node:process';

import { Agent, AgentConfig } from '../types/agent';
import { CharacterConfig } from '../types/character';
import { runtimeLogger } from '../utils/logger';

/**
 * Optimized agent loading with batching and parallel processing
 */
export async function loadAgentsOptimized(
  charactersDir: string,
  processCharacterConfig: (
    config: any,
    filename: string
  ) => Promise<Agent | null>,
  isCleanCharacterConfig: (config: Record<string, unknown>) => boolean,
  processLegacyConfig: (config: Record<string, unknown>) => CharacterConfig
): Promise<{
  agents: Map<string, Agent>;
  metrics: { loaded: number; disabled: number; errors: number };
}> {
  const agents = new Map<string, Agent>();
  const metrics = { loaded: 0, disabled: 0, errors: 0 };

  try {
    // Read directory with optimized file filtering
    const files = (await fs.readdir(charactersDir))
      .filter((file) => file.endsWith('.json'))
      .sort(); // Ensure consistent loading order

    if (files.length === 0) {
      runtimeLogger.warn('⚠️ No character files found in characters directory');
      return { agents, metrics };
    }

    // Batch file processing for optimal performance
    const batchSize = 5; // Process 5 files concurrently
    const batches: string[][] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      // Process batch in parallel with error isolation
      const batchPromises = batch.map(async (file) => {
        const startTime = performance.now();

        try {
          const filePath = `${charactersDir}/${file}`;

          // Optimized file reading with size check
          const stats = await fs.stat(filePath);
          if (stats.size > 1024 * 1024) {
            // 1MB limit
            throw new Error(`Character file too large: ${file}`);
          }

          const data = await fs.readFile(filePath, 'utf-8');
          let config: Record<string, unknown>;

          try {
            config = JSON.parse(data);
          } catch (parseError) {
            throw new Error(`Invalid JSON in ${file}: ${parseError}`);
          }

          // Fast config validation
          if (!config || typeof config !== 'object') {
            throw new Error(`Invalid config format in ${file}`);
          }

          // Process based on config type
          let processedConfig: CharacterConfig;
          if (isCleanCharacterConfig(config)) {
            processedConfig = config as unknown as CharacterConfig;
          } else {
            processedConfig = processLegacyConfig(config);
          }

          // Create agent
          const agent = await processCharacterConfig(processedConfig, file);

          const duration = performance.now() - startTime;
          runtimeLogger.debug(
            `Loaded agent from ${file} in ${duration.toFixed(2)}ms`
          );

          return { agent, file, duration };
        } catch (error) {
          const duration = performance.now() - startTime;
          runtimeLogger.error(
            `Failed to load agent from ${file}:`,
            error as Error
          );

          return { agent: null, file, error: error as Error, duration };
        }
      });

      // Await batch completion
      const batchResults = await Promise.all(batchPromises);

      // Process results
      for (const result of batchResults) {
        if (result.agent) {
          agents.set(result.agent.id, result.agent);

          if (result.agent.config?.enabled !== false) {
            metrics.loaded++;
          } else {
            metrics.disabled++;
          }
        } else {
          metrics.errors++;
        }
      }

      // Yield control to event loop between batches
      await new Promise((resolve) => nextTick(resolve));
    }

    const totalTime = batches.reduce((sum, _, i) => sum + i * 10, 0); // Estimated
    runtimeLogger.success(
      `✅ Loaded ${metrics.loaded} agents (${metrics.disabled} disabled, ${metrics.errors} errors)`
    );

    return { agents, metrics };
  } catch (error) {
    runtimeLogger.error('❌ Error in optimized agent loading:', error as Error);
    throw error;
  }
}

/**
 * Optimized tick loop with adaptive timing and batched processing
 */
export function createOptimizedTickLoop(
  isRunning: () => boolean,
  tickHandler: () => Promise<void>,
  interval = 1000
): {
  start: () => void;
  stop: () => void;
  updateInterval: (newInterval: number) => void;
} {
  let tickTimer: NodeJS.Timeout | undefined;
  let currentInterval = interval;
  let isTickInProgress = false;
  let adaptiveInterval = interval;

  // Performance tracking
  const tickMetrics = {
    totalTicks: 0,
    avgDuration: 0,
    maxDuration: 0,
    errorCount: 0,
  };

  const performTick = async () => {
    if (!isRunning() || isTickInProgress) {
      return;
    }

    isTickInProgress = true;
    const startTime = performance.now();

    try {
      await tickHandler();

      const duration = performance.now() - startTime;

      // Update metrics
      tickMetrics.totalTicks++;
      tickMetrics.avgDuration =
        (tickMetrics.avgDuration * (tickMetrics.totalTicks - 1) + duration) /
        tickMetrics.totalTicks;
      tickMetrics.maxDuration = Math.max(tickMetrics.maxDuration, duration);

      // Adaptive interval adjustment based on performance
      if (duration > currentInterval * 0.8) {
        // Tick taking too long, increase interval
        adaptiveInterval = Math.min(
          adaptiveInterval * 1.1,
          currentInterval * 2
        );
      } else if (duration < currentInterval * 0.2) {
        // Tick completing quickly, can decrease interval
        adaptiveInterval = Math.max(
          adaptiveInterval * 0.95,
          currentInterval * 0.5
        );
      }
    } catch (error) {
      tickMetrics.errorCount++;
      runtimeLogger.error('❌ Error in runtime tick:', error as Error);

      // Increase interval on errors to prevent cascade failures
      adaptiveInterval = Math.min(adaptiveInterval * 1.5, currentInterval * 3);
    } finally {
      isTickInProgress = false;
    }
  };

  const start = () => {
    if (tickTimer) {
      clearInterval(tickTimer);
    }

    // Use setInterval with adaptive timing
    tickTimer = setInterval(() => {
      // Use setImmediate to prevent blocking
      setImmediate(performTick);
    }, adaptiveInterval);

    runtimeLogger.info(
      `⚡ Optimized tick loop started with ${currentInterval}ms interval`
    );
  };

  const stop = () => {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = undefined;
    }

    runtimeLogger.info('⚡ Optimized tick loop stopped', {
      metadata: tickMetrics,
    });
  };

  const updateInterval = (newInterval: number) => {
    currentInterval = newInterval;
    adaptiveInterval = newInterval;

    if (tickTimer) {
      stop();
      start();
    }
  };

  return { start, stop, updateInterval };
}

/**
 * Optimized async operation with caching and batching
 */
export class OperationOptimizer {
  private cache = new Map<
    string,
    { result: any; timestamp: number; ttl: number }
  >();
  private pendingOperations = new Map<string, Promise<any>>();
  private batchQueue = new Map<
    string,
    Array<{ resolve: Function; reject: Function; args: any[] }>
  >();

  constructor(private defaultTTL = 5 * 60 * 1000) {} // 5 minutes default TTL

  /**
   * Execute operation with caching
   */
  async withCache<T>(
    key: string,
    operation: () => Promise<T>,
    ttl = this.defaultTTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }

    // Check if operation is already pending
    const pending = this.pendingOperations.get(key);
    if (pending) {
      return pending;
    }

    // Execute operation
    const promise = operation();
    this.pendingOperations.set(key, promise);

    try {
      const result = await promise;

      // Cache result
      this.cache.set(key, {
        result,
        timestamp: Date.now(),
        ttl,
      });

      return result;
    } finally {
      this.pendingOperations.delete(key);
    }
  }

  /**
   * Batch similar operations
   */
  async withBatching<T>(
    batchKey: string,
    operation: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);

        // Process batch on next tick
        nextTick(async () => {
          const batch = this.batchQueue.get(batchKey) || [];
          this.batchQueue.delete(batchKey);

          if (batch.length === 0) return;

          try {
            // Execute operation once for the batch
            const result = await operation(...batch[0].args);

            // Resolve all pending promises with the same result
            for (const item of batch) {
              item.resolve(result);
            }
          } catch (error) {
            // Reject all pending promises
            for (const item of batch) {
              item.reject(error);
            }
          }
        });
      }

      this.batchQueue.get(batchKey)!.push({ resolve, reject, args });
    });
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pendingOperations: this.pendingOperations.size,
      batchQueues: this.batchQueue.size,
    };
  }
}

/**
 * Global operation optimizer instance
 */
export const operationOptimizer = new OperationOptimizer();
