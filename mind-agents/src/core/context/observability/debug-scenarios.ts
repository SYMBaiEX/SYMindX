/**
 * @module core/context/observability/debug-scenarios
 * @description Comprehensive debug scenarios and examples for context observability
 */

import type { 
  ContextObservabilitySystem,
  ContextDebugInfo,
  ContextTrace,
  ContextMetrics
} from '../../../types/context/context-observability.ts';
import { runtimeLogger } from '../../../utils/logger.ts';

/**
 * Debug scenario definitions
 */
export interface DebugScenario {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'memory' | 'flow' | 'transformation' | 'quality' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  steps: DebugStep[];
  expectedOutcome: string;
  troubleshootingTips: string[];
}

export interface DebugStep {
  stepNumber: number;
  action: string;
  description: string;
  code?: string;
  expectedResult?: string;
  debugCommands?: string[];
}

/**
 * Context observability debug scenarios
 */
export class ContextDebugScenarios {
  private observabilitySystem: ContextObservabilitySystem;
  private scenarios = new Map<string, DebugScenario>();

  constructor(observabilitySystem: ContextObservabilitySystem) {
    this.observabilitySystem = observabilitySystem;
    this.initializeScenarios();
  }

  /**
   * Get all available debug scenarios
   */
  getScenarios(): DebugScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Get scenario by ID
   */
  getScenario(scenarioId: string): DebugScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  /**
   * Execute a debug scenario
   */
  async executeScenario(
    scenarioId: string,
    contextId: string,
    options: { interactive?: boolean; verbose?: boolean } = {}
  ): Promise<{
    success: boolean;
    results: Array<{ stepNumber: number; result: any; error?: string }>;
    summary: string;
  }> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Debug scenario not found: ${scenarioId}`);
    }

    runtimeLogger.info('Executing debug scenario', {
      scenarioId,
      contextId,
      scenarioName: scenario.name,
      stepCount: scenario.steps.length
    });

    const results: Array<{ stepNumber: number; result: any; error?: string }> = [];
    let overallSuccess = true;

    for (const step of scenario.steps) {
      try {
        if (options.verbose) {
          console.log(`\n🔍 Step ${step.stepNumber}: ${step.action}`);
          console.log(`   Description: ${step.description}`);
        }

        const result = await this.executeStep(step, contextId, options);
        results.push({ stepNumber: step.stepNumber, result });

        if (options.verbose && result) {
          console.log(`   ✅ Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ 
          stepNumber: step.stepNumber, 
          result: null, 
          error: errorMessage 
        });
        overallSuccess = false;

        if (options.verbose) {
          console.log(`   ❌ Error: ${errorMessage}`);
        }

        runtimeLogger.error('Debug scenario step failed', {
          scenarioId,
          stepNumber: step.stepNumber,
          error: errorMessage
        });

        if (!options.interactive) {
          break; // Stop on first error unless interactive
        }
      }
    }

    const summary = this.generateScenarioSummary(scenario, results, overallSuccess);

    runtimeLogger.info('Debug scenario completed', {
      scenarioId,
      contextId,
      success: overallSuccess,
      completedSteps: results.length,
      totalSteps: scenario.steps.length
    });

    return { success: overallSuccess, results, summary };
  }

  /**
   * Get scenario recommendations based on current system state
   */
  async getScenarioRecommendations(contextId?: string): Promise<{
    recommended: DebugScenario[];
    reasons: Record<string, string>;
  }> {
    const state = this.observabilitySystem.getObservabilityState(contextId);
    const metrics = this.observabilitySystem.metrics.getAllMetrics();
    
    const recommended: DebugScenario[] = [];
    const reasons: Record<string, string> = {};

    // Analyze system state and recommend scenarios
    if (state.resources.memoryUsage > 0.8) {
      const memoryScenarios = Array.from(this.scenarios.values())
        .filter(s => s.category === 'memory');
      recommended.push(...memoryScenarios);
      memoryScenarios.forEach(s => {
        reasons[s.id] = `High memory usage detected (${(state.resources.memoryUsage * 100).toFixed(1)}%)`;
      });
    }

    if (state.resources.overhead > 50) {
      const performanceScenarios = Array.from(this.scenarios.values())
        .filter(s => s.category === 'performance');
      recommended.push(...performanceScenarios);
      performanceScenarios.forEach(s => {
        reasons[s.id] = `High observability overhead detected (${state.resources.overhead}ms)`;
      });
    }

    if (state.health.status !== 'healthy') {
      const qualityScenarios = Array.from(this.scenarios.values())
        .filter(s => s.category === 'quality');
      recommended.push(...qualityScenarios);
      qualityScenarios.forEach(s => {
        reasons[s.id] = `System health degraded: ${state.health.status}`;
      });
    }

    // Check for context-specific issues
    if (contextId && metrics.context?.instances) {
      const contextMetrics = metrics.context.instances[contextId];
      if (contextMetrics && contextMetrics.qualityScore < 0.6) {
        const transformationScenarios = Array.from(this.scenarios.values())
          .filter(s => s.category === 'transformation');
        recommended.push(...transformationScenarios);
        transformationScenarios.forEach(s => {
          reasons[s.id] = `Low context quality score: ${(contextMetrics.qualityScore * 100).toFixed(1)}%`;
        });
      }
    }

    return { recommended, reasons };
  }

  /**
   * Initialize predefined debug scenarios
   */
  private initializeScenarios(): void {
    // Performance Debug Scenario
    this.scenarios.set('performance-bottleneck', {
      id: 'performance-bottleneck',
      name: 'Context Performance Bottleneck Analysis',
      description: 'Identify and analyze performance bottlenecks in context operations',
      category: 'performance',
      severity: 'high',
      steps: [
        {
          stepNumber: 1,
          action: 'Start Performance Tracing',
          description: 'Begin tracing context operations to capture performance data',
          code: `await observabilitySystem.startObservation(contextId);`,
          expectedResult: 'Tracing started successfully',
          debugCommands: ['observabilitySystem.getObservabilityState()']
        },
        {
          stepNumber: 2,
          action: 'Simulate Load',
          description: 'Execute multiple context operations to generate performance data',
          code: `
for (let i = 0; i < 100; i++) {
  await contextOperation(contextId, 'test-load-' + i);
}`,
          expectedResult: '100 operations completed',
          debugCommands: ['observabilitySystem.metrics.getMetrics(contextId)']
        },
        {
          stepNumber: 3,
          action: 'Analyze Hot Spots',
          description: 'Identify performance hot spots using debug info',
          expectedResult: 'Hot spots identified with recommendations',
          debugCommands: [
            'debugSession = await observabilitySystem.debugger.startDebugSession(contextId)',
            'debugInfo = await observabilitySystem.debugger.getDebugInfo(debugSession)',
            'console.log(debugInfo.profile.hotSpots)'
          ]
        },
        {
          stepNumber: 4,
          action: 'Generate Recommendations',
          description: 'Create optimization recommendations based on analysis',
          expectedResult: 'Performance optimization recommendations generated'
        }
      ],
      expectedOutcome: 'Performance bottlenecks identified with specific optimization recommendations',
      troubleshootingTips: [
        'Check for expensive synchronous operations in hot spots',
        'Look for memory allocations in tight loops',
        'Consider caching frequently accessed data',
        'Implement lazy loading for heavy resources'
      ]
    });

    // Memory Leak Debug Scenario
    this.scenarios.set('memory-leak', {
      id: 'memory-leak',
      name: 'Context Memory Leak Detection',
      description: 'Detect and analyze potential memory leaks in context operations',
      category: 'memory',
      severity: 'critical',
      steps: [
        {
          stepNumber: 1,
          action: 'Enable Memory Tracking',
          description: 'Start tracking memory allocations and deallocations',
          code: `await observabilitySystem.startObservation(contextId, { 
  performance: { enableMemoryTracking: true } 
});`,
          expectedResult: 'Memory tracking enabled'
        },
        {
          stepNumber: 2,
          action: 'Baseline Memory Usage',
          description: 'Record initial memory usage before operations',
          expectedResult: 'Baseline memory usage recorded'
        },
        {
          stepNumber: 3,
          action: 'Execute Repetitive Operations',
          description: 'Run operations that might leak memory',
          code: `
for (let i = 0; i < 1000; i++) {
  const tempContext = createTemporaryContext();
  await processContext(tempContext);
  // Context should be cleaned up here
}`,
          expectedResult: 'Operations completed, checking for leaks'
        },
        {
          stepNumber: 4,
          action: 'Analyze Memory Profile',
          description: 'Check for memory growth and identify leak sources',
          expectedResult: 'Memory profile analyzed, leaks identified if present',
          debugCommands: [
            'debugInfo = await observabilitySystem.debugger.getDebugInfo(sessionId)',
            'console.log(debugInfo.profile.memoryProfile.leaks)'
          ]
        }
      ],
      expectedOutcome: 'Memory leaks detected and potential sources identified',
      troubleshootingTips: [
        'Check for unclosed event listeners or timers',
        'Verify proper cleanup of context references',
        'Look for circular references preventing garbage collection',
        'Monitor object retention and disposal patterns'
      ]
    });

    // Context Flow Debug Scenario
    this.scenarios.set('context-flow', {
      id: 'context-flow',
      name: 'Context Flow Analysis',
      description: 'Analyze context data flow and transformation patterns',
      category: 'flow',
      severity: 'medium',
      steps: [
        {
          stepNumber: 1,
          action: 'Start Flow Visualization',
          description: 'Begin capturing context flow data',
          code: `await observabilitySystem.startObservation(contextId, {
  visualization: { enableRealTimeUpdates: true }
});`,
          expectedResult: 'Flow visualization started'
        },
        {
          stepNumber: 2,
          action: 'Trace Context Transformations',
          description: 'Monitor how context data transforms through the system',
          expectedResult: 'Transformation chain captured'
        },
        {
          stepNumber: 3,
          action: 'Generate Flow Visualization',
          description: 'Create visual representation of context flow',
          code: `const visualization = await observabilitySystem.visualizer.generateVisualization(
  [contextId], 'flow'
);`,
          expectedResult: 'Flow visualization generated',
          debugCommands: ['console.log(visualization.nodes)', 'console.log(visualization.edges)']
        },
        {
          stepNumber: 4,
          action: 'Identify Flow Bottlenecks',
          description: 'Analyze flow for bottlenecks and inefficiencies',
          expectedResult: 'Flow bottlenecks identified'
        }
      ],
      expectedOutcome: 'Context flow patterns understood with bottlenecks identified',
      troubleshootingTips: [
        'Look for unnecessary data copying in transformations',
        'Check for synchronous operations blocking flow',
        'Verify proper error handling in transformation chain',
        'Consider parallel processing for independent operations'
      ]
    });

    // Context Quality Debug Scenario
    this.scenarios.set('context-quality', {
      id: 'context-quality',
      name: 'Context Quality Analysis',
      description: 'Analyze context data quality and consistency',
      category: 'quality',
      severity: 'medium',
      steps: [
        {
          stepNumber: 1,
          action: 'Start Quality Monitoring',
          description: 'Begin monitoring context quality metrics',
          code: `await observabilitySystem.startObservation(contextId);
await observabilitySystem.metrics.startCollection(contextId);`,
          expectedResult: 'Quality monitoring started'
        },
        {
          stepNumber: 2,
          action: 'Generate Quality Report',
          description: 'Analyze current context quality scores',
          expectedResult: 'Quality scores calculated for all dimensions'
        },
        {
          stepNumber: 3,
          action: 'Test Data Consistency',
          description: 'Verify data consistency across operations',
          code: `const trace = observabilitySystem.tracer.getTrace(contextId);
console.log('Quality scores:', trace.quality);`,
          expectedResult: 'Consistency verified or issues identified'
        },
        {
          stepNumber: 4,
          action: 'Recommend Improvements',
          description: 'Generate recommendations for quality improvements',
          expectedResult: 'Quality improvement recommendations provided'
        }
      ],
      expectedOutcome: 'Context quality assessed with improvement recommendations',
      troubleshootingTips: [
        'Check for incomplete data transformations',
        'Verify data validation at entry points',
        'Look for stale or outdated context data',
        'Ensure proper error handling maintains data integrity'
      ]
    });

    // Context Versioning Debug Scenario
    this.scenarios.set('version-rollback', {
      id: 'version-rollback',
      name: 'Context Version Rollback Analysis',
      description: 'Test context versioning and rollback capabilities',
      category: 'transformation',
      severity: 'medium',
      steps: [
        {
          stepNumber: 1,
          action: 'Create Initial Version',
          description: 'Create baseline version of context state',
          code: `const version1 = await observabilitySystem.versioning.createVersion(
  contextId, 'Initial state', ['baseline']
);`,
          expectedResult: 'Initial version created'
        },
        {
          stepNumber: 2,
          action: 'Apply Transformations',
          description: 'Apply several transformations to change context state',
          expectedResult: 'Transformations applied, new versions created'
        },
        {
          stepNumber: 3,
          action: 'Test Rollback',
          description: 'Rollback to initial version and verify state',
          code: `await observabilitySystem.versioning.rollbackToVersion(
  contextId, version1.version
);`,
          expectedResult: 'Rollback completed successfully'
        },
        {
          stepNumber: 4,
          action: 'Verify State Integrity',
          description: 'Confirm context state matches initial version',
          expectedResult: 'State integrity verified'
        }
      ],
      expectedOutcome: 'Versioning system validated with successful rollback',
      troubleshootingTips: [
        'Check version history for completeness',
        'Verify rollback doesn\'t break references',
        'Test edge cases with concurrent modifications',
        'Ensure proper cleanup of abandoned versions'
      ]
    });

    // Security Debug Scenario
    this.scenarios.set('security-audit', {
      id: 'security-audit',
      name: 'Context Security Audit',
      description: 'Audit context operations for security vulnerabilities',
      category: 'security',
      severity: 'high',
      steps: [
        {
          stepNumber: 1,
          action: 'Enable Security Monitoring',
          description: 'Start monitoring for security-related events',
          expectedResult: 'Security monitoring enabled'
        },
        {
          stepNumber: 2,
          action: 'Test Access Controls',
          description: 'Verify proper access control enforcement',
          expectedResult: 'Access controls verified'
        },
        {
          stepNumber: 3,
          action: 'Check Data Sanitization',
          description: 'Ensure sensitive data is properly sanitized',
          expectedResult: 'Data sanitization verified'
        },
        {
          stepNumber: 4,
          action: 'Generate Security Report',
          description: 'Create comprehensive security assessment',
          expectedResult: 'Security report generated with recommendations'
        }
      ],
      expectedOutcome: 'Security posture assessed with vulnerability report',
      troubleshootingTips: [
        'Check for sensitive data in logs or traces',
        'Verify proper authentication and authorization',
        'Look for potential injection vulnerabilities',
        'Ensure secure data transmission and storage'
      ]
    });

    runtimeLogger.debug('Debug scenarios initialized', {
      scenarioCount: this.scenarios.size,
      categories: Array.from(new Set(Array.from(this.scenarios.values()).map(s => s.category)))
    });
  }

  /**
   * Execute a single debug step
   */
  private async executeStep(
    step: DebugStep,
    contextId: string,
    options: { interactive?: boolean; verbose?: boolean }
  ): Promise<any> {
    // This is a simplified execution - in a real implementation,
    // you would parse and execute the actual code/commands
    
    switch (step.action) {
      case 'Start Performance Tracing':
      case 'Start Flow Visualization':
      case 'Enable Memory Tracking':
      case 'Start Quality Monitoring':
        return await this.observabilitySystem.startObservation(contextId);

      case 'Analyze Hot Spots':
      case 'Analyze Memory Profile':
        const sessionId = await this.observabilitySystem.debugger.startDebugSession(contextId);
        const debugInfo = await this.observabilitySystem.debugger.getDebugInfo(sessionId);
        return debugInfo.profile;

      case 'Generate Flow Visualization':
        return await this.observabilitySystem.visualizer.generateVisualization([contextId], 'flow');

      case 'Create Initial Version':
        return await this.observabilitySystem.versioning.createVersion(
          contextId, 'Debug scenario - Initial state', ['debug', 'baseline']
        );

      case 'Test Rollback':
        const versions = await this.observabilitySystem.versioning.getVersionHistory(contextId);
        if (versions.length > 0) {
          await this.observabilitySystem.versioning.rollbackToVersion(contextId, versions[0].version);
          return { rolledBackTo: versions[0].version };
        }
        return { rolledBackTo: null };

      default:
        // For other steps, return a mock result
        return { 
          step: step.stepNumber,
          action: step.action,
          contextId,
          timestamp: new Date(),
          status: 'completed'
        };
    }
  }

  /**
   * Generate scenario execution summary
   */
  private generateScenarioSummary(
    scenario: DebugScenario,
    results: Array<{ stepNumber: number; result: any; error?: string }>,
    overallSuccess: boolean
  ): string {
    const completedSteps = results.filter(r => !r.error).length;
    const failedSteps = results.filter(r => r.error).length;

    let summary = `Debug Scenario: ${scenario.name}\n`;
    summary += `Category: ${scenario.category} | Severity: ${scenario.severity}\n`;
    summary += `Status: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}\n`;
    summary += `Completed: ${completedSteps}/${scenario.steps.length} steps\n`;

    if (failedSteps > 0) {
      summary += `\nFailed Steps:\n`;
      results.forEach(result => {
        if (result.error) {
          summary += `  Step ${result.stepNumber}: ${result.error}\n`;
        }
      });
    }

    if (overallSuccess) {
      summary += `\n${scenario.expectedOutcome}\n`;
    }

    summary += `\nTroubleshooting Tips:\n`;
    scenario.troubleshootingTips.forEach((tip, index) => {
      summary += `  ${index + 1}. ${tip}\n`;
    });

    return summary;
  }

  /**
   * Export scenario results for analysis
   */
  exportScenarioResults(
    scenarioId: string,
    results: Array<{ stepNumber: number; result: any; error?: string }>
  ): string {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    const exportData = {
      scenario: {
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        severity: scenario.severity
      },
      execution: {
        timestamp: new Date().toISOString(),
        results,
        summary: this.generateScenarioSummary(scenario, results, !results.some(r => r.error))
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get statistics about available scenarios
   */
  getStatistics() {
    const scenarios = Array.from(this.scenarios.values());
    const categories = Array.from(new Set(scenarios.map(s => s.category)));
    const severities = Array.from(new Set(scenarios.map(s => s.severity)));

    return {
      totalScenarios: scenarios.length,
      categories: categories.reduce((acc, cat) => {
        acc[cat] = scenarios.filter(s => s.category === cat).length;
        return acc;
      }, {} as Record<string, number>),
      severities: severities.reduce((acc, sev) => {
        acc[sev] = scenarios.filter(s => s.severity === sev).length;
        return acc;
      }, {} as Record<string, number>),
      averageStepsPerScenario: scenarios.reduce((sum, s) => sum + s.steps.length, 0) / scenarios.length
    };
  }
}

/**
 * Create debug scenarios instance
 */
export function createDebugScenarios(observabilitySystem: ContextObservabilitySystem): ContextDebugScenarios {
  return new ContextDebugScenarios(observabilitySystem);
}

/**
 * Example usage function
 */
export async function runExampleDebugSession(observabilitySystem: ContextObservabilitySystem): Promise<void> {
  const debugScenarios = new ContextDebugScenarios(observabilitySystem);
  const contextId = 'example-context-' + Date.now();

  console.log('🔍 Starting Example Debug Session');
  console.log('=====================================');

  try {
    // Get scenario recommendations
    const recommendations = await debugScenarios.getScenarioRecommendations();
    console.log('\n📋 Recommended Scenarios:');
    recommendations.recommended.forEach(scenario => {
      console.log(`  • ${scenario.name} (${scenario.category})`);
      console.log(`    Reason: ${recommendations.reasons[scenario.id]}`);
    });

    // Run performance bottleneck scenario
    console.log('\n🚀 Running Performance Bottleneck Analysis...');
    const result = await debugScenarios.executeScenario(
      'performance-bottleneck',
      contextId,
      { interactive: false, verbose: true }
    );

    console.log('\n📊 Scenario Results:');
    console.log(result.summary);

    // Export results
    const exportData = debugScenarios.exportScenarioResults('performance-bottleneck', result.results);
    console.log('\n💾 Exported Results:');
    console.log(exportData);

  } catch (error) {
    console.error('❌ Debug session failed:', error);
  } finally {
    console.log('\n🏁 Debug session completed');
  }
}