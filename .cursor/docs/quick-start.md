# SYMindX Quick Start Guide

Welcome to SYMindX! This guide will get you up and running with the intelligent AI agent framework in under 10 minutes.

## What is SYMindX?

SYMindX is a modular, extensible AI agent framework built with TypeScript and Bun. It provides:

- **Multi-Provider AI Portal System**: Support for 15+ AI providers (OpenAI, Anthropic, Groq, xAI, Google, etc.)
- **Pluggable Memory System**: Multiple storage backends (SQLite, PostgreSQL, Supabase, Neon)
- **Emotion System**: 11 distinct emotions inspired by RuneScape
- **Platform Extensions**: Discord, Telegram, Slack, API integrations
- **Hot-Swappable Modules**: Memory, emotion, and cognition modules
- **Real-time Web Interface**: React dashboard with live monitoring

## Prerequisites

Before you begin, ensure you have:

- **Bun**: v1.0.0 or higher ([Install Bun](https://bun.sh/docs/installation))
- **Node.js**: v18.0.0 or higher (for compatibility)
- **Git**: For cloning the repository
- **AI Provider API Keys**: At least one (OpenAI, Anthropic, etc.)

### System Requirements

```bash
# Minimum system requirements
OS: Linux, macOS, or Windows (WSL2)
RAM: 2GB minimum, 4GB recommended
Storage: 1GB free space
Network: Internet connection for AI provider APIs
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/symindx.git
cd symindx
```

### 2. Install Dependencies

```bash
# Install all project dependencies
bun install

# Verify installation
bun --version
bun run type-check
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your API keys (use your preferred editor)
nano .env.local
```

**Required Environment Variables:**

```bash
# AI Provider API Keys (at least one required)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# Database Configuration
DATABASE_URL=sqlite:data/symindx.db

# Optional: Platform Extensions
DISCORD_TOKEN=your_discord_bot_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

### 4. Database Setup

```bash
# Initialize database schema
bun run db:setup

# Run database migrations
bun run db:migrate

# Verify database setup
bun run db:status
```

## First Agent

Let's create your first SYMindX agent in under 5 minutes!

### 1. Basic Agent Creation

Create a new file `my-first-agent.ts`:

```typescript
import { SYMindXAgent } from './src/core/agent.js';
import { createOpenAIPortal } from './src/portals/openai-portal.js';
import { createSQLiteMemory } from './src/memory/sqlite-memory.js';

async function createMyFirstAgent() {
  // Create an agent with OpenAI and SQLite memory
  const agent = new SYMindXAgent({
    name: 'MyFirstAgent',
    description: 'My first SYMindX AI agent',
    
    // AI Portal Configuration
    portal: createOpenAIPortal({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview',
      temperature: 0.7
    }),
    
    // Memory Configuration
    memory: createSQLiteMemory({
      database: 'data/my-agent-memory.db'
    }),
    
    // Character Configuration
    character: {
      personality: 'helpful and friendly',
      background: 'A helpful AI assistant',
      emotions: ['happy', 'confident']
    }
  });

  // Initialize the agent
  await agent.initialize();
  console.log('✅ Agent initialized successfully!');

  return agent;
}

async function main() {
  try {
    const agent = await createMyFirstAgent();
    
    // Test basic chat
    const response = await agent.chat('Hello! What can you help me with?');
    console.log('Agent response:', response);
    
    // Test memory storage
    await agent.remember('The user likes helpful AI assistants');
    console.log('✅ Memory stored successfully!');
    
    // Test memory retrieval
    const memories = await agent.recall('user preferences');
    console.log('Recalled memories:', memories);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the example
main();
```

### 2. Run Your First Agent

```bash
# Make the file executable and run it
bun run my-first-agent.ts
```

Expected output:
```
✅ Agent initialized successfully!
Agent response: Hello! I'm here to help you with anything you need...
✅ Memory stored successfully!
Recalled memories: [{ content: "The user likes helpful AI assistants", ... }]
```

## Key Concepts

### 1. Agent Architecture

```
SYMindX Agent
├── Core Runtime (lifecycle management)
├── AI Portal (provider abstraction)
├── Memory System (storage & retrieval)
├── Emotion System (11 emotions)
├── Cognition Module (planning & reasoning)
└── Extensions (platform integrations)
```

### 2. AI Portal System

SYMindX uses a unified portal system for AI providers:

```typescript
// Switch between providers easily
const openaiPortal = createOpenAIPortal({ /* config */ });
const anthropicPortal = createAnthropicPortal({ /* config */ });
const groqPortal = createGroqPortal({ /* config */ });

// Use with any agent
const agent = new SYMindXAgent({
  portal: openaiPortal, // or anthropicPortal, groqPortal, etc.
  // ... other config
});
```

### 3. Memory System

Multiple memory providers with consistent API:

```typescript
// SQLite (local, fast)
const sqliteMemory = createSQLiteMemory({
  database: 'data/memory.db'
});

// PostgreSQL (scalable)
const postgresMemory = createPostgreSQLMemory({
  connectionString: 'postgresql://...'
});

// Supabase (managed)
const supabaseMemory = createSupabaseMemory({
  url: 'https://your-project.supabase.co',
  key: 'your-anon-key'
});
```

### 4. Emotion System

11 distinct emotions that affect agent behavior:

```typescript
const emotions = [
  'happy', 'sad', 'angry', 'excited', 'calm',
  'confused', 'confident', 'worried', 'playful',
  'serious', 'grateful'
];

// Emotions influence responses
agent.setEmotion('excited');
await agent.chat('Tell me about space exploration!');
```

## Development Workflow

### 1. Project Structure

```
symindx/
├── src/
│   ├── core/           # Core agent runtime
│   ├── portals/        # AI provider integrations
│   ├── memory/         # Memory storage providers
│   ├── extensions/     # Platform integrations
│   ├── emotions/       # Emotion system
│   ├── cognition/      # Planning and reasoning
│   └── utils/          # Utilities and helpers
├── web/               # React web interface
├── tests/             # Test suites
├── docs/              # Documentation
└── examples/          # Example implementations
```

### 2. Development Commands

```bash
# Development server with hot reload
bun dev

# Run tests
bun test

# Type checking
bun run type-check

# Linting and formatting
bun run lint
bun run format

# Build for production
bun run build

# Start production server
bun start
```

### 3. Web Interface

SYMindX includes a React web interface for monitoring and control:

```bash
# Start web interface (runs on http://localhost:3000)
bun run web:dev

# Or build and serve
bun run web:build
bun run web:serve
```

## Common Use Cases

### 1. Chat Assistant

```typescript
const chatAgent = new SYMindXAgent({
  portal: createOpenAIPortal({ model: 'gpt-4-turbo-preview' }),
  character: {
    personality: 'helpful and knowledgeable',
    role: 'personal assistant'
  }
});

await chatAgent.initialize();
const response = await chatAgent.chat('Plan my day');
```

### 2. Discord Bot

```typescript
import { createDiscordExtension } from './src/extensions/discord-extension.js';

const discordAgent = new SYMindXAgent({
  portal: createAnthropicPortal({ model: 'claude-3-5-sonnet-20241022' }),
  extensions: [
    createDiscordExtension({
      token: process.env.DISCORD_TOKEN!,
      guildId: 'your-server-id'
    })
  ]
});
```

### 3. Memory-Enhanced Agent

```typescript
const memoryAgent = new SYMindXAgent({
  portal: createGroqPortal({ model: 'llama-3.1-70b-versatile' }),
  memory: createSupabaseMemory({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_ANON_KEY!
  })
});

// Agent will remember context across conversations
await memoryAgent.chat('My name is Alice');
// Later...
await memoryAgent.chat('What\'s my name?'); // "Your name is Alice"
```

## Next Steps

### 1. Explore Examples

```bash
# Run example agents
cd examples/
bun run basic-agent.ts
bun run discord-bot.ts
bun run memory-demo.ts
```

### 2. Read the Documentation

- [Architecture Guide](./architecture.md) - System design and patterns
- [API Reference](./api-reference.md) - Detailed API documentation
- [Configuration Guide](./configuration.md) - Environment and config options
- [Extension Development](./extension-development.md) - Create custom extensions
- [Deployment Guide](./deployment.md) - Production deployment

### 3. Join the Community

- **GitHub**: [Issues and Discussions](https://github.com/your-org/symindx)
- **Discord**: [Community Server](https://discord.gg/symindx)
- **Twitter**: [@SYMindX](https://twitter.com/symindx)

### 4. Advanced Features

Once you're comfortable with the basics, explore:

- **Multi-Agent Systems**: Coordinate multiple agents
- **Custom Portals**: Add new AI providers
- **Custom Memory**: Implement new storage backends
- **Emotion Modeling**: Advanced emotion-driven behaviors
- **Cognitive Planning**: HTN planning and reasoning
- **Real-time Monitoring**: Web dashboard and metrics

## Troubleshooting

### Common Issues

**Agent fails to initialize:**
```bash
# Check API keys
env | grep API_KEY

# Validate configuration
bun run config:validate

# Check logs
tail -f logs/app.log
```

**Memory errors:**
```bash
# Check database
bun run db:status

# Reset database
bun run db:reset
```

**Portal connection issues:**
```bash
# Test connectivity
bun run test:portals

# Check API status
curl -I https://api.openai.com/v1/models
```

### Getting Help

1. **Check the logs**: `logs/app.log` contains detailed error information
2. **Run diagnostics**: `bun run diagnose` for system health check
3. **Search GitHub Issues**: Common problems may already be solved
4. **Ask in Discord**: Community support available
5. **Create an Issue**: For bugs or feature requests

## What's Next?

You now have a working SYMindX agent! Here are some suggested next steps:

1. **Experiment with different AI providers** - Try Anthropic Claude or Groq Llama
2. **Add platform integrations** - Connect to Discord, Telegram, or Slack
3. **Explore emotion system** - See how emotions affect agent behavior
4. **Build custom extensions** - Create your own platform integrations
5. **Deploy to production** - Use Docker for scalable deployment

Welcome to the SYMindX community! 🚀 