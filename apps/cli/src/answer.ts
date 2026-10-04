import { createMind, type Mind, type PreparedTurn, type ToolOutcome } from '../../../packages/agent/src/index.js';
import type { JsonValue } from '../../../packages/agent/src/provider/types.js';
import { demoCharacter } from './character.js';
import { ollamaChat, type OllamaMessage } from './ollama.js';

export interface Answer {
  readonly text: string;
  readonly tools: readonly string[];
  readonly outcomes: readonly ToolOutcome[];
  readonly prepared: PreparedTurn | undefined;
}

export function createDemoMind(now: number): Mind {
  return createMind(demoCharacter(), now);
}

export async function ask(
  mind: Mind,
  base: string,
  signal: AbortSignal,
  text: string,
): Promise<Answer> {
  const now = Date.now();
  mind.hear({ channel: 'local', sender: 'user', text }, now);
  const prepared = mind.step(now);
  const request = mind.request(signal);
  const messages: OllamaMessage[] = [
    { role: 'system', content: request.system },
    ...request.messages.map((message) => ({ role: message.role, content: message.content }) as OllamaMessage),
  ];
  let reply = await ollamaChat(base, messages, request.tools, signal);
  const outcomes: ToolOutcome[] = [];
  if (reply.toolCalls.length > 0) {
    messages.push({ role: 'assistant', content: reply.text, toolCalls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      const outcome = mind.useTool(call.name, toolInput(call.arguments), now, false);
      outcomes.push(outcome);
      messages.push({
        role: 'tool',
        content: outcome.output ?? (outcome.decision.allowed ? '' : outcome.decision.reason),
        toolName: call.name,
      });
    }
    reply = await ollamaChat(base, messages, request.tools, signal);
  }
  if (reply.text.length > 0) {
    mind.say(reply.text, now);
  }
  return { text: reply.text, tools: outcomes.map((outcome) => outcome.name), outcomes, prepared };
}

function toolInput(value: JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const text = value['text'];
    const json = value['json'];
    if (typeof text === 'string') {
      return text;
    }
    if (typeof json === 'string') {
      return json;
    }
  }
  return JSON.stringify(value);
}
