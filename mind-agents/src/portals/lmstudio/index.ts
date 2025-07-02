/**
 * LM Studio Portal Index
 * 
 * Exports LM Studio portal implementation for local model serving with OpenAI-compatible API
 * and advanced model management capabilities
 */

// LM Studio Local AI Portal
export { 
  LMStudioPortal, 
  createLMStudioPortal, 
  defaultLMStudioConfig,
  lmStudioModels,
  type LMStudioConfig,
  type LMStudioModelInfo,
  type LMStudioServerStatus
} from './lmstudio.js'

// Export common types
export type {
  Portal,
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability
} from '../../types/portal.js'