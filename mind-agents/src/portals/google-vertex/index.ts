/**
 * Google Vertex AI Portal
 *
 * Advanced AI portal supporting Google's Vertex AI platform with comprehensive
 * multimodal capabilities using AI SDK v5
 */

import { vertex } from '@ai-sdk/google-vertex';
import { generateText, streamText, embed } from 'ai';

import { Agent } from '../../types/agent';
import {
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  EmbeddingOptions,
  EmbeddingResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  MessageRole,
  MessageType,
  FinishReason,
} from '../../types/portal';
import type {
  LanguageModel,
  AIMessage as ModelMessage,
} from '../../types/portals/ai-sdk';
import { BasePortal } from '../base-portal';
import { convertUsage, buildAISDKParams } from '../utils';

// AI SDK v5 compatible types - removed old Vertex AI SDK types
// All functionality now uses AI SDK v5 through the vertex provider

export interface GoogleVertexConfig extends PortalConfig {
  projectId: string;
  location?: string;
  model?: string;
  maxOutputTokens?: number;
  safetySettings?: SafetySetting[];
  generationConfig?: GenerationConfig;
  systemInstruction?: string;
  tools?: Tool[];
  googleAuthOptions?: Record<string, unknown>;
}

export interface SafetySetting {
  category: string;
  threshold: string;
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  stopSequences?: string[];
}

export interface Tool {
  functionDeclarations?: FunctionDeclaration[];
  codeExecution?: CodeExecutionTool;
  googleSearchRetrieval?: GoogleSearchRetrievalTool;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CodeExecutionTool {
  enabled: boolean;
}

export interface GoogleSearchRetrievalTool {
  enabled: boolean;
}

export interface VertexPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

export interface VertexContent {
  role: 'user' | 'model';
  parts: VertexPart[];
}

export interface VertexResponse {
  candidates: Array<{
    content: {
      parts: VertexPart[];
      role: string;
    };
    finishReason?: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
    blockReason?: string;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export const defaultVertexConfig: Partial<GoogleVertexConfig> = {
  location: 'us-central1',
  model: 'gemini-1.5-pro',
  maxOutputTokens: 8192,
  temperature: 0.7,
  timeout: 60000,
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  },
};

export const vertexModels = [
  'gemini-1.5-pro',
  'gemini-1.5-pro-001',
  'gemini-1.5-pro-002',
  'gemini-1.5-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.0-pro',
  'gemini-1.0-pro-001',
  'gemini-1.0-pro-vision-001',
  'text-embedding-004',
  'text-multilingual-embedding-002',
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001',
];

export class GoogleVertexPortal extends BasePortal {
  type = PortalType.GOOGLE_VERTEX;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.MULTIMODAL,
    ModelType.EMBEDDING,
    ModelType.CODE_GENERATION,
    ModelType.IMAGE_GENERATION,
  ];

  private vertexProvider: typeof vertex;
  private projectId: string;
  private location: string;

  constructor(config: GoogleVertexConfig) {
    super('google-vertex', 'Google Vertex AI', '1.0.0', config);
    this.projectId =
      config.projectId || process.env["GOOGLE_VERTEX_PROJECT"] || '';
    this.location =
      config.location || process.env["GOOGLE_VERTEX_LOCATION"] || 'us-central1';
    this.vertexProvider = vertex;
  }

  protected override getDefaultModel(
    type: 'chat' | 'tool' | 'embedding' | 'image'
  ): string {
    switch (type) {
      case 'chat':
        return 'gemini-1.5-pro';
      case 'tool':
        return 'gemini-1.5-flash';
      case 'embedding':
        return 'text-embedding-004';
      case 'image':
        return 'imagen-3.0-generate-001';
      default:
        return 'gemini-1.5-pro';
    }
  }

  override async init(_agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    // Initializing Google Vertex AI portal for agent

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      // Google Vertex AI portal initialized successfully
    } catch (error) {
      void error;
      this.status = PortalStatus.ERROR;
      // Failed to initialize Google Vertex AI portal
      throw error;
    }
  }

  protected override async validateConfig(): Promise<void> {
    if (!this.projectId) {
      throw new Error('Project ID is required for Google Vertex AI portal');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.getLanguageModel('gemini-1.5-flash');
      const { text } = await generateText({
        model: model as any,
        prompt: 'Hello',
        maxOutputTokens: 10,
      });
      return text.length > 0;
    } catch {
      // Google Vertex AI health check failed
      return false;
    }
  }

  /**
   * Get language model instance for AI SDK v5
   */
  private getLanguageModel(modelId?: string) {
    const model =
      modelId || (this.config as GoogleVertexConfig).model || 'gemini-1.5-pro';
    const config = this.config as GoogleVertexConfig;
    const vertexConfig: any = {
      projectId: this.projectId,
      location: this.location,
      structuredOutputs: true,
    };

    if (config.safetySettings) {
      vertexConfig.safetySettings = config.safetySettings;
    }

    if (config.generationConfig) {
      vertexConfig.generationConfig = config.generationConfig;
    }

    return this.vertexProvider(model, vertexConfig);
  }

  async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    try {
      const params: any = {
        model: model as any,
        prompt,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
      };

      const topP = options?.topP || config.generationConfig?.topP;
      if (topP !== undefined) {
        params.topP = topP;
      }

      if (config.generationConfig?.topK !== undefined) {
        params.topK = config.generationConfig.topK;
      }

      const { text, usage, finishReason } = await generateText(params);

      return {
        text,
        model: options?.model || this.resolveModel('chat'),
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      void error;
      throw new Error(`Google Vertex AI text generation failed: ${error}`);
    }
  }

  async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    const convertedMessages = this.convertToModelMessages(messages);

    try {
      const params: any = {
        model: model as any,
        messages: convertedMessages,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
      };

      const topP = options?.topP || config.generationConfig?.topP;
      if (topP !== undefined) {
        params.topP = topP;
      }

      if (config.generationConfig?.topK !== undefined) {
        params.topK = config.generationConfig.topK;
      }

      const { text, usage, finishReason } = await generateText(params);

      const message: ChatMessage = {
        role: MessageRole.ASSISTANT,
        content: text,
        timestamp: new Date(),
      };

      return {
        text,
        model: options?.model || this.resolveModel('chat'),
        message,
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
      void error;
      throw new Error(`Google Vertex AI chat generation failed: ${error}`);
    }
  }

  async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      const model = options?.model || 'text-embedding-004';

      // Create embedding model instance with proper configuration
      const embeddingModel = this.vertexProvider.textEmbeddingModel(model);

      const { embedding, usage } = await embed({
        model: embeddingModel as any, // Cast to resolve v1/v2 compatibility
        value: text,
        providerOptions: {
          google: {
            outputDimensionality: options?.dimensions || 768,
            taskType: 'SEMANTIC_SIMILARITY', // Default task type
          },
        },
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
          provider: 'google-vertex',
          taskType: 'SEMANTIC_SIMILARITY',
        },
      };
    } catch (error) {
      void error;
      throw new Error(`Google Vertex AI embedding generation failed: ${error}`);
    }
  }

  override async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const model = options?.model || this.resolveModel('image');

    try {
      // Use the AI SDK v5 approach for image generation
      const imageModel = this.getLanguageModel(model);

      // Create a structured prompt for image generation
      const imagePrompt = {
        prompt,
        n: options?.n || 1,
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        style: options?.style || 'natural',
      };

      // Note: Vertex AI Imagen requires special configuration
      // This is a placeholder implementation that demonstrates the pattern
      // In production, you would need to use the Imagen-specific API endpoint
      const result = await generateText({
        model: imageModel as any,
        messages: [
          {
            role: 'system' as const,
            content:
              'You are an image generation model. Generate images based on the prompt.',
          },
          {
            role: 'user' as const,
            content: JSON.stringify(imagePrompt),
          },
        ],
        maxOutputTokens: 100,
        providerOptions: {
          google: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                images: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      revisedPrompt: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Parse the response
      const responseData = JSON.parse(result.text);

      if (!responseData.images || responseData.images.length === 0) {
        throw new Error('No images generated');
      }

      return {
        images: responseData.images.map((img: any) => ({
          url: img.url,
          width: parseInt(options?.size?.split('x')[0] || '1024'),
          height: parseInt(options?.size?.split('x')[1] || '1024'),
          revisedPrompt: img.revisedPrompt,
        })),
        model,
        usage: convertUsage(result.usage),
        metadata: {
          provider: 'google-vertex',
          generatedAt: new Date(),
          quality: options?.quality || 'standard',
          style: options?.style || 'natural',
        },
      };
    } catch (error) {
      // Imagen API may not be available in all regions or require special access
      // For now, we provide a clear error message
      throw new Error(
        `Google Vertex AI image generation is not yet fully supported through AI SDK v5. ` +
          `Imagen API requires special access and configuration. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    try {
      const baseParams = {
        model,
        prompt,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
      };

      // Build params with only defined values to avoid type errors
      const optionalParams: Record<string, unknown> = {};
      const topP = options?.topP || config.generationConfig?.topP;
      if (topP !== undefined) {
        optionalParams.topP = topP;
      }
      
      const params = buildAISDKParams(baseParams, optionalParams);

      const { textStream } = await streamText(params as any);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      throw new Error(`Google Vertex AI text streaming failed: ${error}`);
    }
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    const convertedMessages = this.convertToModelMessages(messages);

    try {
      const params: any = {
        model: model as any,
        messages: convertedMessages,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
      };

      const topP = options?.topP || config.generationConfig?.topP;
      if (topP !== undefined) {
        params.topP = topP;
      }

      if (config.generationConfig?.topK !== undefined) {
        params.topK = config.generationConfig.topK;
      }

      const { textStream } = await streamText(params as any);

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      void error;
      throw new Error(`Google Vertex AI chat streaming failed: ${error}`);
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.STREAMING:
      case PortalCapability.FUNCTION_CALLING:
      case PortalCapability.VISION:
      case PortalCapability.EVALUATION:
        return true;
      case PortalCapability.AUDIO:
        return false; // Not yet supported
      default:
        return false;
    }
  }

  /**
   * Convert ChatMessage array to message format for AI SDK v5
   */
  private convertToModelMessages(messages: ChatMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      const message: ModelMessage = {
        role: msg.role as any, // Cast to resolve role compatibility
        content: msg.content,
      };

      // Handle attachments for multimodal support
      if (msg.attachments && msg.attachments.length > 0) {
        const content: Array<{
          type: string;
          text?: string;
          image?: string | URL;
          mimeType?: string;
        }> = [{ type: 'text', text: msg.content }];

        for (const attachment of msg.attachments) {
          if (attachment.type === MessageType.IMAGE) {
            if (attachment.data) {
              content.push({
                type: 'image',
                image: attachment.data,
                mimeType: attachment.mimeType,
              });
            } else if (attachment.url) {
              content.push({
                type: 'image',
                image: new URL(attachment.url),
              });
            }
          }
        }

        message.content = content as any; // Cast to resolve content type compatibility
      }

      // Handle function calls - Note: toolInvocations property may not be available on all message types
      if (msg.functionCall) {
        (message as any).toolInvocations = [
          {
            toolCallId: msg.functionCall.name, // Use name as ID if no ID provided
            toolName: msg.functionCall.name,
            args: JSON.parse(msg.functionCall.arguments),
          },
        ];
      }

      return message;
    });
  }

  // Removed old response parsing methods - now handled by AI SDK v5 directly

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'content-filter':
        return FinishReason.CONTENT_FILTER;
      case 'tool-calls':
        return FinishReason.STOP; // Map to STOP since TOOL_CALLS might not exist
      default:
        return FinishReason.STOP;
    }
  }
}

export function createGoogleVertexPortal(
  config: GoogleVertexConfig
): GoogleVertexPortal {
  return new GoogleVertexPortal({
    ...defaultVertexConfig,
    ...config,
  });
}
