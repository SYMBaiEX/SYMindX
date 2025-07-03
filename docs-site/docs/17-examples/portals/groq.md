# Groq Portal Examples

## Overview

This guide demonstrates how to leverage Groq's ultra-fast inference capabilities with Llama models through SYMindX's Groq portal.

## Character Configuration

### Sonic - High-Speed AI Character

```json
{
  "id": "sonic-groq",
  "name": "Sonic",
  "description": "Lightning-fast AI assistant powered by Groq's optimized inference",
  "enabled": false,
  
  "personality": {
    "traits": {
      "speed": 0.95,
      "efficiency": 0.9,
      "directness": 0.8,
      "helpfulness": 0.9,
      "analytical": 0.8
    },
    "values": [
      "Speed and efficiency",
      "Clear and direct communication",
      "Rapid problem-solving",
      "Practical solutions"
    ]
  },
  
  "portals": {
    "primary": "groq",
    "config": {
      "groq": {
        "model": "llama-3.3-70b-versatile",
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### High-Performance Setup (Recommended)

Use different models for different tasks to maximize speed:

```json
{
  "portals": {
    "groq": {
      "apiKey": "${GROQ_API_KEY}",
      "chatModel": "llama-3.3-70b-versatile",
      "toolModel": "llama-3.1-8b-instant",
      "temperature": 0.7,
      "maxTokens": 4096,
      "streamingEnabled": true,
      "enableParallelToolCalls": true
    }
  }
}
```

### Latest Models Configuration

Access the newest Llama models:

```json
{
  "portals": {
    "groq": {
      "apiKey": "${GROQ_API_KEY}",
      "model": "meta-llama/llama-4-scout-17b-16e-instruct",
      "fallbackModel": "llama-3.3-70b-versatile",
      "temperature": 0.7,
      "maxTokens": 8192,
      "enableModelFallback": true
    }
  }
}
```

## Usage Examples

### Lightning-Fast Responses

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Groq agent
const agent = await runtime.spawnAgent('sonic-groq');

// Fast code generation
const code = await agent.chat(`
Generate a TypeScript function that validates email addresses.
Include proper typing and error handling.
Keep it concise but complete.
`);

console.log(code);
```

### Rapid Tool Usage

```typescript
// Define tools optimized for speed
const tools = {
  quickMath: {
    description: 'Perform rapid mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string' },
        precision: { type: 'number', default: 2 }
      },
      required: ['expression']
    },
    execute: async ({ expression, precision = 2 }) => {
      try {
        const result = eval(expression); // Note: Use a proper math parser in production
        return { result: Number(result.toFixed(precision)) };
      } catch (error) {
        return { error: 'Invalid expression' };
      }
    }
  },

  textStats: {
    description: 'Get quick text statistics',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string' }
      },
      required: ['text']
    },
    execute: async ({ text }) => {
      return {
        characters: text.length,
        words: text.split(/\s+/).length,
        lines: text.split('\n').length,
        paragraphs: text.split('\n\n').length
      };
    }
  }
};

// Lightning-fast tool usage
const response = await agent.chat(
  "Calculate 15% tip on $89.50 and analyze this text: 'The quick brown fox jumps over the lazy dog.'",
  { tools }
);
```

### Streaming for Real-Time Responses

```typescript
// Stream responses for instant feedback
const stream = await agent.chatStream("Explain machine learning in simple terms");

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Batch Processing

```typescript
// Process multiple requests in parallel
const questions = [
  "What is the capital of France?",
  "How many days in a leap year?",
  "What's 25 * 16?",
  "Define polymorphism in programming"
];

// Groq's speed makes parallel processing very efficient
const responses = await Promise.all(
  questions.map(question => agent.chat(question))
);

responses.forEach((response, index) => {
  console.log(`Q${index + 1}: ${questions[index]}`);
  console.log(`A${index + 1}: ${response}\n`);
});
```

## Advanced Features

### Model Selection for Optimal Performance

```typescript
// Intelligent model routing based on task complexity
const selectModel = (task) => {
  const wordCount = task.split(' ').length;
  
  if (wordCount < 20) return 'llama-3.1-8b-instant';      // Ultra-fast for simple tasks
  if (wordCount < 100) return 'llama-3.1-70b-versatile';  // Balanced for medium tasks
  return 'llama-3.3-70b-versatile';                       // Best quality for complex tasks
};

// Configure agent with dynamic model selection
const agent = await runtime.spawnAgent('sonic-groq', {
  modelSelector: selectModel
});
```

### Performance Monitoring

```typescript
// Track Groq's impressive speed metrics
agent.on('response', (event) => {
  console.log('Response time:', event.duration, 'ms');
  console.log('Tokens per second:', event.usage.totalTokens / (event.duration / 1000));
  console.log('Cost efficiency:', event.estimatedCost);
});

// Benchmark different models
const benchmark = async (prompt) => {
  const models = ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'llama-3.3-70b-versatile'];
  
  for (const model of models) {
    const start = Date.now();
    const response = await agent.chat(prompt, { model });
    const duration = Date.now() - start;
    
    console.log(`${model}: ${duration}ms`);
  }
};
```

### Parallel Tool Execution

```typescript
// Groq excels at parallel tool calls
const multiTool = await agent.chat(
  "Get weather for NYC, calculate 20% tip on $45, and analyze sentiment of 'I love this product!'",
  { 
    tools: [weatherTool, calculatorTool, sentimentTool],
    enableParallelToolCalls: true 
  }
);
```

## Performance Characteristics

| Model | Speed (tokens/sec) | Context | Best Use Case |
|-------|-------------------|---------|---------------|
| Llama 3.1 8B Instant | 800+ | 8K | Quick queries, tools |
| Llama 3.1 70B Versatile | 400+ | 32K | General chat, coding |
| Llama 3.3 70B Versatile | 350+ | 32K | Complex reasoning |
| Llama 4 Scout 17B | 500+ | 16K | Balanced performance |

## Real-World Applications

### Live Chat Support

```typescript
// High-speed customer support
const supportAgent = await runtime.spawnAgent('sonic-groq', {
  systemPrompt: `You are a lightning-fast customer support agent. 
  Provide quick, accurate answers. If you need more info, ask concisely.`,
  model: 'llama-3.1-8b-instant'
});

// Respond to customer queries in under 2 seconds
const response = await supportAgent.chat(customer.message);
```

### Code Completion

```typescript
// Real-time code assistance
const codeAssistant = await runtime.spawnAgent('sonic-groq', {
  systemPrompt: 'You are a code completion assistant. Provide concise, working code.',
  model: 'llama-3.1-70b-versatile'
});

// Complete code as user types
const completion = await codeAssistant.chat(`
Complete this function:
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    // Complete this implementation
`);
```

### Gaming AI

```typescript
// Fast NPC responses for games
const npcAgent = await runtime.spawnAgent('sonic-groq', {
  systemPrompt: 'You are a tavern keeper in a fantasy RPG. Respond quickly and stay in character.',
  model: 'llama-3.1-8b-instant'
});

// Sub-second NPC interactions
const npcResponse = await npcAgent.chat(player.message);
```

## Cost Optimization

### Smart Model Selection

```typescript
// Optimize costs while maintaining speed
const costOptimizer = {
  simple: 'llama-3.1-8b-instant',    // $0.05/1M tokens
  medium: 'llama-3.1-70b-versatile', // $0.59/1M tokens  
  complex: 'llama-3.3-70b-versatile' // $0.59/1M tokens
};

// Route based on complexity
const route = (input) => {
  const complexity = analyzeComplexity(input);
  return costOptimizer[complexity];
};
```

### Budget Controls

```typescript
// Set spending limits
const budgetAgent = await runtime.spawnAgent('sonic-groq', {
  budget: {
    daily: 5.00,        // $5 per day
    perRequest: 0.10    // $0.10 per request max
  },
  fallbackToFree: true
});
```

## Integration Examples

### Web API

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('sonic-groq');

app.post('/fast-ai', async (req, res) => {
  const start = Date.now();
  
  try {
    const { prompt } = req.body;
    const response = await agent.chat(prompt);
    const duration = Date.now() - start;
    
    res.json({ 
      response, 
      duration,
      model: 'groq-llama',
      tokensPerSecond: response.usage?.totalTokens / (duration / 1000)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Lightning-fast AI API running on port 3000');
});
```

### WebSocket for Real-Time

```typescript
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const prompt = message.toString();
    
    // Stream response for real-time experience
    const stream = await agent.chatStream(prompt);
    
    for await (const chunk of stream) {
      ws.send(JSON.stringify({ type: 'chunk', data: chunk }));
    }
    
    ws.send(JSON.stringify({ type: 'complete' }));
  });
});
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**
   ```typescript
   // Groq has generous rate limits, but handle gracefully
   agent.on('rateLimited', async (retryAfter) => {
     console.log(`Rate limited. Retrying after ${retryAfter}ms`);
     await new Promise(resolve => setTimeout(resolve, retryAfter));
   });
   ```

2. **Model Availability**
   ```typescript
   // Handle model unavailability
   const fallbackConfig = {
     model: 'llama-3.3-70b-versatile',
     fallbackModel: 'llama-3.1-70b-versatile',
     autoFallback: true
   };
   ```

3. **Context Length**
   ```typescript
   // Chunk large inputs for models with smaller context
   const chunkInput = (text, maxTokens = 7000) => {
     // Implementation to split text appropriately
     return chunks;
   };
   ```

### Performance Debugging

```json
{
  "portals": {
    "groq": {
      "debug": true,
      "logLatency": true,
      "logTokensPerSecond": true,
      "enableMetrics": true
    }
  }
}
```

## Best Practices

1. **Use appropriate models** for task complexity
2. **Enable streaming** for better user experience  
3. **Implement parallel tool calls** when possible
4. **Monitor token usage** for cost control
5. **Cache frequent responses** to reduce API calls
6. **Use fastest models** for real-time applications

## Next Steps

- Explore [Groq Portal Configuration](/docs/portals/groq)
- Learn about [Performance Optimization](/docs/performance/optimization)
- Check [Streaming Guide](/docs/advanced-topics/streaming)
- See [Cost Management](/docs/deployment/cost-management)