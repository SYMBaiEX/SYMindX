import { SYMindXError } from './errors.js';

export type CliFlags = Map<string, string>;

export type AgentCommand = 'chat' | 'code' | 'build' | 'create' | 'list' | 'show' | 'history';

export interface AgentInvocation {
  command: AgentCommand;
  flags: CliFlags;
  positionals: string[];
}

const COMMANDS = new Set<AgentCommand>([
  'chat',
  'code',
  'build',
  'create',
  'list',
  'show',
  'history',
]);
const VALUE_OPTIONS = new Set([
  'backend',
  'workspace',
  'character',
  'db',
  'agent',
  'session',
  'model',
  'message',
  'approval',
  'max-rounds',
  'timeout',
  'codex-path',
  'env-file',
  'base-url',
  'key-env',
  'out',
  'name',
  'id',
]);
const BOOLEAN_OPTIONS = new Set(['json', 'yes', 'offline']);

export function parseAgentInvocation(argv: string[]): AgentInvocation {
  const args = [...argv];
  let command: AgentCommand = 'chat';
  if (args[0] && !args[0].startsWith('--') && COMMANDS.has(args[0] as AgentCommand)) {
    command = args.shift() as AgentCommand;
  } else if (args[0] === 'init') {
    command = 'create';
    args.shift();
  }

  const flags = new Map<string, string>();
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]!;
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const equals = token.indexOf('=');
    const key = token.slice(2, equals === -1 ? undefined : equals);
    if (!VALUE_OPTIONS.has(key) && !BOOLEAN_OPTIONS.has(key)) {
      throw new SYMindXError('VALIDATION', 'Unknown option: --' + key);
    }
    if (flags.has(key)) throw new SYMindXError('VALIDATION', 'Duplicate option: --' + key);
    if (BOOLEAN_OPTIONS.has(key)) {
      if (equals !== -1)
        throw new SYMindXError('VALIDATION', '--' + key + ' does not take a value');
      flags.set(key, 'true');
      continue;
    }

    const inlineValue = equals === -1 ? undefined : token.slice(equals + 1);
    const consumesNext = inlineValue === undefined;
    const nextValue = inlineValue ?? args[++index];
    if (
      nextValue === undefined ||
      nextValue === '' ||
      (consumesNext && nextValue.startsWith('--'))
    ) {
      throw new SYMindXError('VALIDATION', '--' + key + ' requires a value');
    }
    flags.set(key, nextValue);
  }

  validateOptions(command, flags);
  return { command, flags, positionals };
}

function validateOptions(command: AgentCommand, flags: CliFlags): void {
  const shared = ['workspace', 'env-file', 'json'];
  const agentOptions = [
    'backend',
    'character',
    'db',
    'agent',
    'session',
    'model',
    'message',
    'approval',
    'max-rounds',
    'timeout',
    'codex-path',
    'yes',
  ];
  const allowed = new Set(
    command === 'create'
      ? [...shared, 'out', 'name', 'id', 'model', 'base-url', 'key-env', 'offline']
      : ['list', 'show', 'history'].includes(command)
        ? [
            ...shared,
            'backend',
            'character',
            'db',
            'agent',
            'session',
            'model',
            'timeout',
            'codex-path',
          ]
        : [...shared, ...agentOptions],
  );
  for (const key of flags.keys()) {
    if (!allowed.has(key)) {
      throw new SYMindXError('VALIDATION', '--' + key + ' is not valid with agent ' + command);
    }
  }
}

export function parseBoundedInteger(
  value: string | undefined,
  name: string,
  minimum: number,
  maximum: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) {
    throw new SYMindXError(
      'VALIDATION',
      '--' + name + ' must be an integer from ' + minimum + ' to ' + maximum,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new SYMindXError(
      'VALIDATION',
      '--' + name + ' must be an integer from ' + minimum + ' to ' + maximum,
    );
  }
  return parsed;
}
