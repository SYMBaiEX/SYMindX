export class CliError extends Error {
  readonly code: number;

  constructor(message: string, code = 1) {
    super(message);
    this.code = code;
  }
}

export type CliMode = 'chat' | 'code' | 'build';

export interface CliOptions {
  readonly help: boolean;
  readonly version: boolean;
  readonly json: boolean;
  readonly base: string;
  readonly agent: string;
  readonly session: string;
  readonly name: string;
  readonly prompt: string;
  readonly message: string;
  readonly title: string;
  readonly mode: CliMode;
  readonly agents: readonly string[];
  readonly after: string;
  readonly timeoutMs: number;
  readonly words: readonly string[];
}

const DEFAULT_BASE = 'http://127.0.0.1:11434';

export function parseArgs(argv: readonly string[]): CliOptions {
  let help = false;
  let version = false;
  let json = false;
  let base = DEFAULT_BASE;
  let agent = '';
  let session = '';
  let name = '';
  let prompt = '';
  let message = '';
  let title = '';
  let mode: CliMode = 'chat';
  let agents: readonly string[] = [];
  let after = '';
  let timeoutMs = 60_000;
  const words: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (token === '--') {
      words.push(...argv.slice(index + 1));
      break;
    }
    if (token === '--help' || token === '-h') {
      help = true;
      continue;
    }
    if (token === '--version') {
      version = true;
      continue;
    }
    if (token === '--json') {
      json = true;
      continue;
    }
    if (token === '--base') {
      base = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--character' || token === '--agent') {
      agent = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--session') {
      session = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--name') {
      name = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--prompt') {
      prompt = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--message' || token === '-m') {
      message = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--title') {
      title = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--mode') {
      mode = readMode(readValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--after') {
      after = readValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--agents') {
      agents = readAgents(readValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--timeout') {
      timeoutMs = readTimeout(readValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token.startsWith('-')) {
      throw new CliError(`Unknown option ${token}`);
    }
    words.push(token);
  }

  return {
    help,
    version,
    json,
    base,
    agent,
    session,
    name,
    prompt,
    message,
    title,
    mode,
    agents,
    after,
    timeoutMs,
    words,
  };
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('-')) {
    throw new CliError(`${flag} needs a value`);
  }
  return value;
}

function readMode(value: string): CliMode {
  if (value === 'chat' || value === 'code' || value === 'build') {
    return value;
  }
  throw new CliError('--mode must be chat, code, or build');
}

function readAgents(value: string): readonly string[] {
  const agents: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (id.length > 0) {
      agents.push(id);
    }
  }
  if (agents.length === 0) {
    throw new CliError('--agents needs a comma-separated list');
  }
  return agents;
}

function readTimeout(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new CliError('--timeout must be a whole number of seconds from 1 to 300');
  }
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) {
    throw new CliError('--timeout must be a whole number of seconds from 1 to 300');
  }
  return seconds * 1000;
}
