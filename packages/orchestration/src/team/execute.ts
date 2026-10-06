import type { JsonValue } from '../../../agent/src/index.js';

const QUERY_LIMIT = 80;
const TEXT_LIMIT = 4_000;

export interface TeamTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, { readonly type: 'string'; readonly description: string }>>;
    readonly required: readonly string[];
  };
}

export interface TeamIO {
  lookup(query: string): Promise<string>;
  post(fromId: string, toId: string, text: string): Promise<string>;
}

export function teamTools(): readonly TeamTool[] {
  return [
    {
      name: 'who',
      description: 'Look up another agent by id or name. Returns identity, prompt, session, and recent turns. Does not call that agent.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Agent id or name.' },
        },
        required: ['query'],
      },
    },
    {
      name: 'note',
      description: 'Leave a note for another agent. They receive it on their next turn. This does not wait for their reply.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient agent id.' },
          text: { type: 'string', description: 'Note text.' },
        },
        required: ['to', 'text'],
      },
    },
  ];
}

export async function executeTeam(
  name: string,
  args: JsonValue,
  fromId: string,
  io: TeamIO,
): Promise<{ readonly text: string }> {
  try {
    if (name === 'who') {
      return { text: await io.lookup(stringArg(args, 'query', QUERY_LIMIT)) };
    }
    if (name === 'note') {
      const to = stringArg(args, 'to', QUERY_LIMIT);
      const text = stringArg(args, 'text', TEXT_LIMIT);
      return { text: await io.post(fromId, to, text) };
    }
    return { text: `error: unknown team tool ${name}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'team tool failed';
    return { text: `error: ${message}` };
  }
}

function stringArg(args: JsonValue, key: string, limit: number): string {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new Error('team tool arguments must be an object');
  }
  const value = Reflect.get(args, key);
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > limit) {
    throw new Error(`${key} must be 1 to ${limit} characters`);
  }
  return trimmed;
}
