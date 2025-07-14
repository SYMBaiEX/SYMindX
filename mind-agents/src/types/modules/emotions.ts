/**
 * Emotion module types for SYMindX
 *
 * This file contains specific types for emotion processing,
 * triggers, modifiers, and transitions.
 */

import { EmotionState, EmotionRecord } from '../agent';
import { Context, Metadata } from '../common';

/**
 * Event that triggers an emotion change
 */
export interface EmotionTriggerEvent {
  /**
   * Type of the trigger event
   */
  type: string;

  /**
   * Source of the trigger (e.g., 'user', 'system', 'environment')
   */
  source: string;

  /**
   * Intensity of the trigger (0.0 to 1.0)
   */
  intensity: number;

  /**
   * Optional context data for the trigger
   */
  context?: Context;

  /**
   * Timestamp when the trigger occurred
   */
  timestamp: Date;

  /**
   * Optional metadata about the trigger
   */
  metadata?: Metadata;
}

/**
 * Modifier that affects emotion intensity or behavior
 */
export interface EmotionModifier {
  /**
   * Multiplicative factor for emotion intensity
   */
  factor: number;

  /**
   * Duration in milliseconds
   */
  duration: number;

  /**
   * Reason for the modifier
   */
  reason: string;

  /**
   * Type of modifier (e.g., 'personality', 'context', 'social')
   */
  type?: string;

  /**
   * Whether this modifier stacks with others
   */
  stackable?: boolean;

  /**
   * Optional expiration timestamp
   */
  expiresAt?: Date;
}

/**
 * Transition between emotion states
 */
export interface EmotionTransition {
  /**
   * Starting emotion state
   */
  from: string;

  /**
   * Target emotion state
   */
  to: string;

  /**
   * Duration of transition in milliseconds
   */
  duration: number;

  /**
   * Easing function name or custom function
   */
  easing: string | ((t: number) => number);

  /**
   * Trigger that caused the transition
   */
  trigger?: EmotionTriggerEvent;

  /**
   * Progress of transition (0.0 to 1.0)
   */
  progress?: number;

  /**
   * Whether the transition can be interrupted
   */
  interruptible?: boolean;
}

/**
 * Result of blending multiple emotions
 */
export interface EmotionBlendResult {
  /**
   * Primary (dominant) emotion
   */
  primary: string;

  /**
   * Secondary emotion (if any)
   */
  secondary?: string;

  /**
   * Blend ratio between primary and secondary (0.0 to 1.0)
   */
  ratio: number;

  /**
   * Resulting blended emotion coordinates
   */
  coordinates: {
    valence: number;
    arousal: number;
    dominance: number;
  };

  /**
   * Overall intensity of the blend
   */
  intensity: number;

  /**
   * All contributing emotions with their weights
   */
  components: Array<{
    emotion: string;
    weight: number;
    contribution: number;
  }>;
}

/**
 * Entry in emotion history
 */
export interface EmotionHistoryEntry {
  /**
   * The emotion that was active
   */
  emotion: string;

  /**
   * Timestamp when this emotion became active
   */
  timestamp: Date;

  /**
   * What triggered this emotion
   */
  trigger: EmotionTriggerEvent;

  /**
   * Duration this emotion was active (in milliseconds)
   */
  duration?: number;

  /**
   * Peak intensity reached
   */
  peakIntensity: number;

  /**
   * Average intensity over duration
   */
  averageIntensity?: number;

  /**
   * Any modifiers that were active
   */
  modifiers?: EmotionModifier[];

  /**
   * Metadata about this emotion period
   */
  metadata?: Metadata;
}

/**
 * Result returned by emotion processing methods
 */
export interface EmotionResult {
  /**
   * The resulting emotion state
   */
  state: EmotionState;

  /**
   * Whether the emotion changed
   */
  changed: boolean;

  /**
   * Previous emotion (if changed)
   */
  previousEmotion?: string;

  /**
   * Any transitions that occurred
   */
  transitions?: EmotionTransition[];

  /**
   * Active modifiers
   */
  modifiers?: EmotionModifier[];

  /**
   * Blend result if multiple emotions are active
   */
  blendResult?: EmotionBlendResult;

  /**
   * Processing metadata
   */
  metadata?: {
    processingTime: number;
    triggersProcessed: number;
    [key: string]: unknown;
  };
}

/**
 * Emotion-specific data for different emotion types
 */
export interface EmotionData {
  /**
   * Base emotion data shared by all emotions
   */
  base: {
    intensity: number;
    triggers: string[];
    modifiers: Record<string, number>;
  };

  /**
   * Happy emotion specific data
   */
  happy?: {
    joyLevel: number;
    excitementFactor: number;
    socialBonus: number;
  };

  /**
   * Sad emotion specific data
   */
  sad?: {
    griefLevel: number;
    isolationFactor: number;
    energyPenalty: number;
  };

  /**
   * Angry emotion specific data
   */
  angry?: {
    frustrationLevel: number;
    aggressionFactor: number;
    focusPenalty: number;
  };

  /**
   * Anxious emotion specific data
   */
  anxious?: {
    worryLevel: number;
    tensionFactor: number;
    uncertaintyLevel: number;
  };

  /**
   * Confident emotion specific data
   */
  confident?: {
    selfAssurance: number;
    competenceFactor: number;
    leadershipBonus: number;
  };

  /**
   * Nostalgic emotion specific data
   */
  nostalgic?: {
    reminiscenceLevel: number;
    bittersweetFactor: number;
    temporalDistance: number;
  };

  /**
   * Empathetic emotion specific data
   */
  empathetic?: {
    compassionLevel: number;
    connectionFactor: number;
    emotionalResonance: number;
  };

  /**
   * Curious emotion specific data
   */
  curious?: {
    wonderLevel: number;
    explorationDrive: number;
    knowledgeSeekingFactor: number;
  };

  /**
   * Proud emotion specific data
   */
  proud?: {
    achievementLevel: number;
    satisfactionFactor: number;
    socialStatusBonus: number;
  };

  /**
   * Confused emotion specific data
   */
  confused?: {
    uncertaintyLevel: number;
    clarityPenalty: number;
    processingOverload: number;
  };

  /**
   * Neutral emotion specific data
   */
  neutral?: {
    baseline: number;
    stabilityFactor: number;
  };
}

/**
 * Emotion calculation parameters
 */
export interface EmotionCalculation {
  /**
   * Base intensity before modifiers
   */
  baseIntensity: number;

  /**
   * All applied modifiers
   */
  modifiers: EmotionModifier[];

  /**
   * Final calculated intensity
   */
  finalIntensity: number;

  /**
   * Decay rate per minute
   */
  decayRate: number;

  /**
   * Growth rate when triggered
   */
  growthRate: number;

  /**
   * Inertia factor (resistance to change)
   */
  inertia: number;
}

/**
 * Event handler for emotion-related events
 */
export interface EmotionEventHandler {
  /**
   * Event type to handle
   */
  eventType: string;

  /**
   * Handler function
   */
  handler: (
    event: EmotionTriggerEvent
  ) => EmotionResult | Promise<EmotionResult>;

  /**
   * Priority for handler execution
   */
  priority?: number;

  /**
   * Whether this handler is enabled
   */
  enabled?: boolean;
}

/**
 * Configuration for emotion decay behavior
 */
export interface EmotionDecayConfig {
  /**
   * Base decay rate per minute
   */
  baseRate: number;

  /**
   * Minimum intensity (emotions don't decay below this)
   */
  minIntensity: number;

  /**
   * Whether decay is affected by personality
   */
  personalityAffected: boolean;

  /**
   * Custom decay function
   */
  customDecayFunction?: (currentIntensity: number, timeDelta: number) => number;
}

/**
 * Emotion module registration data
 */
export interface EmotionModuleRegistration {
  /**
   * Unique identifier for the emotion
   */
  id: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Description of the emotion
   */
  description: string;

  /**
   * Factory function to create the module
   */
  factory: () => any;

  /**
   * Dependencies on other emotions
   */
  dependencies?: string[];

  /**
   * Whether this emotion is enabled by default
   */
  defaultEnabled?: boolean;
}

/**
 * Type guard for emotion results
 */
export function isEmotionResult(value: unknown): value is EmotionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'state' in value &&
    'changed' in value &&
    typeof (value as any).changed === 'boolean'
  );
}

/**
 * Type guard for emotion trigger events
 */
export function isEmotionTriggerEvent(
  value: unknown
): value is EmotionTriggerEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'source' in value &&
    'intensity' in value &&
    typeof (value as any).type === 'string' &&
    typeof (value as any).source === 'string' &&
    typeof (value as any).intensity === 'number'
  );
}
