/**
 * Configuration Resolver
 *
 * Transforms clean TypeScript character configuration to runtime configuration
 * with environment variable resolution and sensible defaults
 */

import {
  CharacterConfig,
  EnvironmentConfig,
  ConfigDefaults,
} from '../types/character.js';

import {
  validateEnvironmentConfig,
  ValidatedEnvironmentConfig,
} from './config-validator.js';

export class ConfigResolver {
  private envConfig: EnvironmentConfig | null = null;
  private validatedConfig: ValidatedEnvironmentConfig | null = null;

  constructor() {
    // Don't load environment config immediately - wait until first use
  }

  /**
   * Load environment variables with defaults using the new validator
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    // Use the new validator to get a safe configuration
    const validationResult = validateEnvironmentConfig();

    // Store the validated config for later use
    this.validatedConfig = validationResult.config;

    // Log validation results
    if (validationResult.warnings.length > 0) {
      console.warn('Configuration warnings:', validationResult.warnings);
    }

    if (!validationResult.isValid) {
      console.error('Configuration errors:', validationResult.errors);
      throw new Error(
        'Invalid environment configuration. Please check your environment variables.'
      );
    }

    // Convert validated config to EnvironmentConfig format
    return this.convertToEnvironmentConfig(validationResult.config);
  }

  /**
   * Convert ValidatedEnvironmentConfig to EnvironmentConfig
   */
  private convertToEnvironmentConfig(
    validated: ValidatedEnvironmentConfig
  ): EnvironmentConfig {
    const config: EnvironmentConfig = {
      // Core settings
      OLLAMA_BASE_URL: validated.OLLAMA_BASE_URL,
      ENABLE_OPENAI_EMBEDDINGS: validated.ENABLE_OPENAI_EMBEDDINGS,
      EMBEDDING_PROVIDER: validated.EMBEDDING_PROVIDER,
      EMBEDDING_DIMENSIONS: validated.EMBEDDING_DIMENSIONS,

      // Legacy models
      GROQ_MODEL: validated.GROQ_MODEL,
      OLLAMA_MODEL: validated.OLLAMA_MODEL,
      ANTHROPIC_MODEL: validated.ANTHROPIC_MODEL,
    };

    // Add API keys if they exist
    Object.entries(validated.apiKeys).forEach(([key, value]) => {
      if (value) {
        (config as any)[key] = value;
      }
    });

    // Add portal models if they exist
    Object.entries(validated.portalModels).forEach(([key, value]) => {
      if (value) {
        (config as any)[key] = value;
      }
    });

    // Add portal settings
    Object.entries(validated.portalSettings).forEach(([key, value]) => {
      (config as any)[key] = value;
    });

    return config;
  }

  /**
   * Get validated configuration (lazily loaded)
   */
  private getValidatedConfig(): ValidatedEnvironmentConfig {
    if (!this.validatedConfig) {
      // This will trigger loadEnvironmentConfig if needed
      this.ensureEnvConfig();
    }
    return this.validatedConfig!;
  }

  /**
   * Ensure environment config is loaded
   */
  private ensureEnvConfig(): EnvironmentConfig {
    if (!this.envConfig) {
      this.envConfig = this.loadEnvironmentConfig();
    }
    return this.envConfig;
  }

  /**
   * Resolve character configuration to runtime configuration
   */
  public resolveCharacterConfig(config: CharacterConfig): any {
    // Ensure environment is loaded first
    this.ensureEnvConfig();
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,

      personality: config.personality,

      autonomous: this.resolveAutonomousConfig(config.autonomous),

      modules: {
        memory: this.resolveMemoryConfig(config.memory),
        emotion: this.resolveEmotionConfig(config.emotion),
        cognition: this.resolveCognitionConfig(config.cognition),
      },

      communication: config.communication,
      capabilities: config.capabilities,

      extensions: this.resolveExtensionsConfig(config.extensions),
      portals: this.resolvePortalsConfig(config.portals),

      autonomous_behaviors: config.autonomous_behaviors,
      human_interaction: config.human_interaction,
      ethics: config.ethics,
      development: config.development,
    };
  }

  /**
   * Resolve autonomous configuration
   */
  private resolveAutonomousConfig(config: any): any {
    return {
      ...config,
      enabled: config.enabled ?? true,
    };
  }

  /**
   * Resolve memory configuration with environment variables
   */
  private resolveMemoryConfig(config: any): any {
    const validatedConfig = this.getValidatedConfig();
    const resolved = {
      type: config.type,
      config: {
        ...config.config,
        enable_embeddings: validatedConfig.ENABLE_OPENAI_EMBEDDINGS
          ? 'true'
          : 'false',
        embedding_provider: validatedConfig.EMBEDDING_PROVIDER,
        embedding_model: this.getEmbeddingModel(),
        embedding_dimensions: this.getEmbeddingDimensions(),
      },
    };

    // Add provider-specific configuration
    if (config.type === 'sqlite') {
      resolved.config.database_path =
        config.config.database_path || './data/memories.db';
    }

    return resolved;
  }

  /**
   * Get embedding model based on provider
   */
  private getEmbeddingModel(): string {
    const validatedConfig = this.getValidatedConfig();
    if (validatedConfig.EMBEDDING_PROVIDER === 'ollama') {
      // Use granular model control, fallback to legacy
      return (
        validatedConfig.portalModels.OLLAMA_EMBEDDING_MODEL ||
        validatedConfig.OLLAMA_MODEL ||
        ConfigDefaults.OLLAMA_EMBEDDING_MODEL!
      );
    }
    // Use granular model control for OpenAI
    return (
      validatedConfig.portalModels.OPENAI_EMBEDDING_MODEL ||
      ConfigDefaults.OPENAI_EMBEDDING_MODEL!
    );
  }

  /**
   * Get embedding dimensions based on model
   */
  private getEmbeddingDimensions(): number {
    const validatedConfig = this.getValidatedConfig();
    const model = this.getEmbeddingModel();
    return (
      ConfigDefaults.EMBEDDING_DIMENSIONS_MAP[
        model as keyof typeof ConfigDefaults.EMBEDDING_DIMENSIONS_MAP
      ] || validatedConfig.EMBEDDING_DIMENSIONS
    );
  }

  /**
   * Resolve emotion configuration
   */
  private resolveEmotionConfig(config: any): any {
    return {
      type: config.type,
      config: {
        ...config.config,
      },
    };
  }

  /**
   * Resolve cognition configuration
   */
  private resolveCognitionConfig(config: any): any {
    return {
      type: config.type,
      config: {
        ...config.config,
      },
    };
  }

  /**
   * Resolve extensions configuration
   */
  private resolveExtensionsConfig(extensions: any[]): any[] {
    return extensions.map((ext) => ({
      ...ext,
      config: this.resolveExtensionConfig(ext.name, ext.config),
    }));
  }

  /**
   * Resolve individual extension configuration
   */
  private resolveExtensionConfig(name: string, config: any): any {
    const validatedConfig = this.getValidatedConfig();
    switch (name) {
      case 'telegram':
        return {
          ...config,
          bot_token: validatedConfig.apiKeys.TELEGRAM_BOT_TOKEN,
        };
      default:
        return config;
    }
  }

  /**
   * Resolve portals configuration with environment variables
   */
  private resolvePortalsConfig(portals: any[]): any[] {
    return portals
      .map((portal) => this.resolvePortalConfig(portal))
      .filter((portal) => portal.enabled !== false);
  }

  /**
   * Resolve individual portal configuration
   */
  private resolvePortalConfig(portal: any): any {
    const resolved = {
      name: portal.name,
      type: portal.type,
      enabled: this.getPortalEnabled(
        portal.type,
        portal.enabled,
        portal.capabilities
      ),
      primary: portal.primary || false,
      capabilities: portal.capabilities,
      config: this.resolvePortalSpecificConfig(portal.type, portal.config),
    };

    return resolved;
  }

  /**
   * Get portal enabled status from environment based on capabilities
   */
  private getPortalEnabled(
    type: string,
    _defaultEnabled: boolean,
    capabilities: string[] = []
  ): boolean {
    const validatedConfig = this.getValidatedConfig();

    // Special handling for OpenAI (backward compatibility)
    if (type === 'openai') {
      if (!validatedConfig.apiKeys.OPENAI_API_KEY) return false;

      const hasChatCapability =
        capabilities.includes('chat_generation') ||
        capabilities.includes('text_generation');
      const hasEmbeddingCapability = capabilities.includes(
        'embedding_generation'
      );
      const hasImageCapability = capabilities.includes('image_generation');

      // Enable based on specific capability flags
      if (
        hasChatCapability &&
        (validatedConfig.portalSettings.OPENAI_CHAT_ENABLED ?? false)
      )
        return true;
      if (
        hasEmbeddingCapability &&
        (validatedConfig.portalSettings.OPENAI_EMBEDDINGS_ENABLED ?? false)
      )
        return true;
      if (
        hasImageCapability &&
        (validatedConfig.portalSettings.OPENAI_IMAGE_ENABLED ?? false)
      )
        return true;

      // If no specific capabilities defined, use legacy logic
      if (capabilities.length === 0) {
        return (
          (validatedConfig.portalSettings.OPENAI_CHAT_ENABLED ?? false) ||
          (validatedConfig.portalSettings.OPENAI_EMBEDDINGS_ENABLED ?? false) ||
          (validatedConfig.portalSettings.OPENAI_IMAGE_ENABLED ?? false)
        );
      }

      return false;
    }

    // Generic handling for all other portals
    const portalName = type.toUpperCase().replace('.', '').replace('-', '_');
    const mainEnabled =
      validatedConfig.portalSettings[`${portalName}_ENABLED`] ?? false;
    const apiKey =
      validatedConfig.apiKeys[
        `${portalName}_API_KEY` as keyof typeof validatedConfig.apiKeys
      ];

    // Check main toggle and API key (except Ollama which doesn't need API key)
    if (!mainEnabled || (type !== 'ollama' && !apiKey)) {
      return false;
    }

    // Check capability-specific toggles
    const hasChatCapability =
      capabilities.includes('chat_generation') ||
      capabilities.includes('text_generation');
    const hasEmbeddingCapability = capabilities.includes(
      'embedding_generation'
    );
    const hasImageCapability = capabilities.includes('image_generation');

    if (hasChatCapability) {
      const chatEnabled =
        validatedConfig.portalSettings[`${portalName}_CHAT_ENABLED`] ?? false;
      if (chatEnabled === false) return false;
    }

    if (hasEmbeddingCapability) {
      const embeddingEnabled =
        validatedConfig.portalSettings[`${portalName}_EMBEDDING_ENABLED`] ??
        false;
      if (embeddingEnabled === false) return false;
    }

    if (hasImageCapability) {
      const imageEnabled =
        validatedConfig.portalSettings[`${portalName}_IMAGE_ENABLED`] ?? false;
      if (imageEnabled === false) return false;
    }

    return true;
  }

  /**
   * Resolve portal-specific configuration
   */
  private resolvePortalSpecificConfig(type: string, config: any): any {
    const validatedConfig = this.getValidatedConfig();
    const baseConfig = {
      max_tokens: config.max_tokens || ConfigDefaults.MAX_TOKENS,
      temperature: config.temperature || ConfigDefaults.TEMPERATURE,
    };

    // Get the portal name in uppercase for environment variable lookup
    const portalName = type.toUpperCase().replace('.', '').replace('-', '_');

    // Build configuration with granular model controls
    const portalConfig: any = {
      ...baseConfig,
      apiKey:
        validatedConfig.apiKeys[
          `${portalName}_API_KEY` as keyof typeof validatedConfig.apiKeys
        ],
    };

    // Add granular model configurations
    const chatModel = validatedConfig.portalModels[`${portalName}_CHAT_MODEL`];
    const embeddingModel =
      validatedConfig.portalModels[`${portalName}_EMBEDDING_MODEL`];
    const imageModel =
      validatedConfig.portalModels[`${portalName}_IMAGE_MODEL`];
    const toolModel = validatedConfig.portalModels[`${portalName}_TOOL_MODEL`];

    // Set models based on what's available
    if (chatModel) {
      portalConfig.chatModel = chatModel;
      // Keep legacy 'model' for backward compatibility
      portalConfig.model = chatModel;
    }

    if (embeddingModel) {
      portalConfig.embeddingModel = embeddingModel;
      // Add dimensions if it's a known model
      const dimensions =
        ConfigDefaults.EMBEDDING_DIMENSIONS_MAP[
          embeddingModel as keyof typeof ConfigDefaults.EMBEDDING_DIMENSIONS_MAP
        ];
      if (dimensions) {
        portalConfig.embeddingDimensions = dimensions;
      }
    }

    if (imageModel) {
      portalConfig.imageModel = imageModel;
    }

    if (toolModel) {
      portalConfig.toolModel = toolModel;
    }

    // Portal-specific overrides
    switch (type) {
      case 'ollama':
        portalConfig.baseUrl = validatedConfig.OLLAMA_BASE_URL;
        break;

      case 'openai':
        // Ensure backward compatibility with legacy model names
        if (
          !portalConfig.chatModel &&
          validatedConfig.portalModels.OPENAI_CHAT_MODEL
        ) {
          portalConfig.chatModel =
            validatedConfig.portalModels.OPENAI_CHAT_MODEL;
          portalConfig.model = validatedConfig.portalModels.OPENAI_CHAT_MODEL;
        }
        if (
          !portalConfig.embeddingModel &&
          validatedConfig.portalModels.OPENAI_EMBEDDING_MODEL
        ) {
          portalConfig.embeddingModel =
            validatedConfig.portalModels.OPENAI_EMBEDDING_MODEL;
          portalConfig.embeddingDimensions = this.getEmbeddingDimensions();
        }
        break;

      case 'groq':
        // Fallback to legacy GROQ_MODEL if specific models not set
        if (!portalConfig.chatModel && validatedConfig.GROQ_MODEL) {
          portalConfig.chatModel = validatedConfig.GROQ_MODEL;
          portalConfig.model = validatedConfig.GROQ_MODEL;
        }
        break;

      case 'anthropic':
        // Fallback to legacy ANTHROPIC_MODEL if specific models not set
        if (!portalConfig.chatModel && validatedConfig.ANTHROPIC_MODEL) {
          portalConfig.chatModel = validatedConfig.ANTHROPIC_MODEL;
          portalConfig.model = validatedConfig.ANTHROPIC_MODEL;
        }
        break;
    }

    return portalConfig;
  }

  /**
   * Validate required environment variables
   */
  public validateEnvironment(): { valid: boolean; missing: string[] } {
    try {
      // Use the new validation system
      const validationResult = validateEnvironmentConfig();

      return {
        valid: validationResult.isValid,
        missing: validationResult.errors,
      };
    } catch (error) {
      return {
        valid: false,
        missing: [
          error instanceof Error ? error.message : 'Unknown validation error',
        ],
      };
    }
  }
}

/**
 * Singleton instance for global access
 */
export const configResolver = new ConfigResolver();
