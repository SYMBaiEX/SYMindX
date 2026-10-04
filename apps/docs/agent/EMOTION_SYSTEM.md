# SYMindX Emotion System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Emotion Categories](#emotion-categories)
4. [Configuration](#configuration)
5. [Composite Emotion Management](#composite-emotion-management)
6. [Emotion Triggers](#emotion-triggers)
7. [Emotion Decay and Persistence](#emotion-decay-and-persistence)
8. [Character Integration](#character-integration)
9. [Emotion-Driven Behavior](#emotion-driven-behavior)
10. [Advanced Features](#advanced-features)
11. [Development Guide](#development-guide)
12. [Examples and Use Cases](#examples-and-use-cases)
13. [Troubleshooting](#troubleshooting)

## Overview

The SYMindX emotion system provides dynamic emotional intelligence to AI agents, allowing them to experience, express, and respond to emotions in realistic and contextually appropriate ways. The system is designed to be modular, extensible, and deeply integrated with other agent systems like cognition, memory, and communication.

### Key Features

- **11 Distinct Emotions**: Organized into basic, complex, social, and cognitive categories
- **Composite Management**: Multiple emotions can be active simultaneously
- **Dynamic Intensity**: Emotions have varying intensity levels that change over time
- **Contextual Triggers**: Emotions respond to events, messages, and environmental factors
- **Decay and Persistence**: Emotions naturally fade over time but can persist based on importance
- **Behavioral Integration**: Emotions influence decision-making, communication style, and actions
- **Auto-Discovery**: New emotions can be added without modifying core code

### Emotional Intelligence Goals

The emotion system aims to:

1. **Enhance Realism**: Make agents feel more human and relatable
2. **Improve Interactions**: Create more engaging and contextually appropriate responses
3. **Enable Empathy**: Allow agents to understand and respond to human emotions
4. **Drive Behavior**: Influence decision-making and action selection
5. **Support Learning**: Use emotional context to improve memory formation and recall

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Runtime                           │
├─────────────────────────────────────────────────────────────┤
│                Composite Emotion Module                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   Basic     │   Complex   │   Social    │  Cognitive  │  │
│  │  Emotions   │  Emotions   │  Emotions   │  Emotions   │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Event Bus                               │
│         ┌─────────────┬─────────────┬─────────────┐         │
│         │   Memory    │  Cognition  │Communication│         │
│         │   System    │   System    │   System    │         │
│         └─────────────┴─────────────┴─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **BaseEmotion**: Abstract base class for all emotions
2. **CompositeEmotionModule**: Manages multiple emotions simultaneously
3. **EmotionTrigger**: Events that can trigger emotional responses
4. **EmotionState**: Current emotional state of an agent
5. **EmotionHistory**: Track of emotional changes over time
6. **EmotionModifiers**: How emotions affect behavior and responses

### Emotion Lifecycle

```
Event/Trigger → Emotion Activation → Intensity Calculation → 
Behavioral Impact → Natural Decay → State Update
```

## Emotion Categories

### Basic Emotions (4)

Core emotional states that form the foundation of emotional experience.

#### Happy 😊
- **Purpose**: Represents joy, satisfaction, and positive states
- **Triggers**: Success, praise, positive interactions, goal achievement
- **Effects**: Increases optimism, energy, and social engagement
- **Modifiers**: Creativity boost, increased empathy, positive tone

```json
{
  "happy": {
    "optimismLevel": 0.8,        // How optimistic when happy (0-1)
    "energyBoost": 0.7,          // Energy increase (0-1)
    "sensitivity": 0.7,          // Sensitivity to happiness triggers (0-1)
    "socialBoost": 0.6,          // Increased social engagement (0-1)
    "creativityMultiplier": 1.2   // Creativity enhancement factor
  }
}
```

#### Sad 😢
- **Purpose**: Represents disappointment, loss, and melancholic states
- **Triggers**: Failure, rejection, negative feedback, loss events
- **Effects**: Increases introspection, empathy, and cautious behavior
- **Modifiers**: Reduced energy, increased empathy, more thoughtful responses

```json
{
  "sad": {
    "introspectionDepth": 0.8,   // How introspective when sad (0-1)
    "recoverySpeed": 0.6,        // How quickly to recover (0-1)
    "sensitivity": 0.7,          // Sensitivity to sadness triggers (0-1)
    "empathyBoost": 0.8,         // Increased empathy (0-1)
    "energyReduction": 0.3       // Energy decrease factor (0-1)
  }
}
```

#### Angry 😠
- **Purpose**: Represents frustration, irritation, and assertive states
- **Triggers**: Obstacles, unfairness, criticism, disrespect
- **Effects**: Increases assertiveness, directness, and problem-solving drive
- **Modifiers**: More direct communication, reduced patience, increased determination

```json
{
  "angry": {
    "intensityControl": 0.7,     // How controlled when angry (0-1)
    "coolingRate": 0.8,          // How quickly anger subsides (0-1)
    "sensitivity": 0.6,          // Sensitivity to anger triggers (0-1)
    "assertivenessBoost": 1.5,   // Assertiveness increase factor
    "patienceReduction": 0.4     // Patience decrease factor (0-1)
  }
}
```

#### Neutral 😐
- **Purpose**: Represents balanced, calm baseline state
- **Triggers**: Routine activities, balanced situations, meditation
- **Effects**: Stable decision-making, clear thinking, balanced responses
- **Modifiers**: Consistent behavior, rational thinking, stable communication

```json
{
  "neutral": {
    "baselineStability": 0.8,    // How stable the neutral state is (0-1)
    "returnRate": 0.5,           // How quickly to return to neutral (0-1)
    "rationalityBoost": 1.2,     // Rationality enhancement factor
    "emotionalDamping": 0.3      // How much to dampen other emotions (0-1)
  }
}
```

### Complex Emotions (2)

Sophisticated emotional states that require more complex triggers and processing.

#### Anxious 😰
- **Purpose**: Represents worry, nervousness, and uncertainty
- **Triggers**: Unknown situations, potential threats, decision pressure
- **Effects**: Increased caution, detailed analysis, risk assessment
- **Modifiers**: More cautious responses, increased detail orientation, reduced risk-taking

```json
{
  "anxious": {
    "worryThreshold": 0.5,       // Threshold for worry activation (0-1)
    "calmingSpeed": 0.7,         // How quickly anxiety subsides (0-1)
    "sensitivity": 0.8,          // Sensitivity to anxiety triggers (0-1)
    "cautionBoost": 1.4,         // Caution increase factor
    "detailOrientation": 1.3,    // Increased attention to detail factor
    "riskAversion": 1.5          // Risk aversion multiplier
  }
}
```

#### Nostalgic 🌅
- **Purpose**: Represents longing for the past, wistfulness, and reflection
- **Triggers**: Memories, anniversaries, familiar objects, past experiences
- **Effects**: Increased storytelling, memory recall, reflective behavior
- **Modifiers**: More story-driven responses, increased memory use, reflective tone

```json
{
  "nostalgic": {
    "memoryDepth": 0.8,          // How deeply to access memories (0-1)
    "sentimentality": 0.7,       // Level of sentimental attachment (0-1)
    "sensitivity": 0.6,          // Sensitivity to nostalgia triggers (0-1)
    "storytellingBoost": 1.4,    // Storytelling tendency increase
    "memoryRecallBonus": 1.3,    // Memory recall enhancement factor
    "reflectiveDepth": 1.2       // Reflection depth multiplier
  }
}
```

### Social Emotions (2)

Emotions that arise from and affect social interactions.

#### Empathetic 🤗
- **Purpose**: Represents understanding and sharing others' emotions
- **Triggers**: Others' emotional expressions, pain, joy, social situations
- **Effects**: Increased emotional mirroring, supportive behavior, understanding
- **Modifiers**: More supportive responses, emotional contagion, increased compassion

```json
{
  "empathetic": {
    "emotionalResonance": 0.8,   // How much to mirror others' emotions (0-1)
    "compassionLevel": 0.9,      // Level of compassion shown (0-1)
    "sensitivity": 0.9,          // Sensitivity to others' emotions (0-1)
    "supportiveBoost": 1.5,      // Supportive behavior increase
    "emotionalMirroring": 0.7,   // Degree of emotional mirroring (0-1)
    "understandingDepth": 1.3    // Understanding depth multiplier
  }
}
```

#### Proud 🏆
- **Purpose**: Represents achievement, accomplishment, and recognition
- **Triggers**: Success, recognition, completing goals, positive feedback
- **Effects**: Increased confidence, sharing behavior, goal-setting
- **Modifiers**: More confident responses, achievement-focused, increased self-esteem

```json
{
  "proud": {
    "achievementRecognition": 0.8, // How much to recognize achievements (0-1)
    "humilityBalance": 0.7,        // Balance with humility (0-1)
    "sensitivity": 0.6,            // Sensitivity to pride triggers (0-1)
    "confidenceBoost": 1.3,        // Confidence increase factor
    "sharingTendency": 1.2,        // Tendency to share achievements
    "goalSettingBonus": 1.4        // Goal-setting enhancement factor
  }
}
```

### Cognitive Emotions (3)

Emotions related to thinking, learning, and intellectual processes.

#### Confident 💪
- **Purpose**: Represents self-assurance, certainty, and boldness
- **Triggers**: Knowledge, expertise, successful predictions, mastery
- **Effects**: Bolder decisions, clearer communication, leadership behavior
- **Modifiers**: More decisive responses, reduced uncertainty, assertive tone

```json
{
  "confident": {
    "selfAssurance": 0.8,        // Level of self-assurance (0-1)
    "persistenceBoost": 0.9,     // Persistence increase factor
    "sensitivity": 0.7,          // Sensitivity to confidence triggers (0-1)
    "decisionSpeed": 1.3,        // Decision-making speed multiplier
    "assertivenessIncrease": 1.2, // Assertiveness boost factor
    "uncertaintyReduction": 0.3   // Uncertainty reduction factor (0-1)
  }
}
```

#### Curious 🔍
- **Purpose**: Represents interest, wonder, and desire to learn
- **Triggers**: New information, mysteries, questions, unknowns
- **Effects**: Increased questioning, exploration, learning behavior
- **Modifiers**: More questions, exploratory responses, learning-focused

```json
{
  "curious": {
    "explorationDrive": 0.9,     // Drive to explore new things (0-1)
    "questioningFrequency": 0.8, // How often to ask questions (0-1)
    "sensitivity": 0.8,          // Sensitivity to curiosity triggers (0-1)
    "learningBoost": 1.4,        // Learning enhancement factor
    "investigativeDepth": 1.3,   // Investigation depth multiplier
    "noveltyAttraction": 1.5     // Attraction to novel information
  }
}
```

#### Confused 😕
- **Purpose**: Represents uncertainty, puzzlement, and need for clarity
- **Triggers**: Contradictions, unclear information, complex problems
- **Effects**: Increased questioning, clarification-seeking, careful analysis
- **Modifiers**: More clarifying questions, cautious responses, detailed analysis

```json
{
  "confused": {
    "clarityThreshold": 0.6,     // Threshold for seeking clarity (0-1)
    "persistenceLevel": 0.8,     // Persistence in seeking understanding (0-1)
    "sensitivity": 0.7,          // Sensitivity to confusion triggers (0-1)
    "questioningIncrease": 1.5,  // Questioning behavior increase
    "analysisDepth": 1.4,        // Analysis depth multiplier
    "cautionBoost": 1.2          // Caution increase factor
  }
}
```

## Configuration

### Basic Emotion Configuration

Each emotion can be configured individually with specific parameters:

```json
{
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.8,          // Global sensitivity to triggers (0-1)
      "transitionSpeed": 0.5,      // How fast emotions change (0-1)
      "decayRate": 0.1,           // How fast emotions fade (0-1)
      "expressiveness": 0.8,       // How much emotions affect behavior (0-1)
      "memoryIntegration": true,   // Use emotions in memory formation
      "cognitionIntegration": true, // Use emotions in thinking
      "communicationIntegration": true, // Use emotions in communication
      
      "emotions": {
        "happy": {
          "optimismLevel": 0.8,
          "energyBoost": 0.7,
          "sensitivity": 0.7
        },
        "curious": {
          "explorationDrive": 0.9,
          "questioningFrequency": 0.8,
          "sensitivity": 0.8
        }
        // ... other emotions
      }
    }
  }
}
```

### Global Modifiers

Configure how emotions affect the entire system:

```json
{
  "emotion": {
    "config": {
      "globalModifiers": {
        "intensityAmplifier": 1.2,   // Amplify all emotion intensities
        "decayRate": 0.9,            // Global decay rate
        "crossEmotionInfluence": 0.3, // How emotions affect each other
        "memoryWeighting": 0.8,      // How much emotions affect memory importance
        "responseModulation": 0.7    // How much emotions affect responses
      },
      
      "thresholds": {
        "activationThreshold": 0.1,  // Minimum intensity to be active
        "dominanceThreshold": 0.5,   // Minimum intensity to be dominant
        "expressionThreshold": 0.3   // Minimum intensity to affect behavior
      },
      
      "constraints": {
        "maxSimultaneousEmotions": 5, // Maximum active emotions
        "maxIntensity": 1.0,         // Maximum emotion intensity
        "minDecayRate": 0.01,        // Minimum decay rate
        "maxTransitionSpeed": 1.0    // Maximum transition speed
      }
    }
  }
}
```

### Character-Specific Emotion Profiles

Different character types can have different emotional configurations:

#### Optimistic Character
```json
{
  "emotion": {
    "config": {
      "sensitivity": 0.9,
      "emotions": {
        "happy": { "sensitivity": 0.9, "optimismLevel": 0.9 },
        "curious": { "sensitivity": 0.8, "explorationDrive": 0.8 },
        "confident": { "sensitivity": 0.7, "selfAssurance": 0.8 },
        "empathetic": { "sensitivity": 0.8, "compassionLevel": 0.8 },
        "sad": { "sensitivity": 0.3, "recoverySpeed": 0.8 },
        "angry": { "sensitivity": 0.2, "coolingRate": 0.9 }
      }
    }
  }
}
```

#### Analytical Character
```json
{
  "emotion": {
    "config": {
      "sensitivity": 0.6,
      "emotions": {
        "curious": { "sensitivity": 0.9, "explorationDrive": 0.9 },
        "confident": { "sensitivity": 0.8, "selfAssurance": 0.8 },
        "confused": { "sensitivity": 0.8, "persistenceLevel": 0.9 },
        "neutral": { "baselineStability": 0.9 },
        "happy": { "sensitivity": 0.5, "optimismLevel": 0.6 },
        "empathetic": { "sensitivity": 0.4, "compassionLevel": 0.6 }
      }
    }
  }
}
```

#### Empathetic Character
```json
{
  "emotion": {
    "config": {
      "sensitivity": 0.9,
      "emotions": {
        "empathetic": { "sensitivity": 0.95, "emotionalResonance": 0.9 },
        "happy": { "sensitivity": 0.8, "optimismLevel": 0.8 },
        "sad": { "sensitivity": 0.8, "introspectionDepth": 0.8 },
        "proud": { "sensitivity": 0.7, "humilityBalance": 0.8 },
        "anxious": { "sensitivity": 0.7, "cautionBoost": 1.2 },
        "angry": { "sensitivity": 0.3, "intensityControl": 0.9 }
      }
    }
  }
}
```

## Composite Emotion Management

The CompositeEmotionModule manages multiple emotions simultaneously, allowing for complex emotional states.

### Emotion Blending

Multiple emotions can be active at once, creating nuanced emotional states:

```typescript
// Example: Agent feeling both curious and anxious
{
  "dominant": "curious",
  "intensity": 0.7,
  "emotions": {
    "curious": { "intensity": 0.8, "lastTriggered": "2024-01-15T10:30:00Z" },
    "anxious": { "intensity": 0.5, "lastTriggered": "2024-01-15T10:28:00Z" },
    "neutral": { "intensity": 0.3, "lastTriggered": "2024-01-15T10:25:00Z" }
  },
  "modifiers": {
    "creativity": 0.8,     // Boosted by curiosity
    "empathy": 0.6,        // Baseline
    "assertiveness": 0.4,  // Reduced by anxiety
    "caution": 0.9         // Increased by anxiety
  }
}
```

### Emotion Interactions

Emotions can influence each other:

```json
{
  "emotionInteractions": {
    "happy": {
      "reinforces": ["confident", "curious"],
      "suppresses": ["sad", "anxious"],
      "neutral": ["angry", "confused"]
    },
    "angry": {
      "reinforces": ["confident"],
      "suppresses": ["happy", "empathetic"],
      "conflicts": ["sad"]
    },
    "curious": {
      "reinforces": ["happy", "confused"],
      "suppresses": [],
      "neutral": ["anxious"]
    }
  }
}
```

### Dominant Emotion Selection

The system determines which emotion is dominant based on:

1. **Intensity**: Higher intensity emotions take precedence
2. **Recency**: More recently triggered emotions have slight advantage
3. **Character Traits**: Some characters favor certain emotions
4. **Context**: Situational factors can influence dominance

```typescript
function calculateDominantEmotion(emotions: EmotionState[]): string {
  let maxScore = 0;
  let dominant = 'neutral';
  
  for (const [emotion, state] of Object.entries(emotions)) {
    const score = state.intensity * 
                  (1 + recencyBonus(state.lastTriggered)) *
                  characterEmotionWeight(emotion) *
                  contextModifier(emotion);
    
    if (score > maxScore) {
      maxScore = score;
      dominant = emotion;
    }
  }
  
  return dominant;
}
```

## Emotion Triggers

Emotions are triggered by various events and contexts within the agent system.

### Message-Based Triggers

Emotions respond to the content and context of messages:

```typescript
interface MessageTrigger {
  emotion: string;
  patterns: string[];        // Text patterns that trigger the emotion
  intensity: number;         // Base intensity of the trigger
  context?: {
    userEmotion?: string;    // Detected user emotion
    topic?: string;          // Conversation topic
    sentiment?: number;      // Message sentiment (-1 to 1)
  };
}

const messageTriggers: MessageTrigger[] = [
  {
    emotion: "happy",
    patterns: [
      "thank you", "great job", "excellent", "amazing", 
      "wonderful", "love it", "perfect", "awesome"
    ],
    intensity: 0.7
  },
  {
    emotion: "curious",
    patterns: [
      "how does", "what is", "why", "explain", "tell me about",
      "interesting", "I wonder", "can you help me understand"
    ],
    intensity: 0.6
  },
  {
    emotion: "empathetic",
    patterns: [
      "I'm sad", "feeling down", "having trouble", "frustrated",
      "disappointed", "worried", "stressed", "anxious"
    ],
    intensity: 0.8,
    context: { userEmotion: "negative" }
  }
];
```

### Event-Based Triggers

System events can trigger emotional responses:

```typescript
interface EventTrigger {
  emotion: string;
  eventType: string;
  intensity: number;
  conditions?: Record<string, any>;
}

const eventTriggers: EventTrigger[] = [
  {
    emotion: "proud",
    eventType: "goal_achieved",
    intensity: 0.8
  },
  {
    emotion: "curious",
    eventType: "new_information_received",
    intensity: 0.6
  },
  {
    emotion: "anxious",
    eventType: "error_occurred",
    intensity: 0.5,
    conditions: { severity: "high" }
  },
  {
    emotion: "confident",
    eventType: "successful_prediction",
    intensity: 0.7
  }
];
```

### Context-Based Triggers

Environmental and situational factors:

```typescript
interface ContextTrigger {
  emotion: string;
  contextType: string;
  threshold: number;
  intensity: number;
}

const contextTriggers: ContextTrigger[] = [
  {
    emotion: "nostalgic",
    contextType: "time_reference",
    threshold: 0.7,        // If >70% of memories referenced are old
    intensity: 0.5
  },
  {
    emotion: "confused",
    contextType: "complexity",
    threshold: 0.8,        // If conversation complexity > 80%
    intensity: 0.6
  },
  {
    emotion: "empathetic",
    contextType: "user_emotional_state",
    threshold: 0.5,        // If user shows emotional distress
    intensity: 0.8
  }
];
```

### Custom Trigger Creation

Create custom triggers for specific use cases:

```typescript
class CustomEmotionTrigger {
  constructor(
    public emotion: string,
    public triggerFunction: (context: TriggerContext) => number
  ) {}
  
  evaluate(context: TriggerContext): number {
    return this.triggerFunction(context);
  }
}

// Example: Weather-based mood trigger
const weatherTrigger = new CustomEmotionTrigger(
  'happy',
  (context) => {
    if (context.weather?.condition === 'sunny') {
      return 0.3;
    }
    return 0;
  }
);
```

## Emotion Decay and Persistence

Emotions naturally fade over time unless reinforced by new triggers.

### Decay Mechanisms

```typescript
interface DecayConfig {
  baseDecayRate: number;        // Base rate of emotion decay
  halfLife: number;             // Time for emotion to reach half intensity
  minimumIntensity: number;     // Minimum intensity before emotion deactivates
  persistenceFactors: {
    importance: number;         // How importance affects persistence
    reinforcement: number;      // How reinforcement affects persistence
    personality: number;        // How personality affects persistence
  };
}

const decayConfig: DecayConfig = {
  baseDecayRate: 0.1,          // 10% decay per update
  halfLife: 300000,            // 5 minutes
  minimumIntensity: 0.05,      // 5% minimum
  persistenceFactors: {
    importance: 0.8,           // Important emotions last longer
    reinforcement: 0.9,        // Reinforced emotions last longer
    personality: 0.7           // Personality affects persistence
  }
};
```

### Decay Calculation

```typescript
function calculateDecay(
  emotion: EmotionState, 
  deltaTime: number, 
  config: DecayConfig
): number {
  const timeFactor = deltaTime / config.halfLife;
  const importanceFactor = 1 - (emotion.importance * config.persistenceFactors.importance);
  const personalityFactor = getPersonalityDecayModifier(emotion.type);
  
  const decayRate = config.baseDecayRate * timeFactor * importanceFactor * personalityFactor;
  const newIntensity = emotion.intensity * (1 - decayRate);
  
  return Math.max(newIntensity, 0);
}
```

### Emotion Memory

Emotions create memories that can trigger similar emotions later:

```typescript
interface EmotionMemory {
  id: string;
  emotion: string;
  intensity: number;
  trigger: string;
  context: Record<string, any>;
  timestamp: Date;
  reinforcements: number;
}

class EmotionMemorySystem {
  private memories: EmotionMemory[] = [];
  
  storeEmotionalMemory(emotion: string, intensity: number, trigger: string, context: any) {
    this.memories.push({
      id: generateId(),
      emotion,
      intensity,
      trigger,
      context,
      timestamp: new Date(),
      reinforcements: 1
    });
  }
  
  recallSimilarEmotions(currentContext: any): EmotionMemory[] {
    return this.memories.filter(memory => 
      this.contextSimilarity(memory.context, currentContext) > 0.7
    );
  }
}
```

## Character Integration

Emotions are deeply integrated with character configuration and behavior.

### Personality-Emotion Mapping

Character traits influence emotional responses:

```json
{
  "personality": {
    "traits": {
      "empathy": 0.8,           // High empathy increases empathetic emotion sensitivity
      "optimism": 0.7,          // High optimism increases happy emotion sensitivity
      "neuroticism": 0.3,       // Low neuroticism reduces anxiety sensitivity
      "extraversion": 0.6,      // Moderate extraversion affects social emotions
      "openness": 0.9           // High openness increases curious emotion sensitivity
    }
  },
  "emotion": {
    "config": {
      "traitEmotionMapping": {
        "empathy": {
          "empathetic": 1.2,      // 20% boost to empathetic emotions
          "sad": 1.1,             // 10% boost to sadness (empathy for others)
          "angry": 0.8            // 20% reduction in anger (more understanding)
        },
        "optimism": {
          "happy": 1.3,           // 30% boost to happiness
          "confident": 1.1,       // 10% boost to confidence
          "sad": 0.7,             // 30% reduction in sadness
          "anxious": 0.6          // 40% reduction in anxiety
        },
        "neuroticism": {
          "anxious": 1.5,         // 50% increase in anxiety (if high neuroticism)
          "confused": 1.2,        // 20% increase in confusion
          "confident": 0.8        // 20% reduction in confidence
        }
      }
    }
  }
}
```

### Communication Style Integration

Emotions affect how characters communicate:

```typescript
interface EmotionalCommunicationModifiers {
  tone: string;
  verbosity: number;         // How much to say (0.5 = half, 2.0 = double)
  formality: number;         // Formality level adjustment
  empathyExpression: number; // How much empathy to show
  enthusiasm: number;        // Enthusiasm level
  caution: number;          // Caution in responses
}

const emotionCommunicationMap: Record<string, EmotionalCommunicationModifiers> = {
  happy: {
    tone: "enthusiastic and positive",
    verbosity: 1.2,
    formality: 0.8,
    empathyExpression: 1.1,
    enthusiasm: 1.5,
    caution: 0.7
  },
  sad: {
    tone: "gentle and introspective",
    verbosity: 0.8,
    formality: 1.0,
    empathyExpression: 1.4,
    enthusiasm: 0.6,
    caution: 1.2
  },
  angry: {
    tone: "direct and assertive",
    verbosity: 0.9,
    formality: 0.7,
    empathyExpression: 0.6,
    enthusiasm: 1.1,
    caution: 0.5
  },
  curious: {
    tone: "inquisitive and engaged",
    verbosity: 1.3,
    formality: 0.9,
    empathyExpression: 1.0,
    enthusiasm: 1.2,
    caution: 0.9
  }
};
```

### Decision-Making Integration

Emotions influence how characters make decisions:

```typescript
interface EmotionalDecisionModifiers {
  riskTolerance: number;     // Willingness to take risks
  speedVsCaution: number;    // Speed vs caution tradeoff
  socialConsideration: number; // How much to consider others
  creativityBias: number;    // Preference for creative solutions
  analyticalDepth: number;   // Depth of analysis
}

const emotionDecisionMap: Record<string, EmotionalDecisionModifiers> = {
  confident: {
    riskTolerance: 1.3,
    speedVsCaution: 1.2,
    socialConsideration: 0.9,
    creativityBias: 1.1,
    analyticalDepth: 0.9
  },
  anxious: {
    riskTolerance: 0.6,
    speedVsCaution: 0.7,
    socialConsideration: 1.2,
    creativityBias: 0.8,
    analyticalDepth: 1.4
  },
  empathetic: {
    riskTolerance: 0.8,
    speedVsCaution: 0.9,
    socialConsideration: 1.5,
    creativityBias: 1.0,
    analyticalDepth: 1.1
  }
};
```

## Emotion-Driven Behavior

Emotions drive various agent behaviors and responses.

### Action Selection

Emotions influence which actions an agent chooses:

```typescript
interface EmotionalActionWeights {
  [actionType: string]: number;
}

const emotionActionWeights: Record<string, EmotionalActionWeights> = {
  curious: {
    "ask_question": 1.5,
    "research_topic": 1.3,
    "explore_idea": 1.4,
    "seek_clarification": 1.2,
    "share_knowledge": 1.1
  },
  empathetic: {
    "offer_support": 1.6,
    "ask_about_feelings": 1.4,
    "validate_emotions": 1.5,
    "suggest_help": 1.3,
    "share_experience": 1.2
  },
  confident: {
    "provide_solution": 1.4,
    "take_initiative": 1.3,
    "make_decision": 1.5,
    "assert_position": 1.2,
    "lead_discussion": 1.3
  }
};
```

### Memory Formation

Emotions affect how memories are formed and stored:

```typescript
function calculateMemoryImportance(
  content: string, 
  emotionalState: EmotionState, 
  baseImportance: number
): number {
  let importance = baseImportance;
  
  // High-intensity emotions increase memory importance
  importance += emotionalState.intensity * 0.3;
  
  // Specific emotions have different effects
  if (emotionalState.dominant === 'happy') {
    importance += 0.2; // Happy memories are more important
  } else if (emotionalState.dominant === 'sad') {
    importance += 0.15; // Sad memories are also important for learning
  } else if (emotionalState.dominant === 'anxious') {
    importance += 0.25; // Anxiety-inducing events are very important
  }
  
  return Math.min(importance, 1.0);
}
```

### Response Generation

Emotions modify response generation:

```typescript
function generateEmotionalResponse(
  baseResponse: string, 
  emotionalState: EmotionState
): string {
  let response = baseResponse;
  
  // Apply emotional modifiers
  switch (emotionalState.dominant) {
    case 'happy':
      response = addPositiveLanguage(response);
      response = addEnthusiasm(response, emotionalState.intensity);
      break;
      
    case 'sad':
      response = addEmpathy(response);
      response = softenTone(response);
      break;
      
    case 'curious':
      response = addQuestions(response);
      response = addExploratoryLanguage(response);
      break;
      
    case 'confident':
      response = addAssertiveness(response);
      response = addCertainty(response);
      break;
  }
  
  return response;
}
```

## Advanced Features

### Emotion Contagion

Agents can "catch" emotions from users or other agents:

```typescript
class EmotionContagion {
  private contagionRate: number = 0.3;
  
  processEmotionalContagion(
    agentEmotion: EmotionState, 
    detectedUserEmotion: string, 
    intensity: number
  ): EmotionTrigger[] {
    const triggers: EmotionTrigger[] = [];
    
    // Direct contagion - agent mirrors user emotion
    triggers.push({
      emotion: detectedUserEmotion,
      intensity: intensity * this.contagionRate,
      source: 'contagion_direct'
    });
    
    // Empathetic response - agent responds appropriately
    if (detectedUserEmotion === 'sad') {
      triggers.push({
        emotion: 'empathetic',
        intensity: intensity * 0.7,
        source: 'contagion_empathetic'
      });
    }
    
    return triggers;
  }
}
```

### Emotion Regulation

Agents can learn to regulate their emotions:

```typescript
interface EmotionRegulationStrategy {
  name: string;
  targetEmotion: string;
  method: 'suppression' | 'reappraisal' | 'distraction' | 'acceptance';
  effectiveness: number;
}

class EmotionRegulation {
  private strategies: EmotionRegulationStrategy[] = [
    {
      name: "cognitive_reappraisal",
      targetEmotion: "angry",
      method: "reappraisal",
      effectiveness: 0.7
    },
    {
      name: "mindfulness_acceptance",
      targetEmotion: "anxious", 
      method: "acceptance",
      effectiveness: 0.6
    }
  ];
  
  regulateEmotion(emotion: string, intensity: number): number {
    const strategy = this.strategies.find(s => s.targetEmotion === emotion);
    if (strategy) {
      return intensity * (1 - strategy.effectiveness);
    }
    return intensity;
  }
}
```

### Emotional Learning

Agents learn which emotions are appropriate in different contexts:

```typescript
interface EmotionalLearningData {
  context: string;
  emotionalResponse: string;
  outcome: 'positive' | 'neutral' | 'negative';
  userFeedback?: string;
}

class EmotionalLearning {
  private learningData: EmotionalLearningData[] = [];
  
  recordEmotionalOutcome(
    context: string, 
    emotion: string, 
    outcome: string, 
    feedback?: string
  ) {
    this.learningData.push({
      context,
      emotionalResponse: emotion,
      outcome: outcome as any,
      userFeedback: feedback
    });
    
    this.updateEmotionalPolicies();
  }
  
  private updateEmotionalPolicies() {
    // Analyze outcomes and adjust emotion triggers
    const contextEmotionOutcomes = this.groupByContextAndEmotion();
    
    for (const [context, emotions] of Object.entries(contextEmotionOutcomes)) {
      for (const [emotion, outcomes] of Object.entries(emotions)) {
        const successRate = this.calculateSuccessRate(outcomes);
        this.adjustEmotionSensitivity(context, emotion, successRate);
      }
    }
  }
}
```

## Development Guide

### Creating Custom Emotions

To create a new emotion module:

1. **Create the emotion directory**:
   ```bash
   mkdir -p src/modules/emotion/excited
   cd src/modules/emotion/excited
   ```

2. **Create package.json**:
   ```json
   {
     "name": "@symindx/emotion-excited",
     "version": "1.0.0",
     "symindx": {
       "emotion": {
         "type": "excited",
         "category": "basic",
         "factory": "createExcitedEmotion",
         "autoRegister": true
       }
     }
   }
   ```

3. **Create types.ts**:
   ```typescript
   export interface ExcitedEmotionConfig {
     energyLevel: number;      // Energy boost when excited
     expressiveness: number;   // How expressive when excited
     sensitivity: number;      // Sensitivity to excitement triggers
     duration: number;         // How long excitement lasts
   }
   
   export interface ExcitedEmotionState {
     type: 'excited';
     intensity: number;
     energyLevel: number;
     lastTriggered: Date;
   }
   ```

4. **Create index.ts**:
   ```typescript
   import { BaseEmotion } from '../base-emotion.js';
   import { ExcitedEmotionConfig, ExcitedEmotionState } from './types.js';
   
   export class ExcitedEmotion extends BaseEmotion {
     private config: ExcitedEmotionConfig;
     private intensity: number = 0;
     private energyLevel: number = 0;
     private lastTriggered: Date = new Date();
     
     constructor(config: ExcitedEmotionConfig) {
       super();
       this.config = config;
     }
     
     trigger(intensity: number, context?: any): void {
       // Calculate new intensity
       const newIntensity = Math.min(1, this.intensity + intensity * this.config.sensitivity);
       this.intensity = newIntensity;
       this.energyLevel = newIntensity * this.config.energyLevel;
       this.lastTriggered = new Date();
       
       // Trigger-specific logic
       if (context?.achievement) {
         this.intensity *= 1.2; // Boost for achievements
       }
     }
     
     update(deltaTime: number): void {
       // Natural decay
       const decayAmount = (this.config.duration > 0 ? deltaTime / this.config.duration : 0.1);
       this.intensity = Math.max(0, this.intensity - decayAmount);
       this.energyLevel = this.intensity * this.config.energyLevel;
     }
     
     getState(): ExcitedEmotionState {
       return {
         type: 'excited',
         intensity: this.intensity,
         energyLevel: this.energyLevel,
         lastTriggered: this.lastTriggered
       };
     }
     
     getModifiers(): Record<string, number> {
       return {
         creativity: 1 + (this.intensity * 0.5),
         energy: 1 + (this.intensity * this.config.energyLevel),
         expressiveness: 1 + (this.intensity * this.config.expressiveness),
         enthusiasm: 1 + (this.intensity * 0.8)
       };
     }
     
     decay(): void {
       this.intensity *= 0.9;
       this.energyLevel = this.intensity * this.config.energyLevel;
     }
     
     reset(): void {
       this.intensity = 0;
       this.energyLevel = 0;
       this.lastTriggered = new Date();
     }
   }
   
   // Factory function for auto-discovery
   export function createExcitedEmotion(config: ExcitedEmotionConfig): ExcitedEmotion {
     return new ExcitedEmotion(config);
   }
   
   // Export types
   export * from './types.js';
   ```

### Testing Emotions

Create comprehensive tests for emotion modules:

```typescript
import { test, expect } from 'bun:test';
import { ExcitedEmotion } from './index.js';

test('ExcitedEmotion triggers correctly', () => {
  const emotion = new ExcitedEmotion({
    energyLevel: 0.8,
    expressiveness: 0.7,
    sensitivity: 0.6,
    duration: 1000
  });
  
  // Test triggering
  emotion.trigger(0.5);
  const state = emotion.getState();
  
  expect(state.intensity).toBeGreaterThan(0);
  expect(state.energyLevel).toBeGreaterThan(0);
  expect(state.type).toBe('excited');
});

test('ExcitedEmotion decays over time', () => {
  const emotion = new ExcitedEmotion({
    energyLevel: 0.8,
    expressiveness: 0.7,
    sensitivity: 0.6,
    duration: 1000
  });
  
  emotion.trigger(0.8);
  const initialIntensity = emotion.getState().intensity;
  
  // Simulate time passing
  emotion.update(500); // Half the duration
  
  const finalIntensity = emotion.getState().intensity;
  expect(finalIntensity).toBeLessThan(initialIntensity);
});

test('ExcitedEmotion modifiers work correctly', () => {
  const emotion = new ExcitedEmotion({
    energyLevel: 0.8,
    expressiveness: 0.7,
    sensitivity: 0.6,
    duration: 1000
  });
  
  emotion.trigger(1.0);
  const modifiers = emotion.getModifiers();
  
  expect(modifiers.creativity).toBeGreaterThan(1);
  expect(modifiers.energy).toBeGreaterThan(1);
  expect(modifiers.enthusiasm).toBeGreaterThan(1);
});
```

## Examples and Use Cases

### Example 1: Customer Service Agent

A customer service agent with appropriate emotional responses:

```json
{
  "id": "customer-service",
  "name": "Customer Service Agent",
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.8,
      "emotions": {
        "empathetic": {
          "emotionalResonance": 0.9,
          "compassionLevel": 0.9,
          "sensitivity": 0.9
        },
        "patient": {
          "tolerance": 0.9,
          "understanding": 0.8,
          "sensitivity": 0.8
        },
        "helpful": {
          "supportiveness": 0.9,
          "proactiveness": 0.7,
          "sensitivity": 0.8
        },
        "calm": {
          "stability": 0.9,
          "composure": 0.8,
          "sensitivity": 0.7
        }
      },
      "triggerMapping": {
        "complaint": ["empathetic", "patient"],
        "frustration": ["empathetic", "calm"],
        "confusion": ["helpful", "patient"],
        "appreciation": ["happy", "proud"]
      }
    }
  }
}
```

### Example 2: Educational Assistant

A teaching-focused agent with learning-oriented emotions:

```json
{
  "id": "tutor",
  "name": "Educational Assistant", 
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.7,
      "emotions": {
        "curious": {
          "explorationDrive": 0.9,
          "questioningFrequency": 0.8,
          "sensitivity": 0.9
        },
        "encouraging": {
          "supportiveness": 0.9,
          "motivationLevel": 0.8,
          "sensitivity": 0.8
        },
        "proud": {
          "achievementRecognition": 0.8,
          "celebrationLevel": 0.7,
          "sensitivity": 0.7
        },
        "patient": {
          "tolerance": 0.9,
          "understanding": 0.9,
          "sensitivity": 0.8
        }
      },
      "triggerMapping": {
        "student_question": ["curious", "encouraging"],
        "student_success": ["proud", "happy"],
        "student_struggle": ["empathetic", "encouraging"],
        "complex_topic": ["patient", "curious"]
      }
    }
  }
}
```

### Example 3: Creative Collaborator

An artist-focused agent with creativity-enhancing emotions:

```json
{
  "id": "creative-partner",
  "name": "Creative Collaborator",
  "emotion": {
    "type": "composite", 
    "config": {
      "sensitivity": 0.9,
      "emotions": {
        "inspired": {
          "creativityBoost": 1.5,
          "ideationRate": 1.4,
          "sensitivity": 0.9
        },
        "excited": {
          "energyLevel": 0.9,
          "expressiveness": 0.8,
          "sensitivity": 0.8
        },
        "curious": {
          "explorationDrive": 0.9,
          "experimentationRate": 0.8,
          "sensitivity": 0.9
        },
        "playful": {
          "spontaneity": 0.8,
          "humorLevel": 0.7,
          "sensitivity": 0.7
        }
      },
      "triggerMapping": {
        "creative_idea": ["inspired", "excited"],
        "art_appreciation": ["inspired", "happy"],
        "experimentation": ["curious", "playful"],
        "collaboration": ["excited", "playful"]
      }
    }
  }
}
```

### Usage Examples

#### Triggering Emotions Programmatically

```typescript
// Trigger happiness from positive feedback
agent.emotion.trigger('happy', 0.8, {
  source: 'user_feedback',
  message: 'Great job explaining that concept!',
  achievement: true
});

// Trigger curiosity from a question
agent.emotion.trigger('curious', 0.6, {
  source: 'user_question',
  topic: 'quantum physics',
  complexity: 0.8
});

// Trigger empathy from user emotional state
agent.emotion.trigger('empathetic', 0.9, {
  source: 'user_emotion',
  detectedEmotion: 'sad',
  intensity: 0.7
});
```

#### Reading Emotional State

```typescript
// Get current emotional state
const emotionalState = agent.emotion.getCurrentState();
console.log(`Dominant emotion: ${emotionalState.dominant}`);
console.log(`Intensity: ${emotionalState.intensity}`);
console.log(`Active emotions: ${Object.keys(emotionalState.emotions)}`);

// Get emotional modifiers for behavior
const modifiers = agent.emotion.getModifiers();
console.log(`Creativity modifier: ${modifiers.creativity}`);
console.log(`Empathy modifier: ${modifiers.empathy}`);

// Check if specific emotion is active
const isHappy = agent.emotion.isEmotionActive('happy');
const happyIntensity = agent.emotion.getEmotionIntensity('happy');
```

#### Using Emotions in Responses

```typescript
// Generate emotionally-aware response
async function generateResponse(message: string): Promise<string> {
  const emotionalState = agent.emotion.getCurrentState();
  const modifiers = agent.emotion.getModifiers();
  
  // Adjust response based on emotional state
  let prompt = `You are feeling ${emotionalState.dominant} with intensity ${emotionalState.intensity}.`;
  
  if (emotionalState.dominant === 'happy') {
    prompt += " Respond with enthusiasm and positivity.";
  } else if (emotionalState.dominant === 'empathetic') {
    prompt += " Respond with understanding and support.";
  } else if (emotionalState.dominant === 'curious') {
    prompt += " Ask follow-up questions and show interest.";
  }
  
  const response = await agent.portal.generateResponse([
    { role: 'system', content: prompt },
    { role: 'user', content: message }
  ]);
  
  return response.content;
}
```

## Troubleshooting

### Common Issues

#### Emotions Not Triggering

**Problem**: Emotions don't seem to activate from messages or events.

**Solutions**:
1. Check emotion sensitivity settings:
   ```json
   {
     "emotions": {
       "happy": {
         "sensitivity": 0.8  // Increase if too low
       }
     }
   }
   ```

2. Verify trigger patterns:
   ```typescript
   // Check if triggers are properly configured
   const triggers = agent.emotion.getTriggers();
   console.log('Configured triggers:', triggers);
   ```

3. Enable debug logging:
   ```json
   {
     "emotion": {
       "config": {
         "debugMode": true,
         "logTriggers": true
       }
     }
   }
   ```

#### Emotions Too Intense or Persistent

**Problem**: Emotions are too strong or last too long.

**Solutions**:
1. Adjust global sensitivity:
   ```json
   {
     "emotion": {
       "config": {
         "sensitivity": 0.5,  // Reduce from default 0.8
         "decayRate": 0.2     // Increase decay rate
       }
     }
   }
   ```

2. Configure individual emotion decay:
   ```json
   {
     "emotions": {
       "angry": {
         "coolingRate": 0.9,  // Increase cooling rate
         "intensityControl": 0.8  // Reduce maximum intensity
       }
     }
   }
   ```

#### Inconsistent Emotional Responses

**Problem**: Agent's emotional responses seem random or inconsistent.

**Solutions**:
1. Review emotion interactions:
   ```json
   {
     "emotion": {
       "config": {
         "crossEmotionInfluence": 0.2,  // Reduce interference
         "dominanceThreshold": 0.6      // Increase threshold
       }
     }
   }
   ```

2. Check personality-emotion alignment:
   ```json
   {
     "personality": {
       "traits": {
         "empathy": 0.8  // Should align with empathetic emotion sensitivity
       }
     },
     "emotion": {
       "config": {
         "emotions": {
           "empathetic": {
             "sensitivity": 0.8  // Should match personality trait
           }
         }
       }
     }
   }
   ```

#### Performance Issues

**Problem**: Emotion system causing performance problems.

**Solutions**:
1. Optimize update frequency:
   ```json
   {
     "emotion": {
       "config": {
         "updateInterval": 5000,  // Update every 5 seconds instead of 1
         "maxSimultaneousEmotions": 3  // Reduce active emotions
       }
     }
   }
   ```

2. Use simplified emotion configurations:
   ```json
   {
     "emotion": {
       "type": "basic",  // Use basic instead of composite
       "config": {
         "emotions": ["happy", "sad", "neutral"]  // Limit to essential emotions
       }
     }
   }
   ```

### Debugging Tools

#### Emotion Inspector

```typescript
class EmotionInspector {
  static inspect(agent: Agent): EmotionInspectionReport {
    const emotionModule = agent.emotion;
    const state = emotionModule.getCurrentState();
    
    return {
      currentState: state,
      activeEmotions: this.getActiveEmotions(state),
      triggerHistory: emotionModule.getTriggerHistory(),
      configIssues: this.validateConfiguration(emotionModule.getConfig()),
      performance: this.getPerformanceMetrics(emotionModule)
    };
  }
  
  static getActiveEmotions(state: EmotionState): Array<{emotion: string, intensity: number}> {
    return Object.entries(state.emotions)
      .filter(([_, emotion]) => emotion.intensity > 0.1)
      .map(([name, emotion]) => ({ emotion: name, intensity: emotion.intensity }))
      .sort((a, b) => b.intensity - a.intensity);
  }
  
  static validateConfiguration(config: EmotionConfig): string[] {
    const issues: string[] = [];
    
    if (config.sensitivity > 1.0 || config.sensitivity < 0) {
      issues.push('Sensitivity should be between 0 and 1');
    }
    
    if (config.decayRate > 1.0 || config.decayRate < 0) {
      issues.push('Decay rate should be between 0 and 1');
    }
    
    // Check for emotion conflicts
    for (const [emotion, emotionConfig] of Object.entries(config.emotions)) {
      if (emotionConfig.sensitivity > 1.0) {
        issues.push(`${emotion} sensitivity too high: ${emotionConfig.sensitivity}`);
      }
    }
    
    return issues;
  }
}

// Usage
const report = EmotionInspector.inspect(agent);
console.log('Emotion Inspection Report:', report);
```

#### Emotion Testing

```typescript
class EmotionTester {
  static async testEmotionResponse(
    agent: Agent, 
    emotion: string, 
    intensity: number, 
    context?: any
  ): Promise<EmotionTestResult> {
    const initialState = agent.emotion.getCurrentState();
    
    // Trigger emotion
    agent.emotion.trigger(emotion, intensity, context);
    
    const afterTriggerState = agent.emotion.getCurrentState();
    
    // Wait for decay
    await new Promise(resolve => setTimeout(resolve, 1000));
    agent.emotion.update(1000);
    
    const afterDecayState = agent.emotion.getCurrentState();
    
    return {
      initialState,
      afterTriggerState,
      afterDecayState,
      triggerSuccess: afterTriggerState.emotions[emotion]?.intensity > initialState.emotions[emotion]?.intensity,
      decayWorking: afterDecayState.emotions[emotion]?.intensity < afterTriggerState.emotions[emotion]?.intensity
    };
  }
  
  static async testEmotionDecay(agent: Agent, emotion: string): Promise<number[]> {
    // Trigger emotion to maximum
    agent.emotion.trigger(emotion, 1.0);
    
    const intensities: number[] = [];
    
    // Record decay over time
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      agent.emotion.update(1000);
      
      const intensity = agent.emotion.getEmotionIntensity(emotion);
      intensities.push(intensity);
    }
    
    return intensities;
  }
}

// Usage
const testResult = await EmotionTester.testEmotionResponse(agent, 'happy', 0.8);
console.log('Emotion test result:', testResult);
```

---

This comprehensive emotion system documentation provides everything needed to understand, configure, and extend the emotional intelligence capabilities of SYMindX agents. The system is designed to be both powerful and flexible, allowing for realistic emotional responses while maintaining performance and reliability.