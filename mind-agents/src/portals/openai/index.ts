/**
 * OpenAI Portal Implementation
 *
 * This portal provides integration with OpenAI's API using the Vercel AI SDK v5.
 * It supports text generation, chat completion, embeddings, and image generation.
 */

import { openai, createOpenAI } from '@ai-sdk/openai';
import {
  generateText,
  streamText,
  embed,
  embedMany,
  experimental_generateImage as generateImage,
  tool,
  // stepCountIs, // Not available in ai@5.0.0-canary.24
} from 'ai';
import type { ModelMessage as AIMessage } from 'ai';

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
  FinishReason,
  PortalType,
  ModelType,
} from '../../types/portal';
import type {
  LanguageModel,
  AIMessage as ModelMessage,
  GenerateTextParamsWithTools,
} from '../../types/portals/ai-sdk';
import { AISDKParameterBuilder } from '../ai-sdk-utils';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

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

  constructor(config: OpenAIConfig) {
    super('openai', 'OpenAI', '1.0.0', config);

    // Create OpenAI provider with proper AI SDK v5 configuration
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const providerConfig: any = {
      apiKey,
    };

    if (config.organization) {
      providerConfig.organization = config.organization;
    }

    if (config.baseURL) {
      providerConfig.baseURL = config.baseURL;
    }

    this.openaiProvider = createOpenAI(providerConfig);
  }

  /**
   * Get language model instance using AI SDK v5 patterns
   */
  private getLanguageModel(modelId?: string) {
    const model =
      modelId || (this.config as OpenAIConfig).model || 'gpt-4o-mini';

    return this.openaiProvider(model);
  }

  /**
   * Convert ChatMessage array to message format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): AIMessage[] {
    return messages.map((msg) => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };

        case MessageRole.USER: {
          // Handle attachments for multimodal support
          if (msg.attachments && msg.attachments.length > 0) {
            type TextPart = { type: 'text'; text: string };
            type ImagePart = {
              type: 'image';
              image: string | URL;
              mediaType?: string;
            };
            const content: Array<TextPart | ImagePart> = [
              { type: 'text', text: msg.content },
            ];

            for (const attachment of msg.attachments) {
              if (attachment.type === 'image') {
                if (attachment.data) {
                  content.push({
                    type: 'image',
                    image: attachment.data,
                    mediaType: attachment.mimeType,
                  });
                } else if (attachment.url) {
                  content.push({
                    type: 'image',
                    image: new URL(attachment.url),
                  });
                }
              }
            }

            return { role: 'user', content };
          } else {
            return { role: 'user', content: msg.content };
          }
        }

        case MessageRole.ASSISTANT:
          return { role: 'assistant', content: msg.content };

        case MessageRole.TOOL:
          return {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId: '',
                toolName: '',
                result: msg.content,
              },
            ],
          };

        case MessageRole.FUNCTION:
          // Convert function messages to assistant messages for compatibility
          return { role: 'assistant', content: msg.content };

        default:
          return { role: 'user', content: msg.content };
      }
    });
  }

  /**
   * Generate text using OpenAI's completion API
   */
  override async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    try {
      const model =
        options?.model || (this.config as OpenAIConfig).model || 'gpt-4o-mini';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
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

      if (options?.frequencyPenalty) {
        params.frequencyPenalty = options.frequencyPenalty;
      }

      if (options?.presencePenalty) {
        params.presencePenalty = options.presencePenalty;
      }

      const result = await generateText(params);

      return {
        text: result.text,
        usage: convertUsage(result.usage),
        metadata: {
          model,
          provider: 'openai',
        },
      };
    } catch (error) {
      void error;
      // OpenAI text generation error
      throw new Error(`OpenAI text generation failed: ${error}`);
    }
  }

  /**
   * Generate chat response using OpenAI's chat completion API
   */
  override async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    try {
      // Intelligent model selection based on use case
      let model: string;

      if (options?.model) {
        // Use explicitly specified model
        model = options.model;
      } else if (options?.functions && options.functions.length > 0) {
        // Use tool model for function calling (faster, cheaper)
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4o-mini';
      } else {
        // Use chat model for regular conversations
        model =
          (this.config as OpenAIConfig).chatModel ||
          (this.config as OpenAIConfig).model ||
          'gpt-4o-mini';
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const generateOptions: any = { ...baseOptions };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        generateOptions.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        generateOptions.temperature =
          options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        generateOptions.topP = options.topP;
      }

      if (options?.frequencyPenalty) {
        generateOptions.frequencyPenalty = options.frequencyPenalty;
      }

      if (options?.presencePenalty) {
        generateOptions.presencePenalty = options.presencePenalty;
      }

      // Add tools if provided (native AI SDK v5 tools)
      if (options?.tools) {
        generateOptions.tools = options.tools;
        generateOptions.maxSteps = options?.maxSteps || 5; // Enable multi-step tool execution

        // Add comprehensive tool streaming callbacks
        if (options?.onStepFinish) {
          generateOptions.onStepFinish = options.onStepFinish;
        }
      }

      const result = await generateText(generateOptions);

      return {
        text: result.text,
        message: {
          role: MessageRole.ASSISTANT,
          content: result.text,
        },
        usage: convertUsage(result.usage),
        finishReason: this.mapFinishReason(result.finishReason),
        metadata: {
          model,
          provider: 'openai',
        },
      };
    } catch (error) {
      void error;
      // OpenAI chat generation error
      throw new Error(`OpenAI chat generation failed: ${error}`);
    }
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
            style: options?.style,
            response_format: options?.responseFormat || 'url',
          },
        },
      });

      return {
        images: result.images.map((img) => ({
          url: undefined, // AI SDK v5 doesn't return URLs directly
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
   * Stream text generation for real-time responses
   */
  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    try {
      const model =
        options?.model || (this.config as OpenAIConfig).model || 'gpt-4o-mini';

      const baseParams = {
        model: this.getLanguageModel(model),
        prompt,
      };

      const params: any = { ...baseParams };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
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

      if (options?.frequencyPenalty) {
        params.frequencyPenalty = options.frequencyPenalty;
      }

      if (options?.presencePenalty) {
        params.presencePenalty = options.presencePenalty;
      }

      const { textStream } = await streamText(params);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      // OpenAI stream text error
      throw new Error(`OpenAI stream text failed: ${error}`);
    }
  }

  /**
   * Stream chat generation for real-time responses
   */
  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    try {
      // Intelligent model selection for streaming
      let model: string;

      if (options?.model) {
        model = options.model;
      } else if (options?.functions && options.functions.length > 0) {
        model = (this.config as OpenAIConfig).toolModel || 'gpt-4o-mini';
      } else {
        model =
          (this.config as OpenAIConfig).chatModel ||
          (this.config as OpenAIConfig).model ||
          'gpt-4o-mini';
      }

      const modelMessages = this.convertToModelMessages(messages);

      const baseOptions = {
        model: this.getLanguageModel(model),
        messages: modelMessages,
      };

      const streamOptions: any = { ...baseOptions };

      // Use maxOutputTokens (AI SDK v5) instead of maxTokens
      if (
        options?.maxOutputTokens ??
        options?.maxTokens ??
        this.config.maxTokens
      ) {
        streamOptions.maxOutputTokens =
          options?.maxOutputTokens ??
          options?.maxTokens ??
          this.config.maxTokens;
      }

      if (options?.temperature ?? this.config.temperature) {
        streamOptions.temperature =
          options?.temperature ?? this.config.temperature;
      }

      if (options?.topP) {
        streamOptions.topP = options.topP;
      }

      if (options?.frequencyPenalty) {
        streamOptions.frequencyPenalty = options.frequencyPenalty;
      }

      if (options?.presencePenalty) {
        streamOptions.presencePenalty = options.presencePenalty;
      }

      // Add tools if provided with comprehensive AI SDK v5 streaming support
      if (options?.tools) {
        streamOptions.tools = options.tools;
        streamOptions.maxSteps = options?.maxSteps || 5; // Enable multi-step tool execution for streaming

        // Add comprehensive tool streaming callbacks for AI SDK v5
        if (options?.onStepFinish) {
          streamOptions.onStepFinish = options.onStepFinish;
        }

        // Enable tool call streaming (default in AI SDK v5)
        streamOptions.toolCallStreaming = true;
      }

      const { textStream } = await streamText(streamOptions);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      // OpenAI stream chat error
      throw new Error(`OpenAI stream chat failed: ${error}`);
    }
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
          options?.model || this.resolveModel('tool')
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
        model: options?.model || this.resolveModel('tool'),
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
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
          options?.model || this.resolveModel('tool')
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
        model: options?.model || this.resolveModel('tool'),
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
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
          options?.model || this.resolveModel('tool')
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
   * Get supported models for different capabilities
   */
  override getSupportedModelsForCapability(
    capability: PortalCapability
  ): string[] {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      case PortalCapability.EMBEDDING_GENERATION:
        return [
          'text-embedding-3-large',
          'text-embedding-3-small',
          'text-embedding-ada-002',
        ];
      case PortalCapability.IMAGE_GENERATION:
        return ['dall-e-3', 'dall-e-2'];
      case PortalCapability.VISION:
        return ['gpt-4o', 'gpt-4-turbo'];
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      case PortalCapability.REASONING:
        return ['o1', 'o1-mini', 'o1-preview'];
      default:
        return [];
    }
  }

  /**
   * Get the optimal model for a specific capability
   */
  override getOptimalModelForCapability(
    capability: PortalCapability
  ): string | null {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
        return 'gpt-4o-mini'; // Balance of quality and cost
      case PortalCapability.EMBEDDING_GENERATION:
        return 'text-embedding-3-small'; // Good balance
      case PortalCapability.IMAGE_GENERATION:
        return 'dall-e-3'; // Latest and best
      case PortalCapability.VISION:
        return 'gpt-4o'; // Best vision capabilities
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.TOOL_USAGE:
        return 'gpt-4o-mini'; // Fast and capable
      case PortalCapability.REASONING:
        return 'o1-mini'; // Good reasoning at lower cost
      default:
        return null;
    }
  }

  /**
   * Map finish reason from AI SDK to our internal enum
   */
  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'content-filter':
        return FinishReason.CONTENT_FILTER;
      case 'tool-calls':
      case 'function-call':
        return FinishReason.FUNCTION_CALL;
      case 'error':
        return FinishReason.ERROR;
      case 'cancelled':
        return FinishReason.CANCELLED;
      default:
        return FinishReason.STOP;
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
