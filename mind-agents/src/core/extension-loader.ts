/**
 * Extension Loader
 *
 * Manages dynamic extension loading for the SYMindX runtime
 */

import { runtimeLogger } from '../utils/logger';

export interface ExtensionStats {
  loaded: number;
  failed: number;
  total: number;
  extensions: string[];
}

export interface ExtensionInfo {
  name: string;
  version: string;
  init?: () => Promise<void>;
  enabled: boolean;
}

export class ExtensionLoader {
  private extensions: Map<string, ExtensionInfo> = new Map();
  private loadedCount = 0;
  private failedCount = 0;

  constructor() {
    // Initialize with empty extension registry
  }

  /**
   * Load an extension
   */
  async loadExtension(name: string, extension: ExtensionInfo): Promise<void> {
    try {
      if (extension.init) {
        await extension.init();
      }
      this.extensions.set(name, extension);
      this.loadedCount++;
      runtimeLogger.info(`✅ Extension loaded: ${name} v${extension.version}`);
    } catch (error) {
      void error;
      this.failedCount++;
      runtimeLogger.error(`❌ Failed to load extension ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get extension by name
   */
  getExtension(name: string): ExtensionInfo | undefined {
    return this.extensions.get(name);
  }

  /**
   * Get all loaded extensions
   */
  getExtensions(): Map<string, ExtensionInfo> {
    return this.extensions;
  }

  /**
   * Get extension statistics
   */
  getStats(): ExtensionStats {
    return {
      loaded: this.loadedCount,
      failed: this.failedCount,
      total: this.loadedCount + this.failedCount,
      extensions: Array.from(this.extensions.keys()),
    };
  }

  /**
   * Check if an extension is loaded
   */
  isLoaded(name: string): boolean {
    return this.extensions.has(name);
  }

  /**
   * Unload an extension
   */
  unloadExtension(name: string): boolean {
    if (this.extensions.delete(name)) {
      this.loadedCount--;
      runtimeLogger.info(`🗑️ Extension unloaded: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions.clear();
    this.loadedCount = 0;
    this.failedCount = 0;
  }
}

/**
 * Factory function to create an extension loader
 */
export function createExtensionLoader(): ExtensionLoader {
  return new ExtensionLoader();
}
