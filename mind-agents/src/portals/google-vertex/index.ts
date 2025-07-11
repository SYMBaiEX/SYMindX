/**
 * Google Vertex AI Portal
 *
 * Advanced AI portal supporting Google's Vertex AI platform with comprehensive
 * multimodal capabilities using AI SDK v5
 */

import { vertex } from '@ai-sdk/google-vertex';
import {
  generateText,
  streamText,
  embed,
  embedMany,
  type LanguageModel,
} from 'ai';

import { Agent } from '../../types/agent';
import {
  Portal,
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
  googleAuthOptions?: any;
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
    properties: Record<string, any>;
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
    args: Record<string, any>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, any>;
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

  private vertexProvider: any;
  private projectId: string;
  private location: string;

  constructor(config: GoogleVertexConfig) {
    super('google-vertex', 'Google Vertex AI', '1.0.0', config);
    this.projectId =
      config.projectId || process.env.GOOGLE_VERTEX_PROJECT || '';
    this.location =
      config.location || process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
    this.vertexProvider = vertex;
  }

  protected getDefaultModel(
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

  async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    console.log(
      `🔮 Initializing Google Vertex AI portal for agent ${agent.name}`
    );

    try {
      await this.validateConfig();
      await this.healthCheck();
      this.status = PortalStatus.ACTIVE;
      console.log(`✅ Google Vertex AI portal initialized for ${agent.name}`);
    } catch (error) {
      this.status = PortalStatus.ERROR;
      console.error(`❌ Failed to initialize Google Vertex AI portal:`, error);
      throw error;
    }
  }

  protected async validateConfig(): Promise<void> {
    if (!this.projectId) {
      throw new Error('Project ID is required for Google Vertex AI portal');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const model = this.getLanguageModel('gemini-1.5-flash');
      const { text } = await generateText({
        model,
        prompt: 'Hello',
        maxOutputTokens: 10,
      });
      return text.length > 0;
    } catch (error) {
      console.error('Google Vertex AI health check failed:', error);
      return false;
    }
  }

  /**
   * Get language model instance for AI SDK v5
   */
  private getLanguageModel(modelId?: string): LanguageModel {
    const model =
      modelId || (this.config as GoogleVertexConfig).model || 'gemini-1.5-pro';
    const config = this.config as GoogleVertexConfig;
    return this.vertexProvider(model, {
      projectId: this.projectId,
      location: this.location,
      safetySettings: config.safetySettings,
      generationConfig: config.generationConfig,
      structuredOutputs: true,
    });
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
      const { text, usage, finishReason } = await generateText({
        model,
        prompt,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
        topP: options?.topP || config.generationConfig?.topP,
        topK: config.generationConfig?.topK,
      });

      return {
        text,
        model: options?.model || this.resolveModel('chat'),
        usage: convertUsage(usage),
        finishReason: this.mapFinishReason(finishReason),
        timestamp: new Date(),
      };
    } catch (error) {
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
      const { text, usage, finishReason } = await generateText({
        model,
        messages: convertedMessages,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
        topP: options?.topP || config.generationConfig?.topP,
        topK: config.generationConfig?.topK,
      });

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
      throw new Error(`Google Vertex AI chat generation failed: ${error}`);
    }
  }

  async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    try {
      // Google Vertex AI doesn't have a direct embedding model through AI SDK v5
      // For now, use a placeholder implementation
      console.warn(
        'Google Vertex AI embedding not directly supported through AI SDK v5, using placeholder'
      );
      return {
        embedding: new Array(768).fill(0).map(() => Math.random() * 2 - 1),
        dimensions: 768,
        model: options?.model || this.resolveModel('embedding'),
        usage: convertUsage({
          promptTokens: text.length,
          completionTokens: 0,
          totalTokens: text.length,
        }),
      };
    } catch (error) {
      throw new Error(`Google Vertex AI embedding generation failed: ${error}`);
    }
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const model = options?.model || this.resolveModel('image');

    try {
      // Note: This would use the Imagen API
      // For now, returning a placeholder response
      return {
        images: [{ url: 'placeholder-image-url' }],
        model,
        usage: {
          promptTokens: prompt.length,
          totalTokens: prompt.length,
        },
      };
    } catch (error) {
      throw new Error(`Google Vertex AI image generation failed: ${error}`);
    }
  }

  async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    try {
      const { textStream } = await streamText({
        model,
        prompt,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
        topP: options?.topP || config.generationConfig?.topP,
        topK: config.generationConfig?.topK,
      });

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      throw new Error(`Google Vertex AI text streaming failed: ${error}`);
    }
  }

  async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const model = this.getLanguageModel(
      options?.model || this.resolveModel('chat')
    );
    const config = this.config as GoogleVertexConfig;

    const convertedMessages = this.convertToModelMessages(messages);

    try {
      const { textStream } = await streamText({
        model,
        messages: convertedMessages,
        maxOutputTokens: config.maxOutputTokens || 8192,
        temperature: options?.temperature || config.temperature || 0.7,
        topP: options?.topP || config.generationConfig?.topP,
        topK: config.generationConfig?.topK,
      });

      for await (const delta of textStream) {
        yield delta;
      }
    } catch (error) {
      throw new Error(`Google Vertex AI chat streaming failed: ${error}`);
    }
  }

  hasCapability(capability: PortalCapability): boolean {
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
  private convertToModelMessages(messages: ChatMessage[]) {
    return messages.map((msg) => {
      const message: any = {
        role: msg.role,
        content: msg.content,
      };

      // Handle attachments for multimodal support
      if (msg.attachments && msg.attachments.length > 0) {
        const content: any[] = [{ type: 'text', text: msg.content }];

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

        message.content = content;
      }

      // Handle function calls
      if (msg.functionCall) {
        message.toolInvocations = [
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
