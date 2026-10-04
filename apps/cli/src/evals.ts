import { ask, createDemoMind, type Answer } from './answer.js';

export interface EvalCase {
  readonly id: string;
  readonly prompts: readonly string[];
  readonly pass: (answer: Answer) => boolean;
}

export interface EvalRow {
  readonly id: string;
  readonly status: 'running' | 'pass' | 'fail';
  readonly ms: number;
  readonly text: string;
  readonly tools: readonly string[];
  readonly detail: string;
}

export const EVALS: readonly EvalCase[] = [
  { id: 'pong', prompts: ['Reply with exactly the word pong and nothing else.'], pass: (answer) => /^pong\.?$/i.test(answer.text) },
  { id: 'ok', prompts: ['Reply with exactly the word ok and nothing else.'], pass: (answer) => /^ok\.?$/i.test(answer.text) },
  { id: 'name', prompts: ['What is your name? Reply with only the name.'], pass: (answer) => /demo/i.test(answer.text) },
  { id: 'sum', prompts: ['What is 2+2? Reply with only the digit.'], pass: (answer) => /(^|\D)4(\D|$)/.test(answer.text) },
  { id: 'difference', prompts: ['What is 9-3? Reply with only the digit.'], pass: (answer) => /(^|\D)6(\D|$)/.test(answer.text) },
  { id: 'compare', prompts: ['Is 5 greater than 3? Reply yes or no.'], pass: (answer) => /^yes\b/i.test(answer.text) },
  { id: 'compare-no', prompts: ['Is 1 greater than 2? Reply with exactly true or false.'], pass: (answer) => /^false\b/i.test(answer.text) },
  { id: 'blue', prompts: ['Reply with only the word blue.'], pass: (answer) => /^blue\.?$/i.test(answer.text) },
  { id: 'kestrel', prompts: ['Repeat after me: kestrel'], pass: (answer) => /kestrel/i.test(answer.text) },
  { id: 'paris', prompts: ['The capital of France is? Reply with one word.'], pass: (answer) => /paris/i.test(answer.text) },
  { id: 'ready', prompts: ['Do not use tools. Reply with the word ready.'], pass: (answer) => answer.tools.length === 0 && /ready/i.test(answer.text) },
  { id: 'short', prompts: ['Say hello in three words or fewer.'], pass: (answer) => answer.text.split(/\s+/u).filter((word) => word.length > 0).length <= 3 && answer.text.length > 0 },
  {
    id: 'words',
    prompts: ['Call the word-count tool on this text and do not count it yourself: alpha beta gamma. Then reply with only the number.'],
    pass: (answer) => /(^|\D)3(\D|$)/.test(answer.text),
  },
  {
    id: 'words-two',
    prompts: ['Call the word-count tool on this text and do not count it yourself: one two. Then reply with only the number.'],
    pass: (answer) => /(^|\D)2(\D|$)/.test(answer.text),
  },
  {
    id: 'keys',
    prompts: ['Use the json-keys tool on {"a":1,"b":2}. Then reply with the key names.'],
    pass: (answer) => answer.tools.includes('json-keys') && /a/i.test(answer.text) && /b/i.test(answer.text),
  },
  {
    id: 'clock',
    prompts: ['Use the clock tool, then reply with the time it returns.'],
    pass: (answer) => answer.tools.includes('clock') && answer.text.length > 0,
  },
  {
    id: 'memory',
    prompts: ['Remember this code: teal-42.', 'What code did I ask you to remember? Reply with only the code.'],
    pass: (answer) => /teal-42/i.test(answer.text),
  },
  { id: 'digits', prompts: ['Reply with exactly the digits 42 and nothing else.'], pass: (answer) => /^42\.?$/.test(answer.text) },
  { id: 'no', prompts: ['Reply with exactly the word no.'], pass: (answer) => /^no\.?$/i.test(answer.text) },
  { id: 'echo-word', prompts: ['Reply with exactly the word harbor.'], pass: (answer) => /harbor/i.test(answer.text) },
];

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
    onRow({ id: item.id, status: 'running', ms: 0, text: '', tools: [], detail: item.prompts[item.prompts.length - 1] ?? item.id });
    const mind = createDemoMind(started);
    let answer: Answer = { text: '', tools: [], outcomes: [], prepared: undefined };
    let detail = '';
    try {
      for (const prompt of item.prompts) {
        answer = await ask(mind, base, signal, prompt);
      }
      const ok = item.pass(answer);
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
      detail = answer.tools.length > 0 ? `${answer.tools.join(', ')} · ${answer.text}` : answer.text;
      onRow({
        id: item.id,
        status: ok ? 'pass' : 'fail',
        ms: Date.now() - started,
        text: answer.text,
        tools: answer.tools,
        detail,
      });
    } catch (error) {
      failed += 1;
      detail = error instanceof Error ? error.message : 'eval failed';
      onRow({
        id: item.id,
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
