/**
 * AI SDK v5 Utility Functions
 * 
 * Shared utilities for building AI SDK parameters with strict type safety
 * and exactOptionalPropertyTypes compliance
 */

import { 
  TextGenerationOptions, 
  ChatGenerationOptions, 
  ImageGenerationOptions,
  EmbeddingOptions 
} from '../types/portal';

/**
 * Enhanced parameter builder for AI SDK v5 with exactOptionalPropertyTypes support
 */
export class AISDKParameterBuilder {
  /**
   * Build AI SDK parameters with strict type safety for text generation
   */
  static buildTextGenerationParams<T extends Record<string, any>>(
    baseParams: T,
    options?: TextGenerationOptions,
    defaults?: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): T & Record<string, any> {
    const params = { ...baseParams };
    
    // Apply defaults if not provided in options
    const maxTokens = options?.maxOutputTokens ?? options?.maxTokens ?? defaults?.maxOutputTokens;
    if (maxTokens !== undefined && maxTokens > 0) {
      (params as any).maxOutputTokens = maxTokens;
    }
    
    const temperature = options?.temperature ?? defaults?.temperature;
    if (temperature !== undefined && temperature >= 0) {
      (params as any).temperature = Math.min(Math.max(temperature, 0), 2);
    }
    
    const topP = options?.topP ?? defaults?.topP;
    if (topP !== undefined && topP > 0) {
      (params as any).topP = Math.min(Math.max(topP, 0), 1);
    }
    
    const frequencyPenalty = options?.frequencyPenalty ?? defaults?.frequencyPenalty;
    if (frequencyPenalty !== undefined) {
      (params as any).frequencyPenalty = Math.min(Math.max(frequencyPenalty, -2), 2);
    }
    
    const presencePenalty = options?.presencePenalty ?? defaults?.presencePenalty;
    if (presencePenalty !== undefined) {
      (params as any).presencePenalty = Math.min(Math.max(presencePenalty, -2), 2);
    }
    
    // Handle stop sequences
    if (options?.stop !== undefined && options.stop.length > 0) {
      (params as any).stopSequences = options.stop;
    }
    
    return params;
  }
  
  /**
   * Build AI SDK parameters with strict type safety for chat generation
   */
  static buildChatGenerationParams<T extends Record<string, any>>(
    baseParams: T,
    options?: ChatGenerationOptions,
    defaults?: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }
  ): T & Record<string, any> {
    const params = { ...baseParams };
    
    // Apply defaults if not provided in options
    const maxTokens = options?.maxOutputTokens ?? options?.maxTokens ?? defaults?.maxOutputTokens;
    if (maxTokens !== undefined && maxTokens > 0) {
      (params as any).maxOutputTokens = maxTokens;
    }
    
    const temperature = options?.temperature ?? defaults?.temperature;
    if (temperature !== undefined && temperature >= 0) {
      (params as any).temperature = Math.min(Math.max(temperature, 0), 2);
    }
    
    const topP = options?.topP ?? defaults?.topP;
    if (topP !== undefined && topP > 0) {
      (params as any).topP = Math.min(Math.max(topP, 0), 1);
    }
    
    const frequencyPenalty = options?.frequencyPenalty ?? defaults?.frequencyPenalty;
    if (frequencyPenalty !== undefined) {
      (params as any).frequencyPenalty = Math.min(Math.max(frequencyPenalty, -2), 2);
    }
    
    const presencePenalty = options?.presencePenalty ?? defaults?.presencePenalty;
    if (presencePenalty !== undefined) {
      (params as any).presencePenalty = Math.min(Math.max(presencePenalty, -2), 2);
    }
    
    // Handle stop sequences
    if (options?.stop !== undefined && options.stop.length > 0) {
      (params as any).stopSequences = options.stop;
    }
    
    // Add tools support for AI SDK v5
    if (options?.tools !== undefined && options.tools.length > 0) {
      (params as any).tools = options.tools;
      (params as any).maxSteps = 5; // Enable multi-step tool execution
    }
    
    return params;
  }
  
  /**
   * Build AI SDK parameters with strict type safety for image generation
   */
  static buildImageGenerationParams<T extends Record<string, any>>(
    baseParams: T,
    options?: ImageGenerationOptions
  ): T & Record<string, any> {
    const params = { ...baseParams };
    
    if (options?.size !== undefined) {
      params.size = options.size;
    }
    
    if (options?.n !== undefined && options.n > 0) {
      params.n = options.n;
    }
    
    if (options?.quality !== undefined) {
      params.quality = options.quality;
    }
    
    if (options?.style !== undefined) {
      params.style = options.style;
    }
    
    return params;
  }
  
  /**
   * Build provider-specific configuration with strict type safety
   */
  static buildProviderConfig<T extends Record<string, any>>(
    baseConfig: T,
    options?: {
      apiKey?: string;
      baseURL?: string;
      organization?: string;
      headers?: Record<string, string>;
    }
  ): T & Record<string, any> {
    const config = { ...baseConfig };
    
    if (options?.apiKey !== undefined) {
      config.apiKey = options.apiKey;
    }
    
    if (options?.baseURL !== undefined) {
      config.baseURL = options.baseURL;
    }
    
    if (options?.organization !== undefined) {
      config.organization = options.organization;
    }
    
    if (options?.headers !== undefined) {
      config.headers = options.headers;
    }
    
    return config;
  }
  
  /**
   * Safely build object with only defined properties
   */
  static buildSafeObject<T extends Record<string, any>>(
    source: T
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Provider-specific parameter validation and defaults
   */
  static getProviderDefaults(provider: string): {
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
      case 'mistral':
        return {
          maxOutputTokens: 8192,
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
}

/**
 * Utility function to handle AI SDK errors with proper typing
 */
export function handleAISDKError(error: any, provider: string): Error {
  if (error.name === 'AI_APICallError') {
    return new Error(`${provider} API Error: ${error.message}`);
  }
  
  if (error.name === 'AI_InvalidArgumentError') {
    return new Error(`Invalid ${provider} parameters: ${error.message}`);
  }
  
  if (error.name === 'AI_RateLimitError') {
    return new Error(`${provider} rate limit exceeded: ${error.message}`);
  }
  
  if (error.name === 'AI_AuthenticationError') {
    return new Error(`${provider} authentication failed: ${error.message}`);
  }
  
  return new Error(`${provider} Error: ${error.message || 'Unknown error'}`);
}

/**
 * Utility function to validate generation options
 */
export function validateGenerationOptions(
  options: TextGenerationOptions | ChatGenerationOptions,
  provider: string
): void {
  if (options.maxOutputTokens !== undefined && options.maxOutputTokens <= 0) {
    throw new Error(`Invalid maxOutputTokens for ${provider}: must be positive`);
  }
  
  if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
    throw new Error(`Invalid temperature for ${provider}: must be between 0 and 2`);
  }
  
  if (options.topP !== undefined && (options.topP <= 0 || options.topP > 1)) {
    throw new Error(`Invalid topP for ${provider}: must be between 0 and 1`);
  }
  
  if (options.frequencyPenalty !== undefined && (options.frequencyPenalty < -2 || options.frequencyPenalty > 2)) {
    throw new Error(`Invalid frequencyPenalty for ${provider}: must be between -2 and 2`);
  }
  
  if (options.presencePenalty !== undefined && (options.presencePenalty < -2 || options.presencePenalty > 2)) {
    throw new Error(`Invalid presencePenalty for ${provider}: must be between -2 and 2`);
  }
}