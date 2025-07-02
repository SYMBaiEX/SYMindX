---
sidebar_position: 8
sidebar_label: "Cohere AI"
title: "Cohere AI Portal"
description: "Enterprise text processing with RAG capabilities"
---

# Cohere AI Portal

The Cohere AI Portal provides access to Cohere's enterprise-focused language models with advanced RAG (Retrieval-Augmented Generation) capabilities, web search integration, and citation-quality responses. Cohere specializes in business applications with reliable, accurate, and well-sourced AI responses.

## Overview

- **Provider**: Cohere AI
- **Models**: Command R+, Command R, Command Light
- **Best For**: Enterprise applications, RAG systems, web search integration
- **Key Features**: Citations, web connectors, grounded generation, multilingual

## Configuration

### Basic Setup

```typescript
import { createPortal } from '@symindx/core';

const coherePortal = createPortal('cohere', {
  apiKey: process.env.COHERE_API_KEY,
  model: 'command-r-plus'
});
```

### Advanced Configuration

```typescript
const coherePortal = createPortal('cohere', {
  apiKey: process.env.COHERE_API_KEY,
  model: 'command-r-plus',
  maxTokens: 4096,
  temperature: 0.7,
  k: 0,
  p: 0.9,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  
  // RAG and search configuration
  connectors: [{
    id: 'web-search',
    continueOnFailure: true,
    options: {
      site: 'example.com' // Optional: restrict to specific sites
    }
  }],
  
  // Citation settings
  citationQuality: 'accurate',
  
  // Documents for RAG
  documents: [
    {
      title: 'Company Handbook',
      snippet: 'Our company policies and procedures...',
      url: 'https://company.com/handbook'
    }
  ],
  
  // Tools for function calling
  tools: [{
    name: 'search_knowledge_base',
    description: 'Search internal knowledge base',
    parameterDefinitions: {
      query: {
        description: 'Search query',
        type: 'str',
        required: true
      },
      category: {
        description: 'Knowledge category',
        type: 'str',
        required: false
      }
    }
  }]
});
```

## Authentication

### API Key Setup

1. Visit [Cohere Dashboard](https://dashboard.cohere.ai/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Set your environment variable:

```bash
export COHERE_API_KEY=your-cohere-api-key
```

### Environment Variables

```bash
# Required
COHERE_API_KEY=your-cohere-api-key

# Optional
COHERE_MODEL=command-r-plus
COHERE_MAX_TOKENS=4096
COHERE_TEMPERATURE=0.7
```

## Available Models

### Command R+ (Flagship)

The most powerful model for complex reasoning and RAG applications.

```typescript
const commandRPlus = {
  model: 'command-r-plus',
  features: ['text', 'rag', 'citations', 'web_search', 'multilingual'],
  contextWindow: 128000,
  languages: 10,
  strengths: ['reasoning', 'analysis', 'citations', 'enterprise_use']
};
```

### Command R

Balanced model for general-purpose applications.

```typescript
const commandR = {
  model: 'command-r',
  features: ['text', 'rag', 'citations', 'web_search'],
  contextWindow: 128000,
  costEffective: true,
  strengths: ['conversation', 'rag', 'speed']
};
```

### Command Light

Fast and efficient model for simple tasks.

```typescript
const commandLight = {
  model: 'command-light',
  features: ['text', 'basic_rag'],
  contextWindow: 4096,
  speed: 'very_fast',
  cost: 'lowest'
};
```

### Specialized Models

```typescript
// Embedding models
const embedModels = {
  'embed-english-v3.0': {
    features: ['embeddings'],
    dimensions: 1024,
    language: 'english'
  },
  'embed-multilingual-v3.0': {
    features: ['embeddings'],
    dimensions: 1024,
    languages: 'multilingual'
  }
};

// Rerank model
const rerankModel = {
  'rerank-english-v3.0': {
    features: ['reranking'],
    useCase: 'search_relevance'
  }
};
```

## Features

### RAG (Retrieval-Augmented Generation)

```typescript
// Basic RAG with documents
const ragResponse = await coherePortal.generateChat([
  {
    role: 'user',
    content: 'What is our company policy on remote work?'
  }
], {
  documents: [
    {
      title: 'HR Policy Manual',
      snippet: 'Remote work is allowed for all full-time employees...',
      url: 'https://company.com/hr-manual'
    },
    {
      title: 'Remote Work Guidelines', 
      snippet: 'Employees working remotely must...',
      url: 'https://company.com/remote-guidelines'
    }
  ],
  citationQuality: 'accurate'
});

// Response includes citations
console.log('Answer:', ragResponse.text);
console.log('Citations:', ragResponse.citations);
```

### Web Search Integration

```typescript
// Web search with connectors
const searchResponse = await coherePortal.generateChat([
  {
    role: 'user',
    content: 'What are the latest developments in quantum computing?'
  }
], {
  connectors: [{
    id: 'web-search',
    continueOnFailure: true
  }]
});

// Response includes web sources and citations
console.log('Answer with web sources:', searchResponse.text);
console.log('Web citations:', searchResponse.citations);
```

### Advanced RAG with Multiple Sources

```typescript
// Combine documents, web search, and knowledge base
const comprehensiveRAG = await coherePortal.generateChat([
  {
    role: 'user',
    content: 'Create a competitive analysis for our new product launch'
  }
], {
  // Internal documents
  documents: [
    {
      title: 'Product Specifications',
      snippet: 'Our new product features...',
      url: 'https://internal.company.com/product-specs'
    },
    {
      title: 'Market Research',
      snippet: 'Target market analysis shows...',
      url: 'https://internal.company.com/market-research'
    }
  ],
  
  // Web search for competitive intelligence
  connectors: [{
    id: 'web-search',
    continueOnFailure: true,
    options: {
      site: 'techcrunch.com OR crunchbase.com' // Focus on tech news
    }
  }],
  
  // Function calling for additional data
  tools: [{
    name: 'get_competitor_data',
    description: 'Retrieve competitor information from CRM',
    parameterDefinitions: {
      competitor_name: {
        description: 'Name of competitor to analyze',
        type: 'str',
        required: true
      }
    }
  }]
});
```

### Citation and Source Management

```typescript
// High-quality citations
const citedResponse = await coherePortal.generateChat(messages, {
  citationQuality: 'accurate',
  documents: documents,
  connectors: [{ id: 'web-search' }]
});

// Process citations
citedResponse.citations.forEach((citation, index) => {
  console.log(`Citation ${index + 1}:`);
  console.log(`  Text: ${citation.text}`);
  console.log(`  Source: ${citation.document_ids.join(', ')}`);
  console.log(`  Start: ${citation.start}, End: ${citation.end}`);
});

// Get source documents
citedResponse.documents.forEach((doc, index) => {
  console.log(`Document ${doc.id}:`);
  console.log(`  Title: ${doc.title}`);
  console.log(`  URL: ${doc.url}`);
  console.log(`  Snippet: ${doc.snippet}`);
});
```

## Function Calling

### Tool Definition

```typescript
// Define comprehensive tools
const tools = [
  {
    name: 'search_database',
    description: 'Search company database for specific information',
    parameterDefinitions: {
      query: {
        description: 'Search query string',
        type: 'str',
        required: true
      },
      table: {
        description: 'Database table to search',
        type: 'str',
        required: false
      },
      limit: {
        description: 'Maximum number of results',
        type: 'int',
        required: false
      }
    }
  },
  {
    name: 'send_email',
    description: 'Send an email to specified recipients',
    parameterDefinitions: {
      to: {
        description: 'Email recipients',
        type: 'list',
        required: true
      },
      subject: {
        description: 'Email subject line',
        type: 'str', 
        required: true
      },
      body: {
        description: 'Email body content',
        type: 'str',
        required: true
      }
    }
  }
];

// Use tools in conversation
const response = await coherePortal.generateChat([
  {
    role: 'user',
    content: 'Find all customers who purchased product X last month and send them a follow-up email'
  }
], { tools });
```

### Tool Execution

```typescript
// Handle tool calls
if (response.toolCalls) {
  for (const toolCall of response.toolCalls) {
    const { name, parameters } = toolCall;
    
    let toolResult;
    switch (name) {
      case 'search_database':
        toolResult = await searchDatabase(
          parameters.query,
          parameters.table,
          parameters.limit
        );
        break;
        
      case 'send_email':
        toolResult = await sendEmail(
          parameters.to,
          parameters.subject,
          parameters.body
        );
        break;
    }
    
    // Continue conversation with tool results
    const followUp = await coherePortal.generateChat([
      ...messages,
      response.message,
      {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      }
    ]);
  }
}
```

## Streaming Responses

```typescript
// Stream chat with citations
const stream = coherePortal.streamChat([
  {
    role: 'user',
    content: 'Explain the impact of AI on healthcare with recent research'
  }
], {
  connectors: [{ id: 'web-search' }],
  citationQuality: 'accurate'
});

let fullResponse = '';
const citations = [];

for await (const chunk of stream) {
  if (chunk.eventType === 'text-generation') {
    fullResponse += chunk.text;
    process.stdout.write(chunk.text);
  } else if (chunk.eventType === 'citation-generation') {
    citations.push(chunk.citations);
  } else if (chunk.eventType === 'stream-end') {
    console.log('\n\nCitations:', chunk.citations);
    console.log('Documents:', chunk.documents);
  }
}
```

## Enterprise Integration

### Knowledge Base RAG

```typescript
class EnterpriseKnowledgeBase {
  constructor(coherePortal) {
    this.portal = coherePortal;
    this.knowledgeBase = new Map();
  }
  
  async addDocument(id, title, content, metadata = {}) {
    this.knowledgeBase.set(id, {
      title,
      snippet: content.substring(0, 500),
      url: metadata.url || `internal://docs/${id}`,
      metadata
    });
  }
  
  async query(question, context = 'general') {
    // Get relevant documents
    const documents = Array.from(this.knowledgeBase.values())
      .filter(doc => doc.metadata.context === context || context === 'general');
    
    return await this.portal.generateChat([
      {
        role: 'user',
        content: question
      }
    ], {
      documents,
      citationQuality: 'accurate',
      model: 'command-r-plus'
    });
  }
  
  async searchWithWebFallback(question, allowWebSearch = true) {
    const connectors = allowWebSearch ? [{ id: 'web-search' }] : [];
    
    return await this.portal.generateChat([
      {
        role: 'user',
        content: question
      }
    ], {
      documents: Array.from(this.knowledgeBase.values()),
      connectors,
      citationQuality: 'accurate'
    });
  }
}
```

### Customer Support System

```typescript
class CustomerSupportRAG {
  constructor(coherePortal) {
    this.portal = coherePortal;
  }
  
  async handleCustomerQuery(query, customerContext = {}) {
    const tools = [
      {
        name: 'search_tickets',
        description: 'Search previous support tickets',
        parameterDefinitions: {
          customer_id: { type: 'str', required: false },
          keywords: { type: 'str', required: true }
        }
      },
      {
        name: 'escalate_to_human',
        description: 'Escalate complex issues to human support',
        parameterDefinitions: {
          reason: { type: 'str', required: true },
          priority: { type: 'str', required: false }
        }
      }
    ];
    
    const documents = [
      {
        title: 'Support Documentation',
        snippet: 'Common issues and solutions...',
        url: 'https://support.company.com/docs'
      },
      {
        title: 'Product Manual',
        snippet: 'Product features and troubleshooting...',
        url: 'https://company.com/manual'
      }
    ];
    
    return await this.portal.generateChat([
      {
        role: 'system',
        content: `You are a helpful customer support assistant. 
        Use the provided documentation to answer questions accurately.
        If you cannot find the answer, use the escalation tool.
        Always provide citations for your responses.`
      },
      {
        role: 'user',
        content: query
      }
    ], {
      documents,
      tools,
      citationQuality: 'accurate',
      connectors: [{ id: 'web-search', continueOnFailure: true }]
    });
  }
}
```

## Embeddings and Reranking

### Generate Embeddings

```typescript
// Generate embeddings for semantic search
const embeddings = await coherePortal.generateEmbedding([
  'Machine learning fundamentals',
  'Deep learning neural networks',
  'Natural language processing'
], {
  model: 'embed-english-v3.0',
  inputType: 'search_document'
});

console.log('Embeddings:', embeddings);
```

### Rerank Search Results

```typescript
// Rerank search results for better relevance
const query = 'How to implement machine learning models?';
const searchResults = [
  'Introduction to machine learning algorithms',
  'Setting up development environment',
  'Model training and validation techniques',
  'Deploying ML models to production'
];

const reranked = await coherePortal.rerank({
  query,
  documents: searchResults,
  model: 'rerank-english-v3.0',
  topN: 3
});

console.log('Reranked results:', reranked.results);
```

## Error Handling

```typescript
try {
  const response = await coherePortal.generateChat(messages);
  return response;
} catch (error) {
  switch (error.code) {
    case 'INVALID_API_KEY':
      console.error('Invalid Cohere API key');
      break;
      
    case 'RATE_LIMIT_EXCEEDED':
      console.error('Rate limit exceeded');
      // Implement exponential backoff
      await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
      break;
      
    case 'CONTENT_FILTER':
      console.error('Content filtered by safety mechanisms');
      return { text: 'I cannot respond to that request.' };
      
    case 'CONNECTOR_ERROR':
      console.error('Web search connector failed:', error.details);
      // Retry without connectors
      return await coherePortal.generateChat(messages, { connectors: [] });
      
    case 'DOCUMENT_TOO_LARGE':
      console.error('Documents exceed size limit');
      // Reduce document set
      const smallerDocs = documents.slice(0, 5);
      return await coherePortal.generateChat(messages, { documents: smallerDocs });
      
    default:
      console.error('Cohere API error:', error.message);
      throw error;
  }
}
```

## Performance Optimization

### Efficient RAG Implementation

```typescript
// Optimize document selection
const optimizeDocuments = (documents, query, maxDocs = 10) => {
  // Pre-filter documents based on keywords
  const keywords = query.toLowerCase().split(' ');
  
  const scoredDocs = documents.map(doc => {
    const content = (doc.title + ' ' + doc.snippet).toLowerCase();
    const score = keywords.reduce((acc, keyword) => {
      return acc + (content.includes(keyword) ? 1 : 0);
    }, 0);
    
    return { ...doc, relevanceScore: score };
  });
  
  // Return top scoring documents
  return scoredDocs
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxDocs);
};

// Use optimized documents
const relevantDocs = optimizeDocuments(allDocuments, userQuery);
const response = await coherePortal.generateChat(messages, {
  documents: relevantDocs
});
```

### Caching Strategy

```typescript
// Cache embeddings and search results
class CohereCache {
  constructor() {
    this.embeddings = new Map();
    this.searchResults = new Map();
    this.responses = new Map();
  }
  
  async getCachedEmbedding(text) {
    const key = this.hashString(text);
    if (this.embeddings.has(key)) {
      return this.embeddings.get(key);
    }
    
    const embedding = await coherePortal.generateEmbedding(text);
    this.embeddings.set(key, embedding);
    return embedding;
  }
  
  async getCachedResponse(messages, options = {}) {
    const key = this.hashString(JSON.stringify({ messages, options }));
    if (this.responses.has(key)) {
      return this.responses.get(key);
    }
    
    const response = await coherePortal.generateChat(messages, options);
    this.responses.set(key, response);
    return response;
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
```

## Best Practices

### RAG Implementation

1. **Document Quality**: Ensure high-quality, relevant documents
2. **Citation Accuracy**: Use `citationQuality: 'accurate'` for reliable sources
3. **Document Chunking**: Split large documents into manageable chunks
4. **Relevance Scoring**: Pre-filter documents for relevance

### Web Search Integration

1. **Fallback Strategy**: Use `continueOnFailure: true` for robust operation
2. **Site Restrictions**: Use site filters for trusted sources
3. **Result Validation**: Verify web search results when possible
4. **Rate Limiting**: Respect connector rate limits

### Enterprise Security

1. **API Key Management**: Secure API key storage and rotation
2. **Data Privacy**: Ensure compliance with data protection regulations
3. **Content Filtering**: Implement appropriate content filters
4. **Audit Logging**: Log all API interactions for compliance

### Cost Optimization

1. **Model Selection**: Use appropriate model for task complexity
2. **Document Optimization**: Reduce unnecessary document content
3. **Caching**: Cache responses and embeddings
4. **Batch Processing**: Group similar requests when possible

## Migration Guide

### From Traditional Search

```typescript
// Before: Traditional keyword search
const searchResults = await traditionalSearch(query);
const bestResult = searchResults[0];

// After: Cohere RAG with citations
const ragResponse = await coherePortal.generateChat([
  { role: 'user', content: query }
], {
  documents: searchResults.map(result => ({
    title: result.title,
    snippet: result.content,
    url: result.url
  })),
  citationQuality: 'accurate'
});

// Get answer with sources
console.log('Answer:', ragResponse.text);
console.log('Sources:', ragResponse.citations);
```

### From Basic LLM

```typescript
// Before: Basic LLM without sources
const response = await basicLLM.generate(prompt);

// After: Cohere with web search and citations
const enhancedResponse = await coherePortal.generateChat([
  { role: 'user', content: prompt }
], {
  connectors: [{ id: 'web-search' }],
  citationQuality: 'accurate'
});
```

## Next Steps

- Explore [Portal Switching Guide](../portal-switching) for dynamic configuration
- Learn about [Vercel AI SDK Portal](../vercel/) for multi-provider support
- Check [RAG Best Practices Guide](../../advanced-topics/rag/) for implementation details
- See [Enterprise Integration Guide](../../deployment/enterprise/) for production setup