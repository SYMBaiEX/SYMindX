/**
 * @module registry.test
 * @description Module Registry Test Suite - Comprehensive tests for the module registry system
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { SYMindXModuleRegistry } from './registry.js';
import type { 
  MemoryProvider, 
  EmotionModule, 
  CognitionModule, 
  Extension, 
  Portal,
  ModuleFactory,
  Agent,
  AgentConfig,
  MemoryRecord,
  ThoughtContext,
  ThoughtResult,
  ExtensionAction,
  ActionResult,
  PortalResponse,
  Message,
  EmotionState,
  InitializationResult,
  CleanupResult,
  OperationResult,
  ExecutionResult,
  EventProcessingResult,
  AgentEvent,
  AgentAction,
  AgentState,
  AgentStateTransitionResult,
} from '../types/index.js';

describe('SYMindXModuleRegistry', () => {
  let registry: SYMindXModuleRegistry;

  beforeEach(() => {
    registry = new SYMindXModuleRegistry();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Memory Provider Registration', () => {
    let mockMemoryProvider: MemoryProvider;

    beforeEach(() => {
      mockMemoryProvider = {
        initialize: mock(async (): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Memory provider initialized',
          resourcesInitialized: ['database'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Memory provider cleaned up',
          resourcesReleased: ['database'],
        })),
        
        store: mock(async (agentId: string, record: MemoryRecord): Promise<void> => {
          // Mock store implementation
        }),
        
        retrieve: mock(async (agentId: string, query: string, limit?: number): Promise<MemoryRecord[]> => {
          return [];
        }),
        
        search: mock(async (agentId: string, query: string, options?: any): Promise<MemoryRecord[]> => {
          return [];
        }),
        
        delete: mock(async (agentId: string, recordId: string): Promise<boolean> => {
          return true;
        }),
        
        clear: mock(async (agentId: string): Promise<void> => {
          // Mock clear implementation
        }),
        
        getStats: mock((): Record<string, any> => ({})),
        
        healthCheck: mock(async (): Promise<boolean> => true),
      };
    });

    it('should register memory provider', () => {
      registry.registerMemoryProvider('test-memory', mockMemoryProvider);
      
      const provider = registry.getMemoryProvider('test-memory');
      expect(provider).toBe(mockMemoryProvider);
    });

    it('should register memory provider factory', () => {
      const factory: ModuleFactory<MemoryProvider> = mock(() => mockMemoryProvider);
      
      registry.registerMemoryProviderFactory('test-memory', factory);
      
      const provider = registry.createMemoryProvider('test-memory', {});
      expect(provider).toBe(mockMemoryProvider);
      expect(factory).toHaveBeenCalledWith({});
    });

    it('should list memory providers', () => {
      registry.registerMemoryProvider('provider1', mockMemoryProvider);
      registry.registerMemoryProvider('provider2', mockMemoryProvider);
      
      const providers = registry.listMemoryProviders();
      expect(providers).toContain('provider1');
      expect(providers).toContain('provider2');
      expect(providers).toHaveLength(2);
    });

    it('should return undefined for non-existent provider', () => {
      const provider = registry.getMemoryProvider('non-existent');
      expect(provider).toBeUndefined();
    });
  });

  describe('Emotion Module Registration', () => {
    let mockEmotionModule: EmotionModule;

    beforeEach(() => {
      mockEmotionModule = {
        initialize: mock(async (): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Emotion module initialized',
          resourcesInitialized: ['emotions'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Emotion module cleaned up',
          resourcesReleased: ['emotions'],
        })),
        
        current: 'neutral',
        intensity: 0.5,
        triggers: [],
        history: [],
        timestamp: new Date(),
        
        setEmotion: mock((emotion: string, intensity: number, triggers: string[]): void => {
          // Mock implementation
        }),
        
        updateIntensity: mock((delta: number): void => {
          // Mock implementation
        }),
        
        addTrigger: mock((trigger: string): void => {
          // Mock implementation
        }),
        
        getState: mock((): EmotionState => ({
          current: 'neutral',
          intensity: 0.5,
          triggers: [],
          history: [],
          timestamp: new Date(),
        })),
        
        processEvent: mock((event: any): void => {
          // Mock implementation
        }),
        
        tick: mock((): void => {
          // Mock implementation
        }),
      };
    });

    it('should register emotion module', () => {
      registry.registerEmotionModule('test-emotion', mockEmotionModule);
      
      const module = registry.getEmotionModule('test-emotion');
      expect(module).toBe(mockEmotionModule);
    });

    it('should register emotion module factory', () => {
      const factory: ModuleFactory<EmotionModule> = mock(() => mockEmotionModule);
      
      registry.registerEmotionModuleFactory('test-emotion', factory);
      
      const module = registry.createEmotionModule('test-emotion', {});
      expect(module).toBe(mockEmotionModule);
      expect(factory).toHaveBeenCalledWith({});
    });

    it('should list emotion modules', () => {
      registry.registerEmotionModule('emotion1', mockEmotionModule);
      registry.registerEmotionModule('emotion2', mockEmotionModule);
      
      const modules = registry.listEmotionModules();
      expect(modules).toContain('emotion1');
      expect(modules).toContain('emotion2');
      expect(modules).toHaveLength(2);
    });
  });

  describe('Cognition Module Registration', () => {
    let mockCognitionModule: CognitionModule;

    beforeEach(() => {
      mockCognitionModule = {
        initialize: mock(async (): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Cognition module initialized',
          resourcesInitialized: ['cognition'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Cognition module cleaned up',
          resourcesReleased: ['cognition'],
        })),
        
        think: mock(async (agent: Agent, context: ThoughtContext): Promise<ThoughtResult> => ({
          thoughts: ['Test thought'],
          emotions: {
            current: 'neutral',
            intensity: 0.5,
            triggers: [],
            history: [],
            timestamp: new Date(),
          },
          actions: [],
          memories: [],
          confidence: 0.8,
        })),
        
        plan: mock(async (agent: Agent, goal: string): Promise<any> => ({
          id: 'plan-1',
          goal,
          steps: [],
          priority: 1,
          estimatedDuration: 1000,
          dependencies: [],
          status: 'active',
        })),
        
        decide: mock(async (agent: Agent, options: any[]): Promise<any> => ({
          id: 'decision-1',
          option: options[0],
          confidence: 0.8,
          reasoning: 'Test reasoning',
          timestamp: new Date(),
        })),
      };
    });

    it('should register cognition module', () => {
      registry.registerCognitionModule('test-cognition', mockCognitionModule);
      
      const module = registry.getCognitionModule('test-cognition');
      expect(module).toBe(mockCognitionModule);
    });

    it('should register cognition module factory', () => {
      const factory: ModuleFactory<CognitionModule> = mock(() => mockCognitionModule);
      
      registry.registerCognitionModuleFactory('test-cognition', factory);
      
      const module = registry.createCognitionModule('test-cognition', {});
      expect(module).toBe(mockCognitionModule);
      expect(factory).toHaveBeenCalledWith({});
    });

    it('should list cognition modules', () => {
      registry.registerCognitionModule('cognition1', mockCognitionModule);
      registry.registerCognitionModule('cognition2', mockCognitionModule);
      
      const modules = registry.listCognitionModules();
      expect(modules).toContain('cognition1');
      expect(modules).toContain('cognition2');
      expect(modules).toHaveLength(2);
    });
  });

  describe('Extension Registration', () => {
    let mockExtension: Extension;

    beforeEach(() => {
      mockExtension = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        enabled: true,
        priority: 1,
        
        actions: {
          testAction: {
            id: 'test-action',
            name: 'Test Action',
            description: 'A test action',
            parameters: {},
            execute: mock(async (agent: Agent, params: any): Promise<ActionResult> => ({
              success: true,
              type: 'info',
              result: 'Action executed',
            })),
          },
        },
        
        events: {},
        
        init: mock(async (agent: Agent): Promise<void> => {
          // Mock initialization
        }),
        
        tick: mock(async (agent: Agent): Promise<void> => {
          // Mock tick
        }),
        
        initialize: mock(async (): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Extension initialized',
          resourcesInitialized: ['extension'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Extension cleaned up',
          resourcesReleased: ['extension'],
        })),
      };
    });

    it('should register extension', () => {
      registry.registerExtension('test-extension', mockExtension);
      
      const extension = registry.getExtension('test-extension');
      expect(extension).toBe(mockExtension);
    });

    it('should register extension factory', () => {
      const factory: ModuleFactory<Extension> = mock(() => mockExtension);
      
      registry.registerExtensionFactory('test-extension', factory);
      
      const extension = registry.createExtension('test-extension', {});
      expect(extension).toBe(mockExtension);
      expect(factory).toHaveBeenCalledWith({});
    });

    it('should list extensions', () => {
      registry.registerExtension('extension1', mockExtension);
      registry.registerExtension('extension2', mockExtension);
      
      const extensions = registry.listExtensions();
      expect(extensions).toContain('extension1');
      expect(extensions).toContain('extension2');
      expect(extensions).toHaveLength(2);
    });
  });

  describe('Portal Registration', () => {
    let mockPortal: Portal;

    beforeEach(() => {
      mockPortal = {
        id: 'test-portal',
        name: 'Test Portal',
        type: 'test',
        enabled: true,
        apiKey: 'test-key',
        
        initialize: mock(async (): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Portal initialized',
          resourcesInitialized: ['portal'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Portal cleaned up',
          resourcesReleased: ['portal'],
        })),
        
        init: mock(async (agent: Agent): Promise<void> => {
          // Mock initialization
        }),
        
        generateResponse: mock(async (messages: Message[]): Promise<PortalResponse> => ({
          content: 'Test response',
          model: 'test-model',
          usage: {
            totalTokens: 100,
            promptTokens: 50,
            completionTokens: 50,
          },
          timestamp: new Date(),
        })),
        
        streamResponse: mock(async function* (messages: Message[]): AsyncGenerator<string> {
          yield 'Test';
          yield ' response';
        }),
        
        hasCapability: mock((capability: string): boolean => {
          return capability === 'chat';
        }),
        
        validateConfig: mock((): boolean => true),
        
        getModels: mock((): string[] => ['test-model']),
        
        healthCheck: mock(async (): Promise<boolean> => true),
      };
    });

    it('should register portal', () => {
      registry.registerPortal('test-portal', mockPortal);
      
      const portal = registry.getPortal('test-portal');
      expect(portal).toBe(mockPortal);
    });

    it('should register portal factory', () => {
      const factory: ModuleFactory<Portal> = mock(() => mockPortal);
      
      registry.registerPortalFactory('test-portal', factory);
      
      const portal = registry.createPortal('test-portal', {});
      expect(portal).toBe(mockPortal);
      expect(factory).toHaveBeenCalledWith({});
    });

    it('should list portals', () => {
      registry.registerPortal('portal1', mockPortal);
      registry.registerPortal('portal2', mockPortal);
      
      const portals = registry.listPortals();
      expect(portals).toContain('portal1');
      expect(portals).toContain('portal2');
      expect(portals).toHaveLength(2);
    });

    it('should list portal factories', () => {
      const factory: ModuleFactory<Portal> = mock(() => mockPortal);
      
      registry.registerPortalFactory('portal1', factory);
      registry.registerPortalFactory('portal2', factory);
      
      const factories = registry.listPortalFactories();
      expect(factories).toContain('portal1');
      expect(factories).toContain('portal2');
      expect(factories).toHaveLength(2);
    });
  });

  describe('Agent Registration', () => {
    let mockAgent: Agent;

    beforeEach(() => {
      mockAgent = {
        id: 'test-agent',
        name: 'Test Agent',
        status: 'idle',
        lastUpdate: new Date(),
        config: {} as AgentConfig,
        
        emotion: {} as EmotionModule,
        memory: {} as MemoryProvider,
        cognition: {} as CognitionModule,
        extensions: [],
        
        initialize: mock(async (config: AgentConfig): Promise<InitializationResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Agent initialized',
          resourcesInitialized: ['agent'],
        })),
        
        cleanup: mock(async (): Promise<CleanupResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Agent cleaned up',
          resourcesReleased: ['agent'],
        })),
        
        tick: mock(async (): Promise<OperationResult> => ({
          success: true,
          timestamp: new Date(),
        })),
        
        updateState: mock(async (newState: Partial<AgentState>): Promise<AgentStateTransitionResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'State updated',
          agentId: 'test-agent',
          transition: {
            from: 'idle',
            to: 'active',
            trigger: 'manual',
            duration: 100,
          },
        })),
        
        processEvent: mock(async (event: AgentEvent): Promise<EventProcessingResult> => ({
          success: true,
          timestamp: new Date(),
          message: 'Event processed',
          eventProcessed: true,
        })),
        
        executeAction: mock(async (action: AgentAction): Promise<ExecutionResult> => ({
          success: true,
          timestamp: new Date(),
          data: { result: 'Action executed' },
          duration: 100,
        })),
      };
    });

    it('should register agent factory', () => {
      const factory: ModuleFactory<Agent> = mock(() => mockAgent);
      
      registry.registerAgentFactory('test-agent', factory);
      
      const agent = registry.getAgentFactory('test-agent');
      expect(agent).toBe(factory);
    });

    it('should register lazy agent', () => {
      const loader = mock(async () => mockAgent);
      
      registry.registerLazyAgent('test-agent', loader);
      
      const lazyLoader = registry.getLazyAgent('test-agent');
      expect(lazyLoader).toBe(loader);
    });

    it('should list lazy agents', () => {
      const loader1 = mock(async () => mockAgent);
      const loader2 = mock(async () => mockAgent);
      
      registry.registerLazyAgent('agent1', loader1);
      registry.registerLazyAgent('agent2', loader2);
      
      const agents = registry.listLazyAgents();
      expect(agents).toContain('agent1');
      expect(agents).toContain('agent2');
      expect(agents).toHaveLength(2);
    });
  });

  describe('Tool System Registration', () => {
    it('should register tool system', () => {
      const mockToolSystem = {
        name: 'test-tools',
        version: '1.0.0',
        tools: {},
      };
      
      registry.registerToolSystem('test-tools', mockToolSystem);
      
      const toolSystem = registry.getToolSystem('test-tools');
      expect(toolSystem).toBe(mockToolSystem);
    });

    it('should list tool systems', () => {
      const mockToolSystem1 = { name: 'tools1', version: '1.0.0', tools: {} };
      const mockToolSystem2 = { name: 'tools2', version: '1.0.0', tools: {} };
      
      registry.registerToolSystem('tools1', mockToolSystem1);
      registry.registerToolSystem('tools2', mockToolSystem2);
      
      const toolSystems = registry.listToolSystems();
      expect(toolSystems).toContain('tools1');
      expect(toolSystems).toContain('tools2');
      expect(toolSystems).toHaveLength(2);
    });
  });

  describe('Registry Management', () => {
    it('should check if modules are registered', () => {
      const mockMemoryProvider = {} as MemoryProvider;
      
      expect(registry.hasMemoryProvider('test-memory')).toBe(false);
      
      registry.registerMemoryProvider('test-memory', mockMemoryProvider);
      expect(registry.hasMemoryProvider('test-memory')).toBe(true);
    });

    it('should clear all registrations', () => {
      // Register various modules
      registry.registerMemoryProvider('memory', {} as MemoryProvider);
      registry.registerEmotionModule('emotion', {} as EmotionModule);
      registry.registerCognitionModule('cognition', {} as CognitionModule);
      registry.registerExtension('extension', {} as Extension);
      registry.registerPortal('portal', {} as Portal);
      
      // Verify they're registered
      expect(registry.listMemoryProviders()).toHaveLength(1);
      expect(registry.listEmotionModules()).toHaveLength(1);
      expect(registry.listCognitionModules()).toHaveLength(1);
      expect(registry.listExtensions()).toHaveLength(1);
      expect(registry.listPortals()).toHaveLength(1);
      
      // Clear all
      registry.clear();
      
      // Verify they're cleared
      expect(registry.listMemoryProviders()).toHaveLength(0);
      expect(registry.listEmotionModules()).toHaveLength(0);
      expect(registry.listCognitionModules()).toHaveLength(0);
      expect(registry.listExtensions()).toHaveLength(0);
      expect(registry.listPortals()).toHaveLength(0);
    });

    it('should get registry statistics', () => {
      // Register some modules
      registry.registerMemoryProvider('memory1', {} as MemoryProvider);
      registry.registerMemoryProvider('memory2', {} as MemoryProvider);
      registry.registerEmotionModule('emotion1', {} as EmotionModule);
      registry.registerPortal('portal1', {} as Portal);
      
      const stats = registry.getStats();
      
      expect(stats.memoryProviders).toBe(2);
      expect(stats.emotionModules).toBe(1);
      expect(stats.cognitionModules).toBe(0);
      expect(stats.extensions).toBe(0);
      expect(stats.portals).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle factory creation errors', () => {
      const errorFactory: ModuleFactory<MemoryProvider> = mock(() => {
        throw new Error('Factory error');
      });
      
      registry.registerMemoryProviderFactory('error-memory', errorFactory);
      
      expect(() => {
        registry.createMemoryProvider('error-memory', {});
      }).toThrow('Factory error');
    });

    it('should handle non-existent factory calls', () => {
      const result = registry.createMemoryProvider('non-existent', {});
      expect(result).toBeNull();
    });

    it('should handle invalid module registrations', () => {
      expect(() => {
        registry.registerMemoryProvider('', {} as MemoryProvider);
      }).not.toThrow(); // Should handle gracefully
      
      expect(() => {
        registry.registerMemoryProvider('test', null as any);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of registrations efficiently', () => {
      const startTime = Date.now();
      
      // Register many modules
      for (let i = 0; i < 100; i++) {
        registry.registerMemoryProvider(`memory-${i}`, {} as MemoryProvider);
        registry.registerEmotionModule(`emotion-${i}`, {} as EmotionModule);
        registry.registerCognitionModule(`cognition-${i}`, {} as CognitionModule);
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(registry.listMemoryProviders()).toHaveLength(100);
      expect(registry.listEmotionModules()).toHaveLength(100);
      expect(registry.listCognitionModules()).toHaveLength(100);
    });

    it('should handle rapid lookups efficiently', () => {
      // Register modules
      for (let i = 0; i < 50; i++) {
        registry.registerMemoryProvider(`memory-${i}`, {} as MemoryProvider);
      }
      
      const startTime = Date.now();
      
      // Perform many lookups
      for (let i = 0; i < 1000; i++) {
        const provider = registry.getMemoryProvider(`memory-${i % 50}`);
        expect(provider).toBeDefined();
      }
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
    });
  });
});