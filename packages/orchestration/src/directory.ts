import type { AgentRecord, Catalog, SessionMode, TranscriptTurn } from './types.js';
import { OrchestrationError } from './types.js';
import { requireSession, sessionsFor } from './session.js';

const PROMPT_LIMIT = 240;
const TURN_LIMIT = 180;
const LATEST_LIMIT = 4;

export interface AgentBriefTurn {
  readonly role: 'user' | 'agent';
  readonly speakerId: string;
  readonly text: string;
  readonly at: number;
}

export interface AgentBrief {
  readonly id: string;
  readonly name: string;
  readonly prompt: string;
  readonly activeSessionId: string;
  readonly mode: SessionMode | 'none';
  readonly latest: readonly AgentBriefTurn[];
}

export function briefAgent(catalog: Catalog, query: string): AgentBrief {
  const agent = resolveAgent(catalog, query);
  return briefOf(catalog, agent);
}

export function briefAgents(catalog: Catalog): readonly AgentBrief[] {
  return catalog.agents.map((agent) => briefOf(catalog, agent));
}

export function formatBrief(brief: AgentBrief): string {
  const lines = [
    `agent ${brief.id}`,
    `name ${brief.name}`,
    `prompt ${brief.prompt}`,
    `session ${brief.activeSessionId.length === 0 ? 'none' : brief.activeSessionId}`,
    `mode ${brief.mode}`,
  ];
  if (brief.latest.length === 0) {
    lines.push('latest none');
    return lines.join('\n');
  }
  for (const turn of brief.latest) {
    lines.push(`latest ${turn.role} ${turn.speakerId}: ${turn.text}`);
  }
  return lines.join('\n');
}

function briefOf(catalog: Catalog, agent: AgentRecord): AgentBrief {
  const active = activeSession(catalog, agent);
  return {
    id: agent.character.id,
    name: agent.character.name,
    prompt: clip(agent.character.systemPrompt, PROMPT_LIMIT),
    activeSessionId: active?.id ?? '',
    mode: active?.mode ?? 'none',
    latest: latestTurns(active?.turns ?? []),
  };
}

function activeSession(catalog: Catalog, agent: AgentRecord): ReturnType<typeof requireSession> | undefined {
  if (agent.activeSessionId.length === 0) {
    return undefined;
  }
  const known = sessionsFor(catalog, agent.character.id).some((session) => session.id === agent.activeSessionId);
  if (!known) {
    return undefined;
  }
  return requireSession(catalog, agent.activeSessionId);
}

function latestTurns(turns: readonly TranscriptTurn[]): AgentBriefTurn[] {
  return turns.slice(-LATEST_LIMIT).map((turn) => ({
    role: turn.role,
    speakerId: turn.speakerId,
    text: clip(turn.text, TURN_LIMIT),
    at: turn.at,
  }));
}

function resolveAgent(catalog: Catalog, query: string): AgentRecord {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    throw new OrchestrationError('agent query is empty');
  }
  const exact = catalog.agents.find((agent) => agent.character.id === trimmed);
  if (exact !== undefined) {
    return exact;
  }
  const needle = trimmed.toLowerCase();
  const byName = catalog.agents.filter((agent) => agent.character.name.toLowerCase() === needle);
  if (byName.length === 1) {
    const match = byName[0];
    if (match === undefined) {
      throw new OrchestrationError(`Unknown agent ${trimmed}`);
    }
    return match;
  }
  if (byName.length > 1) {
    throw new OrchestrationError(`Ambiguous agent ${trimmed}`);
  }
  const byToken = catalog.agents.filter((agent) => firstToken(agent.character.name) === needle);
  if (byToken.length === 1) {
    const match = byToken[0];
    if (match === undefined) {
      throw new OrchestrationError(`Unknown agent ${trimmed}`);
    }
    return match;
  }
  if (byToken.length > 1) {
    throw new OrchestrationError(`Ambiguous agent ${trimmed}`);
  }
  throw new OrchestrationError(`Unknown agent ${trimmed}`);
}

function firstToken(name: string): string {
  const token = name.trim().split(/\s+/u)[0] ?? '';
  return token.toLowerCase();
}

function clip(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
}
