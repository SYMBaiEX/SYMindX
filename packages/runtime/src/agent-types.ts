import type { AgentSummary } from './types.js';
import type { WorkspaceActionRequest } from './workspace-tools.js';

export type AgentMode = 'chat' | 'code' | 'build';
export type AgentBackend = 'api' | 'codex';
export type ApprovalMode = 'ask' | 'read-only' | 'auto';
export type AgentSessionAgent = Omit<AgentSummary, 'provider'> & {
  provider: AgentSummary['provider'] | 'codex';
};
export interface AgentHistoryEntry {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: number;
}
export interface AgentReply {
  backend: AgentBackend;
  agentId: string;
  conversationId: string;
  text: string;
  tools: { name: string; status: 'completed' | 'denied' | 'failed' }[];
}
export interface AgentSessionDescription {
  backend: AgentBackend;
  agentId: string;
  conversationId: string;
  workspaceRoot: string;
  model?: string;
  characterPath?: string;
  dbPath?: string;
}
export interface AgentSession {
  describe(): AgentSessionDescription;
  agents(): AgentSessionAgent[];
  history(limit?: number): AgentHistoryEntry[];
  send(text: string, signal?: AbortSignal): Promise<AgentReply>;
  close(): Promise<void>;
}
export interface AgentSessionOptions {
  workspaceRoot: string;
  mode: AgentMode;
  approvalMode?: ApprovalMode;
  characterPath?: string;
  dbPath?: string;
  agentId?: string;
  conversationId?: string;
  model?: string;
  codexExecutable?: string;
  maxToolRounds?: number;
  requestTimeoutMs?: number;
  approveAction?: (request: WorkspaceActionRequest, signal?: AbortSignal) => Promise<boolean>;
  onProgress?: (text: string) => void;
}
