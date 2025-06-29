/**
 * Specialized AI Portals Index
 * 
 * Exports all specialized AI portal implementations including enterprise providers,
 * multimodal systems, and edge computing solutions
 */

// Mistral AI Portal
export { 
  MistralPortal, 
  createMistralPortal, 
  defaultMistralConfig, 
  mistralModels,
  type MistralConfig 
} from './mistral.js'

// Cohere AI Portal
export { 
  CoherePortal, 
  createCoherePortal, 
  defaultCohereConfig, 
  cohereModels,
  type CohereConfig 
} from './cohere.js'

// Azure OpenAI Portal
export { 
  AzureOpenAIPortal, 
  createAzureOpenAIPortal, 
  defaultAzureOpenAIConfig, 
  azureOpenAIModels,
  type AzureOpenAIConfig,
  type ContentFilterConfig,
  ContentFilterLevel
} from './azure-openai.js'

// Export common types
export type {
  Portal,
  PortalConfig,
  PortalType,
  PortalStatus,
  ModelType,
  PortalCapability
} from '../../types/portal.js'