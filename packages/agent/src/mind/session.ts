import { baselineAppraisal, type AppraisalCue, type AppraisalState } from '../appraisal/index.js';
import type { Character } from '../character/index.js';
import type { Intention } from '../cognition/index.js';
import { createMemoryStore, type Episode } from '../memory/index.js';
import { decideTool, type ToolDecision } from '../permissions/index.js';
import { assertRequestBudget } from '../provider/budget.js';
import type { JsonValue, Provider, ProviderRequest, ProviderResult, ProviderTool } from '../provider/types.js';
import { createSocialModel, type Belief, type SocialModel } from '../social/index.js';
import { createTimeline, type Fact } from '../timeline/index.js';
import { clockTool, createToolRegistry, jsonKeysTool, wordCountTool, type ToolRegistry } from '../tools/index.js';
import { runBuiltin } from '../tools/run.js';
import { composeTurn, type PreparedTurn } from '../turn/index.js';
import type { InboundText } from '../inbound/index.js';

const MAX_PENDING = 32;
const TIMELINE_CAPACITY = 200;
const SOCIAL_CAPACITY = 64;
const EPISODE_TEXT = 4000;
const FACT_TEXT = 500;
const TOPIC_TEXT = 200;
const SENDER_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const SOCIAL_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const CHANNELS = new Set(['local', 'slack', 'telegram', 'discord']);

export interface MindSnapshot {
  readonly appraisal: AppraisalState;
  readonly episodes: readonly Episode[];
  readonly beliefs: readonly Belief[];
  readonly intention: Intention | undefined;
  readonly lastStep: PreparedTurn | undefined;
}

export interface ToolOutcome {
  readonly name: string;
  readonly decision: ToolDecision;
  readonly output: string | undefined;
}

export interface MindSpeech {
  readonly prepared: PreparedTurn;
  readonly result: ProviderResult;
  readonly tools: readonly ToolOutcome[];
}

export interface Mind {
  readonly character: Character;
  snapshot(): MindSnapshot;
  facts(limit: number): readonly Fact[];
  hear(message: InboundText, now: number): void;
  step(now: number): PreparedTurn;
  say(text: string, now: number): void;
  request(signal: AbortSignal): ProviderRequest;
  speak(provider: Provider, signal: AbortSignal, now: number): Promise<MindSpeech>;
  useTool(name: string, input: string, now: number, approved: boolean): ToolOutcome;
}

export function createMind(character: Character, now: number): Mind {
  assertNow(now);
  if (character.schemaVersion !== 1) {
    throw new RangeError('character schemaVersion must be 1');
  }
  const allow = character.tools.slice();
  const memory = createMemoryStore(character.memory.recentMessages);
  const social = createSocialModel(SOCIAL_CAPACITY);
  const timeline = createTimeline(TIMELINE_CAPACITY);
  const tools = createToolRegistry();
  tools.register(wordCountTool());
  tools.register(clockTool());
  tools.register(jsonKeysTool());

  let appraisal = baselineAppraisal(character.temperament, now);
  let intention: Intention | undefined;
  let lastStep: PreparedTurn | undefined;
  let lastAt = now;
  let lastPrompt = '';
  let seq = 0;
  const pending: InboundText[] = [];

  function nextId(prefix: string): string {
    seq += 1;
    return `${prefix}-${seq}`;
  }

  function remember(episode: Episode): void {
    memory.remember(episode);
  }

  function note(kind: Fact['kind'], at: number, summary: string): void {
    const text = clip(summary.trim(), FACT_TEXT);
    if (text.length === 0) {
      return;
    }
    timeline.append({ id: nextId(kind), kind, at, summary: text });
  }

  const mind: Mind = {
    character,
    snapshot(): MindSnapshot {
      return {
        appraisal,
        episodes: memory.list(),
        beliefs: social.list(),
        intention,
        lastStep,
      };
    },
    facts(limit: number): readonly Fact[] {
      return timeline.recent(limit);
    },
    hear(message: InboundText, nowHeard: number): void {
      assertNow(nowHeard);
      assertOrder(nowHeard, lastAt);
      const inbound = copyInbound(message);
      pending.push(inbound);
      while (pending.length > MAX_PENDING) {
        pending.shift();
      }
      remember({
        id: nextId('in'),
        text: clip(inbound.text, EPISODE_TEXT),
        createdAt: nowHeard,
        salience: 0.55,
        valence: 0,
        source: 'user',
      });
      note('inbound', nowHeard, `${inbound.sender}: ${inbound.text}`);
      const agentId = socialId(inbound.sender);
      if (agentId !== undefined) {
        social.observe({
          agentId,
          regardDelta: 0.1,
          trustDelta: 0,
          topic: clip(inbound.text, TOPIC_TEXT),
          note: inbound.channel,
          at: nowHeard,
        });
      }
      lastAt = nowHeard;
    },
    step(at: number): PreparedTurn {
      assertNow(at);
      assertOrder(at, lastAt);
      const inbound = pending.shift();
      const inboundText = inbound?.text.trim() ?? '';
      const cue = cueFor(character, inboundText, at, at - lastAt);
      const agentId = inbound === undefined ? undefined : socialId(inbound.sender);
      const belief = agentId !== undefined ? social.get(agentId) : latestBelief(social);
      const prepared = composeTurn({
        characterName: character.name,
        systemPrompt: character.systemPrompt,
        temperament: character.temperament,
        voice: character.voice,
        appraisal,
        cue,
        episodes: memory.list(),
        intention,
        inbound: inboundText.length > 0 ? inboundText : undefined,
        social: belief,
        silenceMs: at - lastAt,
        now: at,
        toolNames: allow,
      });
      appraisal = prepared.appraisal;
      intention = prepared.intention;
      if (prepared.reflection !== undefined) {
        remember(prepared.reflection);
        note('reflection', at, prepared.reflection.text);
      }
      note('drive', at, `${prepared.drive.kind}: ${prepared.drive.reason}`);
      note('appraisal', at, prepared.voice.guidance);
      lastPrompt = inboundText.length > 0 ? inboundText : prepared.drive.reason;
      lastStep = prepared;
      lastAt = at;
      return prepared;
    },
    say(text: string, at: number): void {
      assertNow(at);
      assertOrder(at, lastAt);
      const spoken = text.trim();
      if (spoken.length === 0) {
        throw new RangeError('spoken text must be non-empty');
      }
      const stored = clip(spoken, EPISODE_TEXT);
      remember({
        id: nextId('out'),
        text: stored,
        createdAt: at,
        salience: 0.45,
        valence: appraisal.valence,
        source: 'assistant',
      });
      note('outbound', at, stored);
      lastAt = at;
    },
    request(signal: AbortSignal): ProviderRequest {
      if (lastStep === undefined || lastPrompt.length === 0) {
        throw new Error('step before requesting a provider');
      }
      const request: ProviderRequest = {
        system: lastStep.context.text,
        messages: [{ role: 'user', content: clip(lastPrompt, EPISODE_TEXT) }],
        tools: providerTools(tools, allow),
        signal,
      };
      assertRequestBudget(request, { maxMessages: 8, maxChars: 48000 });
      return request;
    },
    async speak(provider: Provider, signal: AbortSignal, at: number): Promise<MindSpeech> {
      const prepared = mind.step(at);
      const result = await provider.generate(mind.request(signal));
      if (result.text.trim().length > 0) {
        mind.say(result.text, at);
      }
      const outcomes = result.toolCalls.map((call) =>
        mind.useTool(call.name, toolInput(call.arguments), at, false),
      );
      return { prepared, result, tools: outcomes };
    },
    useTool(name: string, input: string, at: number, approved: boolean): ToolOutcome {
      assertNow(at);
      const definition = tools.get(name);
      const effect = definition === undefined || definition.readOnly ? 'read' : 'write';
      const decision = decideTool({ name, effect, allow, approved });
      if (!decision.allowed) {
        note('tool', at, `${name} refused`);
        return { name, decision, output: undefined };
      }
      const output = runBuiltin(name, input, at) ?? 'no local implementation';
      note('tool', at, `${name}: ${output}`);
      return { name, decision, output };
    },
  };

  return mind;
}

function assertNow(now: number): void {
  if (!Number.isFinite(now)) {
    throw new RangeError('now must be finite');
  }
}

function assertOrder(now: number, lastAt: number): void {
  if (now < lastAt) {
    throw new RangeError('now must not move backward');
  }
}

function copyInbound(message: InboundText): InboundText {
  if (!CHANNELS.has(message.channel)) {
    throw new RangeError('unknown channel');
  }
  if (!SENDER_PATTERN.test(message.sender)) {
    throw new RangeError('invalid sender');
  }
  if (message.text.length < 1 || message.text.length > 16000) {
    throw new RangeError('inbound text must be 1 to 16000 characters');
  }
  return { channel: message.channel, sender: message.sender, text: message.text };
}

function socialId(sender: string): string | undefined {
  const normalized = sender.replace(/[.:]/g, '_');
  if (!SOCIAL_ID.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function latestBelief(social: SocialModel): Belief | undefined {
  const beliefs = social.list();
  return beliefs[beliefs.length - 1];
}

function cueFor(character: Character, inboundText: string, at: number, silenceMs: number): AppraisalCue {
  const enabled = character.emotion.enabled;
  if (inboundText.length > 0) {
    return {
      kind: 'user_message',
      intensity: enabled ? clamp(inboundText.length / 400, 0.2, 1) : 0,
      valence: 0,
      at,
    };
  }
  return {
    kind: 'silence',
    intensity: enabled ? clamp(silenceMs / 120_000, 0, 0.4) : 0,
    valence: 0,
    at,
  };
}

function providerTools(registry: ToolRegistry, allow: readonly string[]): ProviderTool[] {
  const listed: ProviderTool[] = [];
  for (const name of allow) {
    const tool = registry.get(name);
    if (tool === undefined) {
      continue;
    }
    listed.push({
      name: tool.name,
      description: tool.description,
      parameters: { type: 'object' },
    });
  }
  return listed;
}

function toolInput(value: JsonValue): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const text = value['text'];
    const json = value['json'];
    if (typeof text === 'string') {
      return text;
    }
    if (typeof json === 'string') {
      return json;
    }
  }
  return JSON.stringify(value);
}

function clip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
