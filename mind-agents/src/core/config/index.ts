/**
 * Unified Configuration Management System - Main Export
 * 
 * This module provides the main entry point for the unified configuration
 * management system, integrating all components for seamless usage.
 */

// Core configuration management
export {
  UnifiedConfigManager,
  unifiedConfig,
  UnifiedConfig,
  PortalProviderConfig,
  ConfigEnvironment,
  ConfigChangeEvent,
  ConfigSource,
  UNIFIED_CONFIG_SCHEMA
} from './unified-config.js';

// Configuration validation
export {
  ConfigValidator,
  BuiltInRules
} from './config-validator.js';

// Secure secrets management
export {
  ConfigSecrets,
  SecretMetadata,
  EncryptedSecret,
  SecretValidationRule
} from './config-secrets.js';

// Documentation generation
export {
  ConfigDocumentationGenerator,
  configDocGenerator,
  DocumentationFormat,
  DocGenerationOptions,
  SchemaDocumentation,
  ConfigurationExample
} from './config-docs.js';

// Re-export validation types for convenience
export {
  ValidationRule,
  ValidationContext,
  ValidationError,
  SchemaDefinition,
  SchemaValidationResult,
  IValidator,
  ConfigValidatorOptions
} from '../../types/utils/validation.js';

import { UnifiedConfigManager, unifiedConfig } from './unified-config.js';
import { ConfigValidator } from './config-validator.js';
import { ConfigSecrets } from './config-secrets.js';
import { ConfigDocumentationGenerator, configDocGenerator } from './config-docs.js';
import { standardLoggers } from '../../utils/standard-logging.js';

/**
 * Configuration Management Facade
 * 
 * Provides a simplified interface for common configuration operations
 * while maintaining access to advanced features through individual components.
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configManager: UnifiedConfigManager;
  private validator: ConfigValidator;
  private secrets: ConfigSecrets;
  private docGenerator: ConfigDocumentationGenerator;
  private logger = standardLoggers.config;

  private constructor() {
    this.configManager = UnifiedConfigManager.getInstance();
    this.validator = new ConfigValidator();
    this.secrets = new ConfigSecrets();
    this.docGenerator = new ConfigDocumentationGenerator();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Initialize the complete configuration system
   */
  public async initialize(options: {
    configPath?: string;
    environment?: 'development' | 'testing' | 'staging' | 'production';
    secretsPath?: string;
    enableHotReload?: boolean;
  } = {}): Promise<void> {
    try {
      this.logger.info('Initializing unified configuration system', options);

      // Initialize configuration manager
      await this.configManager.initialize(options.configPath, options.environment);

      // Configure hot reload
      if (options.enableHotReload !== undefined) {
        this.configManager.setHotReload(options.enableHotReload);
      }

      // Initialize secrets if path provided
      if (options.secretsPath) {
        await this.secrets.importSecrets(options.secretsPath);
      }

      this.logger.info('Configuration system initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize configuration system', error);
      throw error;
    }
  }

  /**
   * Get configuration value by path
   */
  public get<T = unknown>(path: string): T | undefined {
    return this.configManager.get<T>(path);
  }

  /**
   * Set configuration value by path (runtime only)
   */
  public set(path: string, value: unknown): void {
    this.configManager.set(path, value);
  }

  /**
   * Get complete configuration
   */
  public getConfig() {
    return this.configManager.getConfig();
  }

  /**
   * Validate current configuration
   */
  public async validate() {
    return this.configManager.validateConfig();
  }

  /**
   * Store a secret securely
   */
  public async storeSecret(
    name: string, 
    value: string, 
    classification: 'public' | 'internal' | 'confidential' | 'secret' = 'confidential'
  ): Promise<void> {
    return this.secrets.storeSecret(name, value, classification);
  }

  /**
   * Get a secret value
   */
  public async getSecret(name: string): Promise<string | undefined> {
    return this.secrets.getSecret(name);
  }

  /**
   * Generate configuration documentation
   */
  public async generateDocumentation(options: {
    outputPath: string;
    format?: 'markdown' | 'html' | 'json' | 'yaml';
    includeExamples?: boolean;
    includeSecrets?: boolean;
  }): Promise<void> {
    const schema = await import('./unified-config.js').then(m => m.UNIFIED_CONFIG_SCHEMA);
    
    await this.docGenerator.generateDocumentation(schema, {
      format: options.format || 'markdown',
      includeExamples: options.includeExamples !== false,
      includeValidation: true,
      includeEnvironmentVars: true,
      includeSecrets: options.includeSecrets || false,
      outputPath: options.outputPath
    });
  }

  /**
   * Generate deployment guides
   */
  public async generateDeploymentGuides(outputDir: string): Promise<void> {
    return this.docGenerator.generateDeploymentGuides(outputDir);
  }

  /**
   * Generate configuration templates
   */
  public async generateConfigTemplates(outputDir: string): Promise<void> {
    return this.docGenerator.generateConfigTemplates(outputDir);
  }

  /**
   * Export configuration to file
   */
  public async exportConfig(filePath: string, includeSecrets = false): Promise<void> {
    return this.configManager.exportConfig(filePath, includeSecrets);
  }

  /**
   * Reload configuration from all sources
   */
  public async reload(): Promise<void> {
    return this.configManager.reload();
  }

  /**
   * Get configuration sources information
   */
  public getSources() {
    return this.configManager.getSources();
  }

  /**
   * Get secrets that need rotation
   */
  public getSecretsNeedingRotation() {
    return this.secrets.getSecretsNeedingRotation();
  }

  /**
   * Listen for configuration changes
   */
  public onConfigChange(callback: (event: any) => void): void {
    this.configManager.on('changed', callback);
  }

  /**
   * Listen for configuration reload events
   */
  public onConfigReload(callback: (config: any) => void): void {
    this.configManager.on('reloaded', callback);
  }

  /**
   * Dispose configuration manager
   */
  public dispose(): void {
    this.configManager.dispose();
    this.secrets.clearSecrets();
  }

  // Advanced access to individual components
  public get advanced() {
    return {
      configManager: this.configManager,
      validator: this.validator,
      secrets: this.secrets,
      docGenerator: this.docGenerator
    };
  }
}

// Export singleton instance for convenience
export const configManager = ConfigurationManager.getInstance();

/**
 * Quick access functions for common operations
 */
export const config = {
  /**
   * Initialize configuration system
   */
  init: (options?: Parameters<typeof configManager.initialize>[0]) => 
    configManager.initialize(options),

  /**
   * Get configuration value
   */
  get: <T = unknown>(path: string): T | undefined => 
    configManager.get<T>(path),

  /**
   * Set configuration value
   */
  set: (path: string, value: unknown) => 
    configManager.set(path, value),

  /**
   * Get complete configuration
   */
  all: () => 
    configManager.getConfig(),

  /**
   * Validate configuration
   */
  validate: () => 
    configManager.validate(),

  /**
   * Store secret
   */
  storeSecret: (name: string, value: string, classification?: any) => 
    configManager.storeSecret(name, value, classification),

  /**
   * Get secret
   */
  getSecret: (name: string) => 
    configManager.getSecret(name),

  /**
   * Reload configuration
   */
  reload: () => 
    configManager.reload(),

  /**
   * Export configuration
   */
  export: (filePath: string, includeSecrets = false) => 
    configManager.exportConfig(filePath, includeSecrets),

  /**
   * Generate documentation
   */
  generateDocs: (outputPath: string, format?: any) => 
    configManager.generateDocumentation({ outputPath, format }),

  /**
   * Listen for changes
   */
  onChange: (callback: (event: any) => void) => 
    configManager.onConfigChange(callback),

  /**
   * Listen for reloads
   */
  onReload: (callback: (config: any) => void) => 
    configManager.onConfigReload(callback)
};

/**
 * Environment-aware configuration loader
 * 
 * Automatically detects environment and loads appropriate configuration
 */
export async function loadEnvironmentConfig(
  baseConfigPath?: string,
  overridePath?: string
): Promise<void> {
  const environment = (process.env.NODE_ENV || 'development') as any;
  
  // Determine config paths
  const configPath = baseConfigPath || `./config/config.${environment}.json`;
  const secretsPath = overridePath || `./config/secrets.${environment}.json`;

  try {
    await configManager.initialize({
      configPath,
      environment,
      secretsPath: require('fs').existsSync(secretsPath) ? secretsPath : undefined,
      enableHotReload: environment === 'development'
    });

    // Log successful initialization
    const logger = standardLoggers.config;
    logger.info('Environment-aware configuration loaded', {
      environment,
      configPath,
      secretsPath: require('fs').existsSync(secretsPath) ? secretsPath : 'none'
    });

  } catch (error) {
    const logger = standardLoggers.config;
    logger.error('Failed to load environment configuration', {
      environment,
      configPath,
      error
    });
    throw error;
  }
}

/**
 * Migration utility for existing configuration
 * 
 * Helps migrate from the old configuration system to the new unified system
 */
export class ConfigurationMigrator {
  private logger = standardLoggers.config;

  /**
   * Migrate from legacy config-resolver to unified config
   */
  public async migrateLegacyConfig(
    legacyConfigPath: string,
    outputPath: string
  ): Promise<void> {
    try {
      this.logger.info('Starting configuration migration', {
        from: legacyConfigPath,
        to: outputPath
      });

      // Import the old config resolver
      const { configResolver } = await import('../../utils/config-resolver.js');
      
      // Read a sample character config to extract patterns
      const sampleCharacterPath = './characters/nyx.json';
      let legacyConfig: any = {};
      
      try {
        const fs = await import('fs');
        if (fs.existsSync(sampleCharacterPath)) {
          const characterContent = fs.readFileSync(sampleCharacterPath, 'utf8');
          const characterConfig = JSON.parse(characterContent);
          legacyConfig = configResolver.resolveCharacterConfig(characterConfig);
        }
      } catch (error) {
        this.logger.warn('Could not load sample character config for migration', error);
      }

      // Create equivalent unified config
      const migratedConfig = this.transformLegacyConfig(legacyConfig);

      // Write migrated configuration
      const fs = await import('fs');
      fs.writeFileSync(outputPath, JSON.stringify(migratedConfig, null, 2));

      this.logger.info('Configuration migration completed', {
        outputPath,
        sections: Object.keys(migratedConfig).length
      });

    } catch (error) {
      this.logger.error('Configuration migration failed', error);
      throw error;
    }
  }

  private transformLegacyConfig(legacyConfig: any): Partial<typeof import('./unified-config.js').UnifiedConfig> {
    return {
      runtime: {
        environment: 'development',
        tickInterval: 1000,
        maxAgents: 10,
        logLevel: 'info',
        version: '1.0.0'
      },
      persistence: {
        enabled: true,
        path: './data',
        autoSave: true,
        saveInterval: 30000,
        maxBackups: 5,
        compression: true
      },
      portals: {
        autoLoad: true,
        paths: ['./portals'],
        defaultPortal: 'openai',
        fallbackPortal: 'groq',
        providers: this.extractPortalProviders(legacyConfig)
      },
      extensions: {
        autoLoad: true,
        paths: ['./extensions'],
        enabled: [],
        disabled: [],
        config: {}
      },
      multiAgent: {
        enabled: false,
        maxConcurrentAgents: 5,
        coordinationStrategy: 'centralized',
        messagingProtocol: 'direct',
        loadBalancing: false
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 10000,
        memoryLimit: 2048,
        cpuThreshold: 80,
        enableProfiling: false,
        cacheSize: 1000,
        gcStrategy: 'balanced'
      },
      security: {
        enableAuth: false,
        enableEncryption: true,
        allowedOrigins: ['*'],
        rateLimiting: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipWhitelist: []
        },
        secrets: {
          apiKeys: this.extractApiKeys(legacyConfig)
        }
      },
      features: {
        enabled: [],
        disabled: [],
        experimental: [],
        beta: []
      },
      development: {
        hotReload: true,
        debugMode: false,
        verboseLogging: false,
        mockExternalServices: false,
        testMode: false
      }
    };
  }

  private extractPortalProviders(legacyConfig: any): Record<string, any> {
    const providers: Record<string, any> = {};
    
    if (legacyConfig.portals) {
      for (const portal of legacyConfig.portals) {
        if (portal.enabled) {
          providers[portal.name] = {
            enabled: true,
            type: portal.type,
            name: portal.name,
            capabilities: portal.capabilities || [],
            models: {
              chat: portal.config?.chatModel || portal.config?.model,
              embedding: portal.config?.embeddingModel,
              image: portal.config?.imageModel,
              tool: portal.config?.toolModel
            },
            settings: {
              maxTokens: portal.config?.max_tokens || 2048,
              temperature: portal.config?.temperature || 0.7
            },
            rateLimits: {
              requestsPerMinute: 60,
              requestsPerHour: 1000,
              tokensPerMinute: 10000
            },
            fallbacks: []
          };
        }
      }
    }

    return providers;
  }

  private extractApiKeys(legacyConfig: any): Record<string, string> {
    const apiKeys: Record<string, string> = {};
    
    // Extract from various possible locations in legacy config
    if (legacyConfig.portals) {
      for (const portal of legacyConfig.portals) {
        if (portal.config?.apiKey) {
          const keyName = `${portal.type.toUpperCase()}_API_KEY`;
          apiKeys[keyName] = portal.config.apiKey;
        }
      }
    }

    // Add environment variables that might exist
    const commonKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'TELEGRAM_BOT_TOKEN'
    ];

    for (const key of commonKeys) {
      if (process.env[key]) {
        apiKeys[key] = process.env[key]!;
      }
    }

    return apiKeys;
  }
}

// Export migrator instance
export const configMigrator = new ConfigurationMigrator();