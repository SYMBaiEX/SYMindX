/**
 * Shared Finish Reason Mapping Utilities
 *
 * Provides standardized finish reason mapping for all portal implementations
 */

import { FinishReason } from '../../types/portal';

/**
 * Map AI SDK finish reason to our internal enum
 */
export function mapFinishReason(reason?: string): FinishReason {
  if (!reason) {
    return FinishReason.STOP;
  }

  switch (reason.toLowerCase()) {
    case 'stop':
    case 'end_turn':
    case 'stop_sequence':
      return FinishReason.STOP;

    case 'length':
    case 'max_tokens':
    case 'max_output_tokens':
      return FinishReason.LENGTH;

    case 'content-filter':
    case 'content_filter':
    case 'safety':
      return FinishReason.CONTENT_FILTER;

    case 'tool-calls':
    case 'tool_calls':
    case 'tool_use':
    case 'function-call':
    case 'function_call':
      return FinishReason.FUNCTION_CALL;

    case 'error':
      return FinishReason.ERROR;

    case 'cancelled':
    case 'canceled':
    case 'timeout':
      return FinishReason.CANCELLED;

    case 'recitation':
      return FinishReason.CONTENT_FILTER; // Treat recitation as content filter

    default:
      // Log unknown finish reasons for debugging
      console.warn(`Unknown finish reason: ${reason}, defaulting to STOP`);
      return FinishReason.STOP;
  }
}

/**
 * Create finish reason mapper configured for specific provider
 */
export function createFinishReasonMapper(provider: string) {
  return (reason?: string) => mapProviderFinishReason(reason, provider);
}

/**
 * Map provider-specific finish reasons with additional context
 */
function mapProviderFinishReason(
  reason?: string,
  provider: string
): FinishReason {
  if (!reason) {
    return FinishReason.STOP;
  }

  // Provider-specific mappings
  switch (provider.toLowerCase()) {
    case 'openai':
      return mapOpenAIFinishReason(reason);

    case 'anthropic':
      return mapAnthropicFinishReason(reason);

    case 'groq':
      return mapGroqFinishReason(reason);

    case 'xai':
    case 'grok':
      return mapXAIFinishReason(reason);

    case 'google':
    case 'gemini':
      return mapGoogleFinishReason(reason);

    case 'mistral':
      return mapMistralFinishReason(reason);

    case 'cohere':
      return mapCohereFinishReason(reason);

    default:
      return mapFinishReason(reason);
  }
}

/**
 * OpenAI-specific finish reason mapping
 */
function mapOpenAIFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'stop':
      return FinishReason.STOP;
    case 'length':
      return FinishReason.LENGTH;
    case 'content_filter':
      return FinishReason.CONTENT_FILTER;
    case 'tool_calls':
    case 'function_call':
      return FinishReason.FUNCTION_CALL;
    case 'null':
      return FinishReason.ERROR;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Anthropic-specific finish reason mapping
 */
function mapAnthropicFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'end_turn':
      return FinishReason.STOP;
    case 'max_tokens':
      return FinishReason.LENGTH;
    case 'stop_sequence':
      return FinishReason.STOP;
    case 'tool_use':
      return FinishReason.FUNCTION_CALL;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Groq-specific finish reason mapping
 */
function mapGroqFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'stop':
      return FinishReason.STOP;
    case 'length':
      return FinishReason.LENGTH;
    case 'tool_calls':
      return FinishReason.FUNCTION_CALL;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * XAI/Grok-specific finish reason mapping
 */
function mapXAIFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'stop':
      return FinishReason.STOP;
    case 'length':
      return FinishReason.LENGTH;
    case 'tool_calls':
      return FinishReason.FUNCTION_CALL;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Google/Gemini-specific finish reason mapping
 */
function mapGoogleFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'stop':
      return FinishReason.STOP;
    case 'max_tokens':
      return FinishReason.LENGTH;
    case 'safety':
      return FinishReason.CONTENT_FILTER;
    case 'recitation':
      return FinishReason.CONTENT_FILTER;
    case 'other':
      return FinishReason.ERROR;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Mistral-specific finish reason mapping
 */
function mapMistralFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'stop':
      return FinishReason.STOP;
    case 'length':
      return FinishReason.LENGTH;
    case 'tool_calls':
      return FinishReason.FUNCTION_CALL;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Cohere-specific finish reason mapping
 */
function mapCohereFinishReason(reason: string): FinishReason {
  switch (reason.toLowerCase()) {
    case 'complete':
      return FinishReason.STOP;
    case 'max_tokens':
      return FinishReason.LENGTH;
    case 'error':
      return FinishReason.ERROR;
    default:
      return mapFinishReason(reason);
  }
}

/**
 * Get human-readable description of finish reason
 */
export function getFinishReasonDescription(reason: FinishReason): string {
  switch (reason) {
    case FinishReason.STOP:
      return 'Generation completed normally';
    case FinishReason.LENGTH:
      return 'Generation stopped due to maximum token limit';
    case FinishReason.CONTENT_FILTER:
      return 'Generation stopped due to content filter';
    case FinishReason.FUNCTION_CALL:
      return 'Generation stopped to call a function/tool';
    case FinishReason.ERROR:
      return 'Generation stopped due to an error';
    case FinishReason.CANCELLED:
      return 'Generation was cancelled or timed out';
    default:
      return 'Unknown finish reason';
  }
}

/**
 * Check if finish reason indicates a successful completion
 */
export function isSuccessfulCompletion(reason: FinishReason): boolean {
  return reason === FinishReason.STOP || reason === FinishReason.FUNCTION_CALL;
}

/**
 * Check if finish reason indicates an error condition
 */
export function isErrorCondition(reason: FinishReason): boolean {
  return reason === FinishReason.ERROR || reason === FinishReason.CANCELLED;
}

/**
 * Check if finish reason indicates content was filtered
 */
export function wasContentFiltered(reason: FinishReason): boolean {
  return reason === FinishReason.CONTENT_FILTER;
}

/**
 * Check if finish reason indicates token limit was reached
 */
export function wasTokenLimitReached(reason: FinishReason): boolean {
  return reason === FinishReason.LENGTH;
}
