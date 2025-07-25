/**
 * Neon Chat Repository Implementation for SYMindX
 *
 * Implements the ChatRepository interface using Neon (PostgreSQL) with optimized connection pooling
 */

import { Pool } from 'pg';

import { runtimeLogger } from '../../../../utils/logger';
import { buildObject } from '../../../../utils/type-helpers';
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
} from '../sqlite/chat-types';

export interface NeonChatConfig extends ChatSystemConfig {
  connectionString: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class NeonChatRepository implements ChatRepository {
  private pool: Pool;
  private config: NeonChatConfig;

  constructor(config: NeonChatConfig) {
    this.config = config;

    // Configure connection pool optimized for Neon
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl !== false,
      max: config.maxConnections || 10,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
      allowExitOnIdle: true, // Important for serverless environments
    });

    // Initialize schema
    this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        // Check if tables exist
        const result = await client.query(
          "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'conversations'"
        );

        if (parseInt(result.rows[0].count) === 0) {
          runtimeLogger.warn(
            '📋 Chat tables not found. Please run the Neon chat schema SQL.'
          );
          runtimeLogger.info(
            'Schema location: src/modules/memory/providers/neon/chat-schema.sql'
          );
        }
      } finally {
        client.release();
      }
    } catch (error) {
      void error;
      console.warn('⚠️ Could not verify Neon chat schema:', error);
    }
  }

  // ===================================================================
  // CONVERSATION OPERATIONS
  // ===================================================================

  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Conversation> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert conversation
      const conversationResult = await client.query(
        `
        INSERT INTO conversations (agent_id, user_id, title, status, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [
          conversation.agentId,
          conversation.userId,
          conversation.title,
          conversation.status || ConversationStatus.ACTIVE,
          JSON.stringify(conversation.metadata || {}),
        ]
      );

      const conversationData = conversationResult.rows[0];

      // Add participants
      await client.query(
        `
        INSERT INTO participants (conversation_id, participant_type, participant_id, role, status, notifications_enabled, preferences)
        VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14)
      `,
        [
          conversationData.id,
          ParticipantType.USER,
          conversation.userId,
          ParticipantRole.OWNER,
          ParticipantStatus.ACTIVE,
          true,
          '{}',
          conversationData.id,
          ParticipantType.AGENT,
          conversation.agentId,
          ParticipantRole.MEMBER,
          ParticipantStatus.ACTIVE,
          true,
          '{}',
        ]
      );

      await client.query('COMMIT');

      const result = this.pgToConversation(conversationData);
      console.log(
        `💬 Created conversation ${result.id} between user ${conversation.userId} and agent ${conversation.agentId}`
      );
      return result;
    } catch (error) {
      void error;
      await client.query('ROLLBACK');
      throw new Error(`Failed to create conversation: ${error}`);
    } finally {
      client.release();
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM conversations WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) return null;
      return this.pgToConversation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE conversations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;

    const client = await this.pool.connect();
    try {
      await client.query(sql, values);
    } finally {
      client.release();
    }
  }

  async deleteConversation(id: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE conversations 
        SET status = $1, deleted_at = NOW(), deleted_by = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [ConversationStatus.DELETED, deletedBy, id]
      );
    } finally {
      client.release();
    }
  }

  async listConversations(
    query: ConversationQuery
  ): Promise<ConversationWithLastMessage[]> {
    let sql = `
      SELECT * FROM active_conversations_view
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (query.userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(query.userId);
    }
    if (query.agentId) {
      sql += ` AND agent_id = $${paramIndex++}`;
      params.push(query.agentId);
    }
    if (query.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(query.status);
    }

    // Apply ordering
    const orderBy = query.orderBy || 'updated';
    const orderDirection = query.orderDirection || 'desc';
    const orderColumn =
      {
        created: 'created_at',
        updated: 'updated_at',
        lastMessage: 'last_message_at',
      }[orderBy] || 'updated_at';

    sql += ` ORDER BY ${orderColumn} ${orderDirection.toUpperCase()}`;

    // Apply pagination
    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
      if (query.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(query.offset);
      }
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows.map((row) =>
        this.pgToConversationWithLastMessage(row)
      );
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // MESSAGE OPERATIONS
  // ===================================================================

  async createMessage(
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO messages (
          conversation_id, sender_type, sender_id, content, message_type,
          metadata, emotion_state, thought_process, confidence_score,
          memory_references, created_memories, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
        [
          message.conversationId,
          message.senderType,
          message.senderId,
          message.content,
          message.messageType || MessageType.TEXT,
          JSON.stringify(message.metadata || {}),
          message.emotionState ? JSON.stringify(message.emotionState) : null,
          message.thoughtProcess
            ? JSON.stringify(message.thoughtProcess)
            : null,
          message.confidenceScore,
          JSON.stringify(message.memoryReferences || []),
          JSON.stringify(message.createdMemories || []),
          message.status || MessageStatus.SENT,
        ]
      );

      const result2 = this.pgToMessage(result.rows[0]);
      console.log(
        `📝 Created message ${result2.id} in conversation ${message.conversationId}`
      );
      return result2;
    } finally {
      client.release();
    }
  }

  async getMessage(id: string): Promise<Message | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );

      if (result.rows.length === 0) return null;
      return this.pgToMessage(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
      fields.push(`edited_at = NOW()`);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.readAt !== undefined) {
      fields.push(`read_at = $${paramIndex++}`);
      values.push(updates.readAt.toISOString());
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    const client = await this.pool.connect();
    try {
      await client.query(sql, values);
    } finally {
      client.release();
    }
  }

  async deleteMessage(id: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE messages 
        SET deleted_at = NOW(), deleted_by = $1
        WHERE id = $2
      `,
        [deletedBy, id]
      );
    } finally {
      client.release();
    }
  }

  async listMessages(query: MessageQuery): Promise<Message[]> {
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (!query.includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    // Apply filters
    if (query.conversationId) {
      sql += ` AND conversation_id = $${paramIndex++}`;
      params.push(query.conversationId);
    }
    if (query.senderId) {
      sql += ` AND sender_id = $${paramIndex++}`;
      params.push(query.senderId);
    }
    if (query.senderType) {
      sql += ` AND sender_type = $${paramIndex++}`;
      params.push(query.senderType);
    }
    if (query.messageType) {
      sql += ` AND message_type = $${paramIndex++}`;
      params.push(query.messageType);
    }
    if (query.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(query.status);
    }
    if (query.searchText) {
      sql += ` AND (content ILIKE $${paramIndex++} OR search_vector @@ plainto_tsquery($${paramIndex++}))`;
      params.push(`%${query.searchText}%`);
      params.push(query.searchText);
    }
    if (query.startDate) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(query.startDate.toISOString());
    }
    if (query.endDate) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(query.endDate.toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    // Apply pagination
    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
      if (query.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(query.offset);
      }
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows.map((row) => this.pgToMessage(row));
    } finally {
      client.release();
    }
  }

  async searchMessages(
    conversationId: string,
    searchText: string,
    limit = 50
  ): Promise<Message[]> {
    const client = await this.pool.connect();
    try {
      // Try full-text search first
      const ftsResult = await client.query(
        `
        SELECT *, ts_rank(search_vector, plainto_tsquery($1)) as rank
        FROM messages
        WHERE conversation_id = $2 
          AND search_vector @@ plainto_tsquery($1)
          AND deleted_at IS NULL
        ORDER BY rank DESC, timestamp DESC
        LIMIT $3
      `,
        [searchText, conversationId, limit]
      );

      if (ftsResult.rows.length > 0) {
        return ftsResult.rows.map((row) => this.pgToMessage(row));
      }

      // Fallback to ILIKE search
      const likeResult = await client.query(
        `
        SELECT *
        FROM messages
        WHERE conversation_id = $1 
          AND content ILIKE $2
          AND deleted_at IS NULL
        ORDER BY timestamp DESC
        LIMIT $3
      `,
        [conversationId, `%${searchText}%`, limit]
      );

      return likeResult.rows.map((row) => this.pgToMessage(row));
    } finally {
      client.release();
    }
  }

  /**
   * Search messages using vector similarity (if vector extension available)
   */
  async searchMessagesBySimilarity(
    queryEmbedding: number[],
    conversationId?: string,
    similarityThreshold = 0.8,
    limit = 20
  ): Promise<Array<{ message: Message; similarity: number }>> {
    const client = await this.pool.connect();
    try {
      // Check if vector extension and embedding column exist
      const hasVector = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'embedding'
        )
      `);

      if (!hasVector.rows[0].exists) {
        return [];
      }

      let sql = `
        SELECT *, 1 - (embedding <=> $1::vector) as similarity
        FROM messages
        WHERE embedding IS NOT NULL 
          AND deleted_at IS NULL
          AND 1 - (embedding <=> $1::vector) > $2
      `;
      const params: any[] = [
        `[${queryEmbedding.join(',')}]`,
        similarityThreshold,
      ];
      let paramIndex = 3;

      if (conversationId) {
        sql += ` AND conversation_id = $${paramIndex++}`;
        params.push(conversationId);
      }

      sql += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await client.query(sql, params);
      return result.rows.map((row) => ({
        message: this.pgToMessage(row),
        similarity: row.similarity,
      }));
    } catch (error) {
      void error;
      console.warn('Vector similarity search failed:', error);
      return [];
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // PARTICIPANT OPERATIONS
  // ===================================================================

  async addParticipant(
    participant: Omit<Participant, 'id' | 'joinedAt'>
  ): Promise<Participant> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO participants (
          conversation_id, participant_type, participant_id, participant_name,
          role, notifications_enabled, preferences, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
        [
          participant.conversationId,
          participant.participantType,
          participant.participantId,
          participant.participantName,
          participant.role,
          participant.notificationsEnabled,
          JSON.stringify(participant.preferences || {}),
          participant.status,
        ]
      );

      return this.pgToParticipant(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async removeParticipant(
    conversationId: string,
    participantId: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE participants 
        SET left_at = NOW(), status = $1
        WHERE conversation_id = $2 AND participant_id = $3
      `,
        [ParticipantStatus.INACTIVE, conversationId, participantId]
      );
    } finally {
      client.release();
    }
  }

  async updateParticipant(
    id: string,
    updates: Partial<Participant>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.notificationsEnabled !== undefined) {
      fields.push(`notifications_enabled = $${paramIndex++}`);
      values.push(updates.notificationsEnabled);
    }
    if (updates.preferences !== undefined) {
      fields.push(`preferences = $${paramIndex++}`);
      values.push(JSON.stringify(updates.preferences));
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE participants SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    const client = await this.pool.connect();
    try {
      await client.query(sql, values);
    } finally {
      client.release();
    }
  }

  async listParticipants(conversationId: string): Promise<Participant[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM participants WHERE conversation_id = $1 ORDER BY joined_at ASC',
        [conversationId]
      );
      return result.rows.map((row) => this.pgToParticipant(row));
    } finally {
      client.release();
    }
  }

  async updateLastSeen(
    conversationId: string,
    participantId: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE participants 
        SET last_seen_at = NOW()
        WHERE conversation_id = $1 AND participant_id = $2
      `,
        [conversationId, participantId]
      );
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // SESSION OPERATIONS
  // ===================================================================

  async createSession(
    session: Omit<ChatSession, 'id' | 'startedAt' | 'lastActivityAt'>
  ): Promise<ChatSession> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO chat_sessions (
          user_id, conversation_id, connection_id, client_info, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
        [
          session.userId,
          session.conversationId,
          session.connectionId,
          JSON.stringify(session.clientInfo || {}),
          session.ipAddress,
          session.userAgent,
        ]
      );

      return this.pgToSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE chat_sessions SET last_activity_at = NOW() WHERE id = $1',
        [sessionId]
      );
    } finally {
      client.release();
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE chat_sessions SET ended_at = NOW() WHERE id = $1',
        [sessionId]
      );
    } finally {
      client.release();
    }
  }

  async getActiveSessions(conversationId?: string): Promise<ChatSession[]> {
    let sql = 'SELECT * FROM chat_sessions WHERE ended_at IS NULL';
    const params: any[] = [];

    if (conversationId) {
      sql += ' AND conversation_id = $1';
      params.push(conversationId);
    }

    sql += ' ORDER BY last_activity_at DESC';

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows.map((row) => this.pgToSession(row));
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // ANALYTICS OPERATIONS
  // ===================================================================

  async logEvent(
    event: Omit<AnalyticsEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    if (this.config.enableAnalytics === false) return;

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO analytics_events (
          event_type, conversation_id, user_id, agent_id, event_data, processing_time, tokens_used
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          event.eventType,
          event.conversationId,
          event.userId,
          event.agentId,
          JSON.stringify(event.eventData || {}),
          event.processingTime,
          event.tokensUsed,
        ]
      );
    } catch (error) {
      void error;
      console.warn('Failed to log analytics event:', error);
    } finally {
      client.release();
    }
  }

  async getConversationStats(
    conversationId: string
  ): Promise<ConversationStats> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM conversation_stats WHERE conversation_id = $1',
        [conversationId]
      );

      if (result.rows.length === 0) {
        return {
          conversationId,
          messageCount: 0,
          uniqueSenders: 0,
          userMessageCount: 0,
          agentMessageCount: 0,
          commandCount: 0,
          failedMessageCount: 0,
        };
      }

      const row = result.rows[0];
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
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // UTILITY OPERATIONS
  // ===================================================================

  async cleanupExpiredSessions(maxAge: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge).toISOString();

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        UPDATE chat_sessions 
        SET ended_at = NOW()
        WHERE ended_at IS NULL AND last_activity_at < $1
      `,
        [cutoffDate]
      );

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  async archiveOldConversations(daysOld: number): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - daysOld * 24 * 60 * 60 * 1000
    ).toISOString();

    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        UPDATE conversations 
        SET status = $1
        WHERE status = $2 AND last_message_at < $3
      `,
        [ConversationStatus.ARCHIVED, ConversationStatus.ACTIVE, cutoffDate]
      );

      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private pgToConversation(row: any): Conversation {
    return buildObject<Conversation>({
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      status: row.status as ConversationStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      messageCount: row.message_count,
      metadata: row.metadata || {},
    })
      .addOptional('title', row.title)
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

  private pgToConversationWithLastMessage(
    row: any
  ): ConversationWithLastMessage {
    return buildObject<ConversationWithLastMessage>({
      ...this.pgToConversation(row),
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

  private pgToMessage(row: any): Message {
    return buildObject<Message>({
      id: row.id,
      conversationId: row.conversation_id,
      senderType: row.sender_type as SenderType,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type as MessageType,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata || {},
      memoryReferences: row.memory_references || [],
      createdMemories: row.created_memories || [],
      status: row.status as MessageStatus,
    })
      .addOptional(
        'editedAt',
        row.edited_at ? new Date(row.edited_at) : undefined
      )
      .addOptional('emotionState', row.emotion_state)
      .addOptional('thoughtProcess', row.thought_process)
      .addOptional('confidenceScore', row.confidence_score)
      .addOptional('readAt', row.read_at ? new Date(row.read_at) : undefined)
      .addOptional(
        'deletedAt',
        row.deleted_at ? new Date(row.deleted_at) : undefined
      )
      .addOptional('deletedBy', row.deleted_by)
      .build();
  }

  private pgToParticipant(row: any): Participant {
    return buildObject<Participant>({
      id: row.id,
      conversationId: row.conversation_id,
      participantType: row.participant_type as ParticipantType,
      participantId: row.participant_id,
      joinedAt: new Date(row.joined_at),
      role: row.role as ParticipantRole,
      messageCount: row.message_count,
      notificationsEnabled: row.notifications_enabled,
      preferences: row.preferences || {},
      status: row.status as ParticipantStatus,
    })
      .addOptional('participantName', row.participant_name)
      .addOptional('leftAt', row.left_at ? new Date(row.left_at) : undefined)
      .addOptional(
        'lastSeenAt',
        row.last_seen_at ? new Date(row.last_seen_at) : undefined
      )
      .addOptional(
        'lastTypedAt',
        row.last_typed_at ? new Date(row.last_typed_at) : undefined
      )
      .build();
  }

  private pgToSession(row: any): ChatSession {
    return buildObject<ChatSession>({
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      clientInfo: row.client_info || {},
    })
      .addOptional('connectionId', row.connection_id)
      .addOptional('endedAt', row.ended_at ? new Date(row.ended_at) : undefined)
      .addOptional('ipAddress', row.ip_address)
      .addOptional('userAgent', row.user_agent)
      .build();
  }

  // Close pool
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Factory function to create a Neon chat repository
 */
export function createNeonChatRepository(
  config: NeonChatConfig
): NeonChatRepository {
  return new NeonChatRepository(config);
}
