import type { JsonValue, Mind } from '../../../../packages/agent/src/index.js';
import {
  codingPolicy,
  executeWorkspaceTool,
  executeTeam,
  teamTools,
  workspaceTools,
  type TeamIO,
  type TeamTool,
  type WorkspaceIO,
  type WorkspacePolicy,
  type WorkspaceTool,
} from '../../../../packages/orchestration/src/index.js';
import { ollamaChat, type OllamaMessage, type OllamaTool } from '../ollama.js';

const SENDER = /^[A-Za-z0-9_.:-]{1,64}$/;
const ROUNDS = 8;
const PREDICT = 1024;

export async function runCodingTurn(
  mind: Mind,
  base: string,
  signal: AbortSignal,
  text: string,
  sender: string,
  io: WorkspaceIO,
  onTool: (name: string, detail: string) => void,
  policy: WorkspacePolicy = codingPolicy(),
  team?: TeamIO,
  fromId = '',
  workBrief = '',
): Promise<{ readonly text: string; readonly tools: readonly string[]; readonly changed: readonly string[] }> {
  const now = Date.now();
  const who = SENDER.test(sender) ? sender : 'user';
  mind.hear({ channel: 'local', sender: who, text }, now);
  mind.step(now);
  const request = mind.request(signal);
  const specs = team === undefined ? workspaceTools(policy) : [...workspaceTools(policy), ...teamTools()];
  const messages: OllamaMessage[] = [
    { role: 'system', content: `${request.system}\n\n${guidance(policy)}${teamGuidance(team)}${workNote(workBrief)}` },
    ...request.messages.map((message): OllamaMessage => ({ role: message.role, content: message.content })),
  ];
  const used: string[] = [];
  const changed: string[] = [];
  let reply = await ollamaChat(base, messages, ollamaTools(specs), signal, { numPredict: PREDICT });
  for (let round = 0; round < ROUNDS && reply.toolCalls.length > 0; round += 1) {
    if (signal.aborted) {
      throw abortError();
    }
    messages.push({ role: 'assistant', content: reply.text, toolCalls: reply.toolCalls });
    for (const call of reply.toolCalls) {
      onTool(call.name, toolDetail(call.arguments));
      const outcome =
        team !== undefined && isTeamTool(call.name)
          ? { text: (await executeTeam(call.name, call.arguments, fromId, team)).text, changed: [] }
          : await executeWorkspaceTool(call.name, call.arguments, io, policy, signal);
      if (!outcome.text.startsWith('error:')) {
        if (used.length < 16 && !used.includes(call.name)) {
          used.push(call.name);
        }
        for (const path of outcome.changed) {
          if (changed.length < 16 && !changed.includes(path)) {
            changed.push(path);
          }
        }
      }
      messages.push({ role: 'tool', content: outcome.text, toolName: call.name });
    }
    reply = await ollamaChat(base, messages, ollamaTools(specs), signal, { numPredict: PREDICT });
  }
  const spoken = reply.text.trim().length > 0 ? reply.text.trim() : fallback(used, changed);
  mind.say(spoken, now);
  return { text: spoken, tools: used, changed };
}

function workNote(brief: string): string {
  if (brief.length === 0) {
    return '';
  }
  return `\n\nOpen work:\n${brief}`;
}

function teamGuidance(team: TeamIO | undefined): string {
  if (team === undefined) {
    return '';
  }
  return ' Use who to look up another agent and note to leave them a message. Neither waits for that agent.';
}

function guidance(policy: WorkspacePolicy): string {
  if (!policy.writes) {
    return [
      'Plan mode. Inspect with list, read, and search.',
      'Do not edit, write, or run. Those tools are off until the person approves the plan.',
      'Reply with the files you would change and the steps, then wait.',
    ].join(' ');
  }
  return [
    'Workspace mode. Inspect with list, read, and search before you change anything.',
    'edit replaces one exact match. write creates a file, or replaces it when overwrite is true.',
    'run executes a shell command in the workspace. Use it to check the change.',
    'Paths are relative to the workspace root. Do not claim a file changed unless the tool result says it did.',
    'Finish with a short summary of the files you changed.',
  ].join(' ');
}

function isTeamTool(name: string): boolean {
  return teamTools().some((tool) => tool.name === name);
}

function ollamaTools(specs: readonly (WorkspaceTool | TeamTool)[]): readonly OllamaTool[] {
  return specs.map((spec) => ({
    name: spec.name,
    description: spec.description,
    parameters: parameters(spec),
  }));
}

function parameters(spec: WorkspaceTool): JsonValue {
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
  const path = value['path'];
  const command = value['command'];
  const query = value['query'];
  if (typeof path === 'string') {
    return path;
  }
  if (typeof command === 'string') {
    return command;
  }
  if (typeof query === 'string') {
    return query;
  }
  return '';
}

function fallback(tools: readonly string[], changed: readonly string[]): string {
  if (changed.length > 0) {
    return `Changed ${changed.join(', ')}.`;
  }
  if (tools.length === 0) {
    return 'No workspace change was made.';
  }
  return `Used ${tools.join(', ')}.`;
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}
