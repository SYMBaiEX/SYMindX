/**
 * Types for MCP Client Extension
 */

import { z } from 'zod'

export interface MCPServerConfig {
  name: string
  // Local server configuration (command-based)
  command?: string
  args?: string[]
  env?: Record<string, string>
  // Remote server configuration (URL-based)
  url?: string
  // Optional description for documentation purposes
  description?: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: z.ZodSchema
  server: string
  metadata?: {
    category?: string
    readOnly?: boolean
    destructive?: boolean
    idempotent?: boolean
    openWorld?: boolean
  }
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  isError?: boolean
  metadata?: {
    executionTime?: number
    server?: string
    tool?: string
  }
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
  annotations?: {
    audience?: string[]
    priority?: number
  }
}

export interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
  annotations?: {
    audience?: string[]
    priority?: number
  }
}

export interface MCPServerConnection {
  name: string
  client: any
  config: MCPServerConfig
  connected: boolean
  lastConnection?: Date
  retryCount: number
  capabilities?: {
    tools?: boolean
    resources?: boolean
    prompts?: boolean
    logging?: boolean
  }
}

export interface MCPManagerConfig {
  globalTimeout: number
  maxRetries: number
  enableAutoReconnect: boolean
  reconnectDelay?: number
  healthCheckInterval?: number
  retryAttempts?: number
}

export interface MCPServerHealth {
  name: string
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting'
  lastPing?: Date
  latency?: number
  errorCount: number
  uptime?: number
}

export interface MCPToolExecution {
  toolName: string
  args: Record<string, any>
  server: string
  startTime: Date
  endTime?: Date
  result?: MCPToolResult
  error?: Error
}