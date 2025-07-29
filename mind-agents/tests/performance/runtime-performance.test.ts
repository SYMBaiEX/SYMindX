// Runtime performance benchmarks
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TestFactories } from '../utils/test-factories';
import { MockMemoryProvider, MockPortal, MockExtension } from '../mocks/mock-providers';

describe('Runtime Performance Tests', () => {
  let testAgent: any;
  let mockMemoryProvider: MockMemoryProvider;
  let mockPortal: MockPortal;
  let mockExtension: MockExtension;
  
  beforeEach(() => {
    testAgent = TestFactories.createAgent();
    mockMemoryProvider = new MockMemoryProvider();
    mockPortal = new MockPortal();
    mockExtension = new MockExtension();
  });
  
  afterEach(() => {
    global.performanceTestUtils.getMetrics('agent_creation')?.count && 
      console.log('Agent creation metrics:', global.performanceTestUtils.getMetrics('agent_creation'));
  });
  
  describe('Agent Creation Performance', () => {
    it('should create agents within performance threshold', async () => {
      const agentCount = 10;
      const agents = [];
      
      for (let i = 0; i < agentCount; i++) {
        const [agent, duration] = await global.performanceTestUtils.measureAsync(
          'agent_creation',
          async () => {
            // Mock agent creation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Simulate work
            return TestFactories.createAgent({ id: `perf-agent-${i}` });
          }
        );
        
        agents.push(agent);
        expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.agentCreation);
      }
      
      expect(agents).toHaveLength(agentCount);
      
      // Assert overall performance
      global.performanceTestUtils.assertPerformance(
        'agent_creation',
        global.performanceTestUtils.thresholds.agentCreation,
        'p95'
      );
    });
    
    it('should handle batch agent creation efficiently', async () => {
      const batchSize = 20;
      
      const [batchResult, duration] = await global.performanceTestUtils.measureAsync(
        'batch_agent_creation',
        async () => {
          // Simulate batch creation
          const promises = Array.from({ length: batchSize }, (_, i) =>
            new Promise(resolve => 
              setTimeout(() => resolve(TestFactories.createAgent({ id: `batch-agent-${i}` })), Math.random() * 20)
            )
          );
          
          return await Promise.all(promises);
        }
      );
      
      expect(batchResult).toHaveLength(batchSize);
      expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.agentCreation * 2); // Allow 2x for batch
    });
  });
  
  describe('Message Processing Performance', () => {
    it('should process messages within threshold', async () => {
      const messageCount = 50;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        id: `msg-${i}`,
        content: `Test message ${i}`,
        timestamp: new Date(),
      }));
      
      for (const message of messages) {
        const [, duration] = await global.performanceTestUtils.measureAsync(
          'message_processing',
          async () => {
            // Mock message processing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            return { processed: true, messageId: message.id };
          }
        );
        
        expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.messageProcessing);
      }
      
      global.performanceTestUtils.assertPerformance(
        'message_processing',
        global.performanceTestUtils.thresholds.messageProcessing,
        'p95'
      );
    });
    
    it('should handle concurrent message processing', async () => {
      const concurrentMessages = 10;
      
      const [results, duration] = await global.performanceTestUtils.measureAsync(
        'concurrent_message_processing',
        async () => {
          const promises = Array.from({ length: concurrentMessages }, (_, i) =>
            new Promise(resolve => 
              setTimeout(() => resolve({ messageId: `concurrent-${i}`, processed: true }), Math.random() * 200)
            )
          );
          
          return await Promise.all(promises);
        }
      );
      
      expect(results).toHaveLength(concurrentMessages);
      expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.messageProcessing * 1.5);
    });
  });
  
  describe('Memory Operations Performance', () => {
    it('should perform memory operations within threshold', async () => {
      const operationCount = 30;
      
      for (let i = 0; i < operationCount; i++) {
        // Test memory storage
        const [, storeDuration] = await global.performanceTestUtils.measureAsync(
          'memory_store',
          async () => {
            const memory = TestFactories.createMemoryRecord({ id: `perf-memory-${i}` });
            return await mockMemoryProvider.storeMemory(testAgent.id, memory);
          }
        );
        
        expect(storeDuration).toBeLessThan(global.performanceTestUtils.thresholds.memoryOperation);
        
        // Test memory retrieval
        const [, retrieveDuration] = await global.performanceTestUtils.measureAsync(
          'memory_retrieve',
          async () => {
            return await mockMemoryProvider.retrieveMemories(testAgent.id, undefined, 10);
          }
        );
        
        expect(retrieveDuration).toBeLessThan(global.performanceTestUtils.thresholds.memoryOperation);
      }
      
      global.performanceTestUtils.assertPerformance(
        'memory_store',
        global.performanceTestUtils.thresholds.memoryOperation,
        'p95'
      );
      
      global.performanceTestUtils.assertPerformance(
        'memory_retrieve',
        global.performanceTestUtils.thresholds.memoryOperation,
        'p95'
      );
    });
    
    it('should handle bulk memory operations efficiently', async () => {
      const bulkSize = 100;
      const memories = TestFactories.createMemoryRecords(testAgent.id, bulkSize);
      
      const [, bulkStoreDuration] = await global.performanceTestUtils.measureAsync(
        'bulk_memory_store',
        async () => {
          // Simulate bulk store operation
          const promises = memories.map(memory => 
            mockMemoryProvider.storeMemory(testAgent.id, memory)
          );
          return await Promise.all(promises);
        }
      );
      
      // Bulk operations should be more efficient than individual operations
      const individualThreshold = global.performanceTestUtils.thresholds.memoryOperation * bulkSize;
      expect(bulkStoreDuration).toBeLessThan(individualThreshold * 0.7); // Should be 30% more efficient
    });
  });
  
  describe('Context Enrichment Performance', () => {
    it('should enrich context within threshold', async () => {
      const contextCount = 20;
      
      for (let i = 0; i < contextCount; i++) {
        const context = TestFactories.createUnifiedContext({ id: `perf-ctx-${i}` });
        
        const [, duration] = await global.performanceTestUtils.measureAsync(
          'context_enrichment',
          async () => {
            // Mock context enrichment
            await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
            
            // Simulate enrichment steps
            context.memory = {
              relevantMemories: TestFactories.createMemoryRecords(testAgent.id, 3),
              searchQuery: 'test',
              confidence: 0.8,
            };
            
            context.emotional = {
              currentState: TestFactories.createEmotionState(),
              triggers: [],
              history: [],
            };
            
            return context;
          }
        );
        
        expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.contextEnrichment);
      }
      
      global.performanceTestUtils.assertPerformance(
        'context_enrichment',
        global.performanceTestUtils.thresholds.contextEnrichment,
        'p95'
      );
    });
    
    it('should handle parallel context enrichment', async () => {
      const parallelCount = 5;
      const contexts = Array.from({ length: parallelCount }, (_, i) =>
        TestFactories.createUnifiedContext({ id: `parallel-ctx-${i}` })
      );
      
      const [enrichedContexts, duration] = await global.performanceTestUtils.measureAsync(
        'parallel_context_enrichment',
        async () => {
          const promises = contexts.map(async context => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            context.enrichment.completedSteps = ['memory_enrichment', 'emotional_enrichment'];
            return context;
          });
          
          return await Promise.all(promises);
        }
      );
      
      expect(enrichedContexts).toHaveLength(parallelCount);
      expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.contextEnrichment * 1.5);
    });
  });
  
  describe('Event Bus Performance', () => {
    it('should dispatch events within threshold', async () => {
      const eventCount = 100;
      const mockEventBus = {
        listeners: new Map(),
        
        on(event: string, handler: Function) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event)!.push(handler);
        },
        
        emit(event: string, data: any) {
          const handlers = this.listeners.get(event) || [];
          handlers.forEach(handler => handler(data));
        },
      };
      
      // Setup event handlers
      const handlerResults: any[] = [];
      mockEventBus.on('test:event', (data: any) => {
        handlerResults.push(data);
      });
      
      for (let i = 0; i < eventCount; i++) {
        const [, duration] = await global.performanceTestUtils.measureAsync(
          'event_dispatch',
          async () => {
            mockEventBus.emit('test:event', { eventId: i });
            // Small delay to simulate handler processing
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        );
        
        expect(duration).toBeLessThan(global.performanceTestUtils.thresholds.eventBusDispatch);
      }
      
      expect(handlerResults).toHaveLength(eventCount);
      
      global.performanceTestUtils.assertPerformance(
        'event_dispatch',
        global.performanceTestUtils.thresholds.eventBusDispatch,
        'p95'
      );
    });
  });
  
  describe('Memory Usage Tests', () => {
    it('should maintain reasonable memory usage during agent operations', async () => {
      const initialMemory = global.performanceTestUtils.getMemoryUsage();
      
      // Perform memory-intensive operations
      const agents = TestFactories.createAgents(50);
      const memories = agents.flatMap(agent => 
        TestFactories.createMemoryRecords(agent.id, 10)
      );
      
      // Simulate processing
      for (const memory of memories.slice(0, 100)) { // Process subset to avoid timeout
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const finalMemory = global.performanceTestUtils.getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100);
      
      console.log(`Memory usage: ${initialMemory.heapUsed}MB -> ${finalMemory.heapUsed}MB (+${memoryIncrease}MB)`);
    });
    
    it('should not have memory leaks during repeated operations', async () => {
      const iterations = 20;
      const memoryReadings = [];
      
      for (let i = 0; i < iterations; i++) {
        // Perform some operations
        const agent = TestFactories.createAgent();
        const context = TestFactories.createUnifiedContext();
        const memories = TestFactories.createMemoryRecords(agent.id, 5);
        
        // Simulate cleanup
        memories.length = 0;
        
        // Force garbage collection if available
        if (global.gc) global.gc();
        
        const memory = global.performanceTestUtils.getMemoryUsage();
        memoryReadings.push(memory.heapUsed);
      }
      
      // Check for memory leaks (memory should stabilize, not continuously grow)
      const firstHalf = memoryReadings.slice(0, iterations / 2);
      const secondHalf = memoryReadings.slice(iterations / 2);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Memory increase should be minimal (less than 20MB)
      const memoryGrowth = secondHalfAvg - firstHalfAvg;
      expect(memoryGrowth).toBeLessThan(20);
      
      console.log(`Memory growth over ${iterations} iterations: ${memoryGrowth.toFixed(2)}MB`);
    });
  });
  
  describe('Load Testing', () => {
    it('should handle high load scenarios', async () => {
      const loadConfig = {
        agents: 10,
        messagesPerAgent: 5,
        concurrency: 3,
      };
      
      const [results, duration] = await global.performanceTestUtils.measureAsync(
        'load_test',
        async () => {
          return await global.performanceTestUtils.generateLoad(loadConfig);
        }
      );
      
      expect(results).toHaveLength(loadConfig.agents);
      
      // Load test should complete within reasonable time
      const expectedMaxDuration = (loadConfig.agents * loadConfig.messagesPerAgent * 100) / loadConfig.concurrency;
      expect(duration).toBeLessThan(expectedMaxDuration);
      
      console.log(`Load test completed: ${loadConfig.agents} agents, ${loadConfig.messagesPerAgent} msgs/agent in ${duration.toFixed(2)}ms`);
    });
  });
});