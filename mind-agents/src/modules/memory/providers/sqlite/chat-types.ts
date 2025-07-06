/**
 * Chat System Types for SYMindX
 * 
 * Type definitions for the persistent chat storage system
 */

import { AgentStatus } from '../../../../types/agent'

// ===================================================================
// ENUMS
// ===================================================================

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export enum SenderType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

export enum MessageType {
  TEXT = 'text',
  COMMAND = 'command',
  ACTION = 'action',
  NOTIFICATION = 'notification',
  ERROR = 'error'
}

export enum MessageStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export enum ParticipantType {
  USER = 'user',
  AGENT = 'agent'
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  OBSERVER = 'observer'
}

export enum ParticipantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned'
}

export enum AttachmentType {
  IMAGE = 'image',
  FILE = 'file',
  LINK = 'link',
  CODE = 'code',
  MEMORY = 'memory'
}

// ===================================================================
// INTERFACES
// ===================================================================

export interface Conversation {
  id: string
  agentId: string
  userId: string
  title?: string
  status: ConversationStatus
  createdAt: Date
  updatedAt: Date
  lastMessageAt?: Date
  messageCount: number
  metadata: Record<string, any>
  deletedAt?: Date
  deletedBy?: string
}

export interface Message {
  id: string
  conversationId: string
  senderType: SenderType
  senderId: string
  content: string
  messageType: MessageType
  timestamp: Date
  editedAt?: Date
  metadata: Record<string, any>
  
  // Agent-specific fields
  emotionState?: EmotionSnapshot
  thoughtProcess?: string[]
  confidenceScore?: number
  
  // Memory integration
  memoryReferences: string[]
  createdMemories: string[]
  
  // Status tracking
  status: MessageStatus
  readAt?: Date
  
  // Soft delete
  deletedAt?: Date
  deletedBy?: string
}

export interface EmotionSnapshot {
  current: string
  intensity: number
  triggers: string[]
  timestamp: Date
}

export interface Participant {
  id: string
  conversationId: string
  participantType: ParticipantType
  participantId: string
  participantName?: string
  joinedAt: Date
  leftAt?: Date
  role: ParticipantRole
  lastSeenAt?: Date
  lastTypedAt?: Date
  messageCount: number
  notificationsEnabled: boolean
  preferences: Record<string, any>
  status: ParticipantStatus
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  reaction: string
  createdAt: Date
}

export interface ConversationTag {
  id: string
  conversationId: string
  tag: string
  createdAt: Date
  createdBy: string
}

export interface MessageAttachment {
  id: string
  messageId: string
  attachmentType: AttachmentType
  filename?: string
  mimeType?: string
  size?: number
  url?: string
  metadata: Record<string, any>
  createdAt: Date
}

export interface ChatSession {
  id: string
  userId: string
  conversationId: string
  connectionId?: string
  startedAt: Date
  lastActivityAt: Date
  endedAt?: Date
  clientInfo: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export interface AnalyticsEvent {
  id: string
  eventType: string
  conversationId?: string
  userId?: string
  agentId?: string
  eventData: Record<string, any>
  timestamp: Date
  processingTime?: number
  tokensUsed?: number
}

// ===================================================================
// QUERY INTERFACES
// ===================================================================

export interface ConversationQuery {
  userId?: string
  agentId?: string
  status?: ConversationStatus
  hasUnread?: boolean
  limit?: number
  offset?: number
  orderBy?: 'created' | 'updated' | 'lastMessage'
  orderDirection?: 'asc' | 'desc'
}

export interface MessageQuery {
  conversationId?: string
  senderId?: string
  senderType?: SenderType
  messageType?: MessageType
  status?: MessageStatus
  searchText?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
  includeDeleted?: boolean
}

export interface ConversationWithLastMessage extends Conversation {
  lastMessageContent?: string
  lastMessageSenderType?: SenderType
  lastMessageTimestamp?: Date
  participantCount: number
  activeParticipantCount: number
}

export interface ConversationStats {
  conversationId: string
  messageCount: number
  uniqueSenders: number
  firstMessageAt?: Date
  lastMessageAt?: Date
  avgConfidence?: number
  userMessageCount: number
  agentMessageCount: number
  commandCount: number
  failedMessageCount: number
}

// ===================================================================
// REPOSITORY INTERFACES
// ===================================================================

export interface ChatRepository {
  // Conversation operations
  createConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation>
  getConversation(id: string): Promise<Conversation | null>
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>
  deleteConversation(id: string, deletedBy: string): Promise<void>
  listConversations(query: ConversationQuery): Promise<ConversationWithLastMessage[]>
  
  // Message operations
  createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message>
  getMessage(id: string): Promise<Message | null>
  updateMessage(id: string, updates: Partial<Message>): Promise<void>
  deleteMessage(id: string, deletedBy: string): Promise<void>
  listMessages(query: MessageQuery): Promise<Message[]>
  searchMessages(conversationId: string, searchText: string, limit?: number): Promise<Message[]>
  
  // Participant operations
  addParticipant(participant: Omit<Participant, 'id' | 'joinedAt'>): Promise<Participant>
  removeParticipant(conversationId: string, participantId: string): Promise<void>
  updateParticipant(id: string, updates: Partial<Participant>): Promise<void>
  listParticipants(conversationId: string): Promise<Participant[]>
  updateLastSeen(conversationId: string, participantId: string): Promise<void>
  
  // Session operations
  createSession(session: Omit<ChatSession, 'id' | 'startedAt' | 'lastActivityAt'>): Promise<ChatSession>
  updateSessionActivity(sessionId: string): Promise<void>
  endSession(sessionId: string): Promise<void>
  getActiveSessions(conversationId?: string): Promise<ChatSession[]>
  
  // Analytics operations
  logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void>
  getConversationStats(conversationId: string): Promise<ConversationStats>
  
  // Utility operations
  cleanupExpiredSessions(maxAge: number): Promise<number>
  archiveOldConversations(daysOld: number): Promise<number>
}

// ===================================================================
// INTEGRATION TYPES
// ===================================================================

export interface ChatMemoryIntegration {
  // Link chat messages to memory records
  linkMessageToMemories(messageId: string, memoryIds: string[]): Promise<void>
  
  // Create memories from chat messages
  createMemoryFromMessage(message: Message, agentId: string): Promise<string>
  
  // Retrieve memories referenced in a conversation
  getConversationMemories(conversationId: string): Promise<string[]>
}

export interface ChatEventHandlers {
  onMessageReceived?: (message: Message) => Promise<void>
  onMessageSent?: (message: Message) => Promise<void>
  onConversationCreated?: (conversation: Conversation) => Promise<void>
  onConversationArchived?: (conversationId: string) => Promise<void>
  onParticipantJoined?: (participant: Participant) => Promise<void>
  onParticipantLeft?: (conversationId: string, participantId: string) => Promise<void>
  onTypingStarted?: (conversationId: string, participantId: string) => Promise<void>
  onTypingStopped?: (conversationId: string, participantId: string) => Promise<void>
}

// ===================================================================
// FACTORY FUNCTION TYPE
// ===================================================================

export interface ChatSystemConfig {
  dbPath: string
  enableAnalytics?: boolean
  enableFullTextSearch?: boolean
  sessionTimeout?: number // milliseconds
  archiveAfterDays?: number
  maxMessageLength?: number
  maxParticipantsPerConversation?: number
}