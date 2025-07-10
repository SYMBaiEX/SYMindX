/**
 * Configuration Validator
 * 
 * Provides comprehensive validation and type-safe configuration management
 * for the SYMindX runtime environment.
 */

import { ConfigDefaults } from '../types/character.js';

/**
 * Validated Environment Configuration
 * Ensures all values are defined and valid
 */
export interface ValidatedEnvironmentConfig {
  // Required configuration with safe defaults
  OLLAMA_BASE_URL: string;
  ENABLE_OPENAI_EMBEDDINGS: boolean;
  EMBEDDING_PROVIDER: 'openai' | 'ollama';
  EMBEDDING_DIMENSIONS: number;
  
  // Legacy model support
  GROQ_MODEL: string;
  OLLAMA_MODEL: string;
  ANTHROPIC_MODEL: string;

  // API Keys (conditionally included)
  apiKeys: {
    GROQ_API_KEY?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    XAI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    KLUSTERAI_API_KEY?: string;
    GOOGLE_API_KEY?: string;
    MISTRAL_API_KEY?: string;
    COHERE_API_KEY?: string;
    AZURE_OPENAI_API_KEY?: string;
    TELEGRAM_BOT_TOKEN?: string;
  };

  // Portal models (conditionally included)
  portalModels: {
    [key: string]: string;
  };

  // Portal settings (all boolean values)
  portalSettings: {
    [key: string]: boolean;
  };
}

/**
 * Configuration Validation Result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: ValidatedEnvironmentConfig;
}

/**
 * Environment Configuration Validator
 */
export class ConfigValidator {
  
  /**
   * Validate and build safe environment configuration
   */
  public static validateEnvironmentConfig(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Build base configuration with safe defaults
    const config: ValidatedEnvironmentConfig = {
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || ConfigDefaults.OLLAMA_BASE_URL,
      ENABLE_OPENAI_EMBEDDINGS: this.parseBoolean(
        process.env.ENABLE_OPENAI_EMBEDDINGS,
        ConfigDefaults.ENABLE_OPENAI_EMBEDDINGS
      ),
      EMBEDDING_PROVIDER: this.validateEmbeddingProvider(
        process.env.EMBEDDING_PROVIDER,
        ConfigDefaults.EMBEDDING_PROVIDER
      ),
      EMBEDDING_DIMENSIONS: this.parsePositiveInteger(
        process.env.EMBEDDING_DIMENSIONS,
        ConfigDefaults.EMBEDDING_DIMENSIONS
      ),
      
      // Legacy model support
      GROQ_MODEL: process.env.GROQ_MODEL || ConfigDefaults.GROQ_MODEL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || ConfigDefaults.OLLAMA_MODEL,
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || ConfigDefaults.ANTHROPIC_MODEL,
      
      // Initialize collections
      apiKeys: {},
      portalModels: {},
      portalSettings: {},
    };

    // Validate and include API keys
    this.validateAndIncludeApiKeys(config, warnings);
    
    // Validate and include portal models
    this.validateAndIncludePortalModels(config, warnings);
    
    // Validate and include portal settings
    this.validateAndIncludePortalSettings(config, warnings);
    
    // Validate overall configuration
    this.validateOverallConfiguration(config, errors, warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config,
    };
  }

  /**
   * Parse boolean environment variable with safe defaults
   */
  private static parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Parse positive integer with safe defaults
   */
  private static parsePositiveInteger(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
  }

  /**
   * Validate embedding provider
   */
  private static validateEmbeddingProvider(
    value: string | undefined,
    defaultValue: 'openai' | 'ollama'
  ): 'openai' | 'ollama' {
    if (value === 'openai' || value === 'ollama') {
      return value;
    }
    return defaultValue;
  }

  /**
   * Validate and include API keys
   */
  private static validateAndIncludeApiKeys(
    config: ValidatedEnvironmentConfig,
    warnings: string[]
  ): void {
    const apiKeyMappings = [
      'GROQ_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'XAI_API_KEY',
      'OPENROUTER_API_KEY',
      'KLUSTERAI_API_KEY',
      'GOOGLE_API_KEY',
      'MISTRAL_API_KEY',
      'COHERE_API_KEY',
      'AZURE_OPENAI_API_KEY',
      'TELEGRAM_BOT_TOKEN',
    ];

    apiKeyMappings.forEach(key => {
      const value = process.env[key];
      if (value && value.trim() !== '') {
        // Validate API key format
        if (this.isValidApiKey(key, value)) {
          config.apiKeys[key as keyof typeof config.apiKeys] = value;
        } else {
          warnings.push(`Invalid format for ${key}`);
        }
      }
    });
  }

  /**
   * Validate API key format
   */
  private static isValidApiKey(keyName: string, value: string): boolean {
    // Basic validation - can be enhanced with specific format checks
    if (value.length < 8) {
      return false;
    }

    // Specific validation rules
    switch (keyName) {
      case 'OPENAI_API_KEY':
        return value.startsWith('sk-') && value.length > 20;
      case 'ANTHROPIC_API_KEY':
        return value.startsWith('sk-ant-') && value.length > 20;
      case 'GROQ_API_KEY':
        return value.startsWith('gsk_') && value.length > 20;
      case 'TELEGRAM_BOT_TOKEN':
        return /^\d{10}:[A-Za-z0-9_-]{35}$/.test(value);
      default:
        return true; // Basic length check passed
    }
  }

  /**
   * Validate and include portal models
   */
  private static validateAndIncludePortalModels(
    config: ValidatedEnvironmentConfig,
    warnings: string[]
  ): void {
    const portals = [
      'GROQ', 'OPENAI', 'ANTHROPIC', 'XAI', 'OLLAMA',
      'OPENROUTER', 'KLUSTERAI', 'GOOGLE', 'MISTRAL', 'COHERE', 'AZURE_OPENAI'
    ];
    
    const modelTypes = ['CHAT_MODEL', 'EMBEDDING_MODEL', 'IMAGE_MODEL', 'TOOL_MODEL'];

    portals.forEach(portal => {
      modelTypes.forEach(modelType => {
        const key = `${portal}_${modelType}`;
        const envValue = process.env[key];
        const defaultValue = ConfigDefaults[key as keyof typeof ConfigDefaults];

        if (envValue && envValue.trim() !== '') {
          config.portalModels[key] = envValue;
        } else if (defaultValue && typeof defaultValue === 'string') {
          config.portalModels[key] = defaultValue;
        }
      });
    });
  }

  /**
   * Validate and include portal settings
   */
  private static validateAndIncludePortalSettings(
    config: ValidatedEnvironmentConfig,
    warnings: string[]
  ): void {
    const portals = [
      'GROQ', 'OPENAI', 'ANTHROPIC', 'XAI', 'OLLAMA',
      'OPENROUTER', 'KLUSTERAI', 'GOOGLE', 'MISTRAL', 'COHERE', 'AZURE_OPENAI'
    ];
    
    const capabilities = ['CHAT', 'EMBEDDING', 'IMAGE'];

    portals.forEach(portal => {
      // Main portal toggle
      const mainKey = `${portal}_ENABLED`;
      const defaultValue = (ConfigDefaults[mainKey as keyof typeof ConfigDefaults] as boolean) ?? false;
      config.portalSettings[mainKey] = this.parseBoolean(process.env[mainKey], defaultValue);

      // Capability toggles
      capabilities.forEach(capability => {
        const key = `${portal}_${capability}_ENABLED`;
        const defaultCapabilityValue = (config.portalSettings[mainKey] ?? false) && process.env[key] !== 'false';
        config.portalSettings[key] = this.parseBoolean(process.env[key], defaultCapabilityValue);
      });
    });

    // Handle OpenAI special case
    const openaiEnabled = config.portalSettings.OPENAI_ENABLED ?? false;
    config.portalSettings.OPENAI_EMBEDDINGS_ENABLED = this.parseBoolean(
      process.env.OPENAI_EMBEDDINGS_ENABLED,
      openaiEnabled
    );
  }

  /**
   * Validate overall configuration
   */
  private static validateOverallConfiguration(
    config: ValidatedEnvironmentConfig,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for at least one AI provider
    const hasProvider = this.hasValidAIProvider(config);
    if (!hasProvider) {
      errors.push('At least one AI provider must be configured with valid API key');
    }

    // Validate embedding configuration
    if (config.ENABLE_OPENAI_EMBEDDINGS) {
      if (config.EMBEDDING_PROVIDER === 'openai' && !config.apiKeys.OPENAI_API_KEY) {
        errors.push('OpenAI API key required when using OpenAI embeddings');
      }
      if (config.EMBEDDING_PROVIDER === 'ollama' && !config.portalSettings.OLLAMA_ENABLED) {
        warnings.push('Ollama embeddings enabled but Ollama is not configured');
      }
    }

    // Validate Ollama configuration
    if (config.portalSettings.OLLAMA_ENABLED) {
      if (!this.isValidUrl(config.OLLAMA_BASE_URL)) {
        errors.push('Invalid Ollama base URL format');
      }
    }

    // Validate embedding dimensions
    if (config.EMBEDDING_DIMENSIONS <= 0) {
      errors.push('Embedding dimensions must be a positive number');
    }
  }

  /**
   * Check if at least one AI provider is valid
   */
  private static hasValidAIProvider(config: ValidatedEnvironmentConfig): boolean {
    const providers = [
      { key: 'GROQ_API_KEY', setting: 'GROQ_ENABLED' },
      { key: 'OPENAI_API_KEY', setting: 'OPENAI_ENABLED' },
      { key: 'ANTHROPIC_API_KEY', setting: 'ANTHROPIC_ENABLED' },
      { key: 'XAI_API_KEY', setting: 'XAI_ENABLED' },
    ];

    return providers.some(provider => 
      config.apiKeys[provider.key as keyof typeof config.apiKeys] && 
      config.portalSettings[provider.setting]
    ) || config.portalSettings.OLLAMA_ENABLED;
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Global configuration validator instance
 */
export const validateEnvironmentConfig = () => ConfigValidator.validateEnvironmentConfig();