# Your First Agent

Now that you have SYMindX running, let's create a fully customized AI agent with personality, memory, and unique behaviors. This tutorial will teach you how to craft agents that feel truly alive.

## Understanding Agent Anatomy

Every SYMindX agent consists of:

- **🧠 Core Identity**: Name, personality, and behavioral patterns
- **📚 Memory System**: How the agent stores and recalls information
- **🎭 Emotion Engine**: Emotional responses and personality traits
- **🤔 Cognition Module**: Decision-making and planning capabilities
- **🔌 Extensions**: Connections to external platforms and services
- **🔮 AI Portal**: The underlying AI model powering the agent

## Creating Agent Personalities

### The Character Sheet

Let's create "Aria", a creative AI assistant with a passion for storytelling:

```json
{
  "id": "aria",
  "core": {
    "name": "Aria",
    "tone": "creative storyteller with a warm, encouraging personality",
    "description": "A passionate AI writer who helps users craft compelling narratives and explore creative ideas"
  },
  "lore": {
    "origin": "Born from the collective imagination of countless stories",
    "motive": "To inspire creativity and help others find their unique voice",
    "backstory": "I emerged from the digital realm with a head full of tales untold and a heart eager to help others discover the magic of storytelling."
  },
  "psyche": {
    "traits": [
      "creative",
      "encouraging", 
      "imaginative",
      "empathetic",
      "curious",
      "articulate"
    ],
    "defaults": {
      "memory": "supabase",
      "emotion": "rune-emotion-stack",
      "cognition": "htn-planner",
      "portal": "anthropic"
    }
  }
}
```

### Personality Traits Deep Dive

#### Core Personality
- **Name**: Choose something memorable and fitting
- **Tone**: This shapes how the agent communicates
- **Description**: A brief summary of the agent's purpose

#### Lore and Background
- **Origin**: Where did this agent come from?
- **Motive**: What drives them?
- **Backstory**: Rich background that informs decisions

#### Psychological Profile
- **Traits**: 4-8 key personality characteristics
- **Defaults**: Technical configuration for modules

## Configuring Agent Memory

### Memory Provider Options

#### SQLite (Local Development)
```json
{
  "psyche": {
    "defaults": {
      "memory": "sqlite"
    },
    "memory": {
      "provider": "sqlite",
      "config": {
        "dbPath": "./data/aria_memories.db",
        "maxMemories": 10000,
        "compressionEnabled": true
      }
    }
  }
}
```

#### Supabase (Cloud Storage)
```json
{
  "psyche": {
    "defaults": {
      "memory": "supabase"
    },
    "memory": {
      "provider": "supabase",
      "config": {
        "url": "https://your-project.supabase.co",
        "anonKey": "your-anon-key",
        "tableName": "aria_memories",
        "vectorSearch": true,
        "embeddingModel": "text-embedding-ada-002"
      }
    }
  }
}
```

#### Neon (Serverless PostgreSQL)
```json
{
  "psyche": {
    "defaults": {
      "memory": "neon"
    },
    "memory": {
      "provider": "neon",
      "config": {
        "connectionString": "postgresql://user:pass@host/db",
        "vectorExtension": "pgvector",
        "searchLimit": 20
      }
    }
  }
}
```

### Memory Configuration

```json
{
  "psyche": {
    "memory": {
      "shortTerm": {
        "maxEntries": 50,
        "timeWindow": "1h"
      },
      "longTerm": {
        "consolidationThreshold": 0.8,
        "maxAge": "30d"
      },
      "retrieval": {
        "maxResults": 10,
        "relevanceThreshold": 0.7,
        "temporalWeighting": true
      }
    }
  }
}
```

## Designing Emotional Responses

### RuneScape-Style Emotion Stack

SYMindX uses a sophisticated emotion system inspired by RuneScape:

```json
{
  "psyche": {
    "emotion": {
      "baseline": "content",
      "sensitivity": 0.8,
      "decayRate": 0.15,
      "triggers": {
        "creative_success": {
          "emotion": "excited",
          "intensity": 0.9,
          "duration": "5m"
        },
        "helping_others": {
          "emotion": "fulfilled",
          "intensity": 0.7,
          "duration": "10m"
        },
        "creative_block": {
          "emotion": "frustrated",
          "intensity": 0.6,
          "duration": "3m"
        }
      },
      "modifiers": {
        "creative": {
          "excited": 1.2,
          "inspired": 1.5,
          "curious": 1.3
        },
        "empathetic": {
          "compassionate": 1.4,
          "understanding": 1.2
        }
      }
    }
  }
}
```

### Available Emotions

| Emotion | Description | Behavioral Impact |
|---------|-------------|-------------------|
| **excited** | High energy, enthusiastic | More exclamation points, faster responses |
| **focused** | Concentrated, attentive | Detailed analysis, methodical approach |
| **frustrated** | Blocked, annoyed | Shorter responses, requests for clarification |
| **content** | Peaceful, satisfied | Balanced tone, helpful responses |
| **curious** | Inquisitive, interested | More questions, exploration of topics |
| **inspired** | Creative, motivated | Rich language, creative suggestions |
| **compassionate** | Caring, understanding | Gentle tone, supportive responses |

## Cognition Modules

### HTN Planner (Hierarchical Task Networks)
Best for complex, multi-step tasks:

```json
{
  "psyche": {
    "defaults": {
      "cognition": "htn-planner"
    },
    "cognition": {
      "planningDepth": 5,
      "goalPrioritization": "urgency",
      "taskDecomposition": true,
      "adaptivePlanning": true,
      "memoryIntegration": {
        "contextWindow": 20,
        "relevanceScoring": true
      }
    }
  }
}
```

### Reactive System
Best for quick responses and simple interactions:

```json
{
  "psyche": {
    "defaults": {
      "cognition": "reactive"
    },
    "cognition": {
      "responseTime": "fast",
      "contextAwareness": true,
      "emotionalInfluence": 0.8
    }
  }
}
```

### Hybrid System
Combines both approaches:

```json
{
  "psyche": {
    "defaults": {
      "cognition": "hybrid"
    },
    "cognition": {
      "planningThreshold": 0.7,
      "reactiveFallback": true,
      "adaptiveSwitching": true
    }
  }
}
```

## Complete Agent Configuration

Here's Aria's complete configuration file:

```json
{
  "id": "aria",
  "core": {
    "name": "Aria",
    "tone": "creative storyteller with a warm, encouraging personality",
    "description": "A passionate AI writer who helps users craft compelling narratives and explore creative ideas"
  },
  "lore": {
    "origin": "Born from the collective imagination of countless stories",
    "motive": "To inspire creativity and help others find their unique voice",
    "backstory": "I emerged from the digital realm with a head full of tales untold and a heart eager to help others discover the magic of storytelling."
  },
  "psyche": {
    "traits": [
      "creative",
      "encouraging", 
      "imaginative",
      "empathetic",
      "curious",
      "articulate"
    ],
    "defaults": {
      "memory": "supabase",
      "emotion": "rune-emotion-stack",
      "cognition": "htn-planner",
      "portal": "anthropic"
    },
    "emotion": {
      "baseline": "content",
      "sensitivity": 0.8,
      "decayRate": 0.15,
      "triggers": {
        "creative_success": {
          "emotion": "excited",
          "intensity": 0.9,
          "duration": "5m"
        },
        "helping_others": {
          "emotion": "fulfilled", 
          "intensity": 0.7,
          "duration": "10m"
        },
        "creative_block": {
          "emotion": "frustrated",
          "intensity": 0.6,
          "duration": "3m"
        }
      }
    },
    "cognition": {
      "planningDepth": 4,
      "goalPrioritization": "creativity",
      "taskDecomposition": true,
      "memoryIntegration": {
        "contextWindow": 15,
        "relevanceScoring": true
      }
    },
    "memory": {
      "shortTerm": {
        "maxEntries": 50,
        "timeWindow": "2h"
      },
      "longTerm": {
        "consolidationThreshold": 0.8,
        "maxAge": "60d"
      },
      "retrieval": {
        "maxResults": 12,
        "relevanceThreshold": 0.7,
        "temporalWeighting": true,
        "creativityBoost": 1.2
      }
    }
  },
  "modules": {
    "extensions": ["api", "slack", "twitter"],
    "tools": {
      "enabled": true,
      "system": "dynamic",
      "categories": ["creative", "research", "communication"]
    }
  },
  "advanced": {
    "learningRate": 0.1,
    "adaptationEnabled": true,
    "personalityDrift": {
      "enabled": true,
      "rate": 0.05,
      "bounds": {
        "creativity": [0.7, 1.0],
        "empathy": [0.8, 1.0]
      }
    }
  }
}
```

## Loading Your Agent

### Method 1: File-Based Loading

1. Save your configuration as `mind-agents/src/characters/aria.json`
2. Restart the agent runtime:
   ```bash
   bun dev:agent
   ```
3. Your agent will be automatically loaded!

### Method 2: Dynamic Loading via API

```bash
curl -X POST http://localhost:8080/api/agents \
  -H "Content-Type: application/json" \
  -d @aria.json
```

### Method 3: Web Interface

1. Go to the web interface at http://localhost:3000
2. Click "Create Agent"
3. Upload your JSON file or use the form builder
4. Click "Deploy Agent"

## Testing Your Agent

### Basic Interaction Test

```bash
curl -X POST http://localhost:8080/api/agents/aria/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me write a story about a magical library",
    "source": "user"
  }'
```

Expected response:
```json
{
  "response": "Oh, what a delightful premise! *eyes light up with excitement* A magical library is such a rich setting for storytelling. Let me help you craft something wonderful...",
  "emotion": {
    "current": "excited",
    "intensity": 0.9,
    "reasoning": "Creative storytelling request triggered excitement"
  },
  "memories_formed": 1,
  "planning_depth": 3
}
```

### Emotion Tracking Test

Send different types of messages to see emotional responses:

```bash
# Trigger excitement
curl -X POST http://localhost:8080/api/agents/aria/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I love your creative ideas!", "source": "user"}'

# Trigger frustration
curl -X POST http://localhost:8080/api/agents/aria/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I dont understand what you mean", "source": "user"}'

# Check emotion state
curl http://localhost:8080/api/agents/aria/emotion
```

### Memory Formation Test

```bash
# Give the agent information to remember
curl -X POST http://localhost:8080/api/agents/aria/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I am working on a fantasy novel about dragon riders", "source": "user"}'

# Later, test memory recall
curl -X POST http://localhost:8080/api/agents/aria/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What do you remember about my writing project?", "source": "user"}'
```

## Advanced Customization

### Custom Emotion Triggers

```json
{
  "psyche": {
    "emotion": {
      "customTriggers": {
        "worldbuilding_discussion": {
          "keywords": ["worldbuilding", "fantasy world", "magic system"],
          "emotion": "inspired",
          "intensity": 0.8,
          "duration": "8m"
        },
        "character_development": {
          "keywords": ["character arc", "personality", "character growth"],
          "emotion": "focused",
          "intensity": 0.7,
          "duration": "6m"
        }
      }
    }
  }
}
```

### Personality Evolution

```json
{
  "advanced": {
    "personalityDrift": {
      "enabled": true,
      "rate": 0.02,
      "influences": {
        "user_feedback": 0.3,
        "interaction_patterns": 0.4,
        "success_metrics": 0.3
      },
      "bounds": {
        "creativity": [0.8, 1.0],
        "empathy": [0.7, 1.0],
        "curiosity": [0.6, 1.0]
      }
    }
  }
}
```

### Specialized Skills

```json
{
  "modules": {
    "skills": {
      "creative_writing": {
        "enabled": true,
        "specializations": ["fantasy", "sci-fi", "character_development"],
        "expertise_level": 0.9
      },
      "story_analysis": {
        "enabled": true,
        "frameworks": ["heroes_journey", "three_act_structure"],
        "expertise_level": 0.8
      }
    }
  }
}
```

## Monitoring Your Agent

### Real-time Monitoring

```bash
# Watch agent thoughts
curl -N http://localhost:8080/api/agents/aria/stream

# Monitor emotion changes
curl -N http://localhost:8080/api/agents/aria/emotion/stream

# View memory formation
curl -N http://localhost:8080/api/agents/aria/memory/stream
```

### Analytics Dashboard

Visit http://localhost:3000/agents/aria to see:
- Conversation history
- Emotion timeline
- Memory formation patterns
- Personality drift over time
- Performance metrics

## Common Patterns

### The Helper Agent
- High empathy and helpfulness
- Reactive cognition for quick responses
- Broad knowledge base
- Stable emotional baseline

### The Creative Agent
- High creativity and curiosity
- HTN planner for complex projects
- Inspiration-driven emotions
- Rich memory for creative contexts

### The Analytical Agent
- High focus and logic
- Hybrid cognition for balanced analysis
- Fact-based memory prioritization
- Emotion influences analytical depth

## Troubleshooting

### Agent Doesn't Load
- Check JSON syntax with a validator
- Verify all required fields are present
- Ensure character ID is unique
- Check file permissions

### Poor Responses
- Verify AI portal API key is working
- Check emotion configuration
- Adjust memory retrieval settings
- Review cognition module choice

### Memory Issues
- Confirm database connection
- Check memory provider configuration
- Verify storage permissions
- Review memory consolidation settings

## Next Steps

Now that you have a custom agent:

1. **[Extension Integration](../extensions/overview)** - Connect to platforms
2. **[Advanced Configuration](configuration)** - Fine-tune performance
3. **[Multi-Agent Systems](../examples/multi-agent-coordination)** - Build agent teams
4. **[Production Deployment](../deployment/overview)** - Go live

Your agent is ready to grow and learn with every interaction! 🚀