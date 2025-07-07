# AI SDK v5 Migration Guide

## Overview

SYMindX has been upgraded to use Vercel AI SDK v5 (alpha/canary version), providing a unified interface across all AI providers with improved streaming support and better type safety.

## Key Changes

### 1. **Unified Provider Interface**

All portals now use the same AI SDK v5 interface:

```typescript
// Before (AI SDK v3)
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

// After (AI SDK v5)
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
```

### 2. **New Import Patterns**

Providers are now imported as pre-configured instances:

```typescript
// Old pattern
const openai = createOpenAI({ apiKey });
const model = openai('gpt-4o');

// New pattern
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o', { apiKey });
```

### 3. **Enhanced Streaming Support**

All text generation now returns both text and stream:

```typescript
// Before
const text = await portal.generateText(prompt);

// After
const { text, textStream } = await portal.generateText(prompt);

// Use streaming
for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### 4. **Tool Calling with Zod**

Function calling now uses Zod for schema validation:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  getWeather: tool({
    description: 'Get current weather',
    parameters: z.object({
      location: z.string().describe('City name')
    }),
    execute: async ({ location }) => {
      // Implementation
      return { temperature: 72, condition: 'sunny' };
    }
  })
};
```

### 5. **CoreMessage Type**

Message handling now uses the `CoreMessage` type:

```typescript
import { CoreMessage } from 'ai';

const messages: CoreMessage[] = [
  { role: 'system', content: 'You are a helpful assistant' },
  { role: 'user', content: 'Hello!' }
];
```

## Package Updates

Update your dependencies to the canary versions:

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
    "@ai-sdk/xai": "^0.0.14",
    "ollama-ai-provider": "^0.14.1",
    "zod": "^3.23.8"
  }
}
```

## Portal-Specific Changes

### OpenAI Portal
- Now uses `@ai-sdk/openai@^2.0.0-canary.11`
- Supports latest models including GPT-4o and o3
- Enhanced streaming with `textStream` support

### Anthropic Portal
- Now uses `@ai-sdk/anthropic@^2.0.0-canary.15`
- Updated model names (e.g., `claude-3-5-sonnet-20241022`)
- Improved function calling support

### Groq Portal
- Now uses `@ai-sdk/groq@^2.0.0-canary.5`
- Better support for Llama 3.3 models
- Dual-model architecture for chat and tools

### Google Portals
- Two separate packages:
  - `@ai-sdk/google` for Generative AI (API key auth)
  - `@ai-sdk/google-vertex` for Vertex AI (GCP auth)
- Both support Gemini 2.0 models
- Unified safety settings interface

### New Portals Added
- **Mistral AI**: European AI with GDPR compliance and efficient inference
- **Cohere**: Enterprise-focused natural language understanding and generation
- **Azure OpenAI**: Enterprise OpenAI deployment with security and compliance
- **xAI Grok**: Witty and unconventional AI with real-time web access
- **Vercel AI SDK Portal**: Multi-provider edge computing support
- **Ollama**: Local model deployment for privacy-focused applications
- **LM Studio**: Local model experimentation and development
- **OpenRouter**: Multi-model routing and intelligent selection
- **Kluster.ai**: Distributed computing and high-performance clusters
- **Google Vertex AI**: Enterprise ML platform with cloud-native features
- **Multimodal Portal**: Vision, image, and multimedia processing capabilities

## Migration Steps

### 1. Update Dependencies

```bash
# Remove old packages
npm uninstall @ai-sdk/openai@^0.0.66 @ai-sdk/anthropic@^0.0.50 @ai-sdk/groq@^0.0.56

# Install new packages
npm install ai@^5.0.0-canary.24
npm install @ai-sdk/openai@^2.0.0-canary.11
npm install @ai-sdk/anthropic@^2.0.0-canary.15
npm install @ai-sdk/groq@^2.0.0-canary.5
npm install @ai-sdk/google@^2.0.0-canary.12
npm install zod@^3.23.8
```

### 2. Update Portal Configurations

Update your `runtime.json`:

```json
{
  "portals": {
    "default": "openai",
    "apiKeys": {
      "openai": "${OPENAI_API_KEY}",
      "anthropic": "${ANTHROPIC_API_KEY}",
      "groq": "${GROQ_API_KEY}",
      "google": "${GOOGLE_GENERATIVE_AI_API_KEY}"
    },
    "models": {
      "chat": "gpt-4o",
      "tools": "gpt-4.1-mini",
      "embedding": "text-embedding-3-small"
    }
  }
}
```

### 3. Update Code Usage

If you have custom portal implementations:

```typescript
// Before
import { createOpenAI } from '@ai-sdk/openai';
const openai = createOpenAI({ apiKey });
const result = await openai.generateText({
  model: 'gpt-4o',
  prompt: 'Hello'
});

// After
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

const { text, textStream } = await streamText({
  model: openai('gpt-4o'),
  prompt: 'Hello'
});
```

### 4. Update Tool Definitions

Convert function definitions to use Zod:

```typescript
// Before
const functions = [{
  name: 'getWeather',
  description: 'Get weather',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' }
    }
  }
}];

// After
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
  getWeather: tool({
    description: 'Get weather',
    parameters: z.object({
      location: z.string()
    }),
    execute: async ({ location }) => {
      return { temperature: 72 };
    }
  })
};
```

## Benefits

1. **Unified API**: Same interface for all providers
2. **Better Streaming**: Native streaming support with `textStream`
3. **Type Safety**: Enhanced TypeScript support with Zod
4. **Performance**: Optimized for speed and efficiency
5. **Future-Proof**: Using latest AI SDK features

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure you're using the correct canary versions
2. **Type errors**: Update to use `CoreMessage` type from 'ai' package
3. **Streaming issues**: Remember to destructure both `text` and `textStream`
4. **Tool calling**: Ensure tools are defined with Zod schemas

### Getting Help

- Check the [Vercel AI SDK v5 docs](https://sdk.vercel.ai/docs)
- Review portal-specific documentation in `/docs/08-portals/`
- File issues on the SYMindX GitHub repository

## Next Steps

After migration:
1. Test all portal integrations
2. Update any custom portal implementations
3. Review streaming usage for performance
4. Consider implementing new features like tool calling