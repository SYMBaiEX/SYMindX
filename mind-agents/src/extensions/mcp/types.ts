/**
 * MCP Extension Types
 * 
 * This file defines the types for the Model Context Protocol (MCP) extension.
 */

import { BaseConfig, ExtensionConfig } from '../../types/common.js'

export interface McpSettings extends BaseConfig {
  serverName: string
  serverCommand: string
  serverArgs?: string[]
  serverEnv?: Record<string, string>
  autoStart?: boolean
  restartOnFailure?: boolean
  maxRestartAttempts?: number
  restartDelay?: number
  timeout?: number
  port?: number
  transport?: string
  serverVersion?: string
  capabilities: {
    tools?: boolean
    resources?: boolean
    prompts?: boolean
    logging?: boolean
  }
  security?: {
    allowedCommands?: string[]
    blockedCommands?: string[]
    sandboxed?: boolean
  }
}

export interface McpConfig extends ExtensionConfig {
  settings: McpSettings
}

export interface McpServer {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  status: 'stopped' | 'starting' | 'running' | 'error' | 'crashed'
  pid?: number
  startTime?: Date
  lastError?: string
  restartCount: number
  capabilities: McpCapabilities
}

export interface McpCapabilities {
  tools: McpTool[]
  resources: McpResource[]
  prompts: McpPrompt[]
  logging: boolean
}

export interface McpTool {
  name: string
  description: string
  inputSchema: any
  handler?: (params: any) => Promise<any>
}

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  handler?: () => Promise<any>
}

export interface McpPrompt {
  name: string
  description: string
  arguments?: McpPromptArgument[]
  handler?: (args: Record<string, any>) => Promise<string>
}

export interface McpPromptArgument {
  name: string
  description: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean'
}

export interface McpMessage {
  jsonrpc: '2.0'
  id?: string | number
  method?: string
  params?: any
  result?: any
  error?: McpError
}

export interface McpError {
  code: number
  message: string
  data?: any
}

export interface McpRequest extends McpMessage {
  method: string
  params?: any
}

export interface McpResponse extends McpMessage {
  result?: any
  error?: McpError
}

export interface McpNotification extends McpMessage {
  method: string
  params?: any
}

export interface McpInitializeRequest {
  protocolVersion: string
  capabilities: {
    tools?: {}
    resources?: {}
    prompts?: {}
    logging?: {}
  }
  clientInfo: {
    name: string
    version: string
  }
}

export interface McpInitializeResponse {
  protocolVersion: string
  capabilities: McpCapabilities
  serverInfo: {
    name: string
    version: string
  }
}

export interface McpToolCallRequest {
  name: string
  arguments?: Record<string, any>
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export interface McpResourceRequest {
  uri: string
}

export interface McpResourceResponse {
  contents: Array<{
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }>
}

export interface McpPromptRequest {
  name: string
  arguments?: Record<string, any>
}

export interface McpPromptResponse {
  description?: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: {
      type: 'text' | 'image' | 'resource'
      text?: string
      data?: string
      mimeType?: string
    }
  }>
}

export interface McpLogEntry {
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency'
  data?: any
  logger?: string
}

export interface McpServerStats {
  uptime: number
  requestCount: number
  errorCount: number
  lastActivity: Date
  memoryUsage: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
}

export interface McpConnectionInfo {
  transport: 'stdio' | 'sse' | 'websocket'
  connected: boolean
  lastPing?: Date
  latency?: number
}

export interface McpSecurityContext {
  allowedCommands: Set<string>
  blockedCommands: Set<string>
  sandboxed: boolean
  permissions: {
    fileSystem: boolean
    network: boolean
    process: boolean
  }
}