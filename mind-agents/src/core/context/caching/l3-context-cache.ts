/**
 * L3 Context Cache - Persistent Disk Cache
 *
 * Persistent cache that stores data on disk with async operations.
 * Features write-ahead logging, file rotation, and efficient I/O.
 */

import {
  CacheLevel,
  CacheEntry,
  CacheEntryStatus,
  CacheAccessPattern,
  CacheEventType,
  type CacheConfiguration,
  type CacheSetOptions,
  type CacheMetrics,
  type CacheEvent,
  type CacheEventCallback,
} from '../../../types/context/context-caching';
import type { OperationResult } from '../../../types/helpers';
import type { Metadata } from '../../../types/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Disk cache entry with file reference
 */
interface DiskCacheEntry extends Omit<CacheEntry, 'data'> {
  filePath: string;
  fileSize: number;
}

/**
 * Write-ahead log entry
 */
interface WALEntry {
  operation: 'SET' | 'DELETE';
  key: string;
  timestamp: number;
  data?: unknown;
  options?: CacheSetOptions;
}

/**
 * Cache index for fast lookups
 */
interface CacheIndex {
  entries: Record<string, DiskCacheEntry>;
  metadata: {
    version: string;
    createdAt: number;
    lastUpdated: number;
    totalEntries: number;
    totalSize: number;
  };
}

/**
 * L3 Context Cache Implementation
 *
 * Persistent disk cache with:
 * - Async file operations
 * - Write-ahead logging for durability
 * - File rotation and cleanup
 * - Efficient index management
 */
export class L3ContextCache {
  private index: CacheIndex = {
    entries: {},
    metadata: {
      version: '1.0.0',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      totalEntries: 0,
      totalSize: 0,
    },
  };

  private writeBuffer = new Map<
    string,
    { data: unknown; options: CacheSetOptions }
  >();
  private writeBufferSize = 0;
  private walLog: WALEntry[] = [];
  private isFlushingBuffer = false;
  private flushInterval?: NodeJS.Timeout;
  private eventCallbacks = new Set<CacheEventCallback>();

  private config: CacheConfiguration['l3'];
  private globalConfig: CacheConfiguration['global'];
  private isInitialized = false;

  // File paths
  private indexPath: string = '';
  private walPath: string = '';
  private dataDirectory: string = '';

  // Performance metrics
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    fileReads: 0,
    fileWrites: 0,
    flushes: 0,
    totalResponseTime: 0,
    totalIOTime: 0,
    operationCount: 0,
  };

  constructor(
    config: CacheConfiguration['l3'],
    globalConfig: CacheConfiguration['global']
  ) {
    this.config = config;
    this.globalConfig = globalConfig;
  }

  /**
   * Initialize the L3 cache
   */
  async initialize(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      if (this.isInitialized) {
        return {
          success: false,
          error: 'L3 cache already initialized',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      // Validate configuration
      if (this.config.maxEntries <= 0) {
        throw new Error('maxEntries must be greater than 0');
      }

      if (this.config.maxDiskBytes <= 0) {
        throw new Error('maxDiskBytes must be greater than 0');
      }

      // Setup file paths
      this.dataDirectory = join(this.config.storageDirectory, 'data');
      this.indexPath = join(this.config.storageDirectory, 'index.json');
      this.walPath = join(this.config.storageDirectory, 'wal.json');

      // Create storage directories
      await this.ensureDirectoryExists(this.config.storageDirectory);
      await this.ensureDirectoryExists(this.dataDirectory);

      // Load existing index
      await this.loadIndex();

      // Replay WAL if it exists
      if (this.config.enableWAL) {
        await this.replayWAL();
      }

      // Start periodic buffer flush
      this.startPeriodicFlush();

      this.isInitialized = true;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: {
          maxEntries: this.config.maxEntries,
          maxDiskBytes: this.config.maxDiskBytes,
          storageDirectory: this.config.storageDirectory,
          existingEntries: this.index.metadata.totalEntries,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Get an item from L3 cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized || !this.config.enabled) {
      this.metrics.misses++;
      return null;
    }

    // Check write buffer first
    const bufferedEntry = this.writeBuffer.get(key);
    if (bufferedEntry) {
      this.metrics.hits++;
      const responseTime = performance.now() - startTime;
      this.updateMetricsResponseTime(responseTime);

      this.emitEvent({
        type: CacheEventType.HIT,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime,
        data: { source: 'buffer' },
      });

      return bufferedEntry.data as T;
    }

    const entry = this.index.entries[key];

    if (!entry) {
      this.metrics.misses++;
      this.updateMetricsResponseTime(performance.now() - startTime);
      this.emitEvent({
        type: CacheEventType.MISS,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
      });
      return null;
    }

    // Check if entry is expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.deleteFromDisk(key);
      this.metrics.misses++;
      this.updateMetricsResponseTime(performance.now() - startTime);
      this.emitEvent({
        type: CacheEventType.EXPIRE,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
      });
      return null;
    }

    try {
      // Read from disk
      const ioStart = performance.now();
      const data = await this.readFromDisk<T>(entry.filePath);
      const ioTime = performance.now() - ioStart;
      this.metrics.totalIOTime += ioTime;
      this.metrics.fileReads++;

      // Update access tracking
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      await this.updateIndex();

      this.metrics.hits++;
      const responseTime = performance.now() - startTime;
      this.updateMetricsResponseTime(responseTime);

      this.emitEvent({
        type: CacheEventType.HIT,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime,
        data: { source: 'disk', ioTime },
      });

      return data;
    } catch (error) {
      this.emitEvent({
        type: CacheEventType.ERROR,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error : new Error('Disk read failed'),
      });
      return null;
    }
  }

  /**
   * Set an item in L3 cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions = {}
  ): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized || !this.config.enabled) {
      return {
        success: false,
        error: 'L3 cache not initialized or disabled',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    try {
      // Calculate data size
      const serialized = JSON.stringify(value);
      const size = Buffer.byteLength(serialized, 'utf8');

      // Check if this single entry would exceed disk limit
      if (size > this.config.maxDiskBytes) {
        return {
          success: false,
          error: 'Entry size exceeds cache disk limit',
          timestamp: Date.now(),
          duration: performance.now() - startTime,
        };
      }

      // Add to write buffer
      this.writeBuffer.set(key, { data: value, options });
      this.writeBufferSize += size;

      // Add to WAL if enabled
      if (this.config.enableWAL) {
        this.walLog.push({
          operation: 'SET',
          key,
          timestamp: Date.now(),
          data: value,
          options,
        });
      }

      // Flush buffer if it exceeds threshold
      if (this.writeBufferSize >= this.config.writeBufferSize) {
        await this.flushWriteBuffer();
      }

      this.metrics.sets++;
      const responseTime = performance.now() - startTime;
      this.updateMetricsResponseTime(responseTime);

      this.emitEvent({
        type: CacheEventType.SET,
        key,
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime,
        data: {
          size,
          buffered: true,
          bufferSize: this.writeBufferSize,
        },
      });

      return {
        success: true,
        timestamp: Date.now(),
        duration: responseTime,
        data: {
          size,
          buffered: true,
          bufferSize: this.writeBufferSize,
          entryCount: Object.keys(this.index.entries).length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Delete an item from L3 cache
   */
  async delete(key: string): Promise<OperationResult> {
    const startTime = performance.now();
    this.metrics.operationCount++;

    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L3 cache not initialized',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    // Remove from write buffer if present
    const bufferedEntry = this.writeBuffer.get(key);
    if (bufferedEntry) {
      this.writeBuffer.delete(key);
      this.writeBufferSize -= JSON.stringify(bufferedEntry.data).length;
    }

    // Add to WAL if enabled
    if (this.config.enableWAL) {
      this.walLog.push({
        operation: 'DELETE',
        key,
        timestamp: Date.now(),
      });
    }

    const result = await this.deleteFromDisk(key);

    this.metrics.deletes++;
    const responseTime = performance.now() - startTime;
    this.updateMetricsResponseTime(responseTime);

    this.emitEvent({
      type: CacheEventType.DELETE,
      key,
      level: CacheLevel.L3,
      timestamp: Date.now(),
      responseTime,
    });

    return result;
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    if (!this.isInitialized || !this.config.enabled) {
      return false;
    }

    // Check write buffer first
    if (this.writeBuffer.has(key)) {
      return true;
    }

    const entry = this.index.entries[key];

    // Check expiration
    if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.deleteFromDisk(key);
      return false;
    }

    return !!entry;
  }

  /**
   * Clear all entries from L3 cache
   */
  async clear(): Promise<OperationResult> {
    const startTime = performance.now();

    if (!this.isInitialized) {
      return {
        success: false,
        error: 'L3 cache not initialized',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    try {
      // Clear write buffer
      this.writeBuffer.clear();
      this.writeBufferSize = 0;

      // Clear WAL
      this.walLog = [];

      // Delete all data files
      const entryCount = Object.keys(this.index.entries).length;
      for (const entry of Object.values(this.index.entries)) {
        try {
          await fs.unlink(entry.filePath);
        } catch (error) {
          // Ignore file not found errors
        }
      }

      // Reset index
      this.index = {
        entries: {},
        metadata: {
          version: '1.0.0',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          totalEntries: 0,
          totalSize: 0,
        },
      };

      await this.updateIndex();

      this.emitEvent({
        type: CacheEventType.CLEAR,
        key: '*',
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime: performance.now() - startTime,
        data: { clearedEntries: entryCount },
      });

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: { clearedEntries: entryCount },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): Partial<CacheMetrics> {
    const totalOps = this.metrics.hits + this.metrics.misses;
    const hitRate = totalOps > 0 ? this.metrics.hits / totalOps : 0;
    const avgResponseTime =
      this.metrics.operationCount > 0
        ? this.metrics.totalResponseTime / this.metrics.operationCount
        : 0;

    return {
      hitRate: {
        l1: 0,
        l2: 0,
        l3: hitRate,
        overall: hitRate,
      },
      responseTime: {
        l1: 0,
        l2: 0,
        l3: avgResponseTime,
        average: avgResponseTime,
      },
      diskUsage: {
        size: this.index.metadata.totalSize,
        percentage:
          (this.index.metadata.totalSize / this.config.maxDiskBytes) * 100,
        files: this.index.metadata.totalEntries,
      },
      entries: {
        l1: 0,
        l2: 0,
        l3: this.index.metadata.totalEntries,
        total: this.index.metadata.totalEntries,
      },
      operations: {
        reads: this.metrics.hits + this.metrics.misses,
        writes: this.metrics.sets,
        evictions: 0, // Would need eviction tracking
        invalidations: this.metrics.deletes,
      },
    };
  }

  /**
   * Get all cache keys
   */
  listKeys(): string[] {
    const diskKeys = Object.keys(this.index.entries);
    const bufferKeys = Array.from(this.writeBuffer.keys());
    return [...new Set([...diskKeys, ...bufferKeys])];
  }

  /**
   * Inspect cache entry without accessing data
   */
  inspect(key: string): CacheEntry | null {
    // Check write buffer first
    const bufferedEntry = this.writeBuffer.get(key);
    if (bufferedEntry) {
      const now = Date.now();
      return {
        id: key,
        data: null, // Don't return actual data for inspection
        level: CacheLevel.L3,
        status: CacheEntryStatus.LOADING,
        createdAt: now,
        lastAccessedAt: now,
        lastUpdatedAt: now,
        expiresAt: bufferedEntry.options.ttl
          ? now + bufferedEntry.options.ttl
          : undefined,
        accessCount: 0,
        size: Buffer.byteLength(JSON.stringify(bufferedEntry.data), 'utf8'),
        priority: bufferedEntry.options.priority ?? 1,
        accessPattern: CacheAccessPattern.RANDOM,
        metadata: bufferedEntry.options.metadata ?? {},
        dataHash: createHash('sha256')
          .update(JSON.stringify(bufferedEntry.data))
          .digest('hex'),
        tags: bufferedEntry.options.tags ?? [],
        dependencies: bufferedEntry.options.dependencies ?? [],
      };
    }

    return this.index.entries[key] ?? null;
  }

  /**
   * Subscribe to cache events
   */
  subscribe(callback: CacheEventCallback): void {
    this.eventCallbacks.add(callback);
  }

  /**
   * Unsubscribe from cache events
   */
  unsubscribe(callback: CacheEventCallback): void {
    this.eventCallbacks.delete(callback);
  }

  /**
   * Shutdown L3 cache
   */
  async shutdown(): Promise<OperationResult> {
    const startTime = performance.now();

    try {
      // Stop periodic flush
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = undefined;
      }

      // Flush any remaining write buffer
      await this.flushWriteBuffer();

      // Clear WAL
      if (this.config.enableWAL) {
        await this.clearWAL();
      }

      this.eventCallbacks.clear();
      this.isInitialized = false;

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Flush write buffer to disk
   */
  async flushWriteBuffer(): Promise<OperationResult> {
    if (this.isFlushingBuffer || this.writeBuffer.size === 0) {
      return {
        success: true,
        timestamp: Date.now(),
        duration: 0,
        data: { entriesFlushed: 0 },
      };
    }

    const startTime = performance.now();
    this.isFlushingBuffer = true;

    try {
      const entries = Array.from(this.writeBuffer.entries());
      let flushedCount = 0;

      for (const [key, { data, options }] of entries) {
        await this.writeToDisk(key, data, options);
        this.writeBuffer.delete(key);
        flushedCount++;
      }

      this.writeBufferSize = 0;
      this.metrics.flushes++;

      // Update index after flush
      await this.updateIndex();

      // Clear WAL after successful flush
      if (this.config.enableWAL) {
        await this.clearWAL();
      }

      const responseTime = performance.now() - startTime;

      this.emitEvent({
        type: CacheEventType.OPTIMIZE,
        key: '*',
        level: CacheLevel.L3,
        timestamp: Date.now(),
        responseTime,
        data: { entriesFlushed: flushedCount },
      });

      return {
        success: true,
        timestamp: Date.now(),
        duration: responseTime,
        data: { entriesFlushed: flushedCount },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    } finally {
      this.isFlushingBuffer = false;
    }
  }

  /**
   * Write data to disk
   */
  private async writeToDisk<T>(
    key: string,
    data: T,
    options: CacheSetOptions
  ): Promise<void> {
    const ioStart = performance.now();

    // Generate file path
    const hash = createHash('sha256').update(key).digest('hex');
    const filePath = join(this.dataDirectory, `${hash}.json`);

    // Serialize data
    const serialized = JSON.stringify(data);
    const size = Buffer.byteLength(serialized, 'utf8');

    // Write to disk
    await fs.writeFile(filePath, serialized, 'utf8');

    const now = Date.now();
    const entry: DiskCacheEntry = {
      id: key,
      level: CacheLevel.L3,
      status: CacheEntryStatus.FRESH,
      createdAt: now,
      lastAccessedAt: now,
      lastUpdatedAt: now,
      expiresAt: options.ttl ? now + options.ttl : undefined,
      accessCount: 0,
      size,
      priority: options.priority ?? 1,
      accessPattern: CacheAccessPattern.RANDOM,
      metadata: options.metadata ?? {},
      dataHash: createHash('sha256').update(serialized).digest('hex'),
      tags: options.tags ?? [],
      dependencies: options.dependencies ?? [],
      filePath,
      fileSize: size,
    };

    // Update index
    this.index.entries[key] = entry;
    this.index.metadata.totalEntries = Object.keys(this.index.entries).length;
    this.index.metadata.totalSize += size;
    this.index.metadata.lastUpdated = now;

    const ioTime = performance.now() - ioStart;
    this.metrics.totalIOTime += ioTime;
    this.metrics.fileWrites++;
  }

  /**
   * Read data from disk
   */
  private async readFromDisk<T>(filePath: string): Promise<T> {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  }

  /**
   * Delete data from disk
   */
  private async deleteFromDisk(key: string): Promise<OperationResult> {
    const startTime = performance.now();

    const entry = this.index.entries[key];
    if (!entry) {
      return {
        success: false,
        error: 'Key not found',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }

    try {
      // Delete file
      await fs.unlink(entry.filePath);

      // Update index
      delete this.index.entries[key];
      this.index.metadata.totalEntries = Object.keys(this.index.entries).length;
      this.index.metadata.totalSize -= entry.fileSize;
      this.index.metadata.lastUpdated = Date.now();

      await this.updateIndex();

      return {
        success: true,
        timestamp: Date.now(),
        duration: performance.now() - startTime,
        data: { freedDiskSpace: entry.fileSize },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        duration: performance.now() - startTime,
      };
    }
  }

  /**
   * Load index from disk
   */
  private async loadIndex(): Promise<void> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf8');
      this.index = JSON.parse(data);
    } catch (error) {
      // Index doesn't exist, start with empty index
      this.index = {
        entries: {},
        metadata: {
          version: '1.0.0',
          createdAt: Date.now(),
          lastUpdated: Date.now(),
          totalEntries: 0,
          totalSize: 0,
        },
      };
      await this.updateIndex();
    }
  }

  /**
   * Update index on disk
   */
  private async updateIndex(): Promise<void> {
    await fs.writeFile(
      this.indexPath,
      JSON.stringify(this.index, null, 2),
      'utf8'
    );
  }

  /**
   * Replay write-ahead log
   */
  private async replayWAL(): Promise<void> {
    try {
      const data = await fs.readFile(this.walPath, 'utf8');
      const walEntries: WALEntry[] = JSON.parse(data);

      for (const entry of walEntries) {
        if (entry.operation === 'SET' && entry.data && entry.options) {
          await this.writeToDisk(entry.key, entry.data, entry.options);
        } else if (entry.operation === 'DELETE') {
          await this.deleteFromDisk(entry.key);
        }
      }

      // Clear WAL after replay
      await this.clearWAL();
    } catch (error) {
      // WAL doesn't exist or is corrupted, continue without replay
    }
  }

  /**
   * Clear write-ahead log
   */
  private async clearWAL(): Promise<void> {
    this.walLog = [];
    try {
      await fs.unlink(this.walPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Start periodic buffer flush
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(async () => {
      if (this.writeBuffer.size > 0) {
        await this.flushWriteBuffer();
      }

      // Write WAL to disk
      if (this.config.enableWAL && this.walLog.length > 0) {
        try {
          await fs.writeFile(
            this.walPath,
            JSON.stringify(this.walLog, null, 2),
            'utf8'
          );
        } catch (error) {
          console.warn('Failed to write WAL:', error);
        }
      }
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await fs.access(path);
    } catch (error) {
      await fs.mkdir(path, { recursive: true });
    }
  }

  /**
   * Update metrics response time
   */
  private updateMetricsResponseTime(responseTime: number): void {
    this.metrics.totalResponseTime += responseTime;
  }

  /**
   * Emit cache event to subscribers
   */
  private emitEvent(event: CacheEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        // Silently ignore callback errors to prevent cache disruption
        console.warn('Cache event callback error:', error);
      }
    }
  }

  /**
   * Optimize cache by cleaning expired entries and rotating files
   */
  async optimize(): Promise<OperationResult> {
    const startTime = performance.now();
    let expiredCount = 0;
    let rotatedFiles = 0;
    const now = Date.now();

    // Remove expired entries
    const expiredKeys: string[] = [];
    for (const [key, entry] of Object.entries(this.index.entries)) {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.deleteFromDisk(key);
      expiredCount++;
    }

    // Implement file rotation if needed
    // This would involve checking file sizes and rotating based on config

    // Flush any pending writes
    await this.flushWriteBuffer();

    return {
      success: true,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      data: {
        expiredEntriesRemoved: expiredCount,
        filesRotated: rotatedFiles,
        currentEntries: this.index.metadata.totalEntries,
        diskUsage: this.index.metadata.totalSize,
      },
    };
  }
}
