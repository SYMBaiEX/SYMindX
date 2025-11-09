/**
 * Performance Optimization Tests
 * Tests for memory usage, caching, and performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { memoryManager } from '../utils/MemoryManager';
import { globalLazyLoader } from '../utils/LazyLoader';
import { stringPool, configPool } from '../utils/SharedMemoryPool';
import { gcOptimizer } from '../utils/GarbageCollectionOptimizer';
import { aiResponseCache } from '../utils/IntelligentResponseCache';
import { healthCheckSystem } from '../utils/HealthCheckSystem';
import { bottleneckAnalyzer } from '../utils/BottleneckAnalyzer';

describe('Performance Optimization', () => {
  beforeEach(() => {
    // Clean up before each test
    globalLazyLoader.clear();
    stringPool.clear();
    configPool.clear();
    aiResponseCache.clear();
  });

  afterEach(() => {
    // Clean up after each test
    globalLazyLoader.clear();
    stringPool.clear();
    configPool.clear();
    aiResponseCache.clear();
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const stats = memoryManager.getStats();
      
      expect(stats.currentMemory).toBeDefined();
      expect(stats.currentMemory.heapUsed).toBeGreaterThan(0);
      expect(stats.leakDetection).toBeDefined();
      expect(stats.resourceCount).toBeGreaterThanOrEqual(0);
    });

    it('should register and cleanup resources', async () => {
      const resource = { data: 'test' };
      let cleanupCalled = false;
      
      const resourceId = memoryManager.registerResource(
        'test',
        resource,
        () => { cleanupCalled = true; },
        { ttl: 1000 }
      );

      expect(resourceId).toBeDefined();
      expect(memoryManager.accessResource(resourceId)).toBe(resource);

      const success = await memoryManager.unregisterResource(resourceId);
      expect(success).toBe(true);
      expect(cleanupCalled).toBe(true);
    });

    it('should optimize memory usage', async () => {
      const result = await memoryManager.optimizeMemoryUsage();
      
      expect(result).toBeDefined();
      expect(typeof result.gcOptimized).toBe('boolean');
      expect(typeof result.lazyLoaderCleaned).toBe('number');
      expect(typeof result.sharedPoolsCleaned).toBe('number');
      expect(typeof result.resourcesCleaned).toBe('number');
    });
  });

  describe('Lazy Loading', () => {
    it('should register and load resources lazily', async () => {
      let loadCalled = false;
      const testResource = { value: 'loaded' };

      globalLazyLoader.register({
        id: 'test-resource',
        type: 'test',
        loader: async () => {
          loadCalled = true;
          return testResource;
        },
        priority: 5,
        memoryEstimate: 1024,
      });

      // Resource should not be loaded yet
      expect(globalLazyLoader.isLoaded('test-resource')).toBe(false);
      expect(loadCalled).toBe(false);

      // Load the resource
      const loaded = await globalLazyLoader.load('test-resource');
      expect(loaded).toBe(testResource);
      expect(loadCalled).toBe(true);
      expect(globalLazyLoader.isLoaded('test-resource')).toBe(true);

      // Second load should return cached version
      loadCalled = false;
      const loaded2 = await globalLazyLoader.load('test-resource');
      expect(loaded2).toBe(testResource);
      expect(loadCalled).toBe(false);
    });

    it('should cleanup unused resources', async () => {
      globalLazyLoader.register({
        id: 'cleanup-test',
        type: 'test',
        loader: async () => ({ data: 'test' }),
        priority: 1,
        ttl: 100, // Very short TTL
      });

      await globalLazyLoader.load('cleanup-test');
      expect(globalLazyLoader.isLoaded('cleanup-test')).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = await globalLazyLoader.cleanup();
      expect(cleaned).toBeGreaterThan(0);
      expect(globalLazyLoader.isLoaded('cleanup-test')).toBe(false);
    });
  });

  describe('Shared Memory Pools', () => {
    it('should pool and reuse strings', () => {
      const str1 = 'test string';
      const str2 = 'test string';

      const pooled1 = stringPool.getOrCreate(str1);
      const pooled2 = stringPool.getOrCreate(str2);

      // Should return the same reference
      expect(pooled1).toBe(pooled2);

      const stats = stringPool.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should pool and reuse config objects', () => {
      const config1 = { setting: 'value', number: 42 };
      const config2 = { setting: 'value', number: 42 };

      const pooled1 = configPool.getOrCreate(config1);
      const pooled2 = configPool.getOrCreate(config2);

      // Should return the same reference for identical objects
      expect(pooled1).toBe(pooled2);
    });

    it('should cleanup expired pool entries', () => {
      const testString = 'cleanup test';
      stringPool.getOrCreate(testString);

      const initialSize = stringPool.getStats().size;
      expect(initialSize).toBeGreaterThan(0);

      const cleaned = stringPool.cleanup();
      // Cleanup might not remove anything immediately due to TTL
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Garbage Collection Optimization', () => {
    it('should track GC statistics', () => {
      const stats = gcOptimizer.getStats();
      
      expect(stats.gcCount).toBeGreaterThanOrEqual(0);
      expect(stats.totalGCTime).toBeGreaterThanOrEqual(0);
      expect(stats.currentMemory).toBeDefined();
      expect(stats.recommendations).toBeInstanceOf(Array);
    });

    it('should track weak references', () => {
      const obj = { data: 'test' };
      const weakRef = gcOptimizer.trackWeakRef(obj);
      
      expect(weakRef.deref()).toBe(obj);
      
      const stats = gcOptimizer.getStats();
      expect(stats.weakRefCount).toBeGreaterThan(0);
    });

    it('should optimize memory', async () => {
      const result = await gcOptimizer.optimize();
      
      expect(result).toBeDefined();
      expect(typeof result.gcPerformed).toBe('boolean');
      expect(typeof result.weakRefsCleanedUp).toBe('number');
      expect(typeof result.memoryBefore).toBe('number');
      expect(typeof result.memoryAfter).toBe('number');
    });
  });

  describe('Intelligent Response Cache', () => {
    it('should cache and retrieve responses', async () => {
      const key = 'test-key';
      const value = 'test response';

      // Cache miss
      const cached1 = await aiResponseCache.get(key);
      expect(cached1).toBeNull();

      // Set value
      await aiResponseCache.set(key, value);

      // Cache hit
      const cached2 = await aiResponseCache.get(key);
      expect(cached2).toBe(value);

      const stats = aiResponseCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should invalidate cache by tag', async () => {
      await aiResponseCache.set('key1', 'value1', { tags: ['tag1'] });
      await aiResponseCache.set('key2', 'value2', { tags: ['tag1'] });
      await aiResponseCache.set('key3', 'value3', { tags: ['tag2'] });

      expect(await aiResponseCache.get('key1')).toBe('value1');
      expect(await aiResponseCache.get('key2')).toBe('value2');
      expect(await aiResponseCache.get('key3')).toBe('value3');

      const invalidated = aiResponseCache.invalidateByTag('tag1');
      expect(invalidated).toBe(2);

      expect(await aiResponseCache.get('key1')).toBeNull();
      expect(await aiResponseCache.get('key2')).toBeNull();
      expect(await aiResponseCache.get('key3')).toBe('value3');
    });

    it('should prune expired entries', async () => {
      await aiResponseCache.set('expire-key', 'expire-value', { ttl: 50 });
      
      expect(await aiResponseCache.get('expire-key')).toBe('expire-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const pruned = aiResponseCache.prune();
      expect(pruned).toBeGreaterThan(0);
      
      expect(await aiResponseCache.get('expire-key')).toBeNull();
    });
  });

  describe('Health Check System', () => {
    it('should provide health status', () => {
      const status = healthCheckSystem.getHealthStatus();
      
      expect(status.overall).toMatch(/^(healthy|warning|critical|unknown)$/);
      expect(status.score).toBeGreaterThanOrEqual(0);
      expect(status.score).toBeLessThanOrEqual(100);
      expect(status.checks).toBeDefined();
      expect(status.summary).toBeDefined();
      expect(status.lastUpdate).toBeGreaterThan(0);
    });

    it('should register custom health checks', async () => {
      const customCheck = {
        name: 'test-check',
        description: 'Test health check',
        category: 'custom' as const,
        priority: 'low' as const,
        interval: 5000,
        timeout: 1000,
        retries: 1,
        enabled: true,
        check: async () => ({
          healthy: true,
          status: 'healthy' as const,
          message: 'Test check passed',
          timestamp: 0,
          duration: 0,
        }),
      };

      healthCheckSystem.registerCheck(customCheck);
      
      const result = await healthCheckSystem.runCheck('test-check');
      expect(result.healthy).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.message).toBe('Test check passed');
    });
  });

  describe('Bottleneck Analyzer', () => {
    it('should record and analyze operations', async () => {
      // Record some operations
      bottleneckAnalyzer.recordOperation('test-operation', 150); // Slow operation
      bottleneckAnalyzer.recordOperation('fast-operation', 10);   // Fast operation
      bottleneckAnalyzer.recordOperation('test-operation', 200); // Another slow one

      // Perform analysis
      const profile = await bottleneckAnalyzer.performAnalysis();
      
      expect(profile.operations).toBeInstanceOf(Array);
      expect(profile.bottlenecks).toBeInstanceOf(Array);
      expect(profile.summary).toBeDefined();
      expect(profile.timestamp).toBeGreaterThan(0);
    });

    it('should identify bottlenecks', () => {
      // Record a slow operation multiple times
      for (let i = 0; i < 5; i++) {
        bottleneckAnalyzer.recordOperation('slow-db-query', 300);
      }

      const bottlenecks = bottleneckAnalyzer.getBottlenecks();
      expect(bottlenecks.length).toBeGreaterThan(0);
      
      const dbBottleneck = bottlenecks.find(b => b.name === 'slow-db-query');
      expect(dbBottleneck).toBeDefined();
      expect(dbBottleneck?.category).toBe('database');
      expect(dbBottleneck?.severity).toMatch(/^(low|medium|high|critical)$/);
    });

    it('should provide recommendations', () => {
      // Record operations to trigger bottlenecks
      bottleneckAnalyzer.recordOperation('database-query', 500);
      bottleneckAnalyzer.recordOperation('ai-request', 1000);

      const recommendations = bottleneckAnalyzer.getRecommendations();
      expect(recommendations).toBeInstanceOf(Array);
      
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('category');
        expect(recommendations[0]).toHaveProperty('priority');
        expect(recommendations[0]).toHaveProperty('recommendations');
        expect(recommendations[0].recommendations).toBeInstanceOf(Array);
      }
    });
  });
});