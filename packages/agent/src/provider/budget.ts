import type { ProviderRequest } from './types.js';

export function assertRequestBudget(
  request: ProviderRequest,
  limits: { maxMessages: number; maxChars: number },
): void {
  if (!Number.isInteger(limits.maxMessages) || limits.maxMessages < 1 || limits.maxMessages > 200) {
    throw new RangeError('maxMessages must be an integer from 1 through 200');
  }
  if (!Number.isInteger(limits.maxChars) || limits.maxChars < 1 || limits.maxChars > 48000) {
    throw new RangeError('maxChars must be an integer from 1 through 48000');
  }
  if (request.messages.length > limits.maxMessages) {
    throw new Error('too many provider messages');
  }

  let total = request.system.length;
  for (const message of request.messages) {
    total += message.content.length;
  }
  if (total > limits.maxChars) {
    throw new Error('provider request is too large');
  }
}
