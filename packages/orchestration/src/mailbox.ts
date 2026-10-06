import type { Catalog, NoteRecord } from './types.js';
import { OrchestrationError } from './types.js';
import { requireAgent } from './registry.js';
import { nextSequence } from './session.js';

const MAX_NOTES = 400;
const MAX_TEXT = 16_000;

export interface NoteInput {
  readonly fromId: string;
  readonly toId: string;
  readonly text: string;
  readonly now: number;
  readonly stepId?: string;
}

export function postNote(catalog: Catalog, input: NoteInput): { catalog: Catalog; note: NoteRecord } {
  const text = input.text.trim();
  if (text.length < 1 || text.length > MAX_TEXT) {
    throw new OrchestrationError('Note must be 1 to 16000 characters');
  }
  if (!Number.isFinite(input.now)) {
    throw new OrchestrationError('now must be finite');
  }
  const to = requireAgent(catalog, input.toId);
  const fromId = input.fromId === 'user' ? 'user' : requireAgent(catalog, input.fromId).character.id;
  if (fromId === to.character.id) {
    throw new OrchestrationError('An agent cannot note itself');
  }
  const notes = roomFor(catalog.notes);
  const allocated = nextSequence({ ...catalog, notes });
  const note: NoteRecord = {
    id: `n-${allocated.sequence}`,
    fromId,
    toId: to.character.id,
    text,
    at: input.now,
    seen: false,
    stepId: input.stepId ?? '',
  };
  return {
    catalog: {
      schemaVersion: allocated.catalog.schemaVersion,
      sequence: allocated.catalog.sequence,
      agents: allocated.catalog.agents.slice(),
      sessions: allocated.catalog.sessions.slice(),
      rooms: allocated.catalog.rooms.slice(),
      notes: [...allocated.catalog.notes, note],
      work: allocated.catalog.work.slice(),
    },
    note,
  };
}

export function takeNotes(catalog: Catalog, agentId: string): { catalog: Catalog; notes: readonly NoteRecord[] } {
  const to = requireAgent(catalog, agentId);
  const pending = catalog.notes.filter((note) => note.toId === to.character.id && !note.seen);
  if (pending.length === 0) {
    return { catalog, notes: pending };
  }
  const ids = new Set(pending.map((note) => note.id));
  return {
    catalog: {
      schemaVersion: catalog.schemaVersion,
      sequence: catalog.sequence,
      agents: catalog.agents.slice(),
      sessions: catalog.sessions.slice(),
      rooms: catalog.rooms.slice(),
      notes: catalog.notes.map((note) => (ids.has(note.id) ? { ...note, seen: true } : note)),
      work: catalog.work.slice(),
    },
    notes: pending,
  };
}

function roomFor(notes: readonly NoteRecord[]): NoteRecord[] {
  if (notes.length < MAX_NOTES) {
    return notes.slice();
  }
  const drop = notes.findIndex((note) => note.seen);
  if (drop < 0) {
    throw new OrchestrationError('Note mailbox is full');
  }
  return notes.filter((_, index) => index !== drop);
}
