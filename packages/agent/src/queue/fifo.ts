/**
 * Bounded FIFO work queue.
 * Items are stored by reference. `T` is caller-owned.
 */
export interface WorkQueue<T> {
  push(item: T): void;
  pull(): T | undefined;
  size(): number;
}

function assertCapacity(capacity: number): void {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8) {
    throw new RangeError('capacity must be an integer from 1 to 8');
  }
}

export function createWorkQueue<T>(capacity: number): WorkQueue<T> {
  assertCapacity(capacity);
  const items: T[] = [];

  return {
    push(item: T): void {
      if (items.length >= capacity) {
        throw new Error('queue full');
      }
      items.push(item);
    },
    pull(): T | undefined {
      return items.shift();
    },
    size(): number {
      return items.length;
    },
  };
}
