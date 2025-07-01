/**
 * Enhanced WebSocket Server for Real-time Communication
 * 
 * Provides comprehensive real-time features:
 * - Agent communication
 * - Live monitoring
 * - Command execution
 * - Status streaming
 * - Interactive chat
 */

import { WebSocket, WebSocketServer } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { parse } from 'url'
import { Agent, AgentEvent } from '../../types/agent.js'
import { CommandSystem, Command, CommandPriority, CommandType } from '../../core/command-system.js'
import { Logger } from '../../utils/logger.js'

export interface WebSocketConnection {
  id: string
  ws: WebSocket
  clientInfo: {
    userAgent?: string
    ip: string
    connectedAt: Date
    lastActivity: Date
  }
  subscriptions: Set<string>
  metadata: Record<string, any>
}

export interface WebSocketMessage {
  id?: string
  type: 'ping' | 'chat' | 'command' | 'subscribe' | 'unsubscribe' | 'status' | 'monitor' | 
        'typing_start' | 'typing_stop' | 'join_conversation' | 'leave_conversation' | 
        'agent_handoff' | 'multi_chat' | 'conversation_invite'
  data?: any
  timestamp?: string
  targetAgent?: string
  conversationId?: string
  userId?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface WebSocketResponse {
  id?: string
  type: 'pong' | 'chat_response' | 'command_result' | 'status_update' | 'event' | 'error' |
        'typing_indicator' | 'conversation_update' | 'agent_joined' | 'agent_left' | 
        'conversation_transferred' | 'multi_agent_response'
  data?: any
  timestamp: string
  source?: string
  conversationId?: string
  agentId?: string
}

export class EnhancedWebSocketServer {
  private logger = new Logger('websocket-server')
  private wss?: WebSocketServer
  private connections = new Map<string, WebSocketConnection>()
  private commandSystem: CommandSystem
  private heartbeatInterval?: NodeJS.Timeout
  private eventSubscriptions = new Map<string, Set<string>>() // eventType -> connectionIds
  private conversationConnections = new Map<string, Set<string>>() // conversationId -> connectionIds
  private typingIndicators = new Map<string, Map<string, NodeJS.Timeout>>() // conversationId -> userId -> timeout
  private agentConnections = new Map<string, Set<string>>() // agentId -> connectionIds

  constructor(commandSystem: CommandSystem) {
    this.commandSystem = commandSystem
    this.setupCommandSystemIntegration()
  }

  private setupCommandSystemIntegration(): void {
    // Listen to command system events
    this.commandSystem.on('command_queued', (command: Command) => {
      this.broadcastToSubscribed('command_updates', {
        type: 'event',
        data: {
          id: command.id,
          agentId: command.agentId,
          status: 'queued',
          instruction: command.instruction,
          type: command.type
        },
        timestamp: new Date().toISOString()
      })
    })

    this.commandSystem.on('command_started', (command: Command) => {
      this.broadcastToSubscribed('command_updates', {
        type: 'event',
        data: {
          id: command.id,
          agentId: command.agentId,
          status: 'processing',
          instruction: command.instruction,
          type: command.type
        },
        timestamp: new Date().toISOString()
      })
    })

    this.commandSystem.on('command_completed', (command: Command) => {
      this.broadcastToSubscribed('command_updates', {
        type: 'event',
        data: {
          id: command.id,
          agentId: command.agentId,
          status: command.status,
          instruction: command.instruction,
          type: command.type,
          result: command.result,
          executionTime: command.result?.executionTime
        },
        timestamp: new Date().toISOString()
      })
    })
  }

  initialize(server: any, path: string = '/ws'): void {
    this.wss = new WebSocketServer({ 
      server,
      path,
      perMessageDeflate: false
    })

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req)
    })

    // Start heartbeat
    this.startHeartbeat()

    this.logger.info(`WebSocket server initialized on path: ${path}`)
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const connectionId = this.generateConnectionId()
    const clientIP = req.socket.remoteAddress || 'unknown'
    
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      clientInfo: {
        userAgent: req.headers['user-agent'],
        ip: clientIP,
        connectedAt: new Date(),
        lastActivity: new Date()
      },
      subscriptions: new Set(),
      metadata: {}
    }

    this.connections.set(connectionId, connection)
    this.logger.info(`WebSocket client connected: ${connectionId} from ${clientIP}`)

    // Register with command system
    this.commandSystem.addWebSocketConnection(ws)

    // Send welcome message
    this.send(connectionId, {
      type: 'status_update',
      data: {
        type: 'welcome',
        connectionId,
        serverTime: new Date().toISOString(),
        capabilities: ['chat', 'commands', 'monitoring', 'agent_control']
      },
      timestamp: new Date().toISOString()
    })

    // Set up message handler
    ws.on('message', async (data) => {
      try {
        connection.clientInfo.lastActivity = new Date()
        const message: WebSocketMessage = JSON.parse(data.toString())
        await this.handleMessage(connectionId, message)
      } catch (error) {
        this.logger.warn(`Invalid message from ${connectionId}:`, error)
        this.sendError(connectionId, 'Invalid message format', 'INVALID_MESSAGE')
      }
    })

    // Handle disconnection
    ws.on('close', () => {
      this.handleDisconnection(connectionId)
    })

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for ${connectionId}:`, error)
      this.handleDisconnection(connectionId)
    })
  }

  private async handleMessage(connectionId: string, message: WebSocketMessage): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    try {
      switch (message.type) {
        case 'ping':
          await this.handlePing(connectionId, message)
          break
        case 'chat':
          await this.handleChat(connectionId, message)
          break
        case 'command':
          await this.handleCommand(connectionId, message)
          break
        case 'subscribe':
          await this.handleSubscription(connectionId, message, true)
          break
        case 'unsubscribe':
          await this.handleSubscription(connectionId, message, false)
          break
        case 'status':
          await this.handleStatusRequest(connectionId, message)
          break
        case 'monitor':
          await this.handleMonitorRequest(connectionId, message)
          break
        case 'typing_start':
          await this.handleTypingStart(connectionId, message)
          break
        case 'typing_stop':
          await this.handleTypingStop(connectionId, message)
          break
        case 'join_conversation':
          await this.handleJoinConversation(connectionId, message)
          break
        case 'leave_conversation':
          await this.handleLeaveConversation(connectionId, message)
          break
        case 'agent_handoff':
          await this.handleAgentHandoff(connectionId, message)
          break
        case 'multi_chat':
          await this.handleMultiChat(connectionId, message)
          break
        case 'conversation_invite':
          await this.handleConversationInvite(connectionId, message)
          break
        default:
          this.sendError(connectionId, `Unknown message type: ${message.type}`, 'UNKNOWN_TYPE')
      }
    } catch (error) {
      this.logger.error(`Error handling message from ${connectionId}:`, error)
      this.sendError(connectionId, 'Failed to process message', 'PROCESSING_ERROR')
    }
  }

  private async handlePing(connectionId: string, message: WebSocketMessage): Promise<void> {
    this.send(connectionId, {
      id: message.id,
      type: 'pong',
      data: { timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    })
  }

  private async handleChat(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { targetAgent, data } = message
    
    if (!targetAgent) {
      this.sendError(connectionId, 'Target agent required for chat', 'MISSING_AGENT')
      return
    }

    if (!data?.message) {
      this.sendError(connectionId, 'Message content required', 'MISSING_MESSAGE')
      return
    }

    try {
      const command = await this.commandSystem.sendCommand(
        targetAgent,
        data.message,
        { 
          priority: this.mapPriority(message.priority),
          async: false 
        }
      )

      this.send(connectionId, {
        id: message.id,
        type: 'chat_response',
        data: {
          response: command.result?.response || 'No response',
          agentId: targetAgent,
          commandId: command.id,
          success: command.result?.success || false
        },
        timestamp: new Date().toISOString(),
        source: targetAgent
      })
    } catch (error) {
      this.sendError(connectionId, `Chat failed: ${error instanceof Error ? error.message : String(error)}`, 'CHAT_ERROR')
    }
  }

  private async handleCommand(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { targetAgent, data } = message
    
    if (!targetAgent) {
      this.sendError(connectionId, 'Target agent required for command', 'MISSING_AGENT')
      return
    }

    if (!data?.command) {
      this.sendError(connectionId, 'Command required', 'MISSING_COMMAND')
      return
    }

    try {
      const command = await this.commandSystem.sendCommand(
        targetAgent,
        data.command,
        {
          priority: this.mapPriority(message.priority),
          async: data.async !== false
        }
      )

      this.send(connectionId, {
        id: message.id,
        type: 'command_result',
        data: {
          commandId: command.id,
          agentId: targetAgent,
          status: command.status,
          result: command.result,
          async: data.async !== false
        },
        timestamp: new Date().toISOString(),
        source: targetAgent
      })
    } catch (error) {
      this.sendError(connectionId, `Command failed: ${error instanceof Error ? error.message : String(error)}`, 'COMMAND_ERROR')
    }
  }

  private async handleSubscription(connectionId: string, message: WebSocketMessage, subscribe: boolean): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    const { data } = message
    if (!data?.topic) {
      this.sendError(connectionId, 'Topic required for subscription', 'MISSING_TOPIC')
      return
    }

    const topic = data.topic
    
    if (subscribe) {
      connection.subscriptions.add(topic)
      
      // Add to topic subscription map
      if (!this.eventSubscriptions.has(topic)) {
        this.eventSubscriptions.set(topic, new Set())
      }
      this.eventSubscriptions.get(topic)!.add(connectionId)
      
      this.logger.info(`Client ${connectionId} subscribed to ${topic}`)
    } else {
      connection.subscriptions.delete(topic)
      this.eventSubscriptions.get(topic)?.delete(connectionId)
      this.logger.info(`Client ${connectionId} unsubscribed from ${topic}`)
    }

    this.send(connectionId, {
      id: message.id,
      type: 'status_update',
      data: {
        type: subscribe ? 'subscribed' : 'unsubscribed',
        topic,
        subscriptions: Array.from(connection.subscriptions)
      },
      timestamp: new Date().toISOString()
    })
  }

  private async handleStatusRequest(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { data } = message
    const agentId = data?.agentId

    try {
      let statusData: any = {}

      if (agentId) {
        // Get specific agent status
        statusData = await this.getAgentStatus(agentId)
      } else {
        // Get system status
        statusData = await this.getSystemStatus()
      }

      this.send(connectionId, {
        id: message.id,
        type: 'status_update',
        data: statusData,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      this.sendError(connectionId, `Status request failed: ${error instanceof Error ? error.message : String(error)}`, 'STATUS_ERROR')
    }
  }

  private async handleMonitorRequest(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { data } = message
    const action = data?.action
    
    try {
      switch (action) {
        case 'start':
          await this.startMonitoring(connectionId, data)
          break
        case 'stop':
          await this.stopMonitoring(connectionId, data)
          break
        case 'get_metrics':
          await this.sendMetrics(connectionId, data)
          break
        default:
          this.sendError(connectionId, `Unknown monitor action: ${action}`, 'UNKNOWN_ACTION')
      }
    } catch (error) {
      this.sendError(connectionId, `Monitor request failed: ${error instanceof Error ? error.message : String(error)}`, 'MONITOR_ERROR')
    }
  }

  private async startMonitoring(connectionId: string, data: any): Promise<void> {
    const topics = data.topics || ['agent_updates', 'command_updates', 'system_events']
    
    for (const topic of topics) {
      await this.handleSubscription(connectionId, {
        type: 'subscribe',
        data: { topic }
      }, true)
    }

    this.send(connectionId, {
      type: 'status_update',
      data: {
        type: 'monitoring_started',
        topics,
        message: 'Real-time monitoring activated'
      },
      timestamp: new Date().toISOString()
    })
  }

  private async stopMonitoring(connectionId: string, data: any): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Unsubscribe from all monitoring topics
    const monitoringTopics = ['agent_updates', 'command_updates', 'system_events']
    for (const topic of monitoringTopics) {
      connection.subscriptions.delete(topic)
      this.eventSubscriptions.get(topic)?.delete(connectionId)
    }

    this.send(connectionId, {
      type: 'status_update',
      data: {
        type: 'monitoring_stopped',
        message: 'Real-time monitoring deactivated'
      },
      timestamp: new Date().toISOString()
    })
  }

  private async sendMetrics(connectionId: string, data: any): Promise<void> {
    const commandStats = this.commandSystem.getStats()
    const systemMetrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      connections: this.connections.size,
      commands: commandStats,
      timestamp: new Date().toISOString()
    }

    this.send(connectionId, {
      type: 'status_update',
      data: {
        type: 'metrics',
        metrics: systemMetrics
      },
      timestamp: new Date().toISOString()
    })
  }

  // ========================================
  // ENHANCED MULTI-AGENT CHAT HANDLERS
  // ========================================

  private async handleTypingStart(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, userId } = message
    
    if (!conversationId || !userId) {
      this.sendError(connectionId, 'Conversation ID and User ID required for typing indicator', 'MISSING_PARAMS')
      return
    }

    // Clear any existing typing timeout for this user
    if (!this.typingIndicators.has(conversationId)) {
      this.typingIndicators.set(conversationId, new Map())
    }
    
    const conversationTyping = this.typingIndicators.get(conversationId)!
    const existingTimeout = conversationTyping.get(userId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set auto-stop timeout (typing stops after 10 seconds of inactivity)
    const timeout = setTimeout(() => {
      this.handleTypingStop(connectionId, { ...message, type: 'typing_stop' })
    }, 10000)
    
    conversationTyping.set(userId, timeout)

    // Broadcast typing indicator to other participants in the conversation
    this.broadcastToConversation(conversationId, {
      type: 'typing_indicator',
      data: {
        userId,
        typing: true,
        conversationId
      },
      timestamp: new Date().toISOString(),
      conversationId
    }, connectionId) // Exclude the sender
  }

  private async handleTypingStop(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, userId } = message
    
    if (!conversationId || !userId) {
      return // Silently ignore missing params for stop events
    }

    // Clear typing timeout
    const conversationTyping = this.typingIndicators.get(conversationId)
    if (conversationTyping) {
      const timeout = conversationTyping.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        conversationTyping.delete(userId)
      }
    }

    // Broadcast typing stopped to other participants
    this.broadcastToConversation(conversationId, {
      type: 'typing_indicator',
      data: {
        userId,
        typing: false,
        conversationId
      },
      timestamp: new Date().toISOString(),
      conversationId
    }, connectionId)
  }

  private async handleJoinConversation(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, userId } = message
    
    if (!conversationId) {
      this.sendError(connectionId, 'Conversation ID required', 'MISSING_CONVERSATION_ID')
      return
    }

    // Add connection to conversation
    if (!this.conversationConnections.has(conversationId)) {
      this.conversationConnections.set(conversationId, new Set())
    }
    this.conversationConnections.get(conversationId)!.add(connectionId)

    // Update connection metadata
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.metadata.conversationId = conversationId
      connection.metadata.userId = userId
    }

    // Notify other participants
    this.broadcastToConversation(conversationId, {
      type: 'conversation_update',
      data: {
        type: 'participant_joined',
        userId,
        conversationId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      conversationId
    }, connectionId)

    // Confirm join to the user
    this.send(connectionId, {
      type: 'conversation_update',
      data: {
        type: 'joined',
        conversationId,
        message: 'Successfully joined conversation'
      },
      timestamp: new Date().toISOString(),
      conversationId
    })
  }

  private async handleLeaveConversation(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, userId } = message
    
    if (!conversationId) {
      this.sendError(connectionId, 'Conversation ID required', 'MISSING_CONVERSATION_ID')
      return
    }

    // Remove connection from conversation
    const conversationConnections = this.conversationConnections.get(conversationId)
    if (conversationConnections) {
      conversationConnections.delete(connectionId)
      if (conversationConnections.size === 0) {
        this.conversationConnections.delete(conversationId)
      }
    }

    // Clear typing indicators
    const conversationTyping = this.typingIndicators.get(conversationId)
    if (conversationTyping && userId) {
      const timeout = conversationTyping.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        conversationTyping.delete(userId)
      }
    }

    // Update connection metadata
    const connection = this.connections.get(connectionId)
    if (connection) {
      delete connection.metadata.conversationId
      delete connection.metadata.userId
    }

    // Notify remaining participants
    this.broadcastToConversation(conversationId, {
      type: 'conversation_update',
      data: {
        type: 'participant_left',
        userId,
        conversationId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      conversationId
    })
  }

  private async handleAgentHandoff(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, data } = message
    const { fromAgent, toAgent, reason } = data || {}
    
    if (!conversationId || !fromAgent || !toAgent) {
      this.sendError(connectionId, 'Conversation ID, fromAgent, and toAgent required', 'MISSING_HANDOFF_PARAMS')
      return
    }

    // Broadcast handoff notification to all conversation participants
    this.broadcastToConversation(conversationId, {
      type: 'conversation_transferred',
      data: {
        conversationId,
        fromAgent,
        toAgent,
        reason: reason || 'Agent handoff requested',
        timestamp: new Date().toISOString(),
        handoffInitiatedBy: 'user'
      },
      timestamp: new Date().toISOString(),
      conversationId,
      agentId: toAgent
    })

    // Update agent connections tracking
    this.updateAgentConnections(fromAgent, toAgent, conversationId)
  }

  private async handleMultiChat(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { data } = message
    const { targetAgents, chatMessage, userId = 'default_user' } = data || {}
    
    if (!targetAgents || !Array.isArray(targetAgents) || !chatMessage) {
      this.sendError(connectionId, 'Target agents array and chat message required', 'MISSING_MULTI_CHAT_PARAMS')
      return
    }

    // Process message for each target agent
    const results = []
    for (const agentId of targetAgents) {
      try {
        // Here you would integrate with your chat system to send the message
        // For now, we'll simulate the response
        const response = {
          agentId,
          response: `Agent ${agentId} received: ${chatMessage}`,
          timestamp: new Date().toISOString(),
          success: true
        }
        results.push(response)

        // Broadcast to agent-specific connections
        this.broadcastToAgent(agentId, {
          type: 'multi_agent_response',
          data: {
            originalMessage: chatMessage,
            response: response.response,
            fromUser: userId,
            multiChatSession: true
          },
          timestamp: new Date().toISOString(),
          agentId
        })
      } catch (error) {
        results.push({
          agentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Send aggregated results back to sender
    this.send(connectionId, {
      type: 'multi_agent_response',
      data: {
        originalMessage: chatMessage,
        targetAgents,
        results,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    })
  }

  private async handleConversationInvite(connectionId: string, message: WebSocketMessage): Promise<void> {
    const { conversationId, data } = message
    const { agentId, role = 'member' } = data || {}
    
    if (!conversationId || !agentId) {
      this.sendError(connectionId, 'Conversation ID and Agent ID required', 'MISSING_INVITE_PARAMS')
      return
    }

    // Broadcast invitation to conversation participants
    this.broadcastToConversation(conversationId, {
      type: 'agent_joined',
      data: {
        conversationId,
        agentId,
        role,
        invitedAt: new Date().toISOString(),
        message: `Agent ${agentId} has been invited to the conversation`
      },
      timestamp: new Date().toISOString(),
      conversationId,
      agentId
    })

    // Track agent connection
    if (!this.agentConnections.has(agentId)) {
      this.agentConnections.set(agentId, new Set())
    }
    this.agentConnections.get(agentId)!.add(connectionId)
  }

  // Helper methods for multi-agent chat

  private broadcastToConversation(conversationId: string, response: WebSocketResponse, excludeConnectionId?: string): void {
    const conversationConnections = this.conversationConnections.get(conversationId)
    if (!conversationConnections) return

    for (const connectionId of conversationConnections) {
      if (excludeConnectionId && connectionId === excludeConnectionId) continue
      this.send(connectionId, response)
    }
  }

  private broadcastToAgent(agentId: string, response: WebSocketResponse): void {
    const agentConnections = this.agentConnections.get(agentId)
    if (!agentConnections) return

    for (const connectionId of agentConnections) {
      this.send(connectionId, response)
    }
  }

  private updateAgentConnections(fromAgent: string, toAgent: string, conversationId: string): void {
    // Remove connections from old agent
    const fromConnections = this.agentConnections.get(fromAgent)
    if (fromConnections) {
      for (const connectionId of fromConnections) {
        const connection = this.connections.get(connectionId)
        if (connection?.metadata.conversationId === conversationId) {
          fromConnections.delete(connectionId)
        }
      }
    }

    // Add connections to new agent
    if (!this.agentConnections.has(toAgent)) {
      this.agentConnections.set(toAgent, new Set())
    }
    
    const conversationConnections = this.conversationConnections.get(conversationId)
    if (conversationConnections) {
      for (const connectionId of conversationConnections) {
        this.agentConnections.get(toAgent)!.add(connectionId)
      }
    }
  }

  private async getAgentStatus(agentId: string): Promise<any> {
    // This would integrate with the runtime to get actual agent status
    return {
      type: 'agent_status',
      agentId,
      status: 'active',
      lastUpdate: new Date().toISOString(),
      message: 'Agent status retrieved successfully'
    }
  }

  private async getSystemStatus(): Promise<any> {
    const commandStats = this.commandSystem.getStats()
    
    return {
      type: 'system_status',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: this.connections.size,
      commands: commandStats,
      timestamp: new Date().toISOString()
    }
  }

  private send(connectionId: string, response: WebSocketResponse): void {
    const connection = this.connections.get(connectionId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      connection.ws.send(JSON.stringify(response))
    } catch (error) {
      this.logger.warn(`Failed to send message to ${connectionId}:`, error)
      this.handleDisconnection(connectionId)
    }
  }

  private sendError(connectionId: string, message: string, code: string, id?: string): void {
    this.send(connectionId, {
      id,
      type: 'error',
      data: {
        error: message,
        code,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    })
  }

  private broadcastToSubscribed(topic: string, response: WebSocketResponse): void {
    const subscribedConnections = this.eventSubscriptions.get(topic)
    if (!subscribedConnections) return

    for (const connectionId of subscribedConnections) {
      this.send(connectionId, response)
    }
  }

  public broadcastToAll(response: WebSocketResponse): void {
    for (const connectionId of this.connections.keys()) {
      this.send(connectionId, response)
    }
  }

  public broadcastAgentUpdate(agentId: string, data: any): void {
    this.broadcastToSubscribed('agent_updates', {
      type: 'event',
      data: {
        type: 'agent_update',
        agentId,
        ...data
      },
      timestamp: new Date().toISOString(),
      source: agentId
    })
  }

  public broadcastSystemEvent(event: AgentEvent): void {
    this.broadcastToSubscribed('system_events', {
      type: 'event',
      data: {
        type: 'system_event',
        event
      },
      timestamp: new Date().toISOString(),
      source: event.source
    })
  }

  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (!connection) return

    // Remove from all subscriptions
    for (const topic of connection.subscriptions) {
      this.eventSubscriptions.get(topic)?.delete(connectionId)
    }

    // Clean up conversation connections
    const conversationId = connection.metadata.conversationId
    if (conversationId) {
      const conversationConnections = this.conversationConnections.get(conversationId)
      if (conversationConnections) {
        conversationConnections.delete(connectionId)
        if (conversationConnections.size === 0) {
          this.conversationConnections.delete(conversationId)
        }
      }

      // Clean up typing indicators
      const userId = connection.metadata.userId
      if (userId) {
        const conversationTyping = this.typingIndicators.get(conversationId)
        if (conversationTyping) {
          const timeout = conversationTyping.get(userId)
          if (timeout) {
            clearTimeout(timeout)
            conversationTyping.delete(userId)
          }
          if (conversationTyping.size === 0) {
            this.typingIndicators.delete(conversationId)
          }
        }

        // Notify other participants about the disconnection
        this.broadcastToConversation(conversationId, {
          type: 'conversation_update',
          data: {
            type: 'participant_disconnected',
            userId,
            conversationId,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          conversationId
        })
      }
    }

    // Clean up agent connections
    for (const [agentId, connections] of this.agentConnections) {
      connections.delete(connectionId)
      if (connections.size === 0) {
        this.agentConnections.delete(agentId)
      }
    }

    this.connections.delete(connectionId)
    this.logger.info(`WebSocket client disconnected: ${connectionId}`)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 60000 // 1 minute timeout

      for (const [connectionId, connection] of this.connections) {
        const lastActivity = connection.clientInfo.lastActivity.getTime()
        
        if (now - lastActivity > timeout) {
          this.logger.warn(`Connection ${connectionId} timed out`)
          connection.ws.terminate()
          this.handleDisconnection(connectionId)
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          // Send ping
          connection.ws.ping()
        }
      }
    }, 30000) // Check every 30 seconds
  }

  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private mapPriority(priority?: string): CommandPriority {
    const priorityMap = {
      'low': CommandPriority.LOW,
      'normal': CommandPriority.NORMAL,
      'high': CommandPriority.HIGH,
      'urgent': CommandPriority.URGENT
    }
    return priorityMap[priority as keyof typeof priorityMap] || CommandPriority.NORMAL
  }

  public getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values())
  }

  public getConnectionStats(): {
    total: number
    active: number
    subscriptions: Record<string, number>
  } {
    const subscriptions: Record<string, number> = {}
    
    for (const [topic, connections] of this.eventSubscriptions) {
      subscriptions[topic] = connections.size
    }

    return {
      total: this.connections.size,
      active: this.connections.size, // All connections are considered active
      subscriptions
    }
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      connection.ws.close()
    }

    this.connections.clear()
    this.eventSubscriptions.clear()

    if (this.wss) {
      this.wss.close()
    }

    this.logger.info('WebSocket server shut down')
  }
}