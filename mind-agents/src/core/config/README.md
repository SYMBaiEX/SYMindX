# SYMindX Configuration

This directory contains configuration files for the SYMindX runtime.

## Runtime Configuration

The runtime configuration file (`runtime.json`) controls the behavior of the SYMindX runtime. An example configuration is provided in `runtime.example.json`.

### Configuration Options

#### Basic Settings

- `tickInterval`: The interval in milliseconds between runtime ticks (default: 1000)
- `maxAgents`: The maximum number of agents that can be loaded simultaneously (default: 10)
- `logLevel`: The logging level ('debug', 'info', 'warn', 'error')

#### Persistence

- `persistence.enabled`: Whether to enable persistence of agent state (default: true)
- `persistence.path`: The directory path for storing persistent data (default: "./data")

#### Extensions

- `extensions.autoLoad`: Whether to automatically load extensions at startup (default: true)
- `extensions.paths`: Array of directory paths to search for extensions

#### Portals (AI SDK v5)

- `portals.autoLoad`: Whether to automatically load portals at startup (default: true)
- `portals.paths`: Array of directory paths to search for custom portals
- `portals.apiKeys`: Object mapping portal names to their API keys
- `portals.default`: Default portal to use if not specified (e.g., "openai")
- `portals.models`: Model configuration for different tasks:
  - `chat`: Model for general conversations (e.g., "gpt-4o")
  - `tools`: Model for function calling (e.g., "gpt-4.1-mini")
  - `embedding`: Model for embeddings (e.g., "text-embedding-3-small")

### API Keys

API keys for portals can be provided in three ways (in order of precedence):

1. **Runtime Configuration**: Set in the `portals.apiKeys` object in `runtime.json`

   ```json
   {
     "portals": {
       "apiKeys": {
         "openai": "sk-...",
         "anthropic": "sk-ant-...",
         "groq": "gsk_...",
         "google": "...",
         "mistral": "..."
       },
       "default": "openai",
       "models": {
         "chat": "gpt-4o",
         "tools": "gpt-4.1-mini"
       }
     }
   }
   ```

2. **Environment Variables**: Set as environment variables in the format `{PROVIDER_NAME}_API_KEY`

   ```bash
   # AI SDK v5 Providers
   export OPENAI_API_KEY="sk-..."
   export ANTHROPIC_API_KEY="sk-ant-..."
   export GROQ_API_KEY="gsk_..."
   export GOOGLE_GENERATIVE_AI_API_KEY="..."
   export MISTRAL_API_KEY="..."
   export COHERE_API_KEY="..."
   export AZURE_OPENAI_API_KEY="..."
   export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
   ```

3. **Agent Configuration**: Set in the agent's portal configuration

   ```json
   {
     "modules": {
       "portal": {
         "provider": "openai",
         "apiKey": "sk-...",
         "model": "gpt-4.1-mini",
         "streaming": true // AI SDK v5 streaming
       }
     }
   }
   ```

## Agent Configuration

Agent configuration files are stored in the `agents` directory. Each agent has its own configuration file.

See the [Agent Configuration Guide](../docs/agent-configuration.md) for more details.

## Getting Started

1. Copy `runtime.example.json` to `runtime.json`
2. Add your API keys to the configuration
3. Start the SYMindX runtime

```bash
npm run start
```
