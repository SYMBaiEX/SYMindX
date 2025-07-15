/**
 * Memory Provider Type Definitions
 * Provides comprehensive type safety for memory provider implementations
 */

import { MemoryRecord } from '../agent.js';

import { DatabaseError } from './database.js';

/**
 * Search options for memory queries
 */
export interface SearchOptions {
  query?: string;
  filters?: {
    type?: string[];
    tags?: string[];
    agentId?: string;
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    importance?: {
      min?: number;
      max?: number;
    };
  };
  sort?: {
    field: 'timestamp' | 'importance' | 'relevance';
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
  includeEmbeddings?: boolean;
}

/**
 * Search result interface
 */
export interface SearchResult {
  record: MemoryRecord;
  score?: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Generic memory query result interface
 */
export interface MemoryQueryResult<T extends MemoryRecord = MemoryRecord> {
  records: T[];
  total: number;
  offset: number;
  limit: number;
  metadata?: {
    searchScore?: number;
    executionTime?: number;
    filters?: Record<string, unknown>;
  };
}

/**
 * Memory batch operation for bulk operations
 */
export interface MemoryBatchOperation {
  type: 'insert' | 'update' | 'delete';
  records: MemoryRecord[];
  options?: {
    skipValidation?: boolean;
    returnIds?: boolean;
    onConflict?: 'ignore' | 'update' | 'error';
  };
}

/**
 * Memory transaction interface for atomic operations
 */
export interface MemoryTransaction {
  id: string;
  operations: MemoryBatchOperation[];
  status: 'pending' | 'committed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  error?: DatabaseError;
}

/**
 * Memory index configuration
 */
export interface MemoryIndexConfig {
  name: string;
  fields: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext';
  unique?: boolean;
  partial?: string; // SQL WHERE clause for partial indexes
  include?: string[]; // Additional columns to include in index
}

/**
 * Memory migration result
 */
export interface MemoryMigrationResult {
  success: boolean;
  migrationsRun: string[];
  currentVersion: string;
  previousVersion: string;
  duration: number;
  errors?: DatabaseError[];
}

/**
 * Memory provider statistics
 */
export interface MemoryProviderStats {
  totalRecords: number;
  totalAgents: number;
  oldestRecord?: Date;
  newestRecord?: Date;
  averageRecordSize?: number;
  indexStats?: {
    [indexName: string]: {
      size: number;
      usage: number;
      lastUsed?: Date;
    };
  };
}

/**
 * Memory provider configuration base
 */
export interface MemoryProviderConfig {
  type: 'sqlite' | 'postgres' | 'neon' | 'supabase';
  connectionString?: string;
  poolSize?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
  ssl?:
    | boolean
    | {
        rejectUnauthorized?: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      };
  migrations?: {
    directory?: string;
    tableName?: string;
    autoRun?: boolean;
  };
}

/**
 * Memory archival configuration
 */
export interface MemoryArchivalConfig {
  enabled: boolean;
  threshold: number; // Days before archiving
  batchSize: number;
  schedule?: string; // Cron expression
  destination?: 'cold_storage' | 'compressed' | 'external';
}

/**
 * Memory search capabilities
 */
export interface MemorySearchCapabilities {
  fullText: boolean;
  semantic: boolean;
  fuzzy: boolean;
  regex: boolean;
  temporal: boolean;
  spatial: boolean;
  aggregation: boolean;
}

/**
 * Extended search options for advanced queries
 */
export interface ExtendedSearchOptions extends SearchOptions {
  aggregations?: {
    [key: string]: {
      type: 'count' | 'sum' | 'avg' | 'min' | 'max';
      field: string;
      groupBy?: string[];
    };
  };
  facets?: string[];
  highlight?: {
    fields: string[];
    preTag?: string;
    postTag?: string;
  };
}

/**
 * Memory provider lifecycle hooks
 */
export interface MemoryProviderHooks {
  beforeStore?: (record: MemoryRecord) => Promise<MemoryRecord>;
  afterStore?: (record: MemoryRecord) => Promise<void>;
  beforeRetrieve?: (id: string) => Promise<void>;
  afterRetrieve?: (record: MemoryRecord) => Promise<MemoryRecord>;
  beforeDelete?: (id: string) => Promise<boolean>;
  afterDelete?: (id: string) => Promise<void>;
}

/**
 * Memory provider connection state
 */
export interface MemoryProviderConnectionState {
  connected: boolean;
  lastConnected?: Date;
  lastError?: DatabaseError;
  reconnectAttempts: number;
  activeConnections: number;
  idleConnections: number;
}
