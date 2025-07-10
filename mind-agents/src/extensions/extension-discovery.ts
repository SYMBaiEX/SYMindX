/**
 * Extension Discovery System for SYMindX
 *
 * This module provides automatic discovery and registration of extensions,
 * making it easy for users to add new extensions without modifying core files.
 */

import * as fs from 'fs';
import * as path from 'path';

import { ModuleRegistry } from '../types/agent';
import { runtimeLogger } from '../utils/logger';

export interface ExtensionPackage {
  name: string;
  version: string;
  main: string;
  symindx?: {
    extension: {
      type: string;
      factory: string;
      autoRegister?: boolean;
    };
  };
}

export interface DiscoveredExtension {
  name: string;
  path: string;
  factory: string;
  type: string;
  packageInfo: ExtensionPackage;
}

/**
 * Extension Discovery Manager
 */
export class ExtensionDiscovery {
  private extensionsDir: string;
  private nodeModulesDir: string;

  constructor(projectRoot: string) {
    this.extensionsDir = path.join(projectRoot, 'src', 'extensions');
    this.nodeModulesDir = path.join(projectRoot, 'node_modules');
  }

  /**
   * Discover all available extensions
   */
  async discoverExtensions(): Promise<DiscoveredExtension[]> {
    const extensions: DiscoveredExtension[] = [];

    // 1. Discover built-in extensions (in src/extensions/)
    const builtInExtensions = await this.discoverBuiltInExtensions();
    extensions.push(...builtInExtensions);

    // 2. Discover node_modules extensions (packages with symindx.extension config)
    const nodeModuleExtensions = await this.discoverNodeModuleExtensions();
    extensions.push(...nodeModuleExtensions);

    // 3. Discover local extension packages (in extensions/ directory if it exists)
    const localExtensions = await this.discoverLocalExtensions();
    extensions.push(...localExtensions);

    runtimeLogger.info(`🔍 Discovered ${extensions.length} extensions`);
    return extensions;
  }

  /**
   * Discover built-in extensions in src/extensions/
   */
  private async discoverBuiltInExtensions(): Promise<DiscoveredExtension[]> {
    const extensions: DiscoveredExtension[] = [];

    try {
      if (!fs.existsSync(this.extensionsDir)) {
        return extensions;
      }

      const entries = fs.readdirSync(this.extensionsDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const extensionPath = path.join(this.extensionsDir, entry.name);
          const indexPath = path.join(extensionPath, 'index.ts');
          const packageJsonPath = path.join(extensionPath, 'package.json');

          if (fs.existsSync(indexPath)) {
            let packageInfo: ExtensionPackage = {
              name: entry.name,
              version: '1.0.0',
              main: 'index.ts',
            };

            // Try to load package.json if it exists
            if (fs.existsSync(packageJsonPath)) {
              try {
                const packageContent = fs.readFileSync(
                  packageJsonPath,
                  'utf-8'
                );
                packageInfo = JSON.parse(packageContent);
              } catch (error) {
                runtimeLogger.warn(
                  `⚠️ Failed to parse package.json for ${entry.name}:`,
                  error
                );
              }
            }

            // Check if package.json specifies a factory name
            let factoryName = `create${this.toPascalCase(entry.name)}Extension`;
            if (packageInfo.symindx?.extension?.factory) {
              factoryName = packageInfo.symindx.extension.factory;
            }

            extensions.push({
              name: entry.name,
              path: extensionPath,
              factory: factoryName,
              type: 'built-in',
              packageInfo,
            });
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn('⚠️ Failed to discover built-in extensions:', error);
    }

    return extensions;
  }

  /**
   * Discover extensions in node_modules (packages with symindx.extension config)
   */
  private async discoverNodeModuleExtensions(): Promise<DiscoveredExtension[]> {
    const extensions: DiscoveredExtension[] = [];

    try {
      if (!fs.existsSync(this.nodeModulesDir)) {
        return extensions;
      }

      const entries = fs.readdirSync(this.nodeModulesDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const packagePath = path.join(this.nodeModulesDir, entry.name);
          const packageJsonPath = path.join(packagePath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
              const packageInfo: ExtensionPackage = JSON.parse(packageContent);

              // Check if this is a SYMindX extension
              if (packageInfo.symindx?.extension) {
                const extensionConfig = packageInfo.symindx.extension;

                extensions.push({
                  name: packageInfo.name,
                  path: packagePath,
                  factory: extensionConfig.factory,
                  type: extensionConfig.type,
                  packageInfo,
                });
              }
            } catch (error) {
              // Ignore packages with invalid package.json
            }
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn(
        '⚠️ Failed to discover node_modules extensions:',
        error
      );
    }

    return extensions;
  }

  /**
   * Discover local extension packages (in project extensions/ directory)
   */
  private async discoverLocalExtensions(): Promise<DiscoveredExtension[]> {
    const extensions: DiscoveredExtension[] = [];
    const localExtensionsDir = path.join(
      path.dirname(this.extensionsDir),
      '..',
      'extensions'
    );

    try {
      if (!fs.existsSync(localExtensionsDir)) {
        return extensions;
      }

      const entries = fs.readdirSync(localExtensionsDir, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const extensionPath = path.join(localExtensionsDir, entry.name);
          const packageJsonPath = path.join(extensionPath, 'package.json');

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageContent = fs.readFileSync(packageJsonPath, 'utf-8');
              const packageInfo: ExtensionPackage = JSON.parse(packageContent);

              if (packageInfo.symindx?.extension) {
                const extensionConfig = packageInfo.symindx.extension;

                extensions.push({
                  name: packageInfo.name,
                  path: extensionPath,
                  factory: extensionConfig.factory,
                  type: extensionConfig.type,
                  packageInfo,
                });
              }
            } catch (error) {
              runtimeLogger.warn(
                `⚠️ Failed to parse package.json for local extension ${entry.name}:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      runtimeLogger.warn('⚠️ Failed to discover local extensions:', error);
    }

    return extensions;
  }

  /**
   * Auto-register discovered extensions with the registry
   */
  async autoRegisterExtensions(registry: ModuleRegistry): Promise<void> {
    const extensions = await this.discoverExtensions();
    const registeredExtensions: string[] = [];

    for (const extension of extensions) {
      try {
        // Only auto-register if explicitly enabled or it's a built-in extension
        const shouldAutoRegister =
          extension.packageInfo.symindx?.extension?.autoRegister !== false;

        if (shouldAutoRegister) {
          await this.registerExtension(registry, extension);
          registeredExtensions.push(extension.name);
        }
      } catch (error) {
        runtimeLogger.warn(
          `⚠️ Failed to auto-register extension ${extension.name}:`,
          error
        );
      }
    }

    if (registeredExtensions.length > 0) {
      runtimeLogger.info(
        `🔌 Extensions registered: ${registeredExtensions.join(', ')}`
      );
    }
  }

  /**
   * Register a specific extension with the registry
   */
  async registerExtension(
    registry: ModuleRegistry,
    extension: DiscoveredExtension
  ): Promise<void> {
    try {
      let modulePath: string;

      if (extension.type === 'built-in') {
        // Built-in extension - use relative import
        modulePath = path.join(extension.path, 'index');
      } else {
        // External extension - use the main field from package.json
        modulePath = path.join(
          extension.path,
          extension.packageInfo.main || 'index'
        );
      }

      const extensionModule = await import(modulePath);
      const factory = extensionModule[extension.factory];

      if (typeof factory === 'function') {
        registry.registerExtensionFactory(extension.name, factory);
        // Individual registration logs removed - summary logged after all registrations
      } else {
        runtimeLogger.warn(
          `⚠️ Extension ${extension.name} does not export factory function ${extension.factory}`
        );
      }
    } catch (error) {
      runtimeLogger.error(
        `❌ Failed to register extension ${extension.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

/**
 * Create extension discovery instance
 */
export function createExtensionDiscovery(
  projectRoot: string
): ExtensionDiscovery {
  return new ExtensionDiscovery(projectRoot);
}
