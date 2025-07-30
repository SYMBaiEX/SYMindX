/**
 * Shared Model Resolution Utilities
 *
 * Provides standardized model selection and validation logic for all portals
 */

import { PortalCapability } from '../../types/portal';

export interface ModelConfig {
  /**
   * Default models for different operation types
   */
  defaults: {
    chat?: string;
    tool?: string;
    embedding?: string;
    image?: string;
    reasoning?: string;
    vision?: string;
  };

  /**
   * Available models for different capabilities
   */
  supported: {
    [key in PortalCapability]?: string[];
  };

  /**
   * Optimal models for different capabilities (best performance/cost ratio)
   */
  optimal: {
    [key in PortalCapability]?: string;
  };

  /**
   * Model aliases for backwards compatibility
   */
  aliases?: Record<string, string>;
}

/**
 * Resolve model configuration with hierarchy: explicit → environment → config → defaults
 */
export function resolveModel(
  type:
    | 'chat'
    | 'tool'
    | 'embedding'
    | 'image'
    | 'reasoning'
    | 'vision' = 'chat',
  options: {
    explicit?: string;
    config?: any;
    provider: string;
    envPrefix?: string;
  }
): string {
  const { explicit, config = {}, provider, envPrefix } = options;
  const prefix = envPrefix || provider.toUpperCase();

  // 1. Explicit model (highest priority)
  if (explicit) {
    return resolveModelAlias(explicit, provider);
  }

  // 2. Environment variable
  const envModel = getEnvironmentModel(type, prefix);
  if (envModel) {
    return resolveModelAlias(envModel, provider);
  }

  // 3. Config-specific model
  const configModel = getConfigModel(type, config);
  if (configModel) {
    return resolveModelAlias(configModel, provider);
  }

  // 4. Provider default
  const defaultModel = getProviderDefault(type, provider);
  return resolveModelAlias(defaultModel, provider);
}

/**
 * Get model from environment variables
 */
function getEnvironmentModel(type: string, prefix: string): string | undefined {
  switch (type) {
    case 'chat':
      return (
        process.env[`${prefix}_CHAT_MODEL`] || process.env[`${prefix}_MODEL`]
      );
    case 'tool':
      return (
        process.env[`${prefix}_TOOL_MODEL`] || process.env[`${prefix}_MODEL`]
      );
    case 'embedding':
      return process.env[`${prefix}_EMBEDDING_MODEL`];
    case 'image':
      return process.env[`${prefix}_IMAGE_MODEL`];
    case 'reasoning':
      return (
        process.env[`${prefix}_REASONING_MODEL`] ||
        process.env[`${prefix}_MODEL`]
      );
    case 'vision':
      return (
        process.env[`${prefix}_VISION_MODEL`] || process.env[`${prefix}_MODEL`]
      );
    default:
      return process.env[`${prefix}_MODEL`];
  }
}

/**
 * Get model from config object
 */
function getConfigModel(type: string, config: any): string | undefined {
  switch (type) {
    case 'chat':
      return config.chatModel || config.model;
    case 'tool':
      return config.toolModel || config.model;
    case 'embedding':
      return config.embeddingModel;
    case 'image':
      return config.imageModel;
    case 'reasoning':
      return config.reasoningModel || config.model;
    case 'vision':
      return config.visionModel || config.model;
    default:
      return config.model;
  }
}

/**
 * Get provider-specific default models
 */
function getProviderDefault(type: string, provider: string): string {
  const configs = getProviderModelConfigs();
  const config = configs[provider.toLowerCase()];

  if (!config) {
    return getGenericDefault(type);
  }

  switch (type) {
    case 'chat':
      return (
        config.defaults.chat || config.defaults.chat || getGenericDefault(type)
      );
    case 'tool':
      return (
        config.defaults.tool || config.defaults.chat || getGenericDefault(type)
      );
    case 'embedding':
      return config.defaults.embedding || getGenericDefault(type);
    case 'image':
      return config.defaults.image || getGenericDefault(type);
    case 'reasoning':
      return (
        config.defaults.reasoning ||
        config.defaults.chat ||
        getGenericDefault(type)
      );
    case 'vision':
      return (
        config.defaults.vision ||
        config.defaults.chat ||
        getGenericDefault(type)
      );
    default:
      return config.defaults.chat || getGenericDefault(type);
  }
}

/**
 * Generic fallback defaults
 */
function getGenericDefault(type: string): string {
  switch (type) {
    case 'chat':
    case 'tool':
    case 'reasoning':
    case 'vision':
      return 'gpt-4o-mini';
    case 'embedding':
      return 'text-embedding-3-small';
    case 'image':
      return 'dall-e-3';
    default:
      return 'gpt-4o-mini';
  }
}

/**
 * Resolve model aliases to actual model names
 */
function resolveModelAlias(model: string, provider: string): string {
  const configs = getProviderModelConfigs();
  const config = configs[provider.toLowerCase()];

  if (config?.aliases && config.aliases[model]) {
    return config.aliases[model];
  }

  return model;
}

/**
 * Get supported models for a capability
 */
export function getSupportedModels(
  capability: PortalCapability,
  provider: string
): string[] {
  const configs = getProviderModelConfigs();
  const config = configs[provider.toLowerCase()];

  return config?.supported[capability] || [];
}

/**
 * Get optimal model for a capability
 */
export function getOptimalModel(
  capability: PortalCapability,
  provider: string
): string | null {
  const configs = getProviderModelConfigs();
  const config = configs[provider.toLowerCase()];

  return config?.optimal[capability] || null;
}

/**
 * Validate if a model supports a capability
 */
export function validateModelCapability(
  model: string,
  capability: PortalCapability,
  provider: string
): boolean {
  const supportedModels = getSupportedModels(capability, provider);
  return supportedModels.includes(model);
}

/**
 * Create model resolver configured for specific provider
 */
export function createModelResolver(provider: string, config?: any) {
  return {
    resolve: (
      type:
        | 'chat'
        | 'tool'
        | 'embedding'
        | 'image'
        | 'reasoning'
        | 'vision' = 'chat',
      explicit?: string
    ) => resolveModel(type, { explicit, config, provider }),

    getSupportedModels: (capability: PortalCapability) =>
      getSupportedModels(capability, provider),

    getOptimalModel: (capability: PortalCapability) =>
      getOptimalModel(capability, provider),

    validateCapability: (model: string, capability: PortalCapability) =>
      validateModelCapability(model, capability, provider),
  };
}

/**
 * Provider-specific model configurations
 */
function getProviderModelConfigs(): Record<string, ModelConfig> {
  return {
    openai: {
      defaults: {
        chat: 'gpt-4o-mini',
        tool: 'gpt-4o-mini',
        embedding: 'text-embedding-3-large',
        image: 'dall-e-3',
        reasoning: 'o1-mini',
        vision: 'gpt-4o',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ],
        [PortalCapability.EMBEDDING_GENERATION]: [
          'text-embedding-3-large',
          'text-embedding-3-small',
          'text-embedding-ada-002',
        ],
        [PortalCapability.IMAGE_GENERATION]: ['dall-e-3', 'dall-e-2'],
        [PortalCapability.VISION]: ['gpt-4o', 'gpt-4-turbo'],
        [PortalCapability.FUNCTION_CALLING]: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ],
        [PortalCapability.TOOL_USAGE]: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-3.5-turbo',
        ],
        [PortalCapability.REASONING]: ['o1', 'o1-mini', 'o1-preview'],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'gpt-4o-mini',
        [PortalCapability.CHAT_GENERATION]: 'gpt-4o-mini',
        [PortalCapability.EMBEDDING_GENERATION]: 'text-embedding-3-small',
        [PortalCapability.IMAGE_GENERATION]: 'dall-e-3',
        [PortalCapability.VISION]: 'gpt-4o',
        [PortalCapability.FUNCTION_CALLING]: 'gpt-4o-mini',
        [PortalCapability.TOOL_USAGE]: 'gpt-4o-mini',
        [PortalCapability.REASONING]: 'o1-mini',
      },
    },

    anthropic: {
      defaults: {
        chat: 'claude-3-5-sonnet-20241022',
        tool: 'claude-3-5-sonnet-20241022',
        vision: 'claude-3-5-sonnet-20241022',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ],
        [PortalCapability.VISION]: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ],
        [PortalCapability.FUNCTION_CALLING]: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
        ],
        [PortalCapability.TOOL_USAGE]: [
          'claude-3-7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
        ],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'claude-3-5-sonnet-20241022',
        [PortalCapability.CHAT_GENERATION]: 'claude-3-5-sonnet-20241022',
        [PortalCapability.VISION]: 'claude-3-5-sonnet-20241022',
        [PortalCapability.FUNCTION_CALLING]: 'claude-3-5-sonnet-20241022',
        [PortalCapability.TOOL_USAGE]: 'claude-3-5-sonnet-20241022',
      },
    },

    groq: {
      defaults: {
        chat: 'llama-3-groq-70b-8192-tool-use-preview',
        tool: 'llama-3-groq-8b-8192-tool-use-preview',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'llama-3-groq-70b-8192-tool-use-preview',
          'llama-3-groq-8b-8192-tool-use-preview',
          'llama3-70b-8192',
          'llama3-8b-8192',
          'mixtral-8x7b-32768',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'llama-3-groq-70b-8192-tool-use-preview',
          'llama-3-groq-8b-8192-tool-use-preview',
          'llama3-70b-8192',
          'llama3-8b-8192',
          'mixtral-8x7b-32768',
        ],
        [PortalCapability.FUNCTION_CALLING]: [
          'llama-3-groq-70b-8192-tool-use-preview',
          'llama-3-groq-8b-8192-tool-use-preview',
        ],
        [PortalCapability.TOOL_USAGE]: [
          'llama-3-groq-70b-8192-tool-use-preview',
          'llama-3-groq-8b-8192-tool-use-preview',
        ],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]:
          'llama-3-groq-8b-8192-tool-use-preview',
        [PortalCapability.CHAT_GENERATION]:
          'llama-3-groq-70b-8192-tool-use-preview',
        [PortalCapability.FUNCTION_CALLING]:
          'llama-3-groq-8b-8192-tool-use-preview',
        [PortalCapability.TOOL_USAGE]: 'llama-3-groq-8b-8192-tool-use-preview',
      },
    },

    xai: {
      defaults: {
        chat: 'grok-2',
        tool: 'grok-2',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: ['grok-2', 'grok-1'],
        [PortalCapability.CHAT_GENERATION]: ['grok-2', 'grok-1'],
        [PortalCapability.FUNCTION_CALLING]: ['grok-2'],
        [PortalCapability.TOOL_USAGE]: ['grok-2'],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'grok-2',
        [PortalCapability.CHAT_GENERATION]: 'grok-2',
        [PortalCapability.FUNCTION_CALLING]: 'grok-2',
        [PortalCapability.TOOL_USAGE]: 'grok-2',
      },
    },

    google: {
      defaults: {
        chat: 'gemini-1.5-pro',
        tool: 'gemini-1.5-pro',
        vision: 'gemini-1.5-pro',
        embedding: 'text-embedding-004',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.0-pro',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-1.0-pro',
        ],
        [PortalCapability.VISION]: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        [PortalCapability.FUNCTION_CALLING]: [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
        ],
        [PortalCapability.TOOL_USAGE]: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        [PortalCapability.EMBEDDING_GENERATION]: [
          'text-embedding-004',
          'text-embedding-gecko',
        ],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'gemini-1.5-flash',
        [PortalCapability.CHAT_GENERATION]: 'gemini-1.5-pro',
        [PortalCapability.VISION]: 'gemini-1.5-pro',
        [PortalCapability.FUNCTION_CALLING]: 'gemini-1.5-pro',
        [PortalCapability.TOOL_USAGE]: 'gemini-1.5-pro',
        [PortalCapability.EMBEDDING_GENERATION]: 'text-embedding-004',
      },
    },

    mistral: {
      defaults: {
        chat: 'mistral-large-latest',
        tool: 'mistral-large-latest',
        embedding: 'mistral-embed',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'mistral-large-latest',
          'mistral-medium-latest',
          'mistral-tiny',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'mistral-large-latest',
          'mistral-medium-latest',
          'mistral-tiny',
        ],
        [PortalCapability.FUNCTION_CALLING]: [
          'mistral-large-latest',
          'mistral-medium-latest',
        ],
        [PortalCapability.TOOL_USAGE]: [
          'mistral-large-latest',
          'mistral-medium-latest',
        ],
        [PortalCapability.EMBEDDING_GENERATION]: ['mistral-embed'],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'mistral-large-latest',
        [PortalCapability.CHAT_GENERATION]: 'mistral-large-latest',
        [PortalCapability.FUNCTION_CALLING]: 'mistral-large-latest',
        [PortalCapability.TOOL_USAGE]: 'mistral-large-latest',
        [PortalCapability.EMBEDDING_GENERATION]: 'mistral-embed',
      },
    },

    cohere: {
      defaults: {
        chat: 'command-r-plus',
        tool: 'command-r-plus',
        embedding: 'embed-english-v3.0',
      },
      supported: {
        [PortalCapability.TEXT_GENERATION]: [
          'command-r-plus',
          'command-r',
          'command',
        ],
        [PortalCapability.CHAT_GENERATION]: [
          'command-r-plus',
          'command-r',
          'command',
        ],
        [PortalCapability.FUNCTION_CALLING]: ['command-r-plus', 'command-r'],
        [PortalCapability.TOOL_USAGE]: ['command-r-plus', 'command-r'],
        [PortalCapability.EMBEDDING_GENERATION]: [
          'embed-english-v3.0',
          'embed-multilingual-v3.0',
        ],
      },
      optimal: {
        [PortalCapability.TEXT_GENERATION]: 'command-r-plus',
        [PortalCapability.CHAT_GENERATION]: 'command-r-plus',
        [PortalCapability.FUNCTION_CALLING]: 'command-r-plus',
        [PortalCapability.TOOL_USAGE]: 'command-r-plus',
        [PortalCapability.EMBEDDING_GENERATION]: 'embed-english-v3.0',
      },
    },
  };
}
