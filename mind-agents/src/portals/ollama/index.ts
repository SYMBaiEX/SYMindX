/**
 * Ollama Local AI Portal Index
 *
 * Exports Ollama portal implementations for privacy-preserving local AI inference
 * with support for quantized models and edge computing
 */

// Ollama Local AI Portal
export {
  OllamaPortal,
  createOllamaPortal,
  defaultOllamaConfig,
  ollamaModels,
  type OllamaConfig,
  type OllamaModelStatus,
} from './ollama';

// Export common types
export type {
  Portal,
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability,
} from '../../types/portal';
