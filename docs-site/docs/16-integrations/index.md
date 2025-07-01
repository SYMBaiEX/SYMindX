---
sidebar_position: 16
sidebar_label: "Integrations"
title: "Integrations"
description: "Third-party integrations"
---

# Integrations

Third-party integrations

## Overview

SYMindX seamlessly integrates with popular AI frameworks, databases, and platforms. This modular approach allows you to leverage existing tools while maintaining the flexibility to swap components as needed. From LangChain to vector databases, SYMindX plays well with the entire AI ecosystem.

## AI Framework Integrations

### LangChain Integration

Connect SYMindX agents with LangChain's extensive toolkit:

```typescript
import { createLangChainAdapter } from '@symindx/langchain';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';

// Use LangChain LLMs with SYMindX
const langchainPortal = createLangChainAdapter({
  model: new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.7
  })
});

// Integrate LangChain tools
import { Calculator, WebBrowser } from 'langchain/tools';

export class LangChainExtension implements Extension {
  private tools: Tool[] = [];
  
  async init(context: ExtensionContext) {
    this.tools = [
      new Calculator(),
      new WebBrowser({ model: langchainPortal })
    ];
    
    // Register tools with agent
    context.agent.registerTools(this.tools);
  }
  
  async executeChain(prompt: string) {
    const chain = PromptTemplate.fromTemplate(`
      You are {agentName}. {personality}
      User: {input}
      Response:
    `) | this.model;
    
    return chain.invoke({
      agentName: this.agent.name,
      personality: this.agent.personality,
      input: prompt
    });
  }
}
```

### LlamaIndex Integration

Leverage LlamaIndex for advanced RAG capabilities:

```typescript
import { createLlamaIndexAdapter } from '@symindx/llamaindex';
import { VectorStoreIndex, SimpleDirectoryReader } from 'llamaindex';

export class LlamaIndexMemory implements MemoryProvider {
  private index: VectorStoreIndex;
  
  async initialize(config: MemoryConfig) {
    // Load documents
    const documents = await new SimpleDirectoryReader().loadData({
      directoryPath: config.documentsPath
    });
    
    // Create index
    this.index = await VectorStoreIndex.fromDocuments(documents);
  }
  
  async search(query: SearchQuery): Promise<MemoryRecord[]> {
    const queryEngine = this.index.asQueryEngine();
    const response = await queryEngine.query(query.text);
    
    return response.sourceNodes.map(node => ({
      id: node.id,
      content: node.text,
      metadata: node.metadata,
      score: node.score
    }));
  }
  
  async save(record: MemoryRecord): Promise<void> {
    // Add new document to index
    await this.index.insert(record.content, {
      id: record.id,
      ...record.metadata
    });
  }
}
```

### Model Context Protocol (MCP)

Native MCP support for standardized AI interactions:

```typescript
import { MCPServer, MCPClient } from '@symindx/mcp';

// Create MCP server for your agents
const mcpServer = new MCPServer({
  port: 3001,
  agents: runtime.agents
});

// Connect to other MCP-compatible services
const mcpClient = new MCPClient({
  url: 'mcp://localhost:3002',
  capabilities: ['text-generation', 'embeddings']
});

// Use MCP as a portal
export class MCPPortal implements Portal {
  async generateText(prompt: string, options?: GenerateOptions) {
    return mcpClient.complete({
      prompt,
      model: options?.model || 'default',
      temperature: options?.temperature || 0.7
    });
  }
}
```

## Database Integrations

### Vector Stores

Support for popular vector databases:

```typescript
// Pinecone integration
import { PineconeMemoryProvider } from '@symindx/pinecone';

const pineconeMemory = new PineconeMemoryProvider({
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'us-east-1',
  indexName: 'symindx-memories'
});

// Weaviate integration
import { WeaviateMemoryProvider } from '@symindx/weaviate';

const weaviateMemory = new WeaviateMemoryProvider({
  scheme: 'http',
  host: 'localhost:8080',
  className: 'AgentMemory'
});

// Qdrant integration
import { QdrantMemoryProvider } from '@symindx/qdrant';

const qdrantMemory = new QdrantMemoryProvider({
  url: 'http://localhost:6333',
  collectionName: 'memories'
});
```

### Traditional Databases

Beyond SQLite, support for production databases:

```typescript
// PostgreSQL with pgvector
import { PostgresMemoryProvider } from '@symindx/postgres';

const pgMemory = new PostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  vectorDimensions: 1536, // For OpenAI embeddings
  schema: 'symindx'
});

// MongoDB integration
import { MongoMemoryProvider } from '@symindx/mongodb';

const mongoMemory = new MongoMemoryProvider({
  uri: process.env.MONGODB_URI,
  database: 'symindx',
  collection: 'memories'
});

// Redis for caching and real-time
import { RedisCache } from '@symindx/redis';

const cache = new RedisCache({
  url: process.env.REDIS_URL,
  ttl: 3600, // 1 hour default
  namespace: 'symindx'
});
```

## Platform Integrations

### Communication Platforms

Built-in support for major platforms:

```typescript
// Discord integration
import { DiscordExtension } from '@symindx/discord';

const discord = new DiscordExtension({
  token: process.env.DISCORD_TOKEN,
  intents: ['Guilds', 'GuildMessages', 'MessageContent'],
  commands: {
    '/ask': async (interaction, agent) => {
      const response = await agent.think(interaction.options.getString('question'));
      await interaction.reply(response);
    }
  }
});

// Telegram integration
import { TelegramExtension } from '@symindx/telegram';

const telegram = new TelegramExtension({
  token: process.env.TELEGRAM_TOKEN,
  webhookUrl: 'https://api.mysite.com/telegram',
  commands: [
    { command: 'start', description: 'Start conversation' },
    { command: 'reset', description: 'Reset memory' }
  ]
});

// WhatsApp Business API
import { WhatsAppExtension } from '@symindx/whatsapp';

const whatsapp = new WhatsAppExtension({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: 'whatsapp:+14155238886'
});
```

### Development Tools

#### VSCode Extension

Debug and monitor agents in VSCode:

```typescript
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "symindx",
      "request": "launch",
      "name": "Debug Agent",
      "agent": "nyx",
      "env": {
        "LOG_LEVEL": "debug"
      }
    }
  ]
}
```

#### Jupyter Notebook Support

```python
# In Jupyter notebook
from symindx import Agent, Runtime

# Create runtime
runtime = Runtime.from_config('./config/runtime.json')

# Interactive agent
agent = runtime.get_agent('nyx')
response = await agent.think("Explain quantum computing")
print(response)

# Visualize agent state
agent.visualize_state()
```

## API Integrations

### REST API Adapter

Expose any REST API as an extension:

```typescript
import { createRESTAdapter } from '@symindx/rest-adapter';

const weatherExtension = createRESTAdapter({
  name: 'weather',
  baseURL: 'https://api.openweathermap.org/data/2.5',
  endpoints: {
    current: {
      path: '/weather',
      method: 'GET',
      params: ['q', 'appid'],
      transform: (data) => ({
        temperature: data.main.temp,
        description: data.weather[0].description
      })
    }
  }
});

// Use in agent
agent.use(weatherExtension);
const weather = await agent.extensions.weather.current({
  q: 'London',
  appid: process.env.OPENWEATHER_KEY
});
```

### GraphQL Integration

```typescript
import { createGraphQLAdapter } from '@symindx/graphql';

const githubExtension = createGraphQLAdapter({
  name: 'github',
  endpoint: 'https://api.github.com/graphql',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  },
  queries: {
    userRepos: `
      query($username: String!) {
        user(login: $username) {
          repositories(first: 10) {
            nodes { name, description }
          }
        }
      }
    `
  }
});
```

## Custom Integrations

### Integration Template

Create your own integrations:

```typescript
import { Integration, IntegrationConfig } from '@symindx/core';

export class MyServiceIntegration implements Integration {
  name = 'my-service';
  
  constructor(private config: IntegrationConfig) {}
  
  async connect(): Promise<void> {
    // Establish connection
    this.client = new MyServiceClient(this.config);
    await this.client.connect();
  }
  
  async disconnect(): Promise<void> {
    await this.client?.disconnect();
  }
  
  // Expose methods to agents
  async getData(query: string): Promise<any> {
    return this.client.query(query);
  }
  
  async sendData(data: any): Promise<void> {
    await this.client.send(data);
  }
}

// Register integration
runtime.registerIntegration('my-service', MyServiceIntegration);
```

### Integration Best Practices

1. **Error Handling**: Gracefully handle service outages
2. **Rate Limiting**: Respect API limits and implement backoff
3. **Caching**: Cache responses when appropriate
4. **Authentication**: Securely manage API credentials
5. **Monitoring**: Log integration health and usage

## Integration Ecosystem

SYMindX's integration ecosystem continues to grow:

- **AI/ML**: OpenAI, Anthropic, Cohere, Hugging Face
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis
- **Vector Stores**: Pinecone, Weaviate, Qdrant, Chroma
- **Communication**: Slack, Discord, Telegram, Email
- **Automation**: Zapier, IFTTT, n8n
- **Analytics**: Segment, Mixpanel, Amplitude
- **Monitoring**: Datadog, New Relic, Prometheus

## Next Steps

- Explore [LangChain Integration](./langchain) in depth
- Learn about [Vector Store](./vector-stores) options
- Set up [Database Connections](./databases)
- Build [Custom Integrations](../guides/custom-integrations)
