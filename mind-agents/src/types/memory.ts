/**
 * Memory Types for SYMindX
 * 
 * This file defines the interfaces for memory providers and their metadata.
 */

import { MemoryProvider, MemoryRecord } from './agent.js'

/**
 * Memory tier types for multi-level memory architecture
 */
export enum MemoryTierType {
  WORKING = 'working',        // Short-term active memory (7±2 items)
  EPISODIC = 'episodic',      // Event-based memories with temporal context
  SEMANTIC = 'semantic',      // Fact-based knowledge and concepts
  PROCEDURAL = 'procedural',  // Skill-based and how-to memories
  INTERACTION = 'interaction' // Interactive conversation memory
}

/**
 * @deprecated Use MemoryTierType instead
 */
export type MemoryType = MemoryTierType

/**
 * Memory duration types for retention policies
 */
export enum MemoryDuration {
  SHORT_TERM = 'short_term',     // Minutes to hours
  MEDIUM_TERM = 'medium_term',   // Hours to days
  LONG_TERM = 'long_term',       // Days to weeks
  PERMANENT = 'permanent'        // Indefinite retention
}

/**
 * Consolidation rules for memory transfer between tiers
 */
export interface ConsolidationRule {
  fromTier: MemoryTierType
  toTier: MemoryTierType
  condition: 'importance' | 'frequency' | 'age' | 'emotional'
  threshold: number
}

/**
 * Memory tier configuration
 */
export interface MemoryTier {
  type: MemoryTierType
  capacity?: number
  consolidationRules?: ConsolidationRule[]
  decayRate?: number // How fast memories fade (0-1)
}

/**
 * Enhanced memory context with embeddings and relationships
 */
export interface MemoryContext {
  embedding?: number[]           // Vector representation
  relationships?: string[]       // Related memory IDs
  emotionalValence?: number     // -1 to 1 (negative to positive)
  confidence?: number           // 0 to 1 confidence score
  source?: 'experience' | 'learned' | 'told' | 'inferred'
}

/**
 * Memory permissions for shared access
 */
export enum MemoryPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share'
}

/**
 * Shared memory pool configuration
 */
export interface SharedMemoryConfig {
  poolId: string
  agentIds: string[]
  permissions: Map<string, MemoryPermission[]>
  syncStrategy: 'immediate' | 'eventual' | 'manual'
  conflictResolution?: 'latest' | 'merge' | 'prompt'
}

/**
 * Memory archival strategy
 */
export interface ArchivalStrategy {
  type: 'compression' | 'summarization' | 'hierarchical'
  triggerAge?: number         // Days before archival
  triggerCount?: number       // Number of memories before archival
  compressionLevel?: number   // 0-1 (0 = lossless, 1 = maximum compression)
}

/**
 * Metadata for a memory provider
 */
export interface MemoryProviderMetadata {
  /**
   * Unique identifier for the memory provider
   */
  id: string

  /**
   * Human-readable name for the memory provider
   */
  name: string

  /**
   * Description of the memory provider
   */
  description: string

  /**
   * Version of the memory provider
   */
  version: string

  /**
   * Author of the memory provider
   */
  author: string

  /**
   * Whether the memory provider supports vector search
   */
  supportsVectorSearch: boolean

  /**
   * Whether the memory provider is persistent (survives restarts)
   */
  isPersistent: boolean

  /**
   * Supported memory tiers
   */
  supportedTiers?: MemoryTierType[]

  /**
   * Whether the provider supports shared memory pools
   */
  supportsSharedMemory?: boolean
}

/**
 * Factory function for creating a memory provider
 */
export type MemoryProviderFactory = (config: any) => MemoryProvider

/**
 * Configuration for a memory provider
 */
export interface MemoryProviderConfig {
  /**
   * The type of memory provider
   */
  provider: string

  /**
   * The maximum number of records to keep
   */
  maxRecords: number

  /**
   * The embedding model to use for vector search
   */
  embeddingModel: string

  /**
   * The number of days to retain memories
   */
  retentionDays: number

  /**
   * Memory tier configurations
   */
  tiers?: MemoryTier[]

  /**
   * Shared memory pool configuration
   */
  sharedMemory?: SharedMemoryConfig

  /**
   * Archival strategies
   */
  archival?: ArchivalStrategy[]

  /**
   * Provider-specific configuration
   */
  [key: string]: any
}