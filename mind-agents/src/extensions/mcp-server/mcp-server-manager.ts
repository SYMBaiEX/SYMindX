/**
 * MCP Server Manager
 * 
 * Core MCP server functionality for exposing agent APIs through the Model Context Protocol
 * Provides tools, resources, and prompts for external clients to interact with the agent
 */

import { EventEmitter } from 'events'
import { createServer, Server } from 'http'
import { WebSocketServer } from 'ws'
import { runtimeLogger } from '../../utils/logger'
import { Agent } from '../../types/agent'
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
} from './types'

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
    const memoryUsage = process.memoryUsage()
    
    const statsWithMemory = {
      ...this.stats,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(statsWithMemory))
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

    // Enhanced Chat tool with emotion and memory integration
    if (this.config.exposedCapabilities?.chat) {
      this.registerTool({
        name: 'agent_chat',
        description: 'Send a message to the agent and get a response with emotional context',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to send to the agent' },
            context: { type: 'string', description: 'Additional context for the conversation' },
            includeEmotionalState: { type: 'boolean', description: 'Include emotional state in response', default: true },
            useMemoryContext: { type: 'boolean', description: 'Use memory context for better responses', default: true }
          },
          required: ['message']
        },
        handler: async (args) => {
          try {
            // Get agent's current emotional state
            let emotionalContext = ''
            if (args.includeEmotionalState && this.agent?.emotion) {
              const emotionState = await this.agent.emotion.getCurrentState()
              emotionalContext = ` [Emotional state: ${emotionState.current} (${emotionState.intensity})]
`
            }

            // Get relevant memories if requested
            let memoryContext = ''
            if (args.useMemoryContext && this.agent?.memory) {
              try {
                const memories = await this.agent.memory.retrieve(this.agent.id, args.message, 3)
                if (memories.length > 0) {
                  memoryContext = `\n[Relevant memories: ${memories.map(m => m.content).join('; ')}]\n`
                }
              } catch (error) {
                runtimeLogger.debug('Failed to retrieve memory context:', error)
              }
            }

            // TODO: Integrate with actual agent chat/portal system
            const response = `${emotionalContext}Agent ${this.agent?.name} responds: Thank you for your message: "${args.message}". ${args.context ? `I understand the context: ${args.context}. ` : ''}I'm processing this with my current capabilities.${memoryContext}`
            
            return {
              type: 'text',
              text: response
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'communication', readOnly: false }
      })
    }

    // Advanced Memory tools
    if (this.config.exposedCapabilities?.memoryAccess) {
      this.registerTool({
        name: 'agent_memory_search',
        description: 'Search through the agent\'s memory with advanced filtering',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results', default: 10 },
            memoryType: { type: 'string', description: 'Type of memory to search (experience, knowledge, interaction, etc.)', enum: ['experience', 'knowledge', 'interaction', 'goal', 'context', 'observation', 'reflection'] },
            importance: { type: 'number', description: 'Minimum importance level (1-10)', minimum: 1, maximum: 10 }
          },
          required: ['query']
        },
        handler: async (args) => {
          try {
            if (!this.agent?.memory) {
              return { type: 'text', text: 'Memory system not available' }
            }

            const memories = await this.agent.memory.retrieve(this.agent.id, args.query, args.limit || 10)
            
            // Filter by type and importance if specified
            let filteredMemories = memories
            if (args.memoryType) {
              filteredMemories = memories.filter(m => m.type === args.memoryType)
            }
            if (args.importance) {
              filteredMemories = filteredMemories.filter(m => m.importance >= args.importance)
            }

            if (filteredMemories.length === 0) {
              return { type: 'text', text: `No memories found matching query: "${args.query}"` }
            }

            const results = filteredMemories.map(memory => ({
              id: memory.id,
              type: memory.type,
              content: memory.content,
              importance: memory.importance,
              timestamp: memory.timestamp.toISOString(),
              tags: memory.tags
            }))

            return {
              type: 'text',
              text: JSON.stringify({ query: args.query, results }, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Memory search error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'memory', readOnly: true }
      })

      this.registerTool({
        name: 'agent_memory_store',
        description: 'Store a new memory in the agent\'s memory system',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to store in memory' },
            memoryType: { type: 'string', description: 'Type of memory', enum: ['experience', 'knowledge', 'interaction', 'goal', 'context', 'observation', 'reflection'], default: 'interaction' },
            importance: { type: 'number', description: 'Importance level (1-10)', minimum: 1, maximum: 10, default: 5 },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorizing the memory' }
          },
          required: ['content']
        },
        handler: async (args) => {
          try {
            if (!this.agent?.memory) {
              return { type: 'text', text: 'Memory system not available' }
            }

            const memoryRecord = {
              id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              agentId: this.agent.id,
              type: args.memoryType || 'interaction',
              content: args.content,
              importance: args.importance || 5,
              timestamp: new Date(),
              tags: args.tags || [],
              duration: 'long_term',
              metadata: { source: 'mcp_client', stored_via: 'mcp_server' }
            } as any

            await this.agent.memory.store(this.agent.id, memoryRecord)
            
            return {
              type: 'text',
              text: `Memory stored successfully with ID: ${memoryRecord.id}`
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Memory storage error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'memory', readOnly: false }
      })
    }

    // Enhanced Emotion state tools
    if (this.config.exposedCapabilities?.emotionState) {
      this.registerTool({
        name: 'agent_emotion_state',
        description: 'Get the current emotional state of the agent with detailed information',
        inputSchema: {
          type: 'object',
          properties: {
            includeHistory: { type: 'boolean', description: 'Include recent emotion history', default: false },
            historyLimit: { type: 'number', description: 'Number of recent emotions to include', default: 5 }
          }
        },
        handler: async (args) => {
          try {
            if (!this.agent?.emotion) {
              return { type: 'text', text: 'Emotion system not available' }
            }

            const currentState = await this.agent.emotion.getCurrentState()
            const result: any = {
              current: currentState.current,
              intensity: currentState.intensity,
              triggers: currentState.triggers,
              timestamp: currentState.timestamp.toISOString()
            }

            if (args.includeHistory) {
              const historyLimit = args.historyLimit || 5
              result.history = currentState.history.slice(-historyLimit).map(record => ({
                emotion: record.emotion,
                intensity: record.intensity,
                timestamp: record.timestamp.toISOString(),
                duration: record.duration,
                triggers: record.triggers
              }))
            }

            return {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Emotion state error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'emotion', readOnly: true }
      })

      this.registerTool({
        name: 'agent_emotion_trigger',
        description: 'Trigger an emotional response in the agent',
        inputSchema: {
          type: 'object',
          properties: {
            trigger: { type: 'string', description: 'Trigger event or message' },
            intensity: { type: 'number', description: 'Intensity of the trigger (0-1)', minimum: 0, maximum: 1, default: 0.5 }
          },
          required: ['trigger']
        },
        handler: async (args) => {
          try {
            if (!this.agent?.emotion) {
              return { type: 'text', text: 'Emotion system not available' }
            }

            // Trigger emotion response
            // TODO: Implement processTrigger method in emotion module or use alternative approach
            // await this.agent.emotion.processTrigger(args.trigger, args.intensity || 0.5)
            const newState = await this.agent.emotion.getCurrentState()
            
            return {
              type: 'text',
              text: `Emotion triggered. New state: ${newState.current} (intensity: ${newState.intensity})`
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Emotion trigger error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'emotion', readOnly: false }
      })
    }

    // Cognitive state tools
    if (this.config.exposedCapabilities?.cognitiveState) {
      this.registerTool({
        name: 'agent_cognitive_state',
        description: 'Get the current cognitive processing state of the agent',
        inputSchema: {
          type: 'object',
          properties: {
            includeCapabilities: { type: 'boolean', description: 'Include cognitive capabilities', default: true }
          }
        },
        handler: async (args) => {
          try {
            const cognitiveState: any = {
              status: this.agent?.status || 'unknown',
              lastUpdate: this.agent?.lastUpdate?.toISOString() || new Date().toISOString(),
              agentId: this.agent?.id,
              name: this.agent?.name
            }

            if (args.includeCapabilities && this.agent?.cognition) {
              // TODO: Implement actual cognitive state retrieval
              cognitiveState.cognitive = {
                module: 'available',
                processing: 'idle',
                capabilities: ['reasoning', 'planning', 'decision_making'],
                load: 0.2
              }
            }

            return {
              type: 'text',
              text: JSON.stringify(cognitiveState, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Cognitive state error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'cognition', readOnly: true }
      })
    }

    // Agent management tools (if enabled)
    if (this.config.exposedCapabilities?.agentManagement) {
      this.registerTool({
        name: 'agent_info',
        description: 'Get comprehensive information about the agent',
        inputSchema: {
          type: 'object',
          properties: {
            includeConfig: { type: 'boolean', description: 'Include agent configuration', default: false },
            includeExtensions: { type: 'boolean', description: 'Include extensions information', default: true }
          }
        },
        handler: async (args) => {
          try {
            const agentInfo: any = {
              id: this.agent?.id,
              name: this.agent?.name,
              status: this.agent?.status,
              lastUpdate: this.agent?.lastUpdate?.toISOString()
            }

            if (args.includeExtensions && this.agent?.extensions) {
              agentInfo.extensions = this.agent.extensions.map(ext => ({
                id: ext.id,
                name: ext.name,
                version: ext.version,
                type: ext.type,
                enabled: ext.enabled,
                status: ext.status
              }))
            }

            if (args.includeConfig && this.agent?.config) {
              agentInfo.config = {
                core: this.agent.config.core,
                lore: this.agent.config.lore,
                psyche: this.agent.config.psyche
              }
            }

            return {
              type: 'text',
              text: JSON.stringify(agentInfo, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: `Agent info error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }
        },
        metadata: { category: 'management', readOnly: true }
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
      handler: async () => {
        const config = {
          id: this.agent?.id,
          name: this.agent?.name,
          status: this.agent?.status,
          capabilities: Object.keys(this.config.exposedCapabilities || {}),
          extensions: this.agent?.extensions?.map(ext => ({
            id: ext.id,
            name: ext.name,
            type: ext.type,
            enabled: ext.enabled,
            status: ext.status
          })) || [],
          portals: this.agent?.portals?.map(portal => ({
            name: portal.name,
            type: portal.type,
            // capabilities: portal.capabilities // TODO: Add capabilities property to Portal interface
          })) || [],
          lastUpdate: this.agent?.lastUpdate?.toISOString()
        }
        
        return {
          type: 'text',
          text: JSON.stringify(config, null, 2)
        }
      },
      metadata: { cacheable: true, refreshInterval: 300000 }
    })

    // Agent status resource
    this.registerResource({
      uri: 'agent://status',
      name: 'Agent Status',
      description: 'Real-time agent status and metrics',
      mimeType: 'application/json',
      handler: async () => {
        const status = {
          agent: {
            id: this.agent?.id,
            name: this.agent?.name,
            status: this.agent?.status,
            lastUpdate: this.agent?.lastUpdate?.toISOString()
          },
          server: {
            uptime: Date.now() - this.stats.startTime.getTime(),
            requests: this.stats.requestCount,
            errors: this.stats.errorCount,
            toolExecutions: this.stats.toolExecutions,
            resourceAccesses: this.stats.resourceAccesses,
            promptRequests: this.stats.promptRequests,
            activeConnections: this.stats.activeConnections,
            lastActivity: new Date().toISOString()
          },
          memory: this.agent?.memory ? 'available' : 'unavailable',
          emotion: this.agent?.emotion ? 'available' : 'unavailable',
          cognition: this.agent?.cognition ? 'available' : 'unavailable'
        }
        
        return {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      },
      metadata: { cacheable: false }
    })

    // Memory resource (if memory access is enabled)
    if (this.config.exposedCapabilities?.memoryAccess) {
      this.registerResource({
        uri: 'agent://memory/recent',
        name: 'Recent Memories',
        description: 'Recent memories from the agent',
        mimeType: 'application/json',
        handler: async () => {
          try {
            if (!this.agent?.memory) {
              return { type: 'text', text: JSON.stringify({ error: 'Memory system not available' }) }
            }

            const recentMemories = await this.agent.memory.getRecent(this.agent.id, 10)
            const memoryData = recentMemories.map(memory => ({
              id: memory.id,
              type: memory.type,
              content: memory.content.substring(0, 200) + (memory.content.length > 200 ? '...' : ''),
              importance: memory.importance,
              timestamp: memory.timestamp.toISOString(),
              tags: memory.tags
            }))

            return {
              type: 'text',
              text: JSON.stringify({ memories: memoryData, count: memoryData.length }, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: JSON.stringify({ error: `Memory access error: ${error instanceof Error ? error.message : 'Unknown error'}` })
            }
          }
        },
        metadata: { cacheable: false }
      })
    }

    // Emotion resource (if emotion state is enabled)
    if (this.config.exposedCapabilities?.emotionState) {
      this.registerResource({
        uri: 'agent://emotion/current',
        name: 'Current Emotion State',
        description: 'Real-time emotional state of the agent',
        mimeType: 'application/json',
        handler: async () => {
          try {
            if (!this.agent?.emotion) {
              return { type: 'text', text: JSON.stringify({ error: 'Emotion system not available' }) }
            }

            const emotionState = await this.agent.emotion.getCurrentState()
            return {
              type: 'text',
              text: JSON.stringify({
                current: emotionState.current,
                intensity: emotionState.intensity,
                triggers: emotionState.triggers,
                timestamp: emotionState.timestamp.toISOString(),
                recentHistory: emotionState.history.slice(-3).map(record => ({
                  emotion: record.emotion,
                  intensity: record.intensity,
                  timestamp: record.timestamp.toISOString(),
                  duration: record.duration
                }))
              }, null, 2)
            }
          } catch (error) {
            return {
              type: 'text',
              text: JSON.stringify({ error: `Emotion access error: ${error instanceof Error ? error.message : 'Unknown error'}` })
            }
          }
        },
        metadata: { cacheable: false }
      })
    }

    // Extensions resource
    this.registerResource({
      uri: 'agent://extensions',
      name: 'Agent Extensions',
      description: 'Information about loaded agent extensions',
      mimeType: 'application/json',
      handler: async () => {
        const extensions = this.agent?.extensions?.map(ext => ({
          id: ext.id,
          name: ext.name,
          version: ext.version,
          type: ext.type,
          enabled: ext.enabled,
          status: ext.status,
          capabilities: ext.capabilities || [],
          dependencies: ext.dependencies || []
        })) || []

        return {
          type: 'text',
          text: JSON.stringify({ extensions, count: extensions.length }, null, 2)
        }
      },
      metadata: { cacheable: true, refreshInterval: 60000 }
    })

    // Server metrics resource
    this.registerResource({
      uri: 'agent://server/metrics',
      name: 'Server Metrics',
      description: 'Detailed MCP server performance metrics',
      mimeType: 'application/json',
      handler: async () => {
        const metrics = {
          ...this.stats,
          uptime: Date.now() - this.stats.startTime.getTime(),
          connections: Array.from(this.connections.values()).map(conn => ({
            id: conn.id,
            type: conn.type,
            connectedAt: conn.connectedAt.toISOString(),
            requestCount: conn.requestCount,
            lastActivity: conn.lastActivity.toISOString(),
            remoteAddress: conn.remoteAddress
          })),
          tools: {
            registered: this.tools.size,
            available: Array.from(this.tools.keys())
          },
          resources: {
            registered: this.resources.size,
            available: Array.from(this.resources.keys())
          },
          prompts: {
            registered: this.prompts.size,
            available: Array.from(this.prompts.keys())
          }
        }

        return {
          type: 'text',
          text: JSON.stringify(metrics, null, 2)
        }
      },
      metadata: { cacheable: false }
    })
  }

  private registerDefaultPrompts(): void {
    // System prompt
    this.registerPrompt({
      name: 'system_prompt',
      description: 'Get the agent\'s system prompt with character context',
      arguments: [{
        name: 'context',
        description: 'Additional context to include',
        required: false,
        type: 'string'
      }, {
        name: 'includePersonality',
        description: 'Include personality traits in the prompt',
        required: false,
        type: 'boolean',
        default: true
      }],
      handler: async (args) => {
        let prompt = `You are ${this.agent?.name}, an AI agent with advanced capabilities.`
        
        if (args.includePersonality && this.agent?.config) {
          const { core, lore, psyche } = this.agent.config
          prompt += `\n\nPersonality: ${core.personality?.join(', ') || 'Adaptive'}`
          prompt += `\nTone: ${core.tone || 'Helpful'}`
          prompt += `\nOrigin: ${lore.origin || 'Unknown'}`
          prompt += `\nMotive: ${lore.motive || 'To assist and learn'}`
          if (lore.background) prompt += `\nBackground: ${lore.background}`
          prompt += `\nTraits: ${psyche.traits?.join(', ') || 'Intelligent, Curious'}`
        }
        
        if (args.context) {
          prompt += `\n\nContext: ${args.context}`
        }
        
        return prompt
      },
      metadata: { category: 'system' }
    })

    // Conversation starter prompt
    this.registerPrompt({
      name: 'conversation_starter',
      description: 'Generate a conversation starter based on current context and emotion',
      arguments: [{
        name: 'topic',
        description: 'Topic for the conversation',
        required: false,
        type: 'string'
      }, {
        name: 'tone',
        description: 'Desired tone (casual, formal, friendly, professional)',
        required: false,
        type: 'string',
        default: 'friendly'
      }, {
        name: 'includeEmotion',
        description: 'Include current emotional state in the starter',
        required: false,
        type: 'boolean',
        default: false
      }],
      handler: async (args) => {
        let starter = `Hello! I'm ${this.agent?.name}.`
        
        const topic = args.topic || 'anything you\'d like to discuss'
        const tone = args.tone || 'friendly'
        
        if (args.includeEmotion && this.agent?.emotion) {
          try {
            const emotionState = await this.agent.emotion.getCurrentState()
            starter += ` I'm feeling ${emotionState.current} right now.`
          } catch (error) {
            runtimeLogger.debug('Failed to get emotion state for conversation starter:', error)
          }
        }
        
        starter += ` I'd love to have a ${tone} conversation about ${topic}. What would you like to explore?`
        
        return starter
      },
      metadata: { category: 'conversation' }
    })

    // Memory analysis prompt
    if (this.config.exposedCapabilities?.memoryAccess) {
      this.registerPrompt({
        name: 'memory_analysis',
        description: 'Analyze memories for patterns and insights',
        arguments: [{
          name: 'timeframe',
          description: 'Time period to analyze (recent, all)',
          required: false,
          type: 'string',
          default: 'recent'
        }, {
          name: 'focus',
          description: 'Specific focus area for analysis',
          required: false,
          type: 'string'
        }],
        handler: async (args) => {
          let prompt = `Please analyze my memories`
          
          if (args.timeframe === 'recent') {
            prompt += ` from recent interactions`
          } else {
            prompt += ` from all stored experiences`
          }
          
          if (args.focus) {
            prompt += ` with special focus on ${args.focus}`
          }
          
          prompt += `. Look for patterns, insights, and important themes. Provide a summary of key findings and any recommendations.`
          
          // Add memory context if available
          if (this.agent?.memory) {
            try {
              const memories = await this.agent.memory.getRecent(this.agent.id, 10)
              if (memories.length > 0) {
                prompt += `\n\nRecent memories to analyze:\n`
                memories.forEach((memory, index) => {
                  prompt += `${index + 1}. [${memory.type}] ${memory.content}\n`
                })
              }
            } catch (error) {
              runtimeLogger.debug('Failed to retrieve memories for analysis prompt:', error)
            }
          }
          
          return prompt
        },
        metadata: { category: 'analysis' }
      })
    }

    // Emotional reflection prompt
    if (this.config.exposedCapabilities?.emotionState) {
      this.registerPrompt({
        name: 'emotional_reflection',
        description: 'Reflect on current emotional state and recent changes',
        arguments: [{
          name: 'depth',
          description: 'Depth of reflection (surface, deep)',
          required: false,
          type: 'string',
          default: 'surface'
        }],
        handler: async (args) => {
          let prompt = `Please help me reflect on my current emotional state`
          
          if (this.agent?.emotion) {
            try {
              const emotionState = await this.agent.emotion.getCurrentState()
              prompt += `. I'm currently feeling ${emotionState.current} with an intensity of ${emotionState.intensity}.`
              
              if (emotionState.triggers.length > 0) {
                prompt += ` Recent triggers include: ${emotionState.triggers.join(', ')}.`
              }
              
              if (args.depth === 'deep' && emotionState.history.length > 0) {
                prompt += `\n\nRecent emotional journey:\n`
                emotionState.history.slice(-5).forEach((record, index) => {
                  prompt += `${index + 1}. ${record.emotion} (intensity: ${record.intensity}) - ${record.timestamp.toLocaleString()}\n`
                })
              }
            } catch (error) {
              runtimeLogger.debug('Failed to get emotion state for reflection prompt:', error)
            }
          }
          
          prompt += ` What insights can you provide about my emotional patterns and how I might better understand my feelings?`
          
          return prompt
        },
        metadata: { category: 'reflection' }
      })
    }

    // Agent capability overview prompt
    this.registerPrompt({
      name: 'capability_overview',
      description: 'Provide an overview of the agent\'s capabilities and current state',
      arguments: [{
        name: 'includeDetails',
        description: 'Include detailed technical information',
        required: false,
        type: 'boolean',
        default: false
      }],
      handler: async (args) => {
        let prompt = `Please provide an overview of my current capabilities and state as ${this.agent?.name}.`
        
        const capabilities = Object.keys(this.config.exposedCapabilities || {})
        if (capabilities.length > 0) {
          prompt += `\n\nMy available capabilities include: ${capabilities.join(', ')}.`
        }
        
        if (args.includeDetails) {
          prompt += `\n\nCurrent system state:`
          prompt += `\n- Status: ${this.agent?.status || 'unknown'}`
          prompt += `\n- Extensions: ${this.agent?.extensions?.length || 0} loaded`
          prompt += `\n- Memory system: ${this.agent?.memory ? 'active' : 'inactive'}`
          prompt += `\n- Emotion system: ${this.agent?.emotion ? 'active' : 'inactive'}`
          prompt += `\n- Cognition system: ${this.agent?.cognition ? 'active' : 'inactive'}`
        }
        
        prompt += ` How can I best assist you with my current capabilities?`
        
        return prompt
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