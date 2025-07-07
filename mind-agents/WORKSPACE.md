# SYMindX Workspace Configuration

## Overview
The mind-agents package uses Bun workspaces to modularize dependencies. Each portal, module, and extension has its own package.json with specific dependencies.

## Workspace Structure

### Portals (AI Providers)
Located in `src/portals/`:
- `openai` - OpenAI GPT models
- `anthropic` - Claude models
- `groq` - Fast inference
- `xai` - xAI Grok models
- `google-generative` - Google Gemini
- `google-vertex` - Google Vertex AI
- `azure-openai` - Azure OpenAI
- `mistral` - Mistral AI
- `cohere` - Cohere models
- `perplexity` - Perplexity AI
- `vercel` - Vercel AI
- `ollama` - Local models
- `lmstudio` - LM Studio
- `openrouter` - OpenRouter proxy
- `kluster.ai` - Kluster AI
- `multimodal` - Multimodal support

### Memory Providers
Located in `src/modules/memory/providers/`:
- `sqlite` - Local SQLite database (better-sqlite3)
- `postgres` - PostgreSQL database (pg)
- `supabase` - Supabase backend (@supabase/supabase-js)
- `neon` - Neon serverless Postgres (@neondatabase/serverless)

### Emotion Modules
Located in `src/modules/emotion/`:
- `happy`, `sad`, `angry`, `anxious`, `confident`
- `nostalgic`, `empathetic`, `curious`, `proud`
- `confused`, `neutral`

### Cognition Modules
Located in `src/modules/cognition/`:
- `htn-planner` - Hierarchical Task Network
- `reactive` - Reactive planning
- `hybrid` - Hybrid approach
- `theory-of-mind` - Theory of mind
- `unified` - Unified cognition

### Extensions
Located in `src/extensions/`:
- `api` - HTTP/WebSocket server (express, cors, ws)
- `telegram` - Telegram bot (telegraf)
- `mcp-server` - MCP server (@modelcontextprotocol/sdk)
- `mcp-client` - MCP client (@modelcontextprotocol/sdk)
- `communication` - Communication utilities

## Customizing Your Installation

### Removing Unwanted Components
To remove components you don't need:

1. Edit `mind-agents/package.json`
2. Remove the unwanted paths from the `workspaces` array
3. Run `bun install` from the project root

Example - Remove all portals except OpenAI and Anthropic:
```json
"workspaces": [
  "src/portals/openai",
  "src/portals/anthropic",
  // Remove other portal entries
  "src/modules/memory",
  // ... keep other modules you need
]
```

### Adding Custom Components
1. Create a new directory with a `package.json`
2. Add the path to the `workspaces` array
3. Run `bun install`

## Dependency Management

### Shared Dependencies
These remain in the main package.json:
- `ai` - Vercel AI SDK (used by all portals)
- `zod` - Schema validation
- `express`, `cors`, `ws` - Used by multiple extensions
- `pg` - Used by multiple database providers

### Module-Specific Dependencies
Each workspace has its own dependencies:
- Portal dependencies: AI provider SDKs
- Memory providers: Database drivers
- Extensions: Service-specific SDKs

## Commands

### Development
```bash
# Install all dependencies (including workspaces)
bun install

# Build the project
bun run build

# Start development mode
bun run dev

# Run the application
bun run start
```

### Troubleshooting
If dependencies aren't installing:
1. Ensure you're running commands from the root directory
2. Check that all workspace paths in package.json exist
3. Delete `bun.lockb` and run `bun install` again

## Benefits
1. **Smaller bundles** - Only include what you use
2. **Faster installs** - Skip unnecessary dependencies
3. **Version isolation** - Different modules can use different versions
4. **Easy customization** - Remove features by editing one array