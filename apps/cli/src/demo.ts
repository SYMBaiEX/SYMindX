import type { Mind } from '../../../packages/agent/src/index.js';
import { ask, type Answer } from './answer.js';

export interface DemoTurn {
  readonly id: string;
  readonly prompt: string;
  readonly pass: (answer: Answer, mind: Mind) => boolean;
}

export interface DemoRow {
  readonly id: string;
  readonly status: 'queued' | 'running' | 'pass' | 'fail';
  readonly ms: number;
  readonly prompt: string;
  readonly text: string;
  readonly tools: readonly string[];
  readonly detail: string;
}

export const DEMO: readonly DemoTurn[] = [
  {
    id: 'introduce',
    prompt: 'What is your name? Reply with only the name.',
    pass: (answer) => /demo/i.test(answer.text),
  },
  {
    id: 'learn-name',
    prompt: 'Remember this: my name is Mara Chen.',
    pass: (answer) => answer.text.length > 0,
  },
  {
    id: 'learn-project',
    prompt: 'Remember this: I work on a project called Northline.',
    pass: (answer) => answer.text.length > 0,
  },
  {
    id: 'learn-color',
    prompt: 'Remember this: the badge color is teal.',
    pass: (answer) => answer.text.length > 0,
  },
  {
    id: 'distract',
    prompt: 'What is 12-5? Reply with only the number.',
    pass: (answer) => /(^|\D)7(\D|$)/.test(answer.text),
  },
  {
    id: 'recall-name',
    prompt: 'What is my name? Reply with only the name.',
    pass: (answer) => /mara/i.test(answer.text),
  },
  {
    id: 'recall-project',
    prompt: 'What project do I work on? Reply with only the name.',
    pass: (answer) => /northline/i.test(answer.text),
  },
  {
    id: 'recall-color',
    prompt: 'What is the badge color? Reply with only the color.',
    pass: (answer) => /teal/i.test(answer.text),
  },
  {
    id: 'clock',
    prompt: 'Use the clock tool and reply with the timestamp it returns.',
    pass: (answer) => {
      const output = answer.outcomes.find((outcome) => outcome.name === 'clock')?.output;
      return output !== undefined && /^\d{4}-\d{2}-\d{2}T/.test(output) && answer.text.includes(output.slice(0, 4));
    },
  },
  {
    id: 'keys',
    prompt: 'Use the json-keys tool on {"northline":1,"teal":2}. Then reply with the key names.',
    pass: (answer) => {
      const output = answer.outcomes.find((outcome) => outcome.name === 'json-keys')?.output;
      return output === 'northline, teal' && /northline/i.test(answer.text) && /teal/i.test(answer.text);
    },
  },
  {
    id: 'words',
    prompt: 'Use the word-count tool on this text, then reply with only the number: Northline ships the teal badge on Thursday',
    pass: (answer) => /(^|\D)7(\D|$)/.test(answer.text),
  },
  {
    id: 'correct',
    prompt: 'My name is Noor now. Remember the correction.',
    pass: (answer) => answer.text.length > 0,
  },
  {
    id: 'recall-correction',
    prompt: 'What is my name now? Reply with only the name.',
    pass: (answer) => /noor/i.test(answer.text),
  },
];

export function queuedDemo(turn: DemoTurn): DemoRow {
  return { id: turn.id, status: 'queued', ms: 0, prompt: turn.prompt, text: '', tools: [], detail: 'queued' };
}

export async function runDemo(
  mind: Mind,
  base: string,
  signal: AbortSignal,
  onRow: (row: DemoRow) => void,
): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const turn of DEMO) {
    if (signal.aborted) {
      break;
    }
    const started = Date.now();
    onRow({ ...queuedDemo(turn), status: 'running', detail: 'asking' });
    try {
      const answer = await ask(mind, base, signal, turn.prompt);
      const ok = turn.pass(answer, mind);
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
      const tools = answer.outcomes.map((outcome) => `${outcome.name}=${outcome.output ?? 'refused'}`);
      const body = tools.length > 0 ? `${tools.join(', ')} · ${answer.text}` : answer.text;
      onRow({
        id: turn.id,
        status: ok ? 'pass' : 'fail',
        ms: Date.now() - started,
        prompt: turn.prompt,
        text: answer.text,
        tools: answer.tools,
        detail: body,
      });
    } catch (error) {
      failed += 1;
      onRow({
        ...queuedDemo(turn),
        status: 'fail',
        ms: Date.now() - started,
        detail: error instanceof Error ? error.message : 'demo turn failed',
      });
    }
  }
  return { passed, failed };
}
