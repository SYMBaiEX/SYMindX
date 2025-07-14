/**
 * Portal Response Type Definitions
 *
 * This file contains standardized response types for all portal implementations.
 * These types ensure consistent responses across different AI providers.
 */

import { MessageRole } from '../portal';

import { AIMessage, AIToolCall, AIToolResult, AIFinishReason } from './ai-sdk';

/**
 * Token usage details with breakdown
 */
export interface TokenUsageDetails {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

/**
 * Base response interface for all portal responses
 */
export interface BasePortalResponse {
  usage?: TokenUsageDetails;
  metadata?: {
    model: string;
    provider: string;
    processingTime?: number;
    requestId?: string;
    [key: string]: unknown;
  };
  timestamp?: Date;
}

/**
 * Text generation response from portals
 */
export interface PortalTextResponse extends BasePortalResponse {
  text: string;
  finishReason?: AIFinishReason;
}

/**
 * Chat generation response from portals
 */
export interface PortalChatResponse extends BasePortalResponse {
  text: string;
  message: {
    role: MessageRole;
    content: string;
    toolCalls?: AIToolCall[];
  };
  finishReason?: AIFinishReason;
  toolResults?: AIToolResult[];
}

/**
 * Streaming response from portals
 */
export interface PortalStreamResponse extends BasePortalResponse {
  stream: AsyncIterable<string>;
  fullStream?: AsyncIterable<StreamChunk>;
  finalText: Promise<string>;
  finalUsage: Promise<TokenUsageDetails>;
  finalFinishReason: Promise<AIFinishReason>;
}

/**
 * Stream chunk types for portal streaming
 */
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'finish';
  content?: string;
  toolCall?: AIToolCall;
  toolResult?: AIToolResult;
  error?: Error;
  finishReason?: AIFinishReason;
}

/**
 * Tool call response from portals
 */
export interface PortalToolCallResponse extends BasePortalResponse {
  toolCalls: AIToolCall[];
  toolResults?: AIToolResult[];
  text?: string;
  continuationNeeded: boolean;
}

/**
 * Embedding response from portals
 */
export interface PortalEmbeddingResponse extends BasePortalResponse {
  embedding: number[];
  dimensions: number;
  model: string;
}

/**
 * Image generation response from portals
 */
export interface PortalImageResponse extends BasePortalResponse {
  images: Array<{
    url?: string;
    b64_json?: string;
    revisedPrompt?: string;
  }>;
  model: string;
}

/**
 * Evaluation response from portals
 */
export interface PortalEvaluationResponse extends BasePortalResponse {
  analysis: string;
  score?: number;
  confidence?: number;
  reasoning: string;
  recommendations?: string[];
}

/**
 * Error response from portals
 */
export interface PortalErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
    statusCode?: number;
    details?: unknown;
  };
  provider: string;
  timestamp: Date;
}

/**
 * Batch response for multiple requests
 */
export interface PortalBatchResponse<T extends BasePortalResponse>
  extends BasePortalResponse {
  results: T[];
  errors?: PortalErrorResponse[];
  successCount: number;
  errorCount: number;
}

/**
 * Model information response
 */
export interface PortalModelInfo {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportedFeatures?: string[];
  pricing?: {
    inputTokensPer1K?: number;
    outputTokensPer1K?: number;
    currency?: string;
  };
}

/**
 * Health check response
 */
export interface PortalHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: string;
  latency?: number;
  error?: string;
  lastChecked: Date;
}

/**
 * Rate limit information
 */
export interface PortalRateLimitInfo {
  requestsRemaining?: number;
  requestsLimit?: number;
  tokensRemaining?: number;
  tokensLimit?: number;
  resetTime?: Date;
  retryAfter?: number;
}
