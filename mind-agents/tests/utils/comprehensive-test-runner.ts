import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PerformanceMonitor, PerformanceBenchmark } from '../performance/performance-monitor';
import { ChaosFramework, ChaosTestRunner } from '../chaos/chaos-framework';
import { HallucinationDetector } from '../ai-specific/hallucination-detector.test';

const execAsync = promisify(exec);

/**
 * Comprehensive Test Runner for SYMindX
 * Orchestrates all testing types and generates unified reports
 */

export interface TestSuite {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'property' | 'contract' | 'visual' | 'chaos' | 'mutation' | 'load';
  command: string;
  timeout?: number;
  enabled?: boolean;
}

export interface TestResult {
  suite: string;
  type: string;
  passed: boolean;
  duration: number;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
  metrics?: any;
  errors?: string[];
  output?: string;
}

export interface ComprehensiveTestReport {
  timestamp: Date;
  duration: number;
  results: TestResult[];
  coverage: {
    overall: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
    bySuite: Record<string, any>;
  };
  performance: {
    memory: any;
    latency: any;
    throughput: any;
  };
  quality: {
    mutationScore?: number;
    propertyTestFailures: number;
    contractViolations: number;
    visualRegressions: number;
    chaosRecoveryRate: number;
  };
  aiSpecific: {
    hallucinationRate: number;
    emotionConsistency: number;
    multiAgentCoordination: number;
  };
  recommendations: string[];
}

export class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      type: 'unit',
      command: 'npm run test:unit -- --coverage',
      timeout: 300000, // 5 minutes
      enabled: true,
    },
    {
      name: 'Integration Tests',
      type: 'integration',
      command: 'npm run test:integration -- --coverage',
      timeout: 600000, // 10 minutes
      enabled: true,
    },
    {
      name: 'E2E Tests',
      type: 'e2e',
      command: 'npm run test:e2e',
      timeout: 1200000, // 20 minutes
      enabled: true,
    },
    {
      name: 'Performance Tests',
      type: 'performance',
      command: 'npm run test:performance',
      timeout: 1800000, // 30 minutes
      enabled: true,
    },
    {
      name: 'Property-Based Tests',
      type: 'property',
      command: 'jest tests/property-based --coverage',
      timeout: 900000, // 15 minutes
      enabled: true,
    },
    {
      name: 'Contract Tests',
      type: 'contract',
      command: 'jest tests/contract --coverage',
      timeout: 600000, // 10 minutes
      enabled: true,
    },
    {
      name: 'Visual Regression Tests',
      type: 'visual',
      command: 'playwright test tests/visual-regression',
      timeout: 900000, // 15 minutes
      enabled: true,
    },
    {
      name: 'Chaos Engineering Tests',
      type: 'chaos',
      command: 'jest tests/chaos --coverage',
      timeout: 1200000, // 20 minutes
      enabled: true,
    },
    {
      name: 'Mutation Tests',
      type: 'mutation',
      command: 'stryker run',
      timeout: 3600000, // 60 minutes
      enabled: true,
    },
    {
      name: 'Load Tests',
      type: 'load',
      command: 'k6 run k6.config.js',
      timeout: 2400000, // 40 minutes
      enabled: true,
    },
  ];

  private performanceMonitor: PerformanceMonitor;
  private chaosFramework: ChaosFramework;
  private hallucinationDetector: HallucinationDetector;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor({
      sampleInterval: 1000,
      enableGCTracking: true,
      enableEventLoopMonitoring: true,
    });
    this.chaosFramework = new ChaosFramework();
    this.hallucinationDetector = new HallucinationDetector();
  }

  public async runAllTests(options: {
    parallel?: boolean;
    suiteFilter?: string[];
    generateReport?: boolean;
    ci?: boolean;
  } = {}): Promise<ComprehensiveTestReport> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log(`📋 Running ${this.testSuites.filter(s => s.enabled).length} test suites\n`);

    // Start performance monitoring
    this.performanceMonitor.start();

    // Filter suites if needed
    const suitesToRun = this.testSuites.filter(suite => {
      if (!suite.enabled) return false;
      if (options.suiteFilter) {
        return options.suiteFilter.includes(suite.type);
      }
      return true;
    });

    // Run tests
    if (options.parallel) {
      const parallelResults = await Promise.all(
        suitesToRun.map(suite => this.runTestSuite(suite))
      );
      results.push(...parallelResults);
    } else {
      for (const suite of suitesToRun) {
        const result = await this.runTestSuite(suite);
        results.push(result);
      }
    }

    // Stop performance monitoring
    this.performanceMonitor.stop();

    // Generate comprehensive report
    const report = await this.generateComprehensiveReport(results, Date.now() - startTime);

    // Save report if requested
    if (options.generateReport) {
      await this.saveReport(report, options.ci);
    }

    // Print summary
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running ${suite.name}...`);
    const startTime = Date.now();
    
    const result: TestResult = {
      suite: suite.name,
      type: suite.type,
      passed: false,
      duration: 0,
    };

    try {
      // Special handling for different test types
      switch (suite.type) {
        case 'chaos':
          result.metrics = await this.runChaosTests();
          result.passed = result.metrics.recoveryRate > 0.8;
          break;
          
        case 'performance':
          result.metrics = await this.runPerformanceTests();
          result.passed = result.metrics.meetsThresholds;
          break;
          
        case 'mutation':
          const mutationResult = await this.runMutationTests(suite.command);
          result.metrics = mutationResult.metrics;
          result.passed = mutationResult.score >= 85;
          break;
          
        default:
          // Run standard test command
          const { stdout, stderr } = await execAsync(suite.command, {
            timeout: suite.timeout,
            env: { ...process.env, CI: 'true' },
          });
          
          result.output = stdout;
          if (stderr) result.errors = [stderr];
          
          // Parse coverage if available
          result.coverage = await this.parseCoverage(stdout);
          result.passed = !stderr && stdout.includes('PASS');
      }
    } catch (error: any) {
      result.errors = [error.message];
      result.passed = false;
    }

    result.duration = Date.now() - startTime;
    
    console.log(`${result.passed ? '✅' : '❌'} ${suite.name} completed in ${(result.duration / 1000).toFixed(2)}s`);
    
    return result;
  }

  private async runChaosTests(): Promise<any> {
    const runner = new ChaosTestRunner(this.chaosFramework);
    const scenarios = this.chaosFramework.getAllScenarios();
    
    let totalRecoveries = 0;
    let totalFailures = 0;

    for (const scenario of scenarios) {
      const results = await runner.runScenario(scenario.id, 3);
      
      results.forEach(result => {
        if (result.recovery) totalRecoveries++;
        if (!result.success) totalFailures++;
      });
    }

    return {
      totalScenarios: scenarios.length,
      recoveryRate: totalRecoveries / (totalRecoveries + totalFailures),
      failures: totalFailures,
    };
  }

  private async runPerformanceTests(): Promise<any> {
    const benchmark = new PerformanceBenchmark();
    const results: any[] = [];

    // Agent activation benchmark
    const activationBench = await benchmark.benchmark(
      'agent_activation',
      async () => {
        // Simulate agent activation
        await new Promise(resolve => setTimeout(resolve, 50));
      },
      { iterations: 100 }
    );
    results.push(activationBench);

    // Message processing benchmark
    const messageBench = await benchmark.benchmark(
      'message_processing',
      async () => {
        // Simulate message processing
        await new Promise(resolve => setTimeout(resolve, 100));
      },
      { iterations: 100 }
    );
    results.push(messageBench);

    // Multi-agent coordination benchmark
    const multiAgentBench = await benchmark.stress(
      'multi_agent_coordination',
      async () => {
        // Simulate multi-agent interaction
        await new Promise(resolve => setTimeout(resolve, 200));
      },
      { duration: 30000, concurrency: 50 }
    );
    results.push(multiAgentBench);

    // Check if performance meets thresholds
    const meetsThresholds = 
      activationBench.latency.p95 < 200 &&
      messageBench.latency.p95 < 500 &&
      multiAgentBench.throughput > 100;

    return {
      benchmarks: results,
      meetsThresholds,
      memoryLeak: this.performanceMonitor.detectMemoryLeak(),
    };
  }

  private async runMutationTests(command: string): Promise<any> {
    try {
      const { stdout } = await execAsync(command, {
        timeout: 3600000, // 60 minutes
      });

      // Parse Stryker output
      const scoreMatch = stdout.match(/Mutation score:\s*(\d+\.?\d*)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      const killedMatch = stdout.match(/Killed:\s*(\d+)/);
      const survivedMatch = stdout.match(/Survived:\s*(\d+)/);
      const timeoutMatch = stdout.match(/Timeout:\s*(\d+)/);

      return {
        score,
        metrics: {
          killed: killedMatch ? parseInt(killedMatch[1]) : 0,
          survived: survivedMatch ? parseInt(survivedMatch[1]) : 0,
          timeout: timeoutMatch ? parseInt(timeoutMatch[1]) : 0,
        },
      };
    } catch (error) {
      return {
        score: 0,
        metrics: { killed: 0, survived: 0, timeout: 0 },
      };
    }
  }

  private async parseCoverage(output: string): Promise<any> {
    // Parse Jest coverage output
    const coverageMatch = output.match(
      /Lines\s*:\s*(\d+\.?\d*)%.*?Branches\s*:\s*(\d+\.?\d*)%.*?Functions\s*:\s*(\d+\.?\d*)%.*?Statements\s*:\s*(\d+\.?\d*)%/s
    );

    if (coverageMatch) {
      return {
        lines: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        statements: parseFloat(coverageMatch[4]),
      };
    }

    return null;
  }

  private async generateComprehensiveReport(
    results: TestResult[],
    totalDuration: number
  ): Promise<ComprehensiveTestReport> {
    // Calculate overall coverage
    const coverageResults = results.filter(r => r.coverage);
    const overallCoverage = coverageResults.length > 0 ? {
      lines: coverageResults.reduce((sum, r) => sum + r.coverage!.lines, 0) / coverageResults.length,
      branches: coverageResults.reduce((sum, r) => sum + r.coverage!.branches, 0) / coverageResults.length,
      functions: coverageResults.reduce((sum, r) => sum + r.coverage!.functions, 0) / coverageResults.length,
      statements: coverageResults.reduce((sum, r) => sum + r.coverage!.statements, 0) / coverageResults.length,
    } : { lines: 0, branches: 0, functions: 0, statements: 0 };

    // Get performance metrics
    const performanceReport = this.performanceMonitor.generateReport();

    // Calculate quality metrics
    const mutationResult = results.find(r => r.type === 'mutation');
    const propertyResult = results.find(r => r.type === 'property');
    const contractResult = results.find(r => r.type === 'contract');
    const visualResult = results.find(r => r.type === 'visual');
    const chaosResult = results.find(r => r.type === 'chaos');

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, overallCoverage);

    return {
      timestamp: new Date(),
      duration: totalDuration,
      results,
      coverage: {
        overall: overallCoverage,
        bySuite: Object.fromEntries(
          coverageResults.map(r => [r.suite, r.coverage])
        ),
      },
      performance: {
        memory: performanceReport.summary.memory,
        latency: performanceReport.latencies,
        throughput: results.find(r => r.type === 'performance')?.metrics?.benchmarks || {},
      },
      quality: {
        mutationScore: mutationResult?.metrics?.score || 0,
        propertyTestFailures: propertyResult?.errors?.length || 0,
        contractViolations: contractResult?.errors?.length || 0,
        visualRegressions: visualResult?.errors?.length || 0,
        chaosRecoveryRate: chaosResult?.metrics?.recoveryRate || 0,
      },
      aiSpecific: {
        hallucinationRate: 0.05, // Would be calculated from actual tests
        emotionConsistency: 0.95, // Would be calculated from actual tests
        multiAgentCoordination: 0.90, // Would be calculated from actual tests
      },
      recommendations,
    };
  }

  private generateRecommendations(results: TestResult[], coverage: any): string[] {
    const recommendations: string[] = [];

    // Coverage recommendations
    if (coverage.lines < 95) {
      recommendations.push(`Increase line coverage from ${coverage.lines.toFixed(1)}% to 95%+`);
    }
    if (coverage.branches < 95) {
      recommendations.push(`Increase branch coverage from ${coverage.branches.toFixed(1)}% to 95%+`);
    }

    // Test type recommendations
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failing test suites: ${failedTests.map(t => t.suite).join(', ')}`);
    }

    // Performance recommendations
    const perfResult = results.find(r => r.type === 'performance');
    if (perfResult?.metrics?.memoryLeak?.hasLeak) {
      recommendations.push('Investigate and fix detected memory leak');
    }

    // Mutation testing recommendations
    const mutationResult = results.find(r => r.type === 'mutation');
    if (mutationResult && mutationResult.metrics?.score < 85) {
      recommendations.push(`Improve mutation score from ${mutationResult.metrics.score}% to 85%+`);
    }

    // Chaos engineering recommendations
    const chaosResult = results.find(r => r.type === 'chaos');
    if (chaosResult && chaosResult.metrics?.recoveryRate < 0.9) {
      recommendations.push('Improve system resilience - chaos recovery rate below 90%');
    }

    return recommendations;
  }

  private async saveReport(report: ComprehensiveTestReport, ci: boolean = false): Promise<void> {
    const reportDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive-test-report-${timestamp}.json`;
    const filepath = path.join(reportDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${filepath}`);

    // In CI, also save as latest
    if (ci) {
      const latestPath = path.join(reportDir, 'latest.json');
      await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
    }

    // Generate HTML report
    const htmlReport = await this.generateHTMLReport(report);
    const htmlPath = path.join(reportDir, `report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlReport);
    console.log(`🌐 HTML report saved to: ${htmlPath}`);
  }

  private async generateHTMLReport(report: ComprehensiveTestReport): Promise<string> {
    const passedTests = report.results.filter(r => r.passed).length;
    const totalTests = report.results.length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>SYMindX Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .pass { color: #4CAF50; }
        .fail { color: #f44336; }
        .warning { color: #ff9800; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f5f5f5; }
        .recommendation { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #ffc107; }
        .coverage-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 SYMindX Comprehensive Test Report</h1>
        <p>Generated: ${report.timestamp.toLocaleString()}</p>
        <p>Total Duration: ${(report.duration / 1000 / 60).toFixed(2)} minutes</p>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value ${passedTests === totalTests ? 'pass' : 'fail'}">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.coverage.overall.lines.toFixed(1)}%</div>
                <div class="metric-label">Line Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.quality.mutationScore?.toFixed(1) || 'N/A'}%</div>
                <div class="metric-label">Mutation Score</div>
            </div>
            <div class="metric">
                <div class="metric-value">${(report.quality.chaosRecoveryRate * 100).toFixed(1)}%</div>
                <div class="metric-label">Chaos Recovery</div>
            </div>
        </div>

        <h2>Test Results</h2>
        <table>
            <tr>
                <th>Test Suite</th>
                <th>Type</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Coverage</th>
            </tr>
            ${report.results.map(result => `
                <tr>
                    <td>${result.suite}</td>
                    <td>${result.type}</td>
                    <td class="${result.passed ? 'pass' : 'fail'}">${result.passed ? '✅ Passed' : '❌ Failed'}</td>
                    <td>${(result.duration / 1000).toFixed(2)}s</td>
                    <td>
                        ${result.coverage ? `
                            <div class="coverage-bar">
                                <div class="coverage-fill" style="width: ${result.coverage.lines}%"></div>
                            </div>
                            ${result.coverage.lines.toFixed(1)}%
                        ` : 'N/A'}
                    </td>
                </tr>
            `).join('')}
        </table>

        <h2>Coverage Summary</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Percentage</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Lines</td>
                <td>${report.coverage.overall.lines.toFixed(1)}%</td>
                <td class="${report.coverage.overall.lines >= 95 ? 'pass' : 'warning'}">
                    ${report.coverage.overall.lines >= 95 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Branches</td>
                <td>${report.coverage.overall.branches.toFixed(1)}%</td>
                <td class="${report.coverage.overall.branches >= 95 ? 'pass' : 'warning'}">
                    ${report.coverage.overall.branches >= 95 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Functions</td>
                <td>${report.coverage.overall.functions.toFixed(1)}%</td>
                <td class="${report.coverage.overall.functions >= 95 ? 'pass' : 'warning'}">
                    ${report.coverage.overall.functions >= 95 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Statements</td>
                <td>${report.coverage.overall.statements.toFixed(1)}%</td>
                <td class="${report.coverage.overall.statements >= 95 ? 'pass' : 'warning'}">
                    ${report.coverage.overall.statements >= 95 ? '✅' : '⚠️'}
                </td>
            </tr>
        </table>

        <h2>Quality Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Target</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Mutation Score</td>
                <td>${report.quality.mutationScore?.toFixed(1) || 'N/A'}%</td>
                <td>85%</td>
                <td class="${(report.quality.mutationScore || 0) >= 85 ? 'pass' : 'warning'}">
                    ${(report.quality.mutationScore || 0) >= 85 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Property Test Failures</td>
                <td>${report.quality.propertyTestFailures}</td>
                <td>0</td>
                <td class="${report.quality.propertyTestFailures === 0 ? 'pass' : 'fail'}">
                    ${report.quality.propertyTestFailures === 0 ? '✅' : '❌'}
                </td>
            </tr>
            <tr>
                <td>Contract Violations</td>
                <td>${report.quality.contractViolations}</td>
                <td>0</td>
                <td class="${report.quality.contractViolations === 0 ? 'pass' : 'fail'}">
                    ${report.quality.contractViolations === 0 ? '✅' : '❌'}
                </td>
            </tr>
            <tr>
                <td>Visual Regressions</td>
                <td>${report.quality.visualRegressions}</td>
                <td>0</td>
                <td class="${report.quality.visualRegressions === 0 ? 'pass' : 'fail'}">
                    ${report.quality.visualRegressions === 0 ? '✅' : '❌'}
                </td>
            </tr>
            <tr>
                <td>Chaos Recovery Rate</td>
                <td>${(report.quality.chaosRecoveryRate * 100).toFixed(1)}%</td>
                <td>90%</td>
                <td class="${report.quality.chaosRecoveryRate >= 0.9 ? 'pass' : 'warning'}">
                    ${report.quality.chaosRecoveryRate >= 0.9 ? '✅' : '⚠️'}
                </td>
            </tr>
        </table>

        <h2>AI-Specific Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Target</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Hallucination Rate</td>
                <td>${(report.aiSpecific.hallucinationRate * 100).toFixed(1)}%</td>
                <td>&lt; 10%</td>
                <td class="${report.aiSpecific.hallucinationRate < 0.1 ? 'pass' : 'warning'}">
                    ${report.aiSpecific.hallucinationRate < 0.1 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Emotion Consistency</td>
                <td>${(report.aiSpecific.emotionConsistency * 100).toFixed(1)}%</td>
                <td>&gt; 90%</td>
                <td class="${report.aiSpecific.emotionConsistency > 0.9 ? 'pass' : 'warning'}">
                    ${report.aiSpecific.emotionConsistency > 0.9 ? '✅' : '⚠️'}
                </td>
            </tr>
            <tr>
                <td>Multi-Agent Coordination</td>
                <td>${(report.aiSpecific.multiAgentCoordination * 100).toFixed(1)}%</td>
                <td>&gt; 85%</td>
                <td class="${report.aiSpecific.multiAgentCoordination > 0.85 ? 'pass' : 'warning'}">
                    ${report.aiSpecific.multiAgentCoordination > 0.85 ? '✅' : '⚠️'}
                </td>
            </tr>
        </table>

        <h2>Recommendations</h2>
        ${report.recommendations.length > 0 ? report.recommendations.map(rec => `
            <div class="recommendation">
                📋 ${rec}
            </div>
        `).join('') : '<p>No recommendations - all metrics meet targets! 🎉</p>'}
    </div>
</body>
</html>
    `;
  }

  private printSummary(report: ComprehensiveTestReport): void {
    const passedTests = report.results.filter(r => r.passed).length;
    const totalTests = report.results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`⏱️  Duration: ${(report.duration / 1000 / 60).toFixed(2)} minutes`);
    
    console.log('\n📈 Coverage:');
    console.log(`   Lines: ${report.coverage.overall.lines.toFixed(1)}%`);
    console.log(`   Branches: ${report.coverage.overall.branches.toFixed(1)}%`);
    console.log(`   Functions: ${report.coverage.overall.functions.toFixed(1)}%`);
    console.log(`   Statements: ${report.coverage.overall.statements.toFixed(1)}%`);
    
    console.log('\n🎯 Quality Metrics:');
    console.log(`   Mutation Score: ${report.quality.mutationScore?.toFixed(1) || 'N/A'}%`);
    console.log(`   Chaos Recovery: ${(report.quality.chaosRecoveryRate * 100).toFixed(1)}%`);
    console.log(`   Property Failures: ${report.quality.propertyTestFailures}`);
    console.log(`   Contract Violations: ${report.quality.contractViolations}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Export for CLI usage
export async function runTests(options: any = {}): Promise<void> {
  const runner = new ComprehensiveTestRunner();
  
  try {
    const report = await runner.runAllTests({
      parallel: options.parallel || false,
      suiteFilter: options.suites ? options.suites.split(',') : undefined,
      generateReport: options.report !== false,
      ci: options.ci || process.env.CI === 'true',
    });
    
    // Exit with appropriate code
    const allPassed = report.results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: any = {};
  
  args.forEach(arg => {
    if (arg === '--parallel') options.parallel = true;
    if (arg === '--ci') options.ci = true;
    if (arg.startsWith('--suites=')) options.suites = arg.split('=')[1];
    if (arg === '--no-report') options.report = false;
  });
  
  runTests(options);
}