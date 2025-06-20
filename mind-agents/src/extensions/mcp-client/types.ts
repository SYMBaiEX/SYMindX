/**
 * MCP Client Extension Types
 * 
 * Type definitions for the Model Context Protocol client extension.
 */

import { BaseConfig, ExtensionConfig } from '../../types/common.js'

// Base MCP Client Settings
export interface McpClientSettings {
  servers: McpServerConfig[]
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectDelay?: number
  timeout?: number
  enableLogging?: boolean
  maxConcurrentConnections?: number
  defaultTransport?: 'stdio' | 'sse' | 'websocket'
  security?: McpClientSecurityConfig
  [key: string]: any
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
  outputSchema?: any // JSON Schema
  category?: string
  serverId?: string
  serverName?: string
  deprecated?: boolean
  experimental?: boolean
  version?: string
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
  resourceType?: string
  serverId?: string
  serverName?: string
  permissions?: string[]
  accessible?: boolean
  metadata?: any
  version?: string
  tags?: string[]
  lastModified?: Date
  size?: number
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

// Streaming Interface Types
export interface EventStream {
  subscribe(listener: StreamListener): Subscription
  unsubscribe(subscription: Subscription): void
  emit(event: StreamEvent): void
  close(): void
  getActiveListeners(): number
}

export interface StreamEvent {
  id: string
  type: string
  data: any
  timestamp: Date
  source?: string
  metadata?: Record<string, any>
}

export interface StreamListener {
  (event: StreamEvent): void | Promise<void>
}

export interface Subscription {
  id: string
  active: boolean
  unsubscribe(): void
  getStats(): SubscriptionStats
}

export interface SubscriptionStats {
  eventsReceived: number
  lastEventTime?: Date
  subscriptionTime: Date
}

export interface ControlInterface {
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
  restart(): Promise<void>
  getStatus(): string
  sendCommand(command: string, args?: any): Promise<any>
}

export interface ProgressMonitor {
  track(taskId: string, total?: number): Progress
  update(taskId: string, current: number, message?: string): void
  complete(taskId: string, result?: any): void
  fail(taskId: string, error: Error): void
  getProgress(taskId: string): Progress | null
  addListener(listener: ProgressListener): void
  removeListener(listener: ProgressListener): void
}

export interface Progress {
  taskId: string
  current: number
  total?: number
  percentage: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message?: string
  startTime: Date
  endTime?: Date
  result?: any
  error?: Error
}

export interface ProgressListener {
  (progress: Progress): void | Promise<void>
}

// Dynamic Tools Types
export interface ToolSpec {
  id: string
  name: string
  description: string
  category: string
  parameters: Record<string, any>
  code?: string
  language?: 'javascript' | 'python' | 'bash' | 'typescript'
  version?: string
  author?: string
  tags?: string[]
  permissions?: string[]
  timeout?: number
  retries?: number
  validation?: ValidationSpec
}

export interface ValidationSpec {
  input?: Record<string, any>
  output?: Record<string, any>
  required?: string[]
}

export interface ToolInput {
  [key: string]: any
}

export interface ToolOutput {
  success: boolean
  result?: any
  error?: string
  metadata?: Record<string, any>
  logs?: string[]
  performance?: PerformanceMetrics
}

export interface PerformanceMetrics {
  executionTime: number
  memoryUsage: number
  cpuUsage?: number
}

export interface CodeExecutor {
  execute(code: string, context: ExecutionContext): Promise<ExecutionResult>
  validate(code: string): Promise<ValidationResult>
  getCapabilities(): ExecutorCapabilities
}

export interface ExecutorCapabilities {
  languages: string[]
  maxExecutionTime: number
  maxMemoryUsage: number
  sandboxed: boolean
  networkAccess: boolean
  fileSystemAccess: boolean
}

export interface ExecutionContext {
  variables?: Record<string, any>
  workingDirectory?: string
  environment?: Record<string, string>
  timeout?: number
  memoryLimit?: number
  userId?: string
  sessionId?: string
}

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
  duration: number
  memoryUsage?: number
  returnValue?: any
  logs?: LogEntry[]
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: Date
  source?: string
}

export interface ValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  suggestions?: string[]
}

export interface SandboxedExecutor extends CodeExecutor {
  createSandbox(options: SandboxOptions): Promise<string>
  destroySandbox(sandboxId: string): Promise<void>
  getSandboxStats(sandboxId: string): Promise<ResourceUsage>
}

export interface SandboxOptions {
  memoryLimit?: number
  timeLimit?: number
  networkAccess?: boolean
  fileSystemAccess?: boolean
  allowedModules?: string[]
  blockedModules?: string[]
}

export interface ResourceUsage {
  cpuTime: number
  memoryPeak: number
  memoryAverage: number
  diskUsage: number
  networkBytesIn: number
  networkBytesOut: number
}

export interface TerminalInterface {
  spawn(command: string, args?: string[], options?: TerminalOptions): Promise<TerminalProcess>
  kill(processId: string, signal?: string): Promise<boolean>
  getProcess(processId: string): TerminalProcess | null
  listProcesses(): TerminalProcess[]
  createSession(options?: TerminalSessionOptions): Promise<TerminalSession>
}

export interface TerminalOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  maxBuffer?: number
  shell?: boolean | string
  uid?: number
  gid?: number
}

export interface TerminalSessionOptions {
  shell?: string
  rows?: number
  cols?: number
  cwd?: string
  env?: Record<string, string>
}

export interface TerminalSession {
  id: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(signal?: string): void
  onData(callback: (data: string) => void): void
  onExit(callback: (code: number, signal?: string) => void): void
}

export interface TerminalResult {
  stdout: string
  stderr: string
  exitCode: number
  signal?: string
  duration: number
  killed: boolean
}

export interface SpawnOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  maxBuffer?: number
  encoding?: BufferEncoding
  shell?: boolean | string
  windowsVerbatimArguments?: boolean
  detached?: boolean
  uid?: number
  gid?: number
  stdio?: any
}

export interface TerminalProcess {
  id: string
  pid?: number
  command: string
  args: string[]
  status: 'running' | 'exited' | 'killed' | 'error'
  exitCode?: number
  signal?: string
  startTime: Date
  endTime?: Date
  stdout: string
  stderr: string
}

// Extended terminal process with additional properties
export interface ExtendedTerminalProcess extends TerminalProcess {
  memoryUsage?: number
  cpuUsage?: number
  duration?: number
}