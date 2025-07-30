/**
 * Google Vision Provider
 *
 * Integration with Google Cloud Vision API
 */

import { BaseVisionProvider, VisionAnalysisOptions } from '../base-provider.js';
import {
  VisionProvider,
  ImageInput,
  SceneUnderstanding,
  DetectedObject,
} from '../../../../types/index.js';
import { runtimeLogger } from '../../../../utils/logger.js';

interface GoogleVisionResponse {
  labelAnnotations?: Array<{
    description: string;
    score: number;
    topicality: number;
  }>;
  localizedObjectAnnotations?: Array<{
    name: string;
    score: number;
    boundingPoly: {
      normalizedVertices: Array<{ x: number; y: number }>;
    };
  }>;
  textAnnotations?: Array<{
    description: string;
    boundingPoly: {
      vertices: Array<{ x: number; y: number }>;
    };
  }>;
  faceAnnotations?: Array<{
    boundingPoly: {
      vertices: Array<{ x: number; y: number }>;
    };
    joyLikelihood: string;
    sorrowLikelihood: string;
    angerLikelihood: string;
    surpriseLikelihood: string;
    detectionConfidence: number;
  }>;
  safeSearchAnnotation?: {
    adult: string;
    violence: string;
  };
}

/**
 * Google Vision API provider implementation
 */
export class GoogleVisionProvider extends BaseVisionProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://vision.googleapis.com/v1/images:annotate';

  async initialize(): Promise<void> {
    this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!this.apiKey) {
      throw new Error('GOOGLE_CLOUD_API_KEY environment variable not set');
    }

    runtimeLogger.info('Google Vision provider initialized');
  }

  async analyzeImage(
    image: ImageInput,
    options: VisionAnalysisOptions
  ): Promise<SceneUnderstanding> {
    try {
      const imageData = await this.prepareImage(image);
      const features = this.buildFeatures(options);

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageData.replace(/^data:.*?;base64,/, ''),
              },
              features: features,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Google Vision API error: ${response.status} - ${error}`
        );
      }

      const data = await response.json();
      const visionResponse = data.responses[0] as GoogleVisionResponse;

      if (visionResponse.error) {
        throw new Error(
          `Vision API error: ${JSON.stringify(visionResponse.error)}`
        );
      }

      return this.convertToSceneUnderstanding(visionResponse, options);
    } catch (error) {
      runtimeLogger.error('Google Vision analysis failed', { error });
      throw error;
    }
  }

  getType(): VisionProvider {
    return VisionProvider.GOOGLE_VISION;
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  protected getSupportedFeatures(): string[] {
    return [
      'label-detection',
      'object-localization',
      'text-detection',
      'face-detection',
      'landmark-detection',
      'logo-detection',
      'safe-search',
      'web-detection',
      'document-text-detection',
    ];
  }

  // Private helper methods

  private buildFeatures(
    options: VisionAnalysisOptions
  ): Array<{ type: string; maxResults?: number }> {
    const features: Array<{ type: string; maxResults?: number }> = [];
    const maxResults = options.maxResults || 20;

    // Always include label detection for scene understanding
    features.push({ type: 'LABEL_DETECTION', maxResults });

    if (options.enableObjectDetection) {
      features.push({ type: 'OBJECT_LOCALIZATION', maxResults });
    }

    if (options.enableTextRecognition) {
      features.push({ type: 'TEXT_DETECTION', maxResults });
      features.push({ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 });
    }

    if (options.enableFaceAnalysis) {
      features.push({ type: 'FACE_DETECTION', maxResults });
    }

    // Additional useful features
    features.push({ type: 'SAFE_SEARCH_DETECTION' });
    features.push({ type: 'IMAGE_PROPERTIES' });

    return features;
  }

  private convertToSceneUnderstanding(
    response: GoogleVisionResponse,
    options: VisionAnalysisOptions
  ): SceneUnderstanding {
    const scene: SceneUnderstanding = {
      description: this.generateDescription(response),
      objects: [],
      tags: [],
    };

    // Extract tags from labels
    if (response.labelAnnotations) {
      scene.tags = response.labelAnnotations
        .filter((label) => label.score > 0.7)
        .map((label) => label.description.toLowerCase());
    }

    // Convert localized objects
    if (response.localizedObjectAnnotations && options.enableObjectDetection) {
      scene.objects = response.localizedObjectAnnotations.map((obj) =>
        this.convertToDetectedObject(obj)
      );
    }

    // Convert text annotations
    if (
      response.textAnnotations &&
      options.enableTextRecognition &&
      response.textAnnotations.length > 1
    ) {
      // Skip the first annotation which contains all text
      scene.text = response.textAnnotations.slice(1).map((text) => ({
        content: text.description,
        boundingBox: this.convertBoundingPoly(text.boundingPoly),
        confidence: 0.9, // Google doesn't provide confidence for text
      }));
    }

    // Convert face annotations
    if (response.faceAnnotations && options.enableFaceAnalysis) {
      scene.faces = response.faceAnnotations.map((face) => ({
        boundingBox: this.convertBoundingPoly(face.boundingPoly),
        emotions: this.convertLikelihoodToEmotions(face),
        confidence: face.detectionConfidence,
      }));
    }

    // Add safety information to tags if concerning
    if (response.safeSearchAnnotation) {
      if (this.isLikelihoodHigh(response.safeSearchAnnotation.adult)) {
        scene.tags.push('adult-content');
      }
      if (this.isLikelihoodHigh(response.safeSearchAnnotation.violence)) {
        scene.tags.push('violence');
      }
    }

    return scene;
  }

  private generateDescription(response: GoogleVisionResponse): string {
    const parts: string[] = [];

    // Use top labels to create a description
    if (response.labelAnnotations && response.labelAnnotations.length > 0) {
      const topLabels = response.labelAnnotations
        .slice(0, 5)
        .map((label) => label.description.toLowerCase());

      parts.push(`A scene containing ${topLabels.join(', ')}`);
    }

    // Add object information
    if (
      response.localizedObjectAnnotations &&
      response.localizedObjectAnnotations.length > 0
    ) {
      const objectCounts = new Map<string, number>();
      response.localizedObjectAnnotations.forEach((obj) => {
        objectCounts.set(obj.name, (objectCounts.get(obj.name) || 0) + 1);
      });

      const objectDescriptions = Array.from(objectCounts.entries()).map(
        ([name, count]) => (count > 1 ? `${count} ${name}s` : `a ${name}`)
      );

      parts.push(`with ${objectDescriptions.join(', ')}`);
    }

    return parts.join(' ') || 'An image';
  }

  private convertToDetectedObject(obj: any): DetectedObject {
    return {
      label: obj.name.toLowerCase(),
      confidence: obj.score,
      boundingBox: this.convertNormalizedBoundingPoly(obj.boundingPoly),
    };
  }

  private convertBoundingPoly(boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  }): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (!boundingPoly.vertices || boundingPoly.vertices.length < 4) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const xs = boundingPoly.vertices.map((v) => v.x || 0);
    const ys = boundingPoly.vertices.map((v) => v.y || 0);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private convertNormalizedBoundingPoly(boundingPoly: {
    normalizedVertices: Array<{ x: number; y: number }>;
  }): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (
      !boundingPoly.normalizedVertices ||
      boundingPoly.normalizedVertices.length < 4
    ) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const xs = boundingPoly.normalizedVertices.map((v) => v.x * 100);
    const ys = boundingPoly.normalizedVertices.map((v) => v.y * 100);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private convertLikelihoodToEmotions(face: any): Record<string, number> {
    const emotions: Record<string, number> = {};

    emotions.joy = this.likelihoodToScore(face.joyLikelihood);
    emotions.sorrow = this.likelihoodToScore(face.sorrowLikelihood);
    emotions.anger = this.likelihoodToScore(face.angerLikelihood);
    emotions.surprise = this.likelihoodToScore(face.surpriseLikelihood);

    return emotions;
  }

  private likelihoodToScore(likelihood: string): number {
    switch (likelihood) {
      case 'VERY_LIKELY':
        return 0.9;
      case 'LIKELY':
        return 0.7;
      case 'POSSIBLE':
        return 0.5;
      case 'UNLIKELY':
        return 0.3;
      case 'VERY_UNLIKELY':
        return 0.1;
      default:
        return 0;
    }
  }

  private isLikelihoodHigh(likelihood: string): boolean {
    return likelihood === 'LIKELY' || likelihood === 'VERY_LIKELY';
  }
}
