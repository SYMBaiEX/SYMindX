/**
 * Types for MCP Client Extension
 */

import { z } from 'zod'

// Since MCPClient is not exported, define the interface based on AI SDK docs
export interface MCPClient {
  tools(options?: { schemas?: Record<string, { parameters: z.ZodSchema }> }): Promise<Record<string, unknown>>
  close(): Promise<void>
}

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

// Use Record<string, unknown> for AI SDK tools since the actual Tool type is complex
export type AISDKToolSet = Record<string, unknown>

export interface MCPManagerConfig {
  globalTimeout: number
  maxRetries: number
  enableAutoReconnect: boolean
  reconnectDelay?: number
  healthCheckInterval?: number
  retryAttempts?: number
}