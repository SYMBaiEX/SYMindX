/**
 * MCP Server Manager
 * 
 * Core MCP server functionality for exposing agent APIs through the Model Context Protocol
 * Provides tools, resources, and prompts for external clients to interact with the agent
 */

import { EventEmitter } from 'events'
import { createServer, Server } from 'http'
import { WebSocketServer } from 'ws'
import { runtimeLogger } from '../../utils/logger.js'
import { Agent } from '../../types/agent.js'
import {
  MCPServerConfig,
  MCPServerTool,
  MCPServerResource,
  MCPServerPrompt,
  MCPRequest,
  MCPResponse,
  MCPNotification,
  MCPCapabilities,
  MCPServerInfo,
  MCPInitializeParams,
  MCPServerStats,
  MCPConnectionInfo
} from './types.js'

export class MCPServerManager extends EventEmitter {
  private config: MCPServerConfig
  private agent?: Agent
  private httpServer?: Server
  private wsServer?: WebSocketServer
  private isRunning = false
  private tools = new Map<string, MCPServerTool>()
  private resources = new Map<string, MCPServerResource>()
  private prompts = new Map<string, MCPServerPrompt>()
  private connections = new Map<string, MCPConnectionInfo>()
  private stats: MCPServerStats
  private requestId = 0

  constructor(config: MCPServerConfig) {
    super()
    
    this.config = {
      port: 3001,
      host: 'localhost',
      name: 'symindx-agent',
      version: '1.0.0',
      enableStdio: true,
      enableWebSocket: true,
      enableHTTP: false,
      cors: {
        enabled: true,
        origins: ['*'],
        credentials: false
      },
      rateLimit: {
        enabled: false,
        requests: 100,
        windowMs: 60000
      },
      logging: {
        enabled: true,
        level: 'info',
        includeArgs: true,
        includeResults: false
      },
      exposedCapabilities: {
        chat: true,
        textGeneration: true,
        embedding: true,
        memoryAccess: true,
        emotionState: true,
        cognitiveState: true,
        agentManagement: false,
        extensionControl: false
      },
      ...config
    }

    this.stats = {
      startTime: new Date(),
      requestCount: 0,
      errorCount: 0,
      activeConnections: 0,
      toolExecutions: 0,
      resourceAccesses: 0,
      promptRequests: 0,
      uptime: 0
    }
  }

  async initialize(agent: Agent): Promise<void> {
    this.agent = agent
    this.registerDefaultTools()
    this.registerDefaultResources()
    this.registerDefaultPrompts()
    
    runtimeLogger.info('🎯 MCP Server Manager initialized')
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      runtimeLogger.warn('⚠️ MCP Server is already running')
      return
    }

    try {
      if (this.config.enableHTTP || this.config.enableWebSocket) {
        await this.startHTTPServer()
      }

      if (this.config.enableStdio) {
        this.startStdioHandler()
      }

      this.isRunning = true
      this.stats.startTime = new Date()
      
      runtimeLogger.info(`🚀 MCP Server started on ${this.config.host}:${this.config.port}`)
      this.emit('server:started')
    } catch (error) {
      runtimeLogger.error('❌ Failed to start MCP Server:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      if (this.wsServer) {
        this.wsServer.close()
      }

      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer!.close(() => resolve())
        })
      }

      this.connections.clear()
      this.isRunning = false
      
      runtimeLogger.info('🛑 MCP Server stopped')
      this.emit('server:stopped')
    } catch (error) {
      runtimeLogger.error('❌ Error stopping MCP Server:', error)
    }
  }

  private async startHTTPServer(): Promise<void> {
    this.httpServer = createServer((req, res) => {
      // Handle CORS
      if (this.config.cors?.enabled) {
        res.setHeader('Access-Control-Allow-Origin', this.config.cors.origins?.join(',') || '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }
      }

      if (req.method === 'POST' && req.url === '/mcp') {
        this.handleHTTPRequest(req, res)
      } else if (req.method === 'GET' && req.url === '/health') {
        this.handleHealthCheck(req, res)
      } else if (req.method === 'GET' && req.url === '/stats') {
        this.handleStatsRequest(req, res)
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Not Found' }))
      }
    })

    if (this.config.enableWebSocket) {
      this.wsServer = new WebSocketServer({ server: this.httpServer })
      this.wsServer.on('connection', (ws, req) => {
        this.handleWebSocketConnection(ws, req)
      })
    }

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        resolve()
      }).on('error', reject)
    })
  }

  private startStdioHandler(): void {
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', async (data) => {
      try {
        const lines = data.toString().split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          const request = JSON.parse(line) as MCPRequest
          const response = await this.handleRequest(request, 'stdio')
          
          if (response) {
            process.stdout.write(JSON.stringify(response) + '\n')
          }
        }
      } catch (error) {
        runtimeLogger.error('❌ Error handling stdio request:', error)
      }
    })
  }

  private async handleHTTPRequest(req: any, res: any): Promise<void> {
    let body = ''
    
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const request = JSON.parse(body) as MCPRequest
        const response = await this.handleRequest(request, 'http')
        
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(response))
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          id: null,
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error'
          }
        }))
      }
    })
  }

  private handleWebSocketConnection(ws: any, req: any): void {
    const connectionId = this.generateConnectionId()
    const connection: MCPConnectionInfo = {
      id: connectionId,
      type: 'websocket',
      remoteAddress: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date(),
      requestCount: 0,
      lastActivity: new Date()
    }

    this.connections.set(connectionId, connection)
    this.stats.activeConnections++

    ws.on('message', async (data: Buffer) => {
      try {
        const request = JSON.parse(data.toString()) as MCPRequest
        const response = await this.handleRequest(request, 'websocket', connectionId)
        
        if (response) {
          ws.send(JSON.stringify(response))
        }
        
        connection.requestCount++
        connection.lastActivity = new Date()
      } catch (error) {
        runtimeLogger.error('❌ Error handling WebSocket message:', error)
      }
    })

    ws.on('close', () => {
      this.connections.delete(connectionId)
      this.stats.activeConnections--
    })
  }

  private async handleRequest(request: MCPRequest, transport: string, connectionId?: string): Promise<MCPResponse | null> {
    this.stats.requestCount++
    
    try {
      const { method, params, id } = request

      if (this.config.logging?.enabled) {
        runtimeLogger.debug(`📥 MCP Request: ${method}`, this.config.logging.includeArgs ? params : undefined)
      }

      let result: any

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params as MCPInitializeParams)
          break
        
        case 'tools/list':
          result = await this.handleToolsList()
          break
        
        case 'tools/call':
          result = await this.handleToolCall(params)
          this.stats.toolExecutions++
          break
        
        case 'resources/list':
          result = await this.handleResourcesList()
          break
        
        case 'resources/read':
          result = await this.handleResourceRead(params)
          this.stats.resourceAccesses++
          break
        
        case 'prompts/list':
          result = await this.handlePromptsList()
          break
        
        case 'prompts/get':
          result = await this.handlePromptGet(params)
          this.stats.promptRequests++
          break
        
        case 'ping':
          result = { status: 'pong', timestamp: new Date().toISOString() }
          break
        
        default:
          throw new Error(`Unknown method: ${method}`)
      }

      const response: MCPResponse = {
        id,
        jsonrpc: '2.0',
        result
      }

      if (this.config.logging?.enabled && this.config.logging.includeResults) {
        runtimeLogger.debug(`📤 MCP Response:`, result)
      }

      return response
    } catch (error) {
      this.stats.errorCount++
      runtimeLogger.error(`❌ MCP Request error for ${request.method}:`, error)
      
      return {
        id: request.id,
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
          data: error instanceof Error ? error.stack : undefined
        }
      }
    }
  }

  private async handleInitialize(params: MCPInitializeParams): Promise<MCPServerInfo> {
    return {
      name: this.config.name!,
      version: this.config.version!,
      protocolVersion: '2024-11-05',
      capabilities: this.getServerCapabilities()
    }
  }

  private async handleToolsList(): Promise<{ tools: any[] }> {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))

    return { tools }
  }

  private async handleToolCall(params: any): Promise<any> {
    const { name, arguments: args } = params
    const tool = this.tools.get(name)
    
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }

    return await tool.handler(args)
  }

  private async handleResourcesList(): Promise<{ resources: any[] }> {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))

    return { resources }
  }

  private async handleResourceRead(params: any): Promise<any> {
    const { uri } = params
    const resource = this.resources.get(uri)
    
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`)
    }

    const contents = await resource.handler()
    return { contents: [contents] }
  }

  private async handlePromptsList(): Promise<{ prompts: any[] }> {
    const prompts = Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }))

    return { prompts }
  }

  private async handlePromptGet(params: any): Promise<any> {
    const { name, arguments: args } = params
    const prompt = this.prompts.get(name)
    
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`)
    }

    const content = await prompt.handler(args)
    return {
      messages: [{
        role: 'user',
        content: { type: 'text', text: content }
      }]
    }
  }

  private handleHealthCheck(req: any, res: any): void {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.stats.startTime.getTime(),
      connections: this.stats.activeConnections,
      requests: this.stats.requestCount,
      errors: this.stats.errorCount
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(health))
  }

  private handleStatsRequest(req: any, res: any): void {
    this.stats.uptime = Date.now() - this.stats.startTime.getTime()
    this.stats.memoryUsage = process.memoryUsage()

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(this.stats))
  }

  private getServerCapabilities(): MCPCapabilities {
    return {
      tools: { listChanged: true },
      resources: { subscribe: false, listChanged: true },
      prompts: { listChanged: true },
      logging: {}
    }
  }

  private registerDefaultTools(): void {
    if (!this.agent) return

    // Chat tool
    if (this.config.exposedCapabilities?.chat) {
      this.registerTool({
        name: 'agent_chat',
        description: 'Send a message to the agent and get a response',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to send to the agent' },
            context: { type: 'string', description: 'Additional context for the conversation' }
          },
          required: ['message']
        },
        handler: async (args) => {
          // Implementation would use agent's chat functionality
          return {
            type: 'text',
            text: `Agent response to: ${args.message}`
          }
        },
        metadata: { category: 'communication', readOnly: false }
      })
    }

    // Memory access tool
    if (this.config.exposedCapabilities?.memoryAccess) {
      this.registerTool({
        name: 'agent_memory_search',
        description: 'Search through the agent\'s memory',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results', default: 10 }
          },
          required: ['query']
        },
        handler: async (args) => {
          // Implementation would use agent's memory system
          return {
            type: 'text',
            text: `Memory search results for: ${args.query}`
          }
        },
        metadata: { category: 'memory', readOnly: true }
      })
    }

    // Emotion state tool
    if (this.config.exposedCapabilities?.emotionState) {
      this.registerTool({
        name: 'agent_emotion_state',
        description: 'Get the current emotional state of the agent',
        inputSchema: {
          type: 'object',
          properties: {}
        },
        handler: async () => {
          // Implementation would use agent's emotion system
          return {
            type: 'text',
            text: 'Current emotion state: neutral'
          }
        },
        metadata: { category: 'emotion', readOnly: true }
      })
    }
  }

  private registerDefaultResources(): void {
    // Agent configuration resource
    this.registerResource({
      uri: 'agent://config',
      name: 'Agent Configuration',
      description: 'Current agent configuration and capabilities',
      mimeType: 'application/json',
      handler: async () => ({
        type: 'text',
        text: JSON.stringify({
          name: this.agent?.name,
          status: 'active',
          capabilities: Object.keys(this.config.exposedCapabilities || {})
        }, null, 2)
      }),
      metadata: { cacheable: true, refreshInterval: 300000 }
    })

    // Agent status resource
    this.registerResource({
      uri: 'agent://status',
      name: 'Agent Status',
      description: 'Real-time agent status and metrics',
      mimeType: 'application/json',
      handler: async () => ({
        type: 'text',
        text: JSON.stringify({
          uptime: Date.now() - this.stats.startTime.getTime(),
          requests: this.stats.requestCount,
          errors: this.stats.errorCount,
          lastActivity: new Date().toISOString()
        }, null, 2)
      }),
      metadata: { cacheable: false }
    })
  }

  private registerDefaultPrompts(): void {
    // System prompt
    this.registerPrompt({
      name: 'system_prompt',
      description: 'Get the agent\'s system prompt',
      arguments: [{
        name: 'context',
        description: 'Additional context to include',
        required: false,
        type: 'string'
      }],
      handler: async (args) => {
        const basePrompt = `You are ${this.agent?.name}, an AI agent with advanced capabilities.`
        return args.context ? `${basePrompt}\n\nContext: ${args.context}` : basePrompt
      },
      metadata: { category: 'system' }
    })
  }

  // Public API methods
  registerTool(tool: MCPServerTool): void {
    this.tools.set(tool.name, tool)
    runtimeLogger.debug(`🔧 Registered MCP tool: ${tool.name}`)
  }

  registerResource(resource: MCPServerResource): void {
    this.resources.set(resource.uri, resource)
    runtimeLogger.debug(`📁 Registered MCP resource: ${resource.name}`)
  }

  registerPrompt(prompt: MCPServerPrompt): void {
    this.prompts.set(prompt.name, prompt)
    runtimeLogger.debug(`💭 Registered MCP prompt: ${prompt.name}`)
  }

  unregisterTool(name: string): void {
    this.tools.delete(name)
  }

  unregisterResource(uri: string): void {
    this.resources.delete(uri)
  }

  unregisterPrompt(name: string): void {
    this.prompts.delete(name)
  }

  getStats(): MCPServerStats {
    this.stats.uptime = Date.now() - this.stats.startTime.getTime()
    return { ...this.stats }
  }

  getConnections(): MCPConnectionInfo[] {
    return Array.from(this.connections.values())
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}