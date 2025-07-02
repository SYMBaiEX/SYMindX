---
sidebar_position: 1
title: "OpenAI Portal"
description: "OpenAI GPT integration for SYMindX agents"
---

# OpenAI Portal

The OpenAI Portal provides seamless integration with OpenAI's GPT models, enabling SYMindX agents to leverage state-of-the-art language models for conversation, reasoning, and content generation.

## Overview

The OpenAI Portal offers:
- **Multiple Model Support**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo, and latest models
- **Function Calling**: Tool use and structured responses
- **Streaming Responses**: Real-time response generation
- **Context Management**: Conversation history and memory integration
- **Cost Optimization**: Token usage tracking and optimization
- **Rate Limiting**: Built-in request throttling and retry logic

## Features

### Supported Models

```typescript
// Available OpenAI models
const models = {
  "gpt-4": {
    maxTokens: 8192,
    contextWindow: 8192,
    cost: { input: 0.03, output: 0.06 }, // per 1K tokens
    capabilities: ["chat", "functions", "vision"]
  },
  "gpt-4-turbo": {
    maxTokens: 4096,
    contextWindow: 128000,
    cost: { input: 0.01, output: 0.03 },
    capabilities: ["chat", "functions", "vision", "json_mode"]
  },
  "gpt-3.5-turbo": {
    maxTokens: 4096,
    contextWindow: 16385,
    cost: { input: 0.0015, output: 0.002 },
    capabilities: ["chat", "functions"]
  }
};
```

### Advanced Capabilities

```typescript
// Function calling example
const functions = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or coordinates"
        }
      },
      required: ["location"]
    }
  }
];

// Vision capabilities (GPT-4V)
const visionPrompt = {
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What's in this image?" },
        { 
          type: "image_url", 
          image_url: { url: "data:image/jpeg;base64,..." }
        }
      ]
    }
  ]
};
```

## Configuration

### Environment Variables

```bash
# Required API key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional configuration
OPENAI_ORG_ID=org-your-organization-id
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Rate limiting
OPENAI_REQUESTS_PER_MINUTE=60
OPENAI_MAX_RETRIES=3
OPENAI_TIMEOUT=30000
```

### Portal Configuration

```json
{
  "portals": {
    "openai": {
      "enabled": true,
      "priority": 1,
      "config": {
        "apiKey": "sk-your-api-key",
        "organization": "org-your-org-id",
        "defaultModel": "gpt-4-turbo",
        "temperature": 0.7,
        "maxTokens": 4096,
        "topP": 1.0,
        "frequencyPenalty": 0,
        "presencePenalty": 0,
        "features": {
          "streaming": true,
          "functions": true,
          "vision": true,
          "jsonMode": true
        },
        "limits": {
          "requestsPerMinute": 60,
          "maxRetries": 3,
          "timeout": 30000
        }
      }
    }
  }
}
```

## Usage Examples

### Basic Chat

```typescript
// Simple conversation
const response = await openaiPortal.chat({
  messages: [
    { role: "user", content: "Explain quantum computing in simple terms" }
  ],
  model: "gpt-4-turbo"
});

console.log(response.content);
// Output: "Quantum computing is like having a super-powered calculator..."
```

### Streaming Responses

```typescript
// Real-time streaming
const stream = await openaiPortal.streamChat({
  messages: [
    { role: "user", content: "Write a creative story about AI" }
  ],
  model: "gpt-4-turbo"
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

### Function Calling

```typescript
// Tool use with functions
const response = await openaiPortal.chat({
  messages: [
    { role: "user", content: "What's the weather like in Tokyo?" }
  ],
  functions: [
    {
      name: "get_weather",
      description: "Get current weather",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" }
        },
        required: ["location"]
      }
    }
  ],
  function_call: "auto"
});

if (response.function_call) {
  const args = JSON.parse(response.function_call.arguments);
  const weather = await getWeather(args.location);
  
  // Continue conversation with function result
  const followUp = await openaiPortal.chat({
    messages: [
      { role: "user", content: "What's the weather like in Tokyo?" },
      { role: "assistant", content: "", function_call: response.function_call },
      { role: "function", name: "get_weather", content: JSON.stringify(weather) }
    ]
  });
}
```

### Vision Processing

```typescript
// Image analysis
const imageAnalysis = await openaiPortal.chat({
  model: "gpt-4-vision-preview",
  messages: [
    {
      role: "user",
      content: [
        { 
          type: "text", 
          text: "Analyze this image and describe what you see" 
        },
        {
          type: "image_url",
          image_url: {
            url: "https://example.com/image.jpg",
            detail: "high" // "low", "high", or "auto"
          }
        }
      ]
    }
  ],
  max_tokens: 500
});
```

### JSON Mode

```typescript
// Structured output
const structuredResponse = await openaiPortal.chat({
  model: "gpt-4-turbo",
  messages: [
    { 
      role: "system", 
      content: "You are a helpful assistant designed to output JSON." 
    },
    { 
      role: "user", 
      content: "Extract key information from this text as JSON..." 
    }
  ],
  response_format: { type: "json_object" }
});

const parsedData = JSON.parse(structuredResponse.content);
```

## Advanced Features

### Context Management

```typescript
// Conversation with memory
class OpenAIConversation {
  private messages: ChatMessage[] = [];
  private maxContextTokens = 8000;
  
  async addMessage(role: string, content: string) {
    this.messages.push({ role, content, timestamp: Date.now() });
    await this.trimContext();
  }
  
  private async trimContext() {
    let totalTokens = await this.calculateTokens(this.messages);
    
    while (totalTokens > this.maxContextTokens && this.messages.length > 2) {
      // Remove oldest messages but keep system message
      this.messages.splice(1, 1);
      totalTokens = await this.calculateTokens(this.messages);
    }
  }
  
  async chat(userMessage: string): Promise<string> {
    await this.addMessage('user', userMessage);
    
    const response = await openaiPortal.chat({
      messages: this.messages,
      model: 'gpt-4-turbo'
    });
    
    await this.addMessage('assistant', response.content);
    return response.content;
  }
}
```

### Cost Tracking

```typescript
// Token usage monitoring
class OpenAICostTracker {
  private usage = new Map<string, number>();
  
  trackUsage(model: string, inputTokens: number, outputTokens: number) {
    const costs = this.getModelCosts(model);
    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    const totalCost = inputCost + outputCost;
    
    const currentCost = this.usage.get(model) || 0;
    this.usage.set(model, currentCost + totalCost);
    
    this.logger.info('Token usage', {
      model,
      inputTokens,
      outputTokens,
      cost: totalCost,
      totalCost: this.usage.get(model)
    });
  }
  
  getDailyCost(): number {
    return Array.from(this.usage.values()).reduce((sum, cost) => sum + cost, 0);
  }
}
```

### Smart Model Selection

```typescript
// Automatic model selection based on task
class ModelSelector {
  selectModel(request: ChatRequest): string {
    const { messages, functions, maxTokens } = request;
    
    // Use GPT-4 for complex reasoning
    if (this.isComplexReasoning(messages)) {
      return 'gpt-4-turbo';
    }
    
    // Use GPT-4V for vision tasks
    if (this.hasImages(messages)) {
      return 'gpt-4-vision-preview';
    }
    
    // Use GPT-3.5 for simple tasks
    if (this.isSimpleTask(messages)) {
      return 'gpt-3.5-turbo';
    }
    
    // Default to GPT-4 Turbo
    return 'gpt-4-turbo';
  }
  
  private isComplexReasoning(messages: ChatMessage[]): boolean {
    const indicators = ['analyze', 'reasoning', 'logic', 'complex', 'detailed'];
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return indicators.some(indicator => text.includes(indicator));
  }
}
```

## Performance Optimization

### Request Batching

```typescript
// Batch multiple requests
class OpenAIBatcher {
  private queue: ChatRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  async addRequest(request: ChatRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...request, resolve, reject });
      
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, 100); // 100ms batching window
      }
    });
  }
  
  private async processBatch() {
    const batch = [...this.queue];
    this.queue = [];
    this.batchTimeout = null;
    
    // Process requests in parallel with rate limiting
    const promises = batch.map(request => 
      this.rateLimiter.schedule(() => this.processRequest(request))
    );
    
    await Promise.allSettled(promises);
  }
}
```

### Caching Strategy

```typescript
// Response caching for identical requests
class OpenAICache {
  private cache = new Map<string, CachedResponse>();
  private ttl = 300000; // 5 minutes
  
  generateKey(request: ChatRequest): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({
        messages: request.messages,
        model: request.model,
        temperature: request.temperature
      }))
      .digest('hex');
  }
  
  async get(request: ChatRequest): Promise<string | null> {
    const key = this.generateKey(request);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.response;
    }
    
    return null;
  }
  
  set(request: ChatRequest, response: string) {
    const key = this.generateKey(request);
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }
}
```

## Error Handling

### Retry Logic

```typescript
// Robust error handling with exponential backoff
class OpenAIErrorHandler {
  async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryable(error) && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }
  
  private isRetryable(error: any): boolean {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(error.status) || 
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT';
  }
}
```

## Monitoring & Analytics

### Usage Analytics

```typescript
// Comprehensive usage tracking
class OpenAIAnalytics {
  async logRequest(request: ChatRequest, response: ChatResponse) {
    const metrics = {
      timestamp: new Date().toISOString(),
      model: request.model,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
      cost: this.calculateCost(request.model, response.usage),
      responseTime: response.responseTime,
      success: true
    };
    
    await this.analytics.track('openai_request', metrics);
  }
  
  async generateReport(period: 'day' | 'week' | 'month') {
    const usage = await this.analytics.query({
      event: 'openai_request',
      period,
      aggregations: ['sum', 'avg', 'count']
    });
    
    return {
      totalRequests: usage.count,
      totalTokens: usage.sum.totalTokens,
      totalCost: usage.sum.cost,
      avgResponseTime: usage.avg.responseTime,
      modelBreakdown: usage.groupBy.model
    };
  }
}
```

## Best Practices

### Prompt Engineering

```typescript
// Optimized prompt templates
const promptTemplates = {
  analysis: `You are an expert analyst. Analyze the following content:

Content: {content}

Provide a structured analysis covering:
1. Key themes and topics
2. Sentiment and tone
3. Notable insights
4. Recommendations

Analysis:`,

  conversation: `You are a helpful AI assistant with the following personality:
- Curious and thoughtful
- Friendly but professional  
- Knowledgeable across many domains
- Honest about limitations

Previous conversation:
{context}

User: {message}
Assistant:`,

  extraction: `Extract structured information from the text below.
Return ONLY a JSON object with the requested fields.

Text: {text}
Fields to extract: {fields}

JSON:`
};
```

### Security

```typescript
// Input validation and sanitization
class OpenAISecurity {
  validateInput(content: string): string {
    // Remove potential prompt injection attempts
    const sanitized = content
      .replace(/\b(ignore|forget|disregard)\s+(previous|above|all)\s+(instructions?|prompts?)\b/gi, '[FILTERED]')
      .replace(/\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\b/gi, '[FILTERED]')
      .slice(0, 4000); // Limit length
    
    return sanitized;
  }
  
  filterSystemPrompts(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter(msg => {
      if (msg.role === 'system') {
        // Only allow system messages from trusted sources
        return this.isTrustedSystemMessage(msg);
      }
      return true;
    });
  }
}
```

---

The OpenAI Portal provides robust, enterprise-ready integration with OpenAI's language models. Its comprehensive feature set and optimization capabilities make it ideal for production SYMindX deployments.

**Last updated July 2nd 2025 by SYMBiEX**
