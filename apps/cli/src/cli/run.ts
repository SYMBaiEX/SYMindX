import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemoMind } from '../answer.js';
import { demoCharacter } from '../character.js';
import { runDemo, type DemoRow } from '../demo.js';
import { runEvals, type EvalRow } from '../evals.js';
import { runFrameworkSuite } from '../suite.js';
import { OLLAMA_MODEL, ollamaChatUrl, ollamaVersion } from '../ollama.js';
import { HOST_EXTENSIONS } from '../extensions/catalog.js';
import { MEMORY_PROVIDERS } from '../extensions/memory.js';
import { HOST_PORTALS } from '../extensions/portals.js';
import { createSqliteCatalog } from './sqlite.js';
import { HELP } from './help.js';
import { CliError, parseArgs, type CliOptions } from './options.js';
import { chatRepl } from './repl.js';
import {
  agentReplies,
  formatAgent,
  formatAgents,
  formatBinding,
  formatPromptStatus,
  formatReplies,
  formatRoom,
  formatRooms,
  formatSessions,
  formatStatus,
  formatWork,
} from './report.js';
import { createOllamaSpeaker, type PlanGate } from './speaker.js';
import { executeSwarm } from './swarm.js';
import { terminalColor } from './term.js';
import { renderBanner, renderPalette, renderPrompt, renderStatus, type PaletteEntry } from './ui/index.js';
import {
  formatBrief,
  loadOrchestrator,
  type AgentRecord,
  type Orchestrator,
  type RoomRecord,
  type SessionMode,
  type SessionRecord,
  type Speaker,
  type TranscriptTurn,
} from '../../../../packages/orchestration/src/index.js';

interface Context {
  readonly options: CliOptions;
  readonly orchestrator: Orchestrator;
  readonly speaker: Speaker;
  readonly agentId: string;
  readonly gate: PlanGate;
}

export async function runCli(argv: readonly string[], dataRoot: string): Promise<number> {
  try {
    const options = parseArgs(argv);
    if (options.help || options.words[0] === 'help') {
      process.stdout.write(HELP);
      return 0;
    }
    if (options.version || options.words[0] === 'version') {
      process.stdout.write(`${await readVersion()}\n`);
      return 0;
    }
    return await dispatch(options, dataRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The command failed';
    const code = error instanceof CliError ? error.code : 1;
    process.stderr.write(`${message}\n`);
    return code;
  }
}

async function dispatch(options: CliOptions, dataRoot: string): Promise<number> {
  const head = options.words[0];
  const rest = options.words.slice(1);
  if (head === undefined) {
    process.stdout.write(HELP);
    return 0;
  }
  if (head === 'extensions') {
    rejectExtra(rest, 'extensions');
    return runExtensions();
  }
  if (head === 'portals') {
    rejectExtra(rest, 'portals');
    return runPortals();
  }
  if (head === 'suite') {
    rejectExtra(rest, 'suite');
    return runSuite();
  }
  if (head === 'eval') {
    rejectExtra(rest, 'eval');
    return runEval(options);
  }
  if (head === 'demo') {
    rejectExtra(rest, 'demo');
    return runScript(options);
  }
  ollamaChatUrl(options.base);
  const orchestrator = await boot(dataRoot);
  const gate: PlanGate = { plan: false };
  const context: Context = {
    options,
    orchestrator,
    speaker: createOllamaSpeaker(options.base, dirname(dataRoot), gate, {
      lookup: async (query) => formatBrief(orchestrator.brief(query)),
      post: async (fromId, toId, text) => {
        const note = await orchestrator.postNote(fromId, toId, text, Date.now());
        return `noted ${note.toId} ${note.id}`;
      },
    }),
    agentId: resolveAgentId(orchestrator, options.agent),
    gate,
  };
  if (head === 'agents' || head === 'agent') {
    await runAgents(context, rest);
    return 0;
  }
  if (head === 'swarm') {
    rejectExtra(rest, 'swarm');
    return executeSwarm(context.options.base, dirname(dataRoot), context.orchestrator);
  }
  if (head === 'chat') {
    await runChat(context, messageFrom(options, rest));
    return 0;
  }
  if (head === 'code' || head === 'build') {
    await runCode(context, messageFrom(options, rest));
    return 0;
  }
  if (head === 'sessions') {
    await runSessions(context, rest);
    return 0;
  }
  if (head === 'rooms') {
    await runRooms(context, rest);
    return 0;
  }
  if (head === 'room') {
    await runRoom(context, rest);
    return 0;
  }
  if (head === 'work') {
    await runWork(context, rest);
    return 0;
  }
  if (head === 'tick') {
    rejectExtra(rest, 'tick');
    runTick(context);
    return 0;
  }
  if (head === 'status') {
    rejectExtra(rest, 'status');
    await runStatus(context);
    return 0;
  }
  throw new CliError(`Unknown command ${head}`);
}

function runExtensions(): number {
  const lines = HOST_EXTENSIONS.map((extension) => `${extension.id}  ${extension.actions.join(',')}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

function runPortals(): number {
  const lines = HOST_PORTALS.map((portal) => `${portal.id}  ${portal.baseUrl}`);
  lines.push(`memory  ${MEMORY_PROVIDERS.join(',')}`);
  process.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

async function boot(dataRoot: string): Promise<Orchestrator> {
  const orchestrator = await loadOrchestrator(createSqliteCatalog(dataRoot));
  const hasDemo = orchestrator.catalog().agents.some((agent) => agent.character.id === 'demo');
  if (!hasDemo) {
    const demo = demoCharacter();
    await orchestrator.createAgent({
      id: 'demo',
      name: 'Demo',
      systemPrompt: demo.systemPrompt,
      model: OLLAMA_MODEL,
      now: Date.now(),
    });
  }
  return orchestrator;
}

function resolveAgentId(orchestrator: Orchestrator, requested: string): string {
  if (requested.length > 0) {
    return requested;
  }
  const first = orchestrator.catalog().agents[0];
  if (first !== undefined) {
    return first.character.id;
  }
  return 'demo';
}

async function runAgents(context: Context, rest: readonly string[]): Promise<void> {
  const sub = rest[0];
  if (sub === undefined) {
    const agents = context.orchestrator.catalog().agents;
    if (context.options.json) {
      writeJson({ ok: true, agents: agents.map(agentSummary) });
      return;
    }
    process.stdout.write(formatAgents(agents));
    return;
  }
  if (sub === 'new') {
    const id = requireWord(rest[1], 'agents new needs an id');
    rejectExtra(rest.slice(2), 'agents new');
    if (context.options.name.trim().length === 0) {
      throw new CliError('agents new needs --name');
    }
    const agent = await context.orchestrator.createAgent({
      id,
      name: context.options.name,
      systemPrompt: context.options.prompt,
      model: OLLAMA_MODEL,
      now: Date.now(),
    });
    if (context.options.json) {
      writeJson({ ok: true, agent: agentSummary(agent) });
      return;
    }
    process.stdout.write(`agent ${agent.character.id}\n`);
    return;
  }
  if (sub === 'show') {
    const id = requireWord(rest[1], 'agents show needs an id');
    rejectExtra(rest.slice(2), 'agents show');
    const agent = requireAgent(context.orchestrator, id);
    if (context.options.json) {
      writeJson({ ok: true, agent: agentSummary(agent) });
      return;
    }
    process.stdout.write(formatAgent(agent));
    return;
  }
  if (sub === 'use') {
    const id = requireWord(rest[1], 'agents use needs an id');
    rejectExtra(rest.slice(2), 'agents use');
    const session = await activateAgent(context.orchestrator, id);
    if (context.options.json) {
      writeJson({ ok: true, agent: id, session: session.id, mode: session.mode });
      return;
    }
    process.stdout.write(formatBinding(id, session.id, session.mode));
    return;
  }
  if (sub === 'about') {
    const query = requireWord(rest[1], 'agents about needs an id or name');
    rejectExtra(rest.slice(2), 'agents about');
    const brief = context.orchestrator.brief(query);
    if (context.options.json) {
      writeJson({ ok: true, brief });
      return;
    }
    process.stdout.write(`${formatBrief(brief)}\n`);
    return;
  }
  throw new CliError(`Unknown agents command ${sub}`);
}

async function runSessions(context: Context, rest: readonly string[]): Promise<void> {
  const sub = rest[0];
  requireAgent(context.orchestrator, context.agentId);
  if (sub === undefined) {
    const sessions = context.orchestrator.listSessions(context.agentId);
    if (context.options.json) {
      writeJson({ ok: true, agent: context.agentId, sessions: sessions.map(sessionSummary) });
      return;
    }
    process.stdout.write(formatSessions(sessions));
    return;
  }
  if (sub === 'new') {
    rejectExtra(rest.slice(1), 'sessions new');
    const session = await context.orchestrator.openSession(context.agentId, Date.now(), context.options.mode);
    if (context.options.json) {
      writeJson({ ok: true, session: sessionSummary(session) });
      return;
    }
    process.stdout.write(`session ${session.id}\n`);
    return;
  }
  throw new CliError(`Unknown sessions command ${sub}`);
}

async function runRooms(context: Context, rest: readonly string[]): Promise<void> {
  const sub = rest[0];
  if (sub === undefined) {
    const rooms = context.orchestrator.listRooms();
    if (context.options.json) {
      writeJson({ ok: true, rooms: rooms.map(roomSummary) });
      return;
    }
    process.stdout.write(formatRooms(rooms));
    return;
  }
  if (sub === 'new') {
    const id = requireWord(rest[1], 'rooms new needs an id');
    rejectExtra(rest.slice(2), 'rooms new');
    if (context.options.title.trim().length === 0) {
      throw new CliError('rooms new needs --title');
    }
    if (context.options.agents.length === 0) {
      throw new CliError('rooms new needs --agents');
    }
    const room = await context.orchestrator.createRoom({
      id,
      title: context.options.title,
      memberIds: context.options.agents,
      now: Date.now(),
    });
    if (context.options.json) {
      writeJson({ ok: true, room: roomSummary(room) });
      return;
    }
    process.stdout.write(`room ${room.id}\n`);
    return;
  }
  if (sub === 'show') {
    const id = requireWord(rest[1], 'rooms show needs an id');
    rejectExtra(rest.slice(2), 'rooms show');
    const room = requireRoom(context.orchestrator, id);
    if (context.options.json) {
      writeJson({ ok: true, room: roomDetail(room) });
      return;
    }
    process.stdout.write(formatRoom(room));
    return;
  }
  throw new CliError(`Unknown rooms command ${sub}`);
}

async function runRoom(context: Context, rest: readonly string[]): Promise<void> {
  const id = requireWord(rest[0], 'room needs an id');
  const message = messageFrom(context.options, rest.slice(1));
  const room = requireRoom(context.orchestrator, id);
  if (message.length > 0) {
    await speakTurns(context, room.turns, (signal) => context.orchestrator.sayRoom(room.id, message, context.speaker, signal, Date.now()));
    return;
  }
  await startRepl(context, { agentId: context.agentId, session: undefined, roomId: room.id });
}

async function runChat(context: Context, message: string): Promise<void> {
  const session = await chatSession(context);
  if (message.length > 0) {
    await speakTurns(context, session.turns, (signal) =>
      context.orchestrator.say(session.id, message, context.speaker, signal, Date.now()),
    );
    return;
  }
  await startRepl(context, { agentId: context.agentId, session, roomId: '' });
}

async function runCode(context: Context, task: string): Promise<void> {
  if (task.length > 0) {
    await runTask(context, 'code', task);
    return;
  }
  const session = await codingSession(context);
  await startRepl(context, { agentId: context.agentId, session, roomId: '' });
}

async function chatSession(context: Context): Promise<SessionRecord> {
  requireAgent(context.orchestrator, context.agentId);
  if (context.options.session.length > 0) {
    return context.orchestrator.useSession(context.agentId, context.options.session);
  }
  const agent = requireAgent(context.orchestrator, context.agentId);
  const sessions = context.orchestrator.listSessions(context.agentId);
  const active = sessions.find((item) => item.id === agent.activeSessionId);
  if (active !== undefined && active.mode === 'chat') {
    return context.orchestrator.useSession(context.agentId, active.id);
  }
  const latestChat = [...sessions].reverse().find((item) => item.mode === 'chat');
  if (latestChat !== undefined) {
    return context.orchestrator.useSession(context.agentId, latestChat.id);
  }
  return context.orchestrator.openSession(context.agentId, Date.now(), 'chat');
}

async function codingSession(context: Context): Promise<SessionRecord> {
  requireAgent(context.orchestrator, context.agentId);
  if (context.options.session.length > 0) {
    return context.orchestrator.useSession(context.agentId, context.options.session);
  }
  const agent = requireAgent(context.orchestrator, context.agentId);
  if (agent.activeSessionId.length > 0) {
    const active = context.orchestrator.listSessions(context.agentId).find((item) => item.id === agent.activeSessionId);
    if (active !== undefined && active.mode !== 'chat') {
      return context.orchestrator.useSession(context.agentId, active.id);
    }
  }
  return context.orchestrator.openSession(context.agentId, Date.now(), 'code');
}

async function runTask(context: Context, mode: SessionMode, task: string): Promise<void> {
  requireAgent(context.orchestrator, context.agentId);
  const session = await context.orchestrator.openSession(context.agentId, Date.now(), mode);
  await speakTurns(context, session.turns, (signal) => context.orchestrator.say(session.id, task, context.speaker, signal, Date.now()));
}

async function runWork(context: Context, rest: readonly string[]): Promise<void> {
  const sub = rest[0];
  if (sub === undefined) {
    const items = context.orchestrator.listWork();
    if (context.options.json) {
      writeJson({ ok: true, work: items });
      return;
    }
    process.stdout.write(formatWork(items));
    return;
  }
  if (sub === 'add') {
    const title = rest.slice(1).join(' ').trim();
    if (title.length === 0) {
      throw new CliError('work add needs a title');
    }
    const after = context.options.after.trim();
    const assignee = context.options.agent.trim();
    const item = await context.orchestrator.addWork({
      title,
      parentId: after,
      assigneeId: assignee,
      dependsOn: after.length === 0 ? [] : [after],
      now: Date.now(),
    });
    if (context.options.json) {
      writeJson({ ok: true, work: item });
      return;
    }
    process.stdout.write(`${item.id}  ${item.status}\n`);
    return;
  }
  if (sub === 'done') {
    const id = requireWord(rest[1], 'work done needs an id');
    rejectExtra(rest.slice(2), 'work done');
    const unblocked = await context.orchestrator.finishWork(id, Date.now());
    if (context.options.json) {
      writeJson({ ok: true, done: id, unblocked });
      return;
    }
    const lines = [`done ${id}`];
    for (const next of unblocked) {
      lines.push(`ready ${next}`);
    }
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }
  throw new CliError(`Unknown work command ${sub}`);
}

function runTick(context: Context): void {
  const due = context.orchestrator.due(Date.now());
  if (context.options.json) {
    writeJson({ ok: true, due });
    return;
  }
  if (due.length === 0) {
    process.stdout.write('none due\n');
    return;
  }
  process.stdout.write(`${due.map((id) => `due ${id}`).join('\n')}\n`);
}

async function runStatus(context: Context): Promise<void> {
  const agents = context.orchestrator.catalog().agents;
  const rows = agents.map((agent) => ({
    id: agent.character.id,
    name: agent.character.name,
    sessions: context.orchestrator.listSessions(agent.character.id).length,
  }));
  const sessions = rows.reduce((total, row) => total + row.sessions, 0);
  const rooms = context.orchestrator.listRooms().length;
  const ollama = await ollamaLine(context.options.base);
  if (context.options.json) {
    writeJson({ ok: true, agents: rows, sessions, rooms, ollama });
    return;
  }
  process.stdout.write(formatStatus(rows, rooms, ollama));
}

function holdPlan(
  context: Context,
  roomId: string,
  session: SessionRecord | undefined,
  agentId: string,
): string {
  if (roomId.length > 0) {
    return 'rooms stay in chat\n';
  }
  const mode = (session ?? findActiveSession(context.orchestrator, agentId))?.mode ?? 'chat';
  if (mode === 'chat') {
    return 'plan holds writes in a code session. Use /mode code first.\n';
  }
  context.gate.plan = true;
  return 'plan held. Writes and shell stay off until /apply.\n';
}

async function startRepl(
  context: Context,
  initial: { readonly agentId: string; readonly session: SessionRecord | undefined; readonly roomId: string },
): Promise<void> {
  let agentId = initial.agentId;
  let session = initial.session;
  let roomId = initial.roomId;
  const ink = terminalColor(process.stderr);
  if (process.stderr.isTTY === true) {
    process.stderr.write(renderBanner(ink));
  }
  const code = await chatRepl({
    prompt: () => {
      if (roomId.length > 0) {
        return `${renderStatus(ink, [roomId])}${renderPrompt(ink, roomId, 'room')}`;
      }
      const current = session ?? findActiveSession(context.orchestrator, agentId);
      const label = current === undefined ? 'new' : current.id;
      const mode = current?.mode ?? 'chat';
      const shown = context.gate.plan && mode !== 'chat' ? 'plan' : mode;
      return `${renderStatus(ink, [label])}${renderPrompt(ink, agentId, shown)}`;
    },
    palette: (entries: readonly PaletteEntry[]) => renderPalette(ink, entries),
    queued: (count) => renderStatus(ink, [`queued ${count}`]),
    agents: () => formatAgents(context.orchestrator.catalog().agents),
    use: async (id) => {
      const next = await activateAgent(context.orchestrator, id);
      agentId = id;
      session = next;
      roomId = '';
      return formatBinding(agentId, next.id, next.mode);
    },
    sessions: () => {
      requireAgent(context.orchestrator, agentId);
      return formatSessions(context.orchestrator.listSessions(agentId));
    },
    sessionNew: async () => {
      const next = await context.orchestrator.openSession(agentId, Date.now(), 'chat');
      session = next;
      roomId = '';
      return `session ${next.id}\n`;
    },
    mode: async (next) => {
      const opened = await context.orchestrator.openSession(agentId, Date.now(), next);
      session = opened;
      roomId = '';
      return `session ${opened.id}\nmode ${opened.mode}\n`;
    },
    plan: () => holdPlan(context, roomId, session, agentId),
    apply: () => {
      context.gate.plan = false;
      return 'plan released. Writes and shell are on.\n';
    },
    rooms: () => formatRooms(context.orchestrator.listRooms()),
    room: async (id) => {
      const room = requireRoom(context.orchestrator, id);
      roomId = room.id;
      return `room ${room.id}\n`;
    },
    who: (query) => `${formatBrief(context.orchestrator.brief(query))}\n`,
    note: async (toId, text) => {
      const noted = await context.orchestrator.postNote(agentId, toId, text, Date.now());
      return `noted ${noted.toId} ${noted.id}\n`;
    },
    work: () => formatWork(context.orchestrator.listWork()),
    workAdd: async (title) => {
      const item = await context.orchestrator.addWork({
        title,
        parentId: '',
        assigneeId: agentId,
        dependsOn: [],
        now: Date.now(),
      });
      return `${item.id}  ${item.status}\n`;
    },
    workDone: async (id) => {
      const unblocked = await context.orchestrator.finishWork(id, Date.now());
      const lines = [`done ${id}`];
      for (const next of unblocked) {
        lines.push(`ready ${next}`);
      }
      return `${lines.join('\n')}\n`;
    },
    tick: () => {
      const due = context.orchestrator.due(Date.now());
      if (due.length === 0) {
        return 'none due\n';
      }
      return `${due.map((id) => `due ${id}`).join('\n')}\n`;
    },
    status: async () => {
      const ollama = await ollamaLine(context.options.base);
      const shown = session ?? findActiveSession(context.orchestrator, agentId);
      const room = roomId.length > 0 ? requireRoom(context.orchestrator, roomId) : undefined;
      return formatPromptStatus({
        agentId,
        sessionId: shown?.id ?? 'none',
        mode: context.gate.plan && (shown?.mode ?? 'chat') !== 'chat' ? 'plan' : (shown?.mode ?? 'none'),
        turns: room !== undefined ? room.turns.length : (shown?.turns.length ?? 0),
        roomId,
        ollama,
      });
    },
    clear: async () => {
      if (roomId.length > 0) {
        return 'rooms are not cleared\n';
      }
      const mode = session?.mode ?? 'chat';
      const next = await context.orchestrator.openSession(agentId, Date.now(), mode);
      session = next;
      return `session ${next.id}\n`;
    },
    turn: async (text, signal) => {
      if (roomId.length > 0) {
        const room = requireRoom(context.orchestrator, roomId);
        const updated = await runSignal(context.options.timeoutMs, signal, (linked) =>
          context.orchestrator.sayRoom(room.id, text, context.speaker, linked, Date.now()),
        );
        return formatReplies(agentReplies(room.turns, updated.turns), terminalColor(process.stdout));
      }
      const current = session ?? (await activateAgent(context.orchestrator, agentId));
      const updated = await runSignal(context.options.timeoutMs, signal, (linked) =>
        context.orchestrator.say(current.id, text, context.speaker, linked, Date.now()),
      );
      session = updated;
      return formatReplies(agentReplies(current.turns, updated.turns), terminalColor(process.stdout));
    },
  });
  if (code !== 0) {
    throw new CliError('cancelled', code);
  }
}

async function activateAgent(orchestrator: Orchestrator, agentId: string, mode: SessionMode = 'chat'): Promise<SessionRecord> {
  const agent = requireAgent(orchestrator, agentId);
  if (agent.activeSessionId.length > 0) {
    return orchestrator.useSession(agentId, agent.activeSessionId);
  }
  return orchestrator.openSession(agentId, Date.now(), mode);
}

async function speakTurns(
  context: Context,
  before: readonly TranscriptTurn[],
  run: (signal: AbortSignal) => Promise<{ readonly turns: readonly TranscriptTurn[] }>,
): Promise<void> {
  const cancel = new AbortController();
  const stop = bindCancel(() => {
    cancel.abort();
  });
  try {
    const updated = await runSignal(context.options.timeoutMs, cancel.signal, run);
    const printed = formatReplies(agentReplies(before, updated.turns), terminalColor(process.stdout));
    if (printed.length > 0) {
      process.stdout.write(printed);
    }
  } catch (error) {
    if (cancel.signal.aborted) {
      throw new CliError('cancelled', 130);
    }
    throw error;
  } finally {
    stop();
  }
}

async function runSignal<T>(timeoutMs: number, signal: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  return run(linkSignals(signal, AbortSignal.timeout(timeoutMs)));
}

async function ollamaLine(base: string): Promise<string> {
  ollamaChatUrl(base);
  try {
    const version = await ollamaVersion(base, AbortSignal.timeout(2_000));
    return `ollama ${version} at ${base}`;
  } catch {
    return 'ollama unreachable';
  }
}

function findActiveSession(orchestrator: Orchestrator, agentId: string): SessionRecord | undefined {
  const agent = orchestrator.catalog().agents.find((item) => item.character.id === agentId);
  if (agent === undefined || agent.activeSessionId.length === 0) {
    return undefined;
  }
  return orchestrator.listSessions(agentId).find((item) => item.id === agent.activeSessionId);
}

function requireAgent(orchestrator: Orchestrator, agentId: string): AgentRecord {
  const agent = orchestrator.catalog().agents.find((item) => item.character.id === agentId);
  if (agent === undefined) {
    throw new CliError(`No agent ${agentId}`);
  }
  return agent;
}

function requireRoom(orchestrator: Orchestrator, roomId: string): RoomRecord {
  const room = orchestrator.listRooms().find((item) => item.id === roomId);
  if (room === undefined) {
    throw new CliError(`No room ${roomId}`);
  }
  return room;
}

function agentSummary(agent: AgentRecord): {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  readonly systemPrompt: string;
  readonly activeSessionId: string;
} {
  return {
    id: agent.character.id,
    name: agent.character.name,
    model: agent.character.provider.model,
    systemPrompt: agent.character.systemPrompt,
    activeSessionId: agent.activeSessionId,
  };
}

function sessionSummary(session: SessionRecord): {
  readonly id: string;
  readonly agentId: string;
  readonly title: string;
  readonly mode: SessionMode;
  readonly turns: number;
} {
  return {
    id: session.id,
    agentId: session.agentId,
    title: session.title,
    mode: session.mode,
    turns: session.turns.length,
  };
}

function roomSummary(room: RoomRecord): {
  readonly id: string;
  readonly title: string;
  readonly members: readonly string[];
  readonly turns: number;
} {
  return {
    id: room.id,
    title: room.title,
    members: room.members.map((member) => member.agentId),
    turns: room.turns.length,
  };
}

function roomDetail(room: RoomRecord): {
  readonly id: string;
  readonly title: string;
  readonly members: readonly string[];
  readonly turns: readonly TranscriptTurn[];
} {
  return {
    id: room.id,
    title: room.title,
    members: room.members.map((member) => member.agentId),
    turns: room.turns,
  };
}

function messageFrom(options: CliOptions, rest: readonly string[]): string {
  const positional = rest.join(' ').trim();
  if (options.message.length > 0 && positional.length > 0) {
    throw new CliError('Pass either --message or a positional message, not both');
  }
  return options.message.length > 0 ? options.message : positional;
}

function requireWord(value: string | undefined, message: string): string {
  if (value === undefined || value.length === 0) {
    throw new CliError(message);
  }
  return value;
}

function rejectExtra(rest: readonly string[], command: string): void {
  if (rest.length > 0) {
    throw new CliError(`${command} does not take extra arguments`);
  }
}

function writeJson(value: object): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function runSuite(): Promise<number> {
  const summary = await runFrameworkSuite();
  process.stdout.write(summary.text);
  return summary.failed === 0 ? 0 : 1;
}

async function runEval(options: CliOptions): Promise<number> {
  ollamaChatUrl(options.base);
  const write = options.json ? process.stderr : process.stdout;
  const summary = await runEvals(options.base, AbortSignal.timeout(300_000), (row) => {
    write.write(`${formatEval(row)}\n`);
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ ok: summary.failed === 0, ...summary })}\n`);
  } else {
    process.stdout.write(`${summary.passed} passed, ${summary.failed} failed\n`);
  }
  return summary.failed > 0 ? 1 : 0;
}

async function runScript(options: CliOptions): Promise<number> {
  ollamaChatUrl(options.base);
  const mind = createDemoMind(Date.now());
  const write = options.json ? process.stderr : process.stdout;
  const summary = await runDemo(mind, options.base, AbortSignal.timeout(180_000), (row) => {
    write.write(`${formatDemo(row)}\n`);
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ ok: summary.failed === 0, ...summary })}\n`);
  } else {
    process.stdout.write(`${summary.passed} passed, ${summary.failed} failed\n`);
  }
  return summary.failed > 0 ? 1 : 0;
}

function formatEval(row: EvalRow): string {
  if (row.status === 'running') {
    return `… ${row.group}/${row.id}`;
  }
  if (row.status === 'queued') {
    return `queued ${row.group}/${row.id}`;
  }
  const mark = row.status === 'pass' ? 'pass' : 'FAIL';
  return `${mark} ${String(row.ms).padStart(5)}ms  ${row.group}/${row.id}  ${row.detail}`;
}

function formatDemo(row: DemoRow): string {
  if (row.status === 'running') {
    return `… ${row.id}`;
  }
  if (row.status === 'queued') {
    return `queued ${row.id}`;
  }
  const mark = row.status === 'pass' ? 'pass' : 'FAIL';
  return `${mark} ${String(row.ms).padStart(5)}ms  ${row.id}  ${row.detail}`;
}

async function readVersion(): Promise<string> {
  const raw = await readFile(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '@symindx/cli';
  }
  const version = Reflect.get(parsed, 'version');
  return typeof version === 'string' ? `@symindx/cli ${version}` : '@symindx/cli';
}

function bindCancel(listener: () => void): () => void {
  process.on('SIGINT', listener);
  return () => {
    process.off('SIGINT', listener);
  };
}

function linkSignals(first: AbortSignal, second: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const abort = (): void => {
    controller.abort();
  };
  for (const signal of [first, second]) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}
