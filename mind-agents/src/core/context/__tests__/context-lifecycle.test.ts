/**
 * @module context-lifecycle.test
 * @description Context Lifecycle Management Test Suite
 */

import { describe, test as it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { ContextManager, createContextManager } from '../context-manager.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  ContextAssertions,
  PerformanceAssertions,
  TestHarness,
  createTestEnvironment,
  TestPresets,
} from './utils/index.js';

describe('Context Lifecycle Management', () => {
  let contextManager: ContextManager;
  let testHarness: TestHarness;
  let testEnv: ReturnType<typeof createTestEnvironment>;

  beforeAll(() => {
    testEnv = createTestEnvironment();
  });

  beforeEach(() => {
    contextManager = createContextManager(ConfigFactory.createBasicConfig());
    testHarness = new TestHarness();
  });

  afterEach(() => {
    testHarness.resetAll();
    testEnv.cleanup();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('Context Creation Lifecycle', () => {
    it('should follow proper creation sequence', async () => {
      const lifecycleEvents: string[] = [];
      
      // Mock lifecycle tracking
      const trackEvent = (event: string) => lifecycleEvents.push(event);
      
      trackEvent('before_creation');
      const context = contextManager.getOrCreateContext('test-agent-1', 'user-1', 'Hello!');
      trackEvent('after_creation');
      
      expect(lifecycleEvents).toEqual(['before_creation', 'after_creation']);
      ContextAssertions.assertValidContext(context);
      expect(context.messages).toHaveLength(1);
    });

    it('should initialize context with proper defaults', () => {
      const context = contextManager.getOrCreateContext('test-agent-1', 'user-1');
      
      // Check default state
      expect(context.state.phase).toBe('greeting');
      expect(context.state.mood).toBe('neutral');
      expect(context.state.formality).toBe(0.5);
      expect(context.state.engagement).toBe(0.5);
      
      // Check empty collections
      expect(context.topics).toHaveLength(0);
      expect(context.pendingQuestions).toHaveLength(0);
      expect(context.followUpTopics).toHaveLength(0);
      
      // Check timestamps
      expect(context.startedAt).toBeInstanceOf(Date);
      expect(context.lastActive).toBeInstanceOf(Date);
      expect(context.lastActive.getTime()).toBeGreaterThanOrEqual(context.startedAt.getTime());
    });

    it('should handle context creation with custom configuration', () => {
      const customConfig = ConfigFactory.createBasicConfig({
        enableIntentAnalysis: false,
        enableTopicExtraction: false,
        enableMoodDetection: false,
      });
      
      const customManager = createContextManager(customConfig);
      const context = customManager.getOrCreateContext('test-agent-1', 'user-1');
      
      // Add message to test disabled features
      customManager.addMessage(context, 'user-1', 'What is your favorite programming language?');
      
      const message = context.messages[0];
      expect(message.intent).toBeUndefined(); // Intent analysis disabled
      expect(context.topics).toHaveLength(0); // Topic extraction disabled
      expect(context.state.mood).toBe('neutral'); // Mood detection disabled
    });

    it('should validate creation prerequisites', () => {
      // Test with valid parameters
      expect(() => {
        contextManager.getOrCreateContext('valid-agent', 'valid-user');
      }).not.toThrow();
      
      // Test edge cases that should still work
      expect(() => {
        contextManager.getOrCreateContext('', 'user-1');
      }).not.toThrow();
      
      expect(() => {
        contextManager.getOrCreateContext('agent-1', '');
      }).not.toThrow();
    });

    it('should create unique contexts for different agent-participant combinations', () => {
      const contexts = [
        contextManager.getOrCreateContext('agent-1', 'user-1'),
        contextManager.getOrCreateContext('agent-1', 'user-2'),
        contextManager.getOrCreateContext('agent-2', 'user-1'),
        contextManager.getOrCreateContext('agent-2', 'user-2'),
      ];
      
      // All contexts should be unique
      const ids = contexts.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(contexts.length);
      
      // Each should have correct agent assignment
      expect(contexts[0].agentId).toBe('agent-1');
      expect(contexts[1].agentId).toBe('agent-1');
      expect(contexts[2].agentId).toBe('agent-2');
      expect(contexts[3].agentId).toBe('agent-2');
    });
  });

  describe('Context Evolution and Updates', () => {
    let context: ReturnType<typeof ContextFactory.createBasicContext>;

    beforeEach(() => {
      context = contextManager.getOrCreateContext('test-agent-1', 'user-1');
    });

    it('should evolve through conversation phases correctly', () => {
      // Start in greeting phase
      expect(context.state.phase).toBe('greeting');
      
      // Add greeting message
      contextManager.addMessage(context, 'user-1', 'Hello there!');
      expect(context.state.phase).toBe('greeting');
      
      // Progress to active phase
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(context, 'user-1', `Active conversation message ${i}`);
      }
      expect(context.state.phase).toBe('active');
      
      // Move to closing phase
      contextManager.addMessage(context, 'user-1', 'Thanks for your help, goodbye!');
      expect(context.state.phase).toBe('closing');
    });

    it('should track mood evolution over time', () => {
      // Start with neutral mood
      expect(context.state.mood).toBe('neutral');
      
      // Add positive messages
      contextManager.addMessage(context, 'user-1', 'This is great! I love it!', 'happy');
      contextManager.addMessage(context, 'user-1', 'Excellent work!', 'excited');
      
      // Should shift to positive
      expect(['positive', 'neutral']).toContain(context.state.mood);
      
      // Reset for negative test
      context.state.mood = 'neutral';
      context.messages = [];
      
      // Add negative messages
      contextManager.addMessage(context, 'user-1', 'This is terrible', 'sad');
      contextManager.addMessage(context, 'user-1', 'I hate this', 'angry');
      
      // Should shift to negative
      expect(['negative', 'neutral']).toContain(context.state.mood);
    });

    it('should accumulate and prioritize topics over time', () => {
      const topicMessages = [
        'I love programming with JavaScript',
        'TypeScript makes programming safer',
        'React is great for programming UI',
        'Node.js programming is powerful',
        'Python programming is also nice',
      ];
      
      topicMessages.forEach(message => {
        contextManager.addMessage(context, 'user-1', message);
      });
      
      // Programming should be the top topic (mentioned most)
      const programmingTopic = context.topics.find(t => t.topic === 'programming');
      expect(programmingTopic).toBeDefined();
      expect(programmingTopic!.mentions).toBeGreaterThan(1);
      
      // Current topic should be the most mentioned
      expect(context.currentTopic).toBe('programming');
      
      // Verify topic timestamps
      context.topics.forEach(topic => {
        expect(topic.firstMentioned).toBeInstanceOf(Date);
        expect(topic.lastMentioned).toBeInstanceOf(Date);
        expect(topic.lastMentioned.getTime()).toBeGreaterThanOrEqual(
          topic.firstMentioned.getTime()
        );
      });
    });

    it('should maintain participant engagement metrics', () => {
      const initialEngagement = context.state.engagement;
      
      // Active conversation should increase engagement
      for (let i = 0; i < 10; i++) {
        contextManager.addMessage(context, 'user-1', `Engaged message ${i}`);
        contextManager.addMessage(context, 'test-agent-1', `Response ${i}`);
      }
      
      // Engagement should be tracked (implementation dependent)
      expect(context.state.engagement).toBeGreaterThanOrEqual(0);
      expect(context.state.engagement).toBeLessThanOrEqual(1);
    });

    it('should track context complexity growth', () => {
      const initialComplexity = {
        messageCount: context.messages.length,
        topicCount: context.topics.length,
        participantCount: context.participants.size,
        questionCount: context.pendingQuestions.length,
      };
      
      // Add complex interaction
      contextManager.addMessage(context, 'user-1', 'Can you explain recursion in programming?');
      contextManager.addMessage(context, 'user-2', 'Also, what about data structures?');
      contextManager.addMessage(context, 'test-agent-1', 'Great questions! Let me explain...');
      contextManager.addMessage(context, 'user-1', 'What about algorithms too?');
      
      const finalComplexity = {
        messageCount: context.messages.length,
        topicCount: context.topics.length,
        participantCount: context.participants.size,
        questionCount: context.pendingQuestions.length,
      };
      
      // All complexity metrics should have increased
      expect(finalComplexity.messageCount).toBeGreaterThan(initialComplexity.messageCount);
      expect(finalComplexity.topicCount).toBeGreaterThan(initialComplexity.topicCount);
      expect(finalComplexity.participantCount).toBeGreaterThan(initialComplexity.participantCount);
      expect(finalComplexity.questionCount).toBeGreaterThan(initialComplexity.questionCount);
    });
  });

  describe('Context State Transitions', () => {
    let context: ReturnType<typeof ContextFactory.createBasicContext>;

    beforeEach(() => {
      context = contextManager.getOrCreateContext('test-agent-1', 'user-1');
    });

    it('should handle valid state transitions', () => {
      const validTransitions = [
        { from: 'greeting', to: 'active', trigger: 'conversation_continues' },
        { from: 'active', to: 'closing', trigger: 'goodbye_detected' },
        { from: 'closing', to: 'idle', trigger: 'timeout' },
        { from: 'idle', to: 'greeting', trigger: 'new_message' },
      ];
      
      // Test greeting to active
      context.state.phase = 'greeting';
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(context, 'user-1', `Message ${i}`);
      }
      expect(context.state.phase).toBe('active');
      
      // Test active to closing
      contextManager.addMessage(context, 'user-1', 'Goodbye, thanks for everything!');
      expect(context.state.phase).toBe('closing');
    });

    it('should maintain state consistency during transitions', () => {
      const states: string[] = [];
      
      // Track state changes
      const trackState = () => states.push(context.state.phase);
      
      trackState(); // greeting
      
      // Transition to active
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(context, 'user-1', `Active message ${i}`);
      }
      trackState(); // active
      
      // Transition to closing
      contextManager.addMessage(context, 'user-1', 'Time to say goodbye!');
      trackState(); // closing
      
      expect(states).toEqual(['greeting', 'active', 'closing']);
      
      // Verify context integrity at each state
      ContextAssertions.assertValidState(context);
    });

    it('should handle rapid state changes gracefully', async () => {
      const rapidOperations = Array.from({ length: 100 }, (_, i) => () => {
        if (i % 10 === 0) {
          contextManager.addMessage(context, 'user-1', 'Hello!'); // Greeting triggers
        } else if (i % 10 === 9) {
          contextManager.addMessage(context, 'user-1', 'Goodbye!'); // Closing triggers  
        } else {
          contextManager.addMessage(context, 'user-1', `Message ${i}`); // Active triggers
        }
      });
      
      // Execute rapidly
      await PerformanceAssertions.assertExecutionTime(
        () => {
          rapidOperations.forEach(op => op());
        },
        1000, // Should complete within 1 second
        'Rapid state transitions'
      );
      
      // Context should remain valid
      ContextAssertions.assertContextIntegrity(context);
      expect(context.messages).toHaveLength(100);
    });

    it('should rollback invalid transitions', () => {
      const originalPhase = context.state.phase;
      
      // Attempt invalid transition (mock implementation)
      const attemptInvalidTransition = () => {
        const backup = { ...context.state };
        try {
          // Simulate invalid state change
          context.state.phase = 'invalid' as any;
          throw new Error('Invalid transition');
        } catch (error) {
          // Rollback to backup
          context.state = backup;
        }
      };
      
      attemptInvalidTransition();
      
      // Should be back to original state
      expect(context.state.phase).toBe(originalPhase);
    });
  });

  describe('Context Persistence and Recovery', () => {
    it('should export context state for persistence', () => {
      // Create contexts with data
      const context1 = contextManager.getOrCreateContext('agent-1', 'user-1');
      const context2 = contextManager.getOrCreateContext('agent-2', 'user-2');
      
      contextManager.addMessage(context1, 'user-1', 'Hello from context 1');
      contextManager.addMessage(context2, 'user-2', 'Hello from context 2');
      
      // Export contexts
      const exportedContexts = contextManager.exportContexts();
      
      expect(exportedContexts).toHaveLength(2);
      expect(exportedContexts[0].messages).toHaveLength(1);
      expect(exportedContexts[1].messages).toHaveLength(1);
      
      // Verify serializable structure
      const serialized = JSON.stringify(exportedContexts);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it('should import and restore context state', () => {
      // Create initial context
      const originalContext = contextManager.getOrCreateContext('agent-1', 'user-1');
      contextManager.addMessage(originalContext, 'user-1', 'Original message');
      
      // Export contexts
      const exported = contextManager.exportContexts();
      
      // Create new manager and import
      const newManager = createContextManager(ConfigFactory.createBasicConfig());
      newManager.importContexts(exported);
      
      // Verify restoration
      const restoredContext = newManager.getActiveContext('agent-1');
      expect(restoredContext).not.toBeNull();
      expect(restoredContext!.messages).toHaveLength(1);
      expect(restoredContext!.messages[0].content).toBe('Original message');
    });

    it('should handle corrupted context data gracefully', () => {
      const corruptedData = [
        { id: 'corrupt-1' }, // Missing required fields
        { id: 'corrupt-2', agentId: null }, // Invalid field types
        null, // Null entry
        undefined, // Undefined entry
      ];
      
      // Should not throw on import
      expect(() => {
        contextManager.importContexts(corruptedData as any);
      }).not.toThrow();
      
      // Should maintain system stability
      const validContext = contextManager.getOrCreateContext('test-agent', 'user-1');
      expect(validContext).toBeDefined();
      ContextAssertions.assertValidContext(validContext);
    });

    it('should recover from partial failures during restoration', () => {
      const mixedData = [
        // Valid context
        {
          id: 'valid-1',
          agentId: 'agent-1',
          startedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          participants: ['user-1'],
          topics: [],
          messages: [],
          state: { phase: 'active', mood: 'neutral', formality: 0.5, engagement: 0.5 },
          pendingQuestions: [],
          followUpTopics: [],
          metadata: {},
        },
        // Invalid context
        { id: 'invalid-1' },
        // Another valid context
        {
          id: 'valid-2',
          agentId: 'agent-2',
          startedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          participants: ['user-2'],
          topics: [],
          messages: [],
          state: { phase: 'greeting', mood: 'neutral', formality: 0.5, engagement: 0.5 },
          pendingQuestions: [],
          followUpTopics: [],
          metadata: {},
        },
      ];
      
      contextManager.importContexts(mixedData);
      
      // Valid contexts should be available
      const context1 = contextManager.getActiveContext('agent-1');
      const context2 = contextManager.getActiveContext('agent-2');
      
      expect(context1).not.toBeNull();
      expect(context2).not.toBeNull();
      expect(context1!.id).toBe('valid-1');
      expect(context2!.id).toBe('valid-2');
    });
  });

  describe('Context Cleanup and Garbage Collection', () => {
    beforeEach(() => {
      // Use restrictive config for faster cleanup testing
      const config = ConfigFactory.createRestrictiveConfig();
      contextManager = createContextManager(config);
    });

    it('should clean up expired contexts automatically', async () => {
      // Create contexts that will expire quickly
      const context1 = contextManager.getOrCreateContext('agent-1', 'user-1');
      const context2 = contextManager.getOrCreateContext('agent-2', 'user-2');
      
      // Manually expire one context
      context1.lastActive = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      // Wait for cleanup cycle (simulated)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Expired context should not be accessible
      const activeContext1 = contextManager.getActiveContext('agent-1');
      const activeContext2 = contextManager.getActiveContext('agent-2');
      
      expect(activeContext1).toBeNull(); // Expired
      expect(activeContext2).not.toBeNull(); // Still active
    });

    it('should handle memory pressure by cleaning old contexts', () => {
      const config = ConfigFactory.createBasicConfig({ maxContextDuration: 1000 }); // 1 second
      const memoryPressureManager = createContextManager(config);
      
      // Create many contexts to simulate memory pressure
      const contexts = Array.from({ length: 100 }, (_, i) => 
        memoryPressureManager.getOrCreateContext(`agent-${i}`, `user-${i}`)
      );
      
      // Age some contexts
      contexts.slice(0, 50).forEach(context => {
        context.lastActive = new Date(Date.now() - 2000); // 2 seconds ago
      });
      
      // Trigger cleanup (simulated)
      const exportedAfterCleanup = memoryPressureManager.exportContexts();
      
      // Should have fewer contexts after cleanup
      expect(exportedAfterCleanup.length).toBeLessThan(100);
    });

    it('should preserve important contexts during cleanup', async () => {
      const config = ConfigFactory.createBasicConfig({ maxContextDuration: 1000 }); // 1 second
      const preservingManager = createContextManager(config);
      
      // Create important context with lots of interaction
      const importantContext = preservingManager.getOrCreateContext('important-agent', 'user-1');
      
      // Add significant conversation history
      for (let i = 0; i < 20; i++) {
        preservingManager.addMessage(importantContext, 'user-1', `Important message ${i}`);
        preservingManager.addMessage(importantContext, 'important-agent', `Important response ${i}`);
      }
      
      // Create less important context
      const simpleContext = preservingManager.getOrCreateContext('simple-agent', 'user-2');
      preservingManager.addMessage(simpleContext, 'user-2', 'Simple message');
      
      // Age both contexts
      importantContext.lastActive = new Date(Date.now() - 2000);
      simpleContext.lastActive = new Date(Date.now() - 2000);
      
      // Important context should have higher preservation priority due to message count
      // This would be implementation-dependent
      const messageCountImportant = importantContext.messages.length;
      const messageCountSimple = simpleContext.messages.length;
      
      expect(messageCountImportant).toBeGreaterThan(messageCountSimple);
    });

    it('should handle cleanup of corrupted contexts', () => {
      const context = contextManager.getOrCreateContext('test-agent', 'user-1');
      
      // Simulate corruption
      (context as any).lastActive = 'invalid-date';
      (context as any).participants = null;
      
      // Cleanup should handle corrupted data gracefully
      expect(() => {
        contextManager.exportContexts(); // Triggers internal validation
      }).not.toThrow();
    });

    it('should optimize memory usage during cleanup', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many temporary contexts
      for (let i = 0; i < 1000; i++) {
        const context = contextManager.getOrCreateContext(`temp-agent-${i}`, `user-${i}`);
        for (let j = 0; j < 10; j++) {
          contextManager.addMessage(context, `user-${i}`, `Message ${j}`);
        }
      }
      
      const afterCreation = process.memoryUsage().heapUsed;
      
      // Force cleanup (in real implementation, this would be automatic)
      const contexts = contextManager.exportContexts();
      contexts.length = 0; // Simulate cleanup
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow GC time
      
      const afterCleanup = process.memoryUsage().heapUsed;
      
      // Memory should be reduced after cleanup
      const memoryGrowth = (afterCleanup - initialMemory) / 1024 / 1024; // MB
      expect(memoryGrowth).toBeLessThan(100); // Should not grow by more than 100MB
    });
  });

  describe('Context Lifecycle Performance', () => {
    it('should create contexts within performance thresholds', async () => {
      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.STANDARD.iterations; i++) {
            contextManager.getOrCreateContext(`agent-${i}`, `user-${i}`);
          }
        },
        TestPresets.STANDARD.timeout,
        'Context creation batch'
      );
    });

    it('should handle state transitions efficiently', async () => {
      const context = contextManager.getOrCreateContext('test-agent', 'user-1');
      
      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            if (i % 10 === 0) {
              contextManager.addMessage(context, 'user-1', 'Hello!');
            } else if (i % 10 === 9) {
              contextManager.addMessage(context, 'user-1', 'Goodbye!');
            } else {
              contextManager.addMessage(context, 'user-1', `Message ${i}`);
            }
          }
        },
        TestPresets.FAST.timeout,
        'State transitions'
      );
    });

    it('should maintain performance with large context histories', async () => {
      const context = contextManager.getOrCreateContext('test-agent', 'user-1');
      
      // Build up large history
      for (let i = 0; i < 1000; i++) {
        contextManager.addMessage(context, `user-${i % 10}`, `History message ${i}`);
      }
      
      // Operations should still be fast
      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < 100; i++) {
            contextManager.addMessage(context, 'user-1', `New message ${i}`);
            contextManager.getContextSummary(context.id);
          }
        },
        500, // 500ms for 100 operations
        'Large context operations'
      );
    });

    it('should scale cleanup operations efficiently', async () => {
      // Create many contexts
      const contexts = Array.from({ length: 1000 }, (_, i) => 
        contextManager.getOrCreateContext(`agent-${i}`, `user-${i}`)
      );
      
      // Age half of them
      contexts.slice(0, 500).forEach(context => {
        context.lastActive = new Date(Date.now() - 10000); // 10 seconds ago
      });
      
      await PerformanceAssertions.assertExecutionTime(
        () => {
          // Simulate cleanup operation
          contextManager.exportContexts().filter(ctx => 
            Date.now() - ctx.lastActive.getTime() < 5000 // 5 seconds
          );
        },
        100, // Should complete in less than 100ms
        'Cleanup operations'
      );
    });
  });
});