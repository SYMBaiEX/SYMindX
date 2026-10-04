const AGENT_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

export interface Belief {
  readonly agentId: string;
  readonly regard: number;
  readonly trust: number;
  readonly lastTopic: string;
  readonly note: string;
  readonly updatedAt: number;
}

export interface Observe {
  readonly agentId: string;
  readonly regardDelta: number;
  readonly trustDelta: number;
  readonly topic: string;
  readonly note: string;
  readonly at: number;
}

export interface SocialModel {
  get(id: string): Belief | undefined;
  list(): readonly Belief[];
  observe(update: Observe): Belief;
}

function assertCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 64) {
    throw new RangeError('capacity must be an integer from 1 to 64');
  }
}

function assertAgentId(agentId: string): void {
  if (typeof agentId !== 'string' || !AGENT_ID.test(agentId)) {
    throw new RangeError(
      'agentId must match /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/'
    );
  }
}

function assertDelta(value: number, name: string): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < -1 ||
    value > 1
  ) {
    throw new RangeError(`${name} must be a finite number from -1 to 1`);
  }
}

function assertText(value: string, name: string, max: number): void {
  if (typeof value !== 'string' || value.length > max) {
    throw new RangeError(
      `${name} must be a string of at most ${max} characters`
    );
  }
}

function assertAt(at: number): void {
  if (typeof at !== 'number' || !Number.isFinite(at)) {
    throw new RangeError('at must be finite');
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function copyBelief(belief: Belief): Belief {
  return { ...belief };
}

function assertObserve(update: Observe): void {
  assertAgentId(update.agentId);
  assertDelta(update.regardDelta, 'regardDelta');
  assertDelta(update.trustDelta, 'trustDelta');
  assertText(update.topic, 'topic', 200);
  assertText(update.note, 'note', 500);
  assertAt(update.at);
}

export function createSocialModel(capacity: number): SocialModel {
  assertCapacity(capacity);
  const beliefs = new Map<string, Belief>();

  function dropOldest(): void {
    let oldest: Belief | undefined;
    for (const belief of beliefs.values()) {
      if (oldest === undefined || belief.updatedAt < oldest.updatedAt) {
        oldest = belief;
      }
    }
    if (oldest !== undefined) {
      beliefs.delete(oldest.agentId);
    }
  }

  return {
    get(id: string): Belief | undefined {
      assertAgentId(id);
      const belief = beliefs.get(id);
      if (belief === undefined) {
        return undefined;
      }
      return copyBelief(belief);
    },
    list(): readonly Belief[] {
      const copies: Belief[] = [];
      for (const belief of beliefs.values()) {
        copies.push(copyBelief(belief));
      }
      copies.sort((left, right) => {
        if (left.updatedAt < right.updatedAt) {
          return -1;
        }
        if (left.updatedAt > right.updatedAt) {
          return 1;
        }
        return 0;
      });
      return copies;
    },
    observe(update: Observe): Belief {
      assertObserve(update);
      const existing = beliefs.get(update.agentId);
      if (existing === undefined && beliefs.size >= capacity) {
        dropOldest();
      }
      const regardBase = existing === undefined ? 0 : existing.regard;
      const trustBase = existing === undefined ? 0.5 : existing.trust;
      const next: Belief = {
        agentId: update.agentId,
        regard: clamp(regardBase + update.regardDelta, -1, 1),
        trust: clamp(trustBase + update.trustDelta, 0, 1),
        lastTopic: update.topic,
        note: update.note,
        updatedAt: update.at,
      };
      beliefs.set(update.agentId, next);
      return copyBelief(next);
    },
  };
}
