/**
 * Unified Configuration Management System
 *
 * This module provides a comprehensive, type-safe, and environment-aware
 * configuration system for SYMindX with hot-reload capabilities.
 */

import { EventEmitter } from 'events';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  watchFile,
  unwatchFile,
} from 'fs';
import { resolve, dirname } from 'path';
import { standardLoggers } from '../../utils/standard-logging.js';
import {
  SchemaDefinition,
  ValidationError,
  SchemaValidationResult,
} from '../../types/utils/validation.js';
import { ConfigValidator } from './config-validator.js';
import { ConfigSecrets } from './config-secrets.js';

/**
 * Configuration environment types
 */
export type ConfigEnvironment =
  | 'development'
  | 'testing'
  | 'staging'
  | 'production';

/**
 * Configuration change event data
 */
export interface ConfigChangeEvent {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  source: 'file' | 'runtime' | 'environment';
  timestamp: Date;
}

/**
 * Configuration source metadata
 */
export interface ConfigSource {
  type: 'file' | 'environment' | 'override';
  path?: string;
  priority: number;
  environment?: ConfigEnvironment;
  lastModified?: Date;
}

/**
 * Unified configuration structure
 */
export interface UnifiedConfig {
  // Core Runtime Configuration
  runtime: {
    environment: ConfigEnvironment;
    tickInterval: number;
    maxAgents: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    version: string;
  };

  // Memory and Persistence
  persistence: {
    enabled: boolean;
    path: string;
    autoSave: boolean;
    saveInterval: number;
    maxBackups: number;
    compression: boolean;
  };

  // AI Portal Configuration
  portals: {
    autoLoad: boolean;
    paths: string[];
    defaultPortal: string;
    fallbackPortal: string;
    providers: Record<string, PortalProviderConfig>;
  };

  // Extension System
  extensions: {
    autoLoad: boolean;
    paths: string[];
    enabled: string[];
    disabled: string[];
    config: Record<string, Record<string, unknown>>;
  };

  // Multi-Agent Coordination
  multiAgent: {
    enabled: boolean;
    maxConcurrentAgents: number;
    coordinationStrategy: 'centralized' | 'distributed' | 'hybrid';
    messagingProtocol: 'direct' | 'pubsub' | 'queue';
    loadBalancing: boolean;
  };

  // Performance and Monitoring
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
    memoryLimit: number;
    cpuThreshold: number;
    enableProfiling: boolean;
    cacheSize: number;
    gcStrategy: 'aggressive' | 'balanced' | 'conservative';
  };

  // Security Configuration
  security: {
    enableAuth: boolean;
    enableEncryption: boolean;
    allowedOrigins: string[];
    rateLimiting: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipWhitelist: string[];
    };
    secrets: {
      encryptionKey?: string;
      jwtSecret?: string;
      apiKeys: Record<string, string>;
    };
  };

  // Feature Flags
  features: {
    enabled: string[];
    disabled: string[];
    experimental: string[];
    beta: string[];
  };

  // Development and Debugging
  development: {
    hotReload: boolean;
    debugMode: boolean;
    verboseLogging: boolean;
    mockExternalServices: boolean;
    testMode: boolean;
  };
}

/**
 * Portal provider configuration
 */
export interface PortalProviderConfig {
  enabled: boolean;
  type: string;
  name: string;
  capabilities: string[];
  models: {
    chat?: string;
    embedding?: string;
    image?: string;
    tool?: string;
  };
  settings: {
    maxTokens: number;
    temperature: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerMinute: number;
  };
  fallbacks: string[];
}

/**
 * Configuration schema definition
 */
export const UNIFIED_CONFIG_SCHEMA: SchemaDefinition = {
  type: 'object',
  required: true,
  properties: {
    runtime: {
      type: 'object',
      required: true,
      properties: {
        environment: {
          type: 'string',
          required: true,
          enum: ['development', 'testing', 'staging', 'production'],
          default: 'development',
        },
        tickInterval: {
          type: 'number',
          required: true,
          min: 100,
          max: 60000,
          default: 1000,
        },
        maxAgents: {
          type: 'number',
          required: true,
          min: 1,
          max: 1000,
          default: 10,
        },
        logLevel: {
          type: 'string',
          required: true,
          enum: ['debug', 'info', 'warn', 'error'],
          default: 'info',
        },
        version: {
          type: 'string',
          required: true,
          pattern: /^\d+\.\d+\.\d+/,
          default: '1.0.0',
        },
      },
    },
    persistence: {
      type: 'object',
      required: true,
      properties: {
        enabled: { type: 'boolean', default: true },
        path: { type: 'string', default: './data' },
        autoSave: { type: 'boolean', default: true },
        saveInterval: { type: 'number', min: 1000, default: 30000 },
        maxBackups: { type: 'number', min: 0, max: 100, default: 5 },
        compression: { type: 'boolean', default: true },
      },
    },
    portals: {
      type: 'object',
      required: true,
      properties: {
        autoLoad: { type: 'boolean', default: true },
        paths: {
          type: 'array',
          items: { type: 'string' },
          default: ['./portals'],
        },
        defaultPortal: { type: 'string', default: 'openai' },
        fallbackPortal: { type: 'string', default: 'groq' },
        providers: {
          type: 'object',
          default: {},
          properties: {}, // Dynamic based on available providers
        },
      },
    },
    extensions: {
      type: 'object',
      required: true,
      properties: {
        autoLoad: { type: 'boolean', default: true },
        paths: {
          type: 'array',
          items: { type: 'string' },
          default: ['./extensions'],
        },
        enabled: { type: 'array', items: { type: 'string' }, default: [] },
        disabled: { type: 'array', items: { type: 'string' }, default: [] },
        config: { type: 'object', default: {} },
      },
    },
    multiAgent: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: false },
        maxConcurrentAgents: { type: 'number', min: 1, max: 100, default: 5 },
        coordinationStrategy: {
          type: 'string',
          enum: ['centralized', 'distributed', 'hybrid'],
          default: 'centralized',
        },
        messagingProtocol: {
          type: 'string',
          enum: ['direct', 'pubsub', 'queue'],
          default: 'direct',
        },
        loadBalancing: { type: 'boolean', default: false },
      },
    },
    performance: {
      type: 'object',
      properties: {
        enableMetrics: { type: 'boolean', default: true },
        metricsInterval: { type: 'number', min: 1000, default: 10000 },
        memoryLimit: { type: 'number', min: 100, default: 2048 }, // MB
        cpuThreshold: { type: 'number', min: 0, max: 100, default: 80 }, // %
        enableProfiling: { type: 'boolean', default: false },
        cacheSize: { type: 'number', min: 10, default: 1000 }, // MB
        gcStrategy: {
          type: 'string',
          enum: ['aggressive', 'balanced', 'conservative'],
          default: 'balanced',
        },
      },
    },
    security: {
      type: 'object',
      properties: {
        enableAuth: { type: 'boolean', default: false },
        enableEncryption: { type: 'boolean', default: true },
        allowedOrigins: {
          type: 'array',
          items: { type: 'string' },
          default: ['*'],
        },
        rateLimiting: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean', default: true },
            windowMs: { type: 'number', min: 1000, default: 60000 },
            maxRequests: { type: 'number', min: 1, default: 100 },
            skipWhitelist: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
          },
        },
        secrets: {
          type: 'object',
          properties: {
            encryptionKey: { type: 'string' },
            jwtSecret: { type: 'string' },
            apiKeys: { type: 'object', default: {} },
          },
        },
      },
    },
    features: {
      type: 'object',
      properties: {
        enabled: { type: 'array', items: { type: 'string' }, default: [] },
        disabled: { type: 'array', items: { type: 'string' }, default: [] },
        experimental: { type: 'array', items: { type: 'string' }, default: [] },
        beta: { type: 'array', items: { type: 'string' }, default: [] },
      },
    },
    development: {
      type: 'object',
      properties: {
        hotReload: { type: 'boolean', default: true },
        debugMode: { type: 'boolean', default: false },
        verboseLogging: { type: 'boolean', default: false },
        mockExternalServices: { type: 'boolean', default: false },
        testMode: { type: 'boolean', default: false },
      },
    },
  },
};

/**
 * Unified Configuration Manager
 *
 * Provides centralized configuration management with:
 * - Environment-aware configuration loading
 * - Type-safe validation
 * - Hot-reload capabilities
 * - Secure secret management
 * - Multi-source configuration merging
 */
export class UnifiedConfigManager extends EventEmitter {
  private static instance: UnifiedConfigManager;
  private config: UnifiedConfig;
  private sources: Map<string, ConfigSource> = new Map();
  private validator: ConfigValidator;
  private secrets: ConfigSecrets;
  private watchedFiles: Set<string> = new Set();
  private logger = standardLoggers.config;
  private isLoaded = false;
  private hotReloadEnabled = true;

  private constructor() {
    super();
    this.validator = new ConfigValidator();
    this.secrets = new ConfigSecrets();
    this.config = this.getDefaultConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UnifiedConfigManager {
    if (!UnifiedConfigManager.instance) {
      UnifiedConfigManager.instance = new UnifiedConfigManager();
    }
    return UnifiedConfigManager.instance;
  }

  /**
   * Initialize configuration system
   */
  public async initialize(
    configPath?: string,
    environment?: ConfigEnvironment
  ): Promise<void> {
    try {
      this.logger.info('Initializing unified configuration system', {
        configPath,
        environment,
        hotReloadEnabled: this.hotReloadEnabled,
      });

      // Load configuration from multiple sources
      await this.loadFromEnvironment();
      if (configPath) {
        await this.loadFromFile(configPath, environment);
      }
      await this.loadFromRuntimeDefaults();

      // Validate final configuration
      const validation = await this.validateConfig();
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
        );
      }

      // Setup hot reload if enabled
      if (this.hotReloadEnabled && this.config.development.hotReload) {
        this.setupHotReload();
      }

      this.isLoaded = true;
      this.emit('initialized', this.config);

      this.logger.info('Configuration system initialized successfully', {
        sources: Array.from(this.sources.keys()),
        environment: this.config.runtime.environment,
      });
    } catch (error) {
      this.logger.error('Failed to initialize configuration system', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): UnifiedConfig {
    if (!this.isLoaded) {
      this.logger.warn('Configuration accessed before initialization');
    }
    return this.config;
  }

  /**
   * Get configuration value by path
   */
  public get<T = unknown>(path: string): T | undefined {
    return this.getValueByPath(this.config, path) as T;
  }

  /**
   * Set configuration value by path (runtime only)
   */
  public set(path: string, value: unknown): void {
    const oldValue = this.get(path);
    this.setValueByPath(this.config, path, value);

    this.emit('changed', {
      path,
      oldValue,
      newValue: value,
      source: 'runtime',
      timestamp: new Date(),
    } as ConfigChangeEvent);

    this.logger.debug('Configuration value updated', {
      path,
      oldValue,
      newValue: value,
    });
  }

  /**
   * Reload configuration from all sources
   */
  public async reload(): Promise<void> {
    this.logger.info('Reloading configuration');

    const previousConfig = { ...this.config };

    try {
      // Reload from all sources
      for (const [sourcePath, source] of this.sources) {
        if (source.type === 'file') {
          await this.loadFromFile(sourcePath, this.config.runtime.environment);
        }
      }
      await this.loadFromEnvironment();

      // Validate reloaded configuration
      const validation = await this.validateConfig();
      if (!validation.valid) {
        // Rollback on validation failure
        this.config = previousConfig;
        throw new Error(
          `Configuration reload validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
        );
      }

      this.emit('reloaded', this.config);
      this.logger.info('Configuration reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to reload configuration', error);
      throw error;
    }
  }

  /**
   * Validate current configuration
   */
  public async validateConfig(): Promise<SchemaValidationResult> {
    return this.validator.validate(this.config, UNIFIED_CONFIG_SCHEMA);
  }

  /**
   * Export configuration to file
   */
  public async exportConfig(
    filePath: string,
    includeSecrets = false
  ): Promise<void> {
    try {
      let exportConfig = { ...this.config };

      if (!includeSecrets) {
        // Remove sensitive data
        exportConfig = {
          ...exportConfig,
          security: {
            ...exportConfig.security,
            secrets: {
              ...exportConfig.security.secrets,
              encryptionKey: undefined,
              jwtSecret: undefined,
              apiKeys: {},
            },
          },
        };
      }

      writeFileSync(filePath, JSON.stringify(exportConfig, null, 2));
      this.logger.info('Configuration exported', { filePath, includeSecrets });
    } catch (error) {
      this.logger.error('Failed to export configuration', error);
      throw error;
    }
  }

  /**
   * Get configuration sources information
   */
  public getSources(): ConfigSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Enable or disable hot reload
   */
  public setHotReload(enabled: boolean): void {
    if (enabled === this.hotReloadEnabled) return;

    this.hotReloadEnabled = enabled;

    if (enabled) {
      this.setupHotReload();
    } else {
      this.teardownHotReload();
    }

    this.logger.info('Hot reload toggled', { enabled });
  }

  /**
   * Dispose configuration manager
   */
  public dispose(): void {
    this.teardownHotReload();
    this.removeAllListeners();
    this.sources.clear();
    this.isLoaded = false;
    this.logger.info('Configuration manager disposed');
  }

  // Private methods

  private getDefaultConfig(): UnifiedConfig {
    return {
      runtime: {
        environment: 'development',
        tickInterval: 1000,
        maxAgents: 10,
        logLevel: 'info',
        version: '1.0.0',
      },
      persistence: {
        enabled: true,
        path: './data',
        autoSave: true,
        saveInterval: 30000,
        maxBackups: 5,
        compression: true,
      },
      portals: {
        autoLoad: true,
        paths: ['./portals'],
        defaultPortal: 'openai',
        fallbackPortal: 'groq',
        providers: {},
      },
      extensions: {
        autoLoad: true,
        paths: ['./extensions'],
        enabled: [],
        disabled: [],
        config: {},
      },
      multiAgent: {
        enabled: false,
        maxConcurrentAgents: 5,
        coordinationStrategy: 'centralized',
        messagingProtocol: 'direct',
        loadBalancing: false,
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 10000,
        memoryLimit: 2048,
        cpuThreshold: 80,
        enableProfiling: false,
        cacheSize: 1000,
        gcStrategy: 'balanced',
      },
      security: {
        enableAuth: false,
        enableEncryption: true,
        allowedOrigins: ['*'],
        rateLimiting: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 100,
          skipWhitelist: [],
        },
        secrets: {
          apiKeys: {},
        },
      },
      features: {
        enabled: [],
        disabled: [],
        experimental: [],
        beta: [],
      },
      development: {
        hotReload: true,
        debugMode: false,
        verboseLogging: false,
        mockExternalServices: false,
        testMode: false,
      },
    };
  }

  private async loadFromFile(
    filePath: string,
    environment?: ConfigEnvironment
  ): Promise<void> {
    const resolvedPath = resolve(filePath);

    if (!existsSync(resolvedPath)) {
      this.logger.warn('Configuration file not found', {
        filePath: resolvedPath,
      });
      return;
    }

    try {
      const fileContent = readFileSync(resolvedPath, 'utf8');
      const fileConfig = JSON.parse(fileContent);

      // Environment-specific configuration
      let envConfig = fileConfig;
      if (
        environment &&
        fileConfig.environments &&
        fileConfig.environments[environment]
      ) {
        envConfig = this.mergeConfigs(
          fileConfig,
          fileConfig.environments[environment]
        );
      }

      this.config = this.mergeConfigs(this.config, envConfig);

      this.sources.set(resolvedPath, {
        type: 'file',
        path: resolvedPath,
        priority: 100,
        environment,
        lastModified: new Date(),
      });

      this.logger.debug('Configuration loaded from file', {
        filePath: resolvedPath,
        environment,
      });
    } catch (error) {
      this.logger.error('Failed to load configuration from file', {
        filePath: resolvedPath,
        error,
      });
      throw error;
    }
  }

  private async loadFromEnvironment(): Promise<void> {
    const envConfig = await this.parseEnvironmentVariables();
    this.config = this.mergeConfigs(this.config, envConfig);

    this.sources.set('environment', {
      type: 'environment',
      priority: 200,
      lastModified: new Date(),
    });

    this.logger.debug('Configuration loaded from environment variables');
  }

  private async loadFromRuntimeDefaults(): Promise<void> {
    // Load any runtime-specific defaults
    const runtimeConfig = this.getRuntimeDefaults();
    this.config = this.mergeConfigs(this.config, runtimeConfig);

    this.sources.set('runtime-defaults', {
      type: 'override',
      priority: 50,
      lastModified: new Date(),
    });
  }

  private async parseEnvironmentVariables(): Promise<Partial<UnifiedConfig>> {
    const envConfig: Partial<UnifiedConfig> = {};

    // Parse environment variables with prefix mapping
    const envMappings = {
      SYMINDX_LOG_LEVEL: 'runtime.logLevel',
      SYMINDX_TICK_INTERVAL: 'runtime.tickInterval',
      SYMINDX_MAX_AGENTS: 'runtime.maxAgents',
      SYMINDX_ENVIRONMENT: 'runtime.environment',
      SYMINDX_DATA_PATH: 'persistence.path',
      SYMINDX_DEBUG: 'development.debugMode',
      SYMINDX_HOT_RELOAD: 'development.hotReload',
      SYMINDX_ENABLE_AUTH: 'security.enableAuth',
      SYMINDX_ENABLE_ENCRYPTION: 'security.enableEncryption',
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setValueByPath(envConfig, configPath, this.parseEnvValue(value));
      }
    }

    // Load API keys
    const apiKeys: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.endsWith('_API_KEY') && value) {
        apiKeys[key] = value;
      }
    }

    if (Object.keys(apiKeys).length > 0) {
      this.setValueByPath(envConfig, 'security.secrets.apiKeys', apiKeys);
    }

    return envConfig;
  }

  private parseEnvValue(value: string): unknown {
    // Try to parse as boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) return num;

    // Return as string
    return value;
  }

  private getRuntimeDefaults(): Partial<UnifiedConfig> {
    return {
      runtime: {
        version: process.env.npm_package_version || '1.0.0',
        environment:
          (process.env.NODE_ENV as ConfigEnvironment) || 'development',
      },
    };
  }

  private mergeConfigs(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.mergeConfigs(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private getValueByPath(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private setupHotReload(): void {
    for (const [path, source] of this.sources) {
      if (source.type === 'file' && source.path) {
        this.watchFile(source.path);
      }
    }
  }

  private watchFile(filePath: string): void {
    if (this.watchedFiles.has(filePath)) return;

    watchFile(filePath, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.logger.info('Configuration file changed, reloading', { filePath });
        this.reload().catch((error) => {
          this.logger.error(
            'Failed to reload configuration after file change',
            error
          );
        });
      }
    });

    this.watchedFiles.add(filePath);
    this.logger.debug('Watching configuration file', { filePath });
  }

  private teardownHotReload(): void {
    for (const filePath of this.watchedFiles) {
      unwatchFile(filePath);
    }
    this.watchedFiles.clear();
    this.logger.debug('Hot reload teardown complete');
  }
}

// Export singleton instance
export const unifiedConfig = UnifiedConfigManager.getInstance();
