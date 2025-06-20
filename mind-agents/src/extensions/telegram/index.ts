/**
 * Telegram Extension
 * 
 * Provides integration with the Telegram Bot API using the Telegraf library.
 */

import { Telegraf, Context } from 'telegraf'
import { Extension, ExtensionAction, ExtensionEventHandler, Agent, ActionResult, ActionResultType, ExtensionType, ExtensionStatus, ActionCategory } from '../../types/agent.js'
import { ExtensionConfig, SkillParameters } from '../../types/common.js'

interface TelegramConfig extends ExtensionConfig {
  settings: {
    botToken: string
    webhookUrl?: string
  }
}

export class TelegramExtension implements Extension {
  id = 'telegram'
  name = 'Telegram Integration'
  version = '1.0.0'
  enabled = true
  type = ExtensionType.COMMUNICATION
  status = ExtensionStatus.ENABLED
  config: TelegramConfig
  actions: Record<string, ExtensionAction> = {}
  events: Record<string, ExtensionEventHandler> = {}
  private bot: Telegraf
  private approvals: Map<string, any> = new Map()
  private userPreferences: Map<string, any> = new Map()
  private polls: Map<string, any> = new Map()
  private tasks: Map<string, any> = new Map()

  constructor(config: TelegramConfig) {
    this.config = config
    this.bot = new Telegraf(config.settings.botToken)
    this.setupEventHandlers()
    this.initializeActions()
    this.initializeEvents()
  }

  private initializeActions(): void {
    this.actions = {
      sendMessage: {
        name: 'sendMessage',
        description: 'Send a message to a chat',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          chatId: 'string',
          message: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.sendMessage(agent, params.chatId as string, params.message as string)
      },
      sendDirectMessage: {
        name: 'sendDirectMessage',
        description: 'Send a direct message to a user',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          userId: 'number',
          message: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.sendDirectMessage(agent, params.userId as number, params.message as string)
      },
      askQuestion: {
        name: 'askQuestion',
        description: 'Ask a yes/no question',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          chatId: 'string',
          question: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.askQuestion(agent, params.chatId as string, params.question as string)
      },
      createPoll: {
        name: 'createPoll',
        description: 'Create a poll',
        category: ActionCategory.SOCIAL,
        parameters: {
          chatId: 'string',
          question: 'string',
          options: 'array'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.createPoll(agent, params.chatId as string, params.question as string, params.options as string[])
      },
      requestApproval: {
        name: 'requestApproval',
        description: 'Request approval from users',
        category: ActionCategory.SOCIAL,
        parameters: {
          chatId: 'string',
          request: 'string',
          approvers: 'array'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.requestApproval(agent, params.chatId as string, params.request as string, params.approvers as string[])
      },
      trackTask: {
        name: 'trackTask',
        description: 'Track a task',
        category: ActionCategory.SYSTEM,
        parameters: {
          chatId: 'string',
          task: 'string',
          assignee: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.trackTask(agent, params.chatId as string, params.task as string, params.assignee as string)
      },
      shareFile: {
        name: 'shareFile',
        description: 'Share a file',
        category: ActionCategory.COMMUNICATION,
        parameters: {
          chatId: 'string',
          filePath: 'string',
          caption: 'string'
        },
        execute: async (agent: Agent, params: SkillParameters) => this.shareFile(agent, params.chatId as string, params.filePath as string, params.caption as string)
      }
    }
  }

  private initializeEvents(): void {
    this.events = {
      message: {
        event: 'message',
        description: 'Handle Telegram message events',
        handler: async (agent: Agent, event: any) => {
          console.log('Telegram message event:', event)
        }
      },
      poll_answer: {
        event: 'poll_answer',
        description: 'Handle Telegram poll answer events',
        handler: async (agent: Agent, event: any) => {
          console.log('Telegram poll answer event:', event)
        }
      },
      callback_query: {
        event: 'callback_query',
        description: 'Handle Telegram callback query events',
        handler: async (agent: Agent, event: any) => {
          console.log('Telegram callback query event:', event)
        }
      }
    }
  }

  private setupEventHandlers(): void {
    this.bot.on('message', (ctx) => {
      console.log('Telegram message received:', ctx.message)
    })

    this.bot.on('poll_answer', (ctx) => {
      const pollId = ctx.pollAnswer.poll_id
      const poll = this.polls.get(pollId)
      if (poll) {
        console.log('Poll answer received:', ctx.pollAnswer)
      }
    })
  }

  async init(agent: Agent): Promise<void> {
    try {
      await this.bot.launch()
      console.log(`Telegram extension initialized for agent: ${agent.name}`)
    } catch (error) {
      console.error('Failed to initialize Telegram bot:', error)
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Periodic tasks if needed
  }

  async sendMessage(agent: Agent, chatId: number | string, message: string): Promise<ActionResult> {
    try {
      const result = await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { messageId: result.message_id, chatId }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async sendDirectMessage(agent: Agent, userId: number, message: string): Promise<ActionResult> {
    return this.sendMessage(agent, userId, message)
  }

  async askQuestion(agent: Agent, chatId: number | string, question: string): Promise<ActionResult> {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: 'Yes', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]
        ]
      }
      
      const result = await this.bot.telegram.sendMessage(chatId, question, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { messageId: result.message_id, chatId }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to ask question: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createPoll(agent: Agent, chatId: number | string, question: string, options: string[]): Promise<ActionResult> {
    try {
      const result = await this.bot.telegram.sendPoll(chatId, question, options, {
        is_anonymous: false,
        allows_multiple_answers: false
      })
      
      const pollId = result.poll?.id
      if (pollId) {
        this.polls.set(pollId, {
          agent: agent.id,
          chatId,
          question,
          options,
          messageId: result.message_id
        })
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { pollId, messageId: result.message_id }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create poll: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async requestApproval(agent: Agent, chatId: number | string, request: string, approvers: string[]): Promise<ActionResult> {
    try {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: 'approve' },
            { text: '❌ Reject', callback_data: 'reject' }
          ]
        ]
      }
      
      const message = `<b>Approval Request from ${agent.name}</b>\n\n${request}\n\n<b>Approvers:</b> ${approvers.join(', ')}`
      const result = await this.bot.telegram.sendMessage(chatId, message, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      })
      
      const approvalId = `${chatId}-${result.message_id}`
      this.approvals.set(approvalId, {
        agent: agent.id,
        chatId,
        messageId: result.message_id,
        request,
        approvers,
        status: 'pending'
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { approvalId, messageId: result.message_id }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to request approval: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async trackTask(agent: Agent, chatId: number | string, task: string, assignee?: string): Promise<ActionResult> {
    try {
      const taskId = `task-${Date.now()}`
      const message = `<b>📋 Task Tracked</b>\n\n<b>Task:</b> ${task}\n<b>Assigned to:</b> ${assignee || 'Unassigned'}\n<b>Status:</b> Pending\n<b>ID:</b> ${taskId}`
      
      const result = await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' })
      
      this.tasks.set(taskId, {
        agent: agent.id,
        chatId,
        messageId: result.message_id,
        task,
        assignee,
        status: 'pending',
        createdAt: new Date()
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { taskId, messageId: result.message_id }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to track task: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async shareFile(agent: Agent, chatId: number | string, filePath: string, caption?: string): Promise<ActionResult> {
    try {
      const result = await this.bot.telegram.sendDocument(chatId, { source: filePath }, { caption })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { messageId: result.message_id, fileId: result.document?.file_id }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to share file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async setUserPreferences(userId: string, preferences: any): Promise<ActionResult> {
    this.userPreferences.set(userId, preferences)
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: { userId, preferences }
    }
  }

  async getUserPreferences(userId: string): Promise<ActionResult> {
    const preferences = this.userPreferences.get(userId) || {}
    return {
      success: true,
      type: ActionResultType.SUCCESS,
      result: preferences
    }
  }
}

export default TelegramExtension