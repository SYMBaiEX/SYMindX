/**
 * Plugin Security Manager
 * 
 * Handles plugin security, sandboxing, and permission management.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PluginManifest } from './plugin-config.js';

/**
 * Available permissions for plugins
 */
export enum PluginPermission {
  // File system permissions
  READ_FILES = 'fs:read',
  WRITE_FILES = 'fs:write',
  DELETE_FILES = 'fs:delete',
  CREATE_DIRECTORIES = 'fs:mkdir',
  
  // Network permissions
  NETWORK_REQUEST = 'network:request',
  NETWORK_SERVER = 'network:server',
  
  // System permissions
  EXECUTE_COMMANDS = 'system:exec',
  ENVIRONMENT_VARIABLES = 'system:env',
  PROCESS_CONTROL = 'system:process',
  
  // Runtime permissions
  DYNAMIC_IMPORT = 'runtime:import',
  EVAL_CODE = 'runtime:eval',
  
  // Event system permissions
  PUBLISH_EVENTS = 'events:publish',
  SUBSCRIBE_EVENTS = 'events:subscribe',
  
  // Plugin system permissions
  LOAD_PLUGINS = 'plugins:load',
  UNLOAD_PLUGINS = 'plugins:unload',
  MANAGE_PLUGINS = 'plugins:manage',
  
  // Data access permissions
  READ_CONFIG = 'data:config:read',
  WRITE_CONFIG = 'data:config:write',
  READ_MEMORY = 'data:memory:read',
  WRITE_MEMORY = 'data:memory:write',
  
  // Special permissions
  UNSAFE_OPERATIONS = 'unsafe:all'
}

/**
 * Security context for plugin execution
 */
export interface SecurityContext {
  pluginName: string;
  permissions: Set<PluginPermission>;
  sandboxed: boolean;
  trustedOrigin: boolean;
  checksum?: string;
  signature?: string;
}

/**
 * Trusted key data for signature verification
 */
export interface TrustedKeyData {
  keyId: string;
  publicKey: string;
  algorithm: 'RSA' | 'ECDSA';
  description?: string;
}

/**
 * Security policy configuration
 */
export interface SecurityPolicy {
  enforcePermissions: boolean;
  requireSignatures: boolean;
  allowUnsafeOperations: boolean;
  sandboxByDefault: boolean;
  trustedOrigins: string[];
  maxFileSize: number;
  allowedFileExtensions: string[];
  blockedPaths: string[];
  networkWhitelist: string[];
  networkBlacklist: string[];
  trustedKeys?: TrustedKeyData[];
}

/**
 * Plugin security manager class
 */
export class PluginSecurityManager {
  private policy: SecurityPolicy;
  private contexts: Map<string, SecurityContext> = new Map();
  private trustedKeys: Set<string> = new Set();

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      enforcePermissions: true,
      requireSignatures: false,
      allowUnsafeOperations: false,
      sandboxByDefault: true,
      trustedOrigins: [],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileExtensions: ['.js', '.ts', '.json', '.md'],
      blockedPaths: ['/etc', '/sys', '/proc', '/dev'],
      networkWhitelist: [],
      networkBlacklist: ['localhost', '127.0.0.1', '0.0.0.0'],
      ...policy
    };
  }

  /**
   * Create security context for a plugin
   */
  async createSecurityContext(
    pluginName: string,
    manifest: PluginManifest,
    pluginPath: string
  ): Promise<SecurityContext> {
    const permissions = this.parsePermissions(manifest.permissions || []);
    const trustedOrigin = this.isTrustedOrigin(manifest.author || '', manifest.repository || '');
    const sandboxed = this.policy.sandboxByDefault && !trustedOrigin;
    
    // Calculate plugin checksum
    const checksum = await this.calculatePluginChecksum(pluginPath);
    
    const context: SecurityContext = {
      pluginName,
      permissions,
      sandboxed,
      trustedOrigin,
      checksum
    };
    
    // Verify signature if required
    if (this.policy.requireSignatures) {
      context.signature = await this.verifyPluginSignature(pluginPath);
    }
    
    this.contexts.set(pluginName, context);
    return context;
  }

  /**
   * Parse permission strings into permission enum values
   */
  private parsePermissions(permissionStrings: string[]): Set<PluginPermission> {
    const permissions = new Set<PluginPermission>();
    
    for (const permStr of permissionStrings) {
      const permission = Object.values(PluginPermission).find(p => p === permStr);
      if (permission) {
        permissions.add(permission);
      }
    }
    
    return permissions;
  }

  /**
   * Check if origin is trusted
   */
  private isTrustedOrigin(author: string, repository: string): boolean {
    return this.policy.trustedOrigins.some(origin => 
      author.includes(origin) || repository.includes(origin)
    );
  }

  /**
   * Calculate checksum for plugin files
   */
  private async calculatePluginChecksum(pluginPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    
    try {
      const files = await this.getPluginFiles(pluginPath);
      
      for (const file of files.sort()) {
        const content = await fs.readFile(file);
        hash.update(content);
      }
      
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate plugin checksum: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all files in plugin directory
   */
  private async getPluginFiles(pluginPath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await traverse(pluginPath);
    return files;
  }

  /**
   * Verify plugin signature using cryptographic verification
   */
  private async verifyPluginSignature(pluginPath: string): Promise<string | undefined> {
    const signaturePath = path.join(pluginPath, 'plugin.sig');
    
    try {
      const signature = await fs.readFile(signaturePath, 'utf-8');
      
      // Read plugin files for verification
      const files = await this.getPluginFiles(pluginPath);
      let content = '';
      
      for (const file of files.sort()) {
        const fileContent = await fs.readFile(file);
        content += fileContent.toString();
      }
      
      // Get trusted public keys from security policy
      const trustedKeys = this.policy.trustedKeys || [];
      
      if (trustedKeys.length === 0) {
        console.warn('No trusted keys configured for signature verification');
        return signature; // Return signature without verification if no keys
      }
      
      // Try to verify signature with each trusted key
      for (const keyData of trustedKeys) {
        try {
          // Parse the signature (base64 encoded)
          const signatureBuffer = Buffer.from(signature, 'base64');
          
          // Create verifier based on algorithm
          const algorithm = keyData.algorithm === 'ECDSA' ? 'SHA256' : 'RSA-SHA256';
          const verifier = crypto.createVerify(algorithm);
          verifier.update(content);
          
          // Verify signature
          const isValid = verifier.verify({
            key: keyData.publicKey,
            format: 'pem'
          }, signatureBuffer);
          
          if (isValid) {
            console.info(`Plugin signature verified with key: ${keyData.keyId}`);
            return signature;
          }
        } catch (keyError) {
          console.debug(`Signature verification failed with key ${keyData.keyId}:`, keyError);
          continue;
        }
      }
      
      throw new Error('Plugin signature verification failed with all trusted keys');
    } catch (error) {
      if (this.policy.requireSignatures) {
        throw new Error(`Plugin signature required but verification failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return undefined;
    }
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginName: string, permission: PluginPermission): boolean {
    if (!this.policy.enforcePermissions) {
      return true;
    }
    
    const context = this.contexts.get(pluginName);
    if (!context) {
      return false;
    }
    
    // Check for unsafe operations
    if (permission === PluginPermission.UNSAFE_OPERATIONS) {
      return this.policy.allowUnsafeOperations && context.trustedOrigin;
    }
    
    return context.permissions.has(permission) || context.permissions.has(PluginPermission.UNSAFE_OPERATIONS);
  }

  /**
   * Validate file access
   */
  validateFileAccess(
    pluginName: string,
    filePath: string,
    operation: 'read' | 'write' | 'delete'
  ): boolean {
    const permission = {
      read: PluginPermission.READ_FILES,
      write: PluginPermission.WRITE_FILES,
      delete: PluginPermission.DELETE_FILES
    }[operation];
    
    if (!this.hasPermission(pluginName, permission)) {
      return false;
    }
    
    // Check blocked paths
    const normalizedPath = path.normalize(filePath);
    if (this.policy.blockedPaths.some(blocked => normalizedPath.startsWith(blocked))) {
      return false;
    }
    
    // Check file extension
    const ext = path.extname(filePath);
    if (this.policy.allowedFileExtensions.length > 0 && !this.policy.allowedFileExtensions.includes(ext)) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate network access
   */
  validateNetworkAccess(
    pluginName: string,
    url: string,
    operation: 'request' | 'server'
  ): boolean {
    const permission = operation === 'request' 
      ? PluginPermission.NETWORK_REQUEST 
      : PluginPermission.NETWORK_SERVER;
    
    if (!this.hasPermission(pluginName, permission)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check blacklist
      if (this.policy.networkBlacklist.includes(hostname)) {
        return false;
      }
      
      // Check whitelist (if configured)
      if (this.policy.networkWhitelist.length > 0) {
        return this.policy.networkWhitelist.includes(hostname);
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate command execution
   */
  validateCommandExecution(pluginName: string, command: string): boolean {
    if (!this.hasPermission(pluginName, PluginPermission.EXECUTE_COMMANDS)) {
      return false;
    }
    
    // Block dangerous commands
    const dangerousCommands = ['rm', 'del', 'format', 'fdisk', 'mkfs', 'dd'];
    const commandName = command.split(' ')[0].toLowerCase();
    
    return !dangerousCommands.includes(commandName);
  }

  /**
   * Create sandboxed execution context
   */
  createSandbox(pluginName: string): any {
    const context = this.contexts.get(pluginName);
    if (!context || !context.sandboxed) {
      return global; // No sandbox
    }
    
    // Create limited global context
    const sandbox: any = {
      console: {
        log: (...args: any[]) => console.log(`[${pluginName}]`, ...args),
        error: (...args: any[]) => console.error(`[${pluginName}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${pluginName}]`, ...args),
        info: (...args: any[]) => console.info(`[${pluginName}]`, ...args)
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Buffer,
      process: {
        env: this.hasPermission(pluginName, PluginPermission.ENVIRONMENT_VARIABLES) 
          ? process.env 
          : {},
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    // Add conditional APIs based on permissions
    if (this.hasPermission(pluginName, PluginPermission.READ_FILES)) {
      sandbox.require = (id: string) => {
        // Limited require function
        const allowedModules = ['path', 'crypto', 'util', 'events'];
        if (allowedModules.includes(id)) {
          return require(id);
        }
        throw new Error(`Module '${id}' not allowed in sandbox`);
      };
    }
    
    return sandbox;
  }

  /**
   * Validate plugin before loading
   */
  async validatePlugin(
    pluginName: string,
    manifest: PluginManifest,
    pluginPath: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check file size limits
      const stats = await fs.stat(pluginPath);
      if (stats.size > this.policy.maxFileSize) {
        errors.push(`Plugin exceeds maximum file size: ${stats.size} > ${this.policy.maxFileSize}`);
      }
      
      // Validate permissions
      const requestedPermissions = manifest.permissions || [];
      for (const permission of requestedPermissions) {
        if (!Object.values(PluginPermission).includes(permission as PluginPermission)) {
          errors.push(`Unknown permission requested: ${permission}`);
        }
        
        if (permission === PluginPermission.UNSAFE_OPERATIONS && !this.policy.allowUnsafeOperations) {
          errors.push('Unsafe operations not allowed by security policy');
        }
      }
      
      // Check for required signature
      if (this.policy.requireSignatures) {
        const signaturePath = path.join(pluginPath, 'signature.sig');
        try {
          await fs.access(signaturePath);
        } catch {
          errors.push('Plugin signature required but not found');
        }
      }
      
      // Validate file extensions
      const files = await this.getPluginFiles(pluginPath);
      for (const file of files) {
        const ext = path.extname(file);
        if (!this.policy.allowedFileExtensions.includes(ext)) {
          errors.push(`File with disallowed extension: ${file}`);
        }
      }
      
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get security context for plugin
   */
  getSecurityContext(pluginName: string): SecurityContext | undefined {
    return this.contexts.get(pluginName);
  }

  /**
   * Update security policy
   */
  updatePolicy(updates: Partial<SecurityPolicy>): void {
    this.policy = { ...this.policy, ...updates };
  }

  /**
   * Get current security policy
   */
  getPolicy(): SecurityPolicy {
    return { ...this.policy };
  }

  /**
   * Add trusted key for signature verification
   */
  addTrustedKey(key: string): void {
    this.trustedKeys.add(key);
  }

  /**
   * Remove trusted key
   */
  removeTrustedKey(key: string): void {
    this.trustedKeys.delete(key);
  }

  /**
   * Clear security context for plugin
   */
  clearContext(pluginName: string): void {
    this.contexts.delete(pluginName);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalContexts: number;
    sandboxedPlugins: number;
    trustedPlugins: number;
    permissionCounts: Record<string, number>;
  } {
    const contexts = Array.from(this.contexts.values());
    
    const permissionCounts: Record<string, number> = {};
    contexts.forEach(context => {
      context.permissions.forEach(permission => {
        permissionCounts[permission] = (permissionCounts[permission] || 0) + 1;
      });
    });
    
    return {
      totalContexts: contexts.length,
      sandboxedPlugins: contexts.filter(c => c.sandboxed).length,
      trustedPlugins: contexts.filter(c => c.trustedOrigin).length,
      permissionCounts
    };
  }
}

/**
 * Create a new plugin security manager
 */
export function createPluginSecurityManager(policy?: Partial<SecurityPolicy>): PluginSecurityManager {
  return new PluginSecurityManager(policy);
}

/**
 * Default plugin security manager instance
 */
export const defaultPluginSecurityManager = createPluginSecurityManager();