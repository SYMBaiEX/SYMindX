/**
 * ElevenLabs Voice Provider
 *
 * Integration with ElevenLabs for high-quality voice synthesis
 */

import {
  BaseVoiceProvider,
  ProviderSynthesisRequest,
  ProviderSynthesisResponse,
} from '../base-provider.js';
import { VoiceProvider } from '../../../../types/index.js';
import { runtimeLogger } from '../../../../utils/logger.js';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

interface ElevenLabsSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * ElevenLabs voice synthesis provider
 */
export class ElevenLabsProvider extends BaseVoiceProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private voices: Map<string, ElevenLabsVoice> = new Map();
  private modelId = 'eleven_multilingual_v2';

  async initialize(): Promise<void> {
    this.apiKey = process.env.ELEVENLABS_API_KEY;

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable not set');
    }

    // Fetch available voices
    await this.fetchVoices();

    runtimeLogger.info('ElevenLabs provider initialized', {
      voiceCount: this.voices.size,
      modelId: this.modelId,
    });
  }

  async synthesize(
    request: ProviderSynthesisRequest
  ): Promise<ProviderSynthesisResponse> {
    this.validateRequest(request);

    const voiceId = request.characteristics.voiceId;
    const voice = this.voices.get(voiceId);

    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    // Build voice settings based on characteristics
    const settings = this.buildVoiceSettings(request.characteristics);

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}${request.stream ? '/stream' : ''}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey!,
            'Content-Type': 'application/json',
            Accept: request.stream ? 'audio/mpeg' : 'audio/mpeg',
          },
          body: JSON.stringify({
            text: request.text,
            model_id: this.modelId,
            voice_settings: settings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      if (request.stream && response.body) {
        // Return streaming response
        return {
          audioData: response.body,
          format: 'mp3',
          duration: this.estimateDuration(
            request.text,
            request.characteristics.speakingRate || 1.0
          ),
          characterCount: request.text.length,
          providerData: {
            voiceId,
            modelId: this.modelId,
            settings,
          },
        };
      } else {
        // Return complete audio
        const audioData = await response.arrayBuffer();

        return {
          audioData,
          format: 'mp3',
          duration: this.estimateDuration(
            request.text,
            request.characteristics.speakingRate || 1.0
          ),
          characterCount: request.text.length,
          providerData: {
            voiceId,
            modelId: this.modelId,
            settings,
            quotaRemaining: response.headers.get(
              'xi-character-count-remaining'
            ),
          },
        };
      }
    } catch (error) {
      runtimeLogger.error('ElevenLabs synthesis failed', { error, request });
      throw error;
    }
  }

  getType(): VoiceProvider {
    return VoiceProvider.ELEVENLABS;
  }

  async cleanup(): Promise<void> {
    this.voices.clear();
  }

  protected getSupportedFeatures(): string[] {
    return [
      'basic-synthesis',
      'streaming',
      'voice-cloning',
      'multilingual',
      'emotion-control',
      'style-control',
    ];
  }

  // Private helper methods

  private async fetchVoices(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();

      for (const voice of data.voices) {
        this.voices.set(voice.voice_id, voice);
      }

      // Map default voices if not already mapped
      if (!this.config.characteristics.voiceId && this.voices.size > 0) {
        // Use first available voice as default
        const firstVoice = this.voices.values().next().value;
        this.config.characteristics.voiceId = firstVoice.voice_id;
      }
    } catch (error) {
      runtimeLogger.error('Failed to fetch ElevenLabs voices', { error });
      throw error;
    }
  }

  private buildVoiceSettings(characteristics: any): ElevenLabsSettings {
    // Map our characteristics to ElevenLabs settings
    const settings: ElevenLabsSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
    };

    // Adjust based on speaking rate
    if (characteristics.speakingRate) {
      // Higher rate = less stable but more dynamic
      settings.stability = Math.max(
        0.1,
        0.5 - (characteristics.speakingRate - 1) * 0.3
      );
    }

    // Adjust based on pitch (style parameter in v2 model)
    if (characteristics.pitch !== undefined) {
      settings.style = Math.max(
        0,
        Math.min(1, 0.5 + characteristics.pitch / 40)
      );
    }

    // Enable speaker boost for clearer voice
    settings.use_speaker_boost = true;

    return settings;
  }
}
