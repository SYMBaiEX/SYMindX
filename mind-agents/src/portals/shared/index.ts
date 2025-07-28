/**
 * Shared Portal Utilities
 * 
 * Centralized exports for all shared portal utilities to reduce code duplication
 * and improve maintainability across portal implementations.
 */

// Message conversion utilities
export {
  convertToAIMessages,
  createMessageConverter,
  type MessageConversionOptions,
} from './message-converter';

// Parameter building utilities
export {
  buildTextGenerationParams,
  buildChatGenerationParams,
  buildImageGenerationParams,
  buildEmbeddingParams,
  createParameterBuilder,
  type ParameterBuilderOptions,
} from './parameter-builder';

// Model resolution utilities
export {
  resolveModel,
  getSupportedModels,
  getOptimalModel,
  validateModelCapability,
  createModelResolver,
  type ModelConfig,
} from './model-resolver';

// Error handling utilities
export {
  handleAISDKError,
  withRetry,
  createErrorHandler,
  validateApiKey,
  withTimeout,
  type ErrorHandlerOptions,
  type RetryOptions,
} from './error-handler';

// Stream handling utilities
export {
  createTextStream,
  createChatStream,
  createFullAccessStream,
  createEnhancedStream,
  executeMultiStep,
  createStreamHandler,
  streamToArray,
  streamToString,
  type StreamOptions,
  type FullStreamEvent,
} from './stream-handler';

// Finish reason mapping utilities
export {
  mapFinishReason,
  createFinishReasonMapper,
  getFinishReasonDescription,
  isSuccessfulCompletion,
  isErrorCondition,
  wasContentFiltered,
  wasTokenLimitReached,
} from './finish-reason-mapper';

// Provider factory utilities
export {
  createProvider,
  getLanguageModel,
  getTextEmbeddingModel,
  getImageModel,
  createProviderFactory,
  validateProviderConfig,
  type ProviderConfig,
  type ProviderFactoryOptions,
} from './provider-factory';

// Re-export existing utilities for backwards compatibility
export {
  convertUsage,
  buildAISDKParams,
  buildProviderSettings,
} from '../utils';

/**
 * Create a complete portal toolkit for a specific provider
 * 
 * This factory function creates all the necessary utilities configured
 * for a specific provider, reducing boilerplate in portal implementations.
 */
export function createPortalToolkit(provider: string, config?: any) {
  return {
    // Message conversion
    convertMessages: createMessageConverter(provider),
    
    // Parameter building
    parameterBuilder: createParameterBuilder(provider, config?.defaults),
    
    // Model resolution
    modelResolver: createModelResolver(provider, config),
    
    // Error handling
    errorHandler: createErrorHandler(provider, config?.model),
    
    // Stream handling
    streamHandler: createStreamHandler(provider),
    
    // Finish reason mapping
    mapFinishReason: createFinishReasonMapper(provider),
    
    // Provider factory
    providerFactory: createProviderFactory(provider),
  };
}

/**
 * Portal implementation helper class
 * 
 * Provides a structured way to implement portals with all shared utilities
 * pre-configured for a specific provider.
 */
export class PortalImplementationHelper {
  private toolkit: ReturnType<typeof createPortalToolkit>;
  
  constructor(
    private provider: string,
    private config: any = {}
  ) {
    this.toolkit = createPortalToolkit(provider, config);
  }
  
  /**
   * Get the message converter
   */
  get messageConverter() {
    return this.toolkit.convertMessages;
  }
  
  /**
   * Get the parameter builder
   */
  get parameterBuilder() {
    return this.toolkit.parameterBuilder;
  }
  
  /**
   * Get the model resolver
   */
  get modelResolver() {
    return this.toolkit.modelResolver;
  }
  
  /**
   * Get the error handler
   */
  get errorHandler() {
    return this.toolkit.errorHandler;
  }
  
  /**
   * Get the stream handler
   */
  get streamHandler() {
    return this.toolkit.streamHandler;
  }
  
  /**
   * Get the finish reason mapper
   */
  get finishReasonMapper() {
    return this.toolkit.mapFinishReason;
  }
  
  /**
   * Get the provider factory
   */
  get providerFactory() {
    return this.toolkit.providerFactory;
  }
  
  /**
   * Create AI SDK provider instance
   */
  createProvider(providerConfig: any, options?: any) {
    return this.providerFactory.create(providerConfig, options);
  }
  
  /**
   * Get language model instance
   */
  getLanguageModel(provider: any, modelId: string) {
    return this.providerFactory.getLanguageModel(provider, modelId);
  }
  
  /**
   * Build parameters for text generation
   */
  buildTextParams(baseParams: any, options?: any) {
    return this.parameterBuilder.buildTextParams(baseParams, options);
  }
  
  /**
   * Build parameters for chat generation
   */
  buildChatParams(baseParams: any, options?: any) {
    return this.parameterBuilder.buildChatParams(baseParams, options);
  }
  
  /**
   * Handle errors with provider-specific logic
   */
  handleError(error: any, operation: string, model?: string) {
    return this.errorHandler.handleError(error, operation, model);
  }
  
  /**
   * Execute operation with retry logic
   */
  withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    model?: string,
    retryOptions?: any
  ) {
    return this.errorHandler.withRetry(operation, operationName, model, retryOptions);
  }
  
  /**
   * Create text stream
   */
  createTextStream(model: any, params: any, options?: any) {
    return this.streamHandler.createTextStream(model, params, options);
  }
  
  /**
   * Create chat stream
   */
  createChatStream(model: any, params: any, options?: any) {
    return this.streamHandler.createChatStream(model, params, options);
  }
  
  /**
   * Convert messages to AI SDK format
   */
  convertMessages(messages: any[]) {
    return this.messageConverter(messages);
  }
  
  /**
   * Resolve model for specific type
   */
  resolveModel(type: any, explicit?: string) {
    return this.modelResolver.resolve(type, explicit);
  }
  
  /**
   * Map finish reason to internal enum
   */
  mapFinishReason(reason?: string) {
    return this.finishReasonMapper(reason);
  }
}

/**
 * Create portal implementation helper for a specific provider
 */
export function createPortalHelper(provider: string, config?: any) {
  return new PortalImplementationHelper(provider, config);
}