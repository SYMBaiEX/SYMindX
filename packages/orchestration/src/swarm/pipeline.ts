import { decide } from './decide.js';
import { acceptView, enrichPaper, enrichResearch } from './enrich.js';
import { routeTask, type TaskKind } from './route.js';
import { swarmScaffold } from './scaffold.js';

export interface SwarmHands {
  research(gaps: readonly string[], signal: AbortSignal): Promise<string>;
  write(notes: string, gaps: readonly string[], signal: AbortSignal): Promise<string>;
  build(paper: string, gaps: readonly string[], signal: AbortSignal): Promise<string>;
  checkApp?(source: string, signal: AbortSignal): Promise<{ readonly ok: boolean; readonly gaps: readonly string[] }>;
}

export interface SwarmPipelineResult {
  readonly ok: boolean;
  readonly notes: string;
  readonly paper: string;
  readonly app: string;
  readonly files: Readonly<Record<string, string>>;
  readonly log: readonly string[];
}

export async function runSwarmPipeline(hands: SwarmHands, signal: AbortSignal): Promise<SwarmPipelineResult> {
  const log: string[] = [];
  const research = await stage(signal, log, 'research', (gaps) => hands.research(gaps, signal), enrichResearch);
  if (!research.ok) {
    return finish(false, research.text, '', '', log);
  }
  const paper = await stage(
    signal,
    log,
    'write',
    (gaps) => hands.write(research.text, gaps, signal),
    (text) => enrichPaper(text, research.text),
  );
  if (!paper.ok) {
    return finish(false, research.text, paper.text, '', log);
  }
  const built = await stage(signal, log, 'build', (gaps) => hands.build(paper.text, gaps, signal), (text) =>
    checkBuild(hands, text, signal),
  );
  return finish(built.ok, research.text, paper.text, built.text, log);
}

async function stage(
  signal: AbortSignal,
  log: string[],
  kind: TaskKind,
  run: (gaps: readonly string[]) => Promise<string>,
  enrich: (text: string) => EnrichLike | Promise<EnrichLike>,
): Promise<{ readonly ok: boolean; readonly text: string }> {
  let gaps: readonly string[] = [];
  let text = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    throwIfAborted(signal);
    const route = routeTask(kind);
    log.push(`${route.role} ${route.model} think=${String(route.think)} ${route.contract}`);
    text = await run(gaps);
    const checked = await enrich(text);
    log.push(checked.ok ? `enrich ${kind} pass` : `enrich ${kind} fail ${checked.gaps.join('; ')}`);
    const decision = decide(kind, checked.ok, attempt);
    if (decision.action === 'advance') {
      log.push(`advance ${decision.stage}`);
      return { ok: true, text: checked.source ?? text };
    }
    if (decision.action === 'stop') {
      log.push(`stop ${decision.stage}`);
      return { ok: false, text };
    }
    gaps = checked.gaps;
    log.push(`retry ${decision.stage}`);
  }
  return { ok: false, text };
}

async function checkBuild(hands: SwarmHands, text: string, signal: AbortSignal): Promise<EnrichLike> {
  const structural = acceptView(text);
  if (!structural.ok || hands.checkApp === undefined) {
    return structural;
  }
  const typed = await hands.checkApp(structural.source, signal);
  if (typed.ok) {
    return structural;
  }
  return { ok: false, gaps: [...structural.gaps, ...typed.gaps], source: structural.source };
}

function finish(
  ok: boolean,
  notes: string,
  paper: string,
  app: string,
  log: readonly string[],
): SwarmPipelineResult {
  const files = ok ? { ...swarmScaffold(), 'src/App.tsx': `${app.trim()}\n` } : {};
  return { ok, notes, paper, app, files, log };
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  }
}

interface EnrichLike {
  readonly ok: boolean;
  readonly gaps: readonly string[];
  readonly source?: string;
}
