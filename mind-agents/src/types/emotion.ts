/**
 * Emotion module types for SYMindX
 */

import { EmotionState, EmotionRecord, EmotionConfig } from './agent';
import { Context, BaseConfig } from './common';
import { EmotionResult } from './modules/emotions';

// Re-export for convenience
export type { EmotionState, EmotionRecord, EmotionConfig };

/**
 * Base interface for all emotion modules
 */
export interface EmotionModule {
  /**
   * Current emotion string
   */
  current: string;

  /**
   * Current emotion intensity (0.0 to 1.0)
   */
  intensity: number;

  /**
   * Recent triggers that caused emotion changes
   */
  triggers?: string[];

  /**
   * History of emotion changes
   */
  history?: EmotionRecord[];

  /**
   * Process an event and update the emotion state
   * @param eventType The type of event that occurred
   * @param context Additional context about the event
   * @returns The emotion processing result
   */
  processEvent(eventType: string, context?: Context): EmotionResult;

  /**
   * Get the current emotion state
   * @returns The current emotion state
   */
  getCurrentState(): EmotionState;

  /**
   * Get the current emotion
   * @returns The current emotion string
   */
  getCurrentEmotion(): string;

  /**
   * Update the emotion state directly
   * @param emotion The emotion to set
   * @param intensity The intensity of the emotion (0.0 to 1.0)
   * @param triggers What triggered this emotion
   * @returns The emotion processing result
   */
  setEmotion(
    emotion: string,
    intensity: number,
    triggers?: string[]
  ): EmotionResult;

  /**
   * Get the emotion history
   * @param limit Maximum number of records to return
   * @returns Array of emotion records
   */
  getHistory(limit?: number): EmotionRecord[];

  /**
   * Reset the emotion state to neutral
   * @returns The emotion processing result
   */
  reset(): EmotionResult;
}

/**
 * Base class for emotion definitions
 */
export interface EmotionDefinition {
  /**
   * The intensity of the emotion (0.0 to 1.0)
   */
  intensity: number;

  /**
   * Events that can trigger this emotion
   */
  triggers: string[];

  /**
   * Color representation of the emotion (for UI)
   */
  color: string;

  /**
   * Optional description of the emotion
   */
  description?: string;
}

/**
 * Metadata for emotion module registration
 */
export interface EmotionModuleMetadata {
  /**
   * Unique identifier for the emotion module
   */
  id: string;

  /**
   * Display name of the emotion module
   */
  name: string;

  /**
   * Description of the emotion module
   */
  description: string;

  /**
   * Version of the emotion module
   */
  version: string;

  /**
   * Author of the emotion module
   */
  author: string;
}

/**
 * Factory function type for creating emotion modules
 */
export type EmotionModuleFactory = (
  config?: BaseConfig
) => EmotionModule | Promise<EmotionModule>;

/**
 * Personality traits based on Big Five model
 */
export interface PersonalityTraits {
  /**
   * Openness to experience (0.0 to 1.0)
   * High = imaginative, creative, open to new ideas
   * Low = conventional, practical, resistant to change
   */
  openness: number;

  /**
   * Conscientiousness (0.0 to 1.0)
   * High = organized, reliable, disciplined
   * Low = careless, disorganized, spontaneous
   */
  conscientiousness: number;

  /**
   * Extraversion (0.0 to 1.0)
   * High = outgoing, energetic, talkative
   * Low = introverted, reserved, quiet
   */
  extraversion: number;

  /**
   * Agreeableness (0.0 to 1.0)
   * High = friendly, compassionate, cooperative
   * Low = challenging, detached, analytical
   */
  agreeableness: number;

  /**
   * Neuroticism (0.0 to 1.0)
   * High = sensitive, nervous, prone to negative emotions
   * Low = secure, confident, emotionally stable
   */
  neuroticism: number;

  /**
   * Custom traits specific to the agent
   */
  custom?: Record<string, number>;
}

/**
 * Emotion blend result
 */
export interface EmotionBlend {
  /**
   * Resulting coordinates in continuous emotion space
   */
  coordinates: {
    valence: number;
    arousal: number;
    dominance: number;
  };

  /**
   * Overall intensity of the blended emotion
   */
  intensity: number;

  /**
   * Component emotions and their weights
   */
  components: Array<{
    emotion: string;
    weight: number;
  }>;
}

/**
 * Advanced emotion configuration
 */
export interface AdvancedEmotionConfig extends EmotionConfig {
  /**
   * Personality traits for the agent
   */
  personalityTraits?: PersonalityTraits;

  /**
   * Emotional inertia (resistance to change)
   */
  emotionalInertia?: number;

  /**
   * Enable emotion blending
   */
  enableBlending?: boolean;

  /**
   * Blend smoothing factor
   */
  blendSmoothing?: number;

  /**
   * Context sensitivity
   */
  contextSensitivity?: number;

  /**
   * Emotion contagion factor (for multi-agent)
   */
  contagionFactor?: number;
}
