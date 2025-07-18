/**
 * SYMindX Module Registry
 *
 * Central registry for managing all module types in the SYMindX runtime.
 */

import { PortalFactory } from '../portals/index';
import {
  ModuleRegistry,
  MemoryProvider,
  Extension,
  LazyAgent,
  Agent,
  AgentConfig,
  AgentFactory,
} from '../types/agent';
// Agent imports should come first
import { CognitionModule, CognitionModuleFactory } from '../types/cognition';
import { BaseConfig } from '../types/common';
import { EmotionModule, EmotionModuleFactory } from '../types/emotion';
import { Portal, PortalConfig } from '../types/portal';
import { runtimeLogger } from '../utils/logger';

/**
 * Main module registry implementation
 */
export class SYMindXModuleRegistry implements ModuleRegistry {
  private memoryProviders = new Map<string, any>();
  private emotionModules = new Map<string, any>();
  private cognitionModules = new Map<string, any>();
  private extensions = new Map<string, any>();
  private portals = new Map<string, Portal>();
  private toolSystems = new Map<
    string,
    import('../modules/tools/index').ToolSystem
  >();
  private observabilityModules = new Map<string, any>();
  private streamingInterfaces = new Map<string, any>();

  // Factory storage maps
  private memoryFactories = new Map<string, any>();
  private emotionFactories = new Map<string, EmotionModuleFactory>();
  private cognitionFactories = new Map<string, CognitionModuleFactory>();
  private portalFactories = new Map<string, PortalFactory>();
  private extensionFactories = new Map<string, any>();
  private agentFactories = new Map<string, AgentFactory>();

  // Lazy agent management
  private lazyAgents = new Map<string, LazyAgent | (() => Promise<Agent>)>();

  registerLazyAgent(
    agentId: string,
    loaderOrAgent: (() => Promise<Agent>) | LazyAgent
  ): void {
    // Support both the interface signature and the legacy LazyAgent object
    if (typeof loaderOrAgent === 'function') {
      // Store the loader function
      this.lazyAgents.set(agentId, loaderOrAgent);
    } else {
      // Legacy support: store the LazyAgent object
      this.lazyAgents.set(agentId, loaderOrAgent);
    }
    runtimeLogger.factory(`🦥 Registered lazy agent: ${agentId}`);
  }

  getLazyAgent(agentId: string): LazyAgent | undefined {
    const value = this.lazyAgents.get(agentId);
    if (typeof value === 'function') {
      // If it's a loader function, we can't return it as LazyAgent
      return undefined;
    }
    return value;
  }

  registerMemoryProvider(name: string, provider: any): void {
    this.memoryProviders.set(name, provider);
    runtimeLogger.factory(`📝 Registered memory provider: ${name}`);
  }

  registerEmotionModule(name: string, module: any): void {
    this.emotionModules.set(name, module);
    runtimeLogger.factory(`😊 Registered emotion module: ${name}`);
  }

  registerCognitionModule(name: string, module: any): void {
    this.cognitionModules.set(name, module);
    runtimeLogger.factory(`🧠 Registered cognition module: ${name}`);
  }

  registerExtension(name: string, extension: any): void {
    this.extensions.set(name, extension);
    // Reduced logging for cleaner startup
  }

  registerPortal(name: string, portal: Portal): void {
    this.portals.set(name, portal);
    // Reduced logging for cleaner startup
  }

  getMemoryProvider(name: string): MemoryProvider | undefined {
    return this.memoryProviders.get(name);
  }

  getEmotionModule(name: string): EmotionModule | undefined {
    return this.emotionModules.get(name);
  }

  getCognitionModule(name: string): CognitionModule | undefined {
    return this.cognitionModules.get(name);
  }

  getExtension(name: string): Extension | undefined {
    return this.extensions.get(name);
  }

  getPortal(name: string): Portal | undefined {
    return this.portals.get(name);
  }

  listPortals(): string[] {
    return Array.from(this.portals.keys());
  }

  // Tool system methods
  registerToolSystem(
    name: string,
    toolSystem: import('../modules/tools/index').ToolSystem
  ): void {
    this.toolSystems.set(name, toolSystem);
    runtimeLogger.factory(`🔧 Registered tool system: ${name}`);
  }

  getToolSystem(): any {
    // Return the default tool system for backward compatibility
    return this.toolSystems.get('default');
  }

  getToolSystemByName(
    name: string
  ): import('../modules/tools/index').ToolSystem | undefined {
    return this.toolSystems.get(name);
  }

  listToolSystems(): string[] {
    return Array.from(this.toolSystems.keys());
  }

  // Observability methods
  registerObservability(name: string, observability: any): void {
    this.observabilityModules.set(name, observability);
    runtimeLogger.factory(`📊 Registered observability module: ${name}`);
  }

  getObservability(name: string): any {
    return this.observabilityModules.get(name);
  }

  // Streaming methods
  registerStreaming(name: string, streaming: any): void {
    this.streamingInterfaces.set(name, streaming);
    runtimeLogger.factory(`📡 Registered streaming interface: ${name}`);
  }

  getStreaming(name: string): any {
    return this.streamingInterfaces.get(name);
  }

  // Factory registration methods
  registerMemoryFactory(type: string, factory: any): void {
    this.memoryFactories.set(type, factory);
    // Silent registration for cleaner startup
  }

  registerEmotionFactory(type: string, factory: EmotionModuleFactory): void {
    this.emotionFactories.set(type, factory);
    // Silent registration for cleaner startup
  }

  registerCognitionFactory(
    type: string,
    factory: CognitionModuleFactory
  ): void {
    this.cognitionFactories.set(type, factory);
    // Silent registration for cleaner startup
  }

  registerPortalFactory(type: string, factory: PortalFactory): void {
    this.portalFactories.set(type, factory);
    // Silent registration for cleaner startup
  }

  // Factory creation methods
  createMemoryProvider(type: string, config: any): any {
    const factory = this.memoryFactories.get(type);
    if (!factory) {
      runtimeLogger.warn(`⚠️ Memory factory for type '${type}' not found`);
      return undefined;
    }
    try {
      const provider = factory(config);
      // Silent creation for cleaner startup
      return provider;
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to create memory provider '${type}':`,
        error
      );
      return undefined;
    }
  }

  createEmotionModule(
    type: string,
    config: BaseConfig
  ): EmotionModule | undefined {
    const factory = this.emotionFactories.get(type);
    if (!factory) {
      runtimeLogger.warn(`⚠️ Emotion factory for type '${type}' not found`);
      return undefined;
    }
    try {
      const module = factory(config);
      // Silent creation for cleaner startup
      return module;
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to create emotion module '${type}':`,
        error
      );
      return undefined;
    }
  }

  createCognitionModule(
    type: string,
    config: BaseConfig
  ): CognitionModule | undefined {
    const factory = this.cognitionFactories.get(type);
    if (!factory) {
      runtimeLogger.warn(`⚠️ Cognition factory for type '${type}' not found`);
      return undefined;
    }
    try {
      const module = factory(config);
      runtimeLogger.factory(`✅ Created cognition module: ${type}`);
      return module;
    } catch (error) {
      void error;
      runtimeLogger.error(
        `❌ Failed to create cognition module '${type}':`,
        error
      );
      return undefined;
    }
  }

  createPortal(type: string, config: PortalConfig): Portal | undefined {
    const factory = this.portalFactories.get(type);
    if (!factory) {
      runtimeLogger.warn(`⚠️ Portal factory for type '${type}' not found`);
      return undefined;
    }
    try {
      const portal = factory(config);
      runtimeLogger.factory(`✅ Created portal: ${type}`);
      return portal;
    } catch (error) {
      void error;
      runtimeLogger.error(`❌ Failed to create portal '${type}':`, error);
      return undefined;
    }
  }

  // Factory listing methods
  listMemoryProviders(): string[] {
    // Combine registered providers and factory types
    const registeredProviders = Array.from(this.memoryProviders.keys());
    const factoryTypes = Array.from(this.memoryFactories.keys());
    return [...new Set([...registeredProviders, ...factoryTypes])];
  }

  listEmotionModules(): string[] {
    // Combine registered modules and factory types
    const registeredModules = Array.from(this.emotionModules.keys());
    const factoryTypes = Array.from(this.emotionFactories.keys());
    return [...new Set([...registeredModules, ...factoryTypes])];
  }

  listCognitionModules(): string[] {
    // Combine registered modules and factory types
    const registeredModules = Array.from(this.cognitionModules.keys());
    const factoryTypes = Array.from(this.cognitionFactories.keys());
    return [...new Set([...registeredModules, ...factoryTypes])];
  }

  listPortalFactories(): string[] {
    return Array.from(this.portalFactories.keys());
  }

  // Utility methods
  getAllRegisteredModules(): Record<string, number> {
    return {
      memoryProviders: this.memoryProviders.size,
      emotionModules: this.emotionModules.size,
      cognitionModules: this.cognitionModules.size,
      extensions: this.extensions.size,
      portals: this.portals.size,
      toolSystems: this.toolSystems.size,
      observabilityModules: this.observabilityModules.size,
      streamingInterfaces: this.streamingInterfaces.size,
      emotionFactories: this.emotionFactories.size,
      cognitionFactories: this.cognitionFactories.size,
      portalFactories: this.portalFactories.size,
      extensionFactories: this.extensionFactories.size,
      agentFactories: this.agentFactories.size,
      lazyAgents: this.lazyAgents.size,
    };
  }

  // Generic registry methods
  register(name: string, factory: any): void {
    // Generic register - determine type and route to appropriate registry
    if (name.includes('memory')) {
      this.memoryFactories.set(name, factory);
    } else if (name.includes('emotion')) {
      this.emotionFactories.set(name, factory);
    } else if (name.includes('cognition')) {
      this.cognitionFactories.set(name, factory);
    } else if (name.includes('portal')) {
      this.portalFactories.set(name, factory);
    } else if (name.includes('extension')) {
      this.extensionFactories.set(name, factory);
    }
    runtimeLogger.factory(`📦 Registered generic factory: ${name}`);
  }

  get<T>(name: string): T | undefined {
    // Generic get - try all registries
    return (this.memoryProviders.get(name) ||
      this.emotionModules.get(name) ||
      this.cognitionModules.get(name) ||
      this.extensions.get(name) ||
      this.portals.get(name) ||
      this.toolSystems.get(name) ||
      this.observabilityModules.get(name) ||
      this.streamingInterfaces.get(name)) as T | undefined;
  }

  has(name: string): boolean {
    return (
      this.memoryProviders.has(name) ||
      this.emotionModules.has(name) ||
      this.cognitionModules.has(name) ||
      this.extensions.has(name) ||
      this.portals.has(name) ||
      this.toolSystems.has(name) ||
      this.observabilityModules.has(name) ||
      this.streamingInterfaces.has(name) ||
      this.memoryFactories.has(name) ||
      this.emotionFactories.has(name) ||
      this.cognitionFactories.has(name) ||
      this.portalFactories.has(name) ||
      this.extensionFactories.has(name) ||
      this.agentFactories.has(name) ||
      this.lazyAgents.has(name)
    );
  }

  clear(): void {
    this.memoryProviders.clear();
    this.emotionModules.clear();
    this.cognitionModules.clear();
    this.extensions.clear();
    this.portals.clear();
    this.toolSystems.clear();
    this.observabilityModules.clear();
    this.streamingInterfaces.clear();
    this.emotionFactories.clear();
    this.cognitionFactories.clear();
    this.portalFactories.clear();
    this.extensionFactories.clear();
    this.agentFactories.clear();
    this.lazyAgents.clear();
    runtimeLogger.info('🧹 Registry cleared');
  }

  // New factory registration methods
  registerExtensionFactory(type: string, factory: any): void {
    this.extensionFactories.set(type, factory);
    // Silent registration for cleaner startup
  }

  registerAgentFactory(
    type: string,
    factory: ((config: unknown) => Agent) | AgentFactory
  ): void {
    // Support both the interface signature and AgentFactory objects
    if (typeof factory === 'function') {
      // Wrap simple function as AgentFactory
      const agentFactory: AgentFactory = {
        create: (config: AgentConfig) => factory(config),
      };
      this.agentFactories.set(type, agentFactory);
    } else {
      this.agentFactories.set(type, factory);
    }
    // Silent registration for cleaner startup
  }

  // New factory creation methods
  createExtension(type: string, config: any): Extension | undefined {
    const factory = this.extensionFactories.get(type);
    if (!factory) {
      runtimeLogger.warn(`⚠️ Extension factory for type '${type}' not found`);
      return undefined;
    }
    try {
      const extension = factory(config);
      return extension;
    } catch (error) {
      void error;
      runtimeLogger.error(`❌ Failed to create extension '${type}':`, error);
      return undefined;
    }
  }

  async createAgent(
    type: string,
    config: AgentConfig,
    _characterConfig?: any
  ): Promise<Agent> {
    const factory = this.agentFactories.get(type);
    if (!factory) {
      throw new Error(`Agent factory for type '${type}' not found`);
    }
    try {
      const agent = await factory.create(config);
      return agent;
    } catch (error) {
      void error;
      runtimeLogger.error(`❌ Failed to create agent '${type}':`, error);
      throw error;
    }
  }

  // Lazy agent management methods (removed duplicate - using the first definition above)

  listLazyAgents(): LazyAgent[] {
    return Array.from(this.lazyAgents.values()).filter(
      (value): value is LazyAgent => typeof value !== 'function'
    );
  }

  // Additional listing methods for new factories
  listExtensions(): string[] {
    const registeredExtensions = Array.from(this.extensions.keys());
    const factoryTypes = Array.from(this.extensionFactories.keys());
    return [...new Set([...registeredExtensions, ...factoryTypes])];
  }

  listAgentFactories(): string[] {
    return Array.from(this.agentFactories.keys());
  }

  // Required method from ModuleRegistry interface
  getRegisteredAgents(): Agent[] {
    // Return active agents from lazy agent map
    return Array.from(this.lazyAgents.values())
      .filter(
        (value): value is LazyAgent =>
          typeof value !== 'function' && value.agent !== undefined
      )
      .map((lazyAgent) => lazyAgent.agent!);
  }

  // Additional missing methods that might be needed
  unregister(name: string): boolean {
    // Try to unregister from all maps
    const removed =
      this.memoryProviders.delete(name) ||
      this.emotionModules.delete(name) ||
      this.cognitionModules.delete(name) ||
      this.extensions.delete(name) ||
      this.portals.delete(name) ||
      this.toolSystems.delete(name) ||
      this.observabilityModules.delete(name) ||
      this.streamingInterfaces.delete(name) ||
      this.memoryFactories.delete(name) ||
      this.emotionFactories.delete(name) ||
      this.cognitionFactories.delete(name) ||
      this.portalFactories.delete(name) ||
      this.extensionFactories.delete(name) ||
      this.agentFactories.delete(name) ||
      this.lazyAgents.delete(name);

    if (removed) {
      runtimeLogger.factory(`🗑️ Unregistered: ${name}`);
    }
    return removed;
  }

  list(): string[] {
    // Return all registered names
    const allNames = new Set<string>();
    this.memoryProviders.forEach((_, name) => allNames.add(name));
    this.emotionModules.forEach((_, name) => allNames.add(name));
    this.cognitionModules.forEach((_, name) => allNames.add(name));
    this.extensions.forEach((_, name) => allNames.add(name));
    this.portals.forEach((_, name) => allNames.add(name));
    this.toolSystems.forEach((_, name) => allNames.add(name));
    this.observabilityModules.forEach((_, name) => allNames.add(name));
    this.streamingInterfaces.forEach((_, name) => allNames.add(name));
    this.memoryFactories.forEach((_, name) => allNames.add(name));
    this.emotionFactories.forEach((_, name) => allNames.add(name));
    this.cognitionFactories.forEach((_, name) => allNames.add(name));
    this.portalFactories.forEach((_, name) => allNames.add(name));
    this.extensionFactories.forEach((_, name) => allNames.add(name));
    this.agentFactories.forEach((_, name) => allNames.add(name));
    this.lazyAgents.forEach((_, name) => allNames.add(name));
    return Array.from(allNames);
  }
}
