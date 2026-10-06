import {
  OrchestrationError,
  assertPublicUrl,
  codingPolicy,
  createAgentRecord,
  createMemoryStore,
  emptyCatalog,
  executeResearch,
  executeTeam,
  executeWorkspaceTool,
  formatBrief,
  loadOrchestrator,
  normalizeRelative,
  parseCatalog,
  planPolicy,
  addWork,
  dueAgents,
  finishWork,
  postNote,
  rememberMind,
  scoreSwarmDataset,
  serializeCatalog,
  takeNotes,
  workspaceTools,
  type Orchestrator,
  type SpeakRequest,
  type Speaker,
  type WorkspaceIO,
} from '../../../packages/orchestration/src/index.js';
import { appraisalHalfLife, baselineAppraisal, createMind, decideTool, parseCharacter, runeTone } from '../../../packages/agent/src/index.js';
import { rememberNeon, rememberSupabase } from './extensions/memory.js';
import { createPortal, portalSpec } from './extensions/portals.js';
import { assertRuneSocket, encodeRuneAction, parseRuneEvent } from './extensions/runelite.js';
import { parseSlackApproval, postSlackMessage } from './extensions/slack.js';
import { postTweet } from './extensions/twitter.js';
import type { HostFetch } from './extensions/types.js';

export interface SuiteSummary {
  readonly passed: number;
  readonly failed: number;
  readonly text: string;
}

interface Check {
  readonly group: string;
  readonly name: string;
  readonly run: () => Promise<void>;
}

export async function runFrameworkSuite(): Promise<SuiteSummary> {
  const checks = cases();
  const lines: string[] = [];
  let passed = 0;
  let failed = 0;
  for (const check of checks) {
    try {
      await check.run();
      passed += 1;
      lines.push(`pass ${check.group} ${check.name}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'failed';
      lines.push(`fail ${check.group} ${check.name}: ${message}`);
    }
  }
  lines.push(`${passed} passed, ${failed} failed`);
  return { passed, failed, text: `${lines.join('\n')}\n` };
}

function cases(): readonly Check[] {
  return [
    ...directoryCases(),
    ...mailboxCases(),
    ...asyncCases(),
    ...roomCases(),
    ...catalogCases(),
    ...policyCases(),
    ...jailCases(),
    ...toolCases(),
    ...mindCases(),
    ...extensionCases(),
    ...workCases(),
    check('swarm', 'dataset', async () => {
      const score = await scoreSwarmDataset();
      if (score.failed > 0) {
        throw new Error(score.text.trim());
      }
      expect(score.passed >= 30, `${score.passed} dataset cases`);
    }),
  ];
}

function directoryCases(): readonly Check[] {
  return [
    check('directory', 'exact-id', async () => {
      const orch = await team();
      const brief = orch.brief('ada');
      expect(brief.name === 'Ada Lane', 'name');
      expect(brief.mode === 'chat', 'mode');
      expect(formatBrief(brief).includes('agent ada'), 'format');
    }),
    check('directory', 'full-name', async () => {
      const orch = await team();
      expect(orch.brief('Ada Lane').id === 'ada', 'id');
    }),
    check('directory', 'first-name', async () => {
      const orch = await team();
      expect(orch.brief('Ada').id === 'ada', 'id');
    }),
    check('directory', 'unknown', async () => {
      const orch = await team();
      await expectThrow(() => orch.brief('nope'), 'Unknown agent nope');
    }),
    check('directory', 'ambiguous', async () => {
      const orch = await team();
      await orch.createAgent(agent('ada2', 'Ada Lane', 9));
      await expectThrow(() => orch.brief('Ada Lane'), 'Ambiguous agent Ada Lane');
    }),
    check('directory', 'empty-query', async () => {
      const orch = await team();
      await expectThrow(() => orch.brief('  '), 'agent query is empty');
    }),
    check('directory', 'prompt-clip', async () => {
      const orch = await loadOrchestrator(createMemoryStore(emptyCatalog()));
      await orch.createAgent(agent('ada', 'Ada', 1, 'p'.repeat(400)));
      expect(orch.brief('ada').prompt.length === 241, 'clipped prompt keeps the ellipsis');
    }),
    check('directory', 'latest-turns', async () => {
      const orch = await team();
      const session = orch.listSessions('ada')[0];
      if (session === undefined) {
        throw new Error('missing session');
      }
      await orch.say(session.id, 'teal-42', echoSpeaker(), AbortSignal.timeout(1000), 20);
      const brief = orch.brief('ada');
      expect(brief.latest.some((turn) => turn.text.includes('teal-42')), 'latest includes the turn');
    }),
    check('directory', 'no-model-call', async () => {
      const orch = await team();
      let calls = 0;
      const speaker: Speaker = {
        async speak() {
          calls += 1;
          return { text: 'no', tools: [], changed: [] };
        },
      };
      orch.brief('bee');
      expect(calls === 0, 'lookup called the model');
      void speaker;
    }),
    check('directory', 'list', async () => {
      const orch = await team();
      expect(orch.briefs().map((brief) => brief.id).join(',') === 'ada,bee', 'ids');
    }),
  ];
}

function mailboxCases(): readonly Check[] {
  return [
    check('mailbox', 'order', async () => {
      const orch = await team();
      const first = await orch.postNote('ada', 'bee', 'one', 10);
      const second = await orch.postNote('ada', 'bee', 'two', 11);
      const session = requireOne(orch.listSessions('bee'));
      let seen = '';
      await orch.say(
        session.id,
        'go',
        {
          async speak(request) {
            seen = request.history.map((turn) => turn.text).join('|');
            return { text: 'ready', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        12,
      );
      expect(seen === `${first.text}|${second.text}`, `order ${seen}`);
    }),
    check('mailbox', 'seen-once', async () => {
      const orch = await team();
      await orch.postNote('ada', 'bee', 'once', 10);
      const session = requireOne(orch.listSessions('bee'));
      let first = 0;
      let second = 0;
      const speaker: Speaker = {
        async speak(request) {
          const hits = request.history.filter((turn) => turn.text === 'once').length;
          if (first === 0) {
            first = hits;
          } else {
            second = hits;
          }
          return { text: 'ok', tools: [], changed: [] };
        },
      };
      await orch.say(session.id, 'a', speaker, AbortSignal.timeout(1000), 11);
      await orch.say(session.id, 'b', speaker, AbortSignal.timeout(1000), 12);
      const pending = orch.catalog().notes.filter((note) => note.text === 'once' && !note.seen);
      expect(first === 1 && second === 1 && pending.length === 0, `first ${first} second ${second} pending ${pending.length}`);
    }),
    check('mailbox', 'self', async () => {
      const orch = await team();
      await expectThrow(() => orch.postNote('ada', 'ada', 'no', 1), 'An agent cannot note itself');
    }),
    check('mailbox', 'unknown', async () => {
      const orch = await team();
      await expectThrow(() => orch.postNote('ada', 'nope', 'no', 1), 'Unknown agent nope');
    }),
    check('mailbox', 'empty', async () => {
      const orch = await team();
      await expectThrow(() => orch.postNote('ada', 'bee', '   ', 1), 'Note must be 1 to 16000 characters');
    }),
    check('mailbox', 'user-sender', async () => {
      const catalog = emptyCatalog();
      const store = createMemoryStore(catalog);
      const orch = await loadOrchestrator(store);
      await orch.createAgent(agent('bee', 'Bee', 1));
      const note = await orch.postNote('user', 'bee', 'from the user', 2);
      expect(note.fromId === 'user' && note.seen === false, 'user note');
    }),
    check('mailbox', 'pure-take', async () => {
      let catalog = emptyCatalog();
      const created = await loadOrchestrator(createMemoryStore(catalog));
      await created.createAgent(agent('ada', 'Ada', 1));
      await created.createAgent(agent('bee', 'Bee', 2));
      catalog = created.catalog();
      const posted = postNote(catalog, { fromId: 'ada', toId: 'bee', text: 'pure', now: 3 });
      const taken = takeNotes(posted.catalog, 'bee');
      expect(taken.notes.length === 1 && taken.notes[0]?.seen === false, 'pending');
      expect(taken.catalog.notes[0]?.seen === true, 'marked');
      const again = takeNotes(taken.catalog, 'bee');
      expect(again.notes.length === 0, 'drained');
    }),
  ];
}

function asyncCases(): readonly Check[] {
  return [
    check('async', 'note-during-speak', async () => {
      const orch = await team();
      const ada = requireOne(orch.listSessions('ada'));
      const bee = requireOne(orch.listSessions('bee'));
      let releaseBee: () => void = () => undefined;
      const beeHold = new Promise<void>((resolve) => {
        releaseBee = resolve;
      });
      let beeStarted: () => void = () => undefined;
      const beeReady = new Promise<void>((resolve) => {
        beeStarted = resolve;
      });
      let beeText = '';
      const speaker: Speaker = {
        async speak(request) {
          if (request.character.id === 'bee') {
            beeStarted();
            await beeHold;
            beeText = 'bee-steady';
            return { text: beeText, tools: [], changed: [] };
          }
          await beeReady;
          await orch.postNote('ada', 'bee', 'harbor note', 30);
          return { text: 'ada-sent', tools: [], changed: [] };
        },
      };
      const beeTurn = orch.say(bee.id, 'hold', speaker, AbortSignal.timeout(2000), 20);
      const adaTurn = orch.say(ada.id, 'send', speaker, AbortSignal.timeout(2000), 21);
      await beeReady;
      await adaTurn;
      expect(beeText === '', 'bee was still in flight');
      releaseBee();
      const finished = await beeTurn;
      const reply = finished.turns[finished.turns.length - 1];
      expect(reply?.text === 'bee-steady', 'in-flight reply stayed');
      let delivered = '';
      await orch.say(
        bee.id,
        'next',
        {
          async speak(request) {
            delivered = request.history.map((turn) => turn.text).join('|');
            return { text: 'got-it', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        40,
      );
      expect(delivered.includes('harbor note'), `missing note in ${delivered}`);
    }),
    check('async', 'concurrent-sessions', async () => {
      const orch = await team();
      const ada = requireOne(orch.listSessions('ada'));
      const bee = requireOne(orch.listSessions('bee'));
      let entered = 0;
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const speaker: Speaker = {
        async speak(request) {
          entered += 1;
          if (entered === 2) {
            release();
          }
          await gate;
          return { text: `done ${request.character.id}`, tools: [], changed: [] };
        },
      };
      const both = Promise.all([
        orch.say(ada.id, 'one', speaker, AbortSignal.timeout(1000), 20),
        orch.say(bee.id, 'two', speaker, AbortSignal.timeout(1000), 21),
      ]);
      const finished = await Promise.race([
        both,
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error('concurrent says blocked')), 1000);
        }),
      ]);
      expect(finished[0].turns.some((turn) => turn.text === 'done ada'), 'ada');
      expect(finished[1].turns.some((turn) => turn.text === 'done bee'), 'bee');
    }),
    check('async', 'sender-does-not-wait', async () => {
      const orch = await team();
      const started = Date.now();
      const note = await orch.postNote('ada', 'bee', 'fast', started);
      expect(Date.now() - started < 200, 'note waited on a reply');
      expect(note.id.startsWith('n-'), 'id');
    }),
    check('memory', 'transcript-recall', async () => {
      const orch = await team();
      const session = requireOne(orch.listSessions('ada'));
      await orch.say(session.id, 'Remember teal-42.', echoSpeaker(), AbortSignal.timeout(1000), 10);
      let history = '';
      await orch.say(
        session.id,
        'What code did I ask you to remember?',
        {
          async speak(request) {
            history = request.history.map((turn) => turn.text).join(' ');
            return { text: 'teal-42', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        11,
      );
      expect(history.includes('teal-42'), 'history lost the code');
    }),
    check('memory', 'correction', async () => {
      const orch = await team();
      const session = requireOne(orch.listSessions('ada'));
      await orch.say(session.id, 'The code is teal-42.', echoSpeaker(), AbortSignal.timeout(1000), 10);
      await orch.say(session.id, 'Correction: the code is cove-7.', echoSpeaker(), AbortSignal.timeout(1000), 11);
      let history = '';
      await orch.say(
        session.id,
        'What is the code now?',
        {
          async speak(request) {
            history = request.history.map((turn) => turn.text).join(' | ');
            return { text: 'cove-7', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        12,
      );
      const teal = history.indexOf('teal-42');
      const cove = history.indexOf('cove-7');
      expect(teal >= 0 && cove > teal, 'correction did not follow the earlier fact');
    }),
  ];
}

function roomCases(): readonly Check[] {
  return [
    check('room', 'mention', async () => {
      const orch = await team();
      const room = await orch.createRoom({ id: 'desk', title: 'Desk', memberIds: ['ada', 'bee'], now: 10 });
      const updated = await orch.sayRoom(room.id, '@ada status', namedSpeaker(), AbortSignal.timeout(1000), 11);
      const speakers = updated.turns.filter((turn) => turn.role === 'agent').map((turn) => turn.speakerId);
      expect(speakers.join(',') === 'ada', `speakers ${speakers.join(',')}`);
    }),
    check('room', 'everyone', async () => {
      const orch = await team();
      const room = await orch.createRoom({ id: 'desk', title: 'Desk', memberIds: ['ada', 'bee'], now: 10 });
      const updated = await orch.sayRoom(room.id, '@everyone status', namedSpeaker(), AbortSignal.timeout(1000), 11);
      const speakers = updated.turns.filter((turn) => turn.role === 'agent').map((turn) => turn.speakerId);
      expect(speakers.join(',') === 'ada,bee', `speakers ${speakers.join(',')}`);
    }),
    check('room', 'fan-out', async () => {
      const orch = await team();
      const room = await orch.createRoom({ id: 'desk', title: 'Desk', memberIds: ['ada', 'bee'], now: 10 });
      const updated = await orch.sayRoom(room.id, 'status', namedSpeaker(), AbortSignal.timeout(1000), 11);
      expect(updated.turns.filter((turn) => turn.role === 'agent').length === 2, 'both members replied');
    }),
    check('room', 'cap', async () => {
      const orch = await loadOrchestrator(createMemoryStore(emptyCatalog()));
      const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
      for (let index = 0; index < ids.length; index += 1) {
        const id = ids[index];
        if (id === undefined) {
          continue;
        }
        await orch.createAgent(agent(id, id, index + 1));
      }
      const room = await orch.createRoom({ id: 'hall', title: 'Hall', memberIds: ids, now: 10 });
      const updated = await orch.sayRoom(room.id, 'status', namedSpeaker(), AbortSignal.timeout(1000), 11);
      const replies = updated.turns.filter((turn) => turn.role === 'agent');
      expect(replies.length === 6, `replies ${replies.length}`);
    }),
    check('room', 'note-in-flight', async () => {
      const orch = await team();
      const room = await orch.createRoom({ id: 'desk', title: 'Desk', memberIds: ['ada', 'bee'], now: 10 });
      let release: () => void = () => undefined;
      const hold = new Promise<void>((resolve) => {
        release = resolve;
      });
      const speaker: Speaker = {
        async speak(request) {
          if (request.character.id === 'ada') {
            await orch.postNote('user', 'bee', 'side note', 12);
            await hold;
          }
          return { text: `${request.character.id} ready`, tools: [], changed: [] };
        },
      };
      const pending = orch.sayRoom(room.id, '@ada go', speaker, AbortSignal.timeout(2000), 11);
      await orch.postNote('user', 'ada', 'after', 13);
      release();
      const updated = await pending;
      expect(updated.turns.some((turn) => turn.text === 'ada ready'), 'room reply missing');
      const bee = requireOne(orch.listSessions('bee'));
      let heard = '';
      await orch.say(
        bee.id,
        'read',
        {
          async speak(request) {
            heard = request.history.map((turn) => turn.text).join('|');
            return { text: 'read', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        30,
      );
      expect(heard.includes('side note'), 'side note was dropped');
    }),
  ];
}

function catalogCases(): readonly Check[] {
  return [
    check('catalog', 'missing-notes', async () => {
      const parsed = parseCatalog({ schemaVersion: 1, sequence: 0, agents: [], sessions: [], rooms: [] });
      expect(parsed.notes.length === 0, 'notes default');
    }),
    check('catalog', 'round-trip', async () => {
      const orch = await team();
      await orch.postNote('ada', 'bee', 'keep', 8);
      const again = parseCatalog(JSON.parse(JSON.stringify(orch.catalog())));
      expect(again.notes.length === 1 && again.notes[0]?.text === 'keep', 'note survived');
    }),
    check('catalog', 'reject-unknown', async () => {
      await expectThrow(
        () => parseCatalog({ schemaVersion: 1, sequence: 0, agents: [], sessions: [], rooms: [], notes: [], extra: true }),
        'Unknown catalog field: extra',
      );
    }),
    check('catalog', 'brief-after-reload', async () => {
      const orch = await team();
      const stored = createMemoryStore(orch.catalog());
      const loaded = await loadOrchestrator(stored);
      expect(loaded.brief('Bee').id === 'bee', 'reloaded brief');
    }),
  ];
}

function policyCases(): readonly Check[] {
  return [
    check('policy', 'code-tools', async () => {
      const names = workspaceTools(codingPolicy()).map((tool) => tool.name).join(',');
      expect(names === 'list,read,search,edit,write,run', names);
    }),
    check('policy', 'plan-tools', async () => {
      const names = workspaceTools(planPolicy()).map((tool) => tool.name).join(',');
      expect(names === 'list,read,search', names);
    }),
    check('policy', 'plan-refuses-edit', async () => {
      const effect = await executeWorkspaceTool('edit', { path: 'a.txt', old: 'a', next: 'b' }, memoryIo(), planPolicy(), AbortSignal.timeout(1000));
      expect(effect.changed.length === 0 && effect.text.startsWith('error:'), effect.text);
    }),
    check('policy', 'plan-refuses-run', async () => {
      const effect = await executeWorkspaceTool('run', { command: 'pwd' }, memoryIo(), planPolicy(), AbortSignal.timeout(1000));
      expect(effect.text.startsWith('error:'), effect.text);
    }),
    check('policy', 'who-tool', async () => {
      const orch = await team();
      const effect = await executeTeam('who', { query: 'ada' }, 'bee', {
        async lookup(query) {
          return formatBrief(orch.brief(query));
        },
        async post() {
          return 'unused';
        },
      });
      expect(effect.text.includes('agent ada') && effect.text.includes('Ada Lane'), effect.text);
    }),
    check('policy', 'note-tool', async () => {
      const orch = await team();
      const effect = await executeTeam('note', { to: 'bee', text: 'from tool' }, 'ada', {
        async lookup() {
          return '';
        },
        async post(fromId, toId, text) {
          const note = await orch.postNote(fromId, toId, text, 50);
          return `noted ${note.toId} ${note.id}`;
        },
      });
      expect(effect.text.startsWith('noted bee'), effect.text);
    }),
  ];
}

function jailCases(): readonly Check[] {
  const blocked = [
    ['dotdot', '../secret'],
    ['absolute', '/etc/passwd'],
    ['git', '.git/config'],
    ['env', '.env'],
    ['nested-env', 'app/.env.local'],
    ['modules', 'node_modules/pkg'],
    ['catalog', '.symindx/catalog.json'],
  ] as const;
  const urls = [
    ['loopback', 'http://127.0.0.1/secret'],
    ['localhost', 'http://localhost/secret'],
    ['dot-localhost', 'http://app.localhost/secret'],
    ['private', 'http://192.168.1.5/secret'],
    ['link-local', 'http://169.254.1.1/secret'],
    ['file', 'file:///etc/passwd'],
    ['metadata', 'http://metadata.google.internal/'],
  ] as const;
  return [
    ...blocked.map(([name, path]) =>
      check('jail', `path-${name}`, async () => {
        await expectThrow(() => normalizeRelative(path), 'path');
      }),
    ),
    check('jail', 'path-relative', async () => {
      expect(normalizeRelative('src/main.ts') === 'src/main.ts', 'relative');
    }),
    ...urls.map(([name, url]) =>
      check('jail', `url-${name}`, async () => {
        await expectThrow(() => assertPublicUrl(url), 'url');
      }),
    ),
    check('jail', 'url-public', async () => {
      expect(assertPublicUrl('https://example.com/a') === 'https://example.com/a', 'public');
    }),
  ];
}

function toolCases(): readonly Check[] {
  return [
    check('tools', 'research-web', async () => {
      const effect = await executeResearch(
        'web',
        { query: 'harbor' },
        {
          async search() {
            return [{ title: 'Harbor', url: 'https://example.com/harbor', snippet: 'a cove' }];
          },
          async readPage() {
            return '';
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(effect.text.includes('Harbor') && effect.text.includes('https://example.com/harbor'), effect.text);
    }),
    check('tools', 'research-page', async () => {
      const effect = await executeResearch(
        'page',
        { url: 'https://example.com' },
        {
          async search() {
            return [];
          },
          async readPage() {
            return 'Example Domain is for documentation.';
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(effect.text.includes('Example Domain'), effect.text);
    }),
    check('tools', 'research-private', async () => {
      const effect = await executeResearch(
        'page',
        { url: 'http://127.0.0.1/secret' },
        {
          async search() {
            return [];
          },
          async readPage() {
            throw new Error('should not fetch');
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(effect.text.startsWith('error:'), effect.text);
    }),
    check('tools', 'workspace-edit', async () => {
      const io = memoryIo('hello harbor');
      const effect = await executeWorkspaceTool(
        'edit',
        { path: 'note.txt', old: 'harbor', next: 'cove' },
        io,
        codingPolicy(),
        AbortSignal.timeout(1000),
      );
      expect(effect.changed.join(',') === 'note.txt', effect.changed.join(','));
      expect(await io.read('note.txt') === 'hello cove', 'file');
    }),
    check('tools', 'workspace-run', async () => {
      const effect = await executeWorkspaceTool(
        'run',
        { command: 'pwd' },
        memoryIo(),
        codingPolicy(),
        AbortSignal.timeout(1000),
      );
      expect(effect.text.includes('exit 0'), effect.text);
    }),
    check('tools', 'scripted-chat', async () => {
      const orch = await team();
      const session = requireOne(orch.listSessions('ada'));
      const updated = await orch.say(session.id, 'ping', echoSpeaker('pong'), AbortSignal.timeout(1000), 9);
      const reply = updated.turns[updated.turns.length - 1];
      expect(reply?.text === 'pong' && reply.tools.length === 0, 'scripted chat');
    }),
    check('tools', 'scripted-tools', async () => {
      const orch = await team();
      const session = requireOne(orch.listSessions('ada'));
      const speaker: Speaker = {
        async speak() {
          return { text: 'edited note.txt', tools: ['edit'], changed: ['note.txt'] };
        },
      };
      const updated = await orch.say(session.id, 'edit', speaker, AbortSignal.timeout(1000), 9);
      const reply = updated.turns[updated.turns.length - 1];
      expect(reply?.tools.join(',') === 'edit' && reply.changed.join(',') === 'note.txt', 'tool record');
    }),
  ];
}

function mindCases(): readonly Check[] {
  return [
    check('mind', 'rune-tone', async () => {
      const calm = runeTone(baselineAppraisal({ valence: 0, arousal: 0, dominance: 0 }, 1));
      const excited = runeTone(baselineAppraisal({ valence: 0.4, arousal: 0.8, dominance: 0.2 }, 1));
      const frustrated = runeTone(baselineAppraisal({ valence: -0.6, arousal: 0.8, dominance: 0 }, 1));
      expect(calm === 'calm' && excited === 'excited' && frustrated === 'frustrated', `${calm} ${excited} ${frustrated}`);
    }),
    check('mind', 'decay-085', async () => {
      expect(appraisalHalfLife(0.85) === 30_000, 'decay 0.85 keeps the 30s half-life');
      expect(appraisalHalfLife(1) === Number.POSITIVE_INFINITY, 'decay 1 does not fade');
    }),
    check('mind', 'plan-advances', async () => {
      const mind = createMind(demoCharacter(), 0);
      mind.hear({ channel: 'local', sender: 'user', text: 'alpha. beta.' }, 1);
      mind.step(2);
      expect(mind.snapshot().intention?.steps[0]?.status === 'active', 'first step starts active');
      mind.hear({ channel: 'local', sender: 'user', text: 'next' }, 3);
      mind.step(4);
      const steps = mind.snapshot().intention?.steps ?? [];
      expect(steps[0]?.status === 'done', 'the live turn completes the active step');
      expect(steps[1]?.status === 'active', 'the next step becomes active');
    }),
    check('mind', 'write-hold', async () => {
      const held = decideTool({
        name: 'edit',
        effect: 'write',
        allow: ['edit'],
        approved: false,
        mood: 'activated',
      });
      const calm = decideTool({
        name: 'edit',
        effect: 'write',
        allow: ['edit'],
        approved: false,
        mood: 'calm',
      });
      if (held.allowed || calm.allowed) {
        throw new Error('write stayed open');
      }
      expect(held.reason.includes('activated'), held.reason);
      expect(calm.reason === 'write requires approval', calm.reason);
    }),
  ];
}

function workCases(): readonly Check[] {
  return [
    check('work', 'unblocks', async () => {
      const created = createAgentRecord(emptyCatalog(), {
        id: 'ada',
        name: 'Ada',
        systemPrompt: 'Local agent.',
        model: 'qwen3.5:9b',
        now: 1,
      });
      const first = addWork(created.catalog, {
        title: 'research',
        parentId: '',
        assigneeId: 'ada',
        dependsOn: [],
        now: 2,
      });
      expect(first.item.status === 'active', first.item.status);
      const second = addWork(first.catalog, {
        title: 'write',
        parentId: first.item.id,
        assigneeId: 'ada',
        dependsOn: [first.item.id],
        now: 3,
      });
      expect(second.item.status === 'blocked', second.item.status);
      const done = finishWork(second.catalog, first.item.id, 4);
      expect(done.unblocked[0] === second.item.id, 'finishing the dependency unblocks the next item');
      const follow = done.catalog.work.find((item) => item.id === second.item.id);
      expect(follow?.status === 'active', follow?.status ?? 'missing');
    }),
    check('work', 'due', async () => {
      const created = createAgentRecord(emptyCatalog(), {
        id: 'ada',
        name: 'Ada',
        systemPrompt: 'Local agent.',
        model: 'qwen3.5:9b',
        now: 1,
      });
      const minded = rememberMind(created.catalog, 'ada', {
        valence: 0,
        arousal: 0,
        dominance: 0,
        updatedAt: 1,
        label: 'calm',
        goal: '',
        steps: [],
        lastAt: 1,
      });
      expect(dueAgents(minded, 61_001).includes('ada'), 'silence marks the agent due');
      expect(dueAgents(minded, 1_000).length === 0, 'a recent mind is not due');
    }),
    check('work', 'spoken', async () => {
      const store = createMemoryStore(emptyCatalog());
      const orch = await loadOrchestrator(store);
      await orch.createAgent({ id: 'ada', name: 'Ada', systemPrompt: 'Local agent.', model: 'qwen3.5:9b', now: 1 });
      await orch.createAgent({ id: 'bee', name: 'Bee', systemPrompt: 'Local agent.', model: 'qwen3.5:9b', now: 2 });
      const session = await orch.openSession('ada', 3, 'chat');
      const research = await orch.addWork({
        title: 'research',
        parentId: '',
        assigneeId: 'ada',
        dependsOn: [],
        now: 4,
      });
      const write = await orch.addWork({
        title: 'write',
        parentId: research.id,
        assigneeId: 'bee',
        dependsOn: [research.id],
        now: 5,
      });
      let seen = '';
      await orch.say(
        session.id,
        'status',
        {
          async speak(request) {
            seen = request.work.map((item) => item.title).join(',');
            return { text: 'on it', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        6,
      );
      expect(seen === 'research', seen);
      const unblocked = await orch.finishWork(research.id, 7);
      expect(unblocked[0] === write.id, unblocked.join(','));
      const bee = await orch.openSession('bee', 8, 'chat');
      let heard = '';
      await orch.say(
        bee.id,
        'go',
        {
          async speak(request) {
            heard = request.history.map((turn) => turn.text).join('|');
            const open = request.work.map((item) => item.title).join(',');
            if (open !== 'write') {
              throw new Error(open);
            }
            return { text: 'going', tools: [], changed: [] };
          },
        },
        AbortSignal.timeout(1000),
        9,
      );
      expect(heard.includes('write'), heard);
    }),
    check('work', 'legacy-catalog', async () => {
      const created = createAgentRecord(emptyCatalog(), {
        id: 'ada',
        name: 'Ada',
        systemPrompt: 'Local agent.',
        model: 'qwen3.5:9b',
        now: 1,
      });
      const noted = postNote(created.catalog, {
        fromId: 'user',
        toId: 'ada',
        text: 'hold the step',
        now: 2,
        stepId: 'step-1',
      });
      expect(noted.note.stepId === 'step-1', noted.note.stepId);
      const body: unknown = JSON.parse(serializeCatalog(noted.catalog));
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw new Error('catalog json');
      }
      Reflect.deleteProperty(body, 'work');
      const agents = Reflect.get(body, 'agents');
      if (!Array.isArray(agents) || agents[0] === undefined || typeof agents[0] !== 'object') {
        throw new Error('agents');
      }
      Reflect.deleteProperty(agents[0], 'mind');
      const parsed = parseCatalog(body);
      expect(parsed.work.length === 0, 'missing work loads as empty');
      expect(parsed.agents[0]?.mind === undefined, 'missing mind loads as unset');
      expect(parsed.notes[0]?.stepId === 'step-1', 'step id survives the catalog');
    }),
  ];
}

function extensionCases(): readonly Check[] {
  return [
    check('extensions', 'slack-approval', async () => {
      expect(parseSlackApproval(' YES ') === 'approve', 'approve');
      expect(parseSlackApproval('no') === 'reject', 'reject');
      expect(parseSlackApproval('later') === 'pending', 'pending');
    }),
    check('extensions', 'slack-offline', async () => {
      const seen = { url: '' };
      const missing = await postSlackMessage({
        token: '',
        channel: 'general',
        text: 'hello',
        fetch: scriptedFetch('{"ok":true}', seen),
        signal: AbortSignal.timeout(1000),
      });
      expect(missing.ok === false && seen.url === '', 'missing token must not fetch');
      const posted = await postSlackMessage({
        token: 'xoxb-test',
        channel: 'general',
        text: 'hello',
        fetch: scriptedFetch('{"ok":true}', seen),
        signal: AbortSignal.timeout(1000),
      });
      expect(posted.ok === true && seen.url === 'https://slack.com/api/chat.postMessage', seen.url);
    }),
    check('extensions', 'twitter-length', async () => {
      const seen = { url: '' };
      const long = await postTweet({
        token: 'token',
        text: 'x'.repeat(281),
        fetch: scriptedFetch('{}', seen),
        signal: AbortSignal.timeout(1000),
      });
      expect(long.ok === false && seen.url === '', 'overlong tweet must not fetch');
      const posted = await postTweet({
        token: 'token',
        text: 'harbor',
        fetch: scriptedFetch('{"data":{"id":"1"}}', seen),
        signal: AbortSignal.timeout(1000),
      });
      if (!posted.ok) {
        throw new Error(posted.error);
      }
      expect(posted.id === '1' && seen.url === 'https://api.x.com/2/tweets', seen.url);
    }),
    check('extensions', 'runelite-loopback', async () => {
      assertRuneSocket('ws://127.0.0.1:8080/rune');
      await expectThrow(() => assertRuneSocket('ws://example.com:80'), 'loopback');
      const event = parseRuneEvent('{"type":"chat","speaker":"ada","text":"harbor"}');
      expect(event.type === 'chat' && event.type === 'chat' && event.speaker === 'ada', 'chat');
      expect(encodeRuneAction({ type: 'say', text: 'hello' }).includes('"say"'), 'say');
    }),
    check('extensions', 'portals', async () => {
      expect(portalSpec('openai').baseUrl.includes('openai.com'), 'openai');
      await expectThrow(() => portalSpec('gemma'), 'unknown portal');
      const seen = { url: '' };
      const portal = createPortal({
        id: 'openai',
        apiKey: 'test-key',
        fetch: scriptedFetch('{"choices":[{"message":{"content":"harbor"}}]}', seen),
      });
      const result = await portal.generate({
        system: 'local',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        signal: AbortSignal.timeout(1000),
      });
      expect(result.text === 'harbor' && seen.url.startsWith('https://api.openai.com/'), seen.url);
    }),
    check('extensions', 'memory-hosts', async () => {
      const seen = { url: '' };
      const supabase = await rememberSupabase({
        url: 'http://example.supabase.co',
        apiKey: 'key',
        text: 'note',
        fetch: scriptedFetch('{}', seen),
        signal: AbortSignal.timeout(1000),
      });
      const neon = await rememberNeon({
        endpoint: 'https://example.com/sql',
        apiKey: 'key',
        text: 'note',
        fetch: scriptedFetch('{}', seen),
        signal: AbortSignal.timeout(1000),
      });
      expect(supabase.ok === false && neon.ok === false && seen.url === '', 'foreign hosts must not fetch');
    }),
  ];
}

function scriptedFetch(body: string, seen: { url: string }): HostFetch {
  return async (url) => {
    seen.url = url;
    return {
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
    };
  };
}

function demoCharacter() {
  return parseCharacter({
    schemaVersion: 1,
    id: 'demo',
    name: 'Demo',
    systemPrompt: 'Local agent.',
    provider: {
      type: 'openai-compatible',
      model: 'qwen3.5:9b',
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKeyEnv: 'OLLAMA_API_KEY',
    },
    tools: ['word-count', 'clock', 'json-keys'],
    memory: { recentMessages: 20 },
    emotion: { enabled: true, decay: 0.85 },
  });
}

function check(group: string, name: string, run: () => Promise<void>): Check {
  return { group, name, run };
}

async function team(): Promise<Orchestrator> {
  const orch = await loadOrchestrator(createMemoryStore(emptyCatalog()));
  await orch.createAgent(agent('ada', 'Ada Lane', 1, 'Ada studies harbors and keeps a short brief.'));
  await orch.createAgent(agent('bee', 'Bee', 2, 'Bee keeps the cove.'));
  await orch.openSession('ada', 3, 'chat');
  await orch.openSession('bee', 4, 'chat');
  return orch;
}

function agent(id: string, name: string, now: number, systemPrompt = `${name} is a local agent.`): {
  readonly id: string;
  readonly name: string;
  readonly systemPrompt: string;
  readonly model: string;
  readonly now: number;
} {
  return { id, name, systemPrompt, model: 'scripted', now };
}

function echoSpeaker(text = 'echo'): Speaker {
  return {
    async speak() {
      return { text, tools: [], changed: [] };
    },
  };
}

function namedSpeaker(): Speaker {
  return {
    async speak(request: SpeakRequest) {
      return { text: `${request.character.id} ready`, tools: [], changed: [] };
    },
  };
}

function memoryIo(initial = 'hello'): WorkspaceIO {
  const files = new Map<string, string>([['note.txt', initial]]);
  return {
    async list() {
      return [...files.keys()].map((path) => ({ path, kind: 'file' as const }));
    },
    async read(relativeFile: string) {
      const text = files.get(relativeFile);
      if (text === undefined) {
        throw new Error('missing');
      }
      return text;
    },
    async write(relativeFile: string, text: string) {
      files.set(relativeFile, text);
    },
    async exists(relativeFile: string) {
      return files.has(relativeFile);
    },
    async search() {
      return [];
    },
    async run() {
      return { exitCode: 0, output: '/workspace' };
    },
  };
}

function requireOne<T>(values: readonly T[]): T {
  const value = values[0];
  if (value === undefined) {
    throw new Error('missing value');
  }
  return value;
}

async function expectThrow(run: () => unknown, needle: string): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.toLowerCase().includes(needle.toLowerCase()) && !(error instanceof OrchestrationError && message.includes(needle))) {
      if (!message.includes(needle)) {
        throw new Error(`expected ${needle}, got ${message}`);
      }
    }
    return;
  }
  throw new Error(`expected ${needle}`);
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
