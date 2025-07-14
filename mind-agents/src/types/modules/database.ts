/**
 * Database Type Definitions
 * Provides comprehensive type safety for database operations
 */

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  id: string;
  host: string;
  port: number;
  database: string;
  user: string;
  connected: boolean;
  ssl?: boolean;
  pooled?: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  beginTransaction(): Promise<TransactionScope>;
  isHealthy(): Promise<boolean>;
}

/**
 * Generic query result interface
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: Array<{
    name: string;
    dataType: string;
    nullable: boolean;
  }>;
  command?: string;
  duration?: number;
}

/**
 * Transaction scope interface
 */
export interface TransactionScope {
  id: string;
  connection: DatabaseConnection;
  inTransaction: boolean;
  savepoints: string[];

  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  savepoint(name: string): Promise<void>;
  releaseSavepoint(name: string): Promise<void>;
  rollbackToSavepoint(name: string): Promise<void>;
}

/**
 * Connection pool interface
 */
export interface ConnectionPool {
  name: string;
  size: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;

  acquire(): Promise<DatabaseConnection>;
  release(connection: DatabaseConnection): Promise<void>;
  drain(): Promise<void>;
  getStats(): PoolStatistics;
}

/**
 * Pool statistics
 */
export interface PoolStatistics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalRequests: number;
  totalErrors: number;
  averageWaitTime: number;
  peakConnections: number;
  lastActivity: Date;
}

/**
 * Database error class with specific error types
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    isRetryable: boolean = false,
    originalError?: Error,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.severity = severity;
    this.isRetryable = isRetryable;
    this.originalError = originalError;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }

  /**
   * Common database error codes
   */
  static readonly ErrorCodes = {
    CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
    CONNECTION_LOST: 'DB_CONNECTION_LOST',
    QUERY_FAILED: 'DB_QUERY_FAILED',
    TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
    TIMEOUT: 'DB_TIMEOUT',
    POOL_EXHAUSTED: 'DB_POOL_EXHAUSTED',
    INVALID_QUERY: 'DB_INVALID_QUERY',
    CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
    DEADLOCK: 'DB_DEADLOCK',
    DATA_INTEGRITY: 'DB_DATA_INTEGRITY',
    MIGRATION_FAILED: 'DB_MIGRATION_FAILED',
    UNKNOWN: 'DB_UNKNOWN_ERROR',
  } as const;

  /**
   * Factory methods for common database errors
   */
  static connectionFailed(
    message: string,
    originalError?: Error
  ): DatabaseError {
    return new DatabaseError(
      message,
      DatabaseError.ErrorCodes.CONNECTION_FAILED,
      'critical',
      true,
      originalError
    );
  }

  static queryFailed(
    message: string,
    query?: string,
    originalError?: Error
  ): DatabaseError {
    return new DatabaseError(
      message,
      DatabaseError.ErrorCodes.QUERY_FAILED,
      'high',
      false,
      originalError,
      { query }
    );
  }

  static timeout(operation: string, timeout: number): DatabaseError {
    return new DatabaseError(
      `Database operation '${operation}' timed out after ${timeout}ms`,
      DatabaseError.ErrorCodes.TIMEOUT,
      'high',
      true,
      undefined,
      { operation, timeout }
    );
  }

  static poolExhausted(waitTime: number): DatabaseError {
    return new DatabaseError(
      `Connection pool exhausted after waiting ${waitTime}ms`,
      DatabaseError.ErrorCodes.POOL_EXHAUSTED,
      'high',
      true,
      undefined,
      { waitTime }
    );
  }
}

/**
 * Database migration interface
 */
export interface DatabaseMigration {
  id: string;
  version: string;
  name: string;
  up: string | ((connection: DatabaseConnection) => Promise<void>);
  down: string | ((connection: DatabaseConnection) => Promise<void>);
  timestamp: Date;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql' | 'neon' | 'supabase';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?:
    | boolean
    | {
        rejectUnauthorized?: boolean;
        ca?: string;
        cert?: string;
        key?: string;
      };
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
}

/**
 * Prepared statement interface
 */
export interface PreparedStatement {
  name: string;
  text: string;
  paramTypes?: string[];

  execute<T = any>(params?: any[]): Promise<QueryResult<T>>;
  deallocate(): Promise<void>;
}

/**
 * Database metadata
 */
export interface DatabaseMetadata {
  version: string;
  tables: TableMetadata[];
  indexes: IndexMetadata[];
  constraints: ConstraintMetadata[];
}

/**
 * Table metadata
 */
export interface TableMetadata {
  name: string;
  schema?: string;
  columns: ColumnMetadata[];
  primaryKey?: string[];
  rowCount?: number;
  sizeBytes?: number;
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

/**
 * Index metadata
 */
export interface IndexMetadata {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: string;
  sizeBytes?: number;
}

/**
 * Constraint metadata
 */
export interface ConstraintMetadata {
  name: string;
  table: string;
  type: 'primary' | 'foreign' | 'unique' | 'check';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  definition?: string;
}
