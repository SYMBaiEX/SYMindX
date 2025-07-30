import { EventEmitter } from 'events';
import { runtimeLogger } from '../../src/utils/logger';

/**
 * Chaos Engineering Framework for SYMindX
 * Implements controlled failure injection for resilience testing
 */

export interface ChaosScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1
  duration?: number; // milliseconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetComponent?: string;
  conditions?: () => boolean;
}

export interface ChaosResult {
  scenarioId: string;
  timestamp: Date;
  success: boolean;
  impact: string;
  recovery: boolean;
  recoveryTime?: number;
  errors?: string[];
}

export class ChaosFramework extends EventEmitter {
  private scenarios: Map<string, ChaosScenario> = new Map();
  private activeScenarios: Set<string> = new Set();
  private results: ChaosResult[] = [];
  private enabled: boolean = false;

  constructor() {
    super();
    this.initializeScenarios();
  }

  private initializeScenarios(): void {
    // Network chaos scenarios
    this.addScenario({
      id: 'network-latency',
      name: 'Network Latency Injection',
      description: 'Adds artificial latency to network requests',
      probability: 0.1,
      duration: 5000,
      severity: 'medium',
      targetComponent: 'portal',
    });

    this.addScenario({
      id: 'network-failure',
      name: 'Network Connection Failure',
      description: 'Simulates network connection failures',
      probability: 0.05,
      duration: 3000,
      severity: 'high',
      targetComponent: 'portal',
    });

    // Memory chaos scenarios
    this.addScenario({
      id: 'memory-pressure',
      name: 'Memory Pressure Simulation',
      description: 'Creates artificial memory pressure',
      probability: 0.08,
      duration: 10000,
      severity: 'high',
      targetComponent: 'memory',
    });

    this.addScenario({
      id: 'memory-leak',
      name: 'Memory Leak Simulation',
      description: 'Simulates a memory leak scenario',
      probability: 0.03,
      duration: 30000,
      severity: 'critical',
      targetComponent: 'memory',
    });

    // Agent chaos scenarios
    this.addScenario({
      id: 'agent-crash',
      name: 'Agent Crash Simulation',
      description: 'Simulates sudden agent failure',
      probability: 0.05,
      severity: 'high',
      targetComponent: 'agent',
    });

    this.addScenario({
      id: 'agent-unresponsive',
      name: 'Agent Unresponsive State',
      description: 'Makes agent temporarily unresponsive',
      probability: 0.1,
      duration: 5000,
      severity: 'medium',
      targetComponent: 'agent',
    });

    // Multi-agent chaos scenarios
    this.addScenario({
      id: 'byzantine-agent',
      name: 'Byzantine Agent Behavior',
      description: 'Agent sends conflicting messages to others',
      probability: 0.03,
      duration: 15000,
      severity: 'critical',
      targetComponent: 'multi-agent',
    });

    this.addScenario({
      id: 'split-brain',
      name: 'Split-Brain Scenario',
      description: 'Network partition between agent groups',
      probability: 0.02,
      duration: 20000,
      severity: 'critical',
      targetComponent: 'multi-agent',
    });

    // Database chaos scenarios
    this.addScenario({
      id: 'db-slowdown',
      name: 'Database Slowdown',
      description: 'Simulates slow database queries',
      probability: 0.1,
      duration: 8000,
      severity: 'medium',
      targetComponent: 'database',
    });

    this.addScenario({
      id: 'db-connection-pool-exhaustion',
      name: 'Connection Pool Exhaustion',
      description: 'Exhausts database connection pool',
      probability: 0.05,
      duration: 10000,
      severity: 'high',
      targetComponent: 'database',
    });

    // AI-specific chaos scenarios
    this.addScenario({
      id: 'ai-hallucination',
      name: 'AI Hallucination Injection',
      description: 'Injects nonsensical responses',
      probability: 0.05,
      duration: 2000,
      severity: 'medium',
      targetComponent: 'portal',
    });

    this.addScenario({
      id: 'emotion-overflow',
      name: 'Emotion System Overflow',
      description: 'Causes extreme emotion states',
      probability: 0.08,
      duration: 5000,
      severity: 'medium',
      targetComponent: 'emotion',
    });

    this.addScenario({
      id: 'context-corruption',
      name: 'Context Data Corruption',
      description: 'Corrupts context data in transit',
      probability: 0.03,
      severity: 'high',
      targetComponent: 'context',
    });
  }

  public addScenario(scenario: ChaosScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  public enable(): void {
    this.enabled = true;
    runtimeLogger.warn('Chaos Framework enabled - expect failures!');
  }

  public disable(): void {
    this.enabled = false;
    this.activeScenarios.clear();
    runtimeLogger.info('Chaos Framework disabled');
  }

  public async injectChaos(targetComponent?: string): Promise<ChaosResult | null> {
    if (!this.enabled) return null;

    const eligibleScenarios = Array.from(this.scenarios.values()).filter(scenario => {
      if (targetComponent && scenario.targetComponent !== targetComponent) return false;
      if (scenario.conditions && !scenario.conditions()) return false;
      if (this.activeScenarios.has(scenario.id)) return false;
      return Math.random() < scenario.probability;
    });

    if (eligibleScenarios.length === 0) return null;

    const scenario = eligibleScenarios[Math.floor(Math.random() * eligibleScenarios.length)];
    return this.executeScenario(scenario);
  }

  private async executeScenario(scenario: ChaosScenario): Promise<ChaosResult> {
    const startTime = Date.now();
    this.activeScenarios.add(scenario.id);
    
    const result: ChaosResult = {
      scenarioId: scenario.id,
      timestamp: new Date(),
      success: false,
      impact: '',
      recovery: false,
    };

    try {
      runtimeLogger.warn(`Chaos scenario initiated: ${scenario.name}`, {
        scenario: scenario.id,
        severity: scenario.severity,
        duration: scenario.duration,
      });

      this.emit('chaos:start', scenario);

      // Execute scenario-specific chaos
      await this.executeChaosLogic(scenario);

      result.success = true;
      result.impact = `Successfully injected ${scenario.name}`;

      // Auto-recovery after duration
      if (scenario.duration) {
        setTimeout(async () => {
          try {
            await this.recoverFromChaos(scenario);
            result.recovery = true;
            result.recoveryTime = Date.now() - startTime;
            this.emit('chaos:recovered', scenario, result);
          } catch (error) {
            result.errors = result.errors || [];
            result.errors.push(`Recovery failed: ${error}`);
          } finally {
            this.activeScenarios.delete(scenario.id);
          }
        }, scenario.duration);
      } else {
        this.activeScenarios.delete(scenario.id);
      }

      this.emit('chaos:injected', scenario, result);
    } catch (error) {
      result.errors = [error.toString()];
      this.activeScenarios.delete(scenario.id);
      this.emit('chaos:failed', scenario, result);
    }

    this.results.push(result);
    return result;
  }

  private async executeChaosLogic(scenario: ChaosScenario): Promise<void> {
    switch (scenario.id) {
      case 'network-latency':
        await this.injectNetworkLatency(scenario.duration || 5000);
        break;
      case 'network-failure':
        await this.injectNetworkFailure();
        break;
      case 'memory-pressure':
        await this.injectMemoryPressure();
        break;
      case 'memory-leak':
        await this.injectMemoryLeak();
        break;
      case 'agent-crash':
        await this.injectAgentCrash();
        break;
      case 'agent-unresponsive':
        await this.injectAgentUnresponsive();
        break;
      case 'byzantine-agent':
        await this.injectByzantineAgent();
        break;
      case 'split-brain':
        await this.injectSplitBrain();
        break;
      case 'db-slowdown':
        await this.injectDatabaseSlowdown();
        break;
      case 'db-connection-pool-exhaustion':
        await this.injectConnectionPoolExhaustion();
        break;
      case 'ai-hallucination':
        await this.injectAIHallucination();
        break;
      case 'emotion-overflow':
        await this.injectEmotionOverflow();
        break;
      case 'context-corruption':
        await this.injectContextCorruption();
        break;
      default:
        throw new Error(`Unknown chaos scenario: ${scenario.id}`);
    }
  }

  private async recoverFromChaos(scenario: ChaosScenario): Promise<void> {
    runtimeLogger.info(`Recovering from chaos scenario: ${scenario.name}`);
    // Scenario-specific recovery logic
    this.emit('chaos:recovering', scenario);
  }

  // Chaos injection implementations
  private async injectNetworkLatency(duration: number): Promise<void> {
    // Implementation would hook into network layer
    this.emit('network:latency', { duration });
  }

  private async injectNetworkFailure(): Promise<void> {
    this.emit('network:failure');
  }

  private async injectMemoryPressure(): Promise<void> {
    const arrays: any[] = [];
    const interval = setInterval(() => {
      arrays.push(new Array(1000000).fill(Math.random()));
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      arrays.length = 0; // Clear references
    }, 5000);
  }

  private async injectMemoryLeak(): Promise<void> {
    // Simulated memory leak that won't actually crash the system
    const leakedObjects: any[] = [];
    const interval = setInterval(() => {
      leakedObjects.push({
        data: new Array(10000).fill(Math.random()),
        timestamp: Date.now(),
      });
    }, 1000);

    // Auto-cleanup after 30 seconds to prevent actual issues
    setTimeout(() => {
      clearInterval(interval);
    }, 30000);
  }

  private async injectAgentCrash(): Promise<void> {
    this.emit('agent:crash');
  }

  private async injectAgentUnresponsive(): Promise<void> {
    this.emit('agent:unresponsive');
  }

  private async injectByzantineAgent(): Promise<void> {
    this.emit('agent:byzantine');
  }

  private async injectSplitBrain(): Promise<void> {
    this.emit('network:partition');
  }

  private async injectDatabaseSlowdown(): Promise<void> {
    this.emit('database:slowdown');
  }

  private async injectConnectionPoolExhaustion(): Promise<void> {
    this.emit('database:pool-exhausted');
  }

  private async injectAIHallucination(): Promise<void> {
    this.emit('ai:hallucination');
  }

  private async injectEmotionOverflow(): Promise<void> {
    this.emit('emotion:overflow');
  }

  private async injectContextCorruption(): Promise<void> {
    this.emit('context:corruption');
  }

  public getResults(): ChaosResult[] {
    return [...this.results];
  }

  public clearResults(): void {
    this.results = [];
  }

  public getActiveScenarios(): string[] {
    return Array.from(this.activeScenarios);
  }

  public isScenarioActive(scenarioId: string): boolean {
    return this.activeScenarios.has(scenarioId);
  }

  public getScenario(scenarioId: string): ChaosScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  public getAllScenarios(): ChaosScenario[] {
    return Array.from(this.scenarios.values());
  }
}

// Singleton instance
export const chaosFramework = new ChaosFramework();

// Chaos testing utilities
export class ChaosTestRunner {
  private framework: ChaosFramework;

  constructor(framework: ChaosFramework = chaosFramework) {
    this.framework = framework;
  }

  public async runScenario(scenarioId: string, times: number = 1): Promise<ChaosResult[]> {
    const results: ChaosResult[] = [];
    const scenario = this.framework.getScenario(scenarioId);
    
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    this.framework.enable();

    for (let i = 0; i < times; i++) {
      const result = await this.framework['executeScenario'](scenario);
      results.push(result);
      
      // Wait for scenario to complete if it has duration
      if (scenario.duration) {
        await new Promise(resolve => setTimeout(resolve, scenario.duration! + 1000));
      }
    }

    this.framework.disable();
    return results;
  }

  public async runAllScenarios(): Promise<Map<string, ChaosResult[]>> {
    const results = new Map<string, ChaosResult[]>();
    const scenarios = this.framework.getAllScenarios();

    for (const scenario of scenarios) {
      const scenarioResults = await this.runScenario(scenario.id, 1);
      results.set(scenario.id, scenarioResults);
    }

    return results;
  }

  public async runChaosTest(
    testFn: () => Promise<void>,
    scenarioIds: string[],
    options: {
      concurrent?: boolean;
      iterations?: number;
      delayBetween?: number;
    } = {}
  ): Promise<{
    testResults: any[];
    chaosResults: ChaosResult[];
    failures: number;
    recoveries: number;
  }> {
    const { concurrent = false, iterations = 1, delayBetween = 1000 } = options;
    const testResults: any[] = [];
    const chaosResults: ChaosResult[] = [];
    let failures = 0;
    let recoveries = 0;

    this.framework.enable();

    for (let i = 0; i < iterations; i++) {
      // Inject chaos
      if (concurrent) {
        await Promise.all(
          scenarioIds.map(id => this.runScenario(id, 1))
        ).then(results => {
          results.flat().forEach(result => {
            chaosResults.push(result);
            if (!result.success) failures++;
            if (result.recovery) recoveries++;
          });
        });
      } else {
        for (const scenarioId of scenarioIds) {
          const results = await this.runScenario(scenarioId, 1);
          results.forEach(result => {
            chaosResults.push(result);
            if (!result.success) failures++;
            if (result.recovery) recoveries++;
          });
        }
      }

      // Run test function
      try {
        const result = await testFn();
        testResults.push({ iteration: i, success: true, result });
      } catch (error) {
        testResults.push({ iteration: i, success: false, error });
        failures++;
      }

      if (delayBetween > 0 && i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }

    this.framework.disable();

    return {
      testResults,
      chaosResults,
      failures,
      recoveries,
    };
  }
}