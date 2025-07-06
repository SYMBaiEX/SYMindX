# AI Portals Development Guide

The SYMindX portal system provides a unified, modular framework for integrating AI providers into agents. Each portal acts as a bridge between agents and specific AI providers, offering consistent interfaces for text generation, chat completion, embeddings, and advanced features like tool calling and streaming.

## Architecture

```
src/portals/
├── index.ts              # Portal factory and registration
├── base-portal.ts        # Base portal interface
├── integration.ts        # Portal integration utilities
├── utils.ts             # Common utilities
├── README.md            # This development guide
└── [provider-folders]/  # Individual provider implementations
    ├── openai/          # OpenAI GPT models
    ├── anthropic/       # Claude models
    ├── groq/            # Ultra-fast inference
    ├── google-generative/ # Gemini models
    ├── google-vertex/   # Vertex AI
    ├── xai/             # Grok models
    ├── mistral/         # Mistral AI
    ├── cohere/          # Command models
    ├── azure-openai/    # Enterprise OpenAI
    ├── ollama/          # Local models
    ├── lmstudio/        # Local model serving
    ├── vercel/          # Multi-provider aggregation
    └── openrouter/      # Access to 100+ models
```

## Available Portals

### OpenAI Portal
- **Provider**: OpenAI
- **Models**: GPT-4.1, GPT-4o, GPT-4o-mini, o3
- **Features**: Text generation, chat completion, embeddings, streaming
- **AI SDK v5**: `@ai-sdk/openai@^2.0.0-canary.11`

### Groq Portal
- **Provider**: Groq
- **Models**: Llama 3.3 (70B), Llama 3.1 (405B, 70B, 8B), Mixtral, Gemma
- **Features**: Fast inference, text generation, chat completion, streaming
- **AI SDK v5**: `@ai-sdk/groq@^2.0.0-canary.5`
- **Note**: No embedding support

### Anthropic Portal
- **Provider**: Anthropic
- **Models**: Claude 3.5 Sonnet (20241022), Claude 3 Opus/Sonnet/Haiku
- **Features**: Advanced reasoning, text generation, chat completion, streaming
- **AI SDK v5**: `@ai-sdk/anthropic@^2.0.0-canary.15`
- **Note**: No embedding support

### XAI Portal
- **Provider**: XAI (Grok)
- **Models**: Grok Beta, Grok Vision Beta
- **Features**: Text generation, chat completion
- **Implementation**: Direct HTTP API calls
- **Note**: No embedding support

### OpenRouter Portal
- **Provider**: OpenRouter
- **Models**: Access to 100+ models from multiple providers
- **Features**: Text generation, chat completion, embeddings
- **Implementation**: Direct HTTP API calls
- **Special**: Cost tracking included

### Kluster.ai Portal
- **Provider**: Kluster.ai
- **Models**: Custom models
- **Features**: Text generation, chat completion, embeddings
- **Implementation**: Direct HTTP API calls

## Usage

### Basic Portal Creation

```typescript
import { createPortal } from '../portals'

// Create an OpenAI portal with AI SDK v5
const openaiPortal = createPortal('openai', {
  apiKey: 'your-openai-api-key',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7
})

// Generate text with streaming support
const { text, textStream } = await openaiPortal.generateText('Hello, world!')
console.log(text)

// Or use streaming
for await (const chunk of textStream) {
  process.stdout.write(chunk)
}
```

### Agent Integration

```typescript
import { Agent, AgentConfig } from '../types/agent'
import { createPortal } from '../portals'

const agentConfig: AgentConfig = {
  core: {
    name: 'MyAgent',
    tone: 'friendly',
    personality: ['helpful', 'curious']
  },
  psyche: {
    traits: ['analytical'],
    defaults: {
      memory: 'supabase_pgvector',
      emotion: 'rune_emotion_stack',
      cognition: 'htn_planner',
      portal: 'openai'  // Specify which portal to use
    }
  },
  modules: {
    extensions: ['slack', 'twitter'],
    portal: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.8
    }
  }
}
```

### Chat Completion

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' }
]

const response = await portal.generateChat(messages, {
  maxTokens: 500,
  temperature: 0.3
})

console.log(response.message.content)
```

### Streaming Responses (AI SDK v5)

```typescript
// All portals now return both text and textStream
const { text, textStream } = await portal.generateText('Tell me a story')

// Use the stream
for await (const chunk of textStream) {
  process.stdout.write(chunk)
}

// Or await the full text
console.log(await text)
```

### Function Calling (AI SDK v5)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// Define tools with Zod schema validation
const tools = {
  get_weather: tool({
    description: 'Get current weather for a location',
    parameters: z.object({
      location: z.string().describe('City name')
    }),
    execute: async ({ location }) => {
      // Tool implementation
      return { temperature: 72, condition: 'sunny' };
    }
  })
};

const response = await portal.generateChat(messages, {
  tools,
  maxTokens: 500
})
```

## Portal Registry

The `PortalRegistry` manages all available portals and provides factory methods:

```typescript
import { PortalRegistry } from '../portals'

const registry = PortalRegistry.getInstance()

// Get available portals
const available = registry.getAvailablePortals()
console.log(available) // ['openai', 'groq', 'anthropic', 'xai', 'openrouter', 'kluster.ai']

// Check if a portal is available
if (registry.isAvailable('openai')) {
  const portal = registry.create('openai', config)
}

// Get default configuration
const defaultConfig = registry.getDefaultConfig('groq')
```

## Environment Variables

Set up your API keys as environment variables:

```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# Groq
GROQ_API_KEY=your_groq_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_key

# XAI
XAI_API_KEY=your_xai_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key

# Kluster.ai
KLUSTER_AI_API_KEY=your_kluster_key
```

## Adding New Portals

To add a new AI provider with AI SDK v5:

1. Create a new folder in `src/portals/`
2. Implement the portal class extending `BasePortal`
3. Export factory function and default config
4. Register in `PortalRegistry`

```typescript
// src/portals/newprovider/index.ts
import { BasePortal } from '../base-portal.js'
import { streamText, generateText, embed } from 'ai'
import { newprovider } from '@ai-sdk/newprovider' // Import the provider factory

export class NewProviderPortal extends BasePortal {
  private model: any;
  
  constructor(config: NewProviderConfig) {
    super('newprovider', 'New Provider', '1.0.0', config)
    // Initialize AI SDK v5 model
    this.model = newprovider(config.model || 'default-model', {
      apiKey: config.apiKey,
      baseURL: config.baseURL
    })
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<TextGenerationResult> {
    const { text, textStream } = await streamText({
      model: this.model,
      prompt,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    })
    
    return { text: await text, textStream }
  }

  // ... other required methods
}

export function createNewProviderPortal(config: NewProviderConfig): NewProviderPortal {
  return new NewProviderPortal(config)
}
```

## Error Handling

All portals implement consistent error handling:

```typescript
try {
  const result = await portal.generateText('Hello')
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key')
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded')
  } else {
    console.error('Generation failed:', error.message)
  }
}
```

## Best Practices

1. **API Key Security**: Never hardcode API keys. Use environment variables.
2. **Error Handling**: Always wrap portal calls in try-catch blocks.
3. **Rate Limiting**: Implement rate limiting for production use.
4. **Model Selection**: Choose appropriate models based on your use case.
5. **Token Management**: Monitor token usage to control costs.
6. **Fallback Strategy**: Consider implementing fallback portals for reliability.

## Dependencies

The portals system uses Vercel AI SDK v5 (alpha/canary version):

```json
{
  "dependencies": {
    "ai": "^5.0.0-canary.24",
    "@ai-sdk/openai": "^2.0.0-canary.11",
    "@ai-sdk/anthropic": "^2.0.0-canary.15",
    "@ai-sdk/groq": "^2.0.0-canary.5",
    "@ai-sdk/google": "^2.0.0-canary.12",
    "@ai-sdk/google-vertex": "^2.0.0-canary.7",
    "@ai-sdk/mistral": "^2.0.0-canary.7",
    "@ai-sdk/cohere": "^2.0.0-canary.7",
    "@ai-sdk/azure": "^2.0.0-canary.7",
    "zod": "^3.23.8"
  }
}
```

Install with:
```bash
# Install AI SDK v5 and provider packages
npm install ai@^5.0.0-canary.24
npm install @ai-sdk/openai@^2.0.0-canary.11
npm install @ai-sdk/anthropic@^2.0.0-canary.15
npm install @ai-sdk/groq@^2.0.0-canary.5
npm install @ai-sdk/google@^2.0.0-canary.12
npm install @ai-sdk/google-vertex@^2.0.0-canary.7
npm install zod@^3.23.8
```