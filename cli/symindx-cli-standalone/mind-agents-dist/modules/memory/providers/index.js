export { InMemoryProvider, createInMemoryProvider, createDefaultInMemoryProvider } from './memory/index.js';
export { SQLiteMemoryProvider } from './sqlite/index.js';
export { SupabaseMemoryProvider, createSupabaseMemoryProvider, SUPABASE_MEMORY_MIGRATION } from './supabase/index.js';
export { NeonMemoryProvider, createNeonMemoryProvider, createNeonConnectionString } from './neon/index.js';
export { PostgresMemoryProvider, createPostgresMemoryProvider, createDefaultPostgresProvider, createPostgresConnectionString } from './postgres/index.js';
import { MemoryProviderType } from '../../../types/agent.js';
import { InMemoryProvider } from './memory/index.js';
import { SQLiteMemoryProvider } from './sqlite/index.js';
import { SupabaseMemoryProvider } from './supabase/index.js';
import { createNeonMemoryProvider } from './neon/index.js';
import { createPostgresMemoryProvider } from './postgres/index.js';
export function createMemoryProvider(type, config) {
    switch (type) {
        case MemoryProviderType.MEMORY:
            return new InMemoryProvider(config);
        case MemoryProviderType.SQLITE:
            return new SQLiteMemoryProvider(config);
        case MemoryProviderType.SUPABASE_PGVECTOR:
            return new SupabaseMemoryProvider(config);
        case MemoryProviderType.NEON:
            return createNeonMemoryProvider(config);
        case MemoryProviderType.POSTGRES:
            return createPostgresMemoryProvider(config);
        default:
            throw new Error(`Unknown memory provider type: ${type}`);
    }
}
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
    ];
}
//# sourceMappingURL=index.js.map