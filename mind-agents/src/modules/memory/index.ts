/**
 * Memory Module for SYMindX
 *
 * This module provides memory providers for storing and retrieving agent memories.
 */

// MemoryProviderType used in type exports but not at runtime
import { ModuleRegistry } from '../../types/agent';
import { runtimeLogger } from '../../utils/logger';

// Import provider classes for registration
import { InMemoryProvider } from './providers/memory/index';
import { NeonMemoryProvider } from './providers/neon/index';
import { PostgresMemoryProvider } from './providers/postgres/index';
import { SQLiteMemoryProvider } from './providers/sqlite/index';
import { SupabaseMemoryProvider } from './providers/supabase/index';
import { AgenticRAGProvider } from './agentic-rag-provider';

// Re-export the memory provider factory and types
export {
  createMemoryProvider,
  createMemoryProviderByName,
  getMemoryProviderTypes,
} from './providers/index';
export type { MemoryProviderConfig } from './providers/index';
export type { MemoryProviderType } from '../../types/agent';

// Export Agentic-RAG provider and types
export { 
  AgenticRAGProvider, 
  createAgenticRAGProvider,
  MemoryAgentType,
  MemoryLayer
} from './agentic-rag-provider';
export type { 
  AgenticRAGConfig,
  MemoryAgent,
  MemoryOrchestrator,
  OrchestrationResult
} from './agentic-rag-provider';

/**
 * Register all memory providers with the registry
 */
export async function registerMemoryProviders(
  registry: ModuleRegistry
): Promise<void> {
  try {
    // Import the string-based factory function
    const { createMemoryProviderByName } = await import('./providers/index');

    // Register memory provider factories using the string-based factory
    registry.registerMemoryFactory('memory', (config: unknown) =>
      createMemoryProviderByName('memory', config as any)
    );
    registry.registerMemoryFactory('sqlite', (config: unknown) =>
      createMemoryProviderByName('sqlite', config as any)
    );
    registry.registerMemoryFactory('supabase', (config: unknown) =>
      createMemoryProviderByName('supabase', config as any)
    );
    registry.registerMemoryFactory('neon', (config: unknown) =>
      createMemoryProviderByName('neon', config as any)
    );
    registry.registerMemoryFactory('postgres', (config: unknown) =>
      createMemoryProviderByName('postgres', config as any)
    );
    registry.registerMemoryFactory('agentic-rag', (config: unknown) =>
      new AgenticRAGProvider(config as any)
    );

    runtimeLogger.info(
      '📝 Memory providers registered: memory, sqlite, supabase, neon, postgres, agentic-rag'
    );

    // Also register the main in-memory provider for backward compatibility
    const defaultProvider = new InMemoryProvider({});
    registry.registerMemoryProvider('memory', defaultProvider);
  } catch (error) {
    void error;
    runtimeLogger.error('❌ Failed to register memory providers:', error);
    throw error;
  }
}

/**
 * Get available memory provider names
 */
export function getAvailableMemoryProviders(): string[] {
  return ['memory', 'sqlite', 'supabase', 'neon', 'postgres', 'agentic-rag'];
}
