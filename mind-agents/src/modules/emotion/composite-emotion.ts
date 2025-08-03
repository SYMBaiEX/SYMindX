import { runtimeLogger } from '@/utils';
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
import {
  standardLoggers,
  createStandardLoggingPatterns,
  StandardLogContext,
} from '../../utils/standard-logging.js';

// Import 5 core emotion types
import { AngryEmotion } from './angry/index.js';
import { BaseEmotion } from './base-emotion.js';
import { ConfidentEmotion } from './confident/index.js';
import { HappyEmotion } from './happy/index.js';
import { NeutralEmotion } from './neutral/index.js';
import { SadEmotion } from './sad/index.js';

export class CompositeEmotionModule implements EmotionModule {
  private emotions: Map<string, BaseEmotion>;
  private _current: string = 'neutral';
  private _intensity: number = 0;
  private _history: EmotionRecord[] = [];
  // Config is stored and used throughout the module
  private config: AdvancedEmotionConfig;

  // Standardized logging
  private logger = standardLoggers.emotion;
  private loggingPatterns = createStandardLoggingPatterns(this.logger);

  // Enhanced emotion system features
  private _currentCoordinates = { valence: 0, arousal: 0, dominance: 0 };
  private _blendedState: EmotionBlend | null = null;
  private _personalityTraits?: PersonalityTraits;
  private _enableBlending: boolean = true; // Enable by default
  private _blendSmoothing: number = 0.7; // Improved smoothing
  private _contextSensitivity: number = 0.5;
  private _lastUpdate: Date = new Date();
  
  // Enhanced decay management
  private _decayRate: number = 0.02;
  private _decayVariation: boolean = true;
  
  // Transition management
  private _transitionInProgress: boolean = false;
  private _transitionSpeed: number = 0.5;

  constructor(
    config: AdvancedEmotionConfig = {
      type: EmotionModuleType.COMPOSITE,
      sensitivity: 0.5,
      decayRate: 0.02,
      transitionSpeed: 0.5,
    }
  ) {
    this.config = {
      type: EmotionModuleType.COMPOSITE,
      sensitivity: 0.5,
      decayRate: 0.02,
      transitionSpeed: 0.5,
      enableBlending: true,
      blendSmoothing: 0.7,
      contextSensitivity: 0.5,
      ...config
    };

    // Initialize Map to avoid Bun class property initialization issues
    this.emotions = new Map();

    // Enhanced configuration
    this._personalityTraits = this.config.personalityTraits;
    this._enableBlending = this.config.enableBlending ?? true;
    this._blendSmoothing = this.config.blendSmoothing ?? 0.7;
    this._contextSensitivity = this.config.contextSensitivity ?? 0.5;
    this._decayRate = this.config.decayRate ?? 0.02;
    this._transitionSpeed = this.config.transitionSpeed ?? 0.5;

    // Initialize 5 core emotion modules with personality traits
    const emotionConfig = { personalityTraits: this._personalityTraits };
    this.emotions.set('happy', new HappyEmotion(emotionConfig));
    this.emotions.set('sad', new SadEmotion(emotionConfig));
    this.emotions.set('angry', new AngryEmotion(emotionConfig));
    this.emotions.set('confident', new ConfidentEmotion(emotionConfig));
    this.emotions.set('neutral', new NeutralEmotion(emotionConfig));
    
    runtimeLogger.info('🎭 Enhanced 5-Emotion System initialized with blending and decay management');
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
    const startTime = Date.now();
    
    // Apply enhanced decay to all emotions first
    this.applyEnhancedDecay();

    // Process event through all emotions
    const emotionResponses: Array<{
      name: string;
      emotion: BaseEmotion;
      intensity: number;
      triggered: boolean;
    }> = [];

    for (const [name, emotion] of Array.from(this.emotions.entries())) {
      const result = emotion.processEvent(eventType, context);
      emotionResponses.push({
        name,
        emotion,
        intensity: result.state.intensity,
        triggered: result.changed
      });
    }

    const previousEmotion = this._current;
    const previousIntensity = this._intensity;

    if (this._enableBlending) {
      // Enhanced blending with multiple active emotions
      const activeEmotions = emotionResponses.filter(r => r.intensity >= 0.2);
      if (activeEmotions.length > 1) {
        this.blendEmotions(activeEmotions);
      } else if (activeEmotions.length === 1) {
        const dominant = activeEmotions[0];
        this.transitionToEmotion(dominant.name, dominant.intensity);
        this._blendedState = null;
      } else {
        this.transitionToEmotion('neutral', 0);
        this._blendedState = null;
      }
    } else {
      // Traditional dominant emotion approach with enhanced transitions
      const significantEmotions = emotionResponses.filter(r => r.intensity > 0.1);
      if (significantEmotions.length > 0) {
        significantEmotions.sort((a, b) => b.intensity - a.intensity);
        const dominant = significantEmotions[0];
        
        if (dominant && this.shouldTransition(dominant.name, dominant.intensity)) {
          this.transitionToEmotion(dominant.name, dominant.intensity);
        }
      } else {
        // Enhanced neutral transition
        this.transitionToNeutral();
      }
    }

    // Enhanced transition tracking
    const transitions = this.trackTransitions(previousEmotion, previousIntensity);
    
    // Record significant changes in history
    if (this.isSignificantChange(previousEmotion, previousIntensity)) {
      this.recordEmotionHistory(eventType, context);
    }

    const state = this.getCurrentState();
    const processingTime = Date.now() - startTime;

    return {
      state,
      changed: this.isSignificantChange(previousEmotion, previousIntensity),
      previousEmotion: previousEmotion !== this._current ? previousEmotion : undefined,
      transitions,
      modifiers: this.getEnhancedModifiers(),
      blendResult: this._blendedState ? this.convertToBlendResult(this._blendedState) : undefined,
      metadata: {
        processingTime,
        triggersProcessed: 1,
        emotionsActivated: emotionResponses.filter(r => r.triggered).length,
        blendingEnabled: this._enableBlending,
        decayApplied: true
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
      transitions: undefined,
      modifiers: undefined,
      blendResult: undefined,
      metadata: {
        processingTime: 0,
        triggersProcessed: triggers.length,
      },
    };
  }

  getHistory(limit?: number): EmotionRecord[] {
    // Combine history from all emotions
    const allHistory: EmotionRecord[] = [];

    for (const emotion of Array.from(this.emotions.values())) {
      allHistory.push(...emotion.getHistory());
    }

    // Sort by timestamp
    allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? allHistory.slice(0, limit) : allHistory;
  }

  reset(): EmotionResult {
    // Reset all emotions
    for (const emotion of Array.from(this.emotions.values())) {
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

    for (const [name, emotion] of Array.from(this.emotions.entries())) {
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

    for (const [name, emotion] of Array.from(this.emotions.entries())) {
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
    for (const emotion of Array.from(this.emotions.values())) {
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

  // Influence response generation based on current emotional state
  influenceResponse(response: string, context?: Record<string, any>): string {
    const currentEmotion = this.emotions.get(this._current);
    if (!currentEmotion || this._intensity < 0.1) {
      return response; // No significant emotional influence
    }

    // Apply emotion-specific response modifications
    switch (this._current) {
      case 'happy':
        return this.applyHappyInfluence(response, this._intensity);
      case 'sad':
        return this.applySadInfluence(response, this._intensity);
      case 'angry':
        return this.applyAngryInfluence(response, this._intensity);
      case 'confident':
        return this.applyConfidentInfluence(response, this._intensity);
      case 'neutral':
      default:
        return response;
    }
  }

  private applyHappyInfluence(response: string, intensity: number): string {
    if (intensity > 0.7) {
      // High happiness - add enthusiasm and positivity
      return response + ' 😊';
    } else if (intensity > 0.4) {
      // Moderate happiness - add positive tone
      return response.replace(/\.$/, '!');
    }
    return response;
  }

  private applySadInfluence(response: string, intensity: number): string {
    if (intensity > 0.7) {
      // High sadness - more subdued, empathetic tone
      return response.replace(/!+/g, '.').toLowerCase();
    } else if (intensity > 0.4) {
      // Moderate sadness - slightly more reserved
      return response.replace(/!+/g, '.');
    }
    return response;
  }

  private applyAngryInfluence(response: string, intensity: number): string {
    if (intensity > 0.7) {
      // High anger - more direct and assertive
      return response.toUpperCase();
    } else if (intensity > 0.4) {
      // Moderate anger - firm but controlled
      return response.replace(/\./g, '!');
    }
    return response;
  }

  private applyConfidentInfluence(response: string, intensity: number): string {
    if (intensity > 0.7) {
      // High confidence - assertive and decisive
      return response.replace(/maybe|perhaps|might/gi, 'will');
    } else if (intensity > 0.4) {
      // Moderate confidence - more certain tone
      return response.replace(/I think/gi, 'I believe');
    }
    return response;
  }

  // Influence decision-making based on emotional state
  influenceDecision(options: any[], context?: Record<string, any>): any[] {
    if (this._intensity < 0.1) {
      return options; // No significant emotional influence
    }

    const modifiers = this.getEmotionModifier();
    
    return options.map(option => ({
      ...option,
      emotionalWeight: this.calculateEmotionalWeight(option, modifiers),
      emotionalContext: {
        emotion: this._current,
        intensity: this._intensity,
        modifiers
      }
    })).sort((a, b) => (b.emotionalWeight || 0) - (a.emotionalWeight || 0));
  }

  private calculateEmotionalWeight(option: any, modifiers: Record<string, number>): number {
    let weight = 1.0;

    // Apply emotion-specific decision biases
    switch (this._current) {
      case 'happy':
        // Happy emotions favor social and creative options
        if (option.type === 'social' || option.type === 'creative') {
          weight *= 1.3;
        }
        break;
      case 'sad':
        // Sad emotions favor introspective or supportive options
        if (option.type === 'introspective' || option.type === 'supportive') {
          weight *= 1.2;
        }
        break;
      case 'angry':
        // Angry emotions favor direct action options
        if (option.type === 'action' || option.type === 'direct') {
          weight *= 1.4;
        }
        break;
      case 'confident':
        // Confident emotions favor challenging or leadership options
        if (option.type === 'challenge' || option.type === 'leadership') {
          weight *= 1.3;
        }
        break;
    }

    // Apply intensity scaling
    weight = 1.0 + (weight - 1.0) * this._intensity;

    return weight;
  }

  // Enhanced decay management
  private applyEnhancedDecay(): void {
    const timeSinceUpdate = (Date.now() - this._lastUpdate.getTime()) / 60000; // minutes
    
    for (const [name, emotion] of this.emotions) {
      let decayRate = this._decayRate;
      
      if (this._decayVariation) {
        // Different emotions decay at different rates
        const decayRates = {
          'happy': 0.8,    // Happy fades relatively quickly
          'sad': 1.2,      // Sad lingers longer
          'angry': 1.1,    // Angry fades moderately
          'confident': 0.9, // Confident fades slowly
          'neutral': 0.5   // Neutral is stable
        };
        decayRate *= decayRates[name as keyof typeof decayRates] || 1.0;
      }
      
      // Apply personality-based decay modulation
      if (this._personalityTraits) {
        decayRate *= this.getPersonalityDecayModifier(name);
      }
      
      const currentIntensity = emotion.intensity;
      const newIntensity = Math.max(0, currentIntensity - (decayRate * timeSinceUpdate));
      emotion.setIntensity(newIntensity);
    }
    
    this._lastUpdate = new Date();
  }

  private getPersonalityDecayModifier(emotionName: string): number {
    if (!this._personalityTraits) return 1.0;
    
    const traits = this._personalityTraits;
    let modifier = 1.0;
    
    // High neuroticism makes emotions linger longer
    if (traits.neuroticism > 0.5) {
      modifier *= 1 - (traits.neuroticism - 0.5) * 0.5;
    }
    
    // Emotion-specific personality influences
    switch (emotionName) {
      case 'happy':
        if (traits.extraversion > 0.5) modifier *= 0.8;
        break;
      case 'sad':
        if (traits.neuroticism > 0.5) modifier *= 0.7;
        break;
      case 'angry':
        if (traits.agreeableness < 0.5) modifier *= 0.8;
        break;
      case 'confident':
        if (traits.conscientiousness > 0.5) modifier *= 0.9;
        break;
    }
    
    return modifier;
  }

  private shouldTransition(emotionName: string, intensity: number): boolean {
    return emotionName !== this._current || Math.abs(intensity - this._intensity) > 0.1;
  }

  private transitionToNeutral(): void {
    if (this._current !== 'neutral') {
      this._intensity *= 0.9;
      if (this._intensity < 0.1) {
        this.transitionToEmotion('neutral', 0);
      }
    }
  }

  private trackTransitions(previousEmotion: string, previousIntensity: number): EmotionTransition[] {
    const transitions: EmotionTransition[] = [];
    
    if (previousEmotion !== this._current) {
      const duration = this.calculateTransitionDuration(previousEmotion, this._current);
      
      transitions.push({
        from: previousEmotion,
        to: this._current,
        duration,
        easing: 'ease-in-out',
        intensity: {
          from: previousIntensity,
          to: this._intensity
        }
      });
      
      this._transitionInProgress = true;
      setTimeout(() => {
        this._transitionInProgress = false;
      }, duration);
    }
    
    return transitions;
  }

  private calculateTransitionDuration(fromEmotion: string, toEmotion: string): number {
    const baseTransitionTime = 300; // ms
    const speedFactor = this._transitionSpeed;
    
    // Calculate emotional distance
    const fromEmotionObj = this.emotions.get(fromEmotion);
    const toEmotionObj = this.emotions.get(toEmotion);
    
    if (!fromEmotionObj || !toEmotionObj) {
      return baseTransitionTime * (1 / speedFactor);
    }
    
    const distance = fromEmotionObj.distanceTo(toEmotionObj);
    const distanceFactor = Math.min(2.0, 1 + distance);
    
    return Math.round(baseTransitionTime * distanceFactor * (1 / speedFactor));
  }

  private isSignificantChange(previousEmotion: string, previousIntensity: number): boolean {
    return previousEmotion !== this._current || Math.abs(previousIntensity - this._intensity) >= 0.1;
  }

  private recordEmotionHistory(trigger: string, context?: Record<string, unknown>): void {
    this._history.push({
      emotion: this._current,
      intensity: this._intensity,
      timestamp: new Date(),
      duration: this._history.length > 0 ? 
        Date.now() - this._history[this._history.length - 1].timestamp.getTime() : 0,
      triggers: [trigger],
      context: context ? { type: context.type, source: context.source } : undefined
    });
    
    // Keep history manageable
    if (this._history.length > 100) {
      this._history = this._history.slice(-50);
    }
  }

  private getEnhancedModifiers() {
    const currentEmotion = this.emotions.get(this._current);
    if (!currentEmotion) return [];
    
    const baseModifiers = currentEmotion.getEmotionModifier();
    
    return Object.entries(baseModifiers).map(([key, value]) => ({
      type: 'emotion' as const,
      factor: value * this._intensity,
      duration: -1,
      reason: `${this._current}_emotion`,
      metadata: {
        emotion: this._current,
        intensity: this._intensity,
        modifier: key,
        blended: this._blendedState !== null
      }
    }));
  }

  // Convert internal blend to public blend result
  private convertToBlendResult(blend: EmotionBlend): EmotionBlendResult {
    return {
      primary: this._current,
      secondary:
        blend.components.length > 1 ? blend.components[1]?.emotion : undefined,
      ratio:
        blend.components.length > 1
          ? (blend.components[0]?.weight ?? 1.0)
          : 1.0,
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

// Export factory function for registry
export function createCompositeEmotionModule(
  config?: any
): CompositeEmotionModule {
  return new CompositeEmotionModule(config);
}
