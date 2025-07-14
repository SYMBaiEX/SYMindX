# PostgreSQL Memory Provider

A comprehensive memory provider for SYMindX that uses PostgreSQL as a backend with automatic schema deployment, vector search capabilities, and production-ready optimizations.

## Features

- 🚀 **Auto-deployment**: Automatically deploys complete database schema on first connection
- 🔍 **Vector Search**: Full pgvector integration with HNSW and IVFFlat indexes
- 📝 **Full-text Search**: PostgreSQL native text search with ranking
- 🏗️ **Production Ready**: Connection pooling, monitoring, and performance optimizations
- 🔄 **Hybrid Search**: Combined vector and text search with weighted scoring
- 📊 **Analytics**: Built-in statistics and performance monitoring
- 🧹 **Auto-cleanup**: Automatic expiration of short-term memories
- 🔒 **Schema Versioning**: Track and manage schema changes

## Quick Start

```typescript
import { createPostgresMemoryProvider } from './modules/memory/providers/postgres/index.js';

// Simple setup - just provide a connection string
const provider = createPostgresMemoryProvider({
  connectionString: 'postgresql://user:password@localhost:5432/symindx',
});

// The schema will be automatically deployed on first use
await provider.store('agent-1', {
  id: 'memory-1',
  type: 'EXPERIENCE',
  content: 'User asked about weather',
  importance: 0.8,
  timestamp: new Date(),
});
```

## Configuration Options

```typescript
interface PostgresMemoryConfig {
  connectionString: string; // Required: PostgreSQL connection string
  maxConnections?: number; // Pool size (default: 20)
  connectionTimeoutMillis?: number; // Connection timeout (default: 5000)
  idleTimeoutMillis?: number; // Idle timeout (default: 30000)
  ssl?: boolean; // Enable SSL (default: true)
  tableName?: string; // Custom table name (default: 'memories')
  autoDeploySchema?: boolean; // Auto-deploy schema (default: true)
  enablePooling?: boolean; // Connection pooling (default: true)
}
```

## Database Requirements

### Minimum Requirements

- PostgreSQL 12+
- Basic table/function creation permissions

### Recommended Extensions

The provider will automatically attempt to install these extensions:

- `vector` - For vector similarity search (pgvector)
- `pg_trgm` - For trigram text matching
- `btree_gin` - For optimized GIN indexes
- `uuid-ossp` - For UUID generation

**Note**: If pgvector is not available, the provider will gracefully fallback to text-only search.

## Connection String Examples

### Local Development

```bash
postgresql://user:password@localhost:5432/symindx
```

### Cloud Providers

#### AWS RDS

```bash
postgresql://user:password@instance.region.rds.amazonaws.com:5432/symindx?sslmode=require
```

#### Google Cloud SQL

```bash
postgresql://user:password@ip:5432/symindx?sslmode=require
```

#### Azure Database

```bash
postgresql://user@server:password@server.postgres.database.azure.com:5432/symindx?sslmode=require
```

#### Supabase

```bash
postgresql://postgres:password@project.supabase.co:5432/postgres?sslmode=require
```

#### Neon

```bash
postgresql://user:password@ep-name.region.neon.tech/dbname?sslmode=require
```

## Advanced Usage

### Custom Configuration

```typescript
const provider = createPostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL!,
  maxConnections: 50,
  tableName: 'agent_memories',
  autoDeploySchema: true,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync('server-ca.pem').toString(),
    key: fs.readFileSync('client-key.pem').toString(),
    cert: fs.readFileSync('client-cert.pem').toString(),
  },
});
```

### Health Monitoring

```typescript
// Check database health
const health = await provider.healthCheck();
console.log('Database healthy:', health.healthy);
console.log('Latency:', health.latency, 'ms');
console.log('Version:', health.version);

// Monitor connection pool
const poolStatus = provider.getPoolStatus();
console.log('Active connections:', poolStatus.total);
console.log('Idle connections:', poolStatus.idle);
console.log('Waiting connections:', poolStatus.waiting);
```

### Schema Information

```typescript
// Get schema details
const schema = await provider.getSchemaInfo();
console.log('Schema version:', schema.version);
console.log('Tables:', schema.tables);
console.log('Functions:', schema.functions);
```

### Manual Schema Deployment

If you prefer to deploy the schema manually:

```typescript
// Disable auto-deployment
const provider = createPostgresMemoryProvider({
  connectionString: 'postgresql://...',
  autoDeploySchema: false,
});

// Deploy schema manually using the SQL file
// psql -d your_database -f src/modules/memory/providers/postgres/schema.sql
```

## Schema Overview

The auto-deployed schema includes:

### Tables

- `memories` - Main memory storage with vector embeddings
- `memories_archive` - Archived old memories
- `schema_versions` - Schema version tracking
- `memory_agent_summary` - Materialized view for quick stats

### Indexes

- Primary key and foreign key indexes
- Vector similarity indexes (HNSW/IVFFlat)
- Full-text search indexes
- Composite indexes for common query patterns

### Functions

- `search_memories()` - Vector similarity search with filtering
- `hybrid_search_memories()` - Combined vector + text search
- `cleanup_expired_memories()` - Remove expired memories
- `get_memories_stats()` - Comprehensive statistics
- `archive_old_memories()` - Archive old memories

### Triggers

- Auto-update `updated_at` timestamp on record changes

## Performance Optimizations

### Vector Search Performance

- HNSW index for best performance (falls back to IVFFlat)
- Configurable similarity thresholds
- Optimized for OpenAI embeddings (1536 dimensions)

### Query Performance

- Composite indexes for common access patterns
- Materialized views for frequent aggregations
- Connection pooling with configurable limits

### Memory Management

- Automatic cleanup of expired short-term memories
- Optional archiving of old memories
- Configurable retention policies

## Error Handling

The provider includes comprehensive error handling:

```typescript
try {
  await provider.store(agentId, memory);
} catch (error) {
  if (error.message.includes('connection')) {
    // Handle connection errors
    console.log('Database connection failed');
  } else if (error.message.includes('schema')) {
    // Handle schema deployment errors
    console.log('Schema deployment failed');
  }
}
```

## Migration from Other Providers

### From SQLite

```typescript
// Export from SQLite
const sqliteProvider = createSQLiteProvider(...)
const memories = await sqliteProvider.exportMemories()

// Import to PostgreSQL
const postgresProvider = createPostgresMemoryProvider(...)
for (const [agentId, agentMemories] of Object.entries(memories)) {
  for (const memory of agentMemories) {
    await postgresProvider.store(agentId, memory)
  }
}
```

### From Supabase/Neon

Since they also use PostgreSQL, you can often migrate by:

1. Dumping data from source database
2. Loading into new PostgreSQL instance
3. Letting the provider handle schema updates

## Troubleshooting

### Common Issues

1. **Permission Errors**

   ```
   ERROR: permission denied for schema public
   ```

   Ensure your database user has CREATE permissions on the public schema.

2. **Extension Installation Failures**

   ```
   WARNING: Could not enable extension vector
   ```

   This is expected if pgvector is not installed. The provider will work without it.

3. **Connection Pool Exhaustion**

   ```
   ERROR: remaining connection slots are reserved
   ```

   Reduce `maxConnections` or increase your database's connection limit.

4. **SSL Errors**
   ```
   ERROR: SSL connection required
   ```
   Set `ssl: true` in your configuration or add `?sslmode=require` to your connection string.

### Debug Mode

Enable detailed logging by setting the environment variable:

```bash
DEBUG=pg:* node your-app.js
```

## Production Deployment

### Recommended Settings

```typescript
const provider = createPostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  maxConnections: 20, // Adjust based on your database limits
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  ssl: true, // Always use SSL in production
  autoDeploySchema: true, // Safe for production use
});
```

### Monitoring

- Monitor connection pool usage with `getPoolStatus()`
- Regular health checks with `healthCheck()`
- Monitor database performance with `get_memory_table_stats()` function

### Maintenance

The provider includes automatic maintenance, but you can also run:

```sql
SELECT maintain_memories_table();
```

This will:

- Analyze tables for query optimization
- Refresh materialized views
- Clean up expired memories

## License

Part of the SYMindX project. See main project license.
