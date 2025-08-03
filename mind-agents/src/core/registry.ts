/**
 * Clean SYMindX Module Registry
 *
 * Simplified module registry without excessive abstraction layers.
 * Direct registration and retrieval with type-safe interfaces.
 */

import {
  ModuleRegistry,
  MemoryProvider,
  Extension,
  Agent,
  AgentConfig,
  AgentFactory,
} from '../types/agent';
import { CognitionModule } from '../types/cognition';
import { EmotionModule } from '../types/emotion';
import { Portal, PortalConfig } from '../types/portal';
import { runtimeLogger } from '../utils/logger';

export interface MemoryConfig {
  type: string;
  [key: string]: any;
}

export interface EmotionConfig {
  type: string;
  [key: string]: any;
}

export interface CognitionConfig {
  type: string;
  [key: string]: any;
}

/**
 * Clean module registry with direct registration and retrieval
 * Focuses on core functionality without excessive abstraction
 */
export class SYMindXModuleRegistry implements ModuleRegistry {
  // Direct module storage - single source of truth
  private modules = new Map<string, any>();
  
  // Type-safe factory storage - simplified factory pattern
  private factories = new Map<string, (config?: any) => any>();

  /**
   * Direct module registration - no complex factory patterns
   */
  register<T>(name: string, instance: T): void {
    this.modules.set(name, instance);
    runtimeLogger.debug(`Registered module: ${name}`);
  }

  /**
   * Direct module retrieval - simple and fast
   */
  get<T>(name: string): T | undefined {
    return this.modules.get(name) as T | undefined;
  }

  /**
   * Type-safe factory registration
   */
  registerFactory<T>(name: string, factory: (config?: any) => T): void {
    this.factories.set(name, factory);
    runtimeLogger.debug(`Registered factory: ${name}`);
  }

  /**
   * Create instance from factory
   */
  create<T>(name: string, config?: any): T | undefined {
    // Check if instance already exists in cache
    const existing = this.modules.get(name);
    if (existing) {
      return existing as T;
    }

    const factory = this.factories.get(name);
    if (!factory) {
      runtimeLogger.warn(`Factory not found: ${name}`);
      return undefined;
    }

    try {
      const instance = factory(config);
      // Cache the instance for reuse
      this.modules.set(name, instance);
      return instance as T;
    } catch (error) {
      runtimeLogger.error(`Failed to create instance ${name}:`, error);
      return undefined;
    }
  }

  // === ModuleRegistry Interface Implementation ===
  // Direct registration methods - no complex prefixing
  
  registerMemoryProvider(name: string, provider: MemoryProvider): void {
    this.register(`memory:${name}`, provider);
  }

  registerEmotionModule(name: string, module: EmotionModule): void {
    this.register(`emotion:${name}`, module);
  }

  registerCognitionModule(name: string, module: CognitionModule): void {
    this.register(`cognition:${name}`, module);
  }

  registerExtension(name: string, extension: Extension): void {
    this.register(`extension:${name}`, extension);
  }

  registerPortal(name: string, portal: Portal): void {
    this.register(`portal:${name}`, portal);
  }

  // Direct retrieval methods
  getMemoryProvider(name: string): MemoryProvider | undefined {
    return this.get<MemoryProvider>(`memory:${name}`);
  }

  getEmotionModule(name: string): EmotionModule | undefined {
    return this.get<EmotionModule>(`emotion:${name}`);
  }

  getCognitionModule(name: string): CognitionModule | undefined {
    return this.get<CognitionModule>(`cognition:${name}`);
  }

  getExtension(name: string): Extension | undefined {
    return this.get<Extension>(`extension:${name}`);
  }

  getPortal(name: string): Portal | undefined {
    return this.get<Portal>(`portal:${name}`);
  }

  // Factory registration methods - simplified
  registerMemoryFactory(name: string, factory: (config: unknown) => MemoryProvider): void {
    this.registerFactory(`memory:${name}`, factory);
  }

  registerEmotionFactory(name: string, factory: (config: unknown) => EmotionModule): void {
    this.registerFactory(`emotion:${name}`, factory);
  }

  registerCognitionFactory(name: string, factory: (config: unknown) => CognitionModule | Promise<CognitionModule>): void {
    this.registerFactory(`cognition:${name}`, factory);
  }

  registerExtensionFactory(name: string, factory: (config: unknown) => Extension): void {
    this.registerFactory(`extension:${name}`, factory);
  }

  registerPortalFactory(name: string, factory: (config: unknown) => Portal): void {
    this.registerFactory(`portal:${name}`, factory);
  }

  registerAgentFactory(name: string, factory: (config: unknown) => Agent | Promise<Agent>): void {
    this.registerFactory(`agent:${name}`, factory);
  }

  // Creation methods - simplified
  createMemoryProvider(name: string, config?: unknown): MemoryProvider | undefined {
    return this.create<MemoryProvider>(`memory:${name}`, config);
  }

  createEmotionModule(name: string, config?: unknown): EmotionModule | undefined {
    return this.create<EmotionModule>(`emotion:${name}`, config);
  }

  createCognitionModule(name: string, config?: unknown): CognitionModule | Promise<CognitionModule> | undefined {
    return this.create<CognitionModule | Promise<CognitionModule>>(`cognition:${name}`, config);
  }

  createExtension(name: string, config?: unknown): Extension | undefined {
    return this.create<Extension>(`extension:${name}`, config);
  }

  createPortal(name: string, config?: unknown): Portal | undefined {
    return this.create<Portal>(`portal:${name}`, config);
  }

  // Listing methods - simplified
  listMemoryProviders(): string[] {
    return this.listByPrefix('memory:');
  }

  listEmotionModules(): string[] {
    return this.listByPrefix('emotion:');
  }

  listCognitionModules(): string[] {
    return this.listByPrefix('cognition:');
  }

  listExtensions(): string[] {
    return this.listByPrefix('extension:');
  }

  listPortals(): string[] {
    return this.listByPrefix('portal:');
  }

  listPortalFactories(): string[] {
    const portals: string[] = [];
    this.factories.forEach((_, key) => {
      if (key.startsWith('portal:')) {
        portals.push(key.replace('portal:', ''));
      }
    });
    return portals;
  }

  // Other required methods
  registerLazyAgent(): void {
    // Simplified - lazy loading not needed in clean architecture
    runtimeLogger.debug('Lazy agent registration not implemented in clean registry');
  }

  getToolSystem(): unknown {
    return this.get('toolSystem');
  }

  getRegisteredAgents(): Agent[] {
    const agents: Agent[] = [];
    this.modules.forEach((value, key) => {
      if (key.startsWith('agent:')) {
        agents.push(value as Agent);
      }
    });
    return agents;
  }

  // === Utility Methods ===
  
  private listByPrefix(prefix: string): string[] {
    const items: string[] = [];
    this.modules.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        items.push(key.replace(prefix, ''));
      }
    });
    return items;
  }

  has(name: string): boolean {
    return this.modules.has(name) || this.factories.has(name);
  }

  clear(): void {
    this.modules.clear();
    this.factories.clear();
    runtimeLogger.debug('Registry cleared');
  }

  list(): string[] {
    const allNames = new Set<string>();
    this.modules.forEach((_, name) => allNames.add(name));
    this.factories.forEach((_, name) => allNames.add(name));
    return Array.from(allNames);
  }
}
