/**
 * Jest Setup for Agent Testing
 * 
 * Global setup for agent tests including mocks, utilities,
 * and test environment configuration.
 */

import { jest } from '@jest/globals'

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAgent(): R
      toHaveValidConfig(): R
      toRespondWithinTime(ms: number): R
      toHaveHealthyStatus(): R
      toPassPerformanceThreshold(threshold: number): R
    }
  }
}

// Custom Jest matchers for agent testing
expect.extend({
  toBeValidAgent(received) {
    const pass = received && 
                 typeof received.id === 'string' &&
                 typeof received.name === 'string' &&
                 received.status !== undefined &&
                 received.emotion !== undefined &&
                 received.memory !== undefined &&
                 received.cognition !== undefined

    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be a valid agent`
          : `Expected ${received} to be a valid agent with required properties`,
      pass
    }
  },

  toHaveValidConfig(received) {
    const pass = received && 
                 received.core &&
                 received.core.name &&
                 received.psyche &&
                 received.psyche.defaults &&
                 received.modules

    return {
      message: () =>
        pass
          ? `Expected config not to be valid`
          : `Expected config to have core, psyche, and modules properties`,
      pass
    }
  },

  toRespondWithinTime(received, expectedTime) {
    const actualTime = received
    const pass = actualTime <= expectedTime

    return {
      message: () =>
        pass
          ? `Expected response time ${actualTime}ms not to be within ${expectedTime}ms`
          : `Expected response time ${actualTime}ms to be within ${expectedTime}ms`,
      pass
    }
  },

  toHaveHealthyStatus(received) {
    const healthyStatuses = ['active', 'idle', 'thinking']
    const pass = healthyStatuses.includes(received.status)

    return {
      message: () =>
        pass
          ? `Expected status ${received.status} not to be healthy`
          : `Expected status ${received.status} to be one of: ${healthyStatuses.join(', ')}`,
      pass
    }
  },

  toPassPerformanceThreshold(received, threshold) {
    const pass = received >= threshold

    return {
      message: () =>
        pass
          ? `Expected performance ${received} not to exceed threshold ${threshold}`
          : `Expected performance ${received} to exceed threshold ${threshold}`,
      pass
    }
  }
})

// Mock console methods in test environment
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}

// Mock timers for consistent testing
jest.useFakeTimers()

// Global test utilities
global.testUtils = {
  // Create mock agent configuration
  createMockAgentConfig: (overrides = {}) => ({
    core: {
      name: 'Test Agent',
      tone: 'helpful',
      personality: ['test', 'reliable']
    },
    lore: {
      origin: 'Created for testing',
      motive: 'To verify system functionality'
    },
    psyche: {
      traits: ['analytical', 'precise'],
      defaults: {
        memory: 'memory',
        emotion: 'rune-emotion-stack',
        cognition: 'reactive'
      }
    },
    modules: {
      extensions: ['api']
    },
    ...overrides
  }),

  // Create mock agent instance
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Agent',
    status: 'idle',
    emotion: {
      current: 'neutral',
      intensity: 0.5,
      setEmotion: jest.fn()
    },
    memory: {
      store: jest.fn(),
      retrieve: jest.fn().mockResolvedValue([]),
      search: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      clear: jest.fn(),
      getRecent: jest.fn().mockResolvedValue([])
    },
    cognition: {
      think: jest.fn().mockResolvedValue({
        thoughts: ['Testing thought'],
        emotions: { current: 'neutral', intensity: 0.5, triggers: [] },
        actions: [],
        memories: [],
        confidence: 0.8
      }),
      plan: jest.fn(),
      decide: jest.fn()
    },
    extensions: [],
    config: global.testUtils.createMockAgentConfig(),
    lastUpdate: new Date(),
    ...overrides
  }),

  // Create mock runtime
  createMockRuntime: () => ({
    agents: new Map(),
    eventBus: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getEvents: jest.fn().mockReturnValue([])
    },
    registry: {
      registerMemoryProvider: jest.fn(),
      registerEmotionModule: jest.fn(),
      registerCognitionModule: jest.fn(),
      registerExtension: jest.fn(),
      registerPortal: jest.fn(),
      getMemoryProvider: jest.fn(),
      getEmotionModule: jest.fn(),
      getCognitionModule: jest.fn(),
      getExtension: jest.fn(),
      getPortal: jest.fn()
    },
    config: {
      tickInterval: 1000,
      maxAgents: 10,
      logLevel: 'info',
      persistence: { enabled: false, path: '' },
      extensions: { autoLoad: false, paths: [] }
    },
    initialize: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    loadAgents: jest.fn(),
    loadAgent: jest.fn(),
    unloadAgent: jest.fn(),
    tick: jest.fn()
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate test data
  generateTestMemories: (count = 5) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `memory-${i}`,
      agentId: 'test-agent',
      type: 'experience',
      content: `Test memory ${i}`,
      metadata: { source: 'test' },
      importance: Math.random(),
      timestamp: new Date(),
      tags: ['test'],
      duration: 'short_term'
    }))
  },

  // Create test events
  generateTestEvents: (count = 3) => {
    return Array.from({ length: count }, (_, i) => ({
      id: `event-${i}`,
      type: 'test_event',
      source: 'test',
      data: { message: `Test event ${i}` },
      timestamp: new Date(),
      processed: false
    }))
  }
}

// Setup test database in memory
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks()
  
  // Reset timers
  jest.clearAllTimers()
})

afterEach(() => {
  // Clean up any resources
  jest.clearAllTimers()
})

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Increase timeout for integration tests
jest.setTimeout(30000)