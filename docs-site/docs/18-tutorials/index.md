---
sidebar_position: 18
sidebar_label: "Tutorials"
title: "Tutorials"
description: "Step-by-step tutorials"
---

# Tutorials

Step-by-step tutorials

## Overview

Master SYMindX through hands-on tutorials that guide you from basic concepts to advanced implementations. Each tutorial includes complete code examples, explanations, and exercises to reinforce your learning. Whether you're building your first agent or implementing complex multi-agent systems, these tutorials will help you succeed.

## Getting Started Tutorials

### Tutorial 1: Your First SYMindX Agent

**Duration**: 15 minutes | **Level**: Beginner

Learn the fundamentals by creating a simple conversational agent.

**What you'll learn:**
- Setting up SYMindX environment
- Creating your first agent
- Basic agent interactions
- Understanding agent lifecycle

```typescript
// Step 1: Import SYMindX
import { SYMindX } from '@symindx/core';

// Step 2: Create an agent configuration
const agentConfig = {
  id: 'hello-agent',
  name: 'Hello Bot',
  personality: {
    traits: ['friendly', 'helpful'],
    background: 'A simple greeting bot'
  }
};

// Step 3: Initialize and interact
async function main() {
  const runtime = new SYMindX.Runtime();
  const agent = await runtime.createAgent(agentConfig);
  
  const response = await agent.think("Hello! How are you?");
  console.log('Agent says:', response);
  
  await runtime.shutdown();
}

main();
```

**Exercise**: Modify the agent to have different personality traits and observe how responses change.

### Tutorial 2: Adding Memory to Your Agent

**Duration**: 30 minutes | **Level**: Beginner

Enable your agent to remember conversations and facts.

**What you'll learn:**
- Configuring memory providers
- Storing and retrieving memories
- Memory search patterns
- Context-aware responses

```typescript
// Step 1: Configure agent with memory
const memoryAgent = await SYMindX.createAgent({
  id: 'memory-agent',
  name: 'Memory Bot',
  modules: {
    memory: {
      provider: 'sqlite',
      config: {
        dbPath: './tutorial-memories.db'
      }
    }
  }
});

// Step 2: Teaching the agent
await memoryAgent.remember("The user's name is Alice");
await memoryAgent.remember("Alice likes programming and coffee");

// Step 3: Testing memory recall
const response = await memoryAgent.think("What do you know about me?");
console.log(response); // Will mention Alice, programming, and coffee

// Step 4: Contextual memory search
const memories = await memoryAgent.memory.search({
  query: "coffee",
  limit: 5
});
console.log('Related memories:', memories);
```

**Exercise**: Implement a simple learning loop where the agent asks questions and remembers the answers.

### Tutorial 3: Building an Emotional Agent

**Duration**: 45 minutes | **Level**: Intermediate

Create agents that process and express emotions.

**What you'll learn:**
- Emotion module configuration
- Emotional state management
- Emotion-driven responses
- Mood tracking over time

```typescript
// Step 1: Create emotionally-aware agent
const emotionalAgent = await SYMindX.createAgent({
  id: 'emotion-bot',
  name: 'Empathy Bot',
  personality: {
    traits: ['empathetic', 'caring', 'responsive']
  },
  modules: {
    emotion: {
      provider: 'rune_emotion_stack',
      config: {
        baselineHappiness: 60,
        emotionalVolatility: 0.4,
        empathyLevel: 0.8
      }
    }
  }
});

// Step 2: Monitor emotional changes
emotionalAgent.on('emotion-change', (state) => {
  console.log('Emotional state:', {
    happiness: state.happiness,
    energy: state.energy,
    stress: state.stress
  });
});

// Step 3: Emotional interactions
const scenarios = [
  { text: "I got promoted today!", sentiment: 'positive' },
  { text: "I'm feeling overwhelmed", sentiment: 'negative' },
  { text: "Just a normal day", sentiment: 'neutral' }
];

for (const scenario of scenarios) {
  console.log(`\nUser: ${scenario.text}`);
  
  await emotionalAgent.perceive({
    event: 'user-message',
    data: scenario.text,
    sentiment: scenario.sentiment
  });
  
  const response = await emotionalAgent.respond();
  console.log(`Agent: ${response}`);
}
```

**Exercise**: Create an emotional journal where the agent tracks its mood over time and can reflect on emotional patterns.

## Intermediate Tutorials

### Tutorial 4: Multi-Agent Communication

**Duration**: 1 hour | **Level**: Intermediate

Build a system where multiple agents collaborate.

**What you'll learn:**
- Creating multiple specialized agents
- Inter-agent communication
- Task delegation
- Consensus building

```typescript
// Step 1: Define specialized agents
const agents = {
  researcher: await SYMindX.createAgent({
    id: 'researcher',
    name: 'Research Bot',
    personality: { traits: ['analytical', 'thorough'] },
    skills: ['web_search', 'summarization']
  }),
  
  writer: await SYMindX.createAgent({
    id: 'writer',
    name: 'Writing Bot',
    personality: { traits: ['creative', 'articulate'] },
    skills: ['content_generation', 'editing']
  }),
  
  editor: await SYMindX.createAgent({
    id: 'editor',
    name: 'Editor Bot',
    personality: { traits: ['meticulous', 'critical'] },
    skills: ['proofreading', 'fact_checking']
  })
};

// Step 2: Set up communication channel
const teamChannel = new SYMindX.EventBus();
Object.values(agents).forEach(agent => {
  agent.joinChannel(teamChannel);
});

// Step 3: Collaborative task
async function createArticle(topic: string) {
  // Research phase
  await agents.researcher.broadcast({
    type: 'task',
    action: 'research',
    topic: topic
  });
  
  const research = await agents.researcher.think(
    `Research key points about: ${topic}`
  );
  
  // Writing phase
  await agents.writer.broadcast({
    type: 'task',
    action: 'write',
    research: research
  });
  
  const draft = await agents.writer.think(
    `Write an article based on: ${research}`
  );
  
  // Editing phase
  await agents.editor.broadcast({
    type: 'task',
    action: 'edit',
    draft: draft
  });
  
  const finalArticle = await agents.editor.think(
    `Edit and improve: ${draft}`
  );
  
  return finalArticle;
}

// Step 4: Execute collaborative task
const article = await createArticle("The Future of AI");
console.log('Final article:', article);
```

**Exercise**: Add a reviewer agent that provides feedback before final approval.

### Tutorial 5: Building Custom Extensions

**Duration**: 1.5 hours | **Level**: Intermediate

Create your own extension to add new capabilities.

**What you'll learn:**
- Extension architecture
- Implementing the Extension interface
- Registering custom behaviors
- Testing extensions

```typescript
// Step 1: Define custom extension
export class WeatherExtension implements Extension {
  name = 'weather';
  private apiKey: string;
  private cache = new Map<string, WeatherData>();
  
  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
  }
  
  async init(context: ExtensionContext): Promise<void> {
    // Register with agent
    context.agent.registerTool('get_weather', this.getWeather.bind(this));
    context.agent.registerTool('weather_forecast', this.getForecast.bind(this));
    
    // Set up periodic updates
    setInterval(() => this.updateCache(), 3600000); // Every hour
  }
  
  async tick(deltaTime: number): Promise<void> {
    // Check for weather alerts
    const alerts = await this.checkAlerts();
    if (alerts.length > 0) {
      this.context.agent.notify({
        type: 'weather-alert',
        alerts
      });
    }
  }
  
  private async getWeather(location: string): Promise<WeatherData> {
    // Check cache first
    const cached = this.cache.get(location);
    if (cached && Date.now() - cached.timestamp < 600000) { // 10 minutes
      return cached;
    }
    
    // Fetch fresh data
    const response = await fetch(
      `https://api.weather.com/v1/current?location=${location}&key=${this.apiKey}`
    );
    const data = await response.json();
    
    // Cache and return
    this.cache.set(location, { ...data, timestamp: Date.now() });
    return data;
  }
}

// Step 2: Use the extension
const weatherAgent = await SYMindX.createAgent({
  id: 'weather-bot',
  name: 'Weather Assistant',
  extensions: [
    new WeatherExtension({ 
      apiKey: process.env.WEATHER_API_KEY 
    })
  ]
});

// Step 3: Weather-aware conversations
const response = await weatherAgent.think(
  "Should I bring an umbrella to Seattle today?"
);
// Agent will use weather tool to check conditions
```

**Exercise**: Extend the weather extension to provide clothing recommendations based on weather conditions.

## Advanced Tutorials

### Tutorial 6: Implementing Custom AI Portals

**Duration**: 2 hours | **Level**: Advanced

Create custom integrations with AI providers.

**What you'll learn:**
- Portal interface implementation
- Streaming responses
- Error handling and retries
- Performance optimization

```typescript
// Step 1: Implement custom portal
export class CustomLLMPortal implements Portal {
  private client: CustomLLMClient;
  private tokenCounter: TokenCounter;
  
  async initialize(config: PortalConfig): Promise<void> {
    this.client = new CustomLLMClient({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      timeout: config.timeout || 30000
    });
    
    this.tokenCounter = new TokenCounter(config.model);
  }
  
  async generateText(
    prompt: string, 
    options?: GenerateOptions
  ): Promise<string> {
    const tokens = this.tokenCounter.count(prompt);
    
    if (tokens > options?.maxInputTokens) {
      throw new Error(`Prompt too long: ${tokens} tokens`);
    }
    
    try {
      const response = await this.client.complete({
        prompt,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 1.0,
        stream: false
      });
      
      return response.text;
    } catch (error) {
      if (error.code === 'RATE_LIMIT') {
        await this.handleRateLimit(error);
        return this.generateText(prompt, options); // Retry
      }
      throw error;
    }
  }
  
  async *streamText(
    prompt: string, 
    options?: StreamOptions
  ): AsyncIterable<string> {
    const stream = await this.client.completeStream({
      prompt,
      ...options
    });
    
    for await (const chunk of stream) {
      yield chunk.text;
    }
  }
  
  private async handleRateLimit(error: any): Promise<void> {
    const retryAfter = error.retryAfter || 60;
    console.log(`Rate limited. Waiting ${retryAfter}s...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
}

// Step 2: Register and use portal
SYMindX.registerPortal('custom-llm', CustomLLMPortal);

const agent = await SYMindX.createAgent({
  id: 'custom-ai',
  modules: {
    portal: {
      provider: 'custom-llm',
      config: {
        endpoint: 'https://api.custom-llm.com',
        apiKey: process.env.CUSTOM_LLM_KEY,
        model: 'custom-model-7b'
      }
    }
  }
});
```

**Exercise**: Add support for function calling in your custom portal.

### Tutorial 7: Production Deployment

**Duration**: 2 hours | **Level**: Advanced

Deploy SYMindX agents to production.

**What you'll learn:**
- Production configuration
- Monitoring and logging
- Scaling strategies
- Security best practices

```typescript
// Step 1: Production configuration
export const productionConfig = {
  runtime: {
    mode: 'production',
    tickInterval: 1000,
    maxAgents: 100
  },
  
  monitoring: {
    provider: 'datadog',
    apiKey: process.env.DATADOG_API_KEY,
    metrics: ['cpu', 'memory', 'response_time', 'error_rate']
  },
  
  logging: {
    level: 'info',
    outputs: [
      { type: 'file', path: '/var/log/symindx/app.log' },
      { type: 'syslog', facility: 'local0' },
      { type: 'cloudwatch', logGroup: '/aws/symindx' }
    ]
  },
  
  security: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyRotation: 86400000 // 24 hours
    },
    authentication: {
      provider: 'jwt',
      secret: process.env.JWT_SECRET,
      expiry: 3600
    }
  }
};

// Step 2: Production runtime with monitoring
class ProductionRuntime extends SYMindX.Runtime {
  private monitor: MonitoringService;
  private healthCheck: HealthCheckService;
  
  async initialize() {
    await super.initialize();
    
    // Set up monitoring
    this.monitor = new MonitoringService(productionConfig.monitoring);
    await this.monitor.start();
    
    // Health checks
    this.healthCheck = new HealthCheckService({
      interval: 30000,
      checks: [
        { name: 'database', fn: this.checkDatabase },
        { name: 'memory', fn: this.checkMemory },
        { name: 'agents', fn: this.checkAgents }
      ]
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
  }
  
  private async gracefulShutdown() {
    console.log('Shutting down gracefully...');
    
    // Stop accepting new requests
    this.acceptingRequests = false;
    
    // Wait for ongoing operations
    await this.waitForPendingOperations(30000);
    
    // Save state
    await this.saveState();
    
    // Shutdown agents
    await this.shutdownAgents();
    
    process.exit(0);
  }
}
```

**Exercise**: Implement auto-scaling based on load metrics.

## Next Steps

After completing these tutorials, you'll be ready to:

- Build production-ready AI agents
- Create custom extensions and integrations
- Design multi-agent systems
- Contribute to the SYMindX ecosystem

### Continue Learning

- [Advanced Tutorials](./advanced-tutorials) - Deep dive into complex topics
- [Video Tutorials](./video-tutorials) - Visual learning resources
- [Interactive Playground](https://playground.symindx.com) - Experiment online
- [Community Projects](../community/showcase) - Learn from others

### Get Help

- Join our [Discord](../community/discord) for real-time help
- Post questions on [Stack Overflow](https://stackoverflow.com/questions/tagged/symindx)
- Check the [FAQ](../support/faq) for common questions

Happy learning with SYMindX!
