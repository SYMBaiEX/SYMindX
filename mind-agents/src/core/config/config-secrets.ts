/**
 * Configuration Secrets Manager
 *
 * Provides secure handling of sensitive configuration data including
 * encryption, key rotation, and secure storage patterns.
 */

import { createCipher, createDecipher, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { standardLoggers } from '../../utils/standard-logging.js';

const scryptAsync = promisify(scrypt);

/**
 * Secret metadata for tracking and rotation
 */
export interface SecretMetadata {
  id: string;
  name: string;
  encrypted: boolean;
  createdAt: Date;
  lastRotated?: Date;
  rotationInterval?: number; // days
  source: 'environment' | 'file' | 'vault' | 'runtime';
  classification: 'public' | 'internal' | 'confidential' | 'secret';
}

/**
 * Encrypted secret container
 */
export interface EncryptedSecret {
  data: string;
  iv: string;
  algorithm: string;
  keyDerivation: string;
  metadata: SecretMetadata;
}

/**
 * Secret validation rules
 */
export interface SecretValidationRule {
  name: string;
  validate: (value: string) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Configuration Secrets Manager
 *
 * Handles encryption, decryption, and secure storage of sensitive
 * configuration data with key rotation and validation.
 */
export class ConfigSecrets {
  private readonly logger = standardLoggers.config;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'scrypt';
  private masterKey?: Buffer;
  private secrets: Map<string, EncryptedSecret> = new Map();
  private validationRules: Map<string, SecretValidationRule[]> = new Map();

  constructor(masterKeyPath?: string) {
    this.initializeMasterKey(masterKeyPath);
    this.setupDefaultValidationRules();
  }

  /**
   * Store a secret securely
   */
  public async storeSecret(
    name: string,
    value: string,
    classification: SecretMetadata['classification'] = 'confidential',
    rotationInterval?: number
  ): Promise<void> {
    try {
      // Validate secret
      await this.validateSecret(name, value);

      // Encrypt the secret
      const encrypted = await this.encryptValue(value);

      const metadata: SecretMetadata = {
        id: this.generateSecretId(),
        name,
        encrypted: true,
        createdAt: new Date(),
        rotationInterval,
        source: 'runtime',
        classification,
      };

      const encryptedSecret: EncryptedSecret = {
        ...encrypted,
        metadata,
      };

      this.secrets.set(name, encryptedSecret);

      this.logger.info('Secret stored successfully', {
        name,
        classification,
        encrypted: true,
      });
    } catch (error) {
      this.logger.error('Failed to store secret', { name, error });
      throw error;
    }
  }

  /**
   * Retrieve and decrypt a secret
   */
  public async getSecret(name: string): Promise<string | undefined> {
    try {
      const encryptedSecret = this.secrets.get(name);

      if (!encryptedSecret) {
        // Try environment variable fallback
        const envValue = process.env[name];
        if (envValue) {
          this.logger.debug('Secret retrieved from environment', { name });
          return envValue;
        }
        return undefined;
      }

      const decrypted = await this.decryptValue(encryptedSecret);

      this.logger.debug('Secret retrieved successfully', {
        name,
        classification: encryptedSecret.metadata.classification,
      });

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to retrieve secret', { name, error });
      throw error;
    }
  }

  /**
   * Check if a secret exists
   */
  public hasSecret(name: string): boolean {
    return this.secrets.has(name) || process.env[name] !== undefined;
  }

  /**
   * Remove a secret
   */
  public async removeSecret(name: string): Promise<boolean> {
    const removed = this.secrets.delete(name);

    if (removed) {
      this.logger.info('Secret removed', { name });
    }

    return removed;
  }

  /**
   * Rotate a secret (generate new encryption)
   */
  public async rotateSecret(name: string): Promise<void> {
    try {
      const encryptedSecret = this.secrets.get(name);

      if (!encryptedSecret) {
        throw new Error(`Secret '${name}' not found`);
      }

      // Decrypt current value
      const currentValue = await this.decryptValue(encryptedSecret);

      // Re-encrypt with new key/IV
      const reencrypted = await this.encryptValue(currentValue);

      const updatedMetadata: SecretMetadata = {
        ...encryptedSecret.metadata,
        lastRotated: new Date(),
      };

      const rotatedSecret: EncryptedSecret = {
        ...reencrypted,
        metadata: updatedMetadata,
      };

      this.secrets.set(name, rotatedSecret);

      this.logger.info('Secret rotated successfully', { name });
    } catch (error) {
      this.logger.error('Failed to rotate secret', { name, error });
      throw error;
    }
  }

  /**
   * Get all secret metadata (without values)
   */
  public getSecretMetadata(): SecretMetadata[] {
    return Array.from(this.secrets.values()).map((secret) => secret.metadata);
  }

  /**
   * Export secrets to encrypted file
   */
  public async exportSecrets(
    filePath: string,
    includeClassifications?: string[]
  ): Promise<void> {
    try {
      const exportData: Record<string, EncryptedSecret> = {};

      for (const [name, secret] of this.secrets) {
        // Filter by classification if specified
        if (
          includeClassifications &&
          !includeClassifications.includes(secret.metadata.classification)
        ) {
          continue;
        }

        exportData[name] = secret;
      }

      const serialized = JSON.stringify(exportData, null, 2);
      writeFileSync(resolve(filePath), serialized, { mode: 0o600 });

      this.logger.info('Secrets exported', {
        filePath,
        count: Object.keys(exportData).length,
        includeClassifications,
      });
    } catch (error) {
      this.logger.error('Failed to export secrets', { filePath, error });
      throw error;
    }
  }

  /**
   * Import secrets from encrypted file
   */
  public async importSecrets(filePath: string): Promise<void> {
    try {
      const resolvedPath = resolve(filePath);

      if (!existsSync(resolvedPath)) {
        throw new Error(`Secrets file not found: ${resolvedPath}`);
      }

      const content = readFileSync(resolvedPath, 'utf8');
      const importData: Record<string, EncryptedSecret> = JSON.parse(content);

      let importedCount = 0;
      for (const [name, secret] of Object.entries(importData)) {
        // Validate secret structure
        if (this.isValidEncryptedSecret(secret)) {
          this.secrets.set(name, secret);
          importedCount++;
        } else {
          this.logger.warn('Invalid secret structure, skipping', { name });
        }
      }

      this.logger.info('Secrets imported', {
        filePath,
        imported: importedCount,
        total: Object.keys(importData).length,
      });
    } catch (error) {
      this.logger.error('Failed to import secrets', { filePath, error });
      throw error;
    }
  }

  /**
   * Validate secret format and strength
   */
  public async validateSecret(name: string, value: string): Promise<void> {
    const rules =
      this.validationRules.get(name) ||
      this.validationRules.get('default') ||
      [];

    for (const rule of rules) {
      if (!rule.validate(value)) {
        const error = new Error(
          `Secret validation failed for '${name}': ${rule.message}`
        );

        if (rule.severity === 'error') {
          throw error;
        } else {
          this.logger.warn('Secret validation warning', {
            name,
            message: rule.message,
          });
        }
      }
    }
  }

  /**
   * Add custom validation rule for secrets
   */
  public addValidationRule(
    secretName: string,
    rule: SecretValidationRule
  ): void {
    const existing = this.validationRules.get(secretName) || [];
    existing.push(rule);
    this.validationRules.set(secretName, existing);

    this.logger.debug('Validation rule added', {
      secretName,
      ruleName: rule.name,
    });
  }

  /**
   * Check for secrets needing rotation
   */
  public getSecretsNeedingRotation(): SecretMetadata[] {
    const now = new Date();
    const needRotation: SecretMetadata[] = [];

    for (const secret of this.secrets.values()) {
      const { metadata } = secret;

      if (!metadata.rotationInterval) continue;

      const lastRotated = metadata.lastRotated || metadata.createdAt;
      const daysSinceRotation =
        (now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceRotation >= metadata.rotationInterval) {
        needRotation.push(metadata);
      }
    }

    return needRotation;
  }

  /**
   * Clear all secrets from memory
   */
  public clearSecrets(): void {
    this.secrets.clear();
    this.masterKey = undefined;
    this.logger.info('All secrets cleared from memory');
  }

  // Private methods

  private initializeMasterKey(keyPath?: string): void {
    try {
      if (keyPath && existsSync(keyPath)) {
        // Load master key from file
        this.masterKey = readFileSync(keyPath);
        this.logger.debug('Master key loaded from file');
      } else if (process.env.SYMINDX_MASTER_KEY) {
        // Load from environment variable
        this.masterKey = Buffer.from(process.env.SYMINDX_MASTER_KEY, 'hex');
        this.logger.debug('Master key loaded from environment');
      } else {
        // Generate new master key
        this.masterKey = randomBytes(32);
        this.logger.warn(
          'New master key generated - save this for production use'
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize master key', error);
      throw error;
    }
  }

  private async encryptValue(
    value: string
  ): Promise<Omit<EncryptedSecret, 'metadata'>> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const iv = randomBytes(16);
    const salt = randomBytes(32);

    // Derive key using scrypt
    const key = (await scryptAsync(this.masterKey, salt, 32)) as Buffer;

    const cipher = createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('symindx-config'));

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      data:
        encrypted + ':' + authTag.toString('hex') + ':' + salt.toString('hex'),
      iv: iv.toString('hex'),
      algorithm: this.algorithm,
      keyDerivation: this.keyDerivation,
    };
  }

  private async decryptValue(
    encryptedSecret: EncryptedSecret
  ): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const [encryptedData, authTag, salt] = encryptedSecret.data.split(':');
    const iv = Buffer.from(encryptedSecret.iv, 'hex');
    const saltBuffer = Buffer.from(salt, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    // Derive key using scrypt
    const key = (await scryptAsync(this.masterKey, saltBuffer, 32)) as Buffer;

    const decipher = createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('symindx-config'));
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private generateSecretId(): string {
    return randomBytes(16).toString('hex');
  }

  private isValidEncryptedSecret(obj: any): obj is EncryptedSecret {
    return (
      obj &&
      typeof obj.data === 'string' &&
      typeof obj.iv === 'string' &&
      typeof obj.algorithm === 'string' &&
      typeof obj.keyDerivation === 'string' &&
      obj.metadata &&
      typeof obj.metadata.id === 'string' &&
      typeof obj.metadata.name === 'string'
    );
  }

  private setupDefaultValidationRules(): void {
    // Default validation rules for common secret types
    const defaultRules: SecretValidationRule[] = [
      {
        name: 'notEmpty',
        validate: (value: string) => value.trim().length > 0,
        message: 'Secret cannot be empty',
        severity: 'error',
      },
      {
        name: 'minLength',
        validate: (value: string) => value.length >= 8,
        message: 'Secret must be at least 8 characters long',
        severity: 'warning',
      },
    ];

    this.validationRules.set('default', defaultRules);

    // API Key validation rules
    const apiKeyRules: SecretValidationRule[] = [
      ...defaultRules,
      {
        name: 'validFormat',
        validate: (value: string) => /^[A-Za-z0-9_-]+$/.test(value),
        message: 'API key contains invalid characters',
        severity: 'warning',
      },
      {
        name: 'strongLength',
        validate: (value: string) => value.length >= 20,
        message: 'API key should be at least 20 characters long',
        severity: 'warning',
      },
    ];

    // Apply API key rules to common API key names
    const apiKeyPatterns = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'XAI_API_KEY',
      'GOOGLE_API_KEY',
      'TELEGRAM_BOT_TOKEN',
    ];

    for (const pattern of apiKeyPatterns) {
      this.validationRules.set(pattern, apiKeyRules);
    }

    // JWT Secret validation
    this.validationRules.set('jwtSecret', [
      {
        name: 'strongSecret',
        validate: (value: string) => value.length >= 32,
        message: 'JWT secret must be at least 32 characters long',
        severity: 'error',
      },
      {
        name: 'complexity',
        validate: (value: string) =>
          /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value),
        message: 'JWT secret should contain uppercase, lowercase, and numbers',
        severity: 'warning',
      },
    ]);

    this.logger.debug('Default validation rules configured');
  }
}
