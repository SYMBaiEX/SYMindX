/**
 * Haptic Feedback Module
 *
 * Implements haptic feedback patterns for emotional and interactive responses
 */

import { runtimeLogger } from '../../../utils/logger.js';
import {
  HapticFeedbackConfig,
  HapticFeedbackRequest,
  HapticPattern,
  HapticWaveform,
  HapticIntensity,
  EmotionHapticPattern,
  EmotionType,
  EmotionState,
  OperationResult,
} from '../../../types/index.js';

/**
 * Haptic feedback module implementation
 */
export class HapticFeedbackModule {
  private config: HapticFeedbackConfig;
  private patterns: Map<HapticPattern, HapticWaveform>;
  private emotionPatterns: Map<EmotionType, EmotionHapticPattern>;
  private activePatterns: Set<string> = new Set();
  private userPreferences: Map<string, any> = new Map();

  constructor(config: HapticFeedbackConfig) {
    this.config = config;
    this.patterns = new Map();
    this.emotionPatterns = new Map();

    // Initialize default patterns
    this.setupDefaultPatterns();

    // Setup emotion patterns
    this.setupEmotionPatterns();
  }

  async initialize(): Promise<void> {
    try {
      // Check device capabilities
      await this.checkDeviceCapabilities();

      // Load user preferences if learning is enabled
      if (this.config.learnUserPreferences) {
        await this.loadUserPreferences();
      }

      runtimeLogger.info('Haptic feedback module initialized', {
        enabled: this.config.enabled,
        defaultIntensity: this.config.defaultIntensity,
        deviceCapabilities: this.config.deviceCapabilities,
      });
    } catch (error) {
      runtimeLogger.error('Failed to initialize haptic feedback', { error });
      throw error;
    }
  }

  async processPattern(
    request: HapticFeedbackRequest
  ): Promise<OperationResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Haptic feedback is disabled',
      };
    }

    const startTime = Date.now();

    try {
      // Get or create waveform
      let waveform: HapticWaveform;

      if (typeof request.pattern === 'string') {
        waveform = this.getPatternWaveform(request.pattern, request);
      } else {
        waveform = request.pattern;
      }

      // Apply emotion modulation if provided
      if (request.emotionState) {
        waveform = this.applyEmotionModulation(waveform, request.emotionState);
      }

      // Apply user preferences
      if (this.config.learnUserPreferences) {
        waveform = this.applyUserPreferences(waveform, request);
      }

      // Execute haptic feedback
      await this.executeHaptic(waveform, request);

      // Track pattern for learning
      if (this.config.learnUserPreferences) {
        this.trackPatternUsage(request, waveform);
      }

      return {
        success: true,
        message: 'Haptic pattern executed successfully',
        metadata: {
          duration: Date.now() - startTime,
          pattern:
            typeof request.pattern === 'string' ? request.pattern : 'custom',
          intensity: request.intensity || waveform.intensityCurve[0],
        },
      };
    } catch (error) {
      runtimeLogger.error('Failed to process haptic pattern', {
        error,
        request,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async generateEmotionPattern(
    emotion: EmotionType,
    intensity: number = 1.0
  ): Promise<HapticWaveform> {
    const emotionPattern = this.emotionPatterns.get(emotion);

    if (!emotionPattern) {
      // Default to neutral pattern
      return (
        this.patterns.get(HapticPattern.TAP) || this.createDefaultWaveform()
      );
    }

    // Get base pattern
    const basePattern =
      this.patterns.get(emotionPattern.pattern) || this.createDefaultWaveform();

    // Apply emotion-specific modifications
    const modifiedPattern: HapticWaveform = {
      ...basePattern,
      intensityCurve: basePattern.intensityCurve.map((i) =>
        Math.min(1.0, i * emotionPattern.intensityModifier * intensity)
      ),
    };

    // Add variations if available
    if (emotionPattern.variations && emotionPattern.variations.length > 0) {
      const variation =
        emotionPattern.variations[
          Math.floor(Math.random() * emotionPattern.variations.length)
        ];
      return this.blendWaveforms(modifiedPattern, variation, 0.5);
    }

    return modifiedPattern;
  }

  async stopAll(): Promise<void> {
    // Stop all active patterns
    for (const patternId of this.activePatterns) {
      await this.stopPattern(patternId);
    }
    this.activePatterns.clear();
  }

  async updateConfig(config: Partial<HapticFeedbackConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Re-setup patterns if emotion patterns changed
    if (config.emotionPatterns) {
      this.setupEmotionPatterns();
    }

    // Update device capabilities if provided
    if (config.deviceCapabilities) {
      await this.checkDeviceCapabilities();
    }
  }

  async cleanup(): Promise<void> {
    await this.stopAll();

    // Save user preferences if learning is enabled
    if (this.config.learnUserPreferences) {
      await this.saveUserPreferences();
    }

    this.patterns.clear();
    this.emotionPatterns.clear();
    this.userPreferences.clear();
  }

  // Private helper methods

  private setupDefaultPatterns(): void {
    // Single tap
    this.patterns.set(HapticPattern.TAP, {
      duration: 50,
      intensityCurve: [1.0],
      frequency: 200,
    });

    // Double tap
    this.patterns.set(HapticPattern.DOUBLE_TAP, {
      duration: 150,
      intensityCurve: [1.0, 0, 1.0],
      frequency: 200,
    });

    // Long press
    this.patterns.set(HapticPattern.LONG_PRESS, {
      duration: 500,
      intensityCurve: [0.8],
      frequency: 150,
    });

    // Continuous vibration
    this.patterns.set(HapticPattern.CONTINUOUS, {
      duration: 1000,
      intensityCurve: [0.7],
      frequency: 175,
    });

    // Pulse
    this.patterns.set(HapticPattern.PULSE, {
      duration: 800,
      intensityCurve: [0, 0.5, 1.0, 0.5, 0, 0.5, 1.0, 0.5, 0],
      frequency: 200,
      attack: 50,
      decay: 50,
    });

    // Ramp up
    this.patterns.set(HapticPattern.RAMP_UP, {
      duration: 500,
      intensityCurve: this.createRamp(0, 1.0, 10),
      frequency: 180,
    });

    // Ramp down
    this.patterns.set(HapticPattern.RAMP_DOWN, {
      duration: 500,
      intensityCurve: this.createRamp(1.0, 0, 10),
      frequency: 180,
    });
  }

  private setupEmotionPatterns(): void {
    // Use config patterns or defaults
    const patterns =
      this.config.emotionPatterns || this.createDefaultEmotionPatterns();

    for (const [emotion, pattern] of Object.entries(patterns)) {
      this.emotionPatterns.set(emotion as EmotionType, pattern);
    }
  }

  private createDefaultEmotionPatterns(): Record<
    EmotionType,
    EmotionHapticPattern
  > {
    return {
      happy: {
        emotion: 'happy' as EmotionType,
        pattern: HapticPattern.PULSE,
        intensityModifier: 1.2,
        variations: [
          {
            duration: 600,
            intensityCurve: [0.3, 0.6, 0.9, 0.6, 0.3],
            frequency: 250,
          },
        ],
        triggers: ['success', 'achievement', 'joy'],
      },
      sad: {
        emotion: 'sad' as EmotionType,
        pattern: HapticPattern.RAMP_DOWN,
        intensityModifier: 0.7,
        variations: [
          {
            duration: 800,
            intensityCurve: [0.8, 0.6, 0.4, 0.2, 0.1],
            frequency: 120,
          },
        ],
        triggers: ['loss', 'disappointment'],
      },
      angry: {
        emotion: 'angry' as EmotionType,
        pattern: HapticPattern.DOUBLE_TAP,
        intensityModifier: 1.5,
        variations: [
          {
            duration: 200,
            intensityCurve: [1.0, 0.2, 1.0, 0.2, 1.0],
            frequency: 300,
          },
        ],
        triggers: ['frustration', 'conflict'],
      },
      anxious: {
        emotion: 'anxious' as EmotionType,
        pattern: HapticPattern.PULSE,
        intensityModifier: 0.9,
        variations: [
          {
            duration: 400,
            intensityCurve: [0.3, 0.5, 0.3, 0.5, 0.3],
            frequency: 220,
            tremor: 0.2,
          },
        ],
        triggers: ['uncertainty', 'worry'],
      },
      confident: {
        emotion: 'confident' as EmotionType,
        pattern: HapticPattern.TAP,
        intensityModifier: 1.3,
        variations: [
          {
            duration: 100,
            intensityCurve: [1.0],
            frequency: 200,
            attack: 10,
            sustain: 0.9,
            release: 10,
          },
        ],
        triggers: ['success', 'achievement'],
      },
      curious: {
        emotion: 'curious' as EmotionType,
        pattern: HapticPattern.PULSE,
        intensityModifier: 0.8,
        variations: [
          {
            duration: 300,
            intensityCurve: [0.2, 0.4, 0.6, 0.4, 0.2],
            frequency: 180,
          },
        ],
        triggers: ['discovery', 'question'],
      },
      neutral: {
        emotion: 'neutral' as EmotionType,
        pattern: HapticPattern.TAP,
        intensityModifier: 1.0,
        triggers: ['default'],
      },
      nostalgic: {
        emotion: 'nostalgic' as EmotionType,
        pattern: HapticPattern.CONTINUOUS,
        intensityModifier: 0.6,
        variations: [
          {
            duration: 1000,
            intensityCurve: [0.5, 0.4, 0.5, 0.4],
            frequency: 100,
          },
        ],
        triggers: ['memory', 'past'],
      },
      empathetic: {
        emotion: 'empathetic' as EmotionType,
        pattern: HapticPattern.LONG_PRESS,
        intensityModifier: 0.8,
        variations: [
          {
            duration: 700,
            intensityCurve: [0.3, 0.5, 0.6, 0.5, 0.3],
            frequency: 150,
          },
        ],
        triggers: ['understanding', 'connection'],
      },
      proud: {
        emotion: 'proud' as EmotionType,
        pattern: HapticPattern.RAMP_UP,
        intensityModifier: 1.1,
        variations: [
          {
            duration: 600,
            intensityCurve: this.createRamp(0.3, 1.0, 8),
            frequency: 200,
          },
        ],
        triggers: ['achievement', 'success'],
      },
      confused: {
        emotion: 'confused' as EmotionType,
        pattern: HapticPattern.PULSE,
        intensityModifier: 0.7,
        variations: [
          {
            duration: 500,
            intensityCurve: [0.3, 0.5, 0.2, 0.6, 0.3],
            frequency: 160,
          },
        ],
        triggers: ['uncertainty', 'question'],
      },
    };
  }

  private async checkDeviceCapabilities(): Promise<void> {
    // Check browser/device support
    const hasVibration = 'vibrate' in navigator;
    const hasForceTouch = 'force' in TouchEvent.prototype;

    // Update config with detected capabilities
    this.config.deviceCapabilities = {
      ...this.config.deviceCapabilities,
      supportsVibration: hasVibration,
      supportsForceTouch: hasForceTouch,
      supportsUltrasound: false, // Would need specific hardware
      maxFrequency: 1000,
      maxIntensity: 1.0,
    };

    // Check for WebHaptics API (future standard)
    if ('haptics' in navigator) {
      // Future API support
      runtimeLogger.info('WebHaptics API detected');
    }
  }

  private getPatternWaveform(
    pattern: HapticPattern,
    request: HapticFeedbackRequest
  ): HapticWaveform {
    let waveform = this.patterns.get(pattern) || this.createDefaultWaveform();

    // Apply request overrides
    if (request.duration) {
      waveform = { ...waveform, duration: request.duration };
    }

    if (request.intensity) {
      waveform = {
        ...waveform,
        intensityCurve: waveform.intensityCurve.map(
          (i) => i * request.intensity!
        ),
      };
    }

    return waveform;
  }

  private applyEmotionModulation(
    waveform: HapticWaveform,
    emotionState: EmotionState
  ): HapticWaveform {
    // Find dominant emotion
    const emotions = Object.entries(emotionState.emotions);
    const dominant = emotions.reduce((max, [emotion, intensity]) =>
      intensity > max[1] ? [emotion, intensity] : max
    );

    const emotionType = dominant[0] as EmotionType;
    const intensity = dominant[1] as number;

    const emotionPattern = this.emotionPatterns.get(emotionType);
    if (!emotionPattern) return waveform;

    // Blend with emotion pattern
    const emotionWaveform =
      this.patterns.get(emotionPattern.pattern) || waveform;
    return this.blendWaveforms(waveform, emotionWaveform, intensity * 0.5);
  }

  private applyUserPreferences(
    waveform: HapticWaveform,
    request: HapticFeedbackRequest
  ): HapticWaveform {
    // Apply learned user preferences
    const prefs = this.userPreferences.get('global') || {};

    if (prefs.preferredIntensity) {
      waveform = {
        ...waveform,
        intensityCurve: waveform.intensityCurve.map(
          (i) => i * prefs.preferredIntensity
        ),
      };
    }

    if (prefs.preferredDuration) {
      waveform = {
        ...waveform,
        duration: waveform.duration * prefs.preferredDuration,
      };
    }

    return waveform;
  }

  private async executeHaptic(
    waveform: HapticWaveform,
    request: HapticFeedbackRequest
  ): Promise<void> {
    const patternId = `pattern-${Date.now()}-${Math.random()}`;
    this.activePatterns.add(patternId);

    try {
      // Use appropriate API based on capabilities
      if (
        this.config.deviceCapabilities?.supportsVibration &&
        navigator.vibrate
      ) {
        await this.executeVibrationAPI(waveform, patternId);
      } else if (request.targetDevice === 'gamepad') {
        await this.executeGamepadHaptic(waveform, patternId);
      } else if (request.spatial) {
        await this.executeSpatialHaptic(waveform, request.spatial, patternId);
      } else {
        // Fallback: log pattern for debugging
        runtimeLogger.debug('Haptic pattern (no device support)', { waveform });
      }
    } finally {
      this.activePatterns.delete(patternId);
    }
  }

  private async executeVibrationAPI(
    waveform: HapticWaveform,
    patternId: string
  ): Promise<void> {
    // Convert waveform to vibration pattern
    const pattern: number[] = [];
    const stepDuration = waveform.duration / waveform.intensityCurve.length;

    for (let i = 0; i < waveform.intensityCurve.length; i++) {
      const intensity = waveform.intensityCurve[i];
      if (intensity > 0) {
        pattern.push(Math.round(stepDuration * intensity));
        if (i < waveform.intensityCurve.length - 1) {
          pattern.push(Math.round(stepDuration * (1 - intensity)));
        }
      } else {
        pattern.push(0);
        pattern.push(Math.round(stepDuration));
      }
    }

    // Execute vibration
    navigator.vibrate(pattern);
  }

  private async executeGamepadHaptic(
    waveform: HapticWaveform,
    patternId: string
  ): Promise<void> {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad

    if (gamepad && gamepad.vibrationActuator) {
      await gamepad.vibrationActuator.playEffect('dual-rumble', {
        duration: waveform.duration,
        strongMagnitude: waveform.intensityCurve[0],
        weakMagnitude: waveform.intensityCurve[0] * 0.5,
      });
    }
  }

  private async executeSpatialHaptic(
    waveform: HapticWaveform,
    spatial: {
      position: { x: number; y: number; z: number };
      direction?: { x: number; y: number; z: number };
    },
    patternId: string
  ): Promise<void> {
    // This would integrate with VR/AR controllers
    // For now, log the spatial information
    runtimeLogger.debug('Spatial haptic pattern', { waveform, spatial });
  }

  private async stopPattern(patternId: string): Promise<void> {
    // Stop vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }

    // Additional cleanup for other APIs
  }

  private trackPatternUsage(
    request: HapticFeedbackRequest,
    waveform: HapticWaveform
  ): void {
    // Track pattern usage for learning
    const usage = {
      pattern: typeof request.pattern === 'string' ? request.pattern : 'custom',
      intensity:
        waveform.intensityCurve.reduce((a, b) => a + b) /
        waveform.intensityCurve.length,
      duration: waveform.duration,
      timestamp: Date.now(),
    };

    // Store usage data (simplified for example)
    const history = this.userPreferences.get('usage_history') || [];
    history.push(usage);
    if (history.length > 100) {
      history.shift(); // Keep only recent history
    }
    this.userPreferences.set('usage_history', history);
  }

  private blendWaveforms(
    waveform1: HapticWaveform,
    waveform2: HapticWaveform,
    blend: number
  ): HapticWaveform {
    // Ensure both waveforms have the same number of points
    const maxLength = Math.max(
      waveform1.intensityCurve.length,
      waveform2.intensityCurve.length
    );
    const curve1 = this.resampleCurve(waveform1.intensityCurve, maxLength);
    const curve2 = this.resampleCurve(waveform2.intensityCurve, maxLength);

    // Blend curves
    const blendedCurve = curve1.map((v1, i) => {
      const v2 = curve2[i];
      return v1 * (1 - blend) + v2 * blend;
    });

    return {
      duration: waveform1.duration * (1 - blend) + waveform2.duration * blend,
      intensityCurve: blendedCurve,
      frequency: waveform1.frequency
        ? waveform1.frequency * (1 - blend) +
          (waveform2.frequency || 200) * blend
        : waveform2.frequency,
    };
  }

  private resampleCurve(curve: number[], targetLength: number): number[] {
    if (curve.length === targetLength) return curve;

    const resampled: number[] = [];
    const ratio = (curve.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = i * ratio;
      const lowerIndex = Math.floor(sourceIndex);
      const upperIndex = Math.ceil(sourceIndex);
      const fraction = sourceIndex - lowerIndex;

      if (upperIndex >= curve.length) {
        resampled.push(curve[curve.length - 1]);
      } else {
        const interpolated =
          curve[lowerIndex] * (1 - fraction) + curve[upperIndex] * fraction;
        resampled.push(interpolated);
      }
    }

    return resampled;
  }

  private createRamp(start: number, end: number, steps: number): number[] {
    const ramp: number[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      ramp.push(start + (end - start) * t);
    }
    return ramp;
  }

  private createDefaultWaveform(): HapticWaveform {
    return {
      duration: 100,
      intensityCurve: [0.5],
      frequency: 200,
    };
  }

  private async loadUserPreferences(): Promise<void> {
    // In a real implementation, load from storage
    // For now, use defaults
    this.userPreferences.set('global', {
      preferredIntensity: 1.0,
      preferredDuration: 1.0,
    });
  }

  private async saveUserPreferences(): Promise<void> {
    // In a real implementation, save to storage
    const history = this.userPreferences.get('usage_history') || [];
    if (history.length > 0) {
      // Calculate average preferences
      const avgIntensity =
        history.reduce((sum: number, h: any) => sum + h.intensity, 0) /
        history.length;
      const avgDuration =
        history.reduce((sum: number, h: any) => sum + h.duration, 0) /
        history.length;

      runtimeLogger.info('User haptic preferences learned', {
        avgIntensity,
        avgDuration,
        sampleSize: history.length,
      });
    }
  }
}
