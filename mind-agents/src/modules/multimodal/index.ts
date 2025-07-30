/**
 * Multi-Modal Module Factory
 *
 * Central factory for creating and managing multi-modal capabilities
 * including voice synthesis, vision processing, and haptic feedback.
 */

import { runtimeLogger } from '../../utils/logger.js';
import {
  MultiModalModule,
  MultiModalConfig,
  MultiModalModuleFactory,
  OperationResult,
  MultiModalMessage,
  MultiModalResponse,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  ImageInput,
  VideoStreamConfig,
  SceneUnderstanding,
  HapticFeedbackRequest,
  VisualMemory,
  AgentId,
  Timestamp,
} from '../../types/index.js';
import { VoiceSynthesisModule } from './voice/index.js';
import { VisionProcessingModule } from './vision/index.js';
import { HapticFeedbackModule } from './haptic/index.js';

/**
 * Core multi-modal module implementation
 */
export class MultiModalModuleImpl implements MultiModalModule {
  private voice: VoiceSynthesisModule | null = null;
  private vision: VisionProcessingModule | null = null;
  private haptic: HapticFeedbackModule | null = null;
  private config: MultiModalConfig;
  private metrics = {
    voiceLatency: 0,
    visionLatency: 0,
    hapticLatency: 0,
    totalProcessed: 0,
    errors: 0,
  };

  constructor(config: MultiModalConfig) {
    this.config = config;
  }

  async initialize(config: MultiModalConfig): Promise<OperationResult> {
    const startTime = Date.now();

    try {
      // Initialize voice synthesis if configured
      if (config.voice) {
        this.voice = new VoiceSynthesisModule(config.voice);
        await this.voice.initialize();
        runtimeLogger.info('Voice synthesis module initialized', {
          provider: config.voice.provider,
        });
      }

      // Initialize vision processing if configured
      if (config.vision) {
        this.vision = new VisionProcessingModule(config.vision);
        await this.vision.initialize();
        runtimeLogger.info('Vision processing module initialized', {
          provider: config.vision.provider,
        });
      }

      // Initialize haptic feedback if configured
      if (config.haptic) {
        this.haptic = new HapticFeedbackModule(config.haptic);
        await this.haptic.initialize();
        runtimeLogger.info('Haptic feedback module initialized');
      }

      // Setup WebRTC if configured
      if (config.webrtc?.enabled) {
        await this.setupWebRTC(config.webrtc);
      }

      return {
        success: true,
        message: 'Multi-modal module initialized successfully',
        metadata: {
          duration: Date.now() - startTime,
          modules: {
            voice: !!config.voice,
            vision: !!config.vision,
            haptic: !!config.haptic,
            webrtc: !!config.webrtc?.enabled,
          },
        },
      };
    } catch (error) {
      runtimeLogger.error('Failed to initialize multi-modal module', { error });
      this.metrics.errors++;
      return {
        success: false,
        error: `Multi-modal initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { duration: Date.now() - startTime },
      };
    }
  }

  async processInput(input: MultiModalMessage): Promise<MultiModalResponse> {
    const startTime = Date.now();
    const response: MultiModalResponse = {
      id: `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    try {
      // Process each modality in parallel where possible
      const promises: Promise<void>[] = [];

      // Process text (always synchronous as it's the base)
      if (input.text) {
        response.text = await this.processTextInput(input.text, input.metadata);
      }

      // Process voice input
      if (input.voice && this.voice) {
        promises.push(
          this.processVoiceInput(input.voice).then((result) => {
            if (result.transcript) {
              response.text = result.transcript;
            }
          })
        );
      }

      // Process vision input
      if (input.vision && this.vision) {
        promises.push(
          this.processVisionInput(input.vision).then((scene) => {
            response.visuals = [
              {
                type: 'image',
                data: JSON.stringify(scene),
                metadata: { type: 'scene-understanding' },
              },
            ];
          })
        );
      }

      // Process haptic input
      if (input.haptic && this.haptic) {
        promises.push(
          this.haptic.processPattern(input.haptic).then(() => {
            response.haptics = [input.haptic!];
          })
        );
      }

      // Wait for all modality processing
      await Promise.all(promises);

      // Generate synchronized response
      if (this.config.synchronization?.temporalAlignment) {
        await this.synchronizeResponse(response);
      }

      this.metrics.totalProcessed++;
      this.updateLatencyMetrics(Date.now() - startTime);

      return response;
    } catch (error) {
      runtimeLogger.error('Failed to process multi-modal input', {
        error,
        input,
      });
      this.metrics.errors++;
      throw error;
    }
  }

  async synthesizeVoice(
    request: VoiceSynthesisRequest
  ): Promise<VoiceSynthesisResponse> {
    if (!this.voice) {
      throw new Error('Voice synthesis module not initialized');
    }

    const startTime = Date.now();
    try {
      const response = await this.voice.synthesize(request);
      this.metrics.voiceLatency = Date.now() - startTime;
      return response;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  async processVision(
    input: ImageInput | VideoStreamConfig
  ): Promise<SceneUnderstanding> {
    if (!this.vision) {
      throw new Error('Vision processing module not initialized');
    }

    const startTime = Date.now();
    try {
      const scene = await this.vision.processInput(input);
      this.metrics.visionLatency = Date.now() - startTime;
      return scene;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  async generateHaptic(
    request: HapticFeedbackRequest
  ): Promise<OperationResult> {
    if (!this.haptic) {
      return {
        success: false,
        error: 'Haptic feedback module not initialized',
      };
    }

    const startTime = Date.now();
    try {
      const result = await this.haptic.processPattern(request);
      this.metrics.hapticLatency = Date.now() - startTime;
      return result;
    } catch (error) {
      this.metrics.errors++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getVisualMemories(
    agentId: AgentId,
    query?: {
      startTime?: Timestamp;
      endTime?: Timestamp;
      limit?: number;
      minImportance?: number;
    }
  ): Promise<VisualMemory[]> {
    if (!this.vision) {
      return [];
    }

    return this.vision.getVisualMemories(agentId, query);
  }

  async updateConfig(
    config: Partial<MultiModalConfig>
  ): Promise<OperationResult> {
    try {
      // Update main config
      this.config = { ...this.config, ...config };

      // Update individual module configs
      const updates: Promise<void>[] = [];

      if (config.voice && this.voice) {
        updates.push(this.voice.updateConfig(config.voice));
      }

      if (config.vision && this.vision) {
        updates.push(this.vision.updateConfig(config.vision));
      }

      if (config.haptic && this.haptic) {
        updates.push(this.haptic.updateConfig(config.haptic));
      }

      await Promise.all(updates);

      return {
        success: true,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async cleanup(): Promise<OperationResult> {
    try {
      const cleanups: Promise<void>[] = [];

      if (this.voice) {
        cleanups.push(this.voice.cleanup());
      }

      if (this.vision) {
        cleanups.push(this.vision.cleanup());
      }

      if (this.haptic) {
        cleanups.push(this.haptic.cleanup());
      }

      await Promise.all(cleanups);

      return {
        success: true,
        message: 'Multi-modal module cleaned up successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private async processTextInput(
    text: string,
    metadata?: any
  ): Promise<string> {
    // Process text through NLP pipeline if needed
    // For now, return as-is
    return text;
  }

  private async processVoiceInput(voice: {
    audioData: ArrayBuffer;
    transcript?: string;
  }): Promise<{
    transcript?: string;
    emotion?: string;
  }> {
    // Process voice input
    // This would involve speech-to-text if transcript not provided
    return {
      transcript: voice.transcript,
    };
  }

  private async processVisionInput(vision: {
    images?: ImageInput[];
    scene?: SceneUnderstanding;
  }): Promise<SceneUnderstanding> {
    if (vision.scene) {
      return vision.scene;
    }

    if (vision.images && vision.images.length > 0 && this.vision) {
      return this.vision.processInput(vision.images[0]);
    }

    return {
      description: 'No visual input to process',
      objects: [],
      tags: [],
    };
  }

  private async synchronizeResponse(
    response: MultiModalResponse
  ): Promise<void> {
    // Implement temporal alignment logic
    // This would coordinate timing between voice, visuals, and haptics
    const maxLatency = this.config.synchronization?.maxLatency || 100;

    // Add delays to synchronize modalities if needed
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(maxLatency, 50))
    );
  }

  private async setupWebRTC(config: any): Promise<void> {
    // Setup WebRTC connections for real-time communication
    // This would involve creating peer connections, handling ICE candidates, etc.
    runtimeLogger.info('WebRTC setup completed', {
      stunServers: config.stunServers,
    });
  }

  private updateLatencyMetrics(totalTime: number): void {
    // Update running average of latencies
    const weight = 0.1; // Exponential moving average weight

    if (this.voice) {
      this.metrics.voiceLatency =
        this.metrics.voiceLatency * (1 - weight) +
        this.metrics.voiceLatency * weight;
    }

    if (this.vision) {
      this.metrics.visionLatency =
        this.metrics.visionLatency * (1 - weight) +
        this.metrics.visionLatency * weight;
    }

    if (this.haptic) {
      this.metrics.hapticLatency =
        this.metrics.hapticLatency * (1 - weight) +
        this.metrics.hapticLatency * weight;
    }
  }
}

/**
 * Factory function for creating multi-modal modules
 */
export const createMultiModalModule: MultiModalModuleFactory = async (
  config?: MultiModalConfig
) => {
  const defaultConfig: MultiModalConfig = {
    crossModalLearning: true,
    synchronization: {
      maxLatency: 100,
      temporalAlignment: true,
      bufferingStrategy: 'balanced',
    },
  };

  const finalConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
  const module = new MultiModalModuleImpl(finalConfig);
  await module.initialize(finalConfig);

  return module;
};

// Export types
export * from '../../types/multimodal.js';
