---
sidebar_position: 9
sidebar_label: "Azure OpenAI"
title: "Azure OpenAI Portal"
description: "Enterprise-grade OpenAI models through Microsoft Azure"
---

# Azure OpenAI Portal

The Azure OpenAI Portal provides enterprise-grade access to OpenAI's models through Microsoft Azure, offering enhanced security, compliance, and integration with Azure services. This portal is ideal for enterprise deployments requiring SOC2, HIPAA, and other compliance standards.

## Overview

- **Provider**: Microsoft Azure OpenAI Service
- **Models**: GPT-4o, GPT-4, GPT-3.5-turbo, DALL-E, Whisper, Text Embedding
- **Best For**: Enterprise deployments, compliance requirements, Azure integration
- **Key Features**: Content filtering, private networking, compliance certifications

## Configuration

### Basic Setup

```typescript
import { createPortal } from '@symindx/core';

const azurePortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: 'https://your-resource.openai.azure.com',
  apiVersion: '2024-06-01',
  deploymentName: 'gpt-4o'
});
```

### Advanced Configuration

```typescript
const azurePortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: 'https://your-resource.openai.azure.com',
  apiVersion: '2024-06-01',
  
  // Model deployments
  deployments: {
    chat: 'gpt-4o-deployment',
    completion: 'gpt-35-turbo-deployment', 
    embedding: 'text-embedding-ada-002-deployment',
    image: 'dall-e-3-deployment',
    whisper: 'whisper-deployment'
  },
  
  // Enterprise features
  enableContentFilter: true,
  contentFilterLevel: 'medium',
  enablePrivateEndpoint: true,
  enableManagedIdentity: true,
  
  // Azure integration
  resourceGroup: 'my-resource-group',
  subscriptionId: 'your-subscription-id',
  region: 'eastus',
  
  // Security settings
  enableAuditLogs: true,
  enableThreatDetection: true,
  dataResidency: 'us',
  
  // Rate limiting
  requestsPerMinute: 60,
  tokensPerMinute: 40000
});
```

## Authentication

### API Key Authentication

1. Create Azure OpenAI resource in Azure Portal
2. Go to Keys and Endpoint section
3. Copy your API key and endpoint
4. Set environment variables:

```bash
export AZURE_OPENAI_API_KEY=your-api-key
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
```

### Managed Identity Authentication

```typescript
// Using Azure Managed Identity (recommended for production)
const azurePortal = createPortal('azure-openai', {
  endpoint: 'https://your-resource.openai.azure.com',
  apiVersion: '2024-06-01',
  deploymentName: 'gpt-4o',
  
  // Use managed identity instead of API key
  authentication: {
    type: 'managed_identity',
    clientId: process.env.AZURE_CLIENT_ID // Optional: specify user-assigned identity
  }
});
```

### Azure Active Directory Authentication

```typescript
// Using Azure AD service principal
const azurePortal = createPortal('azure-openai', {
  endpoint: 'https://your-resource.openai.azure.com',
  apiVersion: '2024-06-01',
  deploymentName: 'gpt-4o',
  
  authentication: {
    type: 'azure_ad',
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
});
```

## Environment Variables

```bash
# Basic authentication
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Azure AD authentication (alternative)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional configuration
AZURE_OPENAI_API_VERSION=2024-06-01
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
```

## Available Models

### GPT-4o Series

Latest and most capable models from OpenAI.

```typescript
const gpt4oModels = {
  'gpt-4o': {
    features: ['text', 'vision', 'function_calling', 'json_mode'],
    contextWindow: 128000,
    outputTokens: 4096,
    training: '2024-04'
  },
  'gpt-4o-mini': {
    features: ['text', 'vision', 'function_calling', 'json_mode'],
    contextWindow: 128000,
    outputTokens: 16384,
    costEffective: true
  }
};
```

### GPT-4 Series

High-quality models for complex reasoning tasks.

```typescript
const gpt4Models = {
  'gpt-4': {
    features: ['text', 'function_calling'],
    contextWindow: 8192,
    outputTokens: 4096,
    training: '2023-09'
  },
  'gpt-4-32k': {
    features: ['text', 'function_calling'],
    contextWindow: 32768,
    outputTokens: 4096,
    training: '2023-09'
  },
  'gpt-4-turbo': {
    features: ['text', 'vision', 'function_calling', 'json_mode'],
    contextWindow: 128000,
    outputTokens: 4096,
    training: '2024-04'
  }
};
```

### GPT-3.5 Series

Fast and cost-effective models for general tasks.

```typescript
const gpt35Models = {
  'gpt-35-turbo': {
    features: ['text', 'function_calling'],
    contextWindow: 16385,
    outputTokens: 4096,
    speed: 'fast'
  },
  'gpt-35-turbo-16k': {
    features: ['text', 'function_calling'],
    contextWindow: 16385,
    outputTokens: 4096,
    training: '2023-09'
  }
};
```

### Specialized Models

```typescript
// Image generation
const dalleModels = {
  'dall-e-3': {
    features: ['image_generation'],
    sizes: ['1024x1024', '1024x1792', '1792x1024'],
    quality: ['standard', 'hd']
  },
  'dall-e-2': {
    features: ['image_generation', 'image_editing'],
    sizes: ['256x256', '512x512', '1024x1024']
  }
};

// Speech and audio
const audioModels = {
  'whisper': {
    features: ['speech_to_text'],
    languages: 50,
    formats: ['mp3', 'mp4', 'wav', 'webm']
  },
  'tts-1': {
    features: ['text_to_speech'],
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    speed: 'fast'
  },
  'tts-1-hd': {
    features: ['text_to_speech'],
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    quality: 'high'
  }
};

// Embeddings
const embeddingModels = {
  'text-embedding-ada-002': {
    features: ['embeddings'],
    dimensions: 1536,
    maxTokens: 8191
  },
  'text-embedding-3-small': {
    features: ['embeddings'],
    dimensions: 1536,
    maxTokens: 8191,
    performance: 'improved'
  },
  'text-embedding-3-large': {
    features: ['embeddings'],
    dimensions: 3072,
    maxTokens: 8191,
    performance: 'best'
  }
};
```

## Features

### Content Filtering

Azure OpenAI includes built-in content filtering for safety and compliance.

```typescript
// Configure content filtering
const filteredPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  contentFilter: {
    enabled: true,
    level: 'medium', // 'low', 'medium', 'high'
    categories: {
      hate: 'medium',
      selfHarm: 'medium', 
      sexual: 'medium',
      violence: 'medium'
    },
    
    // Custom filtering for specific use cases
    customFilters: [
      {
        name: 'financial_advice',
        pattern: /investment|financial advice|trading/i,
        action: 'warn'
      }
    ]
  }
});

// Content filtering in action
try {
  const response = await filteredPortal.generateChat([
    {
      role: 'user',
      content: 'Tell me about investment strategies'
    }
  ]);
} catch (error) {
  if (error.code === 'CONTENT_FILTER') {
    console.log('Content was filtered:', error.categories);
    // Handle filtered content appropriately
  }
}
```

### Private Networking

```typescript
// Configure private endpoints for enhanced security
const privatePortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: 'https://your-private-endpoint.openai.azure.com',
  deploymentName: 'gpt-4o',
  
  networking: {
    enablePrivateEndpoint: true,
    virtualNetworkId: '/subscriptions/.../virtualNetworks/myVNet',
    subnetId: '/subscriptions/.../subnets/mySubnet',
    
    // Network security
    allowedIpRanges: ['10.0.0.0/8', '192.168.0.0/16'],
    enableFirewall: true,
    
    // DNS configuration
    privateDnsZoneId: '/subscriptions/.../privateDnsZones/privatelink.openai.azure.com'
  }
});
```

### Enterprise Monitoring

```typescript
// Comprehensive monitoring and logging
const monitoredPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  monitoring: {
    enableAuditLogs: true,
    enableMetrics: true,
    enableDiagnostics: true,
    
    // Azure Monitor integration
    logAnalyticsWorkspaceId: 'your-workspace-id',
    applicationInsightsKey: 'your-app-insights-key',
    
    // Custom metrics
    customMetrics: [
      'request_count',
      'token_usage',
      'response_time',
      'error_rate'
    ],
    
    // Alerting
    alerts: [
      {
        name: 'high_error_rate',
        condition: 'error_rate > 5%',
        action: 'send_notification'
      }
    ]
  }
});

// Monitor usage
monitoredPortal.on('request', (metrics) => {
  console.log('Request metrics:', {
    model: metrics.model,
    tokens: metrics.tokenUsage,
    duration: metrics.duration,
    cost: metrics.estimatedCost
  });
});
```

## Enterprise Features

### Data Residency and Compliance

```typescript
// GDPR and data residency compliance
const compliantPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  compliance: {
    dataResidency: 'eu', // 'us', 'eu', 'asia'
    enableGDPRMode: true,
    enableHIPAAMode: true,
    enableSOC2Compliance: true,
    
    // Data retention policies
    dataRetention: {
      logRetentionDays: 30,
      auditRetentionDays: 90,
      enableDataPurging: true
    },
    
    // Encryption
    encryption: {
      enableAtRest: true,
      enableInTransit: true,
      customerManagedKeys: true,
      keyVaultUrl: 'https://your-keyvault.vault.azure.net/'
    }
  }
});
```

### Multi-Region Deployment

```typescript
// Deploy across multiple Azure regions for high availability
const multiRegionPortal = createPortal('azure-openai', {
  regions: [
    {
      name: 'primary',
      endpoint: 'https://eastus-openai.openai.azure.com',
      apiKey: process.env.AZURE_OPENAI_API_KEY_EASTUS,
      priority: 1
    },
    {
      name: 'secondary',
      endpoint: 'https://westus-openai.openai.azure.com', 
      apiKey: process.env.AZURE_OPENAI_API_KEY_WESTUS,
      priority: 2
    },
    {
      name: 'europe',
      endpoint: 'https://westeurope-openai.openai.azure.com',
      apiKey: process.env.AZURE_OPENAI_API_KEY_WESTEUROPE,
      priority: 3
    }
  ],
  
  // Failover configuration
  failover: {
    enabled: true,
    healthCheckInterval: 30000,
    maxRetries: 3,
    timeoutMs: 10000
  },
  
  // Load balancing
  loadBalancing: {
    strategy: 'round_robin', // 'random', 'weighted', 'geography'
    healthCheck: true
  }
});
```

### Role-Based Access Control

```typescript
// RBAC integration with Azure AD
const rbacPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  roleBasedAccess: {
    enabled: true,
    
    // Role definitions
    roles: {
      'ai-developer': {
        permissions: ['chat', 'completion', 'embedding'],
        models: ['gpt-4o', 'gpt-35-turbo'],
        rateLimits: {
          requestsPerMinute: 100,
          tokensPerDay: 1000000
        }
      },
      'ai-admin': {
        permissions: ['*'],
        models: ['*'],
        rateLimits: {
          requestsPerMinute: 200,
          tokensPerDay: 5000000
        }
      },
      'ai-viewer': {
        permissions: ['chat'],
        models: ['gpt-35-turbo'],
        rateLimits: {
          requestsPerMinute: 20,
          tokensPerDay: 100000
        }
      }
    },
    
    // Azure AD integration
    azureAD: {
      tenantId: process.env.AZURE_TENANT_ID,
      groupMappings: {
        'ai-developers-group': 'ai-developer',
        'ai-admins-group': 'ai-admin',
        'ai-viewers-group': 'ai-viewer'
      }
    }
  }
});
```

## Advanced Use Cases

### Enterprise Chat Application

```typescript
class EnterpriseChatBot {
  constructor(azurePortal) {
    this.portal = azurePortal;
    this.sessionManager = new SessionManager();
  }
  
  async handleUserMessage(userId, message, context = {}) {
    // Check user permissions
    const userRole = await this.getUserRole(userId);
    if (!this.hasPermission(userRole, 'chat')) {
      throw new Error('Insufficient permissions for chat access');
    }
    
    // Get conversation history
    const history = await this.sessionManager.getHistory(userId);
    
    // Prepare messages with enterprise context
    const messages = [
      {
        role: 'system',
        content: `You are an enterprise assistant. Follow company policies and maintain professional communication. User role: ${userRole}`
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];
    
    try {
      const response = await this.portal.generateChat(messages, {
        model: this.getModelForRole(userRole),
        maxTokens: this.getTokenLimitForRole(userRole),
        temperature: 0.7,
        
        // Enterprise features
        enableContentFilter: true,
        enableAuditLog: true,
        userId: userId,
        sessionId: context.sessionId
      });
      
      // Store conversation
      await this.sessionManager.addMessage(userId, message, response.text);
      
      return response;
    } catch (error) {
      // Log enterprise errors
      await this.logEnterpriseError(userId, error);
      throw error;
    }
  }
  
  getModelForRole(role) {
    const modelMap = {
      'ai-admin': 'gpt-4o',
      'ai-developer': 'gpt-4o',
      'ai-viewer': 'gpt-35-turbo'
    };
    return modelMap[role] || 'gpt-35-turbo';
  }
}
```

### Document Processing Pipeline

```typescript
class EnterpriseDocumentProcessor {
  constructor(azurePortal) {
    this.portal = azurePortal;
    this.storageAccount = new AzureStorageAccount();
  }
  
  async processDocument(documentUrl, processingType) {
    // Download document from Azure Storage
    const document = await this.storageAccount.downloadBlob(documentUrl);
    
    const tools = [
      {
        type: 'function',
        function: {
          name: 'extract_entities',
          description: 'Extract named entities from text',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              entity_types: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'classify_document',
          description: 'Classify document by type and sensitivity',
          parameters: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              classification_levels: { type: 'array' }
            }
          }
        }
      }
    ];
    
    const response = await this.portal.generateChat([
      {
        role: 'system',
        content: `Process this ${processingType} document. Extract key information, classify sensitivity, and identify any compliance requirements.`
      },
      {
        role: 'user',
        content: `Document content:\n\n${document.content}`
      }
    ], {
      tools,
      model: 'gpt-4o',
      maxTokens: 4096,
      
      // Compliance settings
      enableContentFilter: true,
      dataClassification: 'internal',
      enableAuditLog: true
    });
    
    // Store processed results
    await this.storageAccount.uploadBlob(
      `processed/${document.id}.json`,
      JSON.stringify(response)
    );
    
    return response;
  }
}
```

## Performance Optimization

### Request Optimization

```typescript
// Optimize requests for enterprise scale
const optimizedPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  // Connection pooling
  connectionPool: {
    maxConnections: 20,
    keepAlive: true,
    timeout: 30000
  },
  
  // Request batching
  batching: {
    enabled: true,
    maxBatchSize: 10,
    batchTimeout: 100
  },
  
  // Caching
  cache: {
    enabled: true,
    provider: 'redis',
    connectionString: process.env.REDIS_CONNECTION_STRING,
    ttl: 3600000, // 1 hour
    keyPrefix: 'azure-openai:'
  },
  
  // Rate limiting
  rateLimiting: {
    requestsPerMinute: 60,
    tokensPerMinute: 40000,
    enableQueueing: true,
    queueSize: 100
  }
});
```

### Cost Management

```typescript
// Enterprise cost management
const costManagedPortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  costManagement: {
    enabled: true,
    
    // Budget controls
    budgets: {
      daily: 1000,   // $1000/day
      monthly: 25000, // $25000/month
      quarterly: 70000 // $70000/quarter
    },
    
    // Cost optimization
    optimization: {
      enabled: true,
      
      // Model selection based on cost
      modelSelection: {
        simple: 'gpt-35-turbo',
        moderate: 'gpt-4o-mini',
        complex: 'gpt-4o'
      },
      
      // Auto-scaling based on usage
      autoScaling: {
        enabled: true,
        scaleUpThreshold: 80,  // % of quota
        scaleDownThreshold: 20
      }
    },
    
    // Cost alerts
    alerts: [
      {
        name: 'daily_budget_80_percent',
        threshold: 0.8,
        action: 'email_notification'
      },
      {
        name: 'daily_budget_100_percent',
        threshold: 1.0,
        action: 'suspend_non_critical'
      }
    ]
  }
});
```

## Security Best Practices

### Secure Configuration

```typescript
// Production-ready secure configuration
const securePortal = createPortal('azure-openai', {
  // Use managed identity instead of API keys
  authentication: {
    type: 'managed_identity'
  },
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  
  security: {
    // Network security
    networking: {
      enablePrivateEndpoint: true,
      allowedIpRanges: process.env.ALLOWED_IP_RANGES?.split(','),
      enableTLS: true,
      tlsVersion: '1.3'
    },
    
    // Data encryption
    encryption: {
      enableAtRest: true,
      enableInTransit: true,
      customerManagedKeys: true,
      keyRotationDays: 90
    },
    
    // Access controls
    accessControl: {
      enableRBAC: true,
      requireMFA: true,
      sessionTimeout: 3600, // 1 hour
      enableJustInTimeAccess: true
    },
    
    // Monitoring
    monitoring: {
      enableThreatDetection: true,
      enableAnomalyDetection: true,
      enableSecurityAlerts: true
    }
  }
});
```

## Migration Guide

### From OpenAI API

```typescript
// Before: Direct OpenAI API
const openaiPortal = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});

// After: Azure OpenAI
const azurePortal = createPortal('azure-openai', {
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  deploymentName: 'gpt-4o',
  apiVersion: '2024-06-01'
});

// API calls remain the same
const response = await azurePortal.generateChat(messages);
```

### Key Migration Considerations

1. **Model Deployments**: Create deployments in Azure Portal
2. **API Versions**: Use appropriate API version for features
3. **Rate Limits**: Different limits than OpenAI API
4. **Content Filtering**: Azure has built-in content filtering
5. **Pricing**: Different pricing model and regions

## Next Steps

- Explore [Portal Switching Guide](../portal-switching) for dynamic configuration
- Learn about [Enterprise Security](../../security/) for advanced security features
- Check [Compliance Guide](../../security/compliance/) for regulatory requirements
- See [Cost Optimization Guide](../../performance/optimization/) for cost management