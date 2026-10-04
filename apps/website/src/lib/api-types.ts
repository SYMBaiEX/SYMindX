export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface ToolCall {
  id: string;
  name: string;
  arguments: JsonValue;
}

type MessageMetadata = { id: string; agentId: string; conversationId: string; createdAt: number };

export type Message =
  | (MessageMetadata & { role: 'user'; content: string })
  | (MessageMetadata & { role: 'assistant'; content: string; toolCalls?: ToolCall[] })
  | (MessageMetadata & { role: 'tool'; content: string; toolCallId: string });

export interface EmotionState {
  valence: number;
  arousal: number;
}

export interface AgentSummary {
  id: string;
  name: string;
  status: 'ready' | 'busy';
  emotion: EmotionState;
  provider: 'echo' | 'openai-compatible';
}
