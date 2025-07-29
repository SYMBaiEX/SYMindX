/**
 * @module context-validation.test
 * @description Context Validation Test Suite
 * 
 * Tests context creation, validation, enrichment pipeline, transformation,
 * merging operations, and comprehensive error handling scenarios.
 */

import { describe, test as it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'bun:test';
import {
  ContextManager,
  createContextManager,
  type ContextManagerConfig,
} from '../core/context/context-manager.js';
import { EnrichmentPipeline } from '../core/context/enrichment-pipeline.js';
import { ContextValidator } from '../core/context/validation/context-validator.js';
import { ContextTransformer } from '../core/context/transformers/base-transformer.js';
import { MemoryContextTransformer } from '../core/context/transformers/MemoryContextTransformer.js';
import { CognitionContextTransformer } from '../core/context/transformers/CognitionContextTransformer.js';
import { PortalContextTransformer } from '../core/context/transformers/PortalContextTransformer.js';
import {
  ContextFactory,
  ConfigFactory,
  AgentFactory,
  ContextAssertions,
  createTestEnvironment,
  MockUtilities,
} from '../core/context/__tests__/utils/index.js';
import type {
  Context,
  ContextEnrichment,
  ContextValidationResult,
  ContextTransformationOptions,
} from '../types/context/index.js';
import type { Agent } from '../types/agent.js';

describe('Context Validation Test Suite', () => {
  let contextManager: ContextManager;
  let enrichmentPipeline: EnrichmentPipeline;
  let contextValidator: ContextValidator;
  let testEnv: ReturnType<typeof createTestEnvironment>;

  beforeAll(() => {
    testEnv = createTestEnvironment();
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(() => {
    contextManager = createContextManager(ConfigFactory.createBasicConfig());
    enrichmentPipeline = new EnrichmentPipeline(ConfigFactory.createBasicConfig());
    contextValidator = new ContextValidator();
    testEnv.setup();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('Context Creation and Structure Validation', () => {
    it('should create valid context with required properties', () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1', 'Hello world!');

      // Validate basic structure
      ContextAssertions.assertValidContext(context);
      
      expect(context.id).toMatch(/^ctx_[a-zA-Z0-9-_]+$/);
      expect(context.agentId).toBe(agent.id);
      expect(context.participants.has('user-1')).toBe(true);
      expect(context.primaryParticipant).toBe('user-1');
      expect(context.createdAt).toBeInstanceOf(Date);
      expect(context.lastActive).toBeInstanceOf(Date);
      expect(context.messages).toHaveLength(1);
      expect(context.state).toBeDefined();
      expect(context.topics).toBeDefined();
      expect(context.pendingQuestions).toBeDefined();
      expect(context.enrichment).toBeDefined();
    });

    it('should validate context state integrity', () => {
      const context = ContextFactory.createBasicContext();
      const validation = contextValidator.validateContext(context);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toBeDefined();
      expect(validation.score).toBeGreaterThan(0.8);
    });

    it('should detect and report context validation errors', () => {
      const invalidContext = {
        id: '', // Invalid ID
        agentId: '', // Invalid agent ID
        participants: new Set(), // Empty participants
        messages: [], // Empty messages might be valid but let's see
        state: {}, // Invalid state structure
      } as any;

      const validation = contextValidator.validateContext(invalidContext);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain(
        expect.objectContaining({ 
          field: 'id',
          message: expect.stringContaining('invalid') 
        })
      );
      expect(validation.score).toBeLessThan(0.5);
    });

    it('should validate message structure and content', () => {
      const context = ContextFactory.createBasicContext();
      
      // Add valid message
      contextManager.addMessage(context, 'user-1', 'Valid message content');
      const lastMessage = context.messages[context.messages.length - 1];

      expect(lastMessage.id).toMatch(/^msg_[a-zA-Z0-9-_]+$/);
      expect(lastMessage.from).toBe('user-1');
      expect(lastMessage.content).toBe('Valid message content');
      expect(lastMessage.timestamp).toBeInstanceOf(Date);
      expect(lastMessage.intent).toBeDefined();
      
      // Validate message through validator
      const messageValidation = contextValidator.validateMessage(lastMessage);
      expect(messageValidation.isValid).toBe(true);
    });

    it('should validate participant management', () => {
      const context = ContextFactory.createBasicContext();
      
      // Add multiple participants
      const participants = ['user-1', 'user-2', 'user-3'];
      participants.forEach(participant => {
        contextManager.addMessage(context, participant, `Message from ${participant}`);
      });

      ContextAssertions.assertParticipantManagement(context);
      expect(context.participants.size).toBe(participants.length);
      participants.forEach(p => {
        expect(context.participants.has(p)).toBe(true);
      });
    });

    it('should validate context metadata and timestamps', () => {
      const context = ContextFactory.createBasicContext();
      const now = new Date();
      
      expect(context.createdAt).toBeInstanceOf(Date);
      expect(context.lastActive).toBeInstanceOf(Date);
      expect(context.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(context.lastActive.getTime()).toBeLessThanOrEqual(now.getTime());
      
      // Last active should update when messages are added
      const initialLastActive = context.lastActive.getTime();
      setTimeout(() => {
        contextManager.addMessage(context, 'user-1', 'Update timestamp');
        expect(context.lastActive.getTime()).toBeGreaterThan(initialLastActive);
      }, 1);
    });

    it('should validate context state transitions', () => {
      const context = ContextFactory.createBasicContext();
      
      // Initial state
      expect(context.state.phase).toBe('greeting');
      expect(context.state.mood).toBe('neutral');
      
      // Add messages to trigger state changes
      contextManager.addMessage(context, 'user-1', 'Hello there!');
      expect(context.state.phase).toBe('greeting');
      
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(context, 'user-1', `Active conversation message ${i}`);
      }
      expect(context.state.phase).toBe('active');
      
      contextManager.addMessage(context, 'user-1', 'Goodbye!');
      expect(context.state.phase).toBe('closing');
    });
  });

  describe('Context Enrichment Pipeline Validation', () => {
    it('should validate enrichment pipeline execution', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      contextManager.addMessage(context, 'user-1', 'I love programming in TypeScript!');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      // Validate enrichment structure
      expect(enrichment).toBeDefined();
      expect(enrichment.temporalContext).toBeDefined();
      expect(enrichment.emotionalContext).toBeDefined();
      expect(enrichment.socialContext).toBeDefined();
      expect(enrichment.environmentContext).toBeDefined();
      expect(enrichment.memoryIntegration).toBeDefined();
      expect(enrichment.cognitiveContext).toBeDefined();
      expect(enrichment.portalIntegration).toBeDefined();
      
      // Validate enrichment quality
      const enrichmentValidation = contextValidator.validateEnrichment(enrichment);
      expect(enrichmentValidation.isValid).toBe(true);
      expect(enrichmentValidation.completeness).toBeGreaterThan(0.7);
    });

    it('should validate temporal context enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add messages at different times
      contextManager.addMessage(context, 'user-1', 'Morning message');
      await new Promise(resolve => setTimeout(resolve, 10));
      contextManager.addMessage(context, 'user-1', 'Follow-up message');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.temporalContext.conversationDuration).toBeGreaterThan(0);
      expect(enrichment.temporalContext.messageFrequency).toBeGreaterThan(0);
      expect(enrichment.temporalContext.timeOfDay).toBeDefined();
      expect(enrichment.temporalContext.recentActivity).toBeDefined();
      expect(enrichment.temporalContext.patterns).toBeDefined();
    });

    it('should validate emotional context enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      contextManager.addMessage(context, 'user-1', 'I am so excited about this!', 'excited');
      contextManager.addMessage(context, 'user-1', 'This makes me really happy!', 'happy');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.emotionalContext.currentEmotion).toBeDefined();
      expect(enrichment.emotionalContext.intensity).toBeGreaterThan(0);
      expect(enrichment.emotionalContext.emotionHistory).toHaveLength(2);
      expect(enrichment.emotionalContext.dominantEmotions).toBeDefined();
      expect(enrichment.emotionalContext.emotionalTrends).toBeDefined();
    });

    it('should validate social context enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Add messages from multiple participants
      contextManager.addMessage(context, 'user-1', 'Hello everyone!');
      contextManager.addMessage(context, 'user-2', 'Hi there!');
      contextManager.addMessage(context, 'user-3', 'Great to meet you all!');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.socialContext.participantCount).toBe(3);
      expect(enrichment.socialContext.primaryParticipant).toBe('user-1');
      expect(enrichment.socialContext.participantRoles).toBeDefined();
      expect(enrichment.socialContext.interactionPatterns).toBeDefined();
      expect(enrichment.socialContext.socialDynamics).toBeDefined();
    });

    it('should validate memory integration enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Store some relevant memories first
      await agent.memory.store({
        id: 'test-memory-1',
        agentId: agent.id,
        type: 'interaction',
        content: 'Previous conversation about programming',
        importance: 0.8,
        timestamp: new Date(),
        metadata: { topic: 'programming' },
      });
      
      contextManager.addMessage(context, 'user-1', 'Tell me more about programming');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.memoryIntegration.relevantMemories).toBeDefined();
      expect(enrichment.memoryIntegration.memoryImportance).toBeGreaterThan(0);
      expect(enrichment.memoryIntegration.memoryConnections).toBeDefined();
      expect(enrichment.memoryIntegration.contextualRelevance).toBeGreaterThan(0);
    });

    it('should validate cognitive context enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      contextManager.addMessage(context, 'user-1', 'Can you help me solve this complex algorithm problem?');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.cognitiveContext.taskType).toBeDefined();
      expect(enrichment.cognitiveContext.complexityLevel).toBeGreaterThan(0);
      expect(enrichment.cognitiveContext.requiredCapabilities).toBeDefined();
      expect(enrichment.cognitiveContext.contextualKnowledge).toBeDefined();
      expect(enrichment.cognitiveContext.reasoningDepth).toBeGreaterThan(0);
    });

    it('should validate environment context enrichment', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      contextManager.addMessage(context, 'user-1', 'Working on a production deployment');
      
      const enrichment = await enrichmentPipeline.enrichContext(context, agent);
      
      expect(enrichment.environmentContext.systemContext).toBeDefined();
      expect(enrichment.environmentContext.capabilities).toBeDefined();
      expect(enrichment.environmentContext.constraints).toBeDefined();
      expect(enrichment.environmentContext.resources).toBeDefined();
    });

    it('should handle enrichment pipeline failures gracefully', async () => {
      const agent = AgentFactory.createBasicAgent();
      const context = contextManager.getOrCreateContext(agent.id, 'user-1');
      
      // Mock enrichment failure
      const mockPipeline = new EnrichmentPipeline(ConfigFactory.createBasicConfig());
      mockPipeline.enrichContext = async () => {
        throw new Error('Enrichment pipeline failed');
      };
      
      // Should provide fallback enrichment
      const fallbackEnrichment = await mockPipeline.enrichContext(context, agent).catch(() => 
        enrichmentPipeline.createFallbackEnrichment(context)
      );
      
      expect(fallbackEnrichment).toBeDefined();
      expect(fallbackEnrichment.temporalContext).toBeDefined();
      expect(fallbackEnrichment.isPartial).toBe(true);
    });
  });

  describe('Context Transformation Validation', () => {
    it('should validate memory context transformation', async () => {
      const transformer = new MemoryContextTransformer();
      const agent = AgentFactory.createBasicAgent();
      const context = ContextFactory.createBasicContext();
      
      contextManager.addMessage(context, 'user-1', 'Remember my name is John');
      contextManager.addMessage(context, 'user-1', 'I work as a software engineer');
      
      const transformed = await transformer.transform(context, {
        includeRelevantMemories: true,
        memoryDepth: 10,
        importanceThreshold: 0.5,
      });
      
      expect(transformed).toBeDefined();
      expect(transformed.enrichment.memoryIntegration).toBeDefined();
      expect(transformed.enrichment.memoryIntegration.relevantMemories).toBeDefined();
      
      // Validate transformation quality
      const validation = contextValidator.validateTransformation(context, transformed);
      expect(validation.isValid).toBe(true);
      expect(validation.preservesIntegrity).toBe(true);
    });

    it('should validate cognition context transformation', async () => {
      const transformer = new CognitionContextTransformer();
      const context = ContextFactory.createBasicContext();
      
      contextManager.addMessage(context, 'user-1', 'I need help planning a complex project');
      
      const transformed = await transformer.transform(context, {
        analysisDepth: 'deep',
        includeReasoningChain: true,
        cognitiveFeatures: ['planning', 'reasoning', 'decision-making'],
      });
      
      expect(transformed.enrichment.cognitiveContext.taskType).toBe('planning');
      expect(transformed.enrichment.cognitiveContext.complexityLevel).toBeGreaterThan(0.5);
      expect(transformed.enrichment.cognitiveContext.requiredCapabilities).toContain('planning');
    });

    it('should validate portal context transformation', async () => {
      const transformer = new PortalContextTransformer();
      const context = ContextFactory.createBasicContext();
      
      contextManager.addMessage(context, 'user-1', 'Generate a creative story');
      
      const transformed = await transformer.transform(context, {
        optimizeForPortal: 'openai',
        includeSystemPrompts: true,
        tokenOptimization: true,
      });
      
      expect(transformed.enrichment.portalIntegration.optimizedFor).toBe('openai');
      expect(transformed.enrichment.portalIntegration.systemPrompts).toBeDefined();
      expect(transformed.enrichment.portalIntegration.tokenUsage).toBeDefined();
    });

    it('should validate transformation chain integrity', async () => {
      const memoryTransformer = new MemoryContextTransformer();
      const cognitionTransformer = new CognitionContextTransformer();
      const portalTransformer = new PortalContextTransformer();
      
      const context = ContextFactory.createBasicContext();
      contextManager.addMessage(context, 'user-1', 'Complex question requiring memory and reasoning');
      
      // Chain transformations
      const step1 = await memoryTransformer.transform(context, {});
      const step2 = await cognitionTransformer.transform(step1, {});
      const step3 = await portalTransformer.transform(step2, {});
      
      // Validate each step maintains integrity
      const validation1 = contextValidator.validateTransformation(context, step1);
      const validation2 = contextValidator.validateTransformation(step1, step2);
      const validation3 = contextValidator.validateTransformation(step2, step3);
      
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
      expect(validation3.isValid).toBe(true);
      
      // Final result should have all transformations
      expect(step3.enrichment.memoryIntegration).toBeDefined();
      expect(step3.enrichment.cognitiveContext).toBeDefined();
      expect(step3.enrichment.portalIntegration).toBeDefined();
    });

    it('should validate transformation rollback capability', async () => {
      const transformer = new MemoryContextTransformer();
      const originalContext = ContextFactory.createBasicContext();
      
      const transformed = await transformer.transform(originalContext, {});
      const rolledBack = transformer.rollback(transformed);
      
      // Should restore original structure while preserving essential data
      expect(rolledBack.id).toBe(originalContext.id);
      expect(rolledBack.messages).toEqual(originalContext.messages);
      expect(rolledBack.state).toEqual(originalContext.state);
    });
  });

  describe('Context Merging Validation', () => {
    it('should validate successful context merging', () => {
      const agent = AgentFactory.createBasicAgent();
      
      // Create two contexts with different data
      const context1 = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context1, 'user-1', 'First context message');
      
      const context2 = contextManager.getOrCreateContext(agent.id, 'user-2');
      contextManager.addMessage(context2, 'user-2', 'Second context message');
      
      const merged = contextManager.mergeContexts(context1.id, context2.id);
      
      expect(merged).toBeDefined();
      expect(merged!.messages).toHaveLength(2);
      expect(merged!.participants.has('user-1')).toBe(true);
      expect(merged!.participants.has('user-2')).toBe(true);
      
      // Validate merged context integrity
      const validation = contextValidator.validateContext(merged!);
      expect(validation.isValid).toBe(true);
    });

    it('should validate merge conflict resolution', () => {
      const agent = AgentFactory.createBasicAgent();
      
      // Create contexts with conflicting states
      const context1 = contextManager.getOrCreateContext(agent.id, 'user-1');
      context1.state.mood = 'positive';
      context1.state.phase = 'active';
      
      const context2 = contextManager.getOrCreateContext(agent.id, 'user-2');
      context2.state.mood = 'negative';
      context2.state.phase = 'closing';
      
      const merged = contextManager.mergeContexts(context1.id, context2.id);
      
      expect(merged).toBeDefined();
      // Should resolve conflicts intelligently
      expect(['positive', 'negative', 'neutral']).toContain(merged!.state.mood);
      expect(['active', 'closing']).toContain(merged!.state.phase);
    });

    it('should validate merge preservation of enrichment data', async () => {
      const agent = AgentFactory.createBasicAgent();
      
      const context1 = contextManager.getOrCreateContext(agent.id, 'user-1');
      contextManager.addMessage(context1, 'user-1', 'I love programming');
      
      const context2 = contextManager.getOrCreateContext(agent.id, 'user-2');
      contextManager.addMessage(context2, 'user-2', 'TypeScript is great');
      
      // Ensure both contexts are enriched
      await enrichmentPipeline.enrichContext(context1, agent);
      await enrichmentPipeline.enrichContext(context2, agent);
      
      const merged = contextManager.mergeContexts(context1.id, context2.id);
      
      expect(merged!.enrichment).toBeDefined();
      expect(merged!.enrichment.socialContext.participantCount).toBe(2);
      expect(merged!.topics.length).toBeGreaterThan(0);
    });

    it('should handle invalid merge scenarios', () => {
      // Attempt to merge non-existent context
      const merged1 = contextManager.mergeContexts('invalid-id-1', 'invalid-id-2');
      expect(merged1).toBeNull();
      
      // Attempt to merge contexts from different agents
      const agent1 = AgentFactory.createBasicAgent();
      agent1.id = 'agent-1';
      const agent2 = AgentFactory.createBasicAgent();
      agent2.id = 'agent-2';
      
      const context1 = contextManager.getOrCreateContext(agent1.id, 'user-1');
      const context2 = contextManager.getOrCreateContext(agent2.id, 'user-1');
      
      const merged2 = contextManager.mergeContexts(context1.id, context2.id);
      expect(merged2).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed context data', () => {
      const malformedContext = {
        id: null,
        agentId: undefined,
        messages: 'not-an-array',
        state: null,
      } as any;
      
      const validation = contextValidator.validateContext(malformedContext);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle corrupted enrichment data', async () => {
      const context = ContextFactory.createBasicContext();
      context.enrichment = null as any;
      
      // Should handle gracefully and provide fallback
      const enrichment = await enrichmentPipeline.enrichContext(context, AgentFactory.createBasicAgent());
      expect(enrichment).toBeDefined();
      expect(enrichment.isPartial).toBe(true);
    });

    it('should handle circular references in context data', () => {
      const context = ContextFactory.createBasicContext();
      
      // Create circular reference
      const circularObject: any = { self: null };
      circularObject.self = circularObject;
      context.metadata = { circular: circularObject };
      
      // Should not crash validation
      expect(() => {
        const validation = contextValidator.validateContext(context);
        expect(validation).toBeDefined();
      }).not.toThrow();
    });

    it('should handle extremely large context data', () => {
      const context = ContextFactory.createBasicContext();
      
      // Add many messages
      for (let i = 0; i < 10000; i++) {
        contextManager.addMessage(context, 'user-1', `Large context message ${i}`);
      }
      
      // Should handle validation efficiently
      const startTime = performance.now();
      const validation = contextValidator.validateContext(context);
      const endTime = performance.now();
      
      expect(validation).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent validation operations', async () => {
      const contexts = Array.from({ length: 50 }, () => ContextFactory.createBasicContext());
      
      const validations = await Promise.all(
        contexts.map(context => 
          Promise.resolve(contextValidator.validateContext(context))
        )
      );
      
      expect(validations).toHaveLength(50);
      expect(validations.every(v => v.isValid)).toBe(true);
    });

    it('should validate recovery from validation failures', async () => {
      const context = ContextFactory.createBasicContext();
      
      // Mock validation failure
      const originalValidate = contextValidator.validateContext;
      contextValidator.validateContext = () => {
        throw new Error('Validation failed');
      };
      
      // Should handle failure gracefully
      const result = await contextValidator.validateContext(context).catch(() => ({
        isValid: false,
        errors: [{ field: 'system', message: 'Validation system failure' }],
        warnings: [],
        score: 0,
        recoverable: true,
      }));
      
      expect(result.isValid).toBe(false);
      expect(result.recoverable).toBe(true);
      
      // Restore original method
      contextValidator.validateContext = originalValidate;
    });

    it('should validate schema compliance across versions', () => {
      const v1Context = {
        id: 'ctx_v1',
        agentId: 'agent-1',
        messages: [],
        state: { active: true },
        version: '1.0',
      };
      
      const v2Context = ContextFactory.createBasicContext();
      v2Context.version = '2.0';
      
      // Both versions should validate correctly
      const v1Validation = contextValidator.validateContext(v1Context as any);
      const v2Validation = contextValidator.validateContext(v2Context);
      
      expect(v1Validation.isValid).toBe(true);
      expect(v2Validation.isValid).toBe(true);
    });
  });

  describe('Performance and Scalability Validation', () => {
    it('should validate context operations under load', async () => {
      const contexts = Array.from({ length: 1000 }, (_, i) => {
        const context = contextManager.getOrCreateContext(`agent-${i}`, `user-${i}`);
        contextManager.addMessage(context, `user-${i}`, `Load test message ${i}`);
        return context;
      });
      
      const startTime = performance.now();
      const validations = contexts.map(context => contextValidator.validateContext(context));
      const endTime = performance.now();
      
      expect(validations.every(v => v.isValid)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should validate memory usage during validation', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create and validate many contexts
      for (let i = 0; i < 500; i++) {
        const context = ContextFactory.createBasicContext();
        contextManager.addMessage(context, 'user-1', `Memory test message ${i}`);
        contextValidator.validateContext(context);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // Should not have excessive memory growth
      expect(memoryGrowth).toBeLessThan(50);
    });

    it('should validate enrichment pipeline performance', async () => {
      const agent = AgentFactory.createBasicAgent();
      const contexts = Array.from({ length: 100 }, (_, i) => {
        const context = contextManager.getOrCreateContext(`${agent.id}-${i}`, 'user-1');
        contextManager.addMessage(context, 'user-1', `Performance test message ${i}`);
        return context;
      });
      
      const startTime = performance.now();
      const enrichments = await Promise.all(
        contexts.map(context => enrichmentPipeline.enrichContext(context, agent))
      );
      const endTime = performance.now();
      
      expect(enrichments).toHaveLength(100);
      expect(enrichments.every(e => e !== null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete in less than 10 seconds
    });
  });
});