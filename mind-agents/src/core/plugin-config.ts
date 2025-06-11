/**
 * Plugin Configuration Manager
 * 
 * Handles plugin configuration loading, validation, and management.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';

/**
 * Plugin manifest schema for validation
 */
export const PluginManifestSchema = z.object({
  name: z.string().min(1, 'Plugin name is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow semver format'),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  repository: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  type: z.enum(['extension', 'skill', 'portal', 'memory', 'utility']),
  main: z.string().min(1, 'Main file is required'),
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  engines: z.object({
    node: z.string().optional(),
    symindx: z.string().optional()
  }).optional(),
  config: z.record(z.any()).optional(),
  permissions: z.array(z.string()).optional(),
  platforms: z.array(z.enum(['linux', 'darwin', 'win32'])).optional(),
  disabled: z.boolean().optional().default(false)
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/**
 * Plugin configuration schema
 */
export const PluginConfigSchema = z.object({
  enabled: z.boolean().default(true),
  autoLoad: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(50),
  config: z.record(z.any()).optional(),
  environment: z.enum(['development', 'production', 'test']).optional(),
  dependencies: z.array(z.string()).optional(),
  loadTimeout: z.number().min(1000).default(30000),
  retryAttempts: z.number().min(0).max(5).default(3),
  hotReload: z.boolean().default(false)
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

/**
 * Global plugin system configuration
 */
export const PluginSystemConfigSchema = z.object({
  pluginsDirectory: z.string().default('./plugins'),
  autoDiscovery: z.boolean().default(true),
  maxConcurrentLoads: z.number().min(1).max(20).default(5),
  enableHotReload: z.boolean().default(false),
  validateDependencies: z.boolean().default(true),
  allowUnsafePlugins: z.boolean().default(false),
  defaultTimeout: z.number().min(1000).default(30000),
  maxRetries: z.number().min(0).max(10).default(3),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableMetrics: z.boolean().default(true),
  sandboxMode: z.boolean().default(false)
});

export type PluginSystemConfig = z.infer<typeof PluginSystemConfigSchema>;

/**
 * Plugin configuration manager class
 */
export class PluginConfigManager {
  private systemConfig: PluginSystemConfig;
  private pluginConfigs: Map<string, PluginConfig> = new Map();
  private manifests: Map<string, PluginManifest> = new Map();
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'plugin-config.json');
    this.systemConfig = PluginSystemConfigSchema.parse({});
  }

  /**
   * Load system configuration from file
   */
  async loadSystemConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(configData);
      this.systemConfig = PluginSystemConfigSchema.parse(rawConfig);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to load plugin system config: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Use default config if file doesn't exist
    }
  }

  /**
   * Save system configuration to file
   */
  async saveSystemConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.systemConfig, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save plugin system config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get system configuration
   */
  getSystemConfig(): PluginSystemConfig {
    return { ...this.systemConfig };
  }

  /**
   * Update system configuration
   */
  updateSystemConfig(updates: Partial<PluginSystemConfig>): void {
    this.systemConfig = PluginSystemConfigSchema.parse({
      ...this.systemConfig,
      ...updates
    });
  }

  /**
   * Load plugin manifest from directory
   */
  async loadPluginManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'plugin.json');
    
    try {
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const rawManifest = JSON.parse(manifestData);
      const manifest = PluginManifestSchema.parse(rawManifest);
      
      this.manifests.set(manifest.name, manifest);
      return manifest;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Plugin manifest not found: ${manifestPath}`);
      }
      throw new Error(`Failed to load plugin manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate plugin manifest
   */
  validateManifest(manifest: any): { valid: boolean; errors: string[] } {
    try {
      PluginManifestSchema.parse(manifest);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginName: string): PluginConfig {
    return this.pluginConfigs.get(pluginName) || PluginConfigSchema.parse({});
  }

  /**
   * Set plugin configuration
   */
  setPluginConfig(pluginName: string, config: Partial<PluginConfig>): void {
    const currentConfig = this.getPluginConfig(pluginName);
    const newConfig = PluginConfigSchema.parse({
      ...currentConfig,
      ...config
    });
    this.pluginConfigs.set(pluginName, newConfig);
  }

  /**
   * Load plugin configuration from file
   */
  async loadPluginConfig(pluginPath: string, pluginName: string): Promise<PluginConfig> {
    const configPath = path.join(pluginPath, 'config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(configData);
      const config = PluginConfigSchema.parse(rawConfig);
      
      this.pluginConfigs.set(pluginName, config);
      return config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Use default config if file doesn't exist
        const defaultConfig = PluginConfigSchema.parse({});
        this.pluginConfigs.set(pluginName, defaultConfig);
        return defaultConfig;
      }
      throw new Error(`Failed to load plugin config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save plugin configuration to file
   */
  async savePluginConfig(pluginPath: string, pluginName: string): Promise<void> {
    const config = this.getPluginConfig(pluginName);
    const configPath = path.join(pluginPath, 'config.json');
    
    try {
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configData, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save plugin config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(pluginName: string): boolean {
    const config = this.getPluginConfig(pluginName);
    const manifest = this.manifests.get(pluginName);
    
    return config.enabled && !manifest?.disabled;
  }

  /**
   * Enable or disable a plugin
   */
  setPluginEnabled(pluginName: string, enabled: boolean): void {
    this.setPluginConfig(pluginName, { enabled });
  }

  /**
   * Get plugin manifest
   */
  getPluginManifest(pluginName: string): PluginManifest | undefined {
    return this.manifests.get(pluginName);
  }

  /**
   * Get all plugin manifests
   */
  getAllManifests(): Map<string, PluginManifest> {
    return new Map(this.manifests);
  }

  /**
   * Get all plugin configurations
   */
  getAllConfigs(): Map<string, PluginConfig> {
    return new Map(this.pluginConfigs);
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(pluginName: string, availablePlugins: Set<string>): { valid: boolean; missing: string[] } {
    const config = this.getPluginConfig(pluginName);
    const manifest = this.getPluginManifest(pluginName);
    
    const dependencies = [
      ...(config.dependencies || []),
      ...(manifest?.dependencies ? Object.keys(manifest.dependencies) : [])
    ];
    
    const missing = dependencies.filter(dep => !availablePlugins.has(dep));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Get plugin load order based on dependencies using topological sorting
   */
  getLoadOrder(pluginNames: string[]): string[] {
    const plugins = pluginNames
      .map(name => ({
        name,
        config: this.getPluginConfig(name),
        manifest: this.getPluginManifest(name)
      }))
      .filter((p): p is { name: string; config: PluginConfig; manifest: PluginManifest } => 
        p.config !== null && p.manifest !== null
      );
    
    // Build dependency graph
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph and in-degree count
    for (const plugin of plugins) {
      graph.set(plugin.name, []);
      inDegree.set(plugin.name, 0);
    }
    
    // Build edges based on dependencies
    for (const plugin of plugins) {
      const dependencies = plugin.manifest.dependencies || {};
      const depNames = Object.keys(dependencies);
      for (const dep of depNames) {
        if (graph.has(dep)) {
          graph.get(dep)!.push(plugin.name);
          inDegree.set(plugin.name, (inDegree.get(plugin.name) || 0) + 1);
        }
      }
    }
    
    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];
    
    // Find all nodes with no incoming edges
    inDegree.forEach((degree, plugin) => {
      if (degree === 0) {
        queue.push(plugin);
      }
    });
    
    // Process queue
    while (queue.length > 0) {
      // Sort queue by priority for deterministic ordering
      queue.sort((a, b) => {
        const priorityA = plugins.find(p => p.name === a)?.config.priority || 0;
        const priorityB = plugins.find(p => p.name === b)?.config.priority || 0;
        return priorityB - priorityA; // Higher priority first
      });
      
      const current = queue.shift()!;
      result.push(current);
      
      // Remove edges from current node
      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    // Check for circular dependencies
    if (result.length !== plugins.length) {
      const remaining = plugins.filter(p => !result.includes(p.name)).map(p => p.name);
      throw new Error(`Circular dependency detected in plugins: ${remaining.join(', ')}`);
    }
    
    return result;
  }

  /**
   * Check platform compatibility
   */
  isPlatformCompatible(pluginName: string): boolean {
    const manifest = this.getPluginManifest(pluginName);
    
    if (!manifest?.platforms) {
      return true; // No platform restrictions
    }
    
    return manifest.platforms.includes(process.platform as any);
  }

  /**
   * Check Node.js version compatibility
   */
  isNodeVersionCompatible(pluginName: string): boolean {
    const manifest = this.getPluginManifest(pluginName);
    
    if (!manifest?.engines?.node) {
      return true; // No Node.js version restrictions
    }
    
    // Simple version check (could be enhanced with semver)
    const requiredVersion = manifest.engines.node;
    const currentVersion = process.version;
    
    // Basic compatibility check
    return currentVersion >= requiredVersion;
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    totalPlugins: number;
    enabledPlugins: number;
    disabledPlugins: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const manifests = Array.from(this.manifests.values());
    const configs = Array.from(this.pluginConfigs.values());
    
    const enabled = manifests.filter(m => this.isPluginEnabled(m.name)).length;
    
    const byType: Record<string, number> = {};
    manifests.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });
    
    const byPriority: Record<string, number> = {};
    configs.forEach(c => {
      const range = Math.floor(c.priority / 10) * 10;
      const key = `${range}-${range + 9}`;
      byPriority[key] = (byPriority[key] || 0) + 1;
    });
    
    return {
      totalPlugins: manifests.length,
      enabledPlugins: enabled,
      disabledPlugins: manifests.length - enabled,
      byType,
      byPriority
    };
  }

  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.pluginConfigs.clear();
    this.manifests.clear();
  }

  /**
   * Export configuration for backup
   */
  exportConfig(): {
    system: PluginSystemConfig;
    plugins: Record<string, PluginConfig>;
    manifests: Record<string, PluginManifest>;
  } {
    return {
      system: this.systemConfig,
      plugins: Object.fromEntries(this.pluginConfigs),
      manifests: Object.fromEntries(this.manifests)
    };
  }

  /**
   * Import configuration from backup
   */
  importConfig(data: {
    system?: PluginSystemConfig;
    plugins?: Record<string, PluginConfig>;
    manifests?: Record<string, PluginManifest>;
  }): void {
    if (data.system) {
      this.systemConfig = PluginSystemConfigSchema.parse(data.system);
    }
    
    if (data.plugins) {
      this.pluginConfigs.clear();
      Object.entries(data.plugins).forEach(([name, config]) => {
        this.pluginConfigs.set(name, PluginConfigSchema.parse(config));
      });
    }
    
    if (data.manifests) {
      this.manifests.clear();
      Object.entries(data.manifests).forEach(([name, manifest]) => {
        this.manifests.set(name, PluginManifestSchema.parse(manifest));
      });
    }
  }
}

/**
 * Create a new plugin configuration manager
 */
export function createPluginConfigManager(configPath?: string): PluginConfigManager {
  return new PluginConfigManager(configPath);
}

/**
 * Default plugin configuration manager instance
 */
export const defaultPluginConfigManager = createPluginConfigManager();