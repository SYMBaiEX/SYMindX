export interface InboundMessage {
  id: string;
  text: string;
}

export interface BoundedQueue {
  push(text: string): InboundMessage;
  pull(): InboundMessage | undefined;
  size(): number;
}

const MIN_CAPACITY = 1;
const MAX_CAPACITY = 100;
const MAX_TEXT_LENGTH = 16_000;

export function createBoundedQueue(capacity: number, allocateId: () => string): BoundedQueue {
  if (!Number.isInteger(capacity) || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
    throw new RangeError('capacity must be an integer from 1 through 100');
  }

  const queue: InboundMessage[] = [];

  return {
    push(text: string): InboundMessage {
      if (text.length === 0 || text.length > MAX_TEXT_LENGTH) {
        throw new RangeError('text length must be from 1 through 16000');
      }
      if (queue.length === capacity) {
        throw new Error('channel full');
      }
      const message: InboundMessage = {
        id: allocateId(),
        text,
      };
      queue.push(message);
      return message;
    },

    pull(): InboundMessage | undefined {
      if (queue.length === 0) {
        return undefined;
      }
      const message = queue[0];
      if (message === undefined) {
        return undefined;
      }
      queue.shift();
      return message;
    },

    size(): number {
      return queue.length;
    },
  };
}
