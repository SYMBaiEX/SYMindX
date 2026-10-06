import { assertPublicUrl } from '../research/execute.js';

export interface Enrichment {
  readonly ok: boolean;
  readonly gaps: readonly string[];
}

const PAPER_HEADINGS = ['Summary', 'Routing', 'Enrichment', 'Proof of concept', 'Limits'] as const;
const APP_SECTIONS = ['Research', 'Routing', 'Proof'] as const;
const MIN_RESEARCH_WORDS = 60;
const MIN_PAPER_WORDS = 160;

export function enrichResearch(text: string): Enrichment {
  const gaps: string[] = [];
  const words = wordCount(text);
  if (words < MIN_RESEARCH_WORDS) {
    gaps.push(`dossier needs at least ${MIN_RESEARCH_WORDS} words`);
  }
  const urls = publicUrls(text);
  if (urls.length < 2) {
    gaps.push('dossier needs at least two public http(s) URLs');
  }
  const blocked = blockedUrls(text);
  if (blocked.length > 0) {
    gaps.push(`remove non-public URLs: ${blocked.join(', ')}`);
  }
  return result(gaps);
}

export function enrichPaper(text: string, notes: string): Enrichment {
  const gaps: string[] = [];
  for (const heading of PAPER_HEADINGS) {
    if (!hasHeading(text, heading)) {
      gaps.push(`missing heading ${heading}`);
    }
  }
  if (wordCount(text) < MIN_PAPER_WORDS) {
    gaps.push(`whitepaper needs at least ${MIN_PAPER_WORDS} words`);
  }
  const sources = new Set(publicUrls(notes));
  const used = publicUrls(text).some((url) => sources.has(url));
  if (!used) {
    gaps.push('whitepaper must include a public URL from the dossier');
  }
  return result(gaps);
}

export function acceptView(text: string): Enrichment & { readonly source: string } {
  const research = sectionSentence(text, 'Research');
  const routing = sectionSentence(text, 'Routing');
  const proof = sectionSentence(text, 'Proof');
  const gaps: string[] = [];
  if (wordCount(research) < 4) {
    gaps.push('Research needs a sentence of at least 4 words');
  }
  if (wordCount(routing) < 4) {
    gaps.push('Routing needs a sentence of at least 4 words');
  }
  if (wordCount(proof) < 4) {
    gaps.push('Proof needs a sentence of at least 4 words');
  }
  return { ...result(gaps), source: composeView(research, routing, proof) };
}

export function enrichApp(text: string): Enrichment {
  const gaps: string[] = [];
  const source = appSource(text);
  if (!source.includes('export function App')) {
    gaps.push('src/App.tsx must export function App');
  }
  if (!source.includes('Local swarm')) {
    gaps.push('src/App.tsx must include the heading Local swarm');
  }
  for (const section of APP_SECTIONS) {
    if (!source.includes(section)) {
      gaps.push(`src/App.tsx must include ${section}`);
    }
  }
  if (/^\s*import\s/mu.test(text) || /^\s*import\s/mu.test(source)) {
    gaps.push('src/App.tsx must not import anything');
  }
  if (source.includes(': any') || source.includes('<any>')) {
    gaps.push('src/App.tsx must not use any');
  }
  return result(gaps);
}

export function appSource(text: string): string {
  const marked = markedFile(text, 'src/App.tsx');
  if (marked !== undefined) {
    return stripFence(marked).trim();
  }
  const fenced = /```(?:tsx|ts|jsx|js)?\s*([\s\S]*?)```/u.exec(text);
  if (fenced?.[1]?.includes('export function App')) {
    return fenced[1].trim();
  }
  const start = text.indexOf('export function App');
  if (start >= 0) {
    return stripFence(text.slice(start)).trim();
  }
  return text.trim();
}

export function publicUrls(text: string): readonly string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gu)) {
    const raw = match[0]?.replace(/[.,;:]+$/u, '');
    if (raw === undefined) {
      continue;
    }
    try {
      const url = assertPublicUrl(raw);
      if (!found.includes(url)) {
        found.push(url);
      }
    } catch {
      continue;
    }
  }
  return found;
}

function blockedUrls(text: string): readonly string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gu)) {
    const raw = match[0]?.replace(/[.,;:]+$/u, '');
    if (raw === undefined) {
      continue;
    }
    try {
      assertPublicUrl(raw);
    } catch {
      if (!found.includes(raw)) {
        found.push(raw);
      }
    }
  }
  return found;
}

function hasHeading(text: string, heading: string): boolean {
  const pattern = new RegExp(`^#{1,3}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  return pattern.test(text);
}

function markedFile(text: string, path: string): string | undefined {
  const pattern = new RegExp(`<<<FILE\\s+${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n([\\s\\S]*?)(?:\\n<<<|$)`, 'u');
  return pattern.exec(text)?.[1]?.trim();
}

function stripFence(text: string): string {
  return text.replace(/```(?:tsx|ts|jsx|js)?/gu, '').replace(/```/gu, '');
}

function sectionSentence(text: string, name: string): string {
  const labeled = new RegExp(`^${name}:\\s*(.+)$`, 'im').exec(text);
  if (labeled?.[1] !== undefined) {
    return cleanText(labeled[1]);
  }
  const block = new RegExp(`<h2>\\s*${name}\\s*</h2>\\s*<p>([\\s\\S]*?)</p>`, 'i').exec(text);
  if (block?.[1] !== undefined) {
    return cleanText(block[1]);
  }
  return '';
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/gu, ' ').trim();
}

function composeView(research: string, routing: string, proof: string): string {
  return `export function App() {
  return (
    <main>
      <h1>Local swarm</h1>
      <section>
        <h2>Research</h2>
        <p>${escapeText(research)}</p>
      </section>
      <section>
        <h2>Routing</h2>
        <p>${escapeText(routing)}</p>
      </section>
      <section>
        <h2>Proof</h2>
        <p>${escapeText(proof)}</p>
      </section>
    </main>
  );
}
`;
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/u).filter((word) => word.length > 0);
  return words.length;
}

function result(gaps: readonly string[]): Enrichment {
  return { ok: gaps.length === 0, gaps };
}
