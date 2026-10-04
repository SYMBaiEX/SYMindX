# SYMindX Migration Guide

The mind-agents package imports in this guide are not part of v2; the library is `packages/agent` (`@symindx/agent`).

This guide helps you migrate to the enhanced SYMindX system with all the improvements from the 8-agent coordination effort.

## Overview of Changes

### 1. Security Enhancements (Breaking Changes)
- **Authentication Required**: All API calls now require authentication tokens
- **Encryption**: Context data is encrypted at rest and in transit
- **Rate Limiting**: API endpoints have rate limits to prevent abuse
- **Audit Logging**: All operations are logged for compliance

### 2. Performance Optimizations
- **Context Caching**: Multi-layer caching (L1/L2/L3) for improved performance
- **Connection Pooling**: Database connections are now pooled
- **Lazy Loading**: Agents are loaded on-demand to reduce memory usage
- **Parallel Processing**: Multi-agent operations can run in parallel

### 3. Type Safety Improvements
- **Strict TypeScript**: All modules now use strict TypeScript
- **Interface Segregation**: Cleaner, more focused interfaces
- **Generic Type Parameters**: Better type inference throughout
- **Discriminated Unions**: Safer type handling for variants

### 4. Module System Refactoring
- **Factory Pattern**: All modules use consistent factory functions
- **Dependency Injection**: Better testability and flexibility
- **Module Registry**: Centralized module discovery and loading
- **Hot Swapping**: Modules can be updated without restart

### 5. Compliance Implementation
- **GDPR Support**: Built-in data export and deletion
- **Data Anonymization**: PII can be automatically anonymized
- **Consent Management**: User consent tracking
- **Audit Trail**: Complete audit logging for compliance

## Migration Steps

### Step 1: Update Dependencies

```bash
# Update to latest version
npm update @symindx/mind-agents

# Install new security dependencies
npm install bcrypt jsonwebtoken rate-limiter-flexible

# Install compliance dependencies
npm install @gdpr/toolkit anonymize-data
```

### Step 2: Update Configuration

#### Old Configuration:
```typescript
const config = {
  agents: [...],
  memory: { type: 'sqlite' },
  emotion: { type: 'composite' },
};
```

#### New Configuration:
```typescript
const config: RuntimeConfig = {
  agents: [...],
  memory: { type: 'sqlite' },
  emotion: { type: 'composite' },
  security: {
    enabled: true,
    authRequired: true,
    encryption: true,
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
    },
    audit: {
      enabled: true,
      logLevel: 'info',
    },
  },
  performance: {
    monitoring: true,
    caching: true,
    optimization: 'aggressive',
  },
  compliance: {
    gdpr: true,
    hipaa: false,
    sox: false,
  },
  context: {
    maxContextsPerAgent: 100,
    defaultTtl: 3600000,
    enableEnrichment: true,
    cacheConfig: {
      l1Size: 100,
      l2Size: 1000,
      l3Size: 10000,
    },
  },
};
```

### Step 3: Update API Calls

#### Authentication (NEW - Required)
```typescript
// Old way - no authentication
const response = await api.sendMessage(agentId, message);

// New way - authentication required
const token = await securityManager.authenticate({
  userId: 'user-123',
  agentId: agentId,
});

const response = await api.sendMessage(agentId, message, {
  headers: { Authorization: `Bearer ${token}` }
});
```

#### Context Management
```typescript
// Old way
const context = runtime.createContext(agentId, userId);

// New way - with lifecycle management
const contextManager = runtime.getContextManager();
const context = contextManager.getOrCreateContext(agentId, userId);

// Context enrichment is automatic
console.log(context.enrichment); // Contains memory, emotion, social data
```

### Step 4: Update Module Usage

#### Memory Providers
```typescript
// Old way
import { SQLiteMemory } from '@symindx/memories';
const memory = new SQLiteMemory(config);

// New way - factory pattern
const memory = await runtime.createMemoryProvider('sqlite', {
  path: './data/memories.db',
  poolSize: 10, // New: connection pooling
});
```

#### Emotion Modules
```typescript
// Old way
import { CompositeEmotion } from '@symindx/emotions';
const emotion = new CompositeEmotion();

// New way - modular emotions
const emotion = await runtime.createEmotionModule('composite', {
  baseEmotion: 'neutral',
  volatility: 0.5,
  decayRate: 0.1, // New: emotion decay
});
```

### Step 5: Handle Breaking Changes

#### Type Name Changes
```typescript
// Old types
import { Agent, Memory, Emotion } from '@symindx/types';

// New types - more specific names
import { 
  AgentInstance,          // was: Agent
  MemoryProvider,         // was: Memory
  EmotionModule,          // was: Emotion
  CognitionModule,        // was: Cognition
  ExtensionModule,        // was: Extension
} from '@symindx/mind-agents/types';
```

#### Method Signature Changes
```typescript
// Old method signatures
agent.processMessage(message: string): string

// New method signatures - async with context
agent.processMessage(
  message: string,
  context: UnifiedContext,
  options?: ProcessOptions
): Promise<AgentResponse>
```

#### Event System Changes
```typescript
// Old events
runtime.on('message', handler);

// New events - more granular
runtime.eventBus.on('agent:message:received', handler);
runtime.eventBus.on('agent:message:processed', handler);
runtime.eventBus.on('context:enriched', handler);
runtime.eventBus.on('security:auth:success', handler);
```

### Step 6: Implement Security

```typescript
// Initialize security manager
const securityManager = runtime.getSecurityManager();

// Enable security features
await securityManager.enableEncryption();
await securityManager.enableAuditLogging();
await securityManager.enableRateLimiting();

// Implement authentication middleware
app.use(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const user = await securityManager.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Step 7: Implement Compliance

```typescript
// Initialize compliance manager
const complianceManager = runtime.getComplianceManager();

// Enable GDPR compliance
await complianceManager.enableGDPR();

// Implement data export endpoint
app.get('/api/users/:userId/data', async (req, res) => {
  const exportedData = await complianceManager.exportUserData(req.params.userId);
  res.json(exportedData);
});

// Implement data deletion endpoint
app.delete('/api/users/:userId/data', async (req, res) => {
  await complianceManager.deleteUserData(req.params.userId);
  res.status(204).send();
});
```

### Step 8: Update Tests

```typescript
// Old test pattern
describe('Agent', () => {
  it('should process message', () => {
    const response = agent.processMessage('Hello');
    expect(response).toBe('Hi there!');
  });
});

// New test pattern - async with mocks
describe('Agent', () => {
  let securityManager: jest.Mocked<SecurityManager>;
  let contextManager: jest.Mocked<ContextLifecycleManager>;

  beforeEach(() => {
    securityManager = createMockSecurityManager();
    contextManager = createMockContextManager();
  });

  it('should process message with security', async () => {
    const token = await securityManager.authenticate({
      userId: 'test-user',
      agentId: 'test-agent',
    });

    const context = contextManager.getOrCreateContext('test-agent', 'test-user');
    const response = await agent.processMessage('Hello', context, {
      authToken: token,
    });

    expect(response.content).toBe('Hi there!');
    expect(securityManager.verifyToken).toHaveBeenCalledWith(token);
  });
});
```

## Migration Script

We provide an automated migration script for common scenarios:

```bash
# Run migration script
npx @symindx/migrate --from 1.x --to 2.0

# Options:
# --dry-run          Preview changes without applying
# --backup           Create backup before migration
# --skip-security    Skip security setup (not recommended)
# --skip-compliance  Skip compliance setup
```

## Rollback Strategy

If you need to rollback:

1. **Database**: Restore from backup (created automatically by migration script)
2. **Configuration**: Revert to previous configuration file
3. **Code**: Use git to revert to previous version
4. **Dependencies**: Restore package-lock.json and run npm install

## Common Issues

### Issue 1: Authentication Errors
```
Error: Authentication required for this operation
```
**Solution**: Ensure you're passing authentication tokens with all API calls

### Issue 2: Type Errors After Update
```
TS2345: Argument of type 'Agent' is not assignable to parameter of type 'AgentInstance'
```
**Solution**: Update type imports to use new type names

### Issue 3: Performance Degradation
```
Warning: Cache miss rate above threshold
```
**Solution**: Adjust cache sizes in configuration based on your workload

### Issue 4: Compliance Violations
```
Error: Operation violates GDPR compliance rules
```
**Solution**: Ensure user consent is obtained before processing personal data

## Support

For migration assistance:
- Documentation: https://docs.symindx.ai/migration
- Discord: https://discord.gg/symindx
- Email: support@symindx.ai

## Version Compatibility

| Old Version | New Version | Migration Required |
|-------------|-------------|-------------------|
| 1.0.x       | 2.0.0       | Yes - Breaking    |
| 1.1.x       | 2.0.0       | Yes - Breaking    |
| 1.2.x       | 2.0.0       | Yes - Minor       |
| 2.0.x       | 2.0.x       | No                |