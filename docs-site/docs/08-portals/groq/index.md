---
sidebar_position: 3
title: "Groq Portal"
description: "High-performance inference with Groq"
---

# Groq Portal

Ultra-fast AI inference powered by Groq's specialized hardware, featuring the latest Llama 4 models and industry-leading speed optimization.

## Overview

The Groq portal provides access to high-performance open-source models with ultra-fast inference speeds. Features the latest Llama 4 Scout, Llama 3.3, and specialized tool-optimized models. Ideal for cost-effective, high-volume applications requiring fast response times.

## Latest Models (2025)

### Llama 4 Series (Latest)
- **Llama 4 Scout 17B**: Latest efficient chat model with 16e-instruct training
- **Meta-Llama/Llama-4-Scout-17B-16e-Instruct**: Full model identifier

### Llama 3.3 Series
- **Llama 3.3 70B Versatile**: High-quality flagship model
- **Llama 3.3 70B**: Premium performance model

### Llama 3.1 Series
- **Llama 3.1 70B Versatile**: Proven high-performance model
- **Llama 3.1 8B Instant**: Ultra-fast for tools and simple tasks

### Tool-Optimized Models
- **Llama 3 Groq 70B Tool Use**: Specialized for function calling
- **Llama 3 Groq 8B Tool Use**: Fast tool execution

### Gemma Series
- **Gemma 2 9B IT**: Google's latest instruction-tuned model
- **Gemma 7B IT**: Efficient conversation model

### Legacy Models (Still Available)
- **Llama 3 70B**: Previous generation flagship
- **Llama 3 8B**: Previous generation fast model

## Configuration

### Basic Configuration

```json
{
  "portals": {
    "groq": {
      "apiKey": "gsk_...",
      "model": "meta-llama/llama-4-scout-17b-16e-instruct",
      "temperature": 0.7,
      "maxTokens": 8192
    }
  }
}
```

### Dual-Model Architecture (Recommended)

```json
{
  "portals": {
    "groq": {
      "apiKey": "gsk_...",
      "model": "meta-llama/llama-4-scout-17b-16e-instruct",  // For chat
      "toolModel": "llama-3.1-8b-instant",                  // For tools
      "temperature": 0.7,
      "maxTokens": 8192,
      "timeout": 30000
    }
  }
}
```

### Environment Variables

```bash
# Required
GROQ_API_KEY=gsk_...

# Optional
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
GROQ_TOOL_MODEL=llama-3.1-8b-instant
GROQ_MAX_TOKENS=8192
```

## Key Features

### Ultra-Fast Inference

Groq's specialized hardware provides industry-leading inference speeds:

```typescript
// Blazing fast responses
const startTime = Date.now();
const response = await portal.generateChat(messages);
const duration = Date.now() - startTime;
console.log(`Response generated in ${duration}ms`);
// Typical: 50-200ms for most responses
```

### Dual-Model Architecture

Intelligent model selection for optimal performance and cost:

```typescript
// Automatically uses appropriate model
const chatResponse = await portal.generateChat([
  { role: 'user', content: 'Explain quantum computing' }
]);
// Uses: meta-llama/llama-4-scout-17b-16e-instruct

const toolResponse = await portal.generateChat(messages, {
  functions: [{ name: 'calculate', ... }]
});
// Uses: llama-3.1-8b-instant (ultra-fast for tools)
```

### Advanced Tool Evaluation

Specialized evaluation capabilities for agent workflows:

```typescript
// Evaluate agent performance
const evaluation = await portal.evaluateTask({
  task: 'Code generation quality assessment',
  context: generatedCode,
  criteria: [
    'Code correctness',
    'Performance optimization',
    'Security considerations',
    'Best practices adherence'
  ],
  outputFormat: 'json'
});

console.log(evaluation);
// Returns structured evaluation with scores and recommendations
```

### Function Calling

Advanced tool integration with specialized models:

```typescript
const functions = [
  {
    name: 'search_documentation',
    description: 'Search technical documentation',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', enum: ['api', 'tutorial', 'reference'] }
      },
      required: ['query']
    }
  }
];

const response = await portal.generateChat(messages, {
  functions,
  model: 'llama-3-groq-70b-8192-tool-use-preview'  // Tool-optimized
});
```

### Streaming

Real-time response streaming:

```typescript
// Stream text generation
for await (const chunk of portal.streamText('Write a comprehensive guide to...')) {
  process.stdout.write(chunk);
}

// Stream chat responses
for await (const chunk of portal.streamChat(messages)) {
  process.stdout.write(chunk);
}
```

## Usage Examples

### Basic Setup

```typescript
import { Agent } from '@symindx/core';
import { createGroqPortal } from '@symindx/portals';

// Create Groq portal with latest models
const groqPortal = createGroqPortal({
  apiKey: process.env.GROQ_API_KEY,
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  toolModel: 'llama-3.1-8b-instant'
});

// Configure fast agent
const agent = new Agent({
  name: 'FastAssistant',
  portal: groqPortal
});

// Ultra-fast responses
const response = await agent.think('Explain machine learning in simple terms');
```

### Cost-Optimized Configuration

```typescript
// High-volume, cost-effective setup
const costOptimizedPortal = createGroqPortal({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.1-8b-instant',     // Fast and cheap
  toolModel: 'llama-3.1-8b-instant', // Same for tools
  maxTokens: 2048,                   // Limit response length
  temperature: 0.5                   // More deterministic
});
```

### High-Quality Configuration

```typescript
// Premium quality setup
const qualityPortal = createGroqPortal({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',           // High quality
  toolModel: 'llama-3-groq-70b-8192-tool-use-preview', // Tool specialist
  maxTokens: 8192,
  temperature: 0.8
});
```

### Tool Evaluation Workflow

```typescript
// Comprehensive evaluation system
class AgentEvaluator {
  constructor(groqPortal) {
    this.portal = groqPortal;
  }
  
  async evaluateCodeGeneration(generatedCode, requirements) {
    return await this.portal.evaluateTask({
      task: 'Code generation evaluation',
      context: `
        Requirements: ${requirements}
        Generated Code: ${generatedCode}
      `,
      criteria: [
        'Functional correctness',
        'Code quality and style',
        'Performance considerations',
        'Security best practices',
        'Error handling',
        'Documentation quality'
      ],
      outputFormat: 'structured'
    });
  }
  
  async evaluateConversation(conversation, goals) {
    return await this.portal.evaluateTask({
      task: 'Conversation quality assessment',
      context: conversation,
      criteria: [
        'Goal achievement',
        'Clarity of communication',
        'Helpfulness',
        'Accuracy of information'
      ],
      outputFormat: 'json'
    });
  }
}
```

## Model Specifications

| Model | Context | Speed | Strengths | Best For |
|-------|---------|-------|-----------|----------|
| **Llama 4 Scout 17B** | 8K | ⚡⚡⚡ | Latest capabilities | General chat |
| **Llama 3.3 70B** | 8K | ⚡⚡ | High quality | Complex tasks |
| **Llama 3.1 70B** | 8K | ⚡⚡ | Proven performance | Balanced use |
| **Llama 3.1 8B** | 8K | ⚡⚡⚡⚡ | Ultra-fast | Tools, simple tasks |
| **Groq Tool Use 70B** | 8K | ⚡⚡ | Function calling | Tool integration |
| **Groq Tool Use 8B** | 8K | ⚡⚡⚡⚡ | Fast tools | Rapid tool calls |
| **Gemma 2 9B** | 8K | ⚡⚡⚡ | Google quality | Conversation |

## Performance Benchmarks

### Speed Comparison

```typescript
// Benchmark different models
const benchmark = async () => {
  const models = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];
  
  for (const model of models) {
    const start = Date.now();
    await portal.generateText('Explain quantum computing', { model });
    const duration = Date.now() - start;
    console.log(`${model}: ${duration}ms`);
  }
};

// Typical results:
// llama-3.1-8b-instant: 50-100ms
// llama-4-scout-17b: 100-200ms  
// llama-3.3-70b-versatile: 200-400ms
```

### Cost Optimization

```typescript
// Cost per token comparison (example)
const costAnalysis = {
  'llama-3.1-8b-instant': '$0.05/1M tokens',
  'llama-4-scout-17b': '$0.10/1M tokens',
  'llama-3.3-70b-versatile': '$0.15/1M tokens'
};

// Choose model based on budget and requirements
const selectModel = (complexity, budget) => {
  if (budget === 'low') return 'llama-3.1-8b-instant';
  if (complexity === 'high') return 'llama-3.3-70b-versatile';
  return 'meta-llama/llama-4-scout-17b-16e-instruct';
};
```

## Capabilities Reference

### Supported Capabilities
- ✅ **Text Generation**: All models with fast inference
- ✅ **Chat Generation**: Natural conversation abilities
- ✅ **Streaming**: Real-time response generation
- ✅ **Function Calling**: Tool integration capabilities
- ✅ **Tool Usage**: Advanced tool execution
- ✅ **Evaluation**: Specialized evaluation capabilities
- ❌ **Embedding Generation**: Not supported
- ❌ **Image Generation**: Not supported
- ❌ **Vision Analysis**: Not supported

### Portal Metadata

```typescript
// Check Groq portal capabilities
console.log(portal.hasCapability('TEXT_GENERATION'));  // true
console.log(portal.hasCapability('STREAMING'));        // true
console.log(portal.hasCapability('FUNCTION_CALLING')); // true
console.log(portal.hasCapability('EVALUATION'));       // true
console.log(portal.hasCapability('VISION'));           // false

// Supported model types
console.log(portal.supportedModels);
// ['TEXT_GENERATION', 'CHAT', 'CODE_GENERATION']
```

## Best Practices

### Model Selection Strategy

```typescript
const selectOptimalModel = (useCase) => {
  switch (useCase) {
    case 'chat':
      return 'meta-llama/llama-4-scout-17b-16e-instruct';
    case 'tools':
      return 'llama-3.1-8b-instant';
    case 'complex_reasoning':
      return 'llama-3.3-70b-versatile';
    case 'bulk_processing':
      return 'llama-3.1-8b-instant';
    case 'tool_use':
      return 'llama-3-groq-70b-8192-tool-use-preview';
    default:
      return 'meta-llama/llama-4-scout-17b-16e-instruct';
  }
};
```

### Performance Optimization

```typescript
// Optimize for speed
const speedOptimized = {
  model: 'llama-3.1-8b-instant',
  maxTokens: 1024,           // Shorter responses
  temperature: 0.3,          // More deterministic
  timeout: 10000            // Short timeout
};

// Optimize for quality
const qualityOptimized = {
  model: 'llama-3.3-70b-versatile',
  maxTokens: 4096,
  temperature: 0.8,
  timeout: 60000
};
```

### Efficient Function Calling

```typescript
// Use tool-optimized models for functions
const efficientFunctionCalling = async (messages, functions) => {
  return await portal.generateChat(messages, {
    functions,
    model: 'llama-3-groq-8b-8192-tool-use-preview', // Fast tool model
    maxTokens: 2048,
    temperature: 0.2  // More precise for tools
  });
};
```

## Integration Examples

### High-Volume Processing

```typescript
// Process large batches efficiently
class BatchProcessor {
  constructor(groqPortal) {
    this.portal = groqPortal;
  }
  
  async processBatch(items, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(item => 
        this.portal.generateText(item, {
          model: 'llama-3.1-8b-instant',  // Fast model
          maxTokens: 512
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}
```

### Real-Time Applications

```typescript
// Real-time chat with streaming
class RealTimeChat {
  constructor(groqPortal) {
    this.portal = groqPortal;
  }
  
  async *streamResponse(message) {
    const messages = [{ role: 'user', content: message }];
    
    for await (const chunk of this.portal.streamChat(messages, {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens: 2048
    })) {
      yield chunk;
    }
  }
}
```

### Cost-Aware Applications

```typescript
// Dynamic model selection based on cost
class CostAwareAgent {
  constructor(groqPortal, dailyBudget) {
    this.portal = groqPortal;
    this.budget = dailyBudget;
    this.spent = 0;
  }
  
  async generateResponse(message, complexity = 'medium') {
    const model = this.selectModelByBudget(complexity);
    
    const response = await this.portal.generateChat([
      { role: 'user', content: message }
    ], { model });
    
    // Track spending (simplified)
    this.spent += this.estimateCost(response.usage.totalTokens, model);
    
    return response;
  }
  
  selectModelByBudget(complexity) {
    const remainingBudget = this.budget - this.spent;
    
    if (remainingBudget < this.budget * 0.2) {
      return 'llama-3.1-8b-instant';  // Cheap model
    }
    
    if (complexity === 'high') {
      return 'llama-3.3-70b-versatile';
    }
    
    return 'meta-llama/llama-4-scout-17b-16e-instruct';
  }
}
```

## Error Handling

```typescript
try {
  const response = await portal.generateChat(messages);
} catch (error) {
  if (error.code === 'model_overloaded') {
    console.log('Model busy, retrying with faster model');
    // Retry with llama-3.1-8b-instant
  } else if (error.code === 'context_length_exceeded') {
    console.log('Context too long, truncating');
    // Implement context truncation
  } else {
    console.error('Groq error:', error);
    // Fallback to different portal
  }
}
```

The Groq portal provides the fastest AI inference available, making it ideal for real-time applications, high-volume processing, and cost-sensitive use cases where speed is paramount.

## Learn More

- [Overview](/docs/01-overview)
- [API Reference](/docs/03-api-reference)
- [Examples](/docs/17-examples)

---

*This documentation is being actively developed. Check back for updates.*
