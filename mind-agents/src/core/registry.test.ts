/**
 * Tests for the Clean SYMindX Module Registry
 */

import { SYMindXModuleRegistry } from './registry';
import { MemoryProvider, EmotionModule, CognitionModule, Extension, Portal } from '../types/agent';

// Mock implementations for testing
class MockMemoryProvider implements MemoryProvider {
  async store(): Promise<void> {}
  async retrieve(): Promise<any[]> { return []; }
  async search(): Promise<any[]> { return []; }
  async delete(): Promise<void> {}
  async clear(): Promise<void> {}
  async getRecent(): Promise<any[]> { return []; }
}

class MockEmotionModule implements EmotionModule {
  getCurrentEmotion(): any { return { type: 'happy', intensity: 0.5 }; }
  updateEmotion(): void {}
  getEmotionHistory(): any[] { return []; }
  blendEmotions(): any { return { type: 'neutral', intensity: 0.5 }; }
}

class MockCognitionModule implements CognitionModule {
  async think(): Promise<any> { return { thoughts: [], emotions: {}, actions: [], memories: [], confidence: 0.8 }; }
  async plan(): Promise<any> { return { id: '1', goal: 'test', steps: [], priority: 1, estimatedDuration: 100, dependencies: [], status: 'pending' }; }
  async decide(): Promise<any> { return { id: '1', type: 'test', confidence: 0.8 }; }
}

class MockExtension implements Extension {
  name = 'test-extension';
  version = '1.0.0';
  async initialize(): Promise<void> {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async handleEvent(): Promise<void> {}
}

class MockPortal implements Portal {
  name = 'test-portal';
  async chat(): Promise<any> { return { content: 'test response' }; }
  async stream(): Promise<any> { return []; }
  isAvailable(): boolean { return true; }
}

describe('SYMindXModuleRegistry', () => {
  let registry: SYMindXModuleRegistry;

  beforeEach(() => {
    registry = new SYMindXModuleRegistry();
  });

  describe('Direct registration and retrieval', () => {
    test('should register and retrieve modules directly', () => {
      const mockModule = { name: 'test', value: 42 };
      
      registry.register('test-module', mockModule);
      const retrieved = registry.get('test-module');
      
      expect(retrieved).toBe(mockModule);
    });

    test('should return undefined for non-existent modules', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Factory registration and creation', () => {
    test('should register and use factories', () => {
      const factory = () => ({ created: true, id: 'test-instance' });
      
      registry.registerFactory('test-factory', factory);
      const instance1 = registry.create('test-factory');
      const instance2 = registry.create('test-factory');
      
      expect(instance1).toHaveProperty('created', true);
      expect(instance2).toHaveProperty('created', true);
      // Should be cached after first creation (same instance returned)
      expect(instance1).toBe(instance2);
    });

    test('should handle factory errors gracefully', () => {
      const errorFactory = () => { throw new Error('Factory error'); };
      
      registry.registerFactory('error-factory', errorFactory);
      const instance = registry.create('error-factory');
      
      expect(instance).toBeUndefined();
    });
  });

  describe('Type-safe module registration', () => {
    test('should register and retrieve memory providers', () => {
      const mockProvider = new MockMemoryProvider();
      
      registry.registerMemoryProvider('sqlite', mockProvider);
      const retrieved = registry.getMemoryProvider('sqlite');
      
      expect(retrieved).toBe(mockProvider);
    });

    test('should register and retrieve emotion modules', () => {
      const mockEmotion = new MockEmotionModule();
      
      registry.registerEmotionModule('basic', mockEmotion);
      const retrieved = registry.getEmotionModule('basic');
      
      expect(retrieved).toBe(mockEmotion);
    });

    test('should register and retrieve cognition modules', () => {
      const mockCognition = new MockCognitionModule();
      
      registry.registerCognitionModule('unified', mockCognition);
      const retrieved = registry.getCognitionModule('unified');
      
      expect(retrieved).toBe(mockCognition);
    });

    test('should register and retrieve extensions', () => {
      const mockExtension = new MockExtension();
      
      registry.registerExtension('api', mockExtension);
      const retrieved = registry.getExtension('api');
      
      expect(retrieved).toBe(mockExtension);
    });

    test('should register and retrieve portals', () => {
      const mockPortal = new MockPortal();
      
      registry.registerPortal('openai', mockPortal);
      const retrieved = registry.getPortal('openai');
      
      expect(retrieved).toBe(mockPortal);
    });
  });

  describe('Factory-based creation', () => {
    test('should create memory providers from factories', () => {
      const factory = (config: any) => {
        const provider = new MockMemoryProvider();
        (provider as any).config = config;
        return provider;
      };
      
      registry.registerMemoryFactory('sqlite', factory);
      const provider = registry.createMemoryProvider('sqlite', { path: './test.db' });
      
      expect(provider).toBeInstanceOf(MockMemoryProvider);
      expect((provider as any).config).toEqual({ path: './test.db' });
    });

    test('should create emotion modules from factories', () => {
      const factory = (config: any) => {
        const emotion = new MockEmotionModule();
        (emotion as any).config = config;
        return emotion;
      };
      
      registry.registerEmotionFactory('basic', factory);
      const emotion = registry.createEmotionModule('basic', { sensitivity: 0.8 });
      
      expect(emotion).toBeInstanceOf(MockEmotionModule);
      expect((emotion as any).config).toEqual({ sensitivity: 0.8 });
    });
  });

  describe('Listing methods', () => {
    test('should list memory providers', () => {
      registry.registerMemoryProvider('sqlite', new MockMemoryProvider());
      registry.registerMemoryProvider('postgres', new MockMemoryProvider());
      
      const providers = registry.listMemoryProviders();
      expect(providers).toContain('sqlite');
      expect(providers).toContain('postgres');
    });

    test('should list portals', () => {
      registry.registerPortal('openai', new MockPortal());
      registry.registerPortal('anthropic', new MockPortal());
      
      const portals = registry.listPortals();
      expect(portals).toContain('openai');
      expect(portals).toContain('anthropic');
    });

    test('should list portal factories', () => {
      registry.registerPortalFactory('openai', () => new MockPortal());
      registry.registerPortalFactory('anthropic', () => new MockPortal());
      
      const factories = registry.listPortalFactories();
      expect(factories).toContain('openai');
      expect(factories).toContain('anthropic');
    });
  });

  describe('Utility methods', () => {
    test('should check if modules exist', () => {
      registry.register('test-module', { name: 'test' });
      registry.registerFactory('test-factory', () => ({ name: 'factory' }));
      
      expect(registry.has('test-module')).toBe(true);
      expect(registry.has('test-factory')).toBe(true);
      expect(registry.has('non-existent')).toBe(false);
    });

    test('should clear all modules and factories', () => {
      registry.register('test-module', { name: 'test' });
      registry.registerFactory('test-factory', () => ({ name: 'factory' }));
      
      registry.clear();
      
      expect(registry.has('test-module')).toBe(false);
      expect(registry.has('test-factory')).toBe(false);
    });

    test('should list all registered names', () => {
      registry.register('test-module', { name: 'test' });
      registry.registerFactory('test-factory', () => ({ name: 'factory' }));
      
      const names = registry.list();
      expect(names).toContain('test-module');
      expect(names).toContain('test-factory');
    });
  });
});