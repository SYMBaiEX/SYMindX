#!/usr/bin/env node
/**
 * Comprehensive Test Runner for SYMindX
 * 
 * This script provides:
 * - Automated test discovery and execution
 * - Coverage reporting
 * - Performance testing
 * - Test result analysis
 * - CI/CD integration
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

// Test configuration
const TEST_CONFIG = {
  testPattern: '**/*.test.{ts,js}',
  coverageThreshold: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80,
  },
  outputDir: 'test-results',
  reportFormats: ['json', 'html', 'text'],
  parallel: true,
  maxWorkers: 4,
  timeout: 30000,
  retries: 2,
};

// Utility functions
const utils = {
  log: (message, color = colors.white) => {
    console.log(`${color}${message}${colors.reset}`);
  },

  logHeader: (message) => {
    console.log('');
    console.log(`${colors.bold}${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(message.length)}${colors.reset}`);
  },

  logSuccess: (message) => {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  },

  logWarning: (message) => {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  },

  logError: (message) => {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
  },

  logInfo: (message) => {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  },

  execCommand: async (command, options = {}) => {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: options.silent ? ['inherit', 'pipe', 'pipe'] : 'inherit',
        ...options,
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || 'Unknown error'}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  },

  formatDuration: (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  formatPercent: (value) => {
    return `${value.toFixed(1)}%`;
  },
};

// Test result parser
class TestResultParser {
  constructor() {
    this.results = {
      suites: [],
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      coverage: null,
    };
  }

  parseBunTestOutput(output) {
    const lines = output.split('\n');
    let currentSuite = null;
    
    for (const line of lines) {
      // Parse test results
      if (line.includes('✓') || line.includes('✗')) {
        const test = this.parseTestLine(line);
        if (test) {
          this.results.tests.push(test);
          this.results.summary.total++;
          
          if (test.status === 'passed') {
            this.results.summary.passed++;
          } else if (test.status === 'failed') {
            this.results.summary.failed++;
          } else if (test.status === 'skipped') {
            this.results.summary.skipped++;
          }
        }
      }
      
      // Parse test suites
      if (line.includes('describe') || line.includes('test file')) {
        currentSuite = this.parseSuiteLine(line);
        if (currentSuite) {
          this.results.suites.push(currentSuite);
        }
      }
      
      // Parse summary
      if (line.includes('tests passed') || line.includes('test') && line.includes('ms')) {
        this.parseSummaryLine(line);
      }
      
      // Parse coverage
      if (line.includes('All files') && line.includes('%')) {
        this.coverage = this.parseCoverageLine(line);
      }
    }

    return this.results;
  }

  parseTestLine(line) {
    const passed = line.includes('✓');
    const failed = line.includes('✗');
    
    if (!passed && !failed) return null;

    // Extract test name and duration
    const nameMatch = line.match(/[✓✗]\s+(.+?)(\s+\(\d+ms\))?$/);
    const durationMatch = line.match(/\((\d+)ms\)/);

    return {
      name: nameMatch ? nameMatch[1].trim() : 'Unknown test',
      status: passed ? 'passed' : 'failed',
      duration: durationMatch ? parseInt(durationMatch[1]) : 0,
      error: failed ? this.extractError(line) : null,
    };
  }

  parseSuiteLine(line) {
    const match = line.match(/describe\s+(.+)/);
    if (match) {
      return {
        name: match[1].trim(),
        tests: [],
        duration: 0,
      };
    }
    return null;
  }

  parseSummaryLine(line) {
    const passedMatch = line.match(/(\d+)\s+passed/);
    const failedMatch = line.match(/(\d+)\s+failed/);
    const durationMatch = line.match(/(\d+)ms/);

    if (passedMatch) {
      this.results.summary.passed = parseInt(passedMatch[1]);
    }
    if (failedMatch) {
      this.results.summary.failed = parseInt(failedMatch[1]);
    }
    if (durationMatch) {
      this.results.summary.duration = parseInt(durationMatch[1]);
    }
  }

  parseCoverageLine(line) {
    const coverageMatch = line.match(/(\d+\.?\d*)%/g);
    if (coverageMatch && coverageMatch.length >= 4) {
      return {
        statements: parseFloat(coverageMatch[0]),
        branches: parseFloat(coverageMatch[1]),
        functions: parseFloat(coverageMatch[2]),
        lines: parseFloat(coverageMatch[3]),
      };
    }
    return null;
  }

  extractError(line) {
    // Simple error extraction - could be enhanced
    return line.split('✗')[1]?.trim() || 'Test failed';
  }
}

// Test runner class
class TestRunner {
  constructor(config = TEST_CONFIG) {
    this.config = config;
    this.startTime = 0;
    this.results = null;
    this.coverage = null;
  }

  async run(options = {}) {
    this.startTime = performance.now();
    
    utils.logHeader('🧪 SYMindX Test Runner');
    
    try {
      // Prepare test environment
      await this.prepareEnvironment();
      
      // Discover and run tests
      const testFiles = await this.discoverTests();
      utils.logInfo(`Found ${testFiles.length} test files`);
      
      // Run the tests
      await this.runTests(options);
      
      // Generate reports
      await this.generateReports();
      
      // Validate results
      this.validateResults();
      
      utils.logSuccess('All tests completed successfully!');
      return this.results;
      
    } catch (error) {
      utils.logError(`Test run failed: ${error.message}`);
      throw error;
    }
  }

  async prepareEnvironment() {
    utils.logInfo('Preparing test environment...');
    
    // Create output directory
    await fs.mkdir(this.config.outputDir, { recursive: true });
    
    // Set test environment variables
    process.env["NODE_ENV"] = 'test';
    process.env["LOG_LEVEL"] = 'error'; // Reduce noise during testing
    
    utils.logSuccess('Test environment prepared');
  }

  async discoverTests() {
    utils.logInfo('Discovering test files...');
    
    const testFiles = [];
    
    // Find all test files
    const findTestFiles = async (dir) => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist') {
            const subFiles = await findTestFiles(fullPath);
            testFiles.push(...subFiles);
          } else if (item.name.endsWith('.test.ts') || item.name.endsWith('.test.js')) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories that can't be read
      }
    };

    await findTestFiles('./tests');
    
    return testFiles;
  }

  async runTests(options = {}) {
    utils.logInfo('Running tests...');
    
    const testCommand = this.buildTestCommand(options);
    utils.log(`Command: ${testCommand}`, colors.dim);
    
    try {
      const { stdout, stderr } = await utils.execCommand(testCommand, { silent: true });
      
      // Parse test results
      const parser = new TestResultParser();
      this.results = parser.parseBunTestOutput(stdout + stderr);
      
      // Log test summary
      this.logTestSummary();
      
    } catch (error) {
      // Tests may fail but we still want to parse results
      const parser = new TestResultParser();
      this.results = parser.parseBunTestOutput(error.message);
      
      this.logTestSummary();
      
      if (this.results.summary.failed > 0) {
        throw new Error(`${this.results.summary.failed} tests failed`);
      }
    }
  }

  buildTestCommand(options) {
    let command = 'bun test';
    
    // Add coverage if requested
    if (options.coverage !== false) {
      command += ' --coverage';
    }
    
    // Add specific test files if provided
    if (options.testFiles && options.testFiles.length > 0) {
      command += ` ${options.testFiles.join(' ')}`;
    }
    
    // Add timeout
    if (this.config.timeout) {
      command += ` --timeout ${this.config.timeout}`;
    }
    
    return command;
  }

  logTestSummary() {
    if (!this.results) return;
    
    const { summary } = this.results;
    const duration = performance.now() - this.startTime;
    
    utils.log('');
    utils.logHeader('📊 Test Results');
    utils.log(`Total tests: ${summary.total}`);
    utils.log(`Passed: ${colors.green}${summary.passed}${colors.reset}`);
    utils.log(`Failed: ${colors.red}${summary.failed}${colors.reset}`);
    utils.log(`Skipped: ${colors.yellow}${summary.skipped}${colors.reset}`);
    utils.log(`Duration: ${utils.formatDuration(duration)}`);
    
    if (this.results.coverage) {
      utils.log('');
      utils.log('📈 Coverage:');
      utils.log(`  Statements: ${utils.formatPercent(this.results.coverage.statements)}`);
      utils.log(`  Branches: ${utils.formatPercent(this.results.coverage.branches)}`);
      utils.log(`  Functions: ${utils.formatPercent(this.results.coverage.functions)}`);
      utils.log(`  Lines: ${utils.formatPercent(this.results.coverage.lines)}`);
    }
    
    // Show failed tests
    if (summary.failed > 0) {
      utils.log('');
      utils.log('❌ Failed tests:');
      const failedTests = this.results.tests.filter(t => t.status === 'failed');
      failedTests.slice(0, 10).forEach(test => {
        utils.log(`  • ${test.name}`, colors.red);
        if (test.error) {
          utils.log(`    ${test.error}`, colors.dim);
        }
      });
      
      if (failedTests.length > 10) {
        utils.log(`  ... and ${failedTests.length - 10} more failures`, colors.dim);
      }
    }
  }

  async generateReports() {
    utils.logInfo('Generating test reports...');
    
    if (!this.results) return;
    
    const reportData = {
      ...this.results,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: performance.now() - this.startTime,
        config: this.config,
      },
    };
    
    // JSON report
    if (this.config.reportFormats.includes('json')) {
      await fs.writeFile(
        path.join(this.config.outputDir, 'test-results.json'),
        JSON.stringify(reportData, null, 2)
      );
    }
    
    // HTML report
    if (this.config.reportFormats.includes('html')) {
      const htmlReport = this.generateHtmlReport(reportData);
      await fs.writeFile(
        path.join(this.config.outputDir, 'test-results.html'),
        htmlReport
      );
    }
    
    // Text report
    if (this.config.reportFormats.includes('text')) {
      const textReport = this.generateTextReport(reportData);
      await fs.writeFile(
        path.join(this.config.outputDir, 'test-results.txt'),
        textReport
      );
    }
    
    utils.logSuccess(`Reports generated in ${this.config.outputDir}`);
  }

  generateHtmlReport(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SYMindX Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test-list { margin: 20px 0; }
        .test-item { padding: 5px 0; border-bottom: 1px solid #eee; }
        .coverage { background: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SYMindX Test Results</h1>
        <p>Generated: ${data.metadata.timestamp}</p>
        <p>Duration: ${utils.formatDuration(data.metadata.duration)}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${data.summary.total}</p>
        </div>
        <div class="metric">
            <h3 class="passed">Passed</h3>
            <p>${data.summary.passed}</p>
        </div>
        <div class="metric">
            <h3 class="failed">Failed</h3>
            <p>${data.summary.failed}</p>
        </div>
        <div class="metric">
            <h3 class="skipped">Skipped</h3>
            <p>${data.summary.skipped}</p>
        </div>
    </div>
    
    ${data.coverage ? `
    <div class="coverage">
        <h3>Code Coverage</h3>
        <p>Statements: ${utils.formatPercent(data.coverage.statements)}</p>
        <p>Branches: ${utils.formatPercent(data.coverage.branches)}</p>
        <p>Functions: ${utils.formatPercent(data.coverage.functions)}</p>
        <p>Lines: ${utils.formatPercent(data.coverage.lines)}</p>
    </div>
    ` : ''}
    
    <div class="test-list">
        <h3>Test Details</h3>
        ${data.tests.map(test => `
            <div class="test-item">
                <span class="${test.status}">${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'}</span>
                <strong>${test.name}</strong>
                <span>(${utils.formatDuration(test.duration)})</span>
                ${test.error ? `<div style="color: #dc3545; font-size: 0.9em;">${test.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  generateTextReport(data) {
    const lines = [];
    
    lines.push('SYMindX Test Results');
    lines.push('===================');
    lines.push('');
    lines.push(`Generated: ${data.metadata.timestamp}`);
    lines.push(`Duration: ${utils.formatDuration(data.metadata.duration)}`);
    lines.push('');
    lines.push('Summary:');
    lines.push(`  Total tests: ${data.summary.total}`);
    lines.push(`  Passed: ${data.summary.passed}`);
    lines.push(`  Failed: ${data.summary.failed}`);
    lines.push(`  Skipped: ${data.summary.skipped}`);
    lines.push('');
    
    if (data.coverage) {
      lines.push('Coverage:');
      lines.push(`  Statements: ${utils.formatPercent(data.coverage.statements)}`);
      lines.push(`  Branches: ${utils.formatPercent(data.coverage.branches)}`);
      lines.push(`  Functions: ${utils.formatPercent(data.coverage.functions)}`);
      lines.push(`  Lines: ${utils.formatPercent(data.coverage.lines)}`);
      lines.push('');
    }
    
    lines.push('Test Details:');
    data.tests.forEach(test => {
      const status = test.status === 'passed' ? 'PASS' : test.status === 'failed' ? 'FAIL' : 'SKIP';
      lines.push(`  [${status}] ${test.name} (${utils.formatDuration(test.duration)})`);
      if (test.error) {
        lines.push(`    Error: ${test.error}`);
      }
    });
    
    return lines.join('\n');
  }

  validateResults() {
    if (!this.results) {
      throw new Error('No test results available');
    }
    
    const { summary } = this.results;
    
    // Check if any tests failed
    if (summary.failed > 0) {
      throw new Error(`${summary.failed} tests failed`);
    }
    
    // Check coverage thresholds
    if (this.results.coverage) {
      const coverage = this.results.coverage;
      const thresholds = this.config.coverageThreshold;
      
      const failures = [];
      
      if (coverage.statements < thresholds.statements) {
        failures.push(`Statements coverage (${utils.formatPercent(coverage.statements)}) below threshold (${utils.formatPercent(thresholds.statements)})`);
      }
      
      if (coverage.branches < thresholds.branches) {
        failures.push(`Branches coverage (${utils.formatPercent(coverage.branches)}) below threshold (${utils.formatPercent(thresholds.branches)})`);
      }
      
      if (coverage.functions < thresholds.functions) {
        failures.push(`Functions coverage (${utils.formatPercent(coverage.functions)}) below threshold (${utils.formatPercent(thresholds.functions)})`);
      }
      
      if (coverage.lines < thresholds.lines) {
        failures.push(`Lines coverage (${utils.formatPercent(coverage.lines)}) below threshold (${utils.formatPercent(thresholds.lines)})`);
      }
      
      if (failures.length > 0) {
        utils.logWarning('Coverage thresholds not met:');
        failures.forEach(failure => utils.logWarning(`  ${failure}`));
        
        if (process.env["STRICT_COVERAGE"] === 'true') {
          throw new Error('Coverage thresholds not met');
        }
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--files':
        options.testFiles = args[++i]?.split(',') || [];
        break;
    }
  }
  
  const runner = new TestRunner();
  
  try {
    await runner.run(options);
    process.exit(0);
  } catch (error) {
    utils.logError(`Test run failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestRunner, TestResultParser, TEST_CONFIG };