/**
 * Shared Chat Repository Implementation for SYMindX
 * 
 * Abstract base class providing common chat operations for all memory providers
 */

import { BaseRepository, QueryOptions } from '../database/BaseRepository';
import { ConnectionPool } from '../database/DatabaseConnection';
import { QueryBuilder } from '../database/QueryBuilder';
import { buildObject } from '../../../utils/type-helpers';
import {
  ChatRepository,
  ChatSystemConfig,
  Conversation,
  ConversationQuery,
  ConversationStatus,
  ConversationStats,
  ConversationWithLastMessage,
  Message,
  MessageQuery,
  MessageStatus,
  MessageType,
  SenderType,
  Participant,
  ParticipantType,
  ParticipantRole,
  ParticipantStatus,
  ChatSession,
  AnalyticsEvent,
} from '../../memory/providers/sqlite/chat-types';

export abstract class SharedChatRepository extends BaseRepository<Conversation> implements ChatRepository {
  protected connection: ConnectionPool;
  protected config: ChatSystemConfig;
  
  constructor(connection: ConnectionPool, config: ChatSystemConfig) {
    super({
      tableName: 'conversations',
      idPrefix: 'conv',
      enableSoftDelete: true,
      enableTimestamps: true,
    });
    this.connection = connection;
    this.config = config;
  }
  
  // ===================================================================
  // CONVERSATION OPERATIONS
  // ===================================================================
  
  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'messageCount' | 'metadata'> & 
    { metadata?: Record<string, unknown> }
  ): Promise<Conversation> {
    const id = this.generateId();
    const now = new Date();
    
    const data = {
      id,
      agent_id: conversation.agentId,
      user_id: conversation.userId,
      title: conversation.title || null,
      status: conversation.status || ConversationStatus.ACTIVE,
      created_at: now,
      updated_at: now,
      message_count: 0,
      metadata: JSON.stringify(conversation.metadata || {})
    };
    
    await this.connection.transaction(async (client) => {
      // Insert conversation
      const { sql, params } = QueryBuilder.from('conversations').buildInsert(data);
      await client.execute(sql, params);
      
      // Add participants
      await this.addParticipantInTransaction(client, {
        conversationId: id,
        participantType: ParticipantType.USER,
        participantId: conversation.userId,
        role: ParticipantRole.OWNER,
        messageCount: 0,
        notificationsEnabled: true,
        preferences: {},
        status: ParticipantStatus.ACTIVE,
      });
      
      await this.addParticipantInTransaction(client, {
        conversationId: id,
        participantType: ParticipantType.AGENT,
        participantId: conversation.agentId,
        role: ParticipantRole.MEMBER,
        messageCount: 0,
        notificationsEnabled: true,
        preferences: {},
        status: ParticipantStatus.ACTIVE,
      });
    });
    
    console.log(`💬 Created conversation ${id} between user ${conversation.userId} and agent ${conversation.agentId}`);
    
    return {
      id,
      agentId: conversation.agentId,
      userId: conversation.userId,
      title: conversation.title,
      status: conversation.status || ConversationStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: 0,
      metadata: conversation.metadata || {},
      deletedAt: conversation.deletedAt,
      deletedBy: conversation.deletedBy,
    };
  }
  
  async getConversation(id: string): Promise<Conversation | null> {
    const { sql, params } = QueryBuilder
      .from('conversations')
      .where('id', '=', id)
      .where('deleted_at', 'IS NULL')
      .buildSelect();
    
    const rows = await this.connection.query(sql, params);
    if (rows.length === 0) return null;
    
    return this.transformFromStorage(rows[0]);
  }
  
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const data: any = {};
    
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.metadata !== undefined) data.metadata = JSON.stringify(updates.metadata);
    
    if (Object.keys(data).length === 0) return;
    
    data.updated_at = new Date();
    
    const { sql, params } = QueryBuilder
      .from('conversations')
      .where('id', '=', id)
      .buildUpdate(data);
    
    await this.connection.execute(sql, params);
  }
  
  async deleteConversation(id: string, deletedBy: string): Promise<void> {
    const data = {
      status: ConversationStatus.DELETED,
      deleted_at: new Date(),
      deleted_by: deletedBy,
      updated_at: new Date()
    };
    
    const { sql, params } = QueryBuilder
      .from('conversations')
      .where('id', '=', id)
      .buildUpdate(data);
    
    await this.connection.execute(sql, params);
  }
  
  async listConversations(query: ConversationQuery): Promise<ConversationWithLastMessage[]> {
    const qb = QueryBuilder.from('conversations c')
      .select(
        'c.*',
        'm.content as last_message_content',
        'm.sender_type as last_message_sender_type',
        'm.timestamp as last_message_timestamp',
        '(SELECT COUNT(*) FROM participants WHERE conversation_id = c.id) as participant_count',
        '(SELECT COUNT(*) FROM participants WHERE conversation_id = c.id AND status = \'active\') as active_participant_count'
      )
      .leftJoin('messages m', 'm.id = (SELECT id FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY timestamp DESC LIMIT 1)')
      .where('c.deleted_at', 'IS NULL');
    
    if (query.userId) qb.where('c.user_id', '=', query.userId);
    if (query.agentId) qb.where('c.agent_id', '=', query.agentId);
    if (query.status) qb.where('c.status', '=', query.status);
    
    const orderColumn = {
      created: 'c.created_at',
      updated: 'c.updated_at',
      lastMessage: 'c.last_message_at',
    }[query.orderBy || 'updated'] || 'c.updated_at';
    
    qb.orderBy(orderColumn, query.orderDirection?.toUpperCase() as 'ASC' | 'DESC' || 'DESC');
    
    if (query.limit) qb.limit(query.limit);
    if (query.offset) qb.offset(query.offset);
    
    const { sql, params } = qb.buildSelect();
    const rows = await this.connection.query(sql, params);
    
    return rows.map((row: any) => this.rowToConversationWithLastMessage(row));
  }
  
  // ===================================================================
  // MESSAGE OPERATIONS
  // ===================================================================
  
  async createMessage(
    message: Omit<Message, 'id' | 'timestamp' | 'metadata' | 'memoryReferences' | 'createdMemories' | 'status'> & {
      metadata?: Record<string, unknown>;
      memoryReferences?: string[];
      createdMemories?: string[];
      status?: MessageStatus;
    }
  ): Promise<Message> {
    const id = this.generateId().replace('conv', 'msg');
    const timestamp = new Date();
    
    const data = {
      id,
      conversation_id: message.conversationId,
      sender_type: message.senderType,
      sender_id: message.senderId,
      content: message.content,
      message_type: message.messageType || MessageType.TEXT,
      timestamp,
      metadata: JSON.stringify(message.metadata || {}),
      emotion_state: message.emotionState ? JSON.stringify(message.emotionState) : null,
      thought_process: message.thoughtProcess ? JSON.stringify(message.thoughtProcess) : null,
      confidence_score: message.confidenceScore || null,
      memory_references: JSON.stringify(message.memoryReferences || []),
      created_memories: JSON.stringify(message.createdMemories || []),
      status: message.status || MessageStatus.SENT
    };
    
    await this.connection.transaction(async (client) => {
      // Insert message
      const { sql, params } = QueryBuilder.from('messages').buildInsert(data);
      await client.execute(sql, params);
      
      // Update conversation
      const updateConv = QueryBuilder
        .from('conversations')
        .where('id', '=', message.conversationId)
        .buildUpdate({
          last_message_at: timestamp,
          message_count: this.connection.type === 'sqlite' 
            ? { raw: 'message_count + 1' } 
            : { raw: 'message_count + 1' },
          updated_at: timestamp
        });
      await client.execute(updateConv.sql, updateConv.params);
      
      // Update participant message count
      const updatePart = QueryBuilder
        .from('participants')
        .where('conversation_id', '=', message.conversationId)
        .where('participant_id', '=', message.senderId)
        .buildUpdate({
          message_count: this.connection.type === 'sqlite'
            ? { raw: 'message_count + 1' }
            : { raw: 'message_count + 1' }
        });
      await client.execute(updatePart.sql, updatePart.params);
    });
    
    console.log(`📝 Created message ${id} in conversation ${message.conversationId}`);
    
    return {
      id,
      conversationId: message.conversationId,
      senderType: message.senderType,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType || MessageType.TEXT,
      timestamp,
      editedAt: message.editedAt,
      metadata: message.metadata || {},
      emotionState: message.emotionState,
      thoughtProcess: message.thoughtProcess,
      confidenceScore: message.confidenceScore,
      memoryReferences: message.memoryReferences || [],
      createdMemories: message.createdMemories || [],
      status: message.status || MessageStatus.SENT,
      deletedAt: message.deletedAt,
      deletedBy: message.deletedBy,
    };
  }
  
  async getMessage(id: string): Promise<Message | null> {
    const { sql, params } = QueryBuilder
      .from('messages')
      .where('id', '=', id)
      .where('deleted_at', 'IS NULL')
      .buildSelect();
    
    const rows = await this.connection.query(sql, params);
    if (rows.length === 0) return null;
    
    return this.rowToMessage(rows[0]);
  }
  
  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const data: any = {};
    
    if (updates.content !== undefined) {
      data.content = updates.content;
      data.edited_at = new Date();
    }
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.readAt !== undefined) data.read_at = updates.readAt;
    
    if (Object.keys(data).length === 0) return;
    
    const { sql, params } = QueryBuilder
      .from('messages')
      .where('id', '=', id)
      .buildUpdate(data);
    
    await this.connection.execute(sql, params);
  }
  
  async deleteMessage(id: string, deletedBy: string): Promise<void> {
    const data = {
      deleted_at: new Date(),
      deleted_by: deletedBy
    };
    
    const { sql, params } = QueryBuilder
      .from('messages')
      .where('id', '=', id)
      .buildUpdate(data);
    
    await this.connection.execute(sql, params);
  }
  
  async listMessages(query: MessageQuery): Promise<Message[]> {
    const qb = QueryBuilder.from('messages');
    
    if (!query.includeDeleted) {
      qb.where('deleted_at', 'IS NULL');
    }
    
    if (query.conversationId) qb.where('conversation_id', '=', query.conversationId);
    if (query.senderId) qb.where('sender_id', '=', query.senderId);
    if (query.senderType) qb.where('sender_type', '=', query.senderType);
    if (query.messageType) qb.where('message_type', '=', query.messageType);
    if (query.status) qb.where('status', '=', query.status);
    if (query.searchText) qb.where('content', 'LIKE', `%${query.searchText}%`);
    if (query.startDate) qb.where('timestamp', '>=', query.startDate);
    if (query.endDate) qb.where('timestamp', '<=', query.endDate);
    
    qb.orderBy('timestamp', 'DESC');
    
    if (query.limit) qb.limit(query.limit);
    if (query.offset) qb.offset(query.offset);
    
    const { sql, params } = qb.buildSelect();
    const rows = await this.connection.query(sql, params);
    
    return rows.map((row: any) => this.rowToMessage(row));
  }
  
  // Abstract methods that must be implemented by specific providers
  abstract searchMessages(conversationId: string, searchText: string, limit?: number): Promise<Message[]>;
  
  // ===================================================================
  // PARTICIPANT OPERATIONS
  // ===================================================================
  
  async addParticipant(
    participant: Omit<Participant, 'id' | 'joinedAt' | 'messageCount' | 'preferences'> & {
      messageCount?: number;
      preferences?: Record<string, any>;
    }
  ): Promise<Participant> {
    return this.connection.transaction(async (client) => {
      return this.addParticipantInTransaction(client, participant);
    });
  }
  
  protected async addParticipantInTransaction(
    client: any,
    participant: Omit<Participant, 'id' | 'joinedAt' | 'messageCount' | 'preferences'> & {
      messageCount?: number;
      preferences?: Record<string, any>;
    }
  ): Promise<Participant> {
    const id = this.generateId().replace('conv', 'part');
    const joinedAt = new Date();
    
    const data = {
      id,
      conversation_id: participant.conversationId,
      participant_type: participant.participantType,
      participant_id: participant.participantId,
      participant_name: participant.participantName || null,
      joined_at: joinedAt,
      role: participant.role,
      message_count: 0,
      notifications_enabled: participant.notificationsEnabled ? 1 : 0,
      preferences: JSON.stringify(participant.preferences || {}),
      status: participant.status
    };
    
    const { sql, params } = QueryBuilder.from('participants').buildInsert(data);
    await client.execute(sql, params);
    
    return {
      id,
      conversationId: participant.conversationId,
      participantType: participant.participantType,
      participantId: participant.participantId,
      participantName: participant.participantName,
      joinedAt,
      leftAt: participant.leftAt,
      role: participant.role,
      lastSeenAt: participant.lastSeenAt,
      lastTypedAt: participant.lastTypedAt,
      messageCount: participant.messageCount || 0,
      notificationsEnabled: participant.notificationsEnabled,
      preferences: participant.preferences || {},
      status: participant.status,
    };
  }
  
  // ===================================================================
  // SESSION OPERATIONS
  // ===================================================================
  
  async createSession(
    session: Omit<ChatSession, 'id' | 'startedAt' | 'lastActivityAt' | 'clientInfo'> & {
      clientInfo?: Record<string, any>;
    }
  ): Promise<ChatSession> {
    const id = this.generateId().replace('conv', 'sess');
    const now = new Date();
    
    const data = {
      id,
      user_id: session.userId,
      conversation_id: session.conversationId,
      connection_id: session.connectionId || null,
      started_at: now,
      last_activity_at: now,
      client_info: JSON.stringify(session.clientInfo || {}),
      ip_address: session.ipAddress || null,
      user_agent: session.userAgent || null
    };
    
    const { sql, params } = QueryBuilder.from('chat_sessions').buildInsert(data);
    await this.connection.execute(sql, params);
    
    return {
      id,
      userId: session.userId,
      conversationId: session.conversationId,
      connectionId: session.connectionId,
      startedAt: now,
      lastActivityAt: now,
      endedAt: session.endedAt,
      clientInfo: session.clientInfo || {},
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };
  }
  
  // ===================================================================
  // ANALYTICS OPERATIONS
  // ===================================================================
  
  async logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    if (this.config.enableAnalytics === false) return;
    
    const id = this.generateId().replace('conv', 'evt');
    const timestamp = new Date();
    
    const data = {
      id,
      event_type: event.eventType,
      conversation_id: event.conversationId || null,
      user_id: event.userId || null,
      agent_id: event.agentId || null,
      event_data: JSON.stringify(event.eventData || {}),
      timestamp,
      processing_time: event.processingTime || null,
      tokens_used: event.tokensUsed || null
    };
    
    try {
      const { sql, params } = QueryBuilder.from('analytics_events').buildInsert(data);
      await this.connection.execute(sql, params);
    } catch (error) {
      console.warn('Failed to log analytics event:', error);
    }
  }
  
  async getConversationStats(conversationId: string): Promise<ConversationStats> {
    const sql = `
      SELECT 
        ? as conversation_id,
        COUNT(*) as message_count,
        COUNT(DISTINCT sender_id) as unique_senders,
        MIN(timestamp) as first_message_at,
        MAX(timestamp) as last_message_at,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN sender_type = 'user' THEN 1 END) as user_message_count,
        COUNT(CASE WHEN sender_type = 'agent' THEN 1 END) as agent_message_count,
        COUNT(CASE WHEN message_type = 'command' THEN 1 END) as command_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_message_count
      FROM messages
      WHERE conversation_id = ? AND deleted_at IS NULL
    `;
    
    const rows = await this.connection.query(sql, [conversationId, conversationId]);
    const row = rows[0];
    
    return buildObject<ConversationStats>({
      conversationId,
      messageCount: row.message_count || 0,
      uniqueSenders: row.unique_senders || 0,
      userMessageCount: row.user_message_count || 0,
      agentMessageCount: row.agent_message_count || 0,
      commandCount: row.command_count || 0,
      failedMessageCount: row.failed_message_count || 0,
    })
      .addOptional(
        'firstMessageAt',
        row.first_message_at ? new Date(row.first_message_at) : undefined
      )
      .addOptional(
        'lastMessageAt',
        row.last_message_at ? new Date(row.last_message_at) : undefined
      )
      .addOptional('avgConfidence', row.avg_confidence || undefined)
      .build();
  }
  
  // ===================================================================
  // UTILITY OPERATIONS - Must be implemented by specific providers
  // ===================================================================
  
  abstract removeParticipant(conversationId: string, participantId: string): Promise<void>;
  abstract updateParticipant(id: string, updates: Partial<Participant>): Promise<void>;
  abstract listParticipants(conversationId: string): Promise<Participant[]>;
  abstract updateLastSeen(conversationId: string, participantId: string): Promise<void>;
  abstract updateSessionActivity(sessionId: string): Promise<void>;
  abstract endSession(sessionId: string): Promise<void>;
  abstract getActiveSessions(conversationId?: string): Promise<ChatSession[]>;
  abstract cleanupExpiredSessions(maxAge: number): Promise<number>;
  abstract archiveOldConversations(daysOld: number): Promise<number>;
  
  // ===================================================================
  // HELPER METHODS
  // ===================================================================
  
  protected rowToConversation(row: any): Conversation {
    return buildObject<Conversation>({
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      title: row.title,
      status: row.status as ConversationStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
    })
      .addOptional(
        'lastMessageAt',
        row.last_message_at ? new Date(row.last_message_at) : undefined
      )
      .addOptional(
        'deletedAt',
        row.deleted_at ? new Date(row.deleted_at) : undefined
      )
      .addOptional('deletedBy', row.deleted_by)
      .build();
  }
  
  protected rowToConversationWithLastMessage(row: any): ConversationWithLastMessage {
    return buildObject<ConversationWithLastMessage>({
      ...this.rowToConversation(row),
      lastMessageContent: row.last_message_content,
      lastMessageSenderType: row.last_message_sender_type as SenderType,
      participantCount: row.participant_count || 0,
      activeParticipantCount: row.active_participant_count || 0,
    })
      .addOptional(
        'lastMessageTimestamp',
        row.last_message_timestamp
          ? new Date(row.last_message_timestamp)
          : undefined
      )
      .build();
  }
  
  protected rowToMessage(row: any): Message {
    return buildObject<Message>({
      id: row.id,
      conversationId: row.conversation_id,
      senderType: row.sender_type as SenderType,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type as MessageType,
      timestamp: new Date(row.timestamp),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      memoryReferences: typeof row.memory_references === 'string' 
        ? JSON.parse(row.memory_references) 
        : row.memory_references || [],
      createdMemories: typeof row.created_memories === 'string'
        ? JSON.parse(row.created_memories)
        : row.created_memories || [],
      status: row.status as MessageStatus,
    })
      .addOptional(
        'editedAt',
        row.edited_at ? new Date(row.edited_at) : undefined
      )
      .addOptional(
        'emotionState',
        row.emotion_state 
          ? (typeof row.emotion_state === 'string' ? JSON.parse(row.emotion_state) : row.emotion_state)
          : undefined
      )
      .addOptional(
        'thoughtProcess',
        row.thought_process
          ? (typeof row.thought_process === 'string' ? JSON.parse(row.thought_process) : row.thought_process)
          : undefined
      )
      .addOptional('confidenceScore', row.confidence_score)
      .addOptional('readAt', row.read_at ? new Date(row.read_at) : undefined)
      .addOptional(
        'deletedAt',
        row.deleted_at ? new Date(row.deleted_at) : undefined
      )
      .addOptional('deletedBy', row.deleted_by)
      .build();
  }
  
  // Required BaseRepository implementations
  async create(data: Omit<Conversation, 'id'>): Promise<Conversation> {
    return this.createConversation(data);
  }
  
  async findById(id: string): Promise<Conversation | null> {
    return this.getConversation(id);
  }
  
  async find(query: Partial<Conversation>, options?: QueryOptions): Promise<Conversation[]> {
    const convQuery: ConversationQuery = {
      userId: query.userId,
      agentId: query.agentId,
      status: query.status,
      limit: options?.limit,
      offset: options?.offset,
    };
    
    const results = await this.listConversations(convQuery);
    return results.map(r => ({
      id: r.id,
      agentId: r.agentId,
      userId: r.userId,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      lastMessageAt: r.lastMessageAt,
      messageCount: r.messageCount,
      metadata: r.metadata,
      deletedAt: r.deletedAt,
      deletedBy: r.deletedBy,
    }));
  }
  
  async update(id: string, updates: Partial<Conversation>): Promise<void> {
    return this.updateConversation(id, updates);
  }
  
  async delete(id: string): Promise<void> {
    return this.deleteConversation(id, 'system');
  }
  
  async batch(operations: any[]): Promise<void> {
    // Implement batch operations if needed
    throw new Error('Batch operations not implemented');
  }
  
  async count(query: Partial<Conversation>): Promise<number> {
    const qb = QueryBuilder.from('conversations');
    
    if (query.userId) qb.where('user_id', '=', query.userId);
    if (query.agentId) qb.where('agent_id', '=', query.agentId);
    if (query.status) qb.where('status', '=', query.status);
    qb.where('deleted_at', 'IS NULL');
    
    const { sql, params } = qb.buildCount();
    const rows = await this.connection.query(sql, params);
    
    return rows[0]?.count || 0;
  }
  
  protected async archiveBeforeDate(date: Date): Promise<number> {
    return this.archiveOldConversations(Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
  }
  
  protected async validate(record: Partial<Conversation>): Promise<void> {
    if (!record.agentId) throw new Error('Agent ID is required');
    if (!record.userId) throw new Error('User ID is required');
  }
}