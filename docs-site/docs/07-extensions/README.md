# Extensions Development Guide

Extensions in SYMindX are modular components that add functionality to agents, such as communication platforms, integrations, and external services.

## Overview

The SYMindX extension system supports:
- **Auto-discovery**: Extensions are automatically detected and registered
- **Modularity**: Each extension is a self-contained package
- **Hot-reload**: Extensions can be loaded/unloaded without restarting
- **Type safety**: Full TypeScript support with proper interfaces

## Extension Types

### Built-in Extensions
Located in `@mind-agents/src/extensions/`:
- `api/` - HTTP/WebSocket server with WebUI
- `telegram/` - Telegram bot integration  
- `mcp-client/` - Model Context Protocol client
- `mcp-server/` - Model Context Protocol server
- `communication/` - Enhanced communication features

### Node Modules Extensions
Extensions installed via npm with `@symindx/extension-` prefix:
```bash
npm install @symindx/extension-discord
npm install @symindx/extension-slack
```

### Local Extensions
Extensions in your project's `extensions/` directory.

## Creating an Extension

### 1. Extension Structure

```
my-extension/
├── package.json          # Package metadata with symindx.extension config
├── index.ts             # Main extension implementation
├── types.ts             # Extension-specific types
└── README.md            # Documentation
```

### 2. Package Configuration

```json
{
  "name": "@symindx/extension-my-extension",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts",
  "symindx": {
    "extension": {
      "name": "my-extension",
      "displayName": "My Extension",
      "description": "Custom extension for specific functionality",
      "category": "communication",
      "version": "1.0.0",
      "author": "Your Name",
      "license": "MIT",
      "dependencies": ["api"],
      "capabilities": ["chat", "notifications"],
      "configSchema": {
        "type": "object",
        "properties": {
          "apiKey": {
            "type": "string",
            "description": "API key for the service"
          }
        },
        "required": ["apiKey"]
      }
    }
  }
}
```

### 3. Extension Implementation

```typescript
import { BaseExtension } from '@symindx/mind-agents'
import { MyExtensionConfig } from './types.js'

export class MyExtension extends BaseExtension {
  constructor(config: MyExtensionConfig) {
    super(config)
  }

  async initialize(): Promise<void> {
    // Initialize your extension
    console.log('MyExtension initialized')
  }

  async start(): Promise<void> {
    // Start your extension services
  }

  async stop(): Promise<void> {
    // Clean shutdown
  }

  async handleMessage(message: any): Promise<void> {
    // Handle incoming messages
  }

  getMetadata() {
    return {
      name: 'my-extension',
      version: '1.0.0',
      capabilities: ['chat', 'notifications']
    }
  }
}

// Factory function for discovery system
export function createMyExtension(config: MyExtensionConfig): MyExtension {
  return new MyExtension(config)
}

export default MyExtension
```

### 4. Type Definitions

```typescript
import { BaseConfig } from '@symindx/mind-agents'

export interface MyExtensionConfig extends BaseConfig {
  apiKey: string
  webhookUrl?: string
  enableNotifications?: boolean
}

export interface MyExtensionMessage {
  id: string
  text: string
  sender: string
  timestamp: Date
}
```

## Extension Categories

### Communication
Extensions that handle external communication:
- `telegram` - Telegram bot
- `discord` - Discord bot  
- `slack` - Slack integration
- `api` - HTTP/WebSocket API

### Integration
Extensions that connect to external services:
- `mcp-client` - MCP protocol client
- `github` - GitHub integration
- `database` - Database connectors

### Enhancement
Extensions that enhance agent capabilities:
- `memory-sync` - Cross-agent memory sharing
- `analytics` - Usage analytics
- `monitoring` - Health monitoring

## Discovery System

Extensions are automatically discovered using the `ExtensionDiscovery` class:

```typescript
import { ExtensionDiscovery } from '@symindx/mind-agents'

const discovery = new ExtensionDiscovery(projectRoot)
const extensions = await discovery.discoverExtensions()

// Extensions are categorized by source
extensions.forEach(ext => {
  console.log(`Found: ${ext.name} (${ext.source})`)
})
```

## Configuration

Extensions can be configured at multiple levels:

### Runtime Level (runtime.json)
```json
{
  "extensions": {
    "api": {
      "enabled": true,
      "config": {
        "port": 3000,
        "enableWebUI": true
      }
    }
  }
}
```

### Character Level (character.json)
```json
{
  "extensions": {
    "telegram": {
      "enabled": true,
      "config": {
        "botToken": "BOT_TOKEN",
        "allowedUsers": ["user1", "user2"]
      }
    }
  }
}
```

## Extension Lifecycle

1. **Discovery**: Extensions are found by scanning directories
2. **Registration**: Extension factories are registered with the runtime
3. **Instantiation**: Extensions are created with their configurations
4. **Initialization**: Extensions set up their internal state
5. **Start**: Extensions begin active operation
6. **Runtime**: Extensions handle events and messages
7. **Stop**: Extensions clean up resources

## Best Practices

### Error Handling
```typescript
export class MyExtension extends BaseExtension {
  async handleMessage(message: any): Promise<void> {
    try {
      // Process message
    } catch (error) {
      this.logger.error('Failed to handle message:', error)
      // Don't throw - log and continue
    }
  }
}
```

### Configuration Validation
```typescript
constructor(config: MyExtensionConfig) {
  super(config)
  
  if (!config.apiKey) {
    throw new Error('API key is required for MyExtension')
  }
}
```

### Resource Management
```typescript
async stop(): Promise<void> {
  // Close connections
  if (this.connection) {
    await this.connection.close()
  }
  
  // Clear timers
  if (this.timer) {
    clearInterval(this.timer)
  }
}
```

### Event Handling
```typescript
async initialize(): Promise<void> {
  // Subscribe to relevant events
  this.eventBus.on('agent.message', this.handleMessage.bind(this))
  this.eventBus.on('agent.emotion', this.handleEmotion.bind(this))
}
```

## Testing Extensions

```typescript
import { describe, it, expect } from '@jest/globals'
import { MyExtension } from '../index.js'

describe('MyExtension', () => {
  it('should initialize correctly', async () => {
    const extension = new MyExtension({
      apiKey: 'test-key'
    })
    
    await extension.initialize()
    expect(extension.isInitialized).toBe(true)
  })
  
  it('should handle messages', async () => {
    const extension = new MyExtension({
      apiKey: 'test-key'
    })
    
    const message = {
      text: 'Hello',
      sender: 'user1'
    }
    
    await extension.handleMessage(message)
    // Assert expected behavior
  })
})
```

## Publishing Extensions

### NPM Package
```bash
# Build your extension
npm run build

# Publish to npm
npm publish
```

### Local Development
```bash
# Link for local development
npm link

# In your SYMindX project
npm link @symindx/extension-my-extension
```

## Extension Examples

See the `mind-agents/src/extensions/` directory for reference implementations:

- **API Extension**: HTTP server with WebSocket support
- **Telegram Extension**: Bot with message handling and user management
- **MCP Client**: Model Context Protocol integration
- **Communication Extension**: Enhanced agent communication features

## Troubleshooting

### Extension Not Found
- Verify package.json has correct `symindx.extension` configuration
- Check that the extension directory is in the expected location
- Ensure factory function is exported correctly

### Configuration Errors
- Validate configuration against the schema
- Check required fields are provided
- Ensure environment variables are set

### Runtime Errors
- Check logs for error details
- Verify dependencies are installed
- Test extension in isolation

For more examples and advanced patterns, see the existing extensions in the codebase.