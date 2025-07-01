/**
 * Configuration Resolver
 * 
 * Transforms clean TypeScript character configuration to runtime configuration
 * with environment variable resolution and sensible defaults
 */

import { CharacterConfig, EnvironmentConfig, ConfigDefaults } from '../types/character.js'

export class ConfigResolver {
  private envConfig: EnvironmentConfig | null = null

  constructor() {
    // Don't load environment config immediately - wait until first use
  }

  /**
   * Load environment variables with defaults
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    return {
      // Portal API Keys
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      XAI_API_KEY: process.env.XAI_API_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      KLUSTERAI_API_KEY: process.env.KLUSTERAI_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      COHERE_API_KEY: process.env.COHERE_API_KEY,
      AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
      
      // Portal Models - Legacy support
      GROQ_MODEL: process.env.GROQ_MODEL || ConfigDefaults.GROQ_MODEL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL || ConfigDefaults.OLLAMA_MODEL,
      ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || ConfigDefaults.ANTHROPIC_MODEL,
      
      // Portal Models - Granular control
      ...this.loadPortalModels(),
      
      // Portal Settings - Granular capability control
      ...this.loadPortalSettings(),
      
      // Ollama Settings
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || ConfigDefaults.OLLAMA_BASE_URL,
      
      // Embedding Settings
      ENABLE_OPENAI_EMBEDDINGS: this.parseBoolean(process.env.ENABLE_OPENAI_EMBEDDINGS, ConfigDefaults.ENABLE_OPENAI_EMBEDDINGS),
      EMBEDDING_PROVIDER: (process.env.EMBEDDING_PROVIDER as 'openai' | 'ollama') || ConfigDefaults.EMBEDDING_PROVIDER,
      EMBEDDING_DIMENSIONS: parseInt(process.env.EMBEDDING_DIMENSIONS || '') || ConfigDefaults.EMBEDDING_DIMENSIONS,
      
      // Extension Settings
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN
    }
  }

  /**
   * Parse boolean environment variables with defaults
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue
    return value.toLowerCase() === 'true' || value === '1'
  }

  /**
   * Load portal models with granular control
   */
  private loadPortalModels(): Record<string, string | undefined> {
    const portals = ['GROQ', 'OPENAI', 'ANTHROPIC', 'XAI', 'OLLAMA', 'OPENROUTER', 
                     'KLUSTERAI', 'GOOGLE', 'MISTRAL', 'COHERE', 'AZURE_OPENAI']
    const modelTypes = ['CHAT_MODEL', 'EMBEDDING_MODEL', 'IMAGE_MODEL', 'TOOL_MODEL']
    const models: Record<string, string | undefined> = {}

    // For each portal and model type
    for (const portal of portals) {
      for (const modelType of modelTypes) {
        const key = `${portal}_${modelType}`
        const defaultKey = key as keyof typeof ConfigDefaults
        
        // Use environment variable if set, otherwise use default
        const envValue = process.env[key]
        const defaultValue = ConfigDefaults[defaultKey]
        
        // Only set if there's a string value (env or default that's not undefined and not boolean)
        if (envValue !== undefined) {
          models[key] = envValue
        } else if (defaultValue !== undefined && typeof defaultValue === 'string') {
          models[key] = defaultValue
        }
      }
    }
    
    // Handle legacy OpenAI model names for backward compatibility
    models.OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || ConfigDefaults.OPENAI_CHAT_MODEL
    models.OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || ConfigDefaults.OPENAI_EMBEDDING_MODEL

    return models
  }

  /**
   * Load portal settings with granular capability control
   */
  private loadPortalSettings(): Record<string, boolean> {
    const portals = ['GROQ', 'OPENAI', 'ANTHROPIC', 'XAI', 'OLLAMA', 'OPENROUTER', 
                     'KLUSTERAI', 'GOOGLE', 'MISTRAL', 'COHERE', 'AZURE_OPENAI']
    const capabilities = ['CHAT', 'EMBEDDING', 'IMAGE']
    const settings: Record<string, boolean> = {}

    // For each portal
    for (const portal of portals) {
      // Main toggle
      const mainKey = `${portal}_ENABLED`
      settings[mainKey] = this.parseBoolean(process.env[mainKey], ConfigDefaults[mainKey as keyof typeof ConfigDefaults] as boolean ?? false)
      
      // Capability toggles
      for (const capability of capabilities) {
        const key = `${portal}_${capability}_ENABLED`
        // Default to true if main toggle is true and not explicitly disabled
        const defaultValue = settings[mainKey] && process.env[key] !== 'false'
        settings[key] = this.parseBoolean(process.env[key], defaultValue)
      }
    }

    // Handle OpenAI's special case (EMBEDDINGS vs EMBEDDING)
    if ('OPENAI_EMBEDDINGS_ENABLED' in settings) {
      settings.OPENAI_EMBEDDINGS_ENABLED = this.parseBoolean(
        process.env.OPENAI_EMBEDDINGS_ENABLED, 
        settings.OPENAI_ENABLED
      )
    }

    return settings
  }

  /**
   * Ensure environment config is loaded
   */
  private ensureEnvConfig(): EnvironmentConfig {
    if (!this.envConfig) {
      this.envConfig = this.loadEnvironmentConfig()
    }
    return this.envConfig
  }

  /**
   * Resolve character configuration to runtime configuration
   */
  public resolveCharacterConfig(config: CharacterConfig): any {
    // Ensure environment is loaded first
    this.ensureEnvConfig()
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
        cognition: this.resolveCognitionConfig(config.cognition)
      },
      
      communication: config.communication,
      capabilities: config.capabilities,
      
      extensions: this.resolveExtensionsConfig(config.extensions),
      portals: this.resolvePortalsConfig(config.portals),
      
      autonomous_behaviors: config.autonomous_behaviors,
      human_interaction: config.human_interaction,
      ethics: config.ethics,
      development: config.development
    }
  }

  /**
   * Resolve autonomous configuration
   */
  private resolveAutonomousConfig(config: any): any {
    return {
      ...config,
      enabled: config.enabled ?? true
    }
  }

  /**
   * Resolve memory configuration with environment variables
   */
  private resolveMemoryConfig(config: any): any {
    const envConfig = this.ensureEnvConfig()
    const resolved = {
      type: config.type,
      config: {
        ...config.config,
        enable_embeddings: envConfig.ENABLE_OPENAI_EMBEDDINGS ? 'true' : 'false',
        embedding_provider: envConfig.EMBEDDING_PROVIDER,
        embedding_model: this.getEmbeddingModel(),
        embedding_dimensions: this.getEmbeddingDimensions()
      }
    }

    // Add provider-specific configuration
    if (config.type === 'sqlite') {
      resolved.config.database_path = config.config.database_path || './data/memories.db'
    }

    return resolved
  }

  /**
   * Get embedding model based on provider
   */
  private getEmbeddingModel(): string {
    const envConfig = this.ensureEnvConfig()
    if (envConfig.EMBEDDING_PROVIDER === 'ollama') {
      // Use granular model control, fallback to legacy
      return envConfig.OLLAMA_EMBEDDING_MODEL || envConfig.OLLAMA_MODEL || ConfigDefaults.OLLAMA_EMBEDDING_MODEL!
    }
    // Use granular model control for OpenAI
    return envConfig.OPENAI_EMBEDDING_MODEL || ConfigDefaults.OPENAI_EMBEDDING_MODEL!
  }

  /**
   * Get embedding dimensions based on model
   */
  private getEmbeddingDimensions(): number {
    const envConfig = this.ensureEnvConfig()
    const model = this.getEmbeddingModel()
    return ConfigDefaults.EMBEDDING_DIMENSIONS_MAP[model as keyof typeof ConfigDefaults.EMBEDDING_DIMENSIONS_MAP] || 
           envConfig.EMBEDDING_DIMENSIONS!
  }

  /**
   * Resolve emotion configuration
   */
  private resolveEmotionConfig(config: any): any {
    return {
      type: config.type,
      config: {
        ...config.config
      }
    }
  }

  /**
   * Resolve cognition configuration
   */
  private resolveCognitionConfig(config: any): any {
    return {
      type: config.type,
      config: {
        ...config.config
      }
    }
  }

  /**
   * Resolve extensions configuration
   */
  private resolveExtensionsConfig(extensions: any[]): any[] {
    return extensions.map(ext => ({
      ...ext,
      config: this.resolveExtensionConfig(ext.name, ext.config)
    }))
  }

  /**
   * Resolve individual extension configuration
   */
  private resolveExtensionConfig(name: string, config: any): any {
    const envConfig = this.ensureEnvConfig()
    switch (name) {
      case 'telegram':
        return {
          ...config,
          bot_token: envConfig.TELEGRAM_BOT_TOKEN
        }
      default:
        return config
    }
  }

  /**
   * Resolve portals configuration with environment variables
   */
  private resolvePortalsConfig(portals: any[]): any[] {
    return portals
      .map(portal => this.resolvePortalConfig(portal))
      .filter(portal => portal.enabled !== false)
  }

  /**
   * Resolve individual portal configuration
   */
  private resolvePortalConfig(portal: any): any {
    const resolved = {
      name: portal.name,
      type: portal.type,
      enabled: this.getPortalEnabled(portal.type, portal.enabled, portal.capabilities),
      primary: portal.primary || false,
      capabilities: portal.capabilities,
      config: this.resolvePortalSpecificConfig(portal.type, portal.config)
    }

    return resolved
  }

  /**
   * Get portal enabled status from environment based on capabilities
   */
  private getPortalEnabled(type: string, defaultEnabled: boolean, capabilities: string[] = []): boolean {
    const envConfig = this.ensureEnvConfig()
    
    // Special handling for OpenAI (backward compatibility)
    if (type === 'openai') {
      if (!envConfig.OPENAI_API_KEY) return false
      
      const hasChatCapability = capabilities.includes('chat_generation') || capabilities.includes('text_generation')
      const hasEmbeddingCapability = capabilities.includes('embedding_generation')
      const hasImageCapability = capabilities.includes('image_generation')
      
      // Enable based on specific capability flags
      if (hasChatCapability && envConfig.OPENAI_CHAT_ENABLED) return true
      if (hasEmbeddingCapability && envConfig.OPENAI_EMBEDDINGS_ENABLED) return true
      if (hasImageCapability && envConfig.OPENAI_IMAGE_ENABLED) return true
      
      // If no specific capabilities defined, use legacy logic
      if (capabilities.length === 0) {
        return envConfig.OPENAI_CHAT_ENABLED! || envConfig.OPENAI_EMBEDDINGS_ENABLED! || envConfig.OPENAI_IMAGE_ENABLED!
      }
      
      return false
    }
    
    // Generic handling for all other portals
    const portalName = type.toUpperCase().replace('.', '').replace('-', '_')
    const mainEnabled = envConfig[`${portalName}_ENABLED` as keyof EnvironmentConfig] as boolean
    const apiKey = envConfig[`${portalName}_API_KEY` as keyof EnvironmentConfig] as string
    
    // Check main toggle and API key (except Ollama which doesn't need API key)
    if (!mainEnabled || (type !== 'ollama' && !apiKey)) {
      return false
    }
    
    // Check capability-specific toggles
    const hasChatCapability = capabilities.includes('chat_generation') || capabilities.includes('text_generation')
    const hasEmbeddingCapability = capabilities.includes('embedding_generation')
    const hasImageCapability = capabilities.includes('image_generation')
    
    if (hasChatCapability) {
      const chatEnabled = envConfig[`${portalName}_CHAT_ENABLED` as keyof EnvironmentConfig] as boolean
      if (chatEnabled === false) return false
    }
    
    if (hasEmbeddingCapability) {
      const embeddingEnabled = envConfig[`${portalName}_EMBEDDING_ENABLED` as keyof EnvironmentConfig] as boolean
      if (embeddingEnabled === false) return false
    }
    
    if (hasImageCapability) {
      const imageEnabled = envConfig[`${portalName}_IMAGE_ENABLED` as keyof EnvironmentConfig] as boolean
      if (imageEnabled === false) return false
    }
    
    return true
  }

  /**
   * Resolve portal-specific configuration
   */
  private resolvePortalSpecificConfig(type: string, config: any): any {
    const envConfig = this.ensureEnvConfig()
    const baseConfig = {
      max_tokens: config.max_tokens || ConfigDefaults.MAX_TOKENS,
      temperature: config.temperature || ConfigDefaults.TEMPERATURE
    }

    // Get the portal name in uppercase for environment variable lookup
    const portalName = type.toUpperCase().replace('.', '').replace('-', '_')
    
    // Build configuration with granular model controls
    const portalConfig: any = {
      ...baseConfig,
      apiKey: envConfig[`${portalName}_API_KEY` as keyof EnvironmentConfig]
    }
    
    // Add granular model configurations
    const chatModel = envConfig[`${portalName}_CHAT_MODEL` as keyof EnvironmentConfig]
    const embeddingModel = envConfig[`${portalName}_EMBEDDING_MODEL` as keyof EnvironmentConfig]
    const imageModel = envConfig[`${portalName}_IMAGE_MODEL` as keyof EnvironmentConfig]
    const toolModel = envConfig[`${portalName}_TOOL_MODEL` as keyof EnvironmentConfig]
    
    // Set models based on what's available
    if (chatModel) {
      portalConfig.chatModel = chatModel
      // Keep legacy 'model' for backward compatibility
      portalConfig.model = chatModel
    }
    
    if (embeddingModel) {
      portalConfig.embeddingModel = embeddingModel
      // Add dimensions if it's a known model
      const dimensions = ConfigDefaults.EMBEDDING_DIMENSIONS_MAP[embeddingModel as keyof typeof ConfigDefaults.EMBEDDING_DIMENSIONS_MAP]
      if (dimensions) {
        portalConfig.embeddingDimensions = dimensions
      }
    }
    
    if (imageModel) {
      portalConfig.imageModel = imageModel
    }
    
    if (toolModel) {
      portalConfig.toolModel = toolModel
    }
    
    // Portal-specific overrides
    switch (type) {
      case 'ollama':
        portalConfig.baseUrl = envConfig.OLLAMA_BASE_URL
        break
        
      case 'openai':
        // Ensure backward compatibility with legacy model names
        if (!portalConfig.chatModel && envConfig.OPENAI_CHAT_MODEL) {
          portalConfig.chatModel = envConfig.OPENAI_CHAT_MODEL
          portalConfig.model = envConfig.OPENAI_CHAT_MODEL
        }
        if (!portalConfig.embeddingModel && envConfig.OPENAI_EMBEDDING_MODEL) {
          portalConfig.embeddingModel = envConfig.OPENAI_EMBEDDING_MODEL
          portalConfig.embeddingDimensions = this.getEmbeddingDimensions()
        }
        break
        
      case 'groq':
        // Fallback to legacy GROQ_MODEL if specific models not set
        if (!portalConfig.chatModel && envConfig.GROQ_MODEL) {
          portalConfig.chatModel = envConfig.GROQ_MODEL
          portalConfig.model = envConfig.GROQ_MODEL
        }
        break
        
      case 'anthropic':
        // Fallback to legacy ANTHROPIC_MODEL if specific models not set
        if (!portalConfig.chatModel && envConfig.ANTHROPIC_MODEL) {
          portalConfig.chatModel = envConfig.ANTHROPIC_MODEL
          portalConfig.model = envConfig.ANTHROPIC_MODEL
        }
        break
    }
    
    return portalConfig
  }

  /**
   * Validate required environment variables
   */
  public validateEnvironment(): { valid: boolean; missing: string[] } {
    // Ensure environment is loaded first
    const envConfig = this.ensureEnvConfig()
    const missing: string[] = []

    // Check for at least one chat provider
    const hasGroq = envConfig.GROQ_ENABLED && envConfig.GROQ_API_KEY
    const hasOpenAIChat = envConfig.OPENAI_CHAT_ENABLED && envConfig.OPENAI_API_KEY
    const hasAnthropic = envConfig.ANTHROPIC_ENABLED && envConfig.ANTHROPIC_API_KEY
    const hasOllama = envConfig.OLLAMA_ENABLED

    if (!hasGroq && !hasOpenAIChat && !hasAnthropic && !hasOllama) {
      missing.push('At least one chat provider (GROQ_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or OLLAMA_ENABLED=true)')
    }

    // Check for embedding provider if embeddings are enabled
    if (envConfig.ENABLE_OPENAI_EMBEDDINGS) {
      if (envConfig.EMBEDDING_PROVIDER === 'openai' && !envConfig.OPENAI_API_KEY) {
        missing.push('OPENAI_API_KEY (required for OpenAI embeddings)')
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }
}

/**
 * Singleton instance for global access
 */
export const configResolver = new ConfigResolver()