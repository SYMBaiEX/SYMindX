/**
 * API Extension Types
 * 
 * This file defines the types for the HTTP API extension.
 */

import { Request, Response } from 'express'
import { Agent } from '../../types/agent.js'
import { BaseConfig, ExtensionConfig } from '../../types/common.js'

export interface ApiSettings extends BaseConfig {
  port: number
  host?: string
  cors?: {
    enabled: boolean
    origins?: string[]
    credentials?: boolean
  }
  auth?: {
    enabled: boolean
    type: 'bearer' | 'apikey'
    secret?: string
    apiKeys?: string[]
  }
  rateLimit?: {
    enabled: boolean
    windowMs: number
    maxRequests: number
  }
  endpoints: {
    chat: boolean
    status: boolean
    memory: boolean
    actions: boolean
    health: boolean
  }
}

export interface ApiConfig extends ExtensionConfig {
  settings: ApiSettings
}

export interface ChatRequest {
  message: string
  context?: {
    sessionId?: string
    userId?: string
    metadata?: Record<string, any>
  }
  options?: {
    stream?: boolean
    includeMemory?: boolean
    maxTokens?: number
  }
}

export interface ChatResponse {
  response: string
  sessionId: string
  timestamp: string
  metadata?: {
    tokensUsed?: number
    processingTime?: number
    memoryRetrieved?: boolean
    emotionState?: string
  }
}

export interface StatusResponse {
  agent: {
    id: string
    name: string
    status: string
    uptime: number
    lastActivity: string
  }
  extensions: Array<{
    id: string
    name: string
    status: string
    enabled: boolean
  }>
  memory: {
    totalRecords: number
    lastUpdate: string
  }
  performance: {
    cpu: number
    memory: number
    responseTime: number
  }
}

export interface MemoryQueryRequest {
  query: string
  limit?: number
  threshold?: number
  includeMetadata?: boolean
}

export interface MemoryQueryResponse {
  results: Array<{
    content: string
    similarity: number
    timestamp: string
    metadata?: Record<string, any>
  }>
  totalFound: number
  processingTime: number
}

export interface ActionRequest {
  action: string
  parameters?: Record<string, any>
  async?: boolean
  timeout?: number
}

export interface ActionResponse {
  success: boolean
  result?: any
  error?: string
  executionTime: number
  actionId?: string
}

export interface WebSocketMessage {
  type: 'chat' | 'status' | 'action' | 'memory' | 'event'
  data: any
  timestamp: string
  id: string
}

export interface ApiMiddleware {
  (req: Request, res: Response, next: Function): void
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  handler: (req: Request, res: Response) => Promise<void>
  middleware?: ApiMiddleware[]
  auth?: boolean
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
}

export interface SessionData {
  id: string
  userId?: string
  createdAt: Date
  lastActivity: Date
  metadata: Record<string, any>
}

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}