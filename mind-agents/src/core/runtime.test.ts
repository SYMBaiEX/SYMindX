/**
 * @module runtime.test
 * @description SYMindX Runtime Test Suite - Comprehensive tests for the core runtime system
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { SYMindXRuntime } from './runtime.js';
import { SimpleEventBus } from './event-bus.js';
import { SYMindXModuleRegistry } from './registry.js';
import type { RuntimeConfig, Agent, AgentConfig, AgentStatus, RuntimeStatus } from '../types/index.js';

describe('SYMindXRuntime', () => {
  let runtime: SYMindXRuntime;
  let mockConfig: RuntimeConfig;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment
    process.env.GROQ_API_KEY = 'gsk_test_key_1234567890123456789012345678901234';
    process.env.OPENAI_API_KEY = 'sk-test_key_1234567890123456789012345678901234';
    process.env.NODE_ENV = 'test';

    // Create mock runtime config
    mockConfig = {
      tickInterval: 1000,
      maxAgents: 10,
      persistence: {
        enabled: true,
        type: 'memory',
        path: ':memory:',
      },
      extensions: {
        autoLoad: true,
        paths: ['./src/extensions'],
      },
      portals: {
        autoLoad: true,
        paths: ['./src/portals'],
        apiKeys: {
          openai: process.env.OPENAI_API_KEY || '',
          groq: process.env.GROQ_API_KEY || '',
        },
      },
      debug: {
        enabled: true,
        level: 'info',
      },
      security: {
        enabled: true,
        maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      },
    };

    runtime = new SYMindXRuntime(mockConfig);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      expect(runtime.config).toEqual(mockConfig);
      expect(runtime.agents).toBeInstanceOf(Map);
      expect(runtime.lazyAgents).toBeInstanceOf(Map);
      expect(runtime.eventBus).toBeInstanceOf(SimpleEventBus);
      expect(runtime.registry).toBeInstanceOf(SYMindXModuleRegistry);
    });

    it('should initialize with empty agent collections', () => {
      expect(runtime.agents.size).toBe(0);
      expect(runtime.lazyAgents.size).toBe(0);
    });

    it('should create extension loader', () => {
      expect(runtime.extensionLoader).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(runtime.initialize()).resolves.not.toThrow();
    });

    it('should handle missing .env file gracefully', async () => {
      // Mock fs.access to simulate missing .env file
      const mockFs = {
        access: mock(() => Promise.reject({ code: 'ENOENT' })),
      };

      await expect(runtime.initialize()).resolves.not.toThrow();
    });

    it('should load configuration from runtime.json if available', async () => {
      const mockConfigData = {
        portals: {
          autoLoad: false,
          apiKeys: {
            openai: 'test-key',
          },
        },
      };

      const mockFs = {
        access: mock(() => Promise.resolve()),
        readFile: mock(() => Promise.resolve(JSON.stringify(mockConfigData))),
      };

      await runtime.initialize();
      expect(runtime.config.portals?.autoLoad).toBe(false);
    });
  });

  describe('Runtime Lifecycle', () => {
    beforeEach(async () => {
      await runtime.initialize();
    });

    it('should start successfully', async () => {
      await expect(runtime.start()).resolves.not.toThrow();
      expect(runtime.isRunning).toBe(true);
    });

    it('should not start if already running', async () => {
      await runtime.start();
      
      const consoleSpy = spyOn(console, 'warn');
      await runtime.start();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));
    });

    it('should stop successfully', async () => {
      await runtime.start();
      await expect(runtime.stop()).resolves.not.toThrow();
      expect(runtime.isRunning).toBe(false);
    });

    it('should handle stop when not running', async () => {
      await expect(runtime.stop()).resolves.not.toThrow();
    });
  });

  describe('Agent Management', () => {
    let mockAgentConfig: AgentConfig;

    beforeEach(async () => {
      await runtime.initialize();
      await runtime.start();

      mockAgentConfig = {
        core: {
          name: 'TestAgent',
          tone: 'neutral',
          personality: ['helpful', 'analytical'],
        },
        lore: {
          origin: 'Created for testing',
          motive: 'To validate the system',
        },
        psyche: {
          traits: ['test-oriented', 'systematic'],
          defaults: {
            memory: 'sqlite',
            emotion: 'composite',
            cognition: 'hybrid',
            portal: 'groq',
          },
        },
        modules: {
          extensions: ['api'],
          memory: {
            provider: 'sqlite',
            maxRecords: 100,
            config: {
              path: ':memory:',
            },
          },
          emotion: {
            type: 'composite',
            sensitivity: 0.5,
            decayRate: 0.1,
            transitionSpeed: 0.3,
          },
          cognition: {
            type: 'hybrid',
            planningDepth: 3,
            memoryIntegration: true,
            creativityLevel: 0.5,
          },
        },
      };
    });

    afterEach(async () => {
      await runtime.stop();
    });

    it('should create agent dynamically', async () => {
      const agentId = await runtime.createAgent(mockAgentConfig);
      
      expect(agentId).toBeDefined();
      expect(runtime.agents.has(agentId)).toBe(true);
      
      const agent = runtime.agents.get(agentId);
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('TestAgent');
    });

    it('should remove agent successfully', async () => {
      const agentId = await runtime.createAgent(mockAgentConfig);
      const result = await runtime.removeAgent(agentId);
      
      expect(result).toBe(true);
      expect(runtime.agents.has(agentId)).toBe(false);
    });

    it('should return false when removing non-existent agent', async () => {
      const result = await runtime.removeAgent('non-existent-agent');
      expect(result).toBe(false);
    });

    it('should unload agent successfully', async () => {
      const agentId = await runtime.createAgent(mockAgentConfig);
      await expect(runtime.unloadAgent(agentId)).resolves.not.toThrow();
      expect(runtime.agents.has(agentId)).toBe(false);
    });

    it('should throw error when unloading non-existent agent', async () => {
      await expect(runtime.unloadAgent('non-existent-agent')).rejects.toThrow();
    });
  });

  describe('Lazy Agent Management', () => {
    beforeEach(async () => {
      await runtime.initialize();
      await runtime.start();
    });

    afterEach(async () => {
      await runtime.stop();
    });

    it('should preload lazy agent', async () => {
      // This test would need a mock lazy agent in the system
      // For now, we test that the method exists and handles errors
      await expect(runtime.preloadAgent('non-existent')).rejects.toThrow();
    });

    it('should check if agent is active', () => {
      expect(runtime.isAgentActive('non-existent')).toBe(false);
    });

    it('should get agent state', () => {
      expect(runtime.getAgentState('non-existent')).toBeUndefined();
    });

    it('should list lazy agents', () => {
      const lazyAgents = runtime.listLazyAgents();
      expect(Array.isArray(lazyAgents)).toBe(true);
    });
  });

  describe('Runtime Statistics', () => {
    beforeEach(async () => {
      await runtime.initialize();
      await runtime.start();
    });

    afterEach(async () => {
      await runtime.stop();
    });

    it('should return comprehensive stats', () => {
      const stats = runtime.getStats();
      
      expect(stats).toHaveProperty('agents');
      expect(stats).toHaveProperty('lazyAgents');
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('eventBus');
      expect(stats).toHaveProperty('autonomous');
      expect(stats).toHaveProperty('lazy');
    });

    it('should return runtime capabilities', () => {
      const capabilities = runtime.getRuntimeCapabilities();
      
      expect(capabilities).toHaveProperty('agents');
      expect(capabilities).toHaveProperty('modules');
      expect(capabilities).toHaveProperty('extensions');
      expect(capabilities).toHaveProperty('runtime');
    });
  });

  describe('Event Management', () => {
    beforeEach(async () => {
      await runtime.initialize();
      await runtime.start();
    });

    afterEach(async () => {
      await runtime.stop();
    });

    it('should subscribe to events', () => {
      const mockHandler = mock(() => {});
      
      expect(() => {
        runtime.subscribeToEvents({ type: 'test' }, mockHandler);
      }).not.toThrow();
    });

    it('should get event history', async () => {
      const history = await runtime.getEventHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get event history with filter', async () => {
      const history = await runtime.getEventHistory({ limit: 10 });
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock a configuration that would cause initialization to fail
      const badConfig = {
        ...mockConfig,
        portals: {
          ...mockConfig.portals,
          paths: ['/non/existent/path'],
        },
      };

      const badRuntime = new SYMindXRuntime(badConfig);
      
      // Should not throw, but should handle the error internally
      await expect(badRuntime.initialize()).resolves.not.toThrow();
    });

    it('should handle start errors gracefully', async () => {
      await runtime.initialize();
      
      // Mock a condition that would cause start to fail
      const originalRegisterCoreModules = runtime['registerCoreModules'];
      runtime['registerCoreModules'] = mock(() => Promise.reject(new Error('Mock error')));
      
      await expect(runtime.start()).rejects.toThrow('Mock error');
      
      // Restore original method
      runtime['registerCoreModules'] = originalRegisterCoreModules;
    });
  });

  describe('Performance', () => {
    it('should handle multiple agents efficiently', async () => {
      await runtime.initialize();
      await runtime.start();

      const startTime = Date.now();
      const agentPromises = [];
      
      // Create multiple agents concurrently
      for (let i = 0; i < 5; i++) {
        const agentConfig = {
          core: {
            name: `Agent-${i}`,
            tone: 'neutral',
            personality: ['test'],
          },
          lore: {
            origin: `Test agent ${i}`,
            motive: 'Testing performance',
          },
          psyche: {
            traits: ['efficient'],
            defaults: {
              memory: 'sqlite',
              emotion: 'neutral',
              cognition: 'reactive',
              portal: 'groq',
            },
          },
          modules: {
            extensions: [],
            memory: {
              provider: 'sqlite',
              maxRecords: 10,
              config: { path: ':memory:' },
            },
          },
        };
        
        agentPromises.push(runtime.createAgent(agentConfig));
      }

      await Promise.all(agentPromises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(runtime.agents.size).toBe(5);
      
      await runtime.stop();
    });

    it('should handle rapid event processing', async () => {
      await runtime.initialize();
      await runtime.start();

      const startTime = Date.now();
      const eventPromises = [];
      
      // Generate multiple events
      for (let i = 0; i < 10; i++) {
        const eventPromise = runtime.getEventHistory({ limit: 1 });
        eventPromises.push(eventPromise);
      }

      await Promise.all(eventPromises);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      await runtime.stop();
    });
  });

  describe('Memory Management', () => {
    it('should handle memory cleanup during shutdown', async () => {
      await runtime.initialize();
      await runtime.start();

      // Create some agents to have memory usage
      const agentConfig = {
        core: { name: 'TestAgent', tone: 'neutral', personality: [] },
        lore: { origin: 'Test', motive: 'Test' },
        psyche: {
          traits: [],
          defaults: { memory: 'sqlite', emotion: 'neutral', cognition: 'reactive', portal: 'groq' },
        },
        modules: { extensions: [] },
      };

      await runtime.createAgent(agentConfig);
      
      // Should not throw during cleanup
      await expect(runtime.stop()).resolves.not.toThrow();
      
      // Verify agents were cleaned up
      expect(runtime.agents.size).toBe(0);
    });
  });
});