/**
 * @module utils/index
 * @description Test utilities exports for context system testing
 */

// Test factories
export {
  ContextFactory,
  ConfigFactory,
  MemoryFactory,
  AgentFactory,
  TestDataGenerator,
} from './test-factories.js';

// Assertion helpers
export {
  ContextAssertions,
  PerformanceAssertions,
  ConcurrencyAssertions,
  ChaosAssertions,
} from './assertion-helpers.js';

// Performance tools
export {
  PerformanceProfiler,
  LoadTester,
  ContextBenchmarkSuite,
  PerformanceTestUtils,
  type PerformanceMetrics,
  type BenchmarkResult,
} from './performance-tools.js';

// Chaos testing
export {
  ChaosInjector,
  ContextChaosScenarios,
  NetworkChaosSimulator,
  ResourceExhaustionSimulator,
  ChaosTestSuite,
  type ChaosConfig,
  type ChaosResult,
} from './chaos-testing.js';

// Mock utilities
export {
  MockContextManager,
  MockMemoryProvider,
  MockAgent,
  MockEventBus,
  MockLogger,
  TestHarness,
} from './mock-utilities.js';

/**
 * Convenience function to create a complete test environment
 */
export function createTestEnvironment() {
  const harness = new TestHarness();
  const profiler = new PerformanceProfiler();
  const contextFactory = ContextFactory;
  const configFactory = ConfigFactory;

  return {
    harness,
    profiler,
    contextFactory,
    configFactory,
    
    // Quick access to common utilities
    createContext: contextFactory.createBasicContext,
    createConfig: configFactory.createBasicConfig,
    
    // Setup helpers
    setupBasic: () => harness.setupBasicScenario(),
    setupMultiParticipant: (count: number) => harness.setupMultiParticipantScenario(count),
    setupConversation: (messageCount: number) => harness.setupConversationHistory(messageCount),
    
    // Cleanup
    cleanup: () => {
      harness.resetAll();
      profiler.clear();
    },
  };
}

/**
 * Test configuration presets
 */
export const TestPresets = {
  FAST: {
    iterations: 100,
    timeout: 1000,
    concurrency: 5,
  },
  STANDARD: {
    iterations: 1000,
    timeout: 5000,
    concurrency: 10,
  },
  THOROUGH: {
    iterations: 10000,
    timeout: 30000,
    concurrency: 50,
  },
  STRESS: {
    iterations: 100000,
    timeout: 300000,
    concurrency: 100,
  },
} as const;

/**
 * Common test patterns
 */
export const TestPatterns = {
  /**
   * Standard unit test pattern
   */
  unitTest: (description: string, testFn: () => Promise<void> | void) => ({
    description,
    testFn,
    type: 'unit' as const,
  }),

  /**
   * Integration test pattern
   */
  integrationTest: (description: string, testFn: () => Promise<void> | void) => ({
    description,
    testFn,
    type: 'integration' as const,
  }),

  /**
   * Performance test pattern
   */
  performanceTest: (
    description: string,
    testFn: (profiler: PerformanceProfiler) => Promise<void>,
    thresholds?: { maxTime?: number; maxMemory?: number }
  ) => ({
    description,
    testFn,
    type: 'performance' as const,
    thresholds,
  }),

  /**
   * Load test pattern
   */
  loadTest: (
    description: string,
    testFn: (loadTester: LoadTester) => Promise<void>,
    config?: { maxConcurrency?: number; duration?: number }
  ) => ({
    description,
    testFn,
    type: 'load' as const,
    config,
  }),

  /**
   * Chaos test pattern
   */
  chaosTest: (
    description: string,
    testFn: (chaosInjector: ChaosInjector) => Promise<void>,
    chaosConfig?: Partial<ChaosConfig>
  ) => ({
    description,
    testFn,
    type: 'chaos' as const,
    chaosConfig,
  }),
};

/**
 * Test suite builder for organizing tests
 */
export class TestSuiteBuilder {
  private tests: Array<{
    description: string;
    testFn: () => Promise<void> | void;
    type: string;
    metadata?: any;
  }> = [];

  addUnit(description: string, testFn: () => Promise<void> | void) {
    this.tests.push(TestPatterns.unitTest(description, testFn));
    return this;
  }

  addIntegration(description: string, testFn: () => Promise<void> | void) {
    this.tests.push(TestPatterns.integrationTest(description, testFn));
    return this;
  }

  addPerformance(
    description: string,
    testFn: (profiler: PerformanceProfiler) => Promise<void>,
    thresholds?: { maxTime?: number; maxMemory?: number }
  ) {
    this.tests.push(TestPatterns.performanceTest(description, testFn, thresholds));
    return this;
  }

  addLoad(
    description: string,
    testFn: (loadTester: LoadTester) => Promise<void>,
    config?: { maxConcurrency?: number; duration?: number }
  ) {
    this.tests.push(TestPatterns.loadTest(description, testFn, config));
    return this;
  }

  addChaos(
    description: string,
    testFn: (chaosInjector: ChaosInjector) => Promise<void>,
    chaosConfig?: Partial<ChaosConfig>
  ) {
    this.tests.push(TestPatterns.chaosTest(description, testFn, chaosConfig));
    return this;
  }

  build() {
    return [...this.tests];
  }

  clear() {
    this.tests.length = 0;
    return this;
  }
}