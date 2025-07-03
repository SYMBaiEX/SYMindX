# Google Generative AI Portal Examples

## Overview

This guide demonstrates how to use Google's Generative AI models (Gemini 2.0 Flash, Gemini 1.5 Pro) through SYMindX's Google Generative AI portal.

## Character Configuration

### Gemini - Multimodal AI Character

```json
{
  "id": "gemini-google",
  "name": "Gemini",
  "description": "Advanced multimodal AI assistant powered by Google's Gemini models",
  "enabled": false,
  
  "personality": {
    "traits": {
      "curiosity": 0.9,
      "analytical": 0.9,
      "creativity": 0.8,
      "helpfulness": 0.9,
      "precision": 0.8
    },
    "values": [
      "Comprehensive understanding",
      "Multimodal reasoning",
      "Creative problem-solving",
      "Accurate information"
    ]
  },
  
  "portals": {
    "primary": "google-generative",
    "config": {
      "google-generative": {
        "model": "gemini-2.0-flash-001",
        "temperature": 0.7,
        "max_tokens": 4096
      }
    }
  }
}
```

## Portal Configurations

### Developer-Friendly Setup

Simple API key configuration:

```json
{
  "portals": {
    "google-generative": {
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-2.0-flash-001",
      "temperature": 0.7,
      "maxTokens": 4096,
      "apiVersion": "v1",
      "streamingEnabled": true
    }
  }
}
```

### Advanced Multimodal Configuration

```json
{
  "portals": {
    "google-generative": {
      "apiKey": "${GEMINI_API_KEY}",
      "model": "gemini-1.5-pro-latest",
      "temperature": 0.7,
      "maxTokens": 8192,
      "safetySettings": [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          "category": "HARM_CATEGORY_HATE_SPEECH", 
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
        }
      ],
      "enableVision": true,
      "enableAudio": true,
      "enableVideo": true
    }
  }
}
```

## Usage Examples

### Text Generation

```typescript
import { SYMindXRuntime } from 'symindx';

const runtime = new SYMindXRuntime();
await runtime.initialize();

// Spawn Gemini agent
const agent = await runtime.spawnAgent('gemini-google');

// Creative writing with context
const story = await agent.chat(`
Write a short science fiction story about a Mars colony discovering 
an ancient artifact. Include themes of discovery and consequence.
Make it engaging and thought-provoking. Limit to 800 words.
`);

console.log(story);
```

### Vision Analysis

```typescript
// Analyze images with Gemini's vision capabilities
const imageAnalysis = await agent.chat({
  messages: [{
    role: 'user',
    content: [
      { 
        type: 'text', 
        text: 'Analyze this image. Describe what you see, identify any text, and explain the context.' 
      },
      {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/architectural-diagram.jpg'
        }
      }
    ]
  }]
});

// Document analysis
const documentAnalysis = await agent.chat({
  messages: [{
    role: 'user', 
    content: [
      { 
        type: 'text', 
        text: 'Extract all key information from this document and summarize the main points.' 
      },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...' // Base64 encoded image
        }
      }
    ]
  }]
});
```

### Long Context Processing

```typescript
// Process large documents with 2M token context
const longDocument = await agent.chat(`
Please analyze this entire research paper and provide:
1. Executive summary
2. Key findings
3. Methodology assessment  
4. Limitations and concerns
5. Practical applications

Document: ${largeDocumentText} // Up to 2M tokens
`);

// Multi-turn conversations with context retention
let conversation = [];

const turn1 = await agent.chat("Tell me about quantum computing", { conversation });
conversation.push(
  { role: 'user', content: "Tell me about quantum computing" },
  { role: 'assistant', content: turn1 }
);

const turn2 = await agent.chat("How does it compare to classical computing?", { conversation });
conversation.push(
  { role: 'user', content: "How does it compare to classical computing?" },
  { role: 'assistant', content: turn2 }
);

const turn3 = await agent.chat("What are the current limitations?", { conversation });
```

## Advanced Features

### Function Calling

```typescript
// Define tools for Gemini
const tools = {
  weatherLookup: {
    description: 'Get current weather information for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and country' },
        units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' }
      },
      required: ['location']
    },
    execute: async ({ location, units = 'metric' }) => {
      // Weather API implementation
      return {
        location,
        temperature: 22,
        condition: 'Partly cloudy',
        humidity: 65,
        units
      };
    }
  },

  codeAnalyzer: {
    description: 'Analyze code for issues and improvements',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        language: { type: 'string' },
        checkTypes: { 
          type: 'array', 
          items: { type: 'string' },
          default: ['bugs', 'performance', 'security', 'style']
        }
      },
      required: ['code', 'language']
    },
    execute: async ({ code, language, checkTypes }) => {
      // Code analysis implementation
      return {
        issues: [],
        suggestions: [],
        score: 85,
        language
      };
    }
  }
};

// Use tools in conversation
const response = await agent.chat(
  "What's the weather in Tokyo and can you analyze this Python code for issues?",
  { tools }
);
```

### Multimodal Reasoning

```typescript
// Combine text, image, and video analysis
const multimodalAnalysis = await agent.chat({
  messages: [{
    role: 'user',
    content: [
      { 
        type: 'text', 
        text: 'Compare these architectural styles and explain the historical context. Include the video for temporal analysis.' 
      },
      {
        type: 'image_url',
        image_url: { url: 'https://example.com/gothic-cathedral.jpg' }
      },
      {
        type: 'image_url', 
        image_url: { url: 'https://example.com/modern-building.jpg' }
      },
      {
        type: 'video_url',
        video_url: { url: 'https://example.com/architecture-evolution.mp4' }
      }
    ]
  }]
});
```

### Code Generation and Review

```typescript
// Advanced code generation with context
const codeGeneration = await agent.chat(`
Create a complete TypeScript microservice that:
1. Provides a REST API for user management
2. Uses JWT authentication
3. Connects to PostgreSQL
4. Includes proper error handling
5. Has comprehensive unit tests
6. Uses modern best practices

Include:
- Project structure
- Dependencies (package.json)
- Main application code
- Database models
- Test files
- Docker configuration
- README with setup instructions
`);

// Architectural review
const architecturalReview = await agent.chat(`
Review this system architecture for a high-traffic e-commerce platform:

[Include system diagram or detailed description]

Analyze:
- Scalability bottlenecks
- Security vulnerabilities
- Performance optimization opportunities
- Cost optimization strategies
- Reliability and fault tolerance
- Monitoring and observability gaps

Provide specific recommendations with implementation details.
`);
```

## Real-World Applications

### Educational Assistant

```typescript
// Comprehensive tutoring with visual aids
const tutor = await runtime.spawnAgent('gemini-google', {
  systemPrompt: 'You are an expert tutor who can analyze visual materials and provide detailed explanations.'
});

const lesson = await tutor.chat({
  messages: [{
    role: 'user',
    content: [
      { 
        type: 'text', 
        text: 'Explain the concepts shown in this physics diagram. Break it down step by step for a high school student.' 
      },
      {
        type: 'image_url',
        image_url: { url: 'https://example.com/physics-diagram.png' }
      }
    ]
  }]
});
```

### Content Creation

```typescript
// Multi-format content generation
const contentCreator = await agent.chat(`
Create a comprehensive marketing campaign for a new sustainable fashion brand:

1. Brand positioning statement
2. Target audience analysis
3. Key messaging framework
4. Social media content calendar (1 month)
5. Blog post ideas (10 topics)
6. Email marketing sequence (5 emails)
7. Influencer collaboration strategy
8. Performance metrics to track

Make it creative, authentic, and aligned with sustainability values.
`);
```

### Research Assistant

```typescript
// Academic research with source analysis
const research = await agent.chat(`
Conduct a literature review on "AI Ethics in Healthcare Applications":

1. Define key themes and concepts
2. Identify major research areas
3. Summarize key findings from recent studies
4. Highlight gaps in current research
5. Suggest future research directions
6. Create a bibliography of essential papers

Focus on papers from 2020-2025. Organize by themes and provide critical analysis.
`);
```

## Performance Characteristics

| Feature | Gemini 2.0 Flash | Gemini 1.5 Pro |
|---------|------------------|-----------------|
| Speed | Very Fast (1-3s) | Fast (2-5s) |
| Context | 1M tokens | 2M tokens |
| Multimodal | Excellent | Excellent |
| Reasoning | Good | Excellent |
| Code Generation | Good | Excellent |
| Cost | Lower | Higher |

## Integration Examples

### Document Processing Service

```typescript
import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ dest: 'uploads/' });
const agent = await runtime.spawnAgent('gemini-google');

app.post('/analyze-document', upload.single('document'), async (req, res) => {
  try {
    const { analysisType } = req.body;
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    
    const analysis = await agent.chat({
      messages: [{
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: `Perform ${analysisType} analysis on this document. Extract all relevant information and provide structured output.` 
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${req.file.mimetype};base64,${base64Image}`
            }
          }
        ]
      }]
    });
    
    res.json({ analysis, type: analysisType });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Educational Platform

```typescript
// Interactive learning with visual content
const educationalBot = await runtime.spawnAgent('gemini-google', {
  extensions: [
    new WebUIExtension({
      enableImageUpload: true,
      enableVideoUpload: true
    })
  ]
});

// Automatically analyze uploaded educational content
educationalBot.on('mediaUpload', async (media) => {
  const explanation = await educationalBot.chat({
    messages: [{
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: 'Explain the educational concepts in this content. Make it accessible for the target learning level.' 
        },
        {
          type: media.type === 'image' ? 'image_url' : 'video_url',
          [media.type === 'image' ? 'image_url' : 'video_url']: { url: media.url }
        }
      ]
    }]
  });
  
  return explanation;
});
```

## Safety and Content Filtering

### Safety Configuration

```typescript
// Configure content safety settings
const safeAgent = await runtime.spawnAgent('gemini-google', {
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
});
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   ```bash
   # Get your API key from Google AI Studio
   export GEMINI_API_KEY="your-api-key-here"
   
   # Verify access
   curl -H "x-goog-api-key: $GEMINI_API_KEY" \
        "https://generativelanguage.googleapis.com/v1/models"
   ```

2. **Context Length Exceeded**
   ```typescript
   // Handle large inputs
   const chunkLargeInput = (text, maxTokens = 1000000) => {
     // Implementation to chunk large inputs
     return chunks;
   };
   ```

3. **Safety Blocks**
   ```typescript
   // Handle safety filtering
   agent.on('safetyBlock', (event) => {
     console.log('Content blocked for safety:', event.category);
     // Implement fallback or content modification
   });
   ```

### Debug Configuration

```json
{
  "portals": {
    "google-generative": {
      "debug": true,
      "logRequests": true,
      "logSafetyChecks": true,
      "enableMetrics": true
    }
  }
}
```

## Best Practices

1. **Use appropriate models** for your use case (Flash for speed, Pro for quality)
2. **Implement safety filtering** for production applications
3. **Optimize context usage** for cost efficiency
4. **Cache responses** where appropriate
5. **Handle multimodal content** properly with proper encoding
6. **Monitor usage** and implement rate limiting

## Next Steps

- Explore [Google Generative AI Portal Configuration](/docs/portals/google-generative)
- Learn about [Multimodal AI Processing](/docs/advanced-topics/multimodal)
- Check [Vision Analysis Guide](/docs/portals/google-generative/vision)
- See [Safety and Content Filtering](/docs/portals/google-generative/safety)