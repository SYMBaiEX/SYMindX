export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ToolCall {
  id: string;
  name: string;
  arguments: JsonValue;
}

export type ProviderMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; content: string; toolCallId: string };

export interface ProviderTool {
  name: string;
  description: string;
  parameters: JsonValue;
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
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface Provider {
  generate(request: ProviderRequest): Promise<ProviderResult>;
}
