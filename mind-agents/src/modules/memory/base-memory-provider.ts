/**
 * Base Memory Provider for SYMindX
 *
 * This abstract class implements the MemoryProvider interface and provides
 * common functionality for all memory providers with support for memory tiers,
 * vector embeddings, and shared memory pools.
 */

import { v4 as uuidv4 } from 'uuid';

import {
  MemoryProvider,
  MemoryRecord,
  MemoryDuration,
  MemoryType,
} from '../../types/agent';
import {
  MemoryProviderMetadata,
  MemoryTier,
  MemoryTierType,
  MemoryContext,
  ConsolidationRule,
  SharedMemoryConfig,
  ArchivalStrategy,
} from '../../types/memory';

/**
 * Base configuration interface for memory providers
 */
export interface BaseMemoryConfig {
  /**
   * Embedding model to use for vector search
   */
  embeddingModel?: string;

  /**
   * Memory tier configurations
   */
  tiers?: MemoryTier[];

  /**
   * Shared memory pool configuration
   */
  sharedMemory?: SharedMemoryConfig;

  /**
   * Archival strategies
   */
  archival?: ArchivalStrategy[];

  /**
   * Additional configuration properties
   */
  [key: string]: unknown;
}

/**
 * Interface for database row data
 */
export interface MemoryRow {
  id: string;
  agent_id: string;
  type: string;
  content: string;
  embedding?: Buffer | number[] | null;
  metadata?: string | object;
  importance: number;
  timestamp: number | Date | string;
  tags?: string | string[];
  duration?: string;
  expires_at?: number | Date | string | null;
  memory_id?: string; // Alternative field name for id
}

/**
 * Enhanced memory record with tier and context
 */
export interface EnhancedMemoryRecord extends MemoryRecord {
  tier?: MemoryTierType;
  context?: MemoryContext;
}

/**
 * Working memory item with limited capacity tracking
 */
export interface WorkingMemoryItem {
  id: string;
  content: string;
  attention: number; // 0-1, how much attention is on this item
  lastAccessed: Date;
}

/**
 * Abstract base class for memory providers
 */
export abstract class BaseMemoryProvider implements MemoryProvider {
  protected config: BaseMemoryConfig;
  protected metadata: MemoryProviderMetadata;
  protected embeddingModel: string;
  protected tiers: Map<MemoryTierType, MemoryTier>;
  protected workingMemory: Map<string, WorkingMemoryItem[]>; // agentId -> items

  /**
   * Constructor for the base memory provider
   * @param config Configuration for the memory provider
   * @param metadata Metadata for the memory provider
   */
  constructor(config: BaseMemoryConfig, metadata: MemoryProviderMetadata) {
    this.config = config;
    this.metadata = metadata;
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    this.tiers = new Map();
    this.workingMemory = new Map();

    // Initialize memory tiers
    if (config.tiers) {
      config.tiers.forEach((tier) => {
        this.tiers.set(tier.type, tier);
      });
    } else {
      // Default tier configuration
      this.initializeDefaultTiers();
    }
  }

  /**
   * Initialize default memory tiers
   */
  protected initializeDefaultTiers(): void {
    this.tiers.set(MemoryTierType.WORKING, {
      type: MemoryTierType.WORKING,
      capacity: 7,
      decayRate: 0.1,
    });

    this.tiers.set(MemoryTierType.EPISODIC, {
      type: MemoryTierType.EPISODIC,
      capacity: 1000,
      consolidationRules: [
        {
          fromTier: MemoryTierType.WORKING,
          toTier: MemoryTierType.EPISODIC,
          condition: 'importance',
          threshold: 0.7,
        },
      ],
    });

    this.tiers.set(MemoryTierType.SEMANTIC, {
      type: MemoryTierType.SEMANTIC,
      capacity: 10000,
      consolidationRules: [
        {
          fromTier: MemoryTierType.EPISODIC,
          toTier: MemoryTierType.SEMANTIC,
          condition: 'frequency',
          threshold: 3,
        },
      ],
    });

    this.tiers.set(MemoryTierType.PROCEDURAL, {
      type: MemoryTierType.PROCEDURAL,
      capacity: 500,
    });
  }

  /**
   * Store a memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   */
  abstract store(agentId: string, memory: MemoryRecord): Promise<void>;

  /**
   * Store a short-term memory for an agent
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param ttlMinutes Time to live in minutes before the memory expires
   */
  async storeShortTerm(
    agentId: string,
    memory: MemoryRecord,
    ttlMinutes: number = 60
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    const shortTermMemory: MemoryRecord = {
      ...memory,
      duration: MemoryDuration.SHORT_TERM,
      expiresAt,
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
      duration: MemoryDuration.LONG_TERM,
    };

    return this.store(agentId, longTermMemory);
  }

  /**
   * Retrieve memories for an agent based on a query
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  abstract retrieve(
    agentId: string,
    query: string,
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Retrieve only short-term memories for an agent
   * @param agentId The ID of the agent
   * @param query The query to search for
   * @param limit The maximum number of memories to return
   */
  async retrieveShortTerm(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);
    const now = new Date();

    // Filter out expired memories and only return short-term memories
    return memories.filter(
      (memory) =>
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
  async retrieveLongTerm(
    agentId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieve(agentId, query, limit);

    // Only return long-term memories
    return memories.filter((memory) => memory.duration === 'long_term');
  }

  /**
   * Search for memories using vector similarity
   * @param agentId The ID of the agent
   * @param embedding The embedding vector to search with
   * @param limit The maximum number of memories to return
   */
  abstract search(
    agentId: string,
    embedding: number[],
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Delete a memory for an agent
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to delete
   */
  abstract delete(agentId: string, memoryId: string): Promise<void>;

  /**
   * Clear all memories for an agent
   * @param agentId The ID of the agent
   */
  abstract clear(agentId: string): Promise<void>;

  /**
   * Get statistics about an agent's memories
   * @param agentId The ID of the agent
   */
  abstract getStats(
    agentId: string
  ): Promise<{ total: number; byType: Record<string, number> }>;

  /**
   * Clean up old memories for an agent
   * @param agentId The ID of the agent
   * @param retentionDays The number of days to retain memories
   */
  abstract cleanup(agentId: string, retentionDays: number): Promise<void>;

  /**
   * Get the metadata for this memory provider
   * @returns The metadata for this memory provider
   */
  getMetadata(): MemoryProviderMetadata {
    return this.metadata;
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
    return uuidv4();
  }

  /**
   * Format a memory record for storage
   * @param memory The memory record to format
   * @returns The formatted memory record
   */
  protected formatMemoryForStorage(
    memory: MemoryRecord
  ): Record<string, unknown> {
    return {
      ...memory,
      timestamp:
        memory.timestamp instanceof Date
          ? memory.timestamp.toISOString()
          : memory.timestamp,
      metadata:
        typeof memory.metadata === 'object'
          ? JSON.stringify(memory.metadata)
          : memory.metadata,
      tags: Array.isArray(memory.tags)
        ? JSON.stringify(memory.tags)
        : memory.tags,
    };
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
      type: (row.type as string)
        ? MemoryType[row.type.toUpperCase() as keyof typeof MemoryType] ||
          MemoryType.EXPERIENCE
        : MemoryType.EXPERIENCE,
      content: row.content,
      embedding: Array.isArray(row.embedding) ? row.embedding : undefined,
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata || {},
      importance: row.importance || 0.5,
      timestamp:
        row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
      tags:
        typeof row.tags === 'string'
          ? JSON.parse(row.tags)
          : Array.isArray(row.tags)
            ? row.tags
            : [],
      duration: (row.duration || MemoryDuration.LONG_TERM) as MemoryDuration,
      expiresAt: row.expires_at
        ? row.expires_at instanceof Date
          ? row.expires_at
          : new Date(row.expires_at)
        : undefined,
    };
  }

  /**
   * Store a memory in a specific tier
   * @param agentId The ID of the agent
   * @param memory The memory to store
   * @param tier The memory tier
   */
  async storeTier(
    agentId: string,
    memory: MemoryRecord,
    tier: MemoryTierType
  ): Promise<void> {
    const enhancedMemory: EnhancedMemoryRecord = {
      ...memory,
      tier,
    };

    // Handle working memory specially
    if (tier === MemoryTierType.WORKING) {
      await this.addToWorkingMemory(agentId, memory);
    } else {
      await this.store(agentId, enhancedMemory);
    }
  }

  /**
   * Add an item to working memory with capacity management
   * @param agentId The ID of the agent
   * @param memory The memory to add
   */
  protected async addToWorkingMemory(
    agentId: string,
    memory: MemoryRecord
  ): Promise<void> {
    const items = this.workingMemory.get(agentId) || [];
    const tier = this.tiers.get(MemoryTierType.WORKING);
    const capacity = tier?.capacity || 7;

    const newItem: WorkingMemoryItem = {
      id: memory.id,
      content: memory.content,
      attention: 1.0,
      lastAccessed: new Date(),
    };

    // If at capacity, consolidate or remove least attended item
    if (items.length >= capacity) {
      // Find least attended item
      const leastAttended = items.reduce((min, item) =>
        item.attention < min.attention ? item : min
      );

      // Check if it should be consolidated to episodic memory
      if (leastAttended.attention > 0.5) {
        await this.consolidateMemory(
          agentId,
          leastAttended.id,
          MemoryTierType.WORKING,
          MemoryTierType.EPISODIC
        );
      }

      // Remove from working memory
      const index = items.findIndex((item) => item.id === leastAttended.id);
      items.splice(index, 1);
    }

    items.push(newItem);
    this.workingMemory.set(agentId, items);
  }

  /**
   * Consolidate memory from one tier to another
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory to consolidate
   * @param fromTier The source tier
   * @param toTier The destination tier
   */
  abstract consolidateMemory(
    agentId: string,
    memoryId: string,
    fromTier: MemoryTierType,
    toTier: MemoryTierType
  ): Promise<void>;

  /**
   * Get memories from a specific tier
   * @param agentId The ID of the agent
   * @param tier The memory tier
   * @param limit Maximum number of memories to return
   */
  abstract retrieveTier(
    agentId: string,
    tier: MemoryTierType,
    limit?: number
  ): Promise<MemoryRecord[]>;

  /**
   * Update working memory attention based on access
   * @param agentId The ID of the agent
   * @param memoryId The ID of the memory accessed
   */
  protected updateWorkingMemoryAttention(
    agentId: string,
    memoryId: string
  ): void {
    const items = this.workingMemory.get(agentId) || [];
    const tier = this.tiers.get(MemoryTierType.WORKING);
    const decayRate = tier?.decayRate || 0.1;

    items.forEach((item) => {
      if (item.id === memoryId) {
        item.attention = 1.0;
        item.lastAccessed = new Date();
      } else {
        // Decay attention for other items
        item.attention = Math.max(0, item.attention - decayRate);
      }
    });

    this.workingMemory.set(agentId, items);
  }

  /**
   * Get semantic memories related to a concept
   * @param agentId The ID of the agent
   * @param concept The concept to search for
   * @param limit Maximum number of memories to return
   */
  async retrieveSemantic(
    agentId: string,
    concept: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieveTier(
      agentId,
      MemoryTierType.SEMANTIC,
      limit * 2
    );

    // Filter by concept relevance
    return memories
      .filter((memory) => {
        const content = memory.content.toLowerCase();
        const conceptLower = concept.toLowerCase();
        return (
          content.includes(conceptLower) ||
          memory.tags?.some((tag) => tag.toLowerCase().includes(conceptLower))
        );
      })
      .slice(0, limit);
  }

  /**
   * Get episodic memories within a time range
   * @param agentId The ID of the agent
   * @param startTime Start of the time range
   * @param endTime End of the time range
   * @param limit Maximum number of memories to return
   */
  async retrieveEpisodic(
    agentId: string,
    startTime: Date,
    endTime: Date,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    const memories = await this.retrieveTier(
      agentId,
      MemoryTierType.EPISODIC,
      limit * 2
    );

    return memories
      .filter((memory) => {
        const timestamp = memory.timestamp;
        return timestamp >= startTime && timestamp <= endTime;
      })
      .slice(0, limit);
  }

  /**
   * Archive old memories based on configured strategies
   * @param agentId The ID of the agent
   */
  abstract archiveMemories(agentId: string): Promise<void>;

  /**
   * Share memories with other agents in a pool
   * @param agentId The source agent ID
   * @param memoryIds Memory IDs to share
   * @param poolId The shared memory pool ID
   */
  abstract shareMemories(
    agentId: string,
    memoryIds: string[],
    poolId: string
  ): Promise<void>;

  /**
   * Generate embedding for a memory
   * @param content The memory content
   * @returns The embedding vector
   */
  abstract generateEmbedding(content: string): Promise<number[]>;

  /**
   * Calculate similarity between two embeddings
   * @param embedding1 First embedding vector
   * @param embedding2 Second embedding vector
   * @returns Similarity score (0-1)
   */
  protected cosineSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }
}
