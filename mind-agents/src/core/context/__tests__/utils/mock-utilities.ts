/**
 * @module mock-utilities
 * @description Mock utilities for context system testing
 */

import { mock } from 'bun:test';
import { ConversationContext, ContextManager } from '../../context-manager.js';
import { Agent } from '../../../types/agent.js';
import { MemoryRecord } from '../../../types/memory.js';

/**
 * Mock context manager for testing
 */
export class MockContextManager {
  private contexts = new Map<string, ConversationContext>();
  private activeContexts = new Map<string, string>();

  // Mock methods
  getOrCreateContext = mock(
    (agentId: string, participantId: string, initialMessage?: string) => {
      const contextId = `mock-ctx-${Date.now()}`;
      const context: ConversationContext = {
        id: contextId,
        agentId,
        startedAt: new Date(),
        lastActive: new Date(),
        participants: new Set([participantId]),
        primaryParticipant: participantId,
        topics: [],
        messages: [],
        state: {
          phase: 'active',
          mood: 'neutral',
          formality: 0.5,
          engagement: 0.5,
        },
        pendingQuestions: [],
        followUpTopics: [],
        metadata: {},
      };

      this.contexts.set(contextId, context);
      this.activeContexts.set(agentId, contextId);
      return context;
    }
  );

  addMessage = mock(
    (
      context: ConversationContext,
      from: string,
      content: string,
      emotion?: string
    ) => {
      context.messages.push({
        from,
        content,
        timestamp: new Date(),
        emotion,
        intent: content.includes('?') ? 'question' : 'statement',
      });
      context.lastActive = new Date();
    }
  );

  getContextSummary = mock((contextId: string) => {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    return {
      topics: context.topics.map((t) => t.topic),
      mood: context.state.mood,
      pendingQuestions: context.pendingQuestions.map((q) => q.question),
      recentMessages: context.messages.slice(-5).map((m) => m.content),
      participants: Array.from(context.participants),
      phase: context.state.phase,
    };
  });

  preserveToMemory = mock(
    async (agent: Agent, contextId: string): Promise<MemoryRecord | null> => {
      const context = this.contexts.get(contextId);
      if (!context) return null;

      return {
        id: `mock-mem-${Date.now()}`,
        agentId: agent.id,
        type: 'interaction' as any,
        content: 'Mock conversation summary',
        metadata: {
          contextId,
          participants: Array.from(context.participants),
          topics: context.topics.map((t) => t.topic),
          duration: 300000,
          messageCount: context.messages.length,
          mood: context.state.mood,
        },
        importance: 0.8,
        timestamp: new Date(),
        tags: ['mock', 'conversation'],
        duration: 'long_term' as any,
      };
    }
  );

  switchContext = mock((agentId: string, newContextId: string): boolean => {
    const context = this.contexts.get(newContextId);
    if (!context || context.agentId !== agentId) return false;

    this.activeContexts.set(agentId, newContextId);
    return true;
  });

  mergeContexts = mock(
    (primaryId: string, secondaryId: string): ConversationContext | null => {
      const primary = this.contexts.get(primaryId);
      const secondary = this.contexts.get(secondaryId);

      if (!primary || !secondary) return null;

      // Merge participants
      secondary.participants.forEach((p) => primary.participants.add(p));

      // Merge messages
      primary.messages.push(...secondary.messages);
      primary.messages.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Remove secondary
      this.contexts.delete(secondaryId);

      return primary;
    }
  );

  getActiveContext = mock((agentId: string): ConversationContext | null => {
    const contextId = this.activeContexts.get(agentId);
    if (!contextId) return null;
    return this.contexts.get(contextId) || null;
  });

  // Helper methods for testing
  getContext(contextId: string): ConversationContext | undefined {
    return this.contexts.get(contextId);
  }

  getAllContexts(): ConversationContext[] {
    return Array.from(this.contexts.values());
  }

  clear(): void {
    this.contexts.clear();
    this.activeContexts.clear();
  }

  getCallCount(method: string): number {
    const mockMethod = (this as any)[method];
    return mockMethod?.mock?.calls?.length || 0;
  }

  getLastCall(method: string): any[] {
    const mockMethod = (this as any)[method];
    const calls = mockMethod?.mock?.calls;
    return calls?.[calls.length - 1] || [];
  }

  reset(): void {
    // Reset all mocks
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (value?.mockReset) {
        value.mockReset();
      }
    });
    this.clear();
  }
}

/**
 * Mock memory provider for testing
 */
export class MockMemoryProvider {
  private memories = new Map<string, MemoryRecord>();

  store = mock(async (memory: MemoryRecord): Promise<void> => {
    this.memories.set(memory.id, { ...memory });
  });

  retrieve = mock(
    async (agentId: string, filters?: any): Promise<MemoryRecord[]> => {
      return Array.from(this.memories.values()).filter(
        (m) => m.agentId === agentId
      );
    }
  );

  update = mock(
    async (id: string, updates: Partial<MemoryRecord>): Promise<boolean> => {
      const memory = this.memories.get(id);
      if (!memory) return false;

      Object.assign(memory, updates);
      return true;
    }
  );

  delete = mock(async (id: string): Promise<boolean> => {
    return this.memories.delete(id);
  });

  search = mock(
    async (query: string, agentId?: string): Promise<MemoryRecord[]> => {
      return Array.from(this.memories.values())
        .filter((m) => !agentId || m.agentId === agentId)
        .filter((m) => m.content.toLowerCase().includes(query.toLowerCase()));
    }
  );

  // Helper methods
  getMemory(id: string): MemoryRecord | undefined {
    return this.memories.get(id);
  }

  getAllMemories(): MemoryRecord[] {
    return Array.from(this.memories.values());
  }

  clear(): void {
    this.memories.clear();
  }

  reset(): void {
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (value?.mockReset) {
        value.mockReset();
      }
    });
    this.clear();
  }
}

/**
 * Mock agent for testing
 */
export class MockAgent {
  id: string;
  name: string;
  status: any;
  emotion: any;
  memory: MockMemoryProvider;
  cognition: any;
  extensions: any[];
  config: any;
  lastUpdate: Date;

  // Mock lifecycle methods
  initialize = mock(async () => ({
    success: true,
    timestamp: new Date(),
    resourcesInitialized: [],
  }));

  cleanup = mock(async () => ({
    success: true,
    timestamp: new Date(),
    resourcesReleased: [],
  }));

  tick = mock(async () => ({
    success: true,
    timestamp: new Date(),
  }));

  updateState = mock(async () => ({
    success: true,
    newState: {},
    previousState: {},
    transitionTime: 0,
    timestamp: new Date(),
  }));

  processEvent = mock(async () => ({
    success: true,
    timestamp: new Date(),
    eventProcessed: true,
  }));

  executeAction = mock(async () => ({
    success: true,
    timestamp: new Date(),
  }));

  constructor(id: string = 'mock-agent-1') {
    this.id = id;
    this.name = `Mock Agent ${id}`;
    this.status = 'active';
    this.emotion = {};
    this.memory = new MockMemoryProvider();
    this.cognition = {};
    this.extensions = [];
    this.config = {};
    this.lastUpdate = new Date();
  }

  reset(): void {
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (value?.mockReset) {
        value.mockReset();
      }
    });
    this.memory.reset();
  }
}

/**
 * Mock event bus for testing
 */
export class MockEventBus {
  private events: any[] = [];
  private handlers = new Map<string, Function[]>();

  publish = mock(async (event: any): Promise<void> => {
    this.events.push(event);
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map((handler) => handler(event)));
  });

  subscribe = mock((eventType: string, handler: Function): void => {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  });

  unsubscribe = mock((eventType: string, handler: Function): void => {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  });

  getEvents = mock((): any[] => {
    return [...this.events];
  });

  clearEvents = mock((): void => {
    this.events.length = 0;
  });

  // Helper methods
  getEventCount(type?: string): number {
    if (!type) return this.events.length;
    return this.events.filter((e) => e.type === type).length;
  }

  getLastEvent(type?: string): any {
    if (!type) return this.events[this.events.length - 1];
    const filtered = this.events.filter((e) => e.type === type);
    return filtered[filtered.length - 1];
  }

  reset(): void {
    this.events.length = 0;
    this.handlers.clear();
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (value?.mockReset) {
        value.mockReset();
      }
    });
  }
}

/**
 * Mock logger for testing
 */
export class MockLogger {
  private logs: Array<{
    level: string;
    message: string;
    data?: any;
    timestamp: Date;
  }> = [];

  debug = mock((message: string, data?: any) => {
    this.logs.push({ level: 'debug', message, data, timestamp: new Date() });
  });

  info = mock((message: string, data?: any) => {
    this.logs.push({ level: 'info', message, data, timestamp: new Date() });
  });

  warn = mock((message: string, data?: any) => {
    this.logs.push({ level: 'warn', message, data, timestamp: new Date() });
  });

  error = mock((message: string, data?: any) => {
    this.logs.push({ level: 'error', message, data, timestamp: new Date() });
  });

  context = mock((message: string, data?: any) => {
    this.logs.push({ level: 'context', message, data, timestamp: new Date() });
  });

  // Helper methods
  getLogs(
    level?: string
  ): Array<{ level: string; message: string; data?: any; timestamp: Date }> {
    if (!level) return [...this.logs];
    return this.logs.filter((log) => log.level === level);
  }

  getLastLog(
    level?: string
  ):
    | { level: string; message: string; data?: any; timestamp: Date }
    | undefined {
    const logs = this.getLogs(level);
    return logs[logs.length - 1];
  }

  clear(): void {
    this.logs.length = 0;
  }

  reset(): void {
    this.clear();
    Object.keys(this).forEach((key) => {
      const value = (this as any)[key];
      if (value?.mockReset) {
        value.mockReset();
      }
    });
  }
}

/**
 * Test harness for coordinating mocks
 */
export class TestHarness {
  contextManager: MockContextManager;
  memoryProvider: MockMemoryProvider;
  agent: MockAgent;
  eventBus: MockEventBus;
  logger: MockLogger;

  constructor() {
    this.contextManager = new MockContextManager();
    this.memoryProvider = new MockMemoryProvider();
    this.agent = new MockAgent();
    this.eventBus = new MockEventBus();
    this.logger = new MockLogger();
  }

  /**
   * Setup typical test scenario
   */
  setupBasicScenario(): {
    contextId: string;
    agentId: string;
    participantId: string;
  } {
    const agentId = 'test-agent-1';
    const participantId = 'user-1';
    const context = this.contextManager.getOrCreateContext(
      agentId,
      participantId,
      'Hello!'
    );

    return {
      contextId: context.id,
      agentId,
      participantId,
    };
  }

  /**
   * Setup multi-participant scenario
   */
  setupMultiParticipantScenario(participantCount: number = 3): {
    contextId: string;
    agentId: string;
    participantIds: string[];
  } {
    const agentId = 'test-agent-1';
    const participantIds = Array.from(
      { length: participantCount },
      (_, i) => `user-${i + 1}`
    );
    const context = this.contextManager.getOrCreateContext(
      agentId,
      participantIds[0],
      'Hello!'
    );

    // Add additional participants
    for (let i = 1; i < participantIds.length; i++) {
      context.participants.add(participantIds[i]);
      this.contextManager.addMessage(
        context,
        participantIds[i],
        `Hi from user ${i + 1}!`
      );
    }

    return {
      contextId: context.id,
      agentId,
      participantIds,
    };
  }

  /**
   * Setup conversation with history
   */
  setupConversationHistory(messageCount: number = 10): {
    contextId: string;
    agentId: string;
    participantId: string;
  } {
    const { contextId, agentId, participantId } = this.setupBasicScenario();
    const context = this.contextManager.getContext(contextId)!;

    const messages = [
      'How are you?',
      'I need help with programming.',
      'Can you explain recursion?',
      'What about data structures?',
      'Thanks for the help!',
      'Do you know JavaScript?',
      'How about React?',
      'This is very helpful.',
      'I appreciate your assistance.',
      'See you later!',
    ];

    for (let i = 0; i < Math.min(messageCount, messages.length); i++) {
      const from = i % 2 === 0 ? participantId : agentId;
      this.contextManager.addMessage(context, from, messages[i]);
    }

    return { contextId, agentId, participantId };
  }

  /**
   * Verify all mocks were called as expected
   */
  verifyMockCalls(
    expectedCalls: Record<string, { method: string; callCount: number }>
  ): void {
    for (const [component, expectation] of Object.entries(expectedCalls)) {
      const mockComponent = (this as any)[component];
      if (mockComponent && mockComponent.getCallCount) {
        const actualCount = mockComponent.getCallCount(expectation.method);
        if (actualCount !== expectation.callCount) {
          throw new Error(
            `Expected ${component}.${expectation.method} to be called ${expectation.callCount} times, ` +
              `but was called ${actualCount} times`
          );
        }
      }
    }
  }

  /**
   * Reset all mocks
   */
  resetAll(): void {
    this.contextManager.reset();
    this.memoryProvider.reset();
    this.agent.reset();
    this.eventBus.reset();
    this.logger.reset();
  }

  /**
   * Get summary of all mock interactions
   */
  getSummary(): string {
    const summary = [
      'Test Harness Summary',
      '===================',
      '',
      `Context Manager Calls:`,
      `  getOrCreateContext: ${this.contextManager.getCallCount('getOrCreateContext')}`,
      `  addMessage: ${this.contextManager.getCallCount('addMessage')}`,
      `  getContextSummary: ${this.contextManager.getCallCount('getContextSummary')}`,
      '',
      `Memory Provider Calls:`,
      `  store: ${this.memoryProvider.getCallCount('store')}`,
      `  retrieve: ${this.memoryProvider.getCallCount('retrieve')}`,
      '',
      `Event Bus Calls:`,
      `  publish: ${this.eventBus.getCallCount('publish')}`,
      `  subscribe: ${this.eventBus.getCallCount('subscribe')}`,
      '',
      `Logger Calls:`,
      `  debug: ${this.logger.getLogs('debug').length}`,
      `  info: ${this.logger.getLogs('info').length}`,
      `  error: ${this.logger.getLogs('error').length}`,
      '',
      `Active Contexts: ${this.contextManager.getAllContexts().length}`,
      `Stored Memories: ${this.memoryProvider.getAllMemories().length}`,
      `Logged Events: ${this.eventBus.getEvents().length}`,
    ];

    return summary.join('\n');
  }
}
