/**
 * Telegram Extension Types
 */

export interface TelegramBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
  can_join_groups?: boolean
  can_read_all_group_messages?: boolean
  supports_inline_queries?: boolean
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramMessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: TelegramUser
  language?: string
}

export interface TelegramInlineKeyboardButton {
  text: string
  url?: string
  callback_data?: string
  web_app?: { url: string }
  switch_inline_query?: string
  switch_inline_query_current_chat?: string
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][]
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: { text: string }[][]
  resize_keyboard?: boolean
  one_time_keyboard?: boolean
  selective?: boolean
}

export interface TelegramSendMessageOptions {
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  entities?: TelegramMessageEntity[]
  disable_web_page_preview?: boolean
  disable_notification?: boolean
  protect_content?: boolean
  reply_to_message_id?: number
  allow_sending_without_reply?: boolean
  reply_markup?: TelegramInlineKeyboardMarkup | TelegramReplyKeyboardMarkup
}

export interface TelegramWebhookInfo {
  url: string
  has_custom_certificate: boolean
  pending_update_count: number
  ip_address?: string
  last_error_date?: number
  last_error_message?: string
  last_synchronization_error_date?: number
  max_connections?: number
  allowed_updates?: string[]
}

export interface TelegramCommandScope {
  type: 'default' | 'all_private_chats' | 'all_group_chats' | 'all_chat_administrators' | 'chat' | 'chat_administrators' | 'chat_member'
  chat_id?: number
  user_id?: number
}

export interface TelegramBotCommand {
  command: string
  description: string
}

export interface TelegramAnalytics {
  totalMessages: number
  totalUsers: number
  totalChats: number
  messagesPerHour: Record<string, number>
  topCommands: Record<string, number>
  errorCount: number
  responseTimeAvg: number
}

export interface TelegramConversationContext {
  chatId: number
  userId: number
  messageHistory: Array<{
    text: string
    timestamp: Date
    isBot: boolean
  }>
  lastActivity: Date
  metadata: Record<string, any>
}

export interface TelegramRateLimitConfig {
  messagesPerMinute: number
  messagesPerHour: number
  burstLimit: number
  timeWindow: number
}