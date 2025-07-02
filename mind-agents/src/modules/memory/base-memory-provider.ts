/**
 * Base Memory Provider for SYMindX
 * 
 * This abstract class implements the MemoryProvider interface and provides
 * common functionality for all memory providers.
 */

import { MemoryProvider, MemoryRecord, MemoryDuration, MemoryType } from '../../types/agent.js'
import { MemoryProviderMetadata } from '../../types/memory.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Base configuration interface for memory providers
 */
export interface BaseMemoryConfig {
  /**
   * Embedding model to use for vector search
   */
  embeddingModel?: string
  
  /**
   * Additional configuration properties
   */
  [key: string]: unknown
}

/**
 * Interface for database row data
 */
export interface MemoryRow {
  id: string
  agent_id: string
  type: string
  content: string
  embedding?: Buffer | number[] | null
  metadata?: string | object
  importance: number
  timestamp: number | Date | string
  tags?: string | string[]
  duration?: string
  expires_at?: number | Date | string | null
  memory_id?: string // Alternative field name for id
}

/**
 * Abstract base class for memory providers
 */
export abstract class BaseMemoryProvider implements MemoryProvider {
  protected config: BaseMemoryConfig
  protected metadata: MemoryProviderMetadata
  protected embeddingModel: string

  /**
   * Constructor for the base memory provider
   * @param config Configuration for the memory provider
   * @param metadata Metadata for the memory provider
   */
  constructor(config: BaseMemoryConfig, metadata: MemoryProviderMetadata) {
    this.config = config
    this.metadata = metadata
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small'
  }

  /**
   * Store a memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  abstract store(agentId: string, memory: MemoryRecord): Promise<void>

  /**
   * Store a short-term memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param ttlMinutes Time to live in minutes before the memory expires
   */
  async storeShortTerm(agentId: string, memory: MemoryRecord, ttlMinutes: number = 60): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);
    
    const shortTermMemory: MemoryRecord = {
      ...memory,
      duration: MemoryDuration.SHORT_TERM,
      expiresAt
    };
    
    return this.store(agentId, shortTermMemory);
  }
  
  /**
   * Store a long-term memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  async storeLongTerm(agentId: string, memory: MemoryRecord): Promise<void> {
    const longTermMemory: MemoryRecord = {
      ...memory,
      duration: MemoryDuration.LONG_TERM
    };
    
    return this.store(agentId, longTermMemory);
  }

  /**
   * Retrieve memories for an agent based on a query
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  abstract retrieve(agentId: string, query: string, limit?: number): Promise<MemoryRecord[]>

  /**
   * Retrieve only short-term memories for an agent
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieveShortTerm(agentId: string, query: string, limit: number = 10): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);
    const now = new Date();
    
    // Filter out expired memories and only return short-term memories
    return memories.filter(memory => 
      memory.duration === 'short_term' && 
      (!memory.expiresAt || memory.expiresAt > now)
    );
  }

  /**
   * Retrieve only long-term memories for an agent
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieveLongTerm(agentId: string, query: string, limit: number = 10): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);
    
    // Only return long-term memories
    return memories.filter(memory => memory.duration === 'long_term');
  }

  /**
   * Search for memories using vector similarity
   * @param agentId The ID of the agent
   * @param embedding The embedding vector to search with
   * @param limit The maximum number of memories to return
   */
  abstract search(agentId: string, embedding: number[], limit?: number): Promise<MemoryRecord[]>

  /**
   * Delete a memory for an agent
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to delete
   */
  abstract delete(agentId: string, memoryId: string): Promise<void>

  /**
   * Clear all memories for an agent
   * @param agentId The ID of the agent
   */
  abstract clear(agentId: string): Promise<void>

  /**
   * Get statistics about an agent's memories
   * @param agentId The ID of the agent
   */
  abstract getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }>

  /**
   * Clean up old memories for an agent
   * @param agentId The ID of the agent
   * @param retentionDays The number of days to retain memories
   */
  abstract cleanup(agentId: string, retentionDays: number): Promise<void>

  /**
   * Get the metadata for this memory provider
   * @returns The metadata for this memory provider
   */
  getMetadata(): MemoryProviderMetadata {
    return this.metadata
  }

  /**
   * Get recent memories for an agent
   * @param agentId The ID of the agent
   * @param limit Maximum number of memories to return
   * @returns Array of recent memory records
   */
  async getRecent(agentId: string, limit = 10): Promise<MemoryRecord[]> {
    // This is a default implementation that calls retrieve with 'recent' query
    // Subclasses can override this method if they have a more efficient implementation
    return this.retrieve(agentId, 'recent', limit);
  }

  /**
   * Generate a unique ID
   * @returns A unique ID string
   */
  protected generateId(): string {
    return uuidv4()
  }

  /**
   * Format a memory record for storage
   * @param memory The memory record to format
   * @returns The formatted memory record
   */
  protected formatMemoryForStorage(memory: MemoryRecord): Record<string, unknown> {
    return {
      ...memory,
      timestamp: memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp,
      metadata: typeof memory.metadata === 'object' ? JSON.stringify(memory.metadata) : memory.metadata,
      tags: Array.isArray(memory.tags) ? JSON.stringify(memory.tags) : memory.tags
    }
  }

  /**
   * Parse a memory record from storage
   * @param row The raw data from storage
   * @returns The parsed memory record
   */
  protected parseMemoryFromStorage(row: MemoryRow): MemoryRecord {
    return {
      id: row.id || row.memory_id || '',
      agentId: row.agent_id,
      type: (row.type as string) ? MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] || MemoryType.EXPERIENCE : MemoryType.EXPERIENCE,
      content: row.content,
      embedding: Array.isArray(row.embedding) ? row.embedding : undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      importance: row.importance || 0.5,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (Array.isArray(row.tags) ? row.tags : []),
      duration: (row.duration || MemoryDuration.LONG_TERM) as MemoryDuration,
      expiresAt: row.expires_at ? (row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at)) : undefined
    }
  }
}