/**
 * OpenAI TTS Voice Provider
 *
 * Integration with OpenAI's Text-to-Speech API
 */

import {
  BaseVoiceProvider,
  ProviderSynthesisRequest,
  ProviderSynthesisResponse,
} from '../base-provider.js';
import { VoiceProvider } from '../../../../types/index.js';
import { runtimeLogger } from '../../../../utils/logger.js';

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
type OpenAIModel = 'tts-1' | 'tts-1-hd';

/**
 * OpenAI TTS voice synthesis provider
 */
export class OpenAITTSProvider extends BaseVoiceProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1/audio/speech';
  private model: OpenAIModel = 'tts-1-hd'; // HD model for better quality
  private voiceMap: Map<string, OpenAIVoice> = new Map();

  async initialize(): Promise<void> {
    this.apiKey = process.env.OPENAI_API_KEY;

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    // Setup voice mappings
    this.setupVoiceMappings();

    runtimeLogger.info('OpenAI TTS provider initialized', {
      model: this.model,
      availableVoices: Array.from(this.voiceMap.keys()),
    });
  }

  async synthesize(
    request: ProviderSynthesisRequest
  ): Promise<ProviderSynthesisResponse> {
    this.validateRequest(request);

    const voice = this.mapToOpenAIVoice(request.characteristics.voiceId);
    const speed = request.characteristics.speakingRate || 1.0;
    const format = this.mapAudioFormat(request.format);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: request.text,
          voice: voice,
          response_format: format,
          speed: Math.max(0.25, Math.min(4.0, speed)),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS API error: ${response.status} - ${error}`);
      }

      if (request.stream && response.body) {
        // Return streaming response
        return {
          audioData: response.body,
          format,
          duration: this.estimateDuration(request.text, speed),
          characterCount: request.text.length,
          providerData: {
            model: this.model,
            voice,
            speed,
          },
        };
      } else {
        // Return complete audio
        const audioData = await response.arrayBuffer();

        return {
          audioData,
          format,
          duration: this.estimateDuration(request.text, speed),
          characterCount: request.text.length,
          providerData: {
            model: this.model,
            voice,
            speed,
          },
        };
      }
    } catch (error) {
      runtimeLogger.error('OpenAI TTS synthesis failed', { error, request });
      throw error;
    }
  }

  getType(): VoiceProvider {
    return VoiceProvider.OPENAI_TTS;
  }

  async cleanup(): Promise<void> {
    this.voiceMap.clear();
  }

  protected getSupportedFeatures(): string[] {
    return [
      'basic-synthesis',
      'streaming',
      'speed-control',
      'high-quality',
      'multiple-formats',
    ];
  }

  // Private helper methods

  private setupVoiceMappings(): void {
    // Map character names to OpenAI voices
    this.voiceMap.set('nyx', 'nova'); // Mysterious female
    this.voiceMap.set('aria', 'shimmer'); // Creative female
    this.voiceMap.set('rex', 'onyx'); // Strategic male
    this.voiceMap.set('nova-agent', 'fable'); // Empathetic neutral

    // Direct voice mappings
    this.voiceMap.set('alloy', 'alloy');
    this.voiceMap.set('echo', 'echo');
    this.voiceMap.set('fable', 'fable');
    this.voiceMap.set('onyx', 'onyx');
    this.voiceMap.set('nova', 'nova');
    this.voiceMap.set('shimmer', 'shimmer');
  }

  private mapToOpenAIVoice(voiceId: string): OpenAIVoice {
    const mapped = this.voiceMap.get(voiceId.toLowerCase());
    if (mapped) return mapped;

    // Default based on gender if specified
    const characteristics = this.config.characteristics;
    if (characteristics.gender === 'male') {
      return 'onyx';
    } else if (characteristics.gender === 'female') {
      return 'nova';
    }

    return 'alloy'; // Default neutral voice
  }

  private mapAudioFormat(format?: string): string {
    switch (format) {
      case 'mp3':
        return 'mp3';
      case 'opus':
        return 'opus';
      case 'aac':
        return 'aac';
      case 'flac':
        return 'flac';
      case 'wav':
        return 'wav';
      case 'pcm':
        return 'pcm';
      default:
        return 'mp3';
    }
  }
}
