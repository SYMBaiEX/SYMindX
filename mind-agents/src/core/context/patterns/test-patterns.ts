/**
 * Test Patterns for Context Injection
 *
 * Provides unit test patterns and examples for the context injection framework.
 * These patterns demonstrate proper usage and serve as templates for testing.
 */

import type {
  ContextInjector,
  ContextProvider,
  ContextMiddleware,
  ContextEnricher,
  ContextScope,
  ContextScopeType,
  ContextInjectionConfig,
} from '../../../types/context/context-injection';
import type { OperationResult, ValidationResult } from '../../../types/helpers';
import { createContextInjector, createScope } from '../context-injector';

/**
 * Mock context provider for testing
 */
export class MockContextProvider
  implements ContextProvider<Record<string, unknown>>
{
  readonly id: string;
  readonly priority: number;
  readonly supportsAsync: boolean;

  private mockData: Record<string, unknown>;

  constructor(
    id: string,
    mockData: Record<string, unknown> = {},
    priority = 50,
    supportsAsync = false
  ) {
    this.id = id;
    this.mockData = mockData;
    this.priority = priority;
    this.supportsAsync = supportsAsync;
  }

  provide(scope: ContextScope): Record<string, unknown> | undefined {
    return this.canProvide(scope) ? { ...this.mockData } : undefined;
  }

  async provideAsync(
    scope: ContextScope
  ): Promise<Record<string, unknown> | undefined> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));
    return this.provide(scope);
  }

  canProvide(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }

  setMockData(data: Record<string, unknown>): void {
    this.mockData = { ...data };
  }
}

/**
 * Mock context middleware for testing
 */
export class MockContextMiddleware implements ContextMiddleware<any, any> {
  readonly id: string;
  readonly priority: number;

  private transformFn?: (context: any, scope: ContextScope) => any;

  constructor(
    id: string,
    priority = 50,
    transformFn?: (context: any, scope: ContextScope) => any
  ) {
    this.id = id;
    this.priority = priority;
    this.transformFn = transformFn;
  }

  async transform(
    context: any,
    scope: ContextScope,
    next: (context: any) => Promise<any>
  ): Promise<any> {
    let processedContext = context;

    if (this.transformFn) {
      processedContext = this.transformFn(context, scope);
    }

    return next(processedContext);
  }

  shouldProcess(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }
}

/**
 * Mock context enricher for testing
 */
export class MockContextEnricher implements ContextEnricher<any> {
  readonly id: string;
  readonly priority: number;

  private enrichmentData: Record<string, unknown>;

  constructor(
    id: string,
    enrichmentData: Record<string, unknown> = {},
    priority = 50
  ) {
    this.id = id;
    this.enrichmentData = enrichmentData;
    this.priority = priority;
  }

  async enrich(context: any, scope: ContextScope): Promise<any> {
    return {
      ...context,
      ...this.enrichmentData,
      enrichedBy: this.id,
      enrichedAt: new Date(),
    };
  }

  shouldEnrich(scope: ContextScope): boolean {
    return scope.type === ContextScopeType.Module;
  }

  setEnrichmentData(data: Record<string, unknown>): void {
    this.enrichmentData = { ...data };
  }
}

/**
 * Test helper functions
 */
export class ContextInjectionTestHelper {
  /**
   * Create a test context injector with mock components
   */
  static async createTestInjector(
    config?: Partial<ContextInjectionConfig>
  ): Promise<ContextInjector> {
    const injector = await createContextInjector({
      enableAsync: true,
      asyncTimeout: 1000,
      enableCaching: false, // Disable caching for predictable tests
      enableValidation: true,
      enableEnrichment: true,
      enableMiddleware: true,
      ...config,
    });

    return injector;
  }

  /**
   * Create a mock module scope for testing
   */
  static createMockModuleScope(moduleId = 'test-module'): ContextScope {
    return createScope(ContextScopeType.Module, moduleId, {
      agentId: 'test-agent',
      correlationId: 'test-correlation-123',
      metadata: {
        testContext: true,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a mock extension scope for testing
   */
  static createMockExtensionScope(
    extensionId = 'test-extension'
  ): ContextScope {
    return createScope(ContextScopeType.Extension, extensionId, {
      agentId: 'test-agent',
      correlationId: 'test-correlation-123',
      metadata: {
        testContext: true,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a mock portal scope for testing
   */
  static createMockPortalScope(portalId = 'test-portal'): ContextScope {
    return createScope(ContextScopeType.Portal, portalId, {
      agentId: 'test-agent',
      correlationId: 'test-correlation-123',
      metadata: {
        testContext: true,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Create a mock service scope for testing
   */
  static createMockServiceScope(serviceId = 'test-service'): ContextScope {
    return createScope(ContextScopeType.Service, serviceId, {
      agentId: 'test-agent',
      correlationId: 'test-correlation-123',
      metadata: {
        testContext: true,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Verify context injection result
   */
  static verifyInjectionResult(result: any, expectedContext?: any): boolean {
    if (!result.success) {
      console.error('Context injection failed:', result.errors);
      return false;
    }

    if (!result.context) {
      console.error('No context data in result');
      return false;
    }

    if (expectedContext) {
      for (const [key, value] of Object.entries(expectedContext)) {
        if (result.context[key] !== value) {
          console.error(
            `Expected context.${key} to be ${value}, got ${result.context[key]}`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create a test suite for context injection
   */
  static createTestSuite() {
    return {
      /**
       * Test basic provider functionality
       */
      testProvider: async () => {
        const injector = await this.createTestInjector();
        const provider = new MockContextProvider('test-provider', {
          test: 'data',
        });
        const scope = this.createMockModuleScope();

        const registerResult = injector.registerProvider(provider);
        if (!registerResult.success) {
          throw new Error(
            'Failed to register provider: ' + registerResult.error
          );
        }

        const injectionResult = await injector.inject(scope);
        if (!this.verifyInjectionResult(injectionResult, { test: 'data' })) {
          throw new Error('Provider test failed');
        }

        console.log('✅ Provider test passed');
        return true;
      },

      /**
       * Test middleware functionality
       */
      testMiddleware: async () => {
        const injector = await this.createTestInjector();
        const provider = new MockContextProvider('test-provider', {
          original: 'data',
        });
        const middleware = new MockContextMiddleware(
          'test-middleware',
          50,
          (context) => ({
            ...context,
            transformed: true,
          })
        );
        const scope = this.createMockModuleScope();

        injector.registerProvider(provider);
        injector.registerMiddleware(middleware);

        const injectionResult = await injector.inject(scope);
        if (
          !this.verifyInjectionResult(injectionResult, {
            original: 'data',
            transformed: true,
          })
        ) {
          throw new Error('Middleware test failed');
        }

        console.log('✅ Middleware test passed');
        return true;
      },

      /**
       * Test enricher functionality
       */
      testEnricher: async () => {
        const injector = await this.createTestInjector();
        const provider = new MockContextProvider('test-provider', {
          original: 'data',
        });
        const enricher = new MockContextEnricher('test-enricher', {
          enriched: 'value',
        });
        const scope = this.createMockModuleScope();

        injector.registerProvider(provider);
        injector.registerEnricher(enricher);

        const injectionResult = await injector.inject(scope);
        if (
          !this.verifyInjectionResult(injectionResult, {
            original: 'data',
            enriched: 'value',
          })
        ) {
          throw new Error('Enricher test failed');
        }

        console.log('✅ Enricher test passed');
        return true;
      },

      /**
       * Test async provider functionality
       */
      testAsyncProvider: async () => {
        const injector = await this.createTestInjector();
        const provider = new MockContextProvider(
          'async-provider',
          { async: 'data' },
          50,
          true
        );
        const scope = this.createMockModuleScope();

        injector.registerProvider(provider);

        const injectionResult = await injector.inject(scope);
        if (!this.verifyInjectionResult(injectionResult, { async: 'data' })) {
          throw new Error('Async provider test failed');
        }

        console.log('✅ Async provider test passed');
        return true;
      },

      /**
       * Test provider priority ordering
       */
      testProviderPriority: async () => {
        const injector = await this.createTestInjector();
        const lowPriorityProvider = new MockContextProvider(
          'low-priority',
          { priority: 'low' },
          10
        );
        const highPriorityProvider = new MockContextProvider(
          'high-priority',
          { priority: 'high' },
          90
        );
        const scope = this.createMockModuleScope();

        injector.registerProvider(lowPriorityProvider);
        injector.registerProvider(highPriorityProvider);

        const injectionResult = await injector.inject(scope);
        // High priority should override low priority
        if (
          !this.verifyInjectionResult(injectionResult, { priority: 'high' })
        ) {
          throw new Error('Provider priority test failed');
        }

        console.log('✅ Provider priority test passed');
        return true;
      },

      /**
       * Test error handling
       */
      testErrorHandling: async () => {
        const injector = await this.createTestInjector();
        const errorProvider = new MockContextProvider('error-provider');
        // Override provide method to throw error
        errorProvider.provide = () => {
          throw new Error('Test error');
        };
        const scope = this.createMockModuleScope();

        injector.registerProvider(errorProvider);

        const injectionResult = await injector.inject(scope);
        if (
          injectionResult.success &&
          injectionResult.errors &&
          injectionResult.errors.length > 0
        ) {
          console.log('✅ Error handling test passed');
          return true;
        }

        throw new Error('Error handling test failed');
      },

      /**
       * Run all tests
       */
      runAll: async () => {
        try {
          await this.testProvider();
          await this.testMiddleware();
          await this.testEnricher();
          await this.testAsyncProvider();
          await this.testProviderPriority();
          await this.testErrorHandling();

          console.log('🎉 All context injection tests passed!');
          return true;
        } catch (error) {
          console.error('❌ Test suite failed:', error);
          return false;
        }
      },
    };
  }
}

/**
 * Performance test patterns
 */
export class ContextInjectionPerformanceTests {
  /**
   * Test injection performance with multiple providers
   */
  static async testProviderPerformance(
    providerCount = 10,
    injectionCount = 100
  ): Promise<{
    totalTime: number;
    averageTime: number;
    throughput: number;
  }> {
    const injector = await ContextInjectionTestHelper.createTestInjector();
    const scope = ContextInjectionTestHelper.createMockModuleScope();

    // Register multiple providers
    for (let i = 0; i < providerCount; i++) {
      const provider = new MockContextProvider(
        `provider-${i}`,
        { [`data-${i}`]: `value-${i}` },
        Math.random() * 100
      );
      injector.registerProvider(provider);
    }

    // Warm up
    await injector.inject(scope);

    // Performance test
    const startTime = Date.now();

    for (let i = 0; i < injectionCount; i++) {
      await injector.inject(scope);
    }

    const totalTime = Date.now() - startTime;
    const averageTime = totalTime / injectionCount;
    const throughput = injectionCount / (totalTime / 1000);

    return {
      totalTime,
      averageTime,
      throughput,
    };
  }

  /**
   * Test caching performance
   */
  static async testCachingPerformance(injectionCount = 100): Promise<{
    cachedTime: number;
    uncachedTime: number;
    speedup: number;
  }> {
    const scope = ContextInjectionTestHelper.createMockModuleScope();

    // Test with caching disabled
    const uncachedInjector =
      await ContextInjectionTestHelper.createTestInjector({
        enableCaching: false,
      });
    const provider1 = new MockContextProvider('provider', { test: 'data' });
    uncachedInjector.registerProvider(provider1);

    const uncachedStart = Date.now();
    for (let i = 0; i < injectionCount; i++) {
      await uncachedInjector.inject(scope);
    }
    const uncachedTime = Date.now() - uncachedStart;

    // Test with caching enabled
    const cachedInjector = await ContextInjectionTestHelper.createTestInjector({
      enableCaching: true,
      cacheTtl: 60000, // 1 minute
    });
    const provider2 = new MockContextProvider('provider', { test: 'data' });
    cachedInjector.registerProvider(provider2);

    const cachedStart = Date.now();
    for (let i = 0; i < injectionCount; i++) {
      await cachedInjector.inject(scope);
    }
    const cachedTime = Date.now() - cachedStart;

    const speedup = uncachedTime / cachedTime;

    return {
      cachedTime,
      uncachedTime,
      speedup,
    };
  }
}

/**
 * Thread safety test patterns
 */
export class ContextInjectionConcurrencyTests {
  /**
   * Test concurrent injections
   */
  static async testConcurrentInjections(
    concurrency = 10,
    injectionsPerWorker = 10
  ): Promise<{
    totalTime: number;
    successCount: number;
    errorCount: number;
  }> {
    const injector = await ContextInjectionTestHelper.createTestInjector();
    const provider = new MockContextProvider('concurrent-provider', {
      concurrent: 'data',
    });
    injector.registerProvider(provider);

    const scope = ContextInjectionTestHelper.createMockModuleScope();
    let successCount = 0;
    let errorCount = 0;

    const startTime = Date.now();

    // Create concurrent workers
    const workers = Array.from(
      { length: concurrency },
      async (_, workerIndex) => {
        for (let i = 0; i < injectionsPerWorker; i++) {
          try {
            const result = await injector.inject({
              ...scope,
              correlationId: `worker-${workerIndex}-injection-${i}`,
            });

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }
      }
    );

    // Wait for all workers to complete
    await Promise.all(workers);

    const totalTime = Date.now() - startTime;

    return {
      totalTime,
      successCount,
      errorCount,
    };
  }
}

/**
 * Export all test patterns
 */
export const contextInjectionTestPatterns = {
  mocks: {
    MockContextProvider,
    MockContextMiddleware,
    MockContextEnricher,
  },
  helpers: ContextInjectionTestHelper,
  performance: ContextInjectionPerformanceTests,
  concurrency: ContextInjectionConcurrencyTests,
};
