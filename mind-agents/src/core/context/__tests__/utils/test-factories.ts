/**
 * @module test-factories
 * @description Test factories for creating mock context objects and test data
 */

import { ConversationContext, ContextManagerConfig } from '../../context-manager.js';
import { Agent, AgentStatus } from '../../../types/agent.js';
import { MemoryRecord } from '../../../types/memory.js';
import { MemoryType, MemoryDuration } from '../../../types/enums.js';

/**
 * Factory for creating test conversation contexts
 */
export class ContextFactory {
  static createBasicContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
    const baseContext: ConversationContext = {
      id: 'test-ctx-1',
      agentId: 'test-agent-1',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      lastActive: new Date('2024-01-01T10:05:00Z'),
      participants: new Set(['user-1']),
      primaryParticipant: 'user-1',
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

    return { ...baseContext, ...overrides };
  }

  static createContextWithMessages(messageCount: number = 5): ConversationContext {
    const context = this.createBasicContext();
    
    for (let i = 0; i < messageCount; i++) {
      context.messages.push({
        from: i % 2 === 0 ? 'user-1' : 'test-agent-1',
        content: `Test message ${i + 1}`,
        timestamp: new Date(`2024-01-01T10:0${i}:00Z`),
        emotion: i % 3 === 0 ? 'happy' : undefined,
        intent: i % 4 === 0 ? 'question' : 'statement',
      });
    }

    return context;
  }

  static createContextWithTopics(topics: string[]): ConversationContext {
    const context = this.createBasicContext();
    
    context.topics = topics.map((topic, index) => ({
      topic,
      mentions: index + 1,
      firstMentioned: new Date(`2024-01-01T10:0${index}:00Z`),
      lastMentioned: new Date(`2024-01-01T10:0${index + 1}:00Z`),
    }));

    if (topics.length > 0) {
      context.currentTopic = topics[0];
    }

    return context;
  }

  static createExpiredContext(): ConversationContext {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return this.createBasicContext({
      startedAt: twoHoursAgo,
      lastActive: twoHoursAgo,
    });
  }

  static createActiveContextWithQuestions(questionCount: number = 3): ConversationContext {
    const context = this.createBasicContext();
    
    for (let i = 0; i < questionCount; i++) {
      context.pendingQuestions.push({
        question: `What about topic ${i + 1}?`,
        askedAt: new Date(`2024-01-01T10:0${i}:00Z`),
        askedBy: 'user-1',
      });
    }

    return context;
  }

  static createMultiParticipantContext(participantCount: number = 3): ConversationContext {
    const participants = Array.from({ length: participantCount }, (_, i) => `user-${i + 1}`);
    
    return this.createBasicContext({
      participants: new Set(participants),
      primaryParticipant: participants[0],
    });
  }
}

/**
 * Factory for creating test context manager configurations
 */
export class ConfigFactory {
  static createBasicConfig(overrides: Partial<ContextManagerConfig> = {}): ContextManagerConfig {
    return {
      maxContextDuration: 3600000, // 1 hour
      maxMessageHistory: 100,
      maxTopics: 10,
      contextSwitchThreshold: 0.7,
      allowMultipleContexts: false,
      persistToMemory: true,
      memoryImportance: 0.6,
      enableIntentAnalysis: true,
      enableTopicExtraction: true,
      enableMoodDetection: true,
      ...overrides,
    };
  }

  static createRestrictiveConfig(): ContextManagerConfig {
    return this.createBasicConfig({
      maxContextDuration: 60000, // 1 minute
      maxMessageHistory: 10,
      maxTopics: 3,
      contextSwitchThreshold: 0.9,
      allowMultipleContexts: false,
    });
  }

  static createPermissiveConfig(): ContextManagerConfig {
    return this.createBasicConfig({
      maxContextDuration: 86400000, // 24 hours
      maxMessageHistory: 1000,
      maxTopics: 50,
      contextSwitchThreshold: 0.3,
      allowMultipleContexts: true,
    });
  }

  static createDisabledAnalysisConfig(): ContextManagerConfig {
    return this.createBasicConfig({
      enableIntentAnalysis: false,
      enableTopicExtraction: false,
      enableMoodDetection: false,
      persistToMemory: false,
    });
  }
}

/**
 * Factory for creating test memory records
 */
export class MemoryFactory {
  static createContextMemory(contextId: string, agentId: string): MemoryRecord {
    return {
      id: `mem-${contextId}`,
      agentId,
      type: MemoryType.INTERACTION,
      content: 'Test conversation about programming topics',
      metadata: {
        contextId,
        participants: ['user-1', 'user-2'],
        topics: ['programming', 'testing', 'javascript'],
        duration: 300000, // 5 minutes
        messageCount: 15,
        mood: 'positive',
      },
      importance: 0.8,
      timestamp: new Date('2024-01-01T10:00:00Z'),
      tags: ['conversation', 'context', 'programming'],
      duration: MemoryDuration.LONG_TERM,
    };
  }
}

/**
 * Factory for creating test agents
 */
export class AgentFactory {
  static createBasicAgent(overrides: Partial<Agent> = {}): Agent {
    return {
      id: 'test-agent-1',
      name: 'Test Agent',
      status: AgentStatus.ACTIVE,
      emotion: {} as any, // Mock emotion module
      memory: {} as any, // Mock memory provider
      cognition: {} as any, // Mock cognition module
      extensions: [],
      config: {} as any, // Mock agent config
      lastUpdate: new Date(),
      
      // Mock lifecycle methods
      initialize: async () => ({
        success: true,
        timestamp: new Date(),
        resourcesInitialized: [],
      }),
      cleanup: async () => ({
        success: true,
        timestamp: new Date(),
        resourcesReleased: [],
      }),
      tick: async () => ({
        success: true,
        timestamp: new Date(),
      }),
      updateState: async () => ({
        success: true,
        newState: {},
        previousState: {},
        transitionTime: 0,
        timestamp: new Date(),
      }),
      processEvent: async () => ({
        success: true,
        timestamp: new Date(),
        eventProcessed: true,
      }),
      executeAction: async () => ({
        success: true,
        timestamp: new Date(),
      }),
      
      ...overrides,
    } as Agent;
  }
}

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random conversation messages
   */
  static generateMessages(count: number, participants: string[] = ['user-1', 'agent-1']) {
    const messages = [];
    const sampleContents = [
      'Hello there!',
      'How are you doing?',
      'Can you help me with programming?',
      'That sounds interesting.',
      'What do you think about that?',
      'Thanks for your help!',
      'I need to understand this better.',
      'This is really helpful.',
    ];

    for (let i = 0; i < count; i++) {
      messages.push({
        from: participants[i % participants.length],
        content: sampleContents[i % sampleContents.length],
        timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute intervals
        emotion: i % 4 === 0 ? ['happy', 'curious', 'confident'][i % 3] : undefined,
        intent: i % 3 === 0 ? 'question' : 'statement',
      });
    }

    return messages;
  }

  /**
   * Generate random topics with mentions
   */
  static generateTopics(count: number) {
    const sampleTopics = [
      'programming', 'testing', 'javascript', 'typescript', 'react',
      'nodejs', 'database', 'api', 'frontend', 'backend',
      'algorithm', 'datastructure', 'performance', 'security',
    ];

    return sampleTopics.slice(0, count).map((topic, index) => ({
      topic,
      mentions: Math.floor(Math.random() * 10) + 1,
      firstMentioned: new Date(Date.now() - (count - index) * 300000), // 5 minute intervals
      lastMentioned: new Date(Date.now() - index * 60000), // 1 minute intervals
    }));
  }

  /**
   * Generate performance test data
   */
  static generateLargeContextData(messageCount: number, participantCount: number) {
    const participants = Array.from({ length: participantCount }, (_, i) => `user-${i + 1}`);
    const messages = this.generateMessages(messageCount, participants);
    const topics = this.generateTopics(Math.min(50, Math.floor(messageCount / 10)));

    return { participants, messages, topics };
  }
}