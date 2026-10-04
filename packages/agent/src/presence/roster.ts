const AGENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export type AgentPresence = 'ready' | 'busy';

export interface RosterEntry {
  id: string;
  name: string;
  presence: AgentPresence;
}

export interface Roster {
  register(entry: { id: string; name: string }): void;
  mark(id: string, presence: AgentPresence): void;
  get(id: string): RosterEntry | undefined;
  list(): RosterEntry[];
  remove(id: string): boolean;
}

function assertCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 64) {
    throw new RangeError('capacity must be an integer from 1 to 64');
  }
}

function assertId(id: string): void {
  if (typeof id !== 'string' || !AGENT_ID.test(id)) {
    throw new RangeError('id must match /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/');
  }
}

function assertName(name: string): void {
  if (typeof name !== 'string') {
    throw new RangeError('name must be a string');
  }
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 200 || name !== trimmed) {
    throw new RangeError(
      'name must be 1 to 200 characters without leading or trailing whitespace',
    );
  }
}

function assertPresence(presence: AgentPresence): void {
  const value: string = presence;
  if (value !== 'ready' && value !== 'busy') {
    throw new RangeError('presence must be ready or busy');
  }
}

function copyEntry(entry: RosterEntry): RosterEntry {
  return { id: entry.id, name: entry.name, presence: entry.presence };
}

export function createRoster(capacity: number): Roster {
  assertCapacity(capacity);
  const agents = new Map<string, RosterEntry>();

  return {
    register(entry) {
      assertId(entry.id);
      assertName(entry.name);
      if (agents.has(entry.id)) {
        throw new Error('agent already registered');
      }
      if (agents.size >= capacity) {
        throw new Error('roster is full');
      }
      agents.set(entry.id, {
        id: entry.id,
        name: entry.name,
        presence: 'ready',
      });
    },
    mark(id, presence) {
      assertId(id);
      assertPresence(presence);
      const current = agents.get(id);
      if (current === undefined) {
        throw new Error('unknown agent');
      }
      current.presence = presence;
    },
    get(id) {
      assertId(id);
      const current = agents.get(id);
      if (current === undefined) {
        return undefined;
      }
      return copyEntry(current);
    },
    list() {
      const entries: RosterEntry[] = [];
      for (const entry of agents.values()) {
        entries.push(copyEntry(entry));
      }
      return entries;
    },
    remove(id) {
      assertId(id);
      return agents.delete(id);
    },
  };
}
