import { labelAppraisal, updateAppraisal, type AppraisalCue, type AppraisalState, type Temperament } from '../appraisal/index.js';
import { planGoal, react, type Intention, type Reaction } from '../cognition/index.js';
import { assemble, type AssembledContext, type ContextSlice } from '../context/index.js';
import { selectDrive, type DriveChoice } from '../drives/index.js';
import { recall, type Episode } from '../memory/index.js';
import type { Belief } from '../social/index.js';
import { express, type VoiceHint, type VoiceTraits } from '../voice/index.js';

export interface TurnInput {
  readonly characterName: string;
  readonly systemPrompt: string;
  readonly temperament: Temperament;
  readonly voice: VoiceTraits;
  readonly appraisal: AppraisalState;
  readonly cue: AppraisalCue;
  readonly episodes: readonly Episode[];
  readonly intention: Intention | undefined;
  readonly inbound: string | undefined;
  readonly social: Belief | undefined;
  readonly silenceMs: number;
  readonly now: number;
  readonly toolNames: readonly string[];
}

export interface PreparedTurn {
  readonly appraisal: AppraisalState;
  readonly drive: DriveChoice;
  readonly reaction: Reaction;
  readonly voice: VoiceHint;
  readonly context: AssembledContext;
  readonly recall: readonly Episode[];
  readonly intention: Intention | undefined;
  readonly reflection: Episode | undefined;
}

export function composeTurn(input: TurnInput): PreparedTurn {
  if (!Number.isFinite(input.now)) {
    throw new RangeError('now must be finite');
  }
  if (input.characterName.trim().length === 0 || input.systemPrompt.trim().length === 0) {
    throw new RangeError('characterName and systemPrompt must be non-empty');
  }

  const nextAppraisal = updateAppraisal(input.appraisal, input.cue, input.temperament);
  const inboundText = input.inbound?.trim() ?? '';
  const reaction = react(inboundText, nextAppraisal.arousal);
  const openSteps = countOpenSteps(input.intention);
  const regard = input.social?.regard ?? 0;
  const trust = input.social?.trust ?? 0.5;
  const drive = selectDrive({
    hasInbound: inboundText.length > 0,
    arousal: nextAppraisal.arousal,
    valence: nextAppraisal.valence,
    silenceMs: input.silenceMs,
    regard,
    trust,
    openSteps,
  });
  const voice = express(input.voice, nextAppraisal);
  const recalled = recall(input.episodes, input.now, nextAppraisal.valence, 8000, 8);
  const intention = resolveIntention(input.intention, drive.kind, inboundText, input.now);
  const reflection = drive.kind === 'reflect' ? reflectionEpisode(input.now, nextAppraisal.valence, intention) : undefined;
  const context = assemble(contextSlices(input, nextAppraisal, voice.guidance, inboundText, intention, input.social, recalled), 16000);

  return {
    appraisal: nextAppraisal,
    drive,
    reaction,
    voice,
    context,
    recall: recalled,
    intention,
    reflection,
  };
}

function countOpenSteps(intention: Intention | undefined): number {
  if (intention === undefined) {
    return 0;
  }
  return intention.steps.filter((step) => step.status === 'pending' || step.status === 'active').length;
}

function resolveIntention(
  current: Intention | undefined,
  driveKind: DriveChoice['kind'],
  inboundText: string,
  now: number,
): Intention | undefined {
  if (current !== undefined) {
    return current;
  }
  if (driveKind === 'reply' && inboundText.length > 0) {
    return planGoal(inboundText.slice(0, 500), now);
  }
  return undefined;
}

function reflectionEpisode(now: number, valence: number, intention: Intention | undefined): Episode {
  return {
    id: `reflection:${now}`,
    text: reflectionSentence(intention),
    createdAt: now,
    salience: 0.6,
    valence,
    source: 'reflection',
  };
}

function reflectionSentence(intention: Intention | undefined): string {
  const goal = (intention?.goal ?? '').replace(/[.!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (goal.length === 0) {
    return 'Nothing pending.';
  }
  const prefix = 'Review ';
  const clipped = goal.slice(0, 399 - prefix.length - 1).trimEnd();
  if (clipped.length === 0) {
    return 'Nothing pending.';
  }
  return `${prefix}${clipped}.`;
}

function contextSlices(
  input: TurnInput,
  appraisal: AppraisalState,
  guidance: string,
  inboundText: string,
  intention: Intention | undefined,
  social: Belief | undefined,
  recalled: readonly Episode[],
): readonly ContextSlice[] {
  const slices: ContextSlice[] = [
    { label: 'identity', text: `${input.characterName}\n${input.systemPrompt}`, priority: 100 },
    { label: 'voice', text: guidance, priority: 90 },
    {
      label: 'appraisal',
      text: `Mood ${labelAppraisal(appraisal)}. valence ${appraisal.valence.toFixed(2)} arousal ${appraisal.arousal.toFixed(2)} dominance ${appraisal.dominance.toFixed(2)}`,
      priority: 80,
    },
  ];
  if (inboundText.length > 0) {
    slices.push({ label: 'inbound', text: inboundText, priority: 70 });
  }
  if (intention !== undefined) {
    const steps = intention.steps.map((step) => step.text).join('\n');
    slices.push({
      label: 'plan',
      text: steps.length > 0 ? `${intention.goal}\n${steps}` : intention.goal,
      priority: 60,
    });
  }
  if (social !== undefined) {
    slices.push({
      label: 'social',
      text: `${social.agentId} regard ${social.regard} trust ${social.trust} ${social.lastTopic}`,
      priority: 50,
    });
  }
  if (recalled.length > 0) {
    slices.push({ label: 'memories', text: recalled.map((episode) => episode.text).join('\n'), priority: 40 });
  }
  if (input.toolNames.length > 0) {
    slices.push({ label: 'tools', text: input.toolNames.join(', '), priority: 30 });
  }
  return slices;
}
