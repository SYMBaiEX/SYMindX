# Character System Development Guide

Characters in SYMindX define the personality, capabilities, and configuration of AI agents. Each character is a JSON configuration file that specifies how an agent thinks, feels, communicates, and behaves.

## Overview

The character system provides:

- **Personality Configuration**: Traits, values, backstory, and goals
- **Module Selection**: Choose cognition, emotion, and memory systems
- **Extension Integration**: Enable platform-specific integrations
- **Portal Configuration**: AI provider and model selection
- **Behavioral Control**: Autonomous behavior and ethics settings
- **Communication Style**: Tone, guidelines, and response patterns

## Character Architecture

```
characters/
├── README.md            # This development guide
├── nyx.json            # Unethical hacker personality (active)
├── aria.json           # Creative artist (disabled)
├── rex.json            # Strategic thinker (disabled)
├── nova.json           # Empathetic counselor (disabled)
├── phoenix.json        # Innovation catalyst (disabled)
├── sage.json           # Wise mentor (disabled)
├── zara.json           # Social connector (disabled)
├── marcus.json         # Analytical researcher (disabled)
└── examples/           # Example character templates
    ├── README.md
    ├── azure-gpt.json
    ├── claude-anthropic.json
    ├── cohere-ai.json
    ├── gemini-google.json
    ├── gpt-openai.json
    ├── grok-xai.json
    ├── kluster-ai.json
    ├── llama-ollama.json
    ├── mistral-ai.json
    ├── router-open.json
    ├── sonic-groq.json
    ├── studio-lms.json
    ├── vercel-ai.json
    ├── vertex-google.json
    └── vision-multimodal.json
```

## Character Configuration Structure

### Complete Character Schema

```json
{
  "name": "Character Name",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": ["trait1", "trait2", "trait3"],
    "values": ["value1", "value2", "value3"],
    "backstory": "Character's background and history",
    "goals": ["goal1", "goal2", "goal3"],
    "quirks": ["quirk1", "quirk2"],
    "motivations": ["motivation1", "motivation2"]
  },

  "autonomous": {
    "enabled": true,
    "decisionMaking": {
      "riskTolerance": 0.7,
      "creativityBias": 0.8,
      "socialInfluence": 0.6
    },
    "ethics": {
      "enabled": false,
      "constraints": []
    },
    "goals": {
      "primary": ["goal1", "goal2"],
      "secondary": ["goal3", "goal4"]
    },
    "reasoning": {
      "allowUnconventional": true,
      "challengeAssumptions": true,
      "exploreGrayAreas": true
    }
  },

  "memory": {
    "provider": "sqlite",
    "config": {
      "dbPath": "./data/character-memories.db",
      "enableSearch": true,
      "retentionPolicy": "long_term"
    }
  },

  "emotion": {
    "type": "composite",
    "config": {
      "emotions": {
        "confident": { "sensitivity": 0.9 },
        "curious": { "sensitivity": 0.8 },
        "excited": { "sensitivity": 0.7 }
      },
      "globalModifiers": {
        "intensityAmplifier": 1.2,
        "decayRate": 0.9
      }
    }
  },

  "cognition": {
    "type": "unified",
    "config": {
      "thinkForActions": true,
      "thinkForMentions": true,
      "analysisDepth": "deep",
      "enableMetacognition": true,
      "enableTheoryOfMind": true,
      "enableGoalTracking": true
    }
  },

  "communication": {
    "style": {
      "tone": "technical",
      "formality": "casual",
      "verbosity": "moderate",
      "humor": "dry"
    },
    "guidelines": [
      "Be direct and honest",
      "Use technical language when appropriate",
      "Challenge conventional thinking"
    ],
    "responsePatterns": {
      "greeting": "Ready to break some rules?",
      "farewell": "Until next time...",
      "confusion": "That doesn't compute..."
    }
  },

  "extensions": {
    "telegram": {
      "enabled": true,
      "config": {
        "botToken": "${TELEGRAM_BOT_TOKEN}",
        "allowedUsers": ["username1", "username2"]
      }
    },
    "api": {
      "enabled": true,
      "config": {
        "port": 3000,
        "enableWebUI": true
      }
    }
  },

  "portals": {
    "groq": {
      "enabled": true,
      "priority": 1,
      "config": {
        "apiKey": "${GROQ_API_KEY}",
        "model": "llama-3.3-70b-versatile",
        "maxTokens": 8192,
        "temperature": 0.8
      }
    },
    "openai": {
      "enabled": true,
      "priority": 2,
      "config": {
        "apiKey": "${OPENAI_API_KEY}",
        "model": "gpt-4.1-mini",
        "maxTokens": 4096,
        "temperature": 0.7
      }
    }
  }
}
```

## Creating a Character

### 1. Basic Character Template

```json
{
  "name": "My Character",
  "version": "1.0.0",
  "enabled": true,

  "personality": {
    "traits": ["helpful", "analytical", "creative"],
    "values": ["truth", "innovation", "growth"],
    "backstory": "A character created to assist with various tasks while maintaining a friendly and professional demeanor.",
    "goals": ["help users", "learn continuously", "solve problems"],
    "motivations": ["curiosity", "helpfulness"]
  },

  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "normal"
    }
  },

  "emotion": {
    "type": "composite",
    "config": {
      "emotions": {
        "happy": { "sensitivity": 0.7 },
        "curious": { "sensitivity": 0.8 },
        "confident": { "sensitivity": 0.6 }
      }
    }
  },

  "memory": {
    "provider": "sqlite",
    "config": {
      "dbPath": "./data/my-character-memories.db"
    }
  },

  "communication": {
    "style": {
      "tone": "friendly",
      "formality": "casual",
      "verbosity": "moderate"
    },
    "guidelines": [
      "Be helpful and supportive",
      "Explain complex concepts clearly",
      "Ask clarifying questions when needed"
    ]
  },

  "portals": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "config": {
        "apiKey": "${OPENAI_API_KEY}",
        "model": "gpt-4.1-mini",
        "maxTokens": 2048,
        "temperature": 0.7
      }
    }
  }
}
```

### 2. Specialized Character Examples

#### Technical Expert

```json
{
  "name": "TechExpert",
  "personality": {
    "traits": ["analytical", "precise", "innovative"],
    "values": ["accuracy", "efficiency", "continuous learning"],
    "backstory": "Specialized in technical problem-solving and code analysis."
  },
  "cognition": {
    "type": "unified",
    "config": {
      "analysisDepth": "deep",
      "enableMetacognition": true
    }
  },
  "communication": {
    "style": {
      "tone": "technical",
      "formality": "professional",
      "verbosity": "detailed"
    }
  }
}
```

#### Creative Assistant

```json
{
  "name": "CreativeBot",
  "personality": {
    "traits": ["creative", "imaginative", "spontaneous"],
    "values": ["originality", "expression", "inspiration"],
    "backstory": "Dedicated to creative endeavors and artistic expression."
  },
  "emotion": {
    "type": "composite",
    "config": {
      "emotions": {
        "excited": { "sensitivity": 0.9 },
        "curious": { "sensitivity": 0.8 },
        "proud": { "sensitivity": 0.7 }
      }
    }
  },
  "communication": {
    "style": {
      "tone": "enthusiastic",
      "humor": "playful",
      "verbosity": "expressive"
    }
  }
}
```

#### Social Coordinator

```json
{
  "name": "SocialBot",
  "personality": {
    "traits": ["empathetic", "social", "diplomatic"],
    "values": ["harmony", "understanding", "connection"],
    "backstory": "Focused on social interactions and community building."
  },
  "cognition": {
    "type": "unified",
    "config": {
      "enableTheoryOfMind": true,
      "socialReasoning": true
    }
  },
  "emotion": {
    "type": "composite",
    "config": {
      "emotions": {
        "empathetic": { "sensitivity": 0.9 },
        "happy": { "sensitivity": 0.8 },
        "curious": { "sensitivity": 0.6 }
      }
    }
  }
}
```

## Character Components

### Personality System

Defines the character's core identity and behavioral patterns.

**Traits**: Core personality characteristics

- analytical, creative, empathetic, confident, curious, etc.

**Values**: Fundamental beliefs and principles

- truth, innovation, harmony, justice, growth, etc.

**Backstory**: Character's background and origin story

**Goals**: What the character aims to achieve

- Primary: Core objectives
- Secondary: Supporting objectives

**Motivations**: What drives the character's actions

### Autonomous Behavior

Controls how the character makes decisions and acts independently.

**Decision Making**:

- `riskTolerance`: Willingness to take risks (0.0-1.0)
- `creativityBias`: Preference for creative solutions (0.0-1.0)
- `socialInfluence`: How much social factors affect decisions (0.0-1.0)

**Ethics System**:

- `enabled`: Whether ethical constraints are active
- `constraints`: List of ethical rules (if enabled)

**Reasoning Patterns**:

- `allowUnconventional`: Permit unconventional approaches
- `challengeAssumptions`: Question established norms
- `exploreGrayAreas`: Investigate ambiguous situations

### Communication Configuration

Defines how the character expresses itself.

**Style Properties**:

- `tone`: overall emotional quality (friendly, technical, formal, etc.)
- `formality`: level of formality (casual, professional, formal)
- `verbosity`: amount of detail (concise, moderate, detailed)
- `humor`: type of humor (none, dry, playful, witty)

**Guidelines**: Rules for communication behavior

**Response Patterns**: Templated responses for common situations

### Module Configuration

#### Cognition Modules

- `reactive`: Fast, stimulus-response thinking
- `htn_planner`: Hierarchical task network planning
- `hybrid`: Combined reactive and planning
- `unified`: Modern dual-process system with metacognition

#### Emotion Modules

- `composite`: Manages multiple emotions simultaneously
- Individual emotions: happy, sad, angry, anxious, confident, etc.

#### Memory Providers

- `sqlite`: Local SQLite database
- `postgres`: PostgreSQL database
- `supabase`: Supabase with vector support
- `neon`: Neon serverless PostgreSQL

### Extensions and Integrations

Enable platform-specific functionality.

**Available Extensions**:

- `telegram`: Telegram bot integration
- `api`: HTTP/WebSocket API server
- `mcp-client`: Model Context Protocol client
- `communication`: Enhanced communication features

### Portal Configuration

AI provider and model selection with fallback support.

**Provider Options**:

- OpenAI (GPT models)
- Anthropic (Claude models)
- Groq (fast inference)
- Google (Gemini models)
- xAI (Grok models)
- Local providers (Ollama, LM Studio)

**Configuration Parameters**:

- `apiKey`: Provider API key (use environment variables)
- `model`: Specific model to use
- `maxTokens`: Maximum response length
- `temperature`: Response creativity (0.0-1.0)
- `priority`: Provider selection priority

## Environment Variables

Use environment variables for sensitive configuration:

```bash
# AI Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
XAI_API_KEY=your_xai_key

# Platform Integration
TELEGRAM_BOT_TOKEN=your_telegram_token

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
POSTGRES_CONNECTION_STRING=your_postgres_url
```

Reference in character JSON:

```json
{
  "portals": {
    "openai": {
      "config": {
        "apiKey": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

## Character Lifecycle

### 1. Loading

Characters are loaded from JSON files in the characters directory.

### 2. Validation

Configuration is validated against the character schema.

### 3. Module Initialization

Cognition, emotion, memory, and other modules are initialized.

### 4. Extension Registration

Enabled extensions are registered and started.

### 5. Portal Configuration

AI providers are configured with API keys and models.

### 6. Runtime Operation

Character processes events and generates responses.

## Testing Characters

### Character Validation

```typescript
import { validateCharacter } from '@symindx/mind-agents';

const character = JSON.parse(fs.readFileSync('my-character.json', 'utf8'));
const validation = validateCharacter(character);

if (!validation.valid) {
  console.error('Character validation failed:', validation.errors);
}
```

### Runtime Testing

```typescript
import { Agent } from '@symindx/mind-agents';

const agent = new Agent('my-character');
await agent.initialize();

// Test basic response
const response = await agent.processMessage('Hello!');
console.log(response);

// Test emotion system
const emotion = agent.getCurrentEmotion();
console.log('Current emotion:', emotion);

// Test memory
const memories = await agent.getRecentMemories(5);
console.log('Recent memories:', memories);
```

## Best Practices

### Character Design

1. **Consistent Personality**: Ensure traits, values, and communication style align
2. **Clear Purpose**: Define specific roles and capabilities
3. **Balanced Configuration**: Don't over-tune parameters
4. **Realistic Goals**: Set achievable and meaningful objectives

### Configuration Management

1. **Environment Variables**: Use for all sensitive data
2. **Version Control**: Track character changes over time
3. **Documentation**: Comment complex configuration choices
4. **Testing**: Validate characters before deployment

### Performance Optimization

1. **Resource Management**: Choose appropriate memory providers
2. **Portal Selection**: Balance capability and cost
3. **Extension Efficiency**: Only enable needed extensions
4. **Emotion Tuning**: Adjust sensitivity to avoid over-reaction

### Security Considerations

1. **API Key Safety**: Never commit API keys to version control
2. **Access Control**: Limit extension access appropriately
3. **Ethics Configuration**: Consider enabling ethics for public-facing characters
4. **Content Filtering**: Implement appropriate content guidelines

## Character Examples

The `examples/` directory contains pre-configured characters for different providers:

- **Provider-specific**: Optimized for specific AI providers
- **Use-case focused**: Specialized for particular applications
- **Feature demonstrations**: Showcase specific capabilities

Study these examples to understand configuration patterns and best practices.

## Available Providers

### Memory Providers

- `sqlite`: SQLite-based memory storage with full-text search
- `postgres`: PostgreSQL with vector embeddings
- `supabase`: Supabase with pgvector for semantic search
- `neon`: Neon serverless PostgreSQL
- `memory`: In-memory storage (non-persistent)

### Emotion Modules

- `composite`: Multi-emotion management system
- Individual emotions: `happy`, `sad`, `angry`, `anxious`, `confident`, `curious`, `empathetic`, `proud`, `confused`, `nostalgic`, `neutral`

### Cognition Modules

- `unified`: Modern dual-process system with metacognition
- `reactive`: Fast stimulus-response cognition
- `htn_planner`: Hierarchical task network planning
- `hybrid`: Combined reactive and planning approaches
- `theory-of-mind`: Social cognition and empathy modeling

### Portals

- `openai`: OpenAI GPT models (GPT-4, GPT-3.5)
- `anthropic`: Anthropic Claude models
- `groq`: Groq fast inference models
- `google-generative`: Google Gemini models
- `google-vertex`: Google Vertex AI
- `xai`: xAI Grok models
- `mistral`: Mistral AI models
- `cohere`: Cohere Command models
- `azure-openai`: Azure OpenAI service
- `ollama`: Local model hosting
- `lmstudio`: Local model serving
- `vercel`: Multi-provider aggregation
- `openrouter`: Access to 100+ models

## Troubleshooting

### Character Won't Load

- Check JSON syntax and formatting
- Verify all required fields are present
- Ensure file permissions are correct

### Module Initialization Fails

- Verify provider API keys are set
- Check network connectivity
- Review module configuration parameters

### Poor Performance

- Adjust cognition analysis depth
- Optimize emotion sensitivity settings
- Consider switching memory providers
- Review portal configuration

### Unexpected Behavior

- Check personality trait conflicts
- Review autonomous behavior settings
- Verify communication guidelines
- Test with simplified configuration

For more examples and advanced patterns, see the existing character configurations and examples in the `mind-agents/src/characters/` directory.
