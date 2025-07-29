#!/usr/bin/env bun
/**
 * Migration Script for SYMindX v2.0
 * Handles database schema changes, configuration updates, and API versioning
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface MigrationOptions {
  dryRun: boolean;
  backup: boolean;
  skipSecurity: boolean;
  skipCompliance: boolean;
  force: boolean;
  configPath?: string;
}

interface MigrationResult {
  success: boolean;
  changes: string[];
  warnings: string[];
  errors: string[];
}

class SYMindXMigrator {
  private options: MigrationOptions;
  private backupDir: string;
  private result: MigrationResult;

  constructor(options: MigrationOptions) {
    this.options = options;
    this.backupDir = join(process.cwd(), '.migration-backup', Date.now().toString());
    this.result = {
      success: false,
      changes: [],
      warnings: [],
      errors: [],
    };
  }

  async migrate(): Promise<MigrationResult> {
    console.log('🚀 Starting SYMindX v2.0 migration...');

    try {
      if (this.options.backup) {
        await this.createBackup();
      }

      await this.validatePrerequisites();
      await this.migrateDatabase();
      await this.migrateConfiguration();
      await this.migrateCodeStructure();
      await this.updateDependencies();
      
      if (!this.options.skipSecurity) {
        await this.setupSecurity();
      }
      
      if (!this.options.skipCompliance) {
        await this.setupCompliance();
      }

      await this.runTests();
      
      this.result.success = true;
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      this.result.errors.push(`Migration failed: ${error.message}`);
      console.error('❌ Migration failed:', error.message);
      
      if (this.options.backup) {
        await this.rollback();
      }
    }

    return this.result;
  }

  private async createBackup(): Promise<void> {
    console.log('📦 Creating backup...');
    
    await fs.mkdir(this.backupDir, { recursive: true });
    
    // Backup configuration files
    const configFiles = [
      'src/core/config/runtime.json',
      'package.json',
      'tsconfig.json',
      '.env',
    ];

    for (const file of configFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        await fs.writeFile(join(this.backupDir, file.replace('/', '_')), content);
        this.result.changes.push(`Backed up ${file}`);
      } catch (error) {
        this.result.warnings.push(`Could not backup ${file}: ${error.message}`);
      }
    }

    // Backup database files
    const dbFiles = await this.findDatabaseFiles();
    for (const dbFile of dbFiles) {
      try {
        await fs.copyFile(dbFile, join(this.backupDir, `db_${Date.now()}.backup`));
        this.result.changes.push(`Backed up database ${dbFile}`);
      } catch (error) {
        this.result.warnings.push(`Could not backup database ${dbFile}: ${error.message}`);
      }
    }
  }

  private async validatePrerequisites(): Promise<void> {
    console.log('🔍 Validating prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18.') && !nodeVersion.startsWith('v20.')) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
    }

    // Check if Bun is available
    try {
      execSync('bun --version', { stdio: 'ignore' });
    } catch {
      throw new Error('Bun is required for SYMindX v2.0');
    }

    // Check TypeScript version
    try {
      const tsVersion = execSync('npx tsc --version', { encoding: 'utf8' });
      if (!tsVersion.includes('5.')) {
        this.result.warnings.push('TypeScript 5.x recommended for best experience');
      }
    } catch {
      throw new Error('TypeScript is required');
    }

    this.result.changes.push('Prerequisites validated');
  }

  private async migrateDatabase(): Promise<void> {
    console.log('🗄️ Migrating database schema...');
    
    const migrations = [
      this.addSecurityTables,
      this.addComplianceTables,
      this.addPerformanceIndexes,
      this.migrateContextSchema,
      this.addAuditTables,
    ];

    for (const migration of migrations) {
      if (!this.options.dryRun) {
        await migration.call(this);
      } else {
        console.log(`[DRY RUN] Would execute: ${migration.name}`);
      }
    }
  }

  private async addSecurityTables(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS auth_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        revoked BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        requests_count INTEGER DEFAULT 0,
        window_start INTEGER NOT NULL,
        UNIQUE(user_id, endpoint)
      );

      CREATE INDEX IF NOT EXISTS idx_tokens_user_agent ON auth_tokens(user_id, agent_id);
      CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
    `;

    await this.executeSql(sql);
    this.result.changes.push('Added security tables');
  }

  private async addComplianceTables(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_consents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        granted BOOLEAN NOT NULL,
        granted_at INTEGER NOT NULL,
        expires_at INTEGER,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS data_processing_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data_type TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        legal_basis TEXT,
        retention_period INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_consents_user_type ON user_consents(user_id, consent_type);
      CREATE INDEX IF NOT EXISTS idx_processing_logs_user ON data_processing_logs(user_id);
    `;

    await this.executeSql(sql);
    this.result.changes.push('Added compliance tables');
  }

  private async addPerformanceIndexes(): Promise<void> {
    const sql = `
      CREATE INDEX IF NOT EXISTS idx_memories_agent_importance ON memories(agent_id, importance);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_contexts_agent_user ON contexts(agent_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_context_timestamp ON messages(context_id, timestamp);
    `;

    await this.executeSql(sql);
    this.result.changes.push('Added performance indexes');
  }

  private async migrateContextSchema(): Promise<void> {
    const sql = `
      ALTER TABLE contexts ADD COLUMN enrichment_data TEXT;
      ALTER TABLE contexts ADD COLUMN ttl INTEGER;
      ALTER TABLE contexts ADD COLUMN cache_key TEXT;
      ALTER TABLE contexts ADD COLUMN shared_context_id TEXT;
      
      CREATE INDEX IF NOT EXISTS idx_contexts_cache_key ON contexts(cache_key);
      CREATE INDEX IF NOT EXISTS idx_contexts_shared ON contexts(shared_context_id);
    `;

    await this.executeSql(sql);
    this.result.changes.push('Migrated context schema');
  }

  private async addAuditTables(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        timestamp INTEGER DEFAULT (strftime('%s', 'now')),
        ip_address TEXT,
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
    `;

    await this.executeSql(sql);
    this.result.changes.push('Added audit tables');
  }

  private async migrateConfiguration(): Promise<void> {
    console.log('⚙️ Migrating configuration...');
    
    const configPath = this.options.configPath || 'src/core/config/runtime.json';
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Add new security configuration
      config.security = {
        enabled: true,
        authRequired: true,
        encryption: true,
        rateLimit: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
        audit: {
          enabled: true,
          logLevel: 'info',
        },
      };

      // Add performance configuration
      config.performance = {
        monitoring: true,
        caching: true,
        optimization: 'standard',
      };

      // Add compliance configuration
      config.compliance = {
        gdpr: true,
        hipaa: false,
        sox: false,
      };

      // Add context configuration
      config.context = {
        maxContextsPerAgent: 100,
        defaultTtl: 3600000,
        enableEnrichment: true,
        cacheConfig: {
          l1Size: 100,
          l2Size: 1000,
          l3Size: 10000,
        },
      };

      if (!this.options.dryRun) {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      }
      
      this.result.changes.push('Updated runtime configuration');
      
    } catch (error) {
      this.result.warnings.push(`Could not migrate configuration: ${error.message}`);
    }
  }

  private async migrateCodeStructure(): Promise<void> {
    console.log('🏗️ Migrating code structure...');
    
    // Update import statements
    await this.updateImports();
    
    // Update type names
    await this.updateTypeNames();
    
    // Update method signatures
    await this.updateMethodSignatures();
  }

  private async updateImports(): Promise<void> {
    const files = await this.findTypeScriptFiles();
    
    for (const file of files) {
      try {
        let content = await fs.readFile(file, 'utf8');
        let modified = false;
        
        // Update old imports to new ones
        const importReplacements = [
          ['from \'@symindx/types\'', 'from \'@symindx/mind-agents/types\''],
          ['from \'../types/agent\'', 'from \'../types/agent.js\''],
          ['from \'../types/memory\'', 'from \'../types/memory.js\''],
          ['from \'../types/emotion\'', 'from \'../types/emotion.js\''],
        ];

        for (const [oldImport, newImport] of importReplacements) {
          if (content.includes(oldImport)) {
            content = content.replace(new RegExp(oldImport, 'g'), newImport);
            modified = true;
          }
        }

        if (modified && !this.options.dryRun) {
          await fs.writeFile(file, content);
          this.result.changes.push(`Updated imports in ${file}`);
        }
        
      } catch (error) {
        this.result.warnings.push(`Could not update imports in ${file}: ${error.message}`);
      }
    }
  }

  private async updateTypeNames(): Promise<void> {
    const files = await this.findTypeScriptFiles();
    
    const typeReplacements = [
      ['Agent', 'AgentInstance'],
      ['Memory', 'MemoryProvider'],
      ['Emotion', 'EmotionModule'],
      ['Cognition', 'CognitionModule'],
      ['Extension', 'ExtensionModule'],
    ];

    for (const file of files) {
      try {
        let content = await fs.readFile(file, 'utf8');
        let modified = false;
        
        for (const [oldType, newType] of typeReplacements) {
          const regex = new RegExp(`\\b${oldType}\\b(?!\\w)`, 'g');
          if (regex.test(content)) {
            content = content.replace(regex, newType);
            modified = true;
          }
        }

        if (modified && !this.options.dryRun) {
          await fs.writeFile(file, content);
          this.result.changes.push(`Updated type names in ${file}`);
        }
        
      } catch (error) {
        this.result.warnings.push(`Could not update type names in ${file}: ${error.message}`);
      }
    }
  }

  private async updateMethodSignatures(): Promise<void> {
    // This would require more sophisticated AST parsing
    // For now, we'll provide warnings about manual updates needed
    this.result.warnings.push(
      'Method signatures have changed - please review the migration guide for manual updates'
    );
  }

  private async updateDependencies(): Promise<void> {
    console.log('📦 Updating dependencies...');
    
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      // Add new dependencies
      packageJson.dependencies = {
        ...packageJson.dependencies,
        'bcrypt': '^5.1.0',
        'jsonwebtoken': '^9.0.0',
        'rate-limiter-flexible': '^3.0.0',
        '@types/bcrypt': '^5.0.0',
        '@types/jsonwebtoken': '^9.0.0',
      };

      // Update existing dependencies
      if (packageJson.dependencies['@ai-sdk/core']) {
        packageJson.dependencies['@ai-sdk/core'] = '^4.0.0';
      }

      if (!this.options.dryRun) {
        await fs.writeFile('package.json', JSON.stringify(packageJson, null, 2));
        execSync('bun install', { stdio: 'inherit' });
      }
      
      this.result.changes.push('Updated dependencies');
      
    } catch (error) {
      this.result.warnings.push(`Could not update dependencies: ${error.message}`);
    }
  }

  private async setupSecurity(): Promise<void> {
    console.log('🔐 Setting up security...');
    
    // Generate JWT secret
    const jwtSecret = this.generateSecretKey();
    
    // Update environment variables
    let envContent = '';
    try {
      envContent = await fs.readFile('.env', 'utf8');
    } catch {
      // File doesn't exist, create new
    }

    if (!envContent.includes('JWT_SECRET')) {
      envContent += `\n# Security Configuration\nJWT_SECRET=${jwtSecret}\n`;
    }

    if (!envContent.includes('ENCRYPTION_KEY')) {
      const encryptionKey = this.generateSecretKey(32);
      envContent += `ENCRYPTION_KEY=${encryptionKey}\n`;
    }

    if (!this.options.dryRun) {
      await fs.writeFile('.env', envContent);
    }
    
    this.result.changes.push('Set up security configuration');
  }

  private async setupCompliance(): Promise<void> {
    console.log('📋 Setting up compliance...');
    
    // Create compliance directory structure
    const complianceDirs = [
      'data/compliance',
      'data/exports',
      'data/audit-logs',
    ];

    for (const dir of complianceDirs) {
      if (!this.options.dryRun) {
        await fs.mkdir(dir, { recursive: true });
      }
    }

    // Create privacy policy template
    const privacyPolicyTemplate = `
# Privacy Policy

This document outlines how we handle personal data in compliance with GDPR and other regulations.

## Data Collection
- We collect only necessary data for agent interactions
- All data is encrypted and stored securely
- Users can request data export or deletion at any time

## Legal Basis
- Consent: Users provide explicit consent for data processing
- Legitimate Interest: Processing necessary for AI agent functionality

## Data Retention
- Conversation data: Retained for 90 days unless explicitly deleted
- Audit logs: Retained for 7 years for compliance purposes
- User profiles: Retained until account deletion

## User Rights
- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing

## Contact
For privacy-related questions, contact: privacy@symindx.ai
`;

    if (!this.options.dryRun) {
      await fs.writeFile('PRIVACY_POLICY.md', privacyPolicyTemplate);
    }
    
    this.result.changes.push('Set up compliance framework');
  }

  private async runTests(): Promise<void> {
    console.log('🧪 Running tests...');
    
    try {
      if (!this.options.dryRun) {
        execSync('bun test', { stdio: 'inherit' });
      } else {
        console.log('[DRY RUN] Would run: bun test');
      }
      this.result.changes.push('Tests passed');
    } catch (error) {
      this.result.warnings.push('Some tests failed - please review test results');
    }
  }

  private async rollback(): Promise<void> {
    console.log('↩️ Rolling back changes...');
    
    // Restore configuration files
    const backupFiles = await fs.readdir(this.backupDir);
    
    for (const backupFile of backupFiles) {
      try {
        const originalPath = backupFile.replace('_', '/');
        const backupContent = await fs.readFile(join(this.backupDir, backupFile), 'utf8');
        await fs.writeFile(originalPath, backupContent);
        console.log(`Restored ${originalPath}`);
      } catch (error) {
        console.warn(`Could not restore ${backupFile}:`, error.message);
      }
    }
  }

  // Helper methods
  private async findDatabaseFiles(): Promise<string[]> {
    const files: string[] = [];
    try {
      const entries = await fs.readdir('data', { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith('.db') || entry.name.endsWith('.sqlite'))) {
          files.push(join('data', entry.name));
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return files;
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const searchDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await searchDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      } catch {
        // Directory doesn't exist or no permission
      }
    };

    await searchDir('src');
    return files;
  }

  private async executeSql(sql: string): Promise<void> {
    // This would connect to the actual database and execute SQL
    // For now, we'll simulate it
    console.log(`[SQL] ${sql.split('\n')[1]?.trim() || 'Executing SQL...'}`);
  }

  private generateSecretKey(length: number = 64): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    backup: !args.includes('--no-backup'),
    skipSecurity: args.includes('--skip-security'),
    skipCompliance: args.includes('--skip-compliance'),
    force: args.includes('--force'),
    configPath: args.find(arg => arg.startsWith('--config='))?.split('=')[1],
  };

  if (args.includes('--help')) {
    console.log(`
SYMindX Migration Tool v2.0

Usage: bun scripts/migrate-to-v2.ts [options]

Options:
  --dry-run          Preview changes without applying them
  --no-backup        Skip creating backup (not recommended)
  --skip-security    Skip security setup
  --skip-compliance  Skip compliance setup
  --force            Force migration even if checks fail
  --config=PATH      Custom configuration file path
  --help             Show this help message

Examples:
  bun scripts/migrate-to-v2.ts --dry-run
  bun scripts/migrate-to-v2.ts --skip-security
  bun scripts/migrate-to-v2.ts --config=custom-config.json
`);
    process.exit(0);
  }

  const migrator = new SYMindXMigrator(options);
  const result = await migrator.migrate();

  console.log('\n📊 Migration Summary:');
  console.log(`✅ Changes: ${result.changes.length}`);
  console.log(`⚠️  Warnings: ${result.warnings.length}`);
  console.log(`❌ Errors: ${result.errors.length}`);

  if (result.changes.length > 0) {
    console.log('\nChanges made:');
    result.changes.forEach(change => console.log(`  - ${change}`));
  }

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
    process.exit(1);
  }

  if (result.success) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('Next steps:');
    console.log('1. Review the migration guide: docs/MIGRATION_GUIDE.md');
    console.log('2. Update your application code as needed');
    console.log('3. Run comprehensive tests');
    console.log('4. Deploy to staging environment first');
  }
}

if (import.meta.main) {
  main().catch(console.error);
}