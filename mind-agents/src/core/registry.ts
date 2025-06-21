/**
 * SYMindX Module Registry
 * 
 * Central registry for managing all module types in the SYMindX runtime.
 */

import { 
  ModuleRegistry, 
  MemoryProvider, 
  Extension,
  Agent
} from '../types/agent.js'
import { Portal } from '../types/portal.js'
import { EmotionModule } from '../types/emotion.js'
import { CognitionModule } from '../types/cognition.js'

// Temporary type definitions until they are properly defined in their respective modules
type ToolSystem = {
  name: string;
  // Add more properties as needed
};

type ObservabilityModule = {
  name: string;
  // Add more properties as needed
};

type StreamingInterface = {
  name: string;
  // Add more properties as needed
};

/**
 * Main module registry implementation
 */
export class SYMindXModuleRegistry implements ModuleRegistry {
  private memoryProviders = new Map<string, MemoryProvider>()
  private emotionModules = new Map<string, EmotionModule>()
  private cognitionModules = new Map<string, CognitionModule>()
  private extensions = new Map<string, Extension>()
  private portals = new Map<string, Portal>()
  private toolSystems = new Map<string, ToolSystem>()
  private observabilityModules = new Map<string, ObservabilityModule>()
  private streamingInterfaces = new Map<string, StreamingInterface>()

  registerMemoryProvider(name: string, provider: MemoryProvider): void {
    this.memoryProviders.set(name, provider)
    console.log(`📝 Registered memory provider: ${name}`)
  }

  registerEmotionModule(name: string, module: EmotionModule): void {
    this.emotionModules.set(name, module)
    console.log(`😊 Registered emotion module: ${name}`)
  }

  registerCognitionModule(name: string, module: CognitionModule): void {
    this.cognitionModules.set(name, module)
    console.log(`🧠 Registered cognition module: ${name}`)
  }

  registerExtension(name: string, extension: Extension): void {
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
  registerToolSystem(name: string, toolSystem: ToolSystem): void {
    if (!name || !toolSystem) {
      throw new Error('Tool system name and implementation are required');
    }
    this.toolSystems.set(name, toolSystem);
    console.log(`🔧 Registered tool system: ${name}`);
  }

  getToolSystem(name: string): ToolSystem | undefined {
    if (!name) {
      throw new Error('Tool system name is required');
    }
    return this.toolSystems.get(name);
  }

  listToolSystems(): string[] {
    return Array.from(this.toolSystems.keys());
  }

  // Observability methods
  registerObservability(name: string, observability: ObservabilityModule): void {
    if (!name || !observability) {
      throw new Error('Observability module name and implementation are required');
    }
    this.observabilityModules.set(name, observability);
    console.log(`📊 Registered observability module: ${name}`);
  }

  getObservability(name: string): ObservabilityModule | undefined {
    if (!name) {
      throw new Error('Observability module name is required');
    }
    return this.observabilityModules.get(name);
  }

  listObservabilityModules(): string[] {
    return Array.from(this.observabilityModules.keys());
  }

  // Streaming interface methods
  registerStreamingInterface(name: string, streaming: StreamingInterface): void {
    if (!name || !streaming) {
      throw new Error('Streaming interface name and implementation are required');
    }
    this.streamingInterfaces.set(name, streaming);
    console.log(`🌊 Registered streaming interface: ${name}`);
  }

  getStreamingInterface(name: string): StreamingInterface | undefined {
    if (!name) {
      throw new Error('Streaming interface name is required');
    }
    return this.streamingInterfaces.get(name);
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