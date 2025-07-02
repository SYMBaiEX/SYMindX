export * from './base-memory-provider.js';
export * from './providers/index.js';
import { SQLiteMemoryProvider } from './providers/index.js';
export declare function createMemoryProvider(type: string, config?: any): import("./providers/index.js").InMemoryProvider | SQLiteMemoryProvider | import("./providers/index.js").SupabaseMemoryProvider | import("./providers/index.js").NeonMemoryProvider | import("./providers/index.js").PostgresMemoryProvider;
export declare function registerMemoryProviders(registry: any): void;
