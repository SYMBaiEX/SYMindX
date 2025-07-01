---
sidebar_position: 1
title: "OpenAI Portal"
description: "OpenAI integration for SYMindX"
---

# OpenAI Portal

OpenAI integration for SYMindX

## OpenAI Portal

The OpenAI portal provides access to GPT models for agent intelligence.

### Configuration

```json
{
  "portals": {
    "openai": {
      "apiKey": "sk-...",
      "organization": "org-...",
      "defaultModel": "gpt-4-turbo-preview",
      "timeout": 30000
    }
  }
}
```

### Supported Models

| Model | Context | Cost | Use Case |
|-------|---------|------|----------|
| gpt-4-turbo | 128k | 3616500$ | Complex reasoning |
| gpt-4 | 8k | 3616500$ | High quality |
| gpt-3.5-turbo | 16k | $ | Fast responses |
| gpt-3.5-turbo-16k | 16k | $ | Long context |

### Usage

```typescript
// Configure agent with OpenAI
const agent = new Agent({
  portal: {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2000
  }
});

// Dynamic model switching
await agent.setModel('gpt-3.5-turbo'); // Faster
await agent.setModel('gpt-4'); // Smarter
```

### Advanced Features

#### Function Calling
```typescript
// Define functions
const functions = [
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      }
    }
  }
];

// Use with agent
const response = await agent.think(message, {
  functions,
  function_call: 'auto'
});
```

#### Embeddings
```typescript
// Generate embeddings
const embedding = await portal.embed({
  input: 'Text to embed',
  model: 'text-embedding-3-small'
});

// Use for semantic search
const similar = await memory.findSimilar(embedding);
```

#### Vision
```typescript
// Analyze images with GPT-4V
const analysis = await agent.analyzeImage({
  image: imageUrl,
  prompt: 'What do you see in this image?'
});
```

### Cost Optimization

```typescript
// Token counting
const tokens = portal.countTokens(text);
console.log(`Estimated cost: $${tokens * 0.00002}`);

// Caching responses
const cached = await portal.getCached(prompt);
if (!cached) {
  const response = await portal.complete(prompt);
  await portal.cache(prompt, response);
}
```
