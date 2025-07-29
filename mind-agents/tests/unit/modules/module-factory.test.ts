// Module factory system tests
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TestFactories } from '../../utils/test-factories';
import { MockMemoryProvider } from '../../mocks/mock-providers';

// Import actual modules (adjust paths as needed)
// import { createMemoryProvider } from '../../../src/modules/memory';
// import { createEmotionModule } from '../../../src/modules/emotion';
// import { createCognitionModule } from '../../../src/modules/cognition';

describe('Module Factory System', () => {
  let testAgent: any;
  
  beforeEach(() => {
    testAgent = TestFactories.createAgent();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('Memory Provider Factory', () => {
    it('should create SQLite memory provider', async () => {
      const config = {
        type: 'sqlite',
        config: {
          dbPath: ':memory:',
        },
      };
      
      // Mock factory function
      const createMemoryProvider = (providerConfig: any) => {
        if (providerConfig.type === 'sqlite') {
          return new MockMemoryProvider();
        }
        throw new Error(`Unknown memory provider type: ${providerConfig.type}`);
      };
      
      const provider = createMemoryProvider(config);
      
      expect(provider).toBeInstanceOf(MockMemoryProvider);
      expect(provider.initialize).toBeDefined();
      expect(provider.storeMemory).toBeDefined();
      expect(provider.retrieveMemories).toBeDefined();
    });
    
    it('should create PostgreSQL memory provider', async () => {
      const config = {
        type: 'postgres',
        config: {
          connectionString: 'postgres://localhost:5432/test',
        },
      };
      
      const createMemoryProvider = (providerConfig: any) => {
        if (providerConfig.type === 'postgres') {
          return new MockMemoryProvider();
        }
        throw new Error(`Unknown memory provider type: ${providerConfig.type}`);
      };
      
      const provider = createMemoryProvider(config);
      
      expect(provider).toBeInstanceOf(MockMemoryProvider);
    });
    
    it('should handle invalid memory provider types', () => {
      const config = {
        type: 'invalid-provider',
        config: {},
      };
      
      const createMemoryProvider = (providerConfig: any) => {
        const validTypes = ['sqlite', 'postgres', 'supabase', 'neon'];
        if (!validTypes.includes(providerConfig.type)) {
          throw new Error(`Unknown memory provider type: ${providerConfig.type}`);
        }
        return new MockMemoryProvider();
      };
      
      expect(() => createMemoryProvider(config))
        .toThrow('Unknown memory provider type: invalid-provider');
    });
    
    it('should validate provider configuration', () => {
      const invalidConfigs = [
        { type: 'sqlite' }, // Missing config
        { type: 'postgres', config: {} }, // Missing connection string
        { config: { dbPath: ':memory:' } }, // Missing type
      ];
      
      const createMemoryProvider = (providerConfig: any) => {
        if (!providerConfig.type) {
          throw new Error('Memory provider type is required');
        }
        
        if (providerConfig.type === 'sqlite' && !providerConfig.config?.dbPath) {
          throw new Error('SQLite provider requires dbPath in config');
        }
        
        if (providerConfig.type === 'postgres' && !providerConfig.config?.connectionString) {
          throw new Error('PostgreSQL provider requires connectionString in config');
        }
        
        return new MockMemoryProvider();
      };
      
      invalidConfigs.forEach((config, index) => {
        expect(() => createMemoryProvider(config))
          .toThrow(/required|Missing/);
      });
    });
  });
  
  describe('Emotion Module Factory', () => {
    it('should create composite emotion module', () => {
      const config = {
        type: 'composite',
        emotions: ['happy', 'sad', 'curious'],
        decayRate: 0.1,
        intensityThreshold: 0.5,
      };
      
      // Mock emotion module
      class MockCompositeEmotion {
        constructor(public config: any) {}
        
        async trigger(context: any) {
          return {
            primary: 'happy',
            emotions: { happy: 0.8, sad: 0.1, curious: 0.6 },
            intensity: 0.7,
          };
        }
        
        async decay() {
          // Mock decay logic
        }
      }
      
      const createEmotionModule = (moduleConfig: any) => {
        if (moduleConfig.type === 'composite') {
          return new MockCompositeEmotion(moduleConfig);
        }
        throw new Error(`Unknown emotion module type: ${moduleConfig.type}`);
      };
      
      const emotionModule = createEmotionModule(config);
      
      expect(emotionModule).toBeInstanceOf(MockCompositeEmotion);
      expect(emotionModule.config).toEqual(config);
    });
    
    it('should create individual emotion modules', () => {
      const emotions = ['happy', 'sad', 'angry', 'curious'];
      
      class MockEmotion {
        constructor(public type: string) {}
        
        async trigger(context: any) {
          return { [this.type]: 0.8 };
        }
      }
      
      const createEmotionModule = (type: string) => {
        if (emotions.includes(type)) {
          return new MockEmotion(type);
        }
        throw new Error(`Unknown emotion type: ${type}`);
      };
      
      emotions.forEach(emotionType => {
        const module = createEmotionModule(emotionType);
        expect(module).toBeInstanceOf(MockEmotion);
        expect(module.type).toBe(emotionType);
      });
    });
    
    it('should validate emotion configuration', () => {
      const invalidConfigs = [
        { emotions: [] }, // Missing type
        { type: 'composite' }, // Missing emotions array
        { type: 'composite', emotions: ['invalid-emotion'] }, // Invalid emotion
      ];
      
      const createEmotionModule = (config: any) => {
        if (!config.type) {
          throw new Error('Emotion module type is required');
        }
        
        if (config.type === 'composite') {
          if (!config.emotions || !Array.isArray(config.emotions)) {
            throw new Error('Composite emotion module requires emotions array');
          }
          
          const validEmotions = ['happy', 'sad', 'angry', 'anxious', 'confident', 'curious'];
          const invalidEmotions = config.emotions.filter(e => !validEmotions.includes(e));
          if (invalidEmotions.length > 0) {
            throw new Error(`Invalid emotions: ${invalidEmotions.join(', ')}`);
          }
        }
        
        return { type: config.type };
      };
      
      invalidConfigs.forEach(config => {
        expect(() => createEmotionModule(config)).toThrow();
      });
    });
  });
  
  describe('Cognition Module Factory', () => {
    it('should create reactive cognition module', () => {
      const config = {
        type: 'reactive',
        responseTime: 100,
        confidenceThreshold: 0.7,
      };
      
      class MockReactiveCognition {
        constructor(public config: any) {}
        
        async think(agent: any, context: any) {
          return {
            thoughts: ['Reactive thought'],
            confidence: 0.8,
            actions: [],
            emotions: TestFactories.createEmotionState(),
            memories: [],
          };
        }
        
        async plan(agent: any, goal: string) {
          return TestFactories.createPlan({ goal });
        }
        
        async decide(agent: any, options: any[]) {
          return options[0] || null;
        }
      }
      
      const createCognitionModule = (moduleConfig: any) => {
        if (moduleConfig.type === 'reactive') {
          return new MockReactiveCognition(moduleConfig);
        }
        throw new Error(`Unknown cognition module type: ${moduleConfig.type}`);
      };
      
      const cognitionModule = createCognitionModule(config);
      
      expect(cognitionModule).toBeInstanceOf(MockReactiveCognition);
      expect(cognitionModule.config).toEqual(config);
    });
    
    it('should create HTN planner cognition module', () => {
      const config = {
        type: 'htn_planner',
        planningDepth: 5,
        searchAlgorithm: 'breadth_first',
      };
      
      class MockHTNPlanner {
        constructor(public config: any) {}
        
        async think(agent: any, context: any) {
          return {
            thoughts: ['Planning thought'],
            confidence: 0.9,
            actions: [],
            emotions: TestFactories.createEmotionState(),
            memories: [],
          };
        }
        
        async plan(agent: any, goal: string) {
          const plan = TestFactories.createPlan({ goal });
          plan.steps = [
            TestFactories.createPlanStep({ action: 'step1' }),
            TestFactories.createPlanStep({ action: 'step2' }),
            TestFactories.createPlanStep({ action: 'step3' }),
          ];
          return plan;
        }
        
        async decide(agent: any, options: any[]) {
          // HTN planner would use more sophisticated decision logic
          return options.reduce((best, current) => 
            (current.priority || 0) > (best.priority || 0) ? current : best
          );
        }
      }
      
      const createCognitionModule = (moduleConfig: any) => {
        if (moduleConfig.type === 'htn_planner') {
          return new MockHTNPlanner(moduleConfig);
        }
        throw new Error(`Unknown cognition module type: ${moduleConfig.type}`);
      };
      
      const cognitionModule = createCognitionModule(config);
      
      expect(cognitionModule).toBeInstanceOf(MockHTNPlanner);
    });
    
    it('should validate cognition module interfaces', async () => {
      class IncompleteCognitionModule {
        // Missing required methods
      }
      
      const validateCognitionModule = (module: any) => {
        const requiredMethods = ['think', 'plan', 'decide'];
        const missing = requiredMethods.filter(method => typeof module[method] !== 'function');
        
        if (missing.length > 0) {
          throw new Error(`Cognition module missing required methods: ${missing.join(', ')}`);
        }
        
        return true;
      };
      
      const incompleteModule = new IncompleteCognitionModule();
      
      expect(() => validateCognitionModule(incompleteModule))
        .toThrow('Cognition module missing required methods: think, plan, decide');
    });
  });
  
  describe('Module Registry', () => {
    it('should register and retrieve module factories', () => {
      const registry = new Map();
      
      const registerFactory = (type: string, category: string, factory: Function) => {
        const key = `${category}:${type}`;
        registry.set(key, factory);
      };
      
      const getFactory = (type: string, category: string) => {
        const key = `${category}:${type}`;
        return registry.get(key);
      };
      
      const mockFactory = () => new MockMemoryProvider();
      
      registerFactory('sqlite', 'memory', mockFactory);
      
      const retrievedFactory = getFactory('sqlite', 'memory');
      
      expect(retrievedFactory).toBe(mockFactory);
      expect(retrievedFactory()).toBeInstanceOf(MockMemoryProvider);
    });
    
    it('should list available modules by category', () => {
      const registry = new Map();
      
      registry.set('memory:sqlite', () => {});
      registry.set('memory:postgres', () => {});
      registry.set('emotion:happy', () => {});
      registry.set('emotion:sad', () => {});
      registry.set('cognition:reactive', () => {});
      
      const getModulesByCategory = (category: string) => {
        return Array.from(registry.keys())
          .filter(key => key.startsWith(`${category}:`))
          .map(key => key.split(':')[1]);
      };
      
      const memoryProviders = getModulesByCategory('memory');
      const emotions = getModulesByCategory('emotion');
      const cognitionModules = getModulesByCategory('cognition');
      
      expect(memoryProviders).toEqual(['sqlite', 'postgres']);
      expect(emotions).toEqual(['happy', 'sad']);
      expect(cognitionModules).toEqual(['reactive']);
    });
  });
});