/**
 * Voice Synthesis Module
 *
 * Implements real-time voice synthesis with emotion-based modulation
 * for natural, expressive agent speech.
 */

import { runtimeLogger } from '../../../utils/logger.js';
import {
  VoiceSynthesisConfig,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceProvider,
  VoiceCharacteristics,
  VoiceEmotionModulation,
  EmotionType,
  EmotionState,
  Timestamp,
} from '../../../types/index.js';
import { ElevenLabsProvider } from './providers/elevenlabs.js';
import { OpenAITTSProvider } from './providers/openai-tts.js';
import { GoogleCloudProvider } from './providers/google-cloud.js';
import { BaseVoiceProvider } from './base-provider.js';

/**
 * Voice synthesis module implementation
 */
export class VoiceSynthesisModule {
  private config: VoiceSynthesisConfig;
  private provider: BaseVoiceProvider;
  private emotionModulations: Map<EmotionType, VoiceEmotionModulation>;
  private audioCache: Map<string, ArrayBuffer>;
  private voiceProfiles: Map<string, VoiceCharacteristics>;

  constructor(config: VoiceSynthesisConfig) {
    this.config = config;
    this.emotionModulations = new Map();
    this.audioCache = new Map();
    this.voiceProfiles = new Map();

    // Initialize provider based on config
    this.provider = this.createProvider(config.provider);

    // Setup emotion modulations
    this.setupEmotionModulations();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize the provider
      await this.provider.initialize();

      // Setup default voice profiles for each character
      this.setupCharacterVoices();

      // Test synthesis to ensure everything is working
      await this.testSynthesis();

      runtimeLogger.info('Voice synthesis module initialized', {
        provider: this.config.provider,
        voiceId: this.config.characteristics.voiceId,
      });
    } catch (error) {
      runtimeLogger.error('Failed to initialize voice synthesis', { error });
      throw error;
    }
  }

  async synthesize(
    request: VoiceSynthesisRequest
  ): Promise<VoiceSynthesisResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.getCacheKey(request);
      if (this.audioCache.has(cacheKey) && !request.stream) {
        const cachedAudio = this.audioCache.get(cacheKey)!;
        return {
          audioData: cachedAudio,
          format: this.config.outputFormat || 'mp3',
          duration: this.estimateDuration(request.text),
          characterCount: request.text.length,
          timestamp: Date.now(),
        };
      }

      // Apply emotion modulation if enabled
      let characteristics = this.config.characteristics;
      if (this.config.enableEmotionModulation && request.emotionState) {
        characteristics = this.applyEmotionModulation(
          characteristics,
          request.emotionState
        );
      }

      // Apply any request-specific overrides
      if (request.voiceOverrides) {
        characteristics = { ...characteristics, ...request.voiceOverrides };
      }

      // Process SSML if enabled
      let text = request.text;
      if (request.ssml) {
        text = this.processSSML(text, request.emotionState);
      }

      // Synthesize through provider
      const response = await this.provider.synthesize({
        text,
        characteristics,
        format: this.config.outputFormat,
        sampleRate: this.config.sampleRate,
        stream: request.stream,
      });

      // Cache if not streaming
      if (!request.stream && response.audioData instanceof ArrayBuffer) {
        this.audioCache.set(cacheKey, response.audioData);

        // Limit cache size
        if (this.audioCache.size > 100) {
          const firstKey = this.audioCache.keys().next().value;
          this.audioCache.delete(firstKey);
        }
      }

      runtimeLogger.debug('Voice synthesis completed', {
        agentId: request.agentId,
        duration: Date.now() - startTime,
        characterCount: request.text.length,
      });

      return {
        ...response,
        timestamp: Date.now(),
      };
    } catch (error) {
      runtimeLogger.error('Voice synthesis failed', { error, request });
      throw error;
    }
  }

  async updateConfig(config: Partial<VoiceSynthesisConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Reinitialize provider if changed
    if (config.provider && config.provider !== this.provider.getType()) {
      const oldProvider = this.provider;
      this.provider = this.createProvider(config.provider);
      await this.provider.initialize();
      await oldProvider.cleanup();
    }

    // Update emotion modulations if provided
    if (config.emotionModulations) {
      this.setupEmotionModulations();
    }
  }

  async cleanup(): Promise<void> {
    await this.provider.cleanup();
    this.audioCache.clear();
    this.emotionModulations.clear();
    this.voiceProfiles.clear();
  }

  // Private helper methods

  private createProvider(type: VoiceProvider): BaseVoiceProvider {
    switch (type) {
      case VoiceProvider.ELEVENLABS:
        return new ElevenLabsProvider(this.config);
      case VoiceProvider.OPENAI_TTS:
        return new OpenAITTSProvider(this.config);
      case VoiceProvider.GOOGLE_CLOUD:
        return new GoogleCloudProvider(this.config);
      default:
        throw new Error(`Unsupported voice provider: ${type}`);
    }
  }

  private setupEmotionModulations(): void {
    // Default emotion modulations
    const defaults: Record<EmotionType, Partial<VoiceEmotionModulation>> = {
      happy: {
        adjustments: {
          pitchVariation: 3,
          rateMultiplier: 1.1,
          volumeAdjustment: 2,
          breathiness: 0.1,
        },
      },
      sad: {
        adjustments: {
          pitchVariation: -2,
          rateMultiplier: 0.9,
          volumeAdjustment: -3,
          breathiness: 0.3,
          tremor: 0.2,
        },
      },
      angry: {
        adjustments: {
          pitchVariation: -1,
          rateMultiplier: 1.2,
          volumeAdjustment: 5,
          emphasis: ['strong'],
        },
      },
      anxious: {
        adjustments: {
          pitchVariation: 2,
          rateMultiplier: 1.15,
          volumeAdjustment: 0,
          tremor: 0.3,
          breathiness: 0.2,
        },
      },
      confident: {
        adjustments: {
          pitchVariation: -1,
          rateMultiplier: 0.95,
          volumeAdjustment: 3,
          emphasis: ['clear', 'strong'],
        },
      },
      curious: {
        adjustments: {
          pitchVariation: 4,
          rateMultiplier: 1.05,
          volumeAdjustment: 1,
          emphasis: ['rising'],
        },
      },
      neutral: {
        adjustments: {
          pitchVariation: 0,
          rateMultiplier: 1.0,
          volumeAdjustment: 0,
        },
      },
      nostalgic: {
        adjustments: {
          pitchVariation: -1,
          rateMultiplier: 0.85,
          volumeAdjustment: -2,
          breathiness: 0.2,
        },
      },
      empathetic: {
        adjustments: {
          pitchVariation: 1,
          rateMultiplier: 0.9,
          volumeAdjustment: -1,
          breathiness: 0.15,
          emphasis: ['soft'],
        },
      },
      proud: {
        adjustments: {
          pitchVariation: 2,
          rateMultiplier: 0.9,
          volumeAdjustment: 4,
          emphasis: ['strong', 'clear'],
        },
      },
      confused: {
        adjustments: {
          pitchVariation: 3,
          rateMultiplier: 0.95,
          volumeAdjustment: 0,
          emphasis: ['questioning'],
        },
      },
    };

    // Merge with custom modulations
    const customModulations = this.config.emotionModulations || {};

    for (const [emotion, modulation] of Object.entries(defaults)) {
      const custom = customModulations[emotion as EmotionType];
      const merged = custom ? { ...modulation, ...custom } : modulation;

      this.emotionModulations.set(
        emotion as EmotionType,
        {
          emotion: emotion as EmotionType,
          intensity: 1.0,
          ...merged,
        } as VoiceEmotionModulation
      );
    }
  }

  private setupCharacterVoices(): void {
    // Character-specific voice profiles
    const characterVoices: Record<string, Partial<VoiceCharacteristics>> = {
      nyx: {
        gender: 'female',
        ageGroup: 'young-adult',
        speakingRate: 1.1,
        pitch: 2,
        styles: ['confident', 'mysterious', 'playful'],
      },
      aria: {
        gender: 'female',
        ageGroup: 'young-adult',
        speakingRate: 0.95,
        pitch: 4,
        styles: ['creative', 'warm', 'expressive'],
      },
      rex: {
        gender: 'male',
        ageGroup: 'adult',
        speakingRate: 0.9,
        pitch: -3,
        styles: ['analytical', 'calm', 'authoritative'],
      },
      nova: {
        gender: 'neutral',
        ageGroup: 'adult',
        speakingRate: 1.0,
        pitch: 0,
        styles: ['empathetic', 'soothing', 'wise'],
      },
    };

    for (const [character, profile] of Object.entries(characterVoices)) {
      this.voiceProfiles.set(character, {
        ...this.config.characteristics,
        ...profile,
      });
    }
  }

  private applyEmotionModulation(
    base: VoiceCharacteristics,
    emotionState: EmotionState
  ): VoiceCharacteristics {
    // Find dominant emotion
    const emotions = Object.entries(emotionState.emotions);
    const dominant = emotions.reduce((max, [emotion, intensity]) =>
      intensity > max[1] ? [emotion, intensity] : max
    );

    const emotionType = dominant[0] as EmotionType;
    const intensity = dominant[1] as number;

    const modulation = this.emotionModulations.get(emotionType);
    if (!modulation) return base;

    const adjustments = modulation.adjustments;

    return {
      ...base,
      speakingRate:
        (base.speakingRate || 1.0) *
        (1 + (adjustments.rateMultiplier - 1) * intensity),
      pitch: (base.pitch || 0) + adjustments.pitchVariation * intensity,
    };
  }

  private processSSML(text: string, emotionState?: EmotionState): string {
    // Convert plain text to SSML with emotion-based prosody
    let ssml = `<speak>${text}</speak>`;

    if (emotionState) {
      // Add prosody tags based on emotion
      const emotions = Object.entries(emotionState.emotions);
      const dominant = emotions.reduce((max, [emotion, intensity]) =>
        intensity > max[1] ? [emotion, intensity] : max
      );

      const emotionType = dominant[0] as EmotionType;
      const modulation = this.emotionModulations.get(emotionType);

      if (modulation) {
        const adj = modulation.adjustments;
        ssml = `<speak>
          <prosody rate="${Math.round(adj.rateMultiplier * 100)}%" pitch="${adj.pitchVariation > 0 ? '+' : ''}${adj.pitchVariation}st" volume="${adj.volumeAdjustment > 0 ? '+' : ''}${adj.volumeAdjustment}dB">
            ${text}
          </prosody>
        </speak>`;
      }
    }

    return ssml;
  }

  private getCacheKey(request: VoiceSynthesisRequest): string {
    const emotion = request.emotionState
      ? JSON.stringify(request.emotionState.emotions)
      : 'neutral';
    return `${request.text}-${emotion}-${request.agentId}`;
  }

  private estimateDuration(text: string): number {
    // Rough estimate: 150 words per minute average speaking rate
    const words = text.split(/\s+/).length;
    return Math.round((words / 150) * 60 * 1000);
  }

  private async testSynthesis(): Promise<void> {
    try {
      const testRequest: VoiceSynthesisRequest = {
        text: 'Voice synthesis initialized successfully.',
        agentId: 'test',
        stream: false,
      };

      await this.synthesize(testRequest);
      runtimeLogger.debug('Voice synthesis test completed successfully');
    } catch (error) {
      runtimeLogger.warn('Voice synthesis test failed, but continuing', {
        error,
      });
    }
  }
}
