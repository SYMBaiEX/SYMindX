# Plugin Development Guide

This guide explains how to develop dynamic plugins for the SYMindX runtime system.

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Getting Started](#getting-started)
4. [Plugin Manifest](#plugin-manifest)
5. [Plugin Implementation](#plugin-implementation)
6. [Configuration](#configuration)
7. [Actions](#actions)
8. [Events](#events)
9. [Testing](#testing)
10. [Best Practices](#best-practices)
11. [Advanced Topics](#advanced-topics)

## Overview

SYMindX supports dynamic plugins that can be loaded, unloaded, and reloaded at runtime without restarting the system. Plugins extend the functionality of agents by providing:

- **Extensions**: Add new capabilities (communication, game integration, etc.)
- **Modules**: Provide core services (memory, emotion, cognition)
- **Portals**: Connect to external AI services

## Plugin Architecture

```
SYMindX Runtime
├── Core System
│   ├── Event Bus
│   ├── Module Registry
│   └── Plugin Loader
├── Built-in Extensions
│   ├── Slack
│   ├── Telegram
│   ├── Twitter
│   └── RuneLite
└── Dynamic Plugins
    ├── Custom Extensions
    ├── Custom Modules
    └── Custom Portals
```

### Plugin Types

- **Extension**: Adds external integration capabilities
- **Module**: Provides core runtime services
- **Portal**: Connects to AI/LLM services
- **Utility**: General-purpose functionality

## Getting Started

### 1. Create Plugin Directory

```bash
mkdir -p plugins/my-plugin
cd plugins/my-plugin
```

### 2. Create Plugin Manifest

Create `plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "A custom plugin for SYMindX",
  "version": "1.0.0",
  "type": "extension",
  "main": "index.js",
  "author": "Your Name",
  "license": "MIT",
  "dependencies": [],
  "config": {
    "required": ["enabled"],
    "optional": ["apiKey", "timeout"]
  }
}
```

### 3. Implement Plugin

Create `index.ts`:

```typescript
import {
  Extension,
  ExtensionContext,
  ExtensionType,
  ExtensionStatus
} from '../../src/types/agent.js';

export class MyPlugin implements Extension {
  id = 'my-plugin';
  name = 'My Plugin';
  description = 'A custom plugin';
  version = '1.0.0';
  type = ExtensionType.UTILITY;
  status = ExtensionStatus.STOPPED;
  
  constructor(private context: ExtensionContext) {}
  
  async init(): Promise<void> {
    // Initialize your plugin
    this.status = ExtensionStatus.RUNNING;
  }
  
  async cleanup(): Promise<void> {
    // Clean up resources
    this.status = ExtensionStatus.STOPPED;
  }
  
  async tick(): Promise<void> {
    // Periodic tasks
  }
  
  getActions() {
    return {
      'my_action': {
        name: 'My Action',
        description: 'Does something useful',
        parameters: {},
        handler: this.myAction.bind(this)
      }
    };
  }
  
  private async myAction() {
    // Implement your action
    return {
      success: true,
      type: 'success',
      result: 'Action completed'
    };
  }
}

export function createPlugin(context: ExtensionContext): Extension {
  return new MyPlugin(context);
}
```

## Plugin Manifest

The `plugin.json` file defines plugin metadata and requirements:

```json
{
  "id": "unique-plugin-id",
  "name": "Human Readable Name",
  "description": "What this plugin does",
  "version": "1.0.0",
  "type": "extension|module|portal|utility",
  "main": "index.js",
  "author": "Plugin Author",
  "license": "MIT",
  "homepage": "https://github.com/user/plugin",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin.git"
  },
  "keywords": ["symindx", "plugin", "ai"],
  "dependencies": [
    {
      "id": "required-plugin",
      "version": ">=1.0.0"
    }
  ],
  "config": {
    "required": ["apiKey", "enabled"],
    "optional": ["timeout", "retries"]
  },
  "permissions": [
    "network",
    "filesystem",
    "events"
  ]
}
```

### Manifest Fields

- `id`: Unique identifier (kebab-case)
- `name`: Display name
- `description`: Brief description
- `version`: Semantic version
- `type`: Plugin type (extension, module, portal, utility)
- `main`: Entry point file
- `dependencies`: Required plugins
- `config`: Configuration schema
- `permissions`: Required permissions

## Plugin Implementation

### Extension Interface

All plugins must implement the `Extension` interface:

```typescript
interface Extension {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly type: ExtensionType;
  status: ExtensionStatus;
  
  init(): Promise<void>;
  cleanup(): Promise<void>;
  tick(): Promise<void>;
  getActions(): Record<string, ExtensionAction>;
}
```

### Extension Context

The context provides access to runtime services:

```typescript
interface ExtensionContext {
  config: any;                    // Plugin configuration
  logger: Logger;                 // Logging service
  eventBus: EnhancedEventBus;     // Event system
  registry: ModuleRegistry;       // Module registry
  runtime: SYMindXRuntime;        // Runtime instance
}
```

### Lifecycle Methods

#### `init()`

Called when the plugin is loaded:

```typescript
async init(): Promise<void> {
  // Validate configuration
  if (!this.context.config.apiKey) {
    throw new Error('API key is required');
  }
  
  // Initialize resources
  this.client = new ApiClient(this.context.config.apiKey);
  
  // Set up event listeners
  this.context.eventBus.subscribe('agent_*', this.handleAgentEvent.bind(this));
  
  // Update status
  this.status = ExtensionStatus.RUNNING;
  
  this.context.logger.info('Plugin initialized');
}
```

#### `cleanup()`

Called when the plugin is unloaded:

```typescript
async cleanup(): Promise<void> {
  // Close connections
  if (this.client) {
    await this.client.disconnect();
  }
  
  // Clear timers
  if (this.intervalId) {
    clearInterval(this.intervalId);
  }
  
  // Update status
  this.status = ExtensionStatus.STOPPED;
  
  this.context.logger.info('Plugin cleaned up');
}
```

#### `tick()`

Called periodically by the runtime:

```typescript
async tick(): Promise<void> {
  // Health checks
  if (this.client && !this.client.isConnected()) {
    await this.client.reconnect();
  }
  
  // Periodic tasks
  await this.processQueue();
}
```

## Configuration

### Configuration Schema

Define required and optional configuration in the manifest:

```json
{
  "config": {
    "required": ["apiKey", "enabled"],
    "optional": ["timeout", "retries", "debug"]
  }
}
```

### Accessing Configuration

```typescript
constructor(context: ExtensionContext) {
  this.context = context;
  this.config = context.config;
  
  // Validate required config
  if (!this.config.apiKey) {
    throw new Error('API key is required');
  }
  
  // Set defaults for optional config
  this.timeout = this.config.timeout || 5000;
  this.retries = this.config.retries || 3;
}
```

### Runtime Configuration

Add plugin configuration to the runtime config:

```json
{
  "plugins": {
    "my-plugin": {
      "enabled": true,
      "apiKey": "your-api-key",
      "timeout": 10000,
      "debug": false
    }
  }
}
```

## Actions

Actions are functions that agents can execute through your plugin.

### Defining Actions

```typescript
getActions(): Record<string, ExtensionAction> {
  return {
    'send_message': {
      name: 'Send Message',
      description: 'Send a message to an external service',
      parameters: {
        recipient: {
          type: 'string',
          description: 'Message recipient',
          required: true
        },
        message: {
          type: 'string',
          description: 'Message content',
          required: true
        },
        priority: {
          type: 'string',
          description: 'Message priority',
          required: false,
          enum: ['low', 'normal', 'high']
        }
      },
      handler: this.sendMessage.bind(this)
    }
  };
}
```

### Implementing Action Handlers

```typescript
private async sendMessage(params: {
  recipient: string;
  message: string;
  priority?: string;
}): Promise<ActionResult> {
  try {
    // Validate parameters
    if (!params.recipient || !params.message) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: 'Recipient and message are required'
      };
    }
    
    // Execute action
    const result = await this.client.sendMessage({
      to: params.recipient,
      text: params.message,
      priority: params.priority || 'normal'
    });
    
    // Emit event
    await this.context.eventBus.publish({
      type: 'message_sent',
      source: this.id,
      data: {
        recipient: params.recipient,
        messageId: result.id
      },
      timestamp: new Date()
    });
    
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: {
        messageId: result.id,
        timestamp: result.timestamp
      }
    };
  } catch (error) {
    this.context.logger.error('Failed to send message', error);
    return {
      success: false,
      type: ActionResultType.FAILURE,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

### Parameter Types

Supported parameter types:

- `string`: Text value
- `number`: Numeric value
- `boolean`: True/false value
- `array`: List of values
- `object`: Complex object
- `enum`: Predefined choices

## Events

### Publishing Events

```typescript
// Simple event
await this.context.eventBus.publish({
  type: 'plugin_action',
  source: this.id,
  data: { action: 'completed' },
  timestamp: new Date()
});

// Complex event with metadata
await this.context.eventBus.publish({
  type: 'external_api_response',
  source: this.id,
  data: {
    endpoint: '/api/users',
    status: 200,
    responseTime: 150
  },
  metadata: {
    requestId: 'req-123',
    userId: 'user-456'
  },
  timestamp: new Date()
});
```

### Subscribing to Events

```typescript
// Subscribe to specific events
this.context.eventBus.subscribe('agent_action', this.handleAgentAction.bind(this));

// Subscribe with patterns
this.context.eventBus.subscribe('system_*', this.handleSystemEvent.bind(this));

// Subscribe with filters
this.context.eventBus.subscribe('message_*', this.handleMessage.bind(this), {
  filter: (event) => event.data.priority === 'high'
});
```

### Event Handlers

```typescript
private async handleAgentAction(event: Event): Promise<void> {
  this.context.logger.debug('Agent action received', event);
  
  if (event.data.action === 'send_notification') {
    await this.sendNotification(event.data.message);
  }
}
```

## Testing

### Unit Testing

Create `test/plugin.test.ts`:

```typescript
import { MyPlugin } from '../index.js';
import { createMockContext } from '../../test/utils.js';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let context: ExtensionContext;
  
  beforeEach(() => {
    context = createMockContext({
      enabled: true,
      apiKey: 'test-key'
    });
    plugin = new MyPlugin(context);
  });
  
  afterEach(async () => {
    await plugin.cleanup();
  });
  
  test('should initialize successfully', async () => {
    await plugin.init();
    expect(plugin.status).toBe(ExtensionStatus.RUNNING);
  });
  
  test('should handle actions', async () => {
    await plugin.init();
    const actions = plugin.getActions();
    expect(actions).toHaveProperty('send_message');
    
    const result = await actions.send_message.handler({
      recipient: 'test@example.com',
      message: 'Hello World'
    });
    
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing

```typescript
import { SYMindXRuntime } from '../../src/core/runtime.js';

describe('Plugin Integration', () => {
  let runtime: SYMindXRuntime;
  
  beforeEach(async () => {
    runtime = new SYMindXRuntime(testConfig);
    await runtime.start();
  });
  
  afterEach(async () => {
    await runtime.stop();
  });
  
  test('should load plugin dynamically', async () => {
    await runtime.loadPlugin('my-plugin');
    
    const plugins = runtime.getLoadedPlugins();
    expect(plugins).toContain('my-plugin');
  });
  
  test('should execute plugin actions', async () => {
    await runtime.loadPlugin('my-plugin');
    
    const result = await runtime.executeAction('my-plugin', 'send_message', {
      recipient: 'test@example.com',
      message: 'Test message'
    });
    
    expect(result.success).toBe(true);
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
// Always wrap operations in try-catch
try {
  const result = await this.externalApi.call();
  return this.createSuccessResult(result);
} catch (error) {
  this.context.logger.error('API call failed', error);
  return this.createErrorResult(error);
}

// Provide helpful error messages
if (!params.required_field) {
  return {
    success: false,
    type: ActionResultType.FAILURE,
    error: 'required_field is missing and must be provided'
  };
}
```

### 2. Logging

```typescript
// Use structured logging
this.context.logger.info('Action executed', {
  action: 'send_message',
  recipient: params.recipient,
  duration: Date.now() - startTime
});

// Log at appropriate levels
this.context.logger.debug('Debug info for development');
this.context.logger.info('General information');
this.context.logger.warn('Warning about potential issues');
this.context.logger.error('Error that needs attention', error);
```

### 3. Resource Management

```typescript
// Clean up resources properly
async cleanup(): Promise<void> {
  // Close connections
  if (this.connection) {
    await this.connection.close();
    this.connection = null;
  }
  
  // Clear timers
  if (this.intervalId) {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
  
  // Remove event listeners
  this.context.eventBus.unsubscribe(this.subscriptionId);
}
```

### 4. Configuration Validation

```typescript
private validateConfig(): void {
  const required = ['apiKey', 'endpoint'];
  const missing = required.filter(key => !this.config[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
  
  // Validate types
  if (typeof this.config.timeout !== 'number') {
    throw new Error('timeout must be a number');
  }
  
  // Validate ranges
  if (this.config.timeout < 1000 || this.config.timeout > 60000) {
    throw new Error('timeout must be between 1000 and 60000 ms');
  }
}
```

### 5. Async Operations

```typescript
// Use async/await consistently
async init(): Promise<void> {
  await this.connectToService();
  await this.loadConfiguration();
  await this.setupEventHandlers();
}

// Handle concurrent operations
async processMultipleItems(items: Item[]): Promise<void> {
  const promises = items.map(item => this.processItem(item));
  await Promise.all(promises);
}

// Implement timeouts
async callExternalApi(): Promise<any> {
  const timeout = this.config.timeout || 5000;
  return Promise.race([
    this.api.call(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
}
```

## Advanced Topics

### Plugin Dependencies

Plugins can depend on other plugins:

```json
{
  "dependencies": [
    {
      "id": "database-plugin",
      "version": ">=1.0.0"
    },
    {
      "id": "auth-plugin",
      "version": "^2.0.0"
    }
  ]
}
```

Access dependent plugins:

```typescript
async init(): Promise<void> {
  // Get dependent plugin
  const dbPlugin = this.context.registry.getExtension('database-plugin');
  if (!dbPlugin) {
    throw new Error('Database plugin is required');
  }
  
  // Use dependent plugin's actions
  const result = await dbPlugin.getActions().query.handler({
    sql: 'SELECT * FROM users'
  });
}
```

### Hot Reloading

Plugins support hot reloading during development:

```typescript
// Watch for file changes (development only)
if (process.env.NODE_ENV === 'development') {
  const watcher = chokidar.watch(this.pluginPath);
  watcher.on('change', async () => {
    await this.context.runtime.reloadPlugin(this.id);
  });
}
```

### Plugin Communication

Plugins can communicate through events:

```typescript
// Plugin A requests data
await this.context.eventBus.publish({
  type: 'data_request',
  source: this.id,
  data: { query: 'user_stats' },
  timestamp: new Date()
});

// Plugin B responds with data
this.context.eventBus.subscribe('data_request', async (event) => {
  if (event.data.query === 'user_stats') {
    const stats = await this.getUserStats();
    
    await this.context.eventBus.publish({
      type: 'data_response',
      source: this.id,
      data: {
        requestId: event.id,
        stats: stats
      },
      timestamp: new Date()
    });
  }
});
```

### Custom Module Types

Create custom module types:

```typescript
// Define module interface
interface CustomModule {
  processData(data: any): Promise<any>;
  getStatus(): ModuleStatus;
}

// Implement module
export class MyCustomModule implements CustomModule {
  async processData(data: any): Promise<any> {
    // Process data
    return processedData;
  }
  
  getStatus(): ModuleStatus {
    return {
      healthy: true,
      lastUpdate: new Date()
    };
  }
}

// Register module type
this.context.registry.registerModuleType('custom', MyCustomModule);
```

### Performance Optimization

```typescript
// Use connection pooling
class ApiClient {
  private pool: ConnectionPool;
  
  constructor(config: any) {
    this.pool = new ConnectionPool({
      max: config.maxConnections || 10,
      min: config.minConnections || 2
    });
  }
}

// Implement caching
class CachedPlugin extends BasePlugin {
  private cache = new Map<string, any>();
  
  async getData(key: string): Promise<any> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const data = await this.fetchData(key);
    this.cache.set(key, data);
    return data;
  }
}

// Use batching for bulk operations
async processBatch(items: Item[]): Promise<void> {
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await this.processBatchItems(batch);
  }
}
```

This guide provides a comprehensive foundation for developing plugins for the SYMindX system. For more examples, see the `plugins/sample-extension` directory.