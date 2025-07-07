/**
 * Memory providers for SYMindX
 * 
 * This module exports memory providers for storing and retrieving agent memories.
 */

// Export all provider classes and configs
export { InMemoryProvider, createInMemoryProvider, createDefaultInMemoryProvider } from './memory/index'
export type { InMemoryConfig } from './memory/index'

export { SQLiteMemoryProvider } from './sqlite/index'
export type { SQLiteMemoryConfig } from './sqlite/index'

export { SupabaseMemoryProvider, createSupabaseMemoryProvider, SUPABASE_MEMORY_MIGRATION } from './supabase/index'
export type { SupabaseMemoryConfig } from './supabase/index'

export { NeonMemoryProvider, createNeonMemoryProvider, createNeonConnectionString } from './neon/index'
export type { NeonMemoryConfig } from './neon/index'

export { PostgresMemoryProvider, createPostgresMemoryProvider, createDefaultPostgresProvider, createPostgresConnectionString } from './postgres/index'
export type { PostgresMemoryConfig } from './postgres/index'

import { MemoryProviderType } from '../../../types/agent'
import { BaseMemoryConfig } from '../base-memory-provider'
import { InMemoryProvider, InMemoryConfig } from './memory/index'
import { SQLiteMemoryProvider, SQLiteMemoryConfig } from './sqlite/index'
import { SupabaseMemoryProvider, SupabaseMemoryConfig } from './supabase/index'
import { NeonMemoryProvider, NeonMemoryConfig, createNeonMemoryProvider } from './neon/index'
import { PostgresMemoryProvider, PostgresMemoryConfig, createPostgresMemoryProvider } from './postgres/index'

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
 * Create a memory provider based on string type
 * @param type The type of memory provider to create as string
 * @param config Configuration for the memory provider
 * @returns A memory provider instance
 */
export function createMemoryProviderByName(type: string, config: MemoryProviderConfig) {
  switch (type) {
    case 'memory':
      return new InMemoryProvider(config as InMemoryConfig)
    case 'sqlite':
      return new SQLiteMemoryProvider(config as SQLiteMemoryConfig)
    case 'supabase':
      return new SupabaseMemoryProvider(config as SupabaseMemoryConfig)
    case 'neon':
      return createNeonMemoryProvider(config as NeonMemoryConfig)
    case 'postgres':
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