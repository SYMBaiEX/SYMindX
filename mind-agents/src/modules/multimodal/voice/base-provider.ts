/**
 * Base Voice Provider
 *
 * Abstract base class for voice synthesis providers
 */

import {
  VoiceProvider,
  VoiceCharacteristics,
  VoiceSynthesisConfig,
} from '../../../types/index.js';

export interface ProviderSynthesisRequest {
  text: string;
  characteristics: VoiceCharacteristics;
  format?: string;
  sampleRate?: number;
  stream?: boolean;
}

export interface ProviderSynthesisResponse {
  audioData: ArrayBuffer | ReadableStream<Uint8Array>;
  format: string;
  duration: number;
  characterCount: number;
  providerData?: Record<string, unknown>;
}

/**
 * Abstract base class for voice providers
 */
export abstract class BaseVoiceProvider {
  protected config: VoiceSynthesisConfig;

  constructor(config: VoiceSynthesisConfig) {
    this.config = config;
  }

  /**
   * Initialize the provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Synthesize speech
   */
  abstract synthesize(
    request: ProviderSynthesisRequest
  ): Promise<ProviderSynthesisResponse>;

  /**
   * Get provider type
   */
  abstract getType(): VoiceProvider;

  /**
   * Cleanup resources
   */
  abstract cleanup(): Promise<void>;

  /**
   * Check if the provider supports a specific feature
   */
  supportsFeature(feature: string): boolean {
    const features = this.getSupportedFeatures();
    return features.includes(feature);
  }

  /**
   * Get list of supported features
   */
  protected getSupportedFeatures(): string[] {
    return ['basic-synthesis'];
  }

  /**
   * Convert provider-specific voice ID to standard characteristics
   */
  protected normalizeVoiceCharacteristics(
    providerVoice: any
  ): VoiceCharacteristics {
    return {
      voiceId: providerVoice.id || providerVoice.name,
      voiceName: providerVoice.name,
      language: providerVoice.language || 'en-US',
      gender: providerVoice.gender,
      ageGroup: providerVoice.ageGroup || 'adult',
    };
  }

  /**
   * Apply audio post-processing if needed
   */
  protected async postProcessAudio(
    audioData: ArrayBuffer,
    format: string
  ): Promise<ArrayBuffer> {
    // Default implementation returns audio as-is
    // Subclasses can override for custom processing
    return audioData;
  }

  /**
   * Estimate audio duration from text
   */
  protected estimateDuration(text: string, rate: number = 1.0): number {
    // Rough estimate: 150 words per minute at normal rate
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150 * rate;
    return Math.round((words / wordsPerMinute) * 60 * 1000);
  }

  /**
   * Validate synthesis request
   */
  protected validateRequest(request: ProviderSynthesisRequest): void {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (request.text.length > 5000) {
      throw new Error('Text exceeds maximum length of 5000 characters');
    }

    if (!request.characteristics.voiceId) {
      throw new Error('Voice ID is required');
    }
  }
}
