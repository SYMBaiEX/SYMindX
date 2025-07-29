/**
 * Shared Module Components for SYMindX
 * 
 * Centralized exports for all shared module functionality
 */

// Database utilities
export { BaseRepository } from './database/BaseRepository';
export { DatabaseConnection, DatabaseType } from './database/DatabaseConnection';
export { QueryBuilder } from './database/QueryBuilder';
export { MigrationRunner, createMigration, loadMigrations } from './database/Migration';

// Memory utilities
export { SharedChatRepository } from './memory/SharedChatRepository';
export { SharedArchiver } from './memory/SharedArchiver';
export { SharedMemoryPool } from './memory/SharedMemoryPool';

// Module traits
export {
  DisposableTrait,
  InitializableTrait,
  ConfigurableTrait,
  HealthCheckableTrait,
  VersionedTrait,
  CachingTrait,
  ObservableTrait,
  CompleteModuleTrait,
  MemoryProviderTrait,
  EmotionModuleTrait,
  CognitionModuleTrait,
  type Disposable,
  type Initializable,
  type Configurable,
  type HealthCheckable,
  type Versioned,
  type EventListener,
  type CacheEntry
} from './traits/ModuleTraits';

// Lifecycle management
export {
  ModuleLifecycleManager,
  ModuleState,
  type ModuleInfo,
  type ModuleLifecycleEvents,
  type ModuleLifecycleListener,
  type ModuleInstance
} from './lifecycle/ModuleLifecycle';

// Resource management
export {
  ResourceManager,
  ResourcePool,
  type ResourceConfig,
  type ResourceMetrics,
  type ResourceUsage,
  type PooledResource
} from './resource/ResourceManager';

// Type exports for configuration interfaces
export type {
  RepositoryConfig,
  QueryOptions,
  BatchOperation
} from './database/BaseRepository';

export type {
  ConnectionConfig,
  ConnectionPool
} from './database/DatabaseConnection';

export type {
  QueryCondition,
  JoinClause
} from './database/QueryBuilder';

export type {
  Migration,
  MigrationRecord
} from './database/Migration';

export type {
  ArchiverConfig
} from './memory/SharedArchiver';

export type {
  PoolConfig,
  PoolEntry,
  PoolStats
} from './memory/SharedMemoryPool';