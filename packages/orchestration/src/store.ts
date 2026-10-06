import { parseCharacter, validateId } from '../../agent/src/index.js';
import type {
  AgentRecord,
  AppraisalLabel,
  Catalog,
  CatalogStore,
  MindState,
  MindStep,
  NoteRecord,
  PlanStepStatus,
  RoomMember,
  RoomRecord,
  SessionMode,
  SessionRecord,
  TranscriptTurn,
  WorkItem,
  WorkStatus,
} from './types.js';
import { OrchestrationError } from './types.js';

const CATALOG_KEYS = ['schemaVersion', 'sequence', 'agents', 'sessions', 'rooms', 'notes', 'work'];
const NOTE_KEYS = ['id', 'fromId', 'toId', 'text', 'at', 'seen', 'stepId'];
const WORK_KEYS = ['id', 'parentId', 'title', 'assigneeId', 'status', 'dependsOn', 'createdAt', 'updatedAt'];
const MIND_KEYS = ['valence', 'arousal', 'dominance', 'updatedAt', 'label', 'goal', 'steps', 'lastAt'];
const MIND_STEP_KEYS = ['id', 'text', 'status'];
const AGENT_KEYS = ['schemaVersion', 'character', 'createdAt', 'activeSessionId', 'mind'];
const SESSION_KEYS = ['schemaVersion', 'id', 'agentId', 'title', 'mode', 'turns', 'createdAt', 'updatedAt'];
const ROOM_KEYS = ['schemaVersion', 'id', 'title', 'members', 'turns', 'createdAt', 'updatedAt'];
const MEMBER_KEYS = ['agentId'];
const TURN_KEYS = ['id', 'role', 'speakerId', 'text', 'tools', 'changed', 'at'];

const MAX_TURNS = 400;
const MIN_MEMBERS = 2;
const MAX_MEMBERS = 6;
const MAX_TITLE = 80;
const MAX_TEXT = 16000;
const MAX_TURN_ID = 64;

export function parseCatalog(input: unknown): Catalog {
  const source = object(input, 'catalog', CATALOG_KEYS);
  return {
    schemaVersion: schemaVersion(source['schemaVersion'], 'catalog'),
    sequence: sequence(source['sequence']),
    agents: parseAgents(source['agents']),
    sessions: parseSessions(source['sessions']),
    rooms: parseRooms(source['rooms']),
    notes: parseNotes(source['notes']),
    work: parseWork(source['work']),
  };
}

export function serializeCatalog(catalog: Catalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export function createMemoryStore(initial: Catalog | undefined): CatalogStore {
  let current = parseCatalog(initial === undefined ? blankCatalog() : initial);
  return {
    async load(): Promise<Catalog> {
      return parseCatalog(readJson(serializeCatalog(current)));
    },
    async save(catalog: Catalog): Promise<void> {
      current = parseCatalog(catalog);
    },
  };
}

function blankCatalog(): Catalog {
  return { schemaVersion: 1, sequence: 0, agents: [], sessions: [], rooms: [], notes: [], work: [] };
}

function readJson(text: string): unknown {
  return JSON.parse(text);
}

function parseAgents(value: unknown): AgentRecord[] {
  const entries = array(value, 'catalog agents');
  const agents: AgentRecord[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const agent = parseAgent(entry);
    claim(seen, agent.character.id, 'agent');
    agents.push(agent);
  }
  return agents;
}

function parseAgent(input: unknown): AgentRecord {
  const source = object(input, 'agent', AGENT_KEYS);
  return {
    schemaVersion: schemaVersion(source['schemaVersion'], 'agent'),
    character: parseCharacter(source['character']),
    createdAt: finite(source['createdAt'], 'agent createdAt'),
    activeSessionId: activeSessionId(source['activeSessionId']),
    mind: parseMind(source['mind']),
  };
}

function parseSessions(value: unknown): SessionRecord[] {
  const entries = array(value, 'catalog sessions');
  const sessions: SessionRecord[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const session = parseSession(entry);
    claim(seen, session.id, 'session');
    sessions.push(session);
  }
  return sessions;
}

function parseSession(input: unknown): SessionRecord {
  const source = object(input, 'session', SESSION_KEYS);
  return {
    schemaVersion: schemaVersion(source['schemaVersion'], 'session'),
    id: identifier(source['id'], 'session'),
    agentId: identifier(source['agentId'], 'agent'),
    title: title(source['title'], 'session'),
    mode: mode(source['mode']),
    turns: parseTurns(source['turns'], 'session'),
    createdAt: finite(source['createdAt'], 'session createdAt'),
    updatedAt: finite(source['updatedAt'], 'session updatedAt'),
  };
}

function parseRooms(value: unknown): RoomRecord[] {
  const entries = array(value, 'catalog rooms');
  const rooms: RoomRecord[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const room = parseRoom(entry);
    claim(seen, room.id, 'room');
    rooms.push(room);
  }
  return rooms;
}

function parseRoom(input: unknown): RoomRecord {
  const source = object(input, 'room', ROOM_KEYS);
  return {
    schemaVersion: schemaVersion(source['schemaVersion'], 'room'),
    id: identifier(source['id'], 'room'),
    title: title(source['title'], 'room'),
    members: parseMembers(source['members']),
    turns: parseTurns(source['turns'], 'room'),
    createdAt: finite(source['createdAt'], 'room createdAt'),
    updatedAt: finite(source['updatedAt'], 'room updatedAt'),
  };
}

function parseMind(value: unknown): MindState | undefined {
  if (value === undefined) {
    return undefined;
  }
  const source = object(value, 'mind', MIND_KEYS);
  return {
    valence: unit(source['valence'], 'mind valence'),
    arousal: unit(source['arousal'], 'mind arousal'),
    dominance: unit(source['dominance'], 'mind dominance'),
    updatedAt: finite(source['updatedAt'], 'mind updatedAt'),
    label: appraisalLabel(bounded(source['label'], 'mind label', 16, false)),
    goal: bounded(source['goal'], 'mind goal', 500, true),
    steps: parseMindSteps(source['steps']),
    lastAt: finite(source['lastAt'], 'mind lastAt'),
  };
}

function parseMindSteps(value: unknown): MindStep[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new OrchestrationError('mind steps must be a list');
  }
  return value.map((item) => {
    const source = object(item, 'mind step', MIND_STEP_KEYS);
    return {
      id: bounded(source['id'], 'mind step id', 80, false),
      text: bounded(source['text'], 'mind step text', 200, false),
      status: planStatus(bounded(source['status'], 'mind step status', 16, false)),
    };
  });
}

function parseWork(value: unknown): WorkItem[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 400) {
    throw new OrchestrationError('catalog work must be a list of at most 400');
  }
  const items: WorkItem[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const source = object(item, 'work', WORK_KEYS);
    const depends = source['dependsOn'];
    if (!Array.isArray(depends) || depends.length > 16 || !depends.every((entry) => typeof entry === 'string')) {
      throw new OrchestrationError('work dependsOn must be a list of strings');
    }
    const record: WorkItem = {
      id: bounded(source['id'], 'work id', 80, false),
      parentId: bounded(source['parentId'], 'work parentId', 80, true),
      title: bounded(source['title'], 'work title', 200, false),
      assigneeId: bounded(source['assigneeId'], 'work assigneeId', 80, true),
      status: workStatus(bounded(source['status'], 'work status', 16, false)),
      dependsOn: depends,
      createdAt: finite(source['createdAt'], 'work createdAt'),
      updatedAt: finite(source['updatedAt'], 'work updatedAt'),
    };
    claim(seen, record.id, 'work');
    items.push(record);
  }
  return items;
}

function unit(value: unknown, label: string): number {
  const parsed = finite(value, label);
  if (parsed < -1 || parsed > 1) {
    throw new OrchestrationError(`${label} must be from -1 to 1`);
  }
  return parsed;
}

function appraisalLabel(value: string): AppraisalLabel {
  if (value === 'positive' || value === 'negative' || value === 'calm' || value === 'activated') {
    return value;
  }
  throw new OrchestrationError('mind.label is invalid');
}

function planStatus(value: string): PlanStepStatus {
  if (value === 'pending' || value === 'active' || value === 'done' || value === 'skipped') {
    return value;
  }
  throw new OrchestrationError('mind step status is invalid');
}

function workStatus(value: string): WorkStatus {
  if (value === 'pending' || value === 'active' || value === 'done' || value === 'blocked') {
    return value;
  }
  throw new OrchestrationError('work status is invalid');
}

function parseNotes(value: unknown): NoteRecord[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new OrchestrationError('catalog notes must be an array');
  }
  if (value.length > 400) {
    throw new OrchestrationError('catalog notes must be a list of at most 400');
  }
  const notes: NoteRecord[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const note = parseNote(entry);
    claim(seen, note.id, 'note');
    notes.push(note);
  }
  return notes;
}

function parseNote(input: unknown): NoteRecord {
  const source = object(input, 'note', NOTE_KEYS);
  const seenFlag = source['seen'];
  if (typeof seenFlag !== 'boolean') {
    throw new OrchestrationError('note seen must be a boolean');
  }
  return {
    id: turnId(source['id']),
    fromId: speakerId(source['fromId']),
    toId: identifier(source['toId'], 'agent'),
    text: text(source['text']),
    at: finite(source['at'], 'note at'),
    seen: seenFlag,
    stepId: source['stepId'] === undefined ? '' : bounded(source['stepId'], 'note stepId', 80, true),
  };
}

function parseMembers(value: unknown): RoomMember[] {
  if (!Array.isArray(value)) {
    throw new OrchestrationError('room members must be an array');
  }
  if (value.length < MIN_MEMBERS || value.length > MAX_MEMBERS) {
    throw new OrchestrationError('room members must be a list of 2 to 6');
  }
  const members: RoomMember[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const source = object(entry, 'member', MEMBER_KEYS);
    const agentId = identifier(source['agentId'], 'agent');
    claim(seen, agentId, 'member');
    members.push({ agentId });
  }
  return members;
}

function parseTurns(value: unknown, name: string): TranscriptTurn[] {
  if (!Array.isArray(value)) {
    throw new OrchestrationError(`${name} turns must be an array`);
  }
  if (value.length > MAX_TURNS) {
    throw new OrchestrationError(`${name} turns must be a list of at most 400`);
  }
  const turns: TranscriptTurn[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const turn = parseTurn(entry);
    claim(seen, turn.id, 'turn');
    turns.push(turn);
  }
  return turns;
}

function parseTurn(input: unknown): TranscriptTurn {
  const source = object(input, 'turn', TURN_KEYS);
  return {
    id: turnId(source['id']),
    role: role(source['role']),
    speakerId: speakerId(source['speakerId']),
    text: text(source['text']),
    tools: tools(source['tools']),
    changed: changedPaths(source['changed']),
    at: finite(source['at'], 'turn at'),
  };
}

function schemaVersion(value: unknown, name: string): 1 {
  if (value !== 1) {
    throw new OrchestrationError(`${name} schemaVersion must be 1`);
  }
  return 1;
}

function sequence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new OrchestrationError('catalog sequence must be an integer >= 0');
  }
  return value;
}

function activeSessionId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new OrchestrationError('agent activeSessionId must be a string');
  }
  if (value.length === 0) {
    return '';
  }
  return identifier(value, 'activeSessionId');
}

function identifier(value: unknown, name: string): string {
  try {
    return validateId(value, name);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${name} is invalid`;
    throw new OrchestrationError(message);
  }
}

function title(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new OrchestrationError(`${name} title must be a string`);
  }
  if (value.length > MAX_TITLE) {
    throw new OrchestrationError(`${name} title must be at most 80 characters`);
  }
  return value;
}

function mode(value: unknown): SessionMode {
  if (value === 'chat' || value === 'code' || value === 'build') {
    return value;
  }
  throw new OrchestrationError('session mode must be chat, code, or build');
}

function role(value: unknown): 'user' | 'agent' {
  if (value === 'user' || value === 'agent') {
    return value;
  }
  throw new OrchestrationError('turn role must be user or agent');
}

function turnId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > MAX_TURN_ID) {
    throw new OrchestrationError('turn id must be a non-empty string up to 64 characters');
  }
  return value;
}

function speakerId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > MAX_TURN_ID) {
    throw new OrchestrationError('turn speakerId must be a non-empty string up to 64 characters');
  }
  return value;
}

function changedPaths(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 16) {
    throw new OrchestrationError('turn changed paths must be a list of at most 16');
  }
  const paths: string[] = [];
  for (const entry of value) {
    if (
      typeof entry !== 'string' ||
      entry.length < 1 ||
      entry.length > 200 ||
      entry.includes('\0') ||
      entry.startsWith('/') ||
      entry.split(/[/\\]/u).includes('..')
    ) {
      throw new OrchestrationError('turn changed path is invalid');
    }
    paths.push(entry);
  }
  return paths;
}

function tools(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 16) {
    throw new OrchestrationError('turn tools must be a list of at most 16');
  }
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(entry)) {
      throw new OrchestrationError('turn tool name is invalid');
    }
    names.push(entry);
  }
  return names;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > MAX_TEXT) {
    throw new OrchestrationError('turn text must be 1 to 16000 characters');
  }
  return value;
}

function bounded(value: unknown, name: string, max: number, allowEmpty: boolean): string {
  if (typeof value !== 'string' || value.length > max || (value.length === 0 && allowEmpty === false)) {
    throw new OrchestrationError(`${name} is invalid`);
  }
  return value;
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new OrchestrationError(`${name} must be finite`);
  }
  return value;
}

function claim(seen: Set<string>, id: string, kind: string): void {
  if (seen.has(id)) {
    throw new OrchestrationError(`Duplicate ${kind} id ${id}`);
  }
  seen.add(id);
}

function array(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new OrchestrationError(`${name} must be an array`);
  }
  return value;
}

function object(value: unknown, name: string, allowed: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OrchestrationError(`${name} must be an object`);
  }
  const record: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new OrchestrationError(`Unknown ${name} field: ${key}`);
    }
    record[key] = Reflect.get(value, key);
  }
  return record;
}
