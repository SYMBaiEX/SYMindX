import { createMind, labelAppraisal, parseCharacter, type Mind, type PreparedTurn } from '../../../packages/agent/src/index.js';

const character = parseCharacter({
  schemaVersion: 1,
  id: 'demo',
  name: 'Demo',
  systemPrompt: 'You are Demo, a local SYMindX mind. Keep replies to one short sentence.',
  provider: { type: 'echo', model: 'echo' },
  tools: ['word-count', 'clock'],
  memory: { recentMessages: 20 },
  emotion: { enabled: true, decay: 0.85 },
});

const mind = createMind(character, Date.now());

const args = process.argv.slice(2);
if (args[0] === '--help' || args[0] === '-h') {
  console.log('Usage: bun run cli [hear] <message>');
  console.log('With no message, prints the resting drive.');
  process.exit(0);
}

const message = (args[0] === 'hear' ? args.slice(1) : args).join(' ').trim();
const now = Date.now();

try {
  if (message.length > 0) {
    mind.hear({ channel: 'local', sender: 'user', text: message }, now);
  }
  const turn = mind.step(now);
  if (message.length > 0) {
    mind.say(spokenLine(turn, message), now);
  }
  printState(mind, turn);
} catch (error) {
  const text = error instanceof Error ? error.message : 'The mind could not take this turn.';
  console.error(text);
  process.exit(1);
}

function spokenLine(turn: PreparedTurn, heard: string): string {
  if (turn.drive.kind === 'reply') {
    return heard;
  }
  return turn.drive.reason;
}

function printState(session: Mind, turn: PreparedTurn): void {
  const snap = session.snapshot();
  const mood = labelAppraisal(snap.appraisal);
  console.log(`${character.name} [${turn.drive.kind}] ${turn.reaction.intent}`);
  console.log(
    `mood ${mood}  valence ${snap.appraisal.valence.toFixed(2)}  arousal ${snap.appraisal.arousal.toFixed(2)}  dominance ${snap.appraisal.dominance.toFixed(2)}`,
  );
  console.log(turn.drive.reason);
  const latest = snap.episodes[snap.episodes.length - 1];
  if (latest !== undefined && latest.source === 'assistant') {
    console.log(latest.text);
  }
}
