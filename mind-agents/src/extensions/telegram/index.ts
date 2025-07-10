/**
 * Telegram Extension for SYMindX
 *
 * Enables real-time chat with agents through Telegram Bot API
 * Uses telegraf library for Telegram Bot functionality
 */

import { Telegraf, Context } from 'telegraf';

import {
  Agent,
  AgentAction,
  Extension,
  ActionStatus,
  MemoryType,
  MemoryDuration,
} from '../../types/agent';
import { ExtensionConfig, BaseConfig } from '../../types/common';
import { MessageRole } from '../../types/portal';
import { Logger } from '../../utils/logger';

export interface TelegramConfig extends ExtensionConfig {
  botToken: string;
  allowedUsers?: number[]; // Optional whitelist of user IDs
  commandPrefix?: string;
  maxMessageLength?: number;
  enableLogging?: boolean;
}

export interface TelegramSettings extends BaseConfig {
  botToken: string;
  allowedUsers?: number[];
  commandPrefix?: string;
  maxMessageLength?: number;
  enableLogging?: boolean;
}

export interface TelegramMessage {
  messageId: number;
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  text: string;
  timestamp: Date;
}

export interface TelegramResponse {
  chatId: number;
  text: string;
  replyToMessageId?: number;
  parseMode?: 'Markdown' | 'HTML';
}

export class TelegramExtension implements Extension {
  id = 'telegram';
  name = 'Telegram Bot';
  version = '1.0.0';
  type = 'communication' as any; // TODO: Add proper ExtensionType enum
  enabled = false;
  status = 'inactive' as any; // TODO: Add proper ExtensionStatus enum
  config: ExtensionConfig;
  actions: Record<string, any> = {};
  events: Record<string, any> = {};

  private bot: Telegraf;
  private agent: Agent | null = null;
  private telegramConfig: TelegramSettings;
  private logger: Logger;
  private messageQueue: TelegramMessage[] = [];
  private isProcessingQueue = false;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.telegramConfig = {
      commandPrefix: '/',
      maxMessageLength: 4096, // Telegram limit
      enableLogging: true,
      ...config.settings,
      botToken: String(config.settings.botToken || config.botToken || ''),
    };

    this.logger = new Logger('TelegramExtension');
    console.log(
      `🔑 Telegram bot token configured: ${this.telegramConfig.botToken ? 'Yes' : 'No'} (length: ${this.telegramConfig.botToken?.length || 0})`
    );

    if (
      !this.telegramConfig.botToken ||
      this.telegramConfig.botToken.length < 10
    ) {
      console.error('❌ Invalid or missing Telegram bot token');
      throw new Error('Invalid or missing Telegram bot token');
    }

    this.bot = new Telegraf(this.telegramConfig.botToken);

    this.setupBotHandlers();
  }

  /**
   * Initialize the extension with an agent
   */
  async init(agent: Agent): Promise<void> {
    this.agent = agent;

    try {
      // Check if bot token is valid
      const botToken =
        (this.config.settings as any)?.botToken ||
        (this.config as any).botToken;
      if (!botToken || botToken.length < 10) {
        console.log(`⏭️ Telegram extension disabled - no bot token configured`);
        this.enabled = false;
        return;
      }

      this.enabled = true;

      console.log(`🤖 Starting Telegram bot for agent ${agent.name}...`);
      console.log(`📡 Attempting to connect to Telegram API...`);

      // Start the bot with shorter timeout
      const launchTimeout = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Bot launch timeout after 3 seconds')),
          3000
        )
      );

      try {
        await Promise.race([
          this.bot.launch({
            dropPendingUpdates: true, // Ignore old messages
          }),
          launchTimeout,
        ]);
        this.logger.info(`Telegram bot started for agent ${agent.name}`);
        console.log(`✅ Telegram bot started successfully`);

        // Get bot info
        const botInfo = await this.bot.telegram.getMe();
        console.log(`🤖 Bot username: @${botInfo.username}`);
      } catch (launchError) {
        if (
          launchError instanceof Error &&
          launchError.message.includes('timeout')
        ) {
          console.error('⏱️ Telegram bot launch timed out - continuing anyway');
          this.logger.warn(
            'Telegram bot launch timed out but may still be running'
          );
        } else {
          throw launchError;
        }
      }

      // Set up bot commands
      await this.setupCommands();

      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error(`❌ Failed to start Telegram bot:`, error);
      this.logger.error('Failed to start Telegram bot:', error);
      this.enabled = false;
      throw error;
    }
  }

  /**
   * Main tick method called by the runtime
   */
  async tick(_agent: Agent): Promise<void> {
    if (!this.enabled || !this.agent) return;

    // Process queued messages
    await this.processMessageQueue();
  }

  /**
   * Setup bot event handlers
   */
  private setupBotHandlers(): void {
    // Handle text messages
    this.bot.on('text', async (ctx) => {
      try {
        await this.handleTextMessage(ctx);
      } catch (error) {
        this.logger.error('Error handling text message:', error);
        await this.sendError(
          ctx.chat.id,
          'Sorry, I encountered an error processing your message.'
        );
      }
    });

    // Handle stickers with a fun response
    this.bot.on('sticker', async (ctx) => {
      await ctx.reply(
        'Nice sticker! 😊 I understand text messages best though.'
      );
    });

    // Handle photos
    this.bot.on('photo', async (ctx) => {
      await ctx.reply(
        "I see you sent a photo! Currently I can only process text, but that's a nice image!"
      );
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      this.logger.error('Bot error:', err);
      if (ctx && ctx.chat) {
        this.sendError(
          ctx.chat.id,
          'Oops! Something went wrong. Please try again.'
        );
      }
    });
  }

  /**
   * Setup bot commands
   */
  private async setupCommands(): Promise<void> {
    // Set bot commands for the menu
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Start chatting with the AI agent' },
      { command: 'help', description: 'Show help information' },
      { command: 'status', description: 'Check agent status' },
      { command: 'clear', description: 'Clear conversation context' },
    ]);

    // Handle /start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `👋 Hello! I'm ${this.agent?.name || 'your AI agent'}.

I'm here to chat with you and help with various tasks. Feel free to ask me anything!

Available commands:
/help - Show this help
/status - Check my current status  
/clear - Clear our conversation context

Just send me a message to start chatting! 🤖`;

      await ctx.reply(welcomeMessage);
    });

    // Handle /help command
    this.bot.command('help', async (ctx) => {
      const helpMessage = `🤖 How to chat with me:

**Basic Usage:**
• Just send me any message to start a conversation
• I can answer questions, help with tasks, and chat about various topics
• I have memory of our conversation context

**Commands:**
/start - Welcome message and introduction
/status - Check my current status and capabilities
/clear - Clear conversation history (fresh start)
/help - Show this help message

**Tips:**
• I work best with clear, specific questions
• Feel free to ask follow-up questions
• I can maintain context throughout our conversation

Try asking me something! 💬`;

      await ctx.reply(helpMessage);
    });

    // Handle /status command
    this.bot.command('status', async (ctx) => {
      if (!this.agent) {
        await ctx.reply('❌ No agent connected');
        return;
      }

      const statusMessage = `🤖 Agent Status Report

**Name:** ${this.agent.name}
**Status:** ${this.agent.status}
**Extensions:** ${this.agent.extensions.length} loaded
**Memory:** ${this.agent.memory ? '✅ Available' : '❌ Not available'}
**Emotion:** ${this.agent.emotion ? '✅ Available' : '❌ Not available'}
**Cognition:** ${this.agent.cognition ? '✅ Available' : '❌ Not available'}

I'm ready to chat! 💬`;

      await ctx.reply(statusMessage);
    });

    // Handle /clear command
    this.bot.command('clear', async (ctx) => {
      // Clear message queue
      this.messageQueue = [];

      await ctx.reply('🧹 Conversation context cleared! Starting fresh.');
    });
  }

  /**
   * Handle incoming text messages
   */
  private async handleTextMessage(
    ctx: Context & { message: { text: string; message_id: number } }
  ): Promise<void> {
    if (!this.agent || !ctx.message?.text) return;

    // Check if user is allowed (if whitelist is configured)
    if (
      this.telegramConfig.allowedUsers &&
      this.telegramConfig.allowedUsers.length > 0
    ) {
      if (!this.telegramConfig.allowedUsers.includes(ctx.from?.id || 0)) {
        await ctx.reply('🚫 Sorry, you are not authorized to use this bot.');
        return;
      }
    }

    // Create message object
    const message: TelegramMessage = {
      messageId: ctx.message.message_id,
      chatId: ctx.chat!.id,
      userId: ctx.from?.id || 0,
      ...(ctx.from?.username && { username: ctx.from.username }),
      ...(ctx.from?.first_name && { firstName: ctx.from.first_name }),
      ...(ctx.from?.last_name && { lastName: ctx.from.last_name }),
      text: ctx.message.text,
      timestamp: new Date(),
    };

    // Add to queue for processing
    this.messageQueue.push(message);

    // Show typing indicator
    await ctx.sendChatAction('typing');

    if (this.telegramConfig.enableLogging) {
      this.logger.info(
        `Received message from ${message.username || message.firstName}: ${message.text}`
      );
    }
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (
      this.isProcessingQueue ||
      this.messageQueue.length === 0 ||
      !this.agent
    ) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.processMessage(message);
      }
    } catch (error) {
      this.logger.error('Error processing message queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process a single message through the agent
   */
  private async processMessage(message: TelegramMessage): Promise<void> {
    if (!this.agent) return;

    try {
      // Process message through agent (action creation handled internally)

      // Store message in agent memory if available
      if (this.agent.memory) {
        await this.agent.memory.store(this.agent.id, {
          id: `telegram_msg_${message.messageId}`,
          agentId: this.agent.id,
          type: MemoryType.INTERACTION,
          content: `Telegram message from ${message.username || message.firstName}: ${message.text}`,
          metadata: {
            platform: 'telegram',
            chatId: message.chatId,
            userId: message.userId,
            username: message.username,
          },
          importance: 0.7,
          timestamp: message.timestamp,
          tags: ['telegram', 'conversation', 'user_input'],
          duration: MemoryDuration.WORKING,
        });
      }

      // Generate response using agent's portal
      let responseText = '';

      if (this.agent.portal) {
        // Use agent's AI portal to generate response
        try {
          // Use the portal to generate a chat response
          const systemPrompt = `You are ${this.agent.name}, ${this.agent.config.lore?.origin || 'an AI assistant'}. 
Your personality: ${this.agent.config.core?.personality?.join(', ') || 'helpful and friendly'}.
Communication style: ${this.agent.config.core?.tone || 'neutral'}.
Current emotion: ${this.agent.emotion?.current || 'neutral'}`;

          const chatResponse = await this.agent.portal.generateChat(
            [
              {
                role: MessageRole.SYSTEM,
                content: systemPrompt,
              },
              {
                role: MessageRole.USER,
                content: message.text,
              },
            ],
            {
              temperature: 0.8,
              maxTokens: 1000,
            }
          );

          responseText =
            chatResponse.message.content ||
            "I'm having trouble forming a response right now.";
        } catch (error) {
          this.logger.error('Error using portal:', error);
          // Try using cognition as fallback
          if (this.agent.cognition) {
            const response = await this.agent.cognition.think(this.agent, {
              events: [
                {
                  id: `telegram_event_${Date.now()}`,
                  type: 'user_input',
                  source: 'telegram',
                  data: { message: message.text },
                  timestamp: message.timestamp,
                  processed: false,
                },
              ],
              memories: [],
              currentState: {} as any,
              environment: {} as any,
              goal: 'Respond helpfully to the user message',
            });
            responseText = `I am thinking about: ${response.thoughts.length} events...`;
          } else {
            responseText = `Hello ${message.firstName || 'there'}! I received your message but I'm having technical difficulties.`;
          }
        }
      } else {
        // No portal available
        responseText = `Hello ${message.firstName || 'there'}! I received your message: "${message.text}" but I don't have an AI portal configured to generate responses.`;
      }

      // Send response back to Telegram
      await this.sendResponse({
        chatId: message.chatId,
        text: responseText,
        replyToMessageId: message.messageId,
      });

      // Log the interaction
      if (this.telegramConfig.enableLogging) {
        this.logger.info(
          `Sent response to ${message.username || message.firstName}: ${responseText.substring(0, 100)}...`
        );
      }
    } catch (error) {
      this.logger.error('Error processing message:', error);
      await this.sendError(
        message.chatId,
        'Sorry, I had trouble processing your message. Please try again.'
      );
    }
  }

  /**
   * Send a response to Telegram
   */
  private async sendResponse(response: TelegramResponse): Promise<void> {
    try {
      // Split long messages if needed
      const messages = this.splitMessage(response.text);

      for (let i = 0; i < messages.length; i++) {
        const messageText = messages[i];

        const sendOptions: any = {
          parse_mode: response.parseMode,
        };
        
        if (response.replyToMessageId && i === 0) {
          sendOptions.reply_parameters = { message_id: response.replyToMessageId };
        }

        await this.bot.telegram.sendMessage(response.chatId, messageText, sendOptions);

        // Small delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      this.logger.error('Error sending Telegram response:', error);
    }
  }

  /**
   * Send an error message
   */
  private async sendError(chatId: number, errorMessage: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, `❌ ${errorMessage}`);
    } catch (error) {
      this.logger.error('Error sending error message to Telegram:', error);
    }
  }

  /**
   * Split long messages to respect Telegram's character limit
   */
  private splitMessage(text: string): string[] {
    if (text.length <= this.telegramConfig.maxMessageLength!) {
      return [text];
    }

    const messages: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
      if (remainingText.length <= this.telegramConfig.maxMessageLength!) {
        messages.push(remainingText);
        break;
      }

      // Find a good breaking point (prefer sentence or paragraph breaks)
      let breakPoint = this.telegramConfig.maxMessageLength!;
      const lastSentence = remainingText.lastIndexOf('.', breakPoint);
      const lastParagraph = remainingText.lastIndexOf('\n\n', breakPoint);
      const lastSpace = remainingText.lastIndexOf(' ', breakPoint);

      if (lastParagraph > breakPoint - 200) {
        breakPoint = lastParagraph + 2;
      } else if (lastSentence > breakPoint - 200) {
        breakPoint = lastSentence + 1;
      } else if (lastSpace > breakPoint - 100) {
        breakPoint = lastSpace;
      }

      messages.push(remainingText.substring(0, breakPoint).trim());
      remainingText = remainingText.substring(breakPoint).trim();
    }

    return messages;
  }

  /**
   * Cleanup when stopping
   */
  async stop(): Promise<void> {
    this.enabled = false;

    try {
      await this.bot.stop();
      this.logger.info('Telegram bot stopped');
    } catch (error) {
      this.logger.error('Error stopping Telegram bot:', error);
    }
  }

  /**
   * Get extension metrics/status
   */
  getStatus(): Record<string, any> {
    return {
      enabled: this.enabled,
      agentConnected: !!this.agent,
      queuedMessages: this.messageQueue.length,
      isProcessing: this.isProcessingQueue,
      botUsername: this.bot.botInfo?.username,
      config: {
        commandPrefix: this.telegramConfig.commandPrefix,
        maxMessageLength: this.telegramConfig.maxMessageLength,
        enableLogging: this.telegramConfig.enableLogging,
        hasWhitelist: !!(
          this.telegramConfig.allowedUsers &&
          this.telegramConfig.allowedUsers.length > 0
        ),
      },
    };
  }

  /**
   * Cleanup method to properly stop the bot
   */
  async cleanup(): Promise<void> {
    if (this.bot && this.enabled) {
      try {
        console.log(
          `🧹 Stopping Telegram bot for agent ${this.agent?.name || 'unknown'}...`
        );
        await this.bot.stop();
        console.log(`✅ Telegram bot stopped cleanly`);
      } catch (error) {
        this.logger.warn('Error stopping Telegram bot:', error);
      }
    }
  }
}

/**
 * Factory function to create Telegram extension
 */
export function createTelegramExtension(config: any): TelegramExtension {
  const telegramConfig: TelegramConfig = {
    enabled: config.enabled || false,
    botToken: config.botToken || config.settings?.botToken || '',
    settings: {
      botToken: config.botToken || config.settings?.botToken || '',
      allowedUsers: config.allowedUsers || config.settings?.allowedUsers || [],
      commandPrefix:
        config.commandPrefix || config.settings?.commandPrefix || '/',
      maxMessageLength:
        config.maxMessageLength || config.settings?.maxMessageLength || 4096,
      enableLogging: config.enableLogging !== false,
      ...config.settings,
    },
  };
  return new TelegramExtension(telegramConfig);
}

/**
 * Default configuration for Telegram extension
 */
export const defaultTelegramConfig: Partial<TelegramConfig> = {
  enabled: false,
  settings: {
    commandPrefix: '/',
    maxMessageLength: 4096,
    enableLogging: true,
    allowedUsers: [], // Empty means no whitelist
    botToken: '',
  },
};
