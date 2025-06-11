/**
 * Session Management Skill for API Extension
 * 
 * Provides actions related to session lifecycle and management.
 */

import { ExtensionAction, Agent, ActionResult, ActionResultType, ActionCategory } from '../../../types/agent.js'
import { ApiExtension } from '../index.js'

export class SessionManagementSkill {
  private extension: ApiExtension
  private sessions: Map<string, any> = new Map()

  constructor(extension: ApiExtension) {
    this.extension = extension
  }

  /**
   * Get all session management-related actions
   */
  getActions(): Record<string, ExtensionAction> {
    return {
      create_session: {
        name: 'create_session',
        description: 'Create a new user session',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', metadata: 'object', ttl: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.createSession(agent, params)
        }
      },
      
      get_session: {
        name: 'get_session',
        description: 'Retrieve session information',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.getSession(agent, params)
        }
      },
      
      update_session: {
        name: 'update_session',
        description: 'Update session data',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', data: 'object' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.updateSession(agent, params)
        }
      },
      
      extend_session: {
        name: 'extend_session',
        description: 'Extend session expiration time',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', extensionTime: 'number' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.extendSession(agent, params)
        }
      },
      
      destroy_session: {
        name: 'destroy_session',
        description: 'Destroy a session',
        category: ActionCategory.SYSTEM,
        parameters: { sessionId: 'string', reason: 'string' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.destroySession(agent, params)
        }
      },
      
      list_sessions: {
        name: 'list_sessions',
        description: 'List active sessions',
        category: ActionCategory.SYSTEM,
        parameters: { userId: 'string', includeExpired: 'boolean' },
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.listSessions(agent, params)
        }
      },
      
      cleanup_expired: {
        name: 'cleanup_expired',
        description: 'Clean up expired sessions',
        category: ActionCategory.SYSTEM,
        parameters: {},
        execute: async (agent: Agent, params: any): Promise<ActionResult> => {
          return this.cleanupExpired(agent, params)
        }
      }
    }
  }

  /**
   * Create a new session
   */
  private async createSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { userId, metadata = {}, ttl = 3600000 } = params // Default 1 hour TTL
      
      const sessionId = this.generateSessionId()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + ttl)
      
      const session = {
        sessionId,
        userId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        metadata,
        isActive: true,
        lastActivity: now.toISOString()
      }
      
      this.sessions.set(sessionId, session)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          session,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'create_session',
          sessionId,
          userId
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to create session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'create_session',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Get session information
   */
  private async getSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId } = params
      
      const session = this.sessions.get(sessionId)
      
      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'get_session',
            sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      // Check if session is expired
      const isExpired = new Date() > new Date(session.expiresAt)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          session: {
            ...session,
            isExpired
          },
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'get_session',
          sessionId,
          isExpired
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to get session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'get_session',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Update session data
   */
  private async updateSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, data } = params
      
      const session = this.sessions.get(sessionId)
      
      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'update_session',
            sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      // Update session data
      const updatedSession = {
        ...session,
        ...data,
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }
      
      this.sessions.set(sessionId, updatedSession)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          session: updatedSession,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'update_session',
          sessionId
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to update session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'update_session',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Extend session expiration
   */
  private async extendSession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, extensionTime = 3600000 } = params // Default 1 hour extension
      
      const session = this.sessions.get(sessionId)
      
      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'extend_session',
            sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      const currentExpiry = new Date(session.expiresAt)
      const newExpiry = new Date(currentExpiry.getTime() + extensionTime)
      
      const extendedSession = {
        ...session,
        expiresAt: newExpiry.toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }
      
      this.sessions.set(sessionId, extendedSession)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          session: extendedSession,
          extensionTime,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'extend_session',
          sessionId,
          extensionTime
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to extend session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'extend_session',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Destroy a session
   */
  private async destroySession(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { sessionId, reason = 'manual_destruction' } = params
      
      const session = this.sessions.get(sessionId)
      
      if (!session) {
        return {
          type: ActionResultType.FAILURE,
          success: false,
          error: 'Session not found',
          metadata: {
            action: 'destroy_session',
            sessionId,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      this.sessions.delete(sessionId)
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          destroyed: true,
          sessionId,
          reason,
          destroyedAt: new Date().toISOString()
        },
        metadata: {
          action: 'destroy_session',
          sessionId,
          reason
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to destroy session: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'destroy_session',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * List sessions
   */
  private async listSessions(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const { userId, includeExpired = false } = params
      
      let sessions = Array.from(this.sessions.values())
      
      // Filter by user ID if provided
      if (userId) {
        sessions = sessions.filter(session => session.userId === userId)
      }
      
      // Filter expired sessions if not included
      if (!includeExpired) {
        const now = new Date()
        sessions = sessions.filter(session => new Date(session.expiresAt) > now)
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          sessions,
          count: sessions.length,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'list_sessions',
          userId,
          includeExpired
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'list_sessions',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpired(agent: Agent, params: any): Promise<ActionResult> {
    try {
      const now = new Date()
      const expiredSessions: string[] = []
      
      for (const [sessionId, session] of Array.from(this.sessions.entries())) {
        if (new Date(session.expiresAt) <= now) {
          this.sessions.delete(sessionId)
          expiredSessions.push(sessionId)
        }
      }
      
      return {
        type: ActionResultType.SUCCESS,
        success: true,
        result: {
          cleanedUp: true,
          expiredSessions,
          count: expiredSessions.length,
          timestamp: new Date().toISOString()
        },
        metadata: {
          action: 'cleanup_expired',
          cleanedCount: expiredSessions.length
        }
      }
    } catch (error) {
      return {
        type: ActionResultType.FAILURE,
        success: false,
        error: `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : String(error)}`,
        metadata: {
          action: 'cleanup_expired',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
  }
}