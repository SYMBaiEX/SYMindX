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

#### Portals

- `portals.autoLoad`: Whether to automatically load portals at startup (default: true)
- `portals.paths`: Array of directory paths to search for custom portals
- `portals.apiKeys`: Object mapping portal names to their API keys

### API Keys

API keys for portals can be provided in three ways (in order of precedence):

1. **Runtime Configuration**: Set in the `portals.apiKeys` object in `runtime.json`

   ```json
   {
     "portals": {
       "apiKeys": {
         "openai": "sk-...",
         "anthropic": "sk-ant-..."
       }
     }
   }
   ```

2. **Environment Variables**: Set as environment variables in the format `{PROVIDER_NAME}_API_KEY`

   ```bash
   export OPENAI_API_KEY="sk-..."
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

3. **Agent Configuration**: Set in the agent's portal configuration

   ```json
   {
     "modules": {
       "portal": {
         "apiKey": "sk-..."
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