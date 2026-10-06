import type { AgentRecord, RoomRecord, SessionRecord, TranscriptTurn } from '../../../../packages/orchestration/src/index.js';
import { renderReply } from './ui/index.js';

export function formatAgents(agents: readonly AgentRecord[]): string {
  if (agents.length === 0) {
    return 'No agents.\n';
  }
  return `${agents.map((agent) => `${agent.character.id}  ${agent.character.name}`).join('\n')}\n`;
}

export function formatAgent(agent: AgentRecord): string {
  const session = agent.activeSessionId.length > 0 ? agent.activeSessionId : 'none';
  return [
    `${agent.character.name} (${agent.character.id})`,
    `model ${agent.character.provider.model}`,
    `session ${session}`,
    agent.character.systemPrompt,
    '',
  ].join('\n');
}

export function formatSessions(sessions: readonly SessionRecord[]): string {
  if (sessions.length === 0) {
    return 'No sessions.\n';
  }
  return `${sessions
    .map((session) => `${session.id}  ${session.mode}  ${count(session.turns.length, 'turn')}  ${session.title}`)
    .join('\n')}\n`;
}

export function formatRooms(rooms: readonly RoomRecord[]): string {
  if (rooms.length === 0) {
    return 'No rooms.\n';
  }
  return `${rooms.map((room) => `${room.id}  ${room.title}  ${count(room.members.length, 'member')}`).join('\n')}\n`;
}

export function formatRoom(room: RoomRecord): string {
  const members = room.members.map((member) => member.agentId).join(', ');
  const transcript = formatReplies(room.turns);
  return `${room.id}  ${room.title}\nmembers ${members}\n${transcript}`;
}

export function formatReplies(turns: readonly TranscriptTurn[], color = false): string {
  if (turns.length === 0) {
    return '';
  }
  const blocks: string[] = [];
  for (const turn of turns) {
    const notes: string[] = [];
    if (turn.tools.length > 0) {
      notes.push(`tools ${turn.tools.join(' ')}`);
    }
    if (turn.changed.length > 0) {
      notes.push(`changed ${turn.changed.join(' ')}`);
    }
    const body = notes.length === 0 ? turn.text : `${turn.text}\n${notes.join('\n')}`;
    blocks.push(renderReply(color, turn.speakerId, body).replace(/\n$/u, ''));
  }
  return `${blocks.join('\n\n')}\n`;
}

export function agentReplies(before: readonly TranscriptTurn[], after: readonly TranscriptTurn[]): readonly TranscriptTurn[] {
  const seen = new Set(before.map((turn) => turn.id));
  const replies: TranscriptTurn[] = [];
  for (const turn of after) {
    if (turn.role === 'agent' && !seen.has(turn.id)) {
      replies.push(turn);
    }
  }
  return replies;
}

export function formatBinding(agentId: string, sessionId: string, mode: string): string {
  return `agent ${agentId}\nsession ${sessionId}\nmode ${mode}\n`;
}

export function formatWork(
  items: readonly { readonly id: string; readonly status: string; readonly assigneeId: string; readonly title: string }[],
): string {
  if (items.length === 0) {
    return 'No work.\n';
  }
  return `${items.map((item) => `${item.id}  ${item.status}  ${item.assigneeId.length === 0 ? 'open' : item.assigneeId}  ${item.title}`).join('\n')}\n`;
}

export function formatStatus(
  rows: readonly { readonly id: string; readonly sessions: number }[],
  rooms: number,
  ollama: string,
): string {
  const lines = rows.length === 0 ? ['No agents.'] : rows.map((row) => `${row.id}  ${count(row.sessions, 'session')}`);
  lines.push(`rooms ${rooms}`);
  lines.push(ollama);
  return `${lines.join('\n')}\n`;
}

export function formatPromptStatus(input: {
  readonly agentId: string;
  readonly sessionId: string;
  readonly mode: string;
  readonly turns: number;
  readonly roomId: string;
  readonly ollama: string;
}): string {
  const lines = [`agent ${input.agentId}`, `session ${input.sessionId}`, `mode ${input.mode}`];
  if (input.roomId.length > 0) {
    lines.push(`room ${input.roomId}`);
  }
  lines.push(`turns ${input.turns}`, input.ollama);
  return `${lines.join('\n')}\n`;
}

function count(value: number, noun: string): string {
  return `${value} ${value === 1 ? noun : `${noun}s`}`;
}
