/**
 * Optimized Database Connection Pool
 * High-performance connection pooling with health checks and monitoring
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { Database } from 'better-sqlite3';
import { ConnectionPool, Connection } from '../../../utils/ConnectionPool';
import { performanceMonitor } from '../../../utils/PerformanceMonitor';
import { runtimeLogger } from '../../../utils/logger';

/**
 * PostgreSQL connection wrapper
 */
class PostgresConnection implements Connection {
  id: string;
  private client?: PoolClient;
  private pool: Pool;
  private isConnected = false;

  constructor(pool: Pool) {
    this.id = `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.pool = pool;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      this.client = await this.pool.connect();
      this.isConnected = true;
      performanceMonitor.recordMetric('db.postgres.connection.created', 1);
    } catch (error) {
      performanceMonitor.recordMetric('db.postgres.connection.error', 1);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    
    try {
      this.client.release();
      this.isConnected = false;
      performanceMonitor.recordMetric('db.postgres.connection.closed', 1);
    } catch (error) {
      performanceMonitor.recordMetric('db.postgres.connection.error', 1);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    
    try {
      const result = await this.client.query('SELECT 1');
      return result.rows.length === 1;
    } catch (error) {
      return false;
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.client) {
      throw new Error('Connection not established');
    }
    
    const timer = performanceMonitor.createTimer('db.postgres.query');
    
    try {
      const result = await operation();
      timer.end();
      performanceMonitor.recordMetric('db.postgres.query.success', 1);
      return result;
    } catch (error) {
      timer.end();
      performanceMonitor.recordMetric('db.postgres.query.error', 1);
      throw error;
    }
  }

  getClient(): PoolClient {
    if (!this.client) {
      throw new Error('Connection not established');
    }
    return this.client;
  }
}

/**
 * SQLite connection wrapper
 */
class SQLiteConnection implements Connection {
  id: string;
  private db?: Database;
  private dbPath: string;
  private isConnected = false;

  constructor(dbPath: string) {
    this.id = `sqlite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      const Database = (await import('better-sqlite3')).default;
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
      });
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = memory');
      
      this.isConnected = true;
      performanceMonitor.recordMetric('db.sqlite.connection.created', 1);
    } catch (error) {
      performanceMonitor.recordMetric('db.sqlite.connection.error', 1);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) return;
    
    try {
      this.db.close();
      this.isConnected = false;
      performanceMonitor.recordMetric('db.sqlite.connection.closed', 1);
    } catch (error) {
      performanceMonitor.recordMetric('db.sqlite.connection.error', 1);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.isConnected || !this.db) return false;
    
    try {
      const result = this.db.prepare('SELECT 1').get();
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isConnected || !this.db) {
      throw new Error('Connection not established');
    }
    
    const timer = performanceMonitor.createTimer('db.sqlite.query');
    
    try {
      const result = await operation();
      timer.end();
      performanceMonitor.recordMetric('db.sqlite.query.success', 1);
      return result;
    } catch (error) {
      timer.end();
      performanceMonitor.recordMetric('db.sqlite.query.error', 1);
      throw error;
    }
  }

  getDB(): Database {
    if (!this.db) {
      throw new Error('Connection not established');
    }
    return this.db;
  }
}

/**
 * Optimized PostgreSQL pool manager
 */
export class OptimizedPostgresPool {
  private connectionPool: ConnectionPool<PostgresConnection>;
  private pgPool: Pool;

  constructor(config: PoolConfig & {
    minConnections?: number;
    maxConnections?: number;
  }) {
    // Create underlying PostgreSQL pool
    this.pgPool = new Pool({
      ...config,
      max: config.maxConnections || 20,
      min: config.minConnections || 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      application_name: 'symindx-optimized-pool'
    });

    // Create managed connection pool
    this.connectionPool = new ConnectionPool(
      () => Promise.resolve(new PostgresConnection(this.pgPool)),
      {
        minSize: config.minConnections || 2,
        maxSize: config.maxConnections || 20,
        acquireTimeoutMs: 5000,
        idleTimeoutMs: 30000,
        validateOnBorrow: true
      }
    );

    // Set up monitoring
    this.setupMonitoring();
  }

  async getConnection(): Promise<PostgresConnection> {
    return this.connectionPool.acquire();
  }

  async releaseConnection(connection: PostgresConnection): Promise<void> {
    return this.connectionPool.release(connection);
  }

  async withConnection<T>(
    operation: (connection: PostgresConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    try {
      return await operation(connection);
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.withConnection(async (connection) => {
      return connection.execute(async () => {
        const client = connection.getClient();
        return client.query(text, params);
      });
    });
  }

  getStats() {
    return this.connectionPool.getStats();
  }

  async shutdown(): Promise<void> {
    await this.connectionPool.drain();
    await this.pgPool.end();
  }

  private setupMonitoring(): void {
    // Monitor pool stats every 30 seconds
    const monitorStats = () => {
      const stats = this.getStats();
      
      performanceMonitor.recordMetric('db.postgres.pool.size', stats.size);
      performanceMonitor.recordMetric('db.postgres.pool.available', stats.available);
      performanceMonitor.recordMetric('db.postgres.pool.in_use', stats.inUse);
      performanceMonitor.recordMetric('db.postgres.pool.wait_queue', stats.waitQueue);
      
      setTimeout(monitorStats, 30000);
    };
    
    setTimeout(monitorStats, 1000);

    // Set up performance thresholds
    performanceMonitor.setThreshold('db.postgres.pool.wait_queue', 5, 10);
    performanceMonitor.setThreshold('db.postgres.query.duration', 100, 500); // ms
  }
}

/**
 * Optimized SQLite pool manager
 */
export class OptimizedSQLitePool {
  private connectionPool: ConnectionPool<SQLiteConnection>;
  private dbPath: string;

  constructor(dbPath: string, options?: {
    maxConnections?: number;
  }) {
    this.dbPath = dbPath;
    
    // SQLite doesn't benefit from many concurrent connections
    const maxConnections = Math.min(options?.maxConnections || 5, 5);

    this.connectionPool = new ConnectionPool(
      () => Promise.resolve(new SQLiteConnection(this.dbPath)),
      {
        minSize: 1,
        maxSize: maxConnections,
        acquireTimeoutMs: 5000,
        idleTimeoutMs: 60000,
        validateOnBorrow: true
      }
    );

    this.setupMonitoring();
  }

  async getConnection(): Promise<SQLiteConnection> {
    return this.connectionPool.acquire();
  }

  async releaseConnection(connection: SQLiteConnection): Promise<void> {
    return this.connectionPool.release(connection);
  }

  async withConnection<T>(
    operation: (connection: SQLiteConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    try {
      return await operation(connection);
    } finally {
      await this.releaseConnection(connection);
    }
  }

  async run(sql: string, params?: any[]): Promise<any> {
    return this.withConnection(async (connection) => {
      return connection.execute(async () => {
        const db = connection.getDB();
        return db.prepare(sql).run(params);
      });
    });
  }

  async get(sql: string, params?: any[]): Promise<any> {
    return this.withConnection(async (connection) => {
      return connection.execute(async () => {
        const db = connection.getDB();
        return db.prepare(sql).get(params);
      });
    });
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    return this.withConnection(async (connection) => {
      return connection.execute(async () => {
        const db = connection.getDB();
        return db.prepare(sql).all(params);
      });
    });
  }

  getStats() {
    return this.connectionPool.getStats();
  }

  async shutdown(): Promise<void> {
    await this.connectionPool.drain();
  }

  private setupMonitoring(): void {
    const monitorStats = () => {
      const stats = this.getStats();
      
      performanceMonitor.recordMetric('db.sqlite.pool.size', stats.size);
      performanceMonitor.recordMetric('db.sqlite.pool.available', stats.available);
      performanceMonitor.recordMetric('db.sqlite.pool.in_use', stats.inUse);
      performanceMonitor.recordMetric('db.sqlite.pool.wait_queue', stats.waitQueue);
      
      setTimeout(monitorStats, 30000);
    };
    
    setTimeout(monitorStats, 1000);

    // Set up performance thresholds
    performanceMonitor.setThreshold('db.sqlite.pool.wait_queue', 3, 5);
    performanceMonitor.setThreshold('db.sqlite.query.duration', 50, 200); // ms
  }
}

/**
 * Factory function to create optimized database pools
 */
export function createOptimizedDatabasePool(
  type: 'postgres' | 'sqlite',
  config: any
): OptimizedPostgresPool | OptimizedSQLitePool {
  switch (type) {
    case 'postgres':
      return new OptimizedPostgresPool(config);
    case 'sqlite':
      return new OptimizedSQLitePool(config.dbPath || config.path, config);
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}