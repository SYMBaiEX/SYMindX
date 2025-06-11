/**
 * Telegram Extension Types
 * 
 * Type definitions for the Telegram extension with improved type safety using enums.
 */

/**
 * Telegram action types enum
 */
export enum TelegramActionType {
  // Message actions
  SEND_MESSAGE = 'send_message',
  EDIT_MESSAGE = 'edit_message',
  DELETE_MESSAGE = 'delete_message',
  PIN_MESSAGE = 'pin_message',
  UNPIN_MESSAGE = 'unpin_message',
  
  // Media actions
  SEND_PHOTO = 'send_photo',
  SEND_VIDEO = 'send_video',
  SEND_AUDIO = 'send_audio',
  SEND_DOCUMENT = 'send_document',
  SEND_STICKER = 'send_sticker',
  SEND_LOCATION = 'send_location',
  
  // Chat actions
  JOIN_CHAT = 'join_chat',
  LEAVE_CHAT = 'leave_chat',
  GET_CHAT_INFO = 'get_chat_info',
  GET_CHAT_MEMBERS = 'get_chat_members',
  
  // User actions
  GET_USER_INFO = 'get_user_info',
  BAN_USER = 'ban_user',
  UNBAN_USER = 'unban_user',
  RESTRICT_USER = 'restrict_user',
  PROMOTE_USER = 'promote_user',
  
  // Bot actions
  SET_COMMANDS = 'set_commands',
  DELETE_COMMANDS = 'delete_commands',
  GET_UPDATES = 'get_updates',
  
  // Inline actions
  ANSWER_INLINE_QUERY = 'answer_inline_query',
  ANSWER_CALLBACK_QUERY = 'answer_callback_query'
}

/**
 * Telegram error types enum
 */
export enum TelegramErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  PERMISSION_DENIED = 'permission_denied',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  INVALID_REQUEST = 'invalid_request',
  BOT_BLOCKED = 'bot_blocked',
  CHAT_NOT_FOUND = 'chat_not_found',
  USER_NOT_FOUND = 'user_not_found',
  INTERNAL_ERROR = 'internal_error',
  API_ERROR = 'api_error'
}

/**
 * Telegram chat type enum
 */
export enum TelegramChatType {
  PRIVATE = 'private',
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel'
}

/**
 * Telegram message entity type enum
 */
export enum TelegramMessageEntityType {
  MENTION = 'mention',
  HASHTAG = 'hashtag',
  CASHTAG = 'cashtag',
  BOT_COMMAND = 'bot_command',
  URL = 'url',
  EMAIL = 'email',
  PHONE_NUMBER = 'phone_number',
  BOLD = 'bold',
  ITALIC = 'italic',
  UNDERLINE = 'underline',
  STRIKETHROUGH = 'strikethrough',
  CODE = 'code',
  PRE = 'pre',
  TEXT_LINK = 'text_link',
  TEXT_MENTION = 'text_mention'
}

/**
 * Telegram media type enum
 */
export enum TelegramMediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  STICKER = 'sticker',
  ANIMATION = 'animation',
  VOICE = 'voice',
  VIDEO_NOTE = 'video_note'
}

/**
 * Telegram configuration interface
 */
export interface TelegramConfig {
  token: string;
  webhookUrl?: string;
  useWebhook?: boolean;
  pollingTimeout?: number;
  pollingLimit?: number;
  rateLimits?: Record<TelegramActionType, TelegramRateLimit>;
  rateLimitBuffer?: number; // milliseconds to wait between actions
  sessionPersistence?: TelegramSessionConfig;
}

export interface TelegramRateLimit {
  requests: number;
  window: number; // in milliseconds
}

export interface TelegramSessionConfig {
  enabled: boolean;
  sessionPath?: string;
}

/**
 * Telegram user interface
 */
export interface TelegramUser {
  id: number;
  isBot: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

/**
 * Telegram chat interface
 */
export interface TelegramChat {
  id: number;
  type: TelegramChatType;
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  description?: string;
  inviteLink?: string;
  permissions?: TelegramChatPermissions;
}

/**
 * Telegram chat permissions interface
 */
export interface TelegramChatPermissions {
  canSendMessages?: boolean;
  canSendMediaMessages?: boolean;
  canSendPolls?: boolean;
  canSendOtherMessages?: boolean;
  canAddWebPagePreviews?: boolean;
  canChangeInfo?: boolean;
  canInviteUsers?: boolean;
  canPinMessages?: boolean;
}

/**
 * Telegram message interface
 */
export interface TelegramMessage {
  messageId: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  audio?: TelegramAudio;
  document?: TelegramDocument;
  sticker?: TelegramSticker;
  caption?: string;
  captionEntities?: TelegramMessageEntity[];
  replyToMessage?: TelegramMessage;
}

/**
 * Telegram message entity interface
 */
export interface TelegramMessageEntity {
  type: TelegramMessageEntityType;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
}

/**
 * Telegram photo size interface
 */
export interface TelegramPhotoSize {
  fileId: string;
  fileUniqueId: string;
  width: number;
  height: number;
  fileSize?: number;
}

/**
 * Telegram video interface
 */
export interface TelegramVideo {
  fileId: string;
  fileUniqueId: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: TelegramPhotoSize;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

/**
 * Telegram audio interface
 */
export interface TelegramAudio {
  fileId: string;
  fileUniqueId: string;
  duration: number;
  performer?: string;
  title?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  thumbnail?: TelegramPhotoSize;
}

/**
 * Telegram document interface
 */
export interface TelegramDocument {
  fileId: string;
  fileUniqueId: string;
  thumbnail?: TelegramPhotoSize;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

/**
 * Telegram sticker interface
 */
export interface TelegramSticker {
  fileId: string;
  fileUniqueId: string;
  width: number;
  height: number;
  isAnimated: boolean;
  isVideo: boolean;
  thumbnail?: TelegramPhotoSize;
  emoji?: string;
  setName?: string;
  fileSize?: number;
}