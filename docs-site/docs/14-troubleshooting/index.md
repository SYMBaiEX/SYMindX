---
sidebar_position: 14
sidebar_label: "Troubleshooting"
title: "Troubleshooting"
description: "Common issues and solutions"
---

# Troubleshooting

Common issues and solutions

## Overview

This guide helps you diagnose and resolve common issues with SYMindX. From installation problems to runtime errors, we've compiled solutions based on real-world deployments and community feedback.

## Installation Issues

### Bun/Node.js Compatibility

**Problem**: `SyntaxError: Cannot use import statement outside a module`

**Solution**: Ensure your project uses ES modules:
```json
// package.json
{
  "type": "module"
}
```

**Problem**: `Module not found: Error: Can't resolve '@/...'`

**Solution**: Configure TypeScript path aliases:
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Dependency Conflicts

**Problem**: `npm ERR! peer dep missing`

**Solution**: Install with legacy peer deps:
```bash
npm install --legacy-peer-deps
# or use Bun which handles peer deps better
bun install
```

## Runtime Errors

### Memory Provider Issues

**Problem**: `Error: SQLITE_CANTOPEN: unable to open database file`

**Solution**: Check database path and permissions:
```typescript
// Ensure directory exists
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = './data/memories.db';
const dir = dirname(dbPath);

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const memory = createMemoryProvider('sqlite', { dbPath });
```

**Problem**: `Supabase connection failed`

**Solution**: Verify environment variables:
```bash
# Check if variables are set
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Common issues:
# - Missing https:// in URL
# - Wrong key type (anon vs service role)
# - Incorrect project reference
```

### AI Portal Errors

**Problem**: `401 Unauthorized from OpenAI`

**Solution**: Validate API key and usage:
```typescript
// Debug API configuration
const portal = createPortal('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  debug: true // Enable detailed logging
});

// Check rate limits
portal.on('rate-limit', (info) => {
  console.log('Rate limit hit:', info);
});
```

**Problem**: `Model not found`

**Solution**: Use supported models:
```typescript
// Check available models
const models = {
  openai: ['gpt-4', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet'],
  groq: ['llama3-70b', 'mixtral-8x7b']
};
```

## WebSocket Connection Issues

### Client Connection Failures

**Problem**: `WebSocket connection failed`

**Solution**: Check server configuration:
```typescript
// Server side - ensure proper CORS
const wsServer = new WebSocketServer({
  port: 3000,
  perMessageDeflate: false,
  clientTracking: true
});

// Client side - use correct URL
const ws = new WebSocket('ws://localhost:3000');
// For HTTPS sites, use wss://
```

**Problem**: `Connection drops frequently`

**Solution**: Implement reconnection logic:
```typescript
class ReconnectingWebSocket {
  private ws?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.on('close', () => {
      console.log('Connection lost, reconnecting...');
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.ws?.close();
    });
  }
}
```

## Module Loading Problems

### Extension Initialization Failures

**Problem**: `Extension failed to initialize`

**Solution**: Check extension requirements:
```typescript
// Add detailed error logging
export class MyExtension implements Extension {
  async init(context: ExtensionContext): Promise<void> {
    try {
      // Validate required configuration
      if (!context.config.apiKey) {
        throw new Error('API key is required');
      }
      
      // Initialize with timeout
      await Promise.race([
        this.initialize(context),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 30000)
        )
      ]);
    } catch (error) {
      logger.error('Extension init failed:', error);
      throw error; // Re-throw to prevent silent failures
    }
  }
}
```

### Module Registry Issues

**Problem**: `Module not found in registry`

**Solution**: Ensure proper registration:
```typescript
// Check if module is registered
const registry = new ModuleRegistry();
registry.register('memory', 'sqlite', SQLiteMemoryProvider);

// List all registered modules
console.log('Available modules:', registry.list());

// Verify module factory
const factory = registry.get('memory', 'sqlite');
if (!factory) {
  throw new Error('SQLite memory provider not registered');
}
```

## Performance Debugging

### Memory Leaks

**Problem**: `JavaScript heap out of memory`

**Solution**: Implement proper cleanup:
```typescript
export class Agent {
  private subscriptions: Array<() => void> = [];
  
  async shutdown(): Promise<void> {
    // Clean up event listeners
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
    
    // Clear timers
    clearInterval(this.tickTimer);
    
    // Disconnect from services
    await this.memory?.disconnect();
    await this.portal?.disconnect();
    
    // Clear references
    this.memory = null;
    this.portal = null;
  }
}
```

### High CPU Usage

**Problem**: `Agent tick consuming too much CPU`

**Solution**: Optimize tick frequency and processing:
```typescript
// Adaptive tick rate based on load
export class AdaptiveAgent extends Agent {
  private load = 0;
  
  async tick(): Promise<void> {
    const start = performance.now();
    
    await super.tick();
    
    // Measure tick duration
    const duration = performance.now() - start;
    this.load = duration / this.tickInterval;
    
    // Adjust tick rate if overloaded
    if (this.load > 0.8) {
      this.tickInterval = Math.min(this.tickInterval * 1.5, 5000);
      logger.warn(`High load detected, reducing tick rate to ${this.tickInterval}ms`);
    }
  }
}
```

## Common Configuration Mistakes

### Invalid Character Files

**Problem**: `Invalid character configuration`

**Solution**: Validate JSON structure:
```json
{
  "id": "my-agent",
  "name": "My Agent",
  "personality": {
    "traits": ["helpful", "curious"],
    "background": "A helpful assistant",
    "goals": ["Assist users", "Learn new things"]
  },
  "psyche": {
    "creativity": 0.7,
    "confidence": 0.8,
    "empathy": 0.9
  },
  "voice": {
    "tone": "friendly",
    "style": "conversational"
  },
  "modules": {
    "memory": "sqlite",
    "emotion": "rune_emotion_stack",
    "cognition": "htn_planner"
  }
}
```

### Runtime Configuration Errors

**Problem**: `Failed to load runtime config`

**Solution**: Use example as template:
```bash
# Copy example configuration
cp config/runtime.example.json config/runtime.json

# Edit with your settings
# Ensure all required fields are present
```

## Debugging Tools

### Enable Debug Logging

```typescript
// Set debug level
import { setLogLevel } from '@/utils/logger';
setLogLevel('debug');

// Or use environment variable
DEBUG=symindx:* bun start
```

### Performance Profiling

```typescript
// Use built-in profiler
const profiler = new Profiler();
profiler.start('agent-tick');

await agent.tick();

const report = profiler.stop('agent-tick');
console.log('Tick performance:', report);
```

### Memory Inspection

```typescript
// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}, 10000);
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Enable debug logging for detailed information
2. **Search GitHub Issues**: Many problems have been solved before
3. **Join Discord**: Get real-time help from the community
4. **Create an Issue**: Provide minimal reproduction steps

### Reporting Bugs

When reporting issues, include:
- SYMindX version
- Node.js/Bun version
- Operating system
- Error messages and stack traces
- Minimal code to reproduce

## Next Steps

- Review [Error Handling](./error-handling) patterns
- Learn about [Debugging Tools](./debugging-tools)
- Explore [Performance Optimization](../performance)
- Join our [Community](../community) for support
