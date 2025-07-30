/**
 * OpenAI Vision Provider
 *
 * Integration with OpenAI's GPT-4 Vision for image understanding
 */

import { BaseVisionProvider, VisionAnalysisOptions } from '../base-provider.js';
import {
  VisionProvider,
  ImageInput,
  SceneUnderstanding,
  DetectedObject,
} from '../../../../types/index.js';
import { runtimeLogger } from '../../../../utils/logger.js';

/**
 * OpenAI Vision provider implementation
 */
export class OpenAIVisionProvider extends BaseVisionProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4-turbo';

  async initialize(): Promise<void> {
    this.apiKey = process.env.OPENAI_API_KEY;

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    runtimeLogger.info('OpenAI Vision provider initialized', {
      model: this.model,
    });
  }

  async analyzeImage(
    image: ImageInput,
    options: VisionAnalysisOptions
  ): Promise<SceneUnderstanding> {
    try {
      const imageData = await this.prepareImage(image);
      const prompt = this.buildAnalysisPrompt(options);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData.startsWith('data:')
                      ? imageData
                      : `data:${image.mimeType};base64,${imageData}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `OpenAI Vision API error: ${response.status} - ${error}`
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse the structured response
      return this.parseAnalysisResponse(content, options);
    } catch (error) {
      runtimeLogger.error('OpenAI Vision analysis failed', { error });
      throw error;
    }
  }

  getType(): VisionProvider {
    return VisionProvider.OPENAI_VISION;
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  protected getSupportedFeatures(): string[] {
    return [
      'object-detection',
      'scene-understanding',
      'text-recognition',
      'face-analysis',
      'detailed-description',
      'question-answering',
    ];
  }

  // Private helper methods

  private buildAnalysisPrompt(options: VisionAnalysisOptions): string {
    const tasks: string[] = [];

    if (options.enableSceneUnderstanding) {
      tasks.push('Provide a detailed description of the scene');
    }

    if (options.enableObjectDetection) {
      tasks.push(
        'List all objects you can identify with their approximate positions (top-left, center, bottom-right, etc.)'
      );
    }

    if (options.enableFaceAnalysis) {
      tasks.push(
        'Describe any people or faces visible, including approximate age, gender, and emotions if discernible'
      );
    }

    if (options.enableTextRecognition) {
      tasks.push('Transcribe any text visible in the image');
    }

    return `Analyze this image and provide a structured response in JSON format. ${tasks.join('. ')}.

Return the response in this exact JSON structure:
{
  "description": "Overall scene description",
  "objects": [
    {
      "label": "object name",
      "position": "position description",
      "confidence": "high/medium/low"
    }
  ],
  "tags": ["relevant", "scene", "tags"],
  "text": [
    {
      "content": "text content",
      "position": "position description"
    }
  ],
  "faces": [
    {
      "position": "position description",
      "age": "approximate age or range",
      "gender": "perceived gender if clear",
      "emotion": "detected emotion if clear"
    }
  ]
}`;
  }

  private parseAnalysisResponse(
    content: string,
    options: VisionAnalysisOptions
  ): SceneUnderstanding {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const scene: SceneUnderstanding = {
          description: parsed.description || 'No description provided',
          objects: [],
          tags: parsed.tags || [],
        };

        // Convert objects
        if (parsed.objects && options.enableObjectDetection) {
          scene.objects = parsed.objects.map((obj: any) =>
            this.convertToDetectedObject(obj)
          );
        }

        // Convert text
        if (parsed.text && options.enableTextRecognition) {
          scene.text = parsed.text.map((text: any) => ({
            content: text.content,
            boundingBox: this.estimateBoundingBox(text.position),
            confidence: 0.8,
          }));
        }

        // Convert faces
        if (parsed.faces && options.enableFaceAnalysis) {
          scene.faces = parsed.faces.map((face: any) => ({
            boundingBox: this.estimateBoundingBox(face.position),
            emotions: face.emotion ? { [face.emotion.toLowerCase()]: 0.8 } : {},
            age: parseInt(face.age) || undefined,
            gender: face.gender,
          }));
        }

        return scene;
      }
    } catch (error) {
      runtimeLogger.warn(
        'Failed to parse structured response, using fallback',
        { error }
      );
    }

    // Fallback: Create basic scene from text response
    return {
      description: content.substring(0, 500),
      objects: this.extractObjectsFromText(content),
      tags: this.extractTagsFromText(content),
    };
  }

  private convertToDetectedObject(obj: any): DetectedObject {
    return {
      label: obj.label || 'unknown',
      confidence: this.mapConfidence(obj.confidence),
      boundingBox: this.estimateBoundingBox(obj.position),
    };
  }

  private mapConfidence(confidence: string | number): number {
    if (typeof confidence === 'number') {
      return confidence;
    }

    switch (confidence?.toLowerCase()) {
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      default:
        return 0.6;
    }
  }

  private estimateBoundingBox(position: string): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    // Simple position mapping for demonstration
    const positionMap: Record<string, { x: number; y: number }> = {
      'top-left': { x: 0, y: 0 },
      'top-center': { x: 0.33, y: 0 },
      'top-right': { x: 0.66, y: 0 },
      'center-left': { x: 0, y: 0.33 },
      center: { x: 0.33, y: 0.33 },
      'center-right': { x: 0.66, y: 0.33 },
      'bottom-left': { x: 0, y: 0.66 },
      'bottom-center': { x: 0.33, y: 0.66 },
      'bottom-right': { x: 0.66, y: 0.66 },
    };

    const pos = positionMap[position?.toLowerCase()] || { x: 0.33, y: 0.33 };

    return {
      x: pos.x * 100,
      y: pos.y * 100,
      width: 33,
      height: 33,
    };
  }

  private extractObjectsFromText(text: string): DetectedObject[] {
    const objects: DetectedObject[] = [];

    // Simple extraction based on common patterns
    const objectPattern = /\b(person|car|building|tree|animal|object|item)\b/gi;
    const matches = text.match(objectPattern);

    if (matches) {
      const seen = new Set<string>();
      for (const match of matches) {
        const label = match.toLowerCase();
        if (!seen.has(label)) {
          seen.add(label);
          objects.push({
            label,
            confidence: 0.6,
            boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          });
        }
      }
    }

    return objects;
  }

  private extractTagsFromText(text: string): string[] {
    const tags = new Set<string>();

    // Extract key descriptive words
    const descriptivePattern =
      /\b(indoor|outdoor|nature|urban|bright|dark|colorful|modern|vintage)\b/gi;
    const matches = text.match(descriptivePattern);

    if (matches) {
      matches.forEach((match) => tags.add(match.toLowerCase()));
    }

    // Add general tags based on content
    if (
      text.toLowerCase().includes('person') ||
      text.toLowerCase().includes('people')
    ) {
      tags.add('people');
    }
    if (
      text.toLowerCase().includes('nature') ||
      text.toLowerCase().includes('tree')
    ) {
      tags.add('nature');
    }
    if (
      text.toLowerCase().includes('building') ||
      text.toLowerCase().includes('city')
    ) {
      tags.add('urban');
    }

    return Array.from(tags);
  }
}
