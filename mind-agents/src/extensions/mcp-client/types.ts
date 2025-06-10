/**
 * MCP Client Extension Types
 * 
 * Type definitions for the Model Context Protocol client extension.
 */

import { BaseConfig, ExtensionConfig } from '../../types/common.js'

// Base MCP Client Settings
export interface McpClientSettings extends BaseConfig {
  servers: McpServerConfig[]
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  timeout?: number
  enableLogging?: boolean
  maxConcurrentConnections?: number
  defaultTransport?: 'stdio' | 'sse' | 'websocket'
  security?: McpClientSecurityConfig
}

// Main MCP Client Configuration
export interface McpClientConfig extends ExtensionConfig {
  settings: McpClientSettings
}

// MCP Server Configuration
export interface McpServerConfig {
  id: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  transport: 'stdio' | 'sse' | 'websocket'
  url?: string // For SSE/WebSocket transports
  enabled?: boolean
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectDelay?: number
  timeout?: number
  capabilities?: McpClientCapabilities
  metadata?: Record<string, any>
}

// Security Configuration
export interface McpClientSecurityConfig {
  allowedCommands?: string[]
  blockedCommands?: string[]
  sandboxed?: boolean
  maxMemoryUsage?: number
  maxExecutionTime?: number
  allowNetworkAccess?: boolean
  allowFileSystemAccess?: boolean
}

// Client Capabilities
export interface McpClientCapabilities {
  tools?: boolean
  resources?: boolean
  prompts?: boolean
  logging?: boolean
  sampling?: boolean
  roots?: boolean
}

// Connection State
export interface McpConnection {
  id: string
  serverId: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'
  transport: 'stdio' | 'sse' | 'websocket'
  process?: any // ChildProcess for stdio
  client?: any // WebSocket or EventSource for other transports
  capabilities?: McpServerCapabilities
  lastConnected?: Date
  lastError?: string
  reconnectAttempts: number
  messageId: number
  pendingRequests: Map<string | number, PendingRequest>
  stats: McpConnectionStats
}

// Server Capabilities
export interface McpServerCapabilities {
  tools?: {
    listChanged?: boolean
  }
  resources?: {
    subscribe?: boolean
    listChanged?: boolean
  }
  prompts?: {
    listChanged?: boolean
  }
  logging?: {
    level?: string
  }
  sampling?: {}
  roots?: {
    listChanged?: boolean
  }
}

// Pending Request
export interface PendingRequest {
  resolve: (response: McpResponse) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
  method: string
  timestamp: Date
}

// Connection Statistics
export interface McpConnectionStats {
  messagesReceived: number
  messagesSent: number
  errorsCount: number
  lastActivity: Date
  uptime: number
  averageResponseTime: number
  toolCallsCount: number
  resourceReadsCount: number
  promptGetsCount: number
}

// MCP Protocol Messages
export interface McpMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: any
  result?: any
  error?: McpError
}

export interface McpRequest extends McpMessage {
  method: string
  params?: any
}

export interface McpResponse extends McpMessage {
  id: string | number
  result?: any
  error?: McpError
}

export interface McpNotification extends McpMessage {
  method: string
  params?: any
}

export interface McpError {
  code: number
  message: string
  data?: any
}

// Initialize Protocol
export interface McpInitializeRequest {
  protocolVersion: string
  capabilities: McpClientCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

export interface McpInitializeResponse {
  protocolVersion: string
  capabilities: McpServerCapabilities
  serverInfo: {
    name: string
    version: string
  }
  instructions?: string
}

// Tools
export interface McpTool {
  name: string
  description?: string
  inputSchema: any // JSON Schema
}

export interface McpToolCallRequest {
  name: string
  arguments?: Record<string, any>
}

export interface McpToolCallResponse {
  content: McpContent[]
  isError?: boolean
  _meta?: Record<string, any>
}

export interface McpToolListRequest {}

export interface McpToolListResponse {
  tools: McpTool[]
  _meta?: Record<string, any>
}

// Resources
export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  annotations?: {
    audience?: ('user' | 'assistant')[]
    priority?: number
  }
}

export interface McpResourceRequest {
  uri: string
}

export interface McpResourceResponse {
  contents: McpResourceContent[]
  _meta?: Record<string, any>
}

export interface McpResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string // base64 encoded
}

export interface McpResourceListRequest {}

export interface McpResourceListResponse {
  resources: McpResource[]
  nextCursor?: string
  _meta?: Record<string, any>
}

export interface McpResourceSubscribeRequest {
  uri: string
}

export interface McpResourceUnsubscribeRequest {
  uri: string
}

export interface McpResourceUpdatedNotification {
  uri: string
}

// Prompts
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

export interface McpPromptRequest {
  name: string
  arguments?: Record<string, any>
}

export interface McpPromptResponse {
  description?: string
  messages: McpPromptMessage[]
  _meta?: Record<string, any>
}

export interface McpPromptMessage {
  role: 'user' | 'assistant'
  content: McpContent
}

export interface McpPromptListRequest {}

export interface McpPromptListResponse {
  prompts: McpPrompt[]
  _meta?: Record<string, any>
}

// Content Types
export type McpContent = McpTextContent | McpImageContent | McpEmbeddedResourceContent

export interface McpTextContent {
  type: 'text'
  text: string
  annotations?: {
    audience?: ('user' | 'assistant')[]
    priority?: number
  }
}

export interface McpImageContent {
  type: 'image'
  data: string // base64 encoded
  mimeType: string
  annotations?: {
    audience?: ('user' | 'assistant')[]
    priority?: number
  }
}

export interface McpEmbeddedResourceContent {
  type: 'resource'
  resource: {
    uri: string
    text?: string
    blob?: string // base64 encoded
    mimeType?: string
  }
  annotations?: {
    audience?: ('user' | 'assistant')[]
    priority?: number
  }
}

// Logging
export interface McpLogEntry {
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency'
  data: any
  logger?: string
}

export interface McpSetLevelRequest {
  level: McpLogEntry['level']
}

// Sampling
export interface McpSamplingRequest {
  method: string
  params?: any
}

export interface McpSamplingResponse {
  model: string
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens'
  role: 'assistant'
  content: McpContent
}

// Roots
export interface McpRoot {
  uri: string
  name?: string
}

export interface McpRootListRequest {}

export interface McpRootListResponse {
  roots: McpRoot[]
  _meta?: Record<string, any>
}

// Progress
export interface McpProgressNotification {
  progressToken: string | number
  progress: number
  total?: number
}

// Client Events
export interface McpClientEvents {
  'connection:connecting': { serverId: string }
  'connection:connected': { serverId: string, capabilities: McpServerCapabilities }
  'connection:disconnected': { serverId: string, reason?: string }
  'connection:error': { serverId: string, error: Error }
  'connection:reconnecting': { serverId: string, attempt: number }
  'tool:called': { serverId: string, toolName: string, arguments?: any }
  'resource:read': { serverId: string, uri: string }
  'resource:updated': { serverId: string, uri: string }
  'prompt:get': { serverId: string, promptName: string, arguments?: any }
  'log:message': { serverId: string, entry: McpLogEntry }
  'progress:update': { serverId: string, progress: McpProgressNotification }
}

// Client State
export interface McpClientState {
  connections: Map<string, McpConnection>
  globalStats: McpClientGlobalStats
  eventHandlers: Map<keyof McpClientEvents, Function[]>
}

export interface McpClientGlobalStats {
  totalConnections: number
  activeConnections: number
  totalMessages: number
  totalErrors: number
  uptime: number
  lastActivity: Date
}

// Error Codes
export enum McpErrorCode {
  // Standard JSON-RPC errors
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  
  // MCP-specific errors
  InvalidTool = -32000,
  InvalidResource = -32001,
  InvalidPrompt = -32002,
  ResourceNotFound = -32003,
  ToolExecutionError = -32004,
  PromptExecutionError = -32005,
  ConnectionError = -32006,
  AuthenticationError = -32007,
  AuthorizationError = -32008,
  RateLimitError = -32009,
  TimeoutError = -32010
}

// Utility Types
export type McpClientEventHandler<T extends keyof McpClientEvents> = (
  data: McpClientEvents[T]
) => void | Promise<void>

export type McpTransportType = 'stdio' | 'sse' | 'websocket'

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export type McpLogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency'