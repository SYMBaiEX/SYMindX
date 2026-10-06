import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createMind, parseCharacter } from '../../../../packages/agent/src/index.js';
import {
  SWARM_MODEL,
  publicUrls,
  routeTask,
  runSwarmPipeline,
  scoreSwarmDataset,
  swarmScaffold,
  type Orchestrator,
} from '../../../../packages/orchestration/src/index.js';
import { runChatTurn } from './chat-turn.js';
import { OLLAMA_MODEL, ollamaChat } from '../ollama.js';
import { createWebResearch } from './web.js';

const TOPIC = 'local-first agent swarm routing';

export async function executeSwarm(base: string, root: string, orchestrator: Orchestrator): Promise<number> {
  const dataset = await scoreSwarmDataset();
  process.stdout.write(dataset.text);
  if (dataset.failed > 0) {
    return 1;
  }
  await ensureFleet(orchestrator);
  const appRoot = join(root, 'apps', 'swarm-console');
  const result = await runSwarmPipeline(
    {
      research: (gaps, signal) => research(base, gaps, signal),
      write: (notes, gaps, signal) => complete(base, 'write', writePrompt(notes, gaps), signal, 2048),
      build: (paper, gaps, signal) => complete(base, 'build', buildPrompt(paper, gaps), signal, 1536),
      checkApp: (source, signal) => typecheckApp(root, appRoot, source, signal),
    },
    AbortSignal.timeout(720_000),
  );
  for (const line of result.log) {
    process.stderr.write(`${line}\n`);
  }
  if (result.notes.length > 0) {
    await mkdir(appRoot, { recursive: true });
    await writeFile(join(appRoot, 'NOTES.md'), result.notes.endsWith('\n') ? result.notes : `${result.notes}\n`);
  }
  if (result.paper.length > 0) {
    await mkdir(appRoot, { recursive: true });
    await writeFile(join(appRoot, 'PAPER.md'), result.paper.endsWith('\n') ? result.paper : `${result.paper}\n`);
  }
  if (!result.ok) {
    process.stderr.write('swarm stopped before the proof of concept passed\n');
    return 1;
  }
  await writeTree(appRoot, result.files);
  await writeFile(join(appRoot, 'NOTES.md'), result.notes.endsWith('\n') ? result.notes : `${result.notes}\n`);
  await writeFile(join(appRoot, 'PAPER.md'), result.paper.endsWith('\n') ? result.paper : `${result.paper}\n`);
  const noteLimit = 4_000;
  await orchestrator.postNote('scout', 'editor', clip(result.notes, noteLimit), Date.now());
  await orchestrator.postNote('editor', 'mason', clip(result.paper, noteLimit), Date.now());
  process.stdout.write(`swarm ready ${appRoot}\n`);
  return 0;
}

async function research(base: string, gaps: readonly string[], signal: AbortSignal): Promise<string> {
  const route = routeTask('research');
  assertModel(route.model, route.think);
  process.stderr.write(`scout ${route.model} think=false\n`);
  const mind = createMind(
    parseCharacter({
      schemaVersion: 1,
      id: 'scout',
      name: 'Scout',
      systemPrompt: 'You are Scout. Do not reason out loud. When the user names web or page, call that tool before you answer.',
      provider: {
        type: 'openai-compatible',
        model: OLLAMA_MODEL,
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKeyEnv: 'OLLAMA_API_KEY',
      },
      tools: ['word-count', 'clock', 'json-keys'],
      memory: { recentMessages: 20 },
      emotion: { enabled: true, decay: 0.85 },
    }),
    Date.now(),
  );
  const found: string[] = [];
  const web = createWebResearch();
  const answer = await runChatTurn(
    mind,
    base,
    signal,
    researchPrompt(gaps),
    'user',
    {
      async search(query, inner) {
        const hits = await web.search(query, inner);
        for (const hit of hits) {
          found.push(hit.url);
        }
        return hits;
      },
      async readPage(url, inner) {
        found.push(url);
        return web.readPage(url, inner);
      },
    },
    (name, detail) => {
      process.stderr.write(`· ${name} ${detail}\n`);
    },
    {
      async lookup() {
        return 'not used in research';
      },
      async post() {
        return 'not used in research';
      },
    },
    'scout',
  );
  const urls = [...new Set([...found, ...publicUrls(answer.text)])];
  return `${answer.text}\n\nSources:\n${urls.join('\n')}`;
}

async function complete(
  base: string,
  kind: 'write' | 'build',
  prompt: string,
  signal: AbortSignal,
  numPredict: number,
): Promise<string> {
  const route = routeTask(kind);
  assertModel(route.model, route.think);
  process.stderr.write(`${route.role} ${route.model} think=false\n`);
  const reply = await ollamaChat(
    base,
    [
      { role: 'system', content: route.contract },
      { role: 'user', content: prompt },
    ],
    [],
    signal,
    { numPredict },
  );
  return reply.text;
}

function researchPrompt(gaps: readonly string[]): string {
  const lines = [
    `Use the web tool to search for ${TOPIC}.`,
    'Then use the page tool on one public result.',
    'Reply with a dossier of at least 80 words and include the public URLs.',
    'Do not reason out loud.',
  ];
  if (gaps.length > 0) {
    lines.push(`Fix these gaps: ${gaps.join('. ')}`);
  }
  return lines.join(' ');
}

function writePrompt(notes: string, gaps: readonly string[]): string {
  const lines = [
    'Write a short markdown whitepaper.',
    'Use these level-2 headings: Summary, Routing, Enrichment, Proof of concept, Limits.',
    'At least 180 words. Include one public URL from the dossier. Do not call tools. Do not reason out loud.',
    `Dossier:\n${notes}`,
  ];
  if (gaps.length > 0) {
    lines.push(`Fix these gaps:\n${gaps.join('\n')}`);
  }
  return lines.join('\n\n');
}

function buildPrompt(paper: string, gaps: readonly string[]): string {
  const lines = [
    'Return exactly three lines.',
    'Research: one sentence from the whitepaper.',
    'Routing: one sentence from the whitepaper.',
    'Proof: one sentence from the whitepaper.',
    'Do not import anything. Do not write a component.',
    `Whitepaper:\n${paper}`,
  ];
  if (gaps.length > 0) {
    lines.push(`Fix these gaps:\n${gaps.join('\n')}`);
  }
  return lines.join('\n\n');
}

async function typecheckApp(
  root: string,
  appRoot: string,
  source: string,
  signal: AbortSignal,
): Promise<{ readonly ok: boolean; readonly gaps: readonly string[] }> {
  await writeTree(appRoot, { ...swarmScaffold(), 'src/App.tsx': `${source.trim()}\n` });
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const output = await runCommand(tsc, ['-p', join(appRoot, 'tsconfig.json'), '--noEmit', '--pretty', 'false'], root, signal);
  if (output.code === 0) {
    return { ok: true, gaps: [] };
  }
  const detail = output.text.trim().split('\n').slice(0, 12).join('\n');
  return { ok: false, gaps: [`src/App.tsx typecheck failed\n${detail}`] };
}

async function writeTree(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [path, text] of Object.entries(files)) {
    const file = join(root, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  }
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  signal: AbortSignal,
): Promise<{ readonly code: number; readonly text: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let text = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      text += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      text += chunk;
    });
    const abort = (): void => {
      child.kill('SIGTERM');
    };
    signal.addEventListener('abort', abort, { once: true });
    child.on('error', (error) => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
    child.on('close', (code) => {
      signal.removeEventListener('abort', abort);
      resolve({ code: code ?? 1, text });
    });
  });
}

async function ensureFleet(orchestrator: Orchestrator): Promise<void> {
  const specs = [
    ['scout', 'Scout'],
    ['editor', 'Editor'],
    ['mason', 'Mason'],
  ] as const;
  for (const [id, name] of specs) {
    try {
      await orchestrator.createAgent({
        id,
        name,
        systemPrompt: `You are ${name}. Do not reason out loud. Thinking stays off. Answer only the assigned swarm task.`,
        model: OLLAMA_MODEL,
        now: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already exists')) {
        throw error;
      }
    }
  }
}

function assertModel(model: string, think: false): void {
  if (model !== SWARM_MODEL || model !== OLLAMA_MODEL || think !== false) {
    throw new Error('swarm stages must use qwen3.5:9b with thinking off');
  }
}

function clip(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit);
}
