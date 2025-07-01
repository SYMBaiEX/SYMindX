---
sidebar_position: 15
sidebar_label: "Migration"
title: "Migration"
description: "Version upgrades and migration guides"
---

# Migration

Version upgrades and migration guides

## Overview

SYMindX follows semantic versioning and provides comprehensive migration guides for each major release. This section helps you upgrade your agents and extensions smoothly while maintaining backward compatibility where possible.

## Migration Strategy

### Version Compatibility

SYMindX uses semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes requiring migration
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, fully compatible

```json
// package.json version constraints
{
  "dependencies": {
    "@symindx/core": "^2.0.0",    // Accept 2.x.x, not 3.0.0
    "@symindx/memory": "~2.1.0",   // Accept 2.1.x only
    "@symindx/types": "2.1.3"      // Exact version
  }
}
```

### Pre-Migration Checklist

Before upgrading:

1. **Backup Your Data**
   ```bash
   # Backup SQLite database
   cp data/memories.db data/memories.backup.db
   
   # Export agent configurations
   cp -r characters/ characters.backup/
   ```

2. **Check Breaking Changes**
   ```bash
   # View changelog
   npm view @symindx/core changelog
   
   # Check deprecation warnings
   npm run lint:deprecations
   ```

3. **Test in Development**
   ```bash
   # Create test branch
   git checkout -b upgrade/v2
   
   # Install new version
   npm install @symindx/core@next
   
   # Run tests
   npm test
   ```

## Version 2.0 Migration

### Breaking Changes

1. **Module System Refactor**
   ```typescript
   // Old (v1.x)
   import { MemoryProvider } from '@symindx/core';
   const memory = new MemoryProvider('sqlite', config);
   
   // New (v2.x)
   import { createMemoryProvider } from '@symindx/core';
   const memory = createMemoryProvider('sqlite', config);
   ```

2. **Event System Updates**
   ```typescript
   // Old (v1.x)
   agent.on('message', (data) => { });
   
   // New (v2.x)
   agent.events.on('message', (event) => {
     const { data, metadata } = event;
   });
   ```

3. **Configuration Structure**
   ```json
   // Old (v1.x)
   {
     "memory": {
       "type": "sqlite",
       "path": "./memories.db"
     }
   }
   
   // New (v2.x)
   {
     "modules": {
       "memory": {
         "provider": "sqlite",
         "config": {
           "dbPath": "./memories.db"
         }
       }
     }
   }
   ```

### Migration Steps

#### Step 1: Update Dependencies

```bash
# Update core packages
npm install @symindx/core@^2.0.0 @symindx/types@^2.0.0

# Update optional modules
npm install @symindx/memory-sqlite@^2.0.0
npm install @symindx/portal-openai@^2.0.0

# Remove deprecated packages
npm uninstall @symindx/legacy-utils
```

#### Step 2: Update Module Imports

```typescript
// migration-script.ts
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.ts');

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  
  // Update imports
  content = content.replace(
    /import { MemoryProvider } from '@symindx\/core'/g,
    "import { createMemoryProvider } from '@symindx/core'"
  );
  
  // Update instantiation
  content = content.replace(
    /new MemoryProvider\((.*?)\)/g,
    'createMemoryProvider($1)'
  );
  
  writeFileSync(file, content);
});
```

#### Step 3: Update Configuration Files

```typescript
// config-migrator.ts
export function migrateConfig(oldConfig: any): RuntimeConfig {
  return {
    version: '2.0',
    modules: {
      memory: {
        provider: oldConfig.memory.type,
        config: {
          dbPath: oldConfig.memory.path,
          ...oldConfig.memory.options
        }
      },
      emotion: {
        provider: oldConfig.emotion?.type || 'rune_emotion_stack',
        config: oldConfig.emotion?.config || {}
      },
      cognition: {
        provider: oldConfig.cognition?.type || 'htn_planner',
        config: oldConfig.cognition?.config || {}
      }
    },
    agents: oldConfig.agents || [],
    extensions: oldConfig.extensions || {}
  };
}
```

#### Step 4: Update Character Files

```typescript
// character-migrator.ts
export function migrateCharacter(oldChar: any): AgentCharacter {
  return {
    id: oldChar.id,
    name: oldChar.name,
    personality: oldChar.personality,
    psyche: oldChar.psyche || {
      creativity: 0.7,
      confidence: 0.8,
      empathy: 0.6
    },
    voice: oldChar.voice || {
      tone: 'neutral',
      style: 'conversational'
    },
    modules: {
      memory: oldChar.memory || 'sqlite',
      emotion: oldChar.emotion || 'rune_emotion_stack',
      cognition: oldChar.cognition || 'htn_planner',
      portal: oldChar.ai || 'openai'
    },
    config: oldChar.config || {}
  };
}
```

### Database Migration

#### SQLite Schema Updates

```sql
-- Migration script for v2.0
BEGIN TRANSACTION;

-- Add new columns
ALTER TABLE memories ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE memories ADD COLUMN metadata JSON;

-- Create new indexes
CREATE INDEX idx_memories_version ON memories(version);
CREATE INDEX idx_memories_metadata ON memories(metadata);

-- Update existing records
UPDATE memories SET version = 1 WHERE version IS NULL;

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version) VALUES (200);

COMMIT;
```

#### Data Migration Tool

```typescript
// data-migrator.ts
export class DataMigrator {
  async migrate(fromVersion: string, toVersion: string): Promise<void> {
    const migrations = this.getMigrations(fromVersion, toVersion);
    
    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}`);
      
      try {
        await migration.up();
        await this.recordMigration(migration);
      } catch (error) {
        console.error(`Migration failed: ${migration.name}`, error);
        await migration.down?.();
        throw error;
      }
    }
  }
  
  private getMigrations(from: string, to: string): Migration[] {
    return [
      {
        name: 'v1_to_v2_memories',
        up: async () => {
          // Update memory format
          const memories = await this.db.all('SELECT * FROM memories');
          for (const memory of memories) {
            const updated = this.transformMemory(memory);
            await this.db.run('UPDATE memories SET ? WHERE id = ?', updated, memory.id);
          }
        }
      }
    ];
  }
}
```

## Extension Migration

### API Changes

```typescript
// Old Extension API (v1.x)
export class MyExtension {
  constructor(private config: any) {}
  
  async initialize(agent: Agent): Promise<void> {
    // Setup
  }
  
  async process(message: Message): Promise<void> {
    // Handle message
  }
}

// New Extension API (v2.x)
export class MyExtension implements Extension {
  name = 'my-extension';
  
  async init(context: ExtensionContext): Promise<void> {
    this.agent = context.agent;
    this.config = context.config;
    this.events = context.events;
  }
  
  async tick(deltaTime: number): Promise<void> {
    // Regular updates
  }
  
  async shutdown(): Promise<void> {
    // Cleanup
  }
}
```

### Portal Migration

```typescript
// Portal interface changes
// Old (v1.x)
export interface Portal {
  complete(prompt: string): Promise<string>;
}

// New (v2.x)
export interface Portal {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
  streamText?(prompt: string, options?: StreamOptions): AsyncIterable<string>;
}

// Migration adapter
export class PortalAdapter implements Portal {
  constructor(private oldPortal: OldPortal) {}
  
  async generateText(prompt: string, options?: GenerateOptions): Promise<string> {
    return this.oldPortal.complete(prompt);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    throw new Error('Embeddings not supported in v1 portal');
  }
}
```

## Rollback Procedures

If issues arise after migration:

### Quick Rollback

```bash
# Restore from backup
mv data/memories.backup.db data/memories.db
mv characters.backup/ characters/

# Revert package versions
git checkout package.json package-lock.json
npm install

# Restart services
npm run start
```

### Gradual Rollback

```typescript
// Feature flag for gradual migration
export class CompatibilityLayer {
  private version = process.env.SYMINDX_VERSION || '2.0';
  
  getMemoryProvider(type: string, config: any) {
    if (this.version === '1.0') {
      return new LegacyMemoryProvider(type, config);
    }
    return createMemoryProvider(type, config);
  }
}
```

## Migration Tools

### CLI Migration Tool

```bash
# Install migration CLI
npm install -g @symindx/migrate

# Check current version
symindx-migrate status

# Run migration
symindx-migrate up --to 2.0.0

# Rollback if needed
symindx-migrate down --to 1.5.0
```

### Automated Testing

```typescript
// migration.test.ts
describe('Migration v1 to v2', () => {
  it('should migrate configuration', async () => {
    const oldConfig = loadV1Config();
    const newConfig = migrateConfig(oldConfig);
    
    expect(newConfig.version).toBe('2.0');
    expect(newConfig.modules.memory.provider).toBe('sqlite');
  });
  
  it('should maintain data integrity', async () => {
    const migrator = new DataMigrator();
    await migrator.migrate('1.0', '2.0');
    
    const count = await db.get('SELECT COUNT(*) as count FROM memories');
    expect(count.count).toBe(originalCount);
  });
});
```

## Best Practices

1. **Test Thoroughly**: Run full test suite after migration
2. **Monitor Closely**: Watch logs and metrics after deployment
3. **Communicate Changes**: Notify users of breaking changes
4. **Provide Support**: Offer migration assistance in Discord
5. **Document Everything**: Keep detailed migration logs

## Next Steps

- Review [Breaking Changes](./breaking-changes) for your version
- Follow [Version Upgrade Guide](./version-upgrades) 
- Check [Data Migration](./data-migration) procedures
- Join [Discord](../community/discord) for migration support
