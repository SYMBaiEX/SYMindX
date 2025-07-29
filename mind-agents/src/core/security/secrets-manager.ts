/**
 * Secrets Manager
 * Secure storage and retrieval of sensitive configuration data
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SecretConfig {
  encryptionAlgorithm: string;
  keyDerivationAlgorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  iterations: number;
  storageDir: string;
}

export interface EncryptedSecret {
  encrypted: string;
  iv: string;
  salt: string;
  algorithm: string;
  iterations: number;
  createdAt: string;
  updatedAt: string;
}

export class SecretsManager {
  private readonly config: SecretConfig;
  private readonly secrets: Map<string, EncryptedSecret> = new Map();
  private masterKey?: Buffer;

  constructor(config: Partial<SecretConfig> = {}) {
    this.config = {
      encryptionAlgorithm: config.encryptionAlgorithm || 'aes-256-gcm',
      keyDerivationAlgorithm: config.keyDerivationAlgorithm || 'pbkdf2',
      keyLength: config.keyLength || 32,
      ivLength: config.ivLength || 16,
      saltLength: config.saltLength || 32,
      iterations: config.iterations || 100000,
      storageDir: config.storageDir || './data/secrets'
    };
  }

  /**
   * Initialize secrets manager with master password
   */
  async initialize(masterPassword: string): Promise<void> {
    // Ensure storage directory exists
    await fs.mkdir(this.config.storageDir, { recursive: true });

    // Derive master key from password
    const salt = await this.getOrCreateMasterSalt();
    this.masterKey = await this.deriveKey(masterPassword, salt);

    // Load existing secrets
    await this.loadSecrets();
  }

  /**
   * Store a secret
   */
  async setSecret(key: string, value: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Secrets manager not initialized');
    }

    const encrypted = await this.encrypt(value);
    const secretData: EncryptedSecret = {
      ...encrypted,
      createdAt: this.secrets.has(key) 
        ? this.secrets.get(key)!.createdAt 
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.secrets.set(key, secretData);
    await this.saveSecret(key, secretData);
  }

  /**
   * Retrieve a secret
   */
  async getSecret(key: string): Promise<string | null> {
    if (!this.masterKey) {
      throw new Error('Secrets manager not initialized');
    }

    const secretData = this.secrets.get(key);
    if (!secretData) {
      return null;
    }

    return await this.decrypt(secretData);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(key: string): Promise<boolean> {
    if (!this.secrets.has(key)) {
      return false;
    }

    this.secrets.delete(key);
    
    try {
      await fs.unlink(this.getSecretPath(key));
      return true;
    } catch (error) {
      // File might not exist, which is okay
      return true;
    }
  }

  /**
   * List all secret keys
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Check if a secret exists
   */
  hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Rotate encryption for all secrets
   */
  async rotateSecrets(newMasterPassword: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error('Secrets manager not initialized');
    }

    // Decrypt all secrets with current key
    const decryptedSecrets: Map<string, string> = new Map();
    
    for (const [key, secretData] of this.secrets) {
      const decrypted = await this.decrypt(secretData);
      decryptedSecrets.set(key, decrypted);
    }

    // Generate new master key
    const salt = crypto.randomBytes(this.config.saltLength);
    this.masterKey = await this.deriveKey(newMasterPassword, salt);
    
    // Save new master salt
    await this.saveMasterSalt(salt);

    // Re-encrypt all secrets with new key
    for (const [key, value] of decryptedSecrets) {
      await this.setSecret(key, value);
    }
  }

  /**
   * Export secrets (encrypted with different key)
   */
  async exportSecrets(exportPassword: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Secrets manager not initialized');
    }

    const exportData: Record<string, any> = {};
    
    for (const [key, secretData] of this.secrets) {
      const decrypted = await this.decrypt(secretData);
      
      // Re-encrypt with export password
      const exportSalt = crypto.randomBytes(this.config.saltLength);
      const exportKey = await this.deriveKey(exportPassword, exportSalt);
      const exportEncrypted = await this.encryptWithKey(decrypted, exportKey);
      
      exportData[key] = {
        ...exportEncrypted,
        salt: exportSalt.toString('base64'),
        createdAt: secretData.createdAt,
        updatedAt: secretData.updatedAt
      };
    }

    return JSON.stringify({
      version: '1.0',
      algorithm: this.config.encryptionAlgorithm,
      secrets: exportData,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Import secrets
   */
  async importSecrets(exportData: string, importPassword: string): Promise<void> {
    const data = JSON.parse(exportData);
    
    if (data.version !== '1.0') {
      throw new Error('Unsupported export version');
    }

    for (const [key, secretData] of Object.entries(data.secrets as any)) {
      // Decrypt with import password
      const importSalt = Buffer.from(secretData.salt, 'base64');
      const importKey = await this.deriveKey(importPassword, importSalt);
      const decrypted = await this.decryptWithKey(secretData, importKey);
      
      // Store with current master key
      await this.setSecret(key, decrypted);
    }
  }

  /**
   * Encrypt data with master key
   */
  private async encrypt(data: string): Promise<{
    encrypted: string;
    iv: string;
    salt: string;
    algorithm: string;
    iterations: number;
  }> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    return await this.encryptWithKey(data, this.masterKey);
  }

  /**
   * Encrypt data with specific key
   */
  private async encryptWithKey(data: string, key: Buffer): Promise<{
    encrypted: string;
    iv: string;
    salt: string;
    algorithm: string;
    iterations: number;
  }> {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipher(this.config.encryptionAlgorithm, key);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      salt: '', // Salt is handled separately
      algorithm: this.config.encryptionAlgorithm,
      iterations: this.config.iterations
    };
  }

  /**
   * Decrypt data with master key
   */
  private async decrypt(secretData: EncryptedSecret): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not available');
    }

    return await this.decryptWithKey(secretData, this.masterKey);
  }

  /**
   * Decrypt data with specific key
   */
  private async decryptWithKey(secretData: EncryptedSecret, key: Buffer): Promise<string> {
    try {
      const decipher = crypto.createDecipher(secretData.algorithm, key);
      
      let decrypted = decipher.update(secretData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt secret: Invalid password or corrupted data');
    }
  }

  /**
   * Derive key from password
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        this.config.iterations,
        this.config.keyLength,
        'sha256',
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }

  /**
   * Get or create master salt
   */
  private async getOrCreateMasterSalt(): Promise<Buffer> {
    const saltPath = path.join(this.config.storageDir, '.master_salt');
    
    try {
      const saltData = await fs.readFile(saltPath);
      return saltData;
    } catch (error) {
      // Create new salt
      const salt = crypto.randomBytes(this.config.saltLength);
      await this.saveMasterSalt(salt);
      return salt;
    }
  }

  /**
   * Save master salt
   */
  private async saveMasterSalt(salt: Buffer): Promise<void> {
    const saltPath = path.join(this.config.storageDir, '.master_salt');
    await fs.writeFile(saltPath, salt, { mode: 0o600 });
  }

  /**
   * Load secrets from disk
   */
  private async loadSecrets(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storageDir);
      
      for (const file of files) {
        if (file.startsWith('.') || !file.endsWith('.json')) {
          continue;
        }

        const key = file.replace('.json', '');
        const secretPath = this.getSecretPath(key);
        
        try {
          const data = await fs.readFile(secretPath, 'utf8');
          const secretData: EncryptedSecret = JSON.parse(data);
          this.secrets.set(key, secretData);
        } catch (error) {
          console.warn(`Failed to load secret ${key}:`, error);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  /**
   * Save secret to disk
   */
  private async saveSecret(key: string, secretData: EncryptedSecret): Promise<void> {
    const secretPath = this.getSecretPath(key);
    await fs.writeFile(
      secretPath,
      JSON.stringify(secretData, null, 2),
      { mode: 0o600 }
    );
  }

  /**
   * Get secret file path
   */
  private getSecretPath(key: string): string {
    // Sanitize key for filename
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.config.storageDir, `${sanitizedKey}.json`);
  }
}