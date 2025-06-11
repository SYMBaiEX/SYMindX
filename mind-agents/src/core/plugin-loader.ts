/**
 * Plugin Loader for SYMindX
 * 
 * Handles dynamic loading and management of plugins/extensions.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { Extension, ExtensionContext } from '../types/extension.js';
import { Logger } from '../utils/logger.js';
import { PluginConfigManager, PluginManifest, PluginConfig } from './plugin-config.js';
import { PluginSecurityManager, SecurityContext } from './plugin-security.js';
import { 
  dynamicImport, 
  importPluginModule, 
  importWithHotReload,
  clearModuleCache 
} from '../utils/dynamic-import.js';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  manifest: PluginManifest;
  config: PluginConfig;
  path: string;
  loaded: boolean;
  instance?: Extension;
  loadTime?: number;
  error?: string;
  securityContext?: SecurityContext;
}

/**
 * Plugin factory function type
 */
export type PluginFactory = (context: ExtensionContext) => Extension | Promise<Extension>;

export class PluginLoader {
  private loadedPlugins: Map<string, PluginMetadata> = new Map();
  private pluginPaths: string[] = [];
  private configManager: PluginConfigManager;
  private securityManager: PluginSecurityManager;
  private logger: Logger;
  private context: ExtensionContext;

  constructor(
    context: ExtensionContext,
    configManager?: PluginConfigManager,
    securityManager?: PluginSecurityManager,
    logger?: Logger
  ) {
    this.context = context;
    this.configManager = configManager || new PluginConfigManager();
    this.securityManager = securityManager || new PluginSecurityManager();
    this.logger = logger || new Logger('PluginLoader');
  }

  /**
   * Initialize the plugin loader
   */
  async initialize(): Promise<void> {
    try {
      await this.configManager.loadSystemConfig();
      const systemConfig = this.configManager.getSystemConfig();
      
      // Add default plugins directory
      this.addPluginPath(systemConfig.pluginsDirectory);
      
      this.logger.info('Plugin loader initialized');
    } catch (error) {
      this.logger.error('Failed to initialize plugin loader:', error);
      throw error;
    }
  }

  /**
   * Add a directory to search for plugins
   */
  addPluginPath(pluginPath: string): void {
    const resolvedPath = path.resolve(pluginPath);
    if (!this.pluginPaths.includes(resolvedPath)) {
      this.pluginPaths.push(resolvedPath);
      this.logger.debug(`Added plugin path: ${resolvedPath}`);
    }
  }

  /**
   * Discover all plugins in registered paths
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];
    const systemConfig = this.configManager.getSystemConfig();

    for (const pluginPath of this.pluginPaths) {
      try {
        const entries = await fs.readdir(pluginPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginDir = path.join(pluginPath, entry.name);
            
            try {
              const manifest = await this.configManager.loadPluginManifest(pluginDir);
              
              // Validate manifest
              const validation = this.configManager.validateManifest(manifest);
              if (!validation.valid) {
                this.logger.warn(`Invalid manifest for ${entry.name}:`, validation.errors);
                continue;
              }
              
              // Security validation
              const securityValidation = await this.securityManager.validatePlugin(
                manifest.name,
                manifest,
                pluginDir
              );
              
              if (!securityValidation.valid) {
                this.logger.warn(`Security validation failed for ${manifest.name}:`, securityValidation.errors);
                if (!systemConfig.allowUnsafePlugins) {
                  continue;
                }
              }
              
              manifests.push(manifest);
              this.logger.debug(`Discovered plugin: ${manifest.name}`);
            } catch (error) {
              this.logger.warn(`Failed to load manifest from ${pluginDir}:`, error);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to scan plugin directory ${pluginPath}:`, error);
      }
    }

    this.logger.info(`Discovered ${manifests.length} plugins`);
    return manifests;
  }

  /**
   * Scan a directory for plugin manifests
   */
  private async scanDirectory(dirPath: string): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = []
    
    try {
      await fs.access(dirPath)
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginDir = join(dirPath, entry.name)
          const manifestPath = join(pluginDir, 'plugin.json')
          
          try {
            await fs.access(manifestPath)
            const manifestData = await fs.readFile(manifestPath, 'utf-8')
            const manifest = JSON.parse(manifestData) as PluginManifest
            
            // Validate manifest
            if (this.validateManifest(manifest)) {
              manifest.enabled = manifest.enabled ?? true
              manifests.push(manifest)
            } else {
              console.warn(`⚠️ Invalid plugin manifest: ${manifestPath}`)
            }
          } catch (error) {
            // No manifest file or invalid JSON, skip
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be accessed
    }
    
    return manifests
  }

  /**
   * Validate a plugin manifest
   */
  private validateManifest(manifest: any): manifest is PluginManifest {
    return (
      typeof manifest === 'object' &&
      typeof manifest.id === 'string' &&
      typeof manifest.name === 'string' &&
      typeof manifest.version === 'string' &&
      typeof manifest.type === 'string' &&
      typeof manifest.main === 'string' &&
      ['extension', 'module', 'portal'].includes(manifest.type)
    )
  }

  /**
   * Load a plugin by name
   */
  async loadPlugin(pluginName: string): Promise<PluginMetadata> {
    const startTime = Date.now();
    
    try {
      // Check if already loaded
      if (this.loadedPlugins.has(pluginName)) {
        const existing = this.loadedPlugins.get(pluginName)!;
        this.logger.debug(`Plugin ${pluginName} already loaded`);
        return existing;
      }
      
      // Find plugin manifest
      const manifests = await this.discoverPlugins();
      const manifest = manifests.find(m => m.name === pluginName);
      
      if (!manifest) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }
      
      // Check if plugin is enabled
      if (!this.configManager.isPluginEnabled(pluginName)) {
        throw new Error(`Plugin is disabled: ${pluginName}`);
      }
      
      // Load plugin configuration
      const pluginPath = await this.findPluginPath(pluginName);
      const config = await this.configManager.loadPluginConfig(pluginPath, pluginName);
      
      // Create security context
      const securityContext = await this.securityManager.createSecurityContext(
        pluginName,
        manifest,
        pluginPath
      );
      
      // Validate dependencies
      const loadedPluginNames = new Set(this.loadedPlugins.keys());
      const depValidation = this.configManager.validateDependencies(pluginName, loadedPluginNames);
      
      if (!depValidation.valid && this.configManager.getSystemConfig().validateDependencies) {
        throw new Error(`Missing dependencies for ${pluginName}: ${depValidation.missing.join(', ')}`);
      }
      
      // Load the plugin module
      const mainPath = path.join(pluginPath, manifest.main);
      
      let module: any;
      if (config.hotReload) {
        module = await importWithHotReload(mainPath, true);
      } else {
        module = await importPluginModule(pluginPath, manifest.main);
      }
      
      // Create plugin instance
      let instance: Extension;
      if (typeof module.createPlugin === 'function') {
        instance = await module.createPlugin(this.context);
      } else {
        throw new Error(`Plugin ${pluginName} must export a createPlugin function`);
      }
      
      // Initialize the plugin
      if (typeof instance.init === 'function') {
        await Promise.race([
          instance.init(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Plugin initialization timeout')), config.loadTimeout)
          )
        ]);
      }
      
      const loadTime = Date.now() - startTime;
      
      const pluginMetadata: PluginMetadata = {
        manifest,
        config,
        path: pluginPath,
        loaded: true,
        instance,
        loadTime,
        securityContext
      };
      
      this.loadedPlugins.set(pluginName, pluginMetadata);
      
      this.logger.info(`Loaded plugin: ${manifest.name} v${manifest.version} (${loadTime}ms)`);
      return pluginMetadata;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const pluginMetadata: PluginMetadata = {
        manifest: { name: pluginName } as PluginManifest,
        config: this.configManager.getPluginConfig(pluginName),
        path: '',
        loaded: false,
        error: errorMessage,
        loadTime: Date.now() - startTime
      };
      
      this.loadedPlugins.set(pluginName, pluginMetadata);
      this.logger.error(`Failed to load plugin ${pluginName}:`, error);
      throw error;
    }
  }

  /**
   * Find plugin path by name
   */
  private async findPluginPath(pluginName: string): Promise<string> {
    for (const searchPath of this.pluginPaths) {
      const candidatePath = path.join(searchPath, pluginName);
      try {
        await fs.access(candidatePath);
        return candidatePath;
      } catch {
        // Continue searching
      }
    }
    
    throw new Error(`Plugin directory not found: ${pluginName}`);
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    failed: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    averageLoadTime: number;
  } {
    const plugins = Array.from(this.loadedPlugins.values());
    
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalLoadTime = 0;
    let loadedCount = 0;
    
    plugins.forEach(plugin => {
      // Count by type
      const type = plugin.manifest.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
      
      // Count by status
      const status = plugin.loaded ? 'loaded' : 'failed';
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      // Calculate average load time
      if (plugin.loaded && plugin.loadTime) {
        totalLoadTime += plugin.loadTime;
        loadedCount++;
      }
    });
    
    return {
      total: plugins.length,
      loaded: byStatus.loaded || 0,
      failed: byStatus.failed || 0,
      byType,
      byStatus,
      averageLoadTime: loadedCount > 0 ? totalLoadTime / loadedCount : 0
    };
  }

  /**
   * Enable or disable a plugin
   */
  setPluginEnabled(pluginName: string, enabled: boolean): void {
    this.configManager.setPluginEnabled(pluginName, enabled);
    this.logger.info(`Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get plugin configuration manager
   */
  getConfigManager(): PluginConfigManager {
    return this.configManager;
  }

  /**
   * Get plugin security manager
   */
  getSecurityManager(): PluginSecurityManager {
    return this.securityManager;
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    const pluginNames = Array.from(this.loadedPlugins.keys());
    
    this.logger.info('Cleaning up all plugins...');
    
    for (const pluginName of pluginNames) {
      try {
        await this.unloadPlugin(pluginName);
      } catch (error) {
        this.logger.error(`Failed to cleanup plugin ${pluginName}:`, error);
      }
    }
    
    this.loadedPlugins.clear();
    this.logger.info('Plugin cleanup completed');
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<boolean> {
    const pluginMetadata = this.loadedPlugins.get(pluginName);
    
    if (!pluginMetadata) {
      this.logger.warn(`Plugin '${pluginName}' is not loaded`);
      return false;
    }
    
    try {
      // Call cleanup if available
      if (pluginMetadata.instance && typeof pluginMetadata.instance.cleanup === 'function') {
        await pluginMetadata.instance.cleanup();
      }
      
      // Clear module cache for hot reload
      if (pluginMetadata.config.hotReload && pluginMetadata.path) {
        const mainPath = path.join(pluginMetadata.path, pluginMetadata.manifest.main);
        clearModuleCache(mainPath);
      }
      
      // Clear security context
      this.securityManager.clearContext(pluginName);
      
      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginName);
      
      this.logger.info(`Unloaded plugin: ${pluginMetadata.manifest.name}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to unload plugin '${pluginName}':`, error);
      
      // Update metadata with error
      pluginMetadata.error = error instanceof Error ? error.message : String(error);
      pluginMetadata.loaded = false;
      
      return false;
    }
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginName: string): Promise<PluginMetadata> {
    this.logger.info(`Reloading plugin: ${pluginName}`);
    
    // Unload first
    await this.unloadPlugin(pluginName);
    
    // Load again
    return this.loadPlugin(pluginName);
  }

  /**
   * Load multiple plugins
   */
  async loadPlugins(pluginNames: string[]): Promise<PluginMetadata[]> {
    const systemConfig = this.configManager.getSystemConfig();
    const results: PluginMetadata[] = [];
    
    // Get load order based on dependencies and priority
    const orderedNames = this.configManager.getLoadOrder(pluginNames);
    
    // Load plugins in batches to respect concurrency limits
    for (let i = 0; i < orderedNames.length; i += systemConfig.maxConcurrentLoads) {
      const batch = orderedNames.slice(i, i + systemConfig.maxConcurrentLoads);
      
      const batchPromises = batch.map(async (name) => {
        try {
          return await this.loadPlugin(name);
        } catch (error) {
          this.logger.error(`Failed to load plugin ${name} in batch:`, error);
          throw error;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }
    
    return results;
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): PluginMetadata[] {
    return Array.from(this.loadedPlugins.values()).filter(p => p.loaded);
  }

  /**
   * Get all plugins (loaded and failed)
   */
  getAllPlugins(): PluginMetadata[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get plugin by name
   */
  getPlugin(pluginName: string): PluginMetadata | undefined {
    return this.loadedPlugins.get(pluginName);
  }

  /**
   * Check if plugin is loaded
   */
  isPluginLoaded(pluginName: string): boolean {
    const plugin = this.loadedPlugins.get(pluginName);
    return plugin?.loaded === true;
  }

  /**
   * Get available plugins (discovered but not necessarily loaded)
   */
  async getAvailablePlugins(): Promise<PluginManifest[]> {
    return this.discoverPlugins();
  }


}

/**
 * Create a new PluginLoader instance
 */
export function createPluginLoader(
  context: ExtensionContext,
  options: {
    configManager?: PluginConfigManager;
    securityManager?: PluginSecurityManager;
    logger?: Logger;
  } = {}
): PluginLoader {
  return new PluginLoader(
    context,
    options.configManager,
    options.securityManager,
    options.logger
  );
}

/**
 * Default plugin loader instance
 */
let defaultPluginLoader: PluginLoader | null = null;

/**
 * Get or create the default plugin loader instance
 */
export function getDefaultPluginLoader(context?: ExtensionContext): PluginLoader {
  if (!defaultPluginLoader) {
    if (!context) {
      throw new Error('ExtensionContext is required to create default PluginLoader');
    }
    defaultPluginLoader = createPluginLoader(context);
  }
  return defaultPluginLoader;
}

/**
 * Reset the default plugin loader instance
 */
export function resetDefaultPluginLoader(): void {
  defaultPluginLoader = null;
}