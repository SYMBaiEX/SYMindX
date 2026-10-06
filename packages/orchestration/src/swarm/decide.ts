import type { TaskKind } from './route.js';
import { OrchestrationError } from '../types.js';

export type SwarmStage = TaskKind | 'done';

export type SwarmDecision =
  | { readonly action: 'advance'; readonly stage: SwarmStage }
  | { readonly action: 'retry'; readonly stage: TaskKind }
  | { readonly action: 'stop'; readonly stage: TaskKind };

const NEXT: Readonly<Record<TaskKind, SwarmStage>> = {
  research: 'write',
  write: 'build',
  build: 'done',
};

export function decide(kind: TaskKind, ok: boolean, attempt: number): SwarmDecision {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new OrchestrationError('swarm attempt must start at 1');
  }
  if (ok) {
    return { action: 'advance', stage: NEXT[kind] };
  }
  if (attempt < 2) {
    return { action: 'retry', stage: kind };
  }
  return { action: 'stop', stage: kind };
}
