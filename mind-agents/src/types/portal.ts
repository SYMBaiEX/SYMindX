/**
 * Portal Types
 *
 * This file defines the interfaces for AI provider portals.
 * Portals are modular connectors to different AI providers like OpenAI, Anthropic, etc.
 */

import { Agent } from './agent';
import { BaseConfig, Metadata, ActionParameters } from './common';

export enum PortalType {
  // Core AI Providers
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',

  // Google AI Portals
  GOOGLE_GENERATIVE = 'google-generative',
  GOOGLE_VERTEX = 'google-vertex',

  // Enterprise AI Portals
  AZURE_OPENAI = 'azure-openai',
  VERCEL_AI = 'vercel-ai',

  // Router & Aggregator Portals
  OPENROUTER = 'openrouter',
  XAI = 'xai',
  KLUSTER_AI = 'kluster.ai',

  // Specialized AI Portals
  MISTRAL = 'mistral',
  COHERE = 'cohere',
  MULTIMODAL = 'multimodal',

  // Local AI Portals
  OLLAMA = 'ollama',
  LMSTUDIO = 'lmstudio',

  // Custom/Extensible
  CUSTOM = 'custom',
}

export enum PortalStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  INITIALIZING = 'initializing',
  RATE_LIMITED = 'rate_limited',
  MAINTENANCE = 'maintenance',
}

export enum ModelType {
  TEXT_GENERATION = 'text_generation',
  CHAT = 'chat',
  EMBEDDING = 'embedding',
  IMAGE_GENERATION = 'image_generation',
  CODE_GENERATION = 'code_generation',
  MULTIMODAL = 'multimodal',
}

/**
 * Base interface for all AI provider portals
 */
export interface Portal {
  id: string;
  name: string;
  version: string;
  type: PortalType;
  enabled: boolean;
  status: PortalStatus;
  config: PortalConfig;
  supportedModels: ModelType[];
  init(agent: Agent): Promise<void>;
  generateText(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResult>;
  generateChat(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): Promise<ChatGenerationResult>;
  generateEmbedding(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult>;
  generateImage?(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageGenerationResult>;
  streamText?(
    prompt: string,
    options?: TextGenerationOptions
  ): AsyncGenerator<string>;
  streamChat?(
    messages: ChatMessage[],
    options?: ChatGenerationOptions
  ): AsyncGenerator<string>;
  evaluateTask?(options: ToolEvaluationOptions): Promise<ToolEvaluationResult>;
  hasCapability(capability: PortalCapability): boolean;
  getUsage?(): Promise<PortalUsage>;
  healthCheck?(): Promise<boolean>;
}

export enum ConfigurationLevel {
  GLOBAL = 'global',
  PORTAL = 'portal',
  REQUEST = 'request',
}

export interface PortalUsage {
  requestCount: number;
  tokenCount: number;
  errorCount: number;
  lastRequest?: Date;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

/**
 * Configuration for a portal
 */
export interface PortalConfig {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  headers?: Record<string, string>;
  proxy?: string;
  embeddingModel?: string;
  imageModel?: string;
  vectorStore?: VectorStoreConfig;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitBuffer?: number;
  priority?: number;
  fallbackPortals?: string[];
}

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
  model?: string;
  maxTokens?: number;
  maxOutputTokens?: number; // AI SDK v5 parameter
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  logitBias?: Record<string, number>;
}

export enum FinishReason {
  STOP = 'stop',
  LENGTH = 'length',
  FUNCTION_CALL = 'function_call',
  CONTENT_FILTER = 'content_filter',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

/**
 * Result of text generation
 */
export interface TextGenerationResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: FinishReason;
  metadata?: Metadata;
  model?: string;
  timestamp?: Date;
}

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
  TOOL = 'tool',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
  FUNCTION_CALL = 'function_call',
  TOOL_CALL = 'tool_call',
}

/**
 * Chat message format
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  type?: MessageType;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: ToolCall[];
  attachments?: MessageAttachment[];
  timestamp?: Date;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface MessageAttachment {
  type: MessageType;
  url?: string;
  data?: string;
  mimeType?: string;
  size?: number;
}

/**
 * AI SDK v5 ToolSet - compatible with generateText/streamText
 * Using the proper tool type from AI SDK v5
 */
export type AISDKToolSet = Record<string, any>;

/**
 * Options for chat generation
 */
export interface ChatGenerationOptions extends TextGenerationOptions {
  functions?: FunctionDefinition[];
  functionCall?: string | { name: string };
  tools?: AISDKToolSet; // Native AI SDK v5 tools from MCP
}

/**
 * Result of chat generation
 */
export interface ChatGenerationResult extends TextGenerationResult {
  message: ChatMessage;
}

/**
 * Function definition for function calling
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: ActionParameters;
}

/**
 * Portal registry to manage available AI providers
 */
export interface PortalRegistry {
  registerPortal(name: string, portal: Portal): void;
  getPortal(name: string): Portal | undefined;
  listPortals(): string[];
}

/**
 * Update the AgentConfig to include portal configuration
 */
export interface PortalModuleConfig {
  provider: string;
  model?: string;
  embeddingModel?: string;
  imageModel?: string;
  vectorStore?: VectorStoreConfig;
  options?: BaseConfig;
}

/**
 * Options for embedding generation
 */
export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  normalize?: boolean;
  batchSize?: number;
  useCache?: boolean;
}

/**
 * Result of embedding generation
 */
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
  metadata?: Metadata;
}

/**
 * Options for image generation
 */
export interface ImageGenerationOptions {
  model?: string;
  size?: string;
  quality?: 'standard' | 'hd';
  style?: string;
  responseFormat?: 'url' | 'b64_json';
  n?: number;
}

/**
 * Result of image generation
 */
export interface ImageGenerationResult {
  images: Array<{
    url?: string;
    b64_json?: string;
  }>;
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
  metadata?: Metadata;
}

/**
 * Options for tool evaluation
 */
export interface ToolEvaluationOptions {
  task: string;
  context?: string;
  criteria?: string[];
  outputFormat?: 'json' | 'text' | 'structured';
  timeout?: number;
  model?: string;
}

/**
 * Result of tool evaluation
 */
export interface ToolEvaluationResult {
  analysis: string;
  score?: number;
  confidence?: number;
  reasoning: string;
  recommendations?: string[];
  metadata?: {
    model: string;
    processingTime: number;
    [key: string]: any;
  };
}

/**
 * Vector store configuration for embedding storage
 */
export interface VectorStoreConfig {
  type: 'supabase' | 'sqlite' | 'memory' | 'pinecone' | 'custom';
  tableName?: string;
  connectionString?: string;
  dimensions?: number;
  namespace?: string;
  customConfig?: BaseConfig;
}

/**
 * Portal capabilities
 */
export enum PortalCapability {
  TEXT_GENERATION = 'text_generation',
  CHAT_GENERATION = 'chat_generation',
  EMBEDDING_GENERATION = 'embedding_generation',
  IMAGE_GENERATION = 'image_generation',
  STREAMING = 'streaming',
  FUNCTION_CALLING = 'function_calling',
  VISION = 'vision',
  AUDIO = 'audio',
  TOOL_USAGE = 'tool_usage',
  EVALUATION = 'evaluation',
  REASONING = 'reasoning',
}
