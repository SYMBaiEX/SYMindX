import { createBoundedQueue, type BoundedQueue, type InboundMessage } from './queue.js';

export interface Mailbox {
  open(conversationId: string): void;
  push(conversationId: string, text: string): InboundMessage;
  pull(conversationId: string): InboundMessage | undefined;
  close(conversationId: string): void;
  conversations(): readonly string[];
}

const MIN_CONVERSATIONS = 1;
const MAX_CONVERSATIONS = 32;
const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function assertConversationId(conversationId: string): void {
  if (typeof conversationId !== 'string' || !CONVERSATION_ID_PATTERN.test(conversationId)) {
    throw new RangeError('conversationId must match /^[A-Za-z0-9_-]{1,64}$/');
  }
}

export function createMailbox(capacityPerConversation: number, maxConversations: number): Mailbox {
  if (
    !Number.isInteger(capacityPerConversation) ||
    capacityPerConversation < 1 ||
    capacityPerConversation > 100
  ) {
    throw new RangeError('capacityPerConversation must be an integer from 1 through 100');
  }
  if (
    !Number.isInteger(maxConversations) ||
    maxConversations < MIN_CONVERSATIONS ||
    maxConversations > MAX_CONVERSATIONS
  ) {
    throw new RangeError('maxConversations must be an integer from 1 through 32');
  }

  const conversations = new Map<string, BoundedQueue>();
  let nextSequence = 1;
  const allocateId = (): string => {
    const id = `c${nextSequence}`;
    nextSequence += 1;
    return id;
  };

  const requireOpen = (conversationId: string): BoundedQueue => {
    assertConversationId(conversationId);
    const queue = conversations.get(conversationId);
    if (queue === undefined) {
      throw new Error('conversation is closed');
    }
    return queue;
  };

  return {
    open(conversationId: string): void {
      assertConversationId(conversationId);
      if (conversations.has(conversationId)) {
        throw new Error('conversation already open');
      }
      if (conversations.size >= maxConversations) {
        throw new Error('too many conversations');
      }
      conversations.set(conversationId, createBoundedQueue(capacityPerConversation, allocateId));
    },

    push(conversationId: string, text: string): InboundMessage {
      return requireOpen(conversationId).push(text);
    },

    pull(conversationId: string): InboundMessage | undefined {
      return requireOpen(conversationId).pull();
    },

    close(conversationId: string): void {
      requireOpen(conversationId);
      conversations.delete(conversationId);
    },

    conversations(): readonly string[] {
      return [...conversations.keys()];
    },
  };
}
