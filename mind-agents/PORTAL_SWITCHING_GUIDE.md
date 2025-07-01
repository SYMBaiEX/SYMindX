# Portal Switching Guide - Full Composability

## Method 1: Environment Variables (Global Defaults)

Toggle portals on/off via `.env`:

```bash
# Switch from Groq to OpenAI for chat
GROQ_ENABLED=false
OPENAI_CHAT_ENABLED=true

# Switch to Anthropic
GROQ_ENABLED=false
OPENAI_CHAT_ENABLED=false
ANTHROPIC_ENABLED=true
ANTHROPIC_API_KEY=your-key

# Use Ollama locally
GROQ_ENABLED=false
OLLAMA_ENABLED=true
```

## Method 2: Character-Level Configuration

Each agent can have different portal configurations in their character file:

```json
{
  "name": "Agent1",
  "portals": [
    {
      "name": "anthropic_chat",
      "type": "anthropic",
      "enabled": true,
      "primary": true,
      "capabilities": ["chat_generation", "text_generation"],
      "config": {
        "model": "claude-3-haiku-20240307"
      }
    }
  ]
}
```

## Method 3: Runtime Portal Switching

Create multiple portal configurations and switch between them:

```json
{
  "portals": [
    {
      "name": "groq_fast",
      "type": "groq",
      "enabled": true,
      "primary": true,
      "capabilities": ["chat_generation"],
      "config": {
        "model": "llama-3.1-8b-instant",
        "temperature": 0.5
      }
    },
    {
      "name": "openai_smart",
      "type": "openai", 
      "enabled": true,
      "primary": false,
      "capabilities": ["chat_generation"],
      "config": {
        "model": "gpt-4",
        "temperature": 0.7
      }
    },
    {
      "name": "anthropic_creative",
      "type": "anthropic",
      "enabled": true,
      "primary": false,
      "capabilities": ["chat_generation"],
      "config": {
        "model": "claude-3-opus-20240229",
        "temperature": 0.9
      }
    }
  ]
}
```

## Method 4: Capability-Based Routing

Different portals for different capabilities:

```json
{
  "portals": [
    {
      "name": "groq_chat",
      "type": "groq",
      "enabled": true,
      "capabilities": ["chat_generation"]
    },
    {
      "name": "openai_embeddings",
      "type": "openai",
      "enabled": true,
      "capabilities": ["embedding_generation"]
    },
    {
      "name": "openai_images",
      "type": "openai",
      "enabled": true,
      "capabilities": ["image_generation"]
    }
  ]
}
```

## Available Portals

1. **Groq** - Fast inference with Llama models
2. **OpenAI** - GPT models, embeddings, images
3. **Anthropic** - Claude models
4. **Ollama** - Local models
5. **XAI** - Grok models
6. **Google** - Gemini models
7. **Mistral** - Mistral models
8. **Cohere** - Command models
9. **OpenRouter** - Access to multiple providers
10. **Azure OpenAI** - Enterprise Azure deployments

## Dynamic Portal Selection

The system uses `findPortalByCapability()` to select the right portal:

```typescript
// In runtime, the agent will:
const chatPortal = agent.findPortalByCapability('chat_generation')
// Returns the first enabled portal with chat capability
```

## Example: Multi-Provider Setup

```bash
# .env configuration
GROQ_ENABLED=true
OPENAI_CHAT_ENABLED=true
ANTHROPIC_ENABLED=true
OLLAMA_ENABLED=true

# All portals available, agent config determines which is used
```

Then in character file, set primary portal:

```json
{
  "portals": [
    {
      "name": "anthropic_primary",
      "type": "anthropic",
      "enabled": true,
      "primary": true,  // This will be used first
      "capabilities": ["chat_generation"]
    },
    {
      "name": "groq_fallback",
      "type": "groq",
      "enabled": true,
      "primary": false,  // Fallback option
      "capabilities": ["chat_generation"]
    }
  ]
}
```

## Portal Priority System

1. **Primary portal** (marked with `primary: true`)
2. **First enabled portal** with required capability
3. **Fallback** to any available portal

This gives you complete composability - mix and match providers based on:
- Cost considerations
- Speed requirements
- Quality needs
- Capability requirements
- Availability