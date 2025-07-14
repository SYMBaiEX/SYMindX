# Emotion System Development Guide

The SYMindX emotion system provides dynamic, context-aware emotional responses for AI agents through a modular, auto-discovery architecture.

## Overview

The emotion system features:

- **11 Core Emotions**: Each with dedicated modules and behaviors
- **Auto-discovery**: Emotions are automatically detected and registered
- **Composite Management**: Central orchestration of all emotions
- **Dynamic Intensity**: Emotions have varying intensities and decay patterns
- **Event-driven**: Emotions respond to agent events and interactions

## Architecture

```
emotion/
├── emotion-discovery.ts     # Auto-discovery system
├── composite-emotion.ts     # Central emotion manager
├── base-emotion.ts          # Base emotion class
├── index.ts                # Module factory and registration
├── package.json            # Module metadata
└── [emotion-folders]/      # Individual emotion modules
    ├── happy/
    ├── sad/
    ├── angry/
    ├── anxious/
    ├── confident/
    ├── curious/
    ├── empathetic/
    ├── proud/
    ├── confused/
    ├── nostalgic/
    └── neutral/
```

## Emotion Categories

### Basic Emotions

- **Happy**: Joy, satisfaction, contentment
- **Sad**: Sorrow, disappointment, melancholy
- **Angry**: Frustration, irritation, rage
- **Neutral**: Baseline emotional state

### Complex Emotions

- **Anxious**: Worry, nervousness, uncertainty
- **Confident**: Self-assurance, certainty, boldness
- **Proud**: Achievement satisfaction, accomplishment
- **Confused**: Uncertainty, perplexity, bewilderment

### Social Emotions

- **Empathetic**: Understanding others' feelings
- **Curious**: Interest, inquisitiveness, exploration

### Cognitive Emotions

- **Nostalgic**: Longing for past experiences

## Creating a New Emotion

### 1. Emotion Structure

```
my-emotion/
├── package.json         # Package metadata with symindx.emotion config
├── index.ts            # Main emotion implementation
├── types.ts            # Emotion-specific types
└── README.md           # Documentation
```

### 2. Package Configuration

```json
{
  "name": "@symindx/emotion-my-emotion",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts",
  "symindx": {
    "emotion": {
      "name": "my-emotion",
      "displayName": "My Emotion",
      "description": "Custom emotion for specific responses",
      "category": "complex",
      "triggers": ["specific_event", "custom_trigger"],
      "intensity": {
        "min": 0.0,
        "max": 1.0,
        "default": 0.5,
        "decay": 0.1
      },
      "modifiers": {
        "excitement": 0.2,
        "calmness": -0.1
      }
    }
  }
}
```

### 3. Emotion Implementation

```typescript
import { BaseEmotion } from '../base-emotion.js';
import { EmotionState, EmotionTrigger } from '../../types/emotion.js';
import { MyEmotionConfig } from './types.js';

export class MyEmotion extends BaseEmotion {
  constructor(config: MyEmotionConfig = {}) {
    super('my-emotion', {
      intensity: 0.5,
      decayRate: 0.1,
      triggers: ['specific_event', 'custom_trigger'],
      ...config,
    });
  }

  protected getTriggers(): EmotionTrigger[] {
    return [
      {
        event: 'specific_event',
        condition: (data: any) => data.isSpecial === true,
        intensity: 0.8,
        description: 'Triggered by specific events',
      },
      {
        event: 'custom_trigger',
        condition: (data: any) => data.customValue > 50,
        intensity: 0.6,
        description: 'Triggered by custom conditions',
      },
    ];
  }

  protected calculateIntensity(trigger: EmotionTrigger, data: any): number {
    let intensity = trigger.intensity;

    // Custom intensity calculation
    if (trigger.event === 'specific_event') {
      intensity *= data.multiplier || 1.0;
    }

    return Math.max(0, Math.min(1, intensity));
  }

  protected getEmotionModifiers(): Record<string, number> {
    return {
      excitement: 0.2, // Increases other positive emotions
      anxiety: -0.1, // Reduces anxiety when active
      confidence: 0.15, // Slightly boosts confidence
    };
  }

  protected generateEmotionResponse(intensity: number): string {
    if (intensity > 0.8) {
      return "I'm experiencing intense custom feelings!";
    } else if (intensity > 0.5) {
      return 'I feel a strong sense of this custom emotion.';
    } else if (intensity > 0.2) {
      return "There's a mild feeling of this emotion present.";
    }
    return 'The emotion is barely noticeable.';
  }

  // Override for custom decay behavior
  decay(deltaTime: number): void {
    const customDecayRate = this.config.decayRate * 1.5; // Faster decay
    this.intensity = Math.max(
      0,
      this.intensity - (customDecayRate * deltaTime) / 1000
    );
  }
}

// Factory function for discovery system
export function createMyEmotion(config: MyEmotionConfig = {}): MyEmotion {
  return new MyEmotion(config);
}

export default MyEmotion;
```

### 4. Type Definitions

```typescript
import { BaseConfig } from '../../types/common.js';

export interface MyEmotionConfig extends BaseConfig {
  sensitivity?: number;
  customParameter?: string;
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface MyEmotionTriggerData {
  isSpecial: boolean;
  customValue: number;
  multiplier?: number;
}
```

## Emotion Categories

### Basic (Primary emotions)

Simple, fundamental emotional states that form the foundation for complex emotions.

### Complex (Secondary emotions)

More sophisticated emotions that often combine multiple basic emotions or require cognitive processing.

### Social (Interpersonal emotions)

Emotions that arise from and affect social interactions and relationships.

### Cognitive (Thought-based emotions)

Emotions closely tied to cognitive processes, memory, and reflection.

## Discovery System

Emotions are automatically discovered using the `EmotionDiscovery` class:

```typescript
import { EmotionDiscovery } from '@symindx/mind-agents';

const discovery = new EmotionDiscovery(projectRoot);
const emotions = await discovery.discoverEmotions();

// Emotions are categorized
emotions.forEach((emotion) => {
  console.log(`Found: ${emotion.name} (${emotion.category})`);
});
```

## Emotion Configuration

### Character Level

```json
{
  "emotion": {
    "type": "composite",
    "config": {
      "emotions": {
        "happy": { "sensitivity": 0.8 },
        "anxious": { "sensitivity": 0.3 },
        "confident": { "sensitivity": 0.9 }
      },
      "globalModifiers": {
        "positivityBias": 0.1,
        "stabilityFactor": 0.9
      }
    }
  }
}
```

### Runtime Level

```json
{
  "emotion": {
    "defaultIntensity": 0.5,
    "decayRate": 0.1,
    "maxActiveEmotions": 3
  }
}
```

## Composite Emotion System

The `CompositeEmotionModule` manages all emotions:

```typescript
export class CompositeEmotionModule {
  private emotions: Map<string, BaseEmotion> = new Map();

  // Processes emotion triggers from events
  async processEvent(event: AgentEvent): Promise<EmotionState> {
    const triggeredEmotions = new Map<string, number>();

    // Check each emotion for triggers
    for (const [name, emotion] of this.emotions) {
      const intensity = emotion.checkTrigger(event);
      if (intensity > 0) {
        emotion.trigger(event.data, intensity);
        triggeredEmotions.set(name, intensity);
      }
    }

    // Apply cross-emotion modifiers
    this.applyEmotionModifiers(triggeredEmotions);

    // Return dominant emotion state
    return this.getDominantEmotion();
  }
}
```

## Event Triggers

Emotions respond to various agent events:

### Standard Triggers

- `message_received` - Incoming communication
- `action_completed` - Successful action completion
- `action_failed` - Action failure
- `goal_achieved` - Goal completion
- `social_interaction` - Social engagement
- `learning_success` - Successfully learned something
- `memory_recall` - Remembering past events

### Custom Triggers

Define custom triggers for specialized emotions:

```typescript
{
  event: 'code_compilation_success',
  condition: (data: any) => data.language === 'typescript',
  intensity: 0.7,
  description: 'Successfully compiled TypeScript code'
}
```

## Emotion Modifiers

Emotions can influence each other through modifiers:

```typescript
protected getEmotionModifiers(): Record<string, number> {
  return {
    'happy': 0.3,      // Boosts happiness when active
    'sad': -0.2,       // Reduces sadness
    'anxiety': -0.4,   // Significantly reduces anxiety
    'confidence': 0.2   // Increases confidence
  }
}
```

## Testing Emotions

```typescript
import { describe, it, expect } from '@jest/globals';
import { MyEmotion } from '../index.js';

describe('MyEmotion', () => {
  it('should trigger on specific events', () => {
    const emotion = new MyEmotion();

    const intensity = emotion.checkTrigger({
      type: 'specific_event',
      data: { isSpecial: true, multiplier: 1.5 },
    });

    expect(intensity).toBeGreaterThan(0);
  });

  it('should decay over time', () => {
    const emotion = new MyEmotion();
    emotion.trigger({ isSpecial: true }, 0.8);

    const initialIntensity = emotion.getIntensity();
    emotion.decay(1000); // 1 second

    expect(emotion.getIntensity()).toBeLessThan(initialIntensity);
  });

  it('should provide appropriate responses', () => {
    const emotion = new MyEmotion();
    emotion.trigger({ isSpecial: true }, 0.9);

    const response = emotion.getResponse();
    expect(response).toContain('intense');
  });
});
```

## Best Practices

### Trigger Design

- Use specific, meaningful trigger events
- Include reasonable conditions to avoid over-triggering
- Balance intensity values (0.0-1.0 range)

### Intensity Management

- Consider context when calculating intensity
- Implement appropriate decay rates
- Account for emotion interactions

### Response Generation

- Provide varied responses based on intensity
- Make responses contextually appropriate
- Consider agent personality in responses

### Performance

- Avoid expensive operations in trigger checks
- Cache frequently used calculations
- Use efficient data structures for emotion state

## Existing Emotions Reference

Study the existing emotions for patterns and implementation examples:

- **Happy**: Simple positive emotion with social triggers
- **Anxious**: Complex emotion with failure and uncertainty triggers
- **Confident**: Achievement-based emotion with success triggers
- **Empathetic**: Social emotion that responds to others' states
- **Curious**: Learning-focused emotion with discovery triggers

## Troubleshooting

### Emotion Not Triggering

- Check trigger conditions are being met
- Verify event types match expectations
- Ensure discovery system found the emotion

### Intensity Issues

- Review intensity calculation logic
- Check for proper decay implementation
- Verify modifier interactions

### Integration Problems

- Ensure factory function is exported
- Check package.json configuration
- Verify TypeScript types are correct

For more examples and advanced patterns, see the existing emotion implementations in the `mind-agents/src/modules/emotion/` directory.
