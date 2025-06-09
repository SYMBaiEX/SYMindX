/**
 * Messaging Skill for Slack Extension
 * 
 * Provides actions related to sending and managing messages in Slack.
 */

import { ExtensionAction, Agent, ActionResult, ActionCategory, ActionResultType } from '../../../types/agent.js'
import { SlackExtension } from '../index.js'

export class MessagingSkill {
  private extension: SlackExtension

  constructor(extension: SlackExtension) {
    this.extension = extension
  }

  /**
   * Get all messaging-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      send_message: {
        name: 'send_message',
        description: 'Send a message to a Slack channel or user',
        category: ActionCategory.COMMUNICATION,
        parameters: { channel: 'string', message: 'string', thread_ts: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.sendMessage(agent, params.channel, params.message, params.thread_ts)
        }
      },
      
      share_thought: {
        name: 'share_thought',
        description: 'Share a thought or observation',
        category: ActionCategory.COMMUNICATION,
        parameters: { thought: 'string', channel: 'string', emotion: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.shareThought(agent, params.thought, params.channel, params.emotion)
        }
      },
      
      ask_question: {
        name: 'ask_question',
        description: 'Ask a question to users',
        category: ActionCategory.COMMUNICATION,
        parameters: { question: 'string', channel: 'string', options: 'array' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.askQuestion(agent, params.question, params.channel, params.options)
        }
      },
      
      react_to_message: {
        name: 'react_to_message',
        description: 'React to a message with an emoji',
        category: ActionCategory.SOCIAL,
        parameters: { channel: 'string', timestamp: 'string', emoji: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.reactToMessage(params.channel, params.timestamp, params.emoji)
        }
      },
      
      schedule_message: {
        name: 'schedule_message',
        description: 'Schedule a message to be sent later',
        category: ActionCategory.COMMUNICATION,
        parameters: { channel: 'string', message: 'string', post_at: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.scheduleMessage(params.channel, params.message, params.post_at)
        }
      },
      
      update_message: {
        name: 'update_message',
        description: 'Update a previously sent message',
        category: ActionCategory.COMMUNICATION,
        parameters: { channel: 'string', timestamp: 'string', message: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.updateMessage(params.channel, params.timestamp, params.message)
        }
      },
      
      delete_message: {
        name: 'delete_message',
        description: 'Delete a previously sent message',
        category: ActionCategory.SYSTEM,
        parameters: { channel: 'string', timestamp: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.deleteMessage(params.channel, params.timestamp)
        }
      }
    }
  }

  /**
   * Send a message to a Slack channel or user
   */
  async sendMessage(agent: Agent, channel: string, message: string, thread_ts?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.sendMessage(agent, channel, message, thread_ts)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Share a thought or observation
   */
  async shareThought(agent: Agent, thought: string, channel: string, emotion?: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.shareThought(agent, thought, channel, emotion)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to share thought: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Ask a question to users
   */
  async askQuestion(agent: Agent, question: string, channel: string, options?: string[]): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.askQuestion(agent, question, channel, options)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to ask question: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * React to a message with an emoji
   */
  async reactToMessage(channel: string, timestamp: string, emoji: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.reactToMessage(channel, timestamp, emoji)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to react to message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Schedule a message to be sent later
   */
  async scheduleMessage(channel: string, message: string, post_at: number): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.scheduleMessage(channel, message, post_at)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to schedule message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Update a previously sent message
   */
  async updateMessage(channel: string, timestamp: string, message: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.updateMessage(channel, timestamp, message)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }

  /**
   * Delete a previously sent message
   */
  async deleteMessage(channel: string, timestamp: string): Promise<ActionResult> {
    try {
      // Delegate to the extension's implementation
      return await this.extension.deleteMessage(channel, timestamp)
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { timestamp: new Date().toISOString() }
      }
    }
  }
}