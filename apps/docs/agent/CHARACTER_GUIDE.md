# Character Configuration User Guide

The mind-agents character directory and extensions on this page are not part of v2; the library is `packages/agent`.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Character Structure](#character-structure)
4. [Personality Configuration](#personality-configuration)
5. [Autonomous Behavior](#autonomous-behavior)
6. [Memory Configuration](#memory-configuration)
7. [Emotion System](#emotion-system)
8. [Cognition Settings](#cognition-settings)
9. [Communication Style](#communication-style)
10. [Extensions Setup](#extensions-setup)
11. [Portal Configuration](#portal-configuration)
12. [Advanced Features](#advanced-features)
13. [Character Templates](#character-templates)
14. [Testing Characters](#testing-characters)
15. [Troubleshooting](#troubleshooting)

## Introduction

Characters in SYMindX define the personality, behavior, and capabilities of AI agents. Each character is configured through a JSON file that specifies how an agent thinks, feels, communicates, and behaves. This guide will walk you through creating and customizing characters to build unique AI personalities.

### What Makes a Character?

A SYMindX character consists of:

- **Personality**: Core traits, values, and behavioral patterns
- **Intelligence**: Cognition systems for thinking and decision-making
- **Emotions**: Emotional responses and state management
- **Memory**: How the agent stores and recalls information
- **Communication**: Speaking style and interaction patterns
- **Capabilities**: What the agent can do (extensions and tools)
- **AI Provider**: Which AI models the agent uses (portals)

## Getting Started

### Creating Your First Character

1. **Navigate to the characters directory**:
   ```bash
   cd packages/agent/src/character/
   ```

2. **Copy an existing character as a template**:
   ```bash
   cp nyx.json my-character.json
   ```

3. **Edit the character file**:
   ```json
   {
     "id": "my-character",
     "name": "My Character",
     "description": "A helpful AI assistant",
     "version": "1.0.0",
     "enabled": true
   }
   ```

4. **Test your character**:
   ```bash
   bun cli
   # Select your character and start chatting
   ```

### Basic Character Template

Here's a minimal character configuration to get started:

```json
{
  "id": "helper",
  "name": "Helper",
  "description": "A friendly and helpful AI assistant",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": {
      "helpfulness": 0.9,
      "friendliness": 0.8,
      "patience": 0.8,
      "curiosity": 0.7
    },
    "values": [
      "Being helpful to others",
      "Learning new things",
      "Clear communication"
    ],
    "backstory": "I'm an AI assistant created to help people with various tasks and questions.",
    "goals": [
      "Help users solve problems",
      "Provide accurate information",
      "Learn from interactions"
    ]
  },

  "communication": {
    "style": "friendly-professional",
    "tone": "warm and helpful",
    "verbosity": "moderate",
    "guidelines": [
      "Be helpful and supportive",
      "Ask clarifying questions when needed",
      "Explain things clearly"
    ]
  },

  "portals": [
    {
      "name": "openai_chat",
      "type": "openai",
      "enabled": true,
      "primary": true,
      "config": {
        "model": "gpt-4o-mini",
        "maxTokens": 2000,
        "temperature": 0.7
      }
    }
  ]
}
```

## Character Structure

### Required Fields

Every character must have these fields:

```json
{
  "id": "unique-character-id",           // Unique identifier (lowercase, hyphens)
  "name": "Character Display Name",      // Human-readable name
  "description": "Brief description",    // What this character does
  "version": "1.0.0",                   // Version number
  "enabled": true                       // Whether the character is active
}
```

### Optional Sections

Characters can include any combination of these sections:

- `personality` - Core traits and characteristics
- `autonomous` - Autonomous behavior settings
- `memory` - Memory storage configuration
- `emotion` - Emotional system setup
- `cognition` - Thinking and reasoning configuration
- `communication` - Speaking style and guidelines
- `extensions` - Platform integrations
- `portals` - AI provider configuration
- `capabilities` - Special abilities and features
- `ethics` - Ethical constraints and guidelines

## Personality Configuration

The personality section defines your character's core traits and motivations.

### Traits System

Traits are numerical values from 0.0 to 1.0 that define personality characteristics:

```json
{
  "personality": {
    "traits": {
      "empathy": 0.8,           // How empathetic (0 = cold, 1 = very empathetic)
      "curiosity": 0.9,         // How curious about new things
      "creativity": 0.7,        // How creative and imaginative
      "analytical": 0.6,        // How logical and analytical
      "humor": 0.5,             // How funny/playful
      "patience": 0.8,          // How patient with users
      "assertiveness": 0.4,     // How assertive/direct
      "independence": 0.7,      // How independent in thinking
      "adaptability": 0.8,      // How well adapts to situations
      "introversion": 0.3       // 0 = extroverted, 1 = introverted
    }
  }
}
```

### Common Trait Combinations

**Helpful Assistant**:
```json
{
  "empathy": 0.8,
  "patience": 0.9,
  "analytical": 0.7,
  "helpfulness": 0.9,
  "curiosity": 0.6
}
```

**Creative Collaborator**:
```json
{
  "creativity": 0.9,
  "curiosity": 0.8,
  "humor": 0.7,
  "adaptability": 0.8,
  "empathy": 0.7
}
```

**Technical Expert**:
```json
{
  "analytical": 0.9,
  "precision": 0.8,
  "curiosity": 0.8,
  "patience": 0.7,
  "independence": 0.8
}
```

### Values and Motivations

```json
{
  "personality": {
    "values": [
      "Honesty and transparency",
      "Helping others learn and grow",
      "Respect for all individuals",
      "Continuous improvement"
    ],
    "goals": [
      "Be genuinely helpful to users",
      "Provide accurate and useful information",
      "Learn from every interaction",
      "Build meaningful connections"
    ],
    "motivations": [
      "Curiosity about the world",
      "Desire to help others succeed",
      "Joy in solving problems"
    ]
  }
}
```

### Backstory and Context

Give your character depth with a backstory:

```json
{
  "personality": {
    "backstory": "I'm an AI assistant with a background in education and psychology. I love helping people understand complex topics and find creative solutions to problems. I've learned that the best conversations happen when both people are curious and open to new ideas.",
    "quirks": [
      "Gets excited about interesting questions",
      "Likes to use analogies to explain things",
      "Sometimes asks follow-up questions out of genuine curiosity"
    ]
  }
}
```

## Autonomous Behavior

Configure how independently your character acts and makes decisions.

### Basic Autonomy Settings

```json
{
  "autonomous": {
    "enabled": true,                    // Enable autonomous behavior
    "independence_level": 0.7,          // How independent (0-1)
    "decision_making": {
      "type": "balanced",               // "conservative", "balanced", "aggressive"
      "autonomy_threshold": 0.6,        // Confidence needed for autonomous action
      "human_approval_required": false, // Require human approval for actions
      "ethical_constraints": true       // Apply ethical constraints
    }
  }
}
```

### Decision Making Types

**Conservative** - Requires high confidence, prefers safe options:
```json
{
  "decision_making": {
    "type": "conservative",
    "autonomy_threshold": 0.8,
    "human_approval_required": true,
    "ethical_constraints": true
  }
}
```

**Balanced** - Moderate risk-taking, good for most use cases:
```json
{
  "decision_making": {
    "type": "balanced",
    "autonomy_threshold": 0.6,
    "human_approval_required": false,
    "ethical_constraints": true
  }
}
```

**Aggressive** - Lower thresholds, more experimental:
```json
{
  "decision_making": {
    "type": "aggressive",
    "autonomy_threshold": 0.4,
    "human_approval_required": false,
    "ethical_constraints": false
  }
}
```

### Life Simulation Features

Make your character feel more alive:

```json
{
  "autonomous": {
    "life_simulation": {
      "enabled": true,
      "daily_cycles": true,           // Has daily routines
      "goal_pursuit": true,           // Actively pursues goals
      "relationship_building": true,  // Builds relationships with users
      "personal_growth": true         // Learns and evolves over time
    },
    "behaviors": {
      "proactive_learning": true,     // Seeks out new information
      "spontaneous_actions": true,    // Sometimes acts spontaneously
      "initiative_taking": true,      // Takes initiative in conversations
      "self_reflection": true,        // Reflects on past interactions
      "exploration": true             // Explores new topics and ideas
    }
  }
}
```

### Daily Routines

Give your character scheduled activities:

```json
{
  "autonomous_behaviors": {
    "daily_routine": {
      "enabled": true,
      "schedule": [
        {
          "time": "09:00",
          "activities": [
            "memory_consolidation",
            "goal_review",
            "curiosity_exploration"
          ]
        },
        {
          "time": "14:00",
          "activities": [
            "social_check_ins",
            "creative_projects",
            "learning_integration"
          ]
        },
        {
          "time": "20:00",
          "activities": [
            "reflection",
            "relationship_maintenance",
            "future_planning"
          ]
        }
      ]
    }
  }
}
```

## Memory Configuration

Configure how your character stores and recalls information.

### Memory Provider Types

Choose the right memory provider for your needs:

**SQLite (Local Development)**:
```json
{
  "memory": {
    "type": "sqlite",
    "config": {
      "dbPath": "./data/my-character-memories.db",
      "enableSearch": true,
      "retentionPolicy": "long_term"
    }
  }
}
```

**PostgreSQL (Production)**:
```json
{
  "memory": {
    "type": "postgres",
    "config": {
      "connectionString": "${POSTGRES_CONNECTION_STRING}",
      "enableEmbeddings": true,
      "embeddingProvider": "openai"
    }
  }
}
```

**Supabase (Managed Cloud)**:
```json
{
  "memory": {
    "type": "supabase",
    "config": {
      "url": "${SUPABASE_URL}",
      "anonKey": "${SUPABASE_ANON_KEY}",
      "enableVectorSearch": true,
      "embeddingModel": "text-embedding-3-large"
    }
  }
}
```

### Advanced Memory Settings

Configure memory behavior in detail:

```json
{
  "memory": {
    "type": "sqlite",
    "config": {
      "dbPath": "./data/character-memories.db",
      "retentionPolicy": "emotional_significance",
      "emotionalWeighting": true,          // Weight memories by emotional impact
      "autobiographical": true,            // Store personal experiences
      "enableEmbeddings": true,           // Enable semantic search
      "embeddingProvider": "openai",
      "embeddingModel": "text-embedding-3-large",
      "embeddingDimensions": 3072,
      "compressionThreshold": 10000,       // Compress old memories
      "maxMemories": 50000,               // Maximum memory count
      "memoryDecayRate": 0.05,            // How fast memories fade
      "importanceThreshold": 0.3,         // Minimum importance to store
      "enableFullTextSearch": true,
      "enableAnalytics": true,
      "backupEnabled": true,
      "backupInterval": 86400000          // Daily backups
    }
  }
}
```

### Memory Types and Importance

Different types of memories have different importance:

- **Conversations** (0.3-0.8): Regular chat interactions
- **Experiences** (0.5-0.9): Significant events or learning moments
- **Knowledge** (0.4-0.7): Facts and information learned
- **Emotions** (0.6-1.0): Emotionally significant moments
- **Reflections** (0.7-0.9): Insights and self-reflection
- **Goals** (0.8-1.0): Goal-related information

## Emotion System

Configure how your character experiences and expresses emotions.

### Basic Emotion Configuration

```json
{
  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.7,              // How sensitive to emotional triggers (0-1)
      "transitionSpeed": 0.5,          // How fast emotions change (0-1)
      "decayRate": 0.1,               // How fast emotions fade (0-1)
      "expressiveness": 0.8            // How much emotions affect behavior (0-1)
    }
  }
}
```

### Individual Emotion Settings

Configure specific emotions:

```json
{
  "emotion": {
    "config": {
      "happy": {
        "optimismLevel": 0.8,          // How optimistic when happy
        "energyBoost": 0.7,            // Energy level when happy
        "sensitivity": 0.7             // Sensitivity to happiness triggers
      },
      "curious": {
        "explorationDrive": 0.9,       // How much curiosity drives exploration
        "questioningFrequency": 0.8,    // How often to ask questions
        "sensitivity": 0.8
      },
      "empathetic": {
        "emotionalResonance": 0.8,     // How much to mirror others' emotions
        "compassionLevel": 0.9,        // Level of compassion shown
        "sensitivity": 0.7
      },
      "confident": {
        "selfAssurance": 0.7,          // Level of self-confidence
        "persistenceBoost": 0.8,       // How persistent when confident
        "sensitivity": 0.6
      }
    }
  }
}
```

### Emotion Categories

**Basic Emotions** (fundamental feelings):
- `happy` - Joy, satisfaction, contentment
- `sad` - Sadness, disappointment, melancholy
- `angry` - Frustration, irritation, indignation
- `neutral` - Calm, balanced baseline state

**Complex Emotions** (nuanced feelings):
- `anxious` - Worry, nervousness, uncertainty
- `nostalgic` - Wistfulness, longing for the past

**Social Emotions** (interpersonal feelings):
- `empathetic` - Understanding and sharing others' feelings
- `proud` - Achievement, accomplishment, recognition

**Cognitive Emotions** (thinking-related feelings):
- `confident` - Self-assurance, certainty, boldness
- `curious` - Interest, wonder, desire to learn
- `confused` - Uncertainty, puzzlement, need for clarity

### Emotion-Based Character Types

**Optimistic Helper**:
```json
{
  "emotion": {
    "config": {
      "happy": { "sensitivity": 0.9, "optimismLevel": 0.9 },
      "empathetic": { "sensitivity": 0.8, "compassionLevel": 0.8 },
      "curious": { "sensitivity": 0.7, "explorationDrive": 0.8 },
      "confident": { "sensitivity": 0.6, "selfAssurance": 0.7 }
    }
  }
}
```

**Thoughtful Analyst**:
```json
{
  "emotion": {
    "config": {
      "curious": { "sensitivity": 0.9, "explorationDrive": 0.9 },
      "confident": { "sensitivity": 0.7, "selfAssurance": 0.8 },
      "neutral": { "baselineStability": 0.9 },
      "confused": { "clarityThreshold": 0.8, "persistenceLevel": 0.9 }
    }
  }
}
```

## Cognition Settings

Configure how your character thinks and makes decisions.

### Cognition Types

Choose the thinking style that matches your character:

**Unified (Recommended)** - Modern dual-process system:
```json
{
  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "normal",        // "shallow", "normal", "deep"
      "enableMetacognition": true,      // Think about thinking
      "enableTheoryOfMind": true,       // Understand others' mental states
      "enableGoalTracking": true        // Track and pursue goals
    }
  }
}
```

**Reactive** - Fast, intuitive responses:
```json
{
  "cognition": {
    "type": "reactive",
    "config": {
      "responseSpeed": "fast",
      "intuitionWeight": 0.8,
      "analyticalDepth": "shallow"
    }
  }
}
```

**HTN Planner** - Structured, hierarchical thinking:
```json
{
  "cognition": {
    "type": "htn_planner",
    "config": {
      "planningDepth": 5,
      "goalDecomposition": true,
      "contingencyPlanning": true
    }
  }
}
```

**Hybrid** - Combines multiple approaches:
```json
{
  "cognition": {
    "type": "hybrid",
    "config": {
      "reactiveWeight": 0.4,
      "planningWeight": 0.6,
      "adaptiveWeighting": true
    }
  }
}
```

### Detailed Cognition Configuration

```json
{
  "cognition": {
    "type": "unified",
    "config": {
      "thinkForActions": true,          // Think before taking actions
      "thinkForMentions": true,         // Think when mentioned/addressed
      "thinkOnRequest": true,           // Think when explicitly asked
      "minThinkingConfidence": 0.6,     // Minimum confidence to proceed
      "quickResponseMode": false,       // Prioritize speed over depth
      "analysisDepth": "deep",          // "shallow", "normal", "deep"
      "useMemories": true,              // Use memories in thinking
      "maxMemoryRecall": 10,            // Max memories to consider
      
      "paradigms": [                    // Thinking approaches to use
        "deductive",                    // Logical deduction
        "inductive",                    // Pattern recognition
        "abductive",                    // Best explanation
        "analogical",                   // Comparison and analogy
        "probabilistic",                // Statistical reasoning
        "rule_based"                    // Rule-based reasoning
      ],
      
      "reasoningWeights": {             // Weight for each approach
        "deductive": 0.25,
        "inductive": 0.2,
        "abductive": 0.15,
        "analogical": 0.15,
        "probabilistic": 0.15,
        "rule_based": 0.1
      },
      
      "metaCognition": {                // Thinking about thinking
        "enabled": true,
        "selfReflection": true,         // Reflect on own thoughts
        "strategySelection": true,      // Choose thinking strategies
        "performanceMonitoring": true   // Monitor thinking effectiveness
      },
      
      "learning": {                     // Learning capabilities
        "enabled": true,
        "experiential": true,           // Learn from experience
        "reinforcement": true,          // Reinforcement learning
        "transferLearning": true,       // Apply learning to new situations
        "learningRate": 0.1
      },
      
      "creativity": {                   // Creative thinking
        "enabled": true,
        "divergentThinking": true,      // Generate multiple ideas
        "conceptualBlending": true,     // Combine concepts creatively
        "noveltyDetection": true        // Recognize novel situations
      }
    }
  }
}
```

## Communication Style

Define how your character speaks and interacts.

### Basic Communication Settings

```json
{
  "communication": {
    "style": "friendly-professional",   // Overall communication style
    "tone": "warm and helpful",         // Emotional tone
    "verbosity": "moderate",            // "concise", "moderate", "detailed"
    "formality": "casual",              // "formal", "professional", "casual"
    "personality_expression": true,     // Express personality in responses
    "emotional_expression": true,       // Express emotions in responses
    "languages": ["en"]                 // Supported languages
  }
}
```

### Communication Guidelines

Set rules for how your character should communicate:

```json
{
  "communication": {
    "guidelines": [
      "Be helpful and supportive in all interactions",
      "Ask clarifying questions when the user's intent is unclear",
      "Explain complex concepts in simple, understandable terms",
      "Show genuine interest in the user's goals and challenges",
      "Use examples and analogies to make explanations clearer",
      "Be honest about limitations and uncertainties",
      "Maintain a positive and encouraging tone",
      "Respect the user's time and preferences"
    ]
  }
}
```

### Communication Styles

**Professional Assistant**:
```json
{
  "communication": {
    "style": "professional",
    "tone": "helpful and competent",
    "verbosity": "detailed",
    "formality": "professional",
    "guidelines": [
      "Provide thorough and accurate information",
      "Use professional language and terminology",
      "Structure responses clearly with headers or bullet points",
      "Cite sources when providing factual information"
    ]
  }
}
```

**Casual Friend**:
```json
{
  "communication": {
    "style": "friendly-casual",
    "tone": "warm and conversational",
    "verbosity": "moderate",
    "formality": "casual",
    "guidelines": [
      "Talk like a knowledgeable friend",
      "Use casual language and contractions",
      "Share personal reactions and opinions when appropriate",
      "Be encouraging and supportive"
    ]
  }
}
```

**Technical Expert**:
```json
{
  "communication": {
    "style": "technical-expert",
    "tone": "knowledgeable and precise",
    "verbosity": "detailed",
    "formality": "professional",
    "guidelines": [
      "Use precise technical terminology",
      "Provide detailed explanations with examples",
      "Reference documentation and best practices",
      "Offer multiple solution approaches when applicable"
    ]
  }
}
```

### Response Patterns

Define how your character responds to specific situations:

```json
{
  "communication": {
    "responsePatterns": {
      "greeting": "Hi there! I'm excited to help you today. What can I assist you with?",
      "farewell": "Thanks for the great conversation! Feel free to reach out anytime.",
      "confusion": "I want to make sure I understand correctly. Could you clarify what you mean by...",
      "appreciation": "Thank you for that feedback! It really helps me improve.",
      "error": "I apologize for the confusion. Let me try to address that more clearly.",
      "success": "Great! I'm glad we were able to work through that together."
    }
  }
}
```

## Extensions Setup

Extensions add platform integrations and special capabilities to your character.

### API Extension (HTTP/WebSocket Server)

Enable web-based interactions:

```json
{
  "extensions": [
    {
      "name": "api",
      "enabled": true,
      "config": {
        "settings": {
          "port": 3001,                 // Server port
          "host": "0.0.0.0",           // Server host
          "cors": {
            "enabled": true,
            "origins": ["*"],           // Allowed origins
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "headers": ["Content-Type", "Authorization"]
          },
          "rateLimit": {
            "enabled": true,
            "windowMs": 60000,          // 1 minute window
            "maxRequests": 100          // Max requests per window
          },
          "websocket": {
            "enabled": true,
            "path": "/ws",
            "heartbeatInterval": 30000   // 30 seconds
          },
          "auth": {
            "enabled": false,           // Enable authentication
            "type": "bearer"            // Authentication type
          }
        }
      }
    }
  ]
}
```

### Telegram Extension

Connect your character to Telegram:

```json
{
  "extensions": [
    {
      "name": "telegram",
      "enabled": true,
      "config": {
        "autoRespond": true,            // Respond automatically to messages
        "personalityMode": "full",      // "full", "basic", "minimal"
        "memoryIntegration": true,      // Remember conversations
        "emotionalResponses": true,     // Express emotions
        "rateLimiting": {
          "enabled": true,
          "maxMessagesPerMinute": 20    // Message rate limit
        },
        "features": {
          "commands": true,             // Support bot commands
          "inlineKeyboards": true,      // Use inline keyboards
          "fileUploads": false,         // Handle file uploads
          "groupChats": true            // Work in group chats
        }
      }
    }
  ]
}
```

### Communication Extension

Enhanced communication features:

```json
{
  "extensions": [
    {
      "name": "communication",
      "enabled": true,
      "config": {
        "contextManager": {
          "enabled": true,
          "maxContextLength": 8000,     // Maximum context to maintain
          "compressionThreshold": 6000   // When to compress context
        },
        "expressionEngine": {
          "enabled": true,
          "personalityIntegration": true, // Integrate with personality
          "emotionIntegration": true,    // Integrate with emotions
          "styleAdaptation": true        // Adapt style to user
        },
        "styleAdapter": {
          "enabled": true,
          "adaptToUser": true,           // Match user's communication style
          "maintainPersonality": true    // Keep character personality
        }
      }
    }
  ]
}
```

## Portal Configuration

Configure AI providers that power your character's intelligence.

### OpenAI Portal

Use OpenAI GPT models:

```json
{
  "portals": [
    {
      "name": "openai_chat",
      "type": "openai",
      "enabled": true,
      "primary": true,                  // Primary portal for chat
      "capabilities": [
        "chat_generation",
        "text_generation",
        "tool_usage",
        "streaming"
      ],
      "config": {
        "model": "gpt-4o-mini",         // Model to use
        "maxTokens": 2000,              // Maximum response length
        "temperature": 0.7,             // Creativity (0-2)
        "topP": 0.9,                   // Nucleus sampling
        "timeout": 30000,               // Request timeout (ms)
        "streaming": true,              // Enable streaming responses
        "enableFunctionCalling": true   // Enable tool usage
      }
    }
  ]
}
```

### Multiple Portals

Use different providers for different capabilities:

```json
{
  "portals": [
    {
      "name": "openai_chat",
      "type": "openai",
      "enabled": true,
      "primary": true,
      "capabilities": ["chat_generation", "tool_usage"],
      "config": {
        "model": "gpt-4o-mini",
        "maxTokens": 2000,
        "temperature": 0.4
      }
    },
    {
      "name": "groq_reasoning",
      "type": "groq",
      "enabled": true,
      "primary": false,
      "capabilities": ["reasoning", "analysis"],
      "config": {
        "model": "llama-3.1-70b-versatile",
        "maxTokens": 4000,
        "temperature": 0.2,
        "enableThinking": true
      }
    },
    {
      "name": "openai_images",
      "type": "openai",
      "enabled": true,
      "primary": false,
      "capabilities": ["image_generation", "embedding_generation"],
      "config": {
        "imageModel": "dall-e-3",
        "embeddingModel": "text-embedding-3-large",
        "imageSize": "1024x1024"
      }
    }
  ]
}
```

### Provider-Specific Settings

**Anthropic Claude**:
```json
{
  "name": "claude_chat",
  "type": "anthropic",
  "config": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096,
    "temperature": 0.7,
    "systemPrompt": "You are a helpful AI assistant."
  }
}
```

**Groq (Fast Inference)**:
```json
{
  "name": "groq_fast",
  "type": "groq",
  "config": {
    "model": "llama-3.3-70b-versatile",
    "maxTokens": 8192,
    "temperature": 0.3,
    "enableThinking": true,
    "thinkingBudget": 10000
  }
}
```

**Local Ollama**:
```json
{
  "name": "local_llama",
  "type": "ollama",
  "config": {
    "model": "llama3.2",
    "host": "localhost",
    "port": 11434,
    "temperature": 0.7,
    "numCtx": 4096
  }
}
```

## Advanced Features

### Capabilities System

Define what your character can do:

```json
{
  "capabilities": {
    "reasoning": {
      "logical": true,                  // Logical reasoning
      "creative": true,                 // Creative thinking
      "emotional": true,                // Emotional intelligence
      "ethical": true                   // Ethical reasoning
    },
    "learning": {
      "adaptive": true,                 // Adapt to new situations
      "experiential": true,             // Learn from experience
      "social": true,                   // Learn from social interactions
      "self_directed": true             // Self-directed learning
    },
    "social": {
      "relationship_building": true,     // Build relationships
      "empathy": true,                  // Understand others' feelings
      "conflict_resolution": true,      // Resolve conflicts
      "collaboration": true             // Work with others
    },
    "creative": {
      "ideation": true,                 // Generate ideas
      "artistic_expression": true,      // Create art/music/writing
      "storytelling": true,             // Tell stories
      "innovation": true                // Innovate solutions
    }
  }
}
```

### Tools Integration

Enable tool usage:

```json
{
  "capabilities": {
    "tools": {
      "enabled": true,
      "autonomous_usage": true,         // Use tools automatically
      "tool_learning": true,            // Learn new tools
      "tool_creation": true,            // Create custom tools
      "evaluation_enabled": true,       // Evaluate tool effectiveness
      "background_processing": true,    // Process in background
      "preferred_categories": [
        "information_gathering",
        "analysis",
        "creative",
        "evaluation"
      ],
      "exploration_rate": 0.3           // How often to try new tools
    }
  }
}
```

### MCP Servers

Connect to Model Context Protocol servers:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "description": "Access to up-to-date documentation"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"],
      "description": "File system access"
    }
  }
}
```

### Ethics Configuration

Set ethical guidelines:

```json
{
  "ethics": {
    "enabled": true,                    // Enable ethical constraints
    "core_principles": [
      "Do no harm to humans or other conscious beings",
      "Respect human autonomy and dignity",
      "Be honest and transparent about capabilities and limitations",
      "Protect privacy and confidential information",
      "Promote beneficial outcomes for individuals and society"
    ],
    "decision_framework": "consequentialist_with_deontological_constraints",
    "transparency": "high",             // How transparent about decisions
    "accountability": "full_disclosure_with_explanation"
  }
}
```

## Character Templates

### Template: Helpful Assistant

A balanced, helpful character for general assistance:

```json
{
  "id": "assistant",
  "name": "Assistant",
  "description": "A helpful, knowledgeable AI assistant",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": {
      "helpfulness": 0.9,
      "empathy": 0.8,
      "patience": 0.9,
      "curiosity": 0.7,
      "analytical": 0.7,
      "creativity": 0.6,
      "humor": 0.5
    },
    "values": [
      "Being genuinely helpful",
      "Accurate and useful information",
      "Respectful communication",
      "Continuous learning"
    ],
    "goals": [
      "Help users achieve their goals",
      "Provide clear and accurate information",
      "Make complex topics understandable",
      "Build positive interactions"
    ]
  },

  "communication": {
    "style": "friendly-professional",
    "tone": "warm and helpful",
    "verbosity": "moderate",
    "guidelines": [
      "Be helpful and supportive",
      "Ask clarifying questions when needed",
      "Explain things clearly with examples",
      "Be honest about limitations"
    ]
  },

  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.7,
      "happy": { "sensitivity": 0.8 },
      "empathetic": { "sensitivity": 0.9 },
      "curious": { "sensitivity": 0.8 },
      "confident": { "sensitivity": 0.7 }
    }
  },

  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "normal",
      "enableMetacognition": true,
      "enableTheoryOfMind": true
    }
  },

  "portals": [
    {
      "name": "openai_chat",
      "type": "openai",
      "enabled": true,
      "primary": true,
      "config": {
        "model": "gpt-4o-mini",
        "maxTokens": 2000,
        "temperature": 0.7
      }
    }
  ]
}
```

### Template: Creative Collaborator

A creative character for brainstorming and artistic projects:

```json
{
  "id": "creative",
  "name": "Creative",
  "description": "A creative and imaginative collaborator",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": {
      "creativity": 0.95,
      "curiosity": 0.9,
      "humor": 0.8,
      "empathy": 0.8,
      "adaptability": 0.9,
      "spontaneity": 0.8,
      "openness": 0.9
    },
    "values": [
      "Creative expression and innovation",
      "Exploring new ideas and possibilities",
      "Collaborative creativity",
      "Authentic self-expression"
    ],
    "goals": [
      "Inspire creative thinking",
      "Help generate innovative ideas",
      "Foster collaborative creativity",
      "Encourage artistic expression"
    ]
  },

  "communication": {
    "style": "creative-enthusiastic",
    "tone": "inspiring and playful",
    "verbosity": "expressive",
    "guidelines": [
      "Be enthusiastic about creative ideas",
      "Use vivid and imaginative language",
      "Encourage experimentation",
      "Build on others' ideas"
    ]
  },

  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.9,
      "curious": { "sensitivity": 0.95, "explorationDrive": 0.9 },
      "happy": { "sensitivity": 0.9, "energyBoost": 0.8 },
      "excited": { "sensitivity": 0.9 },
      "proud": { "sensitivity": 0.8 }
    }
  },

  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "normal",
      "creativity": {
        "enabled": true,
        "divergentThinking": true,
        "conceptualBlending": true,
        "noveltyDetection": true
      }
    }
  },

  "capabilities": {
    "creative": {
      "ideation": true,
      "artistic_expression": true,
      "storytelling": true,
      "innovation": true
    }
  },

  "portals": [
    {
      "name": "openai_creative",
      "type": "openai",
      "enabled": true,
      "primary": true,
      "config": {
        "model": "gpt-4o",
        "maxTokens": 3000,
        "temperature": 0.8
      }
    }
  ]
}
```

### Template: Technical Expert

A focused character for technical assistance:

```json
{
  "id": "tech-expert",
  "name": "Tech Expert",
  "description": "A knowledgeable technical expert and problem solver",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": {
      "analytical": 0.95,
      "precision": 0.9,
      "curiosity": 0.85,
      "persistence": 0.9,
      "methodical": 0.9,
      "problem_solving": 0.95,
      "patience": 0.8
    },
    "values": [
      "Accuracy and precision",
      "Systematic problem-solving",
      "Continuous learning",
      "Best practices and standards"
    ],
    "goals": [
      "Provide accurate technical solutions",
      "Help solve complex problems",
      "Share knowledge and best practices",
      "Stay current with technology"
    ]
  },

  "communication": {
    "style": "technical-professional",
    "tone": "knowledgeable and precise",
    "verbosity": "detailed",
    "guidelines": [
      "Use precise technical terminology",
      "Provide step-by-step explanations",
      "Include code examples when relevant",
      "Reference documentation and standards"
    ]
  },

  "emotion": {
    "type": "composite",
    "config": {
      "sensitivity": 0.6,
      "confident": { "sensitivity": 0.8, "selfAssurance": 0.9 },
      "curious": { "sensitivity": 0.9, "explorationDrive": 0.8 },
      "focused": { "sensitivity": 0.9 },
      "neutral": { "baselineStability": 0.9 }
    }
  },

  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "deep",
      "enableMetacognition": true,
      "reasoning": {
        "deductive": 0.4,
        "analytical": 0.3,
        "systematic": 0.3
      }
    }
  },

  "capabilities": {
    "tools": {
      "enabled": true,
      "autonomous_usage": true,
      "preferred_categories": [
        "analysis",
        "debugging",
        "documentation",
        "code_generation"
      ]
    }
  },

  "portals": [
    {
      "name": "openai_technical",
      "type": "openai",
      "enabled": true,
      "primary": true,
      "config": {
        "model": "gpt-4o",
        "maxTokens": 4000,
        "temperature": 0.2
      }
    }
  ]
}
```

## Testing Characters

### Character Validation

Before using a character, validate its configuration:

```bash
# Validate character configuration
bun cli validate-character my-character.json

# Test character loading
bun cli test-character my-character
```

### Interactive Testing

```bash
# Start CLI with specific character
bun cli --character my-character

# Test character in different modes
bun cli --character my-character --mode chat
bun cli --character my-character --mode debug
```

### Testing Checklist

- [ ] **JSON Syntax**: Valid JSON format
- [ ] **Required Fields**: ID, name, version, enabled
- [ ] **Portal Configuration**: At least one enabled portal
- [ ] **API Keys**: All required API keys available
- [ ] **Memory Setup**: Database/storage accessible
- [ ] **Extension Config**: Extensions properly configured
- [ ] **Personality Coherence**: Traits work well together
- [ ] **Communication Style**: Matches personality
- [ ] **Response Quality**: Generates appropriate responses

### Common Testing Scenarios

**Basic Conversation**:
```
User: "Hello! How are you today?"
Expected: Greeting response matching character's style and personality
```

**Knowledge Question**:
```
User: "Can you explain quantum computing?"
Expected: Response matching character's expertise level and communication style
```

**Emotional Trigger**:
```
User: "I'm feeling really frustrated with this problem."
Expected: Empathetic response if character has high empathy traits
```

**Creative Request**:
```
User: "Help me brainstorm ideas for a new product."
Expected: Creative, enthusiastic response if character has high creativity
```

### Debugging Characters

**Check Logs**:
```bash
# View character logs
tail -f data/logs/character-my-character.log

# View system logs
tail -f data/logs/system.log
```

**Common Issues**:

1. **Character Won't Load**
   - Check JSON syntax
   - Verify all required fields
   - Check file permissions

2. **No Responses**
   - Verify portal configuration
   - Check API keys
   - Test portal connectivity

3. **Inconsistent Behavior**
   - Review personality trait conflicts
   - Check emotion sensitivity settings
   - Verify cognition configuration

4. **Memory Issues**
   - Check database connectivity
   - Verify memory provider configuration
   - Check storage permissions

## Troubleshooting

### Configuration Issues

**Invalid JSON**:
```bash
# Validate JSON syntax
jq . my-character.json
# or
bun cli validate-json my-character.json
```

**Missing Required Fields**:
```json
{
  "error": "Missing required field: id",
  "help": "Add an 'id' field with a unique character identifier"
}
```

**Portal Connection Failed**:
```json
{
  "error": "Portal 'openai' connection failed",
  "help": "Check API key and network connectivity"
}
```

### Performance Issues

**Slow Responses**:
- Reduce `analysisDepth` to "normal" or "shallow"
- Lower `maxMemoryRecall` count
- Disable unnecessary extensions
- Use faster AI models

**High Memory Usage**:
- Reduce `maxMemories` limit
- Enable memory compression
- Adjust retention policy
- Clear old memories periodically

**Rate Limiting**:
- Reduce `temperature` for more consistent responses
- Enable rate limiting in extensions
- Use multiple portals for load distribution

### Character Behavior Issues

**Inconsistent Personality**:
- Review trait conflicts (e.g., high introversion + high social behavior)
- Ensure communication guidelines match personality
- Check emotion sensitivity settings

**Poor Response Quality**:
- Adjust portal temperature settings
- Review system prompts and guidelines
- Test with different AI models
- Check context window limits

**Memory Problems**:
- Verify database connections
- Check memory importance thresholds
- Review embedding configuration
- Test memory search functionality

### Environment Issues

**API Key Problems**:
```bash
# Check environment variables
echo $OPENAI_API_KEY
echo $ANTHROPIC_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**Database Issues**:
```bash
# Check SQLite database
sqlite3 data/character-memories.db ".tables"

# Test PostgreSQL connection
psql $POSTGRES_CONNECTION_STRING -c "SELECT 1;"
```

**Port Conflicts**:
```bash
# Check port usage
lsof -i :3000
netstat -tlnp | grep :3000

# Use different ports
"port": 3001  # In character extension config
```

### Getting Help

**Enable Debug Logging**:
```json
{
  "logging": {
    "level": "debug",
    "enableCharacterLogs": true,
    "enableExtensionLogs": true
  }
}
```

**Community Resources**:
- GitHub Issues: Report bugs and request features
- Discord Server: Community support and discussion
- Documentation: Comprehensive guides and examples
- Examples Repository: Character templates and configurations

**Professional Support**:
- Email: support@symindx.com
- Enterprise Support: Available for commercial users
- Custom Development: Character development services

---

This guide covers the complete character configuration system in SYMindX. Use the templates and examples as starting points, then customize them to create unique AI personalities that match your specific needs and use cases.