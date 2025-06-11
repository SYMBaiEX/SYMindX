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
import { Portal } from '../types/portal.js'
import { EmotionModule } from '../types/emotion.js'
import { CognitionModule } from '../types/cognition.js'

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
      streamingInterfaces: this.streamingInterfaces.size
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
    console.log('🧹 Registry cleared')
  }
}