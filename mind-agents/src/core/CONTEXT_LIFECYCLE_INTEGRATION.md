# Context Lifecycle Integration Guide for SYMindX Runtime

## Overview

This document provides detailed integration recommendations for incorporating the Context Lifecycle Management system into the existing SYMindX runtime.

## Integration Points

### 1. Runtime Constructor Integration

Add the context lifecycle manager as a core runtime component:

```typescript
// In SYMindXRuntime constructor
import { createContextLifecycleManager, ContextLifecycleManager } from './context/context-lifecycle-manager';

export class SYMindXRuntime implements AgentRuntime {
  // Add to existing properties
  public contextLifecycleManager: ContextLifecycleManager;
  
  constructor(config: RuntimeConfig) {
    // ... existing initialization
    
    // Initialize context lifecycle manager
    this.contextLifecycleManager = createContextLifecycleManager({
      maxContextsPerAgent: config.contextConfig?.maxContextsPerAgent || 10,
      defaultTtl: config.contextConfig?.defaultTtl || 3600000,
      cleanupInterval: config.contextConfig?.cleanupInterval || 300000,
      enableMonitoring: config.contextConfig?.enableMonitoring ?? true,
      enableEnrichment: config.contextConfig?.enableEnrichment ?? true,
      memoryThresholds: {
        warning: 100 * 1024 * 1024,  // 100MB
        critical: 500 * 1024 * 1024   // 500MB
      },
      errorRecovery: {
        maxRetries: 3,
        retryDelay: 1000,
        enableAutoRecovery: true
      }
    });
  }
}
```

### 2. Runtime Initialization Integration

Integrate context lifecycle manager initialization in the start() method:

```typescript
async start(): Promise<void> {
  try {
    // ... existing initialization phases
    
    // Phase 3.5: Initialize Context Lifecycle Manager
    runtimeLogger.info('🔄 Initializing Context Lifecycle Manager...');
    await this.contextLifecycleManager.initialize();
    
    // ... continue with existing phases
  } catch (error) {
    // ... existing error handling
  }
}
```

### 3. Agent Activation Context Integration

Modify the `activateAgent` method to create and manage contexts:

```typescript
async activateAgent(agentId: string): Promise<Agent> {
  const lazyAgent = this.lazyAgents.get(agentId);
  if (!lazyAgent) {
    throw new Error(`Lazy agent ${agentId} not found`);
  }
  
  if (lazyAgent.status === LazyAgentStatus.LOADED && lazyAgent.agent) {
    return lazyAgent.agent; // Already active
  }
  
  try {
    lazyAgent.status = LazyAgentStatus.LOADING;
    
    // **NEW: Create context for agent activation**
    const contextRequest: ContextRequest = {
      agentId,
      requestType: 'conversation',
      baseContext: {
        sessionId: `session_${Date.now()}`,
        agentId,
        timestamp: new Date().toISOString()
      },
      scope: {
        visibility: 'private',
        ttl: this.config.contextConfig?.defaultTtl || 3600000
      },
      enrichment: {
        enabled: true,
        steps: ['basic_enrichment', 'memory_enrichment']
      },
      monitoring: {
        enabled: true,
        metrics: ['performance', 'memory', 'errors']
      },
      metadata: {
        activationType: 'lazy_loading',
        activatedAt: new Date().toISOString()
      }
    };
    
    const contextId = await this.contextLifecycleManager.requestContext(contextRequest);
    runtimeLogger.info(`🔄 Context created for agent activation: ${contextId}`);
    
    // Create the full agent using existing loadAgent method
    const agent = await this.loadAgent(lazyAgent.config, lazyAgent.character_id);
    
    // **NEW: Associate context with agent**
    if (agent.context) {
      // If agent has existing context capabilities, integrate
      const managedContext = await this.contextLifecycleManager.getContext(contextId);
      if (managedContext) {
        agent.context = { ...agent.context, ...managedContext.context };
        agent.contextId = contextId; // Add context ID to agent
      }
    }
    
    // ... existing agent activation logic
    
    return agent;
  } catch (error) {
    // **NEW: Handle context cleanup on activation failure**
    try {
      const existingContext = await this.contextLifecycleManager.getContextByAgent(agentId);
      if (existingContext) {
        await this.contextLifecycleManager.disposeContext(existingContext.id);
      }
    } catch (cleanupError) {
      runtimeLogger.error(`❌ Failed to cleanup context after activation failure:`, cleanupError as Error);
    }
    
    // ... existing error handling
    throw error;
  }
}
```

### 4. Agent Deactivation Context Integration

Modify the `deactivateAgent` method to properly cleanup contexts:

```typescript
async deactivateAgent(agentId: string): Promise<void> {
  const agent = this.agents.get(agentId);
  if (!agent) {
    return;
  }
  
  try {
    // **NEW: Handle context cleanup before agent shutdown**
    const agentContext = await this.contextLifecycleManager.getContextByAgent(agentId);
    if (agentContext) {
      // Preserve important context data to memory if needed
      if (agentContext.config.scope?.visibility === 'shared' || 
          agentContext.context.persistToMemory) {
        // Export context for potential future restoration
        try {
          const contextData = await this.contextLifecycleManager.exportContext(agentContext.id);
          // Store in agent's memory system or external storage
          runtimeLogger.info(`🔄 Context data exported for agent ${agentId}`);
        } catch (exportError) {
          runtimeLogger.error(`❌ Failed to export context for ${agentId}:`, exportError as Error);
        }
      }
      
      // Schedule cleanup with delay to allow for potential quick reactivation
      await this.contextLifecycleManager.scheduleCleanup(agentContext.id, 30000); // 30 second delay
      runtimeLogger.info(`🔄 Context cleanup scheduled for agent: ${agentId}`);
    }
    
    // Shutdown agent resources
    await this.shutdownAgent(agent);
    
    // ... existing deactivation logic
    
  } catch (error) {
    // ... existing error handling
  }
}
```

### 5. Runtime Shutdown Integration

Integrate context lifecycle manager shutdown in the stop() method:

```typescript
async stop(): Promise<void> {
  if (!this.isRunning) return;
  
  runtimeLogger.info('🛑 Stopping SYMindX Runtime...');
  this.isRunning = false;
  
  // Clear tick timer
  if (this.tickTimer) {
    clearInterval(this.tickTimer);
    this.tickTimer = undefined;
  }
  
  // **NEW: Shutdown context lifecycle manager before agents**
  try {
    runtimeLogger.info('🔄 Shutting down Context Lifecycle Manager...');
    await this.contextLifecycleManager.shutdown();
  } catch (error) {
    runtimeLogger.error('❌ Error shutting down Context Lifecycle Manager:', error as Error);
  }
  
  // Gracefully shutdown all agents
  for (const agent of this.agents.values()) {
    await this.shutdownAgent(agent);
  }
  
  // ... existing shutdown logic
}
```

### 6. Event Bus Integration

Integrate context lifecycle events with the existing event bus:

```typescript
// In runtime constructor, after eventBus initialization
private setupContextEventIntegration(): void {
  // Subscribe to context lifecycle events
  this.contextLifecycleManager.onLifecycleEvent(
    ContextLifecycleEvent.CONTEXT_CREATED,
    async (data) => {
      this.eventBus.emit({
        id: `event_${Date.now()}`,
        type: 'context_created',
        source: 'context-lifecycle',
        data: {
          contextId: data.contextId,
          agentId: data.agentId,
          timestamp: data.timestamp
        },
        timestamp: data.timestamp,
        processed: false
      });
    }
  );
  
  this.contextLifecycleManager.onLifecycleEvent(
    ContextLifecycleEvent.CONTEXT_DISPOSED,
    async (data) => {
      this.eventBus.emit({
        id: `event_${Date.now()}`,
        type: 'context_disposed',
        source: 'context-lifecycle',
        data: {
          contextId: data.contextId,
          agentId: data.agentId,
          timestamp: data.timestamp
        },
        timestamp: data.timestamp,
        processed: false
      });
    }
  );
  
  // Add more event subscriptions as needed
}
```

### 7. Extension Integration

Allow extensions to interact with context lifecycle:

```typescript
// In extension initialization
async initializeExtensions(agent: Agent): Promise<void> {
  for (const extension of agent.extensions) {
    // ... existing extension initialization
    
    // **NEW: Provide context access to extensions**
    if (extension.supportsContext && agent.contextId) {
      const context = await this.contextLifecycleManager.getContext(agent.contextId);
      if (context) {
        extension.context = context.context;
        extension.contextId = agent.contextId;
      }
    }
  }
}
```

### 8. Memory System Integration

Integrate with the existing memory system for context persistence:

```typescript
// In runtime, add method to restore agent context from memory
async restoreAgentContextFromMemory(agentId: string): Promise<string | null> {
  try {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.memory) return null;
    
    // Search for preserved context in memory
    const contextMemories = await agent.memory.searchMemories({
      tags: ['context', 'preserved'],
      agentId,
      limit: 1
    });
    
    if (contextMemories.length > 0) {
      const contextMemory = contextMemories[0];
      if (contextMemory.metadata?.['contextData']) {
        // Import the preserved context
        const contextId = await this.contextLifecycleManager.importContext(
          contextMemory.metadata['contextData']
        );
        runtimeLogger.info(`🔄 Context restored from memory: ${contextId} for agent ${agentId}`);
        return contextId;
      }
    }
    
    return null;
  } catch (error) {
    runtimeLogger.error(`❌ Failed to restore context from memory for ${agentId}:`, error as Error);
    return null;
  }
}
```

## Configuration Integration

Add context lifecycle configuration to RuntimeConfig:

```typescript
// In types/core/runtime.ts or similar
export interface RuntimeConfig {
  // ... existing properties
  
  contextConfig?: {
    maxContextsPerAgent?: number;
    defaultTtl?: number;
    cleanupInterval?: number;
    enableMonitoring?: boolean;
    enableEnrichment?: boolean;
    memoryThresholds?: {
      warning: number;
      critical: number;
    };
    errorRecovery?: {
      maxRetries: number;
      retryDelay: number;
      enableAutoRecovery: boolean;
    };
    validation?: {
      strict: boolean;
      rules: string[];
    };
  };
}
```

## Performance Considerations

### Memory Management
- The context lifecycle manager includes automatic cleanup and memory monitoring
- Set appropriate TTL values to prevent memory leaks
- Use the health check functionality to monitor system health

### Performance Monitoring
- Enable monitoring to track context creation/cleanup performance
- Use the built-in metrics to identify bottlenecks
- Set up alerting for memory thresholds

### Error Recovery
- The system includes automatic error recovery mechanisms
- Configure retry policies based on your system's requirements
- Use lifecycle hooks for custom error handling

## Best Practices

1. **Context Scoping**: Use appropriate visibility settings for contexts
2. **Cleanup Strategy**: Schedule cleanup rather than immediate disposal for better performance
3. **Memory Integration**: Export important contexts to memory before cleanup
4. **Event Integration**: Subscribe to relevant lifecycle events for monitoring
5. **Extension Support**: Provide context access to extensions that need it
6. **Error Handling**: Implement proper error handling for context operations

## Testing Recommendations

1. Test agent activation/deactivation with context lifecycle
2. Verify context cleanup doesn't interfere with agent functionality
3. Test memory integration and context restoration
4. Verify performance under load with multiple agents
5. Test error recovery scenarios

## Migration Notes

- The integration is designed to be backward compatible
- Existing agents will work without modification
- Context features are opt-in and can be gradually adopted
- No breaking changes to existing APIs

## Monitoring and Observability

Use the built-in health check and metrics:

```typescript
// Add to runtime monitoring
async getSystemHealth(): Promise<SystemHealthResult> {
  // ... existing health checks
  
  const contextHealth = await this.contextLifecycleManager.healthCheck();
  
  return {
    // ... existing health data
    contextLifecycle: contextHealth
  };
}
```

This integration provides a comprehensive context lifecycle management system while maintaining compatibility with the existing SYMindX architecture.