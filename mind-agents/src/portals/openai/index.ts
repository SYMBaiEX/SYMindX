/**
 * OpenAI Portal Implementation
 *
 * This portal provides integration with OpenAI's API using the Vercel AI SDK v5.
 * It supports text generation, chat completion, embeddings, and image generation.
 */

import { createOpenAI } from '@ai-sdk/openai';
import {
  generateText,
  streamText,
  embed,
  embedMany,
  experimental_generateImage as generateImage,
} from 'ai';
import type { CoreMessage } from 'ai';
import { runtimeLogger } from '../../utils/logger';

import {
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  PortalCapability,
  MessageRole,
  PortalType,
  ModelType,
} from '../../types/portal';
import { UnifiedContext } from '../../types/context/unified-context.js';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';
import {
  ContextPromptTransformer,
  ContextModelSelector,
  ContextPerformanceOptimizer,
} from '../context-helpers.js';

// Import shared utilities
import {
  createPortalHelper,
  validateApiKey,
  type ProviderConfig,
} from '../shared';

export interface OpenAIConfig extends PortalConfig {
  model?: string;
  chatModel?: string; // Specific model for chat operations
  toolModel?: string; // Faster model for tool/function calling
  embeddingModel?: string;
  imageModel?: string;
  organization?: string;
  baseURL?: string;
  // Advanced AI SDK v5 features
  enableToolStreaming?: boolean;
  maxSteps?: number;
  parallelToolCalls?: boolean;
}

// Using shared convertUsage function from utils

export class OpenAIPortal extends BasePortal {
  type: PortalType = PortalType.OPENAI;
  supportedModels: ModelType[] = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.EMBEDDING,
    ModelType.IMAGE_GENERATION,
    ModelType.MULTIMODAL,
    ModelType.CODE_GENERATION,
  ];
  private openaiProvider: ReturnType<typeof createOpenAI>;
  private helper: ReturnType<typeof createPortalHelper>;

  constructor(config: OpenAIConfig) {
    super('openai', 'OpenAI', '1.0.0', config);

    // Create portal helper with shared utilities
    this.helper = createPortalHelper('openai', config);

    // Validate and create provider using shared utilities
    const apiKey = config.apiKey || process.env['OPENAI_API_KEY'];
    validateApiKey(apiKey, 'openai');

    const providerConfig: ProviderConfig = {
      apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    };

    try {
      this.openaiProvider = this.helper.createProvider(
        providerConfig
      ) as ReturnType<typeof createOpenAI>;
      runtimeLogger.debug('OpenAI provider created successfully');
    } catch (error) {
      runtimeLogger.error(
        `Failed to create OpenAI provider: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get language model instance using shared utilities
   */
  private getLanguageModel(modelId?: string) {
    const model = this.helper.resolveModel('chat', modelId);
    runtimeLogger.debug(`Creating OpenAI language model with ID: ${model}`);

    try {
      const languageModel = this.helper.getLanguageModel(
        this.openaiProvider,
        model
      );
      runtimeLogger.debug(`Successfully created language model for: ${model}`);
      return languageModel;
    } catch (error) {
      runtimeLogger.error(
        `Failed to create language model for ${model}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Convert ChatMessage array to AI SDK format using shared utilities
   */
  private convertToModelMessages(messages: ChatMessage[]): CoreMessage[] {
    return this.helper.convertMessages(messages);
  }

  /**
   * Generate text using OpenAI's completion API with shared utilities
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    return this.helper.withRetry(
      async () => {
        const model = this.helper.resolveModel('chat', options?.model);
        const languageModel = this.getLanguageModel(model);

        const baseParams = {
          model: languageModel,
          prompt,
        };

        const params = this.helper.buildTextParams(baseParams, options);
        const result = await generateText(params);

        return {
          text: result.text,
          usage: convertUsage(result.usage),
          finishReason: this.helper.mapFinishReason(result.finishReason),
          metadata: {
            model,
            provider: 'openai',
          },
        };
      },
      'generateText',
      options?.model
    );
  }

  /**
   * Generate chat response using OpenAI's chat completion API with shared utilities
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    return this.helper.withRetry(
      async () => {
        // Intelligent model selection based on use case
        const modelType =
          (options?.functions && options.functions.length > 0) ||
          (options?.tools && Object.keys(options.tools).length > 0)
            ? 'tool'
            : 'chat';
        const model = this.helper.resolveModel(modelType, options?.model);

        const languageModel = this.getLanguageModel(model);
        const modelMessages = this.convertToModelMessages(messages);

        const baseOptions = {
          model: languageModel,
          messages: modelMessages,
        };

        const params = this.helper.buildChatParams(baseOptions, options);
        const result = await generateText(params);

        return {
          text: result.text,
          message: {
            role: MessageRole.ASSISTANT,
            content: result.text,
          },
          usage: convertUsage(result.usage),
          finishReason: this.helper.mapFinishReason(result.finishReason),
          metadata: {
            model,
            provider: 'openai',
          },
        };
      },
      'generateChat',
      options?.model
    );
  }

  /**
   * Generate embeddings using OpenAI's embedding API
   */
  override async generateEmbedding(
    _text: string,
    _options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const model =
        _options?.model ||
        (this.config as OpenAIConfig).embeddingModel ||
        'text-embedding-3-large';

      const { embedding, usage } = await embed({
        model: this.openaiProvider.textEmbeddingModel(model) as any,
        value: _text,
      });

      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: {
          promptTokens: usage?.tokens || 0,
          totalTokens: usage?.tokens || 0,
        },
        metadata: {
          provider: 'openai',
        },
      };
    } catch (error) {
      void error;
      // OpenAI embedding generation error
      throw new Error(`OpenAI embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate images using OpenAI's DALL-E API
   */
  override async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    try {
      const model =
        options?.model ||
        (this.config as OpenAIConfig).imageModel ||
        'dall-e-3';

      // Use AI SDK v5 native image generation
      const result = await generateImage({
        model: this.openaiProvider.image(model) as any,
        prompt,
        size: (options?.size || '1024x1024') as `${number}x${number}`,
        n: options?.n || 1,
        providerOptions: {
          openai: {
            quality: options?.quality || 'standard',
            ...(options?.style && { style: options.style }),
            response_format: options?.responseFormat || 'url',
          },
        },
      });

      return {
        images: result.images.map((img) => ({
          b64_json: img.base64,
        })),
        model,
        metadata: {
          provider: 'openai',
          revised_prompt: (result.providerMetadata as any)?.openai
            ?.revisedPrompt,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      void error;
      // OpenAI image generation error using AI SDK v5
      throw new Error(`OpenAI image generation failed: ${error}`);
    }
  }

  /**
   * Stream text generation for real-time responses using shared utilities
   */
  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.helper.resolveModel('chat', options?.model);
    const languageModel = this.getLanguageModel(model);

    const baseParams = {
      model: languageModel,
      prompt,
    };

    const params = this.helper.buildTextParams(baseParams, options);

    yield* this.helper.createTextStream(languageModel, params, {
      callbacks: {
        onError: (error) => {
          throw this.helper.handleError(error, 'streamText', model);
        },
      },
    });
  }

  /**
   * Stream chat generation for real-time responses using shared utilities
   */
  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    // Intelligent model selection for streaming
    const modelType =
      (options?.functions && options.functions.length > 0) ||
      (options?.tools && Object.keys(options.tools).length > 0)
        ? 'tool'
        : 'chat';
    const model = this.helper.resolveModel(modelType, options?.model);

    const languageModel = this.getLanguageModel(model);
    const modelMessages = this.convertToModelMessages(messages);

    const baseOptions = {
      model: languageModel,
      messages: modelMessages,
    };

    const params = this.helper.buildChatParams(baseOptions, options);

    yield* this.helper.createChatStream(languageModel, params, {
      enableToolStreaming: true,
      callbacks: {
        onError: (error) => {
          throw this.helper.handleError(error, 'streamChat', model);
        },
      },
    });
  }

  /**
   * Stream text generation with full stream access for advanced tool calling
   * Provides access to all stream events including tool calls, tool results, and text
   */
  async *streamTextWithFullAccess(
    prompt: string,
    options?: TextGenerationOptions & {
      onToolCall?: (toolCall: any) => void;
      onToolResult?: (toolResult: any) => void;
      onStepFinish?: (step: any) => void;
    }
  ): AsyncGenerator<{
    type: 'text' | 'tool-call' | 'tool-result' | 'finish' | 'error';
    content: any;
  }> {
    try {
      const model =
        options?.model || (this.config as OpenAIConfig).model || 'gpt-4o-mini';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        params.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        params.temperature = options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        params.topP = options.topP;
      }

      // Add tools with full streaming support
      if (options?.tools) {
        params.tools = options.tools;
        params.maxSteps = options?.maxSteps || 5;
        params.toolCallStreaming = true;

        if (options?.onStepFinish) {
          params.onStepFinish = options.onStepFinish;
        }
      }

      const result = await streamText(params);

      // Stream all events from the full stream
      for await (const part of result.fullStream) {
        switch (part.type) {
          case 'text':
            yield { type: 'text', content: part.text };
            break;
          case 'tool-call':
            if (options?.onToolCall) {
              options.onToolCall(part);
            }
            yield { type: 'tool-call', content: part };
            break;
          case 'tool-result':
            if (options?.onToolResult) {
              options.onToolResult(part);
            }
            yield { type: 'tool-result', content: part };
            break;
          case 'finish':
            yield { type: 'finish', content: part };
            break;
          case 'error':
            yield { type: 'error', content: part };
            break;
        }
      }
    } catch (error) {
      void error;
      yield { type: 'error', content: error };
    }
  }

  /**
   * Check if the portal supports a specific capability
   */
  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.TOOL_USAGE:
      case PortalCapability.EVALUATION:
      case PortalCapability.REASONING:
        return true;
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  /**
   * Generate text with multi-step support (AI SDK v5 feature)
   * Supports tool calling with multiple steps
   */
  override async generateTextMultiStep(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<TextGenerationResult> {
    const config = this.config as OpenAIConfig;
    const maxSteps = options?.maxSteps || config.maxSteps || 5;

    try {
      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.helper.resolveModel('tool')
        ),
        messages: [{ role: 'user' as const, content: prompt }],
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        // TODO: Re-enable when stepCountIs is available in stable AI SDK v5
        // params.stopWhen = stepCountIs(maxSteps);
        params.maxSteps = maxSteps; // Fallback to maxSteps
      }

      // Add step callbacks
      if (options?.onStepFinish) {
        params.onStepFinish = async ({
          stepType,
          stepCount,
          toolCalls,
          toolResults,
        }: any) => {
          options.onStepFinish!(stepCount, {
            stepType,
            toolCalls,
            toolResults,
          });
        };
      }

      const { text, usage, finishReason, steps } = await generateText(params);

      return {
        text,
        model: options?.model || this.helper.resolveModel('tool'),
        usage: convertUsage(usage),
        finishReason: this.helper.mapFinishReason(finishReason),
        timestamp: new Date(),
        metadata: {
          steps: steps?.length || 1,
          toolCalls: steps?.flatMap((s) => s.toolCalls || []),
        },
      };
    } catch (error) {
      throw new Error(`OpenAI multi-step text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat with multi-step support (AI SDK v5 feature)
   */
  override async generateChatMultiStep(
    messages: ChatMessage[],
    options?: ChatGenerationOptions & {
      tools?: Record<string, any>;
      maxSteps?: number;
      onStepFinish?: (step: number, result: any) => void;
    }
  ): Promise<ChatGenerationResult> {
    const config = this.config as OpenAIConfig;
    const maxSteps = options?.maxSteps || config.maxSteps || 5;

    try {
      const modelMessages = this.convertToModelMessages(messages);

      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.helper.resolveModel('tool')
        ),
        messages: modelMessages,
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        // TODO: Re-enable when stepCountIs is available in stable AI SDK v5
        // params.stopWhen = stepCountIs(maxSteps);
        params.maxSteps = maxSteps; // Fallback to maxSteps
      }

      // Add step callbacks
      if (options?.onStepFinish) {
        params.onStepFinish = async ({
          stepType,
          stepCount,
          toolCalls,
          toolResults,
        }: any) => {
          options.onStepFinish!(stepCount, {
            stepType,
            toolCalls,
            toolResults,
          });
        };
      }

      const { text, usage, finishReason, steps } = await generateText(params);

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model: options?.model || this.helper.resolveModel('tool'),
        message,
        usage: convertUsage(usage),
        finishReason: this.helper.mapFinishReason(finishReason),
        timestamp: new Date(),
        metadata: {
          steps: steps?.length || 1,
          toolCalls: steps?.flatMap((s) => s.toolCalls || []),
        },
      };
    } catch (error) {
      throw new Error(`OpenAI multi-step chat generation failed: ${error}`);
    }
  }

  /**
   * Generate multiple embeddings in batch (AI SDK v5 feature)
   * Uses embedMany for optimized batch processing
   */
  override async generateEmbeddingBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult[]> {
    try {
      const embeddingModel =
        options?.model ||
        (this.config as OpenAIConfig).embeddingModel ||
        'text-embedding-3-small';

      const { embeddings, usage } = await embedMany({
        model: this.openaiProvider.textEmbeddingModel(embeddingModel) as any,
        values: texts,
      });

      return embeddings.map((embedding, index) => ({
        embedding,
        dimensions: embedding.length,
        model: embeddingModel,
        usage: {
          promptTokens: Math.floor((usage?.tokens || 0) / texts.length),
          totalTokens: Math.floor((usage?.tokens || 0) / texts.length),
        },
        metadata: {
          index,
          batchSize: texts.length,
        },
      }));
    } catch (error) {
      throw new Error(`OpenAI batch embedding generation failed: ${error}`);
    }
  }

  /**
   * Stream text with enhanced tool support (AI SDK v5 feature)
   */
  override async *streamTextEnhanced(
    prompt: string,
    options?: TextGenerationOptions & {
      tools?: Record<string, any>;
      onToolCallStart?: (toolCallId: string, toolName: string) => void;
      onToolCallFinish?: (toolCallId: string, result: any) => void;
    }
  ): AsyncGenerator<string> {
    const config = this.config as OpenAIConfig;

    try {
      const params: any = {
        model: this.getLanguageModel(
          options?.model || this.helper.resolveModel('tool')
        ),
        messages: [{ role: 'user' as const, content: prompt }],
        maxOutputTokens:
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      };

      // Add tools if provided
      if (options?.tools) {
        params.tools = options.tools;
        params.toolChoice = 'auto';
        params.toolCallStreaming = config.enableToolStreaming !== false;
      }

      const { textStream, fullStream } = await streamText(params);

      // Process the full stream to handle tool calls
      if (options?.onToolCallStart || options?.onToolCallFinish) {
        const streamIterator = fullStream[Symbol.asyncIterator]();

        while (true) {
          const { done, value } = await streamIterator.next();
          if (done) break;

          switch (value.type) {
            case 'text':
              yield value.text;
              break;
            case 'tool-call':
              if (options.onToolCallStart) {
                options.onToolCallStart(value.toolCallId, value.toolName);
              }
              break;
            case 'tool-result':
              if (options.onToolCallFinish) {
                options.onToolCallFinish(value.toolCallId, value.result);
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
      throw new Error(`OpenAI enhanced text streaming failed: ${error}`);
    }
  }

  /**
   * Get supported models for different capabilities using shared utilities
   */
  override getSupportedModelsForCapability(
    capability: PortalCapability
  ): string[] {
    return this.helper.modelResolver.getSupportedModels(capability);
  }

  /**
   * Get the optimal model for a specific capability using shared utilities
   */
  override getOptimalModelForCapability(
    capability: PortalCapability
  ): string | null {
    return this.helper.modelResolver.getOptimalModel(capability);
  }

  /**
   * Generate text with context awareness (OpenAI-specific implementation)
   * Enhances the base implementation with OpenAI-specific optimizations
   */
  override async generateTextWithContext(
    prompt: string,
    context: UnifiedContext,
    options?: Omit<TextGenerationOptions, 'context'>
  ): Promise<TextGenerationResult> {
    try {
      // Use context helpers to optimize for OpenAI
      const contextPrompt =
        ContextPromptTransformer.transformToPromptContext(context);
      const enhancedPrompt = contextPrompt
        ? `${contextPrompt}\n\n${prompt}`
        : prompt;

      // Select optimal OpenAI model based on context
      const availableModels = this.getSupportedModelsForCapability(
        PortalCapability.TEXT_GENERATION
      );
      const contextModel = ContextModelSelector.selectModel(
        context,
        availableModels,
        PortalCapability.TEXT_GENERATION
      );

      // Optimize options for OpenAI specifics
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        options
      );

      // Use the selected model or fall back to helper's model resolution
      const modelToUse =
        contextModel || this.helper.resolveModel('chat', options?.model);
      const languageModel = this.getLanguageModel(modelToUse);

      const baseParams = {
        model: languageModel,
        prompt: enhancedPrompt,
      };

      const params = this.helper.buildTextParams(baseParams, {
        ...optimizedOptions,
        context,
      });

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        finishReason: this.helper.mapFinishReason(result.finishReason),
        metadata: {
          model: modelToUse,
          provider: 'openai',
          contextEnhanced: true,
          contextScope: context.metadata.scope,
        },
      };
    } catch (error) {
      runtimeLogger.error(
        `OpenAI context-aware text generation failed:`,
        error as Error
      );
      // Fallback to base implementation
      return super.generateTextWithContext(prompt, context, options);
    }
  }

  /**
   * Generate chat with context awareness (OpenAI-specific implementation)
   * Enhances the base implementation with OpenAI-specific optimizations
   */
  override async generateChatWithContext(
    messages: ChatMessage[],
    context: UnifiedContext,
    options?: Omit<ChatGenerationOptions, 'context'>
  ): Promise<ChatGenerationResult> {
    try {
      // Build context-enhanced messages
      const enhancedMessages = this.buildContextualMessages(messages, context);

      // Select optimal OpenAI model based on context
      const availableModels = this.getSupportedModelsForCapability(
        PortalCapability.CHAT_GENERATION
      );
      const contextModel = ContextModelSelector.selectModel(
        context,
        availableModels,
        PortalCapability.CHAT_GENERATION
      );

      // Optimize options for OpenAI specifics
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        options
      );

      // Use intelligent model selection based on context
      const hasTools =
        (optimizedOptions.tools &&
          Object.keys(optimizedOptions.tools).length > 0) ||
        (context.tools?.available && context.tools.available.length > 0);
      const modelType = hasTools ? 'tool' : 'chat';
      const modelToUse =
        contextModel || this.helper.resolveModel(modelType, options?.model);

      const languageModel = this.getLanguageModel(modelToUse);
      const modelMessages = this.convertToModelMessages(enhancedMessages);

      const baseOptions = {
        model: languageModel,
        messages: modelMessages,
      };

      const params = this.helper.buildChatParams(baseOptions, {
        ...optimizedOptions,
        context,
      });

      const result = await generateText(params);

      return {
        text: result.text,
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text,
          timestamp: new Date(),
        },
        usage: convertUsage(result.usage),
        finishReason: this.helper.mapFinishReason(result.finishReason),
        metadata: {
          model: modelToUse,
          provider: 'openai',
          contextEnhanced: true,
          contextScope: context.metadata.scope,
          toolsUsed: hasTools,
        },
      };
    } catch (error) {
      runtimeLogger.error(
        `OpenAI context-aware chat generation failed:`,
        error as Error
      );
      // Fallback to base implementation
      return super.generateChatWithContext(messages, context, options);
    }
  }

  /**
   * Context-aware model selection specifically for OpenAI models
   * Override base implementation with OpenAI-specific logic
   */
  protected override selectModelFromContext(
    context: UnifiedContext
  ): string | undefined {
    // Check for OpenAI-specific context preferences
    if (
      context.portal?.active &&
      (context.portal.active as any).provider === 'openai'
    ) {
      return context.portal.active.model;
    }

    // Use reasoning models for complex tasks
    if (
      (context.agent?.config?.personality as any)?.reasoning === 'high' ||
      (context.communication?.conversationHistory &&
        context.communication.conversationHistory.length > 15)
    ) {
      return 'o1-preview'; // Use reasoning model for complex scenarios
    }

    // Use efficient models for tool usage
    if (context.tools?.available && context.tools.available.length > 0) {
      return this.helper.resolveModel('tool'); // gpt-4o-mini for tools
    }

    // Use multimodal model if needed
    if (
      context.communication?.channel?.capabilities?.includes('image') ||
      context.communication?.channel?.capabilities?.includes('video')
    ) {
      return 'gpt-4o'; // Multimodal capabilities
    }

    // Use fast model for simple conversations
    if (
      context.communication?.style &&
      (context.communication.style as any).complexity === 'low'
    ) {
      return 'gpt-4o-mini';
    }

    // Default to chat model
    return this.helper.resolveModel('chat');
  }

  /**
   * Context-aware temperature selection for OpenAI models
   * Override base implementation with OpenAI-specific optimizations
   */
  protected override selectTemperatureFromContext(
    context: UnifiedContext
  ): number {
    // Very low temperature for reasoning models
    if (context.portal?.active?.model?.includes('o1')) {
      return 0.1; // o1 models work best with low temperature
    }

    // Use base implementation for other cases
    return super.selectTemperatureFromContext(context);
  }

  /**
   * Context-aware streaming with OpenAI-specific optimizations
   */
  async *streamTextWithContext(
    prompt: string,
    context: UnifiedContext,
    options?: Omit<TextGenerationOptions, 'context'>
  ): AsyncGenerator<string> {
    try {
      // Build context-enhanced prompt
      const contextPrompt =
        ContextPromptTransformer.transformToPromptContext(context);
      const enhancedPrompt = contextPrompt
        ? `${contextPrompt}\n\n${prompt}`
        : prompt;

      // Optimize for streaming based on context
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        {
          ...options,
          stream: true,
        }
      );

      // Select model optimized for streaming
      const modelToUse =
        this.selectModelFromContext(context) ||
        this.helper.resolveModel('chat');
      const languageModel = this.getLanguageModel(modelToUse);

      const baseParams = {
        model: languageModel,
        prompt: enhancedPrompt,
      };

      const params = this.helper.buildTextParams(baseParams, {
        ...optimizedOptions,
        context,
      });

      yield* this.helper.createTextStream(languageModel, params, {
        callbacks: {
          onError: (error) => {
            runtimeLogger.error(
              `OpenAI context-aware text streaming failed:`,
              error
            );
            throw this.helper.handleError(
              error,
              'streamTextWithContext',
              modelToUse
            );
          },
        },
      });
    } catch (error) {
      runtimeLogger.error(
        `OpenAI context-aware text streaming setup failed:`,
        error as Error
      );
      throw error;
    }
  }

  /**
   * Context-aware chat streaming with OpenAI-specific optimizations
   */
  async *streamChatWithContext(
    messages: ChatMessage[],
    context: UnifiedContext,
    options?: Omit<ChatGenerationOptions, 'context'>
  ): AsyncGenerator<string> {
    try {
      // Build context-enhanced messages
      const enhancedMessages = this.buildContextualMessages(messages, context);

      // Optimize for streaming based on context
      const optimizedOptions = ContextPerformanceOptimizer.optimizeOptions(
        context,
        {
          ...options,
          stream: true,
        }
      );

      // Select model optimized for streaming and tools
      const hasTools =
        optimizedOptions.tools &&
        Object.keys(optimizedOptions.tools).length > 0;
      const modelType = hasTools ? 'tool' : 'chat';
      const modelToUse =
        this.selectModelFromContext(context) ||
        this.helper.resolveModel(modelType);

      const languageModel = this.getLanguageModel(modelToUse);
      const modelMessages = this.convertToModelMessages(enhancedMessages);

      const baseOptions = {
        model: languageModel,
        messages: modelMessages,
      };

      const params = this.helper.buildChatParams(baseOptions, {
        ...optimizedOptions,
        context,
      });

      yield* this.helper.createChatStream(languageModel, params, {
        enableToolStreaming: true,
        callbacks: {
          onError: (error) => {
            runtimeLogger.error(
              `OpenAI context-aware chat streaming failed:`,
              error
            );
            throw this.helper.handleError(
              error,
              'streamChatWithContext',
              modelToUse
            );
          },
        },
      });
    } catch (error) {
      runtimeLogger.error(
        `OpenAI context-aware chat streaming setup failed:`,
        error as Error
      );
      throw error;
    }
  }
}

// Export factory function for easy instantiation
export function createOpenAIPortal(config: OpenAIConfig): OpenAIPortal {
  return new OpenAIPortal(config);
}

// Export default configuration
export const defaultOpenAIConfig: Partial<OpenAIConfig> = {
  model: 'gpt-4o-mini',
  chatModel: 'gpt-4o-mini', // Default for regular chat
  toolModel: 'gpt-4o-mini', // Fast model for tools/functions
  embeddingModel: 'text-embedding-3-large',
  imageModel: 'dall-e-3',
  maxTokens: 1000,
  temperature: 0.7,
  timeout: 30000,
};

// Available OpenAI models
export const openAIModels = {
  // Latest GPT-4 Series
  'gpt-4o': 'GPT-4o - Advanced multimodal model',
  'gpt-4o-mini': 'GPT-4o Mini - Fast and cost-effective',
  'gpt-4-turbo': 'GPT-4 Turbo - Enhanced performance',
  'gpt-4': 'GPT-4 - Original flagship model',

  // Advanced Reasoning Models
  'o1-preview': 'o1 Preview - Advanced reasoning',
  'o1-mini': 'o1 Mini - Compact reasoning model',

  // Embedding Models
  'text-embedding-3-large':
    'Text Embedding 3 Large - High-dimensional embeddings',
  'text-embedding-3-small': 'Text Embedding 3 Small - Efficient embeddings',
};

// Available OpenAI embedding models
export const openAIEmbeddingModels = {
  'text-embedding-3-large': 'Text Embedding 3 Large - 3072 dimensions',
  'text-embedding-3-small': 'Text Embedding 3 Small - 1536 dimensions',
};

// Available OpenAI image models
export const openAIImageModels = {
  'dall-e-3': 'DALL-E 3 - High quality image generation',
};
