/**
 * Shared Provider Factory Utilities
 * 
 * Provides standardized provider creation and configuration logic
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGroq } from '@ai-sdk/groq';
import { xai } from '@ai-sdk/xai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';

import { validateApiKey } from './error-handler';

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  timeout?: number;
  headers?: Record<string, string>;
  
  // Provider-specific configurations
  [key: string]: any;
}

export interface ProviderFactoryOptions {
  /**
   * Environment variable prefix for API key lookup
   */
  envPrefix?: string;
  
  /**
   * Whether to validate API key format
   */
  validateApiKey?: boolean;
  
  /**
   * Default configuration values
   */
  defaults?: Partial<ProviderConfig>;
}

/**
 * Create AI SDK provider instance with standardized configuration
 */
export function createProvider(
  provider: string,
  config: ProviderConfig,
  options: ProviderFactoryOptions = {}
): any {
  const { envPrefix, validateApiKey: shouldValidate = true, defaults = {} } = options;
  
  // Merge with defaults
  const finalConfig = { ...defaults, ...config };
  
  // Resolve API key
  const apiKey = resolveApiKey(provider, finalConfig.apiKey, envPrefix);
  
  // Validate API key if requested
  if (shouldValidate) {
    validateApiKey(apiKey, provider);
  }
  
  // Create provider instance
  switch (provider.toLowerCase()) {
    case 'openai':
      return createOpenAIProvider(apiKey, finalConfig);
      
    case 'anthropic':
      return createAnthropicProvider(apiKey, finalConfig);
      
    case 'groq':
      return createGroqProvider(apiKey, finalConfig);
      
    case 'xai':
    case 'grok':
      return createXAIProvider(apiKey, finalConfig);
      
    case 'google':
    case 'gemini':
      return createGoogleProvider(apiKey, finalConfig);
      
    case 'mistral':
      return createMistralProvider(apiKey, finalConfig);
      
    case 'cohere':
      return createCohereProvider(apiKey, finalConfig);
      
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Resolve API key from config or environment
 */
function resolveApiKey(
  provider: string,
  configApiKey?: string,
  envPrefix?: string
): string {
  if (configApiKey) {
    return configApiKey;
  }
  
  // Try custom prefix first
  if (envPrefix) {
    const customKey = process.env[`${envPrefix}_API_KEY`];
    if (customKey) return customKey;
  }
  
  // Try provider-specific environment variables
  const providerEnvKeys = getProviderEnvKeys(provider);
  for (const key of providerEnvKeys) {
    const value = process.env[key];
    if (value) return value;
  }
  
  throw new Error(`API key not found for ${provider}. Please set ${providerEnvKeys[0]} environment variable or provide it in config.`);
}

/**
 * Get environment variable names for a provider
 */
function getProviderEnvKeys(provider: string): string[] {
  switch (provider.toLowerCase()) {
    case 'openai':
      return ['OPENAI_API_KEY'];
      
    case 'anthropic':
      return ['ANTHROPIC_API_KEY'];
      
    case 'groq':
      return ['GROQ_API_KEY'];
      
    case 'xai':
    case 'grok':
      return ['XAI_API_KEY', 'GROK_API_KEY'];
      
    case 'google':
    case 'gemini':
      return ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'];
      
    case 'mistral':
      return ['MISTRAL_API_KEY'];
      
    case 'cohere':
      return ['COHERE_API_KEY'];
      
    default:
      return [`${provider.toUpperCase()}_API_KEY`];
  }
}

/**
 * Create OpenAI provider with configuration
 */
function createOpenAIProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.organization) {
    providerConfig.organization = config.organization;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createOpenAI(providerConfig);
}

/**
 * Create Anthropic provider with configuration
 */
function createAnthropicProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createAnthropic(providerConfig);
}

/**
 * Create Groq provider with configuration
 */
function createGroqProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createGroq(providerConfig);
}

/**
 * Create XAI provider with configuration
 */
function createXAIProvider(apiKey: string, config: ProviderConfig) {
  // XAI uses the singleton pattern, configure globally if needed
  return xai;
}

/**
 * Create Google provider with configuration
 */
function createGoogleProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createGoogleGenerativeAI(providerConfig);
}

/**
 * Create Mistral provider with configuration
 */
function createMistralProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createMistral(providerConfig);
}

/**
 * Create Cohere provider with configuration
 */
function createCohereProvider(apiKey: string, config: ProviderConfig) {
  const providerConfig: any = { apiKey };
  
  if (config.baseURL) {
    providerConfig.baseURL = config.baseURL;
  }
  
  if (config.headers) {
    providerConfig.headers = config.headers;
  }
  
  return createCohere(providerConfig);
}

/**
 * Get language model instance from provider
 */
export function getLanguageModel(provider: any, modelId: string): any {
  if (typeof provider === 'function') {
    return provider(modelId);
  }
  
  // Handle providers that might have different interfaces
  if (provider.languageModel) {
    return provider.languageModel(modelId);
  }
  
  if (provider.model) {
    return provider.model(modelId);
  }
  
  // Fallback: assume provider is callable
  return provider(modelId);
}

/**
 * Get text embedding model instance from provider
 */
export function getTextEmbeddingModel(provider: any, modelId: string): any {
  if (provider.textEmbeddingModel) {
    return provider.textEmbeddingModel(modelId);
  }
  
  if (provider.embedding) {
    return provider.embedding(modelId);
  }
  
  // Fallback for providers that use the same interface
  return provider(modelId);
}

/**
 * Get image model instance from provider
 */
export function getImageModel(provider: any, modelId: string): any {
  if (provider.image) {
    return provider.image(modelId);
  }
  
  if (provider.imageModel) {
    return provider.imageModel(modelId);
  }
  
  // Fallback
  return provider(modelId);
}

/**
 * Create provider factory configured for specific provider type
 */
export function createProviderFactory(providerType: string) {
  return {
    create: (config: ProviderConfig, options?: ProviderFactoryOptions) =>
      createProvider(providerType, config, options),
      
    getLanguageModel: (provider: any, modelId: string) =>
      getLanguageModel(provider, modelId),
      
    getTextEmbeddingModel: (provider: any, modelId: string) =>
      getTextEmbeddingModel(provider, modelId),
      
    getImageModel: (provider: any, modelId: string) =>
      getImageModel(provider, modelId),
  };
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(
  provider: string,
  config: ProviderConfig
): void {
  // Basic validation
  if (!config.apiKey && !process.env[getProviderEnvKeys(provider)[0]]) {
    throw new Error(`API key is required for ${provider}`);
  }
  
  // Provider-specific validation
  switch (provider.toLowerCase()) {
    case 'openai':
      validateOpenAIConfig(config);
      break;
      
    case 'anthropic':
      validateAnthropicConfig(config);
      break;
      
    case 'groq':
      validateGroqConfig(config);
      break;
      
    // Add other provider-specific validations as needed
  }
}

/**
 * Provider-specific validation functions
 */
function validateOpenAIConfig(config: ProviderConfig): void {
  if (config.baseURL && !isValidURL(config.baseURL)) {
    throw new Error('Invalid baseURL for OpenAI');
  }
}

function validateAnthropicConfig(config: ProviderConfig): void {
  if (config.baseURL && !isValidURL(config.baseURL)) {
    throw new Error('Invalid baseURL for Anthropic');
  }
}

function validateGroqConfig(config: ProviderConfig): void {
  if (config.baseURL && !isValidURL(config.baseURL)) {
    throw new Error('Invalid baseURL for Groq');
  }
}

/**
 * Utility function to validate URLs
 */
function isValidURL(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}