#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  coverage: args.includes('--coverage'),
  watch: args.includes('--watch'),
  verbose: args.includes('--verbose'),
  ci: args.includes('--ci'),
  type: getTestType(args),
  silent: args.includes('--silent'),
};

function getTestType(args) {
  if (args.includes('--unit')) return 'unit';
  if (args.includes('--integration')) return 'integration';
  if (args.includes('--e2e')) return 'e2e';
  if (args.includes('--performance')) return 'performance';
  return 'all';
}

// Ensure test directories exist
function ensureTestDirectories() {
  const dirs = [
    'temp/test-data',
    'temp/test-memories',
    'temp/test-logs',
    'coverage',
    'test-results',
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

// Build Jest command
function buildJestCommand(options) {
  const jestArgs = ['jest'];
  
  // Test type selection
  if (options.type !== 'all') {
    jestArgs.push('--selectProjects', options.type);
  }
  
  // Coverage
  if (options.coverage) {
    jestArgs.push('--coverage');
    jestArgs.push('--coverageReporters=text');
    jestArgs.push('--coverageReporters=lcov');
    jestArgs.push('--coverageReporters=html');
    jestArgs.push('--coverageReporters=json-summary');
  }
  
  // Watch mode
  if (options.watch) {
    jestArgs.push('--watch');
  }
  
  // CI mode
  if (options.ci) {
    jestArgs.push('--ci');
    jestArgs.push('--maxWorkers=2');
    jestArgs.push('--forceExit');
  }
  
  // Verbose output
  if (options.verbose) {
    jestArgs.push('--verbose');
  }
  
  // Silent mode
  if (options.silent) {
    jestArgs.push('--silent');
  }
  
  // Additional Jest options
  jestArgs.push('--passWithNoTests');
  jestArgs.push('--detectOpenHandles');
  jestArgs.push('--forceExit');
  
  return jestArgs;
}

// Run tests with enhanced reporting
async function runTests() {
  console.log('🚀 Starting SYMindX Test Suite...\n');
  
  // Ensure test environment is ready
  ensureTestDirectories();
  
  // Load test environment
  require('dotenv').config({ path: path.join(__dirname, '../.env.test') });
  
  const jestArgs = buildJestCommand(options);
  
  console.log(`📋 Test Configuration:`);
  console.log(`   Type: ${options.type}`);
  console.log(`   Coverage: ${options.coverage ? 'enabled' : 'disabled'}`);
  console.log(`   Watch: ${options.watch ? 'enabled' : 'disabled'}`);
  console.log(`   Verbose: ${options.verbose ? 'enabled' : 'disabled'}`);
  console.log(`   CI Mode: ${options.ci ? 'enabled' : 'disabled'}`);
  console.log('');
  
  const startTime = Date.now();
  
  // Run Jest
  const jest = spawn('npx', jestArgs, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      FORCE_COLOR: '1',
    },
  });
  
  jest.on('close', (code) => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('='.repeat(60));
    
    if (code === 0) {
      console.log(`✅ All tests passed! (${duration}s)`);
      
      // Generate test summary if coverage was enabled
      if (options.coverage) {
        generateTestSummary();
      }
    } else {
      console.log(`❌ Tests failed with exit code ${code} (${duration}s)`);
    }
    
    console.log('='.repeat(60));
    process.exit(code);
  });
  
  jest.on('error', (error) => {
    console.error('❌ Failed to start Jest:', error);
    process.exit(1);
  });
}

// Generate test summary from coverage data
function generateTestSummary() {
  try {
    const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
    
    if (fs.existsSync(coveragePath)) {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverageData.total;
      
      console.log('\n📊 Test Coverage Summary:');
      console.log(`   Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
      console.log(`   Branches:   ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
      console.log(`   Functions:  ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
      console.log(`   Lines:      ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
      
      // Coverage badges for README
      const badges = generateCoverageBadges(total);
      const badgePath = path.join(__dirname, '../coverage/badges.md');
      fs.writeFileSync(badgePath, badges);
      
      // Check coverage thresholds
      checkCoverageThresholds(total);
    }
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error.message);
  }
}

// Generate coverage badges for README
function generateCoverageBadges(coverage) {
  const badges = [
    `![Statements](https://img.shields.io/badge/statements-${coverage.statements.pct}%25-${getCoverageColor(coverage.statements.pct)}.svg)`,
    `![Branches](https://img.shields.io/badge/branches-${coverage.branches.pct}%25-${getCoverageColor(coverage.branches.pct)}.svg)`,
    `![Functions](https://img.shields.io/badge/functions-${coverage.functions.pct}%25-${getCoverageColor(coverage.functions.pct)}.svg)`,
    `![Lines](https://img.shields.io/badge/lines-${coverage.lines.pct}%25-${getCoverageColor(coverage.lines.pct)}.svg)`,
  ];
  
  return [
    '# Test Coverage Badges',
    '',
    ...badges,
    '',
    `Last updated: ${new Date().toISOString()}`,
  ].join('\n');
}

// Get badge color based on coverage percentage
function getCoverageColor(percentage) {
  if (percentage >= 80) return 'brightgreen';
  if (percentage >= 60) return 'yellow';
  if (percentage >= 40) return 'orange';
  return 'red';
}

// Check if coverage meets thresholds
function checkCoverageThresholds(coverage) {
  const thresholds = {
    statements: parseInt(process.env.COVERAGE_THRESHOLD_STATEMENTS || '60'),
    branches: parseInt(process.env.COVERAGE_THRESHOLD_BRANCHES || '50'),
    functions: parseInt(process.env.COVERAGE_THRESHOLD_FUNCTIONS || '50'),
    lines: parseInt(process.env.COVERAGE_THRESHOLD_LINES || '60'),
  };
  
  const failed = [];
  
  Object.keys(thresholds).forEach(key => {
    if (coverage[key].pct < thresholds[key]) {
      failed.push(`${key}: ${coverage[key].pct}% < ${thresholds[key]}%`);
    }
  });
  
  if (failed.length > 0) {
    console.log('\n⚠️  Coverage thresholds not met:');
    failed.forEach(failure => console.log(`   ${failure}`));
    console.log('\n💡 Add more tests to improve coverage!');
  } else {
    console.log('\n✅ All coverage thresholds met!');
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test run terminated');
  process.exit(0);
});

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 SYMindX Test Runner

Usage: node test-runner.js [options]

Options:
  --unit         Run unit tests only
  --integration  Run integration tests only
  --e2e          Run end-to-end tests only
  --performance  Run performance tests only
  --coverage     Generate coverage report
  --watch        Run tests in watch mode
  --verbose      Verbose output
  --ci           CI mode (optimized for CI/CD)
  --silent       Silent mode (minimal output)
  --help, -h     Show this help message

Examples:
  node test-runner.js --unit --coverage
  node test-runner.js --integration --verbose
  node test-runner.js --performance
  node test-runner.js --ci --coverage
`);
  process.exit(0);
}

// Run the tests
runTests();