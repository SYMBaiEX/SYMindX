# Sample Extension Plugin

This is a sample extension plugin that demonstrates how to create dynamic plugins for the SYMindX runtime.

## Overview

The Sample Extension showcases:

- **Basic Extension Lifecycle**: Proper initialization and cleanup
- **Action Registration**: How to expose actions that agents can use
- **Configuration Handling**: Reading and using plugin configuration
- **Event Emission**: Publishing events to the runtime event bus
- **Periodic Tasks**: Running background tasks at intervals
- **Error Handling**: Proper error handling and logging

## Plugin Structure

```
sample-extension/
├── plugin.json          # Plugin manifest
├── index.ts            # Main plugin implementation
└── README.md           # This documentation
```

## Configuration

The plugin accepts the following configuration options:

```json
{
  "enabled": true,
  "message": "Custom hello message",
  "interval": 30
}
```

### Configuration Options

- `enabled` (required): Whether the plugin is enabled
- `message` (optional): Custom message for the hello action
- `interval` (optional): Interval in seconds for periodic tasks

## Available Actions

### `sample_hello`

Sends a hello message.

**Parameters:**
- `name` (optional): Name to greet

**Example:**
```javascript
const result = await agent.executeAction('sample_hello', { name: 'Alice' });
```

### `sample_echo`

Echoes back a message.

**Parameters:**
- `message` (required): Message to echo

**Example:**
```javascript
const result = await agent.executeAction('sample_echo', { 
  message: 'Hello World' 
});
```

### `sample_status`

Returns the current status of the extension.

**Parameters:** None

**Example:**
```javascript
const result = await agent.executeAction('sample_status');
```

## Events

The plugin emits the following events:

- `extension_initialized`: When the plugin is initialized
- `extension_stopped`: When the plugin is stopped
- `sample_hello`: When a hello action is executed
- `sample_echo`: When an echo action is executed
- `sample_periodic`: Periodic heartbeat events (if interval is configured)

## Creating Your Own Plugin

To create your own plugin based on this sample:

1. **Copy the plugin structure**:
   ```bash
   cp -r plugins/sample-extension plugins/my-plugin
   ```

2. **Update the plugin manifest** (`plugin.json`):
   ```json
   {
     "id": "my-plugin",
     "name": "My Plugin",
     "description": "My custom plugin",
     "version": "1.0.0",
     "type": "utility",
     "main": "index.js",
     "author": "Your Name",
     "dependencies": [],
     "config": {
       "required": ["enabled"],
       "optional": ["customOption"]
     }
   }
   ```

3. **Implement your plugin** (`index.ts`):
   ```typescript
   import { Extension, ExtensionContext } from '../../src/types/agent.js';
   
   export class MyPlugin implements Extension {
     id = 'my-plugin';
     name = 'My Plugin';
     // ... implement required methods
   }
   
   export function createPlugin(context: ExtensionContext): Extension {
     return new MyPlugin(context);
   }
   ```

4. **Add your plugin to the runtime configuration**:
   ```json
   {
     "plugins": {
       "my-plugin": {
         "enabled": true,
         "customOption": "value"
       }
     }
   }
   ```

## Plugin Interface

All plugins must implement the `Extension` interface:

```typescript
interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  type: ExtensionType;
  status: ExtensionStatus;
  
  init(): Promise<void>;
  cleanup(): Promise<void>;
  tick(): Promise<void>;
  getActions(): Record<string, ExtensionAction>;
}
```

## Best Practices

1. **Error Handling**: Always wrap operations in try-catch blocks
2. **Logging**: Use the provided logger for consistent logging
3. **Resource Cleanup**: Properly clean up resources in the `cleanup()` method
4. **Event Emission**: Use the event bus to communicate with other components
5. **Configuration Validation**: Validate configuration in the constructor
6. **Action Parameters**: Validate action parameters before processing
7. **Async Operations**: Use async/await for all asynchronous operations

## Testing Your Plugin

1. **Load the plugin**:
   ```javascript
   const runtime = new SYMindXRuntime(config);
   await runtime.start();
   await runtime.loadPlugin('my-plugin');
   ```

2. **Execute actions**:
   ```javascript
   const result = await runtime.executeAction('my-plugin', 'my_action', params);
   ```

3. **Monitor events**:
   ```javascript
   runtime.subscribeToEvents('my_plugin_*', (event) => {
     console.log('Plugin event:', event);
   });
   ```

## Debugging

Enable debug logging to see detailed plugin information:

```json
{
  "logging": {
    "level": "debug",
    "plugins": true
  }
}
```

This will show:
- Plugin discovery and loading
- Action execution
- Event emission
- Error details

## Advanced Features

### Plugin Dependencies

Plugins can declare dependencies on other plugins:

```json
{
  "dependencies": [
    {
      "id": "required-plugin",
      "version": ">=1.0.0"
    }
  ]
}
```

### Hot Reloading

Plugins support hot reloading during development:

```javascript
// Reload a plugin
await runtime.reloadPlugin('my-plugin');

// Unload a plugin
await runtime.unloadPlugin('my-plugin');
```

### Plugin Communication

Plugins can communicate through the event bus:

```typescript
// Plugin A emits an event
await this.context.eventBus.publish({
  type: 'plugin_a_data',
  source: this.id,
  data: { message: 'Hello from Plugin A' }
});

// Plugin B listens for the event
this.context.eventBus.subscribe('plugin_a_*', (event) => {
  console.log('Received from Plugin A:', event.data);
});
```