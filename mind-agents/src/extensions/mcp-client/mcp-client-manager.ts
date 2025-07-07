/**
 * MCP Client Manager
 * 
 * Core MCP client functionality extracted from the original mcp-integration.ts
 * Enhanced with better error handling, health monitoring, and connection management
 */

import { experimental_createMCPClient } from 'ai'
import { z } from 'zod'
import { runtimeLogger } from '../../utils/logger'
import {
  MCPServerConfig,
  MCPManagerConfig,
  AISDKToolSet,
  MCPClient
} from './types'

export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map()
  private tools: AISDKToolSet = {}
  private config: MCPManagerConfig

  constructor(config: MCPManagerConfig) {
    this.config = {
      reconnectDelay: 5000,
      healthCheckInterval: 30000,
      ...config
    }
  }

  async initialize(): Promise<void> {
    runtimeLogger.info('🔧 Initializing MCP Client Manager')
  }

  /**
   * Add an MCP server and connect to it using AI SDK v5
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server '${config.name}' is already configured`)
    }

    // Validate configuration
    if (!config.command && !config.url) {
      throw new Error(`MCP server '${config.name}' must specify either 'command' or 'url'`)
    }

    try {
      let client: MCPClient
      
      runtimeLogger.info(`🔌 Connecting to MCP server: ${config.name}`)

      if (config.url) {
        // Remote MCP server (SSE transport)
        runtimeLogger.info(`🌐 Using SSE transport for: ${config.url}`)
        
        // Add timeout to prevent hanging
        const clientPromise = experimental_createMCPClient({
          transport: {
            type: 'sse',
            url: config.url
          }
        })
        
        // Add 30 second timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('MCP client connection timeout')), 30000)
        })
        
        client = await Promise.race([clientPromise, timeoutPromise])
      } else {
        // Local MCP server (stdio transport)
        runtimeLogger.info(`🖥️ Using stdio transport for: ${config.command}`)
        
        const { Experimental_StdioMCPTransport } = await import('ai/mcp-stdio')
        const transport = new Experimental_StdioMCPTransport({
          command: config.command!,
          args: config.args || [],
          env: config.env
        })
        
        client = await experimental_createMCPClient({
          transport
        })
      }

      // Store the client
      this.clients.set(config.name, client)
      
      runtimeLogger.info(`🔍 Discovering tools for server: ${config.name}`)
      
      // Discover and store tools with server prefix
      const serverTools = await client.tools()
      for (const [toolName, tool] of Object.entries(serverTools)) {
        this.tools[`${config.name}:${toolName}`] = tool
      }
      
      runtimeLogger.info(`✅ Added MCP server: ${config.name} with ${Object.keys(serverTools).length} tools`)
    } catch (error) {
      this.clients.delete(config.name)
      if (error instanceof Error && error.message.includes('timeout')) {
        runtimeLogger.error(`⏱️ MCP server ${config.name} connection timed out`)
      } else {
        runtimeLogger.error(`❌ Failed to add MCP server ${config.name}:`, error)
      }
      throw error
    }
  }

  /**
   * Remove an MCP server
   */
  async removeServer(serverName: string): Promise<void> {
    const client = this.clients.get(serverName)
    if (!client) {
      runtimeLogger.warn(`⚠️ MCP server ${serverName} not found`)
      return
    }

    try {
      await client.close()
      this.clients.delete(serverName)
      
      // Clean up tools from this server
      for (const key of Object.keys(this.tools)) {
        if (key.startsWith(`${serverName}:`)) {
          delete this.tools[key]
        }
      }
      
      runtimeLogger.info(`🔌 Disconnected from MCP server: ${serverName}`)
    } catch (error) {
      runtimeLogger.error(`❌ Failed to disconnect from MCP server ${serverName}:`, error)
    }
  }

  /**
   * Get all available tools (AI SDK v5 compatible)
   */
  getAvailableTools(): AISDKToolSet {
    return { ...this.tools }
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys())
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys())
    await Promise.all(serverNames.map(name => this.removeServer(name)))
  }

  /**
   * Get AI SDK compatible tools for direct integration
   */
  getAISDKTools(): AISDKToolSet {
    return this.getAvailableTools()
  }
}