/**
 * Anthropic Vision Provider
 *
 * Integration with Claude 3's vision capabilities
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
 * Anthropic Vision provider implementation
 */
export class AnthropicVisionProvider extends BaseVisionProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private model = 'claude-3-opus-20240229'; // Latest vision-capable model

  async initialize(): Promise<void> {
    this.apiKey = process.env.ANTHROPIC_API_KEY;

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }

    runtimeLogger.info('Anthropic Vision provider initialized', {
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
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: image.mimeType || 'image/jpeg',
                    data: imageData.replace(/^data:.*?;base64,/, ''),
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Anthropic Vision API error: ${response.status} - ${error}`
        );
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw new Error('No content in Anthropic response');
      }

      // Parse the structured response
      return this.parseAnalysisResponse(content, options);
    } catch (error) {
      runtimeLogger.error('Anthropic Vision analysis failed', { error });
      throw error;
    }
  }

  getType(): VisionProvider {
    return VisionProvider.ANTHROPIC_VISION;
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
      'visual-reasoning',
      'chart-analysis',
    ];
  }

  // Private helper methods

  private buildAnalysisPrompt(options: VisionAnalysisOptions): string {
    const tasks: string[] = [];

    if (options.enableSceneUnderstanding) {
      tasks.push(
        'Provide a comprehensive description of the scene, including context and atmosphere'
      );
    }

    if (options.enableObjectDetection) {
      tasks.push(
        'Identify all visible objects with their relative positions using a grid system (divide image into 3x3 grid)'
      );
    }

    if (options.enableFaceAnalysis) {
      tasks.push(
        'Describe any people visible, including apparent age ranges, expressions, and activities'
      );
    }

    if (options.enableTextRecognition) {
      tasks.push(
        'Transcribe all readable text in the image exactly as it appears'
      );
    }

    return `Please analyze this image carefully and provide a detailed response. ${tasks.join('. ')}.

Structure your response as a JSON object with the following format:
{
  "description": "Detailed scene description",
  "objects": [
    {
      "label": "object name",
      "grid_position": "grid position (e.g., 'top-left', 'center', 'bottom-right')",
      "confidence": "your confidence level (high/medium/low)",
      "details": "any additional details about the object"
    }
  ],
  "tags": ["descriptive", "tags", "about", "the", "scene"],
  "text": [
    {
      "content": "exact text as it appears",
      "location": "where in the image",
      "context": "what the text relates to"
    }
  ],
  "people": [
    {
      "location": "where in the image",
      "age_range": "apparent age range",
      "expression": "facial expression or emotion",
      "activity": "what they appear to be doing"
    }
  ],
  "atmosphere": "overall mood or feeling of the image"
}`;
  }

  private parseAnalysisResponse(
    content: string,
    options: VisionAnalysisOptions
  ): SceneUnderstanding {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        const scene: SceneUnderstanding = {
          description:
            parsed.description ||
            parsed.atmosphere ||
            'No description provided',
          objects: [],
          tags: parsed.tags || [],
        };

        // Convert objects with Claude's grid system
        if (parsed.objects && options.enableObjectDetection) {
          scene.objects = parsed.objects.map((obj: any) => ({
            label: obj.label || 'unknown',
            confidence: this.mapConfidence(obj.confidence),
            boundingBox: this.gridToBoundingBox(obj.grid_position),
            attributes: obj.details ? { details: obj.details } : undefined,
          }));
        }

        // Convert text
        if (parsed.text && options.enableTextRecognition) {
          scene.text = parsed.text.map((text: any) => ({
            content: text.content,
            boundingBox: this.locationToBoundingBox(text.location),
            confidence: 0.85, // Claude is generally accurate with text
          }));
        }

        // Convert people to faces
        if (parsed.people && options.enableFaceAnalysis) {
          scene.faces = parsed.people.map((person: any) => ({
            boundingBox: this.locationToBoundingBox(person.location),
            emotions: this.expressionToEmotions(person.expression),
            age: this.parseAgeRange(person.age_range),
            attributes: {
              activity: person.activity,
            },
          }));
        }

        // Add atmosphere to tags if present
        if (parsed.atmosphere && !scene.tags.includes(parsed.atmosphere)) {
          scene.tags.push(parsed.atmosphere);
        }

        return scene;
      }
    } catch (error) {
      runtimeLogger.warn(
        'Failed to parse structured response, using fallback',
        { error }
      );
    }

    // Fallback parsing
    return {
      description: content.substring(0, 500),
      objects: this.extractObjectsFromText(content),
      tags: this.extractTagsFromText(content),
    };
  }

  private mapConfidence(confidence: string): number {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 0.95;
      case 'medium':
        return 0.75;
      case 'low':
        return 0.55;
      default:
        return 0.7;
    }
  }

  private gridToBoundingBox(gridPosition: string): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    // Convert 3x3 grid positions to bounding boxes
    const gridMap: Record<string, { x: number; y: number }> = {
      'top-left': { x: 0, y: 0 },
      'top-center': { x: 33, y: 0 },
      'top-right': { x: 66, y: 0 },
      'middle-left': { x: 0, y: 33 },
      center: { x: 33, y: 33 },
      'middle-right': { x: 66, y: 33 },
      'bottom-left': { x: 0, y: 66 },
      'bottom-center': { x: 33, y: 66 },
      'bottom-right': { x: 66, y: 66 },
    };

    const pos = gridMap[gridPosition?.toLowerCase()] || { x: 33, y: 33 };

    return {
      x: pos.x,
      y: pos.y,
      width: 33,
      height: 33,
    };
  }

  private locationToBoundingBox(location: string): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    // Similar to grid but with more flexibility
    if (location.includes('top')) {
      return { x: 0, y: 0, width: 100, height: 33 };
    } else if (location.includes('bottom')) {
      return { x: 0, y: 66, width: 100, height: 33 };
    } else if (location.includes('left')) {
      return { x: 0, y: 0, width: 33, height: 100 };
    } else if (location.includes('right')) {
      return { x: 66, y: 0, width: 33, height: 100 };
    } else {
      return { x: 33, y: 33, width: 33, height: 33 };
    }
  }

  private expressionToEmotions(expression: string): Record<string, number> {
    const emotions: Record<string, number> = {};

    if (!expression) return emotions;

    const expr = expression.toLowerCase();

    if (
      expr.includes('happy') ||
      expr.includes('smile') ||
      expr.includes('joy')
    ) {
      emotions.happy = 0.8;
    }
    if (expr.includes('sad') || expr.includes('frown')) {
      emotions.sad = 0.8;
    }
    if (expr.includes('angry') || expr.includes('frustrated')) {
      emotions.angry = 0.8;
    }
    if (expr.includes('surprised') || expr.includes('shocked')) {
      emotions.surprised = 0.8;
    }
    if (expr.includes('neutral') || expr.includes('calm')) {
      emotions.neutral = 0.8;
    }

    // If no specific emotion detected, assume neutral
    if (Object.keys(emotions).length === 0) {
      emotions.neutral = 0.6;
    }

    return emotions;
  }

  private parseAgeRange(ageRange: string): number | undefined {
    if (!ageRange) return undefined;

    // Extract numbers from age range
    const numbers = ageRange.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      // Return middle of range or single number
      if (numbers.length === 2) {
        return (parseInt(numbers[0]) + parseInt(numbers[1])) / 2;
      } else {
        return parseInt(numbers[0]);
      }
    }

    // Fallback for word descriptions
    const ageMap: Record<string, number> = {
      child: 10,
      teenager: 16,
      'young adult': 25,
      adult: 35,
      'middle-aged': 50,
      elderly: 70,
    };

    for (const [key, value] of Object.entries(ageMap)) {
      if (ageRange.toLowerCase().includes(key)) {
        return value;
      }
    }

    return undefined;
  }

  private extractObjectsFromText(text: string): DetectedObject[] {
    // More sophisticated extraction for Claude's detailed descriptions
    const objects: DetectedObject[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const objectMatch = line.match(
        /(?:see|notice|observe|detect|spot)\s+(?:a|an|the)?\s*(\w+)/i
      );
      if (objectMatch) {
        objects.push({
          label: objectMatch[1].toLowerCase(),
          confidence: 0.7,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        });
      }
    }

    return objects;
  }

  private extractTagsFromText(text: string): string[] {
    const tags = new Set<string>();

    // Claude often provides rich descriptions we can extract tags from
    const descriptors = text.match(
      /\b(bright|dark|colorful|modern|vintage|natural|urban|indoor|outdoor|peaceful|busy|crowded|empty)\b/gi
    );

    if (descriptors) {
      descriptors.forEach((tag) => tags.add(tag.toLowerCase()));
    }

    return Array.from(tags);
  }
}
