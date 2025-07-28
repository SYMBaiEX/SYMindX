/**
 * Shared Error Handling Utilities
 * 
 * Provides standardized error handling and recovery logic for all portals
 */

import { 
  createPortalError, 
  createConfigurationError, 
  createNetworkError 
} from '../../utils/standard-errors';

export interface ErrorHandlerOptions {
  /**
   * Portal/provider name for error context
   */
  provider: string;
  
  /**
   * Operation being performed when error occurred
   */
  operation: string;
  
  /**
   * Model being used when error occurred
   */
  model?: string;
  
  /**
   * Whether to include retry logic
   */
  enableRetry?: boolean;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Handle AI SDK errors with provider-specific logic
 */
export function handleAISDKError(error: any, options: ErrorHandlerOptions): Error {
  const { provider, operation, model } = options;

  // Extract error details
  const errorName = error.name || error.constructor?.name;
  const errorMessage = error.message || 'Unknown error';
  const statusCode = error.status || error.statusCode;
  const errorCode = error.code || error.error?.code;

  // Handle specific AI SDK error types
  switch (errorName) {
    case 'AI_APICallError':
      return createNetworkError(
        `${provider} API call failed during ${operation}`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_API_CALL_FAILED`,
        {
          operation,
          statusCode,
          errorCode,
          originalMessage: errorMessage,
        },
        error
      );

    case 'AI_InvalidArgumentError':
      return createConfigurationError(
        `Invalid parameters for ${provider} ${operation}`,
        `portals.${provider}.${operation}`,
        'parameters',
        `${provider.toUpperCase()}_INVALID_ARGUMENTS`,
        {
          operation,
          originalMessage: errorMessage,
        }
      );

    case 'AI_RateLimitError':
      return createNetworkError(
        `${provider} rate limit exceeded during ${operation}`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_RATE_LIMIT_EXCEEDED`,
        {
          operation,
          retryAfter: error.retryAfter,
          originalMessage: errorMessage,
        },
        error
      );

    case 'AI_AuthenticationError':
      return createConfigurationError(
        `${provider} authentication failed`,
        `portals.${provider}.apiKey`,
        'apiKey',
        `${provider.toUpperCase()}_AUTHENTICATION_FAILED`,
        {
          operation,
          originalMessage: errorMessage,
        }
      );

    case 'AI_ContentFilterError':
      return createPortalError(
        `${provider} content filter triggered during ${operation}`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_CONTENT_FILTERED`,
        {
          operation,
          originalMessage: errorMessage,
        },
        error
      );

    default:
      // Handle provider-specific errors
      return handleProviderSpecificError(error, options);
  }
}

/**
 * Handle provider-specific error patterns
 */
function handleProviderSpecificError(error: any, options: ErrorHandlerOptions): Error {
  const { provider, operation, model } = options;
  const statusCode = error.status || error.statusCode;
  const errorMessage = error.message || 'Unknown error';

  // Handle common HTTP status codes
  switch (statusCode) {
    case 400:
      return createConfigurationError(
        `Bad request to ${provider} during ${operation}`,
        `portals.${provider}.${operation}`,
        'parameters',
        `${provider.toUpperCase()}_BAD_REQUEST`,
        { operation, originalMessage: errorMessage }
      );

    case 401:
      return createConfigurationError(
        `Unauthorized access to ${provider}`,
        `portals.${provider}.apiKey`,
        'apiKey',
        `${provider.toUpperCase()}_UNAUTHORIZED`,
        { operation, originalMessage: errorMessage }
      );

    case 403:
      return createConfigurationError(
        `Forbidden access to ${provider} ${operation}`,
        `portals.${provider}.permissions`,
        'permissions',
        `${provider.toUpperCase()}_FORBIDDEN`,
        { operation, originalMessage: errorMessage }
      );

    case 404:
      return createPortalError(
        `${provider} resource not found during ${operation}`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_NOT_FOUND`,
        { operation, originalMessage: errorMessage },
        error
      );

    case 429:
      return createNetworkError(
        `${provider} rate limit exceeded`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_RATE_LIMITED`,
        { 
          operation, 
          retryAfter: error.headers?.['retry-after'],
          originalMessage: errorMessage 
        },
        error
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return createNetworkError(
        `${provider} server error during ${operation}`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_SERVER_ERROR`,
        { operation, statusCode, originalMessage: errorMessage },
        error
      );

    default:
      return createPortalError(
        `${provider} ${operation} failed`,
        provider,
        model || 'unknown',
        `${provider.toUpperCase()}_${operation.toUpperCase()}_FAILED`,
        { operation, statusCode, originalMessage: errorMessage },
        error
      );
  }
}

/**
 * Execute operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  errorHandler?: (error: any) => Error
): Promise<T> {
  let lastError: any;
  let delay = options.delay;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === options.maxRetries) {
        break; // No more retries
      }

      if (options.retryCondition && !options.retryCondition(error)) {
        break; // Retry condition not met
      }

      // Don't retry on authentication or configuration errors
      if (isNonRetryableError(error)) {
        break;
      }

      // Wait before retrying
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= options.backoffMultiplier;
      }
    }
  }

  // All retries exhausted, throw the last error
  throw errorHandler ? errorHandler(lastError) : lastError;
}

/**
 * Check if an error should not be retried
 */
function isNonRetryableError(error: any): boolean {
  const nonRetryableStatuses = [400, 401, 403, 404];
  const nonRetryableNames = ['AI_AuthenticationError', 'AI_InvalidArgumentError'];

  const statusCode = error.status || error.statusCode;
  const errorName = error.name || error.constructor?.name;

  return nonRetryableStatuses.includes(statusCode) || nonRetryableNames.includes(errorName);
}

/**
 * Create error handler configured for specific provider
 */
export function createErrorHandler(provider: string, defaultModel?: string) {
  return {
    handleError: (error: any, operation: string, model?: string) =>
      handleAISDKError(error, {
        provider,
        operation,
        model: model || defaultModel,
      }),

    withRetry: <T>(
      operation: () => Promise<T>,
      operationName: string,
      model?: string,
      retryOptions?: Partial<RetryOptions>
    ) => {
      const fullRetryOptions: RetryOptions = {
        maxRetries: 3,
        delay: 1000,
        backoffMultiplier: 2,
        ...retryOptions,
      };

      return withRetry(
        operation,
        fullRetryOptions,
        (error) => handleAISDKError(error, {
          provider,
          operation: operationName,
          model: model || defaultModel,
        })
      );
    },

    isRetryable: (error: any) => !isNonRetryableError(error),
  };
}

/**
 * Validate API key configuration
 */
export function validateApiKey(apiKey: string | undefined, provider: string): void {
  if (!apiKey) {
    throw createConfigurationError(
      `${provider} API key is required`,
      `portals.${provider}.apiKey`,
      'apiKey',
      `${provider.toUpperCase()}_API_KEY_MISSING`
    );
  }

  // Basic API key format validation
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw createConfigurationError(
      `${provider} API key must be a non-empty string`,
      `portals.${provider}.apiKey`,
      'apiKey',
      `${provider.toUpperCase()}_API_KEY_INVALID`
    );
  }

  // Provider-specific validation
  switch (provider.toLowerCase()) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        throw createConfigurationError(
          'OpenAI API key must start with "sk-"',
          'portals.openai.apiKey',
          'apiKey',
          'OPENAI_API_KEY_MALFORMED'
        );
      }
      break;

    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        throw createConfigurationError(
          'Anthropic API key must start with "sk-ant-"',
          'portals.anthropic.apiKey',
          'apiKey',
          'ANTHROPIC_API_KEY_MALFORMED'
        );
      }
      break;

    case 'groq':
      if (!apiKey.startsWith('gsk_')) {
        throw createConfigurationError(
          'Groq API key must start with "gsk_"',
          'portals.groq.apiKey',
          'apiKey',
          'GROQ_API_KEY_MALFORMED'
        );
      }
      break;

    case 'xai':
      if (!apiKey.startsWith('xai-')) {
        throw createConfigurationError(
          'XAI API key must start with "xai-"',
          'portals.xai.apiKey',
          'apiKey',
          'XAI_API_KEY_MALFORMED'
        );
      }
      break;
  }
}

/**
 * Create timeout wrapper for operations
 */
export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}