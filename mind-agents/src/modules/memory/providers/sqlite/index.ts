/**
 * SQLite Memory Provider for SYMindX
 * 
 * Enhanced SQLite-based memory provider with multi-tier memory architecture,
 * vector embeddings, shared memory pools, and archival strategies.
 */

import { MemoryRecord, MemoryType, MemoryDuration } from '../../../../types/agent'
import { BaseMemoryProvider, BaseMemoryConfig, MemoryRow, EnhancedMemoryRecord } from '../../base-memory-provider'
import { 
  MemoryProviderMetadata, 
  MemoryTierType,
  MemoryContext,
  SharedMemoryConfig,
  ArchivalStrategy,
  MemoryPermission
} from '../../../../types/memory'
import { Database } from 'bun:sqlite'
import type { Database as DatabaseType, Statement } from 'bun:sqlite'
const sqliteAvailable = true
import { readFileSync } from 'fs'
import { join } from 'path'
import { SharedMemoryPool } from './shared-pool'
import { MemoryArchiver } from './archiver'
import { runtimeLogger } from '../../../../utils/logger'

/**
 * Configuration for the SQLite memory provider
 */
export interface SQLiteMemoryConfig extends BaseMemoryConfig {
  /**
   * Path to the SQLite database file
   */
  dbPath: string

  /**
   * Whether to create tables if they don't exist
   */
  createTables?: boolean

  /**
   * Consolidation interval in milliseconds
   */
  consolidationInterval?: number

  /**
   * Archival interval in milliseconds
   */
  archivalInterval?: number
}

/**
 * SQLite database row type
 */
export interface SQLiteMemoryRow extends MemoryRow {
  embedding?: Buffer
  tier?: string
  context?: string // JSON-encoded MemoryContext
}

/**
 * SQLite memory provider implementation
 */
export class SQLiteMemoryProvider extends BaseMemoryProvider {
  private db: DatabaseType
  private sharedPools: Map<string, SharedMemoryPool> = new Map()
  private consolidationTimer?: NodeJS.Timeout
  private archivalTimer?: NodeJS.Timeout

  /**
   * Constructor for the SQLite memory provider
   * @param config Configuration for the SQLite memory provider
   */
  constructor(config: SQLiteMemoryConfig) {
    const metadata: MemoryProviderMetadata = {
      id: 'sqlite',
      name: 'SQLite Memory Provider',
      description: 'Enhanced SQLite provider with multi-tier memory, vector search, and shared pools',
      version: '2.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: true,
      supportedTiers: [
        MemoryTierType.WORKING,
        MemoryTierType.EPISODIC,
        MemoryTierType.SEMANTIC,
        MemoryTierType.PROCEDURAL
      ],
      supportsSharedMemory: true
    }
    
    super(config, metadata)
    
    this.db = new Database(config.dbPath)
    
    if (config.createTables !== false) {
      this.initializeDatabase()
    }

    // Start background processes
    this.startBackgroundProcesses(config)
  }

  /**
   * Initialize the SQLite database
   */
  private initializeDatabase(): void {
    // Create memories table with tier and context support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB,
        metadata TEXT,
        importance REAL NOT NULL DEFAULT 0.5,
        timestamp INTEGER NOT NULL,
        tags TEXT,
        duration TEXT NOT NULL DEFAULT 'long_term',
        expires_at TEXT,
        tier TEXT DEFAULT 'episodic',
        context TEXT
      )
    `)

    // Create shared memory pools table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shared_memory_pools (
        pool_id TEXT PRIMARY KEY,
        config TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `)

    // Create shared memory mappings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS shared_memory_mappings (
        memory_id TEXT NOT NULL,
        pool_id TEXT NOT NULL,
        shared_by TEXT NOT NULL,
        shared_at INTEGER NOT NULL,
        permissions TEXT NOT NULL,
        PRIMARY KEY (memory_id, pool_id)
      )
    `)

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
      CREATE INDEX IF NOT EXISTS idx_memories_duration ON memories(duration);
      CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories(expires_at);
      CREATE INDEX IF NOT EXISTS idx_memories_tier ON memories(tier);
      CREATE INDEX IF NOT EXISTS idx_shared_mappings_pool ON shared_memory_mappings(pool_id);
    `)

    console.log('✅ Enhanced SQLite memory database initialized')
  }

  /**
   * Start background processes for consolidation and archival
   */
  private startBackgroundProcesses(config: SQLiteMemoryConfig): void {
    if (config.consolidationInterval) {
      this.consolidationTimer = setInterval(() => {
        this.runConsolidation().catch(error => {
          runtimeLogger.error('Consolidation error:', error)
        })
      }, config.consolidationInterval)
    }

    if (config.archivalInterval) {
      this.archivalTimer = setInterval(() => {
        this.runArchival().catch(error => {
          runtimeLogger.error('Archival error:', error)
        })
      }, config.archivalInterval)
    }
  }

  /**
   * Store a memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    const enhanced = memory as EnhancedMemoryRecord
    
    // Generate embedding if not provided
    if (!memory.embedding && memory.content) {
      memory.embedding = await this.generateEmbedding(memory.content)
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, agent_id, type, content, embedding, metadata, importance, timestamp, tags, duration, expires_at, tier, context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const embeddingBuffer = memory.embedding ? Buffer.from(new Float32Array(memory.embedding).buffer) : null
    const metadataJson = JSON.stringify(memory.metadata)
    const tagsJson = JSON.stringify(memory.tags)
    const contextJson = enhanced.context ? JSON.stringify(enhanced.context) : null

    stmt.run(
      memory.id,
      agentId,
      memory.type,
      memory.content,
      embeddingBuffer,
      metadataJson,
      memory.importance,
      memory.timestamp.getTime(),
      tagsJson,
      memory.duration || 'long_term',
      memory.expiresAt ? memory.expiresAt.getTime() : null,
      enhanced.tier || MemoryTierType.EPISODIC,
      contextJson
    )

    // Handle working memory specially
    if (enhanced.tier === MemoryTierType.WORKING) {
      await this.addToWorkingMemory(agentId, memory)
    }

    // Only log conversation memories from user interactions
    if (memory.type === MemoryType.INTERACTION && 
        (memory.metadata?.source === 'chat_command' || 
         memory.metadata?.source === 'chat_command_fallback' ||
         memory.metadata?.messageType === 'user_input' ||
         memory.metadata?.messageType === 'agent_response')) {
      console.log(`💾 Stored ${enhanced.tier || 'episodic'} memory: ${memory.type} for agent ${agentId}`)
    }
  }

  /**
   * Retrieve memories for an agent based on a query
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieve(agentId: string, query: string, limit = 10): Promise<MemoryRecord[]> {
    let stmt: Statement
    let params: (string | number | Date)[]

    // Base condition to filter out expired short-term memories
    const now = Date.now()
    const baseCondition = `agent_id = ? AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > ${now})`

    if (query === 'recent') {
      // Get most recent memories
      stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} 
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      params = [agentId, limit]
    } else if (query === 'important') {
      // Get most important memories
      stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} 
        ORDER BY importance DESC 
        LIMIT ?
      `)
      params = [agentId, limit]
    } else if (query === 'short_term') {
      // Get only short-term memories that haven't expired
      stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? AND duration = 'short_term' AND (expires_at IS NULL OR expires_at > ${now})
        ORDER BY timestamp DESC 
        LIMIT ?
      `)
      params = [agentId, limit]
    } else if (query === 'long_term') {
      // Get only long-term memories
      stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE agent_id = ? AND duration = 'long_term'
        ORDER BY importance DESC 
        LIMIT ?
      `)
      params = [agentId, limit]
    } else {
      // Text search in content
      stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition} AND content LIKE ? 
        ORDER BY importance DESC, timestamp DESC 
        LIMIT ?
      `)
      params = [agentId, `%${query}%`, limit]
    }

    const rows = stmt.all(...params) as SQLiteMemoryRow[]
    return rows.map(row => this.rowToMemoryRecord(row))
  }

  /**
   * Search for memories using vector similarity
   * @param agentId The ID of the agent
   * @param embedding The embedding vector to search with
   * @param limit The maximum number of memories to return
   */
  async search(agentId: string, embedding: number[], limit = 10): Promise<MemoryRecord[]> {
    const now = Date.now()
    const baseCondition = `agent_id = ? AND embedding IS NOT NULL AND (duration != 'short_term' OR expires_at IS NULL OR expires_at > ${now})`

    try {
      // First, get all memories with embeddings for this agent
      const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE ${baseCondition}
        ORDER BY timestamp DESC
      `)
      
      const rows = stmt.all(agentId) as SQLiteMemoryRow[]
      
      if (rows.length === 0) {
        console.log('🔍 No memories with embeddings found, falling back to recent memories')
        return this.retrieve(agentId, 'recent', limit)
      }

      // Calculate cosine similarity for each memory with an embedding
      const similarities: { memory: MemoryRecord; similarity: number }[] = []
      
      for (const row of rows) {
        if (row.embedding) {
          const memoryEmbedding = this.bufferToEmbedding(row.embedding)
          if (memoryEmbedding) {
            const similarity = this.cosineSimilarity(embedding, memoryEmbedding)
            similarities.push({
              memory: this.rowToMemoryRecord(row),
              similarity
            })
          }
        }
      }

      // Sort by similarity and return top results
      similarities.sort((a, b) => b.similarity - a.similarity)
      const results = similarities.slice(0, limit).map(item => item.memory)
      
      console.log(`🎯 Vector search found ${results.length} similar memories (avg similarity: ${(similarities.slice(0, limit).reduce((sum, item) => sum + item.similarity, 0) / Math.min(limit, similarities.length)).toFixed(3)})`)
      
      return results
    } catch (error) {
      console.warn('⚠️ Vector search failed, falling back to recent memories:', error)
      return this.retrieve(agentId, 'recent', limit)
    }
  }

  /**
   * Delete a memory for an agent
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to delete
   */
  async delete(agentId: string, memoryId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND id = ?
    `)

    const result = stmt.run(agentId, memoryId)
    
    if (result.changes === 0) {
      throw new Error(`Memory ${memoryId} not found for agent ${agentId}`)
    }

    console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`)
  }

  /**
   * Clear all memories for an agent
   * @param agentId The ID of the agent
   */
  async clear(agentId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ?
    `)

    const result = stmt.run(agentId)
    console.log(`🧹 Cleared ${result.changes} memories for agent ${agentId}`)
  }

  /**
   * Get statistics about an agent's memories
   * @param agentId The ID of the agent
   */
  async getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM memories 
      WHERE agent_id = ?
    `)

    const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM memories 
      WHERE agent_id = ? 
      GROUP BY type
    `)

    const totalResult = totalStmt.get(agentId) as { count: number } | undefined
    const total = totalResult?.count || 0
    const typeRows = typeStmt.all(agentId) as { type: string; count: number }[]
    
    const byType: Record<string, number> = {}
    typeRows.forEach((row) => {
      byType[row.type] = row.count
    })

    return { total, byType }
  }

  /**
   * Clean up old memories for an agent
   * @param agentId The ID of the agent
   * @param retentionDays The number of days to retain memories
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    const now = Date.now()
    const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000)
    
    // First, clean up expired short-term memories
    const expiredStmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND duration = 'short_term' AND expires_at IS NOT NULL AND expires_at < ?
    `)

    const expiredResult = expiredStmt.run(agentId, now)
    console.log(`🧹 Cleaned up ${expiredResult.changes} expired short-term memories for agent ${agentId}`)
    
    // Then, clean up old memories based on retention days
    const oldStmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE agent_id = ? AND timestamp < ?
    `)

    const oldResult = oldStmt.run(agentId, cutoffTime)
    console.log(`🧹 Cleaned up ${oldResult.changes} old memories for agent ${agentId}`)
  }

  /**
   * Convert a database row to a memory record
   * @param row The database row
   * @returns The memory record
   */
  private rowToMemoryRecord(row: SQLiteMemoryRow): EnhancedMemoryRecord {
    let embedding: number[] | undefined = undefined
    
    if (row.embedding) {
      embedding = this.bufferToEmbedding(row.embedding)
    }

    const record: EnhancedMemoryRecord = {
      id: row.id,
      agentId: row.agent_id,
      type: (row.type as string) ? MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] || MemoryType.EXPERIENCE : MemoryType.EXPERIENCE,
      content: row.content,
      embedding,
      metadata: JSON.parse(row.metadata as string || '{}') as Record<string, any>,
      importance: row.importance,
      timestamp: new Date(row.timestamp),
      tags: JSON.parse(row.tags as string || '[]') as string[],
      duration: (row.duration && typeof row.duration === 'string') ? MemoryDuration[row.duration.toUpperCase() as keyof typeof MemoryDuration] || MemoryDuration.LONG_TERM : MemoryDuration.LONG_TERM,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined
    }

    // Add tier and context if available
    if (row.tier) {
      record.tier = row.tier as MemoryTierType
    }
    if (row.context) {
      record.context = JSON.parse(row.context) as MemoryContext
    }

    return record
  }

  /**
   * Convert a buffer to an embedding array
   * @param buffer The buffer containing embedding data
   * @returns The embedding array or undefined if conversion fails
   */
  private bufferToEmbedding(buffer: Buffer): number[] | undefined {
    try {
      const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT)
      return Array.from(floatArray)
    } catch (error) {
      console.warn('⚠️ Failed to convert buffer to embedding:', error)
      return undefined
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity (0-1, where 1 is most similar)
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.warn(`⚠️ Vector dimension mismatch: ${a.length} vs ${b.length}`)
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    if (magnitude === 0) return 0

    return dotProduct / magnitude
  }

  /**
   * Consolidate memory from one tier to another
   */
  async consolidateMemory(
    agentId: string, 
    memoryId: string, 
    fromTier: MemoryTierType, 
    toTier: MemoryTierType
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE memories 
      SET tier = ? 
      WHERE agent_id = ? AND id = ? AND tier = ?
    `)
    
    const result = stmt.run(toTier, agentId, memoryId, fromTier)
    
    if (result.changes > 0) {
      runtimeLogger.memory(`Consolidated memory ${memoryId} from ${fromTier} to ${toTier}`)
      
      // Apply tier-specific transformations
      if (fromTier === MemoryTierType.EPISODIC && toTier === MemoryTierType.SEMANTIC) {
        // Extract concepts and update type
        const updateStmt = this.db.prepare(`
          UPDATE memories 
          SET type = ?, tags = ? 
          WHERE agent_id = ? AND id = ?
        `)
        
        const memory = this.db.prepare('SELECT content FROM memories WHERE id = ?').get(memoryId) as any
        if (memory) {
          const concepts = await this.extractConcepts(memory.content)
          updateStmt.run(MemoryType.KNOWLEDGE, JSON.stringify(concepts), agentId, memoryId)
        }
      }
    }
  }

  /**
   * Get memories from a specific tier
   */
  async retrieveTier(agentId: string, tier: MemoryTierType, limit?: number): Promise<MemoryRecord[]> {
    const query = limit 
      ? 'SELECT * FROM memories WHERE agent_id = ? AND tier = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM memories WHERE agent_id = ? AND tier = ? ORDER BY timestamp DESC'
    
    const stmt = this.db.prepare(query)
    const rows = limit 
      ? stmt.all(agentId, tier, limit) as SQLiteMemoryRow[]
      : stmt.all(agentId, tier) as SQLiteMemoryRow[]
    
    return rows.map(row => this.rowToMemoryRecord(row))
  }

  /**
   * Archive old memories based on configured strategies
   */
  async archiveMemories(agentId: string): Promise<void> {
    if (!this.config.archival) return
    
    for (const strategy of this.config.archival) {
      if (strategy.type === 'compression') {
        await this.compressOldMemories(agentId, strategy)
      } else if (strategy.type === 'summarization') {
        await this.summarizeMemories(agentId, strategy)
      }
    }
  }

  /**
   * Share memories with other agents in a pool
   */
  async shareMemories(agentId: string, memoryIds: string[], poolId: string): Promise<void> {
    let pool = this.sharedPools.get(poolId)
    
    if (!pool && this.config.sharedMemory) {
      pool = new SharedMemoryPool(poolId, this.config.sharedMemory)
      this.sharedPools.set(poolId, pool)
      
      // Store pool configuration
      const poolStmt = this.db.prepare(`
        INSERT OR REPLACE INTO shared_memory_pools (pool_id, config, created_at)
        VALUES (?, ?, ?)
      `)
      poolStmt.run(poolId, JSON.stringify(this.config.sharedMemory), Date.now())
    }
    
    if (!pool) {
      throw new Error(`Shared memory pool ${poolId} not found`)
    }
    
    // Share each memory
    for (const memoryId of memoryIds) {
      const memory = this.db.prepare('SELECT * FROM memories WHERE agent_id = ? AND id = ?')
        .get(agentId, memoryId) as SQLiteMemoryRow
      
      if (memory) {
        await pool.share(agentId, this.rowToMemoryRecord(memory))
        
        // Record sharing
        const mappingStmt = this.db.prepare(`
          INSERT OR REPLACE INTO shared_memory_mappings 
          (memory_id, pool_id, shared_by, shared_at, permissions)
          VALUES (?, ?, ?, ?, ?)
        `)
        mappingStmt.run(
          memoryId, 
          poolId, 
          agentId, 
          Date.now(), 
          JSON.stringify([MemoryPermission.READ])
        )
      }
    }
  }

  /**
   * Generate embedding for a memory
   */
  async generateEmbedding(content: string): Promise<number[]> {
    // This would call the actual embedding API based on config
    // For now, return a mock embedding
    return new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
  }

  /**
   * Extract concepts from content
   */
  private async extractConcepts(content: string): Promise<string[]> {
    // Simple concept extraction - in production would use NLP
    const words = content.toLowerCase().split(/\s+/)
    const concepts = words
      .filter(word => word.length > 4)
      .filter((word, index, self) => self.indexOf(word) === index)
      .slice(0, 5)
    
    return concepts
  }

  /**
   * Run memory consolidation
   */
  private async runConsolidation(): Promise<void> {
    const agents = this.db.prepare('SELECT DISTINCT agent_id FROM memories').all() as { agent_id: string }[]
    
    for (const { agent_id } of agents) {
      // Check consolidation rules for each tier
      for (const [, tier] of this.tiers) {
        if (!tier.consolidationRules) continue
        
        for (const rule of tier.consolidationRules) {
          const memories = await this.retrieveTier(agent_id, rule.fromTier)
          
          for (const memory of memories) {
            if (this.shouldConsolidate(memory as EnhancedMemoryRecord, rule)) {
              await this.consolidateMemory(agent_id, memory.id, rule.fromTier, rule.toTier)
            }
          }
        }
      }
    }
  }

  /**
   * Check if memory should be consolidated
   */
  private shouldConsolidate(memory: EnhancedMemoryRecord, rule: any): boolean {
    switch (rule.condition) {
      case 'importance':
        return (memory.importance || 0) >= rule.threshold
      case 'age':
        const ageInDays = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        return ageInDays >= rule.threshold
      case 'emotional':
        return (memory.context?.emotionalValence || 0) >= rule.threshold
      default:
        return false
    }
  }

  /**
   * Run memory archival
   */
  private async runArchival(): Promise<void> {
    const agents = this.db.prepare('SELECT DISTINCT agent_id FROM memories').all() as { agent_id: string }[]
    
    for (const { agent_id } of agents) {
      await this.archiveMemories(agent_id)
    }
  }

  /**
   * Compress old memories
   */
  private async compressOldMemories(agentId: string, strategy: ArchivalStrategy): Promise<void> {
    if (!strategy.triggerAge) return
    
    const cutoff = Date.now() - (strategy.triggerAge * 24 * 60 * 60 * 1000)
    const oldMemories = this.db.prepare(`
      SELECT * FROM memories 
      WHERE agent_id = ? AND timestamp < ? AND tier = 'episodic'
      ORDER BY timestamp DESC
    `).all(agentId, cutoff) as SQLiteMemoryRow[]
    
    // Group similar memories and compress
    // This is simplified - production would use clustering
    const compressed = this.groupAndCompress(oldMemories.map(r => this.rowToMemoryRecord(r)))
    
    // Store compressed memories
    for (const memory of compressed) {
      await this.store(agentId, memory)
    }
    
    // Delete original memories
    const deleteStmt = this.db.prepare('DELETE FROM memories WHERE id = ?')
    for (const row of oldMemories) {
      deleteStmt.run(row.id)
    }
  }

  /**
   * Summarize memories
   */
  private async summarizeMemories(agentId: string, strategy: ArchivalStrategy): Promise<void> {
    // Implementation would use LLM to summarize groups of memories
    // For now, this is a placeholder
    runtimeLogger.memory(`Summarizing memories for agent ${agentId}`)
  }

  /**
   * Group and compress similar memories
   */
  private groupAndCompress(memories: EnhancedMemoryRecord[]): EnhancedMemoryRecord[] {
    // Simple compression - group by day and combine
    const grouped = new Map<string, EnhancedMemoryRecord[]>()
    
    for (const memory of memories) {
      const day = memory.timestamp.toISOString().split('T')[0]
      if (!grouped.has(day)) {
        grouped.set(day, [])
      }
      grouped.get(day)!.push(memory)
    }
    
    const compressed: EnhancedMemoryRecord[] = []
    for (const [day, group] of grouped) {
      compressed.push({
        id: this.generateId(),
        agentId: group[0].agentId,
        type: MemoryType.EXPERIENCE,
        content: `Summary of ${day}: ${group.map(m => m.content).join('; ')}`,
        metadata: { compressed: true, source: 'compression', originalCount: group.length },
        importance: Math.max(...group.map(m => m.importance || 0)),
        timestamp: new Date(day),
        tags: ['compressed', 'summary'],
        duration: MemoryDuration.LONG_TERM,
        tier: MemoryTierType.EPISODIC,
        context: {
          source: 'compression'
        }
      })
    }
    
    return compressed
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer)
    }
    if (this.archivalTimer) {
      clearInterval(this.archivalTimer)
    }
    
    this.db.close()
  }
}

/**
 * Create a SQLite memory provider
 * @param config Configuration for the SQLite memory provider
 * @returns A SQLite memory provider instance
 */
export function createSQLiteMemoryProvider(config: SQLiteMemoryConfig): SQLiteMemoryProvider {
  return new SQLiteMemoryProvider(config)
}