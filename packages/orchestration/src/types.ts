import type { Character } from '../../agent/src/index.js';

export class OrchestrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export type SessionMode = 'chat' | 'code' | 'build';

export interface TranscriptTurn {
  readonly id: string;
  readonly role: 'user' | 'agent';
  readonly speakerId: string;
  readonly text: string;
  readonly tools: readonly string[];
  readonly changed: readonly string[];
  readonly at: number;
}

export type AppraisalLabel = 'positive' | 'negative' | 'calm' | 'activated';
export type PlanStepStatus = 'pending' | 'active' | 'done' | 'skipped';

export interface MindStep {
  readonly id: string;
  readonly text: string;
  readonly status: PlanStepStatus;
}

export interface MindState {
  readonly valence: number;
  readonly arousal: number;
  readonly dominance: number;
  readonly updatedAt: number;
  readonly label: AppraisalLabel;
  readonly goal: string;
  readonly steps: readonly MindStep[];
  readonly lastAt: number;
}

export interface AgentRecord {
  readonly schemaVersion: 1;
  readonly character: Character;
  readonly createdAt: number;
  readonly activeSessionId: string;
  readonly mind: MindState | undefined;
}

export interface SessionRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly agentId: string;
  readonly title: string;
  readonly mode: SessionMode;
  readonly turns: readonly TranscriptTurn[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface RoomMember {
  readonly agentId: string;
}

export interface RoomRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly members: readonly RoomMember[];
  readonly turns: readonly TranscriptTurn[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface NoteRecord {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly text: string;
  readonly at: number;
  readonly seen: boolean;
  readonly stepId: string;
}

export type WorkStatus = 'pending' | 'active' | 'done' | 'blocked';

export interface WorkItem {
  readonly id: string;
  readonly parentId: string;
  readonly title: string;
  readonly assigneeId: string;
  readonly status: WorkStatus;
  readonly dependsOn: readonly string[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Catalog {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly agents: readonly AgentRecord[];
  readonly sessions: readonly SessionRecord[];
  readonly rooms: readonly RoomRecord[];
  readonly notes: readonly NoteRecord[];
  readonly work: readonly WorkItem[];
}

export interface SpeakRequest {
  readonly character: Character;
  readonly history: readonly TranscriptTurn[];
  readonly message: { readonly sender: string; readonly text: string };
  readonly mode: SessionMode;
  readonly mind: MindState | undefined;
  readonly work: readonly WorkItem[];
}

export interface SpeakResult {
  readonly text: string;
  readonly tools: readonly string[];
  readonly changed: readonly string[];
  readonly mind?: MindState;
}

export interface Speaker {
  speak(request: SpeakRequest, signal: AbortSignal): Promise<SpeakResult>;
}

export interface CatalogStore {
  load(): Promise<Catalog>;
  save(catalog: Catalog): Promise<void>;
}

export interface CreateAgentInput {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly model: string;
  readonly now: number;
}
