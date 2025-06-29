/**
 * Portals Index
 * 
 * This file exports all portal implementations and provides a registry system
 * for managing AI provider portals in the Symindx agent framework.
 */

import { Portal, PortalConfig } from '../types/portal.js'
import type { GoogleConfig } from './google/index.js'
import type { MultimodalConfig } from './multimodal/index.js'
import { MultimodalPortalType } from './multimodal/index.js'
import type { MistralConfig } from './specialized/mistral.js'
import type { CohereConfig } from './specialized/cohere.js'
import type { AzureOpenAIConfig } from './specialized/azure-openai.js'

// Import all portal implementations
export { OpenAIPortal, createOpenAIPortal, defaultOpenAIConfig, type OpenAIConfig } from './openai/index.js'
export { GroqPortal, createGroqPortal, defaultGroqConfig, groqModels, type GroqConfig } from './groq/index.js'
export { AnthropicPortal, createAnthropicPortal, defaultAnthropicConfig, anthropicModels, type AnthropicConfig } from './anthropic/index.js'
export { XAIPortal, createXAIPortal, defaultXAIConfig, xaiModels, type XAIConfig } from './xai/index.js'
export { OpenRouterPortal, createOpenRouterPortal, defaultOpenRouterConfig, openRouterModels, type OpenRouterConfig } from './openrouter/index.js'
export { KlusterAiPortal, createKlusterAiPortal, defaultKlusterAiConfig, klusterAiModels, type KlusterAiConfig } from './kluster.ai/index.js'

// Advanced AI Portals
export { GooglePortal, createGooglePortal, defaultGoogleConfig, googleModels, type GoogleConfig } from './google/index.js'

// Multimodal AI Portals
export { 
  MultimodalPortal, 
  createMultimodalPortal, 
  defaultMultimodalConfig, 
  MultimodalPortalType,
  type MultimodalConfig,
  type VisionAnalysisResult,
  type AudioAnalysisResult,
  type VideoAnalysisResult,
  type SpeechSynthesisResult,
  type MusicGenerationResult,
  type CrossModalReasoningResult
} from './multimodal/index.js'

// Specialized AI Portals
export { 
  MistralPortal, 
  createMistralPortal, 
  defaultMistralConfig, 
  mistralModels,
  type MistralConfig 
} from './specialized/mistral.js'
export { 
  CoherePortal, 
  createCoherePortal, 
  defaultCohereConfig, 
  cohereModels,
  type CohereConfig 
} from './specialized/cohere.js'
export { 
  AzureOpenAIPortal, 
  createAzureOpenAIPortal, 
  defaultAzureOpenAIConfig, 
  azureOpenAIModels,
  type AzureOpenAIConfig,
  type ContentFilterConfig
} from './specialized/azure-openai.js'
export { type ContentFilterLevel } from './specialized/azure-openai.js'

// Edge AI Portals
export { 
  OllamaPortal, 
  createOllamaPortal, 
  defaultOllamaConfig, 
  ollamaModels,
  type OllamaConfig,
  type OllamaModelStatus
} from './edge/ollama.js'

// Import the default configs and portal creators for internal use
import { defaultOpenAIConfig, createOpenAIPortal } from './openai/index.js'
import { defaultGroqConfig, createGroqPortal } from './groq/index.js'
import { defaultAnthropicConfig, createAnthropicPortal } from './anthropic/index.js'
import { defaultXAIConfig, createXAIPortal } from './xai/index.js'
import { defaultOpenRouterConfig, createOpenRouterPortal } from './openrouter/index.js'
import { defaultKlusterAiConfig, createKlusterAiPortal } from './kluster.ai/index.js'
import { defaultGoogleConfig, createGooglePortal } from './google/index.js'
import { defaultMultimodalConfig, createMultimodalPortal } from './multimodal/index.js'
import { defaultMistralConfig, createMistralPortal } from './specialized/mistral.js'
import { defaultCohereConfig, createCoherePortal } from './specialized/cohere.js'
import { defaultAzureOpenAIConfig, createAzureOpenAIPortal } from './specialized/azure-openai.js'
import { defaultOllamaConfig, createOllamaPortal } from './edge/ollama.js'

// Export base portal
export { BasePortal } from './base-portal.js'

// Portal factory type
export type PortalFactory = (config: PortalConfig) => Portal

// Portal registry for managing available portals
export class PortalRegistry {
  private static instance: PortalRegistry
  private portals: Map<string, PortalFactory> = new Map()
  private instances: Map<string, Portal> = new Map()

  private constructor() {
    this.registerDefaultPortals()
  }

  static getInstance(): PortalRegistry {
    if (!PortalRegistry.instance) {
      PortalRegistry.instance = new PortalRegistry()
    }
    return PortalRegistry.instance
  }

  /**
   * Register default portals
   */
  private registerDefaultPortals(): void {
    // Original portals
    this.register('openai', createOpenAIPortal)
    this.register('groq', createGroqPortal)
    this.register('anthropic', createAnthropicPortal)
    this.register('xai', createXAIPortal)
    this.register('openrouter', createOpenRouterPortal)
    this.register('kluster.ai', createKlusterAiPortal)
    
    // Advanced AI portals
    this.register('google', (config: PortalConfig) => createGooglePortal(config as GoogleConfig))
    this.register('multimodal', (config: PortalConfig) => createMultimodalPortal(MultimodalPortalType.UNIFIED_MULTIMODAL, config as MultimodalConfig))
    
    // Specialized AI portals
    this.register('mistral', (config: PortalConfig) => createMistralPortal(config as MistralConfig))
    this.register('cohere', (config: PortalConfig) => createCoherePortal(config as CohereConfig))
    this.register('azure-openai', (config: PortalConfig) => createAzureOpenAIPortal(config as AzureOpenAIConfig))
    
    // Edge AI portals
    this.register('ollama', createOllamaPortal)
  }

  /**
   * Register a new portal
   */
  register(name: string, factory: PortalFactory): void {
    this.portals.set(name, factory)
    console.log(`🔮 Registered portal: ${name}`)
  }

  /**
   * Create a portal instance
   */
  create(name: string, config: PortalConfig): Portal {
    const factory = this.portals.get(name)
    if (!factory) {
      throw new Error(`Portal '${name}' not found. Available portals: ${Array.from(this.portals.keys()).join(', ')}`)
    }

    const portal = factory(config)
    this.instances.set(`${name}-${Date.now()}`, portal)
    return portal
  }

  /**
   * Get available portal names
   */
  getAvailablePortals(): string[] {
    return Array.from(this.portals.keys())
  }

  /**
   * Check if a portal is available
   */
  isAvailable(name: string): boolean {
    return this.portals.has(name)
  }

  /**
   * Get default configuration for a portal
   */
  getDefaultConfig(name: string): Partial<PortalConfig> {
    switch (name) {
      case 'openai':
        return defaultOpenAIConfig
      case 'groq':
        return defaultGroqConfig
      case 'anthropic':
        return defaultAnthropicConfig
      case 'xai':
        return defaultXAIConfig
      case 'openrouter':
        return defaultOpenRouterConfig
      case 'kluster.ai':
        return defaultKlusterAiConfig
      case 'google':
        return defaultGoogleConfig
      case 'multimodal':
        return defaultMultimodalConfig
      case 'mistral':
        return defaultMistralConfig
      case 'cohere':
        return defaultCohereConfig
      case 'azure-openai':
        return defaultAzureOpenAIConfig
      case 'ollama':
        return defaultOllamaConfig
      default:
        return {
          maxTokens: 1000,
          temperature: 0.7,
          timeout: 30000
        }
    }
  }

  /**
   * Clear all instances (useful for cleanup)
   */
  clearInstances(): void {
    this.instances.clear()
  }
}

// Convenience functions for easy portal creation
export function createPortal(name: string, config: PortalConfig): Portal {
  const registry = PortalRegistry.getInstance()
  return registry.create(name, config)
}

export function getAvailablePortals(): string[] {
  const registry = PortalRegistry.getInstance()
  return registry.getAvailablePortals()
}

export function getAvailablePortalTypes(): string[] {
  const registry = PortalRegistry.getInstance()
  return registry.getAvailablePortals()
}

export function isPortalAvailable(name: string): boolean {
  const registry = PortalRegistry.getInstance()
  return registry.isAvailable(name)
}

export function getPortalDefaultConfig(name: string): Partial<PortalConfig> {
  const registry = PortalRegistry.getInstance()
  return registry.getDefaultConfig(name)
}

// Initialize skills function for agent integration
export function initializePortals(): PortalRegistry {
  console.log('🔮 Initializing portals system...')
  const registry = PortalRegistry.getInstance()
  const availablePortals = registry.getAvailablePortals()
  console.log(`✅ Portals system initialized with ${availablePortals.length} providers:`, availablePortals)
  return registry
}

// Export portal types for external use
export type {
  Portal,
  PortalConfig,
  TextGenerationOptions,
  TextGenerationResult,
  ChatMessage,
  ChatGenerationOptions,
  ChatGenerationResult,
  FunctionDefinition
} from '../types/portal.js'