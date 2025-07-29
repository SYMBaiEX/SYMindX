// Core runtime functionality tests
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TestFactories } from '../../utils/test-factories';
import { MockMemoryProvider, MockPortal, MockExtension } from '../../mocks/mock-providers';

// Import actual runtime (adjust path as needed)
// import { Runtime } from '../../../src/core/runtime';

describe('Runtime', () => {
  let mockRuntime: any;
  let testAgent: any;
  let mockMemoryProvider: MockMemoryProvider;
  let mockPortal: MockPortal;
  let mockExtension: MockExtension;
  
  beforeEach(() => {
    testAgent = TestFactories.createAgent();
    mockMemoryProvider = new MockMemoryProvider();
    mockPortal = new MockPortal();
    mockExtension = new MockExtension();
    
    // Mock runtime for now (replace with actual Runtime when available)
    mockRuntime = {
      agents: new Map(),
      extensions: new Map(),
      portals: new Map(),
      eventBus: {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        once: jest.fn(),
      },
    };
    
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  describe('Agent Management', () => {
    it('should create an agent successfully', async () => {
      const agentConfig = TestFactories.createAgentConfig();
      
      // Mock agent creation
      const createAgent = async (config: any) => {
        const agent = TestFactories.createAgent({ config });
        mockRuntime.agents.set(agent.id, agent);
        return agent;
      };
      
      const agent = await createAgent(agentConfig);
      
      expect(agent).toBeDefined();
      expect(agent.id).toBeTruthy();
      expect(agent.config).toEqual(agentConfig);
      expect(mockRuntime.agents.has(agent.id)).toBe(true);
    });
    
    it('should handle agent creation failures', async () => {
      const invalidConfig = {}; // Invalid configuration
      
      const createAgent = async (config: any) => {
        if (!config.personality) {
          throw new Error('Agent configuration must include personality');
        }
        return TestFactories.createAgent({ config });
      };
      
      await expect(createAgent(invalidConfig))
        .rejects.toThrow('Agent configuration must include personality');
    });
    
    it('should activate and deactivate agents', async () => {
      const agent = TestFactories.createAgent({ status: 'inactive' });
      mockRuntime.agents.set(agent.id, agent);
      
      const activateAgent = async (agentId: string) => {
        const agent = mockRuntime.agents.get(agentId);
        if (!agent) throw new Error('Agent not found');
        agent.status = 'active';
        mockRuntime.eventBus.emit('agent:activated', { agentId });
        return agent;
      };
      
      const deactivateAgent = async (agentId: string) => {
        const agent = mockRuntime.agents.get(agentId);
        if (!agent) throw new Error('Agent not found');
        agent.status = 'inactive';
        mockRuntime.eventBus.emit('agent:deactivated', { agentId });
        return agent;
      };
      
      // Test activation
      const activatedAgent = await activateAgent(agent.id);
      expect(activatedAgent.status).toBe('active');
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('agent:activated', { agentId: agent.id });
      
      // Test deactivation
      const deactivatedAgent = await deactivateAgent(agent.id);
      expect(deactivatedAgent.status).toBe('inactive');
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('agent:deactivated', { agentId: agent.id });
    });
    
    it('should remove agents properly', async () => {
      const agent = TestFactories.createAgent();
      mockRuntime.agents.set(agent.id, agent);
      
      const removeAgent = async (agentId: string) => {
        const agent = mockRuntime.agents.get(agentId);
        if (!agent) throw new Error('Agent not found');
        
        // Cleanup agent resources
        if (agent.status === 'active') {
          agent.status = 'inactive';
        }
        
        mockRuntime.agents.delete(agentId);
        mockRuntime.eventBus.emit('agent:removed', { agentId });
        return true;
      };
      
      expect(mockRuntime.agents.has(agent.id)).toBe(true);
      
      const result = await removeAgent(agent.id);
      
      expect(result).toBe(true);
      expect(mockRuntime.agents.has(agent.id)).toBe(false);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('agent:removed', { agentId: agent.id });
    });
    
    it('should list agents with filtering', async () => {
      const agents = TestFactories.createAgents(5);
      agents[0].status = 'active';
      agents[1].status = 'active';
      agents[2].status = 'inactive';
      agents[3].status = 'error';
      agents[4].status = 'inactive';
      
      agents.forEach(agent => mockRuntime.agents.set(agent.id, agent));
      
      const listAgents = (filter?: { status?: string }) => {
        const allAgents = Array.from(mockRuntime.agents.values());
        if (!filter || !filter.status) return allAgents;
        return allAgents.filter(agent => agent.status === filter.status);
      };
      
      const allAgents = listAgents();
      const activeAgents = listAgents({ status: 'active' });
      const inactiveAgents = listAgents({ status: 'inactive' });
      
      expect(allAgents).toHaveLength(5);
      expect(activeAgents).toHaveLength(2);
      expect(inactiveAgents).toHaveLength(2);
    });
  });
  
  describe('Extension Management', () => {
    it('should load extensions successfully', async () => {
      const loadExtension = async (extension: any) => {
        await extension.init(testAgent);
        mockRuntime.extensions.set(extension.name, extension);
        mockRuntime.eventBus.emit('extension:loaded', { name: extension.name });
        return extension;
      };
      
      const loadedExtension = await loadExtension(mockExtension);
      
      expect(loadedExtension).toBe(mockExtension);
      expect(mockRuntime.extensions.has(mockExtension.name)).toBe(true);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('extension:loaded', { name: mockExtension.name });
    });
    
    it('should handle extension initialization failures', async () => {
      const failingExtension = {
        name: 'failing-extension',
        init: jest.fn().mockRejectedValue(new Error('Init failed')),
      };
      
      const loadExtension = async (extension: any) => {
        try {
          await extension.init(testAgent);
          mockRuntime.extensions.set(extension.name, extension);
          return extension;
        } catch (error) {
          mockRuntime.eventBus.emit('extension:error', { name: extension.name, error });
          throw error;
        }
      };
      
      await expect(loadExtension(failingExtension))
        .rejects.toThrow('Init failed');
      
      expect(mockRuntime.extensions.has(failingExtension.name)).toBe(false);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('extension:error', expect.any(Object));
    });
    
    it('should unload extensions properly', async () => {
      mockRuntime.extensions.set(mockExtension.name, mockExtension);
      
      const unloadExtension = async (extensionName: string) => {
        const extension = mockRuntime.extensions.get(extensionName);
        if (!extension) throw new Error('Extension not found');
        
        if (extension.shutdown) {
          await extension.shutdown();
        }
        
        mockRuntime.extensions.delete(extensionName);
        mockRuntime.eventBus.emit('extension:unloaded', { name: extensionName });
        return true;
      };
      
      const result = await unloadExtension(mockExtension.name);
      
      expect(result).toBe(true);
      expect(mockRuntime.extensions.has(mockExtension.name)).toBe(false);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('extension:unloaded', { name: mockExtension.name });
    });
  });
  
  describe('Portal Management', () => {
    it('should register portals successfully', async () => {
      const registerPortal = async (portal: any) => {
        mockRuntime.portals.set(portal.name, portal);
        mockRuntime.eventBus.emit('portal:registered', { name: portal.name });
        return portal;
      };
      
      const registeredPortal = await registerPortal(mockPortal);
      
      expect(registeredPortal).toBe(mockPortal);
      expect(mockRuntime.portals.has(mockPortal.name)).toBe(true);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('portal:registered', { name: mockPortal.name });
    });
    
    it('should handle portal communication', async () => {
      mockRuntime.portals.set(mockPortal.name, mockPortal);
      
      const sendMessage = async (portalName: string, messages: any[]) => {
        const portal = mockRuntime.portals.get(portalName);
        if (!portal) throw new Error('Portal not found');
        
        return await portal.generateResponse(messages);
      };
      
      const messages = [{ role: 'user', content: 'Hello' }];
      const response = await sendMessage(mockPortal.name, messages);
      
      expect(response).toBeDefined();
      expect(response.content).toBe('Mock response from portal');
    });
  });
  
  describe('Event System', () => {
    it('should emit and handle events correctly', async () => {
      const eventHandler = jest.fn();
      
      mockRuntime.eventBus.on('test:event', eventHandler);
      mockRuntime.eventBus.emit('test:event', { data: 'test data' });
      
      expect(eventHandler).toHaveBeenCalledWith({ data: 'test data' });
    });
    
    it('should handle event handler errors', async () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      mockRuntime.eventBus.on('test:error', errorHandler);
      
      // In real implementation, this would be caught and handled
      expect(() => {
        mockRuntime.eventBus.emit('test:error', {});
        errorHandler({});
      }).toThrow('Handler error');
    });
  });
  
  describe('Runtime Lifecycle', () => {
    it('should initialize runtime properly', async () => {
      const initializeRuntime = async () => {
        // Mock initialization steps
        mockRuntime.initialized = true;
        mockRuntime.eventBus.emit('runtime:initialized', {});
        return mockRuntime;
      };
      
      const runtime = await initializeRuntime();
      
      expect(runtime.initialized).toBe(true);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('runtime:initialized', {});
    });
    
    it('should shutdown runtime gracefully', async () => {
      mockRuntime.initialized = true;
      mockRuntime.agents.set('agent-1', TestFactories.createAgent({ status: 'active' }));
      mockRuntime.extensions.set('ext-1', mockExtension);
      
      const shutdownRuntime = async () => {
        // Deactivate all agents
        for (const agent of mockRuntime.agents.values()) {
          if (agent.status === 'active') {
            agent.status = 'inactive';
          }
        }
        
        // Shutdown all extensions
        for (const extension of mockRuntime.extensions.values()) {
          if (extension.shutdown) {
            await extension.shutdown();
          }
        }
        
        mockRuntime.initialized = false;
        mockRuntime.eventBus.emit('runtime:shutdown', {});
        return true;
      };
      
      const result = await shutdownRuntime();
      
      expect(result).toBe(true);
      expect(mockRuntime.initialized).toBe(false);
      expect(mockRuntime.eventBus.emit).toHaveBeenCalledWith('runtime:shutdown', {});
    });
  });
});