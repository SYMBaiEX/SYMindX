# Vercel AI SDK Portal Examples

## Overview

This guide demonstrates how to leverage the Vercel AI SDK's multi-provider capabilities through SYMindX's Vercel portal, enabling access to 20+ AI providers through a unified interface with intelligent routing and cost optimization.

## Character Configuration

### Vercel - Multi-Provider AI Character

```json
{
  "id": "vercel-ai",
  "name": "Vercel",
  "description": "Versatile AI assistant with access to multiple providers via Vercel AI SDK",
  "enabled": false,
  
  "personality": {
    "traits": {
      "adaptability": 0.95,
      "efficiency": 0.9,
      "versatility": 0.95,
      "optimization": 0.9,
      "intelligence": 0.9
    },
    "values": [
      "Multi-provider flexibility",
      "Cost optimization",
      "Performance excellence",
      "Intelligent routing"
    ]
  },
  
  "portals": {
    "primary": "vercel-ai",
    "config": {
      "vercel-ai": {
        "defaultProvider": "openai",
        "defaultModel": "gpt-4.1-mini",
        "enabledProviders": ["openai", "anthropic", "google", "groq"],
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Multi-Provider Setup

Configure multiple AI providers with intelligent routing:

```json
{
  "portals": {
    "vercel-ai": {
      "providers": [
        {
          "name": "openai",
          "type": "openai",
          "apiKey": "${OPENAI_API_KEY}",
          "models": ["gpt-4o", "gpt-4.1-mini", "gpt-3.5-turbo"]
        },
        {
          "name": "anthropic", 
          "type": "anthropic",
          "apiKey": "${ANTHROPIC_API_KEY}",
          "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]
        },
        {
          "name": "google",
          "type": "google",
          "apiKey": "${GOOGLE_API_KEY}",
          "models": ["gemini-2.0-flash-001", "gemini-1.5-pro"]
        },
        {
          "name": "groq",
          "type": "groq", 
          "apiKey": "${GROQ_API_KEY}",
          "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        },
        {
          "name": "mistral",
          "type": "mistral",
          "apiKey": "${MISTRAL_API_KEY}",
          "models": ["mistral-large-latest", "mistral-small-latest"]
        }
      ],
      "enabledProviders": ["openai", "anthropic", "google", "groq", "mistral"],
      "defaultProvider": "openai",
      "defaultModel": "gpt-4.1-mini",
      "routingStrategy": "intelligent",
      "costOptimization": true,
      "enableFallbacks": true
    }
  }
}
```

### Advanced Configuration with Runtime Tools

```json
{
  "portals": {
    "vercel-ai": {
      "providers": [
        {
          "name": "openai",
          "type": "openai", 
          "apiKey": "${OPENAI_API_KEY}"
        },
        {
          "name": "anthropic",
          "type": "anthropic",
          "apiKey": "${ANTHROPIC_API_KEY}"
        }
      ],
      "enabledProviders": ["openai", "anthropic"],
      "defaultProvider": "openai",
      "defaultModel": "gpt-4.1-mini",
      "routingStrategy": "intelligent",
      "tools": [
        {
          "name": "web_search",
          "description": "Search the web for current information",
          "parameters": {
            "type": "object",
            "properties": {
              "query": { "type": "string" }
            },
            "required": ["query"]
          }
        },
        {
          "name": "weather_lookup",
          "description": "Get current weather information",
          "parameters": {
            "type": "object",
            "properties": {
              "location": { "type": "string" }
            },
            "required": ["location"]
          }
        }
      ],
      "enableRuntimeTools": true
    }
  }
}
```

## Usage Examples

### Intelligent Provider Selection

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Vercel AI agent
const agent = await runtime.spawnAgent('vercel-ai');

// Automatic provider selection based on task
const codeTask = await agent.chat(`
Create a React component for a data visualization dashboard.
Include TypeScript types, proper error handling, and responsive design.
`, {
  preferredCapabilities: ['code_generation', 'typescript'],
  // Will automatically route to best provider for coding (likely Claude or GPT-4)
});

const creativeTask = await agent.chat(`
Write a compelling marketing copy for a new AI-powered productivity app.
Make it engaging, benefit-focused, and include a call to action.
`, {
  preferredCapabilities: ['creative_writing', 'marketing'],
  // Will route to provider best suited for creative tasks
});

const speedTask = await agent.chat(`
Quickly summarize the key points from this meeting transcript.
`, {
  preferredCapabilities: ['fast_response', 'summarization'],
  // Will route to fastest provider (likely Groq)
});
```

### Multi-Provider Comparison

```typescript
// Compare responses from multiple providers
const compareProviders = async (prompt) => {
  const providers = ['openai', 'anthropic', 'google', 'groq'];
  const responses = [];
  
  for (const provider of providers) {
    const response = await agent.chat(prompt, {
      provider,
      model: 'default' // Use default model for each provider
    });
    
    responses.push({
      provider,
      response: response.text,
      tokens: response.usage?.totalTokens,
      cost: response.estimatedCost,
      latency: response.duration
    });
  }
  
  return responses;
};

// Example comparison
const comparison = await compareProviders(`
Explain the concept of quantum computing in terms a business executive would understand.
Include potential business applications and timeline for commercial viability.
`);

// Analyze results
comparison.forEach(result => {
  console.log(`${result.provider}: ${result.latency}ms, $${result.cost}`);
});
```

### Cost-Optimized Routing

```typescript
// Configure cost optimization strategies
const costOptimizedAgent = await runtime.spawnAgent('vercel-ai', {
  routing: {
    strategy: 'cost_optimized',
    budgetLimits: {
      daily: 10.00,      // $10 per day
      perRequest: 0.50   // $0.50 per request
    },
    fallbackChain: [
      'groq',            // Cheapest first
      'openai:gpt-4.1-mini',
      'anthropic:claude-3-5-haiku',
      'google:gemini-2.0-flash'
    ]
  }
});

// Automatically uses most cost-effective provider
const economicalResponse = await costOptimizedAgent.chat(`
Analyze this business proposal and provide recommendations.
Focus on market viability and financial projections.
`);
```

## Advanced Features

### Runtime Tool Discovery

```typescript
// Dynamic tool registration with Vercel AI SDK
import { z } from 'zod';

// Define tools at runtime
const runtimeTools = {
  analyzeStock: {
    description: 'Analyze stock performance and trends',
    parameters: z.object({
      symbol: z.string().describe('Stock symbol (e.g., AAPL)'),
      period: z.string().describe('Analysis period (1d, 1w, 1m, 1y)')
    }),
    execute: async ({ symbol, period }) => {
      // Stock analysis implementation
      return {
        symbol,
        currentPrice: 150.25,
        change: '+2.5%',
        trend: 'bullish',
        period
      };
    }
  },

  generateChart: {
    description: 'Generate chart data for visualization',
    parameters: z.object({
      dataType: z.string().describe('Type of chart data needed'),
      format: z.enum(['json', 'csv']).describe('Output format')
    }),
    execute: async ({ dataType, format }) => {
      return {
        data: generateChartData(dataType),
        format,
        timestamp: new Date().toISOString()
      };
    }
  }
};

// Register tools dynamically
await agent.registerTools(runtimeTools);

// Use tools with automatic provider selection
const toolResponse = await agent.chat(
  "Analyze AAPL stock performance over the last month and generate a chart",
  { enableTools: true }
);
```

### Provider-Specific Optimization

```typescript
// Optimize for specific provider strengths
const optimizedWorkflow = async (task) => {
  const taskType = classifyTask(task);
  
  switch (taskType) {
    case 'code_generation':
      return await agent.chat(task, {
        provider: 'anthropic',  // Claude excels at coding
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.3
      });
      
    case 'creative_writing':
      return await agent.chat(task, {
        provider: 'openai',     // GPT-4 for creativity
        model: 'gpt-4o',
        temperature: 0.9
      });
      
    case 'fast_query':
      return await agent.chat(task, {
        provider: 'groq',       // Groq for speed
        model: 'llama-3.1-8b-instant',
        temperature: 0.7
      });
      
    case 'multimodal':
      return await agent.chat(task, {
        provider: 'google',     // Gemini for multimodal
        model: 'gemini-2.0-flash-001',
        temperature: 0.7
      });
      
    default:
      return await agent.chat(task); // Use intelligent routing
  }
};
```

### Streaming with Provider Fallbacks

```typescript
// Streaming with automatic fallbacks
const streamWithFallback = async (prompt) => {
  const primaryProvider = 'openai';
  const fallbackProviders = ['anthropic', 'google', 'groq'];
  
  try {
    // Try primary provider first
    const stream = await agent.chatStream(prompt, {
      provider: primaryProvider
    });
    
    return stream;
  } catch (error) {
    console.log(`Primary provider ${primaryProvider} failed, trying fallbacks`);
    
    // Try fallback providers
    for (const provider of fallbackProviders) {
      try {
        const stream = await agent.chatStream(prompt, { provider });
        console.log(`Using fallback provider: ${provider}`);
        return stream;
      } catch (fallbackError) {
        console.log(`Fallback provider ${provider} also failed`);
      }
    }
    
    throw new Error('All providers failed');
  }
};

// Usage
const stream = await streamWithFallback("Explain machine learning concepts");
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

## Real-World Applications

### Multi-Provider Chat Interface

```typescript
// Intelligent chat interface with provider selection
const chatInterface = await runtime.spawnAgent('vercel-ai', {
  systemPrompt: 'You are a helpful assistant with access to multiple AI providers.',
  
  routing: {
    rules: [
      {
        condition: 'contains_code',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      },
      {
        condition: 'creative_task',
        provider: 'openai',
        model: 'gpt-4o'
      },
      {
        condition: 'simple_query',
        provider: 'groq',
        model: 'llama-3.1-8b-instant'
      }
    ],
    defaultProvider: 'openai'
  }
});

// Chat handles provider selection automatically
const responses = await Promise.all([
  chatInterface.chat("Write a Python function to parse JSON"),           // → Anthropic
  chatInterface.chat("Create a story about a time-traveling scientist"), // → OpenAI
  chatInterface.chat("What's the capital of France?")                    // → Groq
]);
```

### Cost-Aware Content Generation

```typescript
// Content pipeline with cost optimization
const contentPipeline = {
  // Fast drafting with cheap provider
  draft: async (topic) => {
    return await agent.chat(`Create a rough draft about ${topic}`, {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      maxTokens: 1000
    });
  },
  
  // High-quality refinement with premium provider
  refine: async (draft) => {
    return await agent.chat(`Refine and improve this draft: ${draft}`, {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3
    });
  },
  
  // SEO optimization with specialized provider
  optimize: async (content) => {
    return await agent.chat(`Optimize for SEO: ${content}`, {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      tools: ['seoAnalysis', 'keywordSuggestion']
    });
  }
};

// Complete content workflow
const topic = "The Future of Renewable Energy";
const draft = await contentPipeline.draft(topic);
const refined = await contentPipeline.refine(draft);
const optimized = await contentPipeline.optimize(refined);
```

### A/B Testing Platform

```typescript
// Test different providers for the same task
const abTestPlatform = {
  testProviders: async (prompt, providers = ['openai', 'anthropic', 'google']) => {
    const results = await Promise.all(
      providers.map(async (provider) => {
        const startTime = Date.now();
        const response = await agent.chat(prompt, { provider });
        const endTime = Date.now();
        
        return {
          provider,
          response: response.text,
          latency: endTime - startTime,
          tokens: response.usage?.totalTokens || 0,
          cost: response.estimatedCost || 0,
          quality: await assessQuality(response.text, prompt)
        };
      })
    );
    
    return {
      prompt,
      results,
      winner: selectBestResult(results),
      metrics: calculateMetrics(results)
    };
  },
  
  batchTest: async (prompts, providers) => {
    const allResults = await Promise.all(
      prompts.map(prompt => this.testProviders(prompt, providers))
    );
    
    return generateComparisonReport(allResults);
  }
};

// Run A/B test
const testResults = await abTestPlatform.testProviders(
  "Explain quantum computing for business executives",
  ['openai', 'anthropic', 'google', 'groq']
);
```

## Performance Monitoring

### Provider Performance Tracking

```typescript
// Monitor performance across providers
const performanceTracker = {
  metrics: new Map(),
  
  track: (provider, response, startTime) => {
    const metrics = this.metrics.get(provider) || {
      calls: 0,
      totalLatency: 0,
      totalTokens: 0,
      totalCost: 0,
      errors: 0
    };
    
    metrics.calls++;
    metrics.totalLatency += Date.now() - startTime;
    metrics.totalTokens += response.usage?.totalTokens || 0;
    metrics.totalCost += response.estimatedCost || 0;
    
    this.metrics.set(provider, metrics);
  },
  
  getReport: () => {
    const report = {};
    
    for (const [provider, metrics] of this.metrics.entries()) {
      report[provider] = {
        avgLatency: metrics.totalLatency / metrics.calls,
        avgTokens: metrics.totalTokens / metrics.calls,
        avgCost: metrics.totalCost / metrics.calls,
        totalCalls: metrics.calls,
        errorRate: metrics.errors / metrics.calls
      };
    }
    
    return report;
  }
};

// Integrate tracking
agent.on('response', (event) => {
  performanceTracker.track(event.provider, event.response, event.startTime);
});

// Generate daily report
setInterval(() => {
  const report = performanceTracker.getReport();
  console.log('Daily Performance Report:', report);
}, 24 * 60 * 60 * 1000);
```

## Integration Examples

### Multi-Provider API Gateway

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('vercel-ai');

// Intelligent routing endpoint
app.post('/ai-complete', async (req, res) => {
  try {
    const { 
      prompt, 
      preferredProvider, 
      maxCost, 
      maxLatency,
      capabilities = []
    } = req.body;
    
    // Build routing constraints
    const constraints = {
      maxCost,
      maxLatency,
      capabilities,
      preferredProvider
    };
    
    const response = await agent.chat(prompt, { constraints });
    
    res.json({
      response: response.text,
      provider: response.metadata.provider,
      model: response.metadata.model,
      cost: response.estimatedCost,
      latency: response.duration,
      tokens: response.usage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Provider comparison endpoint
app.post('/ai-compare', async (req, res) => {
  const { prompt, providers = ['openai', 'anthropic', 'google'] } = req.body;
  
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const response = await agent.chat(prompt, { provider });
        return {
          provider,
          success: true,
          response: response.text,
          cost: response.estimatedCost,
          latency: response.duration
        };
      } catch (error) {
        return {
          provider,
          success: false,
          error: error.message
        };
      }
    })
  );
  
  res.json({ prompt, results });
});
```

### Smart Content Generation Service

```typescript
// Multi-provider content generation
const contentService = {
  generateBlogPost: async (topic, requirements) => {
    const { length, tone, seoFocus } = requirements;
    
    // Choose provider based on requirements
    let provider = 'openai'; // default
    if (length > 2000) provider = 'anthropic'; // Better for long content
    if (seoFocus) provider = 'openai'; // Better SEO optimization
    if (tone === 'technical') provider = 'anthropic'; // Better technical writing
    
    return await agent.chat(`
      Write a ${length}-word blog post about "${topic}".
      Tone: ${tone}
      SEO Focus: ${seoFocus ? 'High' : 'Medium'}
      
      Include:
      - Engaging introduction
      - Well-structured sections
      - Actionable insights
      - Strong conclusion
      ${seoFocus ? '- SEO-optimized headings and meta description' : ''}
    `, { provider });
  },
  
  generateSocialMedia: async (content, platforms) => {
    const posts = {};
    
    for (const platform of platforms) {
      const platformRequirements = {
        twitter: 'Concise, engaging, max 280 characters',
        linkedin: 'Professional, insightful, business-focused',
        instagram: 'Visual-friendly, inspirational, hashtag-optimized',
        facebook: 'Conversational, community-focused'
      };
      
      posts[platform] = await agent.chat(`
        Create a ${platform} post based on this content:
        ${content}
        
        Requirements: ${platformRequirements[platform]}
      `, {
        provider: 'openai', // Good for social media content
        model: 'gpt-4.1-mini' // Cost-effective for short content
      });
    }
    
    return posts;
  }
};
```

## Best Practices

1. **Use intelligent routing** to optimize for cost, speed, and quality
2. **Implement provider fallbacks** for reliability
3. **Monitor performance metrics** across providers
4. **Cache responses** when appropriate to reduce costs
5. **Test different providers** for your specific use cases
6. **Set budget limits** to control costs
7. **Use appropriate models** for each task type

## Troubleshooting

### Provider Failures

```typescript
// Handle provider-specific failures
agent.on('providerError', (event) => {
  console.log(`Provider ${event.provider} failed:`, event.error);
  
  // Implement specific error handling
  switch (event.error.type) {
    case 'rate_limit':
      // Switch to alternative provider
      break;
    case 'quota_exceeded':
      // Use backup provider or queue request
      break;
    case 'model_unavailable':
      // Fall back to different model
      break;
  }
});
```

### Cost Monitoring

```typescript
// Monitor and alert on costs
const costMonitor = {
  dailySpend: 0,
  threshold: 50, // $50 daily limit
  
  track: (cost) => {
    this.dailySpend += cost;
    
    if (this.dailySpend > this.threshold) {
      console.warn('Daily cost threshold exceeded!');
      // Switch to cheaper providers or pause
    }
  }
};

agent.on('response', (event) => {
  costMonitor.track(event.estimatedCost);
});
```

## Next Steps

- Explore [Vercel AI SDK Portal Configuration](/docs/portals/vercel)
- Learn about [Multi-Provider Strategies](/docs/advanced-topics/multi-provider)
- Check [Cost Optimization Guide](/docs/deployment/cost-optimization)
- See [Provider Performance Comparison](/docs/portals/vercel/performance)