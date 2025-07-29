/**
 * Database Connection Management for SYMindX
 * 
 * Provides unified connection management for all database types
 */

import { Pool as PgPool, PoolConfig as PgPoolConfig } from 'pg';
import { Database as SqliteDatabase } from 'bun:sqlite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { runtimeLogger } from '../../../utils/logger';

export enum DatabaseType {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
  NEON = 'neon',
  SUPABASE = 'supabase'
}

export interface ConnectionConfig {
  type: DatabaseType;
  connectionString?: string;
  database?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  
  // SQLite specific
  dbPath?: string;
  
  // Supabase specific
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface ConnectionPool {
  type: DatabaseType;
  query(sql: string, params?: any[]): Promise<any>;
  execute(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export class DatabaseConnection {
  private static connections = new Map<string, ConnectionPool>();
  
  /**
   * Get or create a database connection
   */
  static async getConnection(config: ConnectionConfig): Promise<ConnectionPool> {
    const key = this.getConnectionKey(config);
    
    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }
    
    const connection = await this.createConnection(config);
    this.connections.set(key, connection);
    return connection;
  }
  
  /**
   * Create a new database connection
   */
  private static async createConnection(config: ConnectionConfig): Promise<ConnectionPool> {
    switch (config.type) {
      case DatabaseType.SQLITE:
        return this.createSqliteConnection(config);
      
      case DatabaseType.POSTGRES:
      case DatabaseType.NEON:
        return this.createPostgresConnection(config);
      
      case DatabaseType.SUPABASE:
        return this.createSupabaseConnection(config);
      
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
  
  /**
   * Create SQLite connection
   */
  private static createSqliteConnection(config: ConnectionConfig): ConnectionPool {
    if (!config.dbPath) {
      throw new Error('SQLite requires dbPath configuration');
    }
    
    const db = new SqliteDatabase(config.dbPath);
    
    // Enable foreign keys and WAL mode
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
    
    return {
      type: DatabaseType.SQLITE,
      
      async query(sql: string, params?: any[]): Promise<any> {
        const stmt = db.prepare(sql);
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return stmt.all(...(params || []));
        } else {
          return stmt.run(...(params || []));
        }
      },
      
      async execute(sql: string, params?: any[]): Promise<any> {
        const stmt = db.prepare(sql);
        return stmt.run(...(params || []));
      },
      
      async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        db.exec('BEGIN');
        try {
          const result = await callback(db);
          db.exec('COMMIT');
          return result;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
      
      async close(): Promise<void> {
        db.close();
      },
      
      async healthCheck(): Promise<boolean> {
        try {
          db.prepare('SELECT 1').get();
          return true;
        } catch {
          return false;
        }
      }
    };
  }
  
  /**
   * Create PostgreSQL/Neon connection
   */
  private static createPostgresConnection(config: ConnectionConfig): ConnectionPool {
    const poolConfig: PgPoolConfig = {
      connectionString: config.connectionString,
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    };
    
    const pool = new PgPool(poolConfig);
    
    return {
      type: config.type as DatabaseType.POSTGRES | DatabaseType.NEON,
      
      async query(sql: string, params?: any[]): Promise<any> {
        const result = await pool.query(sql, params);
        return result.rows;
      },
      
      async execute(sql: string, params?: any[]): Promise<any> {
        const result = await pool.query(sql, params);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows[0]?.id
        };
      },
      
      async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback(client);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      },
      
      async close(): Promise<void> {
        await pool.end();
      },
      
      async healthCheck(): Promise<boolean> {
        try {
          await pool.query('SELECT 1');
          return true;
        } catch {
          return false;
        }
      }
    };
  }
  
  /**
   * Create Supabase connection
   */
  private static createSupabaseConnection(config: ConnectionConfig): ConnectionPool {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase requires supabaseUrl and supabaseKey configuration');
    }
    
    const supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    return {
      type: DatabaseType.SUPABASE,
      
      async query(sql: string, params?: any[]): Promise<any> {
        const { data, error } = await supabase.rpc('exec_sql', {
          query: sql,
          params: params || []
        });
        
        if (error) throw error;
        return data;
      },
      
      async execute(sql: string, params?: any[]): Promise<any> {
        return this.query(sql, params);
      },
      
      async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
        // Supabase doesn't support client-side transactions
        // Operations are atomic at the statement level
        runtimeLogger.warn('Supabase does not support client-side transactions');
        return callback(supabase);
      },
      
      async close(): Promise<void> {
        // Supabase client doesn't need explicit closing
      },
      
      async healthCheck(): Promise<boolean> {
        try {
          const { error } = await supabase.from('_health_check').select('1').limit(1);
          return !error;
        } catch {
          return false;
        }
      }
    };
  }
  
  /**
   * Generate a unique key for connection caching
   */
  private static getConnectionKey(config: ConnectionConfig): string {
    if (config.connectionString) {
      return `${config.type}:${config.connectionString}`;
    }
    
    if (config.type === DatabaseType.SQLITE) {
      return `${config.type}:${config.dbPath}`;
    }
    
    if (config.type === DatabaseType.SUPABASE) {
      return `${config.type}:${config.supabaseUrl}`;
    }
    
    return `${config.type}:${config.host}:${config.port}:${config.database}`;
  }
  
  /**
   * Close all connections
   */
  static async closeAll(): Promise<void> {
    const promises = Array.from(this.connections.values()).map(conn => conn.close());
    await Promise.all(promises);
    this.connections.clear();
  }
  
  /**
   * Health check all connections
   */
  static async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [key, conn] of this.connections) {
      results.set(key, await conn.healthCheck());
    }
    
    return results;
  }
}