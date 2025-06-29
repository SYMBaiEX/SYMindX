/**
 * Common Types
 * 
 * This file defines common interfaces and types used throughout the system
 * to replace generic Record<string, any> and any types for better type safety.
 */

// Configuration Types
export interface BaseConfig {
  [key: string]: ConfigValue
}

export type ConfigValue = string | number | boolean | ConfigValue[] | BaseConfig | null | undefined

// Parameter Types
export interface ActionParameters {
  [key: string]: ParameterValue
}

export type ParameterValue = string | number | boolean | ParameterValue[] | ActionParameters | null | undefined

// Metadata Types
export interface Metadata {
  [key: string]: MetadataValue
}

export type MetadataValue = string | number | boolean | Date | MetadataValue[] | Metadata | null | undefined

// Context Types
export interface Context {
  [key: string]: ContextValue
}

export type ContextValue = string | number | boolean | Date | ContextValue[] | Context | null | undefined

// Data Types
export interface GenericData {
  [key: string]: DataValue
}

export type DataValue = string | number | boolean | Date | DataValue[] | GenericData | null | undefined

// Event Data Types
export interface EventData {
  type: string
  timestamp: Date
  source: string
  payload: GenericData
  metadata?: Metadata
}

// Tool Input/Output Types
export interface ToolInput {
  [key: string]: ParameterValue
}

export interface ToolOutput {
  success: boolean
  data?: GenericData
  error?: string
  metadata?: Metadata
}

// API Response Types
export interface ApiResponse<T = GenericData> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
  metadata?: Metadata
}

// Action Result Types
export interface ActionResult<T = GenericData> {
  success: boolean
  data?: T
  error?: string
  message?: string
  metadata?: Metadata
}

// Validation Types
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings?: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
  value?: any
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  value?: any
}

// Skill/Action Parameter Types
export interface SkillParameters {
  [key: string]: SkillParameterValue
}

export type SkillParameterValue = string | number | boolean | SkillParameterValue[] | SkillParameters | null | undefined

// Extension Configuration Types
export interface ExtensionConfig {
  enabled: boolean
  priority?: number
  settings: BaseConfig
  dependencies?: string[]
  capabilities?: string[]
}

// Portal Configuration Types
export interface PortalSettings {
  apiKey?: string
  baseUrl?: string
  timeout?: number
  retryAttempts?: number
  rateLimitBuffer?: number
  customHeaders?: Record<string, string>
  modelSettings?: ModelSettings
}

export interface ModelSettings {
  defaultModel?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
}

// Memory Types
export interface MemoryMetadata {
  importance: number
  tags: string[]
  source: string
  timestamp: Date
  expiresAt?: Date
  accessCount?: number
  lastAccessed?: Date
  [key: string]: MetadataValue
}

// Emotion Context Types
export interface EmotionContext {
  trigger: string
  intensity: number
  duration?: number
  source: string
  relatedEvents?: string[]
  socialContext?: SocialContext
  environmentalContext?: EnvironmentalContext
}

export interface SocialContext {
  participants: string[]
  relationships: Record<string, string>
  groupDynamics?: string
  communicationStyle?: string
}

export interface EnvironmentalContext {
  location?: string
  timeOfDay?: string
  weather?: string
  crowdLevel?: string
  noiseLevel?: string
  lighting?: string
}

// Cognition Types
export interface CognitionContext {
  currentGoals: string[]
  activeMemories: string[]
  emotionalState: string
  environmentalFactors: EnvironmentalContext
  socialFactors?: SocialContext
  timeConstraints?: TimeConstraints
}

export interface TimeConstraints {
  deadline?: Date
  urgency: 'low' | 'medium' | 'high' | 'critical'
  estimatedDuration?: number
}

// Game State Types (for RuneLite)
export interface GameState {
  playerPosition: Position
  playerStats: PlayerStats
  inventory: InventoryItem[]
  nearbyPlayers: Player[]
  nearbyObjects: GameObject[]
  currentActivity?: string
  questStates?: QuestState[]
}

export interface Position {
  x: number
  y: number
  z?: number
  region?: string
}

export interface PlayerStats {
  hitpoints: number
  attack: number
  strength: number
  defence: number
  ranged: number
  prayer: number
  magic: number
  cooking: number
  woodcutting: number
  fletching: number
  fishing: number
  firemaking: number
  crafting: number
  smithing: number
  mining: number
  herblore: number
  agility: number
  thieving: number
  slayer: number
  farming: number
  runecraft: number
  hunter: number
  construction: number
}

export interface InventoryItem {
  id: number
  name: string
  quantity: number
  noted?: boolean
  value?: number
}

export interface Player {
  name: string
  position: Position
  combatLevel: number
  isInCombat?: boolean
  equipment?: Equipment
}

export interface GameObject {
  id: number
  name: string
  position: Position
  interactable: boolean
  actions?: string[]
}

export interface Equipment {
  helmet?: InventoryItem
  cape?: InventoryItem
  amulet?: InventoryItem
  weapon?: InventoryItem
  body?: InventoryItem
  shield?: InventoryItem
  legs?: InventoryItem
  gloves?: InventoryItem
  boots?: InventoryItem
  ring?: InventoryItem
}

export interface QuestState {
  id: number
  name: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress?: number
  requirements?: string[]
}

// Slack Types
export interface SlackMessage {
  channel: string
  user: string
  text: string
  timestamp: string
  threadTs?: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

export interface SlackBlock {
  type: string
  text?: SlackText
  elements?: SlackElement[]
  accessory?: SlackElement
  fields?: SlackText[]
}

export interface SlackText {
  type: 'plain_text' | 'mrkdwn'
  text: string
  emoji?: boolean
}

export interface SlackElement {
  type: string
  text?: SlackText
  value?: string
  url?: string
  action_id?: string
}

export interface SlackAttachment {
  color?: string
  title?: string
  text?: string
  fields?: SlackField[]
  actions?: SlackAction[]
}

export interface SlackField {
  title: string
  value: string
  short?: boolean
}

export interface SlackAction {
  type: string
  text: string
  value?: string
  url?: string
}

// Twitter Types
export interface TwitterUser {
  id: string
  username: string
  name: string
  verified: boolean
  followersCount: number
  followingCount: number
  profileImageUrl?: string
  description?: string
}

export interface TwitterTweet {
  id: string
  text: string
  authorId: string
  createdAt: Date
  publicMetrics: TwitterMetrics
  referencedTweets?: TwitterReference[]
  attachments?: TwitterAttachment[]
}

export interface TwitterMetrics {
  retweetCount: number
  likeCount: number
  replyCount: number
  quoteCount: number
}

export interface TwitterReference {
  type: 'retweeted' | 'quoted' | 'replied_to'
  id: string
}

export interface TwitterAttachment {
  type: 'media' | 'poll'
  mediaKeys?: string[]
  pollIds?: string[]
}

// MCP Types
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: JsonSchema
}

export interface JsonSchema {
  type: string
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JsonSchemaProperty {
  type: string
  description?: string
  enum?: string[]
  default?: any
  minimum?: number
  maximum?: number
  pattern?: string
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: McpPromptArgument[]
}

export interface McpPromptArgument {
  name: string
  description?: string
  required?: boolean
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type StringKeys<T> = Extract<keyof T, string>

export type NonEmptyArray<T> = [T, ...T[]]