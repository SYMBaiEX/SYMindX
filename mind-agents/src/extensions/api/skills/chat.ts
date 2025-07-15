/**
 * Chat Skill for API Extension
 *
 * Handles chat-related API endpoints and WebSocket messaging
 */

import { WebSocket } from 'ws';

import {
  ExtensionAction,
  Agent,
  ActionResult,
  ActionResultType,
  ActionCategory,
} from '../../../types/agent';
import { GenericData, SkillParameters } from '../../../types/common';
import { runtimeLogger } from '../../../utils/logger';
import { ApiExtension } from '../index';
import { ChatRequest, ChatResponse, WebSocketMessage } from '../types';

export class ChatSkill {
  private extension: ApiExtension;

  constructor(extension: ApiExtension) {
    this.extension = extension;
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
          conversationId: 'string?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.sendMessage(agent, params);
        },
      },
      get_conversation_history: {
        name: 'get_conversation_history',
        description: 'Get conversation history for an agent',
        category: ActionCategory.MEMORY,
        parameters: {
          agentId: 'string',
          conversationId: 'string?',
          limit: 'number?',
        },
        execute: async (
          agent: Agent,
          params: SkillParameters
        ): Promise<ActionResult> => {
          return this.getConversationHistory(agent, params);
        },
      },
    };
  }

  /**
   * Send a message to an agent
   */
  async sendMessage(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { agentId, message, conversationId } = params;

      // Validate agent ID matches or use current agent if not specified
      const targetAgentId = agentId || agent.id;

      runtimeLogger.memory(
        `💬 Processing chat message for agent: ${targetAgentId} (requested by: ${agent.name})`
      );

      // Use the extension's chat handling logic
      const chatRequest: ChatRequest = {
        agentId: targetAgentId,
        message,
        conversationId,
      };
      const response: ChatResponse =
        await this.extension.handleChatRequest(chatRequest);

      // Convert ChatResponse to GenericData format
      const result: GenericData = {
        response: response.response,
        timestamp: response.timestamp,
      };

      if (response.sessionId) result.sessionId = response.sessionId;
      if (response.metadata) {
        result.metadata = JSON.stringify(response.metadata);
      }

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result,
      };
    } catch (error) {
      runtimeLogger.error(`❌ Failed to send message:`, error);
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    agent: Agent,
    params: SkillParameters
  ): Promise<ActionResult> {
    try {
      const { agentId, conversationId, limit = 50 } = params;

      // Validate agent ID matches or use current agent if not specified
      const targetAgentId = agentId || agent.id;

      runtimeLogger.memory(
        `📜 Retrieving conversation history for agent: ${targetAgentId} (requested by: ${agent.name})`
      );

      // Use the extension's memory system to get history
      const history = await this.extension.getConversationHistory(
        targetAgentId,
        conversationId,
        limit
      );

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: history,
      };
    } catch (error) {
      runtimeLogger.error(`❌ Failed to get conversation history:`, error);
      return {
        success: false,
        type: ActionResultType.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle WebSocket chat messages
   */
  async handleWebSocketMessage(
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'chat_message':
          await this.handleChatMessage(ws, message);
          break;
        case 'get_history':
          await this.handleGetHistory(ws, message);
          break;
        default:
          runtimeLogger.warn(
            `⚠️ Unknown WebSocket message type: ${message.type}`
          );
      }
    } catch (error) {
      runtimeLogger.error(`❌ Error handling WebSocket message:`, error);
      ws.send(
        JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  }

  private async handleChatMessage(
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    const { agentId, data } = message;

    const response = await this.sendMessage({ id: agentId } as Agent, {
      agentId,
      message: data.message,
      conversationId: data.conversationId,
    });

    ws.send(
      JSON.stringify({
        type: 'chat_response',
        data: response,
      })
    );
  }

  private async handleGetHistory(
    ws: WebSocket,
    message: WebSocketMessage
  ): Promise<void> {
    const { agentId, data } = message;

    const response = await this.getConversationHistory(
      { id: agentId } as Agent,
      {
        agentId,
        conversationId: data.conversationId,
        limit: data.limit,
      }
    );

    ws.send(
      JSON.stringify({
        type: 'history_response',
        data: response,
      })
    );
  }
}
