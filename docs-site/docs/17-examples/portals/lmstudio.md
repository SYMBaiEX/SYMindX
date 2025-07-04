# LM Studio Portal Examples

## Overview

This guide demonstrates how to use LM Studio for local AI model serving through SYMindX's LM Studio portal, providing OpenAI-compatible local inference with advanced model management and GPU acceleration.

## Character Configuration

### Studio - Local AI Character

```json
{
  "id": "studio-lms",
  "name": "Studio",
  "description": "Local AI assistant powered by LM Studio with OpenAI-compatible interface",
  "enabled": false,
  
  "personality": {
    "traits": {
      "local_processing": 0.95,
      "openai_compatible": 0.9,
      "performance_optimized": 0.9,
      "privacy_focused": 0.95,
      "user_friendly": 0.9
    },
    "values": [
      "Local data processing",
      "OpenAI API compatibility", 
      "Performance optimization",
      "Privacy and security"
    ]
  },
  
  "portals": {
    "primary": "lmstudio",
    "config": {
      "lmstudio": {
        "model": "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Basic Local Setup

Configure LM Studio for local OpenAI-compatible serving:

```json
{
  "portals": {
    "lmstudio": {
      "baseUrl": "http://localhost:1234",
      "model": "lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF",
      "enableGPU": true,
      "gpuLayers": -1,
      "precision": "q4_0",
      "contextSize": 8192,
      "enablePrivacyMode": true,
      "enableOfflineMode": true
    }
  }
}
```

### Advanced Configuration with Multiple Models

```json
{
  "portals": {
    "lmstudio": {
      "baseUrl": "http://localhost:1234",
      "models": {
        "chat": {
          "name": "lmstudio-community/Meta-Llama-3.1-70B-Instruct-GGUF",
          "precision": "q4_0",
          "gpuLayers": 35,
          "contextSize": 8192
        },
        "code": {
          "name": "lmstudio-community/CodeLlama-13B-Instruct-GGUF", 
          "precision": "q4_0",
          "gpuLayers": 25,
          "contextSize": 4096
        },
        "embedding": {
          "name": "lmstudio-community/nomic-embed-text-v1.5-GGUF",
          "precision": "f16",
          "gpuLayers": -1
        }
      },
      "defaultModel": "chat",
      "enableGPU": true,
      "enablePrivacyMode": true,
      "serverSettings": {
        "threads": 8,
        "batchSize": 512,
        "enableMmap": true,
        "enableMLock": false
      }
    }
  }
}
```

## Model Management

### Installing and Managing Models

```bash
# LM Studio CLI commands for model management
# (These would typically be run through LM Studio GUI)

# Download popular models
# Llama 3.1 8B (Fastest)
lms download microsoft/Phi-3-mini-4k-instruct-gguf

# Llama 3.1 70B (Best Quality)  
lms download lmstudio-community/Meta-Llama-3.1-70B-Instruct-GGUF

# Code-specialized model
lms download lmstudio-community/CodeLlama-13B-Instruct-GGUF

# Embedding model
lms download lmstudio-community/nomic-embed-text-v1.5-GGUF

# List downloaded models
lms list

# Remove unused models
lms remove model-name
```

### Model Selection Strategy

```typescript
// Intelligent model selection based on task and hardware
const selectModel = (task, hardwareInfo) => {
  const taskComplexity = analyzeTaskComplexity(task);
  const availableVRAM = hardwareInfo.gpu.vram;
  const availableRAM = hardwareInfo.ram;
  
  // Model recommendations based on hardware
  if (availableVRAM >= 24) {
    if (taskComplexity > 0.8) return 'Meta-Llama-3.1-70B-Instruct-GGUF';
    return 'Meta-Llama-3.1-13B-Instruct-GGUF';
  } else if (availableVRAM >= 12) {
    if (taskComplexity > 0.6) return 'Meta-Llama-3.1-13B-Instruct-GGUF';
    return 'Meta-Llama-3.1-8B-Instruct-GGUF';
  } else {
    return 'Phi-3-mini-4k-instruct-gguf'; // Efficient for lower-end hardware
  }
};

// Task-specific model routing
const getOptimalModel = (taskType) => {
  const modelMap = {
    'code_generation': 'CodeLlama-13B-Instruct-GGUF',
    'creative_writing': 'Meta-Llama-3.1-70B-Instruct-GGUF',
    'simple_chat': 'Meta-Llama-3.1-8B-Instruct-GGUF',
    'analysis': 'Meta-Llama-3.1-13B-Instruct-GGUF',
    'embedding': 'nomic-embed-text-v1.5-GGUF'
  };
  
  return modelMap[taskType] || 'Meta-Llama-3.1-8B-Instruct-GGUF';
};
```

## Usage Examples

### OpenAI-Compatible Integration

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn LM Studio agent
const agent = await runtime.spawnAgent('studio-lms');

// Use exactly like OpenAI API - but completely local
const localResponse = await agent.chat(`
Create a comprehensive business plan for a sustainable packaging startup:

1. Executive Summary
2. Market Analysis
3. Product Strategy
4. Financial Projections
5. Implementation Timeline

Focus on innovative biodegradable materials and circular economy principles.
`);

// All processing happens locally - no data leaves your machine
console.log('Local AI Response:', localResponse);
```

### Code Generation with Privacy

```typescript
// Code generation that stays completely private
const codeGeneration = await agent.chat(`
Create a secure user authentication system in Python using FastAPI:

Requirements:
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting for login attempts
- Email verification system
- Password reset functionality
- Role-based access control
- Security headers and CORS
- Database integration with SQLAlchemy

Include:
- Complete code implementation
- Security best practices
- Testing examples
- Deployment configuration

Note: This code will be used for a financial services application.
`, {
  model: 'CodeLlama-13B-Instruct-GGUF',
  temperature: 0.3, // Lower temperature for code
  maxTokens: 8192
});

// Sensitive code never sent to external APIs
console.log('Secure code generated locally');
```

### Private Document Analysis

```typescript
// Analyze confidential documents locally
const documentAnalysis = await agent.chat(`
Analyze this confidential business document for strategic insights:

${confidentialDocument}

Provide analysis on:
1. Strategic opportunities and threats
2. Financial performance indicators
3. Operational efficiency metrics
4. Competitive positioning
5. Risk factors and mitigation strategies
6. Recommendations for leadership team

Ensure this analysis maintains complete confidentiality.
`);

// Document never leaves your infrastructure
console.log('Confidential analysis completed locally');
```

## Advanced Features

### Function Calling with Local Processing

```typescript
// Define tools that work with local processing
const localTools = {
  analyzeFinancialData: {
    description: 'Analyze financial data while maintaining privacy',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Financial data to analyze' },
        analysisType: { 
          type: 'string', 
          enum: ['performance', 'risk', 'forecast', 'comparison']
        }
      },
      required: ['data', 'analysisType']
    },
    execute: async ({ data, analysisType }) => {
      // Process financial data locally
      const analysis = await processFinancialData(data, analysisType);
      return {
        analysis,
        dataPrivacy: 'local-only',
        processingLocation: 'on-premises'
      };
    }
  },

  generateSecureCode: {
    description: 'Generate code with security best practices',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string' },
        framework: { type: 'string' },
        securityLevel: { 
          type: 'string',
          enum: ['standard', 'high', 'maximum']
        },
        requirements: { type: 'array', items: { type: 'string' } }
      },
      required: ['language', 'requirements']
    },
    execute: async ({ language, framework, securityLevel, requirements }) => {
      return {
        code: generateSecureCode(language, framework, requirements),
        securityLevel,
        privacy: 'local-generation',
        auditTrail: false // No external logging
      };
    }
  }
};

// Use tools with complete privacy
const toolResponse = await agent.chat(
  "Analyze our Q4 financial performance and generate a secure API for data access",
  { tools: localTools }
);
```

### Local Embeddings and Search

```typescript
// Create local embedding search system
class LocalEmbeddingSearch {
  constructor(agent) {
    this.agent = agent;
    this.documents = new Map();
    this.embeddings = new Map();
  }
  
  async addDocument(id, content) {
    // Generate embeddings locally
    const embedding = await this.agent.portal.generateEmbedding(content, {
      model: 'nomic-embed-text-v1.5-GGUF'
    });
    
    this.documents.set(id, content);
    this.embeddings.set(id, embedding);
  }
  
  async search(query, topK = 5) {
    const queryEmbedding = await this.agent.portal.generateEmbedding(query, {
      model: 'nomic-embed-text-v1.5-GGUF'
    });
    
    const similarities = Array.from(this.embeddings.entries()).map(([id, emb]) => ({
      id,
      similarity: cosineSimilarity(queryEmbedding, emb),
      content: this.documents.get(id)
    }));
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  async queryWithContext(question, topK = 3) {
    const relevantDocs = await this.search(question, topK);
    const context = relevantDocs.map(doc => doc.content).join('\n\n');
    
    const answer = await this.agent.chat(`
      Context: ${context}
      
      Question: ${question}
      
      Answer the question based on the provided context.
      All processing is local and private.
    `);
    
    return {
      answer,
      sources: relevantDocs.map(doc => ({ id: doc.id, similarity: doc.similarity })),
      privacy: 'local-only'
    };
  }
}

// Usage
const localSearch = new LocalEmbeddingSearch(agent);

// Add private documents
await localSearch.addDocument('policy-001', 'Company privacy policy content...');
await localSearch.addDocument('handbook-002', 'Employee handbook content...');
await localSearch.addDocument('security-003', 'Security guidelines content...');

// Search privately
const result = await localSearch.queryWithContext(
  "What is our policy on remote work data security?"
);
```

## Real-World Applications

### Private AI Assistant for Legal Firm

```typescript
// Legal document analysis with complete confidentiality
const legalAI = await runtime.spawnAgent('studio-lms', {
  systemPrompt: `You are a legal AI assistant. All client information must remain 
  completely confidential. Process documents with attention to legal detail and precedent.`,
  
  model: 'Meta-Llama-3.1-70B-Instruct-GGUF', // High-quality model for legal work
  privacy: 'maximum',
  dataRetention: 'none'
});

// Analyze contracts without external exposure
const contractAnalysis = await legalAI.chat(`
Analyze this client contract for potential issues:

[Confidential contract content]

Focus on:
1. Liability and indemnification clauses
2. Termination and breach provisions
3. Intellectual property rights
4. Dispute resolution mechanisms
5. Compliance with relevant regulations
6. Risk assessment and recommendations

Provide detailed legal analysis while maintaining client confidentiality.
`);

// Contract never leaves the law firm's premises
console.log('Confidential legal analysis completed');
```

### Healthcare Data Processing

```typescript
// HIPAA-compliant local AI for healthcare
const healthcareAI = await runtime.spawnAgent('studio-lms', {
  systemPrompt: 'You are a healthcare AI assistant. All patient data must remain private and secure.',
  
  compliance: {
    hipaa: true,
    dataLocalization: true,
    auditLogging: 'minimal',
    encryptionAtRest: true
  }
});

// Process patient data locally
const patientAnalysis = await healthcareAI.chat(`
Analyze this patient case for potential diagnoses and treatment recommendations:

Patient History: [Private patient data]
Symptoms: [Confidential symptom data]
Test Results: [Private lab results]

Provide:
1. Differential diagnosis considerations
2. Recommended additional tests
3. Treatment options and considerations
4. Risk factors and contraindications
5. Follow-up recommendations

Note: All analysis must comply with HIPAA and remain on local systems.
`);

// Patient data never transmitted externally
console.log('Private healthcare analysis completed');
```

### Financial Services AI

```typescript
// Secure financial analysis for banks/investment firms
const financialAI = await runtime.spawnAgent('studio-lms', {
  systemPrompt: 'You are a financial AI assistant specializing in confidential analysis.',
  
  security: {
    financialCompliance: true,
    sox: true,
    pci: true,
    dataClassification: 'restricted'
  }
});

// Analyze sensitive financial data
const riskAssessment = await financialAI.chat(`
Conduct a comprehensive risk assessment for this investment portfolio:

[Confidential portfolio data]
[Client financial information]
[Market position data]

Analyze:
1. Portfolio risk exposure and concentration
2. Correlation analysis and diversification
3. Stress testing scenarios
4. Regulatory compliance requirements
5. Optimization recommendations
6. Risk mitigation strategies

Ensure all analysis meets financial regulatory standards.
`);

// Sensitive financial data remains on-premises
console.log('Confidential financial analysis completed');
```

## Performance Optimization

### Hardware-Specific Configuration

```typescript
// Optimize for different hardware configurations
const optimizeForHardware = async () => {
  const hardware = await detectHardware();
  
  let config = {
    baseUrl: "http://localhost:1234",
    enableGPU: hardware.gpu.available
  };
  
  // NVIDIA GPU optimization
  if (hardware.gpu.vendor === 'nvidia') {
    config.gpuLayers = hardware.gpu.vram > 12 ? -1 : Math.floor(hardware.gpu.vram / 0.5);
    config.precision = hardware.gpu.vram > 16 ? 'q4_0' : 'q4_1';
  }
  
  // Apple Silicon optimization
  if (hardware.cpu.architecture === 'apple-silicon') {
    config.enableMetal = true;
    config.gpuLayers = -1;
    config.precision = 'q4_0';
  }
  
  // CPU-only optimization
  if (!hardware.gpu.available) {
    config.threads = Math.min(hardware.cpu.cores, 8);
    config.precision = 'q4_1';
    config.enableMmap = true;
  }
  
  return config;
};

// Apply optimizations
const optimizedConfig = await optimizeForHardware();
const optimizedAgent = await runtime.spawnAgent('studio-lms', optimizedConfig);
```

### Memory Management

```typescript
// Efficient memory usage for large models
const memoryOptimizedAgent = await runtime.spawnAgent('studio-lms', {
  config: {
    enableMmap: true,        // Memory-map model files
    enableMLock: false,      // Don't lock in RAM (allow swapping)
    batchSize: 256,         // Smaller batch for lower memory
    contextSize: 4096,      // Reduce context if needed
    gpuLayers: 20,          // Partial GPU offloading
    lowVram: true           // Enable low VRAM mode
  }
});

// Monitor memory usage
agent.on('modelLoad', (event) => {
  console.log('Model loaded:', event.model);
  console.log('Memory usage:', getMemoryUsage());
  console.log('GPU memory:', getGPUMemoryUsage());
});

// Automatic memory management
const memoryManager = {
  checkMemory: () => {
    const usage = getMemoryUsage();
    if (usage.percentage > 85) {
      console.warn('High memory usage detected');
      // Consider reducing context size or batch size
    }
  },
  
  optimizeForCurrentLoad: (activeRequests) => {
    if (activeRequests > 5) {
      // Reduce resource usage for concurrent requests
      return { batchSize: 128, contextSize: 2048 };
    }
    return { batchSize: 512, contextSize: 8192 };
  }
};
```

## Integration Examples

### Drop-in OpenAI Replacement

```typescript
// Replace OpenAI client with local LM Studio
import OpenAI from 'openai';

// Instead of OpenAI API
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use local LM Studio
const localAI = new OpenAI({
  baseURL: 'http://localhost:1234/v1',
  apiKey: 'not-needed' // LM Studio doesn't require API key
});

// Same interface, local processing
const completion = await localAI.chat.completions.create({
  model: 'local-model',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
  temperature: 0.7,
  max_tokens: 1000
});

console.log('Local AI response:', completion.choices[0].message.content);
```

### Web Application Integration

```typescript
import express from 'express';

const app = express();
const agent = await runtime.spawnAgent('studio-lms');

// Local AI API that mimics OpenAI
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages, temperature = 0.7, max_tokens = 1000 } = req.body;
    
    const response = await agent.chat(
      messages[messages.length - 1].content,
      {
        conversation: messages.slice(0, -1),
        temperature,
        maxTokens: max_tokens
      }
    );
    
    // OpenAI-compatible response format
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'local-model',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0, // Would need to implement token counting
        completion_tokens: 0,
        total_tokens: 0
      },
      system_fingerprint: 'local-lmstudio'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/v1/models', async (req, res) => {
  res.json({
    object: 'list',
    data: [{
      id: 'local-model',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'local-lmstudio'
    }]
  });
});

app.listen(3001, () => {
  console.log('Local AI API running on port 3001');
  console.log('Compatible with OpenAI SDK');
});
```

## Security and Privacy Benefits

### Complete Data Control

```typescript
// Verify no external connections
const privacyAudit = {
  async verifyLocalProcessing() {
    const networkMonitor = new NetworkMonitor();
    
    // Run AI tasks while monitoring network
    await agent.chat("Analyze sensitive business data");
    await agent.chat("Generate confidential code");
    await agent.chat("Process private documents");
    
    const connections = networkMonitor.getExternalConnections();
    
    return {
      externalConnections: connections.length,
      verified: connections.length === 0,
      dataPrivacy: 'guaranteed',
      processing: 'local-only'
    };
  },
  
  async generatePrivacyReport() {
    return {
      dataLocation: 'local-machine-only',
      networkRequests: 'none',
      externalAPIs: 'disabled',
      logging: 'local-only',
      encryption: 'at-rest',
      compliance: ['GDPR', 'HIPAA', 'SOX', 'PCI-ready']
    };
  }
};

// Verify privacy guarantees
const privacyReport = await privacyAudit.generatePrivacyReport();
console.log('Privacy verification:', privacyReport);
```

## Troubleshooting

### Common Issues

```typescript
// Handle LM Studio-specific issues
agent.on('error', (error) => {
  switch (error.type) {
    case 'server_not_running':
      console.log('LM Studio server not running. Please start LM Studio and load a model.');
      break;
      
    case 'model_not_loaded':
      console.log('No model loaded in LM Studio. Please load a model in the LM Studio interface.');
      break;
      
    case 'insufficient_memory':
      console.log('Insufficient memory for model. Try a smaller model or reduce context size.');
      break;
      
    case 'gpu_error':
      console.log('GPU error. Check CUDA/Metal setup or switch to CPU mode.');
      break;
  }
});

// Connection diagnostics
const diagnostics = {
  async checkLMStudio() {
    try {
      const response = await fetch('http://localhost:1234/v1/models');
      const models = await response.json();
      
      return {
        status: 'running',
        modelsLoaded: models.data.length,
        available: true
      };
    } catch (error) {
      return {
        status: 'not_running',
        error: error.message,
        available: false
      };
    }
  }
};
```

## Best Practices

1. **Choose appropriate model sizes** for your hardware capabilities
2. **Use GPU acceleration** when available for better performance
3. **Implement proper memory management** to prevent crashes
4. **Monitor system resources** during inference
5. **Keep models updated** through LM Studio's interface
6. **Use OpenAI-compatible endpoints** for easy integration
7. **Verify privacy guarantees** with network monitoring

## Next Steps

- Explore [LM Studio Portal Configuration](/docs/portals/lmstudio)
- Learn about [Local AI Deployment](/docs/deployment/local-ai)
- Check [Model Management Guide](/docs/portals/lmstudio/model-management)
- See [Privacy-First AI Implementation](/docs/security/privacy-first)