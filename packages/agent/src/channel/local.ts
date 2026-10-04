import { createBoundedQueue, type InboundMessage } from './queue.js';

export type { InboundMessage };

export interface LocalChannel {
  push(text: string): InboundMessage;
  pull(): InboundMessage | undefined;
  size(): number;
}

export function createLocalChannel(capacity: number): LocalChannel {
  let nextSequence = 1;
  return createBoundedQueue(capacity, () => {
    const id = `c${nextSequence}`;
    nextSequence += 1;
    return id;
  });
}
