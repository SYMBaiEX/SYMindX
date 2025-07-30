/**
 * Multi-Modal Module Tests
 */

import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { createMultiModalModule } from '../index';
import {
  MultiModalModule,
  MultiModalConfig,
  VoiceProvider,
  VisionProvider,
  HapticPattern,
  EmotionType,
  MultiModalMessage,
  VoiceSynthesisRequest,
  ImageInput,
  HapticFeedbackRequest,
} from '../../../types/index';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';
process.env.ELEVENLABS_API_KEY = 'test-key';
process.env.GOOGLE_CLOUD_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';

// Mock fetch
global.fetch = jest.fn();

describe('Multi-Modal Module', () => {
  let module: MultiModalModule;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockReset();
  });

  afterEach(async () => {
    if (module) {
      await module.cleanup();
    }
  });

  describe('Module Initialization', () => {
    test('should initialize with minimal config', async () => {
      module = await createMultiModalModule();

      const metrics = module.getMetrics();
      expect(metrics).toEqual({
        voiceLatency: 0,
        visionLatency: 0,
        hapticLatency: 0,
        totalProcessed: 0,
        errors: 0,
      });
    });

    test('should initialize with full config', async () => {
      const config: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: true,
        },
        vision: {
          provider: VisionProvider.OPENAI_VISION,
          enableObjectDetection: true,
          enableFaceAnalysis: true,
          enableTextRecognition: true,
          enableSceneUnderstanding: true,
        },
        haptic: {
          enabled: true,
          defaultIntensity: 0.7,
          emotionPatterns: {} as any,
        },
        crossModalLearning: true,
        synchronization: {
          maxLatency: 100,
          temporalAlignment: true,
          bufferingStrategy: 'balanced',
        },
      };

      module = await createMultiModalModule(config);

      const metrics = module.getMetrics();
      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.errors).toBe(0);
    });
  });

  describe('Voice Synthesis', () => {
    beforeEach(async () => {
      const config: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: true,
        },
      };

      module = await createMultiModalModule(config);

      // Mock successful API response
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
        json: async () => ({ choices: [{ message: { content: 'test' } }] }),
      } as Response);
    });

    test('should synthesize voice from text', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'Hello, world!',
        agentId: 'test-agent',
        stream: false,
      };

      const response = await module.synthesizeVoice(request);

      expect(response.audioData).toBeInstanceOf(ArrayBuffer);
      expect(response.format).toBe('mp3');
      expect(response.characterCount).toBe(13);
      expect(response.duration).toBeGreaterThan(0);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    test('should apply emotion modulation', async () => {
      const request: VoiceSynthesisRequest = {
        text: 'I am so happy!',
        agentId: 'test-agent',
        emotionState: {
          primary: 'happy' as EmotionType,
          emotions: {
            happy: 0.9,
            confident: 0.5,
            neutral: 0.1,
          } as any,
          intensity: 0.9,
          timestamp: Date.now(),
        },
      };

      const response = await module.synthesizeVoice(request);

      expect(response).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('speed'),
        })
      );
    });

    test('should handle streaming voice synthesis', async () => {
      // Mock streaming response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockStream,
      } as Response);

      const request: VoiceSynthesisRequest = {
        text: 'Stream this audio',
        agentId: 'test-agent',
        stream: true,
      };

      const response = await module.synthesizeVoice(request);

      expect(response.audioData).toBeInstanceOf(ReadableStream);
    });
  });

  describe('Vision Processing', () => {
    beforeEach(async () => {
      const config: MultiModalConfig = {
        vision: {
          provider: VisionProvider.OPENAI_VISION,
          enableObjectDetection: true,
          enableFaceAnalysis: true,
          enableTextRecognition: true,
          enableSceneUnderstanding: true,
          visualMemory: {
            enabled: true,
            maxEntries: 100,
            retentionDays: 7,
            importanceThreshold: 0.5,
          },
        },
      };

      module = await createMultiModalModule(config);

      // Mock successful vision API response
      const mockVisionResponse = {
        description: 'A test scene',
        objects: [{ label: 'person', position: 'center', confidence: 'high' }],
        tags: ['indoor', 'bright'],
        text: [{ content: 'Test Text', position: 'top-left' }],
        faces: [{ position: 'center', age: '25-30', emotion: 'happy' }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockVisionResponse),
              },
            },
          ],
        }),
      } as Response);
    });

    test('should process image input', async () => {
      const image: ImageInput = {
        data: 'data:image/jpeg;base64,/9j/4AAQ...',
        mimeType: 'image/jpeg',
        dimensions: { width: 640, height: 480 },
        source: 'upload',
      };

      const scene = await module.processVision(image);

      expect(scene.description).toBeDefined();
      expect(scene.objects).toBeInstanceOf(Array);
      expect(scene.tags).toBeInstanceOf(Array);
      expect(scene.objects.length).toBeGreaterThan(0);
    });

    test('should detect objects in image', async () => {
      const image: ImageInput = {
        data: 'base64-image-data',
        mimeType: 'image/png',
      };

      const scene = await module.processVision(image);

      expect(scene.objects).toBeDefined();
      expect(scene.objects.length).toBeGreaterThan(0);
      expect(scene.objects[0]).toHaveProperty('label');
      expect(scene.objects[0]).toHaveProperty('confidence');
      expect(scene.objects[0]).toHaveProperty('boundingBox');
    });

    test('should store visual memories', async () => {
      const image: ImageInput = {
        data: 'base64-image-data',
        mimeType: 'image/jpeg',
      };

      await module.processVision(image);

      const memories = await module.getVisualMemories('test-agent', {
        limit: 10,
        minImportance: 0.5,
      });

      expect(memories).toBeInstanceOf(Array);
    });
  });

  describe('Haptic Feedback', () => {
    beforeEach(async () => {
      const config: MultiModalConfig = {
        haptic: {
          enabled: true,
          defaultIntensity: 0.7,
          emotionPatterns: {} as any,
          adaptiveFeedback: true,
        },
      };

      module = await createMultiModalModule(config);

      // Mock navigator.vibrate
      Object.defineProperty(navigator, 'vibrate', {
        value: jest.fn(() => true),
        writable: true,
      });
    });

    test('should generate haptic feedback', async () => {
      const request: HapticFeedbackRequest = {
        pattern: HapticPattern.TAP,
        intensity: 0.8,
        duration: 100,
      };

      const result = await module.generateHaptic(request);

      expect(result.success).toBe(true);
      expect(navigator.vibrate).toHaveBeenCalled();
    });

    test('should apply emotion-based haptic patterns', async () => {
      const request: HapticFeedbackRequest = {
        pattern: HapticPattern.PULSE,
        emotionState: {
          primary: 'happy' as EmotionType,
          emotions: {
            happy: 0.8,
            confident: 0.6,
          } as any,
          intensity: 0.8,
          timestamp: Date.now(),
        },
      };

      const result = await module.generateHaptic(request);

      expect(result.success).toBe(true);
    });

    test('should handle custom waveforms', async () => {
      const request: HapticFeedbackRequest = {
        pattern: {
          duration: 500,
          intensityCurve: [0, 0.5, 1.0, 0.5, 0],
          frequency: 200,
        },
      };

      const result = await module.generateHaptic(request);

      expect(result.success).toBe(true);
      expect(navigator.vibrate).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('Multi-Modal Integration', () => {
    beforeEach(async () => {
      const config: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: true,
        },
        vision: {
          provider: VisionProvider.OPENAI_VISION,
          enableObjectDetection: true,
          enableSceneUnderstanding: true,
        },
        haptic: {
          enabled: true,
          defaultIntensity: 0.7,
          emotionPatterns: {} as any,
        },
        crossModalLearning: true,
        synchronization: {
          maxLatency: 100,
          temporalAlignment: true,
          bufferingStrategy: 'balanced',
        },
      };

      module = await createMultiModalModule(config);

      // Mock all API responses
      mockFetch.mockImplementation(async (url) => {
        if (url.toString().includes('audio/speech')) {
          return {
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(1000),
          } as Response;
        } else if (url.toString().includes('vision')) {
          return {
            ok: true,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      description: 'Test scene',
                      objects: [{ label: 'object', position: 'center' }],
                      tags: ['test'],
                    }),
                  },
                },
              ],
            }),
          } as Response;
        }
        return { ok: false } as Response;
      });
    });

    test('should process multi-modal input', async () => {
      const input: MultiModalMessage = {
        id: 'test-message',
        agentId: 'test-agent',
        modalities: ['text', 'vision'],
        text: 'What do you see?',
        vision: {
          images: [
            {
              data: 'base64-image-data',
              mimeType: 'image/jpeg',
            },
          ],
        },
        timestamp: Date.now(),
      };

      const response = await module.processInput(input);

      expect(response.id).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.visuals).toBeDefined();
      expect(response.timestamp).toBeGreaterThan(0);

      const metrics = module.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
    });

    test('should synchronize multi-modal output', async () => {
      const input: MultiModalMessage = {
        id: 'test-sync',
        agentId: 'test-agent',
        modalities: ['text', 'voice', 'haptic'],
        text: 'Synchronized response',
        haptic: {
          pattern: HapticPattern.TAP,
        },
        timestamp: Date.now(),
      };

      const startTime = Date.now();
      const response = await module.processInput(input);
      const endTime = Date.now();

      expect(response).toBeDefined();
      expect(endTime - startTime).toBeGreaterThanOrEqual(50); // Sync delay
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration dynamically', async () => {
      const initialConfig: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: false,
        },
      };

      module = await createMultiModalModule(initialConfig);

      const updateResult = await module.updateConfig({
        voice: {
          ...initialConfig.voice!,
          enableEmotionModulation: true,
        },
      });

      expect(updateResult.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle voice synthesis errors', async () => {
      const config: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: true,
        },
      };

      module = await createMultiModalModule(config);

      mockFetch.mockRejectedValue(new Error('Network error'));

      const request: VoiceSynthesisRequest = {
        text: 'This will fail',
        agentId: 'test-agent',
      };

      await expect(module.synthesizeVoice(request)).rejects.toThrow(
        'Network error'
      );

      const metrics = module.getMetrics();
      expect(metrics.errors).toBe(1);
    });

    test('should handle vision processing errors gracefully', async () => {
      const config: MultiModalConfig = {
        vision: {
          provider: VisionProvider.OPENAI_VISION,
          enableObjectDetection: true,
        },
      };

      module = await createMultiModalModule(config);

      mockFetch.mockRejectedValue(new Error('API error'));

      const image: ImageInput = {
        data: 'invalid-data',
        mimeType: 'image/jpeg',
      };

      await expect(module.processVision(image)).rejects.toThrow('API error');
    });

    test('should handle disabled modules gracefully', async () => {
      module = await createMultiModalModule({});

      const hapticRequest: HapticFeedbackRequest = {
        pattern: HapticPattern.TAP,
      };

      const result = await module.generateHaptic(hapticRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });
  });

  describe('Performance Metrics', () => {
    test('should track latency metrics', async () => {
      const config: MultiModalConfig = {
        voice: {
          provider: VoiceProvider.OPENAI_TTS,
          characteristics: {
            voiceId: 'nova',
            language: 'en-US',
          },
          enableEmotionModulation: true,
        },
      };

      module = await createMultiModalModule(config);

      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1000),
      } as Response);

      await module.synthesizeVoice({
        text: 'Test',
        agentId: 'test',
      });

      const metrics = module.getMetrics();
      expect(metrics.voiceLatency).toBeGreaterThan(0);
    });
  });
});
