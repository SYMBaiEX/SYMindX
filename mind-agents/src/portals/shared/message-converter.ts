/** Shared conversion from portal messages to AI SDK 7 model messages. */
import type { ModelMessage } from 'ai';
import { ChatMessage, MessageRole } from '../../types/portal';

export interface MessageConversionOptions {
  supportsMultimodal?: boolean;
  supportsTools?: boolean;
}

/** Move trusted system-role content into AI SDK 7's top-level instructions option. */
export function getSystemInstructions(messages: ChatMessage[]): string | undefined {
  const instructions = messages
    .filter((message) => message.role === MessageRole.SYSTEM)
    .map((message) => message.content)
    .filter(Boolean);
  return instructions.length ? instructions.join('\n\n') : undefined;
}

/** Convert portal history, preserving assistant tool calls and tool results. */
export function convertToAIMessages(
  messages: ChatMessage[],
  options: MessageConversionOptions = {},
): ModelMessage[] {
  const { supportsMultimodal = true, supportsTools = true } = options;
  const converted: ModelMessage[] = [];
  for (const message of messages) {
    if (message.role === MessageRole.SYSTEM) continue;
    if (message.role === MessageRole.USER) {
      if (!supportsMultimodal || !message.attachments?.length) {
        converted.push({ role: 'user', content: message.content });
      } else {
        const content: Array<{ type: 'text'; text: string } | { type: 'file'; data: string | URL; mediaType: string }> = [
          { type: 'text', text: message.content },
        ];
        for (const attachment of message.attachments) {
          if (attachment.type === 'image' && (attachment.data || attachment.url)) {
            content.push({
              type: 'file',
              data: attachment.data || new URL(attachment.url!),
              mediaType: attachment.mimeType || 'image/png',
            });
          }
        }
        converted.push({ role: 'user', content });
      }
      continue;
    }
    if (message.role === MessageRole.ASSISTANT || message.role === MessageRole.FUNCTION) {
      if (supportsTools && message.toolCalls?.length) {
        const content: Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }> = [];
        if (message.content) content.push({ type: 'text', text: message.content });
        for (const call of message.toolCalls) {
          let input: unknown;
          try { input = JSON.parse(call.function.arguments); }
          catch { input = { rawArguments: call.function.arguments }; }
          content.push({ type: 'tool-call', toolCallId: call.id, toolName: call.function.name, input });
        }
        converted.push({ role: 'assistant', content });
      } else {
        converted.push({ role: 'assistant', content: message.content });
      }
      continue;
    }
    if (message.role === MessageRole.TOOL && supportsTools && message.toolCallId) {
      converted.push({
        role: 'tool',
        content: [{
          type: 'tool-result',
          toolCallId: message.toolCallId,
          toolName: message.toolName || message.name || 'unknown_tool',
          output: { type: 'text', value: message.content },
        }],
      });
      continue;
    }
    converted.push({ role: 'user', content: message.content });
  }
  return converted;
}

export function createMessageConverter(provider: string) {
  const normalizedProvider = provider.toLowerCase();
  const options: MessageConversionOptions = {
    supportsMultimodal: !['groq', 'xai', 'mistral', 'cohere'].includes(normalizedProvider),
    supportsTools: true,
  };
  return (messages: ChatMessage[]) => convertToAIMessages(messages, options);
}
