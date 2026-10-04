/** AI SDK 7 contracts and narrow compatibility shapes used by portal adapters. */
import type {
  CallSettings,
  FinishReason,
  LanguageModel,
  ModelMessage,
  ToolSet,
  UserContent,
} from 'ai';

export type AIMessageRole = ModelMessage['role'];
export type AIContentPart = UserContent[number];
export type AIMessage = ModelMessage;
export type AIFinishReason = FinishReason;
export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
export type AITool = ToolSet[string];
export type AIToolSet = ToolSet;
export type GenerateTextParams = CallSettings;
export type { LanguageModel };

/** Older response records retained for portal metadata that predates SDK ModelMessage. */
export interface AIToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}
export interface AIToolResult {
  toolCallId: string;
  result: string | object;
}
export type ProviderConfig = {
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  headers?: Record<string, string>;
};
