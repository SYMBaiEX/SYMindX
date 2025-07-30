/**
 * @module chaos-testing
 * @description Chaos testing utilities for context system resilience testing
 */

/**
 * Chaos testing configuration
 */
export interface ChaosConfig {
  failureRate: number; // 0-1
  latencyMin: number; // ms
  latencyMax: number; // ms
  memoryPressure: boolean;
  resourceExhaustion: boolean;
  networkFailures: boolean;
  timeouts: boolean;
}

/**
 * Chaos result tracking
 */
export interface ChaosResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  chaosFailures: number;
  unexpectedFailures: number;
  averageLatency: number;
  maxLatency: number;
  errors: string[];
}

/**
 * Chaos injection utilities
 */
export class ChaosInjector {
  private config: ChaosConfig;
  private isActive = false;

  constructor(config: ChaosConfig) {
    this.config = config;
  }

  /**
   * Start chaos testing
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Stop chaos testing
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Inject chaos into an operation
   */
  async inject<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isActive) {
      return operation();
    }

    // Random latency injection
    if (this.config.latencyMax > 0) {
      const latency =
        Math.random() * (this.config.latencyMax - this.config.latencyMin) +
        this.config.latencyMin;
      await this.sleep(latency);
    }

    // Random failure injection
    if (Math.random() < this.config.failureRate) {
      throw new Error('CHAOS_INJECTED_FAILURE');
    }

    // Memory pressure injection
    if (this.config.memoryPressure && Math.random() < 0.1) {
      const memoryPressure = Buffer.alloc(10 * 1024 * 1024, 'x'); // 10MB
      setTimeout(() => {
        // Release memory after operation
        memoryPressure.fill(0);
      }, 1000);
    }

    // Timeout injection
    if (this.config.timeouts && Math.random() < 0.05) {
      return Promise.race([
        operation(),
        this.timeoutPromise(100, 'CHAOS_TIMEOUT'),
      ]);
    }

    return operation();
  }

  /**
   * Create a chaos-wrapped version of a function
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: any[]) => {
      return this.inject(() => fn(...args));
    }) as T;
  }

  /**
   * Run operation with chaos and collect results
   */
  async runWithChaos<T>(
    operation: () => Promise<T>,
    iterations: number
  ): Promise<ChaosResult> {
    const result: ChaosResult = {
      totalOperations: iterations,
      successfulOperations: 0,
      failedOperations: 0,
      chaosFailures: 0,
      unexpectedFailures: 0,
      averageLatency: 0,
      maxLatency: 0,
      errors: [],
    };

    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await this.inject(operation);
        const latency = performance.now() - start;
        latencies.push(latency);
        result.successfulOperations++;
      } catch (error) {
        const latency = performance.now() - start;
        latencies.push(latency);
        result.failedOperations++;

        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('CHAOS_')) {
          result.chaosFailures++;
        } else {
          result.unexpectedFailures++;
          result.errors.push(errorMessage);
        }
      }
    }

    result.averageLatency =
      latencies.reduce((a, b) => a + b, 0) / latencies.length;
    result.maxLatency = Math.max(...latencies);

    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private timeoutPromise<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}

/**
 * Context-specific chaos scenarios
 */
export class ContextChaosScenarios {
  private injector: ChaosInjector;

  constructor(config: ChaosConfig) {
    this.injector = new ChaosInjector(config);
  }

  /**
   * Test context creation under chaos
   */
  async testContextCreationResilience(
    createContext: () => Promise<any>,
    iterations: number = 100
  ): Promise<ChaosResult> {
    this.injector.activate();

    try {
      return await this.injector.runWithChaos(createContext, iterations);
    } finally {
      this.injector.deactivate();
    }
  }

  /**
   * Test message processing under chaos
   */
  async testMessageProcessingResilience(
    processMessage: (message: string) => Promise<void>,
    messageCount: number = 200
  ): Promise<ChaosResult> {
    this.injector.activate();

    const messages = Array.from(
      { length: messageCount },
      (_, i) => `Chaos test message ${i}`
    );

    try {
      return await this.injector.runWithChaos(async () => {
        const message = messages[Math.floor(Math.random() * messages.length)];
        await processMessage(message);
      }, messageCount);
    } finally {
      this.injector.deactivate();
    }
  }

  /**
   * Test context switching under chaos
   */
  async testContextSwitchingResilience(
    switchContext: (contextId: string) => Promise<boolean>,
    contextIds: string[],
    iterations: number = 150
  ): Promise<ChaosResult> {
    this.injector.activate();

    try {
      return await this.injector.runWithChaos(async () => {
        const contextId =
          contextIds[Math.floor(Math.random() * contextIds.length)];
        return switchContext(contextId);
      }, iterations);
    } finally {
      this.injector.deactivate();
    }
  }

  /**
   * Test concurrent context operations under chaos
   */
  async testConcurrentOperationsResilience(
    operations: Array<() => Promise<void>>,
    concurrency: number = 10,
    rounds: number = 20
  ): Promise<ChaosResult> {
    this.injector.activate();

    let totalOperations = 0;
    let successfulOperations = 0;
    let failedOperations = 0;
    let chaosFailures = 0;
    let unexpectedFailures = 0;
    const errors: string[] = [];
    const latencies: number[] = [];

    try {
      for (let round = 0; round < rounds; round++) {
        const roundOperations = Array.from({ length: concurrency }, () => {
          const operation =
            operations[Math.floor(Math.random() * operations.length)];
          return this.executeWithTracking(operation, latencies, errors);
        });

        const results = await Promise.allSettled(roundOperations);

        for (const result of results) {
          totalOperations++;

          if (result.status === 'fulfilled') {
            const { success, chaosFailure } = result.value;
            if (success) {
              successfulOperations++;
            } else {
              failedOperations++;
              if (chaosFailure) {
                chaosFailures++;
              } else {
                unexpectedFailures++;
              }
            }
          } else {
            failedOperations++;
            const errorMessage =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            if (errorMessage.includes('CHAOS_')) {
              chaosFailures++;
            } else {
              unexpectedFailures++;
              errors.push(errorMessage);
            }
          }
        }
      }
    } finally {
      this.injector.deactivate();
    }

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      chaosFailures,
      unexpectedFailures,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      errors,
    };
  }

  private async executeWithTracking(
    operation: () => Promise<void>,
    latencies: number[],
    errors: string[]
  ): Promise<{ success: boolean; chaosFailure: boolean }> {
    const start = performance.now();

    try {
      await this.injector.inject(operation);
      latencies.push(performance.now() - start);
      return { success: true, chaosFailure: false };
    } catch (error) {
      latencies.push(performance.now() - start);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const chaosFailure = errorMessage.includes('CHAOS_');

      if (!chaosFailure) {
        errors.push(errorMessage);
      }

      return { success: false, chaosFailure };
    }
  }
}

/**
 * Network chaos simulation
 */
export class NetworkChaosSimulator {
  private networkLatency = 0;
  private packetLoss = 0;
  private isActive = false;

  /**
   * Configure network conditions
   */
  configure(latencyMs: number, packetLossRate: number): void {
    this.networkLatency = latencyMs;
    this.packetLoss = packetLossRate;
  }

  /**
   * Activate network chaos
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * Deactivate network chaos
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Simulate network operation with chaos
   */
  async simulateNetworkOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isActive) {
      return operation();
    }

    // Simulate packet loss
    if (Math.random() < this.packetLoss) {
      throw new Error('NETWORK_PACKET_LOSS');
    }

    // Simulate network latency
    if (this.networkLatency > 0) {
      const latency =
        this.networkLatency + (Math.random() - 0.5) * this.networkLatency * 0.5;
      await this.sleep(Math.max(0, latency));
    }

    return operation();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Resource exhaustion simulator
 */
export class ResourceExhaustionSimulator {
  private memoryPressure: Buffer[] = [];
  private cpuIntensiveIntervals: NodeJS.Timeout[] = [];

  /**
   * Simulate memory pressure
   */
  simulateMemoryPressure(sizeMB: number, durationMs: number): void {
    const buffer = Buffer.alloc(sizeMB * 1024 * 1024, 'x');
    this.memoryPressure.push(buffer);

    setTimeout(() => {
      const index = this.memoryPressure.indexOf(buffer);
      if (index > -1) {
        this.memoryPressure.splice(index, 1);
      }
    }, durationMs);
  }

  /**
   * Simulate CPU pressure
   */
  simulateCPUPressure(intensity: number, durationMs: number): void {
    const interval = setInterval(() => {
      const start = Date.now();
      while (Date.now() - start < intensity * 10) {
        Math.random(); // Busy wait
      }
    }, 100);

    this.cpuIntensiveIntervals.push(interval);

    setTimeout(() => {
      clearInterval(interval);
      const index = this.cpuIntensiveIntervals.indexOf(interval);
      if (index > -1) {
        this.cpuIntensiveIntervals.splice(index, 1);
      }
    }, durationMs);
  }

  /**
   * Clean up all simulated pressure
   */
  cleanup(): void {
    this.memoryPressure.length = 0;
    this.cpuIntensiveIntervals.forEach((interval) => clearInterval(interval));
    this.cpuIntensiveIntervals.length = 0;

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}

/**
 * Complete chaos testing suite
 */
export class ChaosTestSuite {
  private contextScenarios: ContextChaosScenarios;
  private networkSimulator: NetworkChaosSimulator;
  private resourceSimulator: ResourceExhaustionSimulator;

  constructor(chaosConfig: ChaosConfig) {
    this.contextScenarios = new ContextChaosScenarios(chaosConfig);
    this.networkSimulator = new NetworkChaosSimulator();
    this.resourceSimulator = new ResourceExhaustionSimulator();
  }

  /**
   * Run comprehensive chaos testing
   */
  async runComprehensiveTest(operations: {
    createContext: () => Promise<any>;
    processMessage: (message: string) => Promise<void>;
    switchContext: (contextId: string) => Promise<boolean>;
    concurrentOps: Array<() => Promise<void>>;
  }): Promise<{
    contextCreationResilience: ChaosResult;
    messageProcessingResilience: ChaosResult;
    contextSwitchingResilience: ChaosResult;
    concurrentOperationsResilience: ChaosResult;
  }> {
    console.log('Starting comprehensive chaos testing...');

    // Simulate various pressures
    this.networkSimulator.configure(50, 0.02); // 50ms latency, 2% packet loss
    this.networkSimulator.activate();

    this.resourceSimulator.simulateMemoryPressure(50, 30000); // 50MB for 30s
    this.resourceSimulator.simulateCPUPressure(5, 30000); // Light CPU pressure for 30s

    try {
      const results = await Promise.all([
        this.contextScenarios.testContextCreationResilience(
          operations.createContext
        ),
        this.contextScenarios.testMessageProcessingResilience(
          operations.processMessage
        ),
        this.contextScenarios.testContextSwitchingResilience(
          operations.switchContext,
          ['ctx-1', 'ctx-2', 'ctx-3', 'ctx-4', 'ctx-5']
        ),
        this.contextScenarios.testConcurrentOperationsResilience(
          operations.concurrentOps
        ),
      ]);

      return {
        contextCreationResilience: results[0],
        messageProcessingResilience: results[1],
        contextSwitchingResilience: results[2],
        concurrentOperationsResilience: results[3],
      };
    } finally {
      this.networkSimulator.deactivate();
      this.resourceSimulator.cleanup();
    }
  }

  /**
   * Generate chaos test report
   */
  generateChaosReport(results: {
    contextCreationResilience: ChaosResult;
    messageProcessingResilience: ChaosResult;
    contextSwitchingResilience: ChaosResult;
    concurrentOperationsResilience: ChaosResult;
  }): string {
    const report = ['Chaos Testing Report', '====================', ''];

    const scenarios = [
      { name: 'Context Creation', result: results.contextCreationResilience },
      {
        name: 'Message Processing',
        result: results.messageProcessingResilience,
      },
      { name: 'Context Switching', result: results.contextSwitchingResilience },
      {
        name: 'Concurrent Operations',
        result: results.concurrentOperationsResilience,
      },
    ];

    for (const scenario of scenarios) {
      const { name, result } = scenario;
      const successRate =
        (result.successfulOperations / result.totalOperations) * 100;
      const chaosRate = (result.chaosFailures / result.totalOperations) * 100;
      const unexpectedRate =
        (result.unexpectedFailures / result.totalOperations) * 100;

      report.push(`${name}:`);
      report.push(`  Total Operations: ${result.totalOperations}`);
      report.push(`  Success Rate: ${successRate.toFixed(1)}%`);
      report.push(`  Chaos Failures: ${chaosRate.toFixed(1)}%`);
      report.push(`  Unexpected Failures: ${unexpectedRate.toFixed(1)}%`);
      report.push(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`);
      report.push(`  Max Latency: ${result.maxLatency.toFixed(2)}ms`);

      if (result.errors.length > 0) {
        report.push(`  Unexpected Errors:`);
        result.errors.slice(0, 5).forEach((error) => {
          report.push(`    - ${error}`);
        });
        if (result.errors.length > 5) {
          report.push(`    ... and ${result.errors.length - 5} more`);
        }
      }

      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Clean up all chaos testing resources
   */
  cleanup(): void {
    this.networkSimulator.deactivate();
    this.resourceSimulator.cleanup();
  }
}
