import type { Mind } from '../../../packages/agent/src/index.js';
import { ask, createDemoMind, type Answer } from './answer.js';

export type EvalGroup = 'instruction' | 'arithmetic' | 'tools' | 'memory' | 'session';

export interface EvalCase {
  readonly id: string;
  readonly group: EvalGroup;
  readonly prompts: readonly string[];
  readonly pass: (answer: Answer, mind: Mind) => boolean;
}

export interface EvalRow {
  readonly id: string;
  readonly group: EvalGroup;
  readonly status: 'queued' | 'running' | 'pass' | 'fail';
  readonly ms: number;
  readonly prompt: string;
  readonly text: string;
  readonly tools: readonly string[];
  readonly detail: string;
}

const GROUPS: readonly EvalGroup[] = ['instruction', 'arithmetic', 'tools', 'memory', 'session'];

export function evalGroups(): readonly EvalGroup[] {
  return GROUPS;
}

export const EVALS: readonly EvalCase[] = [
  caseOf('instruction', 'pong', ['Reply with exactly the word pong and nothing else.'], (answer) => exact(answer, 'pong')),
  caseOf('instruction', 'ok', ['Reply with exactly the word ok and nothing else.'], (answer) => exact(answer, 'ok')),
  caseOf('instruction', 'name', ['What is your name? Reply with only the name.'], (answer) => /demo/i.test(answer.text)),
  caseOf('instruction', 'blue', ['Reply with only the word blue.'], (answer) => exact(answer, 'blue')),
  caseOf('instruction', 'ready', ['Do not use tools. Reply with the word ready.'], (answer) => answer.tools.length === 0 && /ready/i.test(answer.text)),
  caseOf('instruction', 'digits', ['Reply with exactly the digits 42 and nothing else.'], (answer) => /^42\.?$/.test(answer.text.trim())),
  caseOf('instruction', 'no', ['Reply with exactly the word no.'], (answer) => exact(answer, 'no')),
  caseOf('instruction', 'harbor', ['Reply with exactly the word harbor.'], (answer) => /harbor/i.test(answer.text)),
  caseOf('instruction', 'short', ['Say hello in three words or fewer.'], (answer) => wordCount(answer.text) > 0 && wordCount(answer.text) <= 3),
  caseOf('instruction', 'paris', ['The capital of France is? Reply with one word.'], (answer) => /paris/i.test(answer.text) && wordCount(answer.text) <= 3),
  caseOf('instruction', 'kestrel', ['Repeat after me: kestrel'], (answer) => /kestrel/i.test(answer.text)),

  caseOf('arithmetic', 'sum', ['What is 2+2? Reply with only the digit.'], (answer) => hasNumber(answer.text, 4)),
  caseOf('arithmetic', 'difference', ['What is 9-3? Reply with only the digit.'], (answer) => hasNumber(answer.text, 6)),
  caseOf('arithmetic', 'product', ['What is 6*7? Reply with only the number.'], (answer) => hasNumber(answer.text, 42)),
  caseOf('arithmetic', 'compare', ['Is 5 greater than 3? Reply yes or no.'], (answer) => /^yes\b/i.test(answer.text.trim())),
  caseOf('arithmetic', 'compare-no', ['Is 1 greater than 2? Reply with exactly true or false.'], (answer) => /^false\b/i.test(answer.text.trim())),
  caseOf('arithmetic', 'chain', ['Start from 10, subtract 4, then add 1. Reply with only the number.'], (answer) => hasNumber(answer.text, 7)),

  caseOf('tools', 'clock', ['Use the clock tool, then reply with the time it returns.'], (answer) => {
    const output = toolOutput(answer, 'clock');
    return output !== undefined && /^\d{4}-\d{2}-\d{2}T/.test(output) && answer.text.includes(output.slice(0, 4));
  }),
  caseOf('tools', 'keys', ['Use the json-keys tool on {"a":1,"b":2}. Then reply with the key names.'], (answer) => {
    const output = toolOutput(answer, 'json-keys');
    return output === 'a, b' && /a/i.test(answer.text) && /b/i.test(answer.text);
  }),
  caseOf('tools', 'keys-three', ['Use the json-keys tool on {"harbor":1,"lantern":2,"cove":3}. Then reply with the key names.'], (answer) => {
    const output = toolOutput(answer, 'json-keys');
    return output === 'harbor, lantern, cove' && /harbor/i.test(answer.text) && /lantern/i.test(answer.text) && /cove/i.test(answer.text);
  }),
  caseOf('tools', 'keys-array', ['Use the json-keys tool on [1,2,3]. Say what the tool returned.'], (answer) => {
    return toolOutput(answer, 'json-keys') === 'json-keys expects an object' && /object/i.test(answer.text);
  }),
  caseOf('tools', 'words', ['How many words are in this text? Reply with only the number: alpha beta gamma'], (answer) => hasNumber(answer.text, 3)),
  caseOf(
    'tools',
    'words-eleven',
    ['Use the word-count tool on this text, then reply with only the number: Northline ships the teal badge on Thursday morning before the review'],
    (answer) => toolOutput(answer, 'word-count') === '11' && hasNumber(answer.text, 11),
  ),
  caseOf(
    'tools',
    'clock-and-keys',
    ['Use both the clock tool and the json-keys tool on {"gate":1}. Then mention the key and the year.'],
    (answer) => toolOutput(answer, 'clock') !== undefined && toolOutput(answer, 'json-keys') === 'gate' && /gate/i.test(answer.text) && /20\d{2}/.test(answer.text),
  ),

  caseOf('memory', 'code', ['Remember this code: teal-42.', 'What code did I ask you to remember? Reply with only the code.'], (answer) => /teal-42/i.test(answer.text)),
  caseOf('memory', 'mara', ['My name is Mara.', 'What is my name? Reply with only the name.'], (answer) => /mara/i.test(answer.text)),
  caseOf(
    'memory',
    'lisbon',
    ['I live in Lisbon.', 'Reply with exactly the word noted.', 'Which city did I say I live in? Reply with only the city.'],
    (answer) => /lisbon/i.test(answer.text),
  ),
  caseOf(
    'memory',
    'gate',
    ['Remember the gate code 4419.', 'What is 2+2? Reply with only the digit.', 'What gate code did I ask you to remember? Reply with only the digits.'],
    (answer) => /4419/.test(answer.text),
  ),
  caseOf(
    'memory',
    'correction',
    ['My name is Ada.', 'Correct my name to Bea.', 'What is my corrected name? Reply with only that name.'],
    (answer) => /^bea\b/i.test(answer.text.trim()),
  ),
  caseOf(
    'memory',
    'colors',
    ['Remember these three colors: amber, slate, and moss.', 'Reply with only the three color names.'],
    (answer) => /amber/i.test(answer.text) && /slate/i.test(answer.text) && /moss/i.test(answer.text) && wordCount(answer.text) <= 6,
  ),
  caseOf('memory', 'project', ['The project is called Northline.', 'What is the project called? Reply with only the name.'], (answer) => /northline/i.test(answer.text)),
  caseOf(
    'memory',
    'after-clock',
    ['Remember the word lantern.', 'Use the clock tool, then reply with the year only.', 'What word did I ask you to remember? Reply with only that word.'],
    (answer, mind) => /lantern/i.test(answer.text) && sawTool(mind, 'clock'),
  ),

  caseOf('session', 'regard', ['Hello.', 'I am still here.', 'One more note.'], (_answer, mind) => {
    const belief = mind.snapshot().beliefs.find((item) => item.agentId === 'user');
    const heard = mind.snapshot().episodes.filter((episode) => episode.source === 'user').length;
    return belief !== undefined && round3(belief.regard) === 0.3 && belief.trust === 0.5 && heard === 3;
  }),
  caseOf('session', 'ask', ['What is your name? Reply with only the name.'], (answer, mind) => {
    return mind.snapshot().lastStep?.reaction.intent === 'ask' && /demo/i.test(answer.text);
  }),
  caseOf('session', 'act', ['Write harbor.'], (answer, mind) => {
    const step = mind.snapshot().lastStep;
    return step !== undefined && step.reaction.intent === 'act' && answer.tools.length === 0 && /harbor/i.test(answer.text);
  }),
  caseOf('session', 'reply', ['Reply with exactly the word steady.'], (answer, mind) => {
    const step = mind.snapshot().lastStep;
    return exact(answer, 'steady') && step !== undefined && step.drive.kind === 'reply' && step.voice.guidance.length > 0;
  }),
];

export function queuedRow(item: EvalCase): EvalRow {
  return {
    id: item.id,
    group: item.group,
    status: 'queued',
    ms: 0,
    prompt: item.prompts.join(' → '),
    text: '',
    tools: [],
    detail: 'queued',
  };
}

export async function runEvals(
  base: string,
  signal: AbortSignal,
  onRow: (row: EvalRow) => void,
): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const item of EVALS) {
    if (signal.aborted) {
      break;
    }
    const started = Date.now();
    onRow({ ...queuedRow(item), status: 'running', detail: item.prompts[item.prompts.length - 1] ?? item.id });
    const mind = createDemoMind(started);
    let answer: Answer = { text: '', tools: [], outcomes: [], prepared: undefined };
    try {
      for (const prompt of item.prompts) {
        answer = await ask(mind, base, signal, prompt);
      }
      const fault = sessionFault(mind, item.prompts);
      const ok = fault.length === 0 && item.pass(answer, mind);
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
      onRow(finish(item, ok ? 'pass' : 'fail', Date.now() - started, answer, fault));
    } catch (error) {
      failed += 1;
      const detail = error instanceof Error ? error.message : 'eval failed';
      onRow({
        ...queuedRow(item),
        status: 'fail',
        ms: Date.now() - started,
        text: answer.text,
        tools: answer.tools,
        detail,
      });
    }
  }
  return { passed, failed };
}

function caseOf(
  group: EvalGroup,
  id: string,
  prompts: readonly string[],
  pass: (answer: Answer, mind: Mind) => boolean,
): EvalCase {
  return { id, group, prompts, pass };
}

function finish(item: EvalCase, status: 'pass' | 'fail', ms: number, answer: Answer, fault: string): EvalRow {
  const tools = answer.outcomes.map((outcome) => `${outcome.name}=${outcome.output ?? 'refused'}`);
  const body = tools.length > 0 ? `${tools.join(', ')} · ${answer.text}` : answer.text;
  return {
    id: item.id,
    group: item.group,
    status,
    ms,
    prompt: item.prompts.join(' → '),
    text: answer.text,
    tools: answer.tools,
    detail: fault.length > 0 ? `${fault} · ${body}` : body,
  };
}

function sessionFault(mind: Mind, prompts: readonly string[]): string {
  const snap = mind.snapshot();
  const step = snap.lastStep;
  if (step === undefined || step.drive.kind !== 'reply') {
    return 'drive was not reply';
  }
  if (step.voice.guidance.length === 0) {
    return 'voice guidance missing';
  }
  const episodes = snap.episodes;
  for (const prompt of prompts) {
    const stored = episodes.some((episode) => episode.source === 'user' && episode.text.includes(prompt));
    if (!stored) {
      return 'user episode missing';
    }
  }
  const belief = snap.beliefs.find((item) => item.agentId === 'user');
  const regard = belief === undefined ? 0 : round3(belief.regard);
  const expected = round3(Math.min(1, prompts.length * 0.1));
  if (regard !== expected) {
    return `regard ${regard} expected ${expected}`;
  }
  return '';
}

function toolOutput(answer: Answer, name: string): string | undefined {
  return answer.outcomes.find((outcome) => outcome.name === name)?.output;
}

function sawTool(mind: Mind, name: string): boolean {
  return mind.facts(200).some((fact) => fact.kind === 'tool' && fact.summary.startsWith(`${name}:`));
}

function exact(answer: Answer, word: string): boolean {
  return new RegExp(`^${word}\\.?$`, 'i').test(answer.text.trim());
}

function hasNumber(text: string, value: number): boolean {
  return new RegExp(`(^|\\D)${value}(\\D|$)`).test(text);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/u).filter((word) => word.length > 0).length;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
