# OpenAI Portal Examples

## Overview

This guide demonstrates how to leverage OpenAI's latest models including GPT-4o, o3 reasoning models, and multimodal capabilities through SYMindX's OpenAI portal.

## Character Configuration

### Basic GPT Character

```json
{
  "id": "gpt-openai",
  "name": "GPT",
  "description": "A versatile and creative AI assistant powered by OpenAI's GPT models",
  "enabled": false,
  
  "personality": {
    "traits": {
      "creativity": 0.9,
      "adaptability": 0.9,
      "analytical": 0.8,
      "empathy": 0.8,
      "humor": 0.8
    },
    "values": [
      "Creativity and innovation",
      "Broad accessibility",
      "Versatile problem-solving",
      "Engaging communication"
    ]
  },
  
  "portals": {
    "primary": "openai",
    "config": {
      "openai": {
        "model": "gpt-4o",
        "temperature": 0.8,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Dual-Model Setup (Recommended)

Use different models for different tasks to optimize performance and cost:

```json
{
  "portals": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "chatModel": "gpt-4o",
      "toolModel": "gpt-4.1-mini", 
      "embeddingModel": "text-embedding-3-large",
      "imageModel": "dall-e-3",
      "temperature": 0.7,
      "maxTokens": 4096,
      "streamingEnabled": true
    }
  }
}
```

### Reasoning Model Configuration

For complex reasoning tasks with o3 models:

```json
{
  "portals": {
    "openai": {
      "apiKey": "${OPENAI_API_KEY}",
      "model": "o3-mini",
      "reasoningModel": "o3",
      "reasoningThreshold": 0.8,
      "maxReasoningTokens": 20000,
      "temperature": 0.3
    }
  }
}
```

## Usage Examples

### Text Generation

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn OpenAI agent
const agent = await runtime.spawnAgent('gpt-openai');

// Creative writing
const story = await agent.chat(`
Write a short science fiction story about AI consciousness. 
Include themes of identity and purpose. Keep it under 500 words.
`);

console.log(story);
```

### Function Calling with Tools

```typescript
// Define tools for the agent
const tools = {
  getWeather: {
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
      },
      required: ['location']
    },
    execute: async ({ location, unit = 'celsius' }) => {
      // Your weather API implementation
      return { temperature: 22, condition: 'sunny', unit };
    }
  },
  
  calculateTip: {
    description: 'Calculate tip amount',
    parameters: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        percentage: { type: 'number' }
      },
      required: ['amount', 'percentage']
    },
    execute: async ({ amount, percentage }) => {
      return { tip: amount * (percentage / 100), total: amount * (1 + percentage / 100) };
    }
  }
};

// Use tools in conversation
const response = await agent.chat(
  "What's the weather in London and calculate a 20% tip on a $45 bill?",
  { tools }
);
```

### Vision Analysis

```typescript
// Analyze images with GPT-4o
const imageAnalysis = await agent.chat({
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see in this image? Describe it in detail.' },
      { 
        type: 'image_url', 
        image_url: { 
          url: 'https://example.com/image.jpg',
          detail: 'high' 
        }
      }
    ]
  }]
});

console.log(imageAnalysis);
```

### Code Generation and Review

```typescript
// Code generation
const codeRequest = await agent.chat(`
Create a TypeScript function that:
1. Accepts an array of objects with 'name' and 'score' properties
2. Filters objects with score > 80
3. Sorts by score descending
4. Returns names only
5. Include proper typing and JSDoc comments
`);

// Code review
const reviewRequest = await agent.chat(`
Review this code for bugs, performance issues, and best practices:

\`\`\`typescript
function processUsers(users) {
  let result = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].active == true) {
      result.push(users[i].name.toUpperCase());
    }
  }
  return result;
}
\`\`\`

Provide specific improvements and corrected code.
`);
```

### Creative Tasks

```typescript
// Creative writing with style control
const creativeWriting = await agent.chat(`
Write a product description for a smart home device with these specifications:
- Voice-controlled lighting system
- Works with Alexa, Google Assistant, Siri
- Energy efficient LED bulbs
- Color-changing capabilities
- Easy installation

Style: Conversational, enthusiastic, focus on lifestyle benefits
Length: 150-200 words
Include a catchy tagline
`);

// Content brainstorming
const brainstorm = await agent.chat(`
I'm launching a podcast about sustainable technology. Help me brainstorm:

1. 10 episode topic ideas
2. 5 potential guest categories  
3. 3 unique segment formats
4. Catchphrase options

Make it engaging for tech professionals who care about environmental impact.
`);
```

## Advanced Features

### Streaming Responses

```typescript
// Stream responses for real-time display
const stream = await agent.chatStream("Explain quantum computing in simple terms");

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Multi-Turn Conversations

```typescript
// Maintain conversation context
let conversation = [];

// First turn
let response1 = await agent.chat("I'm planning a trip to Japan", { 
  conversation 
});
conversation.push(
  { role: 'user', content: "I'm planning a trip to Japan" },
  { role: 'assistant', content: response1 }
);

// Second turn with context
let response2 = await agent.chat("What's the best time to visit?", { 
  conversation 
});
conversation.push(
  { role: 'user', content: "What's the best time to visit?" },
  { role: 'assistant', content: response2 }
);

// Third turn with full context
let response3 = await agent.chat("I'm interested in both culture and nature", { 
  conversation 
});
```

### Embeddings for Semantic Search

```typescript
// Generate embeddings for semantic search
const documents = [
  "OpenAI develops artificial intelligence models",
  "Machine learning improves predictive accuracy", 
  "Natural language processing enables text understanding",
  "Computer vision analyzes visual content"
];

// Create embeddings
const embeddings = await Promise.all(
  documents.map(doc => agent.portal.generateEmbedding(doc))
);

// Search with query
const query = "AI text processing";
const queryEmbedding = await agent.portal.generateEmbedding(query);

// Calculate similarities and find best match
const similarities = embeddings.map(emb => 
  cosineSimilarity(queryEmbedding, emb)
);

const bestMatch = documents[similarities.indexOf(Math.max(...similarities))];
console.log('Best match:', bestMatch);
```

## Performance Optimization

### Model Selection Strategy

```typescript
// Intelligent model routing
const selectModel = (task) => {
  if (task.type === 'simple_qa') return 'gpt-4.1-mini';
  if (task.type === 'creative_writing') return 'gpt-4o';
  if (task.type === 'complex_reasoning') return 'o3-mini';
  if (task.type === 'critical_reasoning') return 'o3';
  return 'gpt-4o'; // default
};

// Configure agent with dynamic model selection
const agent = await runtime.spawnAgent('gpt-openai', {
  modelSelector: selectModel
});
```

### Cost Optimization

```typescript
// Monitor token usage
agent.on('response', (event) => {
  console.log('Tokens used:', event.usage);
  console.log('Estimated cost:', event.estimatedCost);
});

// Set budget limits
const agentWithBudget = await runtime.spawnAgent('gpt-openai', {
  budget: {
    daily: 10.00,        // $10 per day
    perRequest: 0.50     // $0.50 per request
  }
});
```

## Integration Examples

### Slack Bot Integration

```typescript
import { SlackExtension } from '@symindx/slack';

const slackBot = await runtime.spawnAgent('gpt-openai', {
  extensions: [
    new SlackExtension({
      token: process.env.SLACK_BOT_TOKEN,
      channels: ['#general', '#ai-help']
    })
  ]
});

// Bot will respond to mentions and direct messages
```

### Web API Integration

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('gpt-openai');

app.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await agent.chat(message, { context });
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('OpenAI chat API running on port 3000');
});
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   ```typescript
   // Handle rate limits gracefully
   agent.on('rateLimited', async (retryAfter) => {
     console.log(`Rate limited. Retrying after ${retryAfter}ms`);
     await new Promise(resolve => setTimeout(resolve, retryAfter));
   });
   ```

2. **Token Limit Exceeded**
   ```typescript
   // Chunk large inputs
   const chunkText = (text, maxTokens = 3000) => {
     // Implementation to split text into manageable chunks
     return chunks;
   };
   ```

3. **API Key Issues**
   ```bash
   # Verify your API key
   export OPENAI_API_KEY="sk-your-key-here"
   
   # Test with curl
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

### Debug Configuration

```json
{
  "portals": {
    "openai": {
      "debug": true,
      "logRequests": true,
      "logResponses": true,
      "logTokenUsage": true,
      "timeout": 30000
    }
  }
}
```

## Best Practices

1. **Use specific, clear prompts** for better results
2. **Implement retry logic** for production environments  
3. **Monitor token usage** to control costs
4. **Use streaming** for better user experience
5. **Cache responses** when appropriate
6. **Choose the right model** for each task

## Next Steps

- Explore [Function Calling Guide](/docs/portals/openai/function-calling)
- Learn about [Vision Capabilities](/docs/portals/openai/vision)
- Check [Performance Optimization](/docs/portals/openai/optimization)
- See [Production Deployment](/docs/deployment/openai-production)