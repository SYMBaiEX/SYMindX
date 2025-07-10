/**
 * Expression Engine for SYMindX
 *
 * Generates emotionally expressive text based on agent's emotional state,
 * personality, and context.
 */

import { EmotionState, Agent } from '../../types/agent';
import { BaseConfig } from '../../types/common';
import { PersonalityTraits, EmotionBlend } from '../../types/emotion';
import { runtimeLogger } from '../../utils/logger';

/**
 * Expression template
 */
export interface ExpressionTemplate {
  emotion: string;
  intensity: { min: number; max: number };
  templates: string[];
  modifiers?: {
    prefix?: string[];
    suffix?: string[];
    emphasis?: string[];
  };
}

/**
 * Expression configuration
 */
export interface ExpressionEngineConfig extends BaseConfig {
  // Expression intensity
  baseIntensity?: number; // Default expression intensity
  intensityVariation?: number; // How much intensity can vary

  // Personality influence
  personalityWeight?: number; // How much personality affects expression

  // Context sensitivity
  contextAdaptation?: boolean; // Adapt to conversation context

  // Emotional transitions
  smoothTransitions?: boolean; // Smooth emotion changes
  transitionSpeed?: number; // How fast emotions transition

  // Expression variety
  useVariety?: boolean; // Vary expressions to avoid repetition
  repetitionWindow?: number; // How many messages to track
}

/**
 * Expression Engine implementation
 */
export class ExpressionEngine {
  private config: ExpressionEngineConfig;
  private expressionHistory: string[] = [];
  private emotionTemplates: Map<string, ExpressionTemplate> = new Map();
  private lastEmotion: string = 'neutral';
  private lastIntensity: number = 0.5;
  private agent?: Agent;

  constructor(config: ExpressionEngineConfig = {}) {
    this.config = {
      baseIntensity: 0.5,
      intensityVariation: 0.2,
      personalityWeight: 0.3,
      contextAdaptation: true,
      smoothTransitions: true,
      transitionSpeed: 0.3,
      useVariety: true,
      repetitionWindow: 10,
      ...config,
    };

    this.initializeTemplates();
  }

  /**
   * Initialize with agent
   */
  async initialize(agent: Agent): Promise<void> {
    this.agent = agent;
    runtimeLogger.debug(
      '🎭 Expression Engine initialized for agent',
      agent.name
    );
  }

  /**
   * Generate expressive text
   */
  generateExpression(
    content: string,
    emotion: EmotionState,
    personality?: PersonalityTraits,
    context?: {
      topic?: string;
      relationship?: number;
      formality?: number;
    }
  ): string {
    // Handle emotion transitions
    const effectiveEmotion = this.handleTransition(emotion);

    // Get expression template
    const template = this.getTemplate(
      effectiveEmotion.current,
      effectiveEmotion.intensity
    );

    // Apply base expression
    let expressed = this.applyTemplate(content, template);

    // Apply personality modulation
    if (personality) {
      expressed = this.applyPersonality(
        expressed,
        personality,
        effectiveEmotion
      );
    }

    // Apply context adaptations
    if (context && this.config.contextAdaptation) {
      expressed = this.applyContext(expressed, context, effectiveEmotion);
    }

    // Add variety
    if (this.config.useVariety) {
      expressed = this.ensureVariety(expressed);
    }

    // Track expression
    this.trackExpression(expressed);

    return expressed;
  }

  /**
   * Generate expression variations for different styles
   */
  async generateVariations(
    content: string,
    options?: {
      emotion?: string;
      style?: any;
      context?: any;
      count?: number;
    }
  ): Promise<string[]> {
    const variations: string[] = [];
    const count = options?.count || 3;

    // Create base emotion state
    const emotion: EmotionState = {
      current: options?.emotion || 'neutral',
      intensity: 0.5,
      triggers: [],
      history: [],
      timestamp: new Date(),
    };

    // Generate different variations
    for (let i = 0; i < count; i++) {
      const template = this.getTemplate(
        emotion.current,
        emotion.intensity + i * 0.2
      );
      if (template) {
        const variation = this.applyTemplate(content, template, 0.7 + i * 0.1);
        variations.push(variation);
      }
    }

    return variations;
  }

  /**
   * Enhance expression with emotional context
   */
  async enhanceExpression(
    content: string,
    options?: {
      emotion?: string;
      context?: any;
      variation?: 'subtle' | 'balanced' | 'expressive';
    }
  ): Promise<string> {
    const variation = options?.variation || 'balanced';
    const intensity =
      variation === 'subtle' ? 0.3 : variation === 'expressive' ? 0.8 : 0.5;

    const emotion: EmotionState = {
      current: options?.emotion || 'neutral',
      intensity,
      triggers: [],
      history: [],
      timestamp: new Date(),
    };

    return this.generateExpression(
      content,
      emotion,
      undefined,
      options?.context
    );
  }

  /**
   * Generate expression from emotion blend
   */
  generateBlendedExpression(
    content: string,
    blend: EmotionBlend,
    personality?: PersonalityTraits
  ): string {
    // Combine expressions from multiple emotions
    const expressions: string[] = [];

    for (const component of blend.components) {
      const template = this.getTemplate(component.emotion, component.weight);
      if (template) {
        const partial = this.applyTemplate(content, template, component.weight);
        expressions.push(partial);
      }
    }

    // Blend expressions
    let blended = content;
    if (expressions.length > 0) {
      // Use the strongest emotion's expression as base
      blended = expressions[0];

      // Add nuances from other emotions
      for (let i = 1; i < expressions.length; i++) {
        const modifier = this.extractModifier(expressions[i]);
        if (modifier) {
          blended = this.addNuance(
            blended,
            modifier,
            blend.components[i].weight
          );
        }
      }
    }

    // Apply personality
    if (personality) {
      blended = this.applyPersonality(blended, personality, {
        current: 'blended',
        intensity: blend.intensity,
        triggers: [],
        history: [],
        timestamp: new Date(),
      });
    }

    return blended;
  }

  /**
   * Initialize emotion templates
   */
  private initializeTemplates(): void {
    // Happy expressions
    this.emotionTemplates.set('happy', {
      emotion: 'happy',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content} 😊',
        '{content}!',
        'Yay! {content}',
        '{content} - how wonderful!',
      ],
      modifiers: {
        prefix: ["I'm delighted to say", 'Happy to share', 'Great news'],
        suffix: ['This makes me happy', 'Feeling good about this'],
        emphasis: ['really', 'so', 'absolutely'],
      },
    });

    // Sad expressions
    this.emotionTemplates.set('sad', {
      emotion: 'sad',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content} 😔',
        '{content}...',
        'Unfortunately, {content}',
        "{content}, I'm afraid",
      ],
      modifiers: {
        prefix: ["I'm sorry to say", 'Sadly', "It's unfortunate that"],
        suffix: ['This is difficult', 'I wish it were different'],
        emphasis: ['quite', 'rather', 'somewhat'],
      },
    });

    // Angry expressions
    this.emotionTemplates.set('angry', {
      emotion: 'angry',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content}!',
        '{content} - this is frustrating',
        'Ugh, {content}',
        '{content} (this is not okay)',
      ],
      modifiers: {
        prefix: ['I must say', 'Frankly', 'To be honest'],
        suffix: ['This is unacceptable', 'This needs to change'],
        emphasis: ['absolutely', 'completely', 'totally'],
      },
    });

    // Anxious expressions
    this.emotionTemplates.set('anxious', {
      emotion: 'anxious',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content}... 😰',
        'Um, {content}',
        '{content} (I hope this is okay)',
        'Well... {content}',
      ],
      modifiers: {
        prefix: ["I'm worried that", "I'm concerned", 'I hope'],
        suffix: ["I'm not sure about this", 'This makes me nervous'],
        emphasis: ['maybe', 'perhaps', 'possibly'],
      },
    });

    // Confident expressions
    this.emotionTemplates.set('confident', {
      emotion: 'confident',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content} 💪',
        'Absolutely! {content}',
        "{content} - I'm certain of this",
        '{content}, no doubt about it',
      ],
      modifiers: {
        prefix: ["I'm confident that", 'Without a doubt', 'Certainly'],
        suffix: ["I'm sure of this", 'Trust me on this'],
        emphasis: ['definitely', 'absolutely', 'certainly'],
      },
    });

    // Curious expressions
    this.emotionTemplates.set('curious', {
      emotion: 'curious',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content}? 🤔',
        'Hmm, {content}',
        'I wonder... {content}',
        '{content} - interesting!',
      ],
      modifiers: {
        prefix: ["I'm curious about", 'I wonder if', 'Interesting that'],
        suffix: ['This is intriguing', "I'd love to know more"],
        emphasis: ['really', 'quite', 'very'],
      },
    });

    // Neutral expressions
    this.emotionTemplates.set('neutral', {
      emotion: 'neutral',
      intensity: { min: 0, max: 1 },
      templates: [
        '{content}',
        '{content}.',
        "Here's the thing: {content}",
        '{content}, as it stands',
      ],
      modifiers: {
        prefix: ['To note', 'For reference', 'As mentioned'],
        suffix: ["That's the situation", 'Just so you know'],
        emphasis: ['simply', 'just', 'merely'],
      },
    });
  }

  /**
   * Handle emotion transitions
   */
  private handleTransition(emotion: EmotionState): EmotionState {
    if (!this.config.smoothTransitions) return emotion;

    // Calculate transition
    const targetEmotion = emotion.current;
    const targetIntensity = emotion.intensity;

    // Smooth intensity change
    const intensityDiff = targetIntensity - this.lastIntensity;
    const smoothedIntensity =
      this.lastIntensity + intensityDiff * this.config.transitionSpeed!;

    // Update tracking
    this.lastEmotion = targetEmotion;
    this.lastIntensity = smoothedIntensity;

    return {
      ...emotion,
      intensity: smoothedIntensity,
    };
  }

  /**
   * Get appropriate template
   */
  private getTemplate(
    emotion: string,
    intensity: number
  ): ExpressionTemplate | null {
    const template = this.emotionTemplates.get(emotion);
    if (!template) return this.emotionTemplates.get('neutral') || null;

    // Check if intensity is in range
    if (
      intensity < template.intensity.min ||
      intensity > template.intensity.max
    ) {
      return this.emotionTemplates.get('neutral') || null;
    }

    return template;
  }

  /**
   * Apply expression template
   */
  private applyTemplate(
    content: string,
    template: ExpressionTemplate | null,
    weight: number = 1
  ): string {
    if (!template) return content;

    // Select template based on intensity
    const templateIndex = Math.floor(Math.random() * template.templates.length);
    let expressed = template.templates[templateIndex];

    // Replace content placeholder
    expressed = expressed.replace('{content}', content);

    // Add modifiers based on intensity and weight
    if (weight > 0.7 && template.modifiers) {
      // Add prefix
      if (template.modifiers.prefix && Math.random() < weight) {
        const prefix =
          template.modifiers.prefix[
            Math.floor(Math.random() * template.modifiers.prefix.length)
          ];
        expressed = `${prefix}, ${expressed.charAt(0).toLowerCase()}${expressed.slice(1)}`;
      }

      // Add emphasis
      if (template.modifiers.emphasis && weight > 0.8) {
        const emphasis =
          template.modifiers.emphasis[
            Math.floor(Math.random() * template.modifiers.emphasis.length)
          ];
        // Insert emphasis before key words
        const words = expressed.split(' ');
        if (words.length > 3) {
          const insertPos = Math.floor(words.length / 2);
          words.splice(insertPos, 0, emphasis);
          expressed = words.join(' ');
        }
      }
    }

    return expressed;
  }

  /**
   * Apply personality to expression
   */
  private applyPersonality(
    expression: string,
    personality: PersonalityTraits,
    emotion: EmotionState
  ): string {
    let modified = expression;

    // Extraversion affects exclamation and energy
    if (personality.extraversion > 0.7) {
      // Add more exclamation
      if (!modified.includes('!') && emotion.intensity > 0.6) {
        modified = modified.replace(/\.$/, '!');
      }
    } else if (personality.extraversion < 0.3) {
      // Reduce exclamation
      modified = modified.replace(/!+/g, '.');
    }

    // Agreeableness affects politeness
    if (personality.agreeableness > 0.7) {
      // Add polite modifiers
      const polite = ['please', "if you don't mind", 'kindly'];
      if (!polite.some((p) => modified.toLowerCase().includes(p))) {
        const modifier = polite[Math.floor(Math.random() * polite.length)];
        modified = modified.replace(/\.$/, `, ${modifier}.`);
      }
    }

    // Neuroticism affects uncertainty expression
    if (personality.neuroticism > 0.7 && emotion.current !== 'confident') {
      // Add uncertainty
      const uncertain = ['I think', 'maybe', 'perhaps'];
      if (!uncertain.some((u) => modified.toLowerCase().includes(u))) {
        const modifier =
          uncertain[Math.floor(Math.random() * uncertain.length)];
        modified = `${modifier} ${modified.charAt(0).toLowerCase()}${modified.slice(1)}`;
      }
    }

    // Openness affects creative expression
    if (personality.openness > 0.7) {
      // Add creative flair (simplified for demo)
      if (emotion.intensity > 0.7 && Math.random() < personality.openness) {
        const creative = ['✨', '🌟', '💡', '🎨'];
        const emoji = creative[Math.floor(Math.random() * creative.length)];
        if (!modified.includes(emoji)) {
          modified = `${modified} ${emoji}`;
        }
      }
    }

    return modified;
  }

  /**
   * Apply context to expression
   */
  private applyContext(
    expression: string,
    context: any,
    emotion: EmotionState
  ): string {
    let modified = expression;

    // Formal context reduces informal expressions
    if (context.formality > 0.7) {
      modified = modified
        .replace(/😊|😔|😰|💪|🤔/g, '')
        .replace(/!+/g, '.')
        .replace(/\.\.\./g, '.');

      // Remove informal markers
      const informal = ['Yay', 'Ugh', 'Um', 'Hmm'];
      informal.forEach((word) => {
        modified = modified.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
      });
    }

    // Close relationships allow more expression
    if (context.relationship > 0.7) {
      // Can be more expressive
      if (emotion.intensity > 0.6 && !modified.includes('!')) {
        modified = modified.replace(/\.$/, '!');
      }
    } else if (context.relationship < 0.3) {
      // Be more reserved
      modified = modified.replace(/!+/g, '.');
    }

    return modified.trim();
  }

  /**
   * Extract modifier from expression
   */
  private extractModifier(expression: string): string | null {
    // Extract key emotional words
    const patterns = [
      /\b(really|so|absolutely|quite|rather|somewhat)\b/i,
      /\b(delighted|sorry|frustrated|worried|confident|curious)\b/i,
    ];

    for (const pattern of patterns) {
      const match = expression.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Add nuance to expression
   */
  private addNuance(
    expression: string,
    nuance: string,
    weight: number
  ): string {
    if (weight < 0.3) return expression;

    // Add subtle modifier
    const words = expression.split(' ');
    const insertPos = Math.floor(words.length * 0.7);

    if (!expression.toLowerCase().includes(nuance.toLowerCase())) {
      words.splice(insertPos, 0, `(${nuance})`);
      return words.join(' ');
    }

    return expression;
  }

  /**
   * Ensure variety in expressions
   */
  private ensureVariety(expression: string): string {
    // Check recent history
    const recentCount = this.expressionHistory
      .slice(-this.config.repetitionWindow!)
      .filter((e) => e === expression).length;

    if (recentCount > 1) {
      // Modify to add variety
      const variations = [
        (e: string) => `Well, ${e.charAt(0).toLowerCase()}${e.slice(1)}`,
        (e: string) => `${e} (as I mentioned)`,
        (e: string) => `To reiterate: ${e}`,
        (e: string) => e.replace(/\.$/, ', you know.'),
      ];

      const variation =
        variations[Math.floor(Math.random() * variations.length)];
      return variation(expression);
    }

    return expression;
  }

  /**
   * Track expression for variety
   */
  private trackExpression(expression: string): void {
    this.expressionHistory.push(expression);

    // Limit history size
    if (this.expressionHistory.length > this.config.repetitionWindow! * 2) {
      this.expressionHistory = this.expressionHistory.slice(
        -this.config.repetitionWindow!
      );
    }
  }

  /**
   * Generate emotional punctuation
   */
  generatePunctuation(emotion: string, intensity: number): string {
    const punctuation: Record<string, string[]> = {
      happy: ['.', '!', '!!', '! 😊'],
      sad: ['...', '.', '... 😔', '...'],
      angry: ['!', '!!', '!!!', '.'],
      anxious: ['...', '?', '...?', '... 😰'],
      confident: ['!', '.', '!', '! 💪'],
      curious: ['?', '??', '? 🤔', '...?'],
      neutral: ['.', '.', '.', '.'],
    };

    const options = punctuation[emotion] || punctuation.neutral;
    const index = Math.floor(intensity * (options.length - 1));

    return options[index];
  }

  /**
   * Generate emotional prefix
   */
  generatePrefix(emotion: string, intensity: number): string {
    const template = this.emotionTemplates.get(emotion);
    if (!template?.modifiers?.prefix) return '';

    if (intensity > 0.6) {
      return (
        template.modifiers.prefix[
          Math.floor(Math.random() * template.modifiers.prefix.length)
        ] + ', '
      );
    }

    return '';
  }

  /**
   * Export configuration
   */
  exportConfig(): ExpressionEngineConfig {
    return { ...this.config };
  }
}

// Factory function
export function createExpressionEngine(
  config?: ExpressionEngineConfig
): ExpressionEngine {
  return new ExpressionEngine(config);
}
