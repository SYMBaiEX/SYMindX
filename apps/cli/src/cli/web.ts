import type { ResearchHit, ResearchIO } from '../../../../packages/orchestration/src/research/index.js';

const USER_AGENT = 'SYMindX/0.2';
const HIT_LIMIT = 8;
const PAGE_LIMIT = 20_000;

export function createWebResearch(): ResearchIO {
  return {
    search,
    readPage,
  };
}

async function search(query: string, signal: AbortSignal): Promise<readonly ResearchHit[]> {
  const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`web search failed (${response.status})`);
  }
  return hitsFromHtml(await response.text());
}

export function hitsFromHtml(html: string): readonly ResearchHit[] {
  const titles = anchors(html, 'result__a');
  const snippets = anchors(html, 'result__snippet');
  const hits: ResearchHit[] = [];
  for (let index = 0; index < titles.length && hits.length < HIT_LIMIT; index += 1) {
    const title = titles[index];
    if (title === undefined) {
      continue;
    }
    const url = publicResultUrl(title.href);
    if (url === undefined) {
      continue;
    }
    const snippet = snippets[index]?.text ?? '';
    hits.push({ title: title.text, url, snippet });
  }
  return hits;
}

async function readPage(url: string, signal: AbortSignal): Promise<string> {
  assertPublicUrl(url);
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/plain, text/html;q=0.9',
    },
    redirect: 'follow',
    signal,
  });
  assertPublicUrl(response.url);
  if (!response.ok) {
    throw new Error(`page read failed (${response.status})`);
  }
  const body = await response.text();
  if (body.includes('\0')) {
    throw new Error('page is not text');
  }
  const contentType = response.headers.get('content-type') ?? '';
  const text = contentType.toLowerCase().includes('html') ? htmlToText(body) : body;
  return text.length > PAGE_LIMIT ? text.slice(0, PAGE_LIMIT) : text;
}

function anchors(html: string, className: string): readonly { readonly href: string; readonly text: string }[] {
  const found: { href: string; text: string }[] = [];
  const pattern = new RegExp(`<a\\b[^>]*class="${className}"[^>]*>[\\s\\S]*?<\\/a>`, 'gi');
  for (const match of html.matchAll(pattern)) {
    const tag = match[0];
    if (tag === undefined) {
      continue;
    }
    const href = attribute(tag, 'href');
    const text = decodeEntities(tag.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (href.length > 0 && text.length > 0) {
      found.push({ href, text });
    }
  }
  return found;
}

function attribute(tag: string, name: string): string {
  const match = new RegExp(`${name}="([^"]*)"`, 'i').exec(tag);
  return decodeEntities(match?.[1] ?? '');
}

function publicResultUrl(href: string): string | undefined {
  const absolute = href.startsWith('//') ? `https:${href}` : href;
  let url: URL;
  try {
    url = new URL(absolute);
  } catch {
    return undefined;
  }
  const redirected = url.searchParams.get('uddg');
  const candidate = redirected ?? url.href;
  return isPublicHttpUrl(candidate) ? new URL(candidate).href : undefined;
}

function assertPublicUrl(value: string): void {
  if (!isPublicHttpUrl(value)) {
    throw new Error('url is not public');
  }
}

function isPublicHttpUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return false;
  }
  return !isBlockedHost(normalizedHost(url.hostname));
}

function normalizedHost(hostname: string): string {
  let host = hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']') && host.length >= 2) {
    host = host.slice(1, -1);
  }
  while (host.endsWith('.')) {
    host = host.slice(0, -1);
  }
  return host;
}

function isBlockedHost(host: string): boolean {
  if (
    host.length === 0 ||
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }
  if (isPrivateIpv4(host)) {
    return true;
  }
  const mapped = ipv4FromMapped(host);
  return mapped === '0.0.0.0' || (mapped !== undefined && isPrivateIpv4(mapped));
}

function isPrivateIpv4(host: string): boolean {
  const octets = ipv4Octets(host);
  if (octets === undefined) {
    return false;
  }
  const [first, second] = octets;
  if (first === 10 || first === 127) {
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

function ipv4Octets(host: string): readonly [number, number, number, number] | undefined {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (match === null) {
    return undefined;
  }
  const numbers: number[] = [];
  for (let index = 1; index <= 4; index += 1) {
    const part = match[index];
    if (part === undefined) {
      return undefined;
    }
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return undefined;
    }
    numbers.push(value);
  }
  const first = numbers[0];
  const second = numbers[1];
  const third = numbers[2];
  const fourth = numbers[3];
  if (first === undefined || second === undefined || third === undefined || fourth === undefined) {
    return undefined;
  }
  return [first, second, third, fourth];
}

function ipv4FromMapped(host: string): string | undefined {
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (hex !== null) {
    const high = hex[1];
    const low = hex[2];
    if (high === undefined || low === undefined) {
      return undefined;
    }
    const hi = Number.parseInt(high, 16);
    const lo = Number.parseInt(low, 16);
    if (!Number.isInteger(hi) || !Number.isInteger(lo) || hi < 0 || lo < 0 || hi > 0xffff || lo > 0xffff) {
      return undefined;
    }
    return `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  }
  const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
  const address = dotted?.[1];
  if (address === undefined || ipv4Octets(address) === undefined) {
    return undefined;
  }
  return address;
}

function htmlToText(html: string): string {
  const withoutScript = stripElements(html, 'script');
  const withoutStyle = stripElements(withoutScript, 'style');
  const withoutTags = withoutStyle.replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function stripElements(html: string, tag: string): string {
  const lower = html.toLowerCase();
  const openToken = `<${tag}`;
  const closeToken = `</${tag}`;
  let cursor = 0;
  let result = '';
  while (cursor < html.length) {
    const start = lower.indexOf(openToken, cursor);
    if (start < 0) {
      result += html.slice(cursor);
      break;
    }
    const boundary = lower.charAt(start + openToken.length);
    const isTag = boundary.length === 0 || boundary === '>' || boundary === '/' || /\s/.test(boundary);
    if (!isTag) {
      result += html.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    result += `${html.slice(cursor, start)} `;
    const closeAt = lower.indexOf(closeToken, start + openToken.length);
    if (closeAt < 0) {
      break;
    }
    const end = lower.indexOf('>', closeAt + closeToken.length);
    cursor = end < 0 ? html.length : end + 1;
  }
  return result;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&lt;|&#60;|&#x3c;/gi, '<')
    .replace(/&gt;|&#62;|&#x3e;/gi, '>')
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&amp;|&#38;|&#x26;/gi, '&');
}
