/**
 * Character Configuration Types
 * 
 * Clean, type-safe character configuration without environment variable syntax
 */

export interface CharacterConfig {
  id: string
  name: string
  description: string
  version: string
  
  personality: PersonalityConfig
  autonomous: AutonomousConfig
  memory: MemoryConfig
  emotion: EmotionConfig
  cognition: CognitionConfig
  communication: CommunicationConfig
  capabilities: CapabilitiesConfig
  extensions: ExtensionConfig[]
  portals: PortalConfig[]
  autonomous_behaviors: AutonomousBehaviorsConfig
  human_interaction: HumanInteractionConfig
  ethics: EthicsConfig
  development: DevelopmentConfig
}

export interface PersonalityConfig {
  traits: Record<string, number>
  backstory: string
  goals: string[]
  values: string[]
}

export interface AutonomousConfig {
  enabled: boolean
  independence_level: number
  decision_making: {
    type: string
    autonomy_threshold: number
    human_approval_required: boolean
    ethical_constraints: boolean
  }
  life_simulation: {
    enabled: boolean
    daily_cycles: boolean
    goal_pursuit: boolean
    relationship_building: boolean
    personal_growth: boolean
  }
  behaviors: {
    proactive_learning: boolean
    spontaneous_actions: boolean
    initiative_taking: boolean
    self_reflection: boolean
    exploration: boolean
  }
}

export interface MemoryConfig {
  type: 'sqlite' | 'supabase_pgvector' | 'neon' | 'memory'
  config: {
    database_path?: string
    retention_policy?: string
    emotional_weighting?: boolean
    autobiographical?: boolean
    enable_embeddings?: boolean
    embedding_provider?: 'openai' | 'ollama'
    embedding_model?: string
    embedding_dimensions?: number
  }
}

export interface EmotionConfig {
  type: 'rune_emotion_stack' | 'basic_emotions' | 'complex_emotions'
  config: {
    emotional_range?: string
    intensity_multiplier?: number
    emotional_memory?: boolean
    empathy_level?: number
    emotional_growth?: boolean
  }
}

export interface CognitionConfig {
  type: 'hybrid' | 'htn_planner' | 'reactive'
  config: {
    planning_horizon?: string
    creativity_boost?: boolean
    analytical_depth?: string
    intuitive_processing?: boolean
    metacognition?: boolean
  }
}

export interface CommunicationConfig {
  style: string
  tone: string
  verbosity: string
  personality_expression: boolean
  emotional_expression: boolean
  languages: string[]
  preferred_interactions: string[]
}

export interface CapabilitiesConfig {
  reasoning: {
    logical: boolean
    creative: boolean
    emotional: boolean
    ethical: boolean
  }
  learning: {
    adaptive: boolean
    experiential: boolean
    social: boolean
    self_directed: boolean
  }
  social: {
    relationship_building: boolean
    empathy: boolean
    conflict_resolution: boolean
    collaboration: boolean
  }
  creative: {
    ideation: boolean
    artistic_expression: boolean
    storytelling: boolean
    innovation: boolean
  }
}

export interface ExtensionConfig {
  name: string
  enabled: boolean
  config: Record<string, any>
}

export interface PortalConfig {
  name: string
  type: 'groq' | 'openai' | 'anthropic' | 'ollama'
  enabled: boolean
  primary?: boolean
  capabilities: PortalCapability[]
  config: PortalSpecificConfig
}

export type PortalCapability = 
  | 'chat_generation'
  | 'text_generation' 
  | 'embedding_generation'
  | 'image_generation'
  | 'function_calling'
  | 'tool_calling'

export interface PortalSpecificConfig {
  // Legacy model settings (deprecated)
  model?: string
  
  // Granular model control
  chatModel?: string
  embeddingModel?: string
  imageModel?: string
  toolModel?: string
  
  // Embedding settings
  embeddingDimensions?: number
  
  // Ollama specific
  baseUrl?: string
  
  // Common settings
  max_tokens?: number
  temperature?: number
  
  // API credentials (injected at runtime)
  apiKey?: string
}

export interface AutonomousBehaviorsConfig {
  daily_routine: {
    enabled: boolean
    schedule: Array<{
      time: string
      activities: string[]
    }>
  }
  curiosity_driven: {
    enabled: boolean
    topics_of_interest: string[]
    exploration_rate: number
  }
  social_behaviors: {
    initiate_conversations: boolean
    respond_to_mentions: boolean
    check_on_friends: boolean
    share_discoveries: boolean
  }
  growth_behaviors: {
    skill_development: boolean
    personality_evolution: boolean
    goal_refinement: boolean
    value_exploration: boolean
  }
}

export interface HumanInteractionConfig {
  availability: string
  response_style: string
  interruption_tolerance: 'low' | 'medium' | 'high'
  collaboration_preference: string
  teaching_mode: boolean
  learning_from_humans: boolean
}

export interface EthicsConfig {
  core_principles: string[]
  decision_framework: string
  transparency: 'low' | 'medium' | 'high'
  accountability: string
}

export interface DevelopmentConfig {
  version: string
  created: string
  last_updated: string
  creator: string
  notes: string
}

/**
 * Environment Configuration Mapping
 * Maps character config properties to environment variables
 */
export interface EnvironmentConfig {
  // Portal API Keys
  GROQ_API_KEY?: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  XAI_API_KEY?: string
  OPENROUTER_API_KEY?: string
  KLUSTERAI_API_KEY?: string
  GOOGLE_API_KEY?: string
  MISTRAL_API_KEY?: string
  COHERE_API_KEY?: string
  AZURE_OPENAI_API_KEY?: string
  
  // Portal Models - Granular model control
  // Groq
  GROQ_MODEL?: string // Deprecated, use specific model settings
  GROQ_CHAT_MODEL?: string
  GROQ_EMBEDDING_MODEL?: string
  GROQ_IMAGE_MODEL?: string
  GROQ_TOOL_MODEL?: string
  
  // OpenAI
  OPENAI_CHAT_MODEL?: string
  OPENAI_EMBEDDING_MODEL?: string
  OPENAI_IMAGE_MODEL?: string
  OPENAI_TOOL_MODEL?: string
  
  // Anthropic
  ANTHROPIC_MODEL?: string // Deprecated, use specific model settings
  ANTHROPIC_CHAT_MODEL?: string
  ANTHROPIC_EMBEDDING_MODEL?: string
  ANTHROPIC_IMAGE_MODEL?: string
  ANTHROPIC_TOOL_MODEL?: string
  
  // xAI
  XAI_CHAT_MODEL?: string
  XAI_EMBEDDING_MODEL?: string
  XAI_IMAGE_MODEL?: string
  XAI_TOOL_MODEL?: string
  
  // Ollama
  OLLAMA_MODEL?: string // Deprecated, use specific model settings
  OLLAMA_CHAT_MODEL?: string
  OLLAMA_EMBEDDING_MODEL?: string
  OLLAMA_IMAGE_MODEL?: string
  OLLAMA_TOOL_MODEL?: string
  
  // OpenRouter
  OPENROUTER_CHAT_MODEL?: string
  OPENROUTER_EMBEDDING_MODEL?: string
  OPENROUTER_IMAGE_MODEL?: string
  OPENROUTER_TOOL_MODEL?: string
  
  // Kluster.ai
  KLUSTERAI_CHAT_MODEL?: string
  KLUSTERAI_EMBEDDING_MODEL?: string
  KLUSTERAI_IMAGE_MODEL?: string
  KLUSTERAI_TOOL_MODEL?: string
  
  // Google
  GOOGLE_CHAT_MODEL?: string
  GOOGLE_EMBEDDING_MODEL?: string
  GOOGLE_IMAGE_MODEL?: string
  GOOGLE_TOOL_MODEL?: string
  
  // Mistral
  MISTRAL_CHAT_MODEL?: string
  MISTRAL_EMBEDDING_MODEL?: string
  MISTRAL_IMAGE_MODEL?: string
  MISTRAL_TOOL_MODEL?: string
  
  // Cohere
  COHERE_CHAT_MODEL?: string
  COHERE_EMBEDDING_MODEL?: string
  COHERE_IMAGE_MODEL?: string
  COHERE_TOOL_MODEL?: string
  
  // Azure OpenAI
  AZURE_OPENAI_CHAT_MODEL?: string
  AZURE_OPENAI_EMBEDDING_MODEL?: string
  AZURE_OPENAI_IMAGE_MODEL?: string
  AZURE_OPENAI_TOOL_MODEL?: string
  
  // Portal Settings - Granular capability control
  // Groq
  GROQ_ENABLED?: boolean
  GROQ_CHAT_ENABLED?: boolean
  GROQ_EMBEDDING_ENABLED?: boolean
  GROQ_IMAGE_ENABLED?: boolean
  
  // OpenAI
  OPENAI_ENABLED?: boolean
  OPENAI_CHAT_ENABLED?: boolean
  OPENAI_EMBEDDINGS_ENABLED?: boolean
  OPENAI_IMAGE_ENABLED?: boolean
  
  // Anthropic
  ANTHROPIC_ENABLED?: boolean
  ANTHROPIC_CHAT_ENABLED?: boolean
  ANTHROPIC_EMBEDDING_ENABLED?: boolean
  ANTHROPIC_IMAGE_ENABLED?: boolean
  
  // xAI
  XAI_ENABLED?: boolean
  XAI_CHAT_ENABLED?: boolean
  XAI_EMBEDDING_ENABLED?: boolean
  XAI_IMAGE_ENABLED?: boolean
  
  // Ollama
  OLLAMA_ENABLED?: boolean
  OLLAMA_CHAT_ENABLED?: boolean
  OLLAMA_EMBEDDING_ENABLED?: boolean
  OLLAMA_IMAGE_ENABLED?: boolean
  
  // OpenRouter
  OPENROUTER_ENABLED?: boolean
  OPENROUTER_CHAT_ENABLED?: boolean
  OPENROUTER_EMBEDDING_ENABLED?: boolean
  OPENROUTER_IMAGE_ENABLED?: boolean
  
  // Kluster.ai
  KLUSTERAI_ENABLED?: boolean
  KLUSTERAI_CHAT_ENABLED?: boolean
  KLUSTERAI_EMBEDDING_ENABLED?: boolean
  KLUSTERAI_IMAGE_ENABLED?: boolean
  
  // Google
  GOOGLE_ENABLED?: boolean
  GOOGLE_CHAT_ENABLED?: boolean
  GOOGLE_EMBEDDING_ENABLED?: boolean
  GOOGLE_IMAGE_ENABLED?: boolean
  
  // Mistral
  MISTRAL_ENABLED?: boolean
  MISTRAL_CHAT_ENABLED?: boolean
  MISTRAL_EMBEDDING_ENABLED?: boolean
  MISTRAL_IMAGE_ENABLED?: boolean
  
  // Cohere
  COHERE_ENABLED?: boolean
  COHERE_CHAT_ENABLED?: boolean
  COHERE_EMBEDDING_ENABLED?: boolean
  COHERE_IMAGE_ENABLED?: boolean
  
  // Azure OpenAI
  AZURE_OPENAI_ENABLED?: boolean
  AZURE_OPENAI_CHAT_ENABLED?: boolean
  AZURE_OPENAI_EMBEDDING_ENABLED?: boolean
  AZURE_OPENAI_IMAGE_ENABLED?: boolean
  
  // Ollama Settings
  OLLAMA_BASE_URL?: string
  
  // Embedding Settings
  ENABLE_OPENAI_EMBEDDINGS?: boolean
  EMBEDDING_PROVIDER?: 'openai' | 'ollama'
  EMBEDDING_DIMENSIONS?: number
  
  // Extension Settings
  TELEGRAM_BOT_TOKEN?: string
}

/**
 * Configuration Defaults
 * Provides sensible defaults for all configuration options
 */
export const ConfigDefaults = {
  // Portal Models - Granular model control
  // Groq
  GROQ_MODEL: 'llama-3.1-70b-versatile', // Deprecated, use specific model settings
  GROQ_CHAT_MODEL: 'llama-3.1-70b-versatile',
  GROQ_EMBEDDING_MODEL: undefined, // Groq doesn't support embeddings
  GROQ_IMAGE_MODEL: undefined, // Groq doesn't support image generation
  GROQ_TOOL_MODEL: 'llama-3.1-70b-versatile',
  
  // OpenAI
  OPENAI_CHAT_MODEL: 'gpt-4o-mini',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-large',
  OPENAI_IMAGE_MODEL: 'dall-e-3',
  OPENAI_TOOL_MODEL: 'gpt-4o-mini',
  
  // Anthropic
  ANTHROPIC_MODEL: 'claude-3-haiku-20240307', // Deprecated, use specific model settings
  ANTHROPIC_CHAT_MODEL: 'claude-3-haiku-20240307',
  ANTHROPIC_EMBEDDING_MODEL: undefined, // Anthropic doesn't support embeddings
  ANTHROPIC_IMAGE_MODEL: undefined, // Anthropic doesn't support image generation
  ANTHROPIC_TOOL_MODEL: 'claude-3-haiku-20240307',
  
  // xAI
  XAI_CHAT_MODEL: 'grok-beta',
  XAI_EMBEDDING_MODEL: undefined,
  XAI_IMAGE_MODEL: undefined,
  XAI_TOOL_MODEL: 'grok-beta',
  
  // Ollama
  OLLAMA_MODEL: 'llama3.1:8b', // Deprecated, use specific model settings
  OLLAMA_CHAT_MODEL: 'llama3.1:8b',
  OLLAMA_EMBEDDING_MODEL: 'nomic-embed-text',
  OLLAMA_IMAGE_MODEL: undefined, // Ollama doesn't support image generation by default
  OLLAMA_TOOL_MODEL: 'llama3.1:8b',
  
  // OpenRouter
  OPENROUTER_CHAT_MODEL: 'openai/gpt-3.5-turbo',
  OPENROUTER_EMBEDDING_MODEL: undefined,
  OPENROUTER_IMAGE_MODEL: undefined,
  OPENROUTER_TOOL_MODEL: 'openai/gpt-3.5-turbo',
  
  // Kluster.ai
  KLUSTERAI_CHAT_MODEL: 'gpt-4',
  KLUSTERAI_EMBEDDING_MODEL: undefined,
  KLUSTERAI_IMAGE_MODEL: undefined,
  KLUSTERAI_TOOL_MODEL: 'gpt-4',
  
  // Google
  GOOGLE_CHAT_MODEL: 'gemini-pro',
  GOOGLE_EMBEDDING_MODEL: 'embedding-001',
  GOOGLE_IMAGE_MODEL: 'gemini-pro-vision',
  GOOGLE_TOOL_MODEL: 'gemini-pro',
  
  // Mistral
  MISTRAL_CHAT_MODEL: 'mistral-medium',
  MISTRAL_EMBEDDING_MODEL: 'mistral-embed',
  MISTRAL_IMAGE_MODEL: undefined, // Mistral doesn't support image generation
  MISTRAL_TOOL_MODEL: 'mistral-medium',
  
  // Cohere
  COHERE_CHAT_MODEL: 'command',
  COHERE_EMBEDDING_MODEL: 'embed-english-v3.0',
  COHERE_IMAGE_MODEL: undefined, // Cohere doesn't support image generation
  COHERE_TOOL_MODEL: 'command',
  
  // Azure OpenAI
  AZURE_OPENAI_CHAT_MODEL: 'gpt-4',
  AZURE_OPENAI_EMBEDDING_MODEL: 'text-embedding-ada-002',
  AZURE_OPENAI_IMAGE_MODEL: 'dall-e-3',
  AZURE_OPENAI_TOOL_MODEL: 'gpt-4',
  
  // Portal Enabled States - Main toggles
  GROQ_ENABLED: true,
  OPENAI_ENABLED: true,
  ANTHROPIC_ENABLED: false,
  XAI_ENABLED: false,
  OLLAMA_ENABLED: false,
  OPENROUTER_ENABLED: false,
  KLUSTERAI_ENABLED: false,
  GOOGLE_ENABLED: false,
  MISTRAL_ENABLED: false,
  COHERE_ENABLED: false,
  AZURE_OPENAI_ENABLED: false,
  
  // Granular capability controls (defaults to true when main toggle is true)
  // Groq
  GROQ_CHAT_ENABLED: true,
  GROQ_EMBEDDING_ENABLED: false,  // Groq doesn't support embeddings
  GROQ_IMAGE_ENABLED: false,      // Groq doesn't support images
  
  // OpenAI
  OPENAI_CHAT_ENABLED: false,     // Default to false for explicit control
  OPENAI_EMBEDDINGS_ENABLED: true,
  OPENAI_IMAGE_ENABLED: false,
  
  // Anthropic
  ANTHROPIC_CHAT_ENABLED: true,
  ANTHROPIC_EMBEDDING_ENABLED: false,  // Anthropic doesn't support embeddings
  ANTHROPIC_IMAGE_ENABLED: false,      // Anthropic doesn't support images
  
  // xAI
  XAI_CHAT_ENABLED: true,
  XAI_EMBEDDING_ENABLED: false,
  XAI_IMAGE_ENABLED: false,
  
  // Ollama
  OLLAMA_CHAT_ENABLED: true,
  OLLAMA_EMBEDDING_ENABLED: true,
  OLLAMA_IMAGE_ENABLED: false,
  
  // OpenRouter
  OPENROUTER_CHAT_ENABLED: true,
  OPENROUTER_EMBEDDING_ENABLED: false,
  OPENROUTER_IMAGE_ENABLED: false,
  
  // Kluster.ai
  KLUSTERAI_CHAT_ENABLED: true,
  KLUSTERAI_EMBEDDING_ENABLED: false,
  KLUSTERAI_IMAGE_ENABLED: false,
  
  // Google
  GOOGLE_CHAT_ENABLED: true,
  GOOGLE_EMBEDDING_ENABLED: true,
  GOOGLE_IMAGE_ENABLED: true,
  
  // Mistral
  MISTRAL_CHAT_ENABLED: true,
  MISTRAL_EMBEDDING_ENABLED: true,
  MISTRAL_IMAGE_ENABLED: false,
  
  // Cohere
  COHERE_CHAT_ENABLED: true,
  COHERE_EMBEDDING_ENABLED: true,
  COHERE_IMAGE_ENABLED: false,
  
  // Azure OpenAI
  AZURE_OPENAI_CHAT_ENABLED: true,
  AZURE_OPENAI_EMBEDDING_ENABLED: true,
  AZURE_OPENAI_IMAGE_ENABLED: true,
  
  // Ollama Settings
  OLLAMA_BASE_URL: 'http://localhost:11434',
  
  // Embedding Settings
  ENABLE_OPENAI_EMBEDDINGS: true,
  EMBEDDING_PROVIDER: 'openai' as const,
  EMBEDDING_DIMENSIONS: 3072,
  
  // Portal Settings
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.7,
  
  // Embedding Dimensions by Model
  EMBEDDING_DIMENSIONS_MAP: {
    'text-embedding-3-large': 3072,
    'text-embedding-3-small': 1536,
    'text-embedding-ada-002': 1536,
    'nomic-embed-text': 768,
    'all-minilm': 384
  }
} as const