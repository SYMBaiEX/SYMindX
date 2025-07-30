/**
 * Multi-Modal Types for SYMindX
 *
 * Comprehensive type definitions for voice synthesis, vision processing,
 * haptic feedback, and multi-modal integration capabilities.
 */

import type { EmotionType, EmotionState } from './emotion';
import type { AgentId, OperationResult, Timestamp } from './helpers';
import type { Metadata } from './common';

// ============================================================================
// Voice Synthesis Types
// ============================================================================

/**
 * Voice synthesis provider options for 2025
 */
export enum VoiceProvider {
  ELEVENLABS = 'elevenlabs',
  GOOGLE_CLOUD = 'google-cloud',
  AZURE_SPEECH = 'azure-speech',
  AMAZON_POLLY = 'amazon-polly',
  OPENAI_TTS = 'openai-tts',
  PLAYHT = 'playht',
  MURF = 'murf',
  WELLSAID = 'wellsaid',
}

/**
 * Voice characteristics configuration
 */
export interface VoiceCharacteristics {
  /** Voice ID from the provider */
  voiceId: string;
  /** Provider-specific voice name */
  voiceName?: string;
  /** Language code (e.g., 'en-US') */
  language: string;
  /** Voice gender */
  gender?: 'male' | 'female' | 'neutral';
  /** Age group */
  ageGroup?: 'child' | 'young-adult' | 'adult' | 'senior';
  /** Speaking rate (0.5 to 2.0) */
  speakingRate?: number;
  /** Pitch adjustment (-20 to 20 semitones) */
  pitch?: number;
  /** Voice style tags */
  styles?: string[];
}

/**
 * Emotion-based voice modulation parameters
 */
export interface VoiceEmotionModulation {
  /** Current emotion state */
  emotion: EmotionType;
  /** Emotion intensity (0-1) */
  intensity: number;
  /** Voice parameter adjustments */
  adjustments: {
    /** Pitch variation in semitones */
    pitchVariation: number;
    /** Speaking rate multiplier */
    rateMultiplier: number;
    /** Volume adjustment in dB */
    volumeAdjustment: number;
    /** Breathiness level (0-1) */
    breathiness?: number;
    /** Tremor level (0-1) */
    tremor?: number;
    /** Emphasis patterns */
    emphasis?: string[];
  };
}

/**
 * Voice synthesis configuration for an agent
 */
export interface VoiceSynthesisConfig {
  /** Selected provider */
  provider: VoiceProvider;
  /** Voice characteristics */
  characteristics: VoiceCharacteristics;
  /** Enable emotion-based modulation */
  enableEmotionModulation: boolean;
  /** Custom emotion modulation mappings */
  emotionModulations?: Record<EmotionType, Partial<VoiceEmotionModulation>>;
  /** Audio output format */
  outputFormat?: 'mp3' | 'wav' | 'ogg' | 'pcm';
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Enable voice cloning (if supported) */
  enableVoiceCloning?: boolean;
  /** Voice clone source URL */
  voiceCloneSource?: string;
}

/**
 * Voice synthesis request
 */
export interface VoiceSynthesisRequest {
  /** Text to synthesize */
  text: string;
  /** Agent ID making the request */
  agentId: AgentId;
  /** Current emotion state */
  emotionState?: EmotionState;
  /** SSML markup enabled */
  ssml?: boolean;
  /** Stream the audio output */
  stream?: boolean;
  /** Custom voice parameters override */
  voiceOverrides?: Partial<VoiceCharacteristics>;
  /** Metadata for tracking */
  metadata?: Metadata;
}

/**
 * Voice synthesis response
 */
export interface VoiceSynthesisResponse {
  /** Synthesized audio data */
  audioData: ArrayBuffer | ReadableStream<Uint8Array>;
  /** Audio format */
  format: string;
  /** Duration in milliseconds */
  duration: number;
  /** Character count processed */
  characterCount: number;
  /** Provider-specific response data */
  providerData?: Record<string, unknown>;
  /** Synthesis timestamp */
  timestamp: Timestamp;
}

// ============================================================================
// Vision Processing Types
// ============================================================================

/**
 * Vision processing provider options
 */
export enum VisionProvider {
  OPENAI_VISION = 'openai-vision',
  ANTHROPIC_VISION = 'anthropic-vision',
  GOOGLE_VISION = 'google-vision',
  AZURE_VISION = 'azure-vision',
  AWS_REKOGNITION = 'aws-rekognition',
  CUSTOM_MODEL = 'custom-model',
}

/**
 * Image input format
 */
export interface ImageInput {
  /** Image data as base64 or URL */
  data: string | ArrayBuffer;
  /** MIME type */
  mimeType: string;
  /** Image dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Source information */
  source?: 'camera' | 'upload' | 'stream' | 'generated';
  /** Timestamp when captured */
  timestamp?: Timestamp;
}

/**
 * Video stream configuration
 */
export interface VideoStreamConfig {
  /** Stream source URL or MediaStream */
  source: string | MediaStream;
  /** Frames per second to process */
  fps?: number;
  /** Resolution to process at */
  resolution?: {
    width: number;
    height: number;
  };
  /** Enable real-time processing */
  realTime?: boolean;
  /** Processing interval in milliseconds */
  processingInterval?: number;
}

/**
 * Object detection result
 */
export interface DetectedObject {
  /** Object class/label */
  label: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Bounding box coordinates */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Additional attributes */
  attributes?: Record<string, unknown>;
  /** Unique tracking ID for video */
  trackingId?: string;
}

/**
 * Scene understanding result
 */
export interface SceneUnderstanding {
  /** Overall scene description */
  description: string;
  /** Detected objects */
  objects: DetectedObject[];
  /** Scene categories/tags */
  tags: string[];
  /** Detected text (OCR) */
  text?: Array<{
    content: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    confidence: number;
  }>;
  /** Facial analysis results */
  faces?: Array<{
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    emotions?: Record<string, number>;
    age?: number;
    gender?: string;
    landmarks?: Record<string, { x: number; y: number }>;
  }>;
  /** Color analysis */
  colors?: {
    dominant: string[];
    palette: string[];
  };
}

/**
 * Visual memory entry
 */
export interface VisualMemory {
  /** Unique memory ID */
  id: string;
  /** Agent ID */
  agentId: AgentId;
  /** Image thumbnail or hash */
  thumbnail?: string;
  /** Scene understanding data */
  scene: SceneUnderstanding;
  /** Contextual information */
  context?: {
    location?: string;
    activity?: string;
    participants?: string[];
  };
  /** Timestamp */
  timestamp: Timestamp;
  /** Importance score */
  importance: number;
  /** Associated emotions */
  emotions?: EmotionState;
  /** Related memory IDs */
  relatedMemories?: string[];
}

/**
 * Vision processing configuration
 */
export interface VisionProcessingConfig {
  /** Selected provider */
  provider: VisionProvider;
  /** Enable object detection */
  enableObjectDetection: boolean;
  /** Enable face analysis */
  enableFaceAnalysis: boolean;
  /** Enable text recognition (OCR) */
  enableTextRecognition: boolean;
  /** Enable scene understanding */
  enableSceneUnderstanding: boolean;
  /** Visual memory configuration */
  visualMemory?: {
    enabled: boolean;
    maxEntries: number;
    retentionDays: number;
    importanceThreshold: number;
  };
  /** Custom model endpoint */
  customModelEndpoint?: string;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
}

// ============================================================================
// Haptic Feedback Types
// ============================================================================

/**
 * Haptic feedback pattern types
 */
export enum HapticPattern {
  /** Single tap */
  TAP = 'tap',
  /** Double tap */
  DOUBLE_TAP = 'double-tap',
  /** Long press */
  LONG_PRESS = 'long-press',
  /** Continuous vibration */
  CONTINUOUS = 'continuous',
  /** Pulsing pattern */
  PULSE = 'pulse',
  /** Rising intensity */
  RAMP_UP = 'ramp-up',
  /** Falling intensity */
  RAMP_DOWN = 'ramp-down',
  /** Custom waveform */
  CUSTOM = 'custom',
}

/**
 * Haptic feedback intensity levels
 */
export enum HapticIntensity {
  LIGHT = 0.25,
  MEDIUM = 0.5,
  STRONG = 0.75,
  MAX = 1.0,
}

/**
 * Haptic waveform definition
 */
export interface HapticWaveform {
  /** Duration in milliseconds */
  duration: number;
  /** Intensity curve (0-1) */
  intensityCurve: number[];
  /** Frequency in Hz (optional) */
  frequency?: number;
  /** Attack time in ms */
  attack?: number;
  /** Decay time in ms */
  decay?: number;
  /** Sustain level (0-1) */
  sustain?: number;
  /** Release time in ms */
  release?: number;
}

/**
 * Emotion-based haptic pattern
 */
export interface EmotionHapticPattern {
  /** Associated emotion */
  emotion: EmotionType;
  /** Base pattern */
  pattern: HapticPattern;
  /** Intensity modifier */
  intensityModifier: number;
  /** Pattern variations */
  variations?: HapticWaveform[];
  /** Trigger conditions */
  triggers?: string[];
}

/**
 * Haptic feedback configuration
 */
export interface HapticFeedbackConfig {
  /** Enable haptic feedback */
  enabled: boolean;
  /** Default intensity */
  defaultIntensity: HapticIntensity;
  /** Emotion-based patterns */
  emotionPatterns: Record<EmotionType, EmotionHapticPattern>;
  /** Enable adaptive feedback */
  adaptiveFeedback?: boolean;
  /** User preference learning */
  learnUserPreferences?: boolean;
  /** Device capabilities */
  deviceCapabilities?: {
    supportsVibration: boolean;
    supportsForceTouch: boolean;
    supportsUltrasound: boolean;
    maxFrequency?: number;
    maxIntensity?: number;
  };
}

/**
 * Haptic feedback request
 */
export interface HapticFeedbackRequest {
  /** Pattern to play */
  pattern: HapticPattern | HapticWaveform;
  /** Intensity override */
  intensity?: number;
  /** Duration override */
  duration?: number;
  /** Target device/controller */
  targetDevice?: string;
  /** Associated emotion state */
  emotionState?: EmotionState;
  /** Spatial information for VR/AR */
  spatial?: {
    position: { x: number; y: number; z: number };
    direction?: { x: number; y: number; z: number };
  };
}

// ============================================================================
// Multi-Modal Integration Types
// ============================================================================

/**
 * Multi-modal input types
 */
export enum ModalityType {
  TEXT = 'text',
  VOICE = 'voice',
  VISION = 'vision',
  HAPTIC = 'haptic',
  GESTURE = 'gesture',
  BIOMETRIC = 'biometric',
}

/**
 * Multi-modal message
 */
export interface MultiModalMessage {
  /** Message ID */
  id: string;
  /** Agent ID */
  agentId: AgentId;
  /** Modalities present */
  modalities: ModalityType[];
  /** Text content */
  text?: string;
  /** Voice data */
  voice?: {
    audioData: ArrayBuffer;
    transcript?: string;
    emotion?: EmotionType;
  };
  /** Visual data */
  vision?: {
    images?: ImageInput[];
    scene?: SceneUnderstanding;
  };
  /** Haptic feedback */
  haptic?: HapticFeedbackRequest;
  /** Timestamp */
  timestamp: Timestamp;
  /** Context metadata */
  metadata?: Metadata;
}

/**
 * Multi-modal response
 */
export interface MultiModalResponse {
  /** Response ID */
  id: string;
  /** Text response */
  text?: string;
  /** Voice synthesis data */
  voice?: VoiceSynthesisResponse;
  /** Visual elements to display */
  visuals?: Array<{
    type: 'image' | 'video' | 'animation' | 'chart';
    data: string | ArrayBuffer;
    metadata?: Metadata;
  }>;
  /** Haptic feedback patterns */
  haptics?: HapticFeedbackRequest[];
  /** Emotion state */
  emotionState?: EmotionState;
  /** Response timestamp */
  timestamp: Timestamp;
}

/**
 * Multi-modal module configuration
 */
export interface MultiModalConfig {
  /** Voice synthesis configuration */
  voice?: VoiceSynthesisConfig;
  /** Vision processing configuration */
  vision?: VisionProcessingConfig;
  /** Haptic feedback configuration */
  haptic?: HapticFeedbackConfig;
  /** Enable cross-modal learning */
  crossModalLearning?: boolean;
  /** Synchronization settings */
  synchronization?: {
    /** Max latency between modalities in ms */
    maxLatency: number;
    /** Enable temporal alignment */
    temporalAlignment: boolean;
    /** Buffering strategy */
    bufferingStrategy: 'aggressive' | 'balanced' | 'minimal';
  };
  /** WebRTC configuration for real-time communication */
  webrtc?: {
    enabled: boolean;
    stunServers: string[];
    turnServers?: Array<{
      url: string;
      username: string;
      credential: string;
    }>;
  };
}

/**
 * Multi-modal module interface
 */
export interface MultiModalModule {
  /** Initialize the module */
  initialize(config: MultiModalConfig): Promise<OperationResult>;

  /** Process multi-modal input */
  processInput(input: MultiModalMessage): Promise<MultiModalResponse>;

  /** Synthesize voice */
  synthesizeVoice(
    request: VoiceSynthesisRequest
  ): Promise<VoiceSynthesisResponse>;

  /** Process vision input */
  processVision(
    input: ImageInput | VideoStreamConfig
  ): Promise<SceneUnderstanding>;

  /** Generate haptic feedback */
  generateHaptic(request: HapticFeedbackRequest): Promise<OperationResult>;

  /** Get visual memories */
  getVisualMemories(
    agentId: AgentId,
    query?: {
      startTime?: Timestamp;
      endTime?: Timestamp;
      limit?: number;
      minImportance?: number;
    }
  ): Promise<VisualMemory[]>;

  /** Update configuration */
  updateConfig(config: Partial<MultiModalConfig>): Promise<OperationResult>;

  /** Get performance metrics */
  getMetrics(): {
    voiceLatency: number;
    visionLatency: number;
    hapticLatency: number;
    totalProcessed: number;
    errors: number;
  };

  /** Cleanup resources */
  cleanup(): Promise<OperationResult>;
}

/**
 * Factory function type for multi-modal modules
 */
export type MultiModalModuleFactory = (
  config?: MultiModalConfig
) => Promise<MultiModalModule>;
