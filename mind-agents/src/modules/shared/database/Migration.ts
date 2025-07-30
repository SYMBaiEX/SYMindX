/**
 * Database Migration System for SYMindX
 *
 * Provides unified migration patterns for all database types
 */

import { ConnectionPool, DatabaseType } from './DatabaseConnection';
import { runtimeLogger } from '../../../utils/logger';

export interface Migration {
  id: string;
  name: string;
  up: string | ((db: ConnectionPool) => Promise<void>);
  down: string | ((db: ConnectionPool) => Promise<void>);
  timestamp: number;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
  success: boolean;
  error?: string;
}

export class MigrationRunner {
  private connection: ConnectionPool;
  private tableName = 'schema_migrations';

  constructor(connection: ConnectionPool) {
    this.connection = connection;
  }

  /**
   * Initialize migration table
   */
  async initialize(): Promise<void> {
    const sql = this.getMigrationTableSql();
    await this.connection.execute(sql);
    runtimeLogger.info('Migration table initialized');
  }

  /**
   * Get migration table creation SQL based on database type
   */
  private getMigrationTableSql(): string {
    switch (this.connection.type) {
      case DatabaseType.SQLITE:
        return `
          CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            executed_at INTEGER NOT NULL,
            success INTEGER NOT NULL DEFAULT 1,
            error TEXT
          )
        `;

      case DatabaseType.POSTGRES:
      case DatabaseType.NEON:
      case DatabaseType.SUPABASE:
        return `
          CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            success BOOLEAN NOT NULL DEFAULT TRUE,
            error TEXT
          )
        `;

      default:
        throw new Error(`Unsupported database type: ${this.connection.type}`);
    }
  }

  /**
   * Run pending migrations
   */
  async run(migrations: Migration[]): Promise<void> {
    await this.initialize();

    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map((m) => m.id));

    const pending = migrations
      .filter((m) => !executedIds.has(m.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (pending.length === 0) {
      runtimeLogger.info('No pending migrations');
      return;
    }

    runtimeLogger.info(`Running ${pending.length} pending migrations`);

    for (const migration of pending) {
      await this.runMigration(migration);
    }
  }

  /**
   * Run a single migration
   */
  private async runMigration(migration: Migration): Promise<void> {
    runtimeLogger.info(`Running migration: ${migration.name}`);

    try {
      await this.connection.transaction(async (client) => {
        if (typeof migration.up === 'string') {
          await client.query(migration.up);
        } else {
          await migration.up(this.connection);
        }

        await this.recordMigration(migration, true);
      });

      runtimeLogger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      runtimeLogger.error(`Migration failed: ${migration.name}`, error);

      await this.recordMigration(migration, false, errorMessage);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollback(migrations: Migration[], steps = 1): Promise<void> {
    const executed = await this.getExecutedMigrations();
    const toRollback = executed
      .filter((m) => m.success)
      .sort((a, b) => b.executed_at.getTime() - a.executed_at.getTime())
      .slice(0, steps);

    if (toRollback.length === 0) {
      runtimeLogger.info('No migrations to rollback');
      return;
    }

    runtimeLogger.info(`Rolling back ${toRollback.length} migrations`);

    for (const record of toRollback) {
      const migration = migrations.find((m) => m.id === record.id);
      if (!migration) {
        runtimeLogger.warn(`Migration not found for rollback: ${record.id}`);
        continue;
      }

      await this.rollbackMigration(migration);
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    runtimeLogger.info(`Rolling back migration: ${migration.name}`);

    try {
      await this.connection.transaction(async (client) => {
        if (typeof migration.down === 'string') {
          await client.query(migration.down);
        } else {
          await migration.down(this.connection);
        }

        await this.removeMigrationRecord(migration.id);
      });

      runtimeLogger.info(`Migration rolled back: ${migration.name}`);
    } catch (error) {
      runtimeLogger.error(`Rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY executed_at ASC`;
    const rows = await this.connection.query(sql);

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      executed_at: new Date(row.executed_at),
      success: Boolean(row.success),
      error: row.error,
    }));
  }

  /**
   * Record a migration execution
   */
  private async recordMigration(
    migration: Migration,
    success: boolean,
    error?: string
  ): Promise<void> {
    const sql = `
      INSERT INTO ${this.tableName} (id, name, executed_at, success, error)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const params = [
      migration.id,
      migration.name,
      this.connection.type === DatabaseType.SQLITE ? Date.now() : new Date(),
      success ? 1 : 0,
      error || null,
    ];

    await this.connection.execute(sql, params);
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(id: string): Promise<void> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await this.connection.execute(sql, [id]);
  }

  /**
   * Check if a migration has been executed
   */
  async isExecuted(id: string): Promise<boolean> {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = $1 AND success = 1`;
    const rows = await this.connection.query(sql, [id]);
    return rows[0]?.count > 0;
  }

  /**
   * Get migration status
   */
  async getStatus(migrations: Migration[]): Promise<{
    executed: number;
    pending: number;
    failed: number;
    total: number;
  }> {
    const executed = await this.getExecutedMigrations();
    const executedIds = new Set(executed.map((m) => m.id));

    const pending = migrations.filter((m) => !executedIds.has(m.id)).length;
    const failed = executed.filter((m) => !m.success).length;
    const successful = executed.filter((m) => m.success).length;

    return {
      executed: successful,
      pending,
      failed,
      total: migrations.length,
    };
  }
}

/**
 * Create a new migration
 */
export function createMigration(
  name: string,
  up: string | ((db: ConnectionPool) => Promise<void>),
  down: string | ((db: ConnectionPool) => Promise<void>)
): Migration {
  const timestamp = Date.now();
  const id = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;

  return {
    id,
    name,
    up,
    down,
    timestamp,
  };
}

/**
 * Load migrations from a directory
 */
export async function loadMigrations(directory: string): Promise<Migration[]> {
  // This would be implemented to scan a directory for migration files
  // For now, return empty array
  return [];
}
