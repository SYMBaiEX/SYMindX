export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New features
        'fix',      // Bug fixes
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Testing
        'build',    // Build system changes
        'ci',       // CI/CD changes
        'chore',    // Maintenance tasks
        'revert',   // Revert previous commits
        'wip',      // Work in progress
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'core',        // Core runtime system
        'agents',      // Agent management
        'memory',      // Memory providers
        'emotion',     // Emotion system
        'cognition',   // Cognition modules
        'portals',     // AI provider integrations
        'extensions',  // Extension system
        'cli',         // Command line interface
        'api',         // REST/GraphQL API
        'docs',        // Documentation
        'config',      // Configuration
        'tools',       // Development tools
        'deps',        // Dependencies
        'release',     // Release related
        'security',    // Security fixes
        'performance', // Performance improvements
        'types',       // TypeScript types
        'tests',       // Testing
        'ci',          // CI/CD
        'build',       // Build system
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 120],
    'footer-leading-blank': [1, 'always'],
  },
};