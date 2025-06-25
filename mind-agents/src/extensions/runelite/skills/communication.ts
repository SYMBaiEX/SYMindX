/**
 * Communication Skill for RuneLite Extension
 * 
 * Provides actions related to chat and messaging in the game world.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent.js'
import { RuneLiteExtension } from '../index.js'

export class CommunicationSkill {
  private extension: RuneLiteExtension

  constructor(extension: RuneLiteExtension) {
    this.extension = extension
  }

  /**
   * Get all communication-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      send_message: {
        name: 'send_message',
        description: 'Send a message in chat',
        category: ActionCategory.COMMUNICATION,
        parameters: { message: 'string', channel: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendMessage(params.message, params.channel)
        }
      },
      
      private_message: {
        name: 'private_message',
        description: 'Send a private message to a player',
        category: ActionCategory.COMMUNICATION,
        parameters: { message: 'string', playerName: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.privateMessage(params.message, params.playerName)
        }
      },
      
      clan_message: {
        name: 'clan_message',
        description: 'Send a message to clan chat',
        category: ActionCategory.COMMUNICATION,
        parameters: { message: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.clanMessage(params.message)
        }
      }
    }
  }

  /**
   * Send a message in public chat
   */
  async sendMessage(message: string, channel: string = 'public'): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send chat message command to RuneLite
      await this.extension.sendCommand({
        action: 'chat',
        parameters: { message, channel }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { message, channel },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send message: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Send a private message to a specific player
   */
  async privateMessage(message: string, playerName: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send private message command to RuneLite
      await this.extension.sendCommand({
        action: 'chat',
        target: playerName,
        parameters: { message, type: 'private' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { message, playerName },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send private message: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Send a message to clan chat
   */
  async clanMessage(message: string): Promise<ActionResult> {
    try {
      if (!this.extension.isConnected()) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'Not connected to RuneLite',
          metadata: { timestamp: new Date().toISOString() }
        }
      }

      // Send clan message command to RuneLite
      await this.extension.sendCommand({
        action: 'chat',
        parameters: { message, type: 'clan' }
      })

      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { message },
        metadata: { timestamp: new Date().toISOString() }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send clan message: ${error}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}