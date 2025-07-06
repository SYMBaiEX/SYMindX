/**
 * MCP Client Manager
 * 
 * Core MCP client functionality extracted from the original mcp-integration.ts
 * Enhanced with better error handling, health monitoring, and connection management
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { z } from 'zod'
import { runtimeLogger } from '../../utils/logger'
import {
  MCPServerConfig,
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPPrompt,
  MCPServerConnection,
  MCPManagerConfig,
  MCPServerHealth,
  MCPToolExecution
} from './types'

export class MCPClientManager {
  private connections: Map<string, MCPServerConnection> = new Map()
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()
  private prompts: Map<string, MCPPrompt> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private healthCheckTimer?: NodeJS.Timeout
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
    
    // Start health check timer if configured
    if (this.config.healthCheckInterval && this.config.healthCheckInterval > 0) {
      this.startHealthCheck()
    }
  }

  /**
   * Add an MCP server and connect to it
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.connections.has(config.name)) {
      throw new Error(`MCP server '${config.name}' is already configured`)
    }

    // Validate configuration
    if (!config.command && !config.url) {
      throw new Error(`MCP server '${config.name}' must specify either 'command' or 'url'`)
    }

    try {
      let transport: any
      let client: Client

      if (config.url) {
        // Remote MCP server (URL-based)
        transport = new SSEClientTransport(new URL(config.url))
      } else {
        // Local MCP server (command-based)
        transport = new StdioClientTransport({
          command: config.command!,
          args: config.args || [],
          env: config.env
        })
      }

      client = new Client(
        {
          name: 'symindx-mcp-client',
          version: '1.0.0'
        },
        {
          capabilities: {
            roots: {
              listChanged: true
            },
            sampling: {}
          }
        }
      )

      const connection: MCPServerConnection = {
        name: config.name,
        client,
        config,
        connected: false,
        retryCount: 0
      }

      this.connections.set(config.name, connection)
      await this.connectToServer(connection)
      
      runtimeLogger.info(`✅ Added MCP server: ${config.name}`)
    } catch (error) {
      this.connections.delete(config.name)
      runtimeLogger.error(`❌ Failed to add MCP server ${config.name}:`, error)
      throw error
    }
  }

  /**
   * Connect to an MCP server and discover its capabilities
   */
  private async connectToServer(connection: MCPServerConnection): Promise<void> {
    const { name, client, config } = connection

    try {
      let transport: any

      if (config.url) {
        // URL-based server
        transport = new SSEClientTransport(new URL(config.url))
      } else {
        // Command-based server
        transport = new StdioClientTransport({
          command: config.command!,
          args: config.args || [],
          env: config.env || {}
        })
      }

      // Connect to the server using the transport
      await client.connect(transport)

      connection.connected = true
      connection.lastConnection = new Date()
      connection.retryCount = 0

      // Discover server capabilities
      await this.discoverCapabilities(connection)
      
      // Discover tools, resources, and prompts
      await this.discoverTools(connection)
      await this.discoverResources(connection)
      await this.discoverPrompts(connection)

      // Set up auto-reconnect if enabled
      if (this.config.enableAutoReconnect) {
        this.setupAutoReconnect(connection)
      }

      runtimeLogger.info(`🔗 Connected to MCP server: ${name}`)
    } catch (error) {
      connection.connected = false
      runtimeLogger.error(`❌ Failed to connect to MCP server ${name}:`, error)
      
      // Retry if configured
      if (this.config.retryAttempts && connection.retryCount < this.config.retryAttempts) {
        this.scheduleReconnect(connection)
      }
      
      throw error
    }
  }

  /**
   * Discover server capabilities
   */
  private async discoverCapabilities(connection: MCPServerConnection): Promise<void> {
    try {
      // The client.connect() method already handles initialization
      // We can access capabilities from the client
      const serverInfo = (connection.client as any).serverInfo
      connection.capabilities = serverInfo?.capabilities || {
        tools: true,
        resources: true,
        prompts: true,
        logging: true
      }
      runtimeLogger.debug(`🔍 Discovered capabilities for ${connection.name}:`, connection.capabilities)
    } catch (error) {
      runtimeLogger.warn(`⚠️ Failed to discover capabilities for ${connection.name}:`, error)
      connection.capabilities = {
        tools: true,
        resources: true,
        prompts: true,
        logging: true
      }
    }
  }

  /**
   * Discover tools from an MCP server
   */
  private async discoverTools(connection: MCPServerConnection): Promise<void> {
    if (!connection.capabilities?.tools) {
      runtimeLogger.debug(`⏸️ Server ${connection.name} does not support tools`)
      return
    }

    try {
      const response = await connection.client.listTools()

      if (response.tools) {
        for (const tool of response.tools) {
          const mcpTool: MCPTool = {
            name: tool.name,
            description: tool.description || '',
            inputSchema: this.convertToZodSchema(tool.inputSchema),
            server: connection.name,
            metadata: {
              category: tool.annotations?.category,
              readOnly: tool.annotations?.readOnlyHint,
              destructive: tool.annotations?.destructiveHint,
              idempotent: tool.annotations?.idempotentHint,
              openWorld: tool.annotations?.openWorldHint
            }
          }
          
          this.tools.set(`${connection.name}:${tool.name}`, mcpTool)
          runtimeLogger.debug(`🔧 Discovered tool: ${tool.name} from ${connection.name}`)
        }
      }
    } catch (error) {
      runtimeLogger.error(`❌ Failed to discover tools from ${connection.name}:`, error)
    }
  }

  /**
   * Discover resources from an MCP server
   */
  private async discoverResources(connection: MCPServerConnection): Promise<void> {
    if (!connection.capabilities?.resources) {
      runtimeLogger.debug(`⏸️ Server ${connection.name} does not support resources`)
      return
    }

    try {
      const response = await connection.client.listResources()

      if (response.resources) {
        for (const resource of response.resources) {
          const mcpResource: MCPResource = {
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType,
            annotations: resource.annotations
          }
          
          this.resources.set(`${connection.name}:${resource.uri}`, mcpResource)
          runtimeLogger.debug(`📁 Discovered resource: ${resource.name} from ${connection.name}`)
        }
      }
    } catch (error) {
      runtimeLogger.error(`❌ Failed to discover resources from ${connection.name}:`, error)
    }
  }

  /**
   * Discover prompts from an MCP server
   */
  private async discoverPrompts(connection: MCPServerConnection): Promise<void> {
    if (!connection.capabilities?.prompts) {
      runtimeLogger.debug(`⏸️ Server ${connection.name} does not support prompts`)
      return
    }

    try {
      const response = await connection.client.listPrompts()

      if (response.prompts) {
        for (const prompt of response.prompts) {
          const mcpPrompt: MCPPrompt = {
            name: prompt.name,
            description: prompt.description,
            arguments: prompt.arguments,
            annotations: prompt.annotations
          }
          
          this.prompts.set(`${connection.name}:${prompt.name}`, mcpPrompt)
          runtimeLogger.debug(`💭 Discovered prompt: ${prompt.name} from ${connection.name}`)
        }
      }
    } catch (error) {
      runtimeLogger.error(`❌ Failed to discover prompts from ${connection.name}:`, error)
    }
  }

  /**
   * Execute a tool from an MCP server
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    const execution: MCPToolExecution = {
      toolName,
      args,
      server: '',
      startTime: new Date()
    }

    try {
      const tool = this.tools.get(toolName)
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`)
      }

      execution.server = tool.server
      const connection = this.connections.get(tool.server)
      if (!connection || !connection.connected) {
        throw new Error(`MCP server not connected: ${tool.server}`)
      }

      // Validate arguments against schema
      tool.inputSchema.parse(args)

      // Execute the tool
      const response = await connection.client.callTool({
        name: tool.name,
        arguments: args
      })

      execution.endTime = new Date()
      const executionTime = execution.endTime.getTime() - execution.startTime.getTime()

      const result: MCPToolResult = {
        content: response.content || [],
        isError: response.isError || false,
        metadata: {
          executionTime,
          server: tool.server,
          tool: tool.name
        }
      }

      execution.result = result
      runtimeLogger.debug(`🔧 Executed tool: ${toolName} in ${executionTime}ms`)
      
      return result
    } catch (error) {
      execution.endTime = new Date()
      execution.error = error as Error
      runtimeLogger.error(`❌ Tool execution failed for ${toolName}:`, error)
      throw error
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(resourceUri: string): Promise<MCPToolResult> {
    const resourceKey = Array.from(this.resources.keys()).find(key => key.endsWith(resourceUri))
    if (!resourceKey) {
      throw new Error(`Resource not found: ${resourceUri}`)
    }

    const resource = this.resources.get(resourceKey)!
    const serverName = resourceKey.split(':')[0]
    const connection = this.connections.get(serverName)
    
    if (!connection || !connection.connected) {
      throw new Error(`MCP server not connected: ${serverName}`)
    }

    try {
      const response = await connection.client.readResource({
        uri: resource.uri
      })

      runtimeLogger.debug(`📁 Read resource: ${resourceUri}`)
      
      return {
        content: response.contents || [],
        isError: false,
        metadata: {
          server: serverName
        }
      }
    } catch (error) {
      runtimeLogger.error(`❌ Resource read failed for ${resourceUri}:`, error)
      throw error
    }
  }

  /**
   * Get a prompt from an MCP server
   */
  async getPrompt(promptName: string, args?: Record<string, any>): Promise<string> {
    const prompt = this.prompts.get(promptName)
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`)
    }

    const serverName = promptName.split(':')[0]
    const connection = this.connections.get(serverName)
    
    if (!connection || !connection.connected) {
      throw new Error(`MCP server not connected: ${serverName}`)
    }

    try {
      const response = await connection.client.getPrompt({
        name: prompt.name,
        arguments: args || {}
      })

      runtimeLogger.debug(`💭 Retrieved prompt: ${promptName}`)
      
      return response.messages?.[0]?.content?.text || ''
    } catch (error) {
      runtimeLogger.error(`❌ Prompt retrieval failed for ${promptName}:`, error)
      throw error
    }
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): Map<string, MCPTool> {
    return new Map(this.tools)
  }

  /**
   * Get all available resources
   */
  getAvailableResources(): Map<string, MCPResource> {
    return new Map(this.resources)
  }

  /**
   * Get all available prompts
   */
  getAvailablePrompts(): Map<string, MCPPrompt> {
    return new Map(this.prompts)
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.connected)
      .map(conn => conn.name)
  }

  /**
   * Get server health status
   */
  getServerHealth(): Map<string, MCPServerHealth> {
    const health = new Map<string, MCPServerHealth>()
    
    for (const [name, connection] of Array.from(this.connections.entries())) {
      health.set(name, {
        name,
        status: connection.connected ? 'connected' : 'disconnected',
        lastPing: connection.lastConnection,
        errorCount: connection.retryCount,
        uptime: connection.lastConnection ? Date.now() - connection.lastConnection.getTime() : undefined
      })
    }
    
    return health
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName)
    if (!connection) {
      runtimeLogger.warn(`⚠️ MCP server ${serverName} not found`)
      return
    }

    try {
      if (connection.connected) {
        await connection.client.close()
      }
      
      connection.connected = false
      this.connections.delete(serverName)
      
      // Clean up resources
      this.cleanupServerResources(serverName)
      
      // Clear reconnect timer
      const timer = this.reconnectTimers.get(serverName)
      if (timer) {
        clearTimeout(timer)
        this.reconnectTimers.delete(serverName)
      }

      runtimeLogger.info(`🔌 Disconnected from MCP server: ${serverName}`)
    } catch (error) {
      runtimeLogger.error(`❌ Failed to disconnect from MCP server ${serverName}:`, error)
    }
  }

  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    if (this.healthCheckTimer) {
      clearTimeout(this.healthCheckTimer)
    }

    const serverNames = Array.from(this.connections.keys())
    await Promise.all(serverNames.map(name => this.disconnectServer(name)))
  }

  /**
   * Convert MCP tools to AI SDK compatible format
   */
  getAISDKTools(): Record<string, any> {
    const tools: Record<string, any> = {}
    
    for (const [toolKey, tool] of Array.from(this.tools.entries())) {
      tools[toolKey] = {
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args: any) => {
          const result = await this.executeTool(toolKey, args)
          return result.content.map(c => c.text || c.data || '').join('\n')
        }
      }
    }
    
    return tools
  }

  /**
   * Set up auto-reconnection for an MCP server
   */
  private setupAutoReconnect(connection: MCPServerConnection): void {
    connection.client.on('disconnect', () => {
      runtimeLogger.warn(`🔌 MCP server ${connection.name} disconnected, attempting to reconnect...`)
      connection.connected = false
      this.scheduleReconnect(connection)
    })

    connection.client.on('connect', () => {
      const timer = this.reconnectTimers.get(connection.name)
      if (timer) {
        clearTimeout(timer)
        this.reconnectTimers.delete(connection.name)
      }
    })
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(connection: MCPServerConnection): void {
    const delay = this.config.reconnectDelay
    const timer = setTimeout(async () => {
      try {
        connection.retryCount++
        await this.connectToServer(connection)
      } catch (error) {
        runtimeLogger.error(`❌ Reconnection failed for MCP server ${connection.name}:`, error)
        
        // Schedule another attempt if within retry limits
        if (connection.retryCount < (this.config.retryAttempts || this.config.maxRetries)) {
          this.scheduleReconnect(connection)
        }
      }
    }, delay)
    
    this.reconnectTimers.set(connection.name, timer)
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)
  }

  /**
   * Perform health check on all connections
   */
  private async performHealthCheck(): Promise<void> {
    for (const connection of Array.from(this.connections.values())) {
      if (connection.connected) {
        try {
          // Simple ping to check if server is responsive
          await connection.client.ping()
        } catch (error) {
          runtimeLogger.warn(`⚠️ Health check failed for ${connection.name}:`, error)
          connection.connected = false
          
          if (this.config.enableAutoReconnect) {
            this.scheduleReconnect(connection)
          }
        }
      }
    }
  }

  /**
   * Clean up server resources when disconnecting
   */
  private cleanupServerResources(serverName: string): void {
    // Remove tools from this server
    for (const key of Array.from(this.tools.keys())) {
      if (key.startsWith(`${serverName}:`)) {
        this.tools.delete(key)
      }
    }
    
    // Remove resources from this server
    for (const key of Array.from(this.resources.keys())) {
      if (key.startsWith(`${serverName}:`)) {
        this.resources.delete(key)
      }
    }
    
    // Remove prompts from this server
    for (const key of Array.from(this.prompts.keys())) {
      if (key.startsWith(`${serverName}:`)) {
        this.prompts.delete(key)
      }
    }
  }

  /**
   * Convert JSON Schema to Zod schema (enhanced version)
   */
  private convertToZodSchema(jsonSchema: any): z.ZodSchema {
    if (!jsonSchema) {
      return z.object({})
    }

    switch (jsonSchema.type) {
      case 'object':
        const shape: Record<string, z.ZodTypeAny> = {}
        if (jsonSchema.properties) {
          for (const [key, prop] of Object.entries(jsonSchema.properties as any)) {
            let schema = this.convertToZodSchema(prop)
            
            // Apply additional constraints
            if (jsonSchema.required && !jsonSchema.required.includes(key)) {
              schema = schema.optional()
            }
            
            shape[key] = schema
          }
        }
        return z.object(shape)
      
      case 'string':
        let stringSchema = z.string()
        if (jsonSchema.minLength) stringSchema = stringSchema.min(jsonSchema.minLength)
        if (jsonSchema.maxLength) stringSchema = stringSchema.max(jsonSchema.maxLength)
        if (jsonSchema.pattern) stringSchema = stringSchema.regex(new RegExp(jsonSchema.pattern))
        if (jsonSchema.enum && Array.isArray(jsonSchema.enum) && jsonSchema.enum.length > 0) {
          return z.enum(jsonSchema.enum as [string, ...string[]])
        }
        return stringSchema
      
      case 'number':
      case 'integer':
        let numberSchema = z.number()
        if (jsonSchema.minimum) numberSchema = numberSchema.min(jsonSchema.minimum)
        if (jsonSchema.maximum) numberSchema = numberSchema.max(jsonSchema.maximum)
        if (jsonSchema.type === 'integer') numberSchema = numberSchema.int()
        return numberSchema
      
      case 'boolean':
        return z.boolean()
      
      case 'array':
        let arraySchema = z.array(this.convertToZodSchema(jsonSchema.items))
        if (jsonSchema.minItems) arraySchema = arraySchema.min(jsonSchema.minItems)
        if (jsonSchema.maxItems) arraySchema = arraySchema.max(jsonSchema.maxItems)
        return arraySchema
      
      case 'null':
        return z.null()
      
      default:
        return z.any()
    }
  }
}