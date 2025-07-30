/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
module.exports = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  testRunner: 'jest',
  jest: {
    configFile: './jest.config.ts',
    projectType: 'custom',
    config: {
      testEnvironment: 'node',
    },
  },
  coverageAnalysis: 'perTest',
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/types/**/*',
    '!src/**/*.types.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  mutator: {
    excludedMutations: [],
    plugins: ['@stryker-mutator/typescript-checker'],
  },
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: false,
  },
  thresholds: {
    high: 85,
    low: 70,
    break: 60,
  },
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  maxConcurrentTestRunners: 4,
  logLevel: 'info',
  fileLogLevel: 'trace',
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  disableTypeChecks: false,
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  dashboard: {
    project: 'github.com/symindx/mind-agents',
    version: 'main',
    reportType: 'full',
  },
  htmlReporter: {
    fileName: 'mutation-report.html',
  },
  // Custom mutators for AI-specific code
  mutationLevels: [
    {
      name: 'ai-specific',
      mutators: [
        // Emotion state mutations
        'EmotionIntensityMutator',
        'EmotionTypeMutator',
        // Agent behavior mutations
        'AgentActionMutator',
        'DecisionThresholdMutator',
        // Portal response mutations
        'AIResponseMutator',
        'PromptTemplateMutator',
      ],
    },
  ],
};