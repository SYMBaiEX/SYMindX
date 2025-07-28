# Logging Standardization Migration Guide

This document outlines the standardized logging system implemented across all SYMindX modules.

## Overview

All modules now use a unified logging system that provides:
- Consistent log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Structured logging with proper context
- Performance tracking and metrics
- Domain-specific logger categories
- Elimination of console.log/console.error usage

## New Logging Architecture

### Standard Logger Categories

```typescript
export const LOGGER_CATEGORIES = {
  RUNTIME: 'Runtime',      // Core runtime operations
  AGENT: 'Agent',          // Agent lifecycle and operations
  PORTAL: 'Portal',        // AI provider interactions
  MEMORY: 'Memory',        // Memory provider operations
  EMOTION: 'Emotion',      // Emotion system events
  COGNITION: 'Cognition',  // Cognition module operations
  EXTENSION: 'Extension',  // Extension lifecycle
  API: 'API',              // HTTP/WebSocket API operations
  CLI: 'CLI',              // Command line interface
  WEBUI: 'WebUI',          // Web UI operations
  FACTORY: 'Factory',      // Module factory operations
  CONFIG: 'Config',        // Configuration resolution
  DEBUG: 'Debug',          // General debugging
} as const;
```

### Standard Usage Patterns

#### Basic Logger Import
```typescript
import { 
  standardLoggers, 
  createStandardLoggingPatterns,
  StandardLogContext 
} from '../utils/standard-logging.js';
```

#### Module-Level Implementation
```typescript
export class MyModule {
  // Standardized logging
  private logger = standardLoggers.runtime; // or appropriate category
  private loggingPatterns = createStandardLoggingPatterns(this.logger);
  
  async initialize(): Promise<void> {
    this.loggingPatterns.logInitialization('MyModule', this.config);
    
    try {
      // ... initialization logic
      this.loggingPatterns.logInitializationSuccess('MyModule');
    } catch (error) {
      this.loggingPatterns.logInitializationFailure('MyModule', error);
      throw error;
    }
  }
}
```

#### Structured Context Logging
```typescript
// Agent operations
this.loggingPatterns.logAgentOperation(
  agentId, 
  'activation', 
  true, 
  undefined, 
  { emotion: 'happy', extensionCount: 3 }
);

// Memory operations  
this.loggingPatterns.logMemoryOperation(
  'store', 
  'sqlite', 
  recordCount, 
  { agentId, duration: 150 }
);

// Portal operations
this.loggingPatterns.logPortalOperation(
  'groq', 
  'generateText', 
  tokenCount, 
  { agentId, model: 'llama-3.1-70b' }
);
```

#### Performance Logging
```typescript
const performanceLogger = this.loggingPatterns.getPerformanceLogger();

// Automatic timing
await performanceLogger.timeOperation('databaseQuery', async () => {
  return await this.db.query(sql);
}, { table: 'memories', agentId });

// Manual timing
performanceLogger.startOperation('op1', 'complexCalculation', { agentId });
// ... do work
performanceLogger.endOperation('op1', true);
```

## Migration Changes by Module

### Core Runtime (`src/core/runtime.ts`)
- ✅ Added standardized logging instances
- ✅ Replaced console.log with structured debug logging
- ✅ Replaced console.error with proper error logging
- ✅ Added proper context to configuration loading

### API Extension (`src/extensions/api/index.ts`)
- ✅ Added standardized logging instances
- ✅ Updated import to use standard-logging
- ✅ Ready for WebSocket and HTTP request logging

### Base Portal (`src/portals/base-portal.ts`)
- ✅ Added standardized logging instances
- ✅ Replaced console.log/error with structured logging patterns
- ✅ Added proper initialization tracking with context

### Memory Providers (`src/modules/memory/providers/*/index.ts`)
- ✅ Added standardized logging instances
- ✅ Updated imports to use standard-logging
- ✅ Ready for memory operation logging

### Emotion Modules (`src/modules/emotion/composite-emotion.ts`)
- ✅ Added standardized logging instances  
- ✅ Updated imports to use standard-logging
- ✅ Ready for emotion state change logging

### WebUI Extension (`src/extensions/api/webui/index.ts`)
- ✅ Updated imports to use standard-logging
- ✅ Replaced logger instantiation with standardLoggers.webui
- ✅ Updated multiple console.error statements to proper error logging
- ✅ Updated console.log statements to proper info logging

### Config Resolver (`src/utils/config-resolver.ts`)
- ✅ Added standard logging import
- ✅ Replaced console.warn with proper warning logging
- ✅ Replaced console.error with proper error logging
- ✅ Added structured context for validation results

## Eliminated Console Usage

### Before (❌ Deprecated)
```typescript
console.log('Agent started:', agentId);
console.error('Failed to load config:', error);
console.warn('Missing API key');
console.debug('Processing request');
```

### After (✅ Standardized)
```typescript
this.logger.agent('Agent started', { agentId });
this.logger.error('Configuration loading failed', error, { configPath });
this.logger.warn('API key not configured', { provider: 'groq' });
this.logger.debug('Processing request', { requestId, agentId });
```

## Performance Benefits

### Structured Data
- All log entries include relevant context
- Consistent metadata format across modules
- Searchable and filterable log data

### Performance Tracking
- Built-in operation timing
- Automatic performance metrics
- Resource usage monitoring

### Error Correlation
- Proper error context preservation
- Stack trace integration
- Cross-module error tracking

## Log Level Standards

### DEBUG
- Internal state changes
- Configuration resolution steps
- Detailed operation flow

### INFO  
- Successful operations
- Agent lifecycle events
- System state changes

### WARN
- Configuration warnings
- Deprecated feature usage
- Recoverable errors

### ERROR
- Operation failures
- Configuration errors
- Exception handling

### FATAL
- Critical system failures
- Unrecoverable errors
- Emergency shutdowns

## Standard Context Fields

```typescript
interface StandardLogContext {
  agentId?: string;
  agentName?: string;
  extensionId?: string;
  portalName?: string;
  memoryProvider?: string;
  emotionType?: string;
  operation?: string;
  duration?: number;
  success?: boolean;
  errorCode?: string;
  moduleType?: string;
  sessionId?: string;
  requestId?: string;
  version?: string;
}
```

## Remaining Console Usage

Only these console usages remain (intentional):
- **Build scripts** (`scripts/bun-build.ts`) - Build output formatting
- **CLI utilities** (`src/utils/cli-ui.ts`) - User interface display
- **CLI commands** (`src/cli/index.ts`) - Interactive command output
- **Test files** (`tests/`) - Test result output
- **Logger implementation** (`src/utils/logger.ts`) - Internal console output

All production runtime code now uses standardized logging.

## Best Practices

1. **Always use appropriate logger category** for your module type
2. **Include relevant context** in log entries for debugging
3. **Use performance logging** for operations that may be slow
4. **Log initialization/failure patterns** for consistent startup tracking
5. **Avoid console.* calls** in production runtime code
6. **Use structured context** instead of string interpolation

## Validation

The logging system provides:
- ✅ Consistent log format across all modules
- ✅ Structured metadata for monitoring and debugging
- ✅ Performance metrics and timing
- ✅ Proper error correlation and context
- ✅ Elimination of console.log/error in runtime code
- ✅ Domain-specific logger categories