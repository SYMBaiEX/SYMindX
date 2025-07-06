/**
 * SQLite Chat Repository Implementation for SYMindX
 * 
 * Implements the ChatRepository interface using SQLite for persistent chat storage
 */

import Database, { type Database as DatabaseType, type Statement } from 'better-sqlite3'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
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
  EmotionSnapshot
} from './chat-types'
import { runMigrations } from './migrations'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export class SQLiteChatRepository implements ChatRepository {
  private db: DatabaseType
  private config: ChatSystemConfig
  private statements: Map<string, Statement> = new Map()

  constructor(config: ChatSystemConfig) {
    this.config = config
    this.db = new Database(config.dbPath)
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')
    
    // Initialize database schema (async but constructor can't be async)
    this.initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error)
      throw error
    })
    
    // Prepare frequently used statements
    this.prepareStatements()
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Enable WAL mode for better concurrency and performance
      this.db.pragma('journal_mode = WAL')
      
      // Run migrations instead of reading SQL files
      await runMigrations(this.db)
      
      console.log('✅ Chat database initialized with migrations')
    } catch (error) {
      console.error('❌ Failed to initialize chat database:', error)
      throw error
    }
  }

  private prepareStatements(): void {
    // Prepare frequently used statements for better performance
    this.statements.set('insertMessage', this.db.prepare(`
      INSERT INTO messages (
        id, conversation_id, sender_type, sender_id, content, 
        message_type, timestamp, metadata, emotion_state, thought_process,
        confidence_score, memory_references, created_memories, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `))

    this.statements.set('updateConversationOnMessage', this.db.prepare(`
      UPDATE conversations 
      SET last_message_at = ?, message_count = message_count + 1, updated_at = ?
      WHERE id = ?
    `))

    this.statements.set('getConversationById', this.db.prepare(`
      SELECT * FROM conversations WHERE id = ? AND deleted_at IS NULL
    `))

    this.statements.set('getMessageById', this.db.prepare(`
      SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL
    `))
  }

  // ===================================================================
  // CONVERSATION OPERATIONS
  // ===================================================================

  async createConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    const id = this.generateId('conv')
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO conversations (
        id, agent_id, user_id, title, status, 
        created_at, updated_at, message_count, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      conversation.agentId,
      conversation.userId,
      conversation.title || null,
      conversation.status || ConversationStatus.ACTIVE,
      now,
      now,
      0,
      JSON.stringify(conversation.metadata || {})
    )

    // Add participants
    await this.addParticipant({
      conversationId: id,
      participantType: ParticipantType.USER,
      participantId: conversation.userId,
      role: ParticipantRole.OWNER,
      messageCount: 0,
      notificationsEnabled: true,
      preferences: {},
      status: ParticipantStatus.ACTIVE
    })

    await this.addParticipant({
      conversationId: id,
      participantType: ParticipantType.AGENT,
      participantId: conversation.agentId,
      role: ParticipantRole.MEMBER,
      messageCount: 0,
      notificationsEnabled: true,
      preferences: {},
      status: ParticipantStatus.ACTIVE
    })

    const created: Conversation = {
      id,
      ...conversation,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      messageCount: 0,
      metadata: conversation.metadata || {}
    }

    console.log(`💬 Created conversation ${id} between user ${conversation.userId} and agent ${conversation.agentId}`)
    return created
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const stmt = this.statements.get('getConversationById')!
    const row = stmt.get(id) as any

    if (!row) return null

    return this.rowToConversation(row)
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.title !== undefined) {
      fields.push('title = ?')
      values.push(updates.title)
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?')
      values.push(JSON.stringify(updates.metadata))
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(id)

    const sql = `UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)
  }

  async deleteConversation(id: string, deletedBy: string): Promise<void> {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET status = ?, deleted_at = ?, deleted_by = ?, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(ConversationStatus.DELETED, now, deletedBy, now, id)
  }

  async listConversations(query: ConversationQuery): Promise<ConversationWithLastMessage[]> {
    let sql = `
      SELECT 
        c.*,
        m.content as last_message_content,
        m.sender_type as last_message_sender_type,
        m.timestamp as last_message_timestamp,
        (SELECT COUNT(*) FROM participants WHERE conversation_id = c.id) as participant_count,
        (SELECT COUNT(*) FROM participants WHERE conversation_id = c.id AND status = 'active') as active_participant_count
      FROM conversations c
      LEFT JOIN (
        SELECT conversation_id, content, sender_type, timestamp
        FROM messages
        WHERE deleted_at IS NULL
        GROUP BY conversation_id
        HAVING MAX(timestamp)
      ) m ON m.conversation_id = c.id
      WHERE c.deleted_at IS NULL
    `

    const conditions: string[] = []
    const params: any[] = []

    if (query.userId) {
      conditions.push('c.user_id = ?')
      params.push(query.userId)
    }
    if (query.agentId) {
      conditions.push('c.agent_id = ?')
      params.push(query.agentId)
    }
    if (query.status) {
      conditions.push('c.status = ?')
      params.push(query.status)
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ')
    }

    // Ordering
    const orderBy = query.orderBy || 'updated'
    const orderDirection = query.orderDirection || 'desc'
    const orderColumn = {
      created: 'c.created_at',
      updated: 'c.updated_at',
      lastMessage: 'c.last_message_at'
    }[orderBy] || 'c.updated_at'

    sql += ` ORDER BY ${orderColumn} ${orderDirection.toUpperCase()}`

    // Pagination
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`
      if (query.offset) {
        sql += ` OFFSET ${query.offset}`
      }
    }

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map(row => this.rowToConversationWithLastMessage(row))
  }

  // ===================================================================
  // MESSAGE OPERATIONS
  // ===================================================================

  async createMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const id = this.generateId('msg')
    const timestamp = Date.now()

    const stmt = this.statements.get('insertMessage')!
    
    stmt.run(
      id,
      message.conversationId,
      message.senderType,
      message.senderId,
      message.content,
      message.messageType || MessageType.TEXT,
      timestamp,
      JSON.stringify(message.metadata || {}),
      message.emotionState ? JSON.stringify(message.emotionState) : null,
      message.thoughtProcess ? JSON.stringify(message.thoughtProcess) : null,
      message.confidenceScore || null,
      JSON.stringify(message.memoryReferences || []),
      JSON.stringify(message.createdMemories || []),
      message.status || MessageStatus.SENT
    )

    // Update conversation
    const updateStmt = this.statements.get('updateConversationOnMessage')!
    updateStmt.run(timestamp, timestamp, message.conversationId)

    // Update participant message count
    this.db.prepare(`
      UPDATE participants 
      SET message_count = message_count + 1
      WHERE conversation_id = ? AND participant_id = ?
    `).run(message.conversationId, message.senderId)

    const created: Message = {
      id,
      ...message,
      timestamp: new Date(timestamp),
      metadata: message.metadata || {},
      memoryReferences: message.memoryReferences || [],
      createdMemories: message.createdMemories || [],
      status: message.status || MessageStatus.SENT
    }

    console.log(`📝 Created message ${id} in conversation ${message.conversationId}`)
    return created
  }

  async getMessage(id: string): Promise<Message | null> {
    const stmt = this.statements.get('getMessageById')!
    const row = stmt.get(id) as any

    if (!row) return null

    return this.rowToMessage(row)
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
      fields.push('edited_at = ?')
      values.push(Date.now())
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.readAt !== undefined) {
      fields.push('read_at = ?')
      values.push(updates.readAt.getTime())
    }

    if (fields.length === 0) return

    values.push(id)

    const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)
  }

  async deleteMessage(id: string, deletedBy: string): Promise<void> {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE messages 
      SET deleted_at = ?, deleted_by = ?
      WHERE id = ?
    `)

    stmt.run(now, deletedBy, id)
  }

  async listMessages(query: MessageQuery): Promise<Message[]> {
    let sql = `SELECT * FROM messages WHERE 1=1`
    const params: any[] = []

    if (!query.includeDeleted) {
      sql += ' AND deleted_at IS NULL'
    }

    if (query.conversationId) {
      sql += ' AND conversation_id = ?'
      params.push(query.conversationId)
    }
    if (query.senderId) {
      sql += ' AND sender_id = ?'
      params.push(query.senderId)
    }
    if (query.senderType) {
      sql += ' AND sender_type = ?'
      params.push(query.senderType)
    }
    if (query.messageType) {
      sql += ' AND message_type = ?'
      params.push(query.messageType)
    }
    if (query.status) {
      sql += ' AND status = ?'
      params.push(query.status)
    }
    if (query.searchText) {
      sql += ' AND content LIKE ?'
      params.push(`%${query.searchText}%`)
    }
    if (query.startDate) {
      sql += ' AND timestamp >= ?'
      params.push(query.startDate.getTime())
    }
    if (query.endDate) {
      sql += ' AND timestamp <= ?'
      params.push(query.endDate.getTime())
    }

    sql += ' ORDER BY timestamp DESC'

    if (query.limit) {
      sql += ` LIMIT ${query.limit}`
      if (query.offset) {
        sql += ` OFFSET ${query.offset}`
      }
    }

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map(row => this.rowToMessage(row))
  }

  async searchMessages(conversationId: string, searchText: string, limit = 50): Promise<Message[]> {
    // Use FTS if available
    if (this.config.enableFullTextSearch !== false) {
      try {
        const ftsQuery = `
          SELECT m.* FROM messages m
          JOIN messages_fts ON m.id = messages_fts.message_id
          WHERE messages_fts MATCH ? AND m.conversation_id = ?
          ORDER BY m.timestamp DESC
          LIMIT ?
        `
        const rows = this.db.prepare(ftsQuery).all(searchText, conversationId, limit) as any[]
        return rows.map(row => this.rowToMessage(row))
      } catch (error) {
        console.warn('FTS search failed, falling back to LIKE query:', error)
      }
    }

    // Fallback to LIKE query
    return this.listMessages({
      conversationId,
      searchText,
      limit
    })
  }

  // ===================================================================
  // PARTICIPANT OPERATIONS
  // ===================================================================

  async addParticipant(participant: Omit<Participant, 'id' | 'joinedAt'>): Promise<Participant> {
    const id = this.generateId('part')
    const joinedAt = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO participants (
        id, conversation_id, participant_type, participant_id, 
        participant_name, joined_at, role, message_count,
        notifications_enabled, preferences, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      participant.conversationId,
      participant.participantType,
      participant.participantId,
      participant.participantName || null,
      joinedAt,
      participant.role,
      0,
      participant.notificationsEnabled ? 1 : 0,
      JSON.stringify(participant.preferences || {}),
      participant.status
    )

    const created: Participant = {
      id,
      ...participant,
      joinedAt: new Date(joinedAt),
      messageCount: 0,
      preferences: participant.preferences || {}
    }

    return created
  }

  async removeParticipant(conversationId: string, participantId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE participants 
      SET left_at = ?, status = ?
      WHERE conversation_id = ? AND participant_id = ?
    `)

    stmt.run(Date.now(), ParticipantStatus.INACTIVE, conversationId, participantId)
  }

  async updateParticipant(id: string, updates: Partial<Participant>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.role !== undefined) {
      fields.push('role = ?')
      values.push(updates.role)
    }
    if (updates.notificationsEnabled !== undefined) {
      fields.push('notifications_enabled = ?')
      values.push(updates.notificationsEnabled ? 1 : 0)
    }
    if (updates.preferences !== undefined) {
      fields.push('preferences = ?')
      values.push(JSON.stringify(updates.preferences))
    }
    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }

    if (fields.length === 0) return

    values.push(id)

    const sql = `UPDATE participants SET ${fields.join(', ')} WHERE id = ?`
    this.db.prepare(sql).run(...values)
  }

  async listParticipants(conversationId: string): Promise<Participant[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM participants 
      WHERE conversation_id = ?
      ORDER BY joined_at ASC
    `)

    const rows = stmt.all(conversationId) as any[]
    return rows.map(row => this.rowToParticipant(row))
  }

  async updateLastSeen(conversationId: string, participantId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE participants 
      SET last_seen_at = ?
      WHERE conversation_id = ? AND participant_id = ?
    `)

    stmt.run(Date.now(), conversationId, participantId)
  }

  // ===================================================================
  // SESSION OPERATIONS
  // ===================================================================

  async createSession(session: Omit<ChatSession, 'id' | 'startedAt' | 'lastActivityAt'>): Promise<ChatSession> {
    const id = this.generateId('sess')
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (
        id, user_id, conversation_id, connection_id,
        started_at, last_activity_at, client_info, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      session.userId,
      session.conversationId,
      session.connectionId || null,
      now,
      now,
      JSON.stringify(session.clientInfo || {}),
      session.ipAddress || null,
      session.userAgent || null
    )

    const created: ChatSession = {
      id,
      ...session,
      startedAt: new Date(now),
      lastActivityAt: new Date(now),
      clientInfo: session.clientInfo || {}
    }

    return created
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET last_activity_at = ?
      WHERE id = ?
    `)

    stmt.run(Date.now(), sessionId)
  }

  async endSession(sessionId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET ended_at = ?
      WHERE id = ?
    `)

    stmt.run(Date.now(), sessionId)
  }

  async getActiveSessions(conversationId?: string): Promise<ChatSession[]> {
    let sql = `SELECT * FROM chat_sessions WHERE ended_at IS NULL`
    const params: any[] = []

    if (conversationId) {
      sql += ' AND conversation_id = ?'
      params.push(conversationId)
    }

    sql += ' ORDER BY last_activity_at DESC'

    const rows = this.db.prepare(sql).all(...params) as any[]
    return rows.map(row => this.rowToSession(row))
  }

  // ===================================================================
  // ANALYTICS OPERATIONS
  // ===================================================================

  async logEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    if (this.config.enableAnalytics === false) return

    const id = this.generateId('evt')
    const timestamp = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO analytics_events (
        id, event_type, conversation_id, user_id, agent_id,
        event_data, timestamp, processing_time, tokens_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      event.eventType,
      event.conversationId || null,
      event.userId || null,
      event.agentId || null,
      JSON.stringify(event.eventData || {}),
      timestamp,
      event.processingTime || null,
      event.tokensUsed || null
    )
  }

  async getConversationStats(conversationId: string): Promise<ConversationStats> {
    const stmt = this.db.prepare(`
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
    `)

    const row = stmt.get(conversationId, conversationId) as any

    return {
      conversationId,
      messageCount: row.message_count || 0,
      uniqueSenders: row.unique_senders || 0,
      firstMessageAt: row.first_message_at ? new Date(row.first_message_at) : undefined,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
      avgConfidence: row.avg_confidence || undefined,
      userMessageCount: row.user_message_count || 0,
      agentMessageCount: row.agent_message_count || 0,
      commandCount: row.command_count || 0,
      failedMessageCount: row.failed_message_count || 0
    }
  }

  // ===================================================================
  // UTILITY OPERATIONS
  // ===================================================================

  async cleanupExpiredSessions(maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge

    const stmt = this.db.prepare(`
      UPDATE chat_sessions 
      SET ended_at = ?
      WHERE ended_at IS NULL AND last_activity_at < ?
    `)

    const result = stmt.run(Date.now(), cutoff)
    return result.changes
  }

  async archiveOldConversations(daysOld: number): Promise<number> {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000)

    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET status = ?
      WHERE status = ? AND last_message_at < ?
    `)

    const result = stmt.run(ConversationStatus.ARCHIVED, ConversationStatus.ACTIVE, cutoff)
    return result.changes
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private rowToConversation(row: any): Conversation {
    return {
      id: row.id,
      agentId: row.agent_id,
      userId: row.user_id,
      title: row.title,
      status: row.status as ConversationStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
      messageCount: row.message_count,
      metadata: JSON.parse(row.metadata || '{}'),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      deletedBy: row.deleted_by
    }
  }

  private rowToConversationWithLastMessage(row: any): ConversationWithLastMessage {
    return {
      ...this.rowToConversation(row),
      lastMessageContent: row.last_message_content,
      lastMessageSenderType: row.last_message_sender_type as SenderType,
      lastMessageTimestamp: row.last_message_timestamp ? new Date(row.last_message_timestamp) : undefined,
      participantCount: row.participant_count || 0,
      activeParticipantCount: row.active_participant_count || 0
    }
  }

  private rowToMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderType: row.sender_type as SenderType,
      senderId: row.sender_id,
      content: row.content,
      messageType: row.message_type as MessageType,
      timestamp: new Date(row.timestamp),
      editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      emotionState: row.emotion_state ? JSON.parse(row.emotion_state) : undefined,
      thoughtProcess: row.thought_process ? JSON.parse(row.thought_process) : undefined,
      confidenceScore: row.confidence_score,
      memoryReferences: JSON.parse(row.memory_references || '[]'),
      createdMemories: JSON.parse(row.created_memories || '[]'),
      status: row.status as MessageStatus,
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
      deletedBy: row.deleted_by
    }
  }

  private rowToParticipant(row: any): Participant {
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
      notificationsEnabled: Boolean(row.notifications_enabled),
      preferences: JSON.parse(row.preferences || '{}'),
      status: row.status as ParticipantStatus
    }
  }

  private rowToSession(row: any): ChatSession {
    return {
      id: row.id,
      userId: row.user_id,
      conversationId: row.conversation_id,
      connectionId: row.connection_id,
      startedAt: new Date(row.started_at),
      lastActivityAt: new Date(row.last_activity_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      clientInfo: JSON.parse(row.client_info || '{}'),
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    }
  }

  // Close database connection
  close(): void {
    this.db.close()
  }
}

/**
 * Factory function to create a SQLite chat repository
 */
export function createSQLiteChatRepository(config: ChatSystemConfig): SQLiteChatRepository {
  return new SQLiteChatRepository(config)
}