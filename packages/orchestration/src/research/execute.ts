import type { ResearchEffect, ResearchHit, ResearchIO, ResearchTool } from './types.js';

const HIT_LIMIT = 5;
const FIELD_LIMIT = 200;
const PAGE_LIMIT = 12_000;
const QUERY_LIMIT = 200;

type Ipv6 = readonly [number, number, number, number, number, number, number, number];

export function researchTools(): readonly ResearchTool[] {
  return [
    tool(
      'web',
      'Search the public web and then answer from the hits.',
      { query: stringProp('Search query, 1 to 200 characters.') },
      ['query'],
    ),
    tool(
      'page',
      'Read one public http(s) page.',
      { url: stringProp('Public http or https URL.') },
      ['url'],
    ),
  ];
}

export function assertPublicUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('url must be a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('url protocol must be http or https');
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error('url must not include a username or password');
  }
  if (url.hostname.length === 0 || bareHost(url.hostname).length === 0) {
    throw new Error('url must include a hostname');
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error('url host is not public');
  }
  return url.href;
}

export async function executeResearch(
  name: string,
  args: unknown,
  io: ResearchIO,
  signal: AbortSignal,
): Promise<ResearchEffect> {
  try {
    throwIfAborted(signal);
    const record = argumentRecord(args);
    if (name === 'web') {
      return await runWeb(record, io, signal);
    }
    if (name === 'page') {
      return await runPage(record, io, signal);
    }
    throw new Error(`unknown tool ${name}`);
  } catch (error) {
    if (isAbort(error) || signal.aborted) {
      throw isAbort(error) ? error : abortError();
    }
    const message = error instanceof Error ? error.message : 'tool failed';
    return { text: `error: ${message}` };
  }
}

async function runWeb(record: Record<string, unknown>, io: ResearchIO, signal: AbortSignal): Promise<ResearchEffect> {
  const query = requireQuery(record);
  throwIfAborted(signal);
  const hits = await io.search(query, signal);
  throwIfAborted(signal);
  return { text: formatHits(hits) };
}

async function runPage(record: Record<string, unknown>, io: ResearchIO, signal: AbortSignal): Promise<ResearchEffect> {
  const url = requireUrl(record);
  throwIfAborted(signal);
  const text = await io.readPage(url, signal);
  throwIfAborted(signal);
  if (typeof text !== 'string') {
    throw new Error('page text must be a string');
  }
  return { text: clip(text, PAGE_LIMIT) };
}

function requireQuery(record: Record<string, unknown>): string {
  const query = record['query'];
  if (typeof query !== 'string') {
    throw new Error('query must be 1 to 200 characters');
  }
  const trimmed = query.trim();
  if (trimmed.length < 1 || trimmed.length > QUERY_LIMIT) {
    throw new Error('query must be 1 to 200 characters');
  }
  return trimmed;
}

function requireUrl(record: Record<string, unknown>): string {
  const url = record['url'];
  if (typeof url !== 'string') {
    throw new Error('url must be a string');
  }
  if (url.length === 0) {
    throw new Error('url is required');
  }
  return assertPublicUrl(url);
}

function formatHits(value: unknown): string {
  if (!Array.isArray(value)) {
    throw new Error('search results must be a list');
  }
  const blocks: string[] = [];
  for (const item of value) {
    if (blocks.length >= HIT_LIMIT) {
      break;
    }
    const hit = acceptedHit(item);
    if (hit === undefined) {
      continue;
    }
    blocks.push(`${blocks.length + 1}. ${hit.title}\n${hit.url}\n${hit.snippet}`);
  }
  if (blocks.length === 0) {
    return 'no results';
  }
  return blocks.join('\n\n');
}

function acceptedHit(value: unknown): ResearchHit | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const title = value['title'];
  const url = value['url'];
  const snippet = value['snippet'];
  if (typeof title !== 'string' || typeof url !== 'string' || typeof snippet !== 'string') {
    return undefined;
  }
  if (url.length === 0) {
    return undefined;
  }
  try {
    return { title: clipField(title), url: assertPublicUrl(url), snippet: clipField(snippet) };
  } catch {
    return undefined;
  }
}

function argumentRecord(value: unknown): Record<string, unknown> {
  let current = value;
  if (typeof current === 'string') {
    try {
      const parsed: unknown = JSON.parse(current);
      current = parsed;
    } catch {
      throw new Error('tool arguments must be an object');
    }
  }
  const record = copyRecord(current);
  const nested = record['json'];
  if (isRecord(nested) && record['query'] === undefined && record['url'] === undefined) {
    return copyRecord(nested);
  }
  return record;
}

function copyRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error('tool arguments must be an object');
  }
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    copy[key] = Reflect.get(value, key);
  }
  return copy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clip(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n[truncated]`;
}

function clipField(text: string): string {
  if (text.length <= FIELD_LIMIT) {
    return text;
  }
  return text.slice(0, FIELD_LIMIT);
}

function bareHost(hostname: string): string {
  let name = hostname;
  while (name.endsWith('.')) {
    name = name.slice(0, -1);
  }
  return name;
}

function isBlockedHost(hostname: string): boolean {
  const bare = bareHost(hostname).toLowerCase();
  if (isBlockedName(bare)) {
    return true;
  }
  if (bare.startsWith('[')) {
    const groups = ipv6Groups(bare);
    return groups === undefined || isNonPublicIpv6(groups);
  }
  const ipv4 = parseIpv4(bare);
  return ipv4 !== undefined && isNonPublicIpv4(ipv4);
}

function isBlockedName(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

function isNonPublicIpv4(value: number): boolean {
  const first = (value >>> 24) & 255;
  const second = (value >>> 16) & 255;
  if (value === 0 || first === 10 || first === 127) {
    return true;
  }
  if (first === 169 && second === 254) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }
  return first === 192 && second === 168;
}

function isNonPublicIpv6(groups: Ipv6): boolean {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 1) {
    return true;
  }
  if ((g0 & 0xfe00) === 0xfc00 || (g0 & 0xffc0) === 0xfe80) {
    return true;
  }
  const prefixClear = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0;
  if (prefixClear && (g5 === 0 || g5 === 0xffff)) {
    return isNonPublicIpv4(embeddedIpv4(g6, g7));
  }
  return false;
}

function embeddedIpv4(high: number, low: number): number {
  return (((high & 0xffff) << 16) | (low & 0xffff)) >>> 0;
}

function ipv6Groups(hostname: string): Ipv6 | undefined {
  if (!hostname.startsWith('[') || !hostname.endsWith(']') || hostname.length < 3) {
    return undefined;
  }
  const inner = hostname.slice(1, -1);
  const halves = inner.split('::');
  if (halves.length > 2) {
    return undefined;
  }
  const left = parseIpv6Side(halves[0] ?? '');
  if (left === undefined) {
    return undefined;
  }
  if (halves.length === 1) {
    return toIpv6(left);
  }
  const right = parseIpv6Side(halves[1] ?? '');
  if (right === undefined) {
    return undefined;
  }
  const missing = 8 - left.length - right.length;
  if (missing < 1) {
    return undefined;
  }
  const expanded = [...left];
  for (let index = 0; index < missing; index += 1) {
    expanded.push(0);
  }
  expanded.push(...right);
  return toIpv6(expanded);
}

function parseIpv6Side(side: string): number[] | undefined {
  if (side.length === 0) {
    return [];
  }
  const parts = side.split(':');
  const groups: number[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part === undefined || part.length === 0) {
      return undefined;
    }
    if (part.includes('.')) {
      if (index !== parts.length - 1) {
        return undefined;
      }
      const ipv4 = parseIpv4(part);
      if (ipv4 === undefined) {
        return undefined;
      }
      groups.push((ipv4 >>> 16) & 0xffff, ipv4 & 0xffff);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/.test(part)) {
      return undefined;
    }
    groups.push(Number.parseInt(part, 16));
  }
  return groups;
}

function toIpv6(groups: readonly number[]): Ipv6 | undefined {
  if (groups.length !== 8) {
    return undefined;
  }
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  if (
    g0 === undefined ||
    g1 === undefined ||
    g2 === undefined ||
    g3 === undefined ||
    g4 === undefined ||
    g5 === undefined ||
    g6 === undefined ||
    g7 === undefined
  ) {
    return undefined;
  }
  return [g0, g1, g2, g3, g4, g5, g6, g7];
}

function parseIpv4(text: string): number | undefined {
  const parts = text.split('.');
  if (parts.length !== 4) {
    return undefined;
  }
  let value = 0;
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) {
      return undefined;
    }
    const octet = Number(part);
    if (octet > 255) {
      return undefined;
    }
    value = value * 256 + octet;
  }
  return value;
}

function tool(
  name: string,
  description: string,
  properties: Readonly<Record<string, { readonly type: 'string'; readonly description: string }>>,
  required: readonly string[],
): ResearchTool {
  return {
    name,
    description,
    parameters: { type: 'object', properties, required },
  };
}

function stringProp(description: string): { readonly type: 'string'; readonly description: string } {
  return { type: 'string', description };
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw abortError();
  }
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

function isAbort(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}
