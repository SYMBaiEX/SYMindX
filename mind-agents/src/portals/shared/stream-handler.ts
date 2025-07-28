/**
 * Shared Stream Handling Utilities
 * 
 * Provides standardized streaming logic for all portal implementations
 */

import { streamText, generateText } from 'ai';
import type { LanguageModel } from '../../types/portals/ai-sdk';

export interface StreamOptions {
  /**
   * Whether to enable tool call streaming
   */
  enableToolStreaming?: boolean;
  
  /**
   * Maximum steps for multi-step operations
   */
  maxSteps?: number;
  
  /**
   * Callbacks for different stream events
   */
  callbacks?: {
    onToolCallStart?: (toolCallId: string, toolName: string) => void;
    onToolCallFinish?: (toolCallId: string, result: any) => void;
    onStepFinish?: (step: any) => void;
    onError?: (error: any) => void;
  };
}

export interface FullStreamEvent {
  type: 'text' | 'tool-call' | 'tool-result' | 'finish' | 'error';
  content: any;
}

/**
 * Create a text stream with enhanced error handling
 */
export async function* createTextStream(
  model: LanguageModel,
  params: any,
  options: StreamOptions = {}
): AsyncGenerator<string> {
  try {
    const { textStream } = await streamText({
      model,
      ...params,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  } catch (error) {
    if (options.callbacks?.onError) {
      options.callbacks.onError(error);
    }
    throw error;
  }
}

/**
 * Create a chat stream with tool support
 */
export async function* createChatStream(
  model: LanguageModel,
  params: any,
  options: StreamOptions = {}
): AsyncGenerator<string> {
  try {
    const streamParams = { ...params, model };

    // Add tool streaming configuration
    if (options.enableToolStreaming && params.tools) {
      streamParams.toolCallStreaming = true;
      streamParams.maxSteps = options.maxSteps || 5;

      if (options.callbacks?.onStepFinish) {
        streamParams.onStepFinish = options.callbacks.onStepFinish;
      }
    }

    const { textStream } = await streamText(streamParams);

    for await (const chunk of textStream) {
      yield chunk;
    }
  } catch (error) {
    if (options.callbacks?.onError) {
      options.callbacks.onError(error);
    }
    throw error;
  }
}

/**
 * Create a full access stream with all event types
 */
export async function* createFullAccessStream(
  model: LanguageModel,
  params: any,
  options: StreamOptions = {}
): AsyncGenerator<FullStreamEvent> {
  try {
    const streamParams = { ...params, model };

    // Configure tool streaming if enabled
    if (options.enableToolStreaming && params.tools) {
      streamParams.toolCallStreaming = true;
      streamParams.maxSteps = options.maxSteps || 5;

      if (options.callbacks?.onStepFinish) {
        streamParams.onStepFinish = options.callbacks.onStepFinish;
      }
    }

    const result = await streamText(streamParams);

    // Stream all events from the full stream
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text':
          yield { type: 'text', content: part.text };
          break;

        case 'tool-call':
          if (options.callbacks?.onToolCallStart) {
            options.callbacks.onToolCallStart(part.toolCallId, part.toolName);
          }
          yield { type: 'tool-call', content: part };
          break;

        case 'tool-result':
          if (options.callbacks?.onToolCallFinish) {
            options.callbacks.onToolCallFinish(part.toolCallId, part.result);
          }
          yield { type: 'tool-result', content: part };
          break;

        case 'finish':
          yield { type: 'finish', content: part };
          break;

        case 'error':
          yield { type: 'error', content: part };
          break;

        default:
          // Handle any other event types
          yield { type: part.type as any, content: part };
          break;
      }
    }
  } catch (error) {
    if (options.callbacks?.onError) {
      options.callbacks.onError(error);
    }
    yield { type: 'error', content: error };
  }
}

/**
 * Create enhanced stream with tool callback support
 */
export async function* createEnhancedStream(
  model: LanguageModel,
  params: any,
  options: StreamOptions = {}
): AsyncGenerator<string> {
  try {
    const streamParams = { ...params, model };

    // Add tool support if provided
    if (params.tools) {
      streamParams.tools = params.tools;
      streamParams.toolChoice = 'auto';
      streamParams.toolCallStreaming = options.enableToolStreaming !== false;
      streamParams.maxSteps = options.maxSteps || 5;
    }

    const { textStream, fullStream } = await streamText(streamParams);

    // Process the full stream to handle tool calls if callbacks are provided
    if (options.callbacks?.onToolCallStart || options.callbacks?.onToolCallFinish) {
      const streamIterator = fullStream[Symbol.asyncIterator]();

      while (true) {
        const { done, value } = await streamIterator.next();
        if (done) break;

        switch (value.type) {
          case 'text':
            yield value.text;
            break;

          case 'tool-call':
            if (options.callbacks?.onToolCallStart) {
              options.callbacks.onToolCallStart(value.toolCallId, value.toolName);
            }
            break;

          case 'tool-result':
            if (options.callbacks?.onToolCallFinish) {
              options.callbacks.onToolCallFinish(value.toolCallId, value.result);
            }
            break;
        }
      }
    } else {
      // Just yield text chunks
      for await (const chunk of textStream) {
        yield chunk;
      }
    }
  } catch (error) {
    if (options.callbacks?.onError) {
      options.callbacks.onError(error);
    }
    throw error;
  }
}

/**
 * Execute multi-step generation with tool support
 */
export async function executeMultiStep(
  model: LanguageModel,
  params: any,
  options: {
    maxSteps?: number;
    onStepFinish?: (step: number, result: any) => void;
  } = {}
): Promise<any> {
  const { maxSteps = 5, onStepFinish } = options;

  const executeParams = {
    ...params,
    model,
    maxSteps,
  };

  // Add tools if provided
  if (params.tools) {
    executeParams.tools = params.tools;
    executeParams.toolChoice = 'auto';
  }

  // Add step callbacks
  if (onStepFinish) {
    executeParams.onStepFinish = async ({
      stepType,
      stepCount,
      toolCalls,
      toolResults,
    }: any) => {
      onStepFinish(stepCount, {
        stepType,
        toolCalls,
        toolResults,
      });
    };
  }

  return await generateText(executeParams);
}

/**
 * Create stream handler configured for specific provider
 */
export function createStreamHandler(provider: string) {
  // Provider-specific streaming configuration
  const providerConfig = getProviderStreamConfig(provider);

  return {
    createTextStream: (model: LanguageModel, params: any, options?: StreamOptions) =>
      createTextStream(model, params, { ...providerConfig, ...options }),

    createChatStream: (model: LanguageModel, params: any, options?: StreamOptions) =>
      createChatStream(model, params, { ...providerConfig, ...options }),

    createFullAccessStream: (model: LanguageModel, params: any, options?: StreamOptions) =>
      createFullAccessStream(model, params, { ...providerConfig, ...options }),

    createEnhancedStream: (model: LanguageModel, params: any, options?: StreamOptions) =>
      createEnhancedStream(model, params, { ...providerConfig, ...options }),

    executeMultiStep: (model: LanguageModel, params: any, options?: any) =>
      executeMultiStep(model, params, options),
  };
}

/**
 * Get provider-specific streaming configuration
 */
function getProviderStreamConfig(provider: string): StreamOptions {
  switch (provider.toLowerCase()) {
    case 'openai':
      return {
        enableToolStreaming: true,
        maxSteps: 5,
      };

    case 'anthropic':
      return {
        enableToolStreaming: true,
        maxSteps: 5,
      };

    case 'groq':
      return {
        enableToolStreaming: true,
        maxSteps: 3, // Groq is faster, fewer steps needed
      };

    case 'xai':
      return {
        enableToolStreaming: false, // XAI may not support tool streaming
        maxSteps: 3,
      };

    case 'google':
    case 'gemini':
      return {
        enableToolStreaming: true,
        maxSteps: 5,
      };

    case 'mistral':
      return {
        enableToolStreaming: true,
        maxSteps: 5,
      };

    case 'cohere':
      return {
        enableToolStreaming: false, // Cohere may not support tool streaming
        maxSteps: 3,
      };

    default:
      return {
        enableToolStreaming: true,
        maxSteps: 5,
      };
  }
}

/**
 * Convert stream to array for testing or non-streaming usage
 */
export async function streamToArray<T>(stream: AsyncGenerator<T>): Promise<T[]> {
  const results: T[] = [];
  
  for await (const chunk of stream) {
    results.push(chunk);
  }
  
  return results;
}

/**
 * Combine multiple text streams into a single string
 */
export async function streamToString(stream: AsyncGenerator<string>): Promise<string> {
  const chunks: string[] = [];
  
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  return chunks.join('');
}