/**
 * SYMindX Module Registry
 * 
 * Central registry for managing all module types in the SYMindX runtime.
 */

import { 
  ModuleRegistry, 
  MemoryProvider, 
  Extension
} from '../types/agent.js'
import { Portal, PortalConfig } from '../types/portal.js'
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
  private emotionFactories = new Map<string, EmotionModuleFactory>()
  private cognitionFactories = new Map<string, CognitionModuleFactory>()
  private portalFactories = new Map<string, PortalFactory>()

  registerMemoryProvider(name: string, provider: any): void {
    this.memoryProviders.set(name, provider)
    console.log(`📝 Registered memory provider: ${name}`)
  }

  registerEmotionModule(name: string, module: any): void {
    this.emotionModules.set(name, module)
    console.log(`😊 Registered emotion module: ${name}`)
  }

  registerCognitionModule(name: string, module: any): void {
    this.cognitionModules.set(name, module)
    console.log(`🧠 Registered cognition module: ${name}`)
  }

  registerExtension(name: string, extension: any): void {
    this.extensions.set(name, extension)
    console.log(`🔌 Registered extension: ${name}`)
  }

  registerPortal(name: string, portal: Portal): void {
    this.portals.set(name, portal)
    console.log(`🔮 Registered portal: ${name}`)
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
    console.log(`🔧 Registered tool system: ${name}`)
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
    console.log(`📊 Registered observability module: ${name}`)
  }

  getObservability(name: string): any {
    return this.observabilityModules.get(name)
  }

  // Streaming methods
  registerStreaming(name: string, streaming: any): void {
    this.streamingInterfaces.set(name, streaming)
    console.log(`📡 Registered streaming interface: ${name}`)
  }

  getStreaming(name: string): any {
    return this.streamingInterfaces.get(name)
  }

  // Factory registration methods
  registerEmotionFactory(type: string, factory: EmotionModuleFactory): void {
    this.emotionFactories.set(type, factory)
    console.log(`🏭 Registered emotion factory: ${type}`)
  }

  registerCognitionFactory(type: string, factory: CognitionModuleFactory): void {
    this.cognitionFactories.set(type, factory)
    console.log(`🏭 Registered cognition factory: ${type}`)
  }

  registerPortalFactory(type: string, factory: PortalFactory): void {
    this.portalFactories.set(type, factory)
    console.log(`🏭 Registered portal factory: ${type}`)
  }

  // Factory creation methods
  createEmotionModule(type: string, config: BaseConfig): EmotionModule | undefined {
    const factory = this.emotionFactories.get(type)
    if (!factory) {
      console.warn(`⚠️ Emotion factory for type '${type}' not found`)
      return undefined
    }
    try {
      const module = factory(config)
      console.log(`✅ Created emotion module: ${type}`)
      return module
    } catch (error) {
      console.error(`❌ Failed to create emotion module '${type}':`, error)
      return undefined
    }
  }

  createCognitionModule(type: string, config: BaseConfig): CognitionModule | undefined {
    const factory = this.cognitionFactories.get(type)
    if (!factory) {
      console.warn(`⚠️ Cognition factory for type '${type}' not found`)
      return undefined
    }
    try {
      const module = factory(config)
      console.log(`✅ Created cognition module: ${type}`)
      return module
    } catch (error) {
      console.error(`❌ Failed to create cognition module '${type}':`, error)
      return undefined
    }
  }

  createPortal(type: string, config: PortalConfig): Portal | undefined {
    const factory = this.portalFactories.get(type)
    if (!factory) {
      console.warn(`⚠️ Portal factory for type '${type}' not found`)
      return undefined
    }
    try {
      const portal = factory(config)
      console.log(`✅ Created portal: ${type}`)
      return portal
    } catch (error) {
      console.error(`❌ Failed to create portal '${type}':`, error)
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
      portalFactories: this.portalFactories.size
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
    console.log('🧹 Registry cleared')
  }
}