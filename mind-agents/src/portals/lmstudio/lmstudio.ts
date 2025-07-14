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
  MessageRole,
  FinishReason,
} from '../../types/portal';
import { BasePortal } from '../base-portal';
import { convertUsage } from '../utils';
import { buildObject } from '../../utils/type-helpers';
/**
 * LM Studio Local AI Portal
 *
 * Local model serving with OpenAI-compatible API endpoints, advanced model management,
 * GPU acceleration, and privacy-first design for local inference
 */

export interface LMStudioConfig extends PortalConfig {
  /** Base URL for LM Studio server (default: http://localhost:1234) */
  baseUrl?: string;
  /** API version for OpenAI compatibility (default: v1) */
  apiVersion?: string;
  /** Default model to use for inference */
  model?: string;
  /** Enable GPU acceleration */
  enableGPU?: boolean;
  /** Number of GPU layers to offload */
  gpuLayers?: number;
  /** Context window size */
  contextSize?: number;
  /** Number of threads for CPU inference */
  threads?: number;
  /** Batch size for processing */
  batchSize?: number;
  /** Enable memory mapping */
  enableMmap?: boolean;
  /** Enable memory locking */
  enableMlock?: boolean;
  /** Repetition penalty for reducing repetitive output */
  repetitionPenalty?: number;
  /** Top-k sampling parameter */
  topK?: number;
  /** Typical P sampling parameter */
  typicalP?: number;
  /** Tail free sampling parameter */
  tfsZ?: number;
  /** Mirostat sampling mode */
  mirostat?: number;
  /** Mirostat tau parameter */
  mirostatTau?: number;
  /** Mirostat eta parameter */
  mirostatEta?: number;
  /** Repeat last N tokens for repetition penalty */
  repeatLastN?: number;
  /** Penalize newline characters */
  penalizeNewline?: boolean;
  /** Flash attention support */
  enableFlashAttention?: boolean;
  /** Model precision (fp16, fp32, q4_0, q4_1, q5_0, q5_1, q8_0) */
  precision?: 'fp16' | 'fp32' | 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0';
  /** Server startup options */
  serverOptions?: {
    port?: number;
    host?: string;
    cors?: boolean;
    verbose?: boolean;
  };
  /** Privacy settings */
  enablePrivacyMode?: boolean;
  enableOfflineMode?: boolean;
  enableTelemetry?: boolean;
  /** Performance settings */
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  keepAlive?: boolean;
}

export interface LMStudioModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission?: any[];
  root?: string;
  parent?: string;
  /** LM Studio specific metadata */
  metadata?: {
    name: string;
    description?: string;
    size: number;
    format: string;
    family: string;
    parameter_count?: string;
    quantization?: string;
    context_length?: number;
    architecture?: string;
    tokenizer?: string;
    vocabulary_size?: number;
    capabilities?: string[];
    performance?: {
      tokens_per_second?: number;
      memory_usage?: number;
      gpu_utilization?: number;
    };
  };
}

export interface LMStudioServerStatus {
  status: 'running' | 'stopped' | 'starting' | 'error';
  version: string;
  port: number;
  host: string;
  models_loaded: number;
  gpu_enabled: boolean;
  gpu_memory_used?: number;
  gpu_memory_total?: number;
  system_memory_used: number;
  system_memory_total: number;
  uptime: number;
  requests_served: number;
  errors: number;
}

export interface LMStudioChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  /** LM Studio specific options */
  repetition_penalty?: number;
  top_k?: number;
  typical_p?: number;
  tfs_z?: number;
  mirostat?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  repeat_last_n?: number;
  penalize_nl?: boolean;
}

export interface LMStudioChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    logprobs?: any;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** LM Studio specific metadata */
  system_fingerprint?: string;
  performance?: {
    generation_time: number;
    tokens_per_second: number;
    memory_usage: number;
  };
}

export const defaultLMStudioConfig: Partial<LMStudioConfig> = {
  baseUrl: 'http://localhost:1234',
  apiVersion: 'v1',
  model: 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
  maxTokens: 4096,
  temperature: 0.7,
  timeout: 120000,
  enableGPU: true,
  gpuLayers: -1, // Use all available GPU layers
  contextSize: 8192,
  threads: -1, // Auto-detect optimal thread count
  batchSize: 512,
  enableMmap: true,
  enableMlock: false,
  enableFlashAttention: true,
  precision: 'q4_0',
  enablePrivacyMode: true,
  enableOfflineMode: true,
  enableTelemetry: false,
  maxConcurrentRequests: 4,
  requestTimeout: 300000,
  keepAlive: true,
  serverOptions: {
    port: 1234,
    host: '127.0.0.1',
    cors: true,
    verbose: false,
  },
};

export const lmStudioModels = [
  // Llama models
  'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
  'lmstudio-community/Meta-Llama-3.1-70B-Instruct-GGUF',
  'lmstudio-community/Meta-Llama-3.2-1B-Instruct-GGUF',
  'lmstudio-community/Meta-Llama-3.2-3B-Instruct-GGUF',
  'lmstudio-community/Llama-3.2-90B-Vision-Instruct-GGUF',

  // Mistral models
  'lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF',
  'lmstudio-community/Mixtral-8x7B-Instruct-v0.1-GGUF',
  'lmstudio-community/Mixtral-8x22B-Instruct-v0.1-GGUF',

  // Gemma models
  'lmstudio-community/gemma-2-9b-it-GGUF',
  'lmstudio-community/gemma-2-27b-it-GGUF',

  // Code models
  'lmstudio-community/CodeLlama-7B-Instruct-GGUF',
  'lmstudio-community/CodeLlama-13B-Instruct-GGUF',
  'lmstudio-community/CodeLlama-34B-Instruct-GGUF',
  'lmstudio-community/StarCoder2-15B-Instruct-v0.1-GGUF',

  // Specialized models
  'lmstudio-community/Phi-3-mini-4k-instruct-GGUF',
  'lmstudio-community/Phi-3-medium-4k-instruct-GGUF',
  'lmstudio-community/Qwen2-7B-Instruct-GGUF',
  'lmstudio-community/Qwen2-72B-Instruct-GGUF',

  // Embedding models
  'lmstudio-community/nomic-embed-text-v1.5-GGUF',
  'lmstudio-community/bge-large-en-v1.5-GGUF',
  'lmstudio-community/all-MiniLM-L6-v2-GGUF',
];

export class LMStudioPortal extends BasePortal {
  type = PortalType.LMSTUDIO;
  supportedModels = [
    ModelType.TEXT_GENERATION,
    ModelType.CHAT,
    ModelType.CODE_GENERATION,
    ModelType.EMBEDDING,
  ];

  private baseUrl: string;
  private apiVersion: string;
  private activeRequests: Set<string> = new Set();
  private modelCache: Map<string, LMStudioModelInfo> = new Map();
  private serverStatus: LMStudioServerStatus | null = null;
  private lastHealthCheck: Date | null = null;

  constructor(config: LMStudioConfig) {
    super('lmstudio-local', 'LM Studio Local AI', '1.0.0', config);
    const lmStudioConfig = config as LMStudioConfig;
    this.baseUrl = lmStudioConfig.baseUrl || 'http://localhost:1234';
    this.apiVersion = lmStudioConfig.apiVersion || 'v1';
  }

  override async init(agent: Agent): Promise<void> {
    this.status = PortalStatus.INITIALIZING;
    console.log(`🎯 Initializing LM Studio portal for agent ${agent.name}`);

    try {
      await this.validateConfig();
      await this.healthCheck();
      await this.loadAvailableModels();
      this.status = PortalStatus.ACTIVE;
      console.log(`✅ LM Studio portal initialized for ${agent.name}`);
    } catch (error) {
      this.status = PortalStatus.ERROR;
      console.error(`❌ Failed to initialize LM Studio portal:`, error);
      throw error;
    }
  }

  protected override async validateConfig(): Promise<void> {
    const config = this.config as LMStudioConfig;

    if (!config.model) {
      throw new Error('Model name is required for LM Studio portal');
    }

    // Test connection to LM Studio server
    try {
      const response = await this.makeRequest('/health', {}, 'GET');
      if (!response || response.status !== 'ok') {
        throw new Error('LM Studio server is not responding correctly');
      }
    } catch (error) {
      throw new Error(
        `Cannot connect to LM Studio server at ${this.baseUrl}. Please ensure LM Studio is running with server enabled.`
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {}, 'GET');
      this.lastHealthCheck = new Date();

      // Update server status if available
      if (response.server_status) {
        this.serverStatus = response.server_status;
      }

      return response.status === 'ok';
    } catch (error) {
      console.error('LM Studio health check failed:', error);
      return false;
    }
  }

  async loadAvailableModels(): Promise<void> {
    try {
      const models = await this.listModels();
      this.modelCache.clear();

      models.forEach((model) => {
        this.modelCache.set(model.id, model);
      });

      console.log(`📚 Loaded ${models.length} available models`);
    } catch (error) {
      console.warn(`⚠️ Could not load model list: ${error}`);
    }
  }

  async listModels(): Promise<LMStudioModelInfo[]> {
    try {
      const response = await this.makeRequest(
        `/${this.apiVersion}/models`,
        {},
        'GET'
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to list LM Studio models:', error);
      return [];
    }
  }

  async generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult> {
    const config = this.config as LMStudioConfig;
    const model = options?.model || config.model!;

    // Convert to chat format for consistency
    const messages: ChatMessage[] = [
      {
        role: MessageRole.USER,
        content: prompt,
      },
    ];

    const chatResult = await this.generateChat(messages, options);

    return buildObject<TextGenerationResult>({
      text: chatResult.text,
    })
      .addOptional('model', chatResult.model)
      .addOptional('usage', chatResult.usage)
      .addOptional('finishReason', chatResult.finishReason)
      .addOptional('timestamp', chatResult.timestamp)
      .addOptional('metadata', chatResult.metadata)
      .build();
  }

  async generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult> {
    const config = this.config as LMStudioConfig;
    const model = options?.model || config.model!;

    const requestBody: LMStudioChatCompletionRequest =
      buildObject<LMStudioChatCompletionRequest>({
        model,
        messages: this.convertMessagesToOpenAIFormat(messages),
        stream: false,
      })
        .addOptional('max_tokens', options?.maxTokens ?? config.maxTokens)
        .addOptional('temperature', options?.temperature ?? config.temperature)
        .addOptional('top_p', options?.topP)
        .addOptional('stop', options?.stop)
        .addOptional('presence_penalty', options?.presencePenalty)
        .addOptional('frequency_penalty', options?.frequencyPenalty)
        // LM Studio specific options
        .addOptional('repetition_penalty', config.repetitionPenalty)
        .addOptional('top_k', config.topK)
        .addOptional('typical_p', config.typicalP)
        .addOptional('tfs_z', config.tfsZ)
        .addOptional('mirostat', config.mirostat)
        .addOptional('mirostat_tau', config.mirostatTau)
        .addOptional('mirostat_eta', config.mirostatEta)
        .addOptional('repeat_last_n', config.repeatLastN)
        .addOptional('penalize_nl', config.penalizeNewline)
        .build();

    try {
      const requestId = this.generateRequestId();
      this.activeRequests.add(requestId);

      const response = await this.makeRequest(
        `/${this.apiVersion}/chat/completions`,
        requestBody
      );

      this.activeRequests.delete(requestId);
      return this.parseChatResponse(response, model, messages);
    } catch (error) {
      throw new Error(`LM Studio chat generation failed: ${error}`);
    }
  }

  async generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const config = this.config as LMStudioConfig;
    const model = options?.model || 'nomic-embed-text';

    const requestBody = {
      model,
      input: text,
      encoding_format: 'float',
    };

    try {
      const response = await this.makeRequest(
        `/${this.apiVersion}/embeddings`,
        requestBody
      );

      if (!response.data || !response.data[0]?.embedding) {
        throw new Error('Invalid embedding response format');
      }

      const embedding = response.data[0].embedding;

      return {
        embedding,
        dimensions: embedding.length,
        model,
        usage: response.usage || {
          promptTokens: text.length,
          totalTokens: text.length,
        },
      };
    } catch (error) {
      throw new Error(`LM Studio embedding generation failed: ${error}`);
    }
  }

  override async *streamText(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string> {
    const config = this.config as LMStudioConfig;
    const model = options?.model || config.model!;

    // Convert to chat format for streaming
    const messages: ChatMessage[] = [
      {
        role: MessageRole.USER,
        content: prompt,
      },
    ];

    yield* this.streamChat(messages, options);
  }

  override async *streamChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string> {
    const config = this.config as LMStudioConfig;
    const model = options?.model || config.model!;

    const requestBody: LMStudioChatCompletionRequest =
      buildObject<LMStudioChatCompletionRequest>({
        model,
        messages: this.convertMessagesToOpenAIFormat(messages),
        stream: true,
      })
        .addOptional('max_tokens', options?.maxTokens ?? config.maxTokens)
        .addOptional('temperature', options?.temperature ?? config.temperature)
        .addOptional('top_p', options?.topP)
        .addOptional('stop', options?.stop)
        .addOptional('presence_penalty', options?.presencePenalty)
        .addOptional('frequency_penalty', options?.frequencyPenalty)
        .build();

    try {
      const response = await this.makeStreamRequest(
        `/${this.apiVersion}/chat/completions`,
        requestBody
      );

      for await (const chunk of response) {
        if (chunk.choices?.[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }

        if (chunk.choices?.[0]?.finish_reason) {
          break;
        }
      }
    } catch (error) {
      throw new Error(`LM Studio chat streaming failed: ${error}`);
    }
  }

  override hasCapability(capability: PortalCapability): boolean {
    switch (capability) {
      case PortalCapability.TEXT_GENERATION:
      case PortalCapability.CHAT_GENERATION:
      case PortalCapability.EMBEDDING_GENERATION:
      case PortalCapability.STREAMING:
        return true;
      case PortalCapability.FUNCTION_CALLING:
        // LM Studio supports function calling for compatible models
        return true;
      case PortalCapability.IMAGE_GENERATION:
      case PortalCapability.VISION:
      case PortalCapability.AUDIO:
        return false;
      default:
        return false;
    }
  }

  /**
   * Get current server status and performance metrics
   */
  async getServerStatus(): Promise<LMStudioServerStatus | null> {
    try {
      const response = await this.makeRequest('/status', {}, 'GET');
      this.serverStatus = response;
      return response;
    } catch {
      return this.serverStatus;
    }
  }

  /**
   * Get model information and capabilities
   */
  async getModelInfo(modelId: string): Promise<LMStudioModelInfo | null> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId)!;
    }

    try {
      const response = await this.makeRequest(
        `/${this.apiVersion}/models/${modelId}`,
        {},
        'GET'
      );
      this.modelCache.set(modelId, response);
      return response;
    } catch {
      return null;
    }
  }

  /**
   * Get privacy and security status
   */
  getPrivacyStatus(): {
    offlineMode: boolean;
    privacyMode: boolean;
    dataRetention: string;
    localProcessing: boolean;
    telemetryEnabled: boolean;
  } {
    const config = this.config as LMStudioConfig;

    return {
      offlineMode: config.enableOfflineMode ?? true,
      privacyMode: config.enablePrivacyMode ?? true,
      dataRetention: 'No data retention - all processing is local',
      localProcessing: true,
      telemetryEnabled: config.enableTelemetry ?? false,
    };
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    method: string = 'POST'
  ): Promise<any> {
    const config = this.config as LMStudioConfig;
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(this.config.headers || {}),
      },
      signal: AbortSignal.timeout(config.requestTimeout || 300000),
    };

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    } else {
      return response.text();
    }
  }

  private async makeStreamRequest(
    endpoint: string,
    body: any
  ): Promise<AsyncGenerator<any>> {
    const config = this.config as LMStudioConfig;
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(this.config.headers || {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.requestTimeout || 300000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return this.parseStreamResponse(response);
  }

  private async *parseStreamResponse(response: Response): AsyncGenerator<any> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private convertMessagesToOpenAIFormat(
    messages: ChatMessage[]
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    return messages.map((message) => ({
      role: this.mapRole(message.role),
      content: message.content,
    }));
  }

  private mapRole(role: MessageRole): 'system' | 'user' | 'assistant' {
    switch (role) {
      case MessageRole.SYSTEM:
        return 'system';
      case MessageRole.USER:
        return 'user';
      case MessageRole.ASSISTANT:
        return 'assistant';
      default:
        return 'user';
    }
  }

  private parseChatResponse(
    response: LMStudioChatCompletionResponse,
    model: string,
    originalMessages: ChatMessage[]
  ): ChatGenerationResult {
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from LM Studio');
    }

    const choice = response.choices[0];
    const text = choice.message.content;

    const message: ChatMessage = {
      role: MessageRole.ASSISTANT,
      content: text,
      timestamp: new Date(),
    };

    return {
      text,
      model,
      message,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
      timestamp: new Date(),
      metadata: {
        id: response.id,
        created: response.created,
        systemFingerprint: response.system_fingerprint,
        performance: response.performance,
      },
    };
  }

  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.LENGTH;
      case 'function_call':
        return FinishReason.FUNCTION_CALL;
      case 'content_filter':
        return FinishReason.CONTENT_FILTER;
      default:
        return FinishReason.STOP;
    }
  }

  private generateRequestId(): string {
    return `lmstudio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createLMStudioPortal(config: LMStudioConfig): LMStudioPortal {
  return new LMStudioPortal({
    ...defaultLMStudioConfig,
    ...config,
  });
}
