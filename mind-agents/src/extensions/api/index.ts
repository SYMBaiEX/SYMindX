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
import * as os from 'os'
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
import { SQLiteChatRepository, createSQLiteChatRepository } from '../../modules/memory/providers/sqlite/chat-repository.js'
import { ChatMigrationManager, createChatMigrationManager } from '../../modules/memory/providers/sqlite/chat-migration.js'
import { 
  Conversation,
  Message,
  SenderType,
  MessageType,
  MessageStatus,
  ConversationStatus,
  ParticipantType
} from '../../modules/memory/providers/sqlite/chat-types.js'

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
  private chatRepository?: SQLiteChatRepository
  private migrationManager?: ChatMigrationManager
  private activeConversations: Map<string, string> = new Map() // userId -> conversationId

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
    
    // Initialize chat persistence
    await this.initializeChatPersistence()
    
    // Initialize command system integration
    if (!this.commandSystem) {
      this.commandSystem = new CommandSystem()
    }
    
    // Register agent with command system
    this.commandSystem.registerAgent(agent)
    
    // Start the API server
    await this.start()
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
      port: parseInt(process.env.API_PORT || '8000'),
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

    // Agents endpoint (also available at /api/agents for consistency)
    this.app.get('/agents', (req, res) => {
      const agents = []
      
      // Get all agents from the agents map
      const agentsMap = this.getAgentsMap()
      for (const [id, agent] of agentsMap) {
        agents.push({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          emotion: agent.emotion?.current,
          lastUpdate: agent.lastUpdate,
          extensionCount: agent.extensions?.length || 0,
          hasPortal: !!agent.portal,
          ethicsEnabled: agent.characterConfig?.ethics?.enabled !== false
        })
      }
      
      res.json({ agents })
    })
    
    // Also register at /api/agents for consistency with WebUI
    this.app.get('/api/agents', (req, res) => {
      const agents = []
      
      // Get all agents from the agents map
      const agentsMap = this.getAgentsMap()
      for (const [id, agent] of agentsMap) {
        agents.push({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          emotion: agent.emotion?.current,
          lastUpdate: agent.lastUpdate,
          extensionCount: agent.extensions?.length || 0,
          hasPortal: !!agent.portal,
          ethicsEnabled: agent.characterConfig?.ethics?.enabled !== false
        })
      }
      
      res.json({ agents })
    })
    
    // Get individual agent details
    this.app.get('/api/agent/:agentId', (req, res) => {
      const { agentId } = req.params
      const agentsMap = this.getAgentsMap()
      const agent = agentsMap.get(agentId)
      
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' })
        return
      }
      
      // Return detailed agent information
      res.json({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        emotion: agent.emotion?.current,
        lastUpdate: agent.lastUpdate,
        commandsProcessed: 0, // TODO: Track this properly
        memoryUsage: process.memoryUsage().heapUsed,
        extensions: agent.extensions?.map((ext: Extension) => ({
          name: ext.name,
          enabled: ext.enabled,
          status: ext.status
        })) || [],
        capabilities: agent.capabilities || [],
        personality: agent.personality || 'neutral',
        portal: agent.portal ? {
          type: agent.portal.type,
          status: agent.portal.status
        } : null
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
    
    // Chat history endpoint
    this.app.get('/chat/history/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params
        const limit = parseInt(req.query.limit as string) || 50
        const userId = req.query.userId as string || 'default_user'
        
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }
        
        // Find or create conversation
        const conversationId = await this.getOrCreateConversationId(userId, agentId)
        
        const messages = await this.chatRepository.listMessages({
          conversationId,
          limit,
          includeDeleted: false
        })
        
        // Convert to API format
        const apiMessages = messages.map(msg => ({
          id: msg.id,
          agentId,
          sender: msg.senderType === SenderType.USER ? 'user' : 'agent',
          message: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        }))
        
        res.json({ 
          agentId,
          messages: apiMessages.reverse(), // Most recent last
          total: apiMessages.length 
        })
      } catch (error) {
        console.error('Error fetching chat history:', error)
        res.status(500).json({ error: 'Failed to fetch chat history' })
      }
    })
    
    // Clear chat history endpoint
    this.app.delete('/chat/history/:agentId', async (req, res) => {
      try {
        const { agentId } = req.params
        const userId = req.query.userId as string || 'default_user'
        
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }
        
        const conversationId = this.activeConversations.get(userId)
        if (conversationId) {
          await this.chatRepository.deleteConversation(conversationId, 'api_user')
          this.activeConversations.delete(userId)
        }
        
        res.json({ success: true, agentId })
      } catch (error) {
        console.error('Error clearing chat history:', error)
        res.status(500).json({ error: 'Failed to clear chat history' })
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

    // Multi-Agent Management Endpoints
    
    // Spawn new agent
    this.app.post('/api/agents/spawn', async (req, res) => {
      try {
        const { characterId, instanceName, config, priority, autoStart = true } = req.body
        
        if (!characterId) {
          res.status(400).json({ error: 'characterId is required' })
          return
        }
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const agentId = await this.runtime.multiAgentManager.spawnAgent({
          characterId,
          instanceName,
          config,
          priority,
          autoStart
        })
        
        res.json({ 
          success: true, 
          agentId, 
          characterId, 
          instanceName,
          message: `Agent spawned successfully: ${instanceName || characterId}` 
        })
      } catch (error) {
        console.error('Error spawning agent:', error)
        res.status(500).json({ 
          error: 'Failed to spawn agent',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Stop agent
    this.app.post('/api/agents/:agentId/stop', async (req, res) => {
      try {
        const { agentId } = req.params
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        await this.runtime.multiAgentManager.stopAgent(agentId)
        
        res.json({ 
          success: true, 
          agentId,
          message: `Agent stopped successfully` 
        })
      } catch (error) {
        console.error('Error stopping agent:', error)
        res.status(500).json({ 
          error: 'Failed to stop agent',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Restart agent
    this.app.post('/api/agents/:agentId/restart', async (req, res) => {
      try {
        const { agentId } = req.params
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        await this.runtime.multiAgentManager.restartAgent(agentId)
        
        res.json({ 
          success: true, 
          agentId,
          message: `Agent restarted successfully` 
        })
      } catch (error) {
        console.error('Error restarting agent:', error)
        res.status(500).json({ 
          error: 'Failed to restart agent',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Get agent health
    this.app.get('/api/agents/:agentId/health', (req, res) => {
      try {
        const { agentId } = req.params
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const health = this.runtime.multiAgentManager.getAgentHealth(agentId)
        
        if (!health) {
          res.status(404).json({ error: 'Agent not found' })
          return
        }
        
        res.json(health)
      } catch (error) {
        console.error('Error getting agent health:', error)
        res.status(500).json({ 
          error: 'Failed to get agent health',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // List all managed agents
    this.app.get('/api/agents/managed', (req, res) => {
      try {
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const agents = this.runtime.multiAgentManager.listAgents()
        res.json({ agents })
      } catch (error) {
        console.error('Error listing managed agents:', error)
        res.status(500).json({ 
          error: 'Failed to list managed agents',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Get system metrics including multi-agent info
    this.app.get('/api/agents/metrics', (req, res) => {
      try {
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const metrics = this.runtime.multiAgentManager.getSystemMetrics()
        res.json(metrics)
      } catch (error) {
        console.error('Error getting system metrics:', error)
        res.status(500).json({ 
          error: 'Failed to get system metrics',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Find agents by specialty
    this.app.get('/api/agents/specialty/:specialty', (req, res) => {
      try {
        const { specialty } = req.params
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const agents = this.runtime.multiAgentManager.findAgentsBySpecialty(specialty)
        res.json({ 
          specialty,
          agents: agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            status: agent.status
          }))
        })
      } catch (error) {
        console.error('Error finding agents by specialty:', error)
        res.status(500).json({ 
          error: 'Failed to find agents by specialty',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    // Route conversation to best agent
    this.app.post('/api/agents/route', (req, res) => {
      try {
        const requirements = req.body
        
        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }
        
        const agent = this.runtime.multiAgentManager.routeConversation(requirements)
        
        if (!agent) {
          res.status(404).json({ error: 'No suitable agent found for requirements' })
          return
        }
        
        res.json({
          agentId: agent.id,
          name: agent.name,
          status: agent.status,
          requirements
        })
      } catch (error) {
        console.error('Error routing conversation:', error)
        res.status(500).json({ 
          error: 'Failed to route conversation',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    })

    // Stats endpoint
    this.app.get('/api/stats', (req, res) => {
      const runtimeStats = this.getRuntimeStats()
      const commandStats = this.commandSystem ? this.commandSystem.getStats() : {
        totalCommands: 0,
        completedCommands: 0,
        failedCommands: 0,
        pendingCommands: 0,
        processingCommands: 0,
        avgResponseTime: 0,
        activeConnections: 0
      }
      
      // Add WebSocket connection count
      if (this.enhancedWS && 'activeConnections' in commandStats) {
        commandStats.activeConnections = this.enhancedWS.getConnections().length
      }
      
      // Add multi-agent metrics if available
      let multiAgentMetrics = null
      if (this.runtime?.multiAgentManager) {
        try {
          multiAgentMetrics = this.runtime.multiAgentManager.getSystemMetrics()
        } catch (error) {
          console.warn('Failed to get multi-agent metrics:', error)
        }
      }
      
      res.json({
        runtime: runtimeStats,
        commands: commandStats,
        multiAgent: multiAgentMetrics,
        system: {
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          platform: process.platform,
          nodeVersion: process.version,
          totalSystemMemory: os.totalmem(),
          freeSystemMemory: os.freemem()
        }
      })
    })

    // Commands endpoint for recent command history
    this.app.get('/api/commands', (req, res) => {
      const agentId = req.query.agent as string | undefined
      const limit = parseInt(req.query.limit as string) || 20
      
      if (!this.commandSystem) {
        res.json([])
        return
      }
      
      let commands = this.commandSystem.getAllCommands()
      
      if (agentId) {
        commands = commands.filter(cmd => cmd.agentId === agentId)
      }
      
      // Sort by timestamp and limit
      commands = commands
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit)
      
      res.json(commands.map(cmd => ({
        id: cmd.id,
        agentId: cmd.agentId,
        instruction: cmd.instruction,
        type: cmd.type,
        status: cmd.status,
        timestamp: cmd.timestamp,
        result: cmd.result,
        executionTime: cmd.result?.executionTime
      })))
    })

    // Conversation endpoints
    this.app.get('/api/conversations', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const userId = req.query.userId as string || 'default_user'
        const agentId = req.query.agentId as string
        const status = req.query.status as ConversationStatus
        const limit = parseInt(req.query.limit as string) || 50

        const conversations = await this.chatRepository.listConversations({
          userId,
          agentId,
          status,
          limit,
          orderBy: 'updated',
          orderDirection: 'desc'
        })

        res.json({ conversations })
      } catch (error) {
        console.error('Error fetching conversations:', error)
        res.status(500).json({ error: 'Failed to fetch conversations' })
      }
    })

    this.app.post('/api/conversations', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { agentId, userId = 'default_user', title } = req.body
        
        if (!agentId) {
          res.status(400).json({ error: 'Agent ID is required' })
          return
        }

        const conversation = await this.chatRepository.createConversation({
          agentId,
          userId,
          title: title || `Chat with ${agentId}`,
          status: ConversationStatus.ACTIVE,
          messageCount: 0,
          metadata: {
            createdVia: 'api',
            agentName: this.agent?.name || agentId
          }
        })

        // Set as active conversation for this user
        this.activeConversations.set(userId, conversation.id)

        res.json({ conversation })
      } catch (error) {
        console.error('Error creating conversation:', error)
        res.status(500).json({ error: 'Failed to create conversation' })
      }
    })

    this.app.get('/api/conversations/:conversationId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId } = req.params
        const conversation = await this.chatRepository.getConversation(conversationId)

        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        res.json({ conversation })
      } catch (error) {
        console.error('Error fetching conversation:', error)
        res.status(500).json({ error: 'Failed to fetch conversation' })
      }
    })

    this.app.get('/api/conversations/:conversationId/messages', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId } = req.params
        const limit = parseInt(req.query.limit as string) || 50
        const offset = parseInt(req.query.offset as string) || 0

        const messages = await this.chatRepository.listMessages({
          conversationId,
          limit,
          offset,
          includeDeleted: false
        })

        // Convert to API format
        const apiMessages = messages.map(msg => ({
          id: msg.id,
          conversationId: msg.conversationId,
          sender: msg.senderType === SenderType.USER ? 'user' : 'agent',
          senderId: msg.senderId,
          message: msg.content,
          messageType: msg.messageType,
          timestamp: msg.timestamp,
          editedAt: msg.editedAt,
          status: msg.status,
          metadata: msg.metadata,
          emotionState: msg.emotionState,
          thoughtProcess: msg.thoughtProcess,
          confidenceScore: msg.confidenceScore,
          memoryReferences: msg.memoryReferences
        }))

        res.json({ 
          conversationId,
          messages: apiMessages.reverse(), // Most recent last
          total: apiMessages.length 
        })
      } catch (error) {
        console.error('Error fetching conversation messages:', error)
        res.status(500).json({ error: 'Failed to fetch conversation messages' })
      }
    })

    this.app.post('/api/conversations/:conversationId/messages', async (req, res) => {
      try {
        if (!this.chatRepository || !this.commandSystem) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId } = req.params
        const { message, userId = 'default_user' } = req.body

        if (!message) {
          res.status(400).json({ error: 'Message is required' })
          return
        }

        // Verify conversation exists
        const conversation = await this.chatRepository.getConversation(conversationId)
        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        // Store user message
        const userMessage = await this.chatRepository.createMessage({
          conversationId,
          senderType: SenderType.USER,
          senderId: userId,
          content: message,
          messageType: MessageType.TEXT,
          metadata: {},
          memoryReferences: [],
          createdMemories: [],
          status: MessageStatus.SENT
        })

        // Process message through agent
        const startTime = Date.now()
        const response = await this.commandSystem.sendMessage(conversation.agentId, message)
        const processingTime = Date.now() - startTime

        // Store agent response
        const agentMessage = await this.chatRepository.createMessage({
          conversationId,
          senderType: SenderType.AGENT,
          senderId: conversation.agentId,
          content: response,
          messageType: MessageType.TEXT,
          metadata: {
            emotionState: this.agent?.emotion?.current,
            processingTime
          },
          emotionState: this.agent?.emotion?.current ? {
            current: this.agent.emotion.current,
            intensity: 0.5,
            triggers: [],
            timestamp: new Date()
          } : undefined,
          memoryReferences: [],
          createdMemories: [],
          status: MessageStatus.SENT
        })

        res.json({
          userMessage: {
            id: userMessage.id,
            message: userMessage.content,
            timestamp: userMessage.timestamp
          },
          agentMessage: {
            id: agentMessage.id,
            message: agentMessage.content,
            timestamp: agentMessage.timestamp
          },
          metadata: {
            processingTime,
            emotionState: this.agent?.emotion?.current
          }
        })
      } catch (error) {
        console.error('Error sending message:', error)
        res.status(500).json({ error: 'Failed to send message' })
      }
    })

    this.app.delete('/api/conversations/:conversationId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId } = req.params
        const userId = req.query.userId as string || 'api_user'

        await this.chatRepository.deleteConversation(conversationId, userId)
        
        // Remove from active conversations if it was active
        for (const [user, activeConvId] of this.activeConversations.entries()) {
          if (activeConvId === conversationId) {
            this.activeConversations.delete(user)
            break
          }
        }

        res.json({ success: true })
      } catch (error) {
        console.error('Error deleting conversation:', error)
        res.status(500).json({ error: 'Failed to delete conversation' })
      }
    })

    // ========================================
    // ENHANCED MULTI-AGENT CHAT ENDPOINTS
    // ========================================

    // Route message to best agent automatically
    this.app.post('/api/chat/route', async (req, res) => {
      try {
        const { message, requirements, userId = 'default_user', conversationId } = req.body
        
        if (!message) {
          res.status(400).json({ error: 'Message is required' })
          return
        }

        if (!this.runtime?.multiAgentManager) {
          res.status(503).json({ error: 'Multi-Agent Manager not available' })
          return
        }

        // Find best agent for this conversation
        const agent = this.runtime.multiAgentManager.routeConversation(requirements || {})
        if (!agent) {
          res.status(404).json({ error: 'No suitable agent found' })
          return
        }

        // Get or create conversation
        let targetConversationId = conversationId
        if (!targetConversationId) {
          const conversation = await this.chatRepository?.createConversation({
            agentId: agent.id,
            userId,
            title: `Auto-routed chat`,
            status: ConversationStatus.ACTIVE,
            messageCount: 0,
            metadata: {
              autoRouted: true,
              requirements,
              routedAt: new Date().toISOString()
            }
          })
          targetConversationId = conversation?.id
        }

        // Send message to the selected agent
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/conversations/${targetConversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, userId })
        })

        const result = await response.json()
        res.json({
          ...result,
          routedTo: {
            agentId: agent.id,
            name: agent.name,
            reason: 'Best match for requirements'
          }
        })
      } catch (error) {
        console.error('Error routing chat message:', error)
        res.status(500).json({ error: 'Failed to route message' })
      }
    })

    // Get available agents for chat
    this.app.get('/api/chat/agents/available', (req, res) => {
      try {
        const agentsMap = this.getAgentsMap()
        const availableAgents = []
        
        for (const [id, agent] of agentsMap) {
          if (agent.status === 'active') {
            availableAgents.push({
              id: agent.id,
              name: agent.name,
              status: agent.status,
              capabilities: agent.capabilities || [],
              personality: agent.personality || 'neutral',
              currentEmotion: agent.emotion?.current,
              loadLevel: agent.loadLevel || 'low',
              specialties: agent.specialties || [],
              description: agent.description || `AI agent ${agent.name}`
            })
          }
        }
        
        res.json({ 
          available: availableAgents.length,
          agents: availableAgents 
        })
      } catch (error) {
        console.error('Error getting available agents:', error)
        res.status(500).json({ error: 'Failed to get available agents' })
      }
    })

    // Broadcast message to multiple agents
    this.app.post('/api/chat/broadcast', async (req, res) => {
      try {
        const { message, agentIds, userId = 'default_user', title } = req.body
        
        if (!message || !agentIds || !Array.isArray(agentIds)) {
          res.status(400).json({ error: 'Message and agentIds array are required' })
          return
        }

        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const results = []
        
        for (const agentId of agentIds) {
          try {
            // Create separate conversation for each agent
            const conversation = await this.chatRepository.createConversation({
              agentId,
              userId,
              title: title || `Broadcast: ${message.substring(0, 50)}...`,
              status: ConversationStatus.ACTIVE,
              messageCount: 0,
              metadata: {
                broadcast: true,
                broadcastId: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                originalMessage: message
              }
            })

            // Send message
            const response = await fetch(`${req.protocol}://${req.get('host')}/api/conversations/${conversation.id}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message, userId })
            })

            if (response.ok) {
              const result = await response.json()
              results.push({
                agentId,
                conversationId: conversation.id,
                success: true,
                response: result.agentMessage
              })
            } else {
              results.push({
                agentId,
                conversationId: conversation.id,
                success: false,
                error: 'Failed to send message'
              })
            }
          } catch (error) {
            results.push({
              agentId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        res.json({
          broadcast: true,
          message,
          targetAgents: agentIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results
        })
      } catch (error) {
        console.error('Error broadcasting message:', error)
        res.status(500).json({ error: 'Failed to broadcast message' })
      }
    })

    // Transfer conversation to another agent
    this.app.put('/api/conversations/:conversationId/transfer/:newAgentId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId, newAgentId } = req.params
        const { reason, userId = 'system' } = req.body

        // Get current conversation
        const conversation = await this.chatRepository.getConversation(conversationId)
        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        const oldAgentId = conversation.agentId

        // Update conversation agent
        await this.chatRepository.updateConversation(conversationId, {
          agentId: newAgentId,
          metadata: {
            ...conversation.metadata,
            transferHistory: [
              ...(conversation.metadata.transferHistory || []),
              {
                from: oldAgentId,
                to: newAgentId,
                reason: reason || 'Manual transfer',
                timestamp: new Date().toISOString(),
                transferredBy: userId
              }
            ]
          }
        })

        // Add system message about the transfer
        await this.chatRepository.createMessage({
          conversationId,
          senderType: SenderType.SYSTEM,
          senderId: 'system',
          content: `Conversation transferred from ${oldAgentId} to ${newAgentId}. Reason: ${reason || 'Not specified'}`,
          messageType: MessageType.NOTIFICATION,
          metadata: {
            transfer: true,
            oldAgent: oldAgentId,
            newAgent: newAgentId
          },
          memoryReferences: [],
          createdMemories: [],
          status: MessageStatus.SENT
        })

        res.json({
          success: true,
          conversationId,
          transfer: {
            from: oldAgentId,
            to: newAgentId,
            reason,
            timestamp: new Date().toISOString()
          }
        })
      } catch (error) {
        console.error('Error transferring conversation:', error)
        res.status(500).json({ error: 'Failed to transfer conversation' })
      }
    })

    // Add agent to existing conversation (multi-agent conversation)
    this.app.post('/api/conversations/:conversationId/invite/:agentId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId, agentId } = req.params
        const { role = 'member', userId = 'system' } = req.body

        // Verify conversation exists
        const conversation = await this.chatRepository.getConversation(conversationId)
        if (!conversation) {
          res.status(404).json({ error: 'Conversation not found' })
          return
        }

        // Add agent as participant
        await this.chatRepository.addParticipant({
          conversationId,
          participantType: ParticipantType.AGENT,
          participantId: agentId,
          role: role,
          messageCount: 0,
          notificationsEnabled: true,
          preferences: {},
          status: 'active' as any
        })

        // Add system message about the invitation
        await this.chatRepository.createMessage({
          conversationId,
          senderType: SenderType.SYSTEM,
          senderId: 'system',
          content: `Agent ${agentId} has been invited to the conversation`,
          messageType: MessageType.NOTIFICATION,
          metadata: {
            agentInvite: true,
            invitedAgent: agentId,
            invitedBy: userId
          },
          memoryReferences: [],
          createdMemories: [],
          status: MessageStatus.SENT
        })

        res.json({
          success: true,
          conversationId,
          invitedAgent: agentId,
          role
        })
      } catch (error) {
        console.error('Error inviting agent to conversation:', error)
        res.status(500).json({ error: 'Failed to invite agent' })
      }
    })

    // Remove agent from conversation
    this.app.delete('/api/conversations/:conversationId/participants/:agentId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { conversationId, agentId } = req.params
        const { userId = 'system' } = req.body

        // Remove participant
        await this.chatRepository.removeParticipant(conversationId, agentId)

        // Add system message
        await this.chatRepository.createMessage({
          conversationId,
          senderType: SenderType.SYSTEM,
          senderId: 'system',
          content: `Agent ${agentId} has left the conversation`,
          messageType: MessageType.NOTIFICATION,
          metadata: {
            agentRemoval: true,
            removedAgent: agentId,
            removedBy: userId
          },
          memoryReferences: [],
          createdMemories: [],
          status: MessageStatus.SENT
        })

        res.json({
          success: true,
          conversationId,
          removedAgent: agentId
        })
      } catch (error) {
        console.error('Error removing agent from conversation:', error)
        res.status(500).json({ error: 'Failed to remove agent' })
      }
    })

    // Get chat analytics for specific agent
    this.app.get('/api/chat/analytics/agent/:agentId', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const { agentId } = req.params
        const days = parseInt(req.query.days as string) || 7

        // Get conversations for this agent
        const conversations = await this.chatRepository.listConversations({
          agentId,
          limit: 1000 // Get all conversations
        })

        let totalMessages = 0
        let totalConversations = conversations.length
        let avgResponseTime = 0
        let emotionBreakdown: Record<string, number> = {}
        let messageTrends: Array<{ date: string; count: number }> = []

        // Calculate analytics from conversation stats
        for (const conv of conversations) {
          if (conv.lastMessageAt) {
            const stats = await this.chatRepository.getConversationStats(conv.id)
            totalMessages += stats.messageCount
            
            if (stats.avgConfidence) {
              avgResponseTime += stats.avgConfidence // Approximation
            }
          }
        }

        res.json({
          agentId,
          period: `${days} days`,
          analytics: {
            totalConversations,
            totalMessages,
            averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
            avgResponseTime: avgResponseTime / Math.max(1, totalConversations),
            emotionBreakdown,
            messageTrends,
            activeConversations: conversations.filter(c => c.status === 'active').length
          }
        })
      } catch (error) {
        console.error('Error getting agent chat analytics:', error)
        res.status(500).json({ error: 'Failed to get chat analytics' })
      }
    })

    // Get system-wide chat analytics
    this.app.get('/api/chat/analytics/system', async (req, res) => {
      try {
        if (!this.chatRepository) {
          res.status(500).json({ error: 'Chat system not available' })
          return
        }

        const days = parseInt(req.query.days as string) || 7

        // Get all conversations
        const conversations = await this.chatRepository.listConversations({
          limit: 10000 // Get all conversations
        })

        const agentStats: Record<string, any> = {}
        let totalMessages = 0
        let totalConversations = conversations.length

        for (const conv of conversations) {
          const agentId = conv.agentId
          if (!agentStats[agentId]) {
            agentStats[agentId] = {
              conversations: 0,
              messages: 0,
              avgConfidence: 0
            }
          }
          
          agentStats[agentId].conversations++
          
          if (conv.messageCount) {
            agentStats[agentId].messages += conv.messageCount
            totalMessages += conv.messageCount
          }
        }

        res.json({
          period: `${days} days`,
          systemAnalytics: {
            totalConversations,
            totalMessages,
            activeAgents: Object.keys(agentStats).length,
            averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
            agentPerformance: agentStats,
            topAgents: Object.entries(agentStats)
              .sort(([,a], [,b]) => (b as any).messages - (a as any).messages)
              .slice(0, 5)
              .map(([agentId, stats]) => ({ agentId, ...stats }))
          }
        })
      } catch (error) {
        console.error('Error getting system chat analytics:', error)
        res.status(500).json({ error: 'Failed to get system analytics' })
      }
    })
  }

  private async processChatMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.commandSystem || !this.agent || !this.chatRepository) {
      return {
        response: 'Chat system not available',
        timestamp: new Date().toISOString()
      }
    }

    const agentId = request.agentId || this.agent.id
    const userId = request.context?.userId || 'default_user'
    const sessionId = request.context?.sessionId
    
    try {
      // Get or create conversation
      const conversationId = await this.getOrCreateConversationId(userId, agentId)
      
      // Store user message in database
      const userMessage = await this.chatRepository.createMessage({
        conversationId,
        senderType: SenderType.USER,
        senderId: userId,
        content: request.message,
        messageType: MessageType.TEXT,
        metadata: request.context || {},
        memoryReferences: [],
        createdMemories: [],
        status: MessageStatus.SENT
      })

      console.log(`💬 User message stored: ${userMessage.id}`)
      
      // Process message through command system
      const startTime = Date.now()
      const response = await this.commandSystem.sendMessage(agentId, request.message)
      const processingTime = Date.now() - startTime
      
      // Store agent response in database
      const agentMessage = await this.chatRepository.createMessage({
        conversationId,
        senderType: SenderType.AGENT,
        senderId: agentId,
        content: response,
        messageType: MessageType.TEXT,
        metadata: {
          emotionState: this.agent.emotion?.current,
          processingTime
        },
        emotionState: this.agent.emotion?.current ? {
          current: this.agent.emotion.current,
          intensity: 0.5, // Default intensity
          triggers: [],
          timestamp: new Date()
        } : undefined,
        memoryReferences: [],
        createdMemories: [],
        status: MessageStatus.SENT
      })

      console.log(`🤖 Agent response stored: ${agentMessage.id}`)
      
      // Update session activity if sessionId provided
      if (sessionId && this.chatRepository) {
        try {
          await this.chatRepository.updateSessionActivity(sessionId)
        } catch (error) {
          // Session might not exist, create it
          try {
            await this.chatRepository.createSession({
              userId,
              conversationId,
              connectionId: sessionId,
              clientInfo: { userAgent: 'API', source: 'http' }
            })
          } catch (createError) {
            console.warn('Failed to create session:', createError)
          }
        }
      }
      
      // Log analytics event
      await this.chatRepository.logEvent({
        eventType: 'message_processed',
        conversationId,
        userId,
        agentId,
        eventData: {
          userMessageId: userMessage.id,
          agentMessageId: agentMessage.id,
          messageLength: request.message.length,
          responseLength: response.length
        },
        processingTime
      })
      
      return {
        response,
        timestamp: new Date().toISOString(),
        sessionId,
        metadata: {
          tokensUsed: 0, // Would be calculated by the actual processing
          processingTime,
          memoryRetrieved: false,
          emotionState: this.agent.emotion?.current
        }
      }
    } catch (error) {
      console.error('Error processing chat message:', error)
      
      // Still try to log the error
      try {
        if (this.chatRepository) {
          await this.chatRepository.logEvent({
            eventType: 'message_error',
            userId,
            agentId,
            eventData: {
              error: error instanceof Error ? error.message : String(error),
              originalMessage: request.message
            }
          })
        }
      } catch (logError) {
        console.error('Failed to log error event:', logError)
      }
      
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
      () => this.getRuntimeStats(),
      this.runtime
    )
    
    // Mount WebUI routes
    this.app.use('/ui', this.webUI.getExpressApp())
    
    // Also mount the API UI routes directly for convenience
    this.app.use('/api/ui', this.webUI.getExpressApp())
    
    console.log('🌐 WebUI server initialized at /ui and /api/ui')
  }
  
  private getAgentsMap(): Map<string, any> {
    // Return a map with the current agent if available
    const agentsMap = new Map()
    if (this.agent) {
      agentsMap.set(this.agent.id, this.agent)
    }
    // If runtime is available, get all agents from it
    if (this.runtime && typeof this.runtime.agents !== 'undefined') {
      return this.runtime.agents
    }
    return agentsMap
  }
  
  private getRuntimeStats(): any {
    // Return actual runtime stats if available
    if (this.runtime && typeof this.runtime.getStats === 'function') {
      const stats = this.runtime.getStats()
      return {
        isRunning: stats.isRunning,
        agents: stats.agents,
        autonomousAgents: stats.autonomousAgents
      }
    }
    // Fallback to basic stats
    return {
      isRunning: true,
      agents: this.agent ? 1 : 0,
      autonomousAgents: 0
    }
  }
  
  public setRuntime(runtime: any): void {
    this.runtime = runtime
    console.log('🔗 API extension connected to runtime')
  }
  
  public getCommandSystem(): CommandSystem | undefined {
    return this.commandSystem
  }
  
  public getEnhancedWebSocket(): EnhancedWebSocketServer | undefined {
    return this.enhancedWS
  }

  /**
   * Initialize chat persistence system
   */
  private async initializeChatPersistence(): Promise<void> {
    try {
      // Determine database path
      const dbPath = process.env.CHAT_DB_PATH || './data/chat.db'
      
      // Ensure directory exists
      const { dirname } = await import('path')
      const { mkdirSync } = await import('fs')
      const dir = dirname(dbPath)
      mkdirSync(dir, { recursive: true })
      
      console.log(`💾 Initializing chat database at: ${dbPath}`)
      
      // Create migration manager
      this.migrationManager = createChatMigrationManager(dbPath)
      
      // Run migrations
      await this.migrationManager.migrate()
      
      // Validate database
      const validation = await this.migrationManager.validate()
      if (!validation.valid) {
        console.error('❌ Chat database validation failed:', validation.errors)
        throw new Error('Chat database validation failed')
      }
      
      // Create chat repository
      this.chatRepository = createSQLiteChatRepository({
        dbPath,
        enableAnalytics: true,
        enableFullTextSearch: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        archiveAfterDays: 90,
        maxMessageLength: 10000,
        maxParticipantsPerConversation: 10
      })
      
      console.log('✅ Chat persistence system initialized')
      
    } catch (error) {
      console.error('❌ Failed to initialize chat persistence:', error)
      throw error
    }
  }

  /**
   * Get or create conversation ID for a user-agent pair
   */
  private async getOrCreateConversationId(userId: string, agentId: string): Promise<string> {
    if (!this.chatRepository) {
      throw new Error('Chat repository not initialized')
    }
    
    // Check if we have an active conversation for this user
    let conversationId = this.activeConversations.get(userId)
    
    if (conversationId) {
      // Verify conversation still exists and is active
      const conversation = await this.chatRepository.getConversation(conversationId)
      if (conversation && conversation.status === ConversationStatus.ACTIVE) {
        return conversationId
      }
    }
    
    // Look for existing active conversations between this user and agent
    const existingConversations = await this.chatRepository.listConversations({
      userId,
      agentId,
      status: ConversationStatus.ACTIVE,
      limit: 1,
      orderBy: 'updated',
      orderDirection: 'desc'
    })
    
    if (existingConversations.length > 0) {
      conversationId = existingConversations[0].id
      this.activeConversations.set(userId, conversationId)
      return conversationId
    }
    
    // Create new conversation
    const conversation = await this.chatRepository.createConversation({
      agentId,
      userId,
      title: `Chat with ${agentId}`,
      status: ConversationStatus.ACTIVE,
      messageCount: 0,
      metadata: {
        createdVia: 'api',
        agentName: this.agent?.name || agentId
      }
    })
    
    this.activeConversations.set(userId, conversation.id)
    console.log(`🆕 Created new conversation: ${conversation.id}`)
    
    return conversation.id
  }

  /**
   * Clean up chat resources
   */
  private async cleanupChatResources(): Promise<void> {
    if (this.chatRepository) {
      try {
        // Clean up expired sessions (older than 1 hour)
        const expiredCount = await this.chatRepository.cleanupExpiredSessions(60 * 60 * 1000)
        if (expiredCount > 0) {
          console.log(`🧹 Cleaned up ${expiredCount} expired chat sessions`)
        }
        
        // Archive old conversations (older than 90 days)
        const archivedCount = await this.chatRepository.archiveOldConversations(90)
        if (archivedCount > 0) {
          console.log(`📦 Archived ${archivedCount} old conversations`)
        }
      } catch (error) {
        console.error('❌ Error during chat cleanup:', error)
      }
    }
  }

  /**
   * Override stop method to properly close database connections
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Cleanup chat resources
      this.cleanupChatResources().catch(error => {
        console.error('Error during chat cleanup:', error)
      })

      // Close database connections
      if (this.chatRepository) {
        try {
          this.chatRepository.close()
        } catch (error) {
          console.error('Error closing chat repository:', error)
        }
      }

      if (this.migrationManager) {
        try {
          this.migrationManager.close()
        } catch (error) {
          console.error('Error closing migration manager:', error)
        }
      }

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
}