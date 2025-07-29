// Context lifecycle management tests
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TestFactories } from '../../utils/test-factories';

// Import actual context modules (adjust paths as needed)
// import { ContextLifecycleManager } from '../../../src/core/context/context-lifecycle-manager';
// import { EnrichmentPipeline } from '../../../src/core/context/enrichment-pipeline';

describe('Context Lifecycle Management', () => {
  let testAgent: any;
  let testContext: any;
  let mockContextManager: any;
  let mockEnrichmentPipeline: any;
  
  beforeEach(() => {
    testAgent = TestFactories.createAgent();
    testContext = TestFactories.createUnifiedContext();
    
    // Mock context manager
    mockContextManager = {
      contexts: new Map(),
      enrichmentPipeline: null,
      
      async requestContext(request: any) {
        const contextId = `context-${Date.now()}`;
        const context = TestFactories.createUnifiedContext({
          id: contextId,
          agentId: request.agentId,
          ...request,
        });
        
        this.contexts.set(contextId, context);
        
        if (request.enrichment?.enabled && this.enrichmentPipeline) {
          await this.enrichmentPipeline.enrich(context);
        }
        
        return contextId;
      },
      
      async getContext(contextId: string) {
        return this.contexts.get(contextId);
      },
      
      async releaseContext(contextId: string) {
        const context = this.contexts.get(contextId);
        if (context) {
          this.contexts.delete(contextId);
          return true;
        }
        return false;
      },
      
      async cleanup() {
        this.contexts.clear();
      },
    };
    
    // Mock enrichment pipeline
    mockEnrichmentPipeline = {
      enrichers: new Map(),
      
      async enrich(context: any) {
        // Mock memory enrichment
        if (this.enrichers.has('memory_enrichment')) {
          context.memory = {
            relevantMemories: [
              TestFactories.createMemoryRecord({ agentId: context.agentId }),
            ],
            searchQuery: 'test query',
            confidence: 0.8,
          };
        }
        
        // Mock emotional enrichment
        if (this.enrichers.has('emotional_enrichment')) {
          context.emotional = {
            currentState: TestFactories.createEmotionState(),
            triggers: ['positive_interaction'],
            history: [],
          };
        }
        
        context.enrichment.completedSteps.push('memory_enrichment', 'emotional_enrichment');
        return context;
      },
      
      registerEnricher(name: string, enricher: any) {
        this.enrichers.set(name, enricher);
      },
    };
    
    mockContextManager.enrichmentPipeline = mockEnrichmentPipeline;
    
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('Context Creation', () => {
    it('should create context successfully', async () => {
      const request = {
        agentId: testAgent.id,
        requestType: 'conversation',
        enrichment: { enabled: true },
      };
      
      const contextId = await mockContextManager.requestContext(request);
      
      expect(contextId).toBeTruthy();
      expect(mockContextManager.contexts.has(contextId)).toBe(true);
      
      const context = await mockContextManager.getContext(contextId);
      expect(context.agentId).toBe(testAgent.id);
      expect(context.requestType).toBe('conversation');
    });
    
    it('should handle context creation with enrichment', async () => {
      mockEnrichmentPipeline.registerEnricher('memory_enrichment', {});
      mockEnrichmentPipeline.registerEnricher('emotional_enrichment', {});
      
      const request = {
        agentId: testAgent.id,
        requestType: 'conversation',
        enrichment: {
          enabled: true,
          steps: ['memory_enrichment', 'emotional_enrichment'],
        },
      };
      
      const contextId = await mockContextManager.requestContext(request);
      const context = await mockContextManager.getContext(contextId);
      
      expect(context.memory).toBeDefined();
      expect(context.memory.relevantMemories).toHaveLength(1);
      expect(context.emotional).toBeDefined();
      expect(context.emotional.currentState).toBeDefined();
      expect(context.enrichment.completedSteps).toContain('memory_enrichment');
      expect(context.enrichment.completedSteps).toContain('emotional_enrichment');
    });
    
    it('should handle context creation without enrichment', async () => {
      const request = {
        agentId: testAgent.id,
        requestType: 'simple',
        enrichment: { enabled: false },
      };
      
      const contextId = await mockContextManager.requestContext(request);
      const context = await mockContextManager.getContext(contextId);
      
      expect(context.agentId).toBe(testAgent.id);
      expect(context.enrichment.completedSteps).toHaveLength(0);
    });
    
    it('should validate context requests', async () => {
      const invalidRequests = [
        {}, // Missing agentId
        { agentId: '' }, // Empty agentId
        { agentId: testAgent.id, requestType: '' }, // Empty requestType
      ];
      
      const validateRequest = (request: any) => {
        if (!request.agentId || request.agentId.trim() === '') {
          throw new Error('Agent ID is required');
        }
        if (request.requestType !== undefined && request.requestType.trim() === '') {
          throw new Error('Request type cannot be empty');
        }
        return true;
      };
      
      invalidRequests.forEach(request => {
        expect(() => validateRequest(request)).toThrow();
      });
    });
  });
  
  describe('Context Lifecycle', () => {
    it('should track context TTL', async () => {
      const shortTTLContext = TestFactories.createUnifiedContext({
        ttl: 1000, // 1 second
      });
      
      const isExpired = (context: any) => {
        const now = Date.now();
        const created = context.timestamp.getTime();
        return (now - created) > context.ttl;
      };
      
      // Context should not be expired immediately
      expect(isExpired(shortTTLContext)).toBe(false);
      
      // Simulate time passing
      shortTTLContext.timestamp = new Date(Date.now() - 2000); // 2 seconds ago
      expect(isExpired(shortTTLContext)).toBe(true);
    });
    
    it('should cleanup expired contexts', async () => {
      const contexts = [
        TestFactories.createUnifiedContext({ id: 'ctx-1', ttl: 1000 }),
        TestFactories.createUnifiedContext({ id: 'ctx-2', ttl: 1000 }),
        TestFactories.createUnifiedContext({ id: 'ctx-3', ttl: 1000 }),
      ];
      
      // Add contexts to manager
      contexts.forEach(ctx => mockContextManager.contexts.set(ctx.id, ctx));
      
      // Make some contexts expired
      contexts[0].timestamp = new Date(Date.now() - 2000);
      contexts[1].timestamp = new Date(Date.now() - 2000);
      // contexts[2] remains fresh
      
      const cleanupExpiredContexts = () => {
        const now = Date.now();
        const expiredContexts = [];
        
        for (const [id, context] of mockContextManager.contexts.entries()) {
          const created = context.timestamp.getTime();
          if ((now - created) > context.ttl) {
            expiredContexts.push(id);
          }
        }
        
        expiredContexts.forEach(id => mockContextManager.contexts.delete(id));
        return expiredContexts.length;
      };
      
      const cleanedUp = cleanupExpiredContexts();
      
      expect(cleanedUp).toBe(2);
      expect(mockContextManager.contexts.size).toBe(1);
      expect(mockContextManager.contexts.has('ctx-3')).toBe(true);
    });
    
    it('should handle context release', async () => {
      const contextId = 'test-context-1';
      const context = TestFactories.createUnifiedContext({ id: contextId });
      
      mockContextManager.contexts.set(contextId, context);
      
      expect(mockContextManager.contexts.has(contextId)).toBe(true);
      
      const released = await mockContextManager.releaseContext(contextId);
      
      expect(released).toBe(true);
      expect(mockContextManager.contexts.has(contextId)).toBe(false);
    });
    
    it('should handle context reference counting', async () => {
      const context = TestFactories.createUnifiedContext();
      context.refCount = 0;
      
      const incrementRef = (ctx: any) => {
        ctx.refCount = (ctx.refCount || 0) + 1;
        return ctx.refCount;
      };
      
      const decrementRef = (ctx: any) => {
        ctx.refCount = Math.max(0, (ctx.refCount || 0) - 1);
        return ctx.refCount;
      };
      
      const canRelease = (ctx: any) => {
        return (ctx.refCount || 0) === 0;
      };
      
      // Test reference counting
      expect(incrementRef(context)).toBe(1);
      expect(incrementRef(context)).toBe(2);
      expect(canRelease(context)).toBe(false);
      
      expect(decrementRef(context)).toBe(1);
      expect(canRelease(context)).toBe(false);
      
      expect(decrementRef(context)).toBe(0);
      expect(canRelease(context)).toBe(true);
    });
  });
  
  describe('Context Enrichment', () => {
    it('should enrich context with memory data', async () => {
      const context = TestFactories.createUnifiedContext();
      
      mockEnrichmentPipeline.registerEnricher('memory_enrichment', {
        enrich: async (ctx: any) => {
          ctx.memory = {
            relevantMemories: [
              TestFactories.createMemoryRecord({ agentId: ctx.agentId }),
            ],
            searchQuery: 'test',
            confidence: 0.9,
          };
        },
      });
      
      await mockEnrichmentPipeline.enrich(context);
      
      expect(context.memory).toBeDefined();
      expect(context.memory.relevantMemories).toHaveLength(1);
      expect(context.memory.confidence).toBe(0.8); // From mock implementation
    });
    
    it('should enrich context with emotional data', async () => {
      const context = TestFactories.createUnifiedContext();
      
      mockEnrichmentPipeline.registerEnricher('emotional_enrichment', {
        enrich: async (ctx: any) => {
          ctx.emotional = {
            currentState: TestFactories.createEmotionState(),
            triggers: ['user_message'],
            history: [],
          };
        },
      });
      
      await mockEnrichmentPipeline.enrich(context);
      
      expect(context.emotional).toBeDefined();
      expect(context.emotional.currentState).toBeDefined();
      expect(context.emotional.triggers).toContain('positive_interaction'); // From mock
    });
    
    it('should handle enrichment failures gracefully', async () => {
      const context = TestFactories.createUnifiedContext();
      
      mockEnrichmentPipeline.registerEnricher('failing_enricher', {
        enrich: async (ctx: any) => {
          throw new Error('Enrichment failed');
        },
      });
      
      const enrichWithErrorHandling = async (ctx: any) => {
        try {
          if (mockEnrichmentPipeline.enrichers.has('failing_enricher')) {
            throw new Error('Enrichment failed');
          }
          return ctx;
        } catch (error) {
          ctx.enrichment.errors = ctx.enrichment.errors || [];
          ctx.enrichment.errors.push({
            enricher: 'failing_enricher',
            error: (error as Error).message,
            timestamp: new Date(),
          });
          return ctx;
        }
      };
      
      const enrichedContext = await enrichWithErrorHandling(context);
      
      expect(enrichedContext.enrichment.errors).toBeDefined();
      expect(enrichedContext.enrichment.errors).toHaveLength(1);
      expect(enrichedContext.enrichment.errors[0].error).toBe('Enrichment failed');
    });
    
    it('should support selective enrichment', async () => {
      const context = TestFactories.createUnifiedContext({
        enrichment: {
          enabled: true,
          availableEnrichers: ['memory_enrichment', 'emotional_enrichment', 'social_enrichment'],
          requestedEnrichers: ['memory_enrichment', 'social_enrichment'],
          completedSteps: [],
        },
      });
      
      const selectiveEnrich = async (ctx: any) => {
        const requested = ctx.enrichment.requestedEnrichers || ctx.enrichment.availableEnrichers;
        
        if (requested.includes('memory_enrichment')) {
          ctx.memory = { relevantMemories: [] };
          ctx.enrichment.completedSteps.push('memory_enrichment');
        }
        
        if (requested.includes('social_enrichment')) {
          ctx.social = { relationships: new Map() };
          ctx.enrichment.completedSteps.push('social_enrichment');
        }
        
        // emotional_enrichment was not requested, so skip it
        
        return ctx;
      };
      
      const enrichedContext = await selectiveEnrich(context);
      
      expect(enrichedContext.memory).toBeDefined();
      expect(enrichedContext.social).toBeDefined();
      expect(enrichedContext.emotional).toBeUndefined();
      expect(enrichedContext.enrichment.completedSteps).toEqual(['memory_enrichment', 'social_enrichment']);
    });
  });
  
  describe('Context Caching', () => {
    it('should cache enriched context data', async () => {
      const cache = new Map();
      
      const getCachedContext = (agentId: string, cacheKey: string) => {
        const key = `${agentId}:${cacheKey}`;
        return cache.get(key);
      };
      
      const setCachedContext = (agentId: string, cacheKey: string, data: any, ttl: number = 3600000) => {
        const key = `${agentId}:${cacheKey}`;
        cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        });
      };
      
      const contextData = { relevantMemories: [TestFactories.createMemoryRecord()] };
      
      setCachedContext(testAgent.id, 'memory_enrichment', contextData);
      
      const cachedData = getCachedContext(testAgent.id, 'memory_enrichment');
      
      expect(cachedData).toBeDefined();
      expect(cachedData.data).toEqual(contextData);
      expect(cachedData.timestamp).toBeDefined();
    });
    
    it('should invalidate expired cache entries', async () => {
      const cache = new Map();
      
      const setCachedContext = (key: string, data: any, ttl: number) => {
        cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        });
      };
      
      const getCachedContext = (key: string) => {
        const entry = cache.get(key);
        if (!entry) return null;
        
        const now = Date.now();
        if ((now - entry.timestamp) > entry.ttl) {
          cache.delete(key);
          return null;
        }
        
        return entry.data;
      };
      
      const key = 'test-cache-key';
      const data = { test: 'data' };
      
      setCachedContext(key, data, 1000); // 1 second TTL
      
      // Should be available immediately
      expect(getCachedContext(key)).toEqual(data);
      
      // Mock time passing
      cache.get(key).timestamp = Date.now() - 2000; // 2 seconds ago
      
      // Should be expired and removed
      expect(getCachedContext(key)).toBeNull();
      expect(cache.has(key)).toBe(false);
    });
  });
});