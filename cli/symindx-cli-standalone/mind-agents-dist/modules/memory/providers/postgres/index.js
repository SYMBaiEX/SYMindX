import { Pool } from 'pg';
import { MemoryType, MemoryDuration } from '../../../../types/agent.js';
import { BaseMemoryProvider } from '../../base-memory-provider.js';
export class PostgresMemoryProvider extends BaseMemoryProvider {
    pool;
    tableName;
    isInitialized = false;
    schemaVersion = '1.0.0';
    constructor(config) {
        const metadata = {
            id: 'postgres',
            name: 'PostgreSQL Memory Provider',
            description: 'A production-ready memory provider using PostgreSQL with auto-deployment and vector search',
            version: '1.0.0',
            author: 'SYMindX Team',
            supportsVectorSearch: true,
            isPersistent: true
        };
        super(config, metadata);
        this.config = {
            maxConnections: 20,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            ssl: true,
            tableName: 'memories',
            autoDeploySchema: true,
            enablePooling: true,
            ...config
        };
        this.tableName = this.config.tableName;
        this.pool = new Pool({
            connectionString: config.connectionString,
            max: this.config.maxConnections,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis,
            idleTimeoutMillis: this.config.idleTimeoutMillis,
            ssl: this.config.ssl ? (typeof this.config.ssl === 'boolean' ? { rejectUnauthorized: false } : this.config.ssl) : false,
            application_name: 'symindx-memory-provider'
        });
        this.initialize();
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            console.log('🚀 Initializing PostgreSQL memory provider...');
            await this.testConnection();
            if (this.config.autoDeploySchema) {
                await this.deploySchema();
            }
            this.isInitialized = true;
            console.log('✅ PostgreSQL memory provider initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize PostgreSQL memory provider:', error);
            throw error;
        }
    }
    async testConnection() {
        const client = await this.pool.connect();
        try {
            const result = await client.query('SELECT version()');
            console.log('🔗 Connected to PostgreSQL:', result.rows[0]?.version?.split(' ').slice(0, 2).join(' '));
        }
        finally {
            client.release();
        }
    }
    async deploySchema() {
        const client = await this.pool.connect();
        try {
            console.log('🏗️ Deploying database schema...');
            await this.enableExtensions(client);
            await this.createMemoriesTable(client);
            await this.createIndexes(client);
            await this.createFunctions(client);
            await this.createTriggers(client);
            await this.createSchemaVersioning(client);
            console.log('✅ Database schema deployed successfully');
        }
        finally {
            client.release();
        }
    }
    async enableExtensions(client) {
        const extensions = [
            'vector',
            'pg_trgm',
            'btree_gin',
            'uuid-ossp'
        ];
        for (const extension of extensions) {
            try {
                await client.query(`CREATE EXTENSION IF NOT EXISTS "${extension}";`);
                console.log(`📦 Enabled extension: ${extension}`);
            }
            catch (error) {
                console.warn(`⚠️ Could not enable extension ${extension}:`, error.message);
            }
        }
    }
    async createMemoriesTable(client) {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding vector(1536), -- OpenAI embedding dimension
        metadata JSONB DEFAULT '{}',
        importance REAL NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tags TEXT[] DEFAULT '{}',
        duration TEXT NOT NULL DEFAULT 'long_term' CHECK (duration IN ('short_term', 'long_term', 'working', 'episodic')),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
        await client.query(createTableQuery);
        console.log(`🗄️ Created table: ${this.tableName}`);
    }
    async createIndexes(client) {
        const indexes = [
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_id ON ${this.tableName}(agent_id);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_type ON ${this.tableName}(type);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_timestamp ON ${this.tableName}(timestamp DESC);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_importance ON ${this.tableName}(importance DESC);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_duration ON ${this.tableName}(duration);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_expires_at ON ${this.tableName}(expires_at) WHERE expires_at IS NOT NULL;`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_type_time ON ${this.tableName}(agent_id, type, timestamp DESC);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_duration_time ON ${this.tableName}(agent_id, duration, timestamp DESC);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_agent_importance ON ${this.tableName}(agent_id, importance DESC);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_content_fts ON ${this.tableName} USING gin(to_tsvector('english', content));`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata_gin ON ${this.tableName} USING gin(metadata);`,
            `CREATE INDEX IF NOT EXISTS idx_${this.tableName}_tags_gin ON ${this.tableName} USING gin(tags);`
        ];
        try {
            await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding_hnsw ON ${this.tableName} USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`);
            console.log('🔍 Created HNSW vector index');
        }
        catch (error) {
            try {
                await client.query(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_embedding_ivfflat ON ${this.tableName} USING ivfflat (embedding vector_cosine_ops);`);
                console.log('🔍 Created IVFFlat vector index');
            }
            catch (fallbackError) {
                console.warn('⚠️ Could not create vector index, pgvector may not be available');
            }
        }
        for (const indexQuery of indexes) {
            try {
                await client.query(indexQuery);
            }
            catch (error) {
                console.warn('⚠️ Could not create index:', error.message);
            }
        }
        console.log('📊 Created database indexes');
    }
    async createFunctions(client) {
        const vectorSearchFunction = `
      CREATE OR REPLACE FUNCTION search_${this.tableName}(
        p_agent_id TEXT,
        p_query_embedding vector(1536),
        p_match_threshold FLOAT DEFAULT 0.7,
        p_match_count INTEGER DEFAULT 10,
        p_memory_type TEXT DEFAULT NULL,
        p_duration TEXT DEFAULT NULL,
        p_min_importance FLOAT DEFAULT NULL
      )
      RETURNS TABLE (
        id TEXT,
        agent_id TEXT,
        type TEXT,
        content TEXT,
        embedding vector(1536),
        metadata JSONB,
        importance REAL,
        timestamp TIMESTAMPTZ,
        tags TEXT[],
        duration TEXT,
        expires_at TIMESTAMPTZ,
        similarity FLOAT
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          m.id,
          m.agent_id,
          m.type,
          m.content,
          m.embedding,
          m.metadata,
          m.importance,
          m.timestamp,
          m.tags,
          m.duration,
          m.expires_at,
          1 - (m.embedding <=> p_query_embedding) AS similarity
        FROM ${this.tableName} m
        WHERE m.agent_id = p_agent_id
        AND m.embedding IS NOT NULL
        AND (p_memory_type IS NULL OR m.type = p_memory_type)
        AND (p_duration IS NULL OR m.duration = p_duration)
        AND (p_min_importance IS NULL OR m.importance >= p_min_importance)
        AND (m.duration != 'short_term' OR m.expires_at IS NULL OR m.expires_at > NOW())
        AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
        ORDER BY similarity DESC
        LIMIT p_match_count;
      END;
      $$;
    `;
        const cleanupFunction = `
      CREATE OR REPLACE FUNCTION cleanup_expired_${this.tableName}()
      RETURNS INTEGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        deleted_count INTEGER;
      BEGIN
        DELETE FROM ${this.tableName} 
        WHERE duration = 'short_term' 
        AND expires_at IS NOT NULL 
        AND expires_at < NOW();
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RETURN deleted_count;
      END;
      $$;
    `;
        const statsFunction = `
      CREATE OR REPLACE FUNCTION get_${this.tableName}_stats(p_agent_id TEXT)
      RETURNS TABLE (
        total_memories INTEGER,
        short_term_count INTEGER,
        long_term_count INTEGER,
        working_count INTEGER,
        episodic_count INTEGER,
        avg_importance FLOAT,
        earliest_memory TIMESTAMPTZ,
        latest_memory TIMESTAMPTZ,
        memories_with_embeddings INTEGER
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::INTEGER as total_memories,
          COUNT(*) FILTER (WHERE duration = 'short_term')::INTEGER as short_term_count,
          COUNT(*) FILTER (WHERE duration = 'long_term')::INTEGER as long_term_count,
          COUNT(*) FILTER (WHERE duration = 'working')::INTEGER as working_count,
          COUNT(*) FILTER (WHERE duration = 'episodic')::INTEGER as episodic_count,
          AVG(importance)::FLOAT as avg_importance,
          MIN(timestamp) as earliest_memory,
          MAX(timestamp) as latest_memory,
          COUNT(*) FILTER (WHERE embedding IS NOT NULL)::INTEGER as memories_with_embeddings
        FROM ${this.tableName}
        WHERE agent_id = p_agent_id
        AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW());
      END;
      $$;
    `;
        const functions = [vectorSearchFunction, cleanupFunction, statsFunction];
        for (const func of functions) {
            try {
                await client.query(func);
            }
            catch (error) {
                console.warn('⚠️ Could not create function:', error.message);
            }
        }
        console.log('⚙️ Created database functions');
    }
    async createTriggers(client) {
        const updateTimestampFunction = `
      CREATE OR REPLACE FUNCTION update_${this.tableName}_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
    `;
        const createTrigger = `
      DROP TRIGGER IF EXISTS trigger_${this.tableName}_updated_at ON ${this.tableName};
      CREATE TRIGGER trigger_${this.tableName}_updated_at
        BEFORE UPDATE ON ${this.tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_${this.tableName}_updated_at();
    `;
        try {
            await client.query(updateTimestampFunction);
            await client.query(createTrigger);
            console.log('⚡ Created database triggers');
        }
        catch (error) {
            console.warn('⚠️ Could not create triggers:', error.message);
        }
    }
    async createSchemaVersioning(client) {
        const versioningQuery = `
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        description TEXT
      );

      INSERT INTO schema_versions (version, description) 
      VALUES ('${this.schemaVersion}', 'Initial SYMindX memory schema')
      ON CONFLICT DO NOTHING;
    `;
        try {
            await client.query(versioningQuery);
            console.log('📋 Created schema versioning');
        }
        catch (error) {
            console.warn('⚠️ Could not create schema versioning:', error.message);
        }
    }
    async store(agentId, memory) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO ${this.tableName} (
          id, agent_id, type, content, embedding, metadata, importance, 
          timestamp, tags, duration, expires_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
          agent_id = EXCLUDED.agent_id,
          type = EXCLUDED.type,
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          importance = EXCLUDED.importance,
          timestamp = EXCLUDED.timestamp,
          tags = EXCLUDED.tags,
          duration = EXCLUDED.duration,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `;
            const values = [
                memory.id,
                agentId,
                memory.type,
                memory.content,
                memory.embedding ? JSON.stringify(memory.embedding) : null,
                JSON.stringify(memory.metadata || {}),
                memory.importance,
                memory.timestamp,
                memory.tags || [],
                memory.duration || MemoryDuration.LONG_TERM,
                memory.expiresAt
            ];
            await client.query(query, values);
            console.log(`💾 Stored ${memory.duration || 'long_term'} memory: ${memory.type} for agent ${agentId}`);
        }
        finally {
            client.release();
        }
    }
    async retrieve(agentId, query, limit = 10) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            let queryText;
            let values;
            const baseCondition = `agent_id = $1 AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > NOW())`;
            if (query === 'recent') {
                queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY timestamp DESC 
          LIMIT $2
        `;
                values = [agentId, limit];
            }
            else if (query === 'important') {
                queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE ${baseCondition}
          ORDER BY importance DESC 
          LIMIT $2
        `;
                values = [agentId, limit];
            }
            else if (query === 'short_term') {
                queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'short_term' 
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY timestamp DESC 
          LIMIT $2
        `;
                values = [agentId, limit];
            }
            else if (query === 'long_term') {
                queryText = `
          SELECT * FROM ${this.tableName} 
          WHERE agent_id = $1 AND duration = 'long_term'
          ORDER BY importance DESC 
          LIMIT $2
        `;
                values = [agentId, limit];
            }
            else {
                queryText = `
          SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) as rank
          FROM ${this.tableName} 
          WHERE ${baseCondition} AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, importance DESC, timestamp DESC 
          LIMIT $3
        `;
                values = [agentId, query, limit];
            }
            const result = await client.query(queryText, values);
            return result.rows.map(row => this.rowToMemoryRecord(row));
        }
        finally {
            client.release();
        }
    }
    async search(agentId, embedding, limit = 10) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const vectorQuery = `SELECT * FROM search_${this.tableName}($1, $2, $3, $4)`;
            try {
                const result = await client.query(vectorQuery, [agentId, JSON.stringify(embedding), 0.7, limit]);
                return result.rows.map(row => this.rowToMemoryRecord(row));
            }
            catch (error) {
                console.warn('⚠️ Vector search failed, falling back to recent memories:', error);
                return this.retrieve(agentId, 'recent', limit);
            }
        }
        finally {
            client.release();
        }
    }
    async delete(agentId, memoryId) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND id = $2`;
            const result = await client.query(query, [agentId, memoryId]);
            if (result.rowCount === 0) {
                throw new Error(`Memory ${memoryId} not found for agent ${agentId}`);
            }
            console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`);
        }
        finally {
            client.release();
        }
    }
    async clear(agentId) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const query = `DELETE FROM ${this.tableName} WHERE agent_id = $1`;
            const result = await client.query(query, [agentId]);
            console.log(`🧹 Cleared ${result.rowCount} memories for agent ${agentId}`);
        }
        finally {
            client.release();
        }
    }
    async getStats(agentId) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const statsQuery = `SELECT * FROM get_${this.tableName}_stats($1)`;
            const statsResult = await client.query(statsQuery, [agentId]);
            const stats = statsResult.rows[0];
            const typeQuery = `
        SELECT type, COUNT(*) as count 
        FROM ${this.tableName} 
        WHERE agent_id = $1 
        GROUP BY type
      `;
            const typeResult = await client.query(typeQuery, [agentId]);
            const byType = {};
            typeResult.rows.forEach(row => {
                byType[row.type] = parseInt(row.count);
            });
            return {
                total: stats?.total_memories || 0,
                byType
            };
        }
        finally {
            client.release();
        }
    }
    async cleanup(agentId, retentionDays) {
        await this.initialize();
        const client = await this.pool.connect();
        try {
            const cutoffDate = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
            const expiredResult = await client.query(`SELECT cleanup_expired_${this.tableName}()`);
            const expiredCount = expiredResult.rows[0]?.cleanup_expired_memories || 0;
            const oldQuery = `DELETE FROM ${this.tableName} WHERE agent_id = $1 AND timestamp < $2`;
            const oldResult = await client.query(oldQuery, [agentId, cutoffDate]);
            console.log(`🧹 Cleaned up ${expiredCount} expired and ${oldResult.rowCount} old memories for agent ${agentId}`);
        }
        finally {
            client.release();
        }
    }
    rowToMemoryRecord(row) {
        let embedding = undefined;
        if (row.embedding) {
            try {
                embedding = typeof row.embedding === 'string'
                    ? JSON.parse(row.embedding)
                    : row.embedding;
            }
            catch (error) {
                console.warn('⚠️ Failed to parse embedding:', error);
            }
        }
        return {
            id: row.id,
            agentId: row.agent_id,
            type: MemoryType[row.type.toUpperCase()] || MemoryType.EXPERIENCE,
            content: row.content,
            embedding,
            metadata: row.metadata || {},
            importance: row.importance,
            timestamp: new Date(row.timestamp),
            tags: row.tags || [],
            duration: MemoryDuration[row.duration.toUpperCase()] || MemoryDuration.LONG_TERM,
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
        };
    }
    async healthCheck() {
        const start = Date.now();
        try {
            const client = await this.pool.connect();
            try {
                const result = await client.query('SELECT version()');
                const latency = Date.now() - start;
                const version = result.rows[0]?.version?.split(' ').slice(0, 2).join(' ');
                return { healthy: true, latency, version };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('❌ PostgreSQL health check failed:', error);
            return { healthy: false, latency: -1 };
        }
    }
    getPoolStatus() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount
        };
    }
    async getSchemaInfo() {
        const client = await this.pool.connect();
        try {
            const versionResult = await client.query('SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1');
            const version = versionResult.rows[0]?.version || 'unknown';
            const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE '%${this.tableName}%'
      `);
            const tables = tablesResult.rows.map(row => row.tablename);
            const functionsResult = await client.query(`
        SELECT proname FROM pg_proc 
        WHERE proname LIKE '%${this.tableName}%'
      `);
            const functions = functionsResult.rows.map(row => row.proname);
            return { version, tables, functions };
        }
        finally {
            client.release();
        }
    }
    async disconnect() {
        try {
            await this.pool.end();
            console.log('🔌 PostgreSQL memory provider disconnected');
        }
        catch (error) {
            console.error('❌ Error disconnecting PostgreSQL provider:', error);
        }
    }
}
export function createPostgresMemoryProvider(config) {
    return new PostgresMemoryProvider(config);
}
export function createPostgresConnectionString(host, port, database, username, password, options = {}) {
    const params = new URLSearchParams({
        sslmode: 'prefer',
        ...options
    });
    return `postgresql://${username}:${password}@${host}:${port}/${database}?${params.toString()}`;
}
export function createDefaultPostgresProvider(connectionString) {
    return new PostgresMemoryProvider({
        connectionString,
        maxConnections: 20,
        autoDeploySchema: true,
        enablePooling: true
    });
}
//# sourceMappingURL=index.js.map