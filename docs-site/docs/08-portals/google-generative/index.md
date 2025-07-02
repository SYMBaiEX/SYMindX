---
sidebar_position: 5
sidebar_label: "Google Generative AI"
title: "Google Generative AI Portal"
description: "Developer-friendly Google AI via Gemini API"
---

# Google Generative AI Portal

The Google Generative AI Portal provides direct access to Google's latest AI models through the Gemini Developer API. This portal is designed for developers who want quick, simple access to Google's AI capabilities without the complexity of Google Cloud setup.

## Overview

- **Provider**: Google Gemini Developer API
- **Models**: Gemini 2.0 Flash, Gemini 1.5 Pro/Flash
- **Authentication**: Simple API key
- **Best For**: Development, prototyping, simple integrations

## Configuration

### Basic Setup

```typescript
import { createPortal } from '@symindx/core';

const generativePortal = createPortal('google-generative', {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash-001'
});
```

### Advanced Configuration

```typescript
const generativePortal = createPortal('google-generative', {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash-001',
  apiVersion: 'v1',
  
  // Generation settings
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    candidateCount: 1,
    stopSequences: ['END', 'STOP']
  },
  
  // Safety settings
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
  ],
  
  // System instruction
  systemInstruction: 'You are a helpful coding assistant with expertise in TypeScript and React.',
  
  // Tools for function calling
  tools: [
    {
      functionDeclarations: [
        {
          name: 'execute_code',
          description: 'Execute TypeScript code and return results',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              language: { type: 'string', enum: ['typescript', 'javascript'] }
            },
            required: ['code']
          }
        }
      ]
    }
  ]
});
```

## Authentication

### Getting an API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the sidebar
4. Create a new API key or use an existing one
5. Set the environment variable:

```bash
export GEMINI_API_KEY=your-api-key-here
```

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key

# Optional
GEMINI_API_VERSION=v1  # Default: v1
```

## Available Models

### Gemini 2.0 Series (Latest)

```typescript
// Latest and most capable model
const gemini2Flash = {
  model: 'gemini-2.0-flash-001',
  features: ['text', 'vision', 'code', 'reasoning', 'multimodal'],
  contextWindow: 1000000,
  speed: 'very_fast',
  capabilities: ['function_calling', 'streaming', 'vision']
};

// Experimental models
const experimentalModels = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp-01-21'
];
```

### Gemini 1.5 Series

```typescript
// High-quality flagship model
const gemini15Pro = {
  model: 'gemini-1.5-pro-002',
  features: ['text', 'vision', 'code', 'reasoning'],
  contextWindow: 2000000,  // 2M tokens
  speed: 'medium',
  quality: 'highest'
};

// Fast and efficient model
const gemini15Flash = {
  model: 'gemini-1.5-flash-002',
  features: ['text', 'vision', 'code'],
  contextWindow: 1000000,  // 1M tokens
  speed: 'fast',
  costEffective: true
};

// Lightweight model
const gemini15Flash8B = {
  model: 'gemini-1.5-flash-8b',
  features: ['text', 'basic_reasoning'],
  contextWindow: 1000000,
  speed: 'very_fast',
  cost: 'lowest'
};
```

## Features

### Text Generation

```typescript
// Simple text generation
const response = await generativePortal.generateText(
  'Explain quantum computing in simple terms'
);

console.log(response.text);
```

### Chat Conversations

```typescript
// Multi-turn conversation
const conversation = [
  {
    role: 'user',
    content: 'What is React?'
  },
  {
    role: 'assistant', 
    content: 'React is a JavaScript library for building user interfaces...'
  },
  {
    role: 'user',
    content: 'How do I create a component?'
  }
];

const response = await generativePortal.generateChat(conversation);
```

### Multimodal Capabilities

```typescript
// Text + Image analysis
const response = await generativePortal.generateChat([
  {
    role: 'user',
    content: 'What does this code screenshot show?',
    attachments: [
      {
        type: 'image',
        data: 'base64-encoded-image-data',
        mimeType: 'image/png'
      }
    ]
  }
]);

// Multiple images
const multiImageResponse = await generativePortal.generateChat([
  {
    role: 'user',
    content: 'Compare these two UI designs',
    attachments: [
      {
        type: 'image',
        url: 'https://example.com/design1.png',
        mimeType: 'image/png'
      },
      {
        type: 'image', 
        url: 'https://example.com/design2.png',
        mimeType: 'image/png'
      }
    ]
  }
]);
```

### Function Calling

```typescript
// Define tools
const tools = [
  {
    functionDeclarations: [
      {
        name: 'search_docs',
        description: 'Search technical documentation',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            source: { 
              type: 'string',
              enum: ['react', 'typescript', 'node']
            }
          },
          required: ['query']
        }
      },
      {
        name: 'run_code',
        description: 'Execute code and return results',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' }
          },
          required: ['code', 'language']
        }
      }
    ]
  }
];

const response = await generativePortal.generateChat(messages, {
  tools
});

// Handle function calls
if (response.message.functionCall) {
  const { name, arguments: args } = response.message.functionCall;
  
  if (name === 'search_docs') {
    const results = await searchDocumentation(args);
    // Continue conversation with results
  }
}
```

### Streaming Responses

```typescript
// Stream text generation
const textStream = generativePortal.streamText(
  'Write a comprehensive guide to Node.js'
);

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}

// Stream chat responses
const chatStream = generativePortal.streamChat(messages);

for await (const chunk of chatStream) {
  console.log('Chunk:', chunk);
  // Update UI with partial response
}
```

## Developer Experience

### Quick Prototyping

```typescript
// Instant setup for prototyping
import { createPortal } from '@symindx/core';

const ai = createPortal('google-generative', {
  apiKey: process.env.GEMINI_API_KEY
});

// Start building immediately
const ideas = await ai.generateText('Give me 5 startup ideas for 2025');
const analysis = await ai.generateText(`Analyze these ideas: ${ideas.text}`);
```

### Integration Examples

```typescript
// Express.js API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await generativePortal.generateText(message, {
      maxTokens: 1000,
      temperature: 0.8
    });
    
    res.json({ response: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React component
const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const sendMessage = async (content) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      });
      
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      {loading && <div>Thinking...</div>}
    </div>
  );
};
```

### Code Generation

```typescript
// AI-powered code generation
const codeResponse = await generativePortal.generateChat([
  {
    role: 'user',
    content: `
      Create a TypeScript React component that:
      1. Shows a list of todos
      2. Allows adding new todos
      3. Allows marking todos as complete
      4. Uses modern React hooks
    `
  }
]);

console.log('Generated Component:');
console.log(codeResponse.text);
```

## Performance & Optimization

### Model Selection

```typescript
// Choose model based on use case
const modelStrategy = {
  // Quick responses for simple tasks
  simple: 'gemini-1.5-flash-8b',
  
  // Balanced performance for most tasks
  balanced: 'gemini-2.0-flash-001',
  
  // High quality for complex tasks
  complex: 'gemini-1.5-pro-002',
  
  // Vision tasks
  vision: 'gemini-2.0-flash-001'
};

// Dynamic model selection
const selectModel = (taskType, hasImages) => {
  if (hasImages) return modelStrategy.vision;
  if (taskType === 'simple') return modelStrategy.simple;
  if (taskType === 'complex') return modelStrategy.complex;
  return modelStrategy.balanced;
};
```

### Caching & Rate Limiting

```typescript
// Add response caching
const cachedPortal = withCache(generativePortal, {
  ttl: 3600000, // 1 hour
  maxSize: 1000
});

// Rate limiting for API quota management
const rateLimitedPortal = withRateLimit(generativePortal, {
  requestsPerMinute: 60,
  requestsPerHour: 1000
});

// Combined optimizations
const optimizedPortal = withCache(
  withRateLimit(generativePortal, { requestsPerMinute: 60 }),
  { ttl: 1800000 } // 30 minutes
);
```

## Error Handling

```typescript
try {
  const response = await generativePortal.generateChat(messages);
  return response;
} catch (error) {
  switch (error.code) {
    case 'API_KEY_INVALID':
      console.error('Invalid API key. Check your GEMINI_API_KEY.');
      break;
      
    case 'QUOTA_EXCEEDED':
      console.error('API quota exceeded. Wait before retrying.');
      // Implement exponential backoff
      await new Promise(resolve => setTimeout(resolve, 60000));
      break;
      
    case 'SAFETY_FILTER':
      console.error('Content blocked by safety filters.');
      return { text: 'I cannot provide that information.' };
      
    case 'MODEL_OVERLOADED':
      console.error('Model temporarily overloaded. Retrying...');
      // Retry with different model
      return await fallbackPortal.generateChat(messages);
      
    default:
      console.error('Unexpected error:', error.message);
      throw error;
  }
}
```

## Cost Management

```typescript
// Token counting for cost estimation
const estimateCost = (text, model) => {
  const tokens = text.length / 4; // Rough estimation
  const costs = {
    'gemini-2.0-flash-001': 0.075 / 1000000, // $0.075 per 1M tokens
    'gemini-1.5-pro-002': 1.25 / 1000000,    // $1.25 per 1M tokens  
    'gemini-1.5-flash-002': 0.075 / 1000000, // $0.075 per 1M tokens
    'gemini-1.5-flash-8b': 0.0375 / 1000000  // $0.0375 per 1M tokens
  };
  
  return tokens * costs[model];
};

// Budget monitoring
class BudgetMonitor {
  constructor(dailyLimit) {
    this.dailyLimit = dailyLimit;
    this.dailySpend = 0;
    this.resetDaily();
  }
  
  async checkBudget(estimatedCost) {
    if (this.dailySpend + estimatedCost > this.dailyLimit) {
      throw new Error('Daily budget exceeded');
    }
    return true;
  }
  
  recordSpend(cost) {
    this.dailySpend += cost;
  }
  
  resetDaily() {
    setInterval(() => {
      this.dailySpend = 0;
    }, 24 * 60 * 60 * 1000);
  }
}
```

## Comparison with Vertex AI

| Feature | Generative AI Portal | Vertex AI Portal |
|---------|---------------------|------------------|
| **Setup** | Simple API key | Google Cloud setup required |
| **Authentication** | API key | ADC, Service accounts |
| **Models** | Latest Gemini models | All Vertex AI models |
| **Pricing** | Pay-per-use | Google Cloud pricing |
| **Enterprise Features** | Basic | Full enterprise suite |
| **Compliance** | Standard | SOC2, HIPAA, etc. |
| **Best For** | Development, prototyping | Production, enterprise |

## Migration Guide

### From Vertex AI

```typescript
// Before (Vertex AI)
const oldPortal = createPortal('google-vertex', {
  projectId: 'your-project',
  location: 'us-central1',
  model: 'gemini-1.5-pro'
});

// After (Generative AI)
const newPortal = createPortal('google-generative', {
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-1.5-pro-002'
});

// API calls remain the same
const response = await newPortal.generateChat(messages);
```

### Authentication Migration

```bash
# Before: Google Cloud authentication
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project

# After: Simple API key
export GEMINI_API_KEY=your-api-key
```

## Best Practices

### Security

```typescript
// Secure API key handling
const config = {
  apiKey: process.env.GEMINI_API_KEY, // Never hardcode
  
  // Input validation
  validateInput: true,
  
  // Output filtering
  enableSafetyFilters: true,
  
  // Request logging (be careful with sensitive data)
  enableLogging: process.env.NODE_ENV === 'development'
};
```

### Performance

```typescript
// Optimize for your use case
const performanceConfig = {
  // Use fastest model for simple tasks
  model: 'gemini-1.5-flash-8b',
  
  // Limit response length
  generationConfig: {
    maxOutputTokens: 1000
  },
  
  // Enable streaming for better UX
  streaming: true,
  
  // Connection reuse
  keepAlive: true
};
```

## Troubleshooting

### Common Issues

**API Key Not Working**
```bash
# Verify API key is set
echo $GEMINI_API_KEY

# Check API key permissions in Google AI Studio
# Ensure quota limits aren't exceeded
```

**Model Not Available**
```typescript
// Check available models
const models = await generativePortal.listModels();
console.log('Available models:', models);

// Use alternative model
const fallbackModel = 'gemini-1.5-flash-002';
```

**Safety Filter Blocking Content**
```typescript
// Adjust safety settings
const relaxedSafety = {
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }
  ]
};
```

## Next Steps

- Explore [Google Vertex AI Portal](../google-vertex/) for enterprise features
- Learn about [Vercel AI SDK Portal](../vercel/) for multi-provider support
- Check [Portal Switching Guide](../portal-switching) for dynamic configuration
- See [Function Calling Guide](../../core-concepts/function-calling) for tool integration