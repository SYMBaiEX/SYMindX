/**
 * Edge AI Portals Index
 * 
 * Exports edge computing and local AI portal implementations for privacy-preserving
 * and low-latency AI processing
 */

// Ollama Local AI Portal
export { 
  OllamaPortal, 
  createOllamaPortal, 
  defaultOllamaConfig, 
  ollamaModels,
  type OllamaConfig,
  type OllamaModelStatus
} from './ollama.js'

// Export common types
export type {
  Portal,
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability
} from '../../types/portal.js'