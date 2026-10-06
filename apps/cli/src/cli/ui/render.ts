const RESET = '\u001b[0m';
const BOLD_TEAL = '\u001b[1;38;2;45;212;191m';
const TEAL = '\u001b[38;2;45;212;191m';
const DIM = '\u001b[2m';

const MARK = 'SYMindX';
const TAGLINE = 'quiet harbor';
const TITLE = `${MARK} · ${TAGLINE}`;
const RULE = '\u2500'.repeat(Math.min(TITLE.length, 28));

function boldTeal(color: boolean, text: string): string {
  if (!color || text.length === 0) {
    return text;
  }
  return `${BOLD_TEAL}${text}${RESET}`;
}

function teal(color: boolean, text: string): string {
  if (!color || text.length === 0) {
    return text;
  }
  return `${TEAL}${text}${RESET}`;
}

function dimmed(color: boolean, text: string): string {
  if (!color || text.length === 0) {
    return text;
  }
  return `${DIM}${text}${RESET}`;
}

export function renderBanner(color: boolean): string {
  const title = `${boldTeal(color, MARK)}${dimmed(color, ` · ${TAGLINE}`)}`;
  return `${title}\n${dimmed(color, RULE)}\n`;
}

export function renderPrompt(color: boolean, agentId: string, mode: string): string {
  const id = teal(color, agentId);
  if (mode.length === 0) {
    return `${id}  `;
  }
  return `${id} · ${mode}  `;
}

export function renderTool(color: boolean, name: string, detail: string): string {
  const line = detail.length === 0 ? `· ${name}` : `· ${name} ${detail}`;
  return `${dimmed(color, line)}\n`;
}

export function renderReply(color: boolean, speakerId: string, text: string): string {
  const head = `${teal(color, speakerId)}\n`;
  if (text.length === 0) {
    return head;
  }
  const parts = text.split('\n');
  const lines = text.endsWith('\n') ? parts.slice(0, -1) : parts;
  const body = lines.map((line) => `  ${line}`).join('\n');
  return `${head}${body}\n`;
}

export interface PaletteEntry {
  readonly name: string;
  readonly hint: string;
}

export function matchCommands(entries: readonly PaletteEntry[], typed: string): readonly PaletteEntry[] {
  const token = typed.trim().split(/\s+/u)[0] ?? '/';
  const prefix = token.length === 0 ? '/' : token;
  return entries.filter((entry) => entry.name.startsWith(prefix));
}

export function renderPalette(color: boolean, entries: readonly PaletteEntry[]): string {
  if (entries.length === 0) {
    return '';
  }
  const lines = entries.map((entry) => {
    const gap = entry.name.length >= 12 ? '  ' : ' '.repeat(12 - entry.name.length);
    return `${teal(color, entry.name)}${dimmed(color, `${gap}${entry.hint}`)}`;
  });
  return `${lines.join('\n')}\n`;
}

export function renderStatus(color: boolean, lines: readonly string[]): string {
  const kept: string[] = [];
  for (const line of lines) {
    if (line.length > 0) {
      kept.push(line);
    }
  }
  if (kept.length === 0) {
    return '';
  }
  return `${dimmed(color, kept.join('\n'))}\n`;
}
