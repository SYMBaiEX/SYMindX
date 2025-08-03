# 🧠 SYMindX - Next-Generation AI Agent Framework

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![AI SDK](https://img.shields.io/badge/AI%20SDK-5.0-blue)](https://sdk.vercel.ai/)

## Build intelligent AI agents with skill-based architecture, emotional awareness, and enterprise-grade security

[Documentation](./mind-agents/docs/) • [Quick Start](#-quick-start) • [Features](#-key-features) • [Architecture](#-architecture) • [API Reference](#-api-reference)

</div>

---

## ✨ Overview

SYMindX is a production-ready AI agent framework that creates intelligent agents with emotional awareness, persistent memory, and multi-platform capabilities. Built with a modular skill-based architecture and powered by AI SDK v5, agents provide sophisticated responses through a reactive design pattern.

**Current Version: v2.1.0** - Major architectural refactoring with enhanced security and skill-based extensions

## 🏗️ Architecture

### 🎯 Skill-Based Extension System

SYMindX now features a revolutionary skill-based architecture where each extension is composed of specialized skills:

```
Extensions/
├── 💬 Slack Extension
│   ├── Messaging Skill
│   ├── Channel Management Skill
│   ├── Thread Management Skill
│   ├── Reaction Management Skill
│   └── Workspace Management Skill
│
├── 🐦 Twitter Extension
│   ├── Tweet Skill
│   ├── Engagement Skill
│   ├── Analytics Skill
│   ├── Relationship Skill
│   └── Trends Skill
│
├── 📱 Telegram Extension
│   ├── Direct Messaging Skill
│   ├── Group Management Skill
│   ├── Content Sharing Skill
│   ├── Community Building Skill
│   └── Moderation Skill
│
├── 🎮 RuneLite Extension
│   ├── Skill Trainer
│   ├── Quest Manager
│   ├── Economic Manager
│   ├── PvP Manager
│   └── Social Manager
│
└── 🔌 MCP Server Extension
    ├── Agent Communication Skill
    └── Memory Management Skill
```

### 📁 Project Structure

```
symindx/
├── 🎯 .kiro/                    # Architecture & Steering Documents
│   ├── specs/                   # Technical specifications
│   │   └── symindx-architecture-cleanup/
│   │       ├── design.md       # Architectural design decisions
│   │       ├── requirements.md # System requirements
│   │       └── tasks.md        # Implementation tasks
│   └── steering/               # Project governance
│       ├── product.md          # Product vision & roadmap
│       ├── structure.md        # Organizational structure
│       └── tech.md            # Technical strategy
│
├── 🧠 mind-agents/             # Core Agent Runtime
│   ├── src/
│   │   ├── 🏗️ core/           # Core Systems
│   │   │   ├── runtime.ts      # Main orchestrator
│   │   │   ├── registry.ts     # Enhanced type-safe registry
│   │   │   ├── event-bus.ts    # Improved event system
│   │   │   ├── activity-scheduler.ts # New activity system
│   │   │   ├── cross-platform-learning-engine.ts
│   │   │   ├── goal-management-system.ts
│   │   │   ├── unified-context-system.ts
│   │   │   └── 🛡️ security/   # Enterprise Security
│   │   │       ├── jwt-auth.ts
│   │   │       ├── https-server.ts
│   │   │       ├── input-validator.ts
│   │   │       ├── config-manager.ts
│   │   │       └── secure-server-example.ts
│   │   │
│   │   ├── 🧩 modules/         # AI Modules
│   │   │   ├── 💾 memory/      # Memory Providers
│   │   │   │   ├── agentic-rag-provider.ts # NEW RAG provider
│   │   │   │   └── providers/
│   │   │   ├── 🎭 emotion/     # Streamlined Emotions
│   │   │   │   ├── happy/
│   │   │   │   ├── sad/
│   │   │   │   ├── angry/
│   │   │   │   ├── confident/
│   │   │   │   └── neutral/
│   │   │   └── 🧠 cognition/   # Enhanced Cognition
│   │   │       └── enhanced-unified-cognition.ts
│   │   │
│   │   ├── 🔌 extensions/      # Skill-Based Extensions
│   │   │   ├── 💬 slack/       # Full Slack integration
│   │   │   │   └── skills/
│   │   │   ├── 🐦 twitter/     # Twitter bot with skills
│   │   │   │   └── skills/
│   │   │   ├── 📱 telegram/    # Enhanced Telegram
│   │   │   │   └── skills/
│   │   │   ├── 🎮 runelite/    # Game integration
│   │   │   │   ├── skills/
│   │   │   │   └── communication/
│   │   │   ├── 💬 communication/ # Context management
│   │   │   │   └── skills/
│   │   │   └── 🔌 mcp-server/  # MCP with skills
│   │   │       └── skills/
│   │   │
│   │   ├── 🌐 portals/         # Streamlined AI Providers
│   │   │   ├── streamlined-portal-manager.ts
│   │   │   └── [15+ AI providers]
│   │   │
│   │   └── 📊 types/           # Comprehensive Type System
│   │       └── Enhanced type definitions
│   │
│   └── 📝 scripts/             # Build & Utility Scripts
│       ├── simple-build.ts/cjs/js
│       └── webpack-optimized-build.js
│
├── 🌐 website/                 # React Dashboard
└── 📦 package.json            # Monorepo configuration
```

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** (recommended) or Node.js 18+
- At least one AI provider API key (OpenAI, Anthropic, Groq, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/SYMBaiEX/symindx.git
cd symindx

# Install dependencies
bun install

# Copy configuration
cp mind-agents/src/core/config/runtime.example.json mind-agents/src/core/config/runtime.json
```

### Configuration

Edit `mind-agents/src/core/config/runtime.json` with your API keys:

```json
{
  "portals": {
    "apiKeys": {
      "openai": "sk-...",
      "groq": "gsk_...",
      "anthropic": "sk-ant-...",
      "google": "your-google-api-key"
    },
    "default": "groq",
    "models": {
      "chat": "llama-3.3-70b-versatile",
      "tools": "llama-3.3-70b-versatile"
    }
  }
}
```

### Running

```bash
# Start the agent system
bun start

# Development mode (with auto-reload)
bun dev

# Interactive CLI
bun cli

# Web dashboard
bun dev:website
```

## 🎯 Key Features

### **🏗️ Skill-Based Architecture**

- **Modular Skills**: Each extension composed of specialized, reusable skills
- **Skill Manager**: Centralized skill orchestration and lifecycle management
- **Base Skill Classes**: Standardized interfaces for consistent behavior
- **Hot-swappable Skills**: Add/remove skills without system restart

### **🛡️ Enterprise Security**

- **JWT Authentication**: Secure token-based auth system
- **HTTPS Server**: Production-ready secure server implementation
- **Input Validation**: Comprehensive request validation
- **Config Management**: Secure configuration handling
- **Rate Limiting**: Built-in rate limiting and DDoS protection

### **🎭 Streamlined Emotion System**

- **Core Emotions**: Happy, Sad, Angry, Confident, Neutral
- **Composite Management**: Advanced emotion blending and transitions
- **Context-Aware**: Emotions influenced by conversation context
- **Skill Integration**: Emotions affect skill execution

### **🧠 Enhanced Cognition**

- **Unified Architecture**: Single, powerful cognition system
- **Context Integration**: Deep context awareness across all operations
- **Learning Engine**: Cross-platform learning capabilities
- **Goal Management**: Hierarchical goal planning and execution

### **💾 Advanced Memory**

- **Agentic RAG**: New Retrieval-Augmented Generation provider
- **Multi-Provider**: SQLite, PostgreSQL, Supabase, Neon support
- **Vector Search**: Semantic memory capabilities
- **Context Preservation**: Long-term conversation memory

### **🔌 Production Extensions**

#### **Slack Integration** 💬
- Channel and workspace management
- Thread-based conversations
- Reaction handling
- Rich message formatting

#### **Twitter Bot** 🐦
- Tweet composition and scheduling
- Engagement tracking and analytics
- Relationship management
- Trend analysis

#### **Telegram Bot** 📱
- Group management and moderation
- Content sharing with rich media
- Community building tools
- Direct messaging with personality

#### **RuneLite Integration** 🎮
- Skill training automation
- Quest assistance
- Economic analysis
- PvP strategies
- Social features

#### **Communication System** 💬
- Context management across platforms
- Expression engine for natural responses
- Style adaptation per platform
- Response enhancement

### **🌐 Streamlined Portal System**

- **Unified Manager**: Single point of control for all AI providers
- **15+ Providers**: OpenAI, Anthropic, Groq, Google, XAI, and more
- **Automatic Failover**: Seamless provider switching on errors
- **Performance Monitoring**: Track provider performance and costs

## 🔧 Development

### Development Commands

```bash
# Root level commands
bun dev              # Start development environment
bun build            # Build all components
bun test             # Run test suite
bun lint             # Run linting
bun typecheck        # TypeScript checking

# Component-specific
bun dev:agent        # Agent system only
bun dev:website      # Dashboard only
bun build:agent      # Build agent system
bun build:website    # Build dashboard
```

### Creating Custom Skills

```typescript
// 1. Create skill class
export class MyCustomSkill extends BaseSkill {
  async execute(context: SkillContext): Promise<SkillResult> {
    // Skill implementation
  }
}

// 2. Register with extension
extension.skillManager.registerSkill('mySkill', new MyCustomSkill());

// 3. Use in agent responses
agent.useSkill('mySkill', { parameters });
```

### Creating Custom Extensions

```typescript
// 1. Create extension directory
src/extensions/my-extension/
├── index.ts         # Extension entry point
├── package.json     # Extension metadata
├── skills/          # Extension skills
│   ├── index.ts
│   └── my-skill.ts
└── types.ts         # Type definitions

// 2. Implement extension
export class MyExtension implements Extension {
  private skillManager: SkillManager;
  
  async init(agent: Agent): Promise<void> {
    this.skillManager = new SkillManager(agent);
    // Register skills
  }
}

// 3. Auto-discovery handles registration!
```

## 📊 API Reference

### Core APIs

```typescript
// Agent Management
const agent = await runtime.createAgent({
  character: 'nyx',
  memory: { type: 'sqlite' },
  emotion: { type: 'composite' },
  cognition: { type: 'unified' }
});

// Skill Execution
const result = await agent.executeSkill('tweet', {
  content: 'Hello from SYMindX!',
  media: ['image.png']
});

// Context Management
const context = await agent.getContext();
context.addMemory('user_preference', preference);
```

### REST Endpoints

```
GET  /api/agents              # List all agents
POST /api/agents              # Create new agent
GET  /api/agents/:id          # Get agent details
POST /api/agents/:id/chat     # Send message
GET  /api/agents/:id/skills   # List agent skills
POST /api/agents/:id/skills/:skillId  # Execute skill
GET  /api/system/health       # System health
GET  /api/system/metrics      # Performance metrics
```

### WebSocket Events

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// Listen for events
ws.on('message', (data) => {
  const event = JSON.parse(data);
  switch(event.type) {
    case 'agent_message':
    case 'skill_executed':
    case 'emotion_changed':
    case 'goal_completed':
      // Handle events
  }
});
```

## 🧪 Testing

### Test Structure

```bash
# Unit tests
bun test:unit        # Fast unit tests

# Integration tests  
bun test:integration # Full integration tests

# Skill tests
bun test:skills      # Test individual skills

# Security tests
bun test:security    # Security validation

# Performance tests
bun test:performance # Performance benchmarks
```

### Coverage Requirements

- Unit Tests: 80% minimum
- Integration Tests: 70% minimum
- Critical Paths: 95% minimum
- Security Tests: 100% required

## 🚀 Deployment

### Production Configuration

```bash
# Environment variables
NODE_ENV=production
LOG_LEVEL=info
PORT=8000

# Security
JWT_SECRET=your-secret-key
HTTPS_CERT=/path/to/cert.pem
HTTPS_KEY=/path/to/key.pem

# Database
DATABASE_URL=postgresql://user:pass@host/db

# AI Providers (configure multiple for failover)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

### Docker Deployment

```bash
# Build image
docker build -t symindx:latest .

# Run container
docker run -d \
  -p 8000:8000 \
  -v ./data:/app/data \
  --env-file .env \
  symindx:latest
```

### Scaling Considerations

- **Horizontal Scaling**: Agent instances can be distributed
- **Load Balancing**: Built-in support for multiple instances
- **Caching**: Redis support for distributed caching
- **Message Queue**: RabbitMQ/Kafka for event distribution

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Implement with tests
4. Ensure all tests pass (`bun test`)
5. Submit pull request

### Code Standards

- TypeScript strict mode enforced
- Comprehensive JSDoc comments
- Unit tests for all new features
- Follow existing patterns

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

## Build the future of AI agents with skill-based architecture!

[Get Started](#-quick-start) • [Documentation](./mind-agents/docs/) • [API Reference](#-api-reference) • [Contributing](#-contributing)

*SYMindX v2.1.0 | Skill-Based Architecture | Enterprise Security | Production Ready*

</div>