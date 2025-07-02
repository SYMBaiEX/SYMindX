---
sidebar_position: 6
sidebar_label: "Vercel AI SDK"
title: "Vercel AI SDK Portal"
description: "Multi-provider AI portal with 20+ providers"
---

# Vercel AI SDK Portal

The Vercel AI SDK Portal provides unified access to 20+ AI providers through the powerful Vercel AI SDK. This portal enables seamless switching between providers, intelligent routing, and advanced features like dynamic tool management and multi-provider consensus.

## Overview

- **Providers**: 20+ AI providers in one interface
- **Models**: 100+ models across all providers
- **Best For**: Multi-provider strategies, vendor flexibility, advanced features

## Supported Providers

### Core AI Providers
- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Mistral**: Mistral Large, Mistral Medium

### High Performance
- **Groq**: Llama 3.1, Mixtral 8x7B (ultra-fast inference)
- **Together.ai**: Meta-Llama models, custom deployments
- **Fireworks**: Optimized model serving

### Specialized Providers
- **Cohere**: Command R+, enterprise features
- **Perplexity**: Real-time web search integration
- **DeepInfra**: Cost-effective model hosting
- **Replicate**: Open source models

### Image Generation
- **OpenAI**: DALL-E 3
- **Replicate**: FLUX, Stable Diffusion
- **DeepInfra**: Multiple image models

## Configuration

### Basic Multi-Provider Setup

```typescript
import { createPortal } from '@symindx/core';

const vercelPortal = createPortal('vercel-ai', {
  providers: [
    { 
      name: 'openai', 
      type: 'openai', 
      apiKey: process.env.OPENAI_API_KEY 
    },
    { 
      name: 'anthropic', 
      type: 'anthropic', 
      apiKey: process.env.ANTHROPIC_API_KEY 
    },
    { 
      name: 'google', 
      type: 'google', 
      apiKey: process.env.GOOGLE_API_KEY 
    }
  ],
  enabledProviders: ['openai', 'anthropic', 'google'],
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o-mini'
});
```

### Advanced Configuration

```typescript
const vercelPortal = createPortal('vercel-ai', {
  providers: [
    // Core providers
    { 
      name: 'openai', 
      type: 'openai', 
      apiKey: process.env.OPENAI_API_KEY,
      models: [
        { id: 'gpt-4o', type: 'chat', capabilities: ['text', 'vision', 'tools'] },
        { id: 'gpt-4o-mini', type: 'chat', capabilities: ['text', 'tools'] },
        { id: 'text-embedding-3-small', type: 'embedding' },
        { id: 'dall-e-3', type: 'image' }
      ]
    },
    { 
      name: 'anthropic', 
      type: 'anthropic', 
      apiKey: process.env.ANTHROPIC_API_KEY,
      models: [
        { id: 'claude-3-5-sonnet-20241022', type: 'chat', capabilities: ['text', 'vision', 'tools'] },
        { id: 'claude-3-5-haiku-20241022', type: 'chat', capabilities: ['text', 'tools'] }
      ]
    },
    // High-performance provider
    { 
      name: 'groq', 
      type: 'groq', 
      apiKey: process.env.GROQ_API_KEY,
      models: [
        { id: 'llama-3.1-8b-instant', type: 'chat', supportsStreaming: true },
        { id: 'mixtral-8x7b-32768', type: 'chat', supportsStreaming: true }
      ]
    },
    // Specialized providers
    { 
      name: 'cohere', 
      type: 'cohere', 
      apiKey: process.env.COHERE_API_KEY,
      models: [
        { id: 'command-r-plus', type: 'chat' },
        { id: 'embed-english-v3.0', type: 'embedding' }
      ]
    }
  ],
  
  // Provider routing rules
  routingRules: [
    {
      condition: 'speed === "fast"',
      provider: 'groq',
      model: 'llama-3.1-8b-instant'
    },
    {
      condition: 'task === "embedding"',
      provider: 'openai',
      model: 'text-embedding-3-small'
    },
    {
      condition: 'hasImages',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022'
    }
  ],
  
  // Dynamic tools
  tools: [
    {
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: z.object({
        query: z.string().describe('Search query'),
        maxResults: z.number().optional().describe('Max results to return')
      }),
      execute: async ({ query, maxResults = 5 }) => {
        return await webSearch(query, maxResults);
      }
    },
    {
      name: 'code_executor',
      description: 'Execute code in a sandbox environment',
      parameters: z.object({
        code: z.string().describe('Code to execute'),
        language: z.enum(['python', 'javascript', 'typescript'])
      }),
      execute: async ({ code, language }) => {
        return await executeCode(code, language);
      }
    }
  ],
  
  // Performance settings
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  
  // Cost optimization
  costOptimization: {
    enabled: true,
    budgetLimits: {
      daily: 100,  // $100/day
      monthly: 2500 // $2500/month
    },
    preferredProviders: ['groq', 'openai', 'anthropic']
  }
});
```

## Multi-Provider Usage

### Provider-Specific Requests

```typescript
// Use specific provider:model combination
const openaiResponse = await vercelPortal.generateText('openai:gpt-4o', 
  'Explain quantum computing'
);

const anthropicResponse = await vercelPortal.generateText('anthropic:claude-3-5-sonnet-20241022',
  'Write a technical specification'
);

const groqResponse = await vercelPortal.generateText('groq:llama-3.1-8b-instant',
  'Quick summary of this text'
);
```

### Intelligent Provider Selection

```typescript
// Automatic provider selection based on task
const fastResponse = await vercelPortal.generateText(
  'What is 2+2?',
  { preferredCharacteristics: ['speed'] }
);

const qualityResponse = await vercelPortal.generateText(
  'Write a comprehensive business plan for a startup',
  { preferredCharacteristics: ['quality', 'reasoning'] }
);

const visionResponse = await vercelPortal.generateChat([
  {
    role: 'user',
    content: 'Analyze this diagram',
    attachments: [{ type: 'image', data: imageData }]
  }
], { preferredCharacteristics: ['vision'] });
```

### Provider Fallbacks

```typescript
// Automatic fallback on failure
const reliablePortal = createPortal('vercel-ai', {
  providers: [...providers],
  fallbackStrategy: {
    enabled: true,
    order: ['openai', 'anthropic', 'groq'],
    retryAttempts: 2
  }
});

try {
  const response = await reliablePortal.generateText(
    'Complex reasoning task'
  );
} catch (error) {
  // Automatically tried all fallback providers
  console.error('All providers failed:', error);
}
```

## Dynamic Tool Management

### Runtime Tool Addition

```typescript
// Add tools dynamically
const newTool = {
  name: 'database_query',
  description: 'Query the application database',
  parameters: z.object({
    sql: z.string().describe('SQL query to execute'),
    limit: z.number().optional().describe('Result limit')
  }),
  execute: async ({ sql, limit = 100 }) => {
    return await queryDatabase(sql, limit);
  }
};

vercelPortal.addTool(newTool);

// Tool becomes immediately available to all providers
const response = await vercelPortal.generateChat([
  {
    role: 'user',
    content: 'What are the top 5 users by activity?'
  }
]);
```

### Conditional Tool Loading

```typescript
// Load tools based on context
const contextualPortal = createPortal('vercel-ai', {
  providers: [...providers],
  tools: []
});

// Add tools based on user permissions
if (user.hasPermission('database_access')) {
  contextualPortal.addTool(databaseQueryTool);
}

if (user.hasPermission('file_system')) {
  contextualPortal.addTool(fileSystemTool);
}

if (user.hasPermission('web_access')) {
  contextualPortal.addTool(webSearchTool);
}
```

### Tool Removal and Updates

```typescript
// Remove tools
vercelPortal.removeTool('database_query');

// Update tool implementation
vercelPortal.removeTool('web_search');
vercelPortal.addTool({
  name: 'web_search',
  description: 'Enhanced web search with filtering',
  parameters: z.object({
    query: z.string(),
    filters: z.array(z.string()).optional(),
    dateRange: z.string().optional()
  }),
  execute: async ({ query, filters, dateRange }) => {
    return await enhancedWebSearch(query, { filters, dateRange });
  }
});
```

## Advanced Features

### Multi-Provider Consensus

```typescript
// Get consensus from multiple providers
const consensusResponse = await vercelPortal.getConsensus({
  prompt: 'Should we invest in this startup?',
  providers: ['openai:gpt-4o', 'anthropic:claude-3-5-sonnet', 'groq:mixtral-8x7b'],
  aggregation: 'weighted_vote',
  weights: {
    'openai:gpt-4o': 0.4,
    'anthropic:claude-3-5-sonnet': 0.4,
    'groq:mixtral-8x7b': 0.2
  }
});

console.log('Consensus:', consensusResponse.decision);
console.log('Confidence:', consensusResponse.confidence);
console.log('Individual responses:', consensusResponse.individual);
```

### Provider Performance Monitoring

```typescript
// Monitor provider performance
vercelPortal.on('request', ({ provider, model, latency, tokens, cost }) => {
  console.log(`${provider}:${model} - ${latency}ms, ${tokens} tokens, $${cost}`);
});

vercelPortal.on('error', ({ provider, model, error }) => {
  console.error(`${provider}:${model} failed:`, error.message);
});

// Get performance metrics
const metrics = await vercelPortal.getMetrics();
console.log('Provider performance:', {
  averageLatency: metrics.latency.average,
  successRate: metrics.requests.successRate,
  costPerToken: metrics.cost.perToken,
  mostReliable: metrics.providers.mostReliable
});
```

### Cost Optimization

```typescript
// Intelligent cost optimization
const costOptimizedPortal = createPortal('vercel-ai', {
  providers: [...providers],
  
  costOptimization: {
    enabled: true,
    
    // Budget constraints
    budgets: {
      hourly: 10,   // $10/hour
      daily: 200,   // $200/day
      monthly: 5000 // $5000/month
    },
    
    // Cost-based routing
    routingStrategy: 'cost_optimized',
    
    // Provider cost preferences
    costTiers: {
      low: ['groq', 'deepinfra'],
      medium: ['openai', 'google'],
      high: ['anthropic', 'together']
    },
    
    // Quality thresholds
    qualityThresholds: {
      minimum: 0.7,  // Don't use providers below this quality
      target: 0.85   // Prefer providers above this quality
    }
  }
});

// Automatically selects most cost-effective provider for task
const response = await costOptimizedPortal.generateText(
  'Simple classification task'
);
```

### A/B Testing

```typescript
// A/B test different providers
const abTestPortal = createPortal('vercel-ai', {
  providers: [...providers],
  
  abTesting: {
    enabled: true,
    experiments: [
      {
        name: 'provider_quality_test',
        variants: [
          { provider: 'openai:gpt-4o', weight: 0.5 },
          { provider: 'anthropic:claude-3-5-sonnet', weight: 0.5 }
        ],
        metrics: ['quality', 'latency', 'cost']
      }
    ]
  }
});

// Requests are automatically distributed for testing
const response = await abTestPortal.generateText('Test prompt');

// Get A/B test results
const results = await abTestPortal.getExperimentResults('provider_quality_test');
console.log('Winner:', results.winner);
console.log('Confidence:', results.statisticalSignificance);
```

## Provider-Specific Features

### OpenAI Integration

```typescript
// Access OpenAI-specific features
const openaiSpecific = await vercelPortal.generateText('openai:gpt-4o', prompt, {
  providerOptions: {
    openai: {
      reasoningEffort: 'high',  // For o1 models
      logprobs: true,
      topLogprobs: 5
    }
  }
});
```

### Anthropic Integration

```typescript
// Use Anthropic thinking mode
const anthropicThinking = await vercelPortal.generateText('anthropic:claude-3-5-sonnet-20241022', prompt, {
  providerOptions: {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: 32000
      }
    }
  }
});
```

### Groq Integration

```typescript
// Leverage Groq's speed
const groqFast = await vercelPortal.generateText('groq:llama-3.1-8b-instant', prompt, {
  providerOptions: {
    groq: {
      maxTokens: 1000,
      temperature: 0.1  // For consistent fast responses
    }
  }
});
```

## Model Discovery

```typescript
// Get available models from all providers
const availableModels = vercelPortal.getAvailableModels();

console.log('All available models:', availableModels);
/*
{
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  groq: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  // ... more providers
}
*/

// Get models by capability
const visionModels = vercelPortal.getModelsByCapability('vision');
const embeddingModels = vercelPortal.getModelsByCapability('embedding');
const imageGenerationModels = vercelPortal.getModelsByCapability('image_generation');
```

## Error Handling & Resilience

```typescript
// Comprehensive error handling
try {
  const response = await vercelPortal.generateText(prompt);
  return response;
} catch (error) {
  switch (error.code) {
    case 'PROVIDER_UNAVAILABLE':
      // Specific provider is down
      console.log(`Provider ${error.provider} is unavailable, trying fallback`);
      break;
      
    case 'ALL_PROVIDERS_FAILED':
      // All configured providers failed
      console.error('All providers failed:', error.failures);
      break;
      
    case 'BUDGET_EXCEEDED':
      // Cost limit reached
      console.error('Budget limit exceeded:', error.currentSpend);
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      // Rate limit hit
      console.log('Rate limit exceeded, waiting:', error.retryAfter);
      break;
      
    case 'TOOL_EXECUTION_FAILED':
      // Tool execution error
      console.error('Tool failed:', error.toolName, error.toolError);
      break;
      
    default:
      console.error('Unexpected error:', error);
  }
}
```

## Performance Optimization

### Connection Pooling

```typescript
const optimizedPortal = createPortal('vercel-ai', {
  providers: [...providers],
  
  connectionPool: {
    maxConnections: 10,
    keepAlive: true,
    timeout: 30000,
    retryDelay: 1000
  },
  
  caching: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 1000,
    keyStrategy: 'content_hash'
  }
});
```

### Request Batching

```typescript
// Batch multiple requests
const batchResults = await vercelPortal.batchGenerate([
  { provider: 'groq:llama-3.1-8b-instant', prompt: 'Simple task 1' },
  { provider: 'groq:llama-3.1-8b-instant', prompt: 'Simple task 2' },
  { provider: 'openai:gpt-4o', prompt: 'Complex task 1' },
  { provider: 'anthropic:claude-3-5-sonnet', prompt: 'Complex task 2' }
], {
  maxConcurrency: 5,
  retryFailedRequests: true
});
```

## Migration Guide

### From Single Provider

```typescript
// Before: Single OpenAI portal
const oldPortal = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});

// After: Multi-provider with OpenAI as default
const newPortal = createPortal('vercel-ai', {
  providers: [
    { name: 'openai', type: 'openai', apiKey: process.env.OPENAI_API_KEY },
    { name: 'anthropic', type: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY }
  ],
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o'
});

// Same API, more flexibility
const response = await newPortal.generateText(prompt);
```

### Adding New Providers

```typescript
// Gradually add providers
const portal = createPortal('vercel-ai', {
  providers: [
    { name: 'openai', type: 'openai', apiKey: process.env.OPENAI_API_KEY }
  ]
});

// Add providers at runtime
portal.addProvider({
  name: 'anthropic',
  type: 'anthropic', 
  apiKey: process.env.ANTHROPIC_API_KEY
});

portal.addProvider({
  name: 'groq',
  type: 'groq',
  apiKey: process.env.GROQ_API_KEY
});
```

## Best Practices

### Provider Selection Strategy

```typescript
const strategy = {
  // Use fastest providers for simple tasks
  simple: {
    providers: ['groq', 'deepinfra'],
    criteria: ['speed', 'cost']
  },
  
  // Use highest quality for complex tasks
  complex: {
    providers: ['openai', 'anthropic'],
    criteria: ['quality', 'reasoning']
  },
  
  // Use vision-capable providers for multimodal
  multimodal: {
    providers: ['openai', 'anthropic', 'google'],
    criteria: ['vision', 'quality']
  },
  
  // Use cost-effective providers for batch processing
  batch: {
    providers: ['groq', 'together', 'deepinfra'],
    criteria: ['cost', 'throughput']
  }
};
```

### Monitoring & Alerting

```typescript
// Set up monitoring
vercelPortal.on('performance_degradation', ({ provider, metric, threshold }) => {
  console.warn(`${provider} performance degraded: ${metric} exceeded ${threshold}`);
});

vercelPortal.on('cost_threshold', ({ currentSpend, threshold, timeframe }) => {
  console.warn(`Cost threshold reached: $${currentSpend} in ${timeframe}`);
});

vercelPortal.on('provider_failure', ({ provider, consecutiveFailures }) => {
  if (consecutiveFailures > 5) {
    console.error(`${provider} has failed ${consecutiveFailures} times consecutively`);
    // Consider disabling provider temporarily
  }
});
```

## Next Steps

- Explore [Portal Switching Guide](../portal-switching) for dynamic configuration
- Learn about [MCP Integration](../../integrations/mcp/) for dynamic tools
- See [Multi-Agent Coordination](../../agents/multi-agent/) for advanced workflows
- Check [Cost Optimization Guide](../../performance/optimization/) for efficiency tips