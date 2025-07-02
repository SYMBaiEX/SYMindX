# PostgreSQL Provider Auto-Deployment Guide

The PostgreSQL memory provider for SYMindX features **automatic schema deployment** - just provide a connection string and the provider will handle all database setup automatically.

## Quick Setup

### 1. Installation
No additional packages needed beyond the standard SYMindX dependencies. The PostgreSQL provider uses the `pg` package which is already included.

### 2. Basic Usage
```typescript
import { createDefaultPostgresProvider } from './modules/memory/providers/postgres/index.js'

// Just provide a connection string - everything else is automatic
const provider = createDefaultPostgresProvider(
  'postgresql://user:password@host:port/database'
)

// The schema deploys automatically on first use
await provider.store(agentId, memory)
```

### 3. Environment Variable Setup
```bash
# Set your PostgreSQL connection string
export DATABASE_URL="postgresql://user:password@host:port/database"

# Optional: Disable SSL for local development
export DATABASE_URL="postgresql://user:password@localhost:5432/symindx?sslmode=disable"
```

## What Gets Auto-Deployed

### Database Objects Created
- ✅ **Tables**: `memories`, `memories_archive`, `schema_versions`
- ✅ **Extensions**: `vector`, `pg_trgm`, `btree_gin`, `uuid-ossp` (if available)
- ✅ **Indexes**: Primary, composite, vector (HNSW/IVFFlat), full-text search
- ✅ **Functions**: Vector search, cleanup, statistics, archiving
- ✅ **Triggers**: Auto-update timestamps
- ✅ **Views**: Enriched memory views, materialized summaries

### Automatic Features
- 🔍 **Vector Search**: pgvector integration with fallback
- 📊 **Performance Indexes**: Optimized for common query patterns  
- 🧹 **Auto-Cleanup**: Expired memory removal
- 📈 **Statistics**: Built-in analytics functions
- 🔄 **Schema Versioning**: Track and manage changes
- 🛡️ **Error Handling**: Graceful degradation if extensions unavailable

## Cloud Provider Examples

### AWS RDS
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://username:password@instance.region.rds.amazonaws.com:5432/dbname?sslmode=require'
)
```

### Google Cloud SQL
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://username:password@ip-address:5432/dbname?sslmode=require'
)
```

### Azure Database
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://username@servername:password@servername.postgres.database.azure.com:5432/dbname?sslmode=require'
)
```

### Supabase
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require'
)
```

### Neon
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://username:password@ep-name.region.neon.tech/dbname?sslmode=require'
)
```

### Railway
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://postgres:password@containers-us-west-id.railway.app:port/railway?sslmode=require'
)
```

### Render
```typescript
const provider = createDefaultPostgresProvider(
  'postgresql://username:password@hostname:5432/database_name?sslmode=require'
)
```

## Permission Requirements

### Minimum Required Permissions
The database user needs these permissions for auto-deployment:
```sql
GRANT CREATE ON SCHEMA public TO your_user;
GRANT USAGE ON SCHEMA public TO your_user;
GRANT CREATE ON DATABASE your_database TO your_user;
```

### Extension Installation
If you want pgvector support, run as superuser:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Or request your cloud provider to enable it (most support pgvector now).

## Configuration Options

### Production Configuration
```typescript
import { createPostgresMemoryProvider } from './modules/memory/providers/postgres/index.js'

const provider = createPostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL!,
  maxConnections: 20,           // Adjust based on database limits
  autoDeploySchema: true,       // Safe for production
  ssl: true,                    // Always use SSL in production
  tableName: 'agent_memories',  // Custom table name
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
})
```

### Development Configuration
```typescript
const provider = createPostgresMemoryProvider({
  connectionString: 'postgresql://user:password@localhost:5432/symindx_dev',
  maxConnections: 5,
  autoDeploySchema: true,
  ssl: false,                   // Disable SSL for local development
  tableName: 'dev_memories'
})
```

## Health Monitoring

### Built-in Health Checks
```typescript
// Check database health
const health = await provider.healthCheck()
console.log('Healthy:', health.healthy)
console.log('Latency:', health.latency, 'ms') 
console.log('Version:', health.version)

// Monitor connection pool
const pool = provider.getPoolStatus()
console.log('Connections:', pool.total, pool.idle, pool.waiting)

// Get schema information
const schema = await provider.getSchemaInfo()
console.log('Schema version:', schema.version)
console.log('Tables:', schema.tables)
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied
```
ERROR: permission denied for schema public
```
**Solution**: Grant CREATE permissions to your database user.

#### 2. Extension Not Available
```
WARNING: Could not enable extension vector
```
**Solution**: This is expected if pgvector isn't installed. The provider works without it.

#### 3. Connection Limit Exceeded
```
ERROR: remaining connection slots are reserved
```
**Solution**: Reduce `maxConnections` in your configuration.

#### 4. SSL Required
```
ERROR: SSL connection required
```
**Solution**: Add `?sslmode=require` to your connection string or set `ssl: true`.

### Debug Mode
Enable PostgreSQL client debugging:
```bash
DEBUG=pg:* node your-app.js
```

## Migration from Other Providers

### From SQLite
```typescript
// 1. Export from SQLite
const sqliteData = await sqliteProvider.exportMemories()

// 2. Import to PostgreSQL  
const postgresProvider = createDefaultPostgresProvider(connectionString)
for (const [agentId, memories] of Object.entries(sqliteData)) {
  for (const memory of memories) {
    await postgresProvider.store(agentId, memory)
  }
}
```

### From Supabase/Neon to Generic PostgreSQL
Since they're all PostgreSQL, you can often:
1. Export data with `pg_dump`
2. Import with `pg_restore` 
3. Let the provider handle schema updates

## Performance Tips

### Optimize for Your Workload
- **High Write Volume**: Increase `maxConnections`
- **Vector Search Heavy**: Ensure pgvector extension is enabled
- **Large Datasets**: Consider partitioning (contact support)
- **Read Heavy**: Use read replicas with separate connection strings

### Monitor Performance
```sql
-- Check table and index sizes
SELECT * FROM get_memory_table_stats();

-- Run maintenance
SELECT maintain_memories_table();
```

## Security Best Practices

1. **Always use SSL in production**
2. **Use environment variables for connection strings**
3. **Grant minimum required permissions**
4. **Enable connection limits**
5. **Monitor for unusual activity**

## Support

For issues with the PostgreSQL provider:
1. Check the logs for specific error messages
2. Verify your connection string format
3. Test with a simple PostgreSQL client first
4. Check database permissions
5. Review cloud provider documentation

The auto-deployment system is designed to be robust and handle most edge cases gracefully.