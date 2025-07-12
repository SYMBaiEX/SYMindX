/**
 * Chat Database Migration System for SYMindX
 *
 * Handles database schema migrations for the chat system
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { Database as DatabaseType } from 'bun:sqlite';
import { Database } from 'bun:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Migration {
  version: string;
  description: string;
  up: string;
  down?: string;
  checksum?: string;
}

export interface MigrationRecord {
  id: number;
  version: string;
  description: string;
  applied_at: number;
  checksum: string;
}

export class ChatMigrationManager {
  private db: DatabaseType;
  private migrations: Migration[] = [];

  constructor(dbPath: string) {
    this.db = new Database(dbPath);

    // Enable foreign keys
    this.db.exec('PRAGMA foreign_keys = ON');

    // Initialize migration tracking table
    this.initializeMigrationTable();

    // Load built-in migrations
    this.loadBuiltInMigrations();
  }

  private initializeMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        description TEXT,
        applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        checksum TEXT
      )
    `);
  }

  private loadBuiltInMigrations(): void {
    // Load single complete schema file for reliability
    const completePath = join(__dirname, 'chat-schema-complete.sql');

    if (existsSync(completePath)) {
      const completeContent = readFileSync(completePath, 'utf8');
      this.migrations.push({
        version: '1.0.0',
        description: 'Complete SYMindX chat system schema',
        up: completeContent,
        checksum: this.calculateChecksum(completeContent),
      });
    }

    // Add future migrations here as needed
    // Example:
    // this.migrations.push({
    //   version: '1.1.0',
    //   description: 'Add message threading support',
    //   up: `
    //     ALTER TABLE messages ADD COLUMN thread_id TEXT;
    //     ALTER TABLE messages ADD COLUMN reply_to_id TEXT;
    //     CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
    //     CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
    //   `,
    //   down: `
    //     -- Note: SQLite doesn't support DROP COLUMN easily
    //     -- Would need to recreate table without these columns
    //   `
    // })
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('🔄 Starting chat database migration...');

    const appliedVersions = this.getAppliedVersions();
    const pendingMigrations = this.migrations.filter(
      (migration) => !appliedVersions.includes(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Chat database is up to date');
      return;
    }

    console.log(`📝 Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log('✅ Chat database migration completed');
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    console.log(
      `⚡ Applying migration ${migration.version}: ${migration.description}`
    );

    const startTime = Date.now();

    try {
      // Run migration in a transaction
      this.db.exec('BEGIN');

      // Disable foreign key constraints during migration
      this.db.exec('PRAGMA foreign_keys = OFF');

      // For safety, execute the entire migration as a single operation
      try {
        this.db.exec(migration.up);
      } catch (error) {
        console.error(`❌ Failed to execute migration SQL:`, error);
        throw error;
      }

      // Record the migration
      this.recordMigration(migration);

      // Re-enable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = ON');

      this.db.exec('COMMIT');

      const duration = Date.now() - startTime;
      console.log(
        `✅ Migration ${migration.version} completed in ${duration}ms`
      );
    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error(`❌ Migration ${migration.version} failed:`, error);
      throw error;
    }
  }

  /**
   * Record a successful migration
   */
  private recordMigration(migration: Migration): void {
    const stmt = this.db.prepare(`
      INSERT INTO schema_migrations (version, description, applied_at, checksum)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      migration.version,
      migration.description,
      Date.now(),
      migration.checksum || this.calculateChecksum(migration.up)
    );
  }

  /**
   * Get list of applied migration versions
   */
  private getAppliedVersions(): string[] {
    const stmt = this.db.prepare(
      'SELECT version FROM schema_migrations ORDER BY applied_at'
    );
    const rows = stmt.all() as { version: string }[];
    return rows.map((row) => row.version);
  }

  /**
   * Get migration history
   */
  getMigrationHistory(): MigrationRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM schema_migrations 
      ORDER BY applied_at DESC
    `);
    return stmt.all() as MigrationRecord[];
  }

  /**
   * Check if database is up to date
   */
  isUpToDate(): boolean {
    const appliedVersions = this.getAppliedVersions();
    const latestVersion = this.migrations[this.migrations.length - 1]?.version;

    return latestVersion ? appliedVersions.includes(latestVersion) : true;
  }

  /**
   * Get current schema version
   */
  getCurrentVersion(): string | null {
    const stmt = this.db.prepare(`
      SELECT version FROM schema_migrations 
      ORDER BY applied_at DESC 
      LIMIT 1
    `);
    const row = stmt.get() as { version: string } | undefined;
    return row?.version || null;
  }

  /**
   * Reset database (dangerous - removes all data)
   */
  async reset(): Promise<void> {
    console.log('🗑️ Resetting chat database...');

    // Drop all tables
    const tables = this.getAllTables();

    this.db.exec('BEGIN');
    try {
      // Disable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = OFF');

      for (const table of tables) {
        this.db.exec(`DROP TABLE IF EXISTS ${table}`);
      }

      // Re-enable foreign key constraints
      this.db.exec('PRAGMA foreign_keys = ON');

      this.db.exec('COMMIT');

      // Reinitialize migration table
      this.initializeMigrationTable();

      console.log('✅ Chat database reset completed');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Validate database integrity
   */
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check schema integrity
      const integrityCheck = this.db.query('PRAGMA integrity_check').get();
      // SQLite integrity check can return 'ok' string, array, or object
      const isOk =
        integrityCheck === 'ok' ||
        (Array.isArray(integrityCheck) &&
          integrityCheck.length === 1 &&
          integrityCheck[0] === 'ok') ||
        (Array.isArray(integrityCheck) && integrityCheck.length === 0) ||
        (Array.isArray(integrityCheck) &&
          integrityCheck.length === 1 &&
          typeof integrityCheck[0] === 'object' &&
          (integrityCheck[0] as any).integrity_check === 'ok') ||
        (typeof integrityCheck === 'object' &&
          integrityCheck !== null &&
          (integrityCheck as any).integrity_check === 'ok');
      if (!isOk) {
        errors.push(
          `Database integrity check failed: ${JSON.stringify(integrityCheck)}`
        );
      }

      // Check foreign key constraints
      const foreignKeyCheck = this.db.query('PRAGMA foreign_key_check').all();
      if (Array.isArray(foreignKeyCheck) && foreignKeyCheck.length > 0) {
        errors.push(
          `Foreign key constraint violations: ${JSON.stringify(foreignKeyCheck)}`
        );
      }

      // Check if we have any tables at all (skip if this is initial migration)
      const existingTables = this.getAllTables();
      if (existingTables.length > 1) {
        // More than just schema_migrations table
        // Verify required tables exist
        const requiredTables = [
          'conversations',
          'messages',
          'participants',
          'chat_sessions',
          'schema_migrations',
        ];

        for (const table of requiredTables) {
          if (!existingTables.includes(table)) {
            errors.push(`Required table missing: ${table}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      errors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Get all table names in the database
   */
  private getAllTables(): string[] {
    const stmt = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
    `);
    const rows = stmt.all() as { name: string }[];
    return rows.map((row) => row.name);
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    // Simple checksum using hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Parse SQL statements more carefully, handling JSON and comments
   */
  private _parseStatements(sql: string): string[] {
    // Unused but kept for future use
    const statements: string[] = [];
    let currentStatement = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inMultilineComment = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];

      // Handle string literals
      if (!inComment && !inMultilineComment && (char === '"' || char === "'")) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      // Handle comments
      if (!inString) {
        if (char === '-' && nextChar === '-' && !inMultilineComment) {
          inComment = true;
        } else if (char === '/' && nextChar === '*') {
          inMultilineComment = true;
          i++; // Skip next character
          continue;
        } else if (char === '*' && nextChar === '/' && inMultilineComment) {
          inMultilineComment = false;
          i++; // Skip next character
          continue;
        } else if (char === '\n' && inComment) {
          inComment = false;
        }
      }

      // Handle statement separation
      if (!inString && !inComment && !inMultilineComment && char === ';') {
        // End of statement
        const statement = currentStatement.trim();
        if (statement && !statement.startsWith('--')) {
          statements.push(statement);
        }
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }

    // Add final statement if exists
    const finalStatement = currentStatement.trim();
    if (finalStatement && !finalStatement.startsWith('--')) {
      statements.push(finalStatement);
    }

    return statements;
  }

  /**
   * Check if an error is expected during migration
   */
  private _isExpectedError(error: any, statement: string): boolean {
    // Unused but kept for future use
    const errorMessage = error.message?.toLowerCase() || '';
    const stmt = statement.toLowerCase();

    // Common expected errors during schema creation
    const expectedErrors = [
      'table already exists',
      'index already exists',
      'column already exists',
      'unique constraint',
    ];

    // If it's a CREATE IF NOT EXISTS statement, some errors are expected
    if (stmt.includes('if not exists')) {
      return expectedErrors.some((expectedError) =>
        errorMessage.includes(expectedError)
      );
    }

    return false;
  }

  /**
   * Add a custom migration
   */
  addMigration(migration: Migration): void {
    // Validate migration
    if (!migration.version || !migration.description || !migration.up) {
      throw new Error(
        'Migration must have version, description, and up script'
      );
    }

    // Check for duplicate versions
    const existingMigration = this.migrations.find(
      (m) => m.version === migration.version
    );
    if (existingMigration) {
      throw new Error(`Migration version ${migration.version} already exists`);
    }

    // Calculate checksum if not provided
    if (!migration.checksum) {
      migration.checksum = this.calculateChecksum(migration.up);
    }

    this.migrations.push(migration);

    // Sort migrations by version
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Factory function to create a migration manager
 */
export function createChatMigrationManager(
  dbPath: string
): ChatMigrationManager {
  return new ChatMigrationManager(dbPath);
}
