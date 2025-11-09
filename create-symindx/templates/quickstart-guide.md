# 🚀 SYMindX Quick Start Guide

Welcome to SYMindX! This guide will get you up and running with your AI agent in just 5 minutes.

## Step 1: Create Your Project (30 seconds)

```bash
npx create-symindx my-agent
```

Follow the interactive prompts to configure your agent:
- Choose a template (Basic, Gaming, Social, Enterprise, Research)
- Select AI provider (OpenAI, Anthropic, Groq, Google, Ollama)
- Pick memory storage (SQLite, PostgreSQL, Supabase, Neon)
- Define personality traits
- Select extensions

## Step 2: Configure Environment (2 minutes)

1. **Navigate to your project:**
   ```bash
   cd my-agent
   ```

2. **Set up your API keys:**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit with your favorite editor
   nano .env  # or code .env, vim .env, etc.
   ```

3. **Required configuration:**
   - Add your AI provider API key
   - Configure memory provider (if not using SQLite)
   - Set up extension credentials (optional)

## Step 3: Install & Build (1 minute)

```bash
# Install dependencies
bun install  # or npm install

# Build the project
bun run build  # or npm run build
```

## Step 4: Start Your Agent (30 seconds)

```bash
# Start in development mode
bun run dev  # or npm run dev

# Or start in production mode
bun start  # or npm start
```

## Step 5: Interact with Your Agent (1 minute)

### Option A: Web Dashboard
Open your browser to `http://localhost:8000` (if API extension is enabled)

### Option B: CLI Interface
```bash
# In a new terminal
bun run cli  # or npm run cli
```

### Option C: Direct API
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, agent!"}'
```

## 🎉 You're Done!

Your SYMindX agent is now running and ready to interact. Here's what you can do next:

### Customize Your Agent
- Edit `src/config/agent.json` to modify personality and behavior
- Add custom logic in `src/index.ts`
- Create custom utilities in `src/utils/`

### Explore Extensions
- **API Server**: Web dashboard at `http://localhost:8000`
- **Telegram Bot**: Connect to Telegram with your bot token
- **Discord Bot**: Join Discord servers and interact
- **RuneLite**: Automate RuneScape gameplay
- **MCP Server**: Integrate with other AI tools

### Development Commands
```bash
bun run dev        # Development with hot reload
bun run build      # Build for production
bun run test       # Run tests
bun run lint       # Check code quality
bun run format     # Format code
```

### Get Help
- 📖 [Documentation](https://docs.symindx.com)
- 💬 [Discord Community](https://discord.gg/symindx)
- 🐛 [Report Issues](https://github.com/symindx/symindx/issues)
- 📧 [Email Support](mailto:support@symindx.com)

---

**Total Setup Time: ~5 minutes** ⏱️

Happy coding with SYMindX! 🤖✨