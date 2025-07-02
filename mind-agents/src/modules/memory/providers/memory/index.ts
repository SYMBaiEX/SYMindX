/**
 * In-Memory Provider for SYMindX
 * 
 * A comprehensive in-memory memory provider with vector similarity search,
 * persistence options, and performance optimizations for development and testing.
 */

import { MemoryRecord, MemoryType, MemoryDuration } from '../../../../types/agent.js'
import { BaseMemoryProvider, BaseMemoryConfig } from '../../base-memory-provider.js'
import { MemoryProviderMetadata } from '../../../../types/memory.js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Configuration for the in-memory memory provider
 */
export interface InMemoryConfig extends BaseMemoryConfig {
  /** Maximum number of memories to store per agent */
  maxMemoriesPerAgent?: number
  /** Enable persistence to disk */
  enablePersistence?: boolean
  /** Path to save memories when persistence is enabled */
  persistencePath?: string
  /** Auto-save interval in milliseconds */
  autoSaveInterval?: number
  /** Enable automatic cleanup of expired memories */
  enableAutoCleanup?: boolean
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number
}

/**
 * In-memory storage structure
 */
interface MemoryStorage {
  [agentId: string]: {
    memories: Map<string, MemoryRecord>
    lastAccessed: number
  }
}

/**
 * Vector similarity result
 */
interface SimilarityResult {
  memory: MemoryRecord
  similarity: number
}

/**
 * In-memory memory provider with vector search and persistence
 */
export class InMemoryProvider extends BaseMemoryProvider {
  private storage: MemoryStorage = {}
  protected declare config: InMemoryConfig
  private autoSaveTimer?: NodeJS.Timeout
  private cleanupTimer?: NodeJS.Timeout

  /**
   * Constructor for the in-memory memory provider
   */
  constructor(config: InMemoryConfig = {}) {
    const metadata: MemoryProviderMetadata = {
      id: 'memory',
      name: 'In-Memory Provider',
      description: 'A fast in-memory provider with vector search and optional persistence',
      version: '1.0.0',
      author: 'SYMindX Team',
      supportsVectorSearch: true,
      isPersistent: config.enablePersistence || false
    }

    super(config, metadata)
    this.config = {
      maxMemoriesPerAgent: 10000,
      enablePersistence: false,
      persistencePath: './data/memories.json',
      autoSaveInterval: 30000, // 30 seconds
      enableAutoCleanup: true,
      cleanupInterval: 300000, // 5 minutes
      ...config
    }

    this.initialize()
  }

  /**
   * Initialize the provider
   */
  private initialize(): void {
    // Load persisted memories if enabled
    if (this.config.enablePersistence) {
      this.loadFromDisk()

      // Setup auto-save timer
      if (this.config.autoSaveInterval) {
        this.autoSaveTimer = setInterval(() => {
          this.saveToDisk()
        }, this.config.autoSaveInterval)
      }
    }

    // Setup cleanup timer
    if (this.config.enableAutoCleanup && this.config.cleanupInterval) {
      this.cleanupTimer = setInterval(() => {
        this.performAutoCleanup()
      }, this.config.cleanupInterval)
    }

    console.log('✅ In-memory memory provider initialized')
  }

  /**
   * Store a memory for an agent
   */
  async store(agentId: string, memory: MemoryRecord): Promise<void> {
    if (!this.storage[agentId]) {
      this.storage[agentId] = {
        memories: new Map(),
        lastAccessed: Date.now()
      }
    }

    const agentStorage = this.storage[agentId]
    
    // Check memory limit
    if (agentStorage.memories.size >= (this.config.maxMemoriesPerAgent || 10000)) {
      await this.evictOldMemories(agentId)
    }

    agentStorage.memories.set(memory.id, { ...memory })
    agentStorage.lastAccessed = Date.now()

    // Only log significant memories
    if (memory.importance > 0.7 || memory.type === MemoryType.GOAL) {
      console.log(`💾 Stored significant memory: ${memory.type} for agent ${agentId}`)
    }
  }

  /**
   * Retrieve memories for an agent based on a query
   */
  async retrieve(agentId: string, query: string, limit = 10): Promise<MemoryRecord[]> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      return []
    }

    agentStorage.lastAccessed = Date.now()
    const memories = Array.from(agentStorage.memories.values())

    // Filter out expired short-term memories
    const validMemories = memories.filter(memory => {
      if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
        return memory.expiresAt.getTime() > Date.now()
      }
      return true
    })

    let results: MemoryRecord[]

    if (query === 'recent') {
      results = validMemories
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    } else if (query === 'important') {
      results = validMemories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit)
    } else if (query === 'short_term') {
      results = validMemories
        .filter(m => m.duration === MemoryDuration.SHORT_TERM)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
    } else if (query === 'long_term') {
      results = validMemories
        .filter(m => m.duration === MemoryDuration.LONG_TERM)
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit)
    } else {
      // Text search
      const searchResults = validMemories
        .map(memory => ({
          memory,
          score: this.calculateTextSimilarity(query.toLowerCase(), memory.content.toLowerCase())
        }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score || b.memory.importance - a.memory.importance)
        .slice(0, limit)

      results = searchResults.map(result => result.memory)
    }

    return results.map(memory => ({ ...memory })) // Return copies
  }

  /**
   * Search for memories using vector similarity
   */
  async search(agentId: string, embedding: number[], limit = 10): Promise<MemoryRecord[]> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      return []
    }

    agentStorage.lastAccessed = Date.now()
    const memories = Array.from(agentStorage.memories.values())

    // Filter memories with embeddings and not expired
    const embeddedMemories = memories.filter(memory => {
      if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
        if (memory.expiresAt.getTime() <= Date.now()) return false
      }
      return memory.embedding && memory.embedding.length > 0
    })

    if (embeddedMemories.length === 0) {
      console.warn('⚠️ No memories with embeddings found, falling back to recent memories')
      return this.retrieve(agentId, 'recent', limit)
    }

    // Calculate cosine similarity for each memory
    const similarities: SimilarityResult[] = embeddedMemories.map(memory => ({
      memory,
      similarity: this.calculateCosineSimilarity(embedding, memory.embedding!)
    }))

    // Sort by similarity and return top results
    const results = similarities
      .filter(result => result.similarity > 0.3) // Threshold for relevance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(result => ({ ...result.memory })) // Return copies

    return results
  }

  /**
   * Delete a memory for an agent
   */
  async delete(agentId: string, memoryId: string): Promise<void> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      throw new Error(`Agent ${agentId} not found`)
    }

    if (!agentStorage.memories.has(memoryId)) {
      throw new Error(`Memory ${memoryId} not found for agent ${agentId}`)
    }

    agentStorage.memories.delete(memoryId)
    agentStorage.lastAccessed = Date.now()

    console.log(`🗑️ Deleted memory: ${memoryId} for agent ${agentId}`)
  }

  /**
   * Clear all memories for an agent
   */
  async clear(agentId: string): Promise<void> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      return
    }

    const count = agentStorage.memories.size
    agentStorage.memories.clear()
    agentStorage.lastAccessed = Date.now()

    console.log(`🧹 Cleared ${count} memories for agent ${agentId}`)
  }

  /**
   * Get statistics about an agent's memories
   */
  async getStats(agentId: string): Promise<{ total: number; byType: Record<string, number> }> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      return { total: 0, byType: {} }
    }

    const memories = Array.from(agentStorage.memories.values())
    const total = memories.length

    const byType: Record<string, number> = {}
    memories.forEach(memory => {
      const type = memory.type
      byType[type] = (byType[type] || 0) + 1
    })

    return { total, byType }
  }

  /**
   * Clean up old and expired memories for an agent
   */
  async cleanup(agentId: string, retentionDays: number): Promise<void> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) {
      return
    }

    const now = Date.now()
    const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000)
    let expiredCount = 0
    let oldCount = 0

    // Clean up expired short-term memories and old memories
    for (const [id, memory] of agentStorage.memories) {
      let shouldDelete = false

      // Check for expired short-term memories
      if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
        if (memory.expiresAt.getTime() <= now) {
          shouldDelete = true
          expiredCount++
        }
      }

      // Check for old memories beyond retention period
      if (!shouldDelete && memory.timestamp.getTime() < cutoffTime) {
        shouldDelete = true
        oldCount++
      }

      if (shouldDelete) {
        agentStorage.memories.delete(id)
      }
    }

    agentStorage.lastAccessed = now

    console.log(`🧹 Cleaned up ${expiredCount} expired and ${oldCount} old memories for agent ${agentId}`)
  }

  /**
   * Export memories to JSON format
   */
  async exportMemories(agentId?: string): Promise<Record<string, MemoryRecord[]>> {
    const exported: Record<string, MemoryRecord[]> = {}

    if (agentId) {
      const agentStorage = this.storage[agentId]
      if (agentStorage) {
        exported[agentId] = Array.from(agentStorage.memories.values())
      }
    } else {
      for (const [id, storage] of Object.entries(this.storage)) {
        exported[id] = Array.from(storage.memories.values())
      }
    }

    return exported
  }

  /**
   * Import memories from JSON format
   */
  async importMemories(data: Record<string, MemoryRecord[]>): Promise<void> {
    for (const [agentId, memories] of Object.entries(data)) {
      if (!this.storage[agentId]) {
        this.storage[agentId] = {
          memories: new Map(),
          lastAccessed: Date.now()
        }
      }

      for (const memory of memories) {
        this.storage[agentId].memories.set(memory.id, memory)
      }
    }

    console.log(`📥 Imported memories for ${Object.keys(data).length} agents`)
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): {
    totalAgents: number
    totalMemories: number
    memoryUsage: number
    oldestMemory?: Date
    newestMemory?: Date
  } {
    let totalMemories = 0
    let oldestMemory: Date | undefined
    let newestMemory: Date | undefined

    for (const storage of Object.values(this.storage)) {
      totalMemories += storage.memories.size

      for (const memory of storage.memories.values()) {
        if (!oldestMemory || memory.timestamp < oldestMemory) {
          oldestMemory = memory.timestamp
        }
        if (!newestMemory || memory.timestamp > newestMemory) {
          newestMemory = memory.timestamp
        }
      }
    }

    // Rough memory usage calculation
    const memoryUsage = totalMemories * 1000 // Estimate 1KB per memory

    return {
      totalAgents: Object.keys(this.storage).length,
      totalMemories,
      memoryUsage,
      oldestMemory,
      newestMemory
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
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
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  /**
   * Calculate text similarity using simple word matching
   */
  private calculateTextSimilarity(query: string, content: string): number {
    const queryWords = query.split(/\s+/).filter(word => word.length > 2)
    const contentWords = content.split(/\s+/)

    if (queryWords.length === 0) return 0

    let matches = 0
    for (const queryWord of queryWords) {
      if (contentWords.some(word => word.includes(queryWord) || queryWord.includes(word))) {
        matches++
      }
    }

    return matches / queryWords.length
  }

  /**
   * Evict old memories when limit is reached
   */
  private async evictOldMemories(agentId: string): Promise<void> {
    const agentStorage = this.storage[agentId]
    if (!agentStorage) return

    const memories = Array.from(agentStorage.memories.entries())
    
    // Sort by importance and timestamp, remove least important/oldest
    memories.sort(([, a], [, b]) => {
      if (a.importance !== b.importance) {
        return a.importance - b.importance // Ascending (least important first)
      }
      return a.timestamp.getTime() - b.timestamp.getTime() // Ascending (oldest first)
    })

    // Remove 10% of memories to make room
    const toRemove = Math.floor(memories.length * 0.1)
    for (let i = 0; i < toRemove; i++) {
      agentStorage.memories.delete(memories[i][0])
    }

    console.log(`🧹 Evicted ${toRemove} memories for agent ${agentId} due to limit`)
  }

  /**
   * Perform automatic cleanup of expired memories
   */
  private performAutoCleanup(): void {
    const now = Date.now()

    for (const [agentId, storage] of Object.entries(this.storage)) {
      let cleanedCount = 0

      for (const [id, memory] of storage.memories) {
        if (memory.duration === MemoryDuration.SHORT_TERM && memory.expiresAt) {
          if (memory.expiresAt.getTime() <= now) {
            storage.memories.delete(id)
            cleanedCount++
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Auto-cleaned ${cleanedCount} expired memories for agent ${agentId}`)
      }
    }
  }

  /**
   * Save memories to disk
   */
  private saveToDisk(): void {
    if (!this.config.enablePersistence || !this.config.persistencePath) {
      return
    }

    try {
      const data = this.exportMemories()
      writeFileSync(this.config.persistencePath, JSON.stringify(data, null, 2))
      console.log(`💾 Saved memories to ${this.config.persistencePath}`)
    } catch (error) {
      console.error('❌ Failed to save memories to disk:', error)
    }
  }

  /**
   * Load memories from disk
   */
  private loadFromDisk(): void {
    if (!this.config.enablePersistence || !this.config.persistencePath) {
      return
    }

    try {
      if (existsSync(this.config.persistencePath)) {
        const data = readFileSync(this.config.persistencePath, 'utf-8')
        const parsed = JSON.parse(data)
        
        // Convert timestamp strings back to Date objects
        for (const memories of Object.values(parsed) as MemoryRecord[][]) {
          for (const memory of memories) {
            memory.timestamp = new Date(memory.timestamp)
            if (memory.expiresAt) {
              memory.expiresAt = new Date(memory.expiresAt)
            }
          }
        }

        this.importMemories(parsed)
        console.log(`📥 Loaded memories from ${this.config.persistencePath}`)
      }
    } catch (error) {
      console.error('❌ Failed to load memories from disk:', error)
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    if (this.config.enablePersistence) {
      this.saveToDisk()
    }

    console.log('🔌 In-memory memory provider disconnected')
  }
}

/**
 * Create an in-memory memory provider
 */
export function createInMemoryProvider(config: InMemoryConfig = {}): InMemoryProvider {
  return new InMemoryProvider(config)
}

/**
 * Default in-memory provider for quick setup
 */
export function createDefaultInMemoryProvider(): InMemoryProvider {
  return new InMemoryProvider({
    maxMemoriesPerAgent: 1000,
    enablePersistence: false,
    enableAutoCleanup: true,
    cleanupInterval: 60000 // 1 minute
  })
}