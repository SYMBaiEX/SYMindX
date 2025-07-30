/**
 * Base Vision Provider
 *
 * Abstract base class for vision processing providers
 */

import {
  VisionProvider,
  VisionProcessingConfig,
  ImageInput,
  SceneUnderstanding,
  DetectedObject,
} from '../../../types/index.js';

export interface VisionAnalysisOptions {
  enableObjectDetection?: boolean;
  enableFaceAnalysis?: boolean;
  enableTextRecognition?: boolean;
  enableSceneUnderstanding?: boolean;
  maxResults?: number;
}

/**
 * Abstract base class for vision providers
 */
export abstract class BaseVisionProvider {
  protected config: VisionProcessingConfig;

  constructor(config: VisionProcessingConfig) {
    this.config = config;
  }

  /**
   * Initialize the provider
   */
  abstract initialize(): Promise<void>;

  /**
   * Analyze an image
   */
  abstract analyzeImage(
    image: ImageInput,
    options: VisionAnalysisOptions
  ): Promise<SceneUnderstanding>;

  /**
   * Get provider type
   */
  abstract getType(): VisionProvider;

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
    return ['basic-analysis'];
  }

  /**
   * Convert image to format required by provider
   */
  protected async prepareImage(image: ImageInput): Promise<string> {
    if (typeof image.data === 'string') {
      // Already base64 or URL
      return image.data;
    }

    // Convert ArrayBuffer to base64
    const uint8Array = new Uint8Array(image.data);
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  /**
   * Normalize confidence scores to 0-1 range
   */
  protected normalizeConfidence(
    score: number,
    min: number = 0,
    max: number = 100
  ): number {
    return (score - min) / (max - min);
  }

  /**
   * Filter objects by confidence threshold
   */
  protected filterByConfidence(
    objects: DetectedObject[],
    threshold: number = 0.5
  ): DetectedObject[] {
    return objects.filter((obj) => obj.confidence >= threshold);
  }

  /**
   * Merge overlapping bounding boxes
   */
  protected mergeOverlappingBoxes(
    objects: DetectedObject[],
    iouThreshold: number = 0.5
  ): DetectedObject[] {
    const merged: DetectedObject[] = [];
    const used = new Set<number>();

    for (let i = 0; i < objects.length; i++) {
      if (used.has(i)) continue;

      const current = objects[i];
      const group = [current];
      used.add(i);

      // Find all overlapping boxes
      for (let j = i + 1; j < objects.length; j++) {
        if (used.has(j)) continue;

        const iou = this.calculateIoU(
          current.boundingBox,
          objects[j].boundingBox
        );
        if (iou > iouThreshold && current.label === objects[j].label) {
          group.push(objects[j]);
          used.add(j);
        }
      }

      // Merge the group
      if (group.length > 1) {
        merged.push(this.mergeObjects(group));
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Calculate Intersection over Union for two bounding boxes
   */
  private calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 < x1 || y2 < y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return intersection / union;
  }

  /**
   * Merge multiple detected objects into one
   */
  private mergeObjects(objects: DetectedObject[]): DetectedObject {
    // Calculate average bounding box
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;
    let totalConfidence = 0;

    for (const obj of objects) {
      minX = Math.min(minX, obj.boundingBox.x);
      minY = Math.min(minY, obj.boundingBox.y);
      maxX = Math.max(maxX, obj.boundingBox.x + obj.boundingBox.width);
      maxY = Math.max(maxY, obj.boundingBox.y + obj.boundingBox.height);
      totalConfidence += obj.confidence;
    }

    return {
      label: objects[0].label,
      confidence: totalConfidence / objects.length,
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
      attributes: objects[0].attributes,
    };
  }

  /**
   * Generate scene description from detected objects
   */
  protected generateSceneDescription(objects: DetectedObject[]): string {
    if (objects.length === 0) {
      return 'An empty or unclear scene';
    }

    // Count objects by label
    const counts = new Map<string, number>();
    for (const obj of objects) {
      counts.set(obj.label, (counts.get(obj.label) || 0) + 1);
    }

    // Build description
    const parts: string[] = [];
    for (const [label, count] of counts) {
      if (count === 1) {
        parts.push(`a ${label}`);
      } else {
        parts.push(`${count} ${label}s`);
      }
    }

    if (parts.length === 1) {
      return `A scene containing ${parts[0]}`;
    } else if (parts.length === 2) {
      return `A scene containing ${parts[0]} and ${parts[1]}`;
    } else {
      const last = parts.pop();
      return `A scene containing ${parts.join(', ')}, and ${last}`;
    }
  }
}
