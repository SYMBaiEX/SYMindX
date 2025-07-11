# Type System Migration Guide

## Overview

This guide helps developers transition from void/undefined returns to proper typed results in the SYMindX system. The new type system provides better error handling, debugging information, and type safety.

## Key Changes

### 1. Function Return Types

#### Before (Void Returns)
```typescript
// Old pattern - void returns
interface OldModule {
  initialize(config: any): void;
  cleanup(): void;
  processEvent(event: any): void;
}

// Usage
module.initialize(config); // No way to know if it succeeded
module.cleanup(); // No feedback on what was cleaned up
```

#### After (Typed Results)
```typescript
// New pattern - typed results
interface NewModule {
  initialize(config: any): Promise<InitializationResult>;
  cleanup(): Promise<CleanupResult>;
  processEvent(event: any): Promise<EventProcessingResult>;
}

// Usage
const initResult = await module.initialize(config);
if (initResult.success) {
  console.log(`Initialized in ${initResult.duration}ms`);
} else {
  console.error(`Failed to initialize: ${initResult.error}`);
}
```

### 2. Error Handling

#### Before
```typescript
// Old pattern - exceptions and silent failures
try {
  agent.updateEmotion('happy', 0.8);
  // No way to know what changed
} catch (error) {
  // Generic error handling
  console.error('Something went wrong:', error);
}
```

#### After
```typescript
// New pattern - structured error handling
const result = await agent.updateEmotion('happy', 0.8);
if (result.success) {
  console.log('Emotion updated:', result.emotionChange);
  console.log('Previous:', result.emotionChange.previousEmotion);
  console.log('New:', result.emotionChange.newEmotion);
} else {
  console.error('Failed to update emotion:', result.error);
  // Access to structured error information
}
```

### 3. Validation Results

#### Before
```typescript
// Old pattern - boolean or exception-based validation
function validateConfig(config: any): boolean {
  // Returns true/false with no details
  return config.name && config.version;
}
```

#### After
```typescript
// New pattern - detailed validation results
function validateConfig(config: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (!config.name) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'REQUIRED_FIELD',
      severity: 'error',
      suggestion: 'Provide a valid name string'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date() as Timestamp,
    metadata: {
      validatorId: 'config-validator',
      validationType: 'schema'
    }
  };
}
```

## Migration Steps

### Step 1: Update Function Signatures

Replace void returns with appropriate result types:

```typescript
// Before
class MemoryProvider {
  async store(memory: MemoryRecord): Promise<void> {
    // Implementation
  }
}

// After
class MemoryProvider {
  async store(memory: MemoryRecord): Promise<MemoryStorageResult> {
    try {
      // Implementation
      return {
        success: true,
        memoryId: memory.id as MemoryId,
        timestamp: new Date() as Timestamp,
        metadata: {
          agentId: memory.agentId,
          memoryType: memory.type,
          tier: 'working',
          size: memory.content.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date() as Timestamp,
        metadata: {
          agentId: memory.agentId,
          memoryType: memory.type
        }
      };
    }
  }
}
```

### Step 2: Update Event Handlers

Replace void event handlers with result-returning handlers:

```typescript
// Before
eventBus.on('agent-action', (event) => {
  // Process event
  console.log('Event processed');
});

// After
eventBus.on('agent-action', (event): EventProcessingResult => {
  try {
    // Process event
    return {
      success: true,
      processed: true,
      timestamp: new Date() as Timestamp,
      eventId: event.id as EventId,
      metadata: {
        processingTime: Date.now() - event.timestamp.getTime(),
        actionsTriggered: ['log-event'],
        stateChanges: {}
      }
    };
  } catch (error) {
    return {
      success: false,
      processed: false,
      timestamp: new Date() as Timestamp,
      eventId: event.id as EventId,
      metadata: {
        processingTime: Date.now() - event.timestamp.getTime(),
        actionsTriggered: [],
        error: error.message
      }
    };
  }
});
```

### Step 3: Update Module Initialization

Replace void initialization with result-based initialization:

```typescript
// Before
class EmotionModule {
  async initialize(config: EmotionConfig): Promise<void> {
    this.config = config;
    this.setupEmotions();
  }
}

// After
class EmotionModule {
  async initialize(config: EmotionConfig): Promise<InitializationResult> {
    const startTime = Date.now();
    
    try {
      this.config = config;
      const emotions = this.setupEmotions();
      
      return {
        success: true,
        timestamp: new Date() as Timestamp,
        duration: Date.now() - startTime,
        metadata: {
          moduleId: 'emotion-module',
          version: '1.0.0',
          dependencies: [],
          emotionsLoaded: emotions.length,
          configValidation: this.validateConfig(config)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize emotion module: ${error.message}`,
        timestamp: new Date() as Timestamp,
        duration: Date.now() - startTime,
        metadata: {
          moduleId: 'emotion-module',
          version: '1.0.0',
          error: error.message
        }
      };
    }
  }
}
```

### Step 4: Update State Management

Replace void state updates with result-based updates:

```typescript
// Before
class Agent {
  updateState(newState: AgentState): void {
    this.state = { ...this.state, ...newState };
  }
}

// After
class Agent {
  updateState(newState: AgentState): StateUpdateResult {
    try {
      const oldState = { ...this.state };
      this.state = { ...this.state, ...newState };
      
      const changes = Object.keys(newState).map(key => ({
        field: key,
        oldValue: oldState[key],
        newValue: newState[key]
      }));
      
      return {
        success: true,
        timestamp: new Date() as Timestamp,
        changes,
        metadata: {
          updateType: 'partial',
          fieldsUpdated: changes.length,
          conflictsResolved: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update state: ${error.message}`,
        timestamp: new Date() as Timestamp,
        changes: [],
        metadata: {
          updateType: 'failed',
          error: error.message
        }
      };
    }
  }
}
```

## Best Practices

### 1. Always Return Result Types

Never return void from functions that can fail or provide useful feedback:

```typescript
// ❌ Bad - void return
async function processData(data: any): Promise<void> {
  // Processing logic
}

// ✅ Good - result return
async function processData(data: any): Promise<ExecutionResult> {
  try {
    // Processing logic
    return {
      success: true,
      data: processedData,
      timestamp: new Date() as Timestamp,
      duration: processingTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date() as Timestamp,
      duration: processingTime
    };
  }
}
```

### 2. Provide Meaningful Metadata

Always include relevant metadata in results:

```typescript
// ✅ Good - detailed metadata
return {
  success: true,
  timestamp: new Date() as Timestamp,
  metadata: {
    agentId: agent.id,
    operation: 'memory-store',
    duration: processingTime,
    memoryType: memory.type,
    tier: memory.tier,
    size: memory.content.length,
    embeddingModel: 'sentence-transformers'
  }
};
```

### 3. Use Proper Error Handling

Provide structured error information:

```typescript
// ✅ Good - structured error handling
catch (error) {
  return {
    success: false,
    error: error.message,
    timestamp: new Date() as Timestamp,
    metadata: {
      errorType: error.constructor.name,
      errorCode: error.code,
      stackTrace: error.stack,
      context: {
        operation: 'portal-generation',
        portalId: this.id,
        model: this.config.model
      }
    }
  };
}
```

### 4. Validate Inputs

Always validate inputs and return validation results:

```typescript
function executeCommand(command: string, params: any): CommandExecutionResult {
  // Validate inputs first
  const validation = validateCommand(command, params);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Invalid command or parameters',
      timestamp: new Date() as Timestamp,
      command: {
        id: generateId(),
        name: command,
        parameters: params,
        executor: 'command-system',
        duration: 0
      },
      metadata: {
        validation,
        reason: 'validation-failed'
      }
    };
  }
  
  // Execute command
  // ...
}
```

### 5. Use Branded Types

Use branded types for better type safety:

```typescript
// ✅ Good - branded types
function getAgent(agentId: AgentId): Agent | undefined {
  return this.agents.get(agentId);
}

// Usage
const agentId = 'agent-123' as AgentId;
const agent = getAgent(agentId);
```

## Common Patterns

### 1. Initialization Pattern

```typescript
async function initializeModule(config: ModuleConfig): Promise<InitializationResult> {
  const startTime = Date.now();
  
  try {
    // Validation
    const validation = validateConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Invalid configuration',
        timestamp: new Date() as Timestamp,
        duration: Date.now() - startTime,
        metadata: {
          moduleId: config.id,
          validation
        }
      };
    }
    
    // Initialize
    await performInitialization(config);
    
    return {
      success: true,
      timestamp: new Date() as Timestamp,
      duration: Date.now() - startTime,
      metadata: {
        moduleId: config.id,
        version: config.version,
        dependencies: config.dependencies
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      timestamp: new Date() as Timestamp,
      duration: Date.now() - startTime,
      metadata: {
        moduleId: config.id,
        error: error.message
      }
    };
  }
}
```

### 2. Event Processing Pattern

```typescript
function processEvent(event: AgentEvent): EventProcessingResult {
  const startTime = Date.now();
  
  try {
    const actions = determineActions(event);
    const stateChanges = applyStateChanges(event);
    
    return {
      success: true,
      processed: true,
      timestamp: new Date() as Timestamp,
      eventId: event.id as EventId,
      metadata: {
        processingTime: Date.now() - startTime,
        actionsTriggered: actions.map(a => a.name),
        stateChanges: stateChanges
      }
    };
  } catch (error) {
    return {
      success: false,
      processed: false,
      timestamp: new Date() as Timestamp,
      eventId: event.id as EventId,
      metadata: {
        processingTime: Date.now() - startTime,
        error: error.message
      }
    };
  }
}
```

### 3. Resource Management Pattern

```typescript
async function allocateResource(type: string, requirements: any): Promise<ResourceAllocationResult> {
  try {
    const resource = await findAvailableResource(type, requirements);
    if (!resource) {
      return {
        success: false,
        error: 'No available resources',
        timestamp: new Date() as Timestamp,
        metadata: {
          resourceType: type,
          requirements,
          availableResources: await getAvailableResources(type)
        }
      };
    }
    
    await reserveResource(resource);
    
    return {
      success: true,
      resource: {
        id: resource.id,
        type: resource.type,
        status: 'allocated',
        usage: resource.usage
      },
      timestamp: new Date() as Timestamp,
      metadata: {
        requesterId: getCurrentRequesterId(),
        allocationTime: Date.now() - startTime,
        quotaUsage: await getQuotaUsage()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date() as Timestamp,
      metadata: {
        resourceType: type,
        requirements,
        error: error.message
      }
    };
  }
}
```

## Migration Checklist

- [ ] Update all function signatures that return void
- [ ] Replace exception-based error handling with result types
- [ ] Add proper validation with ValidationResult
- [ ] Update event handlers to return EventProcessingResult
- [ ] Add metadata to all results
- [ ] Use branded types for IDs and important values
- [ ] Update tests to check result types
- [ ] Add proper error recovery logic
- [ ] Update documentation to reflect new patterns
- [ ] Consider backward compatibility for existing code

## Backward Compatibility

To maintain backward compatibility during migration, create wrapper functions:

```typescript
// Wrapper for backward compatibility
class BackwardCompatibleModule {
  // New method with result type
  async initializeWithResult(config: any): Promise<InitializationResult> {
    // Implementation
  }
  
  // Legacy method that throws on error
  async initialize(config: any): Promise<void> {
    const result = await this.initializeWithResult(config);
    if (!result.success) {
      throw new Error(result.message || 'Initialization failed');
    }
  }
}
```

This approach allows gradual migration while maintaining existing functionality.