/**
 * Memory Module for SYMindX
 *
 * This module provides memory providers for storing and retrieving agent memories.
 */

// MemoryProviderType used in type exports but not at runtime
import { ModuleRegistry } from '../../types/agent';
export type { MemoryProviderType } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';

// Re-export the memory provider factory and types
export {
  createMemoryProvider,
  getMemoryProviderTypes,
} from './providers/index';
export type { MemoryProviderConfig } from './providers/index';

// Import provider classes for registration
import { InMemoryProvider } from './providers/memory/index';
import { NeonMemoryProvider } from './providers/neon/index';
import { PostgresMemoryProvider } from './providers/postgres/index';
import { SQLiteMemoryProvider } from './providers/sqlite/index';
import { SupabaseMemoryProvider } from './providers/supabase/index';

/**
 * Register all memory providers with the registry
 */
export async function registerMemoryProviders(
  registry: ModuleRegistry
): Promise<void> {
  try {
    // Register memory provider factories
    registry.registerMemoryFactory(
      'memory',
      (config: any) => new InMemoryProvider(config)
    );
    registry.registerMemoryFactory(
      'sqlite',
      (config: any) => new SQLiteMemoryProvider(config)
    );
    registry.registerMemoryFactory(
      'supabase',
      (config: any) => new SupabaseMemoryProvider(config)
    );
    registry.registerMemoryFactory(
      'neon',
      (config: any) => new NeonMemoryProvider(config)
    );
    registry.registerMemoryFactory(
      'postgres',
      (config: any) => new PostgresMemoryProvider(config)
    );

    runtimeLogger.info(
      '📝 Memory providers registered: memory, sqlite, supabase, neon, postgres'
    );

    // Also register the main in-memory provider for backward compatibility
    const defaultProvider = new InMemoryProvider({});
    registry.registerMemoryProvider('memory', defaultProvider);
  } catch (error) {
    runtimeLogger.error('❌ Failed to register memory providers:', error);
    throw error;
  }
}

/**
 * Get available memory provider names
 */
export function getAvailableMemoryProviders(): string[] {
  return ['memory', 'sqlite', 'supabase', 'neon', 'postgres'];
}
