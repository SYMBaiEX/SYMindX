/**
 * Jest Configuration for Agent Testing
 * 
 * Specialized configuration for testing agents with comprehensive
 * test environments and fixtures.
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Module type
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../mind-agents/src/$1'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/../mind-agents/src/**/__tests__/**/*.test.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/setup/jest.setup.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  collectCoverageFrom: [
    '../mind-agents/src/**/*.ts',
    '!../mind-agents/src/**/*.d.ts',
    '!../mind-agents/src/**/__tests__/**',
    '!../mind-agents/src/**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './mind-agents/src/lifecycle/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Global test setup
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // Test results processor
  testResultsProcessor: '<rootDir>/processors/test-results-processor.js',
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: '<rootDir>/reports',
      filename: 'test-report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: '<rootDir>/reports',
      outputName: 'junit.xml'
    }]
  ],
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    'node_modules',
    'dist',
    'coverage'
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Max workers for parallel testing
  maxWorkers: '50%',
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.LOG_LEVEL': 'error'
  }
}