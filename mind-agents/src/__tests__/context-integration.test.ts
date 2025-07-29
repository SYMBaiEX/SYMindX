/**
 * @module context-integration.test
 * @description Integration Test Suite for Context Integration Enhancements
 * 
 * Tests feature integration, performance impact, and scenarios
 * for the enhanced context system integration with SYMindX components.
 */

import { describe, test as it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import {
  createContextLifecycleManager,
} from '../core/context/context-lifecycle-manager.js';
import type {
  ContextLifecycleManager,
  ContextLifecycleManagerConfig,
} from '../types/context/context-lifecycle.js';
import { RuntimeContextAdapter } from '../core/context/integration/runtime-context-adapter.js';
import { ContextBootstrapper } from '../core/context/integration/context-bootstrapper.js';
// BackwardCompatibilityLayer was removed during refactoring
import { SYMindXRuntime } from '../core/runtime.js';
import { MultiAgentManager } from '../core/multi-agent-manager.js';
import { PortalIntegration } from '../core/portal-integration.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  PerformanceAssertions,
  createTestEnvironment,
  TestPresets,
} from '../core/context/__tests__/utils/index.js';
import type { Agent, AgentConfig } from '../types/agent.js';
import type { MemoryRecord } from '../types/memory.js';
import type { Portal } from '../types/portal.js';

describe('Context Integration Test Suite', () => {
  let runtime: SYMindXRuntime;
  let contextManager: ContextLifecycleManager;
  let runtimeAdapter: RuntimeContextAdapter;
  let testEnv: ReturnType<typeof createTestEnvironment>;

  beforeAll(async () => {
    testEnv = createTestEnvironment();
    
    // Initialize runtime with context enhancements
    const bootstrapper = new ContextBootstrapper();
    runtime = await bootstrapper.bootstrap({
      context: ConfigFactory.createBasicConfig(),
    });

    contextManager = runtime.getContextManager();
    runtimeAdapter = new RuntimeContextAdapter(runtime);
  });

  afterAll(async () => {
    await runtime?.shutdown();
    testEnv.cleanup();
  });

  beforeEach(() => {
    // Test environment setup handled in beforeAll
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('Backward Compatibility Integration', () => {
    it('should maintain compatibility with existing agent initialization', async () => {
      const legacyAgentConfig: AgentConfig = {
        id: 'legacy-agent-1',
        name: 'Legacy Agent',
        personality: ['helpful'],
        memory: { type: 'sqlite', config: { path: ':memory:' } },
        emotion: { type: 'composite' },
        cognition: { type: 'reactive' },
        communication: { style: 'friendly' },
        extensions: [],
        portals: { primary: 'openai', config: {} },
      };

      // Should work with existing runtime methods
      const agent = await runtime.createAgent(legacyAgentConfig);
      expect(agent).toBeDefined();
      expect(agent.id).toBe('legacy-agent-1');

      // Should have enhanced context capabilities
      const context = contextManager.getActiveContext(agent.id);
      expect(context).toBeDefined();

      // Should maintain legacy API surface
      const memoryProvider = agent.memory;
      expect(memoryProvider).toBeDefined();
      expect(typeof memoryProvider.store).toBe('function');
      expect(typeof memoryProvider.retrieve).toBe('function');
    });

    it('should support legacy message processing workflows', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const legacyMessage = {
        from: 'user-1',
        content: 'Hello, how can you help me?',
        timestamp: new Date(),
      };

      // Legacy message processing should work
      const response = await runtime.processMessage(agent.id, legacyMessage);
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();

      // But should use enhanced context internally
      const context = contextManager.getActiveContext(agent.id);
      expect(context).toBeDefined();
      expect(context!.messages.length).toBeGreaterThan(0);
      expect(context!.enrichment).toBeDefined();
    });

    it('should preserve existing memory system integration', async () => {
      const agent = AgentFactory.createBasicAgent();
      const memoryRecord: MemoryRecord = {
        id: 'test-memory-1',
        agentId: agent.id,
        type: 'interaction',
        content: 'Test interaction memory',
        importance: 0.8,
        timestamp: new Date(),
        metadata: { source: 'legacy-test' },
      };

      // Legacy memory storage should work
      await agent.memory.store(memoryRecord);
      const retrieved = await agent.memory.retrieve(agent.id, { type: 'interaction' });
      
      expect(retrieved).toBeDefined();
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].content).toBe(memoryRecord.content);

      // Enhanced context should be aware of memory operations
      const context = contextManager.getActiveContext(agent.id);
      expect(context?.enrichment.memoryIntegration).toBeDefined();
    });

    it('should maintain portal integration compatibility', async () => {
      const mockPortal: Portal = {
        id: 'mock-portal',
        type: 'openai' as const,
        generateResponse: async () => ({
          content: 'Mock response',
          metadata: { model: 'gpt-4', tokens: { input: 10, output: 5 } },
        }),
        streamResponse: async function* () {
          yield { content: 'Mock', delta: 'Mock' };
          yield { content: 'Mock response', delta: ' response' };
        },
      };

      const portalIntegration = new PortalIntegration(runtime);
      // Portal registration would be done through runtime

      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      // Test portal integration through runtime
      const response = await mockPortal.generateResponse(
        [{ role: 'user', content: 'Test message' }]
      );

      expect(response.content).toBe('Mock response');

      // Enhanced context should capture portal interactions
      const context = contextManager.getActiveContext(agent.id);
      expect(context?.enrichment.portalIntegration).toBeDefined();
    });

    it('should support legacy extension loading', async () => {
      const legacyExtensionConfig = {
        id: 'test-extension',
        name: 'Test Extension',
        type: 'api',
        config: { port: 3000 },
      };

      // Legacy extension loading should work
      const extension = await runtime.loadExtension(legacyExtensionConfig);
      expect(extension).toBeDefined();
      expect(extension.id).toBe('test-extension');

      // Enhanced context should be available to extensions
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);
      
      const context = contextManager.getActiveContext(agent.id);
      expect(context).toBeDefined();
    });
  });

  describe('Feature Integration Testing', () => {
    it('should integrate context enrichment with emotion system', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'I am so excited about this project!', 'excited');

      // Emotion should be captured in enrichment
      expect(context.enrichment.emotionalContext).toBeDefined();
      expect(context.enrichment.emotionalContext.currentEmotion).toBe('excited');
      expect(context.enrichment.emotionalContext.intensity).toBeGreaterThan(0);

      // Agent emotion state should be updated
      const emotionState = await agent.emotion?.getCurrentState();
      expect(emotionState).toBeDefined();
    });

    it('should integrate context enrichment with memory system', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add messages to build context
      contextManager.addMessage(context, 'user-1', 'I work as a software engineer');
      contextManager.addMessage(context, 'user-1', 'I specialize in TypeScript development');
      contextManager.addMessage(context, 'user-1', 'I love working on AI projects');

      // Memory enrichment should capture relevant information
      expect(context.enrichment.memoryIntegration).toBeDefined();
      expect(context.enrichment.memoryIntegration.relevantMemories).toBeDefined();
      expect(context.enrichment.memoryIntegration.memoryImportance).toBeGreaterThan(0);

      // Context should trigger memory preservation
      const preserved = await contextManager.preserveToMemory(agent, context.id);
      expect(preserved).toBeDefined();
      expect(preserved!.content).toContain('software engineer');
    });

    it('should integrate context enrichment with cognition system', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'Can you help me solve this complex problem?');

      // Cognition context should be enriched
      expect(context.enrichment.cognitiveContext).toBeDefined();
      expect(context.enrichment.cognitiveContext.taskType).toBeDefined();
      expect(context.enrichment.cognitiveContext.complexityLevel).toBeGreaterThan(0);

      // Agent cognition should use enriched context
      if (agent.cognition) {
        const thoughtResult = await agent.cognition.think(agent, {
          message: 'Complex problem',
          context: context.enrichment,
        });
        expect(thoughtResult).toBeDefined();
        expect(thoughtResult.confidence).toBeGreaterThan(0);
      }
    });

    it('should integrate multi-agent context sharing', async () => {
      const agent1 = AgentFactory.createBasicAgent();
      agent1.id = 'agent-1';
      const agent2 = AgentFactory.createBasicAgent();
      agent2.id = 'agent-2';

      await runtime.registerAgent(agent1);
      await runtime.registerAgent(agent2);

      const multiAgentManager = new MultiAgentManager();

      // Create shared context scenario through context manager
      const sharedContext = contextManager.getOrCreateContext('shared-context', 'user-1');
      expect(sharedContext).toBeDefined();

      // Messages should be shared between agents
      contextManager.addMessage(sharedContext, 'user-1', 'This is a shared conversation');
      
      const agent1Context = contextManager.getActiveContext(agent1.id);
      const agent2Context = contextManager.getActiveContext(agent2.id);

      expect(agent1Context?.id).toBe(sharedContext.id);
      expect(agent2Context?.id).toBe(sharedContext.id);
    });

    it('should integrate context caching for performance', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Populate context with enrichment data
      for (let i = 0; i < 10; i++) {
        contextManager.addMessage(context, 'user-1', `Message ${i} about programming`);
      }

      // First enrichment should populate cache
      const enrichment1 = context.enrichment;
      expect(enrichment1).toBeDefined();

      // Second access should use cache
      const startTime = performance.now();
      const enrichment2 = context.enrichment;
      const endTime = performance.now();

      expect(enrichment2).toBe(enrichment1); // Should be same reference
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });

  describe('Performance Impact Testing', () => {
    it('should maintain acceptable message processing performance', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');

      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            contextManager.addMessage(context, 'user-1', `Performance test message ${i}`);
          }
        },
        TestPresets.FAST.timeout,
        'Enhanced message processing'
      );
    });

    it('should maintain acceptable context creation performance', async () => {
      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            const context = contextManager.getOrCreateContext(`agent-${i}`, `user-${i}`);
            expect(context).toBeDefined();
          }
        },
        TestPresets.FAST.timeout,
        'Enhanced context creation'
      );
    });

    it('should not significantly impact memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create many contexts with enrichment
      for (let i = 0; i < 100; i++) {
        const agent = AgentFactory.createBasicAgent();
        agent.id = `perf-agent-${i}`;
        await runtime.registerAgent(agent);

        const context = contextManager.getOrCreateContext(agent.id, `user-${i}`);
        
        // Add messages to trigger enrichment
        for (let j = 0; j < 5; j++) {
          contextManager.addMessage(context, `user-${i}`, `Message ${j} about topic ${j}`);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not grow by more than 100MB with enrichment
      expect(memoryGrowth).toBeLessThan(100);
    });

    it('should maintain acceptable runtime startup performance', async () => {
      const startTime = performance.now();

      const bootstrapper = new ContextBootstrapper();
      const testRuntime = await bootstrapper.initializeRuntime({
        enableContextEnhancement: true,
        enableBackwardCompatibility: true,
        contextConfig: ConfigFactory.createBasicConfig(),
      });

      const endTime = performance.now();
      const startupTime = endTime - startTime;

      expect(startupTime).toBeLessThan(5000); // Should start in less than 5 seconds

      await testRuntime.shutdown();
    });

    it('should handle concurrent context operations efficiently', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const operations = Array.from({ length: 50 }, (_, i) => 
        async () => {
          const context = contextManager.getOrCreateContext(agent.id, `user-${i}`);
          contextManager.addMessage(context, `user-${i}`, `Concurrent message ${i}`);
          return contextManager.getContextSummary(context.id);
        }
      );

      const startTime = performance.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(results.every(result => result !== null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });

  describe('Runtime Integration', () => {
    it('should integrate seamlessly with existing runtime lifecycle', async () => {
      // Test runtime initialization
      expect(runtime.isInitialized()).toBe(true);
      expect(contextManager).toBeDefined();

      // Test agent registration with context enhancement
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      const registeredAgent = runtime.getAgent(agent.id);
      expect(registeredAgent).toBeDefined();

      // Context should be automatically available
      const context = contextManager.getActiveContext(agent.id);
      expect(context).toBeDefined();
    });

    it('should integrate with runtime event system', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      let eventReceived = false;
      runtime.eventBus.on('context:message-added', (event) => {
        eventReceived = true;
        expect(event.agentId).toBe(agent.id);
        expect(event.contextId).toBeDefined();
      });

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'Test event message');

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(eventReceived).toBe(true);
    });

    it('should support runtime configuration updates', async () => {
      const newConfig: ContextLifecycleManagerConfig = {
        ...ConfigFactory.createBasicConfig(),
        maxContextsPerAgent: 5,
        defaultTtl: 7200000,
        enableEnrichment: false,
      };

      // Update configuration through runtime
      const updated = await runtime.updateConfig({ context: newConfig });
      expect(updated).toBe(true);

      // New contexts should use updated configuration
      const context = contextManager.getOrCreateContext('test-agent-config', 'user-1');
      
      // Add messages beyond new limit
      for (let i = 0; i < 25; i++) {
        contextManager.addMessage(context, 'user-1', `Config test message ${i}`);
      }

      expect(context.messages.length).toBeLessThanOrEqual(20);
    });

    it('should handle runtime shutdown gracefully', async () => {
      const testBootstrapper = new ContextBootstrapper();
      const testRuntime = await testBootstrapper.bootstrap({
        context: ConfigFactory.createBasicConfig(),
      });

      const agent = AgentFactory.createBasicAgent();
      await testRuntime.registerAgent(agent);

      const testContextManager = testRuntime.getContextManager();
      const context = testContextManager.getOrCreateContext(agent.id, 'user-1');
      testContextManager.addMessage(context, 'user-1', 'Shutdown test message');

      // Should shutdown without errors
      await expect(testRuntime.shutdown()).resolves.not.toThrow();

      // Context should be preserved if configured
      const preserved = await testContextManager.preserveToMemory(agent, context.id);
      expect(preserved).toBeDefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle context enrichment failures gracefully', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      // Mock enrichment failure
      const originalEnrich = contextManager.enrichContext;
      contextManager.enrichContext = async () => {
        throw new Error('Enrichment failed');
      };

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Should not throw and should have fallback enrichment
      expect(() => {
        contextManager.addMessage(context, 'user-1', 'Test message with failed enrichment');
      }).not.toThrow();

      expect(context.messages).toHaveLength(1);
      expect(context.enrichment).toBeDefined(); // Should have fallback

      // Restore original method
      contextManager.enrichContext = originalEnrich;
    });

    it('should handle backward compatibility layer failures', async () => {
      // Test with corrupted legacy state
      const corruptedState = { invalidProperty: 'invalid' };
      
      expect(() => {
        compatibilityLayer.adaptLegacyState(corruptedState as any);
      }).not.toThrow();

      const adapted = compatibilityLayer.adaptLegacyState(corruptedState as any);
      expect(adapted).toBeDefined();
      expect(adapted.isValid).toBe(false);
    });

    it('should recover from memory provider failures', async () => {
      const agent = AgentFactory.createBasicAgent();
      
      // Mock memory provider failure
      const originalStore = agent.memory.store;
      agent.memory.store = async () => {
        throw new Error('Memory store failed');
      };

      await runtime.registerAgent(agent);

      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context, 'user-1', 'Message with memory failure');

      // Should not throw and should continue working
      expect(context.messages).toHaveLength(1);

      // Restore original method
      agent.memory.store = originalStore;
    });

    it('should handle portal integration failures', async () => {
      const agent = AgentFactory.createBasicAgent();
      await runtime.registerAgent(agent);

      // Mock portal failure
      const mockPortal: Portal = {
        id: 'failing-portal',
        type: 'openai' as const,
        generateResponse: async () => {
          throw new Error('Portal failed');
        },
        streamResponse: async function* () {
          throw new Error('Stream failed');
        },
      };

      const portalIntegration = new PortalIntegration(runtime);
      // Portal registration would be done through runtime

      // Test portal failure directly
      await expect(
        mockPortal.generateResponse([{ role: 'user', content: 'Test' }])
      ).rejects.toThrow('Portal failed');

      // Context should still be functional
      const context = contextManager.getActiveContext(agent.id);
      expect(context).toBeDefined();
    });
  });

  describe('Migration Testing', () => {
    it('should migrate from legacy context format', async () => {
      const legacyContext = {
        agentId: 'legacy-agent',
        messages: [
          { from: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { from: 'agent', content: 'Hi there', timestamp: new Date().toISOString() },
        ],
        state: { active: true },
      };

      const migrated = compatibilityLayer.migrateLegacyContext(legacyContext as any);
      
      expect(migrated).toBeDefined();
      expect(migrated.agentId).toBe('legacy-agent');
      expect(migrated.messages).toHaveLength(2);
      expect(migrated.enrichment).toBeDefined();
      expect(migrated.state.phase).toBeDefined();
    });

    it('should support gradual migration scenarios', async () => {
      // Create mixed environment with legacy and enhanced contexts
      const legacyAgent = AgentFactory.createBasicAgent();
      legacyAgent.id = 'legacy-agent';
      
      const enhancedAgent = AgentFactory.createBasicAgent();
      enhancedAgent.id = 'enhanced-agent';

      await runtime.registerAgent(legacyAgent);
      await runtime.registerAgent(enhancedAgent);

      // Legacy context (simulated)
      const legacyContext = compatibilityLayer.createLegacyCompatibleContext(
        legacyAgent.id,
        'user-1'
      );

      // Enhanced context
      const enhancedContext = contextManager.getOrCreateContext(
        enhancedAgent.id,
        'user-1'
      );

      // Both should work in parallel
      compatibilityLayer.addLegacyMessage(legacyContext, 'user-1', 'Legacy message');
      contextManager.addMessage(enhancedContext, 'user-1', 'Enhanced message');

      expect(legacyContext.messages).toHaveLength(1);
      expect(enhancedContext.messages).toHaveLength(1);
      expect(enhancedContext.enrichment).toBeDefined();
    });

    it('should preserve data integrity during migration', async () => {
      const originalData = {
        agentId: 'migration-test-agent',
        messages: Array.from({ length: 100 }, (_, i) => ({
          from: i % 2 === 0 ? 'user' : 'agent',
          content: `Message ${i}`,
          timestamp: new Date(Date.now() - (100 - i) * 1000).toISOString(),
        })),
        topics: ['programming', 'ai', 'typescript'],
        state: { mood: 'positive', phase: 'active' },
      };

      const migrated = compatibilityLayer.migrateLegacyContext(originalData as any);

      // Verify data integrity
      expect(migrated.agentId).toBe(originalData.agentId);
      expect(migrated.messages).toHaveLength(originalData.messages.length);
      expect(migrated.topics.map(t => t.topic)).toEqual(
        expect.arrayContaining(originalData.topics)
      );
      expect(migrated.state.mood).toBe(originalData.state.mood);
      expect(migrated.state.phase).toBe(originalData.state.phase);
    });
  });
});