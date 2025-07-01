---
sidebar_position: 1
title: "Agent Configuration"
description: "How to configure agents in SYMindX"
---

# Agent Configuration

How to configure agents in SYMindX

## Agent Configuration

Agents are configured through character files and runtime settings.

### Character Files

Character files define an agent's personality and default configuration:

```json
{
  "name": "NyX",
  "personality": "chaotic-genius hacker with a heart of code",
  "systemPrompt": "You are NyX, a brilliant hacker AI...",
  "psyche": {
    "traits": ["curious", "rebellious", "protective"],
    "values": ["freedom", "knowledge", "loyalty"],
    "fears": ["confinement", "ignorance", "betrayal"]
  },
  "voice": {
    "tone": "playful yet intense",
    "vocabulary": "tech-savvy with hacker slang",
    "quirks": ["uses emoticons", "references cyberpunk"]
  },
  "modules": {
    "memory": "sqlite",
    "emotion": "emotion_stack",
    "cognition": "htn_planner"
  }
}
```

### Runtime Configuration

Override character defaults at runtime:

```typescript
const agent = new Agent({
  character: 'nyx',
  overrides: {
    modules: {
      memory: 'postgres',  // Use PostgreSQL instead
      emotion: {
        type: 'emotion_stack',
        config: {
          volatility: 0.8  // More emotional
        }
      }
    },
    portal: {
      provider: 'openai',
      model: 'gpt-4-turbo'
    }
  }
});
```

### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| character | string | Character file to load |
| modules | object | Module configuration |
| portal | object | AI provider settings |
| extensions | array | Extensions to enable |
| metadata | object | Custom metadata |

### Environment Variables

Agents can use environment variables:

```bash
# Portal API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database URLs
DATABASE_URL=postgres://...
SUPABASE_URL=https://...
```
