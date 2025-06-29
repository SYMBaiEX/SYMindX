/**
 * API Extension for SYMindX
 * Provides HTTP REST API and WebSocket server capabilities
 */

import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { WebSocket, WebSocketServer } from 'ws'
import { createServer } from 'http'
import * as http from 'http'
import { Extension, ExtensionType, ExtensionStatus, Agent, ExtensionAction, ExtensionEventHandler } from '../../types/agent.js'
import { ExtensionConfig } from '../../types/common.js'
import {
  ApiConfig,
  ApiSettings,
  ApiRequest,
  ApiResponse,
  ChatRequest,
  ChatResponse,
  MemoryRequest,
  MemoryResponse,
  ActionRequest,
  ActionResponse,
  WebSocketMessage,
  ConnectionInfo
} from './types.js'
import { EnhancedWebSocketServer } from './websocket.js'
import { WebUIServer } from './webui/index.js'
import { CommandSystem } from '../../core/command-system.js'

export class ApiExtension implements Extension {
  id = 'api'
  name = 'API Server'
  version = '1.0.0'
  type = ExtensionType.COMMUNICATION
  enabled = true
  status = ExtensionStatus.DISABLED
  config: ApiConfig
  actions: Record<string, ExtensionAction> = {}
  events: Record<string, ExtensionEventHandler> = {}

  private agent?: Agent
  private app: express.Application
  private server?: http.Server
  private wss?: WebSocketServer
  private apiConfig: ApiSettings
  private connections = new Map<string, WebSocket>()
  private rateLimiters = new Map<string, { count: number; resetTime: number }>()
  private enhancedWS?: EnhancedWebSocketServer
  private webUI?: WebUIServer
  private commandSystem?: CommandSystem
  private runtime?: any

  constructor(config: ApiConfig) {
    this.config = config
    this.apiConfig = {
      ...this.getDefaultSettings(),
      ...config.settings
    }
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  async init(agent: Agent): Promise<void> {
    this.agent = agent
    
    // Initialize command system integration
    if (!this.commandSystem) {
      this.commandSystem = new CommandSystem()
    }
    
    // Register agent with command system
    this.commandSystem.registerAgent(agent)
  }

  async tick(agent: Agent): Promise<void> {
    // Broadcast agent status updates via WebSocket
    if (this.enhancedWS) {
      this.enhancedWS.broadcastAgentUpdate(agent.id, {
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate
      })
    }
  }

  private getDefaultSettings(): ApiSettings {
    return {
      port: 3000,
      host: '0.0.0.0',
      cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization']
      },
      rateLimit: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 100
      },
      websocket: {
        enabled: true,
        path: '/ws',
        heartbeatInterval: 30000
      },
      auth: {
        enabled: false,
        type: 'bearer',
        secret: process.env.API_SECRET || 'default-secret'
      },
      logging: {
        enabled: true,
        level: 'info',
        format: 'combined'
      }
    }
  }

  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // CORS
    if (this.apiConfig.cors.enabled) {
      this.app.use(cors({
        origin: this.apiConfig.cors.origins,
        methods: this.apiConfig.cors.methods,
        allowedHeaders: this.apiConfig.cors.headers,
        credentials: true
      }))
    }

    // Rate limiting
    if (this.apiConfig.rateLimit.enabled) {
      const limiter = rateLimit({
        windowMs: this.apiConfig.rateLimit.windowMs,
        max: this.apiConfig.rateLimit.maxRequests,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false
      })
      this.app.use(limiter)
    }

    // Authentication middleware
    if (this.apiConfig.auth.enabled) {
      this.app.use(this.authMiddleware.bind(this))
    }
  }

  private authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const token = authHeader.substring(7)
    if (token !== this.apiConfig.auth.secret) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    next()
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.version
      })
    })

    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        agent: {
          id: this.agent?.id || 'unknown',
          status: this.agent?.status || 'unknown',
          uptime: process.uptime()
        },
        extensions: {
          loaded: this.agent?.extensions?.length || 0,
          active: this.agent?.extensions?.filter(ext => ext.enabled).length || 0
        },
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal
        }
      })
    })

    // Chat endpoint
    this.app.post('/chat', async (req, res) => {
      try {
        const chatRequest: ChatRequest = req.body
        if (!chatRequest.message) {
          res.status(400).json({ error: 'Message is required' })
          return
        }

        // Process chat message through agent
        const response = await this.processChatMessage(chatRequest)
        res.json(response)
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
      }
    })

    // Memory endpoints
    this.app.get('/memory', async (req, res) => {
      try {
        const memories = await this.getMemories()
        res.json({ memories })
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve memories' })
      }
    })

    this.app.post('/memory', async (req, res) => {
      try {
        const memoryRequest: MemoryRequest = req.body
        const result = await this.storeMemory(memoryRequest)
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: 'Failed to store memory' })
      }
    })

    // Action endpoint
    this.app.post('/action', async (req, res) => {
      try {
        const actionRequest: ActionRequest = req.body
        const result = await this.executeAction(actionRequest)
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: 'Failed to execute action' })
      }
    })
  }

  private async processChatMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.commandSystem || !this.agent) {
      return {
        response: 'Chat system not available',
        timestamp: new Date().toISOString()
      }
    }

    try {
      const response = await this.commandSystem.sendMessage(this.agent.id, request.message)
      return {
        response,
        timestamp: new Date().toISOString(),
        sessionId: request.context?.sessionId,
        metadata: {
          tokensUsed: 0, // Would be calculated by the actual processing
          processingTime: 0,
          memoryRetrieved: false,
          emotionState: this.agent.emotion?.current
        }
      }
    } catch (error) {
      return {
        response: `Error processing message: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  private async getMemories(): Promise<any[]> {
    if (!this.agent?.memory) {
      return []
    }

    try {
      return await this.agent.memory.retrieve(this.agent.id, 'recent', 20)
    } catch (error) {
      console.error('Failed to retrieve memories:', error)
      return []
    }
  }

  private async storeMemory(request: MemoryRequest): Promise<MemoryResponse> {
    if (!this.agent?.memory) {
      return {
        success: false,
        id: '',
        timestamp: new Date().toISOString(),
        error: 'Memory system not available'
      }
    }

    try {
      await this.agent.memory.store(this.agent.id, {
        id: 'memory-' + Date.now(),
        agentId: this.agent.id,
        content: request.content,
        type: 'interaction' as any, // Convert string to MemoryType
        metadata: request.metadata || {},
        importance: 0.5,
        timestamp: new Date(),
        tags: [],
        duration: 'short_term' as any
      })
      
      return {
        success: true,
        id: 'memory-' + Date.now(),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        id: '',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async executeAction(request: ActionRequest): Promise<ActionResponse> {
    if (!this.commandSystem || !this.agent) {
      return {
        success: false,
        error: 'Action system not available',
        executionTime: 0
      }
    }

    try {
      const startTime = Date.now()
      const command = await this.commandSystem.sendCommand(
        this.agent.id,
        `${request.action} ${JSON.stringify(request.parameters || {})}`,
        {
          priority: 2, // Normal priority
          async: request.async || false
        }
      )
      
      const executionTime = Date.now() - startTime
      
      return {
        success: command.result?.success || false,
        result: command.result?.response || command.result?.data,
        error: command.result?.error,
        executionTime,
        actionId: command.id
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0
      }
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app)
        
        // Setup WebSocket server if enabled
        if (this.apiConfig.websocket.enabled) {
          this.setupWebSocketServer()
        }
        
        // Setup WebUI server
        this.setupWebUIServer()

        this.server.listen(this.apiConfig.port, this.apiConfig.host, () => {
          console.log(`🚀 API Server running on ${this.apiConfig.host}:${this.apiConfig.port}`)
          this.status = ExtensionStatus.ENABLED
          resolve()
        })

        this.server.on('error', (error) => {
          console.error('❌ API Server error:', error)
          this.status = ExtensionStatus.ERROR
          reject(error)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close()
      }

      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Server stopped')
          this.status = ExtensionStatus.DISABLED
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  private setupWebSocketServer(): void {
    if (!this.server || !this.commandSystem) return

    // Initialize enhanced WebSocket server
    this.enhancedWS = new EnhancedWebSocketServer(this.commandSystem)
    this.enhancedWS.initialize(this.server, this.apiConfig.websocket.path)
    
    console.log(`🔌 Enhanced WebSocket server initialized on ${this.apiConfig.websocket.path}`)

    // Keep legacy WebSocket for backward compatibility
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: this.apiConfig.websocket.path + '-legacy'
    })

    this.wss.on('connection', (ws: WebSocket, req) => {
      const connectionId = this.generateConnectionId()
      this.connections.set(connectionId, ws)

      console.log(`🔌 Legacy WebSocket client connected: ${connectionId}`)

      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          await this.handleWebSocketMessage(connectionId, message)
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }))
        }
      })

      ws.on('close', () => {
        this.connections.delete(connectionId)
        console.log(`🔌 Legacy WebSocket client disconnected: ${connectionId}`)
      })

      ws.on('error', (error) => {
        console.error(`❌ Legacy WebSocket error for ${connectionId}:`, error)
        this.connections.delete(connectionId)
      })

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        connectionId,
        timestamp: new Date().toISOString()
      }))
    })
  }

  private async handleWebSocketMessage(connectionId: string, message: WebSocketMessage): Promise<void> {
    const ws = this.connections.get(connectionId)
    if (!ws) return

    try {
      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          break
        case 'chat':
          // Handle chat message
          const response = await this.processChatMessage({ 
            message: message.data || message.message || '',
            context: { sessionId: connectionId }
          })
          ws.send(JSON.stringify({ type: 'chat_response', data: response }))
          break
        case 'action':
          // Handle command execution
          if (this.commandSystem && this.agent) {
            const command = await this.commandSystem.sendCommand(
              this.agent.id,
              message.data || '',
              { priority: 2, async: true }
            )
            ws.send(JSON.stringify({ 
              type: 'command_response', 
              data: { commandId: command.id, status: command.status }
            }))
          }
          break
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }))
      }
    } catch (error) {
      ws.send(JSON.stringify({ error: 'Failed to process message' }))
    }
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  getConnectionInfo(): ConnectionInfo[] {
    const legacyConnections = Array.from(this.connections.entries()).map(([id, ws]) => ({
      id,
      readyState: ws.readyState,
      connectedAt: new Date().toISOString() // This would need to be tracked properly
    }))
    
    const enhancedConnections = this.enhancedWS ? 
      this.enhancedWS.getConnections().map(conn => ({
        id: conn.id,
        readyState: conn.ws.readyState,
        connectedAt: conn.clientInfo.connectedAt.toISOString()
      })) : []
    
    return [...legacyConnections, ...enhancedConnections]
  }
  
  private setupWebUIServer(): void {
    if (!this.commandSystem) return
    
    this.webUI = new WebUIServer(
      this.commandSystem,
      () => this.getAgentsMap(),
      () => this.getRuntimeStats()
    )
    
    // Mount WebUI routes
    this.app.use('/ui', this.webUI.getExpressApp())
    
    console.log('🌐 WebUI server initialized at /ui')
  }
  
  private getAgentsMap(): Map<string, any> {
    // This would need to be injected or accessed from the runtime
    return new Map()
  }
  
  private getRuntimeStats(): any {
    // This would need to be injected or accessed from the runtime
    return {
      isRunning: true,
      agents: 0,
      autonomousAgents: 0
    }
  }
  
  public setRuntime(runtime: any): void {
    this.runtime = runtime
  }
  
  public getCommandSystem(): CommandSystem | undefined {
    return this.commandSystem
  }
  
  public getEnhancedWebSocket(): EnhancedWebSocketServer | undefined {
    return this.enhancedWS
  }
}