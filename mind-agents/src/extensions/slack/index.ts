import { Extension, ExtensionAction, ExtensionEventHandler, Agent, ActionResult, ActionResultType, AgentEvent } from '../../types/agent.js'
import { GenericData } from '../../types/common.js'
import { App, SlackEventMiddlewareArgs, AllMiddlewareArgs } from '@slack/bolt'
import { WebClient } from '@slack/web-api'
import { 
  SlackConfig, 
  PendingApproval, 
  ConversationContext, 
  UserPreferences,
  SlackMessage,
  SlackEvent,
  SlackCommand,
  SlackInteraction,
  MessageBlock,
  ActionBlock
} from './types.js'
import { initializeSkills } from './skills/index.js'

export class SlackExtension implements Extension {
  id = 'slack'
  name = 'Slack Integration'
  version = '1.0.0'
  enabled = true
  config: SlackConfig = {
    enabled: true,
    settings: {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      appToken: process.env.SLACK_APP_TOKEN || '',
      socketMode: true,
      port: 3000
    }
  }
  
  private app: App
  private client: WebClient
  private approvalQueue: Map<string, PendingApproval> = new Map()
  private conversationHistory: Map<string, ConversationContext> = new Map()
  private userPreferences: Map<string, UserPreferences> = new Map()
  private skills: Record<string, any> = {}

  constructor(config: SlackConfig) {
    this.config = {
      port: 3001,
      approvalTimeout: 300000, // 5 minutes
      maxMessageLength: 2000,
      allowedChannels: [],
      adminUsers: [],
      ...config
    }
    
    this.app = new App({
      token: this.config.settings.botToken,
      signingSecret: this.config.settings.signingSecret,
      socketMode: this.config.settings.socketMode || false,
      appToken: this.config.settings.appToken,
      port: this.config.settings.port
    })
    
    this.client = new WebClient(this.config.settings.botToken)
  }

  async init(agent: Agent): Promise<void> {
    console.log(`💬 Initializing Slack extension for agent ${agent.name}`)
    
    try {
      await this.setupSlackHandlers(agent)
      await this.app.start()
      
      // Initialize skills
      this.skills = initializeSkills(this)
      
      console.log(`✅ Slack extension initialized for ${agent.name} on port ${this.config.settings.port}`)
    } catch (error) {
      console.error(`❌ Failed to initialize Slack extension:`, error)
      throw error
    }
  }

  async tick(agent: Agent): Promise<void> {
    // Process approval timeouts
    await this.processApprovalTimeouts()
    
    // Send periodic status updates if configured
    if (this.config.settings.statusUpdates?.enabled) {
      await this.sendStatusUpdate(agent)
    }
  }

  get actions(): Record<string, ExtensionAction> {
    const allActions: Record<string, ExtensionAction> = {}
    
    // Aggregate actions from all skills
    Object.values(this.skills).forEach(skill => {
      if (skill && typeof skill.getActions === 'function') {
        const skillActions = skill.getActions()
        Object.assign(allActions, skillActions)
      }
    })
    
    return allActions
  }

  events: Record<string, ExtensionEventHandler> = {
    message_received: {
      event: 'message_received',
      description: 'Handle incoming Slack messages',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleMessageReceived(agent, event.data)
      }
    },
    
    approval_response: {
      event: 'approval_response',
      description: 'Handle approval responses from Slack',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleApprovalResponse(agent, event.data)
      }
    },
    
    mention_received: {
      event: 'mention_received',
      description: 'Handle mentions in Slack channels',
      handler: async (agent: Agent, event: AgentEvent) => {
        await this.handleMentionReceived(agent, event.data)
      }
    }
  }

  private async setupSlackHandlers(agent: Agent): Promise<void> {
    // Handle direct messages and mentions
    this.app.message(async ({ message, say, client }) => {
      if (message.subtype) return // Ignore system messages
      
      const messageEvent: AgentEvent = {
        id: `slack_msg_${Date.now()}`,
        type: 'message_received',
        source: 'slack',
        data: {
          user: message.user,
          channel: message.channel,
          text: message.text,
          timestamp: message.ts,
          thread_ts: message.thread_ts
        },
        timestamp: new Date(),
        processed: false
      }
      
      await this.handleMessageReceived(agent, messageEvent.data)
    })
    
    // Handle app mentions
    this.app.event('app_mention', async ({ event, say }) => {
      const mentionEvent: AgentEvent = {
        id: `slack_mention_${Date.now()}`,
        type: 'mention_received',
        source: 'slack',
        data: {
          user: event.user,
          channel: event.channel,
          text: event.text,
          timestamp: event.ts
        },
        timestamp: new Date(),
        processed: false
      }
      
      await this.handleMentionReceived(agent, mentionEvent.data)
    })
    
    // Handle button interactions (for approvals)
    this.app.action('approve_action', async ({ ack, body, client }) => {
      await ack()
      await this.handleApprovalAction(agent, body, 'approved')
    })
    
    this.app.action('reject_action', async ({ ack, body, client }) => {
      await ack()
      await this.handleApprovalAction(agent, body, 'rejected')
    })
    
    // Handle slash commands
    this.app.command('/agent', async ({ command, ack, respond }) => {
      await ack()
      await this.handleAgentCommand(agent, command, respond)
    })
    
    // Handle reactions
    this.app.event('reaction_added', async ({ event }) => {
      // Process reactions to agent messages
      await this.handleReactionAdded(agent, event)
    })
  }

  // Action implementations
  async sendMessage(agent: Agent, channel: string, message: string, thread_ts?: string): Promise<ActionResult> {
    try {
      // Truncate message if too long
      const maxLength = this.config.settings.maxMessageLength || 2000
      const truncatedMessage = message.length > maxLength 
        ? message.substring(0, maxLength - 3) + '...'
        : message
      
      // Add agent personality to message
      const formattedMessage = this.formatMessageWithPersonality(agent, truncatedMessage)
      
      const result = await this.client.chat.postMessage({
        channel,
        text: formattedMessage,
        thread_ts,
        username: agent.name,
        icon_emoji: this.getAgentEmoji(agent)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts,
          message: formattedMessage
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async requestApproval(agent: Agent, action: any, channel: string, timeout?: number): Promise<ActionResult> {
    try {
      const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timeoutMs = timeout || this.config.settings.approvalTimeout || 30000
      
      const blocks: MessageBlock[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🤖 *${agent.name}* is requesting approval for an action:`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action:* ${action.description || action.type}\n*Details:* ${JSON.stringify(action.parameters, null, 2)}`
          }
        }
      ]
      
      const actionBlock: ActionBlock = {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Approve'
            },
            style: 'primary',
            action_id: 'approve_action',
            value: approvalId
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ Reject'
            },
            style: 'danger',
            action_id: 'reject_action',
            value: approvalId
          }
        ]
      }
      
      const result = await this.client.chat.postMessage({
        channel,
        blocks: [...blocks, actionBlock],
        text: `${agent.name} is requesting approval for an action`
      })
      
      // Store approval request
      this.approvalQueue.set(approvalId, {
        id: approvalId,
        agentId: agent.id,
        action,
        channel,
        messageTs: result.ts!,
        requestedAt: new Date(),
        timeout: timeoutMs,
        status: 'pending'
      })
      
      // Set timeout
      setTimeout(() => {
        this.handleApprovalTimeout(approvalId)
      }, timeoutMs)
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          approvalId,
          messageTs: result.ts,
          timeout: timeoutMs
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to request approval: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async sendAgentStatus(agent: Agent, channel: string, includeStats: boolean = false): Promise<ActionResult> {
    try {
      let statusMessage = `🤖 *${agent.name}* Status Update\n`
      statusMessage += `Status: ${this.getStatusEmoji(agent.status)} ${agent.status}\n`
      statusMessage += `Emotion: ${this.getEmotionEmoji(agent.emotion.current)} ${agent.emotion.current} (${Math.round(agent.emotion.intensity * 100)}%)\n`
      statusMessage += `Last Update: ${agent.lastUpdate.toLocaleTimeString()}\n`
      
      if (includeStats) {
        statusMessage += `\n📊 *Statistics:*\n`
        statusMessage += `Extensions: ${agent.extensions.filter(e => e.enabled).length}/${agent.extensions.length}\n`
        // Add more stats as needed
      }
      
      const result = await this.client.chat.postMessage({
        channel,
        text: statusMessage,
        username: agent.name,
        icon_emoji: this.getAgentEmoji(agent)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async shareThought(agent: Agent, thought: string, channel: string, emotion?: string): Promise<ActionResult> {
    try {
      const emotionEmoji = emotion ? this.getEmotionEmoji(emotion) : this.getEmotionEmoji(agent.emotion.current)
      const message = `${emotionEmoji} *Thought:* ${thought}`
      
      const result = await this.client.chat.postMessage({
        channel,
        text: message,
        username: agent.name,
        icon_emoji: this.getAgentEmoji(agent)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts,
          thought
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to share thought: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async askQuestion(agent: Agent, question: string, channel: string, options?: string[]): Promise<ActionResult> {
    try {
      let message = `❓ *Question from ${agent.name}:*\n${question}`
      
      if (options && options.length > 0) {
        message += `\n\n*Options:*\n${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`
      }
      
      const result = await this.client.chat.postMessage({
        channel,
        text: message,
        username: agent.name,
        icon_emoji: this.getAgentEmoji(agent)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts,
          question,
          options
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to ask question: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async reactToMessage(channel: string, timestamp: string, emoji: string): Promise<ActionResult> {
    try {
      await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji.replace(/:/g, '') // Remove colons if present
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, timestamp, emoji }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to react to message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async updateBotStatus(status: string, emoji?: string): Promise<ActionResult> {
    try {
      await this.client.users.profile.set({
        profile: {
          status_text: status,
          status_emoji: emoji || ':robot_face:'
        }
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { status, emoji }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async scheduleMessage(channel: string, message: string, post_at: number): Promise<ActionResult> {
    try {
      const result = await this.client.chat.scheduleMessage({
        channel,
        text: message,
        post_at
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          scheduled_message_id: result.scheduled_message_id,
          channel,
          post_at
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to schedule message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  // Event handlers
  private async handleMessageReceived(agent: Agent, data: any): Promise<void> {
    const { user, channel, text, timestamp } = data
    
    // Store conversation context
    this.updateConversationContext(channel, user, text)
    
    // Generate response based on agent's personality and current state
    const response = await this.generateResponse(agent, text, data)
    
    if (response) {
      await this.sendMessage(agent, channel, response, timestamp)
    }
  }

  private async handleMentionReceived(agent: Agent, data: any): Promise<void> {
    const { user, channel, text } = data
    
    // Extract the actual message (remove mention)
    const cleanText = text.replace(/<@[^>]+>/g, '').trim()
    
    // Generate a more engaged response for mentions
    const response = await this.generateMentionResponse(agent, cleanText, data)
    
    if (response) {
      await this.sendMessage(agent, channel, response)
    }
  }

  private async handleApprovalAction(agent: Agent, body: any, decision: 'approved' | 'rejected'): Promise<void> {
    const approvalId = body.actions[0].value
    const approval = this.approvalQueue.get(approvalId)
    
    if (!approval) {
      console.warn(`Approval ${approvalId} not found`)
      return
    }
    
    approval.status = decision
    approval.respondedBy = body.user.id
    approval.respondedAt = new Date()
    
    // Update the original message
    const statusEmoji = decision === 'approved' ? '✅' : '❌'
    const statusText = decision === 'approved' ? 'Approved' : 'Rejected'
    
    await this.client.chat.update({
      channel: approval.channel,
      ts: approval.messageTs,
      text: `${statusEmoji} Action ${statusText} by <@${body.user.id}>`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${statusEmoji} *Action ${statusText}* by <@${body.user.id}>`
          }
        }
      ]
    })
    
    // Emit approval event
    const approvalEvent: AgentEvent = {
      id: `approval_${Date.now()}`,
      type: 'approval_response',
      source: 'slack',
      data: {
        approvalId,
        decision,
        action: approval.action,
        respondedBy: body.user.id
      },
      timestamp: new Date(),
      processed: false
    }
    
    await this.handleApprovalResponse(agent, approvalEvent.data)
  }

  private async handleApprovalResponse(agent: Agent, data: any): Promise<void> {
    const { approvalId, decision, action } = data
    
    if (decision === 'approved') {
      // Execute the approved action
      console.log(`✅ Action approved for agent ${agent.name}:`, action)
      // This would trigger the action execution in the runtime
    } else {
      console.log(`❌ Action rejected for agent ${agent.name}:`, action)
    }
    
    // Clean up approval from queue
    this.approvalQueue.delete(approvalId)
  }

  private async handleAgentCommand(agent: Agent, command: any, respond: Function): Promise<void> {
    const args = command.text.split(' ')
    const subcommand = args[0]
    
    switch (subcommand) {
      case 'status':
        const status = await this.generateStatusMessage(agent)
        await respond(status)
        break
      case 'help':
        await respond(this.generateHelpMessage())
        break
      default:
        await respond(`Unknown command: ${subcommand}. Type \`/agent help\` for available commands.`)
    }
  }

  private async handleReactionAdded(agent: Agent, event: any): Promise<void> {
    // Process reactions to agent messages
    // Could be used for feedback or emotion adjustment
  }

  // Helper methods
  private formatMessageWithPersonality(agent: Agent, message: string): string {
    const personality = agent.config.core.personality || []
    const tone = agent.config.core.tone || 'neutral'
    
    // Add personality-based formatting
    if (personality.includes('friendly')) {
      message = `😊 ${message}`
    }
    if (personality.includes('formal')) {
      message = message.replace(/\b(hi|hey)\b/gi, 'Hello')
    }
    
    return message
  }

  private getAgentEmoji(agent: Agent): string {
    const emotion = agent.emotion.current
    const emojiMap: Record<string, string> = {
      excited: ':star-struck:',
      happy: ':smile:',
      focused: ':thinking_face:',
      frustrated: ':confused:',
      neutral: ':robot_face:',
      curious: ':eyes:',
      determined: ':muscle:'
    }
    
    return emojiMap[emotion] || ':robot_face:'
  }

  private getStatusEmoji(status: string): string {
    const statusMap: Record<string, string> = {
      active: '🟢',
      idle: '🟡',
      thinking: '🧠',
      error: '🔴'
    }
    
    return statusMap[status] || '⚪'
  }

  private getEmotionEmoji(emotion: string): string {
    const emotionMap: Record<string, string> = {
      excited: '🤩',
      frustrated: '😤',
      focused: '🎯',
      curious: '🤔',
      happy: '😊',
      neutral: '😐',
      determined: '💪',
      cautious: '😬',
      proud: '😎'
    }
    
    return emotionMap[emotion] || '🤖'
  }

  private updateConversationContext(channel: string, user: string, text: string): void {
    if (!this.conversationHistory.has(channel)) {
      this.conversationHistory.set(channel, {
        messages: [],
        participants: new Set(),
        lastActivity: new Date()
      })
    }
    
    const context = this.conversationHistory.get(channel)!
    context.messages.push({ user, text, timestamp: new Date() })
    context.participants.add(user)
    context.lastActivity = new Date()
    
    // Keep only recent messages
    if (context.messages.length > 50) {
      context.messages = context.messages.slice(-25)
    }
  }

  private async generateResponse(agent: Agent, text: string, context: any): Promise<string | null> {
    // Simple response generation - in a real system this would be more sophisticated
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      return `Hello! I'm ${agent.name}. How can I help you today?`
    }
    
    if (lowerText.includes('status')) {
      return `I'm currently ${agent.status} and feeling ${agent.emotion.current}.`
    }
    
    // Don't respond to every message to avoid spam
    if (Math.random() > 0.3) {
      return null
    }
    
    return `Interesting! I'm ${agent.emotion.current} about that.`
  }

  private async generateMentionResponse(agent: Agent, text: string, context: any): Promise<string> {
    // Always respond to mentions
    const responses = [
      `Yes? I'm here and ${agent.emotion.current}!`,
      `How can I help you? I'm currently ${agent.status}.`,
      `You called? I'm feeling ${agent.emotion.current} today.`,
      `What's up? I'm ${agent.status} and ready to assist!`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  private async generateStatusMessage(agent: Agent): Promise<string> {
    return `🤖 *${agent.name}* Status:\n` +
           `• Status: ${agent.status}\n` +
           `• Emotion: ${agent.emotion.current} (${Math.round(agent.emotion.intensity * 100)}%)\n` +
           `• Extensions: ${agent.extensions.filter(e => e.enabled).length} active\n` +
           `• Last Update: ${agent.lastUpdate.toLocaleTimeString()}`
  }

  private generateHelpMessage(): string {
    return `🤖 *Agent Commands:*\n` +
           `• \`/agent status\` - Show agent status\n` +
           `• \`/agent help\` - Show this help message\n` +
           `\nYou can also mention me in any channel to interact!`
  }

  private async processApprovalTimeouts(): Promise<void> {
    const now = new Date()
    
    for (const [id, approval] of this.approvalQueue.entries()) {
      if (approval.status === 'pending' && 
          now.getTime() - approval.requestedAt.getTime() > approval.timeout) {
        await this.handleApprovalTimeout(id)
      }
    }
  }

  private async handleApprovalTimeout(approvalId: string): Promise<void> {
    const approval = this.approvalQueue.get(approvalId)
    if (!approval || approval.status !== 'pending') return
    
    approval.status = 'timeout'
    
    // Update the message
    await this.client.chat.update({
      channel: approval.channel,
      ts: approval.messageTs,
      text: '⏰ Approval request timed out',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '⏰ *Approval request timed out*'
          }
        }
      ]
    })
    
    this.approvalQueue.delete(approvalId)
  }

  private async sendStatusUpdate(agent: Agent): Promise<void> {
    if (!this.config.settings.statusUpdates?.channel) return
    
    const now = new Date()
    const lastUpdate = this.config.settings.statusUpdates.lastSent || new Date(0)
    const interval = this.config.settings.statusUpdates.interval || 3600000 // 1 hour
    
    if (now.getTime() - lastUpdate.getTime() >= interval) {
      await this.sendAgentStatus(agent, this.config.settings.statusUpdates.channel, true)
      this.config.settings.statusUpdates.lastSent = now
    }
  }

  async archiveChannel(channel: string): Promise<ActionResult> {
    try {
      await this.client.conversations.archive({ channel })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, action: 'archived' }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to archive channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async unarchiveChannel(channel: string): Promise<ActionResult> {
    try {
      await this.client.conversations.unarchive({ channel })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, action: 'unarchived' }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to unarchive channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async setChannelTopic(channel: string, topic: string): Promise<ActionResult> {
    try {
      await this.client.conversations.setTopic({ channel, topic })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, topic }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set channel topic: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async setChannelPurpose(channel: string, purpose: string): Promise<ActionResult> {
    try {
      await this.client.conversations.setPurpose({ channel, purpose })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, purpose }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set channel purpose: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async getChannelInfo(channel: string): Promise<ActionResult> {
    try {
      const result = await this.client.conversations.info({ channel })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.channel as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get channel info: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async listChannels(types?: string, excludeArchived: boolean = true): Promise<ActionResult> {
    try {
      const result = await this.client.conversations.list({
        types,
        exclude_archived: excludeArchived
      })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.channels as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list channels: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async uploadFile(channel: string, filePath: string, title?: string, initialComment?: string): Promise<ActionResult> {
    try {
      const result = await this.client.files.upload({
        channels: channel,
        file: filePath,
        title,
        initial_comment: initialComment
      })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.file as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async shareFile(file: string, channel: string, comment?: string): Promise<ActionResult> {
    try {
      const result = await this.client.files.sharedPublicURL({
        file
      })
      
      if (comment) {
        await this.client.chat.postMessage({
          channel,
          text: comment,
          attachments: [{
            fallback: `File: ${file}`,
            title: 'Shared File',
            title_link: result.file?.permalink_public
          }]
        })
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.file as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to share file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async getFileInfo(file: string): Promise<ActionResult> {
    try {
      const result = await this.client.files.info({ file })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.file as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get file info: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async deleteFile(file: string): Promise<ActionResult> {
    try {
      await this.client.files.delete({ file })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { file, action: 'deleted' }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async listFiles(channel?: string, user?: string, types?: string, count?: number): Promise<ActionResult> {
    try {
      const result = await this.client.files.list({
        channel,
        user,
        types,
        count
      })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.files as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createSnippet(channel: string, content: string, title?: string, filetype?: string): Promise<ActionResult> {
    try {
      const result = await this.client.files.upload({
        channels: channel,
        content,
        title,
        filetype
      })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.file as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create snippet: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createChannel(name: string, isPrivate: boolean = false, purpose?: string, topic?: string): Promise<ActionResult> {
    try {
      const result = await this.client.conversations.create({
        name,
        is_private: isPrivate
      })
      
      if (purpose && result.channel?.id) {
        await this.client.conversations.setPurpose({
          channel: result.channel.id,
          purpose
        })
      }
      
      if (topic && result.channel?.id) {
        await this.client.conversations.setTopic({
          channel: result.channel.id,
          topic
        })
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.channel as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async joinChannel(channel: string): Promise<ActionResult> {
    try {
      const result = await this.client.conversations.join({ channel })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.channel as any
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to join channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async leaveChannel(channel: string): Promise<ActionResult> {
    try {
      await this.client.conversations.leave({ channel })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { channel, action: 'left' }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to leave channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async updateMessage(channel: string, timestamp: string, message: string): Promise<ActionResult> {
    try {
      const result = await this.client.chat.update({
        channel,
        ts: timestamp,
        text: message
      })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts,
          message: result.text
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to update message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async listReminders(): Promise<ActionResult> {
    try {
      const result = await this.client.reminders.list()
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { reminders: result.reminders } as GenericData
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list reminders: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async deleteReminder(reminder: string): Promise<ActionResult> {
    try {
      await this.client.reminders.delete({ reminder })
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: { reminder, action: 'deleted' }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to delete reminder: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createWorkflow(name: string, steps: any[], channel: string): Promise<ActionResult> {
    try {
      // Note: Slack workflows are typically created through the UI or apps
      // This is a simplified implementation that posts a workflow description
      const workflowDescription = `🔄 **Workflow: ${name}**\n\nSteps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
      
      const result = await this.client.chat.postMessage({
        channel,
        text: workflowDescription
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          name,
          steps,
          channel: result.channel,
          timestamp: result.ts
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async trackTask(task: string, assignee: string, dueDate: string, channel: string): Promise<ActionResult> {
    try {
      const taskMessage = `📋 **Task Assigned**\n\n**Task:** ${task}\n**Assignee:** <@${assignee}>\n**Due Date:** ${dueDate}`
      
      const result = await this.client.chat.postMessage({
        channel,
        text: taskMessage
      })
      
      // Add a reminder reaction
      await this.client.reactions.add({
        channel,
        timestamp: result.ts!,
        name: 'alarm_clock'
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          task,
          assignee,
          dueDate,
          channel: result.channel,
          timestamp: result.ts
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to track task: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async sendDirectMessage(agent: Agent, user: string, message: string): Promise<ActionResult> {
    try {
      const result = await this.client.chat.postMessage({
        channel: user,
        text: message,
        username: agent.name,
        icon_emoji: this.getAgentEmoji(agent)
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          user,
          message,
          timestamp: result.ts
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to send direct message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async setUserPreferences(user: string, preferences: any): Promise<ActionResult> {
    try {
      // Store user preferences in a database or file
      // This is a simplified implementation
      const userPrefs = this.userPreferences.get(user) || {}
      this.userPreferences.set(user, { ...userPrefs, ...preferences })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          user,
          preferences: this.userPreferences.get(user)
        } as GenericData
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to set user preferences: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async getUserPreferences(user: string): Promise<ActionResult> {
    try {
      const preferences = this.userPreferences.get(user) || {}
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          user,
          preferences
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user preferences: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async getUserPresence(user: string): Promise<ActionResult> {
    try {
      const result = await this.client.users.getPresence({
        user
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          user,
          presence: result.presence,
          online: result.online,
          auto_away: result.auto_away,
          manual_away: result.manual_away,
          connection_count: result.connection_count,
          last_activity: result.last_activity
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user presence: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async inviteUserToChannel(channel: string, user: string): Promise<ActionResult> {
    try {
      await this.client.conversations.invite({
        channel,
        users: user
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel,
          user,
          message: `User ${user} invited to channel ${channel}`
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to invite user to channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async kickUserFromChannel(channel: string, user: string): Promise<ActionResult> {
    try {
      await this.client.conversations.kick({
        channel,
        user
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel,
          user,
          message: `User ${user} removed from channel ${channel}`
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to kick user from channel: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async listChannelMembers(channel: string): Promise<ActionResult> {
    try {
      const result = await this.client.conversations.members({
        channel
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel,
          members: result.members,
          response_metadata: result.response_metadata
        } as GenericData
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to list channel members: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async deleteMessage(channel: string, timestamp: string): Promise<ActionResult> {
    try {
      await this.client.chat.delete({
        channel,
        ts: timestamp
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel,
          timestamp,
          message: 'Message deleted successfully'
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async getUserInfo(user: string): Promise<ActionResult> {
    try {
      const result = await this.client.users.info({
        user
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          user: result.user as GenericData
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to get user info: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async downloadFile(file: string, destination: string): Promise<ActionResult> {
    try {
      // Get file info first
      const fileInfo = await this.client.files.info({
        file
      })
      
      if (!fileInfo.file?.url_private_download) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: 'File download URL not available'
        }
      }
      
      // Download the file
      const response = await fetch(fileInfo.file.url_private_download, {
        headers: {
          'Authorization': `Bearer ${this.config.settings.botToken}`
        }
      })
      
      if (!response.ok) {
        return {
          success: false,
          type: ActionResultType.FAILURE,
          error: `Failed to download file: ${response.statusText}`
        }
      }
      
      const buffer = await response.arrayBuffer()
      const fs = await import('fs/promises')
      await fs.writeFile(destination, Buffer.from(buffer))
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          file,
          destination,
          size: buffer.byteLength,
          filename: fileInfo.file.name
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to download file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createPoll(channel: string, question: string, options: string[], anonymous: boolean = false): Promise<ActionResult> {
    try {
      // Create a poll message with reactions for voting
      let pollMessage = `📊 **Poll: ${question}**\n\n`
      
      // Add options with emoji reactions
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
      options.forEach((option, index) => {
        if (index < emojis.length) {
          pollMessage += `${emojis[index]} ${option}\n`
        }
      })
      
      if (anonymous) {
        pollMessage += '\n_This is an anonymous poll_'
      }
      
      const result = await this.client.chat.postMessage({
        channel,
        text: pollMessage
      })
      
      // Add reaction emoji for each option
      for (let i = 0; i < options.length && i < emojis.length; i++) {
        await this.client.reactions.add({
          channel,
          timestamp: result.ts!,
          name: emojis[i].replace(/[^a-z0-9_]/gi, '') // Remove non-alphanumeric characters for emoji name
        })
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: {
          channel: result.channel,
          timestamp: result.ts,
          question,
          options
        }
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create poll: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async createReminder(text: string, time: string, user?: string, channel?: string): Promise<ActionResult> {
    try {
      const result = await this.client.reminders.add({
        text,
        time,
        user
      })
      
      return {
        success: true,
        type: ActionResultType.SUCCESS,
        result: result.reminder as GenericData
      }
    } catch (error) {
      return {
        success: false,
        type: ActionResultType.FAILURE,
        error: `Failed to create reminder: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

export * from './types.js'
export default SlackExtension