/**
 * Per-key bounded FIFO queues.
 * Items are stored by reference. `T` is caller-owned.
 * An empty key stays open so `keys()` remains stable.
 */
export interface KeyedQueue<T> {
  push(key: string, item: T): void;
  pull(key: string): T | undefined;
  size(key: string): number;
  keys(): readonly string[];
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function assertCapacityPerKey(capacityPerKey: number): void {
  if (!Number.isInteger(capacityPerKey) || capacityPerKey < 1 || capacityPerKey > 8) {
    throw new RangeError('capacityPerKey must be an integer from 1 to 8');
  }
}

function assertMaxKeys(maxKeys: number): void {
  if (!Number.isInteger(maxKeys) || maxKeys < 1 || maxKeys > 64) {
    throw new RangeError('maxKeys must be an integer from 1 to 64');
  }
}

function assertKey(key: string): void {
  if (!KEY_PATTERN.test(key)) {
    throw new RangeError('key must match /^[A-Za-z0-9_-]{1,64}$/');
  }
}

export function createKeyedQueue<T>(capacityPerKey: number, maxKeys: number): KeyedQueue<T> {
  assertCapacityPerKey(capacityPerKey);
  assertMaxKeys(maxKeys);
  const queues = new Map<string, T[]>();

  return {
    push(key: string, item: T): void {
      assertKey(key);
      const existing = queues.get(key);
      if (existing === undefined) {
        if (queues.size >= maxKeys) {
          throw new Error('too many queue keys');
        }
        const opened: T[] = [];
        opened.push(item);
        queues.set(key, opened);
        return;
      }
      if (existing.length >= capacityPerKey) {
        throw new Error('queue full');
      }
      existing.push(item);
    },
    pull(key: string): T | undefined {
      assertKey(key);
      const existing = queues.get(key);
      if (existing === undefined) {
        return undefined;
      }
      return existing.shift();
    },
    size(key: string): number {
      assertKey(key);
      const existing = queues.get(key);
      if (existing === undefined) {
        return 0;
      }
      return existing.length;
    },
    keys(): readonly string[] {
      return [...queues.keys()];
    },
  };
}
