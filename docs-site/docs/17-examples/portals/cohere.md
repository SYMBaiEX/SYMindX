# Cohere Portal Examples

## Overview

This guide demonstrates how to leverage Cohere's enterprise-grade AI models through SYMindX's Cohere portal, showcasing advanced RAG capabilities, citation features, and enterprise text processing.

## Character Configuration

### Cohere - Enterprise AI Character

```json
{
  "id": "cohere-ai",
  "name": "Cohere",
  "description": "Enterprise-focused AI assistant powered by Cohere's Command models with RAG capabilities",
  "enabled": false,
  
  "personality": {
    "traits": {
      "precision": 0.9,
      "enterprise_focus": 0.9,
      "analytical": 0.9,
      "reliability": 0.9,
      "citation_accuracy": 0.95
    },
    "values": [
      "Accurate information retrieval",
      "Proper source attribution",
      "Enterprise-grade reliability",
      "Factual consistency"
    ]
  },
  
  "portals": {
    "primary": "cohere",
    "config": {
      "cohere": {
        "model": "command-r-plus",
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Enterprise RAG Setup

Configure Cohere with retrieval capabilities:

```json
{
  "portals": {
    "cohere": {
      "apiKey": "${COHERE_API_KEY}",
      "model": "command-r-plus",
      "temperature": 0.7,
      "maxTokens": 4096,
      "enableRAG": true,
      "citationQuality": "accurate",
      "connectors": [
        {
          "id": "web-search",
          "continueOnFailure": true
        }
      ]
    }
  }
}
```

### Advanced Configuration with Custom Connectors

```json
{
  "portals": {
    "cohere": {
      "apiKey": "${COHERE_API_KEY}",
      "model": "command-r-plus",
      "temperature": 0.3,
      "maxTokens": 8192,
      "enableRAG": true,
      "citationQuality": "accurate",
      "connectors": [
        {
          "id": "web-search",
          "continueOnFailure": true,
          "options": {
            "site": "example.com"
          }
        },
        {
          "id": "knowledge-base",
          "continueOnFailure": false
        }
      ],
      "documents": [
        {
          "title": "Company Policies",
          "text": "..."
        },
        {
          "title": "Product Documentation", 
          "text": "..."
        }
      ]
    }
  }
}
```

## Usage Examples

### RAG-Powered Information Retrieval

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Cohere agent
const agent = await runtime.spawnAgent('cohere-ai');

// RAG query with citations
const ragResponse = await agent.chat(`
What are the latest developments in renewable energy storage technology? 
Focus on battery innovations and grid-scale solutions.
Include specific companies and recent breakthroughs.
`);

// The response will include proper citations
console.log('Response:', ragResponse.text);
console.log('Citations:', ragResponse.citations);
console.log('Documents:', ragResponse.documents);
```

### Enterprise Document Analysis

```typescript
// Upload documents for analysis
const documents = [
  {
    title: "Q4 Financial Report",
    text: "..." // Full text of financial report
  },
  {
    title: "Market Analysis 2025",
    text: "..." // Market analysis content
  },
  {
    title: "Competitive Intelligence",
    text: "..." // Competitor research
  }
];

// Analyze with citations
const analysis = await agent.chat(`
Based on the provided documents, analyze our company's position in the market:

1. Financial performance compared to industry benchmarks
2. Key growth opportunities identified
3. Competitive advantages and threats
4. Strategic recommendations for next quarter

Provide specific citations for all claims and data points.
`, { documents });

console.log('Analysis:', analysis.text);
console.log('Sources used:', analysis.documents.map(doc => doc.title));
```

### Web-Enhanced Research

```typescript
// Research with web connector
const webResearch = await agent.chat(`
Research the current state of artificial intelligence regulation globally:

1. What new AI regulations have been passed in 2025?
2. How do US, EU, and China approaches differ?
3. What are the implications for AI companies?
4. Which countries are leading in AI governance?

Use web search to find the most current information.
Provide citations for all claims.
`);

// Access web sources
console.log('Web sources found:', webResearch.citations.length);
webResearch.citations.forEach(citation => {
  console.log(`- ${citation.title}: ${citation.url}`);
});
```

## Advanced Features

### Custom Knowledge Base Integration

```typescript
// Define enterprise knowledge base
const knowledgeBase = [
  {
    id: "policy-001",
    title: "Remote Work Policy",
    text: `Our company supports flexible remote work arrangements...
    [Full policy text]`,
    metadata: {
      department: "HR",
      lastUpdated: "2025-01-15",
      version: "2.1"
    }
  },
  {
    id: "security-001", 
    title: "Information Security Guidelines",
    text: `All employees must follow these security protocols...
    [Full guidelines]`,
    metadata: {
      department: "IT Security",
      classification: "confidential"
    }
  }
];

// Query with knowledge base
const policyQuery = await agent.chat(`
What is our company's policy on remote work equipment? 
What security requirements must be met for home offices?
`, { 
  documents: knowledgeBase,
  citationQuality: "accurate"
});
```

### Embedding-Based Search

```typescript
// Generate embeddings for semantic search
const embeddingModel = "embed-english-v3.0";

// Create embeddings for document collection
const documentEmbeddings = await agent.portal.embed(
  documents.map(doc => doc.text),
  { 
    model: embeddingModel,
    inputType: "search_document"
  }
);

// Search with query embedding
const queryEmbedding = await agent.portal.embed(
  ["What are our sustainability initiatives?"],
  {
    model: embeddingModel,
    inputType: "search_query"  
  }
);

// Find most relevant documents
const similarities = documentEmbeddings.map((docEmb, index) => ({
  index,
  similarity: cosineSimilarity(queryEmbedding[0], docEmb),
  document: documents[index]
}));

const relevantDocs = similarities
  .filter(item => item.similarity > 0.7)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 5);

// Query with relevant context
const contextualResponse = await agent.chat(
  "What are our sustainability initiatives?",
  { documents: relevantDocs.map(item => item.document) }
);
```

### Multi-Step Research Workflow

```typescript
// Complex research with multiple steps
const researchWorkflow = async (topic) => {
  // Step 1: Initial web research
  const initialResearch = await agent.chat(`
    Research "${topic}" and provide an overview of:
    1. Current state and trends
    2. Key players and stakeholders
    3. Recent developments (last 6 months)
    
    Use web search for current information.
  `);
  
  // Step 2: Deep dive with documents
  const deepAnalysis = await agent.chat(`
    Based on the initial research, analyze "${topic}" in depth:
    1. Technical challenges and solutions
    2. Market opportunities and barriers
    3. Future outlook and predictions
    
    Use both web search and provided documents for comprehensive analysis.
  `, { documents: relevantDocuments });
  
  // Step 3: Strategic recommendations
  const recommendations = await agent.chat(`
    Given the research on "${topic}", provide strategic recommendations:
    1. Investment opportunities
    2. Partnership strategies
    3. Risk mitigation approaches
    4. Timeline for implementation
    
    Base recommendations on cited sources and data.
  `);
  
  return {
    overview: initialResearch,
    analysis: deepAnalysis,
    recommendations,
    allCitations: [
      ...initialResearch.citations,
      ...deepAnalysis.citations,
      ...recommendations.citations
    ]
  };
};

// Execute research workflow
const result = await researchWorkflow("quantum computing commercialization");
```

## Real-World Applications

### Enterprise Q&A System

```typescript
// Company-wide knowledge system
const enterpriseQA = await runtime.spawnAgent('cohere-ai', {
  systemPrompt: `You are an enterprise knowledge assistant. Always provide 
  accurate answers with proper citations. If you don't know something, 
  say so clearly.`,
  
  documents: [
    // Load all company documents
    ...policyDocuments,
    ...technicalDocuments,
    ...processDocuments
  ]
});

// Employee query handler
const handleEmployeeQuery = async (query, employeeContext) => {
  const response = await enterpriseQA.chat(`
    Employee Query: ${query}
    
    Employee Department: ${employeeContext.department}
    Employee Level: ${employeeContext.level}
    
    Provide a comprehensive answer with relevant citations.
    Consider the employee's context when determining what information to include.
  `);
  
  return {
    answer: response.text,
    sources: response.citations,
    confidence: response.metadata?.confidence || 'medium'
  };
};
```

### Competitive Intelligence Platform

```typescript
// Automated competitive analysis
const competitiveIntel = await agent.chat(`
Research our top 3 competitors in the AI software market:

For each competitor, find:
1. Recent product announcements
2. Funding and financial news
3. Key partnerships and acquisitions
4. Technology developments
5. Market positioning changes

Use web search to find the most current information.
Create a comparative analysis with citations.
`);

// Track competitor mentions
const trackCompetitors = async (competitors) => {
  const updates = [];
  
  for (const competitor of competitors) {
    const update = await agent.chat(`
      Find the latest news and developments about ${competitor} 
      from the past week. Focus on:
      - Product updates
      - Business developments  
      - Market movements
      - Strategic changes
      
      Provide citations for all information.
    `);
    
    updates.push({
      competitor,
      update: update.text,
      sources: update.citations,
      timestamp: new Date()
    });
  }
  
  return updates;
};
```

### Legal Document Review

```typescript
// Contract analysis with citations
const contractReview = await agent.chat(`
Review this contract for potential issues and risks:

[Contract text here]

Analyze for:
1. Liability clauses and limitations
2. Termination conditions
3. Intellectual property provisions
4. Data protection and privacy terms
5. Compliance requirements
6. Financial obligations

For each issue identified, cite the specific contract section.
Compare with industry standard practices and provide recommendations.
`, {
  documents: [
    {
      title: "Standard Contract Templates",
      text: "..." // Industry standard contracts
    },
    {
      title: "Legal Best Practices",
      text: "..." // Legal guidelines
    }
  ]
});
```

## Performance Characteristics

| Model | Strengths | Context | Best Use Case |
|-------|-----------|---------|---------------|
| Command R+ | Superior RAG, citations | 128K tokens | Enterprise search, analysis |
| Command R | Good RAG capabilities | 128K tokens | General business queries |
| Command | Fast responses | 4K tokens | Simple Q&A, chat |
| Embed v3.0 | High-quality embeddings | N/A | Semantic search, clustering |

## Integration Examples

### Enterprise Search API

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('cohere-ai');

// Enterprise search endpoint
app.post('/search', async (req, res) => {
  try {
    const { query, filters, citationRequired = true } = req.body;
    
    // Apply filters to document selection
    const filteredDocs = applyFilters(knowledgeBase, filters);
    
    const response = await agent.chat(query, {
      documents: filteredDocs,
      citationQuality: citationRequired ? 'accurate' : 'basic'
    });
    
    res.json({
      answer: response.text,
      citations: response.citations,
      documentsUsed: response.documents?.length || 0,
      confidence: response.metadata?.confidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Citation verification endpoint
app.post('/verify-citation', async (req, res) => {
  const { claim, documentId } = req.body;
  
  const verification = await agent.chat(`
    Verify if this claim is supported by the document:
    Claim: "${claim}"
    
    Provide:
    1. Whether the claim is supported (yes/no/partial)
    2. Specific text that supports or contradicts the claim
    3. Context around the supporting text
    4. Confidence level (high/medium/low)
  `, {
    documents: [findDocumentById(documentId)]
  });
  
  res.json({ verification });
});
```

### Knowledge Management System

```typescript
// Automated knowledge extraction
const knowledgeExtractor = await runtime.spawnAgent('cohere-ai', {
  systemPrompt: 'Extract key information and create structured summaries with citations.'
});

// Process new documents
const processNewDocument = async (document) => {
  const extraction = await knowledgeExtractor.chat(`
    Analyze this document and extract:
    1. Key concepts and definitions
    2. Important procedures or processes
    3. Relevant data points and statistics
    4. Action items and requirements
    5. Related topics and cross-references
    
    Create a structured summary with citations to specific sections.
    
    Document: ${document.text}
  `);
  
  // Store structured knowledge
  return {
    documentId: document.id,
    summary: extraction.text,
    keyPoints: extractKeyPoints(extraction.text),
    citations: extraction.citations,
    processedAt: new Date()
  };
};
```

## Cost Optimization

### Citation Quality Levels

```typescript
// Optimize citation quality based on use case
const citationLevels = {
  high_stakes: 'accurate',    // Legal, financial, medical
  business: 'balanced',       // General business queries
  casual: 'basic'            // Informal questions
};

const optimizedQuery = async (query, context) => {
  const citationLevel = determineCitationLevel(query, context);
  
  return await agent.chat(query, {
    citationQuality: citationLevels[citationLevel],
    maxCitations: citationLevel === 'high_stakes' ? 10 : 5
  });
};
```

### Document Caching

```typescript
// Cache processed documents
const documentCache = new Map();

const getCachedAnalysis = (docId, query) => {
  const key = `${docId}-${hashQuery(query)}`;
  return documentCache.get(key);
};

const setCachedAnalysis = (docId, query, result) => {
  const key = `${docId}-${hashQuery(query)}`;
  documentCache.set(key, {
    result,
    timestamp: Date.now(),
    citations: result.citations
  });
};
```

## Troubleshooting

### Common Issues

1. **Citation Quality**
   ```typescript
   // Improve citation accuracy
   const response = await agent.chat(query, {
     citationQuality: 'accurate',
     enableFactChecking: true,
     requireSourceAttribution: true
   });
   ```

2. **Document Relevance**
   ```typescript
   // Pre-filter documents for relevance
   const relevantDocs = await filterRelevantDocuments(query, documents);
   const response = await agent.chat(query, { documents: relevantDocs });
   ```

3. **Connector Issues**
   ```typescript
   // Handle connector failures gracefully
   agent.on('connectorError', (error) => {
     console.log('Connector failed:', error.connectorId);
     // Fallback to cached data or alternative sources
   });
   ```

### Debug Configuration

```json
{
  "portals": {
    "cohere": {
      "debug": true,
      "logCitations": true,
      "logConnectorUsage": true,
      "validateSources": true
    }
  }
}
```

## Best Practices

1. **Use appropriate citation quality** for your use case
2. **Pre-filter documents** for relevance to improve accuracy
3. **Implement source verification** for critical applications
4. **Cache responses** to reduce API costs
5. **Monitor connector usage** and failures
6. **Validate citations** before using in production

## Next Steps

- Explore [Cohere Portal Configuration](/docs/portals/cohere)
- Learn about [RAG Implementation](/docs/advanced-topics/rag)
- Check [Citation Management](/docs/portals/cohere/citations)
- See [Enterprise Search Guide](/docs/use-cases/enterprise-search)