import { labelAppraisal } from '../../../packages/agent/src/index.js';
import { ask, createDemoMind } from './answer.js';
import { runEvals, type EvalRow } from './evals.js';

const base = 'http://127.0.0.1:11434';
const args = process.argv.slice(2);

if (args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: bun run cli [eval | message]');
  console.log('eval runs the local qwen3.5:9b suite with thinking off.');
  process.exit(0);
}

if (args[0] === 'eval') {
  const summary = await runEvals(base, AbortSignal.timeout(180_000), printRow);
  console.log(`${summary.passed} passed, ${summary.failed} failed`);
  process.exit(summary.failed === 0 ? 0 : 1);
}

const message = args.join(' ').trim();
const mind = createDemoMind(Date.now());
if (message.length === 0) {
  const turn = mind.step(Date.now());
  printTurn(turn.drive.kind, turn.reaction.intent, turn.drive.reason, labelAppraisal(mind.snapshot().appraisal));
  process.exit(0);
}

try {
  const answer = await ask(mind, base, AbortSignal.timeout(60_000), message);
  const snap = mind.snapshot();
  const mood = labelAppraisal(snap.appraisal);
  const drive = answer.prepared?.drive.kind ?? snap.lastStep?.drive.kind ?? 'rest';
  const intent = answer.prepared?.reaction.intent ?? 'defer';
  printTurn(drive, intent, answer.prepared?.drive.reason ?? '', mood);
  if (answer.tools.length > 0) {
    console.log(`tools ${answer.tools.join(', ')}`);
  }
  if (answer.text.length > 0) {
    console.log(answer.text);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'The mind could not take this turn.');
  process.exit(1);
}

function printTurn(drive: string, intent: string, reason: string, mood: string): void {
  console.log(`Demo [${drive}] ${intent}  mood ${mood}`);
  if (reason.length > 0) {
    console.log(reason);
  }
}

function printRow(row: EvalRow): void {
  if (row.status === 'running') {
    console.log(`… ${row.id}`);
    return;
  }
  const mark = row.status === 'pass' ? 'pass' : 'FAIL';
  console.log(`${mark} ${String(row.ms).padStart(5)}ms  ${row.id}  ${row.detail}`);
}
