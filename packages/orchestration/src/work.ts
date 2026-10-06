import type { Catalog, WorkItem, WorkStatus } from './types.js';
import { OrchestrationError } from './types.js';
import { requireAgent } from './registry.js';
import { nextSequence } from './session.js';

const MAX_TITLE = 200;
const MAX_WORK = 400;

export interface WorkInput {
  readonly title: string;
  readonly parentId: string;
  readonly assigneeId: string;
  readonly dependsOn: readonly string[];
  readonly now: number;
}

export function addWork(catalog: Catalog, input: WorkInput): { catalog: Catalog; item: WorkItem } {
  const title = input.title.trim();
  if (title.length < 1 || title.length > MAX_TITLE) {
    throw new OrchestrationError('Work title must be 1 to 200 characters');
  }
  if (!Number.isFinite(input.now)) {
    throw new OrchestrationError('now must be finite');
  }
  if (catalog.work.length >= MAX_WORK) {
    throw new OrchestrationError('Work list is full');
  }
  if (input.parentId.length > 0 && catalog.work.every((item) => item.id !== input.parentId)) {
    throw new OrchestrationError(`Unknown work ${input.parentId}`);
  }
  const dependsOn = uniqueDepends(catalog, input.dependsOn);
  const assigneeId = input.assigneeId.length === 0 ? '' : requireAgent(catalog, input.assigneeId).character.id;
  const allocated = nextSequence(catalog);
  const status = statusFor(allocated.catalog, dependsOn, assigneeId);
  const item: WorkItem = {
    id: `w-${allocated.sequence}`,
    parentId: input.parentId,
    title,
    assigneeId,
    status,
    dependsOn,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return {
    catalog: {
      schemaVersion: allocated.catalog.schemaVersion,
      sequence: allocated.catalog.sequence,
      agents: allocated.catalog.agents.slice(),
      sessions: allocated.catalog.sessions.slice(),
      rooms: allocated.catalog.rooms.slice(),
      notes: allocated.catalog.notes.slice(),
      work: [...allocated.catalog.work, item],
    },
    item,
  };
}

export function finishWork(
  catalog: Catalog,
  workId: string,
  now: number,
): { catalog: Catalog; unblocked: readonly string[] } {
  if (!Number.isFinite(now)) {
    throw new OrchestrationError('now must be finite');
  }
  if (catalog.work.every((item) => item.id !== workId)) {
    throw new OrchestrationError(`Unknown work ${workId}`);
  }
  const finished = catalog.work.map((item) =>
    item.id === workId ? { ...item, status: 'done' as const, updatedAt: now } : item,
  );
  const unblocked: string[] = [];
  const work = finished.map((item) => {
    if (item.status !== 'blocked' || !ready(finished, item.dependsOn)) {
      return item;
    }
    unblocked.push(item.id);
    const status: WorkStatus = item.assigneeId.length === 0 ? 'pending' : 'active';
    return { ...item, status, updatedAt: now };
  });
  return {
    catalog: {
      schemaVersion: catalog.schemaVersion,
      sequence: catalog.sequence,
      agents: catalog.agents.slice(),
      sessions: catalog.sessions.slice(),
      rooms: catalog.rooms.slice(),
      notes: catalog.notes.slice(),
      work,
    },
    unblocked,
  };
}

export function assignedWork(catalog: Catalog, agentId: string): readonly WorkItem[] {
  return catalog.work.filter((item) => item.assigneeId === agentId && item.status !== 'done');
}

export function dueAgents(catalog: Catalog, now: number, silenceMs = 60_000): readonly string[] {
  if (!Number.isFinite(now) || !Number.isFinite(silenceMs) || silenceMs < 0) {
    throw new OrchestrationError('now must be finite');
  }
  const due: string[] = [];
  for (const agent of catalog.agents) {
    if (agent.mind !== undefined && now - agent.mind.lastAt >= silenceMs) {
      due.push(agent.character.id);
    }
  }
  return due;
}

function uniqueDepends(catalog: Catalog, dependsOn: readonly string[]): string[] {
  if (dependsOn.length > 16) {
    throw new OrchestrationError('Work depends on at most 16 items');
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of dependsOn) {
    if (seen.has(id)) {
      continue;
    }
    if (catalog.work.every((item) => item.id !== id)) {
      throw new OrchestrationError(`Unknown work ${id}`);
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function statusFor(catalog: Catalog, dependsOn: readonly string[], assigneeId: string): WorkStatus {
  if (!ready(catalog.work, dependsOn)) {
    return 'blocked';
  }
  return assigneeId.length === 0 ? 'pending' : 'active';
}

function ready(work: readonly WorkItem[], dependsOn: readonly string[]): boolean {
  return dependsOn.every((id) => work.some((item) => item.id === id && item.status === 'done'));
}
