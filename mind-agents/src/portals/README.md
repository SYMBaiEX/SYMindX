# AI Portals Development Guide

The portal source tree contains reusable adapters and utilities for legacy applications. It is outside the supported v0.1 runtime contract; the three registered adapters below are maintained against AI SDK 7. No live provider calls are verified by this guide.

## Architecture

```
src/portals/
├── index.ts              # Portal factory and registration (main public API)
├── README.md             # This development guide
│
├── core/                 # Core abstractions and base classes
│   ├── base-portal.ts   # Base portal implementation
│   └── index.ts         # Core exports
│
├── providers/            # Provider implementations
│   ├── openai/          # OpenAI GPT models
│   ├── groq/            # Ultra-fast inference
│   ├── openrouter/      # OpenAI-compatible routed generation
│   └── index.ts         # Provider registry exports
│
├── shared/               # Shared utilities for portal implementations
│   ├── message-converter.ts
│   ├── parameter-builder.ts
│   ├── model-resolver.ts
│   ├── error-handler.ts
│   ├── stream-handler.ts
│   ├── finish-reason-mapper.ts
│   ├── provider-factory.ts
│   ├── tool-orchestration.ts
│   ├── performance-optimization.ts
│   ├── adaptive-model-selection.ts
│   ├── advanced-streaming.ts
│   ├── index.ts
│   └── README.md
│
├── utils/                # General utilities
│   ├── ai-sdk/          # AI SDK v7 specific utilities
│   │   ├── parameter-builder.ts
│   │   ├── advanced.ts
│   │   ├── compat.ts
│   │   └── index.ts
│   ├── context.ts       # Context transformation utilities
│   ├── integration.ts   # Portal integration utilities
│   ├── usage.ts         # Usage conversion utilities
│   └── index.ts
│
└── examples/             # Example code
    ├── advanced-tools-example.ts
    ├── context-aware-usage.ts
    └── README.md
```

## Available Portals

The portal registry currently exposes three BasePortal adapters: OpenAI, Groq, and OpenRouter. Each accepts a configurable model ID; provider model availability depends on account and service configuration.

| Portal | SDK adapter | Capabilities |
| --- | --- | --- |
| OpenAI | @ai-sdk/openai 4.x | Text, chat, embeddings, streaming, SDK tools |
| Groq | @ai-sdk/groq 4.x | Text, chat, streaming, SDK tools |
| OpenRouter | OpenAI-compatible @ai-sdk/openai 4.x adapter | Text, chat, streaming, SDK tools |

The shared provider factory can create additional AI SDK provider models, but those connectors are not registered BasePortal implementations. Older Anthropic, XAI, and Kluster.ai portal documentation describes unsupported legacy code and is not part of the current registry.

## Usage

### Basic Portal Creation

Create a portal with a provider API key and configurable model ID, then call generateText. The portal method returns a TextGenerationResult with a completed text string and normalized usage.

For streaming, iterate the provider portal's streamText method; generateText does not return a textStream property.

### Agent Integration

```typescript
import { Agent, AgentConfig } from '../types/agent';
import { createPortal } from '../portals';

const agentConfig: AgentConfig = {
  core: {
    name: 'MyAgent',
    tone: 'friendly',
    personality: ['helpful', 'curious'],
  },
  psyche: {
    traits: ['analytical'],
    defaults: {
      memory: 'supabase_pgvector',
      emotion: 'rune_emotion_stack',
      cognition: 'htn_planner',
      portal: 'openai', // Specify which portal to use
    },
  },
  modules: {
    extensions: ['slack', 'twitter'],
    portal: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4.1-mini',
      maxTokens: 2000,
      temperature: 0.8,
    },
  },
};
```

### Chat Completion

```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is the capital of France?' },
];

const response = await portal.generateChat(messages, {
  maxTokens: 500,
  temperature: 0.3,
});

console.log(response.message.content);
```

### Streaming Responses (AI SDK 7)

The portal streamText method returns an async iterable of text chunks. The provider adapter builds this from AI SDK 7 streamText; the public portal result remains provider-independent.

### Function Calling (AI SDK v7)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// Define tools with Zod schema validation
const tools = {
  get_weather: tool({
    description: 'Get current weather for a location',
    inputSchema: z.object({
      location: z.string().describe('City name'),
    }),
    execute: async ({ location }) => {
      // Tool implementation
      return { temperature: 72, condition: 'sunny' };
    },
  }),
};

const response = await portal.generateChat(messages, {
  tools,
  maxTokens: 500,
});
```

## Portal Registry

The registry exposes only the maintained portal adapters: openai, groq, and openrouter. Pass a configurable model ID when account or deployment settings require one.

## Environment Variables

Configure credentials for the registered providers with OPENAI_API_KEY, GROQ_API_KEY, and OPENROUTER_API_KEY.

## Adding New Portals

New registered adapters should extend BasePortal, use the current provider factory and AI SDK 7 LanguageModel/ModelMessage types, map SDK usage and finish reasons into the portal contracts, and register only implemented capabilities. Use inputSchema for tools, top-level instructions for system prompts, stopWhen with isStepCount for step limits, and onStepEnd for SDK callbacks. Do not pass application-owned tool execution or permissions into provider code.

## Error Handling

All portals implement consistent error handling:

```typescript
try {
  const result = await portal.generateText('Hello');
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key');
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Generation failed:', error.message);
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

The maintained OpenAI and Groq adapters use AI SDK 7. Versions are declared in the portal workspace manifests. Tool schemas use `inputSchema`; step limits use `stopWhen: isStepCount(...)`; system prompts use top-level `instructions`; full stream events use `streamText(...).stream`.
