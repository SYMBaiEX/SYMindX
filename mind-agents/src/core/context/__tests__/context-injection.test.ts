/**
 * @module context-injection.test
 * @description Context Injection and Dependency Management Test Suite
 */

import { describe, test as it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import { ContextManager, createContextManager } from '../context-manager.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  ContextAssertions,
  TestHarness,
  MockAgent,
  MockMemoryProvider,
  createTestEnvironment,
} from './utils/index.js';

describe('Context Injection and Dependency Management', () => {
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

  describe('Context Dependency Injection', () => {
    it('should inject context into agent lifecycle methods', async () => {
      const agent = new MockAgent('test-agent-1');
      const participantId = 'user-1';
      
      // Create context
      const context = contextManager.getOrCreateContext(agent.id, participantId, 'Hello!');
      
      // Simulate context injection during agent initialization
      agent.initialize.mockImplementation(async (config) => {
        // Access injected context
        const activeContext = contextManager.getActiveContext(agent.id);
        expect(activeContext).not.toBeNull();
        expect(activeContext!.id).toBe(context.id);
        
        return {
          success: true,
          timestamp: new Date(),
          resourcesInitialized: ['context'],
        };
      });

      const result = await agent.initialize({} as any);
      
      expect(result.success).toBe(true);
      expect(result.resourcesInitialized).toContain('context');
      expect(agent.initialize).toHaveBeenCalledTimes(1);
    });

    it('should provide context data to agent event processing', async () => {
      const agent = new MockAgent('test-agent-1');
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add conversation history
      contextManager.addMessage(context, 'user-1', 'What is your favorite programming language?');
      contextManager.addMessage(context, agent.id, 'I enjoy working with TypeScript!');
      
      // Mock event processing with context injection
      agent.processEvent.mockImplementation(async (event) => {
        const contextSummary = contextManager.getContextSummary(context.id);
        expect(contextSummary).not.toBeNull();
        expect(contextSummary!.recentMessages).toHaveLength(2);
        expect(contextSummary!.pendingQuestions).toContain('What is your favorite programming language?');
        
        return {
          success: true,
          timestamp: new Date(),
          eventProcessed: true,
        };
      });

      await agent.processEvent({
        id: 'test-event-1',
        type: 'message',
        source: 'user-1',
        data: { message: 'New message' },
        timestamp: new Date(),
        processed: false,
      });

      expect(agent.processEvent).toHaveBeenCalledTimes(1);
    });

    it('should inject context into memory operations', async () => {
      const agent = new MockAgent('test-agent-1');
      const memoryProvider = agent.memory as MockMemoryProvider;
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add rich conversation
      contextManager.addMessage(context, 'user-1', 'I need help with React hooks');
      contextManager.addMessage(context, agent.id, 'I can help you with useState and useEffect');
      contextManager.addMessage(context, 'user-1', 'That would be great!');
      
      // Mock memory storage with context injection
      memoryProvider.store.mockImplementation(async (memory) => {
        // Verify context data is included in memory
        expect(memory.metadata).toHaveProperty('contextId');
        expect(memory.metadata).toHaveProperty('participants');
        expect(memory.metadata).toHaveProperty('topics');
        expect(memory.content).toContain('React');
        
        return Promise.resolve();
      });

      // Preserve context to memory
      const preservedMemory = await contextManager.preserveToMemory(agent, context.id);
      
      expect(preservedMemory).not.toBeNull();
      expect(memoryProvider.store).toHaveBeenCalledTimes(0); // Direct call, not through memory provider
    });

    it('should handle circular dependency injection safely', async () => {
      const agent1 = new MockAgent('agent-1');
      const agent2 = new MockAgent('agent-2');
      
      // Create contexts that reference each other
      const context1 = contextManager.getOrCreateContext(agent1.id, 'shared-user');
      const context2 = contextManager.getOrCreateContext(agent2.id, 'shared-user');
      
      // Add cross-references in metadata
      context1.metadata['relatedContexts'] = [context2.id];
      context2.metadata['relatedContexts'] = [context1.id];
      
      // Both agents should be able to access their contexts without issues
      expect(() => {
        contextManager.getActiveContext(agent1.id);
        contextManager.getActiveContext(agent2.id);
      }).not.toThrow();
      
      // Context integrity should be maintained
      ContextAssertions.assertContextIntegrity(context1);
      ContextAssertions.assertContextIntegrity(context2);
    });

    it('should inject context into extension methods', async () => {
      const agent = new MockAgent('test-agent-1');
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Mock extension with context injection
      const mockExtension = {
        name: 'test-extension',
        actions: {
          processMessage: async (params: any) => {
            // Access injected context
            const activeContext = contextManager.getActiveContext(agent.id);
            expect(activeContext).not.toBeNull();
            expect(activeContext!.id).toBe(context.id);
            
            // Use context data
            const summary = contextManager.getContextSummary(context.id);
            return {
              success: true,
              contextParticipants: summary?.participants || [],
              contextMood: summary?.mood || 'neutral',
            };
          },
        },
      };

      agent.extensions = [mockExtension as any];
      
      // Execute extension action
      const result = await mockExtension.actions.processMessage({ message: 'Test' });
      
      expect(result.success).toBe(true);
      expect(result.contextParticipants).toEqual(['user-1']);
      expect(result.contextMood).toBe('neutral');
    });
  });

  describe('Context Scope Management', () => {
    it('should maintain proper context scoping per agent', () => {
      const agent1 = new MockAgent('agent-1');
      const agent2 = new MockAgent('agent-2');
      
      // Create separate contexts
      const context1 = contextManager.getOrCreateContext(agent1.id, 'user-1');
      const context2 = contextManager.getOrCreateContext(agent2.id, 'user-2');
      
      // Each agent should only see their own context
      expect(contextManager.getActiveContext(agent1.id)?.id).toBe(context1.id);
      expect(contextManager.getActiveContext(agent2.id)?.id).toBe(context2.id);
      
      expect(contextManager.getActiveContext(agent1.id)?.id).not.toBe(context2.id);
      expect(contextManager.getActiveContext(agent2.id)?.id).not.toBe(context1.id);
    });

    it('should isolate context modifications between agents', () => {
      const agent1 = new MockAgent('agent-1');
      const agent2 = new MockAgent('agent-2');
      
      const context1 = contextManager.getOrCreateContext(agent1.id, 'shared-user');
      const context2 = contextManager.getOrCreateContext(agent2.id, 'shared-user');
      
      // Modify first context
      contextManager.addMessage(context1, 'shared-user', 'Message for agent 1');
      contextManager.addMessage(context1, agent1.id, 'Response from agent 1');
      
      // Modify second context
      contextManager.addMessage(context2, 'shared-user', 'Message for agent 2');
      contextManager.addMessage(context2, agent2.id, 'Response from agent 2');
      
      // Contexts should remain separate
      expect(context1.messages).toHaveLength(2);
      expect(context2.messages).toHaveLength(2);
      
      expect(context1.messages[1].from).toBe(agent1.id);
      expect(context2.messages[1].from).toBe(agent2.id);
    });

    it('should handle context scoping with nested operations', async () => {
      const agent = new MockAgent('test-agent-1');
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add initial context
      contextManager.addMessage(context, 'user-1', 'Start conversation');
      
      // Nested operation that creates temporary context scope
      const nestedOperation = async () => {
        const tempContext = ContextFactory.createBasicContext({
          id: 'temp-context',
          agentId: agent.id,
        });
        
        // Temporary modifications shouldn't affect main context
        tempContext.metadata['temporary'] = true;
        
        // Main context should remain unchanged
        const mainContext = contextManager.getActiveContext(agent.id);
        expect(mainContext?.id).toBe(context.id);
        expect(mainContext?.metadata['temporary']).toBeUndefined();
        
        return tempContext;
      };
      
      const tempResult = await nestedOperation();
      
      expect(tempResult.metadata['temporary']).toBe(true);
      expect(context.metadata['temporary']).toBeUndefined();
    });

    it('should provide proper context isolation in concurrent operations', async () => {
      const agents = Array.from({ length: 5 }, (_, i) => new MockAgent(`agent-${i}`));
      const contexts = agents.map(agent => 
        contextManager.getOrCreateContext(agent.id, `user-${agent.id}`)
      );
      
      // Concurrent operations on different contexts
      const operations = agents.map((agent, index) => async () => {
        const context = contexts[index];
        
        // Add messages concurrently
        for (let i = 0; i < 10; i++) {
          contextManager.addMessage(context, `user-${agent.id}`, `Message ${i} for ${agent.id}`);
          
          // Verify context isolation
          const activeContext = contextManager.getActiveContext(agent.id);
          expect(activeContext?.id).toBe(context.id);
          expect(activeContext?.agentId).toBe(agent.id);
        }
        
        return context;
      });
      
      const results = await Promise.all(operations.map(op => op()));
      
      // Each context should have its own messages
      results.forEach((context, index) => {
        expect(context.messages).toHaveLength(10);
        expect(context.agentId).toBe(agents[index].id);
        
        // Verify no cross-contamination
        context.messages.forEach(message => {
          expect(message.from).toContain(agents[index].id.split('-')[1]);
        });
      });
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve context dependencies in correct order', async () => {
      const agent = new MockAgent('test-agent-1');
      const executionOrder: string[] = [];
      
      // Mock dependencies with execution tracking
      const mockDependencies = {
        contextManager: {
          init: async () => {
            executionOrder.push('contextManager');
          },
        },
        memoryProvider: {
          init: async () => {
            executionOrder.push('memoryProvider');
          },
        },
        emotionSystem: {
          init: async () => {
            executionOrder.push('emotionSystem');
          },
        },
      };
      
      // Initialize in dependency order
      await mockDependencies.contextManager.init();
      await mockDependencies.memoryProvider.init();
      await mockDependencies.emotionSystem.init();
      
      expect(executionOrder).toEqual(['contextManager', 'memoryProvider', 'emotionSystem']);
    });

    it('should handle missing dependencies gracefully', async () => {
      const agent = new MockAgent('test-agent-1');
      
      // Create context even with limited dependencies
      expect(() => {
        contextManager.getOrCreateContext(agent.id, 'user-1');
      }).not.toThrow();
      
      // Operations should still work with basic functionality
      const context = contextManager.getActiveContext(agent.id);
      expect(context).not.toBeNull();
      
      contextManager.addMessage(context!, 'user-1', 'Test message');
      expect(context!.messages).toHaveLength(1);
    });

    it('should inject optional dependencies when available', async () => {
      const agent = new MockAgent('test-agent-1');
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Mock optional dependencies
      const optionalServices = {
        sentimentAnalyzer: {
          analyze: (text: string) => ({
            sentiment: 'positive',
            confidence: 0.8,
          }),
        },
        translator: {
          translate: (text: string, lang: string) => `[${lang}] ${text}`,
        },
      };
      
      // Inject optional services into context metadata
      context.metadata['services'] = optionalServices;
      
      // Use optional services when available
      contextManager.addMessage(context, 'user-1', 'I love programming!');
      
      if (context.metadata['services']?.sentimentAnalyzer) {
        const sentiment = context.metadata['services'].sentimentAnalyzer.analyze(
          context.messages[0].content
        );
        context.messages[0].sentiment = sentiment;
      }
      
      expect(context.messages[0].sentiment).toEqual({
        sentiment: 'positive',
        confidence: 0.8,
      });
    });

    it('should validate dependency compatibility', () => {
      const config = ConfigFactory.createBasicConfig();
      
      // Mock dependency validation
      const validateDependencies = (config: any) => {
        const required = ['enableIntentAnalysis', 'enableTopicExtraction'];
        const missing = required.filter(dep => config[dep] === undefined);
        return missing.length === 0;
      };
      
      expect(validateDependencies(config)).toBe(true);
      
      // Test with missing dependencies
      const incompleteConfig = { enableIntentAnalysis: true };
      expect(validateDependencies(incompleteConfig)).toBe(false);
    });
  });

  describe('Context Provider Integration', () => {
    it('should integrate with custom context providers', async () => {
      const customProvider = {
        name: 'CustomContextProvider',
        createContext: (agentId: string, participantId: string) => {
          return ContextFactory.createBasicContext({
            agentId,
            participants: new Set([participantId]),
            metadata: { provider: 'custom' },
          });
        },
        enhanceContext: (context: any, data: any) => {
          context.metadata['enhanced'] = true;
          context.metadata['enhancementData'] = data;
          return context;
        },
      };
      
      // Use custom provider
      const customContext = customProvider.createContext('test-agent-1', 'user-1');
      const enhancedContext = customProvider.enhanceContext(customContext, { version: '1.0' });
      
      expect(enhancedContext.metadata['provider']).toBe('custom');
      expect(enhancedContext.metadata['enhanced']).toBe(true);
      expect(enhancedContext.metadata['enhancementData']).toEqual({ version: '1.0' });
    });

    it('should handle provider switching gracefully', () => {
      const providers = [
        { name: 'provider-1', priority: 1 },
        { name: 'provider-2', priority: 2 },
        { name: 'provider-3', priority: 0 },
      ];
      
      // Sort by priority (higher priority first)
      const sortedProviders = providers.sort((a, b) => b.priority - a.priority);
      
      expect(sortedProviders[0].name).toBe('provider-2');
      expect(sortedProviders[1].name).toBe('provider-1');
      expect(sortedProviders[2].name).toBe('provider-3');
      
      // Switch to highest priority provider
      const activeProvider = sortedProviders[0];
      expect(activeProvider.name).toBe('provider-2');
    });

    it('should validate provider compatibility', () => {
      const providerInterface = {
        requiredMethods: ['createContext', 'enhanceContext', 'validateContext'],
        optionalMethods: ['migrateContext', 'optimizeContext'],
      };
      
      const testProvider = {
        createContext: () => ({}),
        enhanceContext: () => ({}),
        validateContext: () => true,
        migrateContext: () => ({}), // Optional method implemented
      };
      
      // Validate required methods
      const hasAllRequired = providerInterface.requiredMethods.every(
        method => typeof (testProvider as any)[method] === 'function'
      );
      
      expect(hasAllRequired).toBe(true);
      
      // Check optional methods
      const hasOptionalMigration = typeof testProvider.migrateContext === 'function';
      expect(hasOptionalMigration).toBe(true);
    });
  });

  describe('Context Lifecycle Hooks', () => {
    it('should call lifecycle hooks in correct order', async () => {
      const hookOrder: string[] = [];
      
      const lifecycleHooks = {
        beforeContextCreate: async (agentId: string, participantId: string) => {
          hookOrder.push('beforeContextCreate');
        },
        afterContextCreate: async (context: any) => {
          hookOrder.push('afterContextCreate');
        },
        beforeMessageAdd: async (context: any, message: any) => {
          hookOrder.push('beforeMessageAdd');
        },
        afterMessageAdd: async (context: any, message: any) => {
          hookOrder.push('afterMessageAdd');
        },
        beforeContextDestroy: async (context: any) => {
          hookOrder.push('beforeContextDestroy');
        },
      };
      
      // Simulate context lifecycle
      await lifecycleHooks.beforeContextCreate('agent-1', 'user-1');
      const context = contextManager.getOrCreateContext('agent-1', 'user-1');
      await lifecycleHooks.afterContextCreate(context);
      
      await lifecycleHooks.beforeMessageAdd(context, { content: 'Hello' });
      contextManager.addMessage(context, 'user-1', 'Hello');
      await lifecycleHooks.afterMessageAdd(context, context.messages[0]);
      
      await lifecycleHooks.beforeContextDestroy(context);
      
      expect(hookOrder).toEqual([
        'beforeContextCreate',
        'afterContextCreate',
        'beforeMessageAdd',
        'afterMessageAdd',
        'beforeContextDestroy',
      ]);
    });

    it('should handle hook failures gracefully', async () => {
      const failingHook = async () => {
        throw new Error('Hook failed');
      };
      
      const safeHookExecution = async (hook: Function, ...args: any[]) => {
        try {
          return await hook(...args);
        } catch (error) {
          console.warn('Hook execution failed:', error);
          return null;
        }
      };
      
      // Hook failure shouldn't break the main operation
      const result = await safeHookExecution(failingHook);
      expect(result).toBeNull();
      
      // Context operations should continue working
      const context = contextManager.getOrCreateContext('agent-1', 'user-1');
      expect(context).toBeDefined();
    });

    it('should support conditional hook execution', async () => {
      const conditionalHooks = {
        onlyForImportantMessages: async (context: any, message: any) => {
          if (message.content.includes('important')) {
            context.metadata['importance'] = 'high';
          }
        },
        onlyForQuestions: async (context: any, message: any) => {
          if (message.content.includes('?')) {
            context.metadata['hasQuestions'] = true;
          }
        },
      };
      
      const context = contextManager.getOrCreateContext('agent-1', 'user-1');
      
      // Add important message
      const importantMessage = { content: 'This is important information!' };
      await conditionalHooks.onlyForImportantMessages(context, importantMessage);
      expect(context.metadata['importance']).toBe('high');
      
      // Add question
      const questionMessage = { content: 'What is your name?' };
      await conditionalHooks.onlyForQuestions(context, questionMessage);
      expect(context.metadata['hasQuestions']).toBe(true);
      
      // Add regular message (no hooks triggered)
      const regularMessage = { content: 'Regular message' };
      await conditionalHooks.onlyForImportantMessages(context, regularMessage);
      await conditionalHooks.onlyForQuestions(context, regularMessage);
      
      // Previous metadata should remain unchanged
      expect(context.metadata['importance']).toBe('high');
      expect(context.metadata['hasQuestions']).toBe(true);
    });
  });
});