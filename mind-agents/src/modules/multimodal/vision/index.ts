/**
 * Vision Processing Module
 *
 * Implements computer vision capabilities for environmental awareness,
 * object detection, and visual memory.
 */

import { runtimeLogger } from '../../../utils/logger.js';
import {
  VisionProcessingConfig,
  VisionProvider,
  ImageInput,
  VideoStreamConfig,
  SceneUnderstanding,
  VisualMemory,
  DetectedObject,
  AgentId,
  Timestamp,
} from '../../../types/index.js';
import { OpenAIVisionProvider } from './providers/openai-vision.js';
import { AnthropicVisionProvider } from './providers/anthropic-vision.js';
import { GoogleVisionProvider } from './providers/google-vision.js';
import { BaseVisionProvider } from './base-provider.js';
import { VisualMemoryStore } from './visual-memory-store.js';

/**
 * Vision processing module implementation
 */
export class VisionProcessingModule {
  private config: VisionProcessingConfig;
  private provider: BaseVisionProvider;
  private memoryStore: VisualMemoryStore | null = null;
  private videoStreams: Map<string, MediaStream> = new Map();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VisionProcessingConfig) {
    this.config = config;
    this.provider = this.createProvider(config.provider);

    // Initialize visual memory if enabled
    if (config.visualMemory?.enabled) {
      this.memoryStore = new VisualMemoryStore(config.visualMemory);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Initialize the provider
      await this.provider.initialize();

      // Initialize memory store if enabled
      if (this.memoryStore) {
        await this.memoryStore.initialize();
      }

      runtimeLogger.info('Vision processing module initialized', {
        provider: this.config.provider,
        features: {
          objectDetection: this.config.enableObjectDetection,
          faceAnalysis: this.config.enableFaceAnalysis,
          textRecognition: this.config.enableTextRecognition,
          sceneUnderstanding: this.config.enableSceneUnderstanding,
          visualMemory: !!this.memoryStore,
        },
      });
    } catch (error) {
      runtimeLogger.error('Failed to initialize vision processing', { error });
      throw error;
    }
  }

  async processInput(
    input: ImageInput | VideoStreamConfig
  ): Promise<SceneUnderstanding> {
    try {
      if (this.isVideoStream(input)) {
        return this.processVideoStream(input as VideoStreamConfig);
      } else {
        return this.processImage(input as ImageInput);
      }
    } catch (error) {
      runtimeLogger.error('Vision processing failed', { error });
      throw error;
    }
  }

  async processImage(image: ImageInput): Promise<SceneUnderstanding> {
    const startTime = Date.now();

    try {
      // Process through provider
      let scene = await this.provider.analyzeImage(image, {
        enableObjectDetection: this.config.enableObjectDetection,
        enableFaceAnalysis: this.config.enableFaceAnalysis,
        enableTextRecognition: this.config.enableTextRecognition,
        enableSceneUnderstanding: this.config.enableSceneUnderstanding,
      });

      // Post-process results
      scene = await this.postProcessScene(scene, image);

      runtimeLogger.debug('Image processed successfully', {
        duration: Date.now() - startTime,
        objectCount: scene.objects.length,
        hasFaces: !!scene.faces && scene.faces.length > 0,
        hasText: !!scene.text && scene.text.length > 0,
      });

      return scene;
    } catch (error) {
      runtimeLogger.error('Image processing failed', { error });
      throw error;
    }
  }

  async processVideoStream(
    config: VideoStreamConfig
  ): Promise<SceneUnderstanding> {
    const streamId = this.generateStreamId();

    try {
      // Get or create media stream
      const stream =
        typeof config.source === 'string'
          ? await this.createStreamFromUrl(config.source)
          : config.source;

      this.videoStreams.set(streamId, stream);

      // Setup processing interval
      const interval = config.processingInterval || 1000; // Default 1 second
      let latestScene: SceneUnderstanding | null = null;

      const processFrame = async () => {
        try {
          const frame = await this.captureFrame(stream);
          latestScene = await this.processImage(frame);

          // Track objects across frames
          if (latestScene.objects.length > 0) {
            latestScene = this.trackObjects(latestScene, streamId);
          }
        } catch (error) {
          runtimeLogger.error('Frame processing error', { error, streamId });
        }
      };

      // Start processing
      if (config.realTime) {
        // Use requestAnimationFrame for real-time processing
        const animate = () => {
          processFrame();
          if (this.videoStreams.has(streamId)) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      } else {
        // Use interval for periodic processing
        const intervalId = setInterval(processFrame, interval);
        this.processingIntervals.set(streamId, intervalId);
      }

      // Wait for first frame to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      return (
        latestScene || {
          description: 'Video stream processing started',
          objects: [],
          tags: ['video', 'streaming'],
        }
      );
    } catch (error) {
      runtimeLogger.error('Video stream processing failed', { error });
      throw error;
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
    if (!this.memoryStore) {
      return [];
    }

    return this.memoryStore.query(agentId, query);
  }

  async storeVisualMemory(
    agentId: AgentId,
    scene: SceneUnderstanding,
    importance: number = 0.5,
    context?: any
  ): Promise<void> {
    if (!this.memoryStore) {
      return;
    }

    const memory: VisualMemory = {
      id: this.generateMemoryId(),
      agentId,
      scene,
      timestamp: Date.now(),
      importance,
      context,
    };

    await this.memoryStore.store(memory);
  }

  async updateConfig(config: Partial<VisionProcessingConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    // Reinitialize provider if changed
    if (config.provider && config.provider !== this.provider.getType()) {
      const oldProvider = this.provider;
      this.provider = this.createProvider(config.provider);
      await this.provider.initialize();
      await oldProvider.cleanup();
    }

    // Update memory store config if provided
    if (config.visualMemory && this.memoryStore) {
      await this.memoryStore.updateConfig(config.visualMemory);
    }
  }

  async cleanup(): Promise<void> {
    // Stop all video streams
    for (const [streamId, stream] of this.videoStreams) {
      stream.getTracks().forEach((track) => track.stop());
      this.videoStreams.delete(streamId);
    }

    // Clear all processing intervals
    for (const [streamId, intervalId] of this.processingIntervals) {
      clearInterval(intervalId);
      this.processingIntervals.delete(streamId);
    }

    // Cleanup provider
    await this.provider.cleanup();

    // Cleanup memory store
    if (this.memoryStore) {
      await this.memoryStore.cleanup();
    }
  }

  // Private helper methods

  private createProvider(type: VisionProvider): BaseVisionProvider {
    switch (type) {
      case VisionProvider.OPENAI_VISION:
        return new OpenAIVisionProvider(this.config);
      case VisionProvider.ANTHROPIC_VISION:
        return new AnthropicVisionProvider(this.config);
      case VisionProvider.GOOGLE_VISION:
        return new GoogleVisionProvider(this.config);
      default:
        throw new Error(`Unsupported vision provider: ${type}`);
    }
  }

  private isVideoStream(input: any): boolean {
    return 'source' in input && ('fps' in input || 'resolution' in input);
  }

  private async createStreamFromUrl(url: string): Promise<MediaStream> {
    // Create video element
    const video = document.createElement('video');
    video.src = url;
    video.autoplay = true;
    video.muted = true;

    // Wait for video to load
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
    });

    // Capture stream from video
    // @ts-ignore - captureStream is not in TypeScript types
    return video.captureStream();
  }

  private async captureFrame(stream: MediaStream): Promise<ImageInput> {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Wait for video to have content
    await new Promise((resolve) => {
      video.onloadeddata = resolve;
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    return {
      data: dataUrl,
      mimeType: 'image/jpeg',
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
      source: 'stream',
      timestamp: Date.now(),
    };
  }

  private async postProcessScene(
    scene: SceneUnderstanding,
    input: ImageInput
  ): Promise<SceneUnderstanding> {
    // Store in visual memory if enabled and important enough
    if (this.memoryStore && this.config.visualMemory) {
      const importance = this.calculateImportance(scene);

      if (importance >= (this.config.visualMemory.importanceThreshold || 0.5)) {
        const agentId = 'system'; // TODO: Get from context
        await this.storeVisualMemory(agentId, scene, importance);
      }
    }

    // Add timestamp if not present
    if (!scene.timestamp) {
      scene.timestamp = input.timestamp || Date.now();
    }

    return scene;
  }

  private calculateImportance(scene: SceneUnderstanding): number {
    let importance = 0.0;

    // More objects = more important
    importance += Math.min(scene.objects.length * 0.1, 0.3);

    // Faces are important
    if (scene.faces && scene.faces.length > 0) {
      importance += 0.3;
    }

    // Text is important
    if (scene.text && scene.text.length > 0) {
      importance += 0.2;
    }

    // High confidence objects are important
    const highConfidenceObjects = scene.objects.filter(
      (obj) => obj.confidence > 0.8
    );
    importance += Math.min(highConfidenceObjects.length * 0.05, 0.2);

    return Math.min(importance, 1.0);
  }

  private trackObjects(
    scene: SceneUnderstanding,
    streamId: string
  ): SceneUnderstanding {
    // Simple object tracking by maintaining IDs across frames
    // In a real implementation, this would use more sophisticated tracking

    const trackedObjects = scene.objects.map((obj, index) => ({
      ...obj,
      trackingId: obj.trackingId || `${streamId}-${Date.now()}-${index}`,
    }));

    return {
      ...scene,
      objects: trackedObjects,
    };
  }

  private generateStreamId(): string {
    return `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMemoryId(): string {
    return `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
