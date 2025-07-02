---
sidebar_position: 1
title: "OpenAI Portal"
description: "OpenAI integration for SYMindX"
---

# OpenAI Portal

Advanced OpenAI integration with intelligent model selection and dual-model architecture for optimal performance.

## Overview

The OpenAI portal provides comprehensive access to OpenAI's latest models including GPT-4.1, GPT-4o, o3 reasoning models, and specialized tools for different use cases. Features intelligent model selection to automatically choose the best model based on task requirements.

## Latest Models (2025)

### Core Models
- **GPT-4.1**: Latest flagship model with enhanced capabilities
- **GPT-4o**: Advanced multimodal model with vision and audio
- **GPT-4o-mini**: Fast and cost-effective for most tasks
- **GPT-4-turbo**: Enhanced performance and reasoning

### Reasoning Models
- **o3**: State-of-the-art reasoning model for complex problem-solving
- **o1-preview**: Advanced reasoning capabilities
- **o1-mini**: Compact reasoning model

### Specialized Models
- **Text Embedding 3 Large**: 3072-dimensional embeddings
- **Text Embedding 3 Small**: 1536-dimensional embeddings  
- **DALL-E 3**: High-quality image generation

## Configuration

### Basic Configuration

```json
{
  "portals": {
    "openai": {
      "apiKey": "sk-...",
      "organization": "org-...",
      "model": "gpt-4o-mini",
      "timeout": 30000
    }
  }
}
```

### Dual-Model Architecture (Recommended)

```json
{
  "portals": {
    "openai": {
      "apiKey": "sk-...",
      "chatModel": "gpt-4o",                    // For conversations
      "toolModel": "gpt-4o-mini",               // For function calls
      "embeddingModel": "text-embedding-3-large",
      "imageModel": "dall-e-3",
      "temperature": 0.7,
      "maxTokens": 4096,
      "organization": "org-..."
    }
  }
}
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
OPENAI_ORGANIZATION=org-...
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_TOOL_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_IMAGE_MODEL=dall-e-3
```

## Features

### Intelligent Model Selection

The portal automatically selects the appropriate model based on the request:

```typescript
// Automatically uses chatModel for conversations
const response = await agent.generateChat(messages);

// Automatically uses toolModel when functions are provided
const toolResponse = await agent.generateChat(messages, {
  functions: [{
    name: 'calculate',
    description: 'Perform calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' }
      }
    }
  }]
});
```

### Function Calling

Advanced function calling with parallel execution:

```typescript
// Define functions
const functions = [
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' }
      },
      required: ['expression']
    }
  }
];

// Use with parallel execution
const response = await portal.generateChat(messages, {
  functions,
  parallelToolCalls: true
});
```

### Embeddings

Generate high-dimensional embeddings for semantic search:

```typescript
// Generate embeddings
const embedding = await portal.generateEmbedding('Text to embed', {
  model: 'text-embedding-3-large'
});

console.log(`Embedding dimensions: ${embedding.dimensions}`);
// Output: Embedding dimensions: 3072

// Use for semantic search
const results = await memory.findSimilar(embedding.embedding, {
  limit: 10,
  threshold: 0.8
});
```

### Vision Analysis

Analyze images with GPT-4o and GPT-4-turbo:

```typescript
// Analyze images
const analysis = await portal.generateChat([
  {
    role: 'user',
    content: 'What do you see in this image?',
    attachments: [{
      type: 'image',
      url: 'https://example.com/image.jpg',
      mimeType: 'image/jpeg'
    }]
  }
]);
```

### Image Generation

Create images with DALL-E 3:

```typescript
// Generate images
const imageResult = await portal.generateImage('A futuristic cityscape at sunset', {
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd',
  style: 'vivid'
});

console.log(`Generated image: ${imageResult.images[0].url}`);
```

### Streaming

Real-time response streaming:

```typescript
// Stream text generation
for await (const chunk of portal.streamText('Write a story about AI')) {
  process.stdout.write(chunk);
}

// Stream chat responses
for await (const chunk of portal.streamChat(messages)) {
  process.stdout.write(chunk);
}
```

## Usage Examples

### Basic Agent Configuration

```typescript
import { Agent } from '@symindx/core';
import { createOpenAIPortal } from '@symindx/portals';

// Create portal
const openaiPortal = createOpenAIPortal({
  apiKey: process.env.OPENAI_API_KEY,
  chatModel: 'gpt-4o',
  toolModel: 'gpt-4o-mini'
});

// Configure agent
const agent = new Agent({
  name: 'Assistant',
  portal: openaiPortal
});

// Simple conversation
const response = await agent.think('Explain quantum computing');
console.log(response);
```

### Dynamic Model Switching

```typescript
// Switch to reasoning model for complex problems
await agent.setModel('o3');
const reasoning = await agent.think('Solve this complex logic puzzle...');

// Switch to fast model for simple tasks
await agent.setModel('gpt-4o-mini');
const quick = await agent.think('What is 2+2?');

// Switch to vision model for image analysis
await agent.setModel('gpt-4o');
const vision = await agent.analyzeImage('diagram.png');
```

### Advanced Configuration

```typescript
// Enterprise configuration
const enterprisePortal = createOpenAIPortal({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORGANIZATION,
  chatModel: 'gpt-4o',
  toolModel: 'gpt-4o-mini', 
  embeddingModel: 'text-embedding-3-large',
  imageModel: 'dall-e-3',
  temperature: 0.7,
  maxTokens: 8192,
  timeout: 60000,
  retries: 3
});
```

## Model Specifications

| Model | Context | Strengths | Use Case | Cost |
|-------|---------|-----------|----------|------|
| **GPT-4.1** | 128K | Latest capabilities | Complex reasoning | High |
| **GPT-4o** | 128K | Multimodal, fast | General purpose | Medium |
| **GPT-4o-mini** | 128K | Fast, efficient | Tools, simple tasks | Low |
| **o3** | 128K | Advanced reasoning | Complex problems | Very High |
| **o1-preview** | 128K | Reasoning | Logic, math | High |
| **DALL-E 3** | N/A | Image generation | Creative visuals | Medium |

## Performance Optimization

### Token Counting

```typescript
// Estimate tokens before API call
const tokenCount = portal.countTokens(text);
console.log(`Estimated tokens: ${tokenCount}`);

// Track usage
portal.on('usage', (event) => {
  console.log(`Used ${event.totalTokens} tokens`);
  console.log(`Cost: $${event.estimatedCost}`);
});
```

### Caching

```typescript
// Enable response caching
const portal = createOpenAIPortal({
  apiKey: process.env.OPENAI_API_KEY,
  caching: {
    enabled: true,
    ttl: 3600,  // 1 hour
    maxSize: 1000  // Cache 1000 responses
  }
});
```

### Cost Optimization

```typescript
// Cost-optimized configuration
const costOptimizedPortal = createOpenAIPortal({
  apiKey: process.env.OPENAI_API_KEY,
  chatModel: 'gpt-4o-mini',     // Cheaper for most tasks
  toolModel: 'gpt-4o-mini',     // Fast and cheap for tools
  embeddingModel: 'text-embedding-3-small',  // Smaller embeddings
  maxTokens: 1000,              // Limit response length
  temperature: 0.5              // More deterministic = fewer retries
});
```

## Capabilities Reference

### Supported Capabilities
- ✅ **Text Generation**: All models
- ✅ **Chat Generation**: All models  
- ✅ **Embedding Generation**: Specialized embedding models
- ✅ **Image Generation**: DALL-E 3
- ✅ **Streaming**: Real-time responses
- ✅ **Function Calling**: Advanced tool integration
- ✅ **Vision Analysis**: GPT-4o, GPT-4-turbo
- ❌ **Audio Processing**: Not yet supported

### Portal Metadata

```typescript
// Check portal capabilities
console.log(portal.hasCapability('VISION'));           // true
console.log(portal.hasCapability('IMAGE_GENERATION')); // true
console.log(portal.hasCapability('AUDIO'));            // false

// Get supported models
console.log(portal.supportedModels);
// ['TEXT_GENERATION', 'CHAT', 'EMBEDDING', 'IMAGE_GENERATION', 'MULTIMODAL', 'CODE_GENERATION']
```

## Error Handling

```typescript
try {
  const response = await portal.generateChat(messages);
} catch (error) {
  if (error.code === 'insufficient_quota') {
    console.log('Rate limit exceeded, switching to fallback');
    // Switch to different portal or model
  } else if (error.code === 'context_length_exceeded') {
    console.log('Context too long, truncating');
    // Implement context truncation
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

### Model Selection
- **GPT-4o**: General-purpose conversations and complex tasks
- **GPT-4o-mini**: Fast responses, tool calls, simple queries
- **o3**: Complex reasoning, mathematics, logic problems
- **GPT-4-turbo**: Balance of capability and speed

### Cost Management
- Use `toolModel` for function calls and background tasks
- Set appropriate `maxTokens` limits
- Implement caching for repeated queries
- Monitor usage with event handlers

### Performance
- Enable streaming for long responses
- Use parallel function calls when possible
- Cache embeddings for reuse
- Implement proper retry logic

## Integration Examples

### With Memory Systems

```typescript
// Store conversation in memory with embeddings
const embedding = await portal.generateEmbedding(userMessage);
await memory.store({
  content: userMessage,
  embedding: embedding.embedding,
  metadata: { timestamp: Date.now() }
});

// Retrieve relevant context
const context = await memory.search(embedding.embedding, { limit: 5 });
```

### With Function Tools

```typescript
// Register tools with the portal
portal.addFunction({
  name: 'get_weather',
  description: 'Get current weather',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' }
    }
  },
  handler: async (params) => {
    return await weatherAPI.getCurrent(params.location);
  }
});
```

The OpenAI portal provides a robust foundation for building intelligent agents with access to the latest AI capabilities and automatic optimization for different use cases.
