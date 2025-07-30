/**
 * @module unified-context.test
 * @description Unified Context System Test Suite - Core functionality tests
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
  ContextManager,
  createContextManager,
  type ContextManagerConfig,
} from '../context-manager.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  ContextAssertions,
  PerformanceAssertions,
  createTestEnvironment,
  TestPresets,
} from './utils/index.js';

describe('Unified Context System', () => {
  let contextManager: ContextManager;
  let testEnv: ReturnType<typeof createTestEnvironment>;

  beforeAll(() => {
    testEnv = createTestEnvironment();
  });

  beforeEach(() => {
    contextManager = createContextManager(ConfigFactory.createBasicConfig());
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  describe('Context Creation and Validation', () => {
    it('should create a new context with valid structure', () => {
      const agentId = 'test-agent-1';
      const participantId = 'user-1';
      const initialMessage = 'Hello, world!';

      const context = contextManager.getOrCreateContext(
        agentId,
        participantId,
        initialMessage
      );

      // Validate context structure
      ContextAssertions.assertValidContext(context);
      expect(context.agentId).toBe(agentId);
      expect(context.participants.has(participantId)).toBe(true);
      expect(context.primaryParticipant).toBe(participantId);
      expect(context.messages).toHaveLength(1);
      expect(context.messages[0].content).toBe(initialMessage);
    });

    it('should return existing context for same agent-participant pair', () => {
      const agentId = 'test-agent-1';
      const participantId = 'user-1';

      const context1 = contextManager.getOrCreateContext(
        agentId,
        participantId
      );
      const context2 = contextManager.getOrCreateContext(
        agentId,
        participantId
      );

      expect(context1).toBe(context2);
      expect(context1.id).toBe(context2.id);
    });

    it('should create different contexts for different agents', () => {
      const participantId = 'user-1';

      const context1 = contextManager.getOrCreateContext(
        'agent-1',
        participantId
      );
      const context2 = contextManager.getOrCreateContext(
        'agent-2',
        participantId
      );

      expect(context1).not.toBe(context2);
      expect(context1.id).not.toBe(context2.id);
      expect(context1.agentId).not.toBe(context2.agentId);
    });

    it('should handle multiple participants in single context', () => {
      const agentId = 'test-agent-1';
      const participants = ['user-1', 'user-2', 'user-3'];

      // Create context with first participant
      const context = contextManager.getOrCreateContext(
        agentId,
        participants[0]
      );

      // Add more participants
      for (let i = 1; i < participants.length; i++) {
        contextManager.getOrCreateContext(agentId, participants[i]);
      }

      expect(context.participants.size).toBe(participants.length);
      participants.forEach((p) => {
        expect(context.participants.has(p)).toBe(true);
      });
    });

    it('should validate context state integrity', () => {
      const context = ContextFactory.createBasicContext();

      ContextAssertions.assertContextIntegrity(context);
      ContextAssertions.assertValidState(context);
      ContextAssertions.assertParticipantManagement(context);
    });
  });

  describe('Message Processing', () => {
    let context: ReturnType<typeof ContextFactory.createBasicContext>;

    beforeEach(() => {
      context = contextManager.getOrCreateContext('test-agent-1', 'user-1');
    });

    it('should add messages with proper structure', () => {
      const from = 'user-1';
      const content = 'Hello, how are you?';
      const emotion = 'happy';

      contextManager.addMessage(context, from, content, emotion);

      expect(context.messages).toHaveLength(1);
      const message = context.messages[0];
      expect(message.from).toBe(from);
      expect(message.content).toBe(content);
      expect(message.emotion).toBe(emotion);
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.intent).toBe('question');
    });

    it('should detect message intents correctly', () => {
      const testCases = [
        { content: 'What is your name?', expectedIntent: 'question' },
        { content: 'Please help me with this.', expectedIntent: 'request' },
        { content: 'Thank you so much!', expectedIntent: 'gratitude' },
        { content: 'I am sorry about that.', expectedIntent: 'apology' },
        { content: 'This is amazing!', expectedIntent: 'exclamation' },
        { content: 'I think this is correct.', expectedIntent: 'opinion' },
        { content: 'I feel happy today.', expectedIntent: 'emotion' },
        { content: 'The weather is nice.', expectedIntent: 'statement' },
      ];

      testCases.forEach(({ content, expectedIntent }) => {
        contextManager.addMessage(context, 'user-1', content);
        const lastMessage = context.messages[context.messages.length - 1];
        expect(lastMessage.intent).toBe(expectedIntent);
      });
    });

    it('should limit message history according to configuration', () => {
      const config = ConfigFactory.createBasicConfig({ maxMessageHistory: 5 });
      const limitedContext = createContextManager(config);
      const context = limitedContext.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      // Add more messages than the limit
      for (let i = 0; i < 10; i++) {
        limitedContext.addMessage(context, 'user-1', `Message ${i}`);
      }

      expect(context.messages).toHaveLength(5);
      expect(context.messages[0].content).toBe('Message 5');
      expect(context.messages[4].content).toBe('Message 9');
    });

    it('should update last active timestamp on message addition', () => {
      const initialTime = context.lastActive;

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      contextManager.addMessage(context, 'user-1', 'New message');

      expect(context.lastActive.getTime()).toBeGreaterThan(
        initialTime.getTime()
      );
    });

    it('should extract and track topics from messages', () => {
      const messagesWithTopics = [
        'I love programming in JavaScript',
        'TypeScript makes development easier',
        'React is a great framework for programming',
        'Database design is important for programming',
      ];

      messagesWithTopics.forEach((message) => {
        contextManager.addMessage(context, 'user-1', message);
      });

      expect(context.topics).toContain(
        expect.objectContaining({ topic: 'programming' })
      );
      expect(context.topics).toContain(
        expect.objectContaining({ topic: 'typescript' })
      );

      // Programming should have the highest mentions
      const programmingTopic = context.topics.find(
        (t) => t.topic === 'programming'
      );
      expect(programmingTopic?.mentions).toBeGreaterThan(1);
    });

    it('should track pending questions', () => {
      const questions = [
        'What is your favorite color?',
        'How do you handle errors?',
        'Can you explain recursion?',
      ];

      questions.forEach((question) => {
        contextManager.addMessage(context, 'user-1', question);
      });

      expect(context.pendingQuestions).toHaveLength(questions.length);
      questions.forEach((question, index) => {
        expect(context.pendingQuestions[index].question).toBe(question);
        expect(context.pendingQuestions[index].askedBy).toBe('user-1');
      });
    });

    it('should update conversation mood based on emotions', () => {
      // Add positive emotion messages
      contextManager.addMessage(context, 'user-1', 'This is great!', 'happy');
      contextManager.addMessage(
        context,
        'user-1',
        'Excellent work!',
        'excited'
      );

      expect(['positive', 'neutral']).toContain(context.state.mood);

      // Reset context for negative test
      context.messages = [];
      context.state.mood = 'neutral';

      // Add negative emotion messages
      contextManager.addMessage(context, 'user-1', 'This is terrible.', 'sad');
      contextManager.addMessage(context, 'user-1', 'I am frustrated.', 'angry');

      expect(['negative', 'neutral']).toContain(context.state.mood);
    });

    it('should update conversation phase based on content', () => {
      // Test greeting phase
      contextManager.addMessage(context, 'user-1', 'Hello there!');
      expect(context.state.phase).toBe('greeting');

      // Test active phase
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(context, 'user-1', `Regular message ${i}`);
      }
      expect(context.state.phase).toBe('active');

      // Test closing phase
      contextManager.addMessage(context, 'user-1', 'Goodbye, see you later!');
      expect(context.state.phase).toBe('closing');
    });
  });

  describe('Context Querying and Summaries', () => {
    let context: ReturnType<typeof ContextFactory.createBasicContext>;

    beforeEach(() => {
      context = contextManager.getOrCreateContext('test-agent-1', 'user-1');

      // Add some test data
      contextManager.addMessage(context, 'user-1', 'I love programming!');
      contextManager.addMessage(
        context,
        'test-agent-1',
        "That's great to hear!"
      );
      contextManager.addMessage(
        context,
        'user-1',
        'Can you help with JavaScript?'
      );
    });

    it('should generate accurate context summaries', () => {
      const summary = contextManager.getContextSummary(context.id);

      expect(summary).not.toBeNull();
      expect(summary!.participants).toContain('user-1');
      expect(summary!.mood).toBe(context.state.mood);
      expect(summary!.phase).toBe(context.state.phase);
      expect(summary!.recentMessages).toHaveLength(3);
      expect(summary!.pendingQuestions).toContain(
        'Can you help with JavaScript?'
      );
    });

    it('should return null for non-existent context summary', () => {
      const summary = contextManager.getContextSummary('non-existent-id');
      expect(summary).toBeNull();
    });

    it('should get active context for agent', () => {
      const activeContext = contextManager.getActiveContext('test-agent-1');

      expect(activeContext).not.toBeNull();
      expect(activeContext!.id).toBe(context.id);
    });

    it('should return null for agent with no active context', () => {
      const activeContext =
        contextManager.getActiveContext('non-existent-agent');
      expect(activeContext).toBeNull();
    });
  });

  describe('Context Lifecycle Management', () => {
    it('should switch between contexts for an agent', () => {
      const agentId = 'test-agent-1';

      // Create two contexts
      const context1 = contextManager.getOrCreateContext(agentId, 'user-1');
      const context2 = contextManager.getOrCreateContext(agentId, 'user-2');

      // Initially, the second context should be active
      expect(contextManager.getActiveContext(agentId)?.id).toBe(context2.id);

      // Switch back to first context
      const switched = contextManager.switchContext(agentId, context1.id);
      expect(switched).toBe(true);
      expect(contextManager.getActiveContext(agentId)?.id).toBe(context1.id);
    });

    it('should fail to switch to non-existent context', () => {
      const agentId = 'test-agent-1';
      const switched = contextManager.switchContext(
        agentId,
        'non-existent-context'
      );
      expect(switched).toBe(false);
    });

    it('should fail to switch to context belonging to different agent', () => {
      const context1 = contextManager.getOrCreateContext('agent-1', 'user-1');
      const switched = contextManager.switchContext('agent-2', context1.id);
      expect(switched).toBe(false);
    });

    it('should merge contexts successfully', () => {
      const agentId = 'test-agent-1';

      // Create two contexts with different data
      const primary = contextManager.getOrCreateContext(agentId, 'user-1');
      contextManager.addMessage(primary, 'user-1', 'Primary message');

      const secondary = contextManager.getOrCreateContext(agentId, 'user-2');
      contextManager.addMessage(secondary, 'user-2', 'Secondary message');

      // Merge contexts
      const merged = contextManager.mergeContexts(primary.id, secondary.id);

      expect(merged).not.toBeNull();
      expect(merged!.id).toBe(primary.id);
      expect(merged!.participants.has('user-1')).toBe(true);
      expect(merged!.participants.has('user-2')).toBe(true);
      expect(merged!.messages).toHaveLength(2);

      // Secondary context should be removed
      expect(contextManager.getActiveContext(agentId)?.id).toBe(primary.id);
    });

    it('should handle context expiration and cleanup', () => {
      const config = ConfigFactory.createRestrictiveConfig(); // 1 minute duration
      const expiringManager = createContextManager(config);

      const context = expiringManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );
      const contextId = context.id;

      // Manually set context as expired
      context.lastActive = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      // Try to get active context - should return null due to expiration
      const activeContext = expiringManager.getActiveContext('test-agent-1');
      expect(activeContext).toBeNull();
    });
  });

  describe('Memory Integration', () => {
    let agent: ReturnType<typeof AgentFactory.createBasicAgent>;
    let context: ReturnType<typeof ContextFactory.createBasicContext>;

    beforeEach(() => {
      agent = AgentFactory.createBasicAgent();
      context = contextManager.getOrCreateContext(agent.id, 'user-1');

      // Add some conversation data
      contextManager.addMessage(context, 'user-1', 'I love programming!');
      contextManager.addMessage(context, agent.id, "That's wonderful!");
      contextManager.addMessage(
        context,
        'user-1',
        'Can you teach me JavaScript?'
      );
    });

    it('should preserve context to memory when conditions are met', async () => {
      const memory = await contextManager.preserveToMemory(agent, context.id);

      expect(memory).not.toBeNull();
      expect(memory!.agentId).toBe(agent.id);
      expect(memory!.type).toBe('interaction');
      expect(memory!.content).toContain('Conversation with user-1');
      expect(memory!.metadata).toMatchObject({
        contextId: context.id,
        participants: ['user-1'],
        messageCount: 3,
        mood: context.state.mood,
      });
    });

    it('should not preserve context to memory when disabled', async () => {
      const config = ConfigFactory.createBasicConfig({
        persistToMemory: false,
      });
      const nonPersistingManager = createContextManager(config);
      const testContext = nonPersistingManager.getOrCreateContext(
        agent.id,
        'user-1'
      );

      const memory = await nonPersistingManager.preserveToMemory(
        agent,
        testContext.id
      );
      expect(memory).toBeNull();
    });

    it('should not preserve context to memory when importance is too low', async () => {
      const config = ConfigFactory.createBasicConfig({ memoryImportance: 0.9 }); // Very high threshold
      const selectiveManager = createContextManager(config);
      const lowImportanceContext = selectiveManager.getOrCreateContext(
        agent.id,
        'user-1'
      );

      // Add minimal interaction
      selectiveManager.addMessage(lowImportanceContext, 'user-1', 'Hi');

      const memory = await selectiveManager.preserveToMemory(
        agent,
        lowImportanceContext.id
      );
      expect(memory).toBeNull();
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect maxTopics configuration', () => {
      const config = ConfigFactory.createBasicConfig({ maxTopics: 3 });
      const limitedManager = createContextManager(config);
      const context = limitedManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      // Add messages with many different topics
      const topics = [
        'programming',
        'javascript',
        'typescript',
        'react',
        'nodejs',
      ];
      topics.forEach((topic) => {
        limitedManager.addMessage(
          context,
          'user-1',
          `I love ${topic} development`
        );
      });

      expect(context.topics.length).toBeLessThanOrEqual(3);
    });

    it('should work with analysis features disabled', () => {
      const config = ConfigFactory.createDisabledAnalysisConfig();
      const basicManager = createContextManager(config);
      const context = basicManager.getOrCreateContext('test-agent-1', 'user-1');

      basicManager.addMessage(
        context,
        'user-1',
        'What is your favorite programming language?'
      );

      const message = context.messages[0];
      expect(message.intent).toBeUndefined();
      expect(context.topics).toHaveLength(0);
      expect(context.state.mood).toBe('neutral'); // Should remain unchanged
    });

    it('should handle permissive configuration correctly', () => {
      const config = ConfigFactory.createPermissiveConfig();
      const permissiveManager = createContextManager(config);

      expect(config.maxContextDuration).toBe(86400000); // 24 hours
      expect(config.maxMessageHistory).toBe(1000);
      expect(config.allowMultipleContexts).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should create contexts quickly', async () => {
      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            contextManager.getOrCreateContext(`agent-${i}`, `user-${i}`);
          }
        },
        TestPresets.FAST.timeout,
        'Context creation'
      );
    });

    it('should process messages efficiently', async () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            contextManager.addMessage(context, 'user-1', `Message ${i}`);
          }
        },
        TestPresets.FAST.timeout,
        'Message processing'
      );
    });

    it('should retrieve context summaries quickly', async () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      // Add some data first
      for (let i = 0; i < 10; i++) {
        contextManager.addMessage(context, 'user-1', `Message ${i}`);
      }

      await PerformanceAssertions.assertExecutionTime(
        () => {
          for (let i = 0; i < TestPresets.FAST.iterations; i++) {
            contextManager.getContextSummary(context.id);
          }
        },
        TestPresets.FAST.timeout,
        'Context summary retrieval'
      );
    });

    it('should handle large message histories efficiently', async () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      // Add a large number of messages
      for (let i = 0; i < 1000; i++) {
        contextManager.addMessage(
          context,
          `user-${i % 10}`,
          `This is message ${i} about topic ${i % 20}`
        );
      }

      // Operations should still be fast
      await PerformanceAssertions.assertExecutionTime(
        () => {
          contextManager.getContextSummary(context.id);
          contextManager.addMessage(context, 'new-user', 'New message');
        },
        100, // Should complete in less than 100ms
        'Large context operations'
      );
    });

    it('should not have memory leaks with many contexts', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and use many contexts
      for (let i = 0; i < 1000; i++) {
        const context = contextManager.getOrCreateContext(
          `agent-${i}`,
          `user-${i}`
        );
        for (let j = 0; j < 10; j++) {
          contextManager.addMessage(context, `user-${i}`, `Message ${j}`);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not grow by more than 50MB
      expect(memoryGrowth).toBeLessThan(50);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty messages gracefully', () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );

      expect(() => {
        contextManager.addMessage(context, 'user-1', '');
      }).not.toThrow();

      expect(context.messages).toHaveLength(1);
      expect(context.messages[0].content).toBe('');
    });

    it('should handle extremely long messages', () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );
      const longMessage = 'A'.repeat(10000); // 10KB message

      expect(() => {
        contextManager.addMessage(context, 'user-1', longMessage);
      }).not.toThrow();

      expect(context.messages[0].content).toBe(longMessage);
    });

    it('should handle special characters in messages', () => {
      const context = contextManager.getOrCreateContext(
        'test-agent-1',
        'user-1'
      );
      const specialMessage =
        '🚀 Hello! @user #hashtag $symbol 100% "quoted" <xml> [array]';

      contextManager.addMessage(context, 'user-1', specialMessage);

      expect(context.messages[0].content).toBe(specialMessage);
    });

    it('should handle concurrent access safely', async () => {
      const agentId = 'test-agent-1';
      const participantId = 'user-1';

      const operations = Array.from({ length: 50 }, (_, i) => () => {
        const context = contextManager.getOrCreateContext(
          agentId,
          participantId
        );
        contextManager.addMessage(
          context,
          participantId,
          `Concurrent message ${i}`
        );
        return contextManager.getContextSummary(context.id);
      });

      // All operations should complete without errors
      const results = await Promise.all(operations.map((op) => op()));

      expect(results).toHaveLength(50);
      expect(results.every((result) => result !== null)).toBe(true);
    });

    it('should handle invalid agent IDs gracefully', () => {
      expect(() => {
        contextManager.getOrCreateContext('', 'user-1');
      }).not.toThrow();

      expect(() => {
        contextManager.getOrCreateContext('   ', 'user-1');
      }).not.toThrow();
    });

    it('should handle invalid participant IDs gracefully', () => {
      expect(() => {
        contextManager.getOrCreateContext('agent-1', '');
      }).not.toThrow();

      expect(() => {
        contextManager.getOrCreateContext('agent-1', '   ');
      }).not.toThrow();
    });
  });
});
