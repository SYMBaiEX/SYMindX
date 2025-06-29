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
  type: 'ping' | 'chat' | 'command' | 'subscribe' | 'unsubscribe' | 'status' | 'monitor'
  data?: any
  timestamp?: string
  targetAgent?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export interface WebSocketResponse {
  id?: string
  type: 'pong' | 'chat_response' | 'command_result' | 'status_update' | 'event' | 'error'
  data?: any
  timestamp: string
  source?: string
}

export class EnhancedWebSocketServer {
  private logger = new Logger('websocket-server')
  private wss?: WebSocketServer
  private connections = new Map<string, WebSocketConnection>()
  private commandSystem: CommandSystem
  private heartbeatInterval?: NodeJS.Timeout
  private eventSubscriptions = new Map<string, Set<string>>() // eventType -> connectionIds

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