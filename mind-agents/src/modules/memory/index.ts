/**
 * Memory Management Module
 * 
 * This module provides memory management capabilities including various providers
 * for SQLite, Supabase, Neon, PostgreSQL, and in-memory storage.
 */

export * from './base-memory-provider.js'
export * from './providers/index.js'

// Import the real memory provider factories
import { 
  createMemoryProvider as createRealMemoryProvider,
  createInMemoryProvider,
  createDefaultInMemoryProvider,
  SQLiteMemoryProvider,
  createSupabaseMemoryProvider,
  createNeonMemoryProvider,
  createPostgresMemoryProvider,
  createDefaultPostgresProvider
} from './providers/index.js'
import { MemoryProviderType } from '../../types/agent.js'

// Factory function using real implementations
export function createMemoryProvider(type: string, config?: any) {
  console.log(`🧠 Creating memory provider: ${type}`)
  
  try {
    // Use the real factory from providers
    return createRealMemoryProvider(type as MemoryProviderType, config)
  } catch (error) {
    console.warn(`⚠️ Failed to create memory provider ${type}, falling back to in-memory:`, error)
    return createDefaultInMemoryProvider()
  }
}

// Registration function with real providers
export function registerMemoryProviders(registry: any) {
  try {
    // Register memory factories in the registry
    registry.registerMemoryFactory('memory', (config: any) => createInMemoryProvider(config))
    registry.registerMemoryFactory('sqlite', (config: any) => new SQLiteMemoryProvider(config))
    registry.registerMemoryFactory('supabase_pgvector', (config: any) => createSupabaseMemoryProvider(config))
    registry.registerMemoryFactory('neon', (config: any) => createNeonMemoryProvider(config))
    registry.registerMemoryFactory('postgres', (config: any) => createPostgresMemoryProvider(config))
    
    // Also register some default instances for backward compatibility
    registry.registerMemoryProvider('memory', createDefaultInMemoryProvider())
    
    // Memory providers registered - logged by runtime
  } catch (error) {
    console.error('❌ Error registering memory providers:', error)
    // Fallback registration
    registry.registerMemoryProvider('memory', createDefaultInMemoryProvider())
    console.log('⚠️ Registered fallback in-memory provider only')
  }
}