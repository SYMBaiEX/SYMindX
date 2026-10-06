import {
  OrchestrationError,
  type AgentRecord,
  type Catalog,
  type CatalogStore,
  type CreateAgentInput,
  type NoteRecord,
  type RoomRecord,
  type SessionMode,
  type SessionRecord,
  type Speaker,
  type TranscriptTurn,
  type WorkItem,
} from './types.js';
import { activateSession, createAgentRecord, rememberMind, requireAgent } from './registry.js';
import { appendSessionTurn, createSession, requireSession, sessionsFor } from './session.js';
import { appendRoomTurn, createRoomRecord, mentionedMembers, requireRoom, roomsIn, routeRoom } from './room.js';
import { briefAgent, briefAgents, type AgentBrief } from './directory.js';
import { postNote, takeNotes } from './mailbox.js';
import { addWork as insertWork, assignedWork, dueAgents, finishWork as closeWork, type WorkInput } from './work.js';

const MAX_MESSAGE = 16000;
const MAX_AGENT_REPLIES = 6;

export interface Orchestrator {
  catalog(): Catalog;
  createAgent(input: CreateAgentInput): Promise<AgentRecord>;
  openSession(agentId: string, now: number, mode: SessionMode): Promise<SessionRecord>;
  useSession(agentId: string, sessionId: string): Promise<SessionRecord>;
  listSessions(agentId: string): readonly SessionRecord[];
  brief(query: string): AgentBrief;
  briefs(): readonly AgentBrief[];
  postNote(fromId: string, toId: string, text: string, now: number): Promise<NoteRecord>;
  listWork(): readonly WorkItem[];
  addWork(input: WorkInput): Promise<WorkItem>;
  finishWork(workId: string, now: number): Promise<readonly string[]>;
  due(now: number): readonly string[];
  say(
    sessionId: string,
    text: string,
    speaker: Speaker,
    signal: AbortSignal,
    now: number,
  ): Promise<SessionRecord>;
  createRoom(input: {
    readonly id: string;
    readonly title: string;
    readonly memberIds: readonly string[];
    readonly now: number;
  }): Promise<RoomRecord>;
  listRooms(): readonly RoomRecord[];
  sayRoom(
    roomId: string,
    text: string,
    speaker: Speaker,
    signal: AbortSignal,
    now: number,
  ): Promise<RoomRecord>;
}

export async function loadOrchestrator(store: CatalogStore): Promise<Orchestrator> {
  let catalog = await store.load();
  let tail: Promise<void> = Promise.resolve();

  async function exclusive<T>(run: () => Promise<T>): Promise<T> {
    const previous = tail;
    let release: () => void = () => undefined;
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await run();
    } finally {
      release();
    }
  }

  async function commit(next: Catalog): Promise<void> {
    catalog = next;
    await store.save(catalog);
  }

  return {
    catalog(): Catalog {
      return catalog;
    },

    async createAgent(input: CreateAgentInput): Promise<AgentRecord> {
      return exclusive(async () => {
        const created = createAgentRecord(catalog, input);
        await commit(created.catalog);
        return created.agent;
      });
    },

    async openSession(agentId: string, now: number, mode: SessionMode): Promise<SessionRecord> {
      return exclusive(async () => {
        const created = createSession(catalog, agentId, now, mode);
        await commit(created.catalog);
        return created.session;
      });
    },

    async useSession(agentId: string, sessionId: string): Promise<SessionRecord> {
      return exclusive(async () => {
        const session = requireSession(catalog, sessionId);
        const owner = session.agentId;
        if (owner !== agentId) {
          throw new OrchestrationError(`Session ${sessionId} belongs to ${owner}`);
        }
        await commit(activateSession(catalog, agentId, sessionId));
        return requireSession(catalog, sessionId);
      });
    },

    listSessions(agentId: string): readonly SessionRecord[] {
      return sessionsFor(catalog, agentId);
    },

    brief(query: string): AgentBrief {
      return briefAgent(catalog, query);
    },

    briefs(): readonly AgentBrief[] {
      return briefAgents(catalog);
    },

    async postNote(fromId: string, toId: string, text: string, now: number): Promise<NoteRecord> {
      return exclusive(async () => {
        const posted = postNote(catalog, { fromId, toId, text, now });
        await commit(posted.catalog);
        return posted.note;
      });
    },

    listWork(): readonly WorkItem[] {
      return catalog.work.slice();
    },

    async addWork(input: WorkInput): Promise<WorkItem> {
      return exclusive(async () => {
        const created = insertWork(catalog, input);
        await commit(created.catalog);
        return created.item;
      });
    },

    async finishWork(workId: string, now: number): Promise<readonly string[]> {
      return exclusive(async () => {
        const finished = closeWork(catalog, workId, now);
        let next = finished.catalog;
        for (const id of finished.unblocked) {
          const item = next.work.find((entry) => entry.id === id);
          if (item === undefined || item.assigneeId.length === 0) {
            continue;
          }
          const posted = postNote(next, {
            fromId: 'user',
            toId: item.assigneeId,
            text: `${id} is ready: ${item.title}`,
            now,
            stepId: id,
          });
          next = posted.catalog;
        }
        await commit(next);
        return finished.unblocked;
      });
    },

    due(now: number): readonly string[] {
      return dueAgents(catalog, now);
    },

    async say(
      sessionId: string,
      text: string,
      speaker: Speaker,
      signal: AbortSignal,
      now: number,
    ): Promise<SessionRecord> {
      const trimmed = requireMessage(text);
      requireNow(now);
      const prepared = await exclusive(async () => {
        const session = requireSession(catalog, sessionId);
        const agent = requireAgent(catalog, session.agentId);
        const delivered = deliverNotes(catalog, agent.character.id, session.id);
        const userClaim = claimTurn(delivered.catalog);
        const userTurn: TranscriptTurn = {
          id: userClaim.id,
          role: 'user',
          speakerId: 'user',
          text: trimmed,
          tools: [],
          changed: [],
          at: now,
        };
        const withUser = appendSessionTurn(userClaim.catalog, sessionId, userTurn);
        await commit(withUser.catalog);
        return {
          character: agent.character,
          history: [...delivered.history, ...delivered.turns],
          message: { sender: 'user', text: trimmed },
          mode: session.mode,
          mind: agent.mind,
          work: assignedWork(delivered.catalog, agent.character.id),
        };
      });

      const result = await speaker.speak(prepared, signal);
      return exclusive(async () => {
        const session = requireSession(catalog, sessionId);
        const reply = requireReply(result.text);
        const agentClaim = claimTurn(catalog);
        const agentTurn: TranscriptTurn = {
          id: agentClaim.id,
          role: 'agent',
          speakerId: session.agentId,
          text: reply,
          tools: toolNames(result.tools),
          changed: changedPaths(result.changed),
          at: now + 1,
        };
        const remembered =
          result.mind === undefined ? agentClaim.catalog : rememberMind(agentClaim.catalog, session.agentId, result.mind);
        const withAgent = appendSessionTurn(remembered, sessionId, agentTurn);
        await commit(withAgent.catalog);
        return withAgent.session;
      });
    },

    async createRoom(input: {
      readonly id: string;
      readonly title: string;
      readonly memberIds: readonly string[];
      readonly now: number;
    }): Promise<RoomRecord> {
      return exclusive(async () => {
        const created = createRoomRecord(catalog, input);
        await commit(created.catalog);
        return created.room;
      });
    },

    listRooms(): readonly RoomRecord[] {
      return roomsIn(catalog);
    },

    async sayRoom(
      roomId: string,
      text: string,
      speaker: Speaker,
      signal: AbortSignal,
      now: number,
    ): Promise<RoomRecord> {
      const trimmed = requireMessage(text);
      requireNow(now);
      const opened = await exclusive(async () => {
        const existing = requireRoom(catalog, roomId);
        const priorTurns = existing.turns.slice();
        const userClaim = claimTurn(catalog);
        const userTurn: TranscriptTurn = {
          id: userClaim.id,
          role: 'user',
          speakerId: 'user',
          text: trimmed,
          tools: [],
          changed: [],
          at: now,
        };
        const withUser = appendRoomTurn(userClaim.catalog, roomId, userTurn);
        await commit(withUser.catalog);
        return { priorTurns, userTurn, room: withUser.room };
      });
      const priorTurns = opened.priorTurns;
      const userTurn = opened.userTurn;

      const room = opened.room;
      const route = routeRoom(room, trimmed, catalog.agents);
      const firstWave = new Set(route);
      const queue: string[] = [];
      const queued = new Set<string>();
      const used = new Set<string>();
      for (const agentId of route) {
        if (queued.has(agentId)) {
          continue;
        }
        queued.add(agentId);
        queue.push(agentId);
      }

      const replies: TranscriptTurn[] = [];
      let cursor = 0;
      while (cursor < queue.length && replies.length < MAX_AGENT_REPLIES) {
        const agentId = queue[cursor];
        cursor += 1;
        if (agentId === undefined || used.has(agentId)) {
          continue;
        }
        used.add(agentId);
        const prepared = await exclusive(async () => {
          const agent = requireAgent(catalog, agentId);
          const sessionId = activeSessionId(catalog, agent);
          const delivered = deliverNotes(catalog, agent.character.id, sessionId);
          await commit(delivered.catalog);
          const latest = replies[replies.length - 1];
          const roomHistory = latest === undefined ? priorTurns : [...priorTurns, userTurn, ...replies.slice(0, -1)];
          return {
            character: agent.character,
            history: [...delivered.turns, ...roomHistory],
            message:
              latest === undefined
                ? { sender: 'user', text: trimmed }
                : { sender: latest.speakerId, text: latest.text },
            mode: 'chat' as const,
            mind: agent.mind,
            work: assignedWork(delivered.catalog, agent.character.id),
          };
        });
        const result = await speaker.speak(prepared, signal);
        const reply = requireReply(result.text);
        const turn = await exclusive(async () => {
          const claimed = claimTurn(catalog);
          const next: TranscriptTurn = {
            id: claimed.id,
            role: 'agent',
            speakerId: prepared.character.id,
            text: reply,
            tools: toolNames(result.tools),
            changed: changedPaths(result.changed),
            at: now + replies.length + 1,
          };
          const remembered =
            result.mind === undefined
              ? claimed.catalog
              : rememberMind(claimed.catalog, prepared.character.id, result.mind);
          const appended = appendRoomTurn(remembered, roomId, next);
          await commit(appended.catalog);
          return next;
        });
        replies.push(turn);
        if (!firstWave.has(agentId)) {
          continue;
        }
        for (const mentioned of mentionedMembers(room, reply, catalog.agents)) {
          if (used.has(mentioned) || queued.has(mentioned)) {
            continue;
          }
          queued.add(mentioned);
          queue.push(mentioned);
        }
      }

      return requireRoom(catalog, roomId);
    },
  };
}

function requireMessage(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_MESSAGE) {
    throw new OrchestrationError('Message must be 1 to 16000 characters');
  }
  return trimmed;
}

function requireNow(now: number): void {
  if (typeof now !== 'number' || !Number.isFinite(now)) {
    throw new OrchestrationError('now must be finite');
  }
}

function requireReply(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new OrchestrationError('The agent returned no reply');
  }
  return trimmed;
}

function changedPaths(paths: readonly string[]): string[] {
  if (paths.length > 16) {
    throw new OrchestrationError('turn changed paths must be a list of at most 16');
  }
  const names: string[] = [];
  for (const path of paths) {
    if (
      path.length < 1 ||
      path.length > 200 ||
      path.includes('\0') ||
      path.startsWith('/') ||
      path.split(/[/\\]/u).includes('..')
    ) {
      throw new OrchestrationError('turn changed path is invalid');
    }
    names.push(path);
  }
  return names;
}

function toolNames(tools: readonly string[]): string[] {
  if (tools.length > 16) {
    throw new OrchestrationError('turn tools must be a list of at most 16');
  }
  const names: string[] = [];
  for (const tool of tools) {
    if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(tool)) {
      throw new OrchestrationError('turn tool name is invalid');
    }
    names.push(tool);
  }
  return names;
}

function claimTurn(current: Catalog): { catalog: Catalog; id: string } {
  const sequence = current.sequence + 1;
  return {
    catalog: {
      schemaVersion: current.schemaVersion,
      sequence,
      agents: current.agents.slice(),
      sessions: current.sessions.slice(),
      rooms: current.rooms.slice(),
      notes: current.notes.slice(),
      work: current.work.slice(),
    },
    id: `t-${sequence}`,
  };
}

function deliverNotes(
  current: Catalog,
  agentId: string,
  sessionId: string,
): { catalog: Catalog; history: readonly TranscriptTurn[]; turns: readonly TranscriptTurn[] } {
  const session = sessionId.length === 0 ? undefined : current.sessions.find((item) => item.id === sessionId);
  const history = session?.turns.slice() ?? [];
  const taken = takeNotes(current, agentId);
  let next = taken.catalog;
  const turns: TranscriptTurn[] = [];
  for (const note of taken.notes) {
    const claimed = claimTurn(next);
    const turn: TranscriptTurn = {
      id: claimed.id,
      role: note.fromId === 'user' ? 'user' : 'agent',
      speakerId: note.fromId,
      text: note.text,
      tools: [],
      changed: [],
      at: note.at,
    };
    if (session !== undefined) {
      const appended = appendSessionTurn(claimed.catalog, session.id, turn);
      next = appended.catalog;
    } else {
      next = claimed.catalog;
    }
    turns.push(turn);
  }
  return { catalog: next, history, turns };
}

function activeSessionId(current: Catalog, agent: AgentRecord): string {
  if (agent.activeSessionId.length === 0) {
    return '';
  }
  const known = current.sessions.some((session) => session.id === agent.activeSessionId);
  return known ? agent.activeSessionId : '';
}

