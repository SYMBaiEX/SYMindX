# Context System Migration Guide

This guide provides step-by-step instructions for migrating from the legacy context system to the unified context system in SYMindX.

## Overview

The unified context system provides enhanced context management with:
- **Unified Context Interface**: Single interface for all context types
- **Runtime Context Adapter**: Seamless adaptation between old and new systems
- **Migration Helper**: Automated migration tools and validation
- **Backward Compatibility**: Zero-downtime migration with fallback support
- **Context Enrichment**: Enhanced cognitive, social, and environmental context

## Migration Strategy

### Phase 1: Preparation and Assessment
### Phase 2: Integration and Testing
### Phase 3: Migration and Validation
### Phase 4: Cleanup and Optimization

---

## Phase 1: Preparation and Assessment

### 1.1 Assess Current Context Usage

Before starting migration, analyze your current context usage:

```typescript
// Check existing context usage patterns
const runtime = new SYMindXRuntime(config);

// Get context system status
const contextStatus = runtime.getContextSystemStatus();
console.log('Context system status:', contextStatus);

// Review legacy usage patterns
const compatibilityStats = runtime.getCompatibilityStats();
console.log('Legacy usage:', compatibilityStats);
```

### 1.2 Review Agent Context Dependencies

Identify agents that heavily use context:

```typescript
// List agents and their context usage
const agents = runtime.listAgents();
for (const agent of agents) {
  const contextUsage = runtime.getAgentContextUsage(agent.id);
  console.log(`Agent ${agent.name}:`, contextUsage);
}
```

### 1.3 Check Migration Readiness

Validate that your agents are ready for migration:

```typescript
import { ContextMigrationHelper } from '../src/core/context/integration';

const migrationHelper = runtime.getMigrationHelper();

for (const agent of agents) {
  const validation = await migrationHelper.validateAgentContext(agent);
  
  if (!validation.valid) {
    console.log(`Agent ${agent.name} needs attention:`, validation.errors);
  } else {
    console.log(`Agent ${agent.name} is ready for migration`);
  }
}
```

---

## Phase 2: Integration and Testing

### 2.1 Enable Context System

The context system is automatically initialized when the runtime starts. Verify initialization:

```typescript
// runtime.ts initialization automatically includes:
// - Context bootstrapper
// - Runtime adapter
// - Migration helper
// - Backward compatibility layer

// Check context system status
const contextSystem = runtime.getContextSystem();
if (contextSystem) {
  console.log('Context system components available:');
  console.log('- Context Manager:', !!contextSystem.contextManager);
  console.log('- Runtime Adapter:', !!contextSystem.runtimeAdapter);
  console.log('- Migration Helper:', !!contextSystem.migrationHelper);
  console.log('- Compatibility Layer:', !!contextSystem.compatibilityLayer);
}
```

### 2.2 Test Compatibility Layer

The compatibility layer ensures existing code continues to work:

```typescript
// Your existing cognition modules are automatically wrapped
// This happens transparently in the runtime

// Test that agents continue to work normally
const agent = await runtime.getAgent('your-agent-id');
const thoughtResult = await agent.cognition.think(agent, context);

// Verify enhanced context features are available
const conversationContext = runtime.getContextManager()?.getActiveContext(agent.id);
if (conversationContext) {
  console.log('Enhanced conversation context available');
}
```

### 2.3 Verify Context Enhancement

Test that enhanced context features work:

```typescript
// The runtime automatically creates enhanced contexts
// Test by triggering agent thinking

await agent.processEvent({
  id: 'test-event',
  type: 'message',
  data: { content: 'Hello, how are you?' },
  // ... other event properties
});

// Check context enhancement
const contextStats = runtime.getCompatibilityStats();
console.log('Context enhancements:', {
  legacyCalls: contextStats.legacyContextCalls,
  unifiedCalls: contextStats.unifiedContextCalls,
  fallbackActivations: contextStats.fallbackActivations
});
```

---

## Phase 3: Migration and Validation

### 3.1 Create Migration Plans

Create migration plans for each agent:

```typescript
import { ContextMigrationHelper } from '../src/core/context/integration';

const migrationHelper = runtime.getMigrationHelper();

// Create migration plan for an agent
const agent = await runtime.getAgent('your-agent-id');
const migrationPlan = migrationHelper.createMigrationPlan(agent);

console.log('Migration plan:', {
  id: migrationPlan.id,
  name: migrationPlan.name,
  steps: migrationPlan.steps.length,
  estimatedDuration: migrationPlan.estimated_duration_ms
});
```

### 3.2 Execute Migrations

Execute migration plans with validation:

```typescript
// Dry run first to validate
const dryRunResult = await migrationHelper.executeMigrationPlan(
  migrationPlan,
  { dryRun: true }
);

if (dryRunResult.status === 'completed') {
  console.log('Dry run successful, proceeding with actual migration');
  
  // Execute actual migration
  const migrationResult = await migrationHelper.executeMigrationPlan(
    migrationPlan,
    { skipConfirmation: true }
  );
  
  console.log('Migration result:', migrationResult.status);
  
  if (migrationResult.status === 'completed') {
    console.log(`Migration completed in ${migrationResult.duration_ms}ms`);
  } else {
    console.log('Migration errors:', migrationResult.errors);
  }
}
```

### 3.3 Batch Migration

For multiple agents, use batch migration:

```typescript
const allAgents = runtime.listAgents();
const migrationPlans = [];

// Create plans for all agents
for (const agent of allAgents) {
  const validation = await migrationHelper.validateAgentContext(agent);
  
  if (validation.valid && validation.score > 0.8) {
    const plan = migrationHelper.createMigrationPlan(agent);
    migrationPlans.push(plan);
  }
}

// Execute migrations in batches
const batchSize = 3;
for (let i = 0; i < migrationPlans.length; i += batchSize) {
  const batch = migrationPlans.slice(i, i + batchSize);
  
  console.log(`Migrating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(migrationPlans.length / batchSize)}`);
  
  const batchPromises = batch.map(plan => 
    migrationHelper.executeMigrationPlan(plan, { skipConfirmation: true })
  );
  
  const results = await Promise.all(batchPromises);
  
  const successful = results.filter(r => r.status === 'completed').length;
  console.log(`Batch completed: ${successful}/${batch.length} successful`);
}
```

### 3.4 Monitor Migration Progress

Track migration progress and handle failures:

```typescript
// Monitor all active migrations
const activeMigrations = migrationHelper.listMigrations();

for (const migration of activeMigrations) {
  console.log(`Migration ${migration.plan_id}:`, {
    status: migration.status,
    progress: `${migration.current_step}/${migration.total_steps}`,
    errors: migration.errors.length
  });
  
  // Handle failed migrations
  if (migration.status === 'failed') {
    console.log(`Migration failed for plan ${migration.plan_id}:`, migration.errors);
    
    // Consider rollback or manual intervention
    // The system automatically rolls back if rollbackOnFailure is enabled
  }
}
```

---

## Phase 4: Cleanup and Optimization

### 4.1 Verify Migration Success

After migration, verify that all agents are working with the unified context:

```typescript
// Check migration status for all agents
const migrationStatus = runtime.getAdapter()?.getMigrationStatus();

for (const [agentId, status] of Object.entries(migrationStatus || {})) {
  console.log(`Agent ${agentId}: ${status.stage} (${status.timestamp})`);
}

// Verify context enhancement
const stats = runtime.getCompatibilityStats();
console.log('Post-migration statistics:', {
  totalAgents: runtime.listAgents().length,
  unifiedContextCalls: stats.unifiedContextCalls,
  legacyContextCalls: stats.legacyContextCalls,
  fallbackRate: stats.fallbackActivations / (stats.unifiedContextCalls + stats.legacyContextCalls)
});
```

### 4.2 Performance Optimization

Optimize the context system for your workload:

```typescript
// Get performance metrics
const performanceStats = runtime.getCompatibilityStats().performanceMetrics;

console.log('Performance metrics:', {
  averageOverhead: performanceStats.averageCompatibilityOverhead,
  cacheHitRate: performanceStats.cacheHitRate,
  totalOverheadMs: performanceStats.totalOverheadMs
});

// Adjust configuration if needed
const contextConfig = {
  cacheSize: performanceStats.cacheHitRate > 0.9 ? 200 : 500,
  contextRetentionMs: 1800000, // 30 minutes
  enableGradualMigration: false, // Disable after migration complete
};
```

### 4.3 Disable Legacy Features

Once migration is complete, you can disable legacy compatibility:

```typescript
// Update runtime configuration
const config = {
  context: {
    enableBackwardCompatibility: false,
    enableMigration: false,
    enablePerformanceMonitoring: true
  }
};

// Restart runtime with new configuration
// This will disable the compatibility layer and migration helper
```

---

## Common Migration Patterns

### Pattern 1: Custom Cognition Modules

If you have custom cognition modules, ensure they work with the compatibility layer:

```typescript
// Your existing cognition module
class CustomCognitionModule implements CognitionModule {
  async think(agent: Agent, context: ThoughtContext): Promise<ThoughtResult> {
    // Your custom logic here
    
    // The context will be automatically enhanced by the runtime
    // Access enhanced features through metadata if needed
    const enhancedContext = (context as any).enhancedContext;
    
    return {
      thoughts: ['Custom thought'],
      emotions: agent.emotion.getCurrentState(),
      actions: [],
      memories: [],
      confidence: 0.8
    };
  }
  
  // ... other methods
}

// The compatibility layer automatically wraps your module
// No changes needed to your implementation
```

### Pattern 2: Context-Aware Extensions

Update extensions to use enhanced context:

```typescript
// Before (legacy extension)
class MyExtension implements Extension {
  async processEvent(agent: Agent, event: AgentEvent): Promise<void> {
    // Limited context access
    const memories = await agent.memory.retrieve(agent.id, 'recent', 5);
  }
}

// After (enhanced extension)
class MyExtension implements Extension {
  async processEvent(agent: Agent, event: AgentEvent): Promise<void> {
    // Access enhanced context through the runtime
    const runtime = this.getRuntime(); // Your method to get runtime reference
    const contextManager = runtime.getContextManager();
    
    if (contextManager) {
      const conversationContext = contextManager.getActiveContext(agent.id);
      if (conversationContext) {
        // Use rich conversation context
        const currentTopic = conversationContext.currentTopic;
        const recentMessages = conversationContext.messages.slice(-3);
        const mood = conversationContext.state.mood;
        
        // Process with enhanced context
      }
    }
    
    // Fallback to legacy approach
    const memories = await agent.memory.retrieve(agent.id, 'recent', 5);
  }
}
```

### Pattern 3: Testing Context Enhancement

Test that context enhancement works as expected:

```typescript
describe('Context Enhancement', () => {
  let runtime: SYMindXRuntime;
  let agent: Agent;
  
  beforeEach(async () => {
    runtime = new SYMindXRuntime(testConfig);
    await runtime.start();
    agent = await runtime.getAgent('test-agent');
  });
  
  test('should enhance context with conversation data', async () => {
    // Create conversation context
    const contextManager = runtime.getContextManager();
    const context = contextManager?.getOrCreateContext(agent.id, 'user', 'Hello');
    
    // Add some conversation
    contextManager?.addMessage(context!, 'user', 'How are you?');
    contextManager?.addMessage(context!, agent.id, 'I am doing well, thank you!');
    
    // Process agent thinking
    const event = {
      id: 'test-event',
      type: 'message',
      data: { content: 'What can you help me with?' },
      // ... other properties
    };
    
    await agent.processEvent(event);
    
    // Verify context enhancement
    const stats = runtime.getCompatibilityStats();
    expect(stats.unifiedContextCalls).toBeGreaterThan(0);
    
    const conversationSummary = contextManager?.getContextSummary(context!.id);
    expect(conversationSummary?.recentMessages).toHaveLength(3);
  });
  
  test('should fallback gracefully on context system failure', async () => {
    // Simulate context system failure
    const adapter = runtime.getAdapter();
    const originalMethod = adapter?.getOrCreateUnifiedContext;
    
    if (adapter) {
      adapter.getOrCreateUnifiedContext = jest.fn(() => {
        throw new Error('Context system failure');
      });
    }
    
    // Agent should still work with legacy context
    const event = {
      id: 'test-event',
      type: 'message',
      data: { content: 'Test message' },
      // ... other properties
    };
    
    await expect(agent.processEvent(event)).resolves.not.toThrow();
    
    // Should have used fallback
    const stats = runtime.getCompatibilityStats();
    expect(stats.fallbackActivations).toBeGreaterThan(0);
    
    // Restore original method
    if (adapter && originalMethod) {
      adapter.getOrCreateUnifiedContext = originalMethod;
    }
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. Context System Initialization Failure

**Symptoms**: Context enhancement not working, only legacy context available
**Solution**:
```typescript
// Check context system status
const status = runtime.getContextSystemStatus();
console.log('Context system status:', status);

if (!status.initialized) {
  console.log('Context system errors:', status.errors);
  console.log('Context system warnings:', status.warnings);
}

// Manual initialization if needed
const contextSystem = runtime.getContextSystem();
if (!contextSystem) {
  console.log('Context system not available - check configuration');
}
```

#### 2. Migration Failures

**Symptoms**: Migration plans fail validation or execution
**Solution**:
```typescript
// Check agent validation
const validation = await migrationHelper.validateAgentContext(agent);
console.log('Validation result:', validation);

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  console.log('Validation warnings:', validation.warnings);
  console.log('Validation score:', validation.score);
  
  // Address specific issues before retrying
}

// Check for resource conflicts
const activeMigrations = migrationHelper.listMigrations();
const runningMigrations = activeMigrations.filter(m => m.status === 'running');
console.log(`Active migrations: ${runningMigrations.length}`);
```

#### 3. Performance Issues

**Symptoms**: Slow context creation, high memory usage
**Solution**:
```typescript
// Check performance metrics
const stats = runtime.getCompatibilityStats();
console.log('Performance impact:', {
  averageOverhead: stats.performanceMetrics.averageCompatibilityOverhead,
  totalOverhead: stats.performanceMetrics.totalOverheadMs,
  cacheHitRate: stats.performanceMetrics.cacheHitRate
});

// Optimize configuration
const compatibilityConfig = {
  cacheCompatibilityResults: true,
  maxCompatibilityCacheSize: 100,
  enablePerformanceMetrics: false, // Disable in production
};

// Clear caches if needed
const compatibilityLayer = runtime.getCompatibilityLayer();
compatibilityLayer?.clearCache();
```

#### 4. Backward Compatibility Issues

**Symptoms**: Existing code throwing errors, unexpected behavior
**Solution**:
```typescript
// Check compatibility layer status
const compatibilityLayer = runtime.getCompatibilityLayer();
const usageReport = compatibilityLayer?.getLegacyUsageReport();

console.log('Legacy usage report:', {
  totalCalls: usageReport?.totalCalls,
  migrationCandidates: usageReport?.migrationCandidates,
  recentCalls: usageReport?.recentCalls?.length
});

// Enable compatibility warnings for debugging
compatibilityLayer?.setCompatibilityWarnings(true);

// Check for specific error patterns
const recentCalls = usageReport?.recentCalls || [];
const failedCalls = recentCalls.filter(call => call.error);
console.log('Failed compatibility calls:', failedCalls);
```

### Getting Help

1. **Check Logs**: Enable debug logging to see detailed context operations
2. **Performance Monitoring**: Use the built-in performance metrics to identify bottlenecks
3. **Migration Reports**: Review migration validation reports for specific issues
4. **Compatibility Stats**: Monitor compatibility layer usage to track migration progress

### Best Practices

1. **Gradual Migration**: Start with a few agents and gradually migrate others
2. **Test Thoroughly**: Use dry runs and staging environments
3. **Monitor Performance**: Keep track of context system performance impact
4. **Maintain Fallbacks**: Keep compatibility layer enabled during transition
5. **Validate Regularly**: Check migration status and context health regularly

---

## Configuration Reference

### Context Bootstrapper Configuration

```typescript
interface ContextBootstrapperConfig {
  // Core system settings
  enableUnifiedContext: boolean;          // default: true
  enableMigration: boolean;               // default: true
  enableBackwardCompatibility: boolean;   // default: true
  
  // Initialization settings
  autoMigrateOnStartup: boolean;          // default: false
  migrationBatchSize: number;             // default: 5
  initializationTimeoutMs: number;        // default: 30000
  
  // Health checking
  enableHealthChecks: boolean;            // default: true
  healthCheckIntervalMs: number;          // default: 60000
  
  // Performance monitoring
  enablePerformanceMonitoring: boolean;   // default: true
  performanceMetricsIntervalMs: number;   // default: 300000
}
```

### Runtime Adapter Configuration

```typescript
interface RuntimeContextAdapterConfig {
  // Enable/disable different context enhancements
  enableSessionTracking: boolean;         // default: true
  enableCognitiveContext: boolean;        // default: true
  enableSocialContext: boolean;           // default: true
  
  // Performance settings
  cacheSize: number;                      // default: 100
  contextRetentionMs: number;             // default: 3600000
  
  // Compatibility settings
  preserveLegacyContext: boolean;         // default: true
  enableGradualMigration: boolean;        // default: true
}
```

### Migration Helper Configuration

```typescript
interface ContextMigrationHelperConfig {
  // Migration strategy
  strategy: 'gradual' | 'immediate' | 'selective';  // default: 'gradual'
  
  // Validation settings
  enableValidation: boolean;              // default: true
  validationThreshold: number;            // default: 0.8
  
  // Rollback settings
  enableAutoRollback: boolean;            // default: true
  rollbackOnFailure: boolean;             // default: true
  
  // Performance settings
  maxConcurrentMigrations: number;        // default: 3
  migrationTimeoutMs: number;             // default: 300000
  
  // Safety settings
  requireConfirmation: boolean;           // default: false
  createBackups: boolean;                 // default: true
}
```

### Backward Compatibility Configuration

```typescript
interface BackwardCompatibilityConfig {
  // Compatibility modes
  enableLegacyMode: boolean;              // default: true
  enableTransparentFallback: boolean;     // default: true
  enableCompatibilityWarnings: boolean;   // default: false
  
  // Performance settings
  cacheCompatibilityResults: boolean;     // default: true
  maxCompatibilityCacheSize: number;      // default: 1000
  
  // Migration assistance
  trackLegacyUsage: boolean;              // default: true
  suggestMigrations: boolean;             // default: true
  
  // Debugging
  logCompatibilityEvents: boolean;        // default: false
  enablePerformanceMetrics: boolean;      // default: true
}
```

---

This migration guide provides comprehensive instructions for upgrading to the unified context system while maintaining backward compatibility and ensuring zero downtime during the transition.