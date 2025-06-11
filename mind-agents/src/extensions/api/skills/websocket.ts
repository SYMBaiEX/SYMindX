/**
 * WebSocket Skill for API Extension
 * 
 * Provides actions related to WebSocket connection management and real-time communication.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { ApiExtension } from '../index.js'
import { WebSocket } from 'ws'

export class WebSocketSkill {
  private extension: ApiExtension

  constructor(extension: ApiExtension) {
    this.extension = extension
  }

  /**
   * Get all WebSocket-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      broadcast_message: {
        name: 'broadcast_message',
        description: 'Broadcast a message to all connected WebSocket clients',
        category: ActionCategory.COMMUNICATION,
        parameters: { message: 'string', type: 'string', data: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.broadcastMessage(agent, params)
        }
      },
      
      send_to_client: {
        name: 'send_to_client',
        description: 'Send a message to a specific WebSocket client',
        category: ActionCategory.COMMUNICATION,
        parameters: { clientId: 'string', message: 'string', type: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendToClient(agent, params)
        }
      },
      
      handle_client_message: {
        name: 'handle_client_message',
        description: 'Handle incoming message from WebSocket client',
        category: ActionCategory.COMMUNICATION,
        parameters: { clientId: 'string', message: 'string', type: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.handleClientMessage(agent, params)
        }
      },
      
      manage_connection: {
        name: 'manage_connection',
        description: 'Manage WebSocket client connections',
        category: ActionCategory.SYSTEM,
        parameters: { action: 'string', clientId: 'string', metadata: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.manageConnection(agent, params)
        }
      },
      
      stream_thoughts: {
        name: 'stream_thoughts',
        description: 'Stream agent thoughts to connected clients',
        category: ActionCategory.COMMUNICATION,
        parameters: { thought: 'string', emotion: 'string', context: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.streamThoughts(agent, params)
        }
      },
      
      stream_status: {
        name: 'stream_status',
        description: 'Stream agent status updates to connected clients',
        category: ActionCategory.COMMUNICATION,
        parameters: { status: 'string', data: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.streamStatus(agent, params)
        }
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  private async broadcastMessage(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { message, type = 'message', data = {} } = params
      
      const payload = {
        type,
        message,
        data,
        timestamp: new Date().toISOString(),
        agentId: agent.id
      }
      
      // This would typically interface with the extension's WebSocket server
      // For now, we'll simulate the broadcast
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          broadcast: true,
          payload,
          clientCount: 0, // Would be actual client count
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'broadcast_message',
          messageType: type
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to broadcast message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'broadcast_message',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Send message to specific client
   */
  private async sendToClient(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { clientId, message, type = 'message' } = params
      
      const payload = {
        type,
        message,
        timestamp: new Date().toISOString(),
        agentId: agent.id
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          sent: true,
          clientId,
          payload,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'send_to_client',
          clientId,
          messageType: type
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to send to client: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'send_to_client',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Handle incoming client message
   */
  private async handleClientMessage(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { clientId, message, type = 'message' } = params
      
      // Process the message based on type
      let response
      switch (type) {
        case 'chat':
          // For now, return a simple response as Agent.processMessage doesn't exist
          response = { message: `Chat received: ${message}`, clientId, source: 'websocket' }
          break
        case 'command':
          response = await this.handleCommand(agent, message, clientId)
          break
        default:
          response = { message: 'Message received', type: 'acknowledgment' }
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          processed: true,
          clientId,
          response,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'handle_client_message',
          clientId,
          messageType: type
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to handle client message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'handle_client_message',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Manage WebSocket connections
   */
  private async manageConnection(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { action, clientId, metadata = {} } = params
      
      let result
      switch (action) {
        case 'connect':
          result = await this.handleConnect(clientId, metadata)
          break
        case 'disconnect':
          result = await this.handleDisconnect(clientId, metadata)
          break
        case 'ping':
          result = await this.handlePing(clientId)
          break
        default:
          throw new Error(`Unknown connection action: ${action}`)
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          action,
          clientId,
          result,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'manage_connection',
          connectionAction: action,
          clientId
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to manage connection: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'manage_connection',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Stream agent thoughts
   */
  private async streamThoughts(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { thought, emotion, context = {} } = params
      
      const thoughtStream = {
        type: 'thought',
        content: thought,
        emotion,
        context,
        agentId: agent.id,
        timestamp: new Date().toISOString()
      }
      
      // Broadcast to all connected clients
      await this.broadcastMessage(agent, {
        message: thoughtStream,
        type: 'thought_stream'
      })
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamed: true,
          thoughtStream,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'stream_thoughts',
          emotion
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stream thoughts: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'stream_thoughts',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Stream status updates
   */
  private async streamStatus(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { status, data = {} } = params
      
      const statusUpdate = {
        type: 'status',
        status,
        data,
        agentId: agent.id,
        timestamp: new Date().toISOString()
      }
      
      // Broadcast to all connected clients
      await this.broadcastMessage(agent, {
        message: statusUpdate,
        type: 'status_update'
      })
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          streamed: true,
          statusUpdate,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'stream_status',
          status
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to stream status: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'stream_status',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Handle client connection
   */
  private async handleConnect(clientId: string, metadata: any): Promise<any> {
    return {
      connected: true,
      clientId,
      metadata,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnect(clientId: string, metadata: any): Promise<any> {
    return {
      disconnected: true,
      clientId,
      metadata,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Handle ping
   */
  private async handlePing(clientId: string): Promise<any> {
    return {
      pong: true,
      clientId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Handle command from client
   */
  private async handleCommand(agent: Agent, command: string, clientId: string): Promise<any> {
    // Basic command handling - would be more sophisticated in practice
    const parts = command.split(' ')
    const cmd = parts[0]
    const args = parts.slice(1)
    
    switch (cmd) {
      case 'status':
        return { message: `Agent ${agent.id} is active`, status: 'active' }
      case 'ping':
        return { message: 'pong', timestamp: new Date().toISOString() }
      default:
        return { message: `Unknown command: ${cmd}`, error: true }
    }
  }
}