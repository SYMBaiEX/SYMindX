---
sidebar_position: 7
sidebar_label: "Mistral AI"
title: "Mistral AI Portal"
description: "European AI with multilingual capabilities and GDPR compliance"
---

# Mistral AI Portal

The Mistral AI Portal provides access to Mistral's advanced language models with a focus on European values, multilingual capabilities, and strong GDPR compliance. Mistral offers high-performance models with excellent reasoning abilities and native support for multiple languages.

## Overview

- **Provider**: Mistral AI (European-based)
- **Models**: Mistral Large, Mistral Medium, Mistral Small
- **Best For**: Multilingual applications, European deployments, GDPR compliance
- **Key Features**: Function calling, streaming, multilingual support

## Configuration

### Basic Setup

```typescript
import { createPortal } from '@symindx/core';

const mistralPortal = createPortal('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-large-latest'
});
```

### Advanced Configuration

```typescript
const mistralPortal = createPortal('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-large-latest',
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1.0,
  safeMode: true,
  randomSeed: 42,
  
  // Function calling tools
  tools: [{
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'Analyze code for issues and improvements',
      parameters: {
        type: 'object',
        properties: {
          code: { 
            type: 'string',
            description: 'The code to analyze'
          },
          language: {
            type: 'string',
            enum: ['javascript', 'typescript', 'python', 'java'],
            description: 'Programming language'
          }
        },
        required: ['code', 'language']
      }
    }
  }]
});
```

## Authentication

### API Key Setup

1. Visit [Mistral AI Console](https://console.mistral.ai/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Set your environment variable:

```bash
export MISTRAL_API_KEY=your-mistral-api-key
```

### Environment Variables

```bash
# Required
MISTRAL_API_KEY=your-mistral-api-key

# Optional
MISTRAL_MODEL=mistral-large-latest
MISTRAL_MAX_TOKENS=4096
MISTRAL_TEMPERATURE=0.7
```

## Available Models

### Mistral Large (Latest)

The flagship model with state-of-the-art performance.

```typescript
const largeModel = {
  model: 'mistral-large-latest',
  features: ['text', 'function_calling', 'multilingual'],
  contextWindow: 128000,
  languages: ['English', 'French', 'Spanish', 'German', 'Italian', 'Portuguese', 'Dutch'],
  strengths: ['reasoning', 'code_generation', 'analysis']
};
```

### Mistral Medium

Balanced performance and cost model.

```typescript
const mediumModel = {
  model: 'mistral-medium-latest',
  features: ['text', 'function_calling'],
  contextWindow: 32000,
  costEffective: true,
  strengths: ['general_purpose', 'conversation']
};
```

### Mistral Small

Fast and cost-effective model for simple tasks.

```typescript
const smallModel = {
  model: 'mistral-small-latest',
  features: ['text', 'basic_function_calling'],
  contextWindow: 32000,
  speed: 'very_fast',
  cost: 'lowest'
};
```

### Specialized Models

```typescript
// Code-specific model
const codeModel = {
  model: 'codestral-latest',
  features: ['code_generation', 'code_completion'],
  contextWindow: 32000,
  specialized: 'coding'
};

// Embedding model
const embeddingModel = {
  model: 'mistral-embed',
  features: ['embeddings'],
  dimensions: 1024,
  multilingual: true
};
```

## Features

### Text Generation

```typescript
// Basic text generation
const response = await mistralPortal.generateText(
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
    content: 'What are the main benefits of renewable energy?'
  },
  {
    role: 'assistant',
    content: 'Renewable energy offers several key benefits...'
  },
  {
    role: 'user',
    content: 'How does solar energy work?'
  }
];

const response = await mistralPortal.generateChat(conversation);
```

### Function Calling

```typescript
// Define tools for function calling
const tools = [{
  type: 'function',
  function: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City and country, e.g. Paris, France'
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
}];

const response = await mistralPortal.generateChat([
  {
    role: 'user',
    content: 'What\'s the weather like in Paris?'
  }
], { tools });

// Handle function calls
if (response.message.functionCall) {
  const { name, arguments: args } = response.message.functionCall;
  
  if (name === 'get_weather') {
    const weatherData = await getWeatherData(args.location, args.unit);
    
    // Continue conversation with function result
    const followUp = await mistralPortal.generateChat([
      ...conversation,
      response.message,
      {
        role: 'tool',
        name: 'get_weather',
        content: JSON.stringify(weatherData)
      }
    ]);
  }
}
```

### Streaming Responses

```typescript
// Stream text generation
const textStream = mistralPortal.streamText(
  'Write a comprehensive guide to machine learning'
);

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}

// Stream chat responses
const chatStream = mistralPortal.streamChat(messages);

for await (const chunk of chatStream) {
  console.log('Chunk:', chunk);
  // Update UI with partial response
}
```

## Multilingual Capabilities

### Language Support

Mistral models have native support for multiple European languages:

```typescript
// French conversation
const frenchResponse = await mistralPortal.generateChat([
  {
    role: 'user',
    content: 'Expliquez-moi l\'intelligence artificielle en termes simples'
  }
]);

// Spanish conversation
const spanishResponse = await mistralPortal.generateChat([
  {
    role: 'user',
    content: '¿Cuáles son los beneficios de la energía renovable?'
  }
]);

// German conversation
const germanResponse = await mistralPortal.generateChat([
  {
    role: 'user',
    content: 'Erklären Sie mir Quantencomputing auf einfache Weise'
  }
]);
```

### Language Detection

```typescript
// Automatic language detection and response
const multilingualChat = async (userMessage) => {
  const response = await mistralPortal.generateChat([
    {
      role: 'system',
      content: 'Respond in the same language as the user\'s question'
    },
    {
      role: 'user',
      content: userMessage
    }
  ]);
  
  return response;
};

// Works with any supported language
const response1 = await multilingualChat('Ciao, come stai?'); // Italian
const response2 = await multilingualChat('Hola, ¿cómo estás?'); // Spanish
const response3 = await multilingualChat('Bonjour, comment allez-vous?'); // French
```

## GDPR Compliance

### Data Protection Features

```typescript
// GDPR-compliant configuration
const gdprCompliantPortal = createPortal('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-large-latest',
  
  // Data protection settings
  dataResidency: 'eu',
  enableLogging: false, // Disable logging for sensitive data
  enableDataRetention: false,
  
  // Privacy settings
  anonymizeRequests: true,
  enableRightToBeForgotten: true,
  
  // Security settings
  enableEncryption: true,
  securityLevel: 'high'
});
```

### Privacy Controls

```typescript
// Handle user data requests
const handleGDPRRequest = async (userId, requestType) => {
  switch (requestType) {
    case 'access':
      // Provide user data access
      return await mistralPortal.getUserData(userId);
      
    case 'deletion':
      // Delete user data
      await mistralPortal.deleteUserData(userId);
      return { status: 'deleted' };
      
    case 'portability':
      // Export user data
      return await mistralPortal.exportUserData(userId);
      
    default:
      throw new Error('Invalid GDPR request type');
  }
};
```

## Code Generation & Analysis

### Code Generation

```typescript
// Generate code with specific requirements
const codeGeneration = await mistralPortal.generateChat([
  {
    role: 'user',
    content: `
      Create a TypeScript function that:
      1. Validates email addresses
      2. Supports multiple email formats
      3. Returns detailed validation results
      4. Includes comprehensive error handling
    `
  }
], {
  model: 'codestral-latest',
  maxTokens: 2048
});

console.log('Generated code:', codeGeneration.text);
```

### Code Analysis

```typescript
// Analyze code for issues and improvements
const codeAnalysis = await mistralPortal.generateChat([
  {
    role: 'user',
    content: `
      Analyze this JavaScript code for:
      - Security vulnerabilities
      - Performance issues
      - Best practice violations
      - Potential bugs
      
      \`\`\`javascript
      function processUserData(userData) {
        var result = eval(userData.expression);
        document.getElementById('output').innerHTML = result;
        return result;
      }
      \`\`\`
    `
  }
], {
  tools: [{
    type: 'function',
    function: {
      name: 'analyze_code_security',
      description: 'Perform security analysis on code',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          language: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
        }
      }
    }
  }]
});
```

## Performance Optimization

### Model Selection Strategy

```typescript
// Choose optimal model based on task complexity
const selectModel = (task) => {
  const taskComplexity = analyzeTaskComplexity(task);
  
  switch (taskComplexity) {
    case 'simple':
      return 'mistral-small-latest'; // Fast and cost-effective
      
    case 'moderate':
      return 'mistral-medium-latest'; // Balanced performance
      
    case 'complex':
      return 'mistral-large-latest'; // Best quality
      
    case 'code':
      return 'codestral-latest'; // Code specialization
      
    default:
      return 'mistral-large-latest';
  }
};

// Use appropriate model
const model = selectModel(userRequest);
const response = await mistralPortal.generateChat(messages, { model });
```

### Caching & Rate Limiting

```typescript
// Implement caching for repeated queries
const cachedPortal = withCache(mistralPortal, {
  ttl: 3600000, // 1 hour
  maxSize: 1000,
  keyStrategy: 'content_hash'
});

// Rate limiting
const rateLimitedPortal = withRateLimit(mistralPortal, {
  requestsPerMinute: 100,
  requestsPerHour: 1000
});

// Combined optimizations
const optimizedPortal = withCache(
  withRateLimit(mistralPortal, { requestsPerMinute: 100 }),
  { ttl: 1800000 } // 30 minutes
);
```

## Error Handling

```typescript
try {
  const response = await mistralPortal.generateChat(messages);
  return response;
} catch (error) {
  switch (error.code) {
    case 'INVALID_API_KEY':
      console.error('Invalid Mistral API key');
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Rate limit exceeded, waiting...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      break;
      
    case 'MODEL_OVERLOADED':
      console.error('Model overloaded, trying fallback...');
      return await fallbackPortal.generateChat(messages);
      
    case 'CONTENT_FILTER':
      console.error('Content filtered by safety settings');
      return { text: 'I cannot respond to that request.' };
      
    case 'TOKEN_LIMIT_EXCEEDED':
      console.error('Token limit exceeded, reducing context...');
      const shorterMessages = messages.slice(-5); // Keep last 5 messages
      return await mistralPortal.generateChat(shorterMessages);
      
    default:
      console.error('Mistral API error:', error.message);
      throw error;
  }
}
```

## Integration Examples

### European E-commerce Assistant

```typescript
class EuropeEcommerceAssistant {
  constructor(mistralPortal) {
    this.portal = mistralPortal;
  }
  
  async handleCustomerQuery(query, customerLanguage) {
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful e-commerce assistant. 
      Respond in ${customerLanguage}. 
      Follow GDPR guidelines and European consumer protection laws.
      Be helpful, accurate, and respect customer privacy.`
    };
    
    return await this.portal.generateChat([
      systemPrompt,
      {
        role: 'user',
        content: query
      }
    ], {
      model: 'mistral-large-latest',
      temperature: 0.7
    });
  }
  
  async generateProductDescription(product, targetLanguage) {
    return await this.portal.generateChat([
      {
        role: 'user',
        content: `Create a compelling product description in ${targetLanguage} for:
        ${JSON.stringify(product, null, 2)}
        
        Include key features, benefits, and comply with EU advertising regulations.`
      }
    ]);
  }
}
```

### Legal Document Analysis

```typescript
class LegalDocumentAnalyzer {
  constructor(mistralPortal) {
    this.portal = mistralPortal;
  }
  
  async analyzeContract(contractText, jurisdiction = 'EU') {
    return await this.portal.generateChat([
      {
        role: 'system',
        content: `You are a legal analysis assistant. 
        Analyze documents according to ${jurisdiction} law.
        Highlight key terms, risks, and compliance requirements.
        Do not provide legal advice - only analysis.`
      },
      {
        role: 'user',
        content: `Analyze this contract for:
        - Key obligations and rights
        - Potential risks
        - GDPR compliance issues
        - Unusual or concerning clauses
        
        Contract:
        ${contractText}`
      }
    ], {
      model: 'mistral-large-latest',
      maxTokens: 4096
    });
  }
}
```

## Best Practices

### Performance

1. **Model Selection**: Use appropriate model size for task complexity
2. **Context Management**: Keep context within reasonable limits
3. **Caching**: Cache responses for repeated queries
4. **Streaming**: Use streaming for long responses

### Security

1. **API Key Protection**: Never expose API keys in client-side code
2. **Input Validation**: Validate all user inputs before processing
3. **Output Filtering**: Filter sensitive information from responses
4. **Rate Limiting**: Implement proper rate limiting

### GDPR Compliance

1. **Data Minimization**: Only process necessary data
2. **Consent Management**: Ensure proper user consent
3. **Right to Deletion**: Implement data deletion capabilities
4. **Data Portability**: Allow users to export their data

### Multilingual Applications

1. **Language Detection**: Automatically detect user language
2. **Consistent Responses**: Maintain consistency across languages
3. **Cultural Sensitivity**: Consider cultural differences in responses
4. **Localization**: Adapt content for local markets

## Migration Guide

### From OpenAI

```typescript
// Before (OpenAI)
const openaiPortal = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// After (Mistral)
const mistralPortal = createPortal('mistral', {
  apiKey: process.env.MISTRAL_API_KEY,
  model: 'mistral-large-latest'
});

// API calls remain similar
const response = await mistralPortal.generateChat(messages);
```

### Key Differences

- **Function Calling**: Slightly different format but same capabilities
- **Multilingual**: Better native support for European languages
- **GDPR**: Built-in compliance features
- **Pricing**: Different cost structure, often more cost-effective

## Next Steps

- Explore [Portal Switching Guide](../portal-switching) for dynamic configuration
- Learn about [Vercel AI SDK Portal](../vercel/) for multi-provider support
- Check [Function Calling Guide](../../core-concepts/function-calling) for tool integration
- See [GDPR Compliance Guide](../../security/compliance/) for data protection