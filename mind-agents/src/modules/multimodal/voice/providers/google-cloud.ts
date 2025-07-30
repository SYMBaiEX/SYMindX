/**
 * Google Cloud Text-to-Speech Provider
 *
 * Integration with Google Cloud TTS for advanced voice synthesis
 */

import {
  BaseVoiceProvider,
  ProviderSynthesisRequest,
  ProviderSynthesisResponse,
} from '../base-provider.js';
import { VoiceProvider } from '../../../../types/index.js';
import { runtimeLogger } from '../../../../utils/logger.js';

interface GoogleVoice {
  languageCodes: string[];
  name: string;
  ssmlGender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  naturalSampleRateHertz: number;
}

interface AudioConfig {
  audioEncoding: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  sampleRateHertz?: number;
  effectsProfileId?: string[];
}

/**
 * Google Cloud TTS voice synthesis provider
 */
export class GoogleCloudProvider extends BaseVoiceProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://texttospeech.googleapis.com/v1';
  private voices: Map<string, GoogleVoice> = new Map();

  async initialize(): Promise<void> {
    this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!this.apiKey) {
      throw new Error('GOOGLE_CLOUD_API_KEY environment variable not set');
    }

    // Fetch available voices
    await this.fetchVoices();

    runtimeLogger.info('Google Cloud TTS provider initialized', {
      voiceCount: this.voices.size,
    });
  }

  async synthesize(
    request: ProviderSynthesisRequest
  ): Promise<ProviderSynthesisResponse> {
    this.validateRequest(request);

    const voice = this.selectVoice(request.characteristics);
    const audioConfig = this.buildAudioConfig(request);

    try {
      const response = await fetch(
        `${this.baseUrl}/text:synthesize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              text: request.text,
              ssml: request.text.startsWith('<speak>')
                ? request.text
                : undefined,
            },
            voice: {
              languageCode: request.characteristics.language || 'en-US',
              name: voice.name,
              ssmlGender: voice.ssmlGender,
            },
            audioConfig,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Google Cloud TTS API error: ${response.status} - ${JSON.stringify(error)}`
        );
      }

      const data = await response.json();

      // Google returns base64 encoded audio
      const audioBuffer = this.base64ToArrayBuffer(data.audioContent);

      // Handle streaming by converting to stream if requested
      if (request.stream) {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(audioBuffer));
            controller.close();
          },
        });

        return {
          audioData: stream,
          format: this.getAudioFormat(audioConfig.audioEncoding),
          duration: this.estimateDuration(
            request.text,
            audioConfig.speakingRate || 1.0
          ),
          characterCount: request.text.length,
          providerData: {
            voice: voice.name,
            language: request.characteristics.language,
          },
        };
      }

      return {
        audioData: audioBuffer,
        format: this.getAudioFormat(audioConfig.audioEncoding),
        duration: this.estimateDuration(
          request.text,
          audioConfig.speakingRate || 1.0
        ),
        characterCount: request.text.length,
        providerData: {
          voice: voice.name,
          language: request.characteristics.language,
          timepoints: data.timepoints,
        },
      };
    } catch (error) {
      runtimeLogger.error('Google Cloud TTS synthesis failed', {
        error,
        request,
      });
      throw error;
    }
  }

  getType(): VoiceProvider {
    return VoiceProvider.GOOGLE_CLOUD;
  }

  async cleanup(): Promise<void> {
    this.voices.clear();
  }

  protected getSupportedFeatures(): string[] {
    return [
      'basic-synthesis',
      'ssml',
      'multilingual',
      'neural-voices',
      'wavenet-voices',
      'studio-voices',
      'custom-voice',
      'audio-profiles',
    ];
  }

  // Private helper methods

  private async fetchVoices(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/voices?key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();

      for (const voice of data.voices) {
        // Store by voice name
        this.voices.set(voice.name, voice);
      }

      // Setup character voice mappings
      this.setupCharacterVoices();
    } catch (error) {
      runtimeLogger.error('Failed to fetch Google Cloud voices', { error });
      throw error;
    }
  }

  private setupCharacterVoices(): void {
    // Map characters to specific Google voices
    const characterMappings: Record<string, string> = {
      nyx: 'en-US-Studio-O', // Female, conversational
      aria: 'en-US-Studio-O', // Female, warm
      rex: 'en-US-Studio-M', // Male, professional
      nova: 'en-US-Studio-Q', // Neutral, calm
    };

    // Add character mappings to voices
    for (const [character, voiceName] of Object.entries(characterMappings)) {
      const voice = Array.from(this.voices.values()).find(
        (v) => v.name === voiceName
      );
      if (voice) {
        this.voices.set(character, voice);
      }
    }
  }

  private selectVoice(characteristics: any): GoogleVoice {
    // Try to find exact match by voice ID
    let voice = this.voices.get(characteristics.voiceId);
    if (voice) return voice;

    // Find by language and gender
    const targetLang = characteristics.language || 'en-US';
    const targetGender = this.mapGender(characteristics.gender);

    const candidates = Array.from(this.voices.values()).filter(
      (v) =>
        v.languageCodes.includes(targetLang) && v.ssmlGender === targetGender
    );

    // Prefer Studio or WaveNet voices for quality
    const preferred = candidates.find(
      (v) => v.name.includes('Studio') || v.name.includes('Wavenet')
    );

    return preferred || candidates[0] || this.voices.values().next().value;
  }

  private mapGender(gender?: string): 'MALE' | 'FEMALE' | 'NEUTRAL' {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'MALE';
      case 'female':
        return 'FEMALE';
      default:
        return 'NEUTRAL';
    }
  }

  private buildAudioConfig(request: ProviderSynthesisRequest): AudioConfig {
    const config: AudioConfig = {
      audioEncoding: this.mapAudioEncoding(request.format),
      speakingRate: Math.max(
        0.25,
        Math.min(4.0, request.characteristics.speakingRate || 1.0)
      ),
      pitch: Math.max(-20, Math.min(20, request.characteristics.pitch || 0)),
      volumeGainDb: 0,
      sampleRateHertz: request.sampleRate || 24000,
    };

    // Add audio effects profiles for better quality
    config.effectsProfileId = [
      'small-bluetooth-speaker-class-device',
      'headphone-class-device',
    ];

    return config;
  }

  private mapAudioEncoding(format?: string): string {
    switch (format) {
      case 'mp3':
        return 'MP3';
      case 'wav':
        return 'LINEAR16';
      case 'ogg':
        return 'OGG_OPUS';
      default:
        return 'MP3';
    }
  }

  private getAudioFormat(encoding: string): string {
    switch (encoding) {
      case 'MP3':
        return 'mp3';
      case 'LINEAR16':
        return 'wav';
      case 'OGG_OPUS':
        return 'ogg';
      default:
        return 'mp3';
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
