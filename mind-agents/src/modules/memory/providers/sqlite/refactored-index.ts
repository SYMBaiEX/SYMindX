/**
 * Refactored SQLite Memory Provider for SYMindX
 *
 * Example of how to use the shared components to eliminate duplication
 */

import { Database } from 'bun:sqlite';
import {
  MemoryRecord,
  MemoryType,
  MemoryDuration,
} from '../../../../types/agent';
import {
  MemoryProviderMetadata,
  MemoryTierType,
  ArchivalStrategy,
} from '../../../../types/memory';
import { runtimeLogger } from '../../../../utils/logger';
import { buildObject } from '../../../../utils/type-helpers';
import {
  BaseMemoryProvider,
  BaseMemoryConfig,
  MemoryRow,
} from '../../base-memory-provider';

// Import shared components
import {
  DatabaseConnection,
  DatabaseType,
  MemoryProviderTrait,
  SharedArchiver,
  SharedMemoryPool,
  ResourceManager,
  type ConnectionConfig,
  type ArchiverConfig,
  type PoolConfig,
} from '../../../shared';

export interface SqliteMemoryConfig extends BaseMemoryConfig {
  dbPath?: string;
  enableWAL?: boolean;
  enableFTS?: boolean;
  enableCompression?: boolean;
  maxCacheSize?: number;
  vacuumIntervalMs?: number;
}

// Create the enhanced base class with traits
const SqliteMemoryProviderBase =
  MemoryProviderTrait<SqliteMemoryConfig>('1.0.0')(BaseMemoryProvider);

export class RefactoredSqliteMemoryProvider extends SqliteMemoryProviderBase {
  private connection: any;
  private archiver?: SqliteArchiver;
  private sharedPool?: SqliteMemoryPool;
  private resourceManager: ResourceManager;

  constructor(config: SqliteMemoryConfig) {
    super(config, {
      type: 'sqlite',
      name: 'SQLite Memory Provider',
      version: '1.0.0',
      description: 'SQLite-based memory storage with shared components',
    });

    // Configure the module
    this.configure({
      dbPath: ':memory:',
      enableWAL: true,
      enableFTS: true,
      enableCompression: true,
      maxCacheSize: 1000,
      vacuumIntervalMs: 3600000, // 1 hour
      ...config,
    });

    // Initialize resource manager
    this.resourceManager = new ResourceManager({
      maxConnections: 10,
      maxMemoryMB: 256,
      cleanupIntervalMs: 60000,
    });

    // Add initialization handlers
    this.addInitializationHandler(() => this.initializeConnection());
    this.addInitializationHandler(() => this.initializeArchiver());
    this.addInitializationHandler(() => this.initializeSharedPool());

    // Add health checks
    this.addHealthCheck(() => this.checkDatabaseHealth());
    this.addHealthCheck(() => this.resourceManager.getHealthStatus());

    // Add cleanup on disposal
    this.addDisposalHandler(() => this.cleanup());
  }

  private async initializeConnection(): Promise<void> {
    const config = this.getConfig();

    const connectionConfig: ConnectionConfig = {
      type: DatabaseType.SQLITE,
      dbPath: config.dbPath,
    };

    this.connection = await DatabaseConnection.getConnection(connectionConfig);

    // Initialize database schema
    await this.initializeSchema();

    runtimeLogger.info(`SQLite memory provider connected to: ${config.dbPath}`);
  }

  private async initializeArchiver(): Promise<void> {
    const config = this.getConfig();

    if (config.archival && config.archival.length > 0) {
      const archiverConfig: ArchiverConfig = {
        strategies: config.archival,
        enableCompression: config.enableCompression,
        maxCompressionRatio: 0.7,
        retentionDays: 365,
      };

      this.archiver = new SqliteArchiver(archiverConfig, this.connection);
      runtimeLogger.info('SQLite archiver initialized');
    }
  }

  private async initializeSharedPool(): Promise<void> {
    const config = this.getConfig();

    if (config.sharedMemory) {
      const poolConfig: PoolConfig = {
        poolId: `sqlite_pool_${Date.now()}`,
        sharedConfig: config.sharedMemory,
        maxPoolSize: 1000,
        enableVersioning: true,
        enablePermissions: true,
      };

      this.sharedPool = new SqliteMemoryPool(poolConfig, this.connection);
      await this.sharedPool.loadFromStorage();
      runtimeLogger.info('SQLite shared memory pool initialized');
    }
  }

  private async initializeSchema(): Promise<void> {
    // Use the connection to create tables
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        importance REAL DEFAULT 0.5,
        timestamp INTEGER NOT NULL,
        tags TEXT,
        duration TEXT DEFAULT 'long_term',
        expires_at INTEGER,
        tier TEXT DEFAULT 'episodic',
        context_fingerprint TEXT,
        context_score REAL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create indexes
    await this.connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id)
    `);
    await this.connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp)
    `);
    await this.connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance)
    `);

    // Create FTS table if enabled
    const config = this.getConfig();
    if (config.enableFTS) {
      await this.connection.execute(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
          content, tags, content='memories', content_rowid='rowid'
        )
      `);
    }
  }

  private async checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    details?: any;
  }> {
    try {
      await this.connection.query('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async cleanup(): Promise<void> {
    if (this.sharedPool) {
      await this.sharedPool.saveToStorage();
    }

    if (this.connection) {
      await this.connection.close();
    }

    await this.resourceManager.shutdown();
  }

  // ===================================================================
  // IMPLEMENTATION OF ABSTRACT METHODS
  // ===================================================================

  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const data = {
      id: memory.id,
      agent_id: agentId,
      type: memory.type,
      content: memory.content,
      embedding: memory.embedding
        ? Buffer.from(new Float32Array(memory.embedding).buffer)
        : null,
      metadata: JSON.stringify(memory.metadata || {}),
      importance: memory.importance || 0.5,
      timestamp: memory.timestamp.getTime(),
      tags: JSON.stringify(memory.tags || []),
      duration: memory.duration || MemoryDuration.LONG_TERM,
      expires_at: memory.expiresAt?.getTime() || null,
    };

    await this.connection.execute(
      `
      INSERT OR REPLACE INTO memories 
      (id, agent_id, type, content, embedding, metadata, importance, timestamp, tags, duration, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      Object.values(data)
    );

    // Update FTS table if enabled
    const config = this.getConfig();
    if (config.enableFTS) {
      await this.connection.execute(
        `
        INSERT OR REPLACE INTO memories_fts (rowid, content, tags)
        SELECT rowid, content, tags FROM memories WHERE id = ?
      `,
        [memory.id]
      );
    }

    this.updateResourceUsage(`memory_${memory.id}`);
    this.emit('memory:stored', { agentId, memory });
  }

  async retrieve(
    agentId: string,
    query: string,
    limit = 10
  ): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    // Try cache first
    const cacheKey = `retrieve_${agentId}_${query}_${limit}`;
    const cached = this.getFromCache<MemoryRecord[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let sql: string;
    let params: any[];

    const config = this.getConfig();
    if (config.enableFTS && query.trim()) {
      // Use FTS for text search
      sql = `
        SELECT m.* FROM memories m
        JOIN memories_fts fts ON m.rowid = fts.rowid
        WHERE m.agent_id = ? 
          AND fts MATCH ?
          AND (m.expires_at IS NULL OR m.expires_at > ?)
        ORDER BY m.importance DESC, m.timestamp DESC
        LIMIT ?
      `;
      params = [agentId, query, Date.now(), limit];
    } else {
      // Fallback to LIKE search
      sql = `
        SELECT * FROM memories
        WHERE agent_id = ? 
          AND (content LIKE ? OR tags LIKE ?)
          AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY importance DESC, timestamp DESC
        LIMIT ?
      `;
      params = [agentId, `%${query}%`, `%${query}%`, Date.now(), limit];
    }

    const rows = await this.connection.query(sql, params);
    const memories = rows.map((row: MemoryRow) =>
      this.parseMemoryFromStorage(row)
    );

    // Cache the results
    this.setInCache(cacheKey, memories, 60000); // 1 minute cache

    return memories;
  }

  async search(
    agentId: string,
    embedding: number[],
    limit = 10
  ): Promise<MemoryRecord[]> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    // For now, fall back to content search
    // In a full implementation, this would use vector similarity
    return this.retrieve(agentId, '', limit);
  }

  async delete(agentId: string, memoryId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    await this.connection.execute(
      `
      DELETE FROM memories WHERE id = ? AND agent_id = ?
    `,
      [memoryId, agentId]
    );

    // Clean up FTS
    const config = this.getConfig();
    if (config.enableFTS) {
      await this.connection.execute(
        `
        DELETE FROM memories_fts WHERE rowid IN (
          SELECT rowid FROM memories WHERE id = ?
        )
      `,
        [memoryId]
      );
    }

    this.deleteFromCache(`memory_${memoryId}`);
    this.emit('memory:deleted', { agentId, memoryId });
  }

  async clear(agentId: string): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    await this.connection.execute(
      `
      DELETE FROM memories WHERE agent_id = ?
    `,
      [agentId]
    );

    this.clearCache();
    this.emit('memory:cleared', { agentId });
  }

  async getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const rows = await this.connection.query(
      `
      SELECT type, COUNT(*) as count
      FROM memories 
      WHERE agent_id = ? AND (expires_at IS NULL OR expires_at > ?)
      GROUP BY type
    `,
      [agentId, Date.now()]
    );

    const byType: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      byType[row.type] = row.count;
      total += row.count;
    }

    return { total, byType };
  }

  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    this.ensureNotDisposed();
    await this.ensureInitialized();

    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    await this.connection.execute(
      `
      DELETE FROM memories 
      WHERE agent_id = ? 
        AND timestamp < ?
        AND duration != 'permanent'
    `,
      [agentId, cutoffTime]
    );

    // Archive if archiver is available
    if (this.archiver) {
      const oldMemories = await this.connection.query(
        `
        SELECT * FROM memories 
        WHERE agent_id = ? AND timestamp < ?
      `,
        [agentId, cutoffTime]
      );

      const memories = oldMemories.map((row: MemoryRow) =>
        this.parseMemoryFromStorage(row)
      );
      await this.archiver.archive(memories);
    }

    this.clearCache();
  }

  async consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void> {
    await this.connection.execute(
      `
      UPDATE memories 
      SET tier = ?, updated_at = ?
      WHERE id = ? AND agent_id = ?
    `,
      [toTier, Date.now(), memoryId, agentId]
    );
  }

  async retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit = 10
  ): Promise<MemoryRecord[]> {
    const rows = await this.connection.query(
      `
      SELECT * FROM memories
      WHERE agent_id = ? AND tier = ?
      ORDER BY importance DESC, timestamp DESC
      LIMIT ?
    `,
      [agentId, tier, limit]
    );

    return rows.map((row: MemoryRow) => this.parseMemoryFromStorage(row));
  }

  async archiveMemories(agentId: string): Promise<void> {
    if (!this.archiver) return;

    const oldMemories = await this.connection.query(
      `
      SELECT * FROM memories 
      WHERE agent_id = ? 
        AND timestamp < ?
        AND duration != 'permanent'
    `,
      [agentId, Date.now() - 30 * 24 * 60 * 60 * 1000]
    ); // 30 days

    const memories = oldMemories.map((row: MemoryRow) =>
      this.parseMemoryFromStorage(row)
    );
    await this.archiver.archive(memories);
  }

  async shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void> {
    if (!this.sharedPool) return;

    for (const memoryId of memoryIds) {
      const rows = await this.connection.query(
        `
        SELECT * FROM memories WHERE id = ? AND agent_id = ?
      `,
        [memoryId, agentId]
      );

      if (rows.length > 0) {
        const memory = this.parseMemoryFromStorage(rows[0]);
        await this.sharedPool.share(agentId, memory);
      }
    }
  }

  async generateEmbedding(content: string): Promise<number[]> {
    // Placeholder implementation
    // In a real implementation, this would call an embedding service
    return new Array(384).fill(0).map(() => Math.random() - 0.5);
  }

  private updateResourceUsage(resourceId: string): void {
    this.resourceManager.updateResourceUsage(resourceId);
  }
}

// ===================================================================
// SHARED COMPONENT IMPLEMENTATIONS
// ===================================================================

/**
 * SQLite-specific archiver implementation
 */
class SqliteArchiver extends SharedArchiver<any> {
  constructor(
    config: ArchiverConfig,
    private connection: any
  ) {
    super(config);
  }

  getStorage(): any {
    return this.connection;
  }

  protected async cleanupBefore(date: Date): Promise<number> {
    const result = await this.connection.execute(
      `
      DELETE FROM memories 
      WHERE timestamp < ? AND duration = 'archived'
    `,
      [date.getTime()]
    );

    return result.changes || 0;
  }
}

/**
 * SQLite-specific memory pool implementation
 */
class SqliteMemoryPool extends SharedMemoryPool<any> {
  constructor(
    config: PoolConfig,
    private connection: any
  ) {
    super(config);
  }

  getStorage(): any {
    return this.connection;
  }

  protected async persistEntry(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return;

    await this.connection.execute(
      `
      INSERT OR REPLACE INTO shared_memories 
      (id, agent_id, memory_data, permissions, shared_at, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        entry.id,
        entry.agentId,
        JSON.stringify(entry.memory),
        JSON.stringify(entry.permissions),
        entry.sharedAt.getTime(),
        entry.version,
      ]
    );
  }

  protected async removePersistedEntry(key: string): Promise<void> {
    await this.connection.execute(
      `
      DELETE FROM shared_memories WHERE id = ?
    `,
      [key]
    );
  }

  async loadFromStorage(): Promise<void> {
    // Initialize shared memories table
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS shared_memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        memory_data TEXT NOT NULL,
        permissions TEXT NOT NULL,
        shared_at INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        last_accessed_at INTEGER DEFAULT (strftime('%s', 'now')),
        access_count INTEGER DEFAULT 0
      )
    `);

    // Load existing entries
    const rows = await this.connection.query(`
      SELECT * FROM shared_memories
    `);

    for (const row of rows) {
      const entry = {
        id: row.id,
        agentId: row.agent_id,
        memory: JSON.parse(row.memory_data),
        permissions: JSON.parse(row.permissions),
        sharedAt: new Date(row.shared_at),
        version: row.version,
        lastAccessedAt: new Date(row.last_accessed_at),
        accessCount: row.access_count,
      };

      this.entries.set(row.id, entry);
    }
  }

  async saveToStorage(): Promise<void> {
    // All entries are persisted individually via persistEntry
    // This could batch save any pending changes
  }
}

/**
 * Factory function to create SQLite memory provider
 */
export function createSqliteMemoryProvider(
  config: SqliteMemoryConfig
): RefactoredSqliteMemoryProvider {
  return new RefactoredSqliteMemoryProvider(config);
}
