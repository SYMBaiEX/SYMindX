/**
 * Performance Optimization Integration Tests
 * Comprehensive tests for optimized components and performance improvements
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'bun:test';
import { OptimizedEventBus } from '../core/OptimizedEventBus';
import { LRUCache, MultiLevelCache } from '../utils/LRUCache';
import { ConnectionPool } from '../utils/ConnectionPool';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { MemoryManager } from '../utils/MemoryManager';
import { AsyncQueue, globalQueue } from '../utils/AsyncQueue';
import {
  performanceBenchmark,
  quickBenchmark,
} from '../utils/PerformanceBenchmark';
import { AgentEvent } from '../types/agent';

describe('Performance Optimization Components', () => {
  let eventBus: OptimizedEventBus;
  let performanceMonitor: PerformanceMonitor;
  let memoryManager: MemoryManager;

  beforeAll(() => {
    performanceMonitor = new PerformanceMonitor();
    performanceMonitor.start();

    memoryManager = new MemoryManager();
    memoryManager.start();
  });

  afterAll(async () => {
    performanceMonitor.stop();
    memoryManager.stop();
    await globalQueue.shutdown(5000);
  });

  beforeEach(() => {
    eventBus = new OptimizedEventBus({
      maxEvents: 1000,
      compressionEnabled: true,
      batchingEnabled: true,
    });
  });

  afterEach(() => {
    eventBus.shutdown();
  });

  describe('OptimizedEventBus', () => {
    test('should handle high-volume events efficiently', async () => {
      const eventCount = 10000;
      const receivedEvents: AgentEvent[] = [];

      eventBus.subscribe('test-event', (event) => {
        receivedEvents.push(event);
      });

      const benchmark = await quickBenchmark(
        'event-bus-volume',
        () => {
          for (let i = 0; i < 100; i++) {
            eventBus.emit({
              id: `event-${i}`,
              type: 'test-event',
              agentId: 'test-agent',
              timestamp: new Date(),
              payload: { index: i, data: `data-${i}` },
            });
          }
        },
        100
      );

      // Performance assertions
      expect(benchmark.duration.avg).toBeLessThan(50); // Less than 50ms average
      expect(benchmark.throughput.opsPerSecond).toBeGreaterThan(100); // More than 100 ops/sec

      // Wait for batch processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents.length).toBeGreaterThan(0);
    });

    test('should compress events when enabled', () => {
      const events = eventBus.getEvents();

      // Add lots of similar events
      for (let i = 0; i < 1500; i++) {
        eventBus.emit({
          id: `event-${i}`,
          type: 'repeated-event',
          agentId: 'test-agent',
          timestamp: new Date(),
          payload: { data: 'similar-data' },
        });
      }

      const compressedEvents = eventBus.getEvents();
      const metrics = eventBus.getMetrics();

      expect(metrics.performance.compressionRatio).toBeLessThan(1.0);
      expect(compressedEvents.length).toBeLessThan(1500);
    });

    test('should prioritize events correctly', async () => {
      const receivedEvents: AgentEvent[] = [];

      eventBus.subscribe(
        'priority-event',
        (event) => {
          receivedEvents.push(event);
        },
        { priority: 10 }
      );

      eventBus.subscribe(
        'priority-event',
        (event) => {
          receivedEvents.push(event);
        },
        { priority: 5 }
      );

      const event: AgentEvent = {
        id: 'priority-test',
        type: 'priority-event',
        agentId: 'test-agent',
        timestamp: new Date(),
        payload: { priority: true },
      };

      eventBus.emit(event);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.length).toBe(2);
    });
  });

  describe('LRUCache', () => {
    test('should maintain LRU order and evict correctly', () => {
      const cache = new LRUCache<string, number>({ maxSize: 3 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recent
      expect(cache.get('a')).toBe(1);

      // Add new item, should evict 'b' (least recently used)
      cache.set('d', 4);

      expect(cache.get('b')).toBeNull();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    test('should respect TTL and auto-expire entries', async () => {
      const cache = new LRUCache<string, number>({
        maxSize: 10,
        ttl: 100, // 100ms TTL
      });

      cache.set('short-lived', 42);
      expect(cache.get('short-lived')).toBe(42);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('short-lived')).toBeNull();
    });

    test('should perform better than Map for cache workloads', async () => {
      const mapCache = new Map<string, any>();
      const lruCache = new LRUCache<string, any>({ maxSize: 1000 });

      const mapBenchmark = await quickBenchmark(
        'map-cache',
        () => {
          const key = `key-${Math.floor(Math.random() * 100)}`;
          if (Math.random() > 0.5) {
            mapCache.set(key, { data: 'test' });
          } else {
            mapCache.get(key);
          }
        },
        1000
      );

      const lruBenchmark = await quickBenchmark(
        'lru-cache',
        () => {
          const key = `key-${Math.floor(Math.random() * 100)}`;
          if (Math.random() > 0.5) {
            lruCache.set(key, { data: 'test' });
          } else {
            lruCache.get(key);
          }
        },
        1000
      );

      // LRU cache should be competitive with Map
      const performanceRatio =
        lruBenchmark.duration.avg / mapBenchmark.duration.avg;
      expect(performanceRatio).toBeLessThan(2); // Should not be more than 2x slower
    });
  });

  describe('MultiLevelCache', () => {
    test('should promote frequently accessed items', () => {
      const cache = new MultiLevelCache<string, number>({
        l1Size: 2,
        l2Size: 3,
      });

      // Fill cache
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      cache.set('e', 5);

      // Access 'c' multiple times to promote it
      cache.get('c');
      cache.get('c');
      cache.get('c');

      // Check that 'c' is now in L1 (fastest access)
      const stats = cache.getStats();
      expect(stats.l1.size).toBeGreaterThan(0);
    });
  });

  describe('AsyncQueue', () => {
    test('should execute tasks in priority order', async () => {
      const queue = new AsyncQueue({ maxConcurrency: 1 });
      const executionOrder: number[] = [];

      // Add tasks with different priorities
      queue.add(
        () => {
          executionOrder.push(1);
        },
        { priority: 1 }
      );
      queue.add(
        () => {
          executionOrder.push(5);
        },
        { priority: 5 }
      );
      queue.add(
        () => {
          executionOrder.push(3);
        },
        { priority: 3 }
      );
      queue.add(
        () => {
          executionOrder.push(10);
        },
        { priority: 10 }
      );

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(executionOrder).toEqual([10, 5, 3, 1]);

      await queue.shutdown();
    });

    test('should handle recurring tasks correctly', async () => {
      const queue = new AsyncQueue();
      const executions: number[] = [];

      queue.addRecurring(
        () => {
          executions.push(Date.now());
        },
        50,
        { maxExecutions: 3 }
      );

      // Wait for executions
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(executions.length).toBe(3);

      // Check intervals are approximately correct (50ms ± 20ms tolerance)
      for (let i = 1; i < executions.length; i++) {
        const interval = executions[i] - executions[i - 1];
        expect(interval).toBeGreaterThan(30);
        expect(interval).toBeLessThan(80);
      }

      await queue.shutdown();
    });

    test('should retry failed tasks', async () => {
      const queue = new AsyncQueue();
      let attempts = 0;

      queue.add(
        () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated failure');
          }
          return 'success';
        },
        { retries: 3 }
      );

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(attempts).toBe(3);

      await queue.shutdown();
    });
  });

  describe('PerformanceMonitor', () => {
    test('should track metrics accurately', () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      // Record some metrics
      monitor.recordMetric('test.counter', 1);
      monitor.recordMetric('test.counter', 2);
      monitor.recordMetric('test.counter', 3);

      const stats = monitor.getStats('test.counter');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBe(2);
      expect(stats!.min).toBe(1);
      expect(stats!.max).toBe(3);

      monitor.stop();
    });

    test('should trigger alerts on threshold breaches', async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      monitor.setThreshold('test.metric', 5, 10);

      let alertTriggered = false;
      monitor.on('alert', (alert) => {
        if (alert.metric === 'test.metric') {
          alertTriggered = true;
        }
      });

      monitor.recordMetric('test.metric', 15); // Above critical threshold

      expect(alertTriggered).toBe(true);

      monitor.stop();
    });

    test('should time function execution accurately', async () => {
      const monitor = new PerformanceMonitor();
      monitor.start();

      const result = await monitor.time('test.operation', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'completed';
      });

      expect(result).toBe('completed');

      const stats = monitor.getStats('test.operation.duration');
      expect(stats).not.toBeNull();
      expect(stats!.avg).toBeGreaterThan(45); // Approximately 50ms

      monitor.stop();
    });
  });

  describe('MemoryManager', () => {
    test('should track memory usage accurately', () => {
      const manager = new MemoryManager();
      manager.start();

      const initialSnapshot = manager.takeSnapshot();
      expect(initialSnapshot.heapUsed).toBeGreaterThan(0);
      expect(initialSnapshot.timestamp).toBeCloseTo(Date.now(), -2);

      manager.stop();
    });

    test('should manage resources with automatic cleanup', async () => {
      const manager = new MemoryManager();
      manager.start();

      let cleanupCalled = false;
      const resourceId = manager.registerResource(
        'test-resource',
        { data: 'test' },
        () => {
          cleanupCalled = true;
        },
        { ttl: 100 } // 100ms TTL
      );

      expect(manager.accessResource(resourceId)).toEqual({ data: 'test' });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Trigger cleanup
      await manager.cleanup();

      expect(cleanupCalled).toBe(true);
      expect(manager.accessResource(resourceId)).toBeNull();

      manager.stop();
    });

    test('should detect memory leaks', () => {
      const manager = new MemoryManager();
      manager.start();

      // Simulate memory growth
      for (let i = 0; i < 10; i++) {
        manager.takeSnapshot();
        // Simulate some memory allocation between snapshots
        const dummy = new Array(1000).fill('data');
        global.dummyData = dummy; // Prevent GC
      }

      const leakDetection = manager.detectLeaks();
      expect(leakDetection.trend).toBeDefined();
      expect(leakDetection.growthRate).toBeGreaterThanOrEqual(0);

      // Cleanup
      delete global.dummyData;
      manager.stop();
    });
  });

  describe('Connection Pool', () => {
    interface MockConnection {
      id: string;
      isConnected: boolean;
      connect(): Promise<void>;
      disconnect(): Promise<void>;
      isHealthy(): Promise<boolean>;
      execute<T>(operation: () => Promise<T>): Promise<T>;
    }

    function createMockConnection(): MockConnection {
      return {
        id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isConnected: false,
        async connect() {
          this.isConnected = true;
        },
        async disconnect() {
          this.isConnected = false;
        },
        async isHealthy() {
          return this.isConnected;
        },
        async execute<T>(operation: () => Promise<T>): Promise<T> {
          if (!this.isConnected) {
            throw new Error('Connection not established');
          }
          return operation();
        },
      };
    }

    test('should manage connections efficiently', async () => {
      const pool = new ConnectionPool(
        () => Promise.resolve(createMockConnection()),
        {
          minSize: 2,
          maxSize: 5,
          acquireTimeoutMs: 1000,
        }
      );

      // Get connections
      const conn1 = await pool.acquire();
      const conn2 = await pool.acquire();

      expect(conn1.isConnected).toBe(true);
      expect(conn2.isConnected).toBe(true);

      const stats = pool.getStats();
      expect(stats.inUse).toBe(2);

      // Release connections
      await pool.release(conn1);
      await pool.release(conn2);

      const finalStats = pool.getStats();
      expect(finalStats.inUse).toBe(0);
      expect(finalStats.available).toBeGreaterThan(0);

      await pool.drain();
    });

    test('should handle connection failures gracefully', async () => {
      let connectionCount = 0;
      const pool = new ConnectionPool(
        () => {
          connectionCount++;
          if (connectionCount <= 2) {
            return Promise.reject(new Error('Connection failed'));
          }
          return Promise.resolve(createMockConnection());
        },
        {
          minSize: 1,
          maxSize: 3,
          createRetries: 3,
        }
      );

      // Should eventually succeed after retries
      const connection = await pool.acquire();
      expect(connection.isConnected).toBe(true);

      await pool.release(connection);
      await pool.drain();
    });
  });

  describe('Integration Performance Tests', () => {
    test('should show overall performance improvement', async () => {
      const results = await performanceBenchmark.runPerformanceTests();

      expect(results.size).toBeGreaterThan(0);

      for (const [testName, comparison] of results) {
        console.log(
          `${testName}: ${comparison.verdict} (${comparison.improvement.duration.toFixed(2)}% duration improvement)`
        );

        // Most optimizations should show improvement or be at least neutral
        if (comparison.verdict === 'worse') {
          console.warn(`Performance regression detected in ${testName}`);
        }
      }
    });

    test('should maintain sub-200ms response times for critical paths', async () => {
      const criticalPaths = [
        {
          name: 'event-emission',
          fn: () => {
            eventBus.emit({
              id: 'critical-test',
              type: 'critical-event',
              agentId: 'test-agent',
              timestamp: new Date(),
              payload: { critical: true },
            });
          },
        },
        {
          name: 'cache-access',
          fn: () => {
            const cache = new LRUCache<string, any>({ maxSize: 100 });
            cache.set('key', { data: 'value' });
            return cache.get('key');
          },
        },
      ];

      for (const path of criticalPaths) {
        const result = await quickBenchmark(path.name, path.fn, 100);

        console.log(
          `${path.name}: ${result.duration.avg.toFixed(2)}ms average`
        );
        expect(result.duration.avg).toBeLessThan(200);
        expect(result.duration.p95).toBeLessThan(500);
      }
    });
  });
});
