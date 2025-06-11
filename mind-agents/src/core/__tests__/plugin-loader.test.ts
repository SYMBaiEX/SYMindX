/**
 * Plugin Loader Tests
 * 
 * Tests for the dynamic plugin loading system.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PluginLoader, createPluginLoader } from '../plugin-loader.js';
import { SYMindXModuleRegistry } from '../registry.js';
import { createLogger } from '../../utils/logger.js';
import { ExtensionType, ExtensionStatus } from '../../types/agent.js';

// Mock file system
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
  }
}));

// Mock dynamic imports
jest.mock('../../utils/dynamic-import.js', () => ({
  dynamicImport: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockDynamicImport = require('../../utils/dynamic-import.js').dynamicImport as jest.MockedFunction<any>;

describe('PluginLoader', () => {
  let pluginLoader: PluginLoader;
  let registry: SYMindXModuleRegistry;
  let logger: any;
  
  beforeEach(() => {
    registry = new SYMindXModuleRegistry();
    logger = createLogger({ level: 'debug' });
    pluginLoader = new PluginLoader(registry, logger);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    await pluginLoader.unloadAllPlugins();
  });
  
  describe('Plugin Discovery', () => {
    test('should discover plugins in directory', async () => {
      // Mock file system structure
      mockFs.readdir.mockResolvedValueOnce([
        'plugin1',
        'plugin2',
        'not-a-plugin.txt'
      ] as any);
      
      mockFs.stat.mockImplementation(async (filePath: any) => ({
        isDirectory: () => filePath.includes('plugin')
      }) as any);
      
      // Mock plugin manifests
      mockFs.readFile.mockImplementation(async (filePath: any) => {
        if (filePath.includes('plugin1/plugin.json')) {
          return JSON.stringify({
            id: 'plugin1',
            name: 'Plugin 1',
            version: '1.0.0',
            type: 'extension',
            main: 'index.js'
          });
        }
        if (filePath.includes('plugin2/plugin.json')) {
          return JSON.stringify({
            id: 'plugin2',
            name: 'Plugin 2',
            version: '2.0.0',
            type: 'module',
            main: 'index.js'
          });
        }
        throw new Error('File not found');
      });
      
      mockFs.access.mockResolvedValue(undefined);
      
      const plugins = await pluginLoader.discoverPlugins('/test/plugins');
      
      expect(plugins).toHaveLength(2);
      expect(plugins[0].id).toBe('plugin1');
      expect(plugins[1].id).toBe('plugin2');
    });
    
    test('should handle invalid plugin manifests', async () => {
      mockFs.readdir.mockResolvedValueOnce(['invalid-plugin'] as any);
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockFs.readFile.mockRejectedValueOnce(new Error('Invalid JSON'));
      
      const plugins = await pluginLoader.discoverPlugins('/test/plugins');
      
      expect(plugins).toHaveLength(0);
    });
    
    test('should validate plugin manifests', async () => {
      mockFs.readdir.mockResolvedValueOnce(['invalid-plugin'] as any);
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => true } as any);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({
        // Missing required fields
        name: 'Invalid Plugin'
      }));
      
      const plugins = await pluginLoader.discoverPlugins('/test/plugins');
      
      expect(plugins).toHaveLength(0);
    });
  });
  
  describe('Plugin Loading', () => {
    const mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      version: '1.0.0',
      type: ExtensionType.UTILITY,
      status: ExtensionStatus.STOPPED,
      init: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      tick: jest.fn().mockResolvedValue(undefined),
      getActions: jest.fn().mockReturnValue({})
    };
    
    const mockPluginModule = {
      createPlugin: jest.fn().mockReturnValue(mockPlugin),
      pluginMetadata: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0'
      }
    };
    
    test('should load plugin successfully', async () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/test-plugin'
      };
      
      mockDynamicImport.mockResolvedValueOnce(mockPluginModule);
      
      const result = await pluginLoader.loadPlugin(manifest, {});
      
      expect(result.success).toBe(true);
      expect(mockPlugin.init).toHaveBeenCalled();
      expect(pluginLoader.isPluginLoaded('test-plugin')).toBe(true);
    });
    
    test('should handle plugin loading errors', async () => {
      const manifest = {
        id: 'error-plugin',
        name: 'Error Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/error-plugin'
      };
      
      mockDynamicImport.mockRejectedValueOnce(new Error('Module not found'));
      
      const result = await pluginLoader.loadPlugin(manifest, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Module not found');
    });
    
    test('should handle plugin initialization errors', async () => {
      const manifest = {
        id: 'init-error-plugin',
        name: 'Init Error Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/init-error-plugin'
      };
      
      const errorPlugin = {
        ...mockPlugin,
        id: 'init-error-plugin',
        init: jest.fn().mockRejectedValue(new Error('Init failed'))
      };
      
      const errorModule = {
        createPlugin: jest.fn().mockReturnValue(errorPlugin)
      };
      
      mockDynamicImport.mockResolvedValueOnce(errorModule);
      
      const result = await pluginLoader.loadPlugin(manifest, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Init failed');
    });
  });
  
  describe('Plugin Unloading', () => {
    test('should unload plugin successfully', async () => {
      const manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/test-plugin'
      };
      
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        description: 'A test plugin',
        version: '1.0.0',
        type: ExtensionType.UTILITY,
        status: ExtensionStatus.RUNNING,
        init: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
        tick: jest.fn().mockResolvedValue(undefined),
        getActions: jest.fn().mockReturnValue({})
      };
      
      const mockPluginModule = {
        createPlugin: jest.fn().mockReturnValue(mockPlugin)
      };
      
      mockDynamicImport.mockResolvedValueOnce(mockPluginModule);
      
      // Load plugin first
      await pluginLoader.loadPlugin(manifest, {});
      expect(pluginLoader.isPluginLoaded('test-plugin')).toBe(true);
      
      // Unload plugin
      const result = await pluginLoader.unloadPlugin('test-plugin');
      
      expect(result.success).toBe(true);
      expect(mockPlugin.cleanup).toHaveBeenCalled();
      expect(pluginLoader.isPluginLoaded('test-plugin')).toBe(false);
    });
    
    test('should handle plugin cleanup errors', async () => {
      const manifest = {
        id: 'cleanup-error-plugin',
        name: 'Cleanup Error Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/cleanup-error-plugin'
      };
      
      const errorPlugin = {
        id: 'cleanup-error-plugin',
        name: 'Cleanup Error Plugin',
        description: 'A plugin with cleanup errors',
        version: '1.0.0',
        type: ExtensionType.UTILITY,
        status: ExtensionStatus.RUNNING,
        init: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
        tick: jest.fn().mockResolvedValue(undefined),
        getActions: jest.fn().mockReturnValue({})
      };
      
      const errorModule = {
        createPlugin: jest.fn().mockReturnValue(errorPlugin)
      };
      
      mockDynamicImport.mockResolvedValueOnce(errorModule);
      
      // Load plugin first
      await pluginLoader.loadPlugin(manifest, {});
      
      // Unload plugin (should handle cleanup error gracefully)
      const result = await pluginLoader.unloadPlugin('cleanup-error-plugin');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cleanup failed');
      expect(pluginLoader.isPluginLoaded('cleanup-error-plugin')).toBe(false);
    });
  });
  
  describe('Plugin Management', () => {
    test('should get loaded plugins', async () => {
      const manifest1 = {
        id: 'plugin1',
        name: 'Plugin 1',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/plugin1'
      };
      
      const manifest2 = {
        id: 'plugin2',
        name: 'Plugin 2',
        version: '1.0.0',
        type: 'extension',
        main: 'index.js',
        path: '/test/plugins/plugin2'
      };
      
      const mockPlugin1 = {
        id: 'plugin1',
        name: 'Plugin 1',
        description: 'Plugin 1',
        version: '1.0.0',
        type: ExtensionType.UTILITY,
        status: ExtensionStatus.RUNNING,
        init: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
        tick: jest.fn().mockResolvedValue(undefined),
        getActions: jest.fn().mockReturnValue({})
      };
      
      const mockPlugin2 = {
        id: 'plugin2',
        name: 'Plugin 2',
        description: 'Plugin 2',
        version: '1.0.0',
        type: ExtensionType.COMMUNICATION,
        status: ExtensionStatus.RUNNING,
        init: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
        tick: jest.fn().mockResolvedValue(undefined),
        getActions: jest.fn().mockReturnValue({})
      };
      
      mockDynamicImport
        .mockResolvedValueOnce({ createPlugin: () => mockPlugin1 })
        .mockResolvedValueOnce({ createPlugin: () => mockPlugin2 });
      
      await pluginLoader.loadPlugin(manifest1, {});
      await pluginLoader.loadPlugin(manifest2, {});
      
      const loadedPlugins = pluginLoader.getLoadedPlugins();
      
      expect(loadedPlugins).toHaveLength(2);
      expect(loadedPlugins.map(p => p.id)).toContain('plugin1');
      expect(loadedPlugins.map(p => p.id)).toContain('plugin2');
    });
    
    test('should get plugin statistics', () => {
      const stats = pluginLoader.getStats();
      
      expect(stats).toHaveProperty('totalPlugins');
      expect(stats).toHaveProperty('loadedPlugins');
      expect(stats).toHaveProperty('failedPlugins');
      expect(stats).toHaveProperty('pluginsByType');
      expect(stats).toHaveProperty('pluginsByStatus');
    });
  });
  
  describe('Plugin Factory', () => {
    test('should create plugin loader with default paths', () => {
      const loader = createPluginLoader();
      
      expect(loader).toBeInstanceOf(PluginLoader);
    });
    
    test('should create plugin loader with custom paths', () => {
      const customPaths = ['/custom/plugins', '/another/path'];
      const loader = createPluginLoader(customPaths);
      
      expect(loader).toBeInstanceOf(PluginLoader);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle missing plugin directory', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));
      
      const plugins = await pluginLoader.discoverPlugins('/nonexistent/path');
      
      expect(plugins).toHaveLength(0);
    });
    
    test('should handle plugin with missing main file', async () => {
      const manifest = {
        id: 'missing-main-plugin',
        name: 'Missing Main Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'nonexistent.js',
        path: '/test/plugins/missing-main-plugin'
      };
      
      mockDynamicImport.mockRejectedValueOnce(new Error('Cannot resolve module'));
      
      const result = await pluginLoader.loadPlugin(manifest, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot resolve module');
    });
    
    test('should handle plugin with invalid factory function', async () => {
      const manifest = {
        id: 'invalid-factory-plugin',
        name: 'Invalid Factory Plugin',
        version: '1.0.0',
        type: 'utility',
        main: 'index.js',
        path: '/test/plugins/invalid-factory-plugin'
      };
      
      const invalidModule = {
        // Missing createPlugin function
        someOtherExport: 'value'
      };
      
      mockDynamicImport.mockResolvedValueOnce(invalidModule);
      
      const result = await pluginLoader.loadPlugin(manifest, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('createPlugin');
    });
  });
});