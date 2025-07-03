# Ollama Portal Examples

## Overview

This guide demonstrates how to use Ollama for privacy-first local AI inference through SYMindX's Ollama portal, enabling completely offline AI capabilities with full data control.

## Character Configuration

### Llama - Local AI Character

```json
{
  "id": "llama-ollama",
  "name": "Llama",
  "description": "Privacy-focused local AI assistant powered by Ollama and Llama models",
  "enabled": false,
  
  "personality": {
    "traits": {
      "privacy_focused": 0.95,
      "independence": 0.9,
      "reliability": 0.9,
      "efficiency": 0.8,
      "security": 0.95
    },
    "values": [
      "Complete data privacy",
      "Offline capability",
      "Local processing",
      "Security and control"
    ]
  },
  
  "portals": {
    "primary": "ollama",
    "config": {
      "ollama": {
        "model": "llama3.1:70b",
        "temperature": 0.7,
        "num_ctx": 4096
      }
    }
  }
}
```

## Portal Configurations

### Basic Local Setup

Configure Ollama for local inference:

```json
{
  "portals": {
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.1:70b",
      "embeddingModel": "nomic-embed-text",
      "keepAlive": "5m",
      "options": {
        "temperature": 0.7,
        "numCtx": 4096,
        "numGpu": 1
      }
    }
  }
}
```

### Advanced Configuration with GPU Optimization

```json
{
  "portals": {
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.1:70b",
      "embeddingModel": "nomic-embed-text", 
      "keepAlive": "10m",
      "options": {
        "temperature": 0.8,
        "numCtx": 8192,
        "numGpu": 2,
        "numThread": 8,
        "repeatPenalty": 1.1,
        "topK": 40,
        "topP": 0.9
      },
      "enableGpuOffloading": true,
      "memoryOptimization": true
    }
  }
}
```

## Model Management

### Installing Models

```bash
# Install various model sizes
ollama pull llama3.1:8b      # Fast, good for general tasks
ollama pull llama3.1:70b     # High quality, slower
ollama pull codellama:13b    # Specialized for coding
ollama pull mistral:7b       # Alternative model family
ollama pull nomic-embed-text # For embeddings

# Check available models
ollama list

# Remove unused models to save space
ollama rm old-model:version
```

### Model Selection Strategy

```typescript
// Intelligent model selection based on task
const selectModel = (task, performance_priority = 'balanced') => {
  const taskComplexity = analyzeComplexity(task);
  const availableRAM = getAvailableRAM();
  
  if (performance_priority === 'speed') {
    return taskComplexity > 0.7 ? 'llama3.1:13b' : 'llama3.1:8b';
  }
  
  if (performance_priority === 'quality') {
    return availableRAM > 48 ? 'llama3.1:70b' : 'llama3.1:13b';
  }
  
  // Balanced approach
  if (taskComplexity > 0.8 && availableRAM > 32) return 'llama3.1:70b';
  if (taskComplexity > 0.5) return 'llama3.1:13b';
  return 'llama3.1:8b';
};
```

## Usage Examples

### Private Document Analysis

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Ollama agent
const agent = await runtime.spawnAgent('llama-ollama');

// Analyze sensitive documents locally
const documentAnalysis = await agent.chat(`
Analyze this confidential business document:

${sensitiveDocument}

Provide:
1. Executive summary
2. Key financial metrics
3. Risk assessment
4. Strategic recommendations
5. Competitive analysis

Note: This analysis will remain completely private and local.
`);

// No data leaves your infrastructure
console.log('Analysis completed locally:', documentAnalysis);
```

### Offline Code Generation

```typescript
// Code generation without internet
const codeGeneration = await agent.chat(`
Create a complete Python web scraper that:
1. Handles JavaScript-rendered content
2. Respects robots.txt
3. Implements rate limiting
4. Has error handling and retry logic
5. Saves data to SQLite database
6. Includes logging and monitoring

Make it production-ready with proper documentation.
`, {
  model: 'codellama:13b',  // Use specialized coding model
  options: {
    temperature: 0.3,      // Lower temperature for code
    numCtx: 8192          // More context for large code
  }
});
```

### Privacy-First Customer Data Processing

```typescript
// Process customer data without external API calls
const customerInsights = await agent.chat(`
Analyze this customer dataset for insights:

${customerData}

Generate:
1. Customer segmentation analysis
2. Behavior pattern identification
3. Churn risk assessment
4. Personalization recommendations
5. Revenue optimization opportunities

Important: This data never leaves our servers.
`);
```

## Advanced Features

### Local Embeddings and Search

```typescript
// Generate embeddings locally
const documents = [
  "Company policy on remote work and flexible schedules",
  "Employee handbook section on benefits and compensation", 
  "IT security guidelines for remote access",
  "Performance review process and criteria"
];

// Create embeddings without external API
const embeddings = await Promise.all(
  documents.map(doc => agent.portal.generateEmbedding(doc))
);

// Local semantic search
const searchQuery = "What are the remote work policies?";
const queryEmbedding = await agent.portal.generateEmbedding(searchQuery);

// Find most relevant documents
const similarities = embeddings.map((emb, index) => ({
  document: documents[index],
  similarity: cosineSimilarity(queryEmbedding, emb),
  index
}));

const relevantDocs = similarities
  .filter(item => item.similarity > 0.7)
  .sort((a, b) => b.similarity - a.similarity);

console.log('Most relevant documents:', relevantDocs);
```

### Multi-Model Ensemble

```typescript
// Use multiple models for critical decisions
const ensembleDecision = async (prompt) => {
  const models = ['llama3.1:70b', 'llama3.1:13b', 'mistral:7b'];
  const responses = [];
  
  for (const model of models) {
    const response = await agent.chat(prompt, { model });
    responses.push({ model, response });
  }
  
  // Analyze responses for consensus
  const consensus = await agent.chat(`
    Analyze these AI responses for consensus and quality:
    
    ${responses.map(r => `Model ${r.model}: ${r.response}`).join('\n\n')}
    
    Provide:
    1. Points of agreement
    2. Conflicting viewpoints
    3. Most reliable answer
    4. Confidence assessment
  `);
  
  return { responses, consensus };
};
```

### Local RAG Implementation

```typescript
// Implement RAG without external dependencies
class LocalRAG {
  constructor(agent) {
    this.agent = agent;
    this.documentStore = new Map();
    this.embeddings = new Map();
  }
  
  async addDocuments(documents) {
    for (const doc of documents) {
      const embedding = await this.agent.portal.generateEmbedding(doc.text);
      this.documentStore.set(doc.id, doc);
      this.embeddings.set(doc.id, embedding);
    }
  }
  
  async query(question, topK = 3) {
    const questionEmbedding = await this.agent.portal.generateEmbedding(question);
    
    // Find most relevant documents
    const similarities = Array.from(this.embeddings.entries()).map(([id, emb]) => ({
      id,
      similarity: cosineSimilarity(questionEmbedding, emb),
      document: this.documentStore.get(id)
    }));
    
    const relevantDocs = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
    
    // Generate answer with context
    const context = relevantDocs.map(doc => doc.document.text).join('\n\n');
    
    const answer = await this.agent.chat(`
      Context: ${context}
      
      Question: ${question}
      
      Answer the question based only on the provided context.
      If the answer isn't in the context, say so clearly.
    `);
    
    return {
      answer,
      sources: relevantDocs.map(doc => ({
        id: doc.id,
        title: doc.document.title,
        similarity: doc.similarity
      }))
    };
  }
}

// Usage
const rag = new LocalRAG(agent);
await rag.addDocuments(privateDocuments);
const result = await rag.query("What is our data retention policy?");
```

## Real-World Applications

### Air-Gapped Environment

```typescript
// Complete AI system for air-gapped networks
const secureEnvironment = await runtime.spawnAgent('llama-ollama', {
  systemPrompt: `You are an AI assistant running in a secure, air-gapped environment. 
  You have no internet access and all processing is local.`,
  
  offlineMode: true,
  networkAccess: false
});

// Security analysis without external dependencies
const securityAnalysis = await secureEnvironment.chat(`
Analyze this network configuration for security vulnerabilities:

${networkConfig}

Focus on:
1. Access control weaknesses
2. Encryption gaps
3. Monitoring blind spots
4. Compliance issues
5. Recommended hardening steps

All analysis must be done without external references.
`);
```

### Healthcare Data Processing

```typescript
// HIPAA-compliant local processing
const healthcareAI = await runtime.spawnAgent('llama-ollama', {
  systemPrompt: 'You are a healthcare AI assistant. All patient data processing is local and private.',
  
  hipaaCompliant: true,
  dataRetention: 'none',
  logging: 'minimal'
});

// Process patient data locally
const patientAnalysis = await healthcareAI.chat(`
Analyze this patient data for treatment insights:

[Patient data - stays completely local]

Provide:
1. Potential diagnoses to consider
2. Recommended tests or evaluations
3. Drug interaction warnings
4. Care plan suggestions

Note: This analysis is for informational purposes only and should be reviewed by qualified medical professionals.
`);
```

### Financial Document Review

```typescript
// Private financial analysis
const financialAI = await runtime.spawnAgent('llama-ollama', {
  systemPrompt: 'You are a financial analysis AI. All data processing is confidential and local.',
  
  encryptionAtRest: true,
  auditLogging: false
});

// Analyze sensitive financial documents
const financialAnalysis = await financialAI.chat(`
Review this confidential financial document:

${financialDocument}

Analyze for:
1. Revenue trends and projections
2. Cost structure optimization
3. Risk factors and mitigation
4. Competitive positioning
5. Investment recommendations

Ensure complete confidentiality - no data leaves this system.
`);
```

## Performance Optimization

### Hardware Optimization

```typescript
// Optimize for your hardware configuration
const optimizeForHardware = () => {
  const systemInfo = {
    gpu: detectGPU(),
    ram: getAvailableRAM(),
    cpu: getCPUInfo()
  };
  
  let config = {
    baseUrl: "http://localhost:11434",
    options: {
      numCtx: 4096,
      temperature: 0.7
    }
  };
  
  // GPU optimization
  if (systemInfo.gpu.vram > 24) {
    config.model = 'llama3.1:70b';
    config.options.numGpu = 2;
    config.options.numCtx = 8192;
  } else if (systemInfo.gpu.vram > 12) {
    config.model = 'llama3.1:13b'; 
    config.options.numGpu = 1;
    config.options.numCtx = 6144;
  } else {
    config.model = 'llama3.1:8b';
    config.options.numGpu = 1;
    config.options.numCtx = 4096;
  }
  
  // CPU optimization
  config.options.numThread = Math.min(systemInfo.cpu.cores, 8);
  
  return config;
};
```

### Memory Management

```typescript
// Efficient memory usage
const memoryOptimizedAgent = await runtime.spawnAgent('llama-ollama', {
  config: {
    keepAlive: '2m',          // Unload model after 2 minutes
    options: {
      lowVram: true,          // Enable low VRAM mode
      f16Kv: true,           // Use 16-bit for key/value cache
      useMLock: false,       // Don't lock model in memory
      numBatch: 512          // Smaller batch size
    }
  }
});

// Monitor memory usage
agent.on('modelLoad', (event) => {
  console.log('Model loaded:', event.model);
  console.log('Memory usage:', getMemoryUsage());
});

agent.on('modelUnload', (event) => {
  console.log('Model unloaded:', event.model);
  console.log('Memory freed:', getMemoryUsage());
});
```

## Integration Examples

### Private Chat Interface

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('llama-ollama');

// Private chat endpoint - no external API calls
app.post('/private-chat', async (req, res) => {
  try {
    const { message, conversation = [] } = req.body;
    
    const response = await agent.chat(message, {
      conversation,
      options: {
        temperature: 0.8,
        numCtx: 4096
      }
    });
    
    res.json({
      response,
      model: 'local-llama',
      privacy: 'guaranteed',
      dataRetention: 'none'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check - no external dependencies
app.get('/health', async (req, res) => {
  const modelStatus = await checkOllamaHealth();
  res.json({
    status: 'healthy',
    model: agent.config.model,
    localProcessing: true,
    internet: false,
    modelLoaded: modelStatus.loaded
  });
});

app.listen(3000, () => {
  console.log('Private AI API running locally on port 3000');
});
```

### Offline Documentation Assistant

```typescript
// Company documentation assistant that works offline
const docAssistant = await runtime.spawnAgent('llama-ollama', {
  systemPrompt: 'You are a documentation assistant with access to company knowledge.',
  
  documents: [
    // Load all company documentation locally
    ...loadCompanyDocs(),
    ...loadTechnicalSpecs(),
    ...loadPolicies()
  ]
});

// Works without internet connection
const docQuery = async (question) => {
  const answer = await docAssistant.chat(`
    Based on our company documentation, answer this question:
    ${question}
    
    If the answer isn't in the documentation, say so clearly.
    Provide specific references to relevant documents.
  `);
  
  return {
    answer,
    offline: true,
    sources: extractDocumentReferences(answer)
  };
};
```

## Security Benefits

### Complete Data Control

```typescript
// Audit data flow - everything stays local
const auditDataFlow = () => {
  return {
    dataLocation: 'local-only',
    networkRequests: 'none',
    externalAPIs: 'disabled',
    dataRetention: 'user-controlled',
    encryption: 'at-rest',
    compliance: ['SOC2', 'GDPR', 'HIPAA-ready']
  };
};

// Verify no external connections
const verifyAirGapped = async () => {
  const networkMonitor = new NetworkMonitor();
  
  // Run AI tasks and monitor network
  await agent.chat("Perform complex analysis task");
  
  const connections = networkMonitor.getConnections();
  if (connections.external.length > 0) {
    throw new Error('Unexpected external connections detected');
  }
  
  return { verified: true, externalConnections: 0 };
};
```

## Troubleshooting

### Model Loading Issues

```bash
# Check Ollama service
systemctl status ollama

# Restart if needed
systemctl restart ollama

# Check disk space
df -h

# Monitor GPU memory
nvidia-smi

# View Ollama logs
journalctl -u ollama -f
```

### Performance Issues

```typescript
// Diagnose performance problems
const diagnosePerformance = async () => {
  const start = Date.now();
  const response = await agent.chat("Simple test query");
  const duration = Date.now() - start;
  
  const diagnosis = {
    responseTime: duration,
    model: agent.config.model,
    hardware: getHardwareInfo(),
    recommendations: []
  };
  
  if (duration > 30000) {
    diagnosis.recommendations.push('Consider using a smaller model');
    diagnosis.recommendations.push('Check GPU utilization');
  }
  
  return diagnosis;
};
```

### Common Issues

```typescript
// Handle common Ollama issues
agent.on('error', (error) => {
  if (error.message.includes('model not found')) {
    console.log('Model not installed. Run: ollama pull', agent.config.model);
  } else if (error.message.includes('connection refused')) {
    console.log('Ollama service not running. Start with: ollama serve');
  } else if (error.message.includes('out of memory')) {
    console.log('Insufficient VRAM. Try a smaller model or enable low VRAM mode');
  }
});
```

## Best Practices

1. **Choose appropriate model sizes** for your hardware
2. **Implement proper memory management** to avoid crashes
3. **Use GPU acceleration** when available
4. **Monitor system resources** during inference
5. **Keep models updated** for best performance
6. **Implement fallback strategies** for model failures

## Next Steps

- Explore [Ollama Portal Configuration](/docs/portals/ollama)
- Learn about [Local AI Deployment](/docs/deployment/local-ai)
- Check [Privacy-First AI Guide](/docs/security/privacy-first)
- See [Model Management](/docs/portals/ollama/model-management)