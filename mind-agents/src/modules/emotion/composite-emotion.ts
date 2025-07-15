import {
  EmotionState,
  EmotionRecord,
  EmotionModuleType,
} from '../../types/agent';
import {
  EmotionModule,
  PersonalityTraits,
  EmotionBlend,
  AdvancedEmotionConfig,
} from '../../types/emotion';
import {
  EmotionResult,
  EmotionBlendResult,
  EmotionTransition,
} from '../../types/modules/emotions';

// Import all emotion types
import { AngryEmotion } from './angry/index';
import { AnxiousEmotion } from './anxious/index';
import { BaseEmotion } from './base-emotion';
import { ConfidentEmotion } from './confident/index';
import { ConfusedEmotion } from './confused/index';
import { CuriousEmotion } from './curious/index';
import { EmpatheticEmotion } from './empathetic/index';
import { HappyEmotion } from './happy/index';
import { NeutralEmotion } from './neutral/index';
import { NostalgicEmotion } from './nostalgic/index';
import { ProudEmotion } from './proud/index';
import { SadEmotion } from './sad/index';

export class CompositeEmotionModule implements EmotionModule {
  private emotions: Map<string, BaseEmotion> = new Map();
  private _current: string = 'neutral';
  private _intensity: number = 0;
  private _history: EmotionRecord[] = [];
  // Config is stored and used throughout the module
  private config: AdvancedEmotionConfig;

  // Continuous emotion space tracking
  private _currentCoordinates = { valence: 0, arousal: 0, dominance: 0 };
  private _blendedState: EmotionBlend | null = null;
  private _personalityTraits?: PersonalityTraits;
  private _enableBlending: boolean = false;
  private _blendSmoothing: number = 0.3;
  private _contextSensitivity: number = 0.5;

  constructor(
    config: AdvancedEmotionConfig = {
      type: EmotionModuleType.COMPOSITE,
      sensitivity: 0.5,
      decayRate: 0.1,
      transitionSpeed: 0.3,
    }
  ) {
    this.config = config;

    // CompositeEmotion initialized with configuration
    if (config.personalityTraits !== undefined) {
      this._personalityTraits = config.personalityTraits;
    }
    this._enableBlending = config.enableBlending ?? false;
    this._blendSmoothing = config.blendSmoothing ?? 0.3;
    this._contextSensitivity = config.contextSensitivity ?? 0.5;

    // Initialize all emotion modules with default configs
    this.emotions.set('happy', new HappyEmotion({}));
    this.emotions.set('sad', new SadEmotion({}));
    this.emotions.set('angry', new AngryEmotion({}));
    this.emotions.set('anxious', new AnxiousEmotion({}));
    this.emotions.set('confident', new ConfidentEmotion({}));
    this.emotions.set('nostalgic', new NostalgicEmotion({}));
    this.emotions.set('empathetic', new EmpatheticEmotion({}));
    this.emotions.set('curious', new CuriousEmotion({}));
    this.emotions.set('proud', new ProudEmotion({}));
    this.emotions.set('confused', new ConfusedEmotion({}));
    this.emotions.set('neutral', new NeutralEmotion({}));
  }

  get current(): string {
    return this._current;
  }

  get intensity(): number {
    // Apply config sensitivity to intensity
    return this._intensity * (this.config.sensitivity ?? 1.0);
  }

  get triggers(): string[] {
    const currentEmotion = this.emotions.get(this._current);
    return currentEmotion ? currentEmotion.triggers : [];
  }

  get history(): EmotionRecord[] {
    return this._history;
  }

  processEvent(
    eventType: string,
    context?: Record<string, unknown>
  ): EmotionResult {
    // Processing emotional event

    // Process event through all emotions
    const emotionResponses: Array<{
      name: string;
      emotion: BaseEmotion;
      intensity: number;
    }> = [];

    for (const [name, emotion] of this.emotions) {
      const state = emotion.processEvent(eventType, context);
      if (state.intensity > 0.1) {
        // Only consider emotions with meaningful intensity
        emotionResponses.push({ name, emotion, intensity: state.intensity });
      }
    }

    if (this._enableBlending && emotionResponses.length > 1) {
      // Blend multiple emotions in continuous space
      this.blendEmotions(emotionResponses);
    } else {
      // Traditional dominant emotion approach
      if (emotionResponses.length > 0) {
        emotionResponses.sort((a, b) => b.intensity - a.intensity);
        const dominant = emotionResponses[0];

        // Transition to the dominant emotion
        if (
          dominant &&
          (dominant.name !== this._current ||
            Math.abs(dominant.intensity - this._intensity) > 0.1)
        ) {
          this.transitionToEmotion(dominant.name, dominant.intensity);
        }
      } else {
        // No strong emotions, gradually return to neutral
        if (this._current !== 'neutral') {
          this._intensity *= 0.9;
          if (this._intensity < 0.1) {
            this.transitionToEmotion('neutral', 0);
          }
        }
      }
    }

    const state = this.getCurrentState();
    const transitions: EmotionTransition[] = [];

    // Check if we had any transitions
    if (this._history.length > 0) {
      const lastEntry = this._history[this._history.length - 1];
      if (lastEntry.emotion !== this._current) {
        transitions.push({
          from: lastEntry.emotion,
          to: this._current,
          duration: 300, // Default transition duration
          easing: 'ease-in-out',
        });
      }
    }

    return {
      state,
      changed: transitions.length > 0 || emotionResponses.length > 0,
      previousEmotion: transitions.length > 0 ? transitions[0].from : undefined,
      transitions,
      blendResult: this._blendedState
        ? this.convertToBlendResult(this._blendedState)
        : undefined,
      metadata: {
        processingTime: 0,
        triggersProcessed: 1,
      },
    };
  }

  private transitionToEmotion(emotion: string, intensity: number): void {
    // Only transition if it's a significant change
    const isSignificantChange =
      emotion !== this._current || Math.abs(intensity - this._intensity) > 0.2;

    if (!isSignificantChange) return;

    // Record the transition
    this._history.push({
      emotion: this._current,
      intensity: this._intensity,
      timestamp: new Date(),
      duration:
        this._history.length > 0
          ? Date.now() -
            (this._history[this._history.length - 1]?.timestamp.getTime() ??
              Date.now())
          : 0,
      triggers: [`transition_to_${emotion}`],
    });

    this._current = emotion;
    this._intensity = intensity;

    // Only log significant emotion changes (not neutral or minor changes)
    if (emotion !== 'neutral' && intensity > 0.3) {
      // Emotion changed
    }
  }

  getCurrentState(): EmotionState {
    const currentEmotion = this.emotions.get(this._current);
    return {
      current: this._current,
      intensity: this._intensity,
      triggers: currentEmotion?.triggers || [],
      history: this._history.slice(-10),
      timestamp: new Date(),
    };
  }

  getCurrentEmotion(): string {
    return this._current;
  }

  setEmotion(
    emotion: string,
    intensity: number,
    triggers: string[] = []
  ): EmotionResult {
    if (this.emotions.has(emotion)) {
      this.transitionToEmotion(emotion, intensity);

      // Also set it in the specific emotion module
      const emotionModule = this.emotions.get(emotion);
      if (emotionModule) {
        emotionModule.setEmotion(emotion, intensity, triggers);
      }
    }

    const state = this.getCurrentState();
    return {
      state,
      changed: this.emotions.has(emotion),
      previousEmotion: this._current !== emotion ? this._current : undefined,
      metadata: {
        processingTime: 0,
        triggersProcessed: triggers.length,
      },
    };
  }

  getHistory(limit?: number): EmotionRecord[] {
    // Combine history from all emotions
    const allHistory: EmotionRecord[] = [];

    for (const emotion of this.emotions.values()) {
      allHistory.push(...emotion.getHistory());
    }

    // Sort by timestamp
    allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? allHistory.slice(0, limit) : allHistory;
  }

  reset(): EmotionResult {
    // Reset all emotions
    for (const emotion of this.emotions.values()) {
      emotion.reset();
    }

    this._current = 'neutral';
    this._intensity = 0;
    this._history = [];

    const state = this.getCurrentState();
    return {
      state,
      changed: true,
      metadata: {
        processingTime: 0,
        triggersProcessed: 0,
      },
    };
  }

  // Helper methods
  getEmotionModifier(): Record<string, number> {
    const currentEmotion = this.emotions.get(this._current);
    return (
      currentEmotion?.getEmotionModifier() || {
        creativity: 1.0,
        energy: 1.0,
        social: 1.0,
        focus: 1.0,
      }
    );
  }

  getEmotionColor(): string {
    const currentEmotion = this.emotions.get(this._current);
    return currentEmotion?.getEmotionColor() || '#9E9E9E';
  }

  getEmotionDescription(): string {
    const currentEmotion = this.emotions.get(this._current);
    return currentEmotion?.getEmotionDescription() || 'Feeling neutral';
  }

  // Get all emotion states for debugging/monitoring
  getAllEmotionStates(): Record<
    string,
    { intensity: number; state: EmotionState }
  > {
    const states: Record<string, { intensity: number; state: EmotionState }> =
      {};

    for (const [name, emotion] of this.emotions) {
      const state = emotion.getCurrentState();
      states[name] = {
        intensity: state.intensity,
        state,
      };
    }

    return states;
  }

  // Blend multiple emotions in continuous space
  private blendEmotions(
    emotionResponses: Array<{
      name: string;
      emotion: BaseEmotion;
      intensity: number;
    }>
  ): void {
    // Calculate weighted average coordinates
    let totalWeight = 0;
    const blendedCoords = { valence: 0, arousal: 0, dominance: 0 };
    const components: Array<{ emotion: string; weight: number }> = [];

    for (const response of emotionResponses) {
      const weight = response.intensity;
      const coords = response.emotion.getCoordinates();

      blendedCoords.valence += coords.valence * weight;
      blendedCoords.arousal += coords.arousal * weight;
      blendedCoords.dominance += coords.dominance * weight;

      totalWeight += weight;
      components.push({ emotion: response.name, weight });
    }

    // Normalize
    if (totalWeight > 0) {
      blendedCoords.valence /= totalWeight;
      blendedCoords.arousal /= totalWeight;
      blendedCoords.dominance /= totalWeight;
    }

    // Apply smoothing to avoid jittery transitions
    this._currentCoordinates.valence +=
      (blendedCoords.valence - this._currentCoordinates.valence) *
      this._blendSmoothing;
    this._currentCoordinates.arousal +=
      (blendedCoords.arousal - this._currentCoordinates.arousal) *
      this._blendSmoothing;
    this._currentCoordinates.dominance +=
      (blendedCoords.dominance - this._currentCoordinates.dominance) *
      this._blendSmoothing;

    // Store blended state
    this._blendedState = {
      coordinates: this._currentCoordinates,
      intensity: totalWeight / emotionResponses.length,
      components,
    };

    // Find closest named emotion for display
    const closestEmotion = this.findClosestNamedEmotion(
      this._currentCoordinates
    );
    this._current = closestEmotion.name;
    this._intensity = this._blendedState.intensity;

    // Log blended state
    if (components.length > 1) {
      // Multiple emotions blended - dominant emotion determined by closest match
      // Components: ${components.length} emotions blended
    }
  }

  // Find the closest named emotion to given coordinates
  private findClosestNamedEmotion(coords: {
    valence: number;
    arousal: number;
    dominance: number;
  }): { name: string; distance: number } {
    let closestEmotion = { name: 'neutral', distance: Infinity };

    for (const [name, emotion] of this.emotions) {
      const emotionCoords = emotion.getCoordinates();
      const distance = Math.sqrt(
        Math.pow(coords.valence - emotionCoords.valence, 2) +
          Math.pow(coords.arousal - emotionCoords.arousal, 2) +
          Math.pow(coords.dominance - emotionCoords.dominance, 2)
      );

      if (distance < closestEmotion.distance) {
        closestEmotion = { name, distance };
      }
    }

    return closestEmotion;
  }

  // Get current emotion coordinates
  getEmotionCoordinates(): {
    valence: number;
    arousal: number;
    dominance: number;
  } {
    return { ...this._currentCoordinates };
  }

  // Get blended state if available
  getBlendedState(): EmotionBlend | null {
    return this._blendedState;
  }

  // Set personality traits
  setPersonalityTraits(traits: PersonalityTraits): void {
    this._personalityTraits = traits;

    // Update all emotion modules
    for (const emotion of this.emotions.values()) {
      emotion.setPersonalityTraits(traits);
    }
  }

  // Enable/disable emotion blending
  setBlendingEnabled(enabled: boolean): void {
    this._enableBlending = enabled;
  }

  // Get emotional context for other systems
  getEmotionalContext(): Record<string, any> {
    const currentEmotion = this.emotions.get(this._current);
    return {
      primary: this._current,
      intensity: this._intensity,
      coordinates: this._currentCoordinates,
      blendedState: this._blendedState,
      modifiers: currentEmotion?.getEmotionModifier() || {},
      personalityTraits: this._personalityTraits,
      contextSensitivity: this._contextSensitivity,
    };
  }

  // Convert internal blend to public blend result
  private convertToBlendResult(blend: EmotionBlend): EmotionBlendResult {
    return {
      primary: this._current,
      secondary:
        blend.components.length > 1 ? blend.components[1].emotion : undefined,
      ratio: blend.components.length > 1 ? blend.components[0].weight : 1.0,
      coordinates: blend.coordinates,
      intensity: blend.intensity,
      components: blend.components.map((c) => ({
        emotion: c.emotion,
        weight: c.weight,
        contribution: c.weight * blend.intensity,
      })),
    };
  }
}
