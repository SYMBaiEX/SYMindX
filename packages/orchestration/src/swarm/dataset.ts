import { decide } from './decide.js';
import { acceptView, appSource, enrichApp, enrichPaper, enrichResearch, publicUrls } from './enrich.js';
import { runSwarmPipeline } from './pipeline.js';
import { routeTask, SWARM_MODEL } from './route.js';
import { swarmScaffold } from './scaffold.js';
import { OrchestrationError } from '../types.js';

export interface DatasetScore {
  readonly passed: number;
  readonly failed: number;
  readonly text: string;
}

interface DatasetCase {
  readonly name: string;
  readonly run: () => Promise<void>;
}

export async function scoreSwarmDataset(): Promise<DatasetScore> {
  const lines: string[] = [];
  let passed = 0;
  let failed = 0;
  for (const item of cases()) {
    try {
      await item.run();
      passed += 1;
      lines.push(`pass ${item.name}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'failed';
      lines.push(`fail ${item.name}: ${message}`);
    }
  }
  lines.push(`${passed} passed, ${failed} failed`);
  return { passed, failed, text: `${lines.join('\n')}\n` };
}

function cases(): readonly DatasetCase[] {
  return [
    item('route-scout', async () => {
      const route = routeTask('research');
      expect(route.role === 'scout' && route.model === SWARM_MODEL && route.think === false, 'scout');
    }),
    item('route-editor', async () => {
      const route = routeTask('write');
      expect(route.role === 'editor' && route.contract.includes('Do not browse'), 'editor');
    }),
    item('route-mason', async () => {
      const route = routeTask('build');
      expect(route.role === 'mason' && route.model === 'qwen3.5:9b', 'mason');
    }),
    item('route-no-other-model', async () => {
      const models = [routeTask('research'), routeTask('write'), routeTask('build')].map((route) => route.model);
      expect(models.every((model) => model === SWARM_MODEL), models.join(','));
    }),
    item('route-thinking-off', async () => {
      expect([routeTask('research'), routeTask('write'), routeTask('build')].every((route) => route.think === false), 'think');
    }),
    item('route-unknown', async () => {
      await expectThrow(() => routeTask('reason'), 'Unknown swarm task reason');
    }),
    item('research-pass', async () => {
      expect(enrichResearch(dossier()).ok, 'dossier');
    }),
    item('research-one-url', async () => {
      const checked = enrichResearch(`${words(70, 'harbor')} https://example.com/routing`);
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('two public')), checked.gaps.join('; '));
    }),
    item('research-private-url', async () => {
      const checked = enrichResearch(`${dossier()} http://127.0.0.1/secret`);
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('non-public')), checked.gaps.join('; '));
    }),
    item('research-short', async () => {
      const checked = enrichResearch('https://example.com/a https://example.com/b');
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('60 words')), checked.gaps.join('; '));
    }),
    item('paper-pass', async () => {
      expect(enrichPaper(paper(), dossier()).ok, 'paper');
    }),
    item('paper-missing-limits', async () => {
      const checked = enrichPaper(paper().replace('## Limits', '## Later'), dossier());
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('Limits')), checked.gaps.join('; '));
    }),
    item('paper-missing-source', async () => {
      const checked = enrichPaper(paper().replaceAll('https://example.com/routing', 'https://example.com/other'), dossier());
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('URL from the dossier')), checked.gaps.join('; '));
    }),
    item('paper-short', async () => {
      const brief = PAPER_HEADINGS.map((heading) => `## ${heading}\nhttps://example.com/routing`).join('\n');
      const checked = enrichPaper(brief, dossier());
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('160 words')), checked.gaps.join('; '));
    }),
    item('app-pass', async () => {
      expect(enrichApp(view()).ok, 'app');
    }),
    item('app-fenced', async () => {
      expect(enrichApp(`Here is the view:\n\`\`\`tsx\n${view()}\n\`\`\``).ok, 'fence');
    }),
    item('app-file-block', async () => {
      const source = appSource(`<<<FILE src/App.tsx\n${view()}\n<<<END`);
      expect(source.startsWith('export function App') && enrichApp(source).ok, 'block');
    }),
    item('app-import', async () => {
      const checked = enrichApp(`import { useState } from 'react';\n${view()}`);
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('must not import')), checked.gaps.join('; '));
    }),
    item('accept-labeled-view', async () => {
      const accepted = acceptView('Research: Scout gathers public sources for the swarm.\nRouting: The router assigns scout editor or mason.\nProof: The view shows the accepted stages.');
      expect(accepted.ok && accepted.source.includes('export function App') && !accepted.source.includes('import '), accepted.gaps.join('; '));
    }),
    item('accept-recovers-tsx', async () => {
      const accepted = acceptView(`import { useState } from 'react';\n${view()}`);
      expect(accepted.ok && !/^\s*import\s/mu.test(accepted.source), accepted.gaps.join('; '));
    }),
    item('app-missing-proof', async () => {
      const checked = enrichApp(view().replace('Proof', 'Demo'));
      expect(!checked.ok && checked.gaps.some((gap) => gap.includes('Proof')), checked.gaps.join('; '));
    }),
    item('advance-research', async () => {
      const decision = decide('research', true, 1);
      expect(decision.action === 'advance' && decision.stage === 'write', 'advance');
    }),
    item('retry-research', async () => {
      const decision = decide('research', false, 1);
      expect(decision.action === 'retry' && decision.stage === 'research', 'retry');
    }),
    item('stop-research', async () => {
      const decision = decide('research', false, 2);
      expect(decision.action === 'stop' && decision.stage === 'research', 'stop');
    }),
    item('advance-write', async () => {
      const decision = decide('write', true, 2);
      expect(decision.action === 'advance' && decision.stage === 'build', 'write');
    }),
    item('advance-build', async () => {
      const decision = decide('build', true, 1);
      expect(decision.action === 'advance' && decision.stage === 'done', 'done');
    }),
    item('stop-build', async () => {
      const decision = decide('build', false, 2);
      expect(decision.action === 'stop' && decision.stage === 'build', 'stop build');
    }),
    item('attempt-zero', async () => {
      await expectThrow(() => decide('research', true, 0), 'swarm attempt must start at 1');
    }),
    item('urls-skip-private', async () => {
      const urls = publicUrls('http://127.0.0.1/a https://example.com/routing');
      expect(urls.length === 1 && urls[0] === 'https://example.com/routing', urls.join(','));
    }),
    item('scaffold-toolchain', async () => {
      const files = swarmScaffold();
      expect(files['src/main.tsx']?.includes("from './App.js'") === true, 'main');
      expect(files['package.json']?.includes('@symindx/swarm-console') === true, 'package');
      expect(files['index.html']?.includes('id="root"') === true, 'html');
      expect(files['tsconfig.json']?.includes('"jsx": "react-jsx"') === true, 'jsx');
    }),
    item('pipeline-pass', async () => {
      let writes = 0;
      let builds = 0;
      const result = await runSwarmPipeline(
        {
          async research() {
            return dossier();
          },
          async write() {
            writes += 1;
            return paper();
          },
          async build() {
            builds += 1;
            return view();
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(result.ok && writes === 1 && builds === 1, `ok ${result.ok} writes ${writes} builds ${builds}`);
      expect(result.files['src/App.tsx']?.includes('Local swarm') === true, 'file');
      expect(result.log.some((line) => line.startsWith('scout qwen3.5:9b think=false')), 'scout log');
      expect(result.log.some((line) => line.startsWith('editor qwen3.5:9b think=false')), 'editor log');
      expect(result.log.some((line) => line.startsWith('mason qwen3.5:9b think=false')), 'mason log');
    }),
    item('pipeline-stops-before-write', async () => {
      let writes = 0;
      const result = await runSwarmPipeline(
        {
          async research() {
            return 'no sources yet';
          },
          async write() {
            writes += 1;
            return paper();
          },
          async build() {
            return view();
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(!result.ok && writes === 0 && result.log.some((line) => line === 'stop research'), `writes ${writes}`);
    }),
    item('pipeline-retries-paper', async () => {
      let writes = 0;
      const result = await runSwarmPipeline(
        {
          async research() {
            return dossier();
          },
          async write(_notes, gaps) {
            writes += 1;
            return gaps.length === 0 ? 'too short' : paper();
          },
          async build() {
            return view();
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(result.ok && writes === 2, `writes ${writes} ${result.log.join(' | ')}`);
    }),
    item('pipeline-typecheck-gap', async () => {
      let builds = 0;
      const result = await runSwarmPipeline(
        {
          async research() {
            return dossier();
          },
          async write() {
            return paper();
          },
          async build(_paper, gaps) {
            builds += 1;
            return gaps.length === 0 ? view() : view();
          },
          async checkApp(_source, _signal) {
            return builds < 2 ? { ok: false, gaps: ['src/App.tsx typecheck failed'] } : { ok: true, gaps: [] };
          },
        },
        AbortSignal.timeout(1000),
      );
      expect(result.ok && builds === 2, `builds ${builds}`);
    }),
  ];
}

const PAPER_HEADINGS = ['Summary', 'Routing', 'Enrichment', 'Proof of concept', 'Limits'] as const;

function dossier(): string {
  return `${words(70, 'harbor')} https://example.com/routing https://example.com/agents`;
}

function paper(): string {
  return PAPER_HEADINGS.map((heading) => `## ${heading}\n${words(40, heading.toLowerCase())}\nhttps://example.com/routing`).join('\n');
}

function view(): string {
  return `export function App() {
  return (
    <main>
      <h1>Local swarm</h1>
      <section>
        <h2>Research</h2>
        <p>Scout gathers public sources.</p>
      </section>
      <section>
        <h2>Routing</h2>
        <p>The router assigns scout, editor, or mason.</p>
      </section>
      <section>
        <h2>Proof</h2>
        <p>The view shows the accepted stages.</p>
      </section>
    </main>
  );
}`;
}

function words(count: number, token: string): string {
  return Array.from({ length: count }, () => token).join(' ');
}

function item(name: string, run: () => Promise<void>): DatasetCase {
  return { name, run };
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectThrow(run: () => unknown, needle: string): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!(error instanceof OrchestrationError) && !message.includes(needle)) {
      throw new Error(`expected ${needle}, got ${message}`);
    }
    if (!message.includes(needle)) {
      throw new Error(`expected ${needle}, got ${message}`);
    }
    return;
  }
  throw new Error(`expected ${needle}`);
}
