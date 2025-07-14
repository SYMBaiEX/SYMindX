/**
 * AI SDK v5 Type Definitions
 *
 * This file contains proper type definitions for the AI SDK v5 used by portal implementations.
 * These types ensure type safety when working with AI SDK's generateText, streamText, and other functions.
 */

/**
 * Message roles supported by AI SDK
 */
export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Text content part for multimodal messages
 */
export interface AITextPart {
  type: 'text';
  text: string;
}

/**
 * Image content part for multimodal messages
 */
export interface AIImagePart {
  type: 'image';
  image: string | URL;
  mediaType?: string;
}

/**
 * Tool result content part
 */
export interface AIToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: string | object;
}

/**
 * Union type for all content parts
 */
export type AIContentPart = AITextPart | AIImagePart | AIToolResultPart;

/**
 * AI SDK message format with proper content types
 */
export interface AIMessage {
  role: AIMessageRole;
  content: string | AIContentPart[];
}

/**
 * Tool call structure in AI SDK
 */
export interface AIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool result structure
 */
export interface AIToolResult {
  toolCallId: string;
  result: string | object;
}

/**
 * Stream part types for AI SDK streaming
 */
export type StreamPartType =
  | 'text-delta'
  | 'tool-call'
  | 'tool-call-streaming-start'
  | 'tool-call-delta'
  | 'tool-result'
  | 'finish'
  | 'error';

/**
 * Base stream part interface
 */
export interface StreamPart {
  type: StreamPartType;
}

/**
 * Text delta stream part
 */
export interface TextDeltaPart extends StreamPart {
  type: 'text-delta';
  textDelta: string;
}

/**
 * Tool call stream part
 */
export interface ToolCallPart extends StreamPart {
  type: 'tool-call';
  toolCall: AIToolCall;
}

/**
 * Finish reason types
 */
export type AIFinishReason =
  | 'stop'
  | 'length'
  | 'content-filter'
  | 'tool-calls'
  | 'error'
  | 'cancelled'
  | 'other';

/**
 * Usage information from AI SDK
 */
export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Result from generateText function
 */
export interface GenerateTextResult {
  text: string;
  usage: AIUsage;
  finishReason: AIFinishReason;
  responseMessages: AIMessage[];
  toolCalls?: AIToolCall[];
  toolResults?: AIToolResult[];
}

/**
 * Stream text result interface
 */
export interface StreamTextResult {
  textStream: AsyncIterable<string>;
  fullStream: AsyncIterable<StreamPart>;
  text: Promise<string>;
  usage: Promise<AIUsage>;
  finishReason: Promise<AIFinishReason>;
}

/**
 * Parameters for generateText and streamText
 */
export interface GenerateTextParams {
  model: LanguageModel;
  messages?: AIMessage[];
  prompt?: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  tools?: AIToolSet;
  maxSteps?: number;
  toolCallStreaming?: boolean;
  stopWhen?: (result: GenerateTextResult) => boolean;
}

/**
 * Extended parameters that include tools support
 */
export interface GenerateTextParamsWithTools extends GenerateTextParams {
  tools: AIToolSet;
  maxSteps: number;
}

/**
 * Language model interface (placeholder for actual AI SDK type)
 */
export interface LanguageModel {
  provider: string;
  modelId: string;
  // Additional properties as defined by AI SDK
}

/**
 * Tool definition for AI SDK
 */
export interface AITool<TParams = object, TResult = string> {
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: TParams) => Promise<TResult>;
}

/**
 * Tool set for AI SDK - map of tool name to tool definition
 */
export type AIToolSet = Record<string, AITool>;

/**
 * Embedding result from AI SDK
 */
export interface EmbedResult {
  embedding: number[];
  usage?: {
    tokens: number;
  };
}

/**
 * Error types from AI SDK
 */
export interface AIError extends Error {
  name:
    | 'AI_APICallError'
    | 'AI_InvalidArgumentError'
    | 'AI_RateLimitError'
    | 'AI_AuthenticationError'
    | 'AI_UnknownError';
  statusCode?: number;
  responseBody?: string;
  cause?: unknown;
}

/**
 * Provider configuration types
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  headers?: Record<string, string>;
}

/**
 * Model-specific configurations
 */
export interface ModelConfig {
  model: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}
