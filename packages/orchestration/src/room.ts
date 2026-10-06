import type { AgentRecord, Catalog, RoomRecord, TranscriptTurn } from './types.js';
import { OrchestrationError } from './types.js';
import { validateId } from '../../agent/src/index.js';

const MAX_TURNS = 400;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 6;

function copyCatalog(catalog: Catalog, rooms: readonly RoomRecord[]): Catalog {
  return {
    schemaVersion: catalog.schemaVersion,
    sequence: catalog.sequence,
    agents: catalog.agents.slice(),
    sessions: catalog.sessions.slice(),
    rooms: rooms.slice(),
    notes: catalog.notes.slice(),
    work: catalog.work.slice(),
  };
}

function hasDuplicate(ids: readonly string[]): boolean {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      return true;
    }
    seen.add(id);
  }
  return false;
}

function requireMemberId(catalog: Catalog, id: string): string {
  let agentId: string;
  try {
    agentId = validateId(id, 'agent');
  } catch {
    throw new OrchestrationError(`Unknown agent ${id}`);
  }
  const known = catalog.agents.some((agent) => agent.character.id === agentId);
  if (!known) {
    throw new OrchestrationError(`Unknown agent ${agentId}`);
  }
  return agentId;
}

function memberIdsOf(room: RoomRecord): string[] {
  return room.members.map((member) => member.agentId);
}

function normalizedTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const part of text.split(/\s+/)) {
    if (part.length === 0) {
      continue;
    }
    const token =
      part.endsWith(',') || part.endsWith(':') ? part.slice(0, -1) : part;
    if (token.length > 0) {
      tokens.push(token);
    }
  }
  return tokens;
}

function firstWord(name: string): string {
  for (const part of name.split(/\s+/)) {
    if (part.length > 0) {
      return part;
    }
  }
  return '';
}

function mentionMatches(
  mention: string,
  agentId: string,
  agent: AgentRecord | undefined,
): boolean {
  const needle = mention.toLowerCase();
  if (needle === agentId.toLowerCase()) {
    return true;
  }
  if (agent === undefined) {
    return false;
  }
  const name = agent.character.name;
  if (needle === name.toLowerCase()) {
    return true;
  }
  const word = firstWord(name);
  return word.length > 0 && needle === word.toLowerCase();
}

export function createRoomRecord(
  catalog: Catalog,
  input: {
    readonly id: string;
    readonly title: string;
    readonly memberIds: readonly string[];
    readonly now: number;
  },
): { catalog: Catalog; room: RoomRecord } {
  const id = validateId(input.id, 'room');
  if (catalog.rooms.some((room) => room.id === id)) {
    throw new OrchestrationError(`Room ${id} already exists`);
  }
  if (
    input.memberIds.length < MIN_MEMBERS ||
    input.memberIds.length > MAX_MEMBERS ||
    hasDuplicate(input.memberIds)
  ) {
    throw new OrchestrationError('Room needs 2 to 6 agents');
  }
  const members = input.memberIds.map((memberId) => ({
    agentId: requireMemberId(catalog, memberId),
  }));
  const title = input.title.trim();
  if (title.length < 1 || title.length > 80) {
    throw new OrchestrationError('Room title must be 1 to 80 characters');
  }
  if (typeof input.now !== 'number' || !Number.isFinite(input.now)) {
    throw new OrchestrationError('now must be finite');
  }
  const room: RoomRecord = {
    schemaVersion: 1,
    id,
    title,
    members,
    turns: [],
    createdAt: input.now,
    updatedAt: input.now,
  };
  return {
    catalog: copyCatalog(catalog, [...catalog.rooms, room]),
    room,
  };
}

export function requireRoom(catalog: Catalog, id: string): RoomRecord {
  const room = catalog.rooms.find((entry) => entry.id === id);
  if (room === undefined) {
    throw new OrchestrationError(`Unknown room ${id}`);
  }
  return room;
}

export function roomsIn(catalog: Catalog): readonly RoomRecord[] {
  return catalog.rooms.slice().sort((left, right) => left.createdAt - right.createdAt);
}

export function appendRoomTurn(
  catalog: Catalog,
  roomId: string,
  turn: TranscriptTurn,
): { catalog: Catalog; room: RoomRecord } {
  const room = requireRoom(catalog, roomId);
  if (room.turns.length >= MAX_TURNS) {
    throw new OrchestrationError(`Room ${roomId} is full`);
  }
  if (room.turns.some((existing) => existing.id === turn.id)) {
    throw new OrchestrationError(`Turn ${turn.id} already exists`);
  }
  const next: RoomRecord = {
    schemaVersion: room.schemaVersion,
    id: room.id,
    title: room.title,
    members: room.members.slice(),
    turns: [...room.turns, turn],
    createdAt: room.createdAt,
    updatedAt: turn.at,
  };
  const rooms = catalog.rooms.map((entry) => (entry.id === room.id ? next : entry));
  return { catalog: copyCatalog(catalog, rooms), room: next };
}

export function mentionedMembers(
  room: RoomRecord,
  text: string,
  agents: readonly AgentRecord[],
): readonly string[] {
  const tokens = normalizedTokens(text);
  if (tokens.includes('@everyone')) {
    return memberIdsOf(room);
  }
  const mentions = tokens
    .filter((token) => token.startsWith('@'))
    .map((token) => token.slice(1))
    .filter((mention) => mention.length > 0);
  if (mentions.length === 0) {
    return [];
  }
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const member of room.members) {
    const agent = agents.find((entry) => entry.character.id === member.agentId);
    const hit = mentions.some((mention) => mentionMatches(mention, member.agentId, agent));
    if (!hit || seen.has(member.agentId)) {
      continue;
    }
    seen.add(member.agentId);
    matched.push(member.agentId);
  }
  return matched;
}

export function routeRoom(
  room: RoomRecord,
  text: string,
  agents: readonly AgentRecord[],
): readonly string[] {
  const mentioned = mentionedMembers(room, text, agents);
  if (mentioned.length === 0) {
    return memberIdsOf(room);
  }
  return mentioned;
}
