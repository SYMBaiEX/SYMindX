/**
 * Configuration Management Usage Examples
 *
 * This file demonstrates how to use the unified configuration management
 * system in various scenarios and environments.
 */

import {
  config,
  configManager,
  loadEnvironmentConfig,
  configMigrator,
  UnifiedConfig,
} from '../index.js';

/**
 * Example 1: Basic configuration initialization and usage
 */
export async function basicUsageExample(): Promise<void> {
  console.log('=== Basic Configuration Usage ===');

  try {
    // Initialize configuration system with environment-aware loading
    await config.init({
      configPath: './config/config.development.json',
      environment: 'development',
      enableHotReload: true,
    });

    // Get configuration values
    const logLevel = config.get<string>('runtime.logLevel');
    const maxAgents = config.get<number>('runtime.maxAgents');
    const dataPath = config.get<string>('persistence.path');

    console.log('Configuration loaded:');
    console.log(`- Log Level: ${logLevel}`);
    console.log(`- Max Agents: ${maxAgents}`);
    console.log(`- Data Path: ${dataPath}`);

    // Set runtime configuration
    config.set('runtime.logLevel', 'debug');
    config.set('performance.enableMetrics', true);

    // Validate configuration
    const validation = await config.validate();
    if (validation.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration errors:', validation.errors);
    }
  } catch (error) {
    console.error('Configuration initialization failed:', error);
  }
}

/**
 * Example 2: Working with secrets
 */
export async function secretsManagementExample(): Promise<void> {
  console.log('\n=== Secrets Management ===');

  try {
    // Store secrets securely
    await config.storeSecret(
      'OPENAI_API_KEY',
      'sk-example-key-12345',
      'confidential'
    );
    await config.storeSecret(
      'DATABASE_PASSWORD',
      'super-secret-password',
      'secret'
    );
    await config.storeSecret('JWT_SECRET', 'jwt-signing-secret-key', 'secret');

    // Retrieve secrets
    const openaiKey = await config.getSecret('OPENAI_API_KEY');
    const dbPassword = await config.getSecret('DATABASE_PASSWORD');

    console.log('Secrets retrieved:');
    console.log(`- OpenAI Key: ${openaiKey ? '[REDACTED]' : 'Not found'}`);
    console.log(`- DB Password: ${dbPassword ? '[REDACTED]' : 'Not found'}`);

    // Check for secrets needing rotation
    const needingRotation = configManager.getSecretsNeedingRotation();
    console.log(`- Secrets needing rotation: ${needingRotation.length}`);
  } catch (error) {
    console.error('Secrets management failed:', error);
  }
}

/**
 * Example 3: Environment-specific configuration
 */
export async function environmentConfigExample(): Promise<void> {
  console.log('\n=== Environment-Specific Configuration ===');

  // Development environment
  process.env.NODE_ENV = 'development';
  await loadEnvironmentConfig('./config/config.development.json');

  let currentConfig = config.all();
  console.log('Development config:');
  console.log(`- Debug Mode: ${currentConfig.development?.debugMode}`);
  console.log(`- Hot Reload: ${currentConfig.development?.hotReload}`);

  // Production environment simulation
  process.env.NODE_ENV = 'production';
  await loadEnvironmentConfig('./config/config.production.json');

  currentConfig = config.all();
  console.log('\nProduction config:');
  console.log(`- Debug Mode: ${currentConfig.development?.debugMode}`);
  console.log(`- Compression: ${currentConfig.persistence?.compression}`);
  console.log(`- Auth Enabled: ${currentConfig.security?.enableAuth}`);
}

/**
 * Example 4: Configuration validation and error handling
 */
export async function validationExample(): Promise<void> {
  console.log('\n=== Configuration Validation ===');

  try {
    // Set some invalid values to trigger validation errors
    config.set('runtime.tickInterval', -1000); // Invalid: negative value
    config.set('runtime.maxAgents', 'invalid'); // Invalid: wrong type
    config.set('runtime.logLevel', 'invalid-level'); // Invalid: not in enum

    // Validate configuration
    const validation = await config.validate();

    if (!validation.valid) {
      console.log('❌ Validation failed with errors:');
      validation.errors.forEach((error) => {
        console.log(`  - ${error.field}: ${error.message}`);
      });
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Validation warnings:');
      validation.warnings.forEach((warning) => {
        console.log(`  - ${warning.field}: ${warning.message}`);
      });
    }

    // Fix the configuration
    config.set('runtime.tickInterval', 1000);
    config.set('runtime.maxAgents', 10);
    config.set('runtime.logLevel', 'info');

    // Validate again
    const fixedValidation = await config.validate();
    if (fixedValidation.valid) {
      console.log('✅ Configuration is now valid');
    }
  } catch (error) {
    console.error('Validation example failed:', error);
  }
}

/**
 * Example 5: Hot reload and change monitoring
 */
export async function hotReloadExample(): Promise<void> {
  console.log('\n=== Hot Reload and Change Monitoring ===');

  try {
    // Set up change listener
    config.onChange((event) => {
      console.log(`🔄 Configuration changed: ${event.path}`);
      console.log(`  - Old Value: ${JSON.stringify(event.oldValue)}`);
      console.log(`  - New Value: ${JSON.stringify(event.newValue)}`);
      console.log(`  - Source: ${event.source}`);
    });

    // Set up reload listener
    config.onReload((newConfig) => {
      console.log('🔄 Configuration reloaded');
      console.log(`  - Environment: ${newConfig.runtime?.environment}`);
      console.log(`  - Log Level: ${newConfig.runtime?.logLevel}`);
    });

    // Make some changes to trigger events
    config.set('runtime.logLevel', 'debug');
    config.set('performance.enableMetrics', true);
    config.set('development.verboseLogging', true);

    // Simulate file reload (in real usage, this would happen automatically)
    console.log('Simulating configuration file change...');
    await config.reload();
  } catch (error) {
    console.error('Hot reload example failed:', error);
  }
}

/**
 * Example 6: Documentation generation
 */
export async function documentationExample(): Promise<void> {
  console.log('\n=== Documentation Generation ===');

  try {
    // Generate markdown documentation
    await config.generateDocs('./docs/configuration.md', 'markdown');
    console.log('✅ Markdown documentation generated');

    // Generate deployment guides
    await configManager.generateDeploymentGuides('./docs/deployment');
    console.log('✅ Deployment guides generated');

    // Generate configuration templates
    await configManager.generateConfigTemplates('./templates');
    console.log('✅ Configuration templates generated');

    console.log('Documentation files created:');
    console.log('  - ./docs/configuration.md');
    console.log('  - ./docs/deployment/development-deployment.md');
    console.log('  - ./docs/deployment/production-deployment.md');
    console.log('  - ./templates/config.development.json');
    console.log('  - ./templates/config.production.json');
    console.log('  - ./templates/.env.example');
  } catch (error) {
    console.error('Documentation generation failed:', error);
  }
}

/**
 * Example 7: Configuration migration from legacy system
 */
export async function migrationExample(): Promise<void> {
  console.log('\n=== Configuration Migration ===');

  try {
    // Migrate from legacy configuration
    await configMigrator.migrateLegacyConfig(
      './config/legacy-config.json',
      './config/migrated-config.json'
    );
    console.log('✅ Configuration migrated successfully');

    // Load the migrated configuration
    await config.init({
      configPath: './config/migrated-config.json',
      environment: 'development',
    });

    console.log('✅ Migrated configuration loaded and validated');
  } catch (error) {
    console.error('Configuration migration failed:', error);
  }
}

/**
 * Example 8: Advanced configuration patterns
 */
export async function advancedPatternsExample(): Promise<void> {
  console.log('\n=== Advanced Configuration Patterns ===');

  try {
    // Access advanced features
    const {
      configManager: manager,
      validator,
      secrets,
    } = configManager.advanced;

    // Custom validation rules
    validator.addRule({
      name: 'customPortalValidation',
      description: 'Validates portal configuration',
      validate: (value: any) => {
        if (typeof value === 'object' && value.providers) {
          return Object.keys(value.providers).length > 0;
        }
        return false;
      },
      message: 'At least one portal provider must be configured',
      severity: 'error',
    });

    // Export configuration with different options
    await manager.exportConfig('./backups/current-config.json', false);
    console.log('✅ Configuration exported (without secrets)');

    // Get configuration sources
    const sources = manager.getSources();
    console.log('Configuration sources:');
    sources.forEach((source) => {
      console.log(
        `  - ${source.type}: ${source.path || 'N/A'} (priority: ${source.priority})`
      );
    });

    // Secret metadata
    const secretMetadata = secrets.getSecretMetadata();
    console.log('Secret metadata:');
    secretMetadata.forEach((meta) => {
      console.log(
        `  - ${meta.name}: ${meta.classification} (created: ${meta.createdAt.toISOString()})`
      );
    });
  } catch (error) {
    console.error('Advanced patterns example failed:', error);
  }
}

/**
 * Example 9: Multi-environment deployment configuration
 */
export async function multiEnvironmentExample(): Promise<void> {
  console.log('\n=== Multi-Environment Deployment ===');

  // Define environment-specific configurations
  const environments = {
    development: {
      runtime: {
        environment: 'development' as const,
        logLevel: 'debug' as const,
        maxAgents: 5,
      },
      development: {
        hotReload: true,
        debugMode: true,
        verboseLogging: true,
      },
      performance: {
        enableMetrics: false,
        enableProfiling: true,
      },
    },
    production: {
      runtime: {
        environment: 'production' as const,
        logLevel: 'warn' as const,
        maxAgents: 50,
      },
      development: {
        hotReload: false,
        debugMode: false,
        verboseLogging: false,
      },
      performance: {
        enableMetrics: true,
        enableProfiling: false,
        memoryLimit: 4096,
      },
      security: {
        enableAuth: true,
        enableEncryption: true,
        rateLimiting: {
          enabled: true,
          maxRequests: 1000,
        },
      },
    },
  };

  // Apply environment-specific configuration
  const currentEnv = (process.env.NODE_ENV ||
    'development') as keyof typeof environments;
  const envConfig = environments[currentEnv];

  // Merge with base configuration
  for (const [section, values] of Object.entries(envConfig)) {
    for (const [key, value] of Object.entries(values as any)) {
      config.set(`${section}.${key}`, value);
    }
  }

  console.log(`✅ Applied ${currentEnv} environment configuration`);
  console.log(`- Log Level: ${config.get('runtime.logLevel')}`);
  console.log(`- Max Agents: ${config.get('runtime.maxAgents')}`);
  console.log(`- Debug Mode: ${config.get('development.debugMode')}`);
}

/**
 * Example 10: Configuration performance monitoring
 */
export async function performanceMonitoringExample(): Promise<void> {
  console.log('\n=== Performance Monitoring ===');

  const startTime = Date.now();

  // Measure configuration loading time
  console.time('Config Load');
  await config.init({
    configPath: './config/config.development.json',
    environment: 'development',
  });
  console.timeEnd('Config Load');

  // Measure validation time
  console.time('Config Validation');
  await config.validate();
  console.timeEnd('Config Validation');

  // Measure get/set operations
  console.time('Config Operations');
  for (let i = 0; i < 1000; i++) {
    config.get('runtime.logLevel');
    config.set('runtime.tickInterval', 1000 + i);
  }
  console.timeEnd('Config Operations');

  const totalTime = Date.now() - startTime;
  console.log(`Total example execution time: ${totalTime}ms`);
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🚀 Starting Configuration Management Examples\n');

  const examples = [
    { name: 'Basic Usage', fn: basicUsageExample },
    { name: 'Secrets Management', fn: secretsManagementExample },
    { name: 'Environment Config', fn: environmentConfigExample },
    { name: 'Validation', fn: validationExample },
    { name: 'Hot Reload', fn: hotReloadExample },
    { name: 'Documentation', fn: documentationExample },
    { name: 'Migration', fn: migrationExample },
    { name: 'Advanced Patterns', fn: advancedPatternsExample },
    { name: 'Multi-Environment', fn: multiEnvironmentExample },
    { name: 'Performance Monitoring', fn: performanceMonitoringExample },
  ];

  for (const example of examples) {
    try {
      console.log(`\n📋 Running ${example.name} Example...`);
      await example.fn();
      console.log(`✅ ${example.name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error);
    }
  }

  console.log('\n🎉 All examples completed!');
}

// Export for direct execution
if (require.main === module) {
  runAllExamples().catch(console.error);
}
