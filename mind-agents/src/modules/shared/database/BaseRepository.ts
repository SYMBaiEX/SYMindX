/**
 * Base Repository for SYMindX
 *
 * Provides common CRUD operations and patterns for all database implementations
 */

import { buildObject } from '../../../utils/type-helpers';

export interface RepositoryConfig {
  tableName: string;
  idPrefix?: string;
  enableSoftDelete?: boolean;
  enableTimestamps?: boolean;
  enableArchival?: boolean;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
}

export interface BatchOperation<T> {
  operation: 'insert' | 'update' | 'delete';
  data: T;
}

export abstract class BaseRepository<T extends { id: string }> {
  protected config: RepositoryConfig;

  constructor(config: RepositoryConfig) {
    this.config = {
      enableSoftDelete: true,
      enableTimestamps: true,
      enableArchival: false,
      idPrefix: 'rec',
      ...config,
    };
  }

  /**
   * Generate a unique ID with optional prefix
   */
  protected generateId(): string {
    const prefix = this.config.idPrefix || 'rec';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Create a single record
   */
  abstract create(data: Omit<T, 'id'>): Promise<T>;

  /**
   * Find a record by ID
   */
  abstract findById(id: string): Promise<T | null>;

  /**
   * Find records with query options
   */
  abstract find(query: Partial<T>, options?: QueryOptions): Promise<T[]>;

  /**
   * Update a record by ID
   */
  abstract update(id: string, updates: Partial<T>): Promise<void>;

  /**
   * Delete a record by ID (soft or hard delete based on config)
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Batch operations for performance
   */
  abstract batch(operations: BatchOperation<T>[]): Promise<void>;

  /**
   * Count records matching query
   */
  abstract count(query: Partial<T>): Promise<number>;

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id);
    return record !== null;
  }

  /**
   * Find one record matching query
   */
  async findOne(query: Partial<T>, options?: QueryOptions): Promise<T | null> {
    const results = await this.find(query, { ...options, limit: 1 });
    return results[0] || null;
  }

  /**
   * Archive old records based on retention policy
   */
  async archive(retentionDays: number): Promise<number> {
    if (!this.config.enableArchival) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return this.archiveBeforeDate(cutoffDate);
  }

  /**
   * Archive records before a specific date
   */
  protected abstract archiveBeforeDate(date: Date): Promise<number>;

  /**
   * Apply common query transformations
   */
  protected applyQueryOptions(
    baseQuery: string,
    options?: QueryOptions
  ): string {
    let query = baseQuery;

    if (!options?.includeDeleted && this.config.enableSoftDelete) {
      query += ' AND deleted_at IS NULL';
    }

    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }

    return query;
  }

  /**
   * Build pagination metadata
   */
  protected async buildPaginationMetadata(
    query: Partial<T>,
    options?: QueryOptions
  ): Promise<{
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const total = await this.count(query);
    const pageSize = options?.limit || 10;
    const page = Math.floor((options?.offset || 0) / pageSize) + 1;
    const totalPages = Math.ceil(total / pageSize);

    return { total, page, pageSize, totalPages };
  }

  /**
   * Soft delete implementation
   */
  protected applySoftDelete(record: any): any {
    if (!this.config.enableSoftDelete) {
      return record;
    }

    return {
      ...record,
      deleted_at: new Date(),
      deleted_by: 'system', // Can be overridden by subclasses
    };
  }

  /**
   * Apply timestamps to record
   */
  protected applyTimestamps(record: any, isUpdate = false): any {
    if (!this.config.enableTimestamps) {
      return record;
    }

    const now = new Date();

    if (isUpdate) {
      return {
        ...record,
        updated_at: now,
      };
    }

    return {
      ...record,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Validate record before save
   */
  protected abstract validate(record: Partial<T>): Promise<void>;

  /**
   * Transform record for storage
   */
  protected transformForStorage(record: Partial<T>): any {
    const transformed = { ...record };

    // Convert dates to ISO strings
    Object.keys(transformed).forEach((key) => {
      const value = (transformed as any)[key];
      if (value instanceof Date) {
        (transformed as any)[key] = value.toISOString();
      }
    });

    // Convert objects to JSON strings
    Object.keys(transformed).forEach((key) => {
      const value = (transformed as any)[key];
      if (
        typeof value === 'object' &&
        value !== null &&
        !(value instanceof Date)
      ) {
        (transformed as any)[key] = JSON.stringify(value);
      }
    });

    return transformed;
  }

  /**
   * Transform record from storage
   */
  protected transformFromStorage(row: any): T {
    const transformed = { ...row };

    // Parse JSON fields
    Object.keys(transformed).forEach((key) => {
      const value = transformed[key];
      if (
        typeof value === 'string' &&
        (value.startsWith('{') || value.startsWith('['))
      ) {
        try {
          transformed[key] = JSON.parse(value);
        } catch {
          // Keep as string if parsing fails
        }
      }
    });

    // Convert date strings to Date objects
    const dateFields = ['created_at', 'updated_at', 'deleted_at', 'timestamp'];
    dateFields.forEach((field) => {
      if (transformed[field]) {
        transformed[field] = new Date(transformed[field]);
      }
    });

    return transformed as T;
  }

  /**
   * Health check for repository
   */
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      // Try a simple query
      await this.count({} as Partial<T>);
      return {
        status: 'healthy',
        details: {
          table: this.config.tableName,
          softDelete: this.config.enableSoftDelete,
          timestamps: this.config.enableTimestamps,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
