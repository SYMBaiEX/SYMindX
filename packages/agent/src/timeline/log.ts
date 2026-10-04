export type FactKind = 'inbound' | 'outbound' | 'appraisal' | 'drive' | 'reflection' | 'tool';

export interface Fact {
  readonly id: string;
  readonly kind: FactKind;
  readonly at: number;
  readonly summary: string;
}

export interface Timeline {
  append(fact: Fact): void;
  recent(limit: number): readonly Fact[];
}

const MIN_CAPACITY = 1;
const MAX_CAPACITY = 1000;
const MAX_SUMMARY_LENGTH = 500;

function isFactKind(kind: string): kind is FactKind {
  switch (kind) {
    case 'inbound':
    case 'outbound':
    case 'appraisal':
    case 'drive':
    case 'reflection':
    case 'tool':
      return true;
    default:
      return false;
  }
}

function copyFact(fact: Fact): Fact {
  return {
    id: fact.id,
    kind: fact.kind,
    at: fact.at,
    summary: fact.summary,
  };
}

function assertFact(fact: Fact, ids: ReadonlySet<string>): void {
  if (fact.id.length === 0) {
    throw new RangeError('fact id must not be empty');
  }
  if (ids.has(fact.id)) {
    throw new RangeError('duplicate fact id');
  }
  if (!Number.isFinite(fact.at)) {
    throw new RangeError('fact at must be finite');
  }
  if (fact.summary.length === 0) {
    throw new RangeError('fact summary must not be empty');
  }
  if (fact.summary.length > MAX_SUMMARY_LENGTH) {
    throw new RangeError('fact summary must be at most 500 characters');
  }
  if (!isFactKind(fact.kind)) {
    throw new RangeError('unknown fact kind');
  }
}

interface RankedFact {
  readonly fact: Fact;
  readonly index: number;
}

function compareChronological(left: RankedFact, right: RankedFact): number {
  if (left.fact.at < right.fact.at) {
    return -1;
  }
  if (left.fact.at > right.fact.at) {
    return 1;
  }
  return left.index - right.index;
}

function oldestIndex(facts: readonly Fact[]): number {
  let dropAt = 0;
  for (let index = 1; index < facts.length; index += 1) {
    const candidate = facts[index];
    const current = facts[dropAt];
    if (candidate === undefined || current === undefined) {
      continue;
    }
    if (candidate.at < current.at) {
      dropAt = index;
    }
  }
  return dropAt;
}

export function createTimeline(capacity: number): Timeline {
  if (!Number.isInteger(capacity) || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
    throw new RangeError('capacity must be an integer from 1 to 1000');
  }

  const facts: Fact[] = [];
  const ids = new Set<string>();

  return {
    append(fact: Fact): void {
      assertFact(fact, ids);
      const stored = copyFact(fact);
      facts.push(stored);
      ids.add(stored.id);
      while (facts.length > capacity) {
        const dropAt = oldestIndex(facts);
        const dropped = facts[dropAt];
        facts.splice(dropAt, 1);
        if (dropped !== undefined) {
          ids.delete(dropped.id);
        }
      }
    },

    recent(limit: number): readonly Fact[] {
      if (!Number.isInteger(limit) || limit < MIN_CAPACITY || limit > capacity) {
        throw new RangeError('limit must be an integer from 1 to capacity');
      }
      const ranked: RankedFact[] = [];
      for (let index = 0; index < facts.length; index += 1) {
        const fact = facts[index];
        if (fact !== undefined) {
          ranked.push({ fact, index });
        }
      }
      ranked.sort(compareChronological);
      const start = Math.max(0, ranked.length - limit);
      return ranked.slice(start).map((entry) => copyFact(entry.fact));
    },
  };
}
