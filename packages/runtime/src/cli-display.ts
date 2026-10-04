import type { WorkspaceActionRequest } from './workspace-tools.js';
import { displayText } from './agent-security.js';

const MAX_PREVIEW = 1200;

export function sanitizeTerminalText(value: string): string {
  return displayText(value);
}

function bounded(value: string): string {
  const clean = sanitizeTerminalText(value);
  return clean.length > MAX_PREVIEW ? clean.slice(0, MAX_PREVIEW) + '\n[preview truncated]' : clean;
}

export function formatActionPreview(action: WorkspaceActionRequest): string {
  const preview =
    action.kind === 'write'
      ? [
          'Write file: ' + bounded(action.path),
          '--- before ---',
          action.before === null ? '[new file]' : bounded(action.before),
          '--- after ---',
          bounded(action.after),
        ].join('\n')
      : [
          'Run command: ' + bounded(action.command),
          'Arguments: ' + action.args.map(bounded).join(' '),
          'Working directory: ' + bounded(action.cwd),
        ].join('\n');
  return preview.length > 4_000 ? preview.slice(0, 4_000) + '\n[preview truncated]' : preview;
}

export function writeProgress(message: string): void {
  process.stderr.write(sanitizeTerminalText(message) + '\n');
}

export function writeFinalText(message: string): void {
  process.stdout.write(sanitizeTerminalText(message) + '\n');
}
