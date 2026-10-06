import { createInterface } from 'node:readline/promises';
import { HELP } from './help.js';
import { CliError } from './options.js';
import { matchCommands, type PaletteEntry } from './ui/index.js';

const COMMANDS: readonly PaletteEntry[] = [
  { name: '/help', hint: 'Show usage' },
  { name: '/exit', hint: 'Leave the prompt' },
  { name: '/agents', hint: 'List agents' },
  { name: '/use', hint: 'Switch to an agent' },
  { name: '/sessions', hint: 'List sessions for this agent' },
  { name: '/session', hint: 'Open a new chat session' },
  { name: '/mode', hint: 'Open a chat or code session' },
  { name: '/plan', hint: 'Hold writes until approval' },
  { name: '/apply', hint: 'Release the plan hold' },
  { name: '/rooms', hint: 'List rooms' },
  { name: '/room', hint: 'Enter a room' },
  { name: '/who', hint: 'Look up an agent' },
  { name: '/note', hint: 'Leave a note for an agent' },
  { name: '/work', hint: 'List, add, or finish work' },
  { name: '/tick', hint: 'List agents who have gone quiet' },
  { name: '/status', hint: 'Show this session' },
  { name: '/clear', hint: 'Start a fresh session in this mode' },
];

export interface ReplHost {
  prompt(): string;
  palette(entries: readonly PaletteEntry[]): string;
  agents(): string;
  use(id: string): Promise<string>;
  sessions(): string;
  sessionNew(): Promise<string>;
  mode(next: 'chat' | 'code' | 'build'): Promise<string>;
  plan(): string;
  apply(): string;
  rooms(): string;
  room(id: string): Promise<string>;
  status(): Promise<string>;
  who(query: string): string;
  note(toId: string, text: string): Promise<string>;
  work(): string;
  workAdd(title: string): Promise<string>;
  workDone(id: string): Promise<string>;
  tick(): string;
  clear(): Promise<string>;
  queued(count: number): string;
  turn(text: string, signal: AbortSignal): Promise<string>;
}

export async function chatRepl(host: ReplHost): Promise<number> {
  const lines = createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: process.stdin.isTTY === true,
  });
  const waiting: string[] = [];
  let wake: (() => void) | undefined;
  let closed = false;
  let active: AbortController | undefined;
  let interrupted = false;
  const onLine = (line: string): void => {
    waiting.push(line);
    if (active !== undefined) {
      const note = host.queued(waiting.length);
      if (note.length > 0) {
        process.stderr.write(note);
      }
    }
    wake?.();
    wake = undefined;
  };
  const onClose = (): void => {
    closed = true;
    wake?.();
    wake = undefined;
  };
  const onCancel = (): void => {
    if (active !== undefined) {
      active.abort();
      return;
    }
    interrupted = true;
    lines.close();
  };
  lines.on('line', onLine);
  lines.on('close', onClose);
  process.on('SIGINT', onCancel);
  try {
    if (process.stdin.isTTY === true) {
      process.stderr.write(host.prompt());
    }
    while (!interrupted) {
      const next = waiting.shift();
      if (next === undefined) {
        if (closed) {
          break;
        }
        await new Promise<void>((resolve) => {
          if (waiting.length > 0 || closed) {
            resolve();
            return;
          }
          wake = resolve;
        });
        continue;
      }
      const text = next.trim();
      if (text.length > 0) {
        try {
          const printed = await handleLine(host, text, (controller) => {
            active = controller;
          });
          if (printed === null) {
            break;
          }
          if (printed.length > 0) {
            process.stdout.write(printed.endsWith('\n') ? printed : `${printed}\n`);
          }
        } catch (error) {
          if (active?.signal.aborted === true) {
            process.stderr.write('cancelled\n');
          } else {
            const message = error instanceof Error ? error.message : 'The turn failed';
            process.stderr.write(`${message}\n`);
          }
        } finally {
          active = undefined;
        }
      }
      if (process.stdin.isTTY === true && !interrupted && waiting.length === 0) {
        process.stderr.write(host.prompt());
      }
    }
  } finally {
    process.off('SIGINT', onCancel);
    lines.off('line', onLine);
    lines.off('close', onClose);
    lines.close();
  }
  return interrupted ? 130 : 0;
}

async function handleLine(
  host: ReplHost,
  text: string,
  arm: (controller: AbortController) => void,
): Promise<string | null> {
  if (!text.startsWith('/')) {
    const controller = new AbortController();
    arm(controller);
    return host.turn(text, controller.signal);
  }
  const { command, args } = splitSlash(text);
  if (!COMMANDS.some((entry) => entry.name === command)) {
    const matches = matchCommands(COMMANDS, command);
    if (matches.length === 0) {
      throw new CliError(`Unknown command ${command}. Type / for commands.`);
    }
    return host.palette(matches);
  }
  if (command === '/exit') {
    rejectArgs(command, args);
    return null;
  }
  if (command === '/help') {
    rejectArgs(command, args);
    return HELP;
  }
  if (command === '/agents') {
    rejectArgs(command, args);
    return host.agents();
  }
  if (command === '/use') {
    const id = singleArg(args, '/use needs an agent id');
    return host.use(id);
  }
  if (command === '/sessions') {
    rejectArgs(command, args);
    return host.sessions();
  }
  if (command === '/session') {
    const verb = args[0];
    if (args.length !== 1 || verb !== 'new') {
      throw new CliError('/session new opens a chat session');
    }
    return host.sessionNew();
  }
  if (command === '/mode') {
    const next = singleArg(args, '/mode needs chat, code, or build');
    if (next !== 'chat' && next !== 'code' && next !== 'build') {
      throw new CliError('/mode needs chat, code, or build');
    }
    return host.mode(next);
  }
  if (command === '/plan') {
    rejectArgs(command, args);
    return host.plan();
  }
  if (command === '/apply') {
    rejectArgs(command, args);
    return host.apply();
  }
  if (command === '/rooms') {
    rejectArgs(command, args);
    return host.rooms();
  }
  if (command === '/room') {
    const id = singleArg(args, '/room needs a room id');
    return host.room(id);
  }
  if (command === '/who') {
    const query = singleArg(args, '/who needs an agent id or name');
    return host.who(query);
  }
  if (command === '/note') {
    const toId = args[0];
    const text = args.slice(1).join(' ').trim();
    if (args.length < 2 || toId === undefined || text.length === 0) {
      throw new CliError('/note needs an agent id and text');
    }
    return host.note(toId, text);
  }
  if (command === '/work') {
    if (args.length === 0) {
      return host.work();
    }
    if (args[0] === 'add') {
      const title = args.slice(1).join(' ').trim();
      if (title.length === 0) {
        throw new CliError('/work add needs a title');
      }
      return host.workAdd(title);
    }
    if (args[0] === 'done') {
      const id = singleArg(args.slice(1), '/work done needs an id');
      return host.workDone(id);
    }
    throw new CliError('/work lists work. /work add and /work done change it.');
  }
  if (command === '/tick') {
    rejectArgs(command, args);
    return host.tick();
  }
  if (command === '/status') {
    rejectArgs(command, args);
    return host.status();
  }
  if (command === '/clear') {
    rejectArgs(command, args);
    return host.clear();
  }
  throw new CliError(`Unknown command ${command}. Type / for commands.`);
}

function rejectArgs(command: string, args: readonly string[]): void {
  if (args.length > 0) {
    throw new CliError(`${command} does not take arguments`);
  }
}

function singleArg(args: readonly string[], message: string): string {
  const value = args[0];
  if (args.length !== 1 || value === undefined) {
    throw new CliError(message);
  }
  return value;
}

function splitSlash(text: string): { readonly command: string; readonly args: readonly string[] } {
  const parts = text.split(/\s+/u).filter((part) => part.length > 0);
  const command = parts[0] ?? '/help';
  return { command, args: parts.slice(1) };
}
