import { validateId } from '../../agent/src/index.js';
import {
  OrchestrationError,
  type Catalog,
  type SessionMode,
  type SessionRecord,
  type TranscriptTurn,
} from './types.js';

const MAX_TURNS = 400;
const NEW_SESSION_TITLE = 'New session';
const TITLE_LIMIT = 80;

export function createSession(
  catalog: Catalog,
  agentId: string,
  now: number,
  mode: SessionMode,
): { catalog: Catalog; session: SessionRecord } {
  const checkedAgentId = validateId(agentId, 'agent');
  if (!catalog.agents.some((agent) => agent.character.id === checkedAgentId)) {
    throw new OrchestrationError(`Unknown agent ${checkedAgentId}`);
  }
  if (!Number.isFinite(now)) {
    throw new OrchestrationError('now must be finite');
  }
  const allocated = nextSequence(catalog);
  const session: SessionRecord = {
    schemaVersion: 1,
    id: `s-${allocated.sequence}`,
    agentId: checkedAgentId,
    title: NEW_SESSION_TITLE,
    mode,
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
  const agents = allocated.catalog.agents.map((agent) =>
    agent.character.id === checkedAgentId ? { ...agent, activeSessionId: session.id } : agent,
  );
  return {
    catalog: copyCatalog(allocated.catalog, allocated.sequence, agents, [
      ...allocated.catalog.sessions,
      session,
    ]),
    session,
  };
}

export function requireSession(catalog: Catalog, sessionId: string): SessionRecord {
  const session = catalog.sessions.find((candidate) => candidate.id === sessionId);
  if (session === undefined) {
    throw new OrchestrationError(`Unknown session ${sessionId}`);
  }
  return session;
}

export function sessionsFor(catalog: Catalog, agentId: string): readonly SessionRecord[] {
  const sessions = catalog.sessions.filter((session) => session.agentId === agentId);
  sessions.sort((left, right) => left.createdAt - right.createdAt);
  return sessions;
}

export function appendSessionTurn(
  catalog: Catalog,
  sessionId: string,
  turn: TranscriptTurn,
): { catalog: Catalog; session: SessionRecord } {
  const current = requireSession(catalog, sessionId);
  if (current.turns.length >= MAX_TURNS) {
    throw new OrchestrationError(`Session ${sessionId} is full`);
  }
  if (current.turns.some((existing) => existing.id === turn.id)) {
    throw new OrchestrationError(`Turn ${turn.id} already exists`);
  }
  const session: SessionRecord = {
    schemaVersion: current.schemaVersion,
    id: current.id,
    agentId: current.agentId,
    title: titleAfterTurn(current.title, turn),
    mode: current.mode,
    turns: [...current.turns, turn],
    createdAt: current.createdAt,
    updatedAt: turn.at,
  };
  const sessions = catalog.sessions.map((candidate) => (candidate.id === session.id ? session : candidate));
  return { catalog: copyCatalog(catalog, catalog.sequence, catalog.agents.slice(), sessions), session };
}

export function nextSequence(catalog: Catalog): { catalog: Catalog; sequence: number } {
  const sequence = catalog.sequence + 1;
  return { catalog: copyCatalog(catalog, sequence), sequence };
}

function copyCatalog(
  catalog: Catalog,
  sequence = catalog.sequence,
  agents = catalog.agents.slice(),
  sessions = catalog.sessions.slice(),
): Catalog {
  return {
    schemaVersion: catalog.schemaVersion,
    sequence,
    agents,
    sessions,
    rooms: catalog.rooms.slice(),
    notes: catalog.notes.slice(),
    work: catalog.work.slice(),
  };
}

function titleAfterTurn(title: string, turn: TranscriptTurn): string {
  if (title !== NEW_SESSION_TITLE || turn.role !== 'user') {
    return title;
  }
  const trimmed = turn.text.trim();
  if (trimmed.length <= TITLE_LIMIT) {
    return trimmed;
  }
  return trimmed.slice(0, TITLE_LIMIT);
}
