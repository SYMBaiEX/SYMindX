/**
 * Chat Skill for API Extension
 * 
 * Handles chat-related API endpoints and WebSocket messaging
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { runtimeLogger } from '../../../utils/logger.js'
import { 
  ChatRequest, 
  ChatResponse, 
  WebSocketMessage 
} from '../types.js'

export class ChatSkill {
  private extension: any

  constructor(extension: any) {
    this.extension = extension
  }

  /**
   * Get all chat-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      send_message: {
        name: 'send_message',
        description: 'Send a message to an agent via chat',
        category: ActionCategory.COMMUNICATION,
        parameters: { 
          agentId: 'string', 
          message: 'string', 
          conversationId: 'string?' 
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendMessage(agent, params)
        }
      },
      get_conversation_history: {
        name: 'get_conversation_history',
        description: 'Get conversation history for an agent',
        category: ActionCategory.MEMORY,
        parameters: { 
          agentId: 'string', 
          conversationId: 'string?',
          limit: 'number?'
        },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getConversationHistory(agent, params)
        }
      }
    }
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { agentId, message, conversationId } = params
      
      runtimeLogger.memory(`💬 Processing chat message for agent: ${agentId}`)
      
      // Use the extension's chat handling logic
      const response = await this.extension.handleChatRequest({
        agentId,
        message,
        conversationId
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        data: response
      }
    } catch (error) {
      runtimeLogger.error(`❌ Failed to send message:`, error)
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { agentId, conversationId, limit = 50 } = params
      
      // Use the extension's memory system to get history
      const history = await this.extension.getConversationHistory(agentId, conversationId, limit)

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        data: history
      }
    } catch (error) {
      runtimeLogger.error(`❌ Failed to get conversation history:`, error)
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle WebSocket chat messages
   */
  async handleWebSocketMessage(ws: any, message: WebSocketMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'chat_message':
          await this.handleChatMessage(ws, message)
          break
        case 'get_history':
          await this.handleGetHistory(ws, message)
          break
        default:
          runtimeLogger.warn(`⚠️ Unknown WebSocket message type: ${message.type}`)
      }
    } catch (error) {
      runtimeLogger.error(`❌ Error handling WebSocket message:`, error)
      ws.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  private async handleChatMessage(ws: any, message: WebSocketMessage): Promise<void> {
    const { agentId, data } = message
    
    const response = await this.sendMessage({ id: agentId } as Agent, {
      agentId,
      message: data.message,
      conversationId: data.conversationId
    })

    ws.send(JSON.stringify({
      type: 'chat_response',
      data: response
    }))
  }

  private async handleGetHistory(ws: any, message: WebSocketMessage): Promise<void> {
    const { agentId, data } = message
    
    const response = await this.getConversationHistory({ id: agentId } as Agent, {
      agentId,
      conversationId: data.conversationId,
      limit: data.limit
    })

    ws.send(JSON.stringify({
      type: 'history_response',
      data: response
    }))
  }
}