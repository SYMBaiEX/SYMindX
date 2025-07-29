/**
 * @module memory-context-integration.test
 * @description Memory Context Integration Test Suite - Tests for context-enhanced memory operations
 */

import { describe, test as it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { MemoryRecord, MemoryType, MemoryDuration } from '../../src/types/agent.js';
import { MemoryTierType } from '../../src/types/memory.js';
import { UnifiedContext, ContextScope } from '../../src/types/context/unified-context.js';
import {
  calculateContextSimilarity,
  createContextAwareSearchQuery,
  analyzeContextDistribution,
  migrateMemoriesToContextEnhanced,
} from '../../src/modules/memory/context-integration.js';
import { ContextEnhancedMemoryRecord } from '../../src/modules/memory/base-memory-provider.js';

describe('Memory Context Integration', () => {
  let mockContext1: UnifiedContext;
  let mockContext2: UnifiedContext;
  let mockMemory: MemoryRecord;

  beforeEach(() => {
    mockContext1 = {
      metadata: {
        id: 'ctx1',
        scope: ContextScope.AGENT,
        priority: 10,
        createdAt: new Date(),
        lastModified: new Date(),
        source: 'test',
        version: '1.0.0',
      },
      agent: {
        id: 'agent1',
        emotionalState: {
          happy: { intensity: 0.8, duration: 60000 },
          confident: { intensity: 0.6, duration: 45000 },
        },
      },
      session: {
        id: 'session1',
      },
      extensions: {
        chat: { active: true },
        memory: { active: true },
      },
      environment: {
        nodeEnv: 'test',
      },
      temporal: {
        timestamp: new Date(),
      },
    };

    mockContext2 = {
      metadata: {
        id: 'ctx2',
        scope: ContextScope.AGENT,
        priority: 10,
        createdAt: new Date(),
        lastModified: new Date(),
        source: 'test',
        version: '1.0.0',
      },
      agent: {
        id: 'agent1', // Same agent
        emotionalState: {
          happy: { intensity: 0.7, duration: 55000 },
          excited: { intensity: 0.5, duration: 30000 },
        },
      },
      session: {
        id: 'session2', // Different session
      },
      extensions: {
        chat: { active: true },
      },
      environment: {
        nodeEnv: 'test',
      },
      temporal: {
        timestamp: new Date(Date.now() + 3600000), // 1 hour later
      },
    };

    mockMemory = {
      id: 'mem1',
      agentId: 'agent1',
      type: MemoryType.EXPERIENCE,
      content: 'This is a test memory',
      metadata: {
        source: 'test',
        importance: 0.7,
      },
      importance: 0.7,
      timestamp: new Date(),
      tags: ['test', 'memory'],
      duration: MemoryDuration.LONG_TERM,
    };
  });

  describe('calculateContextSimilarity', () => {
    it('should return 1.0 for identical contexts', () => {
      const similarity = calculateContextSimilarity(mockContext1, mockContext1);
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for same agent different session', () => {
      const similarity = calculateContextSimilarity(mockContext1, mockContext2);
      expect(similarity).toBeGreaterThan(0.3); // Agent weight is 0.3
      expect(similarity).toBeLessThan(1.0);
    });

    it('should return lower similarity for contexts with different agents', () => {
      const context3 = {
        ...mockContext2,
        agent: { id: 'agent2' },
      };
      const similarity = calculateContextSimilarity(mockContext1, context3);
      const sameAgentSimilarity = calculateContextSimilarity(mockContext1, mockContext2);
      expect(similarity).toBeLessThan(sameAgentSimilarity); // Should be lower than same agent
    });

    it('should handle contexts with missing fields gracefully', () => {
      const minimalContext1 = {
        metadata: mockContext1.metadata,
        agent: { id: 'agent1' },
      };
      const minimalContext2 = {
        metadata: mockContext2.metadata,
        agent: { id: 'agent1' },
      };
      
      const similarity = calculateContextSimilarity(minimalContext1, minimalContext2);
      expect(similarity).toBeGreaterThan(0);
    });
  });

  describe('createContextAwareSearchQuery', () => {
    it('should create basic search query without context', () => {
      const query = createContextAwareSearchQuery('test query');
      
      expect(query.query).toBe('test query');
      expect(query.type).toBe('hybrid');
      expect(query.limit).toBe(10);
      expect(query.threshold).toBe(0.3);
    });

    it('should enhance query with context when provided', () => {
      const query = createContextAwareSearchQuery(
        'test query',
        mockContext1,
        { useContextualRanking: true, enrichWithContext: true }
      );
      
      expect(query.query).toContain('test query');
      expect(query.boostFactors).toBeDefined();
      expect(query.boostFactors?.importance).toBe(0.3);
      expect(query.timeRange).toBeDefined();
    });

    it('should add temporal constraints when context has temporal data', () => {
      const query = createContextAwareSearchQuery('test', mockContext1);
      
      expect(query.timeRange).toBeDefined();
      expect(query.timeRange?.relative).toEqual({
        value: 7,
        unit: 'days',
      });
    });
  });

  describe('migrateMemoriesToContextEnhanced', () => {
    it('should migrate basic memories to context-enhanced format', async () => {
      const memories = [mockMemory];
      const enhanced = await migrateMemoriesToContextEnhanced(memories);
      
      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].contextScore).toBeDefined();
      expect(enhanced[0].derivedInsights).toBeDefined();
      expect(enhanced[0].contextFingerprint).toBeDefined();
    });

    it('should calculate reasonable context scores', async () => {
      const highImportanceMemory = {
        ...mockMemory,
        importance: 0.9,
        metadata: {
          source: 'important',
          extension: 'chat',
          messageType: 'user_input',
        },
        tags: ['important', 'user', 'interaction', 'chat', 'response'],
        content: 'This is a very detailed and important memory with lots of context and information that should score highly for context richness.',
      };

      const enhanced = await migrateMemoriesToContextEnhanced([highImportanceMemory]);
      
      expect(enhanced[0].contextScore).toBeGreaterThan(0.5);
      expect(enhanced[0].derivedInsights?.length).toBeGreaterThan(0);
    });

    it('should handle batch processing correctly', async () => {
      const memories = Array.from({ length: 150 }, (_, i) => ({
        ...mockMemory,
        id: `mem${i}`,
        content: `Memory ${i}`,
      }));

      const enhanced = await migrateMemoriesToContextEnhanced(memories, {
        batchSize: 50,
      });
      
      expect(enhanced).toHaveLength(150);
      expect(enhanced.every(m => m.contextScore !== undefined)).toBe(true);
    });
  });

  describe('analyzeContextDistribution', () => {
    it('should analyze empty memory collection', () => {
      const analytics = analyzeContextDistribution([]);
      
      expect(analytics.totalMemories).toBe(0);
      expect(analytics.contextEnhancedMemories).toBe(0);
      expect(analytics.averageContextScore).toBe(0);
      expect(analytics.contextCoverage).toBe(0);
    });

    it('should analyze context-enhanced memories', () => {
      const memories: ContextEnhancedMemoryRecord[] = [
        {
          ...mockMemory,
          id: 'mem1',
          contextScore: 0.8,
          unifiedContext: mockContext1,
          derivedInsights: ['Memory source: test', 'Importance: high'],
        },
        {
          ...mockMemory,
          id: 'mem2',
          contextScore: 0.6,
          derivedInsights: ['Memory source: chat', 'Message type: user_input'],
        },
        {
          ...mockMemory,
          id: 'mem3',
          // No context enhancement
        },
      ];

      const analytics = analyzeContextDistribution(memories);
      
      expect(analytics.totalMemories).toBe(3);
      expect(analytics.contextEnhancedMemories).toBe(2);
      expect(analytics.averageContextScore).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
      expect(analytics.contextCoverage).toBeCloseTo(0.67); // 2/3
      expect(analytics.topContextScopes).toHaveLength(1);
      expect(analytics.topContextScopes[0].scope).toBe(ContextScope.AGENT);
      expect(analytics.insightDistribution).toHaveProperty('Memory source');
    });
  });
});