/**
 * Module Lifecycle Management for SYMindX
 * 
 * Provides hot-reloading, versioning, and graceful shutdown for all modules
 */

import { runtimeLogger } from '../../../utils/logger';
import { Disposable, Initializable, HealthCheckable, Versioned } from '../traits/ModuleTraits';

export enum ModuleState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed'
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: string;
  type: 'memory' | 'emotion' | 'cognition' | 'extension' | 'portal' | 'unknown';
  state: ModuleState;
  dependencies: string[];
  dependents: string[];
  hotReloadable: boolean;
  metadata: Record<string, any>;
}

export interface ModuleLifecycleEvents {
  stateChanged: { moduleId: string; oldState: ModuleState; newState: ModuleState };
  dependencyResolved: { moduleId: string; dependencyId: string };
  dependencyFailed: { moduleId: string; dependencyId: string; error: Error };
  hotReloadStarted: { moduleId: string };
  hotReloadCompleted: { moduleId: string; success: boolean };
  error: { moduleId: string; error: Error; recoverable: boolean };
}

export type ModuleLifecycleListener<T extends keyof ModuleLifecycleEvents> = (
  event: ModuleLifecycleEvents[T]
) => void | Promise<void>;

export interface ModuleInstance {
  instance: any;
  info: ModuleInfo;
  startedAt?: Date;
  lastHealthCheck?: Date;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  errorCount: number;
  restartCount: number;
}

export class ModuleLifecycleManager {
  private modules = new Map<string, ModuleInstance>();
  private dependencyGraph = new Map<string, Set<string>>();
  private dependentGraph = new Map<string, Set<string>>();
  private moduleFactories = new Map<string, () => Promise<any>>();
  private listeners = new Map<keyof ModuleLifecycleEvents, Set<ModuleLifecycleListener<any>>>();
  private shutdownHandlers = new Set<() => Promise<void>>();
  private hotReloadWatchers = new Map<string, any>();
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor(private config: {
    enableHotReload?: boolean;
    enableHealthChecks?: boolean;
    healthCheckIntervalMs?: number;
    maxRestarts?: number;
    gracefulShutdownTimeoutMs?: number;
  } = {}) {
    this.config = {
      enableHotReload: true,
      enableHealthChecks: true,
      healthCheckIntervalMs: 30000, // 30 seconds
      maxRestarts: 3,
      gracefulShutdownTimeoutMs: 10000, // 10 seconds
      ...config
    };
    
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
    
    // Handle process signals for graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }
  
  /**
   * Register a module factory
   */
  registerFactory(
    moduleId: string,
    factory: () => Promise<any>,
    info: Partial<ModuleInfo>
  ): void {
    this.moduleFactories.set(moduleId, factory);
    
    const moduleInfo: ModuleInfo = {
      id: moduleId,
      name: info.name || moduleId,
      version: info.version || '1.0.0',
      type: info.type || 'unknown',
      state: ModuleState.UNINITIALIZED,
      dependencies: info.dependencies || [],
      dependents: [],
      hotReloadable: info.hotReloadable !== false,
      metadata: info.metadata || {}
    };
    
    // Update dependency graphs
    for (const depId of moduleInfo.dependencies) {
      if (!this.dependencyGraph.has(moduleId)) {
        this.dependencyGraph.set(moduleId, new Set());
      }
      this.dependencyGraph.get(moduleId)!.add(depId);
      
      if (!this.dependentGraph.has(depId)) {
        this.dependentGraph.set(depId, new Set());
      }
      this.dependentGraph.get(depId)!.add(moduleId);
      
      // Update dependents list
      const existingModule = this.modules.get(depId);
      if (existingModule) {
        existingModule.info.dependents.push(moduleId);
      }
    }
    
    runtimeLogger.info(`Registered module factory: ${moduleId} v${moduleInfo.version}`);
  }
  
  /**
   * Load and initialize a module
   */
  async loadModule(moduleId: string): Promise<void> {
    const factory = this.moduleFactories.get(moduleId);
    if (!factory) {
      throw new Error(`No factory registered for module: ${moduleId}`);
    }
    
    const moduleInfo: ModuleInfo = {
      id: moduleId,
      name: moduleId,
      version: '1.0.0',
      type: 'unknown',
      state: ModuleState.UNINITIALIZED,
      dependencies: [],
      dependents: [],
      hotReloadable: true,
      metadata: {}
    };
    
    await this.setState(moduleId, ModuleState.INITIALIZING);
    
    try {
      // Check dependencies
      await this.resolveDependencies(moduleId);
      
      // Create instance
      const instance = await factory();
      
      const moduleInstance: ModuleInstance = {
        instance,
        info: moduleInfo,
        errorCount: 0,
        restartCount: 0
      };
      
      this.modules.set(moduleId, moduleInstance);
      
      // Initialize if the instance supports it
      if ('initialize' in instance && typeof instance.initialize === 'function') {
        await instance.initialize();
      }
      
      await this.setState(moduleId, ModuleState.INITIALIZED);
      
      // Start if the instance supports it
      if ('start' in instance && typeof instance.start === 'function') {
        await this.setState(moduleId, ModuleState.STARTING);
        await instance.start();
        moduleInstance.startedAt = new Date();
      }
      
      await this.setState(moduleId, ModuleState.RUNNING);
      
      // Setup hot reload if enabled
      if (this.config.enableHotReload && moduleInfo.hotReloadable) {
        this.setupHotReload(moduleId);
      }
      
      runtimeLogger.info(`Module loaded successfully: ${moduleId}`);
    } catch (error) {
      await this.setState(moduleId, ModuleState.ERROR);
      runtimeLogger.error(`Failed to load module ${moduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Unload a module
   */
  async unloadModule(moduleId: string): Promise<void> {
    const moduleInstance = this.modules.get(moduleId);
    if (!moduleInstance) {
      return;
    }
    
    // Check if other modules depend on this one
    const dependents = this.dependentGraph.get(moduleId);
    if (dependents && dependents.size > 0) {
      const dependentList = Array.from(dependents);
      runtimeLogger.warn(`Module ${moduleId} has dependents: ${dependentList.join(', ')}`);
      
      // Unload dependents first
      for (const dependentId of dependentList) {
        await this.unloadModule(dependentId);
      }
    }
    
    await this.setState(moduleId, ModuleState.STOPPING);
    
    try {
      const { instance } = moduleInstance;
      
      // Stop if supported
      if ('stop' in instance && typeof instance.stop === 'function') {
        await instance.stop();
      }
      
      await this.setState(moduleId, ModuleState.STOPPED);
      
      // Dispose if supported
      if ('dispose' in instance && typeof instance.dispose === 'function') {
        await this.setState(moduleId, ModuleState.DISPOSING);
        await instance.dispose();
      }
      
      await this.setState(moduleId, ModuleState.DISPOSED);
      
      // Cleanup hot reload
      this.cleanupHotReload(moduleId);
      
      // Remove from modules
      this.modules.delete(moduleId);
      
      runtimeLogger.info(`Module unloaded: ${moduleId}`);
    } catch (error) {
      await this.setState(moduleId, ModuleState.ERROR);
      runtimeLogger.error(`Error unloading module ${moduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Hot reload a module
   */
  async hotReload(moduleId: string): Promise<boolean> {
    if (!this.config.enableHotReload) {
      runtimeLogger.warn(`Hot reload is disabled`);
      return false;
    }
    
    const moduleInstance = this.modules.get(moduleId);
    if (!moduleInstance || !moduleInstance.info.hotReloadable) {
      runtimeLogger.warn(`Module ${moduleId} is not hot reloadable`);
      return false;
    }
    
    this.emit('hotReloadStarted', { moduleId });
    
    try {
      runtimeLogger.info(`Hot reloading module: ${moduleId}`);
      
      // Save current state
      const oldState = moduleInstance.info.state;
      const dependencies = [...moduleInstance.info.dependencies];
      
      // Unload current instance
      await this.unloadModule(moduleId);
      
      // Reload factory (this would typically involve re-importing the module)
      await this.reloadFactory(moduleId);
      
      // Load new instance
      await this.loadModule(moduleId);
      
      this.emit('hotReloadCompleted', { moduleId, success: true });
      runtimeLogger.info(`Hot reload completed for: ${moduleId}`);
      return true;
    } catch (error) {
      runtimeLogger.error(`Hot reload failed for ${moduleId}:`, error);
      this.emit('hotReloadCompleted', { moduleId, success: false });
      
      // Attempt to recover by reloading the old version
      try {
        await this.loadModule(moduleId);
      } catch (recoveryError) {
        runtimeLogger.error(`Failed to recover module ${moduleId}:`, recoveryError);
      }
      
      return false;
    }
  }
  
  /**
   * Get module information
   */
  getModuleInfo(moduleId: string): ModuleInfo | null {
    const moduleInstance = this.modules.get(moduleId);
    return moduleInstance ? { ...moduleInstance.info } : null;
  }
  
  /**
   * Get all modules
   */
  getAllModules(): ModuleInfo[] {
    return Array.from(this.modules.values()).map(m => ({ ...m.info }));
  }
  
  /**
   * Get module instance
   */
  getModuleInstance<T = any>(moduleId: string): T | null {
    const moduleInstance = this.modules.get(moduleId);
    return moduleInstance ? moduleInstance.instance : null;
  }
  
  /**
   * Check module health
   */
  async checkModuleHealth(moduleId: string): Promise<{
    status: 'healthy' | 'unhealthy' | 'unknown';
    details?: any;
  }> {
    const moduleInstance = this.modules.get(moduleId);
    if (!moduleInstance) {
      return { status: 'unknown', details: 'Module not found' };
    }
    
    const { instance } = moduleInstance;
    
    try {
      if ('healthCheck' in instance && typeof instance.healthCheck === 'function') {
        const result = await instance.healthCheck();
        moduleInstance.lastHealthCheck = new Date();
        moduleInstance.healthStatus = result.status;
        return result;
      }
      
      // Basic health check based on state
      const isHealthy = moduleInstance.info.state === ModuleState.RUNNING;
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          state: moduleInstance.info.state,
          errorCount: moduleInstance.errorCount,
          uptime: moduleInstance.startedAt 
            ? Date.now() - moduleInstance.startedAt.getTime()
            : 0
        }
      };
    } catch (error) {
      moduleInstance.healthStatus = 'unhealthy';
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Restart a module
   */
  async restartModule(moduleId: string): Promise<void> {
    const moduleInstance = this.modules.get(moduleId);
    if (!moduleInstance) {
      throw new Error(`Module not found: ${moduleId}`);
    }
    
    if (moduleInstance.restartCount >= (this.config.maxRestarts || 3)) {
      throw new Error(`Maximum restart attempts exceeded for module: ${moduleId}`);
    }
    
    runtimeLogger.info(`Restarting module: ${moduleId}`);
    
    try {
      await this.unloadModule(moduleId);
      await this.loadModule(moduleId);
      
      const reloadedInstance = this.modules.get(moduleId);
      if (reloadedInstance) {
        reloadedInstance.restartCount++;
      }
      
      runtimeLogger.info(`Module restarted successfully: ${moduleId}`);
    } catch (error) {
      runtimeLogger.error(`Failed to restart module ${moduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Add event listener
   */
  on<T extends keyof ModuleLifecycleEvents>(
    event: T,
    listener: ModuleLifecycleListener<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  /**
   * Remove event listener
   */
  off<T extends keyof ModuleLifecycleEvents>(
    event: T,
    listener: ModuleLifecycleListener<T>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
  
  /**
   * Add shutdown handler
   */
  addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.add(handler);
  }
  
  /**
   * Graceful shutdown
   */
  async gracefulShutdown(): Promise<void> {
    runtimeLogger.info('Starting graceful shutdown...');
    
    const timeout = this.config.gracefulShutdownTimeoutMs || 10000;
    const shutdownPromise = this.performShutdown();
    
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
    });
    
    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      runtimeLogger.info('Graceful shutdown completed');
    } catch (error) {
      runtimeLogger.error('Graceful shutdown failed:', error);
      process.exit(1);
    }
  }
  
  // ===================================================================
  // PRIVATE METHODS
  // ===================================================================
  
  private async performShutdown(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Run shutdown handlers
    for (const handler of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        runtimeLogger.error('Error in shutdown handler:', error);
      }
    }
    
    // Unload all modules in dependency order
    const moduleIds = Array.from(this.modules.keys());
    const sortedIds = this.topologicalSort(moduleIds).reverse();
    
    for (const moduleId of sortedIds) {
      try {
        await this.unloadModule(moduleId);
      } catch (error) {
        runtimeLogger.error(`Error unloading module ${moduleId}:`, error);
      }
    }
  }
  
  private async setState(moduleId: string, newState: ModuleState): Promise<void> {
    const moduleInstance = this.modules.get(moduleId);
    if (!moduleInstance) return;
    
    const oldState = moduleInstance.info.state;
    moduleInstance.info.state = newState;
    
    this.emit('stateChanged', { moduleId, oldState, newState });
  }
  
  private async resolveDependencies(moduleId: string): Promise<void> {
    const dependencies = this.dependencyGraph.get(moduleId);
    if (!dependencies) return;
    
    for (const depId of dependencies) {
      const depInstance = this.modules.get(depId);
      
      if (!depInstance) {
        // Try to load dependency
        try {
          await this.loadModule(depId);
          this.emit('dependencyResolved', { moduleId, dependencyId: depId });
        } catch (error) {
          this.emit('dependencyFailed', { 
            moduleId, 
            dependencyId: depId, 
            error: error instanceof Error ? error : new Error(String(error))
          });
          throw new Error(`Failed to resolve dependency ${depId} for module ${moduleId}`);
        }
      } else if (depInstance.info.state !== ModuleState.RUNNING) {
        throw new Error(`Dependency ${depId} is not running (state: ${depInstance.info.state})`);
      }
    }
  }
  
  private setupHotReload(moduleId: string): void {
    // This would typically set up file system watchers
    // For now, it's a placeholder
    runtimeLogger.debug(`Hot reload setup for: ${moduleId}`);
  }
  
  private cleanupHotReload(moduleId: string): void {
    const watcher = this.hotReloadWatchers.get(moduleId);
    if (watcher) {
      watcher.close();
      this.hotReloadWatchers.delete(moduleId);
    }
  }
  
  private async reloadFactory(moduleId: string): Promise<void> {
    // This would typically involve clearing module cache and re-importing
    // For now, it's a placeholder
    runtimeLogger.debug(`Reloading factory for: ${moduleId}`);
  }
  
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [moduleId] of this.modules) {
        try {
          const health = await this.checkModuleHealth(moduleId);
          if (health.status === 'unhealthy') {
            const moduleInstance = this.modules.get(moduleId)!;
            moduleInstance.errorCount++;
            
            this.emit('error', {
              moduleId,
              error: new Error(`Health check failed: ${JSON.stringify(health.details)}`),
              recoverable: true
            });
            
            // Consider restart if error count is high
            if (moduleInstance.errorCount >= 3 && 
                moduleInstance.restartCount < (this.config.maxRestarts || 3)) {
              runtimeLogger.warn(`Module ${moduleId} failing health checks, attempting restart`);
              try {
                await this.restartModule(moduleId);
                moduleInstance.errorCount = 0;
              } catch (error) {
                runtimeLogger.error(`Failed to restart unhealthy module ${moduleId}:`, error);
              }
            }
          } else {
            // Reset error count on successful health check
            const moduleInstance = this.modules.get(moduleId)!;
            moduleInstance.errorCount = 0;
          }
        } catch (error) {
          runtimeLogger.error(`Health check error for module ${moduleId}:`, error);
        }
      }
    }, this.config.healthCheckIntervalMs);
  }
  
  private topologicalSort(moduleIds: string[]): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];
    
    const visit = (moduleId: string) => {
      if (temp.has(moduleId)) {
        throw new Error(`Circular dependency detected involving module: ${moduleId}`);
      }
      
      if (!visited.has(moduleId)) {
        temp.add(moduleId);
        
        const dependencies = this.dependencyGraph.get(moduleId);
        if (dependencies) {
          for (const depId of dependencies) {
            visit(depId);
          }
        }
        
        temp.delete(moduleId);
        visited.add(moduleId);
        result.push(moduleId);
      }
    };
    
    for (const moduleId of moduleIds) {
      if (!visited.has(moduleId)) {
        visit(moduleId);
      }
    }
    
    return result;
  }
  
  private emit<T extends keyof ModuleLifecycleEvents>(
    event: T,
    data: ModuleLifecycleEvents[T]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return;
    
    for (const listener of eventListeners) {
      try {
        const result = listener(data);
        if (result instanceof Promise) {
          result.catch(error => {
            runtimeLogger.error(`Error in lifecycle event listener for ${event}:`, error);
          });
        }
      } catch (error) {
        runtimeLogger.error(`Error in lifecycle event listener for ${event}:`, error);
      }
    }
  }
}