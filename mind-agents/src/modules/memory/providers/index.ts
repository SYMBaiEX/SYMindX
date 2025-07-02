/**
 * Memory providers for SYMindX
 * 
 * This module exports memory providers for storing and retrieving agent memories.
 */

// Export all provider classes and configs
export { InMemoryProvider, createInMemoryProvider, createDefaultInMemoryProvider } from './memory/index.js'
export type { InMemoryConfig } from './memory/index.js'

export { SQLiteMemoryProvider } from './sqlite/index.js'
export type { SQLiteMemoryConfig } from './sqlite/index.js'

export { SupabaseMemoryProvider, createSupabaseMemoryProvider, SUPABASE_MEMORY_MIGRATION } from './supabase/index.js'
export type { SupabaseMemoryConfig } from './supabase/index.js'

export { NeonMemoryProvider, createNeonMemoryProvider, createNeonConnectionString } from './neon/index.js'
export type { NeonMemoryConfig } from './neon/index.js'

export { PostgresMemoryProvider, createPostgresMemoryProvider, createDefaultPostgresProvider, createPostgresConnectionString } from './postgres/index.js'
export type { PostgresMemoryConfig } from './postgres/index.js'

import { MemoryProviderType } from '../../../types/agent.js'
import { BaseMemoryConfig } from '../base-memory-provider.js'
import { InMemoryProvider, InMemoryConfig } from './memory/index.js'
import { SQLiteMemoryProvider, SQLiteMemoryConfig } from './sqlite/index.js'
import { SupabaseMemoryProvider, SupabaseMemoryConfig } from './supabase/index.js'
import { NeonMemoryProvider, NeonMemoryConfig, createNeonMemoryProvider } from './neon/index.js'
import { PostgresMemoryProvider, PostgresMemoryConfig, createPostgresMemoryProvider } from './postgres/index.js'

/**
 * Union type for all memory provider configurations
 */
export type MemoryProviderConfig = 
  | InMemoryConfig 
  | SQLiteMemoryConfig 
  | SupabaseMemoryConfig 
  | NeonMemoryConfig
  | PostgresMemoryConfig

/**
 * Create a memory provider based on the provider type
 * @param type The type of memory provider to create
 * @param config Configuration for the memory provider
 * @returns A memory provider instance
 */
export function createMemoryProvider(type: MemoryProviderType, config: MemoryProviderConfig) {
  switch (type) {
    case MemoryProviderType.MEMORY:
      return new InMemoryProvider(config as InMemoryConfig)
    case MemoryProviderType.SQLITE:
      return new SQLiteMemoryProvider(config as SQLiteMemoryConfig)
    case MemoryProviderType.SUPABASE_PGVECTOR:
      return new SupabaseMemoryProvider(config as SupabaseMemoryConfig)
    case MemoryProviderType.NEON:
      return createNeonMemoryProvider(config as NeonMemoryConfig)
    case MemoryProviderType.POSTGRES:
      return createPostgresMemoryProvider(config as PostgresMemoryConfig)
    default:
      throw new Error(`Unknown memory provider type: ${type}`)
  }
}

/**
 * Get all available memory provider types
 * @returns An array of memory provider types
 */
export function getMemoryProviderTypes() {
  return [
    {
      type: MemoryProviderType.MEMORY,
      name: 'In-Memory',
      description: 'Stores memories in memory (not persistent)',
      supportsVectorSearch: false,
      isPersistent: false
    },
    {
      type: MemoryProviderType.SQLITE,
      name: 'SQLite',
      description: 'Stores memories in a local SQLite database',
      supportsVectorSearch: false,
      isPersistent: true
    },
    {
      type: MemoryProviderType.SUPABASE_PGVECTOR,
      name: 'Supabase pgvector',
      description: 'Stores memories in Supabase with pgvector support',
      supportsVectorSearch: true,
      isPersistent: true
    },
    {
      type: MemoryProviderType.NEON,
      name: 'Neon',
      description: 'Stores memories in Neon Serverless Postgres with pgvector support',
      supportsVectorSearch: true,
      isPersistent: true
    },
    {
      type: MemoryProviderType.POSTGRES,
      name: 'PostgreSQL',
      description: 'Stores memories in PostgreSQL with auto-deployment and pgvector support',
      supportsVectorSearch: true,
      isPersistent: true
    }
  ]
}