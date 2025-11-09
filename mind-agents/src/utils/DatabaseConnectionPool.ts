/**
 * Database Connection Pool with Health Checks
 * Enhanced connection pooling specifically for database connections
 */

import { EventEmitter } from 'node:events';
import { ConnectionPool, Connection, ConnectionPoolOptions } from './ConnectionPool';
import { runtimeLogger } from './logger';
import { performanceMonitor } from './PerformanceMonitor';

interface DatabaseConnection extends Connection {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T>;
  transaction<T = unknown>(fn: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
  getConnectionInfo(): {
    database?: string;
    host?: string;
    port?: number;
    user?: string;
  };
}

interface DatabasePoolOptions extends ConnectionPoolOptions {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
  };
  healthCheck: {
    enabled: boolean;
    interval: number; // ms
    timeout: number; // ms
    retries: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number; // ms
    monitoringPeriod: number; // ms
  };
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class DatabaseConnectionPool extends EventEmitter {
  private pool: ConnectionPool<DatabaseConnection>;
  private options: DatabasePoolOptions;
  private healthCheckTimer?: NodeJS.Timer;
  private circuitBreaker: CircuitBreakerState;
  private connectionFactory: () => Promise<DatabaseConnection>;

  // Metrics
  private metrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    healthCheckFailures: 0,
    circuitBreakerTrips: 0,
  };

  constructor(
    connectionFactory: () => Promise<DatabaseConnection>,
    options: DatabasePoolOptions
  ) {
    super();

    this.connectionFactory = connectionFactory;
    this.options = options;

    // Initialize circuit breaker
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
    };

    // Create connection pool
    this.pool = new ConnectionPool<DatabaseConnection>(
      this.createConnection.bind(this),
      {
        minSize: options.minSize,
        maxSize: options.maxSize,
        acquireTimeoutMs: options.acquireTimeoutMs,
        createTimeoutMs: options.createTimeoutMs,
        destroyTimeoutMs: options.destroyTimeoutMs,
        idleTimeoutMs: options.idleTimeoutMs,
        reapIntervalMs: options.reapIntervalMs,
        createRetries: options.createRetries,
        validateOnBorrow: true,
        validateOnReturn: options.validateOnReturn,
        fifo: options.fifo,
      }
    );

    // Set up event forwarding
    this.pool.on('acquire', (conn) => this.emit('acquire', conn));
    this.pool.on('release', (conn) => this.emit('release', conn));
    this.pool.on('create', (conn) => this.emit('create', conn));
    this.pool.on('destroy', (conn) => this.emit('destroy', conn));

    // Start health checks if enabled
    if (options.healthCheck.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Execute a query using a pooled connection
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
    if (this.circuitBreaker.state === 'open') {
      throw new Error('Circuit breaker is open - database unavailable');
    }

    const startTime = performance.now();
    let connection: DatabaseConnection | null = null;

    try {
      connection = await this.pool.acquire();
      const result = await connection.query<T>(sql, params);

      // Record success
      this.metrics.totalQueries++;
      this.metrics.successfulQueries++;
      this.recordSuccess();

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('db.query.success', 1, 'count');
      performanceMonitor.recordMetric('db.query.duration', duration, 'ms');

      return result;
    } catch (error) {
      // Record failure
      this.metrics.totalQueries++;
      this.metrics.failedQueries++;
      this.recordFailure();

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('db.query.error', 1, 'count');
      performanceMonitor.recordMetric('db.query.duration', duration, 'ms');

      runtimeLogger.error('Database query failed:', error);
      throw error;
    } finally {
      if (connection) {
        await this.pool.release(connection);
      }
    }
  }

  /**
   * Execute a transaction using a pooled connection
   */
  async transaction<T = unknown>(
    fn: (conn: DatabaseConnection) => Promise<T>
  ): Promise<T> {
    if (this.circuitBreaker.state === 'open') {
      throw new Error('Circuit breaker is open - database unavailable');
    }

    const startTime = performance.now();
    let connection: DatabaseConnection | null = null;

    try {
      connection = await this.pool.acquire();
      const result = await connection.transaction(fn);

      // Record success
      this.metrics.totalTransactions++;
      this.metrics.successfulTransactions++;
      this.recordSuccess();

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('db.transaction.success', 1, 'count');
      performanceMonitor.recordMetric('db.transaction.duration', duration, 'ms');

      return result;
    } catch (error) {
      // Record failure
      this.metrics.totalTransactions++;
      this.metrics.failedTransactions++;
      this.recordFailure();

      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('db.transaction.error', 1, 'count');
      performanceMonitor.recordMetric('db.transaction.duration', duration, 'ms');

      runtimeLogger.error('Database transaction failed:', error);
      throw error;
    } finally {
      if (connection) {
        await this.pool.release(connection);
      }
    }
  }

  /**
   * Get a connection from the pool for manual management
   */
  async getConnection(): Promise<DatabaseConnection> {
    if (this.circuitBreaker.state === 'open') {
      throw new Error('Circuit breaker is open - database unavailable');
    }

    return await this.pool.acquire();
  }

  /**
   * Release a connection back to the pool
   */
  async releaseConnection(connection: DatabaseConnection): Promise<void> {
    await this.pool.release(connection);
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    pool: ReturnType<ConnectionPool<DatabaseConnection>['getStats']>;
    metrics: typeof this.metrics;
    circuitBreaker: CircuitBreakerState;
    database: {
      host: string;
      port: number;
      database: string;
      user: string;
    };
  } {
    return {
      pool: this.pool.getStats(),
      metrics: { ...this.metrics },
      circuitBreaker: { ...this.circuitBreaker },
      database: {
        host: this.options.database.host,
        port: this.options.database.port,
        database: this.options.database.database,
        user: this.options.database.user,
      },
    };
  }

  /**
   * Perform health check on all connections
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
  }> {
    const stats = this.pool.getStats();
    let healthyConnections = 0;
    let unhealthyConnections = 0;

    // This is a simplified health check - in a real implementation,
    // you would check each connection individually
    try {
      const testConnection = await this.pool.acquire();
      const isHealthy = await testConnection.ping();
      await this.pool.release(testConnection);

      if (isHealthy) {
        healthyConnections = stats.size;
      } else {
        unhealthyConnections = stats.size;
      }
    } catch (error) {
      unhealthyConnections = stats.size;
      this.metrics.healthCheckFailures++;
      runtimeLogger.error('Health check failed:', error);
    }

    const result = {
      healthy: healthyConnections > 0,
      totalConnections: stats.size,
      healthyConnections,
      unhealthyConnections,
    };

    performanceMonitor.recordMetric('db.health_check', result.healthy ? 1 : 0, 'boolean');

    return result;
  }

  /**
   * Drain the pool (prepare for shutdown)
   */
  async drain(): Promise<void> {
    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // Drain the connection pool
    await this.pool.drain();

    this.emit('drained');
  }

  /**
   * Clear idle connections
   */
  async clear(): Promise<void> {
    await this.pool.clear();
  }

  // Private helper methods

  private async createConnection(): Promise<DatabaseConnection> {
    try {
      const connection = await this.connectionFactory();
      
      // Validate connection
      const isHealthy = await connection.isHealthy();
      if (!isHealthy) {
        throw new Error('Connection failed health check');
      }

      return connection;
    } catch (error) {
      runtimeLogger.error('Failed to create database connection:', error);
      throw error;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthResult = await this.healthCheck();
        
        if (!healthResult.healthy) {
          runtimeLogger.warn('Database health check failed', healthResult);
          this.emit('unhealthy', healthResult);
        } else {
          this.emit('healthy', healthResult);
        }
      } catch (error) {
        runtimeLogger.error('Health check error:', error);
        this.emit('healthCheckError', error);
      }
    }, this.options.healthCheck.interval);
  }

  private recordSuccess(): void {
    if (this.options.circuitBreaker.enabled) {
      if (this.circuitBreaker.state === 'half-open') {
        // Reset circuit breaker on success
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
        this.emit('circuitBreakerClosed');
      }
    }
  }

  private recordFailure(): void {
    if (!this.options.circuitBreaker.enabled) {
      return;
    }

    const now = Date.now();
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = now;

    // Check if we should open the circuit breaker
    if (
      this.circuitBreaker.state === 'closed' &&
      this.circuitBreaker.failures >= this.options.circuitBreaker.failureThreshold
    ) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextAttemptTime = now + this.options.circuitBreaker.resetTimeout;
      this.metrics.circuitBreakerTrips++;

      runtimeLogger.warn('Circuit breaker opened due to failures', {
        failures: this.circuitBreaker.failures,
        threshold: this.options.circuitBreaker.failureThreshold,
      });

      this.emit('circuitBreakerOpened', {
        failures: this.circuitBreaker.failures,
        nextAttemptTime: this.circuitBreaker.nextAttemptTime,
      });

      // Schedule attempt to half-open
      setTimeout(() => {
        if (this.circuitBreaker.state === 'open') {
          this.circuitBreaker.state = 'half-open';
          this.emit('circuitBreakerHalfOpen');
        }
      }, this.options.circuitBreaker.resetTimeout);
    }
  }
}

/**
 * Create a PostgreSQL connection pool
 */
export function createPostgreSQLPool(options: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolOptions?: Partial<ConnectionPoolOptions>;
}): DatabaseConnectionPool {
  const connectionFactory = async (): Promise<DatabaseConnection> => {
    // This would create an actual PostgreSQL connection
    // For now, return a mock connection
    return {
      id: `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      async connect() {
        // Connect to PostgreSQL
      },
      async disconnect() {
        // Disconnect from PostgreSQL
      },
      async isHealthy() {
        // Check if connection is healthy
        return true;
      },
      async execute(operation) {
        return await operation();
      },
      async query(sql, params) {
        // Execute SQL query
        return {} as any;
      },
      async transaction(fn) {
        // Execute transaction
        return await fn(this);
      },
      async ping() {
        // Ping database
        return true;
      },
      getConnectionInfo() {
        return {
          database: options.database,
          host: options.host,
          port: options.port,
          user: options.user,
        };
      },
    };
  };

  const poolOptions: DatabasePoolOptions = {
    minSize: options.poolOptions?.minSize ?? 2,
    maxSize: options.poolOptions?.maxSize ?? 10,
    acquireTimeoutMs: options.poolOptions?.acquireTimeoutMs ?? 5000,
    createTimeoutMs: options.poolOptions?.createTimeoutMs ?? 5000,
    destroyTimeoutMs: options.poolOptions?.destroyTimeoutMs ?? 5000,
    idleTimeoutMs: options.poolOptions?.idleTimeoutMs ?? 30000,
    reapIntervalMs: options.poolOptions?.reapIntervalMs ?? 10000,
    createRetries: options.poolOptions?.createRetries ?? 3,
    validateOnBorrow: options.poolOptions?.validateOnBorrow ?? true,
    validateOnReturn: options.poolOptions?.validateOnReturn ?? false,
    fifo: options.poolOptions?.fifo ?? true,
    database: {
      host: options.host,
      port: options.port,
      database: options.database,
      user: options.user,
      password: options.password,
      ssl: options.ssl,
    },
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000, // 5 seconds
      retries: 3,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
    },
  };

  return new DatabaseConnectionPool(connectionFactory, poolOptions);
}

/**
 * Create a SQLite connection pool
 */
export function createSQLitePool(options: {
  filename: string;
  poolOptions?: Partial<ConnectionPoolOptions>;
}): DatabaseConnectionPool {
  const connectionFactory = async (): Promise<DatabaseConnection> => {
    // This would create an actual SQLite connection
    // For now, return a mock connection
    return {
      id: `sqlite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      async connect() {
        // Connect to SQLite
      },
      async disconnect() {
        // Disconnect from SQLite
      },
      async isHealthy() {
        // Check if connection is healthy
        return true;
      },
      async execute(operation) {
        return await operation();
      },
      async query(sql, params) {
        // Execute SQL query
        return {} as any;
      },
      async transaction(fn) {
        // Execute transaction
        return await fn(this);
      },
      async ping() {
        // Ping database
        return true;
      },
      getConnectionInfo() {
        return {
          database: options.filename,
        };
      },
    };
  };

  const poolOptions: DatabasePoolOptions = {
    minSize: options.poolOptions?.minSize ?? 1,
    maxSize: options.poolOptions?.maxSize ?? 5,
    acquireTimeoutMs: options.poolOptions?.acquireTimeoutMs ?? 3000,
    createTimeoutMs: options.poolOptions?.createTimeoutMs ?? 3000,
    destroyTimeoutMs: options.poolOptions?.destroyTimeoutMs ?? 3000,
    idleTimeoutMs: options.poolOptions?.idleTimeoutMs ?? 60000,
    reapIntervalMs: options.poolOptions?.reapIntervalMs ?? 30000,
    createRetries: options.poolOptions?.createRetries ?? 2,
    validateOnBorrow: options.poolOptions?.validateOnBorrow ?? true,
    validateOnReturn: options.poolOptions?.validateOnReturn ?? false,
    fifo: options.poolOptions?.fifo ?? true,
    database: {
      host: 'localhost',
      port: 0,
      database: options.filename,
      user: '',
      password: '',
    },
    healthCheck: {
      enabled: true,
      interval: 60000, // 1 minute
      timeout: 3000, // 3 seconds
      retries: 2,
    },
    circuitBreaker: {
      enabled: false, // Usually not needed for SQLite
      failureThreshold: 10,
      resetTimeout: 30000,
      monitoringPeriod: 5000,
    },
  };

  return new DatabaseConnectionPool(connectionFactory, poolOptions);
}