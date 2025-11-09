# create-symindx

🚀 Project scaffolding tool for SYMindX AI agents

## Usage

Create a new SYMindX agent project:

```bash
npx create-symindx my-agent
```

## Features

- **Interactive Setup**: Guided project creation with smart defaults
- **Multiple Templates**: Choose from basic, gaming, social, enterprise, or research templates
- **AI Provider Support**: OpenAI, Anthropic, Groq, Google, Ollama
- **Memory Providers**: SQLite, PostgreSQL, Supabase, Neon
- **Extension System**: API server, Telegram, Discord, RuneLite, MCP
- **Environment Configuration**: Automatic .env setup with examples
- **TypeScript Ready**: Full TypeScript support with strict configuration
- **Development Tools**: ESLint, Prettier, Jest pre-configured

## Templates

### 🤖 Basic Agent
Simple chatbot with personality and memory

### 🎮 Gaming Agent  
RuneScape bot with autonomous gameplay capabilities

### 💬 Social Agent
Multi-platform social media bot for Twitter, Telegram, Discord

### 🏢 Enterprise Agent
Business automation with security and compliance features

### 🧠 Research Agent
Advanced cognition and learning capabilities

## Options

```bash
npx create-symindx my-agent --template gaming --provider openai --memory supabase
```

- `--template <template>` - Project template (basic, gaming, social, enterprise, research)
- `--provider <provider>` - AI provider (openai, anthropic, groq, google, ollama)  
- `--memory <memory>` - Memory provider (sqlite, postgres, supabase, neon)
- `--no-install` - Skip dependency installation
- `--no-git` - Skip git initialization

## What's Created

```
my-agent/
├── src/
│   ├── config/
│   │   ├── agent.json      # Agent configuration
│   │   └── agent.ts        # TypeScript config export
│   ├── utils/              # Utility functions
│   ├── types/              # Type definitions
│   └── index.ts            # Main entry point
├── tests/                  # Test files
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .env.example            # Environment template
├── .env                    # Environment variables
├── .gitignore              # Git ignore rules
└── README.md               # Project documentation
```

## Quick Start

After creating your project:

1. **Configure environment:**
   ```bash
   cd my-agent
   # Edit .env with your API keys
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Requirements

- Node.js 18+
- npm, yarn, or bun

## License

MIT