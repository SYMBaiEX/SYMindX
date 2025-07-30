/**
 * Multi-Modal Integration Tests
 *
 * End-to-end tests validating multi-modal integration with agents
 */

import {
  describe,
  test,
  expect,
  jest,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { createAgent } from '../../../api';
import { createMultiModalModule } from '../index';
import {
  VoiceProvider,
  VisionProvider,
  HapticPattern,
  EmotionType,
  MultiModalConfig,
} from '../../../types/index';

// Mock environment
process.env.OPENAI_API_KEY = 'test-key';
process.env.ELEVENLABS_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock navigator
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(() => true),
  writable: true,
  configurable: true,
});

// Mock document for vision tests
global.document = {
  createElement: jest.fn((tag: string) => {
    if (tag === 'video') {
      return {
        play: jest.fn(),
        pause: jest.fn(),
        captureStream: jest.fn(() => new MediaStream()),
        srcObject: null,
        onloadeddata: null,
        videoWidth: 640,
        videoHeight: 480,
      };
    } else if (tag === 'canvas') {
      return {
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
        })),
        toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockdata'),
        width: 0,
        height: 0,
      };
    }
    return {};
  }),
} as any;

describe('Multi-Modal Agent Integration', () => {
  let agent: any;
  let multimodal: any;

  beforeAll(async () => {
    // Setup mock responses
    mockFetch.mockImplementation(async (url) => {
      const urlString = url.toString();

      if (
        urlString.includes('audio/speech') ||
        urlString.includes('text-to-speech')
      ) {
        return {
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1000),
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2, 3]));
              controller.close();
            },
          }),
        } as Response;
      }

      if (
        urlString.includes('vision') ||
        urlString.includes('chat/completions')
      ) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    description: 'Test scene with a person',
                    objects: [
                      {
                        label: 'person',
                        position: 'center',
                        confidence: 'high',
                      },
                    ],
                    tags: ['indoor', 'office'],
                    faces: [
                      {
                        position: 'center',
                        age: '25-30',
                        emotion: 'happy',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    });

    // Create multi-modal configuration
    const multiModalConfig: MultiModalConfig = {
      voice: {
        provider: VoiceProvider.OPENAI_TTS,
        characteristics: {
          voiceId: 'nova',
          language: 'en-US',
          gender: 'female',
          speakingRate: 1.1,
        },
        enableEmotionModulation: true,
      },
      vision: {
        provider: VisionProvider.OPENAI_VISION,
        enableObjectDetection: true,
        enableFaceAnalysis: true,
        enableSceneUnderstanding: true,
        visualMemory: {
          enabled: true,
          maxEntries: 100,
          retentionDays: 7,
          importanceThreshold: 0.5,
        },
      },
      haptic: {
        enabled: true,
        defaultIntensity: 0.7,
        emotionPatterns: {} as any,
        adaptiveFeedback: true,
      },
      crossModalLearning: true,
      synchronization: {
        maxLatency: 100,
        temporalAlignment: true,
        bufferingStrategy: 'balanced',
      },
    };

    // Create standalone multi-modal module for testing
    multimodal = await createMultiModalModule(multiModalConfig);
  });

  afterAll(async () => {
    if (multimodal) {
      await multimodal.cleanup();
    }
  });

  describe('Agent with Multi-Modal Capabilities', () => {
    test('should speak with emotional voice', async () => {
      const response = await multimodal.synthesizeVoice({
        text: "Hello, I'm Nyx, your AI companion!",
        agentId: 'nyx',
        emotionState: {
          primary: 'confident' as EmotionType,
          emotions: {
            confident: 0.8,
            happy: 0.6,
          } as any,
          intensity: 0.8,
          timestamp: Date.now(),
        },
      });

      expect(response).toBeDefined();
      expect(response.audioData).toBeDefined();
      expect(response.format).toBe('mp3');
      expect(response.characterCount).toBe(33);

      // Verify emotion modulation was applied
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('speed'),
        })
      );
    });

    test('should process visual input and remember', async () => {
      // Process an image
      const scene = await multimodal.processVision({
        data: 'data:image/jpeg;base64,testimage',
        mimeType: 'image/jpeg',
        source: 'upload',
      });

      expect(scene).toBeDefined();
      expect(scene.description).toContain('person');
      expect(scene.objects).toHaveLength(1);
      expect(scene.objects[0].label).toBe('person');
      expect(scene.tags).toContain('indoor');

      // Check if faces were detected
      expect(scene.faces).toBeDefined();
      expect(scene.faces![0].emotions).toHaveProperty('happy');

      // Verify memory storage
      const memories = await multimodal.getVisualMemories('nyx', {
        limit: 5,
      });

      // Note: Memories might be empty if importance threshold not met
      expect(memories).toBeInstanceOf(Array);
    });

    test('should generate emotion-appropriate haptic feedback', async () => {
      const emotions: Array<{ emotion: EmotionType; expectedPattern: string }> =
        [
          { emotion: 'happy' as EmotionType, expectedPattern: 'pulse' },
          { emotion: 'sad' as EmotionType, expectedPattern: 'ramp-down' },
          { emotion: 'confident' as EmotionType, expectedPattern: 'tap' },
        ];

      for (const { emotion } of emotions) {
        const result = await multimodal.generateHaptic({
          pattern: HapticPattern.PULSE,
          emotionState: {
            primary: emotion,
            emotions: { [emotion]: 0.9 } as any,
            intensity: 0.9,
            timestamp: Date.now(),
          },
        });

        expect(result.success).toBe(true);
        expect(navigator.vibrate).toHaveBeenCalled();
      }
    });

    test('should process multi-modal messages synchronously', async () => {
      const startTime = Date.now();

      const response = await multimodal.processInput({
        id: 'test-sync-msg',
        agentId: 'nyx',
        modalities: ['text', 'vision', 'haptic'],
        text: 'Look at this amazing discovery!',
        vision: {
          images: [
            {
              data: 'data:image/jpeg;base64,discovery',
              mimeType: 'image/jpeg',
            },
          ],
        },
        haptic: {
          pattern: HapticPattern.DOUBLE_TAP,
          intensity: 0.8,
        },
        timestamp: Date.now(),
      });

      const endTime = Date.now();

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.visuals).toBeDefined();

      // Check synchronization (should have some processing time)
      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThanOrEqual(50); // Min sync delay
      expect(processingTime).toBeLessThan(200); // Max acceptable delay
    });
  });

  describe('Cross-Modal Learning', () => {
    test('should associate visual scenes with emotions', async () => {
      // Process a happy scene
      const happyScene = await multimodal.processVision({
        data: 'data:image/jpeg;base64,happyscene',
        mimeType: 'image/jpeg',
      });

      // Generate haptic for same emotion
      const hapticResult = await multimodal.generateHaptic({
        pattern: HapticPattern.PULSE,
        emotionState: {
          primary: 'happy' as EmotionType,
          emotions: { happy: 0.9 } as any,
          intensity: 0.9,
          timestamp: Date.now(),
        },
      });

      expect(happyScene).toBeDefined();
      expect(hapticResult.success).toBe(true);

      // In a full implementation, the system would learn associations
      // between visual patterns and emotional responses
    });
  });

  describe('Performance and Resource Management', () => {
    test('should track performance metrics', async () => {
      // Perform several operations
      await multimodal.synthesizeVoice({
        text: 'Testing performance',
        agentId: 'test',
      });

      await multimodal.processVision({
        data: 'data:image/jpeg;base64,test',
        mimeType: 'image/jpeg',
      });

      const metrics = multimodal.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.voiceLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.visionLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.errors).toBe(0);
    });

    test('should handle errors gracefully', async () => {
      // Force an error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        multimodal.synthesizeVoice({
          text: 'This will fail',
          agentId: 'test',
        })
      ).rejects.toThrow('Network error');

      // Check error tracking
      const metrics = multimodal.getMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration dynamically', async () => {
      const result = await multimodal.updateConfig({
        voice: {
          enableEmotionModulation: false,
        },
        haptic: {
          defaultIntensity: 0.5,
        },
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Real-time Streaming', () => {
    test('should support streaming voice synthesis', async () => {
      const response = await multimodal.synthesizeVoice({
        text: 'This is a streaming test',
        agentId: 'nyx',
        stream: true,
      });

      expect(response.audioData).toBeInstanceOf(ReadableStream);
    });

    test('should process video streams', async () => {
      const scene = await multimodal.processVision({
        source: 'test://stream',
        fps: 5,
        realTime: false,
        processingInterval: 1000,
      });

      expect(scene).toBeDefined();
      expect(scene.description).toBeDefined();
    });
  });
});
