/**
 * Supabase Chat Repository Implementation for SYMindX
 *
 * Implements the ChatRepository interface using Supabase with vector search and real-time features
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export interface SupabaseChatConfig extends ChatSystemConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema?: string;
}

export class SupabaseChatRepository implements ChatRepository {
  private client: SupabaseClient<any, 'public', any>;
  private config: SupabaseChatConfig;

  constructor(config: SupabaseChatConfig) {
    this.config = config;

    // Use service role key for admin operations, anon key for regular operations
    this.client = createClient(
      config.url,
      config.serviceRoleKey || config.anonKey
    );

    // Initialize schema if needed
    this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      // Check if tables exist by querying conversations
      const { error } = await this.client
        .from('conversations')
        .select('id')
        .limit(1);

      if (
        error &&
        error.message.includes('relation "conversations" does not exist')
      ) {
        console.log(
          '📋 Chat tables not found. Please run the Supabase chat schema SQL manually.'
        );
        console.log(
          'Schema location: src/modules/memory/providers/supabase/chat-schema.sql'
        );
      }
    } catch (error) {
      console.warn('⚠️ Could not verify Supabase chat schema:', error);
    }
  }

  // ===================================================================
  // CONVERSATION OPERATIONS
  // ===================================================================

  async createConversation(
    conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Conversation> {
    const conversationData = {
      agent_id: conversation.agentId,
      user_id: conversation.userId,
      title: conversation.title,
      status: conversation.status || ConversationStatus.ACTIVE,
      message_count: 0,
      metadata: conversation.metadata || {},
    };

    const { data, error } = await this.client
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    // Add participants
    await this.addParticipant({
      conversationId: data.id,
      participantType: ParticipantType.USER,
      participantId: conversation.userId,
      role: ParticipantRole.OWNER,
      messageCount: 0,
      notificationsEnabled: true,
      preferences: {},
      status: ParticipantStatus.ACTIVE,
    });

    await this.addParticipant({
      conversationId: data.id,
      participantType: ParticipantType.AGENT,
      participantId: conversation.agentId,
      role: ParticipantRole.MEMBER,
      messageCount: 0,
      notificationsEnabled: true,
      preferences: {},
      status: ParticipantStatus.ACTIVE,
    });

    const result = this.supabaseToConversation(data);
    console.log(
      `💬 Created conversation ${result.id} between user ${conversation.userId} and agent ${conversation.agentId}`
    );
    return result;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await this.client
      .from('conversations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return this.supabaseToConversation(data);
  }

  async updateConversation(
    id: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await this.client
      .from('conversations')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }
  }

  async deleteConversation(id: string, deletedBy: string): Promise<void> {
    const { error } = await this.client
      .from('conversations')
      .update({
        status: ConversationStatus.DELETED,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  async listConversations(
    query: ConversationQuery
  ): Promise<ConversationWithLastMessage[]> {
    let supabaseQuery = this.client
      .from('active_conversations_view')
      .select('*');

    // Apply filters
    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    if (query.agentId) {
      supabaseQuery = supabaseQuery.eq('agent_id', query.agentId);
    }
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
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

    supabaseQuery = supabaseQuery.order(orderColumn, {
      ascending: orderDirection === 'asc',
    });

    // Apply pagination
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + query.limit - 1
        );
      }
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return data.map((row) => this.supabaseToConversationWithLastMessage(row));
  }

  // ===================================================================
  // MESSAGE OPERATIONS
  // ===================================================================

  async createMessage(
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message> {
    const messageData = {
      conversation_id: message.conversationId,
      sender_type: message.senderType,
      sender_id: message.senderId,
      content: message.content,
      message_type: message.messageType || MessageType.TEXT,
      metadata: message.metadata || {},
      emotion_state: message.emotionState,
      thought_process: message.thoughtProcess,
      confidence_score: message.confidenceScore,
      memory_references: message.memoryReferences || [],
      created_memories: message.createdMemories || [],
      status: message.status || MessageStatus.SENT,
    };

    const { data, error } = await this.client
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    const result = this.supabaseToMessage(data);
    console.log(
      `📝 Created message ${result.id} in conversation ${message.conversationId}`
    );
    return result;
  }

  async getMessage(id: string): Promise<Message | null> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get message: ${error.message}`);
    }

    return this.supabaseToMessage(data);
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const updateData: any = {};

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.edited_at = new Date().toISOString();
    }
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.readAt !== undefined)
      updateData.read_at = updates.readAt.toISOString();

    if (Object.keys(updateData).length === 0) return;

    const { error } = await this.client
      .from('messages')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }

  async deleteMessage(id: string, deletedBy: string): Promise<void> {
    const { error } = await this.client
      .from('messages')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }

  async listMessages(query: MessageQuery): Promise<Message[]> {
    let supabaseQuery = this.client.from('messages').select('*');

    if (!query.includeDeleted) {
      supabaseQuery = supabaseQuery.is('deleted_at', null);
    }

    // Apply filters
    if (query.conversationId) {
      supabaseQuery = supabaseQuery.eq('conversation_id', query.conversationId);
    }
    if (query.senderId) {
      supabaseQuery = supabaseQuery.eq('sender_id', query.senderId);
    }
    if (query.senderType) {
      supabaseQuery = supabaseQuery.eq('sender_type', query.senderType);
    }
    if (query.messageType) {
      supabaseQuery = supabaseQuery.eq('message_type', query.messageType);
    }
    if (query.status) {
      supabaseQuery = supabaseQuery.eq('status', query.status);
    }
    if (query.searchText) {
      supabaseQuery = supabaseQuery.textSearch('content', query.searchText);
    }
    if (query.startDate) {
      supabaseQuery = supabaseQuery.gte(
        'timestamp',
        query.startDate.toISOString()
      );
    }
    if (query.endDate) {
      supabaseQuery = supabaseQuery.lte(
        'timestamp',
        query.endDate.toISOString()
      );
    }

    // Order by timestamp descending
    supabaseQuery = supabaseQuery.order('timestamp', { ascending: false });

    // Apply pagination
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + query.limit - 1
        );
      }
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    return data.map((row) => this.supabaseToMessage(row));
  }

  async searchMessages(
    conversationId: string,
    searchText: string,
    limit = 50
  ): Promise<Message[]> {
    // Try semantic search first if we have the function
    try {
      const { data: semanticResults, error: semanticError } =
        await this.client.rpc('search_messages_by_similarity', {
          query_text: searchText,
          conversation_id_filter: conversationId,
          similarity_threshold: 0.3,
          match_count: limit,
        });

      if (!semanticError && semanticResults && semanticResults.length > 0) {
        // Convert semantic search results to full message objects
        const messageIds = semanticResults.map((r: any) => r.message_id);
        const { data: messages, error: messagesError } = await this.client
          .from('messages')
          .select('*')
          .in('id', messageIds)
          .is('deleted_at', null);

        if (!messagesError) {
          return messages.map((row) => this.supabaseToMessage(row));
        }
      }
    } catch (error) {
      console.warn(
        'Semantic search failed, falling back to text search:',
        error
      );
    }

    // Fallback to regular text search
    return this.listMessages({
      conversationId,
      searchText,
      limit,
    });
  }

  /**
   * Search messages using vector similarity (if embeddings are available)
   */
  async searchMessagesBySimilarity(
    queryEmbedding: number[],
    conversationId?: string,
    similarityThreshold = 0.8,
    limit = 20
  ): Promise<Array<{ message: Message; similarity: number }>> {
    try {
      const { data, error } = await this.client.rpc(
        'search_messages_by_similarity',
        {
          query_embedding: `[${queryEmbedding.join(',')}]`,
          conversation_id_filter: conversationId,
          similarity_threshold: similarityThreshold,
          match_count: limit,
        }
      );

      if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
      }

      // Convert to full message objects with similarity scores
      const results = [];
      for (const row of data) {
        const message = await this.getMessage(row.message_id);
        if (message) {
          results.push({
            message,
            similarity: row.similarity,
          });
        }
      }

      return results;
    } catch (error) {
      console.warn('Vector similarity search failed:', error);
      return [];
    }
  }

  // ===================================================================
  // PARTICIPANT OPERATIONS
  // ===================================================================

  async addParticipant(
    participant: Omit<Participant, 'id' | 'joinedAt'>
  ): Promise<Participant> {
    const participantData = {
      conversation_id: participant.conversationId,
      participant_type: participant.participantType,
      participant_id: participant.participantId,
      participant_name: participant.participantName,
      role: participant.role,
      message_count: 0,
      notifications_enabled: participant.notificationsEnabled,
      preferences: participant.preferences || {},
      status: participant.status,
    };

    const { data, error } = await this.client
      .from('participants')
      .insert(participantData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add participant: ${error.message}`);
    }

    return this.supabaseToParticipant(data);
  }

  async removeParticipant(
    conversationId: string,
    participantId: string
  ): Promise<void> {
    const { error } = await this.client
      .from('participants')
      .update({
        left_at: new Date().toISOString(),
        status: ParticipantStatus.INACTIVE,
      })
      .eq('conversation_id', conversationId)
      .eq('participant_id', participantId);

    if (error) {
      throw new Error(`Failed to remove participant: ${error.message}`);
    }
  }

  async updateParticipant(
    id: string,
    updates: Partial<Participant>
  ): Promise<void> {
    const updateData: any = {};

    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.notificationsEnabled !== undefined)
      updateData.notifications_enabled = updates.notificationsEnabled;
    if (updates.preferences !== undefined)
      updateData.preferences = updates.preferences;
    if (updates.status !== undefined) updateData.status = updates.status;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await this.client
      .from('participants')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update participant: ${error.message}`);
    }
  }

  async listParticipants(conversationId: string): Promise<Participant[]> {
    const { data, error } = await this.client
      .from('participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to list participants: ${error.message}`);
    }

    return data.map((row) => this.supabaseToParticipant(row));
  }

  async updateLastSeen(
    conversationId: string,
    participantId: string
  ): Promise<void> {
    const { error } = await this.client
      .from('participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('participant_id', participantId);

    if (error) {
      throw new Error(`Failed to update last seen: ${error.message}`);
    }
  }

  // ===================================================================
  // SESSION OPERATIONS
  // ===================================================================

  async createSession(
    session: Omit<ChatSession, 'id' | 'startedAt' | 'lastActivityAt'>
  ): Promise<ChatSession> {
    const sessionData = {
      user_id: session.userId,
      conversation_id: session.conversationId,
      connection_id: session.connectionId,
      client_info: session.clientInfo || {},
      ip_address: session.ipAddress,
      user_agent: session.userAgent,
    };

    const { data, error } = await this.client
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return this.supabaseToSession(data);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('chat_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to update session activity: ${error.message}`);
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await this.client
      .from('chat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }
  }

  async getActiveSessions(conversationId?: string): Promise<ChatSession[]> {
    let query = this.client
      .from('chat_sessions')
      .select('*')
      .is('ended_at', null);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    query = query.order('last_activity_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }

    return data.map((row) => this.supabaseToSession(row));
  }

  // ===================================================================
  // ANALYTICS OPERATIONS
  // ===================================================================

  async logEvent(
    event: Omit<AnalyticsEvent, 'id' | 'timestamp'>
  ): Promise<void> {
    if (this.config.enableAnalytics === false) return;

    const eventData = {
      event_type: event.eventType,
      conversation_id: event.conversationId,
      user_id: event.userId,
      agent_id: event.agentId,
      event_data: event.eventData || {},
      processing_time: event.processingTime,
      tokens_used: event.tokensUsed,
    };

    const { error } = await this.client
      .from('analytics_events')
      .insert(eventData);

    if (error) {
      console.warn('Failed to log analytics event:', error.message);
    }
  }

  async getConversationStats(
    conversationId: string
  ): Promise<ConversationStats> {
    const { data, error } = await this.client
      .from('conversation_stats')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (error) {
      throw new Error(`Failed to get conversation stats: ${error.message}`);
    }

    return {
      conversationId,
      messageCount: data.message_count || 0,
      uniqueSenders: data.unique_senders || 0,
      firstMessageAt: data.first_message_at
        ? new Date(data.first_message_at)
        : undefined,
      lastMessageAt: data.last_message_at
        ? new Date(data.last_message_at)
        : undefined,
      avgConfidence: data.avg_confidence || undefined,
      userMessageCount: data.user_message_count || 0,
      agentMessageCount: data.agent_message_count || 0,
      commandCount: data.command_count || 0,
      failedMessageCount: data.failed_message_count || 0,
    };
  }

  // ===================================================================
  // UTILITY OPERATIONS
  // ===================================================================

  async cleanupExpiredSessions(maxAge: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAge).toISOString();

    const { count, error } = await this.client
      .from('chat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .is('ended_at', null)
      .lt('last_activity_at', cutoffDate);

    if (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error.message}`);
    }

    return count || 0;
  }

  async archiveOldConversations(daysOld: number): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - daysOld * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count, error } = await this.client
      .from('conversations')
      .update({ status: ConversationStatus.ARCHIVED })
      .eq('status', ConversationStatus.ACTIVE)
      .lt('last_message_at', cutoffDate);

    if (error) {
      throw new Error(`Failed to archive old conversations: ${error.message}`);
    }

    return count || 0;
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private supabaseToConversation(row: any): Conversation {
    return {
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      title: row.title,
      status: row.status as ConversationStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastMessageAt: row.last_message_at
        ? new Date(row.last_message_at)
        : undefined,
      messageCount: row.message_count,
      metadata: row.metadata || {},
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      deletedBy: row.deleted_by,
    };
  }

  private supabaseToConversationWithLastMessage(
    row: any
  ): ConversationWithLastMessage {
    return {
      ...this.supabaseToConversation(row),
      lastMessageContent: row.last_message_content,
      lastMessageSenderType: row.last_message_sender_type as SenderType,
      lastMessageTimestamp: row.last_message_timestamp
        ? new Date(row.last_message_timestamp)
        : undefined,
      participantCount: row.participant_count || 0,
      activeParticipantCount: row.active_participant_count || 0,
    };
  }

  private supabaseToMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderType: row.sender_type as SenderType,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type as MessageType,
      timestamp: new Date(row.timestamp),
      editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
      metadata: row.metadata || {},
      emotionState: row.emotion_state,
      thoughtProcess: row.thought_process,
      confidenceScore: row.confidence_score,
      memoryReferences: row.memory_references || [],
      createdMemories: row.created_memories || [],
      status: row.status as MessageStatus,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      deletedBy: row.deleted_by,
    };
  }

  private supabaseToParticipant(row: any): Participant {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      participantType: row.participant_type as ParticipantType,
      participantId: row.participant_id,
      participantName: row.participant_name,
      joinedAt: new Date(row.joined_at),
      leftAt: row.left_at ? new Date(row.left_at) : undefined,
      role: row.role as ParticipantRole,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : undefined,
      lastTypedAt: row.last_typed_at ? new Date(row.last_typed_at) : undefined,
      messageCount: row.message_count,
      notificationsEnabled: row.notifications_enabled,
      preferences: row.preferences || {},
      status: row.status as ParticipantStatus,
    };
  }

  private supabaseToSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      connectionId: row.connection_id,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      clientInfo: row.client_info || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }
}

/**
 * Factory function to create a Supabase chat repository
 */
export function createSupabaseChatRepository(
  config: SupabaseChatConfig
): SupabaseChatRepository {
  return new SupabaseChatRepository(config);
}
