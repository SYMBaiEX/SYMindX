/**
 * Dynamic Import Utilities
 * 
 * Provides utilities for dynamically importing modules at runtime.
 * This is essential for the plugin loading system.
 */

import { pathToFileURL } from 'url';
import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * Dynamic import function that works with both ES modules and CommonJS
 * 
 * @param modulePath - Path to the module to import
 * @returns Promise that resolves to the imported module
 */
export async function dynamicImport(modulePath: string): Promise<any> {
  try {
    // Resolve the absolute path
    const absolutePath = path.resolve(modulePath);
    
    // Check if file exists
    await fs.access(absolutePath);
    
    // Convert to file URL for proper ES module loading
    const fileUrl = pathToFileURL(absolutePath).href;
    
    // Dynamic import with cache busting for development
    const cacheBuster = process.env.NODE_ENV === 'development' 
      ? `?t=${Date.now()}` 
      : '';
    
    const module = await import(fileUrl + cacheBuster);
    
    return module;
  } catch (error) {
    throw new Error(`Failed to import module '${modulePath}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Import a module and validate it has the required exports
 * 
 * @param modulePath - Path to the module to import
 * @param requiredExports - Array of required export names
 * @returns Promise that resolves to the imported module
 */
export async function dynamicImportWithValidation(
  modulePath: string, 
  requiredExports: string[] = []
): Promise<any> {
  const module = await dynamicImport(modulePath);
  
  // Validate required exports
  const missingExports = requiredExports.filter(exportName => !(exportName in module));
  
  if (missingExports.length > 0) {
    throw new Error(
      `Module '${modulePath}' is missing required exports: ${missingExports.join(', ')}`
    );
  }
  
  return module;
}

/**
 * Import a plugin module and validate it has the plugin interface
 * 
 * @param modulePath - Path to the plugin module
 * @returns Promise that resolves to the plugin module
 */
export async function importPlugin(modulePath: string): Promise<any> {
  return dynamicImportWithValidation(modulePath, ['createPlugin']);
}

/**
 * Import a module with retry logic
 * 
 * @param modulePath - Path to the module to import
 * @param maxRetries - Maximum number of retry attempts
 * @param retryDelay - Delay between retries in milliseconds
 * @returns Promise that resolves to the imported module
 */
export async function dynamicImportWithRetry(
  modulePath: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<any> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await dynamicImport(modulePath);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw new Error(
    `Failed to import module '${modulePath}' after ${maxRetries} attempts. Last error: ${lastError.message}`
  );
}

/**
 * Check if a module can be imported without actually importing it
 * 
 * @param modulePath - Path to the module to check
 * @returns Promise that resolves to true if the module can be imported
 */
export async function canImportModule(modulePath: string): Promise<boolean> {
  try {
    const absolutePath = path.resolve(modulePath);
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get module metadata without importing the full module
 * 
 * @param modulePath - Path to the module
 * @returns Promise that resolves to module metadata
 */
export async function getModuleMetadata(modulePath: string): Promise<any> {
  try {
    const module = await dynamicImport(modulePath);
    
    // Look for common metadata exports
    const metadata = {
      hasDefault: 'default' in module,
      hasCreatePlugin: 'createPlugin' in module,
      hasPluginMetadata: 'pluginMetadata' in module,
      exports: Object.keys(module),
      metadata: module.pluginMetadata || module.metadata || null
    };
    
    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to get metadata for module '${modulePath}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Import multiple modules concurrently
 * 
 * @param modulePaths - Array of module paths to import
 * @param maxConcurrency - Maximum number of concurrent imports
 * @returns Promise that resolves to an array of imported modules
 */
export async function importModulesConcurrently(
  modulePaths: string[],
  maxConcurrency: number = 5
): Promise<Array<{ path: string; module?: any; error?: Error }>> {
  const results: Array<{ path: string; module?: any; error?: Error }> = [];
  
  // Process modules in batches
  for (let i = 0; i < modulePaths.length; i += maxConcurrency) {
    const batch = modulePaths.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async (modulePath) => {
      try {
        const module = await dynamicImport(modulePath);
        return { path: modulePath, module };
      } catch (error) {
        return { 
          path: modulePath, 
          error: error instanceof Error ? error : new Error(String(error)) 
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Clear the module cache for a specific module (Node.js only)
 * 
 * @param modulePath - Path to the module to clear from cache
 */
export function clearModuleCache(modulePath: string): void {
  if (typeof require !== 'undefined' && require.cache) {
    const absolutePath = path.resolve(modulePath);
    delete require.cache[absolutePath];
    
    // Also clear any modules that depend on this one
    Object.keys(require.cache).forEach(cachedPath => {
      const cachedModule = require.cache[cachedPath];
      if (cachedModule && cachedModule.children) {
        const dependsOnModule = cachedModule.children.some(
          child => child.filename === absolutePath
        );
        if (dependsOnModule) {
          delete require.cache[cachedPath];
        }
      }
    });
  }
}

/**
 * Import a module with hot reload support
 * 
 * @param modulePath - Path to the module to import
 * @param enableHotReload - Whether to enable hot reloading
 * @returns Promise that resolves to the imported module
 */
export async function importWithHotReload(
  modulePath: string,
  enableHotReload: boolean = process.env.NODE_ENV === 'development'
): Promise<any> {
  if (enableHotReload) {
    // Clear cache before importing
    clearModuleCache(modulePath);
  }
  
  return dynamicImport(modulePath);
}

/**
 * Validate that a module exports match expected interface
 * 
 * @param module - The imported module
 * @param expectedInterface - Object describing expected exports
 * @returns Validation result
 */
export function validateModuleInterface(
  module: any,
  expectedInterface: Record<string, 'function' | 'object' | 'string' | 'number' | 'boolean'>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [exportName, expectedType] of Object.entries(expectedInterface)) {
    if (!(exportName in module)) {
      errors.push(`Missing required export: ${exportName}`);
      continue;
    }
    
    const actualType = typeof module[exportName];
    if (actualType !== expectedType) {
      errors.push(
        `Export '${exportName}' has type '${actualType}', expected '${expectedType}'`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Plugin-specific import function with full validation
 * 
 * @param pluginPath - Path to the plugin directory
 * @param mainFile - Main file name (from plugin.json)
 * @returns Promise that resolves to the validated plugin module
 */
export async function importPluginModule(
  pluginPath: string,
  mainFile: string
): Promise<any> {
  const modulePath = path.join(pluginPath, mainFile);
  
  // Import the module
  const module = await dynamicImport(modulePath);
  
  // Validate plugin interface
  const validation = validateModuleInterface(module, {
    createPlugin: 'function'
  });
  
  if (!validation.valid) {
    throw new Error(
      `Invalid plugin module '${modulePath}': ${validation.errors.join(', ')}`
    );
  }
  
  return module;
}