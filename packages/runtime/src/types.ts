export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: JsonValue[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
}
export interface ProviderConfig {
  type: 'echo' | 'openai-compatible';
  model: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  maxOutputTokens?: number;
}
export interface Character {
  schemaVersion: 1;
  id: string;
  name: string;
  systemPrompt: string;
  provider: ProviderConfig;
  tools: string[];
  memory: { recentMessages: number };
  emotion: { enabled: boolean; decay: number };
}
export interface EmotionState {
  valence: number;
  arousal: number;
}
export interface AgentState {
  emotion: EmotionState;
  updatedAt: number;
}
export interface ToolCall {
  id: string;
  name: string;
  arguments: JsonValue;
}
export interface ProviderMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}
export interface Message extends ProviderMessage {
  id: string;
  agentId: string;
  conversationId: string;
  createdAt: number;
}
export interface ProviderTool {
  name: string;
  description: string;
  parameters: JsonSchema;
}
export interface ProviderRequest {
  system: string;
  messages: ProviderMessage[];
  tools: ProviderTool[];
  signal: AbortSignal;
}
export interface ProviderResult {
  text: string;
  toolCalls: ToolCall[];
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}
export interface Provider {
  generate(request: ProviderRequest): Promise<ProviderResult>;
}
export interface ToolContext {
  agentId: string;
  conversationId: string;
  signal: AbortSignal;
}
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  effect: 'read' | 'write';
  execute(args: JsonValue, context: ToolContext): JsonValue | Promise<JsonValue>;
}
export interface SendOptions {
  conversationId?: string;
  signal?: AbortSignal;
  approvedTools?: string[];
}
export interface TurnResult {
  agentId: string;
  conversationId: string;
  message: Message;
  state: AgentState;
  toolCalls: { name: string; status: 'completed' | 'denied' | 'failed' }[];
}
export interface RuntimeOptions {
  dbPath: string;
  characters?: Character[];
  providerFactory?: (config: ProviderConfig) => Provider;
  tools?: ToolDefinition[];
  requestTimeoutMs?: number;
  toolTimeoutMs?: number;
  maxToolRounds?: number;
  maxQueuedMessages?: number;
  maxInputChars?: number;
  maxContextChars?: number;
}
export interface ToolAudit {
  id: string;
  agentId: string;
  conversationId: string;
  name: string;
  status: 'started' | 'completed' | 'denied' | 'failed';
  createdAt: number;
  finishedAt?: number;
}
