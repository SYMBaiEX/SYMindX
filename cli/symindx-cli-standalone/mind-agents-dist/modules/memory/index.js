export * from './base-memory-provider.js';
export * from './providers/index.js';
import { createMemoryProvider as createRealMemoryProvider, createInMemoryProvider, createDefaultInMemoryProvider, SQLiteMemoryProvider, createSupabaseMemoryProvider, createNeonMemoryProvider, createPostgresMemoryProvider } from './providers/index.js';
export function createMemoryProvider(type, config) {
    console.log(`🧠 Creating memory provider: ${type}`);
    try {
        return createRealMemoryProvider(type, config);
    }
    catch (error) {
        console.warn(`⚠️ Failed to create memory provider ${type}, falling back to in-memory:`, error);
        return createDefaultInMemoryProvider();
    }
}
export function registerMemoryProviders(registry) {
    console.log('🧠 Registering memory providers...');
    try {
        registry.registerMemoryFactory('memory', (config) => createInMemoryProvider(config));
        registry.registerMemoryFactory('sqlite', (config) => new SQLiteMemoryProvider(config));
        registry.registerMemoryFactory('supabase_pgvector', (config) => createSupabaseMemoryProvider(config));
        registry.registerMemoryFactory('neon', (config) => createNeonMemoryProvider(config));
        registry.registerMemoryFactory('postgres', (config) => createPostgresMemoryProvider(config));
        registry.registerMemoryProvider('memory', createDefaultInMemoryProvider());
        console.log('✅ Memory providers registered: memory, sqlite, supabase_pgvector, neon, postgres');
    }
    catch (error) {
        console.error('❌ Error registering memory providers:', error);
        registry.registerMemoryProvider('memory', createDefaultInMemoryProvider());
        console.log('⚠️ Registered fallback in-memory provider only');
    }
}
//# sourceMappingURL=index.js.map