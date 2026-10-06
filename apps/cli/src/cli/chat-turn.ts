import type { JsonValue, Mind } from '../../../../packages/agent/src/index.js';
import {
  executeResearch,
  researchTools,
  type ResearchIO,
  type ResearchTool,
} from '../../../../packages/orchestration/src/research/index.js';
import { executeTeam, teamTools, type TeamIO, type TeamTool } from '../../../../packages/orchestration/src/team/index.js';
import { ollamaChat, type OllamaMessage, type OllamaTool } from '../ollama.js';

const SENDER = /^[A-Za-z0-9_.:-]{1,64}$/;
const ROUNDS = 4;
const PREDICT = 512;

export async function runChatTurn(
  mind: Mind,
  base: string,
  signal: AbortSignal,
  text: string,
  sender: string,
  io: ResearchIO,
  onTool: (name: string, detail: string) => void,
  team: TeamIO,
  fromId: string,
  workBrief = '',
): Promise<{ readonly text: string; readonly tools: readonly string[] }> {
  const now = Date.now();
  const who = SENDER.test(sender) ? sender : 'user';
  mind.hear({ channel: 'local', sender: who, text }, now);
  mind.step(now);
  const request = mind.request(signal);
  const specs = [...researchTools(), ...teamTools()];
  const messages: OllamaMessage[] = [
    { role: 'system', content: `${request.system}\n\n${guidance()}${workNote(workBrief)}` },
    ...request.messages.map((message): OllamaMessage => ({ role: message.role, content: message.content })),
  ];
  const used: string[] = [];
  let reply = await ollamaChat(base, messages, ollamaTools(specs), signal, { numPredict: PREDICT });
  for (let round = 0; round < ROUNDS && reply.toolCalls.length > 0; round += 1) {
    if (signal.aborted) {
      throw abortError();
    }
    messages.push({ role: 'assistant', content: reply.text, toolCalls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      onTool(call.name, toolDetail(call.arguments));
      const outcome = isTeamTool(call.name)
        ? await executeTeam(call.name, call.arguments, fromId, team)
        : await executeResearch(call.name, call.arguments, io, signal);
      if (!outcome.text.startsWith('error:')) {
        if (used.length < 16 && !used.includes(call.name)) {
          used.push(call.name);
        }
      }
      messages.push({ role: 'tool', content: outcome.text, toolName: call.name });
    }
    reply = await ollamaChat(base, messages, ollamaTools(specs), signal, { numPredict: PREDICT });
  }
  const spoken = reply.text.trim().length > 0 ? reply.text.trim() : 'I could not finish that.';
  mind.say(spoken, now);
  return { text: spoken, tools: used };
}

function workNote(brief: string): string {
  if (brief.length === 0) {
    return '';
  }
  return `\n\nOpen work:\n${brief}`;
}

function guidance(): string {
  return [
    'You can search the public web with the web tool and read one public page with the page tool.',
    'When the user names web or page, call that tool before you answer.',
    'Use who to look up another agent without calling them. Use note to leave them a message they read on their next turn.',
    'Use them for current facts, sources, or research. Otherwise answer directly. Do not invent citations.',
  ].join(' ');
}

function isTeamTool(name: string): boolean {
  return teamTools().some((tool) => tool.name === name);
}

function ollamaTools(specs: readonly (ResearchTool | TeamTool)[]): readonly OllamaTool[] {
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    parameters: parameters(spec),
  }));
}

function parameters(spec: ResearchTool): JsonValue {
  const properties: { [key: string]: JsonValue } = {};
  for (const key of Object.keys(spec.parameters.properties)) {
    const field = spec.parameters.properties[key];
    if (field === undefined) {
      continue;
    }
    properties[key] = { type: field.type, description: field.description };
  }
  return { type: 'object', properties, required: [...spec.parameters.required] };
}

function toolDetail(value: JsonValue): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }
  const query = value['query'];
  const url = value['url'];
  if (typeof query === 'string') {
    return query;
  }
  if (typeof url === 'string') {
    return url;
  }
  return '';
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}
