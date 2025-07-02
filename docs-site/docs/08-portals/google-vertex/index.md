---
sidebar_position: 4
sidebar_label: "Google Vertex AI"
title: "Google Vertex AI Portal"
description: "Enterprise-grade Google AI via Vertex AI platform"
---

# Google Vertex AI Portal

The Google Vertex AI Portal provides enterprise-grade access to Google's latest AI models through the Vertex AI platform. This portal is designed for production environments requiring enterprise authentication, compliance, and advanced monitoring capabilities.

## Overview

- **Provider**: Google Cloud Vertex AI
- **Models**: Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0
- **Authentication**: Google Cloud Application Default Credentials
- **Best For**: Enterprise deployments, production workloads, compliance requirements

## Configuration

### Basic Setup

```typescript
import { createPortal } from '@symindx/core';

const vertexPortal = createPortal('google-vertex', {
  projectId: 'your-google-cloud-project',
  location: 'us-central1',
  model: 'gemini-1.5-pro',
  safetySettings: [
    { 
      category: 'HARM_CATEGORY_HARASSMENT', 
      threshold: 'BLOCK_MEDIUM_AND_ABOVE' 
    }
  ]
});
```

### Advanced Configuration

```typescript
const vertexPortal = createPortal('google-vertex', {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
  model: 'gemini-1.5-pro',
  
  // Generation settings
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    candidateCount: 1
  },
  
  // Safety settings
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
  ],
  
  // System instruction
  systemInstruction: 'You are a helpful AI assistant specialized in technical documentation.',
  
  // Function calling tools
  tools: [
    {
      functionDeclarations: [
        {
          name: 'search_documentation',
          description: 'Search technical documentation',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              source: { type: 'string' }
            },
            required: ['query']
          }
        }
      ]
    }
  ],
  
  // Custom authentication (optional)
  googleAuthOptions: {
    projectId: 'your-project',
    keyFilename: '/path/to/service-account-key.json'
  }
});
```

## Authentication

### Application Default Credentials (Recommended)

```bash
# Install gcloud CLI and authenticate
gcloud auth application-default login

# Or set service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### Environment Variables

```bash
# Required
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional (defaults to us-central1)
GOOGLE_CLOUD_LOCATION=us-central1

# Optional (if not using gcloud auth)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Available Models

### Gemini 1.5 Series

```typescript
// Flagship model with 2M context window
const proModel = {
  model: 'gemini-1.5-pro',
  maxTokens: 2000000,  // 2M context window
  features: ['text', 'vision', 'code', 'reasoning']
};

// Faster, cost-effective model
const flashModel = {
  model: 'gemini-1.5-flash',
  maxTokens: 1000000,  // 1M context window
  features: ['text', 'vision', 'code'],
  speed: 'high'
};

// Latest model versions
const latestModels = [
  'gemini-1.5-pro-002',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b'
];
```

### Gemini 2.0 Series (Preview)

```typescript
// Latest experimental models
const gemini2Models = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp-01-21'
];
```

## Features

### Multimodal Capabilities

```typescript
// Text + Image analysis
const response = await vertexPortal.generateChat([
  {
    role: 'user',
    content: 'Analyze this architectural diagram',
    attachments: [
      {
        type: 'image',
        url: 'gs://your-bucket/diagram.png',
        mimeType: 'image/png'
      }
    ]
  }
]);

// Video analysis
const videoAnalysis = await vertexPortal.generateChat([
  {
    role: 'user',
    content: 'Describe what happens in this video',
    attachments: [
      {
        type: 'video',
        url: 'gs://your-bucket/presentation.mp4',
        mimeType: 'video/mp4'
      }
    ]
  }
]);
```

### Function Calling

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: { 
              type: 'string',
              description: 'City and country, e.g. San Francisco, CA'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: 'Temperature unit'
            }
          },
          required: ['location']
        }
      }
    ]
  }
];

const response = await vertexPortal.generateChat(messages, {
  tools
});
```

### Streaming Responses

```typescript
// Stream chat responses
const stream = vertexPortal.streamChat(messages);

for await (const chunk of stream) {
  console.log('Chunk:', chunk);
  // Process each chunk as it arrives
}

// Stream text generation
const textStream = vertexPortal.streamText(prompt);

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

## Enterprise Features

### Compliance & Security

- **SOC 2 Type II**: Enterprise security compliance
- **HIPAA**: Healthcare data protection
- **ISO 27001**: Information security management
- **Data Residency**: Control where data is processed
- **VPC Integration**: Private network connectivity

### Monitoring & Logging

```typescript
// Built-in logging and monitoring
const vertexPortal = createPortal('google-vertex', {
  projectId: 'your-project',
  location: 'us-central1',
  
  // Enable detailed logging
  enableLogging: true,
  
  // Custom monitoring
  onRequest: (request) => {
    console.log('Request:', request.model, request.tokens);
  },
  
  onResponse: (response) => {
    console.log('Response:', response.usage, response.latency);
  }
});
```

### Multi-Region Deployment

```typescript
// Configure multiple regions for availability
const multiRegionConfig = {
  regions: [
    { location: 'us-central1', priority: 1 },
    { location: 'us-east1', priority: 2 },
    { location: 'europe-west1', priority: 3 }
  ],
  
  // Automatic failover
  autoFailover: true,
  
  // Load balancing
  loadBalancing: 'round_robin'
};
```

## Best Practices

### Performance Optimization

```typescript
// Use appropriate models for tasks
const config = {
  // Fast responses for simple tasks
  toolModel: 'gemini-1.5-flash',
  
  // Quality responses for complex tasks
  chatModel: 'gemini-1.5-pro',
  
  // Batch processing
  batchSize: 10,
  
  // Connection pooling
  maxConnections: 5,
  
  // Request timeout
  timeout: 60000
};
```

### Cost Management

```typescript
// Optimize costs with smart routing
const costOptimizedConfig = {
  // Use Flash for most requests
  defaultModel: 'gemini-1.5-flash',
  
  // Switch to Pro for complex requests
  routingRules: [
    {
      condition: 'tokens > 10000',
      model: 'gemini-1.5-pro'
    },
    {
      condition: 'hasImages && complexity === "high"',
      model: 'gemini-1.5-pro'
    }
  ],
  
  // Budget controls
  budgetLimits: {
    daily: 1000,  // $1000/day
    monthly: 25000  // $25000/month
  }
};
```

### Security Best Practices

```typescript
// Secure configuration
const secureConfig = {
  // Use service account for authentication
  googleAuthOptions: {
    keyFilename: '/secure/path/service-account.json',
    projectId: 'production-project'
  },
  
  // Restrict safety settings
  safetySettings: [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' }
  ],
  
  // Content filtering
  enableContentFilter: true,
  
  // Audit logging
  enableAuditLogs: true,
  
  // Request validation
  validateRequests: true
};
```

## Error Handling

```typescript
try {
  const response = await vertexPortal.generateChat(messages);
  return response;
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Handle quota limits
    console.log('Quota exceeded, switching to fallback');
    return await fallbackPortal.generateChat(messages);
  } else if (error.code === 'SAFETY_FILTER') {
    // Handle safety filtering
    console.log('Content filtered for safety');
    return { text: 'I cannot respond to that request.' };
  } else if (error.code === 'AUTHENTICATION_ERROR') {
    // Handle auth issues
    console.log('Authentication failed, refreshing credentials');
    await refreshCredentials();
    return await vertexPortal.generateChat(messages);
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
    throw error;
  }
}
```

## Monitoring & Metrics

```typescript
// Track portal performance
const metrics = await vertexPortal.getUsage();

console.log('Portal Metrics:', {
  requests: metrics.requestCount,
  tokens: metrics.tokenCount,
  errors: metrics.errorCount,
  averageLatency: metrics.averageLatency,
  costEstimate: metrics.estimatedCost
});

// Set up alerts
vertexPortal.on('quota_warning', (usage) => {
  console.warn('Approaching quota limit:', usage.percentage);
});

vertexPortal.on('error_rate_high', (stats) => {
  console.error('High error rate detected:', stats.errorRate);
});
```

## Migration Guide

### From Google Generative AI

```typescript
// Before (Generative AI)
const oldPortal = createPortal('google-generative', {
  apiKey: 'your-api-key',
  model: 'gemini-1.5-pro'
});

// After (Vertex AI)
const newPortal = createPortal('google-vertex', {
  projectId: 'your-project',
  location: 'us-central1',
  model: 'gemini-1.5-pro'
});

// API remains the same
const response = await newPortal.generateChat(messages);
```

### Authentication Migration

```bash
# Old: API key
export GEMINI_API_KEY=your-api-key

# New: Google Cloud authentication
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT=your-project-id
```

## Troubleshooting

### Common Issues

**Authentication Errors**
```bash
# Check authentication
gcloud auth list
gcloud config get-value project

# Re-authenticate if needed
gcloud auth application-default login
```

**Quota Exceeded**
```typescript
// Check quotas in Google Cloud Console
// Vertex AI > Quotas & System Limits

// Request quota increases if needed
// Or implement intelligent rate limiting
const rateLimitedPortal = wrapPortal(vertexPortal, {
  maxRequestsPerMinute: 60,
  maxTokensPerDay: 1000000
});
```

**Model Not Available**
```typescript
// Check model availability in your region
const availableModels = await vertexPortal.listModels();
console.log('Available models:', availableModels);

// Use alternative model if needed
const fallbackModel = 'gemini-1.5-flash';
```

## Next Steps

- Explore [Google Generative AI Portal](../google-generative/) for developer-friendly setup
- Learn about [Vercel AI SDK Portal](../vercel/) for multi-provider support
- Check [Portal Switching Guide](../portal-switching) for dynamic configuration
- See [MCP Integration](../../integrations/mcp/) for dynamic tools