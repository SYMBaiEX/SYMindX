import { parseCharacter, validateId } from '../../agent/src/index.js';
import type { AgentRecord, Catalog, CreateAgentInput, MindState } from './types.js';
import { OrchestrationError } from './types.js';

export function emptyCatalog(): Catalog {
  return { schemaVersion: 1, sequence: 0, agents: [], sessions: [], rooms: [], notes: [], work: [] };
}

export function createAgentRecord(
  catalog: Catalog,
  input: CreateAgentInput,
): { catalog: Catalog; agent: AgentRecord } {
  const id = validateId(input.id, 'agent');
  if (catalog.agents.some((agent) => agent.character.id === id)) {
    throw new OrchestrationError(`Agent ${id} already exists`);
  }
  if (!Number.isFinite(input.now)) {
    throw new OrchestrationError('now must be finite');
  }
  const trimmedName = input.name.trim();
  const name = trimmedName.length === 0 ? id : trimmedName;
  const trimmedPrompt = input.systemPrompt.trim();
  const systemPrompt = trimmedPrompt.length === 0 ? defaultSystemPrompt(name) : trimmedPrompt;
  const agent: AgentRecord = {
    schemaVersion: 1,
    character: parseCharacter({
      schemaVersion: 1,
      id,
      name,
      systemPrompt,
      provider: {
        type: 'openai-compatible',
        model: input.model,
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKeyEnv: 'OLLAMA_API_KEY',
      },
      tools: ['word-count', 'clock', 'json-keys'],
      memory: { recentMessages: 40 },
      emotion: { enabled: true, decay: 0.85 },
    }),
    activeSessionId: '',
    createdAt: input.now,
    mind: undefined,
  };
  return {
    catalog: {
      schemaVersion: catalog.schemaVersion,
      sequence: catalog.sequence,
      agents: [...catalog.agents, agent],
      sessions: [...catalog.sessions],
      rooms: [...catalog.rooms],
      notes: [...catalog.notes],
      work: [...catalog.work],
    },
    agent,
  };
}

export function rememberMind(catalog: Catalog, agentId: string, mind: MindState): Catalog {
  const id = validateId(agentId, 'agent');
  let found = false;
  const agents = catalog.agents.map((agent) => {
    if (agent.character.id !== id) {
      return agent;
    }
    found = true;
    return {
      schemaVersion: agent.schemaVersion,
      character: agent.character,
      createdAt: agent.createdAt,
      activeSessionId: agent.activeSessionId,
      mind,
    };
  });
  if (!found) {
    throw new OrchestrationError(`Unknown agent ${id}`);
  }
  return {
    schemaVersion: catalog.schemaVersion,
    sequence: catalog.sequence,
    agents,
    sessions: catalog.sessions.slice(),
    rooms: catalog.rooms.slice(),
    notes: catalog.notes.slice(),
    work: catalog.work.slice(),
  };
}

export function requireAgent(catalog: Catalog, id: string): AgentRecord {
  const agentId = validateId(id, 'agent');
  for (const agent of catalog.agents) {
    if (agent.character.id === agentId) {
      return agent;
    }
  }
  throw new OrchestrationError(`Unknown agent ${agentId}`);
}

export function activateSession(catalog: Catalog, agentId: string, sessionId: string): Catalog {
  const id = validateId(agentId, 'agent');
  let found = false;
  const agents = catalog.agents.map((agent) => {
    if (agent.character.id !== id) {
      return agent;
    }
    found = true;
    return {
      schemaVersion: agent.schemaVersion,
      character: agent.character,
      createdAt: agent.createdAt,
      activeSessionId: sessionId,
      mind: agent.mind,
    };
  });
  if (!found) {
    throw new OrchestrationError(`Unknown agent ${id}`);
  }
  return {
    schemaVersion: catalog.schemaVersion,
    sequence: catalog.sequence,
    agents,
    sessions: [...catalog.sessions],
    rooms: [...catalog.rooms],
    notes: [...catalog.notes],
    work: [...catalog.work],
  };
}

function defaultSystemPrompt(name: string): string {
  return `You are ${name}, a local SYMindX agent. Do not reason out loud. When the user names word-count, clock, or json-keys, call that tool before you answer. A later message from you replaces an earlier fact. Otherwise reply with only what was asked.`;
}
