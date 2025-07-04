/**
 * SYMindX Module Registry
 * 
 * Central registry for managing all module types in the SYMindX runtime.
 */

import { 
  ModuleRegistry, 
  MemoryProvider, 
  Extension,
  LazyAgent,
  Agent,
  AgentConfig,
  AgentFactory
} from '../types/agent.js'
import { Portal, PortalConfig } from '../types/portal.js'
import { runtimeLogger } from '../utils/logger.js'
import { EmotionModule, EmotionModuleFactory } from '../types/emotion.js'
import { CognitionModule, CognitionModuleFactory } from '../types/cognition.js'
import { PortalFactory } from '../portals/index.js'
import { BaseConfig } from '../types/common.js'

/**
 * Main module registry implementation
 */
export class SYMindXModuleRegistry implements ModuleRegistry {
  private memoryProviders = new Map<string, any>()
  private emotionModules = new Map<string, any>()
  private cognitionModules = new Map<string, any>()
  private extensions = new Map<string, any>()
  private portals = new Map<string, Portal>()
  private toolSystems = new Map<string, any>()
  private observabilityModules = new Map<string, any>()
  private streamingInterfaces = new Map<string, any>()

  // Factory storage maps
  private memoryFactories = new Map<string, any>()
  private emotionFactories = new Map<string, EmotionModuleFactory>()
  private cognitionFactories = new Map<string, CognitionModuleFactory>()
  private portalFactories = new Map<string, PortalFactory>()
  private extensionFactories = new Map<string, any>()
  private agentFactories = new Map<string, AgentFactory>()
  
  // Lazy agent management
  private lazyAgents = new Map<string, LazyAgent>()

  registerMemoryProvider(name: string, provider: any): void {
    this.memoryProviders.set(name, provider)
    runtimeLogger.factory(`📝 Registered memory provider: ${name}`)
  }

  registerEmotionModule(name: string, module: any): void {
    this.emotionModules.set(name, module)
    runtimeLogger.factory(`😊 Registered emotion module: ${name}`)
  }

  registerCognitionModule(name: string, module: any): void {
    this.cognitionModules.set(name, module)
    runtimeLogger.factory(`🧠 Registered cognition module: ${name}`)
  }

  registerExtension(name: string, extension: any): void {
    this.extensions.set(name, extension)
    // Reduced logging for cleaner startup
  }

  registerPortal(name: string, portal: Portal): void {
    this.portals.set(name, portal)
    // Reduced logging for cleaner startup
  }

  getMemoryProvider(name: string): MemoryProvider | undefined {
    return this.memoryProviders.get(name)
  }

  getEmotionModule(name: string): EmotionModule | undefined {
    return this.emotionModules.get(name)
  }

  getCognitionModule(name: string): CognitionModule | undefined {
    return this.cognitionModules.get(name)
  }

  getExtension(name: string): Extension | undefined {
    return this.extensions.get(name)
  }

  getPortal(name: string): Portal | undefined {
    return this.portals.get(name)
  }

  listPortals(): string[] {
    return Array.from(this.portals.keys())
  }

  // Tool system methods
  registerToolSystem(name: string, toolSystem: any): void {
    this.toolSystems.set(name, toolSystem)
    runtimeLogger.factory(`🔧 Registered tool system: ${name}`)
  }

  getToolSystem(name: string): any {
    return this.toolSystems.get(name)
  }

  listToolSystems(): string[] {
    return Array.from(this.toolSystems.keys())
  }

  // Observability methods
  registerObservability(name: string, observability: any): void {
    this.observabilityModules.set(name, observability)
    runtimeLogger.factory(`📊 Registered observability module: ${name}`)
  }

  getObservability(name: string): any {
    return this.observabilityModules.get(name)
  }

  // Streaming methods
  registerStreaming(name: string, streaming: any): void {
    this.streamingInterfaces.set(name, streaming)
    runtimeLogger.factory(`📡 Registered streaming interface: ${name}`)
  }

  getStreaming(name: string): any {
    return this.streamingInterfaces.get(name)
  }

  // Factory registration methods
  registerMemoryFactory(type: string, factory: any): void {
    this.memoryFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  registerEmotionFactory(type: string, factory: EmotionModuleFactory): void {
    this.emotionFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  registerCognitionFactory(type: string, factory: CognitionModuleFactory): void {
    this.cognitionFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  registerPortalFactory(type: string, factory: PortalFactory): void {
    this.portalFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  // Factory creation methods
  createMemoryProvider(type: string, config: any): any {
    const factory = this.memoryFactories.get(type)
    if (!factory) {
      runtimeLogger.warn(`⚠️ Memory factory for type '${type}' not found`)
      return undefined
    }
    try {
      const provider = factory(config)
      // Silent creation for cleaner startup
      return provider
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create memory provider '${type}':`, error)
      return undefined
    }
  }

  createEmotionModule(type: string, config: BaseConfig): EmotionModule | undefined {
    const factory = this.emotionFactories.get(type)
    if (!factory) {
      runtimeLogger.warn(`⚠️ Emotion factory for type '${type}' not found`)
      return undefined
    }
    try {
      const module = factory(config)
      // Silent creation for cleaner startup
      return module
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create emotion module '${type}':`, error)
      return undefined
    }
  }

  createCognitionModule(type: string, config: BaseConfig): CognitionModule | undefined {
    const factory = this.cognitionFactories.get(type)
    if (!factory) {
      runtimeLogger.warn(`⚠️ Cognition factory for type '${type}' not found`)
      return undefined
    }
    try {
      const module = factory(config)
      runtimeLogger.factory(`✅ Created cognition module: ${type}`)
      return module
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create cognition module '${type}':`, error)
      return undefined
    }
  }

  createPortal(type: string, config: PortalConfig): Portal | undefined {
    const factory = this.portalFactories.get(type)
    if (!factory) {
      runtimeLogger.warn(`⚠️ Portal factory for type '${type}' not found`)
      return undefined
    }
    try {
      const portal = factory(config)
      runtimeLogger.factory(`✅ Created portal: ${type}`)
      return portal
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create portal '${type}':`, error)
      return undefined
    }
  }

  // Factory listing methods
  listEmotionModules(): string[] {
    // Combine registered modules and factory types
    const registeredModules = Array.from(this.emotionModules.keys())
    const factoryTypes = Array.from(this.emotionFactories.keys())
    return [...new Set([...registeredModules, ...factoryTypes])]
  }

  listCognitionModules(): string[] {
    // Combine registered modules and factory types
    const registeredModules = Array.from(this.cognitionModules.keys())
    const factoryTypes = Array.from(this.cognitionFactories.keys())
    return [...new Set([...registeredModules, ...factoryTypes])]
  }

  listPortalFactories(): string[] {
    return Array.from(this.portalFactories.keys())
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
      lazyAgents: this.lazyAgents.size
    }
  }

  clear(): void {
    this.memoryProviders.clear()
    this.emotionModules.clear()
    this.cognitionModules.clear()
    this.extensions.clear()
    this.portals.clear()
    this.toolSystems.clear()
    this.observabilityModules.clear()
    this.streamingInterfaces.clear()
    this.emotionFactories.clear()
    this.cognitionFactories.clear()
    this.portalFactories.clear()
    this.extensionFactories.clear()
    this.agentFactories.clear()
    this.lazyAgents.clear()
    runtimeLogger.info('🧹 Registry cleared')
  }

  // New factory registration methods
  registerExtensionFactory(type: string, factory: any): void {
    this.extensionFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  registerAgentFactory(type: string, factory: AgentFactory): void {
    this.agentFactories.set(type, factory)
    // Silent registration for cleaner startup
  }

  // New factory creation methods
  createExtension(type: string, config: any): Extension | undefined {
    const factory = this.extensionFactories.get(type)
    if (!factory) {
      runtimeLogger.warn(`⚠️ Extension factory for type '${type}' not found`)
      return undefined
    }
    try {
      const extension = factory(config)
      return extension
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create extension '${type}':`, error)
      return undefined
    }
  }

  async createAgent(type: string, config: AgentConfig, characterConfig?: any): Promise<Agent> {
    const factory = this.agentFactories.get(type)
    if (!factory) {
      throw new Error(`Agent factory for type '${type}' not found`)
    }
    try {
      const agent = await factory(config, characterConfig)
      return agent
    } catch (error) {
      runtimeLogger.error(`❌ Failed to create agent '${type}':`, error)
      throw error
    }
  }

  // Lazy agent management methods
  registerLazyAgent(lazyAgent: LazyAgent): void {
    this.lazyAgents.set(lazyAgent.id, lazyAgent)
    runtimeLogger.factory(`🎭 Registered lazy agent: ${lazyAgent.name}`)
  }

  getLazyAgent(id: string): LazyAgent | undefined {
    return this.lazyAgents.get(id)
  }

  listLazyAgents(): LazyAgent[] {
    return Array.from(this.lazyAgents.values())
  }

  // Additional listing methods for new factories
  listExtensions(): string[] {
    const registeredExtensions = Array.from(this.extensions.keys())
    const factoryTypes = Array.from(this.extensionFactories.keys())
    return [...new Set([...registeredExtensions, ...factoryTypes])]
  }

  listAgentFactories(): string[] {
    return Array.from(this.agentFactories.keys())
  }
}