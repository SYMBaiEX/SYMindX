/**
 * Shared Parameter Builder Utilities
 * 
 * Provides standardized parameter building logic for AI SDK operations
 */

import { 
  TextGenerationOptions, 
  ChatGenerationOptions, 
  ImageGenerationOptions,
  EmbeddingOptions
} from '../../types/portal';

export interface ParameterBuilderOptions {
  /**
   * Default values to use when options are not provided
   */
  defaults?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  
  /**
   * Provider-specific parameter mappings and validations
   */
  provider?: string;
  
  /**
   * Whether to include provider-specific optimizations
   */
  useProviderOptimizations?: boolean;
}

/**
 * Build parameters for text generation with validation and defaults
 */
export function buildTextGenerationParams<T extends Record<string, any>>(
  baseParams: T,
  options?: TextGenerationOptions,
  config?: ParameterBuilderOptions
): T & Record<string, any> {
  const { defaults, provider = 'openai' } = config || {};
  const params = { ...baseParams };

  // Get provider-specific defaults
  const providerDefaults = getProviderDefaults(provider);
  const finalDefaults = { ...providerDefaults, ...defaults };

  // Handle maxOutputTokens (AI SDK v5 standard)
  const maxTokens = 
    options?.maxOutputTokens ?? 
    options?.maxTokens ?? 
    finalDefaults.maxOutputTokens;
  
  if (maxTokens !== undefined && maxTokens > 0) {
    (params as any).maxOutputTokens = maxTokens;
  }

  // Handle temperature with validation
  const temperature = options?.temperature ?? finalDefaults.temperature;
  if (temperature !== undefined) {
    (params as any).temperature = Math.min(Math.max(temperature, 0), 2);
  }

  // Handle topP with validation
  const topP = options?.topP ?? finalDefaults.topP;
  if (topP !== undefined) {
    (params as any).topP = Math.min(Math.max(topP, 0), 1);
  }

  // Handle frequency penalty (OpenAI-style providers)
  if (supportsParameter(provider, 'frequencyPenalty')) {
    const frequencyPenalty = options?.frequencyPenalty ?? finalDefaults.frequencyPenalty;
    if (frequencyPenalty !== undefined) {
      (params as any).frequencyPenalty = Math.min(Math.max(frequencyPenalty, -2), 2);
    }
  }

  // Handle presence penalty (OpenAI-style providers)
  if (supportsParameter(provider, 'presencePenalty')) {
    const presencePenalty = options?.presencePenalty ?? finalDefaults.presencePenalty;
    if (presencePenalty !== undefined) {
      (params as any).presencePenalty = Math.min(Math.max(presencePenalty, -2), 2);
    }
  }

  // Handle stop sequences
  if (options?.stop && options.stop.length > 0) {
    (params as any).stopSequences = options.stop;
  }

  return params;
}

/**
 * Build parameters for chat generation with tool support
 */
export function buildChatGenerationParams<T extends Record<string, any>>(
  baseParams: T,
  options?: ChatGenerationOptions,
  config?: ParameterBuilderOptions
): T & Record<string, any> {
  // Start with text generation parameters
  const params = buildTextGenerationParams(baseParams, options, config);

  // Add tool support if provided
  if (options?.tools && Object.keys(options.tools).length > 0) {
    (params as any).tools = options.tools;
    (params as any).maxSteps = options.maxSteps || 5;
    
    // Add tool streaming support for compatible providers
    if (supportsParameter(config?.provider || 'openai', 'toolCallStreaming')) {
      (params as any).toolCallStreaming = true;
    }

    // Add step callbacks
    if (options.onStepFinish) {
      (params as any).onStepFinish = options.onStepFinish;
    }
  }

  // Add function support (legacy compatibility)
  if (options?.functions && options.functions.length > 0) {
    // Convert functions to tools if needed
    const convertedTools = convertFunctionsToTools(options.functions);
    (params as any).tools = convertedTools;
    (params as any).maxSteps = options.maxSteps || 5;
  }

  return params;
}

/**
 * Build parameters for image generation
 */
export function buildImageGenerationParams<T extends Record<string, any>>(
  baseParams: T,
  options?: ImageGenerationOptions,
  config?: ParameterBuilderOptions
): T & Record<string, any> {
  const params = { ...baseParams };
  const provider = config?.provider || 'openai';

  if (options?.size) {
    (params as any).size = options.size;
  }

  if (options?.n && options.n > 0) {
    (params as any).n = options.n;
  }

  if (options?.quality && supportsParameter(provider, 'quality')) {
    (params as any).quality = options.quality;
  }

  if (options?.style && supportsParameter(provider, 'style')) {
    (params as any).style = options.style;
  }

  // Provider-specific options
  if (provider === 'openai' && options) {
    const providerOptions: any = {};
    
    if (options.quality) providerOptions.quality = options.quality;
    if (options.style) providerOptions.style = options.style;
    if (options.responseFormat) providerOptions.response_format = options.responseFormat;
    
    if (Object.keys(providerOptions).length > 0) {
      (params as any).providerOptions = {
        openai: providerOptions
      };
    }
  }

  return params;
}

/**
 * Build parameters for embedding generation
 */
export function buildEmbeddingParams<T extends Record<string, any>>(
  baseParams: T,
  options?: EmbeddingOptions,
  config?: ParameterBuilderOptions
): T & Record<string, any> {
  const params = { ...baseParams };

  // Embedding parameters are typically simpler
  if (options?.dimensions) {
    (params as any).dimensions = options.dimensions;
  }

  return params;
}

/**
 * Get provider-specific default parameters
 */
function getProviderDefaults(provider: string): {
  maxOutputTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
} {
  switch (provider.toLowerCase()) {
    case 'openai':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

    case 'anthropic':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
      };

    case 'groq':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

    case 'xai':
    case 'grok':
      return {
        maxOutputTokens: 2000,
        temperature: 0.8,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

    case 'mistral':
      return {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

    case 'cohere':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

    case 'google':
    case 'gemini':
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
      };

    default:
      return {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 1.0,
      };
  }
}

/**
 * Check if a provider supports a specific parameter
 */
function supportsParameter(provider: string, parameter: string): boolean {
  const supportMatrix: Record<string, string[]> = {
    openai: ['frequencyPenalty', 'presencePenalty', 'toolCallStreaming', 'quality', 'style'],
    anthropic: ['toolCallStreaming'],
    groq: ['frequencyPenalty', 'presencePenalty', 'toolCallStreaming'],
    xai: ['frequencyPenalty', 'presencePenalty'],
    mistral: ['frequencyPenalty', 'presencePenalty', 'toolCallStreaming'],
    cohere: ['frequencyPenalty', 'presencePenalty'],
    google: ['toolCallStreaming'],
  };

  const supportedParams = supportMatrix[provider.toLowerCase()] || [];
  return supportedParams.includes(parameter);
}

/**
 * Convert legacy function definitions to AI SDK v5 tool format
 */
function convertFunctionsToTools(functions: any[]): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const func of functions) {
    if (func.name && func.description && func.parameters) {
      tools[func.name] = {
        description: func.description,
        parameters: func.parameters,
        execute: async (params: any) => {
          // This would need to be implemented by the specific portal
          return params;
        }
      };
    }
  }

  return tools;
}

/**
 * Create parameter builder configured for specific provider
 */
export function createParameterBuilder(provider: string, defaults?: any) {
  const config: ParameterBuilderOptions = {
    provider,
    defaults,
    useProviderOptimizations: true
  };

  return {
    buildTextParams: <T extends Record<string, any>>(
      baseParams: T, 
      options?: TextGenerationOptions
    ) => buildTextGenerationParams(baseParams, options, config),
    
    buildChatParams: <T extends Record<string, any>>(
      baseParams: T, 
      options?: ChatGenerationOptions
    ) => buildChatGenerationParams(baseParams, options, config),
    
    buildImageParams: <T extends Record<string, any>>(
      baseParams: T, 
      options?: ImageGenerationOptions
    ) => buildImageGenerationParams(baseParams, options, config),
    
    buildEmbeddingParams: <T extends Record<string, any>>(
      baseParams: T, 
      options?: EmbeddingOptions
    ) => buildEmbeddingParams(baseParams, options, config),
  };
}