/**
 * @module context-performance.test
 * @description Performance Benchmark Suite for Context System
 *
 * Benchmarks context operations vs baseline, memory usage analysis,
 * context caching effectiveness, and multi-agent context sharing performance.
 */

import {
  describe,
  test as it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'bun:test';
import {
  createContextLifecycleManager,
  type ContextLifecycleManager,
  type ContextLifecycleManagerConfig,
} from '../core/context/context-lifecycle-manager.js';
import { EnrichmentPipeline } from '../core/context/enrichment-pipeline.js';
import { CacheCoordinator } from '../core/context/caching/cache-coordinator.js';
import { L1ContextCache } from '../core/context/caching/l1-context-cache.js';
import { L2ContextCache } from '../core/context/caching/l2-context-cache.js';
import { L3ContextCache } from '../core/context/caching/l3-context-cache.js';
import { ContextSharingManager } from '../core/context/multi-agent/context-sharing-manager.js';
import { SYMindXRuntime } from '../core/runtime.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  PerformanceAssertions,
  createTestEnvironment,
  TestPresets,
} from '../core/context/__tests__/utils/index.js';
import type { UnifiedContext } from '../types/context/unified-context.js';
import type { Agent } from '../types/agent.js';

describe('Context Performance Benchmark Suite', () => {
  let contextManager: ContextLifecycleManager;
  let baselineManager: ContextLifecycleManager;
  let enrichmentPipeline: EnrichmentPipeline;
  let cacheCoordinator: CacheCoordinator;
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let runtime: SYMindXRuntime;

  beforeAll(async () => {
    testEnv = createTestEnvironment();

    // Initialize performance-optimized context manager
    const performanceConfig = ConfigFactory.createBasicConfig();
    contextManager = createContextLifecycleManager(performanceConfig);

    // Initialize baseline manager without enhancements
    const baselineConfig = ConfigFactory.createBasicConfig();
    baselineConfig.enableEnrichment = false;
    baselineManager = createContextLifecycleManager(baselineConfig);

    enrichmentPipeline = new EnrichmentPipeline(performanceConfig);
    cacheCoordinator = new CacheCoordinator(performanceConfig);

    // Initialize runtime for multi-agent testing
    runtime = new Runtime();
    await runtime.initialize({
      contextManager: contextManager,
      enableMultiAgent: true,
    });
  });

  afterAll(async () => {
    await runtime?.shutdown();
    testEnv.cleanup();
  });

  beforeEach(() => {
    // Test environment setup handled in beforeAll
    // Clear caches before each test
    cacheCoordinator.clearAll();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('Context Operations Baseline Comparison', () => {
    it('should benchmark context creation performance', async () => {
      const iterations = TestPresets.PERFORMANCE.iterations;

      // Baseline measurement
      const baselineStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        baselineManager.getOrCreateContext(`baseline-agent-${i}`, `user-${i}`);
      }
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Enhanced measurement
      const enhancedStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        contextManager.getOrCreateContext(`enhanced-agent-${i}`, `user-${i}`);
      }
      const enhancedEnd = performance.now();
      const enhancedTime = enhancedEnd - enhancedStart;

      // Performance comparison
      const performanceRatio = enhancedTime / baselineTime;
      console.log(
        `Context creation - Baseline: ${baselineTime.toFixed(2)}ms, Enhanced: ${enhancedTime.toFixed(2)}ms, Ratio: ${performanceRatio.toFixed(2)}`
      );

      // Enhanced should not be more than 2x slower than baseline
      expect(performanceRatio).toBeLessThan(2.0);
      expect(enhancedTime).toBeLessThan(TestPresets.PERFORMANCE.timeout);
    });

    it('should benchmark message processing performance', async () => {
      const iterations = TestPresets.PERFORMANCE.iterations;
      const messagesPerContext = 10;

      // Setup baseline contexts
      const baselineContexts = Array.from({ length: iterations }, (_, i) =>
        baselineManager.getOrCreateContext(`baseline-agent-${i}`, 'user-1')
      );

      // Setup enhanced contexts
      const enhancedContexts = Array.from({ length: iterations }, (_, i) =>
        contextManager.getOrCreateContext(`enhanced-agent-${i}`, 'user-1')
      );

      // Baseline measurement
      const baselineStart = performance.now();
      baselineContexts.forEach((context, i) => {
        for (let j = 0; j < messagesPerContext; j++) {
          baselineManager.addMessage(
            context,
            'user-1',
            `Baseline message ${i}-${j}`
          );
        }
      });
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Enhanced measurement
      const enhancedStart = performance.now();
      enhancedContexts.forEach((context, i) => {
        for (let j = 0; j < messagesPerContext; j++) {
          contextManager.addMessage(
            context,
            'user-1',
            `Enhanced message ${i}-${j}`
          );
        }
      });
      const enhancedEnd = performance.now();
      const enhancedTime = enhancedEnd - enhancedStart;

      const performanceRatio = enhancedTime / baselineTime;
      console.log(
        `Message processing - Baseline: ${baselineTime.toFixed(2)}ms, Enhanced: ${enhancedTime.toFixed(2)}ms, Ratio: ${performanceRatio.toFixed(2)}`
      );

      // Enhanced should not be more than 3x slower due to enrichment
      expect(performanceRatio).toBeLessThan(3.0);
    });

    it('should benchmark context retrieval performance', async () => {
      const iterations = TestPresets.PERFORMANCE.iterations;

      // Setup contexts
      const baselineContexts = Array.from({ length: iterations }, (_, i) => {
        const context = baselineManager.getOrCreateContext(
          `baseline-agent-${i}`,
          'user-1'
        );
        baselineManager.addMessage(context, 'user-1', `Setup message ${i}`);
        return context.id;
      });

      const enhancedContexts = Array.from({ length: iterations }, (_, i) => {
        const context = contextManager.getOrCreateContext(
          `enhanced-agent-${i}`,
          'user-1'
        );
        contextManager.addMessage(context, 'user-1', `Setup message ${i}`);
        return context.id;
      });

      // Baseline measurement
      const baselineStart = performance.now();
      baselineContexts.forEach((contextId) => {
        baselineManager.getContextSummary(contextId);
      });
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Enhanced measurement
      const enhancedStart = performance.now();
      enhancedContexts.forEach((contextId) => {
        contextManager.getContextSummary(contextId);
      });
      const enhancedEnd = performance.now();
      const enhancedTime = enhancedEnd - enhancedStart;

      const performanceRatio = enhancedTime / baselineTime;
      console.log(
        `Context retrieval - Baseline: ${baselineTime.toFixed(2)}ms, Enhanced: ${enhancedTime.toFixed(2)}ms, Ratio: ${performanceRatio.toFixed(2)}`
      );

      // With caching, enhanced should be competitive or faster
      expect(performanceRatio).toBeLessThan(2.0);
    });

    it('should benchmark context enrichment performance', async () => {
      const agent = AgentFactory.createBasicAgent();
      const iterations = TestPresets.MODERATE.iterations;

      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = contextManager.getOrCreateContext(
          `perf-agent-${i}`,
          'user-1'
        );
        contextManager.addMessage(
          context,
          'user-1',
          `Performance test message ${i} about programming`
        );
        return context;
      });

      const start = performance.now();
      const enrichments = await Promise.all(
        contexts.map((context) =>
          enrichmentPipeline.enrichContext(context, agent)
        )
      );
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `Enrichment performance - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per context`
      );

      expect(enrichments).toHaveLength(iterations);
      expect(enrichments.every((e) => e !== null)).toBe(true);
      expect(avgTime).toBeLessThan(100); // Should average less than 100ms per enrichment
      expect(totalTime).toBeLessThan(TestPresets.MODERATE.timeout);
    });

    it('should benchmark parallel enrichment performance', async () => {
      const agent = AgentFactory.createBasicAgent();
      const iterations = TestPresets.MODERATE.iterations;

      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = contextManager.getOrCreateContext(
          `parallel-agent-${i}`,
          'user-1'
        );
        contextManager.addMessage(
          context,
          'user-1',
          `Parallel test message ${i}`
        );
        return context;
      });

      // Sequential enrichment
      const sequentialStart = performance.now();
      for (const context of contexts) {
        await enrichmentPipeline.enrichContext(context, agent);
      }
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // Reset contexts
      contexts.forEach((context) => {
        context.enrichment = null as any;
      });

      // Parallel enrichment
      const parallelStart = performance.now();
      await Promise.all(
        contexts.map((context) =>
          enrichmentPipeline.enrichContext(context, agent)
        )
      );
      const parallelEnd = performance.now();
      const parallelTime = parallelEnd - parallelStart;

      const speedup = sequentialTime / parallelTime;
      console.log(
        `Parallel enrichment - Sequential: ${sequentialTime.toFixed(2)}ms, Parallel: ${parallelTime.toFixed(2)}ms, Speedup: ${speedup.toFixed(2)}x`
      );

      // Parallel should be significantly faster
      expect(speedup).toBeGreaterThan(2.0);
    });
  });

  describe('Memory Usage Analysis', () => {
    it('should analyze memory usage during context operations', () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      // Create contexts with enrichment
      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = contextManager.getOrCreateContext(
          `memory-agent-${i}`,
          'user-1'
        );
        contextManager.addMessage(
          context,
          'user-1',
          `Memory test message ${i} with some longer content to test memory usage patterns`
        );
        return context;
      });

      const peakMemory = process.memoryUsage();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      const heapGrowth =
        (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      const heapRetained =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      const memoryPerContext = (heapRetained / iterations) * 1024; // KB

      console.log(
        `Memory analysis - Heap growth: ${heapGrowth.toFixed(2)}MB, Retained: ${heapRetained.toFixed(2)}MB, Per context: ${memoryPerContext.toFixed(2)}KB`
      );

      // Memory usage should be reasonable
      expect(heapGrowth).toBeLessThan(200); // Less than 200MB growth
      expect(memoryPerContext).toBeLessThan(50); // Less than 50KB per context

      // Should not have excessive memory retention
      expect(heapRetained).toBeLessThan(heapGrowth * 0.8); // Should release at least 20%
    });

    it('should analyze memory usage with enrichment caching', async () => {
      const agent = AgentFactory.createBasicAgent();
      const iterations = 500;
      const initialMemory = process.memoryUsage();

      // Create contexts and enrich them
      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = contextManager.getOrCreateContext(
          `cache-agent-${i}`,
          'user-1'
        );
        contextManager.addMessage(
          context,
          'user-1',
          `Cache test message ${i} about programming and TypeScript`
        );
        return context;
      });

      // Enrich all contexts (should populate cache)
      await Promise.all(
        contexts.map((context) =>
          enrichmentPipeline.enrichContext(context, agent)
        )
      );

      const enrichedMemory = process.memoryUsage();

      // Access enrichment again (should use cache)
      contexts.forEach((context) => {
        const enrichment = context.enrichment;
        expect(enrichment).toBeDefined();
      });

      const cachedMemory = process.memoryUsage();

      const enrichmentMemory =
        (enrichedMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const cacheOverhead =
        (cachedMemory.heapUsed - enrichedMemory.heapUsed) / 1024 / 1024;

      console.log(
        `Cache memory analysis - Enrichment: ${enrichmentMemory.toFixed(2)}MB, Cache overhead: ${cacheOverhead.toFixed(2)}MB`
      );

      // Cache overhead should be minimal
      expect(cacheOverhead).toBeLessThan(enrichmentMemory * 0.1); // Less than 10% overhead
    });

    it('should detect memory leaks in long-running operations', async () => {
      const iterations = 100;
      const cycles = 5;
      const memoryReadings: number[] = [];

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Create, use, and cleanup contexts
        const contexts = Array.from({ length: iterations }, (_, i) => {
          const context = contextManager.getOrCreateContext(
            `leak-agent-${cycle}-${i}`,
            'user-1'
          );
          for (let j = 0; j < 10; j++) {
            contextManager.addMessage(
              context,
              'user-1',
              `Leak test message ${i}-${j}`
            );
          }
          return context;
        });

        // Use contexts
        contexts.forEach((context) => {
          contextManager.getContextSummary(context.id);
        });

        // Force cleanup
        if (global.gc) {
          global.gc();
        }

        memoryReadings.push(process.memoryUsage().heapUsed / 1024 / 1024);

        // Wait between cycles
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        'Memory readings (MB):',
        memoryReadings.map((r) => r.toFixed(2))
      );

      // Memory should not continuously grow
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = lastReading - firstReading;

      expect(memoryGrowth).toBeLessThan(20); // Should not grow by more than 20MB
    });

    it('should analyze memory efficiency of different context sizes', () => {
      const sizes = [10, 50, 100, 500, 1000];
      const results: Array<{
        size: number;
        memory: number;
        memoryPerMessage: number;
      }> = [];

      sizes.forEach((size) => {
        const initialMemory = process.memoryUsage().heapUsed;

        const context = contextManager.getOrCreateContext(
          `size-test-${size}`,
          'user-1'
        );
        for (let i = 0; i < size; i++) {
          contextManager.addMessage(
            context,
            'user-1',
            `Size test message ${i} with consistent content length for fair comparison`
          );
        }

        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryUsed = (finalMemory - initialMemory) / 1024; // KB
        const memoryPerMessage = memoryUsed / size;

        results.push({
          size,
          memory: memoryUsed,
          memoryPerMessage,
        });
      });

      console.log('Memory efficiency by context size:');
      results.forEach(({ size, memory, memoryPerMessage }) => {
        console.log(
          `  ${size} messages: ${memory.toFixed(2)}KB total, ${memoryPerMessage.toFixed(2)}KB per message`
        );
      });

      // Memory per message should not increase significantly with size
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      const efficiencyRatio =
        lastResult.memoryPerMessage / firstResult.memoryPerMessage;

      expect(efficiencyRatio).toBeLessThan(2.0); // Should not more than double
    });
  });

  describe('Context Caching Effectiveness', () => {
    it('should benchmark L1 cache performance', async () => {
      const l1Cache = new L1ContextCache(ConfigFactory.createCacheConfig());
      const iterations = TestPresets.PERFORMANCE.iterations;

      // Populate cache
      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = ContextFactory.createBasicContext();
        context.id = `l1-test-${i}`;
        return context;
      });

      contexts.forEach((context) => {
        l1Cache.set(context.id, context);
      });

      // Measure cache hits
      const start = performance.now();
      contexts.forEach((context) => {
        const cached = l1Cache.get(context.id);
        expect(cached).toBeDefined();
      });
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `L1 cache performance - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(4)}ms per access`
      );

      expect(avgTime).toBeLessThan(0.1); // Should be very fast (< 0.1ms per access)
      expect(l1Cache.getStats().hitRate).toBe(1.0); // 100% hit rate
    });

    it('should benchmark L2 cache performance', async () => {
      const l2Cache = new L2ContextCache(ConfigFactory.createCacheConfig());
      const iterations = TestPresets.MODERATE.iterations;

      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = ContextFactory.createBasicContext();
        context.id = `l2-test-${i}`;
        return context;
      });

      // Populate cache
      await Promise.all(
        contexts.map((context) => l2Cache.set(context.id, context))
      );

      // Measure cache retrieval
      const start = performance.now();
      const retrieved = await Promise.all(
        contexts.map((context) => l2Cache.get(context.id))
      );
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `L2 cache performance - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per access`
      );

      expect(retrieved.every((r) => r !== null)).toBe(true);
      expect(avgTime).toBeLessThan(5); // Should be reasonably fast (< 5ms per access)
    });

    it('should benchmark cache coordination performance', async () => {
      const iterations = TestPresets.MODERATE.iterations;

      const contexts = Array.from({ length: iterations }, (_, i) => {
        const context = ContextFactory.createBasicContext();
        context.id = `coord-test-${i}`;
        return context;
      });

      // Measure cache coordination
      const start = performance.now();

      // Store in cache coordinator (should handle L1/L2/L3 coordination)
      await Promise.all(
        contexts.map((context) => cacheCoordinator.set(context.id, context))
      );

      // Retrieve from cache coordinator
      const retrieved = await Promise.all(
        contexts.map((context) => cacheCoordinator.get(context.id))
      );

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `Cache coordination performance - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per operation`
      );

      expect(retrieved.every((r) => r !== null)).toBe(true);
      expect(avgTime).toBeLessThan(10); // Should coordinate efficiently

      const stats = cacheCoordinator.getStats();
      console.log(
        `Cache stats - Hit rate: ${stats.hitRate.toFixed(2)}, L1 hits: ${stats.l1Hits}, L2 hits: ${stats.l2Hits}`
      );
    });

    it('should analyze cache hit rates under different access patterns', async () => {
      const cacheSize = 100;
      const contexts = Array.from({ length: cacheSize * 2 }, (_, i) => {
        const context = ContextFactory.createBasicContext();
        context.id = `pattern-test-${i}`;
        return context;
      });

      // Test sequential access pattern
      const sequentialStart = performance.now();
      for (const context of contexts) {
        await cacheCoordinator.set(context.id, context);
        await cacheCoordinator.get(context.id);
      }
      const sequentialEnd = performance.now();
      const sequentialStats = cacheCoordinator.getStats();

      cacheCoordinator.clearAll();

      // Test random access pattern
      const randomStart = performance.now();
      const randomOrder = [...contexts].sort(() => Math.random() - 0.5);
      for (const context of randomOrder) {
        await cacheCoordinator.set(context.id, context);
      }
      for (const context of randomOrder) {
        await cacheCoordinator.get(context.id);
      }
      const randomEnd = performance.now();
      const randomStats = cacheCoordinator.getStats();

      console.log(
        `Access patterns - Sequential: ${(sequentialEnd - sequentialStart).toFixed(2)}ms, Random: ${(randomEnd - randomStart).toFixed(2)}ms`
      );
      console.log(
        `Hit rates - Sequential: ${sequentialStats.hitRate.toFixed(2)}, Random: ${randomStats.hitRate.toFixed(2)}`
      );

      // Sequential access should have better hit rates
      expect(sequentialStats.hitRate).toBeGreaterThan(0.5);
      expect(randomStats.hitRate).toBeGreaterThan(0.3);
    });

    it('should benchmark cache eviction performance', async () => {
      const cacheSize = 50;
      const totalContexts = cacheSize * 3; // Force evictions

      const contexts = Array.from({ length: totalContexts }, (_, i) => {
        const context = ContextFactory.createBasicContext();
        context.id = `eviction-test-${i}`;
        return context;
      });

      const start = performance.now();

      // Fill cache beyond capacity
      for (const context of contexts) {
        await cacheCoordinator.set(context.id, context);
      }

      const end = performance.now();
      const totalTime = end - start;

      console.log(
        `Cache eviction performance - Total: ${totalTime.toFixed(2)}ms for ${totalContexts} contexts`
      );

      const stats = cacheCoordinator.getStats();
      console.log(
        `Eviction stats - Total evictions: ${stats.evictions}, Current size: ${stats.currentSize}`
      );

      // Should handle evictions efficiently
      expect(stats.evictions).toBeGreaterThan(0);
      expect(stats.currentSize).toBeLessThanOrEqual(cacheSize);
      expect(totalTime / totalContexts).toBeLessThan(10); // < 10ms per context with evictions
    });
  });

  describe('Multi-Agent Context Sharing Performance', () => {
    it('should benchmark shared context creation', async () => {
      const agentCount = 10;
      const iterations = TestPresets.MODERATE.iterations;

      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `shared-agent-${i}`;
        return agent;
      });

      // Register agents with runtime
      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      const sharingManager = new ContextSharingManager(contextManager);

      const start = performance.now();

      const sharedContexts = await Promise.all(
        Array.from({ length: iterations }, async (_, i) => {
          const agentSubset = agents.slice(
            0,
            Math.min(agentCount, 3 + (i % 3))
          ); // 3-5 agents per context
          return sharingManager.createSharedContext(
            agentSubset.map((a) => a.id),
            `shared-test-${i}`
          );
        })
      );

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / iterations;

      console.log(
        `Shared context creation - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per context`
      );

      expect(sharedContexts.every((ctx) => ctx !== null)).toBe(true);
      expect(avgTime).toBeLessThan(50); // Should create shared contexts efficiently
    });

    it('should benchmark message propagation in shared contexts', async () => {
      const agentCount = 5;
      const messageCount = 100;

      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `propagation-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      const sharingManager = new ContextSharingManager(contextManager);
      const sharedContext = await sharingManager.createSharedContext(
        agents.map((a) => a.id),
        'propagation-test'
      );

      expect(sharedContext).toBeDefined();

      const start = performance.now();

      // Add messages from different agents
      for (let i = 0; i < messageCount; i++) {
        const fromAgent = agents[i % agentCount];
        contextManager.addMessage(
          sharedContext!,
          fromAgent.id,
          `Propagation test message ${i} from ${fromAgent.id}`
        );
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / messageCount;

      console.log(
        `Message propagation - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per message`
      );

      expect(sharedContext!.messages).toHaveLength(messageCount);
      expect(avgTime).toBeLessThan(5); // Should propagate messages efficiently
    });

    it('should benchmark context synchronization performance', async () => {
      const agentCount = 8;
      const contextCount = 20;

      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `sync-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      const sharingManager = new ContextSharingManager(contextManager);

      // Create multiple shared contexts
      const sharedContexts = await Promise.all(
        Array.from({ length: contextCount }, async (_, i) => {
          const agentSubset = agents.slice(0, 3 + (i % 3)); // Varying agent counts
          return sharingManager.createSharedContext(
            agentSubset.map((a) => a.id),
            `sync-test-${i}`
          );
        })
      );

      // Add messages to create synchronization work
      sharedContexts.forEach((context, i) => {
        if (context) {
          for (let j = 0; j < 5; j++) {
            contextManager.addMessage(
              context,
              agents[j % agents.length].id,
              `Sync message ${i}-${j}`
            );
          }
        }
      });

      const start = performance.now();

      // Force synchronization
      await Promise.all(
        sharedContexts.map(async (context) => {
          if (context) {
            return sharingManager.synchronizeContext(context.id);
          }
        })
      );

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / contextCount;

      console.log(
        `Context synchronization - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per context`
      );

      expect(avgTime).toBeLessThan(100); // Should synchronize contexts efficiently
    });

    it('should analyze memory usage in multi-agent scenarios', async () => {
      const agentCount = 20;
      const contextCount = 50;
      const messagesPerContext = 20;

      const initialMemory = process.memoryUsage();

      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `memory-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      const sharingManager = new ContextSharingManager(contextManager);

      // Create shared contexts
      const sharedContexts = await Promise.all(
        Array.from({ length: contextCount }, async (_, i) => {
          const agentSubset = agents.slice(0, 2 + (i % 4)); // 2-5 agents per context
          return sharingManager.createSharedContext(
            agentSubset.map((a) => a.id),
            `multi-memory-test-${i}`
          );
        })
      );

      // Populate contexts with messages
      sharedContexts.forEach((context, i) => {
        if (context) {
          for (let j = 0; j < messagesPerContext; j++) {
            const agent = agents[j % agents.length];
            contextManager.addMessage(
              context,
              agent.id,
              `Multi-agent memory test message ${i}-${j} with sufficient content to test memory usage`
            );
          }
        }
      });

      const peakMemory = process.memoryUsage();

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      const heapGrowth =
        (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const heapRetained =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const memoryPerContext = (heapRetained / contextCount) * 1024; // KB
      const memoryPerAgent = (heapRetained / agentCount) * 1024; // KB

      console.log(`Multi-agent memory analysis:`);
      console.log(`  Heap growth: ${heapGrowth.toFixed(2)}MB`);
      console.log(`  Heap retained: ${heapRetained.toFixed(2)}MB`);
      console.log(`  Memory per context: ${memoryPerContext.toFixed(2)}KB`);
      console.log(`  Memory per agent: ${memoryPerAgent.toFixed(2)}KB`);

      // Memory usage should be reasonable for multi-agent scenarios
      expect(heapGrowth).toBeLessThan(500); // Less than 500MB for this scale
      expect(memoryPerContext).toBeLessThan(200); // Less than 200KB per context
      expect(memoryPerAgent).toBeLessThan(500); // Less than 500KB per agent
    });

    it('should benchmark concurrent access performance', async () => {
      const agentCount = 10;
      const concurrentOperations = 100;

      const agents = Array.from({ length: agentCount }, (_, i) => {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `concurrent-agent-${i}`;
        return agent;
      });

      await Promise.all(agents.map((agent) => runtime.registerAgent(agent)));

      const sharingManager = new ContextSharingManager(contextManager);
      const sharedContext = await sharingManager.createSharedContext(
        agents.map((a) => a.id),
        'concurrent-test'
      );

      expect(sharedContext).toBeDefined();

      const operations = Array.from(
        { length: concurrentOperations },
        (_, i) => async () => {
          const agent = agents[i % agentCount];

          // Mix of different operations
          switch (i % 3) {
            case 0:
              contextManager.addMessage(
                sharedContext!,
                agent.id,
                `Concurrent message ${i} from ${agent.id}`
              );
              break;
            case 1:
              contextManager.getContextSummary(sharedContext!.id);
              break;
            case 2:
              return contextManager.getActiveContext(agent.id);
          }
        }
      );

      const start = performance.now();
      const results = await Promise.all(operations.map((op) => op()));
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / concurrentOperations;

      console.log(
        `Concurrent access - Total: ${totalTime.toFixed(2)}ms, Average: ${avgTime.toFixed(2)}ms per operation`
      );

      expect(results).toHaveLength(concurrentOperations);
      expect(avgTime).toBeLessThan(10); // Should handle concurrent access efficiently

      // Verify context integrity after concurrent operations
      expect(sharedContext!.messages.length).toBeGreaterThan(0);
      expect(sharedContext!.participants.size).toBe(agentCount);
    });
  });

  describe('Stress Testing and Edge Cases', () => {
    it('should handle extreme load scenarios', async () => {
      const extremeIterations = 5000;
      const batchSize = 100;

      console.log(
        `Starting extreme load test with ${extremeIterations} contexts...`
      );

      const start = performance.now();

      // Process in batches to avoid overwhelming the system
      for (let batch = 0; batch < extremeIterations; batch += batchSize) {
        const batchPromises = Array.from(
          { length: Math.min(batchSize, extremeIterations - batch) },
          (_, i) => {
            const contextId = batch + i;
            const context = contextManager.getOrCreateContext(
              `extreme-agent-${contextId}`,
              'user-1'
            );
            contextManager.addMessage(
              context,
              'user-1',
              `Extreme load message ${contextId}`
            );
            return contextManager.getContextSummary(context.id);
          }
        );

        await Promise.all(batchPromises);

        // Brief pause between batches
        if (batch % (batchSize * 5) === 0) {
          console.log(`Processed ${batch + batchSize} contexts...`);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / extremeIterations;

      console.log(
        `Extreme load test - Total: ${(totalTime / 1000).toFixed(2)}s, Average: ${avgTime.toFixed(2)}ms per context`
      );

      expect(avgTime).toBeLessThan(100); // Should maintain reasonable performance under extreme load
    });

    it('should maintain performance with large message histories', async () => {
      const context = contextManager.getOrCreateContext(
        'large-history-agent',
        'user-1'
      );
      const messageCount = 10000;

      console.log(`Testing performance with ${messageCount} messages...`);

      // Add many messages
      const addStart = performance.now();
      for (let i = 0; i < messageCount; i++) {
        contextManager.addMessage(
          context,
          i % 2 === 0 ? 'user-1' : 'agent',
          `Large history message ${i} with varying content about different topics including programming, AI, and technology`
        );

        // Progress indicator
        if (i % 1000 === 0) {
          console.log(`Added ${i} messages...`);
        }
      }
      const addEnd = performance.now();
      const addTime = addEnd - addStart;

      // Test operations on large context
      const opStart = performance.now();
      const summary = contextManager.getContextSummary(context.id);
      const opEnd = performance.now();
      const opTime = opEnd - opStart;

      console.log(
        `Large history performance - Add: ${addTime.toFixed(2)}ms, Operations: ${opTime.toFixed(2)}ms`
      );

      expect(summary).toBeDefined();
      expect(context.messages).toHaveLength(messageCount);
      expect(addTime / messageCount).toBeLessThan(1); // < 1ms per message addition
      expect(opTime).toBeLessThan(1000); // Operations should remain fast even with large history
    });
  });
});
