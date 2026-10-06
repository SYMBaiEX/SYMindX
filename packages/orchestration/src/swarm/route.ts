import { OrchestrationError } from '../types.js';

export const SWARM_MODEL = 'qwen3.5:9b';

export type TaskKind = 'research' | 'write' | 'build';
export type SwarmRole = 'scout' | 'editor' | 'mason';

export interface RouteDecision {
  readonly kind: TaskKind;
  readonly role: SwarmRole;
  readonly model: typeof SWARM_MODEL;
  readonly think: false;
  readonly contract: string;
}

const CONTRACTS: Readonly<Record<TaskKind, { readonly role: SwarmRole; readonly contract: string }>> = {
  research: {
    role: 'scout',
    contract: 'Search the public web and return a source-backed dossier. Do not reason out loud.',
  },
  write: {
    role: 'editor',
    contract: 'Write the whitepaper from the accepted dossier. Do not browse or reason out loud.',
  },
  build: {
    role: 'mason',
    contract: 'Write the React view from the accepted whitepaper. Do not browse or reason out loud.',
  },
};

export function routeTask(kind: string): RouteDecision {
  if (!isTaskKind(kind)) {
    throw new OrchestrationError(`Unknown swarm task ${kind}`);
  }
  const spec = CONTRACTS[kind];
  return {
    kind,
    role: spec.role,
    model: SWARM_MODEL,
    think: false,
    contract: spec.contract,
  };
}

export function roleKind(role: SwarmRole): TaskKind {
  if (role === 'scout') {
    return 'research';
  }
  if (role === 'editor') {
    return 'write';
  }
  return 'build';
}

function isTaskKind(kind: string): kind is TaskKind {
  return kind === 'research' || kind === 'write' || kind === 'build';
}
